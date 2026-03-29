import { NextResponse } from "next/server";
import { eq, and, isNotNull, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, doctorProfiles } from "@/lib/db/schema";

export async function GET() {
  const specializations = await db
    .select({
      specialization: doctorProfiles.specialization,
      doctorCount: sql<number>`cast(count(*) as integer)`,
    })
    .from(doctorProfiles)
    .innerJoin(users, eq(doctorProfiles.userId, users.id))
    .where(
      and(
        isNotNull(doctorProfiles.specialization),
        eq(users.isActive, true),
        eq(users.role, "doctor")
      )
    )
    .groupBy(doctorProfiles.specialization)
    .orderBy(asc(doctorProfiles.specialization));

  return NextResponse.json(specializations);
}
