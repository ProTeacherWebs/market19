import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SEC = 60 * 60 * 24 * 14;
const MAX_AUTH_AGE_SEC = 60 * 60 * 24;

export type TelegramUserPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type ValidatedInitData = {
  user: TelegramUserPayload;
  authDate: number;
};

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  nowSec = Math.floor(Date.now() / 1000),
): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("MISSING_HASH");

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("INVALID_HASH");
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) throw new Error("INVALID_AUTH_DATE");
  if (nowSec - authDate > MAX_AUTH_AGE_SEC) throw new Error("AUTH_EXPIRED");

  const userRaw = params.get("user");
  if (!userRaw) throw new Error("MISSING_USER");
  const user = JSON.parse(userRaw) as TelegramUserPayload;
  if (!user?.id || typeof user.id !== "number") throw new Error("INVALID_USER");

  return { user, authDate };
}

function sessionSecretFromEnv() {
  const secret =
    process.env.TELEGRAM_SESSION_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!secret || secret.length < 16) throw new Error("MISSING_SESSION_SECRET");
  return secret;
}

/** Bearer session for Mini App / Expo (same Neon carts & orders). */
export type AppSession = {
  profileId: string;
  telegramUserId?: string;
  email?: string;
  exp: number;
};

/** @deprecated use AppSession */
export type TelegramSession = AppSession;

export function issueAppSessionToken(
  session: Omit<AppSession, "exp"> & { exp?: number },
  secret = sessionSecretFromEnv(),
) {
  const payload: AppSession = {
    profileId: session.profileId,
    telegramUserId: session.telegramUserId,
    email: session.email,
    exp: session.exp ?? Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAppSessionToken(token: string, secret = sessionSecretFromEnv()): AppSession {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("INVALID_TOKEN");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("INVALID_TOKEN");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AppSession;
  if (!payload.profileId || !payload.exp) throw new Error("INVALID_TOKEN");
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("TOKEN_EXPIRED");
  return payload;
}

export const issueTelegramSessionToken = issueAppSessionToken;
export const verifyTelegramSessionToken = verifyAppSessionToken;
