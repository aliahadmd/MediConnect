import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CalendarView } from "@/components/availability/calendar-view";

export default async function DoctorAvailabilityPage() {
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
        <h1 className="text-2xl font-semibold">Availability Calendar</h1>
        <p className="text-muted-foreground">
          Manage your available time slots for patient consultations.
        </p>
      </div>
      <CalendarView doctorId={session.user.id} />
    </div>
  );
}
