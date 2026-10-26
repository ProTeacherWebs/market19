import { neon } from "@neondatabase/serverless";

export type ProfileUpsert = {
  id: string;
  email: string;
  displayName: string;
  avatarPath?: string | null;
  emailVerified?: boolean;
  role?: "customer" | "admin";
};

/** Persist Neon Auth user into app `profiles` + `user_roles` (Postgres). */
export async function ensureProfileInDb(user: ProfileUpsert) {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;

  const sql = neon(url);
  const email = user.email.trim().toLocaleLowerCase();
  const displayName = user.displayName.trim() || email.split("@")[0] || "buyer";
  const role = user.role ?? (email === "admin@velin.demo" ? "admin" : "customer");
  const avatarPath = user.avatarPath ?? null;
  const emailVerified = Boolean(user.emailVerified);

  await sql`
    insert into profiles (
      id, email, password_hash, display_name, phone, avatar_path, email_verified, created_at, updated_at
    ) values (
      ${user.id}::uuid,
      ${email},
      ${"!neon-auth"},
      ${displayName},
      ${""},
      ${avatarPath},
      ${emailVerified},
      now(),
      now()
    )
    on conflict (id) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      avatar_path = coalesce(excluded.avatar_path, profiles.avatar_path),
      email_verified = profiles.email_verified or excluded.email_verified,
      updated_at = now()
  `;

  await sql`
    insert into user_roles (user_id, role)
    values (${user.id}::uuid, ${role})
    on conflict (user_id) do update set role = excluded.role
  `;
}
