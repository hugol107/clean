import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * File storage abstraction (spec section: photo uploads for issues/sessions).
 *
 * Two drivers behind one interface, chosen by STORAGE_DRIVER:
 *  - "local" (default): writes to /public/uploads. Zero config, perfect for
 *    local dev and demos. NOT suitable for Vercel production (the
 *    filesystem there is read-only/ephemeral) — see README "Deploying".
 *  - "s3": any S3-compatible endpoint — AWS S3, Supabase Storage's S3
 *    endpoint, Cloudflare R2, MinIO, etc. This is the production driver.
 *
 * Callers never branch on the driver; they just call `saveUpload`.
 */

export interface UploadInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  /** Logical folder, e.g. `${organizationId}/issues` */
  folder: string;
}

export interface UploadResult {
  url: string;
  storageKey: string;
  sizeBytes: number;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function assertUploadIsAllowed(mimeType: string, sizeBytes: number) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new Error("File is too large (max 8MB).");
  }
}

function safeExtension(fileName: string, mimeType: string): string {
  const fromName = path.extname(fileName).replace(".", "").toLowerCase();
  if (fromName) return fromName;
  return mimeType.split("/")[1] || "bin";
}

async function saveLocal(input: UploadInput): Promise<UploadResult> {
  const ext = safeExtension(input.fileName, input.mimeType);
  const key = `${input.folder}/${randomUUID()}.${ext}`;
  const absoluteDir = path.join(process.cwd(), "public", "uploads", input.folder);
  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(process.cwd(), "public", "uploads", key);
  await writeFile(absolutePath, input.buffer);
  return { url: `/uploads/${key}`, storageKey: key, sizeBytes: input.buffer.byteLength };
}

async function saveS3(input: UploadInput): Promise<UploadResult> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const ext = safeExtension(input.fileName, input.mimeType);
  const key = `${input.folder}/${randomUUID()}.${ext}`;

  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
    }),
  );

  const base = process.env.S3_PUBLIC_URL_BASE?.replace(/\/$/, "");
  const url = base ? `${base}/${key}` : `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
  return { url, storageKey: key, sizeBytes: input.buffer.byteLength };
}

export async function saveUpload(input: UploadInput): Promise<UploadResult> {
  assertUploadIsAllowed(input.mimeType, input.buffer.byteLength);
  const driver = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
  return driver === "s3" ? saveS3(input) : saveLocal(input);
}
