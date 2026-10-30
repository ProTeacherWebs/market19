import { verifyTelegramSessionToken } from "@market/data";
import { getSessionUser } from "@/lib/session";

export type ApiActor = {
  profileId: string;
  source: "web" | "telegram";
};

export async function resolveApiActor(request: Request): Promise<ApiActor | null> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) {
      try {
        const session = verifyTelegramSessionToken(token);
        return { profileId: session.profileId, source: "telegram" };
      } catch {
        return null;
      }
    }
  }

  const user = await getSessionUser();
  if (user) return { profileId: user.id, source: "web" };
  return null;
}

export async function requireApiActor(request: Request): Promise<ApiActor> {
  const actor = await resolveApiActor(request);
  if (!actor) throw new Error("UNAUTHORIZED");
  return actor;
}
