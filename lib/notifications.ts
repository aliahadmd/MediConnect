import nodemailer from "nodemailer";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { notifications, notificationPreferences } from "./db/schema";
import { sseEmitter } from "@/lib/sse";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
});

export async function sendEmail(to: string, subject: string, body: string) {
  try {
    await transporter.sendMail({
      from: "noreply@mediconnect.local",
      to,
      subject,
      html: body,
    });
  } catch {
    // Log but don't throw — email is best-effort
    console.error(`Failed to send email to ${to}: ${subject}`);
  }
}

export async function createNotification(
  userId: string,
  type: string,
  message: string
) {
  // Check if user has disabled this notification type
  const [preference] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, type)
      )
    )
    .limit(1);

  if (preference && !preference.enabled) {
    return;
  }

  const [inserted] = await db
    .insert(notifications)
    .values({ userId, type, message })
    .returning();

  // Push to active SSE connections
  sseEmitter.emit(userId, inserted);
}
