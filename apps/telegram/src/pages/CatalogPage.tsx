import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { assetUrl, createClient, formatUzs } from "../api";

type ProductCard = {
  slug: string;
  title: string;
  priceUzs: number;
  stockQuantity: number;
  image: string;
};

export function CatalogPage() {
  const { slug = "" } = useParams();
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await createClient().listProducts({ category: slug, page: "1" });
        setProducts((res.products as ProductCard[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка каталога");
      }
    })();
  }, [slug]);

  return (
    <div className="stack">
      <h1 style={{ fontSize: "1.15rem", margin: 0 }}>{slug}</h1>
      {error && <p className="error">{error}</p>}
      {products.length === 0 && !error && <p className="muted">В этой категории пока пусто.</p>}
      {products.map((p) => (
        <Link key={p.slug} to={`/p/${p.slug}`} className="card card-row">
          <img className="thumb" src={assetUrl(p.image)} alt="" />
          <div>
            <strong>{p.title}</strong>
            <div className="price">{formatUzs(p.priceUzs)}</div>
            <div className="muted">{p.stockQuantity > 0 ? "В наличии" : "Нет в наличии"}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
