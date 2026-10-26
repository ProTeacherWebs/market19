import { NextRequest, NextResponse } from "next/server";
import { cartRepository, userRepository } from "@market/data";
import { GUEST_COOKIE } from "@/lib/cart";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  getGoogleRedirectUri,
  isGoogleOAuthConfigured,
  oauthPasswordPlaceholder,
  parseOAuthState,
} from "@/lib/google-oauth";
import { SESSION_COOKIE } from "@/lib/session";

function loginRedirect(request: NextRequest, locale: string, error: string) {
  const response = NextResponse.redirect(new URL(`/${locale}/account/login?error=${error}`, request.url));
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const storedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? null;
  const parsedStored = parseOAuthState(storedState);
  const locale = parsedStored?.locale ?? (url.searchParams.get("locale") === "en" ? "en" : "ru");

  if (!isGoogleOAuthConfigured()) {
    return loginRedirect(request, locale, "google_config");
  }

  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    return loginRedirect(request, locale, "google");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !parsedStored || state !== storedState) {
    return loginRedirect(request, locale, "google");
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin;
    const profile = await exchangeGoogleCode({
      code,
      redirectUri: getGoogleRedirectUri(origin),
      clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
    });

    let user = await userRepository.findAuthByEmail(profile.email);
    if (!user) {
      user = await userRepository.register({
        email: profile.email,
        password: oauthPasswordPlaceholder(),
        displayName: profile.displayName,
      });
    }
    await userRepository.updateProfile(user.id, {
      emailVerified: true,
      ...(profile.avatarPath ? { avatarPath: profile.avatarPath } : {}),
    });

    const guestId = request.cookies.get(GUEST_COOKIE)?.value;
    if (guestId && guestId !== user.id) {
      await cartRepository.merge(guestId, user.id);
    }

    // Cookie writes only via NextResponse — cookies() from next/headers can drop Set-Cookie on redirect.
    const response = NextResponse.redirect(new URL(`/${locale}/account`, request.url));
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    if (guestId) response.cookies.delete(GUEST_COOKIE);
    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return loginRedirect(request, locale, "google");
  }
}
