import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, doctorProfiles } from "@/lib/db/schema";
import { getProfilePhotoUrl } from "@/lib/profile-photo";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      specialization: doctorProfiles.specialization,
      qualifications: doctorProfiles.qualifications,
      bio: doctorProfiles.bio,
      yearsOfExperience: doctorProfiles.yearsOfExperience,
      consultationFee: doctorProfiles.consultationFee,
      averageRating: doctorProfiles.averageRating,
      reviewCount: doctorProfiles.reviewCount,
      hasProfile: doctorProfiles.id,
    })
    .from(users)
    .leftJoin(doctorProfiles, eq(users.id, doctorProfiles.userId))
    .where(and(eq(users.id, id), eq(users.role, "doctor"), eq(users.isActive, true)));

  if (!row) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  let photoUrl: string | null = null;
  if (row.image) {
    try {
      photoUrl = await getProfilePhotoUrl(row.image);
    } catch {
      // MinIO unavailable — skip photo URL
    }
  }

  const result = {
    id: row.id,
    name: row.name,
    photoUrl,
    specialization: row.specialization ?? null,
    qualifications: row.qualifications ?? null,
    bio: row.bio ?? null,
    yearsOfExperience: row.yearsOfExperience ?? null,
    consultationFee: row.consultationFee ?? null,
    averageRating: row.averageRating ? parseFloat(row.averageRating) : null,
    reviewCount: row.reviewCount ?? 0,
    profileComplete: row.hasProfile !== null,
  };

  return NextResponse.json(result);
}
