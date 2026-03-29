import { NextRequest, NextResponse } from "next/server";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, doctorProfiles } from "@/lib/db/schema";
import { doctorSearchSchema } from "@/lib/validators";
import { getProfilePhotoUrl } from "@/lib/profile-photo";

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = doctorSearchSchema.safeParse(searchParams);

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

  const { q, specialization, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  // Build filter conditions
  const conditions = [eq(users.role, "doctor"), eq(users.isActive, true)];

  if (q) {
    conditions.push(
      or(ilike(users.name, `%${q}%`), ilike(doctorProfiles.specialization, `%${q}%`))!
    );
  }

  if (specialization) {
    conditions.push(eq(doctorProfiles.specialization, specialization));
  }

  const where = and(...conditions);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(users)
    .leftJoin(doctorProfiles, eq(users.id, doctorProfiles.userId))
    .where(where);

  // Get paginated results
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      specialization: doctorProfiles.specialization,
      qualifications: doctorProfiles.qualifications,
      yearsOfExperience: doctorProfiles.yearsOfExperience,
      consultationFee: doctorProfiles.consultationFee,
      averageRating: doctorProfiles.averageRating,
      reviewCount: doctorProfiles.reviewCount,
    })
    .from(users)
    .leftJoin(doctorProfiles, eq(users.id, doctorProfiles.userId))
    .where(where)
    .limit(limit)
    .offset(offset);

  const doctors = await Promise.all(
    rows.map(async (row) => {
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
        photoUrl,
        specialization: row.specialization ?? null,
        qualifications: row.qualifications ?? null,
        yearsOfExperience: row.yearsOfExperience ?? null,
        consultationFee: row.consultationFee ?? null,
        averageRating: row.averageRating ? parseFloat(row.averageRating) : null,
        reviewCount: row.reviewCount ?? 0,
      };
    })
  );

  return NextResponse.json({
    doctors,
    total: count,
    page,
    limit,
  });
}
