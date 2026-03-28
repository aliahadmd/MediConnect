import { NextRequest, NextResponse } from "next/server";
import { eq, and, count, ilike, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  availabilitySlots,
  appointments,
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
  const doctorName = searchParams.get("doctorName");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const offset = (page - 1) * limit;

  const conditions = [];

  if (doctorName) {
    conditions.push(ilike(users.name, `%${doctorName}%`));
  }
  if (dateFrom) {
    conditions.push(gte(availabilitySlots.date, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(availabilitySlots.date, dateTo));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: availabilitySlots.id,
        doctorId: availabilitySlots.doctorId,
        doctorName: users.name,
        date: availabilitySlots.date,
        startTime: availabilitySlots.startTime,
        endTime: availabilitySlots.endTime,
        isBooked: availabilitySlots.isBooked,
        createdAt: availabilitySlots.createdAt,
      })
      .from(availabilitySlots)
      .innerJoin(users, eq(users.id, availabilitySlots.doctorId))
      .where(where)
      .orderBy(availabilitySlots.date, availabilitySlots.startTime)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(availabilitySlots)
      .innerJoin(users, eq(users.id, availabilitySlots.doctorId))
      .where(where),
  ]);

  return NextResponse.json({
    slots: rows,
    total: totalRow.total,
    page,
    limit,
  });
}


export async function DELETE(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { slotIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slotIds } = body;

  if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: [
          {
            field: "slotIds",
            message: "At least one slot ID is required",
          },
        ],
      },
      { status: 400 }
    );
  }

  try {
    const pendingNotifications: Array<{
      userId: string;
      type: string;
      message: string;
    }> = [];

    const result = await db.transaction(async (tx) => {
      let cancelledAppointments = 0;

      for (const slotId of slotIds) {
        // Find active appointments for this slot
        const slotAppointments = await tx
          .select({
            id: appointments.id,
            patientId: appointments.patientId,
            doctorId: appointments.doctorId,
            doctorName: users.name,
          })
          .from(appointments)
          .innerJoin(users, eq(users.id, appointments.doctorId))
          .where(
            and(
              eq(appointments.slotId, slotId),
              inArray(appointments.status, ["pending", "confirmed"])
            )
          );

        for (const appt of slotAppointments) {
          // Cancel the appointment and nullify the slot reference
          // so the slot can be deleted without FK violation
          await tx
            .update(appointments)
            .set({ status: "cancelled", slotId: null, updatedAt: new Date() })
            .where(eq(appointments.id, appt.id));

          // Collect notifications to send after transaction commits
          pendingNotifications.push(
            {
              userId: appt.patientId,
              type: "appointment_cancelled",
              message: `Your appointment with Dr. ${appt.doctorName} has been cancelled due to schedule changes.`,
            },
            {
              userId: appt.doctorId,
              type: "appointment_cancelled",
              message: `An appointment has been cancelled by an administrator due to availability changes.`,
            }
          );

          cancelledAppointments++;
        }

        // Also nullify slotId on any already-cancelled/completed appointments
        // that still reference this slot
        await tx
          .update(appointments)
          .set({ slotId: null })
          .where(eq(appointments.slotId, slotId));

        // Now safe to delete the slot
        await tx
          .delete(availabilitySlots)
          .where(eq(availabilitySlots.id, slotId));
      }

      return { deleted: slotIds.length, cancelledAppointments };
    });

    // Send notifications after transaction commits (best-effort, enables SSE emission)
    try {
      for (const n of pendingNotifications) {
        await createNotification(n.userId, n.type, n.message);
      }
    } catch {
      // Notification is best-effort
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to delete slots. All changes have been rolled back.",
      },
      { status: 500 }
    );
  }
}
