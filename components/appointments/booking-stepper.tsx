"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  FileText,
  GraduationCap,
  Loader2,
  XCircle,
} from "lucide-react";
import { CalendarIllustration, EmptyStateIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoctorProfileCard } from "@/components/profiles/doctor-profile-card";

interface Doctor {
  id: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  specialization?: string | null;
  qualifications?: string | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  consultationFee?: string | number | null;
  profileComplete: boolean;
}

interface Slot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  createdAt: string;
}

type BookingResult =
  | { success: true; appointment: { id: string; status: string; scheduledAt: string } }
  | { success: false; error: string };

const stepVariants = {
  enter: { x: 80, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -80, opacity: 0 },
};

const STEPS = ["Select Doctor", "Select Slot", "Confirm"] as const;

const STEP_ENGAGEMENT_COPY = [
  "Choose a doctor you trust — browse specializations and reviews",
  "Pick a time that works for you — all times shown in your local timezone",
  "Review your booking details and confirm your appointment",
] as const;

export function BookingStepper() {
  const [step, setStep] = useState(0);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  // Fetch doctors on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/doctors");
        if (res.ok) {
          setDoctors(await res.json());
        }
      } catch {
        // leave empty
      } finally {
        setLoadingDoctors(false);
      }
    }
    load();
  }, []);

  // Fetch slots when a doctor is selected
  const fetchSlots = useCallback(async (doctorId: string) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(`/api/availability?doctorId=${doctorId}`);
      if (res.ok) {
        const data: Slot[] = await res.json();
        // Only show unbooked slots
        setSlots(data.filter((s) => !s.isBooked));
      }
    } catch {
      // leave empty
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  function handleSelectDoctor(doctor: Doctor) {
    setSelectedDoctor(doctor);
    setSelectedSlot(null);
    setResult(null);
    fetchSlots(doctor.id);
    setStep(1);
  }

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep(2);
  }

  async function handleConfirm() {
    if (!selectedDoctor || !selectedSlot) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          doctorId: selectedDoctor.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, appointment: data });
      } else {
        setResult({ success: false, error: data.error ?? "Booking failed" });
      }
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step === 1) {
      setSelectedSlot(null);
      setStep(0);
    } else if (step === 2) {
      setStep(1);
    }
  }

  function handleReset() {
    setStep(0);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    setResult(null);
  }

  // Group slots by date for display
  const slotsByDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    (acc[slot.date] ??= []).push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(slotsByDate).sort();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center gap-2" data-testid="booking-step-indicator">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${
                i <= step ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="w-8 border-t-2 border-muted-foreground/30" />
            )}
          </div>
        ))}
      </div>

      {/* Engagement copy for current step */}
      <p className="mb-4 text-center text-sm text-muted-foreground" data-testid="booking-engagement-copy">
        {STEP_ENGAGEMENT_COPY[step]}
      </p>

      {/* Animated step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step-0"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <StepSelectDoctor
              doctors={doctors}
              loading={loadingDoctors}
              onSelect={handleSelectDoctor}
            />
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <StepSelectSlot
              doctor={selectedDoctor!}
              slotsByDate={slotsByDate}
              sortedDates={sortedDates}
              loading={loadingSlots}
              onSelect={handleSelectSlot}
              onBack={handleBack}
            />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
          >
            <StepConfirm
              doctor={selectedDoctor!}
              slot={selectedSlot!}
              submitting={submitting}
              result={result}
              onConfirm={handleConfirm}
              onBack={handleBack}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Select Doctor                                            */
/* ------------------------------------------------------------------ */

function StepSelectDoctor({
  doctors,
  loading,
  onSelect,
}: {
  doctors: Doctor[];
  loading: boolean;
  onSelect: (d: Doctor) => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (doctors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10" data-testid="booking-empty-doctors">
          <EmptyStateIllustration size={120} className="text-muted-foreground/60" />
          <div className="space-y-1 text-center">
            <p className="text-lg font-medium">No doctors available yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Doctors will appear once they set up their availability
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a Doctor</CardTitle>
        <CardDescription>
          Select the doctor you would like to consult with.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {doctors.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onSelect(doc)}
              className="min-h-[44px] rounded-lg text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <DoctorProfileCard
                name={doc.name}
                photoUrl={doc.photoUrl}
                specialization={doc.specialization}
                yearsOfExperience={doc.yearsOfExperience}
                consultationFee={doc.consultationFee}
                profileComplete={doc.profileComplete}
              />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Select Slot                                              */
/* ------------------------------------------------------------------ */

function StepSelectSlot({
  doctor,
  slotsByDate,
  sortedDates,
  loading,
  onSelect,
  onBack,
}: {
  doctor: Doctor;
  slotsByDate: Record<string, Slot[]>;
  sortedDates: string[];
  loading: boolean;
  onSelect: (s: Slot) => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Slots</CardTitle>
        <CardDescription>
          Showing open time slots for Dr. {doctor.name}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Doctor profile summary */}
        {doctor.profileComplete && (
          <div className="mb-6 rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <DoctorProfileCard
                name={doctor.name}
                photoUrl={doctor.photoUrl}
                specialization={doctor.specialization}
                yearsOfExperience={doctor.yearsOfExperience}
                consultationFee={doctor.consultationFee}
                profileComplete={doctor.profileComplete}
              />
            </div>
            {(doctor.bio || doctor.qualifications) && (
              <div className="mt-3 space-y-2 border-t pt-3">
                {doctor.bio && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>{doctor.bio}</p>
                  </div>
                )}
                {doctor.qualifications && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>{doctor.qualifications}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8" data-testid="booking-empty-slots">
            <EmptyStateIllustration size={120} className="text-muted-foreground/60" />
            <div className="space-y-1 text-center">
              <p className="text-lg font-medium">No available slots</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try selecting a different doctor or check back later
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((dateStr) => (
              <div key={dateStr}>
                <h3 className="mb-2 text-sm font-medium">
                  {format(parseISO(dateStr), "EEEE, MMMM d, yyyy")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {slotsByDate[dateStr]
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((slot) => (
                      <Button
                        key={slot.id}
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() => onSelect(slot)}
                      >
                        {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                      </Button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Confirm Booking                                          */
/* ------------------------------------------------------------------ */

function StepConfirm({
  doctor,
  slot,
  submitting,
  result,
  onConfirm,
  onBack,
  onReset,
}: {
  doctor: Doctor;
  slot: Slot;
  submitting: boolean;
  result: BookingResult | null;
  onConfirm: () => void;
  onBack: () => void;
  onReset: () => void;
}) {
  // After a successful booking, show success state
  if (result?.success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10" data-testid="booking-success">
          <CalendarIllustration size={120} className="text-primary" />
          <h3 className="text-lg font-semibold">Your appointment is confirmed!</h3>
          <p className="text-center text-sm text-muted-foreground">
            You&apos;ll receive a notification when your doctor is ready
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Your appointment with Dr. {doctor.name} on{" "}
            {format(parseISO(slot.date), "MMMM d, yyyy")} at{" "}
            {slot.startTime.slice(0, 5)} has been submitted. Status:{" "}
            <Badge variant="secondary">{result.appointment.status}</Badge>
          </p>
          <Button onClick={onReset} className="mt-2">
            Book Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Your Booking</CardTitle>
        <CardDescription>
          Review the details below and confirm.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Doctor</span>
            <span className="text-sm font-medium">{doctor.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm font-medium">
              {format(parseISO(slot.date), "EEEE, MMMM d, yyyy")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Time</span>
            <span className="text-sm font-medium">
              {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
            </span>
          </div>
        </div>

        {result && !result.success && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 shrink-0" />
            {"error" in result ? result.error : "Booking failed"}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            ← Back
          </Button>
          <Button onClick={onConfirm} disabled={submitting} className="flex-1">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Booking…
              </>
            ) : (
              "Confirm Booking"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
