import { neon } from "@neondatabase/serverless";
import { createFilesClient, getStorageBucket, isObjectStorageConfigured } from "./storage";

export async function pingPostgres() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = neon(url);
  const [row] = await sql`
    select
      (select count(*)::int from brands) as brands,
      (select count(*)::int from products) as products,
      current_database() as database
  `;
  return row;
}

export async function pingAuth() {
  const base = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
  const jwks = process.env.NEON_AUTH_JWKS_URL;
  if (!base || !jwks) throw new Error("Neon Auth env missing");
  const res = await fetch(jwks, { cache: "no-store" });
  if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`);
  const body = (await res.json()) as { keys?: unknown[] };
  return { baseUrl: base, jwksKeys: body.keys?.length ?? 0 };
}

export async function pingObjectStorage() {
  if (!isObjectStorageConfigured()) throw new Error("Object Storage env missing");
  const files = createFilesClient();
  const key = `health/ping-${Date.now()}.txt`;
  const payload = `velin-neon-storage-ok ${new Date().toISOString()}`;
  await files.upload(key, payload, { contentType: "text/plain" });
  const downloaded = await files.download(key);
  const text = await downloaded.text();
  await files.delete(key);
  return { bucket: getStorageBucket(), key, matched: text === payload };
}

export async function pingFunction() {
  const base = process.env.NEON_FUNCTION_HELLO_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEON_FUNCTION_HELLO_BASE_URL missing");
  const res = await fetch(base, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Function HTTP ${res.status}: ${text}`);
  return { url: base, body: text };
}
