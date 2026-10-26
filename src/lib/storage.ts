import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

export function getStorageBucket() {
  return process.env.NEON_STORAGE_BUCKET?.trim() || "assets";
}

export function isObjectStorageConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim() &&
      process.env.AWS_ENDPOINT_URL_S3?.trim() &&
      process.env.AWS_REGION?.trim(),
  );
}

export function createFilesClient(bucket = getStorageBucket()) {
  if (!isObjectStorageConfigured()) {
    throw new Error("Neon Object Storage env vars are missing");
  }
  return new Files({ adapter: neon({ bucket }) });
}
