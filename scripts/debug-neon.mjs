import { createHash } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

function id(key) {
  const h = createHash("sha256").update(`velin:${key}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const sql = neon(process.env.DATABASE_URL);
const kettle = id("variant:nordline-kettle-base");
const glass = id("variant:lumenwerk-glass-base");
const product = id("product:nordline-s9");

console.log({ kettle, glass, product });
console.log(
  "variants",
  await sql`select id::text, sku, stock_quantity from product_variants where sku in ('NORDLINE-KETTLE-BASE','LUMENWERK-GLASS-BASE')`,
);
console.log("by id kettle", await sql`select id::text, sku, stock_quantity from product_variants where id = ${kettle}::uuid`);
console.log("product s9", await sql`select id::text, slug from products where slug = 'nordline-s9'`);
console.log("product by stable", await sql`select id::text, slug from products where id = ${product}::uuid`);
