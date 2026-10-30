import type { AuthTokenResponse, Locale } from "@market/contracts";

export type ApiClientOptions = {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  locale?: Locale;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Json = Record<string, unknown>;

export class MarketApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  private url(path: string, query?: Record<string, string | undefined>) {
    const base = this.options.baseUrl.replace(/\/$/, "");
    const u = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
    const locale = this.options.locale ?? "ru";
    u.searchParams.set("locale", locale);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== "") u.searchParams.set(k, v);
      }
    }
    return u.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | undefined>,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = await this.options.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(this.url(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as Json;
    if (!res.ok) {
      const err = data.error as Json | undefined;
      throw new ApiError(
        res.status,
        String(err?.code ?? "HTTP_ERROR"),
        String(err?.message ?? res.statusText),
        err?.requestId ? String(err.requestId) : undefined,
      );
    }
    return data as T;
  }

  authTelegram(initData: string) {
    return this.request<AuthTokenResponse>("POST", "/api/v1/auth/telegram", { initData });
  }

  authEmail(email: string, password: string) {
    return this.request<AuthTokenResponse>("POST", "/api/v1/auth/email", { email, password });
  }

  listCategories() {
    return this.request<{ categories: unknown[] }>("GET", "/api/v1/categories");
  }

  listProducts(query: { category?: string; q?: string; page?: string; sort?: string } = {}) {
    return this.request<{ products: unknown[]; page: unknown }>("GET", "/api/v1/products", undefined, query);
  }

  getProduct(slug: string) {
    return this.request<{ product: unknown }>("GET", `/api/v1/products/${encodeURIComponent(slug)}`);
  }

  searchSuggest(q: string) {
    return this.request<{ suggestions: { slug: string; title: string }[] }>(
      "GET",
      "/api/v1/search/suggest",
      undefined,
      { q },
    );
  }

  getCart() {
    return this.request<{ cart: unknown }>("GET", "/api/v1/cart");
  }

  addCartItem(variantId: string, quantity = 1) {
    return this.request<{ cart: unknown }>("POST", "/api/v1/cart/items", { variantId, quantity });
  }

  setCartItem(variantId: string, quantity: number) {
    return this.request<{ cart: unknown }>("PATCH", "/api/v1/cart/items", { variantId, quantity });
  }

  removeCartItem(variantId: string) {
    return this.request<{ cart: unknown }>("DELETE", "/api/v1/cart/items", { variantId });
  }

  createOrder(body: {
    contact: string;
    recipient: string;
    phone: string;
    city: string;
    street: string;
    idempotencyKey?: string;
  }) {
    return this.request<{ order: unknown }>("POST", "/api/v1/orders", body);
  }

  listOrders() {
    return this.request<{ orders: unknown[] }>("GET", "/api/v1/me/orders");
  }

  getOrder(id: string) {
    return this.request<{ order: unknown }>("GET", `/api/v1/me/orders/${encodeURIComponent(id)}`);
  }

  listFavorites() {
    return this.request<{ slugs: string[]; products: unknown[] }>("GET", "/api/v1/favorites");
  }

  toggleFavorite(productSlug: string) {
    return this.request<{ slugs: string[] }>("POST", "/api/v1/favorites", { productSlug });
  }
}
