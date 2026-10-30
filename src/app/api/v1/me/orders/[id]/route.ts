import { orderRepository } from "@market/data";
import { requireApiActor } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiActor(request);
    const { id } = await context.params;
    const order = await orderRepository.getForUser(actor.profileId, id);
    if (!order) {
      return withCors(request, apiError(404, "NOT_FOUND", "Заказ не найден."));
    }
    return withCors(request, Response.json({ order }));
  } catch {
    return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация Telegram."));
  }
}
