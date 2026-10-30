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

const imageFor = {
  telefony: "/demo/phone.jpg",
  noutbuki: "/demo/laptop.jpg",
  nastolnye: "/demo/laptop.jpg",
  "tv-audio": "/demo/tv.jpg",
  "krupnaya-tehnika": "/demo/appliance.jpg",
  "melkaya-tehnika": "/demo/kitchen.jpg",
  aksessuary: "/demo/audio.jpg",
};

function row(slug, brand, category, price, stock, name, ruText, enText, featured = false, status = "published") {
  return { slug, brand, category, price, stock, name, ruText, enText, featured, status };
}

const rows = [
  row("nordline-s9", "nordline", "telefony", 12_490_000, 8, "Nordline S9", "Экран 6,7 дюйма.", "6.7 inch screen.", true),
  row("nordline-s7", "nordline", "telefony", 7_990_000, 15, "Nordline S7", "Компактный корпус.", "Compact body."),
  row("kestrel-air", "kestrel", "telefony", 15_990_000, 4, "Kestrel Air", "Лёгкий алюминиевый корпус.", "Light aluminum body.", true),
  row("vanta-note", "vanta", "telefony", 5_490_000, 22, "Vanta Note", "Простой повседневный телефон.", "Everyday phone."),
  row("lumenwerk-pico", "lumenwerk", "telefony", 4_290_000, 11, "Lumenwerk Pico", "Небольшой экран.", "Smaller screen."),
  row("sable-fold", "sable", "telefony", 18_990_000, 3, "Sable Fold", "Складной формат.", "Folding format.", true),
  row("nordline-book-14", "nordline", "noutbuki", 14_990_000, 6, "Nordline Book 14", "14 дюймов, для работы с документами.", "14 inch, for documents.", true),
  row("kestrel-studio-16", "kestrel", "noutbuki", 22_900_000, 4, "Kestrel Studio 16", "16 дюймов, для монтажа.", "16 inch, for editing."),
  row("vanta-air-13", "vanta", "noutbuki", 9_990_000, 9, "Vanta Air 13", "Тонкий 13-дюймовый ноутбук.", "Thin 13 inch laptop."),
  row("sable-pro-15", "sable", "noutbuki", 16_990_000, 2, "Sable Pro 15", "15 дюймов, отдельная графика в демо-описании.", "15 inch, discrete graphics in the demo text."),
  row("arca-desk", "arca", "nastolnye", 18_900_000, 5, "Arca Desk", "Настольный корпус для дома.", "Desktop tower for home.", true),
  row("lumenwerk-tower", "lumenwerk", "nastolnye", 11_990_000, 7, "Lumenwerk Tower", "Базовый системный блок.", "Basic desktop tower."),
  row("vanta-qled-55", "vanta", "tv-audio", 8_990_000, 6, "Vanta QLED 55", "Диагональ 55 дюймов.", "55 inch screen.", true),
  row("lumenwerk-oled-65", "lumenwerk", "tv-audio", 18_990_000, 2, "Lumenwerk OLED 65", "Диагональ 65 дюймов.", "65 inch screen."),
  row("nordline-led-43", "nordline", "tv-audio", 4_290_000, 14, "Nordline LED 43", "Диагональ 43 дюйма.", "43 inch screen."),
  row("kestrel-soundbar", "kestrel", "tv-audio", 2_490_000, 10, "Kestrel Soundbar", "Саундбар для телевизора.", "Soundbar for a television."),
  row("sable-frame-50", "sable", "tv-audio", 7_590_000, 4, "Sable Frame 50", "Тонкая рамка, 50 дюймов.", "Thin frame, 50 inch."),
  row("arca-oled-77", "arca", "tv-audio", 27_990_000, 1, "Arca OLED 77", "Диагональ 77 дюймов.", "77 inch screen."),
  row("arca-fridge-360", "arca", "krupnaya-tehnika", 12_990_000, 3, "Arca Fridge 360", "Холодильник, объём указан как демо.", "Fridge, volume is a demo figure.", true),
  row("nordline-wash-8", "nordline", "krupnaya-tehnika", 6_990_000, 8, "Nordline Wash 8", "Стиральная машина на 8 кг.", "8 kg washing machine."),
  row("vanta-dry-9", "vanta", "krupnaya-tehnika", 7_490_000, 5, "Vanta Dry 9", "Сушильная машина на 9 кг.", "9 kg dryer."),
  row("kestrel-dishwasher", "kestrel", "krupnaya-tehnika", 8_190_000, 4, "Kestrel Dishwasher", "Посудомоечная машина.", "Dishwasher."),
  row("sable-hood", "sable", "krupnaya-tehnika", 3_190_000, 9, "Sable Hood", "Вытяжка для кухни.", "Kitchen hood."),
  row("lumenwerk-oven", "lumenwerk", "krupnaya-tehnika", 5_590_000, 6, "Lumenwerk Oven", "Духовой шкаф.", "Built-in oven."),
  row("nordline-kettle", "nordline", "melkaya-tehnika", 490_000, 30, "Nordline Kettle", "Чайник 1,7 л.", "1.7 L kettle.", true),
  row("vanta-blender", "vanta", "melkaya-tehnika", 890_000, 18, "Vanta Blender", "Стационарный блендер.", "Countertop blender."),
  row("kestrel-coffee", "kestrel", "melkaya-tehnika", 2_490_000, 7, "Kestrel Coffee", "Кофемашина для дома.", "Home coffee machine."),
  row("sable-vacuum", "sable", "melkaya-tehnika", 1_990_000, 12, "Sable Vacuum", "Пылесос без мешка.", "Bagless vacuum."),
  row("arca-iron", "arca", "melkaya-tehnika", 390_000, 20, "Arca Iron", "Утюг с паром.", "Steam iron."),
  row("lumenwerk-airfryer", "lumenwerk", "melkaya-tehnika", 1_290_000, 11, "Lumenwerk Airfryer", "Аэрогриль на 5 л.", "5 L air fryer."),
  row("nordline-case", "nordline", "aksessuary", 190_000, 40, "Nordline Case", "Чехол для телефона.", "Phone case."),
  row("kestrel-charger", "kestrel", "aksessuary", 290_000, 25, "Kestrel Charger", "Зарядка 30 Вт.", "30 W charger.", true),
  row("vanta-cable", "vanta", "aksessuary", 90_000, 50, "Vanta Cable", "Кабель 1 м.", "1 m cable."),
  row("sable-buds", "sable", "aksessuary", 790_000, 16, "Sable Buds", "Беспроводные наушники.", "Wireless earbuds."),
  row("arca-band", "arca", "aksessuary", 450_000, 13, "Arca Band", "Браслет, черновик каталога.", "Band, catalog draft.", false, "draft"),
  row("lumenwerk-glass", "lumenwerk", "aksessuary", 120_000, 0, "Lumenwerk Glass", "Стекло на экран.", "Screen glass."),
];

