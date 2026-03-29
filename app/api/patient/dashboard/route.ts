import { NextResponse } from "next/server";
import { eq, and, gt, sql, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  prescriptions,
  users,
  availabilitySlots,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";

export async function GET() {
  let session;
  try {
    session = await requireRole("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const patientId = session.user.id;
  const now = new Date();

  // Count upcoming appointments (pending/confirmed with future scheduledAt)
  const [{ count: upcomingCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        inArray(appointments.status, ["pending", "confirmed"]),
        gt(appointments.scheduledAt, now)
      )
    );

  // Count completed appointments
  const [{ count: completedCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(appointments)
    .where(
      and(
        eq(appointments.patientId, patientId),
        eq(appointments.status, "completed")
      )
    );

  // Count prescriptions for this patient's appointments
  const [{ count: prescriptionCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prescriptions)
    .innerJoin(appointments, eq(prescriptions.appointmentId, appointments.id))
    .where(eq(appointments.patientId, patientId));

  // Fetch next upcoming appointment (earliest future pending/confirmed)
  const nextAppointmentRows = await db
    .select({
      id: appointments.id,
      doctorName: users.name,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      slotId: appointments.slotId,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(
      and(
        eq(appointments.patientId, patientId),
        inArray(appointments.status, ["pending", "confirmed"]),
        gt(appointments.scheduledAt, now)
      )
    )
    .orderBy(appointments.scheduledAt)
    .limit(1);

  let nextAppointment: {
    id: string;
    doctorName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null = null;

  if (nextAppointmentRows.length > 0) {
    const row = nextAppointmentRows[0];
    let startTime: string;
    let endTime: string;

    // Try to get times from the availability slot
    if (row.slotId) {
      const slotRows = await db
        .select({
          startTime: availabilitySlots.startTime,
          endTime: availabilitySlots.endTime,
        })
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, row.slotId))
        .limit(1);

      if (slotRows.length > 0) {
        startTime = slotRows[0].startTime;
        endTime = slotRows[0].endTime;
      } else {
        // Slot not found, derive from scheduledAt
        const scheduled = new Date(row.scheduledAt);
        startTime = scheduled.toTimeString().slice(0, 5);
        const endDate = new Date(scheduled.getTime() + 30 * 60 * 1000);
        endTime = endDate.toTimeString().slice(0, 5);
      }
    } else {
      // No slot linked, derive from scheduledAt
      const scheduled = new Date(row.scheduledAt);
      startTime = scheduled.toTimeString().slice(0, 5);
      const endDate = new Date(scheduled.getTime() + 30 * 60 * 1000);
      endTime = endDate.toTimeString().slice(0, 5);
    }

    nextAppointment = {
      id: row.id,
      doctorName: row.doctorName,
      date: row.scheduledAt.toISOString(),
      startTime,
      endTime,
      status: row.status,
    };
  }

  // Fetch 3 most recent prescriptions as PrescriptionListItem[]
  const recentPrescriptionRows = await db
    .select({
      id: prescriptions.id,
      appointmentId: prescriptions.appointmentId,
      doctorName: users.name,
      appointmentDate: appointments.scheduledAt,
      medications: prescriptions.medications,
      notes: prescriptions.notes,
      pdfKey: prescriptions.pdfKey,
      createdAt: prescriptions.createdAt,
    })
    .from(prescriptions)
    .innerJoin(appointments, eq(prescriptions.appointmentId, appointments.id))
    .innerJoin(users, eq(appointments.doctorId, users.id))
    .where(eq(appointments.patientId, patientId))
    .orderBy(desc(prescriptions.createdAt))
    .limit(3);

  const recentPrescriptions = recentPrescriptionRows.map((r) => ({
    id: r.id,
    appointmentId: r.appointmentId,
    doctorName: r.doctorName,
    appointmentDate: r.appointmentDate.toISOString(),
    medications: r.medications,
    notes: r.notes,
    pdfKey: r.pdfKey,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({
    upcomingCount,
    completedCount,
    prescriptionCount,
    nextAppointment,
    recentPrescriptions,
  });
}
