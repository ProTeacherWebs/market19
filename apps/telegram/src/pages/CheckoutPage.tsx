import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "../api";
import { useAuth } from "../auth";

export function CheckoutPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth.token) {
    return <p className="error">Нужна авторизация Telegram.</p>;
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await createClient().createOrder({
        contact: String(fd.get("contact") ?? ""),
        recipient: String(fd.get("recipient") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        city: String(fd.get("city") ?? ""),
        street: String(fd.get("street") ?? ""),
        idempotencyKey: crypto.randomUUID(),
      });
      const order = res.order as { id: string };
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка заказа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={(e) => void onSubmit(e)}>
      <h1 style={{ fontSize: "1.15rem", margin: 0 }}>Оформление</h1>
      <p className="muted">Демо-заказ, оплата при получении.</p>
      <label className="field">
        Контакт (email/Telegram)
        <input name="contact" required defaultValue={auth.profile?.displayName ?? ""} />
      </label>
      <label className="field">
        Получатель
        <input name="recipient" required defaultValue={auth.profile?.displayName ?? ""} />
      </label>
      <label className="field">
        Телефон
        <input name="phone" required placeholder="+998…" />
      </label>
      <label className="field">
        Город
        <input name="city" required defaultValue="Ташкент" />
      </label>
      <label className="field">
        Адрес
        <textarea name="street" required />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        Подтвердить заказ
      </button>
    </form>
  );
}
