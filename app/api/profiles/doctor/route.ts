import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { doctorProfiles } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { updateDoctorProfileSchema } from "@/lib/validators";

export async function GET() {
  let session;
  try {
    session = await requireRole("doctor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [profile] = await db
    .select()
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, session.user.id));

  return NextResponse.json(profile ?? null);
}

export async function PUT(request: NextRequest) {
  let session;
  try {
    session = await requireRole("doctor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateDoctorProfileSchema.safeParse(body);
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

  const { specialization, qualifications, bio, phone, consultationFee, yearsOfExperience } =
    parsed.data;

  const [upserted] = await db
    .insert(doctorProfiles)
    .values({
      userId: session.user.id,
      specialization,
      qualifications,
      bio,
      phone,
      consultationFee: consultationFee.toString(),
      yearsOfExperience,
    })
    .onConflictDoUpdate({
      target: doctorProfiles.userId,
      set: {
        specialization,
        qualifications,
        bio,
        phone,
        consultationFee: consultationFee.toString(),
        yearsOfExperience,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(upserted);
}
