import { emailAuthBodySchema } from "@market/contracts";
import { issueAppSessionToken, userRepository } from "@market/data";
import { apiError } from "@/lib/api-error";
import { corsPreflight, withCors } from "@/lib/cors";
import { ensureProfileInDb } from "@/lib/profile-db";

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withCors(request, apiError(400, "INVALID_JSON", "Ожидался JSON."));
  }

  const parsed = emailAuthBodySchema.safeParse(json);
  if (!parsed.success) {
    return withCors(request, apiError(400, "INVALID_BODY", "Укажите email и пароль."));
  }

  const email = parsed.data.email.trim().toLocaleLowerCase();
  const password = parsed.data.password;

  try {
    const linked = await authenticateEmail(email, password);
    const token = issueAppSessionToken({
      profileId: linked.profileId,
      email: linked.email,
    });
    return withCors(
      request,
      Response.json({
        token,
        profile: {
          id: linked.profileId,
          displayName: linked.displayName,
          email: linked.email,
        },
      }),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "AUTH_FAILED";
    if (code === "MISSING_SESSION_SECRET") {
      return withCors(request, apiError(503, code, "Задайте AUTH_SECRET."));
    }
    return withCors(request, apiError(401, "INVALID_CREDENTIALS", "Неверный email или пароль."));
  }
}

async function authenticateEmail(email: string, password: string) {
  const authBase = process.env.NEON_AUTH_BASE_URL?.trim()?.replace(/\/$/, "");
  if (authBase) {
    try {
      const res = await fetch(`${authBase}/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          user?: { id?: string; email?: string; name?: string; image?: string | null; emailVerified?: boolean };
        };
        const user = body.user;
        if (user?.id && user.email) {
          const role = user.email === "admin@velin.demo" ? "admin" : "customer";
          await ensureProfileInDb({
            id: user.id,
            email: user.email,
            displayName: user.name || user.email.split("@")[0] || "buyer",
            avatarPath: user.image ?? null,
            emailVerified: Boolean(user.emailVerified),
            role,
          });
          return {
            profileId: user.id,
            email: user.email,
            displayName: user.name || user.email.split("@")[0] || "buyer",
          };
        }
      }
    } catch {
      // fall through to profiles table
    }
  }

  const local = await userRepository.findAuthByEmail(email);
  if (!local || local.password !== password) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return {
    profileId: local.id,
    email: local.email,
    displayName: local.displayName,
  };
}
