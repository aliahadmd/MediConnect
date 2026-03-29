"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FileTextIcon,
  PillIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  HistoryIcon,
  CalendarPlusIcon,
} from "lucide-react";
import type { Appointment } from "./appointment-card";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface AppointmentDetail {
  id: string;
  doctorName: string;
  patientName: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  status: string;
  scheduledAt: string;
  visitNotes: { content: string; updatedAt: string } | null;
  prescription: {
    id: string;
    medications: Medication[];
    notes: string | null;
    pdfKey: string | null;
    createdAt: string;
  } | null;
}

type StatusFilter = "all" | "completed" | "cancelled" | "rejected";

const PAST_STATUSES = ["completed", "cancelled", "rejected"] as const;

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: {
    label: "Completed",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  rejected: {
    label: "Rejected",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function VisitHistory() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AppointmentDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch("/api/appointments");
        if (res.ok) {
          const data: Appointment[] = await res.json();
          setAppointments(
            data.filter((a) =>
              PAST_STATUSES.includes(a.status as (typeof PAST_STATUSES)[number])
            )
          );
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, []);

  async function toggleDetail(appointmentId: string) {
    if (expandedId === appointmentId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(appointmentId);
    await fetchDetail(appointmentId);
  }

  async function fetchDetail(appointmentId: string) {
    // Clear error and re-fetch if retrying a failed appointment
    const shouldFetch = !details[appointmentId] || detailError === appointmentId;
    if (detailError === appointmentId) {
      setDetailError(null);
    }

    if (shouldFetch) {
      setDetailLoading(appointmentId);
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/detail`);
        if (!res.ok) {
          setDetailError(appointmentId);
        } else {
          const data: AppointmentDetail = await res.json();
          setDetails((prev) => ({ ...prev, [appointmentId]: data }));
        }
      } catch {
        setDetailError(appointmentId);
      } finally {
        setDetailLoading(null);
      }
    }
  }

  function retryDetail(appointmentId: string) {
    fetchDetail(appointmentId);
  }

  function filterAppointments(filter: StatusFilter): Appointment[] {
    if (filter === "all") return appointments;
    return appointments.filter((a) => a.status === filter);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading visit history…
        </span>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HistoryIcon className="size-10 text-muted-foreground/50" />
        <p className="mt-3 text-muted-foreground">No past appointments yet</p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Book a consultation to get started with your healthcare journey.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/patient/book">
            <CalendarPlusIcon className="mr-2 size-4" />
            Book a Consultation
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
        <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        <TabsTrigger value="rejected">Rejected</TabsTrigger>
      </TabsList>

      {(["all", "completed", "cancelled", "rejected"] as StatusFilter[]).map(
        (filter) => (
          <TabsContent key={filter} value={filter}>
            <AppointmentList
              appointments={filterAppointments(filter)}
              expandedId={expandedId}
              details={details}
              detailLoading={detailLoading}
              detailError={detailError}
              onToggleDetail={toggleDetail}
              onRetryDetail={retryDetail}
              emptyMessage={
                filter === "all"
                  ? "No past appointments"
                  : `No ${filter} appointments`
              }
            />
          </TabsContent>
        )
      )}
    </Tabs>
  );
}

function AppointmentList({
  appointments,
  expandedId,
  details,
  detailLoading,
  detailError,
  onToggleDetail,
  onRetryDetail,
  emptyMessage,
}: {
  appointments: Appointment[];
  expandedId: string | null;
  details: Record<string, AppointmentDetail>;
  detailLoading: string | null;
  detailError: string | null;
  onToggleDetail: (id: string) => void;
  onRetryDetail: (id: string) => void;
  emptyMessage: string;
}) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <HistoryIcon className="size-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appt) => {
        const config = statusConfig[appt.status];
        const isExpanded = expandedId === appt.id;
        const detail = details[appt.id];
        const isLoadingDetail = detailLoading === appt.id;
        const hasError = detailError === appt.id;

        let formattedDate: string;
        try {
          formattedDate = format(
            new Date(appt.slotDate + "T00:00:00Z"),
            "MMMM d, yyyy"
          );
        } catch {
          formattedDate = appt.slotDate;
        }

        return (
          <Card key={appt.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => onToggleDetail(appt.id)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserIcon className="size-4 text-muted-foreground" />
                  Dr. {appt.doctorName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {config && (
                    <Badge className={config.className}>{config.label}</Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUpIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDownIcon className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ClockIcon className="size-3.5" />
                  <span>
                    {formatSlotTime(appt.slotStartTime)} –{" "}
                    {formatSlotTime(appt.slotEndTime)}
                  </span>
                </div>
                {detail && (
                  <div className="flex items-center gap-2">
                    {detail.visitNotes && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileTextIcon className="size-3" />
                        Notes
                      </span>
                    )}
                    {detail.prescription && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <PillIcon className="size-3" />
                        Prescription
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent>
                {isLoadingDetail && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading details…
                    </span>
                  </div>
                )}

                {!isLoadingDetail && detail && !hasError && (
                  <ExpandedDetail detail={detail} />
                )}

                {!isLoadingDetail && hasError && (
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <p className="text-sm text-destructive">
                      Unable to load appointment details.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRetryDetail(appt.id)}
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {!isLoadingDetail && !detail && !hasError && (
                  <p className="text-sm text-muted-foreground">
                    Unable to load appointment details.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ExpandedDetail({ detail }: { detail: AppointmentDetail }) {
  return (
    <div className="space-y-4 border-t pt-4">
      {/* Visit Notes */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <FileTextIcon className="size-3.5" />
          Visit Notes
        </h4>
        {detail.visitNotes ? (
          <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
            {detail.visitNotes.content || "No notes recorded."}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No notes recorded for this visit.
          </p>
        )}
      </div>

      {/* Prescription */}
      <div>
        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <PillIcon className="size-3.5" />
          Prescription
        </h4>
        {detail.prescription ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {detail.prescription.medications.length} medication
              {detail.prescription.medications.length !== 1 ? "s" : ""}{" "}
              prescribed
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/patient/prescriptions/${detail.prescription.id}`}>
                View Prescription Details
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No prescription issued for this visit.
          </p>
        )}
      </div>
    </div>
  );
}
