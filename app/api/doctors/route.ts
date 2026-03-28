import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, doctorProfiles } from "@/lib/db/schema";
import { getProfilePhotoUrl } from "@/lib/profile-photo";

export async function GET() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      specialization: doctorProfiles.specialization,
      qualifications: doctorProfiles.qualifications,
      bio: doctorProfiles.bio,
      yearsOfExperience: doctorProfiles.yearsOfExperience,
      consultationFee: doctorProfiles.consultationFee,
    })
    .from(users)
    .leftJoin(doctorProfiles, eq(users.id, doctorProfiles.userId))
    .where(and(eq(users.role, "doctor"), eq(users.isActive, true)));

  const doctors = await Promise.all(
    rows.map(async (row) => {
      const profileComplete = row.specialization !== null;

      let photoUrl: string | null = null;
      if (row.image) {
        try {
          photoUrl = await getProfilePhotoUrl(row.image);
        } catch {
          // MinIO unavailable — skip photo URL
        }
      }

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        photoUrl,
        specialization: row.specialization,
        qualifications: row.qualifications,
        bio: row.bio,
        yearsOfExperience: row.yearsOfExperience,
        consultationFee: row.consultationFee,
        profileComplete,
      };
    })
  );

  return NextResponse.json(doctors);
}
