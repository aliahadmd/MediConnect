import { NextRequest, NextResponse } from "next/server";
import { eq, and, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  availabilitySlots,
  users,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const offset = (page - 1) * limit;

  const conditions = [];

  if (
    status &&
    ["pending", "confirmed", "rejected", "completed", "cancelled"].includes(
      status
    )
  ) {
    conditions.push(
      eq(
        appointments.status,
        status as
          | "pending"
          | "confirmed"
          | "rejected"
          | "completed"
          | "cancelled"
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
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
      .where(where)
      .orderBy(appointments.scheduledAt)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(appointments).where(where),
  ]);

  return NextResponse.json({
    appointments: rows,
    total: totalRow.total,
    page,
    limit,
  });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { appointmentId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { appointmentId, action } = body;

  if (!appointmentId || action !== "cancel") {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: [
          ...(!appointmentId
            ? [{ field: "appointmentId", message: "appointmentId is required" }]
            : []),
          ...(action !== "cancel"
            ? [{ field: "action", message: 'action must be "cancel"' }]
            : []),
        ],
      },
      { status: 400 }
    );
  }

  // Find the appointment
  const [appointment] = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      slotId: appointments.slotId,
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
      doctorName: sql<string>`doctor.name`.as("doctorName"),
    })
    .from(appointments)
    .innerJoin(
      sql`${users} as doctor`,
      sql`doctor.id = ${appointments.doctorId}`
    )
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  if (appointment.status !== "pending" && appointment.status !== "confirmed") {
    return NextResponse.json(
      {
        error: `Cannot cancel appointment with status "${appointment.status}"`,
      },
      { status: 400 }
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Set status to cancelled
      const [updated] = await tx
        .update(appointments)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(appointments.id, appointmentId))
        .returning();

      // Release the slot
      await tx
        .update(availabilitySlots)
        .set({ isBooked: false })
        .where(eq(availabilitySlots.id, appointment.slotId));

      return updated;
    });

    // Notify both patient and doctor (best-effort, outside transaction so SSE emission works)
    try {
      await createNotification(
        appointment.patientId,
        "appointment_cancelled",
        `Your appointment with Dr. ${appointment.doctorName} has been cancelled by an administrator.`
      );
      await createNotification(
        appointment.doctorId,
        "appointment_cancelled",
        `An appointment has been cancelled by an administrator.`
      );
    } catch {
      // Notification is best-effort
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}
