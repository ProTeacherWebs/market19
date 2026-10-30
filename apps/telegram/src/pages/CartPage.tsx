import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient, formatUzs } from "../api";
import { useAuth } from "../auth";

type CartItem = {
  variantId: string;
  title: string;
  sku: string;
  unitPriceUzs: number;
  quantity: number;
  lineTotalUzs: number;
};

type Cart = {
  items: CartItem[];
  totalUzs: number;
};

export function CartPage() {
  const auth = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!auth.token) {
      setError("Войдите через Telegram, чтобы видеть корзину аккаунта.");
      setCart(null);
      return;
    }
    try {
      const res = await createClient().getCart();
      setCart(res.cart as Cart);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка корзины");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  const setQty = async (variantId: string, quantity: number) => {
    try {
      const res = await createClient().setCartItem(variantId, quantity);
      setCart(res.cart as Cart);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить");
    }
  };

  if (!auth.token) {
    return (
      <div className="stack">
        <p className="error">{error}</p>
        <button type="button" className="btn btn-ghost" onClick={() => void auth.refresh()}>
          Войти снова
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.15rem", margin: 0 }}>Корзина</h1>
      {error && <p className="error">{error}</p>}
      {!cart && !error && <p className="muted">Загрузка…</p>}
      {cart?.items.length === 0 && <p className="muted">Корзина пуста.</p>}
      {cart?.items.map((item) => (
        <div key={item.variantId} className="card stack">
          <strong>{item.title}</strong>
          <span className="muted">{item.sku}</span>
          <div className="price">{formatUzs(item.lineTotalUzs)}</div>
          <div className="qty">
            <button type="button" onClick={() => void setQty(item.variantId, Math.max(0, item.quantity - 1))}>
              −
            </button>
            <span>{item.quantity}</span>
            <button type="button" onClick={() => void setQty(item.variantId, item.quantity + 1)}>
              +
            </button>
          </div>
        </div>
      ))}
      {cart && cart.items.length > 0 && (
        <>
          <div className="price">Итого: {formatUzs(cart.totalUzs)}</div>
          <Link className="btn" to="/checkout">
            Оформить
          </Link>
        </>
      )}
    </div>
  );
}
