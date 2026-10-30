import { z } from "zod";
import { catalogRepository, userRepository } from "@market/data";
import { requireApiActor } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { corsPreflight, withCors } from "@/lib/cors";

const toggleBody = z.object({
  productSlug: z.string().trim().min(1).max(120),
});

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiActor(request);
    const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ru";
    const slugs = await userRepository.listFavorites(actor.profileId);
    const products = slugs.length ? await catalogRepository.getBySlugs(locale, slugs) : [];
    return withCors(request, Response.json({ slugs, products }));
  } catch {
    return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация."));
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiActor(request);
    const json = await request.json();
    const parsed = toggleBody.safeParse(json);
    if (!parsed.success) {
      return withCors(request, apiError(400, "INVALID_BODY", "productSlug обязателен."));
    }
    const slugs = await userRepository.toggleFavorite(actor.profileId, parsed.data.productSlug);
    return withCors(request, Response.json({ slugs }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация."));
    }
    return withCors(request, apiError(400, "FAVORITE_ERROR", "Не удалось обновить избранное."));
  }
}
