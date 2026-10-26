import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "velin_google_oauth";

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function getGoogleRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function createOAuthState(locale: string) {
  const nonce = randomBytes(16).toString("hex");
  const safeLocale = locale === "en" ? "en" : "ru";
  return `${safeLocale}.${nonce}`;
}

export function parseOAuthState(state: string | null) {
  if (!state) return null;
  const [locale, nonce] = state.split(".");
  if ((locale !== "ru" && locale !== "en") || !nonce) return null;
  return { locale, nonce };
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeGoogleCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "TOKEN_EXCHANGE_FAILED");
  }
  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as GoogleUserInfo;
  if (!profileRes.ok || !profile.email) {
    throw new Error("PROFILE_FETCH_FAILED");
  }
  return {
    email: profile.email.trim().toLocaleLowerCase(),
    emailVerified: Boolean(profile.email_verified),
    displayName: profile.name?.trim() || profile.email.split("@")[0] || "buyer",
    avatarPath: profile.picture ?? null,
  };
}

/** Unusable password placeholder for OAuth-created mock users. */
export function oauthPasswordPlaceholder() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}
