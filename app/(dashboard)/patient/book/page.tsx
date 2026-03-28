import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BookingStepper } from "@/components/appointments/booking-stepper";

export default async function PatientBookPage() {
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
        <h1 className="text-2xl font-semibold">Book an Appointment</h1>
        <p className="text-muted-foreground">
          Select a doctor, choose an available time slot, and confirm your
          booking.
        </p>
      </div>
      <BookingStepper />
    </div>
  );
}
