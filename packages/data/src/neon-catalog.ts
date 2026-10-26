import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import type { Locale } from "@market/contracts";
import { createDataDb, schema } from "./db";
import type { Brand, CatalogRepository, CategoryView, ProductCard, ProductDetail, ProductPage, PromoView } from "./repositories";
import { promos } from "./seed";

function db() {
  return createDataDb();
}

export const neonCatalogRepository: CatalogRepository = {
  async listCategories(locale) {
    const all = await db()
      .select({
        id: schema.categories.id,
        slug: schema.categories.slug,
        parentId: schema.categories.parentId,
        imagePath: schema.categories.imagePath,
        sortOrder: schema.categories.sortOrder,
        name: schema.categoryTranslations.name,
        description: schema.categoryTranslations.description,
      })
      .from(schema.categories)
      .innerJoin(
        schema.categoryTranslations,
        and(
          eq(schema.categoryTranslations.categoryId, schema.categories.id),
          eq(schema.categoryTranslations.locale, locale),
        ),
      )
      .orderBy(asc(schema.categories.sortOrder));

    return all
      .filter((row) => row.parentId === null)
      .map((row): CategoryView => ({
        id: row.slug,
        slug: row.slug,
        parentSlug: null,
        name: row.name,
        description: row.description,
        image: row.imagePath ?? "/demo/phone.jpg",
        children: all
          .filter((child) => child.parentId === row.id)
          .map((child) => ({ slug: child.slug, name: child.name })),
      }));
  },

  async getCategory(locale, slug) {
    const all = await this.listCategories(locale);
    const direct = all.find((entry) => entry.slug === slug);
    if (direct) return direct;

    const [row] = await db()
      .select({
        id: schema.categories.id,
        slug: schema.categories.slug,
        parentId: schema.categories.parentId,
        imagePath: schema.categories.imagePath,
        name: schema.categoryTranslations.name,
        description: schema.categoryTranslations.description,
      })
      .from(schema.categories)
      .innerJoin(
        schema.categoryTranslations,
        and(
          eq(schema.categoryTranslations.categoryId, schema.categories.id),
          eq(schema.categoryTranslations.locale, locale),
        ),
      )
      .where(eq(schema.categories.slug, slug))
      .limit(1);
    if (!row) return null;

    let parentSlug: string | null = null;
    if (row.parentId) {
      const [parent] = await db()
        .select({ slug: schema.categories.slug })
        .from(schema.categories)
        .where(eq(schema.categories.id, row.parentId))
        .limit(1);
      parentSlug = parent?.slug ?? null;
    }

    const childRows = await db()
      .select({
        slug: schema.categories.slug,
        name: schema.categoryTranslations.name,
      })
      .from(schema.categories)
      .innerJoin(
        schema.categoryTranslations,
        and(
          eq(schema.categoryTranslations.categoryId, schema.categories.id),
          eq(schema.categoryTranslations.locale, locale),
        ),
      )
      .where(eq(schema.categories.parentId, row.id));

    return {
      id: row.slug,
      slug: row.slug,
      parentSlug,
      name: row.name,
      description: row.description,
      image: row.imagePath ?? "/demo/phone.jpg",
      children: childRows.map((child) => ({ slug: child.slug, name: child.name })),
    };
  },

  async listBrands(): Promise<Brand[]> {
    const rows = await db().select().from(schema.brands).orderBy(asc(schema.brands.name));
    return rows.map((row) => ({ id: row.slug, slug: row.slug, name: row.name }));
  },

  async listProducts(locale, query) {
    const page = await this.listProductsPage(locale, { ...query, page: 1, pageSize: 500 });
    return page.items;
  },

  async listProductsPage(locale, query): Promise<ProductPage> {
    const pageSize = query.pageSize ?? 12;
    const page = query.page ?? 1;
    const includeDrafts = Boolean(query.includeDrafts);
    const conditions = [];
    if (!includeDrafts) conditions.push(eq(schema.products.status, "published"));
    if (query.category) conditions.push(eq(schema.categories.slug, query.category));
    if (query.brand) conditions.push(eq(schema.brands.slug, query.brand));
    if (query.q) {
      conditions.push(
        or(
          ilike(schema.productTranslations.title, `%${query.q}%`),
          ilike(schema.productTranslations.description, `%${query.q}%`),
        )!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db()
      .select({
        productId: schema.products.id,
        slug: schema.products.slug,
        featured: schema.products.featured,
        status: schema.products.status,
        title: schema.productTranslations.title,
        brandName: schema.brands.name,
        categorySlug: schema.categories.slug,
        image: schema.productImages.path,
        price: schema.productVariants.priceUzs,
        stock: schema.productVariants.stockQuantity,
      })
      .from(schema.products)
      .innerJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
      .innerJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
      .innerJoin(
        schema.productTranslations,
        and(
          eq(schema.productTranslations.productId, schema.products.id),
          eq(schema.productTranslations.locale, locale),
        ),
      )
      .leftJoin(
        schema.productImages,
        and(eq(schema.productImages.productId, schema.products.id), eq(schema.productImages.sortOrder, 0)),
      )
      .innerJoin(schema.productVariants, eq(schema.productVariants.productId, schema.products.id))
      .where(where);

    type Agg = {
      slug: string;
      title: string;
      brandName: string;
      categorySlug: string;
      featured: boolean;
      status: "draft" | "published";
      image: string;
      priceUzs: number;
      stockQuantity: number;
    };
    const bySlug = new Map<string, Agg>();
    for (const row of rows) {
      const current = bySlug.get(row.slug);
      if (!current) {
        bySlug.set(row.slug, {
          slug: row.slug,
          title: row.title,
          brandName: row.brandName,
          categorySlug: row.categorySlug,
          featured: row.featured,
          status: row.status,
          image: row.image ?? "/demo/phone.jpg",
          priceUzs: row.price,
          stockQuantity: row.stock,
        });
      } else {
        current.priceUzs = Math.min(current.priceUzs, row.price);
        current.stockQuantity += row.stock;
      }
    }

    let items = [...bySlug.values()];
    if (query.inStock) items = items.filter((item) => item.stockQuantity > 0);
    if (query.sort === "price_asc") items.sort((a, b) => a.priceUzs - b.priceUzs);
    else if (query.sort === "price_desc") items.sort((a, b) => b.priceUzs - a.priceUzs);
    else items.sort((a, b) => Number(b.featured) - Number(a.featured));

    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const slice: ProductCard[] = items.slice(start, start + pageSize);

    return { items: slice, total, page, pageSize, pageCount };
  },

  async getBySlug(locale, slug, includeDrafts = false) {
    const [product] = await db()
      .select({
        id: schema.products.id,
        slug: schema.products.slug,
        status: schema.products.status,
        featured: schema.products.featured,
        title: schema.productTranslations.title,
        description: schema.productTranslations.description,
        brandName: schema.brands.name,
        categorySlug: schema.categories.slug,
      })
      .from(schema.products)
      .innerJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
      .innerJoin(schema.categories, eq(schema.categories.id, schema.products.categoryId))
      .innerJoin(
        schema.productTranslations,
        and(
          eq(schema.productTranslations.productId, schema.products.id),
          eq(schema.productTranslations.locale, locale),
        ),
      )
      .where(eq(schema.products.slug, slug))
      .limit(1);
    if (!product) return null;
    if (!includeDrafts && product.status !== "published") return null;

    const variants = await db()
      .select()
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, product.id));
    const images = await db()
      .select()
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, product.id))
      .orderBy(asc(schema.productImages.sortOrder));
    const specs = await db()
      .select()
      .from(schema.productSpecs)
      .where(eq(schema.productSpecs.productId, product.id));

    return {
      slug: product.slug,
      title: product.title,
      brandName: product.brandName,
      categorySlug: product.categorySlug,
      priceUzs: variants.reduce((min, variant) => Math.min(min, variant.priceUzs), variants[0]?.priceUzs ?? 0),
      stockQuantity: variants.reduce((sum, variant) => sum + variant.stockQuantity, 0),
      image: images[0]?.path ?? "/demo/phone.jpg",
      featured: product.featured,
      status: product.status,
      description: product.description,
      specs: specs.map((spec) => ({
        label: locale === "en" ? spec.labelEn : spec.labelRu,
        value: locale === "en" ? spec.valueEn : spec.valueRu,
      })),
      variants: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        label: locale === "en" ? variant.labelEn : variant.labelRu,
        priceUzs: variant.priceUzs,
        stockQuantity: variant.stockQuantity,
      })),
    };
  },

  async getBySlugs(locale, slugs) {
    const items: ProductDetail[] = [];
    for (const slug of slugs) {
      const product = await this.getBySlug(locale, slug, false);
      if (product) items.push(product);
    }
    return items;
  },

  async suggest(locale, q) {
    const items = await this.listProducts(locale, {
      q,
      sort: "new",
      includeDrafts: false,
      page: 1,
      pageSize: 8,
    });
    return items.slice(0, 8).map((item) => ({ slug: item.slug, title: item.title }));
  },

  async listPromos(locale: Locale): Promise<PromoView[]> {
    return promos.map((promo) => ({
      id: promo.id,
      href: promo.href,
      image: promo.image,
      problem: promo.problem[locale],
      agitate: promo.agitate[locale],
      solution: promo.solution[locale],
      cta: promo.cta[locale],
    }));
  },
};

// silence unused import if tree-shaken oddly
void sql;
