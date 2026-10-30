import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient, formatUzs } from "../api";
import { useAuth } from "../auth";

type Order = {
  id: string;
  number: string;
  status: string;
  totalUzs: number;
};

export function OrdersPage() {
  const auth = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    void (async () => {
      try {
        const res = await createClient().listOrders();
        setOrders((res.orders as Order[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка заказов");
      }
    })();
  }, [auth.token]);

  if (!auth.token) return <p className="error">Нужна авторизация Telegram.</p>;

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.15rem", margin: 0 }}>Мои заказы</h1>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && !error && <p className="muted">Заказов пока нет.</p>}
      {orders.map((o) => (
        <Link key={o.id} to={`/orders/${o.id}`} className="card stack">
          <strong>№ {o.number}</strong>
          <span className="muted">{o.status}</span>
          <span className="price">{formatUzs(o.totalUzs)}</span>
        </Link>
      ))}
    </div>
  );
}
