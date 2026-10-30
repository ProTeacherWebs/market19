import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { Locale } from "@market/contracts";
import { and, asc, eq, inArray, sql as dsql, type SQL } from "drizzle-orm";
import { createDataDb, getDatabaseUrl, schema } from "./db";
import { stableId } from "./ids";
import { neonCatalogRepository } from "./neon-catalog";
import { promos } from "./seed";
import type { Address, AuthUser, OrderStatus } from "./types";
import type {
  AdminProductInput,
  AdminRepository,
  Cart,
  CartItem,
  CartRepository,
  CreateOrderInput,
  DemoUser,
  Order,
  OrderRepository,
  ProductDetail,
  ProfileView,
  PromoView,
  UserRepository,
} from "./repositories";

function db() {
  return createDataDb();
}

function sql() {
  const url = getDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

async function getOrCreateCartId(ownerKey: string): Promise<string> {
  const [existing] = await db()
    .select({ id: schema.carts.id })
    .from(schema.carts)
    .where(eq(schema.carts.ownerKey, ownerKey))
    .limit(1);
  if (existing) return existing.id;
  const [inserted] = await db().insert(schema.carts).values({ ownerKey }).returning({ id: schema.carts.id });
  return inserted.id;
}

async function readCart(ownerKey: string): Promise<Cart> {
  const [cart] = await db()
    .select({ id: schema.carts.id })
    .from(schema.carts)
    .where(eq(schema.carts.ownerKey, ownerKey))
    .limit(1);
  if (!cart) return { ownerKey, items: [], totalUzs: 0 };

  const rows = await db()
    .select({
      variantId: schema.cartItems.variantId,
      quantity: schema.cartItems.quantity,
      sku: schema.productVariants.sku,
      priceUzs: schema.productVariants.priceUzs,
      labelRu: schema.productVariants.labelRu,
      titleRu: schema.productTranslations.title,
    })
    .from(schema.cartItems)
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.cartItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .innerJoin(
      schema.productTranslations,
      and(
        eq(schema.productTranslations.productId, schema.products.id),
        eq(schema.productTranslations.locale, "ru"),
      ),
    )
    .where(and(eq(schema.cartItems.cartId, cart.id), dsql`${schema.cartItems.quantity} > 0`));

  const items: CartItem[] = rows
    .filter((row) => row.quantity > 0)
    .map((row) => ({
      variantId: row.variantId,
      sku: row.sku,
      title: `${row.titleRu}, ${row.labelRu}`,
      unitPriceUzs: row.priceUzs,
      quantity: row.quantity,
      lineTotalUzs: row.priceUzs * row.quantity,
    }));

  return {
    ownerKey,
    items,
    totalUzs: items.reduce((sum, item) => sum + item.lineTotalUzs, 0),
  };
}

function snapshotAddress(
  raw: Record<string, string> | null,
): Order["address"] {
  if (!raw) return null;
  const recipient = raw.recipient ?? "";
  const phone = raw.phone ?? "";
  const city = raw.city ?? "";
  const street = raw.street ?? "";
  if (!recipient && !phone && !city && !street) return null;
  return { recipient, phone, city, street };
}

async function hydrateOrder(orderId: string): Promise<Order | null> {
  const [order] = await db().select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db()
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
  const events = await db()
    .select()
    .from(schema.orderEvents)
    .where(eq(schema.orderEvents.orderId, orderId))
    .orderBy(asc(schema.orderEvents.at));

  return {
    id: order.id,
    number: order.number,
    userId: order.userId,
    contact: order.guestContact,
    status: order.status,
    paymentMethod: "cod_demo",
    totalUzs: order.totalUzs,
    address: snapshotAddress(order.addressSnapshot),
    items: items.map((item) => ({
      variantId: item.variantId ?? "",
      sku: item.skuSnapshot,
      title: item.titleSnapshot,
      unitPriceUzs: item.unitPriceUzs,
      quantity: item.quantity,
      lineTotalUzs: item.lineTotalUzs,
    })),
    events: events.map((event) => ({
      at: event.at.toISOString(),
      status: event.status,
      note: event.note,
    })),
    idempotencyKey: order.idempotencyKey,
  };
}

async function loadAuthUser(where: SQL): Promise<AuthUser | null> {
  const [row] = await db()
    .select({
      id: schema.profiles.id,
      email: schema.profiles.email,
      passwordHash: schema.profiles.passwordHash,
      displayName: schema.profiles.displayName,
      phone: schema.profiles.phone,
      avatarPath: schema.profiles.avatarPath,
      emailVerified: schema.profiles.emailVerified,
      role: schema.userRoles.role,
    })
    .from(schema.profiles)
    .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.profiles.id))
    .where(where)
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role ?? "customer",
    password: row.passwordHash,
    phone: row.phone,
    avatarPath: row.avatarPath,
    emailVerified: row.emailVerified,
  };
}

