"use client";

import Link from "next/link";
import { format } from "date-fns";

export interface TimelineEventProps {
  type: "appointment" | "prescription" | "visit_note";
  date: string;
  summary: string;
  detailUrl: string;
  icon: React.ReactNode;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

const typeLabels: Record<TimelineEventProps["type"], string> = {
  appointment: "Appointment",
  prescription: "Prescription",
  visit_note: "Visit Note",
};

export function TimelineEvent({
  type,
  date,
  summary,
  detailUrl,
  icon,
}: TimelineEventProps) {
  return (
    <div className="flex gap-4 py-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            {typeLabels[type]}
          </span>
          <time className="text-xs text-muted-foreground" dateTime={date}>
            {formatDate(date)}
          </time>
        </div>
        <p className="mt-1 text-sm text-foreground">{summary}</p>
        <Link
          href={detailUrl}
          className="mt-1 inline-block text-xs text-primary underline-offset-3 hover:underline"
        >
          View details
        </Link>
      </div>
    </div>
  );
}
