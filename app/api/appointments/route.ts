import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, availabilitySlots, users } from "@/lib/db/schema";
import { getSession, requireRole } from "@/lib/auth-helpers";
import { createAppointmentSchema } from "@/lib/validators";
import { createNotification, sendEmail } from "@/lib/notifications";

export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as string;
  const userId = session.user.id;

  let whereClause;
  if (role === "patient") {
    whereClause = eq(appointments.patientId, userId);
  } else if (role === "doctor") {
    whereClause = eq(appointments.doctorId, userId);
  }
  // admin: no where clause — return all

  const rows = await db
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
    .where(whereClause);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireRole("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAppointmentSchema.safeParse(body);
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

  const { slotId, doctorId, timezone } = parsed.data;
  const patientId = session.user.id;

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the slot row to prevent double-booking
      const [slot] = await tx
        .select()
        .from(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.id, slotId),
            eq(availabilitySlots.doctorId, doctorId)
          )
        )
        .for("update");

      if (!slot) {
        return { error: "Slot not found", status: 404 };
      }

      if (slot.isBooked) {
        return { error: "Slot no longer available", status: 409 };
      }

      // Mark slot as booked
      await tx
        .update(availabilitySlots)
        .set({ isBooked: true })
        .where(eq(availabilitySlots.id, slotId));

      // Build scheduledAt from slot date + startTime
      // The client sends their IANA timezone (e.g., "Asia/Dhaka")
      // We need to interpret the slot time in that timezone and store as UTC
      const timeStr = slot.startTime.substring(0, 5); // "HH:mm"
      const dateTimeStr = `${slot.date}T${timeStr}:00`;
      
      // Get the UTC offset for the client's timezone on this specific date
      const tempDate = new Date(dateTimeStr + "Z"); // treat as UTC temporarily
      const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
      const tzStr = tempDate.toLocaleString("en-US", { timeZone: timezone });
      const utcDate = new Date(utcStr);
      const tzDate = new Date(tzStr);
      const offsetMs = utcDate.getTime() - tzDate.getTime();
      
      // The slot time is in the client's timezone, so subtract the offset to get UTC
      const scheduledAt = new Date(tempDate.getTime() + offsetMs);

      // Create the appointment
      const [appointment] = await tx
        .insert(appointments)
        .values({
          patientId,
          doctorId,
          slotId,
          status: "pending",
          scheduledAt,
        })
        .returning();

      return { appointment, status: 201 };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    // Send notification to patient (best-effort, don't block response)
    try {
      const [doctor] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, doctorId));

      const [patient] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, patientId));

      const scheduledDate = new Date(result.appointment.scheduledAt).toLocaleString();

      await createNotification(
        patientId,
        "appointment_booked",
        `Your appointment with Dr. ${doctor?.name ?? "your doctor"} on ${scheduledDate} has been booked and is pending confirmation.`
      );

      if (patient?.email) {
        await sendEmail(
          patient.email,
          "Appointment Booked - MediConnect",
          `<p>Hi ${patient.name},</p><p>Your appointment with Dr. ${doctor?.name ?? "your doctor"} on ${scheduledDate} has been booked and is pending confirmation.</p>`
        );
      }
    } catch {
      // Notification is best-effort
    }

    return NextResponse.json(result.appointment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
