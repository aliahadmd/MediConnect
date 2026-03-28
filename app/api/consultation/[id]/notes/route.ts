import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, visitNotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-helpers";

const notesSchema = z.object({
  content: z.string(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireRole("doctor");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = notesSchema.safeParse(body);
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

  // Verify appointment exists and belongs to this doctor
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id));

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  if (appointment.doctorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content } = parsed.data;

  // Upsert: insert if not exists, update if exists
  const [existing] = await db
    .select()
    .from(visitNotes)
    .where(eq(visitNotes.appointmentId, id));

  let result;
  if (existing) {
    [result] = await db
      .update(visitNotes)
      .set({ content, updatedAt: new Date() })
      .where(eq(visitNotes.appointmentId, id))
      .returning();
  } else {
    [result] = await db
      .insert(visitNotes)
      .values({ appointmentId: id, content })
      .returning();
  }

  return NextResponse.json(result);
}
