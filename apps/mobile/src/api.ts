import { MarketApiClient } from "@market/api-client";
import type { Locale } from "@market/contracts";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "velin_token";
const PROFILE_KEY = "velin_profile";

export type StoredProfile = {
  id: string;
  displayName: string;
  email?: string;
};

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getProfile(): Promise<StoredProfile | null> {
  const raw = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
}

export async function setProfile(profile: StoredProfile | null) {
  if (profile) await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
  else await SecureStore.deleteItemAsync(PROFILE_KEY);
}

export function apiBaseUrl() {
  return (process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function createClient(locale: Locale = "ru") {
  return new MarketApiClient({
    baseUrl: apiBaseUrl(),
    locale,
    getToken,
  });
}

export function assetUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${apiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatUzs(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " UZS";
}
