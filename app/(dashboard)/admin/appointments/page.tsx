import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppointmentOversight } from "@/components/admin/appointment-oversight";

export default async function AdminAppointmentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "admin") {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appointment Oversight</h1>
        <p className="text-muted-foreground">
          View and manage all appointments across the platform. Filter by status
          and cancel appointments when needed.
        </p>
      </div>
      <AppointmentOversight />
    </div>
  );
}
