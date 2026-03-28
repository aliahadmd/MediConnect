import sharp from "sharp";
import { minioClient } from "./minio";

export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DIMENSION = 256;
export const PHOTO_BUCKET = "profile-photos";

let photoBucketReady = false;

async function ensurePhotoBucket(): Promise<void> {
  if (photoBucketReady) return;
  const exists = await minioClient.bucketExists(PHOTO_BUCKET);
  if (!exists) {
    await minioClient.makeBucket(PHOTO_BUCKET);
  }
  photoBucketReady = true;
}

export async function processAndUploadPhoto(
  userId: string,
  file: File
): Promise<string> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Accepted: JPEG, PNG, WebP");
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 5MB limit");
  }

  // Convert file to buffer and resize
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const processedBuffer = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside" })
    .webp()
    .toBuffer();

  // Ensure bucket exists
  await ensurePhotoBucket();

  const key = `${userId}.webp`;

  // Delete old photo if it exists
  try {
    await minioClient.statObject(PHOTO_BUCKET, key);
    await minioClient.removeObject(PHOTO_BUCKET, key);
  } catch {
    // Object doesn't exist — nothing to delete
  }

  // Upload processed image
  await minioClient.putObject(PHOTO_BUCKET, key, processedBuffer, processedBuffer.length, {
    "Content-Type": "image/webp",
  });

  return key;
}

export async function getProfilePhotoUrl(key: string): Promise<string> {
  return await minioClient.presignedGetObject(PHOTO_BUCKET, key, 60 * 60); // 1 hour expiry
}