function variantsFor(item) {
  if (item.slug === "nordline-s9") {
    return [
      ["128", item.price, item.stock, "128 ГБ", "128 GB"],
      ["256", item.price + 1_500_000, 5, "256 ГБ", "256 GB"],
    ];
  }
  if (item.slug === "kestrel-studio-16") {
    return [
      ["16gb", item.price, item.stock, "16 ГБ памяти", "16 GB memory"],
      ["32gb", item.price + 2_400_000, 2, "32 ГБ памяти", "32 GB memory"],
    ];
  }
  return [["base", item.price, item.stock, "Основная комплектация", "Standard set"]];
}

const sql = neon(url);
const noteRu = "Демонстрационная карточка. Это не предложение магазина.";
const noteEn = "Demonstration card. This is not a store offer.";

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
    if (parentId) {
      await sql`
        insert into categories (id, parent_id, slug, sort_order, is_active, image_path)
        values (${categoryId}::uuid, ${parentId}::uuid, ${slug}, ${sortOrder}, true, ${image})
        on conflict (slug) do update set
          parent_id = excluded.parent_id,
          sort_order = excluded.sort_order,
          image_path = excluded.image_path
      `;
    } else {
      await sql`
        insert into categories (id, parent_id, slug, sort_order, is_active, image_path)
        values (${categoryId}::uuid, null, ${slug}, ${sortOrder}, true, ${image})
        on conflict (slug) do update set
          parent_id = excluded.parent_id,
          sort_order = excluded.sort_order,
          image_path = excluded.image_path
      `;
    }
    for (const [locale, name] of [
      ["ru", ru],
      ["en", en],
    ]) {
      await sql`delete from category_translations where category_id = ${categoryId}::uuid and locale = ${locale}`;
      await sql`
        insert into category_translations (category_id, locale, name, description)
        values (${categoryId}::uuid, ${locale}, ${name}, ${name})
      `;
    }
  }

  for (const item of rows) {
    const productId = id(`product:${item.slug}`);
    const image = imageFor[item.category] ?? "/demo/phone.jpg";
    await sql`
      insert into products (id, brand_id, category_id, slug, status, featured)
      values (
        ${productId}::uuid,
        ${id(`brand:${item.brand}`)}::uuid,
        ${id(`category:${item.category}`)}::uuid,
        ${item.slug},
        ${item.status},
        ${item.featured}
      )
      on conflict (slug) do update set
        status = excluded.status,
        featured = excluded.featured,
        brand_id = excluded.brand_id,
        category_id = excluded.category_id
    `;

    for (const locale of ["ru", "en"]) {
      const title = item.name;
      const description = locale === "ru" ? `${item.ruText} ${noteRu}` : `${item.enText} ${noteEn}`;
      await sql`delete from product_translations where product_id = ${productId}::uuid and locale = ${locale}`;
      await sql`
        insert into product_translations (product_id, locale, title, description)
        values (${productId}::uuid, ${locale}, ${title}, ${description})
      `;
    }

    await sql`delete from product_images where product_id = ${productId}::uuid`;
    await sql`
      insert into product_images (id, product_id, path, alt_ru, alt_en, sort_order)
      values (${id(`image:${item.slug}`)}::uuid, ${productId}::uuid, ${image}, ${item.name}, ${item.name}, 0)
    `;

    await sql`delete from product_specs where product_id = ${productId}::uuid`;
    await sql`
      insert into product_specs (id, product_id, label_ru, label_en, value_ru, value_en)
      values
        (${id(`spec:${item.slug}:cat`)}::uuid, ${productId}::uuid, 'Категория', 'Category', ${item.category}, ${item.category}),
        (${id(`spec:${item.slug}:stock`)}::uuid, ${productId}::uuid, 'Наличие', 'Stock',
          ${item.stock > 0 ? `${item.stock} шт. в демо-остатке` : "Нет в демо-остатке"},
          ${item.stock > 0 ? `${item.stock} demo units` : "No demo stock"}),
        (${id(`spec:${item.slug}:note`)}::uuid, ${productId}::uuid, 'Примечание', 'Note', ${noteRu}, ${noteEn})
    `;

    await sql`delete from product_variants where product_id = ${productId}::uuid`;
    for (const [suffix, price, stock, labelRu, labelEn] of variantsFor(item)) {
      const variantKey = `${item.slug}-${suffix}`;
      const variantId = id(`variant:${variantKey}`);
      await sql`
        insert into product_variants (
          id, product_id, sku, attributes, price_uzs, stock_quantity, is_active, label_ru, label_en
        ) values (
          ${variantId}::uuid,
          ${productId}::uuid,
          ${variantKey.toUpperCase()},
          ${JSON.stringify({})}::jsonb,
          ${price},
          ${stock},
          true,
          ${labelRu},
          ${labelEn}
        )
      `;
    }
  }

  const [{ brands_count }] = await sql`select count(*)::int as brands_count from brands`;
  const [{ products_count }] = await sql`select count(*)::int as products_count from products`;
  const [{ published_count }] = await sql`select count(*)::int as published_count from products where status = 'published'`;
  const [{ draft_count }] = await sql`select count(*)::int as draft_count from products where status = 'draft'`;
  const [{ variants_count }] = await sql`select count(*)::int as variants_count from product_variants`;
  console.log(JSON.stringify({ ok: true, brands_count, products_count, published_count, draft_count, variants_count }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
