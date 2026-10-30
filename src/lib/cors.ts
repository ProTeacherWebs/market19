import { NextResponse } from "next/server";

function allowedOrigins(): string[] {
  const raw = process.env.TELEGRAM_MINIAPP_ORIGIN?.trim() || process.env.NEXT_PUBLIC_TELEGRAM_ORIGIN?.trim();
  if (!raw) return ["http://localhost:5173", "http://127.0.0.1:5173"];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function withCors(request: Request, response: Response) {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  }
  return response;
}

export function corsPreflight(request: Request) {
  const res = new NextResponse(null, { status: 204 });
  return withCors(request, res);
}
