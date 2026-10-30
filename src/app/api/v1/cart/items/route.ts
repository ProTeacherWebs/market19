import { cartAddBodySchema, cartPatchBodySchema } from "@market/contracts";
import { cartRepository } from "@market/data";
import { requireApiActor } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(request: Request) {
  try {
    const actor = await requireApiActor(request);
    const json = await request.json();
    const parsed = cartAddBodySchema.safeParse(json);
    if (!parsed.success) {
      return withCors(request, apiError(400, "INVALID_BODY", "variantId и quantity обязательны."));
    }
    const cart = await cartRepository.add(actor.profileId, parsed.data.variantId, parsed.data.quantity);
    return withCors(request, Response.json({ cart }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация Telegram."));
    }
    return withCors(request, apiError(400, "CART_ERROR", "Не удалось добавить в корзину."));
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireApiActor(request);
    const json = await request.json();
    const parsed = cartPatchBodySchema.safeParse(json);
    if (!parsed.success) {
      return withCors(request, apiError(400, "INVALID_BODY", "variantId и quantity обязательны."));
    }
    const cart = await cartRepository.setQuantity(actor.profileId, parsed.data.variantId, parsed.data.quantity);
    return withCors(request, Response.json({ cart }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация Telegram."));
    }
    return withCors(request, apiError(400, "CART_ERROR", "Не удалось обновить корзину."));
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireApiActor(request);
    const json = await request.json().catch(() => ({}));
    const variantId =
      typeof (json as { variantId?: string }).variantId === "string"
        ? (json as { variantId: string }).variantId
        : new URL(request.url).searchParams.get("variantId");
    if (!variantId) {
      return withCors(request, apiError(400, "INVALID_BODY", "variantId обязателен."));
    }
    const cart = await cartRepository.remove(actor.profileId, variantId);
    return withCors(request, Response.json({ cart }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация Telegram."));
    }
    return withCors(request, apiError(400, "CART_ERROR", "Не удалось удалить позицию."));
  }
}
