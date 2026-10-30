import { z } from "zod";

export const locales = ["ru", "en"] as const;
export const localeSchema = z.enum(locales);
export type Locale = z.infer<typeof localeSchema>;

export const productStatusSchema = z.enum(["draft", "published", "archived"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const productQuerySchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["new", "price_asc", "price_desc"]).default("new"),
  includeDrafts: z.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  inStock: z.boolean().optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

export function parseProductQuery(input: unknown) {
  return productQuerySchema.safeParse(input);
}

export const telegramAuthBodySchema = z.object({
  initData: z.string().min(1).max(4096),
});
export type TelegramAuthBody = z.infer<typeof telegramAuthBodySchema>;

export const emailAuthBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
});
export type EmailAuthBody = z.infer<typeof emailAuthBodySchema>;

export const authTokenResponseSchema = z.object({
  token: z.string(),
  profile: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().optional(),
    telegramUserId: z.string().optional(),
  }),
});
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

/** @deprecated use AuthTokenResponse */
export type TelegramAuthResponse = AuthTokenResponse;
export const telegramAuthResponseSchema = authTokenResponseSchema;

export const cartAddBodySchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});
export type CartAddBody = z.infer<typeof cartAddBodySchema>;

export const cartPatchBodySchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(0).max(99),
});
export type CartPatchBody = z.infer<typeof cartPatchBodySchema>;

export const createOrderBodySchema = z.object({
  contact: z.string().trim().min(3).max(255),
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40),
  city: z.string().trim().min(2).max(120),
  street: z.string().trim().min(3).max(255),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
});
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;
