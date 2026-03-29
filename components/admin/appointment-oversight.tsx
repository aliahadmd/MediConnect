"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyStateIllustration } from "@/components/illustrations";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  doctorName: string;
  patientName: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
}

interface AppointmentsResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  completed: "secondary",
  rejected: "destructive",
  cancelled: "destructive",
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export function AppointmentOversight() {
  const [data, setData] = useState<AppointmentsResponse | null>(null);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/admin/appointments?${params.toString()}`);
      if (res.ok) {
        const json: AppointmentsResponse = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function handleCancel(appointmentId: string) {
    setCancelling(appointmentId);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, action: "cancel" }),
      });
      if (res.ok) {
        await fetchAppointments();
      }
    } finally {
      setCancelling(null);
    }
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const canCancel = (s: string) => s === "pending" || s === "confirmed";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : data && data.appointments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8"
                >
                  <div className="flex flex-col items-center gap-3 text-center" data-testid="empty-admin-appointments">
                    <EmptyStateIllustration size={96} decorative className="text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-lg font-medium">No appointments found</p>
                      <p className="text-sm text-muted-foreground max-w-sm">Appointments will appear here once patients start booking consultations</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.appointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell className="font-medium">
                    {appt.patientName}
                  </TableCell>
                  <TableCell>{appt.doctorName}</TableCell>
                  <TableCell>{formatDate(appt.slotDate)}</TableCell>
                  <TableCell>
                    {formatTime(appt.slotStartTime)} –{" "}
                    {formatTime(appt.slotEndTime)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[appt.status] ?? "outline"}
                      className="capitalize"
                    >
                      {appt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canCancel(appt.status) ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancelling === appt.id}
                        onClick={() => handleCancel(appt.id)}
                      >
                        {cancelling === appt.id ? "Cancelling…" : "Cancel"}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total ?? 0} appointments)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
