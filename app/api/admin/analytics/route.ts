import { NextRequest, NextResponse } from "next/server";
import { eq, and, count, sql, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Build date range conditions for appointments
  const dateConditions = [eq(appointments.status, "completed")];

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      dateConditions.push(gte(appointments.scheduledAt, fromDate));
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      // Set to end of day
      toDate.setHours(23, 59, 59, 999);
      dateConditions.push(lte(appointments.scheduledAt, toDate));
    }
  }

  const completedWhere = and(...dateConditions);

  try {
    const [consultationResult, doctorResult, trendResult] = await Promise.all([
      // Total completed consultations
      db
        .select({ total: count() })
        .from(appointments)
        .where(completedWhere),

      // Active doctors count
      db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.role, "doctor"), eq(users.isActive, true))),

      // Consultation trend — daily counts of completed appointments
      db
        .select({
          date: sql<string>`DATE(${appointments.scheduledAt})`.as("date"),
          count: count(),
        })
        .from(appointments)
        .where(completedWhere)
        .groupBy(sql`DATE(${appointments.scheduledAt})`)
        .orderBy(sql`DATE(${appointments.scheduledAt})`),
    ]);

    const totalConsultations = consultationResult[0].total;
    const FIXED_FEE = 50;
    const totalRevenue = totalConsultations * FIXED_FEE;
    const activeDoctors = doctorResult[0].total;
    const consultationTrend = trendResult.map((row) => ({
      date: row.date,
      count: row.count,
    }));

    return NextResponse.json({
      totalConsultations,
      totalRevenue,
      activeDoctors,
      consultationTrend,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
