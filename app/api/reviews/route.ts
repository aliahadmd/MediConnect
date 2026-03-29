import { NextRequest, NextResponse } from "next/server";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { reviews, appointments, doctorProfiles, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { createReviewSchema, reviewsQuerySchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireRole("patient");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Validation failed", details: [{ field: "body", message: "Invalid JSON" }] },
      { status: 400 }
    );
  }

  const parsed = createReviewSchema.safeParse(body);
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

  const { appointmentId, doctorId, rating, reviewText } = parsed.data;

  // All checks and insert inside a transaction with row-level locking
  const result = await db.transaction(async (tx) => {
    // Lock the appointment row to serialize concurrent requests
    const [appointment] = await tx
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        status: appointments.status,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .for("update");

    if (!appointment) {
      return { error: "Appointment not found", status: 404 } as const;
    }

    if (appointment.status !== "completed") {
      return { error: "Reviews are only allowed for completed appointments", status: 400 } as const;
    }

    if (appointment.patientId !== session.user.id) {
      return { error: "Forbidden", status: 403 } as const;
    }

    // Check for existing review inside the transaction
    const [existing] = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.appointmentId, appointmentId));

    if (existing) {
      return { error: "A review already exists for this appointment", status: 409 } as const;
    }

    // Insert review and update doctor profile aggregates
    const [review] = await tx
      .insert(reviews)
      .values({
        appointmentId,
        patientId: session.user.id,
        doctorId,
        rating,
        reviewText: reviewText ?? null,
      })
      .returning();

    const [agg] = await tx
      .select({
        avg: sql<number>`AVG(${reviews.rating})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(reviews)
      .where(eq(reviews.doctorId, doctorId));

    await tx
      .update(doctorProfiles)
      .set({
        averageRating: String(Number(agg.avg).toFixed(2)),
        reviewCount: Number(agg.count),
      })
      .where(eq(doctorProfiles.userId, doctorId));

    return { data: review } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryObj = Object.fromEntries(searchParams.entries());

  const parsed = reviewsQuerySchema.safeParse(queryObj);
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

  const { doctorId } = parsed.data;

  const results = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      reviewText: reviews.reviewText,
      reviewerName: users.name,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.patientId, users.id))
    .where(eq(reviews.doctorId, doctorId))
    .orderBy(desc(reviews.createdAt));

  const items = results.map((r) => ({
    id: r.id,
    rating: r.rating,
    reviewText: r.reviewText,
    reviewerName: r.reviewerName,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json(items);
}
