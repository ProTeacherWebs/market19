import { catalogRepository } from "@market/data";
import type { Locale } from "@market/contracts";
import { corsPreflight, withCors } from "@/lib/cors";

function localeOf(request: Request): Locale {
  return new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ru";
}

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  const categories = await catalogRepository.listCategories(localeOf(request));
  return withCors(request, Response.json({ categories }));
}