function toPublic(user: AuthUser): DemoUser {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

async function productIdBySlug(slug: string): Promise<string | null> {
  const [row] = await db()
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

export const neonCartRepository: CartRepository = {
  get: readCart,
  async add(ownerKey, variantId, quantity) {
    const [found] = await db()
      .select({ status: schema.products.status })
      .from(schema.productVariants)
      .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
      .where(eq(schema.productVariants.id, variantId))
      .limit(1);
    if (!found || found.status !== "published") throw new Error("UNKNOWN_VARIANT");

    const cartId = await getOrCreateCartId(ownerKey);
    await db()
      .insert(schema.cartItems)
      .values({ cartId, variantId, quantity })
      .onConflictDoUpdate({
        target: [schema.cartItems.cartId, schema.cartItems.variantId],
        set: { quantity: dsql`${schema.cartItems.quantity} + ${quantity}` },
      });
    return readCart(ownerKey);
  },
  async setQuantity(ownerKey, variantId, quantity) {
    const cartId = await getOrCreateCartId(ownerKey);
    if (quantity <= 0) {
      await db()
        .delete(schema.cartItems)
        .where(and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)));
    } else {
      await db()
        .insert(schema.cartItems)
        .values({ cartId, variantId, quantity })
        .onConflictDoUpdate({
          target: [schema.cartItems.cartId, schema.cartItems.variantId],
          set: { quantity },
        });
    }
    return readCart(ownerKey);
  },
  async remove(ownerKey, variantId) {
    return neonCartRepository.setQuantity(ownerKey, variantId, 0);
  },
  async merge(fromKey, toKey) {
    if (fromKey === toKey) return readCart(toKey);
    const [fromCart] = await db()
      .select({ id: schema.carts.id })
      .from(schema.carts)
      .where(eq(schema.carts.ownerKey, fromKey))
      .limit(1);
    if (!fromCart) return readCart(toKey);

    const fromLines = await db()
      .select()
      .from(schema.cartItems)
      .where(eq(schema.cartItems.cartId, fromCart.id));
    if (fromLines.length === 0) return readCart(toKey);

    const toCartId = await getOrCreateCartId(toKey);
    for (const line of fromLines) {
      await db()
        .insert(schema.cartItems)
        .values({ cartId: toCartId, variantId: line.variantId, quantity: line.quantity })
        .onConflictDoUpdate({
          target: [schema.cartItems.cartId, schema.cartItems.variantId],
          set: { quantity: dsql`${schema.cartItems.quantity} + ${line.quantity}` },
        });
    }
    await db().delete(schema.cartItems).where(eq(schema.cartItems.cartId, fromCart.id));
    return readCart(toKey);
  },
};

