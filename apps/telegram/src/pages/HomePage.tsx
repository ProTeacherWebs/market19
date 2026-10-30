import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient, assetUrl } from "../api";

type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await createClient().listCategories();
        setCategories((res.categories as Category[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      }
    })();
  }, []);

  return (
    <div className="stack">
      <p className="muted">Техника с тем же каталогом и заказами, что на сайте.</p>
      {error && <p className="error">{error}</p>}
      {categories.map((c) => (
        <Link key={c.slug} to={`/c/${c.slug}`} className="card card-row">
          <img className="thumb" src={assetUrl(c.image)} alt="" />
          <div>
            <strong>{c.name}</strong>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {c.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
