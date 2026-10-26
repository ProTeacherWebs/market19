import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  createOAuthState,
  getGoogleRedirectUri,
  isGoogleOAuthConfigured,
} from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ru";
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL(`/${locale}/account/login?error=google_config`, request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || request.nextUrl.origin;
  const state = createOAuthState(locale);
  const redirectUri = getGoogleRedirectUri(origin);
  const authUrl = buildGoogleAuthUrl({ clientId, redirectUri, state });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });
  return response;
}
