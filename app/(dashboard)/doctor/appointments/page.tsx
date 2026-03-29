import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DoctorAppointmentList } from "@/components/appointments/doctor-appointment-list";
import { DoctorIllustration } from "@/components/illustrations";

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
      <div className="flex items-center gap-4" data-testid="doctor-header">
        <DoctorIllustration size={64} decorative />
        <div>
          <h1 className="text-2xl font-semibold">Your patients are counting on you</h1>
          <p className="text-muted-foreground">
            Manage your schedule with ease
          </p>
        </div>
      </div>
      <DoctorAppointmentList />
    </div>
  );
}
