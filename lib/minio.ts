import * as Minio from "minio";

const BUCKET_NAME = "prescriptions";

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

let bucketReady = false;

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME);
  }
  bucketReady = true;
}

export async function uploadPdf(key: string, buffer: Buffer): Promise<void> {
  await ensureBucket();
  await minioClient.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    "Content-Type": "application/pdf",
  });
}

export async function getPresignedUrl(key: string): Promise<string> {
  return await minioClient.presignedGetObject(BUCKET_NAME, key, 60 * 60); // 1 hour expiry
}
