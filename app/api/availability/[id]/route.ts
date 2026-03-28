import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { availabilitySlots } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireRole("doctor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Find the slot and verify ownership
  const [slot] = await db
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.id, id),
        eq(availabilitySlots.doctorId, session.user.id)
      )
    );

  if (!slot) {
    return NextResponse.json(
      { error: "Slot not found" },
      { status: 404 }
    );
  }

  if (slot.isBooked) {
    return NextResponse.json(
      { error: "Cannot delete a booked slot" },
      { status: 400 }
    );
  }

  await db
    .delete(availabilitySlots)
    .where(eq(availabilitySlots.id, id));

  return NextResponse.json({ success: true });
}
