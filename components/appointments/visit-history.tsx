"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FileTextIcon,
  Download,
  Loader2Icon,
  HistoryIcon,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch("/api/appointments");
        if (res.ok) {
          const data: Appointment[] = await res.json();
          setAppointments(data.filter((a) => a.status === "completed"));
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, []);

  async function openDetail(appointmentId: string) {
    setSelectedId(appointmentId);
    setDetail(null);
    setDetailLoading(true);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/detail`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch {
      // silently handle
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDownloadError(null);
  }

  async function handleDownload(prescriptionId: string) {
    setDownloadError(null);
    setDownloading(true);
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}/download`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to get download link");
      }
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading visit history…</span>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HistoryIcon className="size-10 text-muted-foreground/50" />
        <p className="mt-3 text-muted-foreground">No completed visits yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {appointments.map((appt) => {
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
            <Card
              key={appt.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openDetail(appt.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserIcon className="size-4 text-muted-foreground" />
                    Dr. {appt.doctorName}
                  </CardTitle>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Completed
                  </Badge>
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
                    {formatSlotTime(appt.slotStartTime)} –{" "}
                    {formatSlotTime(appt.slotEndTime)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visit Details</DialogTitle>
          </DialogHeader>

          {detailLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading details…</span>
            </div>
          )}

          {!detailLoading && detail && (
            <div className="space-y-6">
              {/* Appointment info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">Dr. {detail.doctorName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {(() => {
                      try {
                        return format(
                          new Date(detail.slotDate + "T00:00:00Z"),
                          "MMMM d, yyyy"
                        );
                      } catch {
                        return detail.slotDate;
                      }
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {formatSlotTime(detail.slotStartTime)} –{" "}
                    {formatSlotTime(detail.slotEndTime)}
                  </p>
                </div>
              </div>

              {/* Visit Notes */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileTextIcon className="size-4" />
                  Visit Notes
                </h3>
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
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileTextIcon className="size-4" />
                  Prescription
                </h3>
                {detail.prescription ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medication</TableHead>
                          <TableHead>Dosage</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detail.prescription.medications as Medication[]).map(
                          (med, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {med.name}
                              </TableCell>
                              <TableCell>{med.dosage}</TableCell>
                              <TableCell>{med.frequency}</TableCell>
                              <TableCell>{med.duration}</TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>

                    {detail.prescription.notes && (
                      <div>
                        <p className="mb-1 text-sm font-medium">
                          Prescription Notes
                        </p>
                        <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                          {detail.prescription.notes}
                        </p>
                      </div>
                    )}

                    {downloadError && (
                      <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        {downloadError}
                      </div>
                    )}

                    {detail.prescription.pdfKey && (
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(detail.prescription!.id)}
                        disabled={downloading}
                      >
                        <Download className="mr-2 size-4" />
                        {downloading
                          ? "Preparing Download..."
                          : "Download Prescription PDF"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No prescription issued for this visit.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
