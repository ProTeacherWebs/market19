import {
  adminRepository as mockAdminRepository,
  cartRepository as mockCartRepository,
  catalogRepository as mockCatalogRepository,
  orderRepository as mockOrderRepository,
  resetMocks,
  userRepository as mockUserRepository,
} from "./mock";
import { neonCatalogRepository } from "./neon-catalog";

export { assertAdmin, assertOwnResource } from "./access";
export { neonUnavailable } from "./neon";
export { resetMocks };
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

function useNeonCatalog() {
  return process.env.DATA_SOURCE === "neon" && Boolean(process.env.DATABASE_URL?.trim());
}

export const catalogRepository = new Proxy(mockCatalogRepository, {
  get(_target, prop, receiver) {
    const source = useNeonCatalog() ? neonCatalogRepository : mockCatalogRepository;
    const value = Reflect.get(source, prop, receiver);
    return typeof value === "function" ? value.bind(source) : value;
  },
});

export const cartRepository = mockCartRepository;
export const orderRepository = mockOrderRepository;
export const userRepository = mockUserRepository;
export const adminRepository = mockAdminRepository;
