import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppointmentList } from "@/components/appointments/appointment-list";

export default async function PatientAppointmentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "patient") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Appointments</h1>
        <p className="text-muted-foreground">
          View and manage your upcoming and past appointments.
        </p>
      </div>
      <AppointmentList />
    </div>
  );
}
