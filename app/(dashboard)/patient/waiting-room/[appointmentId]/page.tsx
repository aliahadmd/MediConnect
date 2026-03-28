import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";
import { WaitingRoom } from "@/components/consultation/waiting-room";

export default async function WaitingRoomPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  // Verify patient role
  const userRole = (session.user as Record<string, unknown>).role as string;
  if (userRole !== "patient") {
    redirect("/login");
  }

  const { appointmentId } = await params;

  const [appointment] = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      status: appointments.status,
      scheduledAt: appointments.scheduledAt,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment || appointment.patientId !== session.user.id) {
    redirect("/patient/appointments");
  }

  // Fetch doctor name
  const [doctor] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, appointment.doctorId));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Waiting Room</h1>
        <p className="text-muted-foreground">
          Dr. {doctor?.name ?? "Unknown"} — {appointment.scheduledAt.toLocaleDateString()} at{" "}
          {appointment.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <WaitingRoom appointmentId={appointmentId} />
    </div>
  );
}
