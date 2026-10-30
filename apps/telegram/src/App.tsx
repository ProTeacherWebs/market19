import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./auth";
import { syncBackButton } from "./telegram";
import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderPage } from "./pages/OrderPage";

export function App() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const canGoBack = location.pathname !== "/";
    return syncBackButton(canGoBack, () => navigate(-1));
  }, [location.pathname, navigate]);

  if (!auth.ready) {
    return (
      <div className="app-shell">
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Velin</div>
        <div className="muted">{auth.profile?.displayName ?? "гость"}</div>
      </header>

      {auth.error && (
        <div className="card stack" style={{ marginBottom: 12 }}>
          <p className="error">{auth.error}</p>
          <p className="muted">Каталог доступен без входа; корзина и заказы — после проверки initData.</p>
          <button type="button" className="btn btn-ghost" onClick={() => void auth.refresh()}>
            Повторить вход
          </button>
        </div>
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/c/:slug" element={<CatalogPage />} />
        <Route path="/p/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderPage />} />
      </Routes>

      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>
          Главная
        </NavLink>
        <NavLink to="/c/smartfony" className={({ isActive }) => (isActive ? "active" : undefined)}>
          Каталог
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => (isActive ? "active" : undefined)}>
          Корзина
        </NavLink>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : undefined)}>
          Заказы
        </NavLink>
      </nav>
    </div>
  );
}