export const neonOrderRepository: OrderRepository = {
  async create(input) {
    if (input.idempotencyKey) {
      const [existing] = await db()
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(eq(schema.orders.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing) {
        const order = await hydrateOrder(existing.id);
        if (order) return structuredClone(order);
      }
    }

    const cart = await readCart(input.ownerKey);
    if (cart.items.length === 0) throw new Error("EMPTY_CART");

    const variantIds = cart.items.map((item) => item.variantId);
    const variantRows = await db()
      .select({
        id: schema.productVariants.id,
        sku: schema.productVariants.sku,
        priceUzs: schema.productVariants.priceUzs,
        stockQuantity: schema.productVariants.stockQuantity,
        labelRu: schema.productVariants.labelRu,
        titleRu: schema.productTranslations.title,
        status: schema.products.status,
      })
      .from(schema.productVariants)
      .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
      .innerJoin(
        schema.productTranslations,
        and(
          eq(schema.productTranslations.productId, schema.products.id),
          eq(schema.productTranslations.locale, "ru"),
        ),
      )
      .where(inArray(schema.productVariants.id, variantIds));

    const byVariant = new Map(variantRows.map((row) => [row.id, row]));
    const pricedItems: CartItem[] = [];
    for (const item of cart.items) {
      const row = byVariant.get(item.variantId);
      if (!row || row.status !== "published") throw new Error("UNKNOWN_VARIANT");
      if (row.stockQuantity < item.quantity) throw new Error("OUT_OF_STOCK");
      pricedItems.push({
        variantId: item.variantId,
        sku: row.sku,
        title: `${row.titleRu}, ${row.labelRu}`,
        unitPriceUzs: row.priceUzs,
        quantity: item.quantity,
        lineTotalUzs: row.priceUzs * item.quantity,
      });
    }

    const totalUzs = pricedItems.reduce((sum, item) => sum + item.lineTotalUzs, 0);
    const orderId = randomUUID();
    const [seq] = await sql()`
      select coalesce(
        max(nullif(substring(number from 'VL-([0-9]+)'), '')::int),
        999
      ) + 1 as next_num
      from orders
    `;
    const orderNumber = `VL-${Number(seq?.next_num ?? 1000)}`;
    const now = new Date().toISOString();
    const addressSnapshot = input.address
      ? {
          recipient: input.address.recipient,
          phone: input.address.phone,
          city: input.address.city,
          street: input.address.street,
        }
      : null;

    const [cartRow] = await db()
      .select({ id: schema.carts.id })
      .from(schema.carts)
      .where(eq(schema.carts.ownerKey, input.ownerKey))
      .limit(1);

    // HTTP driver: decrement stock with RETURNING first (atomic per SKU), then write order.
    // Concurrent oversell is rejected because WHERE stock_quantity >= qty matches 0 rows.
    const client = sql();
    const decremented: string[] = [];
    try {
      for (const item of pricedItems) {
        const rows = await client`
          update product_variants
          set stock_quantity = stock_quantity - ${item.quantity}
          where id = ${item.variantId} and stock_quantity >= ${item.quantity}
          returning id
        `;
        if (rows.length === 0) throw new Error("OUT_OF_STOCK");
        decremented.push(item.variantId);
      }

      if (cartRow) {
        await client`delete from cart_items where cart_id = ${cartRow.id}`;
      }

      await client`
        insert into orders (
          id, user_id, guest_contact, number, subtotal_uzs, discount_uzs, shipping_uzs, total_uzs,
          status, payment_status, address_snapshot, idempotency_key, created_at, updated_at
        ) values (
          ${orderId}::uuid,
          ${input.userId},
          ${input.contact},
          ${orderNumber},
          ${totalUzs},
          0,
          0,
          ${totalUzs},
          'pending',
          'demo_cod',
          ${addressSnapshot ? JSON.stringify(addressSnapshot) : null}::jsonb,
          ${input.idempotencyKey ?? null},
          ${now}::timestamptz,
          ${now}::timestamptz
        )
      `;
      await client`
        insert into order_events (id, order_id, status, note, at)
        values (${randomUUID()}::uuid, ${orderId}::uuid, 'pending', 'created', ${now}::timestamptz)
      `;
      for (const item of pricedItems) {
        await client`
          insert into order_items (
            id, order_id, variant_id, sku_snapshot, title_snapshot, unit_price_uzs, quantity, line_total_uzs
          ) values (
            ${randomUUID()}::uuid,
            ${orderId}::uuid,
            ${item.variantId},
            ${item.sku},
            ${item.title},
            ${item.unitPriceUzs},
            ${item.quantity},
            ${item.lineTotalUzs}
          )
        `;
      }
    } catch (error) {
      for (const variantId of decremented) {
        const item = pricedItems.find((entry) => entry.variantId === variantId);
        if (!item) continue;
        await client`
          update product_variants
          set stock_quantity = stock_quantity + ${item.quantity}
          where id = ${variantId}
        `;
      }
      throw error;
    }

    const created = await hydrateOrder(orderId);
    if (!created) throw new Error("ORDER_CREATE_FAILED");
    return structuredClone(created);
  },

  async listByUser(userId) {
    const rows = await db()
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.userId, userId))
      .orderBy(asc(schema.orders.createdAt));
    const orders: Order[] = [];
    for (const row of rows) {
      const order = await hydrateOrder(row.id);
      if (order) orders.push(structuredClone(order));
    }
    return orders;
  },

  async getForUser(userId, orderId) {
    const [row] = await db()
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)))
      .limit(1);
    if (!row) return null;
    const order = await hydrateOrder(row.id);
    return order ? structuredClone(order) : null;
  },

  async listAll() {
    const rows = await db().select({ id: schema.orders.id }).from(schema.orders).orderBy(asc(schema.orders.createdAt));
    const orders: Order[] = [];
    for (const row of rows) {
      const order = await hydrateOrder(row.id);
      if (order) orders.push(structuredClone(order));
    }
    return orders;
  },

  async getById(orderId) {
    const order = await hydrateOrder(orderId);
    return order ? structuredClone(order) : null;
  },

  async updateStatus(orderId, status, note = "") {
    const order = await hydrateOrder(orderId);
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (!allowedTransitions[order.status].includes(status)) throw new Error("INVALID_STATUS");

    const at = new Date();
    await db().update(schema.orders).set({ status, updatedAt: at }).where(eq(schema.orders.id, orderId));
    await db()
      .insert(schema.orderEvents)
      .values({ orderId, status, note: note || status, at });

    const updated = await hydrateOrder(orderId);
    if (!updated) throw new Error("ORDER_NOT_FOUND");
    return structuredClone(updated);
  },
};

