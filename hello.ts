import { neon } from "@neondatabase/serverless";

export default async function hello(): Promise<Response> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return Response.json({ ok: true, message: "Hello from Neon Functions", database: null });
  }
  const sql = neon(url);
  const [row] = await sql`select count(*)::int as products from products`;
  return Response.json({
    ok: true,
    message: "Hello from Neon Functions",
    products: row.products,
  });
}
