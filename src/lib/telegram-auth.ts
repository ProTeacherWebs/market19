import { neon } from "@neondatabase/serverless";
import {
  stableId,
  type TelegramUserPayload,
} from "@market/data";
import { ensureProfileInDb } from "@/lib/profile-db";

export {
  issueTelegramSessionToken,
  validateTelegramInitData,
  verifyTelegramSessionToken,
} from "@market/data";

export async function linkTelegramIdentity(user: TelegramUserPayload) {
  const telegramUserId = String(user.id);
  const profileId = stableId(`telegram:${telegramUserId}`);
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.username ||
    `tg_${telegramUserId}`;
  const email = `tg${telegramUserId}@telegram.local`;

  await ensureProfileInDb({
    id: profileId,
    email,
    displayName,
    avatarPath: user.photo_url ?? null,
    emailVerified: true,
    role: "customer",
  });

  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const sql = neon(url);
    await sql`
      insert into telegram_identities (telegram_user_id, profile_id, username, linked_at)
      values (${telegramUserId}, ${profileId}::uuid, ${user.username ?? null}, now())
      on conflict (telegram_user_id) do update set
        username = excluded.username
    `;
  }

  return { profileId, telegramUserId, displayName };
}
