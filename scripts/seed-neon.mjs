import { createHash } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

function id(key) {
  const h = createHash("sha256").update(`velin:${key}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const brands = [
  ["nordline", "Nordline"],
  ["kestrel", "Kestrel"],
  ["vanta", "Vanta"],
  ["lumenwerk", "Lumenwerk"],
  ["sable", "Sable"],
  ["arca", "Arca"],
];

const categories = [
  ["smartfony", null, 1, "/demo/phone.jpg", "Смартфоны и гаджеты", "Smartphones and gadgets"],
  ["telefony", "smartfony", 2, "/demo/phone.jpg", "Телефоны", "Phones"],
  ["kompyutery", null, 3, "/demo/laptop.jpg", "Компьютеры и ноутбуки", "Computers and laptops"],
  ["noutbuki", "kompyutery", 4, "/demo/laptop.jpg", "Ноутбуки", "Laptops"],
  ["nastolnye", "kompyutery", 5, "/demo/laptop.jpg", "Настольные ПК", "Desktops"],
  ["tv-audio", null, 6, "/demo/tv.jpg", "ТВ и аудио", "TV and audio"],
  ["krupnaya-tehnika", null, 7, "/demo/appliance.jpg", "Крупная бытовая техника", "Large appliances"],
  ["melkaya-tehnika", null, 8, "/demo/kitchen.jpg", "Мелкая бытовая техника", "Small appliances"],
  ["aksessuary", null, 9, "/demo/audio.jpg", "Аксессуары", "Accessories"],
];

const rows = [
  ["nordline-s9", "nordline", "telefony", 12490000, 8, "Nordline S9", true, "published", "/demo/phone.jpg"],
  ["nordline-s7", "nordline", "telefony", 7990000, 15, "Nordline S7", false, "published", "/demo/phone.jpg"],
  ["kestrel-air", "kestrel", "telefony", 15990000, 4, "Kestrel Air", true, "published", "/demo/phone.jpg"],
  ["vanta-note", "vanta", "telefony", 5490000, 22, "Vanta Note", false, "published", "/demo/phone.jpg"],
  ["nordline-book-14", "nordline", "noutbuki", 14990000, 6, "Nordline Book 14", true, "published", "/demo/laptop.jpg"],
  ["kestrel-studio-16", "kestrel", "noutbuki", 22900000, 4, "Kestrel Studio 16", false, "published", "/demo/laptop.jpg"],
  ["arca-desk", "arca", "nastolnye", 18900000, 5, "Arca Desk", true, "published", "/demo/laptop.jpg"],
  ["vanta-qled-55", "vanta", "tv-audio", 8990000, 6, "Vanta QLED 55", true, "published", "/demo/tv.jpg"],
  ["arca-fridge-360", "arca", "krupnaya-tehnika", 12990000, 3, "Arca Fridge 360", true, "published", "/demo/appliance.jpg"],
  ["nordline-kettle", "nordline", "melkaya-tehnika", 490000, 30, "Nordline Kettle", true, "published", "/demo/kitchen.jpg"],
  ["kestrel-charger", "kestrel", "aksessuary", 290000, 25, "Kestrel Charger", true, "published", "/demo/audio.jpg"],
  ["arca-band", "arca", "aksessuary", 450000, 13, "Arca Band", false, "draft", "/demo/audio.jpg"],
];

const sql = neon(url);

async function main() {
  for (const [slug, name] of brands) {
    await sql`
      insert into brands (id, slug, name)
      values (${id(`brand:${slug}`)}::uuid, ${slug}, ${name})
      on conflict (slug) do update set name = excluded.name
    `;
  }

  for (const [slug, parentSlug, sortOrder, image, ru, en] of categories) {
    const categoryId = id(`category:${slug}`);
    const parentId = parentSlug ? id(`category:${parentSlug}`) : null;
    await sql`
      insert into categories (id, parent_id, slug, sort_order, is_active, image_path)
      values (${categoryId}::uuid, ${parentId}::uuid, ${slug}, ${sortOrder}, true, ${image})
      on conflict (slug) do update set
        parent_id = excluded.parent_id,
        sort_order = excluded.sort_order,
        image_path = excluded.image_path
    `;
    for (const [locale, name] of [
      ["ru", ru],
      ["en", en],
    ]) {
      await sql`
        insert into category_translations (category_id, locale, name, description)
        values (${categoryId}::uuid, ${locale}, ${name}, ${name})
        on conflict do nothing
      `;
      // unique index may need ON CONFLICT (category_id, locale) — fallback delete+insert if needed
      await sql`
        delete from category_translations where category_id = ${categoryId}::uuid and locale = ${locale}
      `;
      await sql`
        insert into category_translations (category_id, locale, name, description)
        values (${categoryId}::uuid, ${locale}, ${name}, ${name})
      `;
    }
  }

  for (const [slug, brand, category, price, stock, title, featured, status, image] of rows) {
    const productId = id(`product:${slug}`);
    await sql`
      insert into products (id, brand_id, category_id, slug, status, featured)
      values (
        ${productId}::uuid,
        ${id(`brand:${brand}`)}::uuid,
        ${id(`category:${category}`)}::uuid,
        ${slug},
        ${status},
        ${featured}
      )
      on conflict (slug) do update set
        status = excluded.status,
        featured = excluded.featured
    `;
    for (const locale of ["ru", "en"]) {
      await sql`delete from product_translations where product_id = ${productId}::uuid and locale = ${locale}`;
      await sql`
        insert into product_translations (product_id, locale, title, description)
        values (
          ${productId}::uuid,
          ${locale},
          ${title},
          ${"Demo product seeded into Neon. Not a commercial offer."}
        )
      `;
    }
    await sql`delete from product_images where product_id = ${productId}::uuid`;
    await sql`
      insert into product_images (id, product_id, path, alt_ru, alt_en, sort_order)
      values (${id(`image:${slug}`)}::uuid, ${productId}::uuid, ${image}, ${title}, ${title}, 0)
    `;
    await sql`delete from product_variants where product_id = ${productId}::uuid`;
    const variantId = id(`variant:${slug}:base`);
    await sql`
      insert into product_variants (
        id, product_id, sku, attributes, price_uzs, stock_quantity, is_active, label_ru, label_en
      ) values (
        ${variantId}::uuid,
        ${productId}::uuid,
        ${`${slug}-base`.toUpperCase()},
        ${JSON.stringify({})}::jsonb,
        ${price},
        ${stock},
        true,
        ${"Основная комплектация"},
        ${"Standard set"}
      )
    `;
  }

  const [{ brands_count }] = await sql`select count(*)::int as brands_count from brands`;
  const [{ products_count }] = await sql`select count(*)::int as products_count from products`;
  console.log(JSON.stringify({ ok: true, brands_count, products_count }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
