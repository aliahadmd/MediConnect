import { NextRequest, NextResponse } from "next/server";
import { eq, and, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";
import { isWithinJoinWindow } from "@/lib/livekit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Fetch the appointment
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id));

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // Verify user is the patient, assigned doctor, or admin
  const userId = session.user.id;
  const role = session.user.role as string;

  if (
    appointment.patientId !== userId &&
    appointment.doctorId !== userId &&
    role !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Queue position: count of confirmed appointments for the same doctor
  // with scheduledAt <= this appointment's scheduledAt (including this one)
  const waitingAppointments = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, appointment.doctorId),
        eq(appointments.status, "confirmed"),
        lte(appointments.scheduledAt, appointment.scheduledAt)
      )
    );

  const queuePosition = waitingAppointments.length;

  // Doctor is ready when the appointment is within the join window
  const doctorReady = isWithinJoinWindow(appointment.scheduledAt);

  return NextResponse.json({ queuePosition, doctorReady });
}
