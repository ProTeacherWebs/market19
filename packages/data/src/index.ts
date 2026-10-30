import {
  adminRepository as mockAdminRepository,
  cartRepository as mockCartRepository,
  catalogRepository as mockCatalogRepository,
  orderRepository as mockOrderRepository,
  resetMocks,
  userRepository as mockUserRepository,
} from "./mock";
import { neonCatalogRepository } from "./neon-catalog";
import {
  neonAdminRepository,
  neonCartRepository,
  neonOrderRepository,
  neonUserRepository,
} from "./neon-repos";

export { assertAdmin, assertOwnResource } from "./access";
export { neonUnavailable } from "./neon";
export { resetMocks };
export { stableId } from "./ids";
export {
  issueAppSessionToken,
  issueTelegramSessionToken,
  validateTelegramInitData,
  verifyAppSessionToken,
  verifyTelegramSessionToken,
} from "./telegram";
export type { AppSession, TelegramSession, TelegramUserPayload, ValidatedInitData } from "./telegram";
export type {
  Address,
  AdminProductInput,
  AdminRepository,
  AuthUser,
  Brand,
  Cart,
  CartItem,
  CartRepository,
  CatalogRepository,
  CategoryView,
  CreateOrderInput,
  DemoUser,
  Order,
  OrderAddress,
  OrderEvent,
  OrderRepository,
  OrderStatus,
  ProductCard,
  ProductDetail,
  ProductPage,
  ProfileView,
  PromoView,
  UserRepository,
} from "./repositories";

export function useNeonData() {
  return process.env.DATA_SOURCE === "neon" && Boolean(process.env.DATABASE_URL?.trim());
}

function bindRepo<T extends object>(neonRepo: T, mockRepo: T): T {
  return new Proxy(mockRepo, {
    get(_target, prop, receiver) {
      const source = useNeonData() ? neonRepo : mockRepo;
      const value = Reflect.get(source as object, prop, receiver);
      return typeof value === "function" ? value.bind(source) : value;
    },
  }) as T;
}

export const catalogRepository = bindRepo(neonCatalogRepository, mockCatalogRepository);
export const cartRepository = bindRepo(neonCartRepository, mockCartRepository);
export const orderRepository = bindRepo(neonOrderRepository, mockOrderRepository);
export const userRepository = bindRepo(neonUserRepository, mockUserRepository);
export const adminRepository = bindRepo(neonAdminRepository, mockAdminRepository);
