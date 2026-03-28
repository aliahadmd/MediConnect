import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, prescriptions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";
import { getPresignedUrl } from "@/lib/minio";

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

  // Find the prescription
  const [prescription] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, id));

  if (!prescription) {
    return NextResponse.json(
      { error: "Prescription not found" },
      { status: 404 }
    );
  }

  // Verify user is the patient or doctor for this appointment
  const [appointment] = await db
    .select({
      patientId: appointments.patientId,
      doctorId: appointments.doctorId,
    })
    .from(appointments)
    .where(eq(appointments.id, prescription.appointmentId));

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const userId = session.user.id;
  const role = session.user.role as string;

  if (
    role !== "admin" &&
    userId !== appointment.patientId &&
    userId !== appointment.doctorId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!prescription.pdfKey) {
    return NextResponse.json(
      { error: "PDF not available for this prescription" },
      { status: 404 }
    );
  }

  try {
    const url = await getPresignedUrl(prescription.pdfKey);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "File storage temporarily unavailable" },
      { status: 503 }
    );
  }
}
