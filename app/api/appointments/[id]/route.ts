import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, availabilitySlots, users } from "@/lib/db/schema";
import { getSession, requireRole } from "@/lib/auth-helpers";
import { updateAppointmentSchema } from "@/lib/validators";
import { createNotification, sendEmail } from "@/lib/notifications";

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

  const [row] = await db
    .select({
      id: appointments.id,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      slotId: appointments.slotId,
      status: appointments.status,
      scheduledAt: appointments.scheduledAt,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      doctorName: sql<string>`doctor.name`.as("doctorName"),
      patientName: sql<string>`patient.name`.as("patientName"),
      slotDate: availabilitySlots.date,
      slotStartTime: availabilitySlots.startTime,
      slotEndTime: availabilitySlots.endTime,
    })
    .from(appointments)
    .innerJoin(
      sql`${users} as doctor`,
      sql`doctor.id = ${appointments.doctorId}`
    )
    .innerJoin(
      sql`${users} as patient`,
      sql`patient.id = ${appointments.patientId}`
    )
    .innerJoin(
      availabilitySlots,
      eq(availabilitySlots.id, appointments.slotId)
    )
    .where(eq(appointments.id, id));

  if (!row) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(row);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireRole("doctor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = updateAppointmentSchema.safeParse(body);
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

  const { action } = parsed.data;

  // Find the appointment and verify it belongs to this doctor
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

  if (appointment.doctorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (appointment.status !== "pending") {
    return NextResponse.json(
      {
        error: `Cannot transition from ${appointment.status} to ${action === "accept" ? "confirmed" : "rejected"}`,
      },
      { status: 400 }
    );
  }

  const newStatus = action === "accept" ? "confirmed" : "rejected";

  try {
    const result = await db.transaction(async (tx) => {
      // Update appointment status
      const [updated] = await tx
        .update(appointments)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(appointments.id, id))
        .returning();

      // If rejected, release the slot
      if (action === "reject") {
        await tx
          .update(availabilitySlots)
          .set({ isBooked: false })
          .where(eq(availabilitySlots.id, appointment.slotId));
      }

      return updated;
    });

    // Notify patient of status change (best-effort)
    try {
      const [doctor] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, session.user.id));

      const [patient] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, appointment.patientId));

      const statusText = newStatus === "confirmed" ? "confirmed" : "rejected";
      const message = `Your appointment with Dr. ${doctor?.name ?? "your doctor"} has been ${statusText}.`;

      await createNotification(
        appointment.patientId,
        `appointment_${statusText}`,
        message
      );

      if (patient?.email) {
        await sendEmail(
          patient.email,
          `Appointment ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - MediConnect`,
          `<p>Hi ${patient.name},</p><p>${message}</p>`
        );
      }
    } catch {
      // Notification is best-effort
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
