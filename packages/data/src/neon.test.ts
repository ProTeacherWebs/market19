import { config } from "dotenv";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { stableId } from "./ids";

config({ path: resolve(process.cwd(), "../../.env.local") });
config({ path: resolve(process.cwd(), ".env.local") });

const hasNeon = Boolean(process.env.DATABASE_URL?.trim());

describe.runIf(hasNeon)("neon data layer", () => {
  beforeAll(() => {
    process.env.DATA_SOURCE = "neon";
  });

  it("hides drafts from public catalog and keeps 30–50 published SKUs", { timeout: 30_000 }, async () => {
    const { catalogRepository } = await import("./index");
    const publicList = await catalogRepository.listProducts("ru", {
      sort: "new",
      includeDrafts: false,
      page: 1,
      pageSize: 100,
    });
    expect(publicList.length).toBeGreaterThanOrEqual(30);
    expect(publicList.length).toBeLessThanOrEqual(50);
    expect(publicList.some((item) => item.slug === "arca-band")).toBe(false);
    expect(await catalogRepository.getBySlug("ru", "arca-band")).toBeNull();
    expect(await catalogRepository.getBySlug("ru", "arca-band", true)).not.toBeNull();
  });

  it("creates an order from catalog prices and rejects oversell", { timeout: 30_000 }, async () => {
    const { cartRepository, orderRepository, userRepository } = await import("./index");
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);

    const buyerId = stableId("test:buyer");
    await userRepository.restore({
      id: buyerId,
      email: `buyer-${buyerId.slice(0, 8)}@velin.test`,
      displayName: "Neon Buyer",
      role: "customer",
      password: "!",
      phone: "",
      avatarPath: null,
      emailVerified: true,
    });

    const kettleVariant = stableId("variant:nordline-kettle-base");
    const glassVariant = stableId("variant:lumenwerk-glass-base");
    const owner = `neon-guest-${Date.now()}`;

    await cartRepository.add(owner, glassVariant, 1);
    await expect(
      orderRepository.create({ ownerKey: owner, userId: buyerId, contact: "a@velin.test" }),
    ).rejects.toThrow("OUT_OF_STOCK");
    await cartRepository.remove(owner, glassVariant);

    await cartRepository.add(owner, kettleVariant, 1);
    const order = await orderRepository.create({
      ownerKey: owner,
      userId: buyerId,
      contact: "buyer@velin.test",
      idempotencyKey: `neon-idem-${owner}`,
    });
    expect(order.items[0]?.unitPriceUzs).toBe(490_000);
    expect(await orderRepository.getForUser(stableId("test:other"), order.id)).toBeNull();
    expect(await orderRepository.getForUser(buyerId, order.id)).not.toBeNull();

    const again = await orderRepository.create({
      ownerKey: owner,
      userId: buyerId,
      contact: "buyer@velin.test",
      idempotencyKey: `neon-idem-${owner}`,
    });
    expect(again.id).toBe(order.id);

    const stranger = stableId("test:stranger");
    await userRepository.restore({
      id: stranger,
      email: `stranger-${stranger.slice(0, 8)}@velin.test`,
      displayName: "Stranger",
      role: "customer",
      password: "!",
      phone: "",
      avatarPath: null,
      emailVerified: true,
    });
    expect(await orderRepository.listByUser(stranger)).toEqual([]);

    // restore kettle stock for later runs
    await sql`update product_variants set stock_quantity = 30 where id = ${kettleVariant}::uuid`;
  });

  it("keeps favorites on the owner and blocks admin for customers via role", async () => {
    const { userRepository } = await import("./index");
    const buyerId = stableId("test:fav-buyer");
    const adminId = stableId("test:fav-admin");
    await userRepository.restore({
      id: buyerId,
      email: `fav-buyer-${buyerId.slice(0, 8)}@velin.test`,
      displayName: "Fav Buyer",
      role: "customer",
      password: "!",
      phone: "",
      avatarPath: null,
      emailVerified: true,
    });
    await userRepository.restore({
      id: adminId,
      email: `fav-admin-${adminId.slice(0, 8)}@velin.test`,
      displayName: "Fav Admin",
      role: "admin",
      password: "!",
      phone: "",
      avatarPath: null,
      emailVerified: true,
    });
    const before = await userRepository.listFavorites(buyerId);
    if (!before.includes("nordline-s9")) {
      await userRepository.toggleFavorite(buyerId, "nordline-s9");
    }
    expect(await userRepository.listFavorites(adminId)).toEqual([]);
    expect(await userRepository.listFavorites(buyerId)).toEqual(["nordline-s9"]);
    expect((await userRepository.findById(buyerId))?.role).toBe("customer");
    expect((await userRepository.findById(adminId))?.role).toBe("admin");
  });
});
