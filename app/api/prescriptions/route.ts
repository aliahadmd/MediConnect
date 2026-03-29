import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, prescriptions, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { createPrescriptionSchema } from "@/lib/validators";
import { generatePrescriptionPdf } from "@/lib/pdf";
import { uploadPdf } from "@/lib/minio";
import { createNotification, sendEmail } from "@/lib/notifications";

export async function GET() {
  let session;
  try {
    session = await requireRole("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const results = await db
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
    .where(eq(appointments.patientId, session.user.id))
    .orderBy(desc(prescriptions.createdAt));

  const items = results.map((r) => ({
    id: r.id,
    appointmentId: r.appointmentId,
    doctorName: r.doctorName,
    appointmentDate: r.appointmentDate.toISOString(),
    medications: r.medications,
    notes: r.notes,
    pdfKey: r.pdfKey,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireRole("doctor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPrescriptionSchema.safeParse(body);
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

  const { appointmentId, medications, notes } = parsed.data;

  // Verify appointment exists, belongs to this doctor, and is completed
  const [appointment] = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      status: appointments.status,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  if (appointment.doctorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (appointment.status !== "completed") {
    return NextResponse.json(
      { error: "Prescription can only be created for completed appointments" },
      { status: 400 }
    );
  }

  // Check if prescription already exists for this appointment
  const [existing] = await db
    .select({ id: prescriptions.id })
    .from(prescriptions)
    .where(eq(prescriptions.appointmentId, appointmentId));

  if (existing) {
    return NextResponse.json(
      { error: "Prescription already exists for this appointment" },
      { status: 409 }
    );
  }

  // Save prescription to DB
  const [prescription] = await db
    .insert(prescriptions)
    .values({
      appointmentId,
      medications,
      notes: notes ?? null,
      pdfKey: null,
    })
    .returning();

  // Generate PDF and upload to MinIO
  let pdfKey: string | null = null;
  let warning: string | undefined;

  try {
    // Fetch doctor and patient names for the PDF
    const [doctor] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, appointment.doctorId));

    const [patient] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, appointment.patientId));

    const pdfBuffer = await generatePrescriptionPdf({
      doctorName: doctor?.name ?? "Doctor",
      patientName: patient?.name ?? "Patient",
      date: new Date().toISOString().split("T")[0],
      medications,
      notes,
    });

    pdfKey = `prescriptions/${prescription.id}.pdf`;
    await uploadPdf(pdfKey, pdfBuffer);

    // Update prescription with pdfKey
    await db
      .update(prescriptions)
      .set({ pdfKey })
      .where(eq(prescriptions.id, prescription.id));
  } catch {
    // MinIO unavailable — prescription is saved but without PDF
    warning = "Prescription saved but PDF upload failed. File storage may be temporarily unavailable.";
  }

  const result = {
    ...prescription,
    pdfKey,
    ...(warning ? { warning } : {}),
  };

  // Notify patient that prescription is ready (best-effort)
  try {
    const [doctor] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.user.id));

    const [patient] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, appointment.patientId));

    const message = `A new prescription from Dr. ${doctor?.name ?? "your doctor"} is ready for you.`;

    await createNotification(
      appointment.patientId,
      "prescription_ready",
      message
    );

    if (patient?.email) {
      await sendEmail(
        patient.email,
        "Prescription Ready - MediConnect",
        `<p>Hi ${patient.name},</p><p>${message}</p>`
      );
    }
  } catch {
    // Notification is best-effort
  }

  return NextResponse.json(result, { status: 201 });
}