export const neonUserRepository: UserRepository = {
  async findByEmail(email) {
    const user = await loadAuthUser(eq(schema.profiles.email, email.toLocaleLowerCase()));
    return user ? toPublic(user) : null;
  },
  async findAuthByEmail(email) {
    return loadAuthUser(eq(schema.profiles.email, email.toLocaleLowerCase()));
  },
  async findById(id) {
    return loadAuthUser(eq(schema.profiles.id, id));
  },
  async list() {
    const rows = await db()
      .select({
        id: schema.profiles.id,
        email: schema.profiles.email,
        displayName: schema.profiles.displayName,
        role: schema.userRoles.role,
      })
      .from(schema.profiles)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.profiles.id));
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role ?? "customer",
    }));
  },
  async register(input) {
    const email = input.email.trim().toLocaleLowerCase();
    const existing = await loadAuthUser(eq(schema.profiles.email, email));
    if (existing) throw new Error("EMAIL_TAKEN");

    const id = randomUUID();
    const displayName = input.displayName.trim() || email.split("@")[0] || "buyer";
    await db().insert(schema.profiles).values({
      id,
      email,
      passwordHash: input.password,
      displayName,
      phone: "",
      avatarPath: null,
      emailVerified: false,
    });
    await db().insert(schema.userRoles).values({ userId: id, role: "customer" });

    const user = await loadAuthUser(eq(schema.profiles.id, id));
    if (!user) throw new Error("REGISTER_FAILED");
    return user;
  },
  async restore(incoming) {
    const email = incoming.email.trim().toLocaleLowerCase();
    const byId = await loadAuthUser(eq(schema.profiles.id, incoming.id));
    const byEmail = byId ? null : await loadAuthUser(eq(schema.profiles.email, email));
    const target = byId ?? byEmail;

    const password =
      incoming.password && incoming.password !== "!" ? incoming.password : target?.password ?? "!";

    if (target) {
      await db()
        .update(schema.profiles)
        .set({
          email,
          displayName: incoming.displayName,
          phone: incoming.phone,
          avatarPath: incoming.avatarPath,
          emailVerified: incoming.emailVerified,
          ...(incoming.password && incoming.password !== "!" ? { passwordHash: incoming.password } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.profiles.id, target.id));
      await db()
        .insert(schema.userRoles)
        .values({ userId: target.id, role: incoming.role })
        .onConflictDoUpdate({ target: schema.userRoles.userId, set: { role: incoming.role } });
      const user = await loadAuthUser(eq(schema.profiles.id, target.id));
      if (!user) throw new Error("RESTORE_FAILED");
      return { ...user, password };
    }

    await db().insert(schema.profiles).values({
      id: incoming.id,
      email,
      passwordHash: password,
      displayName: incoming.displayName,
      phone: incoming.phone,
      avatarPath: incoming.avatarPath,
      emailVerified: incoming.emailVerified,
    });
    await db().insert(schema.userRoles).values({ userId: incoming.id, role: incoming.role });

    const user = await loadAuthUser(eq(schema.profiles.id, incoming.id));
    if (!user) throw new Error("RESTORE_FAILED");
    return user;
  },
  async updateProfile(userId, patch) {
    const user = await loadAuthUser(eq(schema.profiles.id, userId));
    if (!user) throw new Error("NOT_FOUND");

    await db()
      .update(schema.profiles)
      .set({
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.avatarPath !== undefined ? { avatarPath: patch.avatarPath } : {}),
        ...(patch.emailVerified !== undefined ? { emailVerified: patch.emailVerified } : {}),
        ...(patch.password !== undefined ? { passwordHash: patch.password } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.profiles.id, userId));

    const updated = await loadAuthUser(eq(schema.profiles.id, userId));
    if (!updated) throw new Error("NOT_FOUND");
    return updated;
  },
  async listAddresses(userId) {
    const rows = await db().select().from(schema.addresses).where(eq(schema.addresses.userId, userId));
    return rows.map(
      (row): Address => ({
        id: row.id,
        recipient: row.recipient,
        phone: row.phone,
        city: row.city,
        street: row.street,
        isDefault: row.isDefault,
      }),
    );
  },
  async addAddress(userId, address) {
    if (address.isDefault) {
      await db()
        .update(schema.addresses)
        .set({ isDefault: false })
        .where(eq(schema.addresses.userId, userId));
    }
    await db().insert(schema.addresses).values({
      userId,
      recipient: address.recipient,
      phone: address.phone,
      city: address.city,
      street: address.street,
      isDefault: address.isDefault,
    });
    return neonUserRepository.listAddresses(userId);
  },
  async listFavorites(userId) {
    const rows = await db()
      .select({ slug: schema.products.slug })
      .from(schema.favorites)
      .innerJoin(schema.products, eq(schema.products.id, schema.favorites.productId))
      .where(eq(schema.favorites.userId, userId));
    return rows.map((row) => row.slug);
  },
  async toggleFavorite(userId, productSlug) {
    const productId = await productIdBySlug(productSlug);
    if (!productId) throw new Error("NOT_FOUND");

    const [existing] = await db()
      .select()
      .from(schema.favorites)
      .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.productId, productId)))
      .limit(1);

    if (existing) {
      await db()
        .delete(schema.favorites)
        .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.productId, productId)));
    } else {
      await db().insert(schema.favorites).values({ userId, productId });
    }
    return neonUserRepository.listFavorites(userId);
  },
  toProfile(user): ProfileView {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarPath: user.avatarPath,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  },
};

