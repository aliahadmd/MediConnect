"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { staggerContainer, cardVariants } from "@/lib/animation-variants";
import { EmptyStateIllustration } from "@/components/illustrations";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrescriptionCard } from "@/components/prescriptions/prescription-card";
import {
  CalendarIcon,
  CheckCircle,
  Pill,
  Clock,
  Search,
  CalendarPlus,
} from "lucide-react";

interface NextAppointment {
  id: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface PrescriptionListItem {
  id: string;
  appointmentId: string;
  doctorName: string;
  appointmentDate: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  notes: string | null;
  pdfKey: string | null;
  createdAt: string;
}

interface DashboardData {
  upcomingCount: number;
  completedCount: number;
  prescriptionCount: number;
  nextAppointment: NextAppointment | null;
  recentPrescriptions: PrescriptionListItem[];
}

interface PatientDashboardContentProps {
  userName?: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function PatientDashboardContent({ userName }: PatientDashboardContentProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/patient/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load dashboard");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Personalized greeting */}
      {userName && (
        <div data-testid="patient-greeting">
          <h2 className="text-xl font-semibold">Welcome back, {userName}</h2>
          <p className="text-muted-foreground">Here&apos;s your health overview</p>
        </div>
      )}

      {/* Summary Cards */}
      <motion.div
        className="grid gap-4 sm:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardDescription>Upcoming Appointments</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl font-bold">
                <CalendarIcon className="size-8 text-primary" />
                {data.upcomingCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Card className="bg-green-500/10">
            <CardHeader>
              <CardDescription>Completed Consultations</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl font-bold">
                <CheckCircle className="size-8 text-green-600" />
                {data.completedCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div variants={cardVariants}>
          <Card className="bg-blue-500/10">
            <CardHeader>
              <CardDescription>Total Prescriptions</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl font-bold">
                <Pill className="size-8 text-blue-600" />
                {data.prescriptionCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>
      </motion.div>

      {/* Next Appointment + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.nextAppointment ? (
          <Card>
            <CardHeader>
              <CardTitle>Next Appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                Dr. {data.nextAppointment.doctorName}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="size-4" />
                {formatDate(data.nextAppointment.date)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                {data.nextAppointment.startTime} –{" "}
                {data.nextAppointment.endTime}
              </div>
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/patient/appointments`)
                }
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="empty-appointments">
            <CardHeader>
              <CardTitle>No Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
              <EmptyStateIllustration size={120} className="text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any upcoming appointments.
                </p>
                <p className="text-sm text-muted-foreground">
                  Book a consultation with a doctor to get started on your wellness journey.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => router.push("/doctors/search")}
              >
                <CalendarPlus className="size-4" />
                Book Appointment
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 min-h-[44px] min-w-[44px]"
              onClick={() => router.push("/doctors/search")}
            >
              <Search className="size-4" />
              Find a Doctor
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Prescriptions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Prescriptions</h2>
        {data.recentPrescriptions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentPrescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                id={prescription.id}
                doctorName={prescription.doctorName}
                appointmentDate={prescription.appointmentDate}
                medicationCount={prescription.medications.length}
                createdAt={prescription.createdAt}
                onClick={() =>
                  router.push(`/patient/prescriptions/${prescription.id}`)
                }
              />
            ))}
          </div>
        ) : (
          <div data-testid="empty-prescriptions" className="flex flex-col items-center gap-4 py-8 text-center">
            <EmptyStateIllustration size={120} className="text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-lg font-medium">No recent prescriptions</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Prescriptions from your completed appointments will appear here. Book a consultation to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
