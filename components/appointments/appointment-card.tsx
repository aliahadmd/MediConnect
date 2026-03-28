"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ClockIcon, UserIcon } from "lucide-react";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  status: "pending" | "confirmed" | "rejected" | "completed" | "cancelled";
  scheduledAt: string;
  doctorName: string;
  patientName: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
}

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

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const { status, doctorName, slotDate, slotStartTime, slotEndTime } = appointment;
  const config = statusConfig[status];

  let formattedDate: string;
  try {
    formattedDate = format(new Date(slotDate + "T00:00:00Z"), "MMMM d, yyyy");
  } catch {
    formattedDate = slotDate;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-4 text-muted-foreground" />
            Dr. {doctorName}
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
            {formatSlotTime(slotStartTime)} – {formatSlotTime(slotEndTime)}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        {status === "confirmed" && (
          <Button asChild size="sm">
            <Link href={`/consultation/${appointment.id}`}>Join Consultation</Link>
          </Button>
        )}
        {status === "pending" && (
          <span className="text-sm text-muted-foreground">Awaiting confirmation</span>
        )}
      </CardFooter>
    </Card>
  );
}
