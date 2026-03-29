import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, appointments, patientProfiles } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = session.user.role as string;
  const userId = session.user.id;

  // Only doctors and admins can access patient profiles
  if (userRole !== "doctor" && userRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate appointmentId query param
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointmentId");

  if (!appointmentId) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: [{ field: "appointmentId", message: "appointmentId query parameter is required" }],
      },
      { status: 400 }
    );
  }

  const { id: patientId } = await params;

  // For doctors, verify they are assigned to the appointment
  if (userRole === "doctor") {
    const [appointment] = await db
      .select({
        id: appointments.id,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.patientId, patientId)
        )
      );

    if (!appointment || appointment.doctorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch patient user record
  const [patient] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, patientId));

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Fetch patient profile
  const [profile] = await db
    .select({
      dateOfBirth: patientProfiles.dateOfBirth,
      gender: patientProfiles.gender,
      bloodType: patientProfiles.bloodType,
      allergies: patientProfiles.allergies,
      emergencyContactName: patientProfiles.emergencyContactName,
      emergencyContactPhone: patientProfiles.emergencyContactPhone,
      medicalHistoryNotes: patientProfiles.medicalHistoryNotes,
    })
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, patientId));

  const response = {
    name: patient.name,
    dateOfBirth: profile?.dateOfBirth ?? null,
    gender: profile?.gender ?? null,
    bloodType: profile?.bloodType ?? null,
    allergies: profile?.allergies ?? null,
    emergencyContactName: profile?.emergencyContactName ?? null,
    emergencyContactPhone: profile?.emergencyContactPhone ?? null,
    medicalHistoryNotes: profile?.medicalHistoryNotes ?? null,
    profileComplete: !!profile,
  };

  return NextResponse.json(response);
}
