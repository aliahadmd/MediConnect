import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  prescriptions,
  visitNotes,
  users,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { timelineFilterSchema } from "@/lib/validators";

interface TimelineEventData {
  id: string;
  type: "appointment" | "prescription" | "visit_note";
  date: string;
  summary: string;
  detailUrl: string;
}

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await requireRole("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Validate optional type filter
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = timelineFilterSchema.safeParse(searchParams);
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

  const { type } = parsed.data;
  const patientId = session.user.id;

  const events: TimelineEventData[] = [];

  // Fetch appointments
  if (!type || type === "appointment") {
    const appointmentRows = await db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        doctorName: users.name,
      })
      .from(appointments)
      .innerJoin(users, eq(appointments.doctorId, users.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.scheduledAt));

    for (const row of appointmentRows) {
      events.push({
        id: row.id,
        type: "appointment",
        date: row.scheduledAt.toISOString(),
        summary: `Appointment with Dr. ${row.doctorName}`,
        detailUrl: "/patient/appointments",
      });
    }
  }

  // Fetch prescriptions
  if (!type || type === "prescription") {
    const prescriptionRows = await db
      .select({
        id: prescriptions.id,
        createdAt: prescriptions.createdAt,
        doctorName: users.name,
      })
      .from(prescriptions)
      .innerJoin(appointments, eq(prescriptions.appointmentId, appointments.id))
      .innerJoin(users, eq(appointments.doctorId, users.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));

    for (const row of prescriptionRows) {
      events.push({
        id: row.id,
        type: "prescription",
        date: row.createdAt.toISOString(),
        summary: `Prescription from Dr. ${row.doctorName}`,
        detailUrl: `/patient/prescriptions/${row.id}`,
      });
    }
  }

  // Fetch visit notes
  if (!type || type === "visit_note") {
    const visitNoteRows = await db
      .select({
        id: visitNotes.id,
        createdAt: visitNotes.createdAt,
        doctorName: users.name,
      })
      .from(visitNotes)
      .innerJoin(appointments, eq(visitNotes.appointmentId, appointments.id))
      .innerJoin(users, eq(appointments.doctorId, users.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(visitNotes.createdAt));

    for (const row of visitNoteRows) {
      events.push({
        id: row.id,
        type: "visit_note",
        date: row.createdAt.toISOString(),
        summary: `Visit notes from Dr. ${row.doctorName}`,
        detailUrl: "/patient/history",
      });
    }
  }

  // Sort all events by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(events);
}
