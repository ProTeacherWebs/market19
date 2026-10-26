import { userRepository, type ProfileView } from "@market/data";
import { auth } from "@/lib/auth/server";
import { ensureProfileInDb } from "@/lib/profile-db";

export const SESSION_COOKIE = "velin_session";

function isNeonAuthConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL?.trim() && (process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET),
  );
}

async function hydrateAppUser(input: {
  id: string;
  email: string;
  displayName: string;
  avatarPath?: string | null;
  emailVerified?: boolean;
}): Promise<ProfileView> {
  const role = input.email === "admin@velin.demo" ? "admin" : "customer";

  // Always keep a row in Neon Postgres for favorites/addresses/orders FKs.
  try {
    await ensureProfileInDb({ ...input, role });
  } catch {
    // DB may be briefly unavailable; session still works via Neon Auth + mock hydrate.
  }

  const user = await userRepository.restore({
    id: input.id,
    email: input.email,
    displayName: input.displayName,
    role,
    phone: "",
    avatarPath: input.avatarPath ?? null,
    emailVerified: Boolean(input.emailVerified),
    password: "!",
  });
  return userRepository.toProfile(user);
}

export async function setSession(_user: { id: string }) {
  // Neon Auth owns the session cookie.
}

export async function clearSession() {
  if (isNeonAuthConfigured()) {
    await auth.signOut();
  }
}

export async function getSessionUser(): Promise<ProfileView | null> {
  if (!isNeonAuthConfigured()) return null;
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return hydrateAppUser({
    id: user.id,
    email: user.email,
    displayName: user.name || user.email.split("@")[0] || "buyer",
    avatarPath: user.image ?? null,
    emailVerified: Boolean(user.emailVerified),
  });
}

export async function requireSessionUser(): Promise<ProfileView> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdminUser(): Promise<ProfileView> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
