import { catalogRepository } from "@market/data";
import type { Locale } from "@market/contracts";
import { apiError } from "@/lib/api-error";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const locale: Locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ru";
  const product = await catalogRepository.getBySlug(locale, slug, false);
  if (!product) {
    return withCors(request, apiError(404, "NOT_FOUND", "Товар не найден или ещё не опубликован."));
  }
  return withCors(request, Response.json({ product }));
}
