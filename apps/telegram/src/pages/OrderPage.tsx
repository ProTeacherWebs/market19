import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient, formatUzs } from "../api";
import { useAuth } from "../auth";

type Order = {
  id: string;
  number: string;
  status: string;
  totalUzs: number;
  items: { title: string; quantity: number; lineTotalUzs: number }[];
};

export function OrderPage() {
  const { id = "" } = useParams();
  const auth = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    void (async () => {
      try {
        const res = await createClient().getOrder(id);
        setOrder(res.order as Order);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Заказ не найден");
      }
    })();
  }, [auth.token, id]);

  if (!auth.token) return <p className="error">Нужна авторизация Telegram.</p>;
  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="muted">Загрузка…</p>;

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.15rem", margin: 0 }}>Заказ № {order.number}</h1>
      <p className="muted">Статус: {order.status}</p>
      {order.items.map((item, idx) => (
        <div key={idx} className="card">
          <strong>
            {item.title} × {item.quantity}
          </strong>
          <div className="price">{formatUzs(item.lineTotalUzs)}</div>
        </div>
      ))}
      <div className="price">Итого: {formatUzs(order.totalUzs)}</div>
    </div>
  );
}
