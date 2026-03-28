import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  availabilitySlots,
  users,
  visitNotes,
  prescriptions,
  patientProfiles,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";

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
      noteContent: visitNotes.content,
      noteUpdatedAt: visitNotes.updatedAt,
      prescriptionId: prescriptions.id,
      prescriptionMedications: prescriptions.medications,
      prescriptionNotes: prescriptions.notes,
      prescriptionPdfKey: prescriptions.pdfKey,
      prescriptionCreatedAt: prescriptions.createdAt,
      patientBloodType: patientProfiles.bloodType,
      patientAllergies: patientProfiles.allergies,
      patientMedicalHistoryNotes: patientProfiles.medicalHistoryNotes,
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
    .leftJoin(visitNotes, eq(visitNotes.appointmentId, appointments.id))
    .leftJoin(prescriptions, eq(prescriptions.appointmentId, appointments.id))
    .leftJoin(patientProfiles, eq(patientProfiles.userId, appointments.patientId))
    .where(eq(appointments.id, id));

  if (!row) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // Verify the user has access to this appointment
  const userId = session.user.id;
  const role = session.user.role as string;

  if (
    role !== "admin" &&
    userId !== row.patientId &&
    userId !== row.doctorId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Structure the response
  const response: Record<string, unknown> = {
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    slotId: row.slotId,
    status: row.status,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    doctorName: row.doctorName,
    patientName: row.patientName,
    slotDate: row.slotDate,
    slotStartTime: row.slotStartTime,
    slotEndTime: row.slotEndTime,
    visitNotes: row.noteContent
      ? { content: row.noteContent, updatedAt: row.noteUpdatedAt }
      : null,
    prescription: row.prescriptionId
      ? {
          id: row.prescriptionId,
          medications: row.prescriptionMedications,
          notes: row.prescriptionNotes,
          pdfKey: row.prescriptionPdfKey,
          createdAt: row.prescriptionCreatedAt,
        }
      : null,
  };

  // Include patient profile medical info when requested by a doctor or admin
  if (role === "doctor" || role === "admin") {
    response.patientProfile = {
      bloodType: row.patientBloodType ?? null,
      allergies: row.patientAllergies ?? null,
      medicalHistoryNotes: row.patientMedicalHistoryNotes ?? null,
    };
  }

  return NextResponse.json(response);
}