export const neonAdminRepository: AdminRepository = {
  async listProducts() {
    const slugs = await db().select({ slug: schema.products.slug }).from(schema.products);
    const items: ProductDetail[] = [];
    for (const row of slugs) {
      const product = await neonCatalogRepository.getBySlug("ru", row.slug, true);
      if (product) items.push(product);
    }
    return items;
  },
  async setProductStatus(slug, status) {
    const updated = await db()
      .update(schema.products)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.products.slug, slug))
      .returning({ id: schema.products.id });
    if (updated.length === 0) throw new Error("NOT_FOUND");
  },
  async setVariantStock(variantId, stockQuantity) {
    const updated = await db()
      .update(schema.productVariants)
      .set({ stockQuantity: Math.max(0, stockQuantity) })
      .where(eq(schema.productVariants.id, variantId))
      .returning({ id: schema.productVariants.id });
    if (updated.length === 0) throw new Error("NOT_FOUND");
  },
  async upsertProduct(input: AdminProductInput) {
    const [brand] = await db()
      .select({ id: schema.brands.id })
      .from(schema.brands)
      .where(eq(schema.brands.slug, input.brandId))
      .limit(1);
    const [category] = await db()
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, input.categoryId))
      .limit(1);
    if (!brand || !category) throw new Error("NOT_FOUND");

    const productId = stableId(`product:${input.slug}`);
    const variantId = stableId(`variant:${input.slug}:base`);
    const imageId = stableId(`image:${input.slug}`);

    await db()
      .insert(schema.products)
      .values({
        id: productId,
        brandId: brand.id,
        categoryId: category.id,
        slug: input.slug,
        status: input.status,
        featured: input.featured,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          brandId: brand.id,
          categoryId: category.id,
          status: input.status,
          featured: input.featured,
          updatedAt: new Date(),
        },
      });

    for (const [locale, title, description] of [
      ["ru", input.titleRu, input.descriptionRu],
      ["en", input.titleEn, input.descriptionEn],
    ] as const) {
      await db()
        .insert(schema.productTranslations)
        .values({ productId, locale, title, description })
        .onConflictDoUpdate({
          target: [schema.productTranslations.productId, schema.productTranslations.locale],
          set: { title, description },
        });
    }

    await db()
      .insert(schema.productVariants)
      .values({
        id: variantId,
        productId,
        sku: `${input.slug.toUpperCase()}-BASE`,
        priceUzs: input.priceUzs,
        stockQuantity: input.stockQuantity,
        labelRu: "Базовая",
        labelEn: "Base",
      })
      .onConflictDoUpdate({
        target: schema.productVariants.id,
        set: {
          priceUzs: input.priceUzs,
          stockQuantity: input.stockQuantity,
          productId,
        },
      });

    await db()
      .insert(schema.productImages)
      .values({
        id: imageId,
        productId,
        path: input.image,
        altRu: input.titleRu,
        altEn: input.titleEn,
        sortOrder: 0,
      })
      .onConflictDoUpdate({
        target: schema.productImages.id,
        set: { path: input.image, altRu: input.titleRu, altEn: input.titleEn },
      });

    const [hasSpec] = await db()
      .select({ id: schema.productSpecs.id })
      .from(schema.productSpecs)
      .where(eq(schema.productSpecs.productId, productId))
      .limit(1);
    if (!hasSpec) {
      await db().insert(schema.productSpecs).values({
        productId,
        labelRu: "Тип",
        labelEn: "Type",
        valueRu: "Демо",
        valueEn: "Demo",
      });
    }

    const detail = await neonCatalogRepository.getBySlug("ru", input.slug, true);
    if (!detail) throw new Error("NOT_FOUND");
    return detail;
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
  async updatePromo(id, patch) {
    const promo = promos.find((entry) => entry.id === id);
    if (!promo) throw new Error("NOT_FOUND");
    if (patch.href) promo.href = patch.href;
    if (patch.image) promo.image = patch.image;
    if (patch.problem) {
      promo.problem.ru = patch.problem;
      promo.problem.en = patch.problem;
    }
    if (patch.agitate) {
      promo.agitate.ru = patch.agitate;
      promo.agitate.en = patch.agitate;
    }
    if (patch.solution) {
      promo.solution.ru = patch.solution;
      promo.solution.en = patch.solution;
    }
    if (patch.cta) {
      promo.cta.ru = patch.cta;
      promo.cta.en = patch.cta;
    }
  },
};
