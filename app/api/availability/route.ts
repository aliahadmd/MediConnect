import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { availabilitySlots } from "@/lib/db/schema";
import { getSession, requireRole } from "@/lib/auth-helpers";
import {
  createAvailabilitySlotSchema,
  hasTimeOverlap,
  isSlotInPast,
} from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctorId = request.nextUrl.searchParams.get("doctorId");
  if (!doctorId) {
    return NextResponse.json(
      { error: "doctorId query parameter is required" },
      { status: 400 }
    );
  }

  const slots = await db
    .select()
    .from(availabilitySlots)
    .where(eq(availabilitySlots.doctorId, doctorId));

  return NextResponse.json(slots);
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireRole("doctor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createAvailabilitySlotSchema.safeParse(body);
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

  const { date, startTime, endTime } = parsed.data;
  const doctorId = session.user.id;

  // Reject slots in the past
  if (isSlotInPast(date, startTime)) {
    return NextResponse.json(
      { error: "Cannot create a slot in the past" },
      { status: 400 }
    );
  }

  // Check for overlapping slots on the same date for this doctor
  const existingSlots = await db
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.doctorId, doctorId),
        eq(availabilitySlots.date, date)
      )
    );

  if (hasTimeOverlap(existingSlots, { startTime, endTime })) {
    return NextResponse.json(
      { error: "Overlapping slot exists" },
      { status: 409 }
    );
  }

  const [slot] = await db
    .insert(availabilitySlots)
    .values({ doctorId, date, startTime, endTime })
    .returning();

  return NextResponse.json(slot, { status: 201 });
}
