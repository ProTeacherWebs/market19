import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assetUrl, createClient, formatUzs } from "../api";
import { useAuth } from "../auth";

type Variant = {
  id: string;
  sku: string;
  label: string;
  priceUzs: number;
  stockQuantity: number;
};

type Product = {
  slug: string;
  title: string;
  description: string;
  image: string;
  variants: Variant[];
};

export function ProductPage() {
  const { slug = "" } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await createClient().getProduct(slug);
        const p = res.product as Product;
        setProduct(p);
        setVariantId(p.variants[0]?.id ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Товар не найден");
      }
    })();
  }, [slug]);

  const selected = product?.variants.find((v) => v.id === variantId);

  const add = async () => {
    if (!auth.token) {
      setError("Сначала войдите через Telegram (initData).");
      return;
    }
    if (!variantId) return;
    setBusy(true);
    setError(null);
    try {
      await createClient().addCartItem(variantId, 1);
      navigate("/cart");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить");
    } finally {
      setBusy(false);
    }
  };

  if (!product && !error) return <p className="muted">Загрузка…</p>;
  if (!product) return <p className="error">{error}</p>;

  return (
    <div className="stack">
      <img
        src={assetUrl(product.image)}
        alt=""
        style={{ width: "100%", borderRadius: 16, aspectRatio: "1 / 1", objectFit: "cover" }}
      />
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>{product.title}</h1>
      <p className="muted">{product.description}</p>
      <div className="stack">
        {product.variants.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`btn ${v.id === variantId ? "" : "btn-ghost"}`}
            onClick={() => setVariantId(v.id)}
          >
            {v.label} · {formatUzs(v.priceUzs)}
          </button>
        ))}
      </div>
      {selected && (
        <p className="muted">
          SKU {selected.sku} · остаток {selected.stockQuantity}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn" disabled={busy || !selected || selected.stockQuantity < 1} onClick={() => void add()}>
        В корзину
      </button>
    </div>
  );
}
