"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { illustrationVariants } from "@/lib/animation-variants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyStateIllustration } from "@/components/illustrations";
import { AppointmentCard, type Appointment } from "./appointment-card";
import { CalendarIcon, Loader2Icon } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function AppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchAppointments() {
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
    }
    fetchAppointments();
  }, []);

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
        <div data-testid="empty-patient-appointments" className="flex flex-col items-center gap-4 py-12 text-center">
          <motion.div variants={illustrationVariants} initial="hidden" animate="visible">
            <EmptyStateIllustration size={160} className="text-muted-foreground/60" />
          </motion.div>
          <div className="space-y-1">
            <p className="text-lg font-medium">No appointments yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Book a consultation to get started
            </p>
          </div>
          <Button asChild className="min-h-[44px] min-w-[44px]">
            <Link href="/patient/book">Book Appointment</Link>
          </Button>
          {statusFilter !== "all" && (
            <p className="text-sm text-muted-foreground/70">
              Try changing the status filter
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </div>
      )}
    </div>
  );
}
