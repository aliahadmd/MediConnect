"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { illustrationVariants } from "@/lib/animation-variants";
import { TimelineEvent } from "@/components/timeline/timeline-event";
import { EmptyStateIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  Pill,
  FileText,
  Clock,
} from "lucide-react";

interface TimelineEventData {
  id: string;
  type: "appointment" | "prescription" | "visit_note";
  date: string;
  summary: string;
  detailUrl: string;
}

type EventType = "appointment" | "prescription" | "visit_note";

const typeIcons: Record<EventType, React.ReactNode> = {
  appointment: <CalendarIcon className="size-4" />,
  prescription: <Pill className="size-4" />,
  visit_note: <FileText className="size-4" />,
};

const filterOptions: { label: string; value: EventType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Appointments", value: "appointment" },
  { label: "Prescriptions", value: "prescription" },
  { label: "Visit Notes", value: "visit_note" },
];

export function MedicalTimelineContent() {
  const [events, setEvents] = useState<TimelineEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventType | "all">("all");

  const fetchEvents = useCallback(async (filter: EventType | "all") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("type", filter);
      }
      const url = `/api/patient/timeline${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load timeline");
      }
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(activeFilter);
  }, [activeFilter, fetchEvents]);

  function handleFilterChange(filter: EventType | "all") {
    setActiveFilter(filter);
  }

  return (
    <div className="space-y-4">
      {/* Filter Toggles */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={activeFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div data-testid="empty-timeline" className="flex flex-col items-center gap-4 py-12 text-center">
          <motion.div variants={illustrationVariants} initial="hidden" animate="visible">
            <EmptyStateIllustration size={160} className="text-muted-foreground/60" />
          </motion.div>
          <div className="space-y-1">
            <p className="text-lg font-medium">No timeline events yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your healthcare journey will be recorded here as you use the platform
            </p>
          </div>
          <Button asChild className="min-h-[44px] min-w-[44px]">
            <Link href="/patient/book">Book Appointment</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-0">
          {events.map((event) => (
            <TimelineEvent
              key={`${event.type}-${event.id}`}
              type={event.type}
              date={event.date}
              summary={event.summary}
              detailUrl={event.detailUrl}
              icon={typeIcons[event.type]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
