import { telegramAuthBodySchema } from "@market/contracts";
import { apiError } from "@/lib/api-error";
import { corsPreflight, withCors } from "@/lib/cors";
import {
  issueTelegramSessionToken,
  linkTelegramIdentity,
  validateTelegramInitData,
} from "@/lib/telegram-auth";

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    return withCors(request, apiError(503, "TELEGRAM_NOT_CONFIGURED", "TELEGRAM_BOT_TOKEN не задан."));
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return withCors(request, apiError(400, "INVALID_JSON", "Ожидался JSON."));
  }

  const parsed = telegramAuthBodySchema.safeParse(json);
  if (!parsed.success) {
    return withCors(request, apiError(400, "INVALID_BODY", "Передайте initData."));
  }

  try {
    const validated = validateTelegramInitData(parsed.data.initData, botToken);
    const linked = await linkTelegramIdentity(validated.user);
    const token = issueTelegramSessionToken({
      profileId: linked.profileId,
      telegramUserId: linked.telegramUserId,
    });
    return withCors(
      request,
      Response.json({
        token,
        profile: {
          id: linked.profileId,
          displayName: linked.displayName,
          telegramUserId: linked.telegramUserId,
        },
      }),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "AUTH_FAILED";
    if (code === "MISSING_SESSION_SECRET") {
      return withCors(request, apiError(503, code, "Задайте AUTH_SECRET или TELEGRAM_SESSION_SECRET."));
    }
    if (code === "AUTH_EXPIRED") {
      return withCors(request, apiError(401, code, "initData устарел, переоткройте Mini App."));
    }
    return withCors(request, apiError(401, "INVALID_INIT_DATA", "initData не прошёл проверку."));
  }
}
