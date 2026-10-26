import {
  pingAuth,
  pingFunction,
  pingObjectStorage,
  pingPostgres,
} from "@/lib/neon-services";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = { ok: true, services: {} };

  try {
    result.services = {
      ...(result.services as object),
      postgres: { ok: true, ...(await pingPostgres()) },
    };
  } catch (error) {
    result.ok = false;
    result.services = {
      ...(result.services as object),
      postgres: { ok: false, error: String(error) },
    };
  }

  try {
    result.services = {
      ...(result.services as object),
      auth: { ok: true, ...(await pingAuth()) },
    };
  } catch (error) {
    result.ok = false;
    result.services = {
      ...(result.services as object),
      auth: { ok: false, error: String(error) },
    };
  }

  try {
    result.services = {
      ...(result.services as object),
      objectStorage: { ok: true, ...(await pingObjectStorage()) },
    };
  } catch (error) {
    result.ok = false;
    result.services = {
      ...(result.services as object),
      objectStorage: { ok: false, error: String(error) },
    };
  }

  try {
    result.services = {
      ...(result.services as object),
      functions: { ok: true, ...(await pingFunction()) },
    };
  } catch (error) {
    result.ok = false;
    result.services = {
      ...(result.services as object),
      functions: { ok: false, error: String(error) },
    };
  }

  return Response.json(result, { status: result.ok ? 200 : 503 });
}
