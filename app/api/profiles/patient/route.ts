import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { patientProfiles } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { updatePatientProfileSchema } from "@/lib/validators";

export async function GET() {
  let session;
  try {
    session = await requireRole("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [profile] = await db
    .select()
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, session.user.id));

  return NextResponse.json(profile ?? null);
}

export async function PUT(request: NextRequest) {
  let session;
  try {
    session = await requireRole("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updatePatientProfileSchema.safeParse(body);
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

  const {
    dateOfBirth,
    gender,
    phone,
    address,
    emergencyContactName,
    emergencyContactPhone,
    bloodType,
    allergies,
    medicalHistoryNotes,
  } = parsed.data;

  const [upserted] = await db
    .insert(patientProfiles)
    .values({
      userId: session.user.id,
      dateOfBirth,
      gender,
      phone,
      address,
      emergencyContactName,
      emergencyContactPhone,
      bloodType,
      allergies,
      medicalHistoryNotes,
    })
    .onConflictDoUpdate({
      target: patientProfiles.userId,
      set: {
        dateOfBirth,
        gender,
        phone,
        address,
        emergencyContactName,
        emergencyContactPhone,
        bloodType,
        allergies,
        medicalHistoryNotes,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(upserted);
}
