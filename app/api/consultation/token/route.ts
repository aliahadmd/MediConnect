import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";
import { createRoomToken, isWithinJoinWindow } from "@/lib/livekit";
import { createNotification } from "@/lib/notifications";

const tokenRequestSchema = z.object({
  appointmentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = tokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const { appointmentId } = parsed.data;

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // Verify user is a participant (patient or doctor)
  const userId = session.user.id;
  if (appointment.patientId !== userId && appointment.doctorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify appointment is confirmed
  if (appointment.status !== "confirmed") {
    return NextResponse.json(
      { error: "Appointment is not confirmed" },
      { status: 400 }
    );
  }

  // Verify within join window
  if (!isWithinJoinWindow(appointment.scheduledAt)) {
    return NextResponse.json(
      { error: "Consultation not yet available" },
      { status: 403 }
    );
  }

  try {
    const token = await createRoomToken(
      appointmentId,
      session.user.name,
      session.user.id
    );

    // When a patient requests a token, notify the doctor
    if (appointment.patientId === userId) {
      await createNotification(
        appointment.doctorId,
        "patient_calling",
        `Patient ${session.user.name} is calling for appointment`
      );
    }

    return NextResponse.json({
      token,
      serverUrl: process.env.LIVEKIT_URL,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create video session" },
      { status: 500 }
    );
  }
}
