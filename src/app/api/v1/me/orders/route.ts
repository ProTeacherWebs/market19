import { orderRepository } from "@market/data";
import { requireApiActor } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const actor = await requireApiActor(request);
    const orders = await orderRepository.listByUser(actor.profileId);
    return withCors(request, Response.json({ orders }));
  } catch {
    return withCors(request, apiError(401, "UNAUTHORIZED", "Нужна авторизация Telegram."));
  }
}
