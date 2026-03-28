import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  // Verify user is a participant
  const userId = session.user.id;
  if (appointment.patientId !== userId && appointment.doctorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (appointment.status !== "confirmed") {
    return NextResponse.json(
      { error: `Cannot transition from ${appointment.status} to completed` },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(appointments)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(appointments.id, id))
    .returning();

  return NextResponse.json(updated);
}
