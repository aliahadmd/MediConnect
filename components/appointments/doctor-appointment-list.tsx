"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  Check,
  X,
  Loader2Icon,
  Video,
  PhoneCall,
  Eye,
} from "lucide-react";
import { PatientProfileViewer } from "@/components/profiles/patient-profile-viewer";
import { EmptyStateIllustration } from "@/components/illustrations";
import type { Appointment } from "./appointment-card";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const statusConfig: Record<
  Appointment["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
};

function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

interface DoctorAppointmentListProps {
  callingNotifications?: Record<string, string>;
}

export function DoctorAppointmentList({ callingNotifications = {} }: DoctorAppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch {
      // silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function handleAction(appointmentId: string, action: "accept" | "reject") {
    setActionLoading(`${appointmentId}-${action}`);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchAppointments();
      }
    } catch {
      // silently handle errors
    } finally {
      setActionLoading(null);
    }
  }

  const filtered =
    statusFilter === "all"
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading appointments…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-doctor-appointments">
          <EmptyStateIllustration size={120} decorative className="text-muted-foreground/60" />
          <p className="mt-4 text-lg font-medium">No appointments yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Set up your availability to start receiving patient bookings
          </p>
          {statusFilter !== "all" && (
            <p className="mt-1 text-sm text-muted-foreground/70">
              Try changing the status filter
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((appointment) => {
            const config = statusConfig[appointment.status];
            let formattedDate: string;
            try {
              formattedDate = format(
                new Date(appointment.slotDate + "T00:00:00Z"),
                "MMMM d, yyyy"
              );
            } catch {
              formattedDate = appointment.slotDate;
            }

            const isAcceptLoading = actionLoading === `${appointment.id}-accept`;
            const isRejectLoading = actionLoading === `${appointment.id}-reject`;
            const isAnyActionLoading = actionLoading !== null;

            return (
              <Card key={appointment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="size-4 text-muted-foreground" />
                      {appointment.patientName}
                    </CardTitle>
                    <Badge className={config.className}>{config.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="size-4" />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClockIcon className="size-4" />
                    <span>
                      {formatSlotTime(appointment.slotStartTime)} –{" "}
                      {formatSlotTime(appointment.slotEndTime)}
                    </span>
                  </div>
                </CardContent>
                {appointment.status === "confirmed" && callingNotifications[appointment.id] && (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 mx-6 mb-2 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <PhoneCall className="size-4 text-green-600 dark:text-green-400 animate-pulse" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {callingNotifications[appointment.id]} is calling
                    </span>
                  </div>
                )}
                <CardFooter className="gap-2">
                  {appointment.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleAction(appointment.id, "accept")}
                        disabled={isAnyActionLoading}
                      >
                        {isAcceptLoading ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        <span className="ml-1">Accept</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(appointment.id, "reject")}
                        disabled={isAnyActionLoading}
                      >
                        {isRejectLoading ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <X className="size-4" />
                        )}
                        <span className="ml-1">Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPatientId(appointment.patientId);
                          setSelectedAppointmentId(appointment.id);
                          setIsProfileOpen(true);
                        }}
                      >
                        <Eye className="mr-1 size-4" />
                        View Patient Profile
                      </Button>
                    </>
                  ) : appointment.status === "confirmed" ? (
                    <>
                      <Button asChild size="sm">
                        <Link href={`/consultation/${appointment.id}`}>
                          <Video className="mr-1 size-4" />
                          Join Consultation
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPatientId(appointment.patientId);
                          setSelectedAppointmentId(appointment.id);
                          setIsProfileOpen(true);
                        }}
                      >
                        <Eye className="mr-1 size-4" />
                        View Patient Profile
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {config.label}
                    </span>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {selectedPatientId && selectedAppointmentId && (
        <PatientProfileViewer
          patientId={selectedPatientId}
          appointmentId={selectedAppointmentId}
          open={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setSelectedPatientId(null);
            setSelectedAppointmentId(null);
          }}
        />
      )}
    </div>
  );
}
