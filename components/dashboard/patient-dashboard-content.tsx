"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function PatientDashboardContent() {
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
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Upcoming Appointments</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CalendarIcon className="size-5 text-primary" />
              {data.upcomingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed Consultations</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="size-5 text-green-600" />
              {data.completedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Prescriptions</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Pill className="size-5 text-blue-600" />
              {data.prescriptionCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Next Appointment + Quick Book */}
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
          <Card>
            <CardHeader>
              <CardTitle>No Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You don&apos;t have any upcoming appointments. Book a
                consultation to get started.
              </p>
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
              className="w-full justify-start gap-2"
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
          <p className="text-sm text-muted-foreground">
            No prescriptions yet. Prescriptions from completed appointments will
            appear here.
          </p>
        )}
      </div>
    </div>
  );
}
