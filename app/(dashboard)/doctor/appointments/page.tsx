import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DoctorAppointmentList } from "@/components/appointments/doctor-appointment-list";

export default async function DoctorAppointmentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "doctor") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <p className="text-muted-foreground">
          Review and manage your patient appointments.
        </p>
      </div>
      <DoctorAppointmentList />
    </div>
  );
}
