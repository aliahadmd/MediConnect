import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";
import { updateNotificationPreferencesSchema } from "@/lib/validators";

const NOTIFICATION_TYPES = [
  "appointment_booked",
  "appointment_confirmed",
  "appointment_rejected",
  "appointment_cancelled",
  "patient_calling",
  "prescription_ready",
] as const;

export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, session.user.id));

  // Build a map of existing preferences
  const prefMap = new Map(
    rows.map((r) => [r.notificationType, r.enabled])
  );

  // Return all 6 types, defaulting to enabled=true for any without explicit preference
  const preferences = NOTIFICATION_TYPES.map((type) => ({
    notificationType: type,
    enabled: prefMap.has(type) ? prefMap.get(type)! : true,
  }));

  return NextResponse.json(preferences);
}

export async function PUT(request: NextRequest) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateNotificationPreferencesSchema.safeParse(body);
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

  const { preferences } = parsed.data;
  const userId = session.user.id;

  // Upsert each preference using delete-then-insert since there's no unique
  // constraint on (userId, notificationType)
  for (const pref of preferences) {
    await db
      .delete(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notificationType, pref.notificationType)
        )
      );

    await db.insert(notificationPreferences).values({
      userId,
      notificationType: pref.notificationType,
      enabled: pref.enabled,
    });
  }

  // Return the full updated preferences (all 6 types with defaults)
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const prefMap = new Map(
    rows.map((r) => [r.notificationType, r.enabled])
  );

  const updatedPreferences = NOTIFICATION_TYPES.map((type) => ({
    notificationType: type,
    enabled: prefMap.has(type) ? prefMap.get(type)! : true,
  }));

  return NextResponse.json(updatedPreferences);
}
