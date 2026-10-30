import { MarketApiClient } from "@market/api-client";
import type { Locale } from "@market/contracts";

const TOKEN_KEY = "velin_tg_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function createClient(locale: Locale = "ru") {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:3000";
  return new MarketApiClient({
    baseUrl,
    locale,
    getToken: getStoredToken,
  });
}

export function assetUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatUzs(value: number, locale: Locale = "ru") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU").format(value) + " UZS";
}
