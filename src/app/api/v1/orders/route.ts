import { createOrderBodySchema } from "@market/contracts";
import { orderRepository } from "@market/data";
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
    const parsed = createOrderBodySchema.safeParse(json);
    if (!parsed.success) {
      return withCors(request, apiError(400, "INVALID_BODY", "Заполните контакты и адрес."));
    }
    const order = await orderRepository.create({
      ownerKey: actor.profileId,
      userId: actor.profileId,
      contact: parsed.data.contact,
      address: {
        recipient: parsed.data.recipient,
        phone: parsed.data.phone,
        city: parsed.data.city,
        street: parsed.data.street,
      },
      paymentMethod: "cod_demo",
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return withCors(request, Response.json({ order }));
  } catch (error) {
    const code = error instanceof Error ? error.message : "ERROR";
    if (code === "UNAUTHORIZED") {
      return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация Telegram."));
    }
    if (code === "OUT_OF_STOCK") {
      return withCors(request, apiError(409, "OUT_OF_STOCK", "Недостаточно товара на складе."));
    }
    if (code === "EMPTY_CART") {
      return withCors(request, apiError(400, "EMPTY_CART", "Корзина пуста."));
    }
    return withCors(request, apiError(400, "ORDER_ERROR", "Не удалось создать заказ."));
  }
}
