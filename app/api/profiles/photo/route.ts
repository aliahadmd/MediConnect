import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-helpers";
import { processAndUploadPhoto, getProfilePhotoUrl } from "@/lib/profile-photo";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await getSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let key: string;
  try {
    key = await processAndUploadPhoto(session.user.id, file);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.startsWith("Invalid file type")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.startsWith("File size exceeds")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // MinIO / network errors → 503
    if (
      message.includes("connect ECONNREFUSED") ||
      message.includes("ENOTFOUND") ||
      message.includes("ETIMEDOUT") ||
      message.includes("MinIO") ||
      message.includes("S3") ||
      message.includes("NetworkingError") ||
      message.includes("bucket")
    ) {
      return NextResponse.json(
        { error: "Photo upload is temporarily unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }

  try {
    await db.update(users).set({ image: key }).where(eq(users.id, session.user.id));
  } catch {
    return NextResponse.json({ error: "Failed to update user record" }, { status: 500 });
  }

  let url: string;
  try {
    url = await getProfilePhotoUrl(key);
  } catch {
    return NextResponse.json(
      { error: "Photo upload is temporarily unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({ key, url });
}
