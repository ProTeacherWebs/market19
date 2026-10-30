type TgWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  themeParams?: Record<string, string>;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
  safeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
  contentSafeAreaInset?: { top?: number; bottom?: number; left?: number; right?: number };
};

function webApp(): TgWebApp | null {
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp ?? null;
}

export function bootstrapTelegram() {
  const tg = webApp();
  if (!tg) return { isTelegram: false as const };

  tg.ready?.();
  tg.expand?.();
  applyTheme(tg);
  applySafeArea(tg);

  const onSafe = () => applySafeArea(tg);
  tg.onEvent?.("safeAreaChanged", onSafe);
  tg.onEvent?.("contentSafeAreaChanged", onSafe);
  tg.onEvent?.("viewportChanged", onSafe);

  return { isTelegram: true as const };
}

function applyTheme(tg: TgWebApp) {
  const root = document.documentElement;
  const t = tg.themeParams ?? {};
  if (t.bg_color) root.style.setProperty("--tg-bg", t.bg_color);
  if (t.text_color) root.style.setProperty("--tg-text", t.text_color);
  if (t.hint_color) root.style.setProperty("--tg-hint", t.hint_color);
  if (t.button_color) root.style.setProperty("--tg-button", t.button_color);
  if (t.button_text_color) root.style.setProperty("--tg-button-text", t.button_text_color);
  if (t.secondary_bg_color) root.style.setProperty("--tg-secondary", t.secondary_bg_color);
}

function applySafeArea(tg: TgWebApp) {
  const root = document.documentElement;
  const s = tg.safeAreaInset ?? {};
  const c = tg.contentSafeAreaInset ?? {};
  root.style.setProperty("--safe-top", `${(c.top ?? s.top ?? 0)}px`);
  root.style.setProperty("--safe-bottom", `${(c.bottom ?? s.bottom ?? 0)}px`);
  root.style.setProperty("--safe-left", `${(c.left ?? s.left ?? 0)}px`);
  root.style.setProperty("--safe-right", `${(c.right ?? s.right ?? 0)}px`);
}

export function syncBackButton(canGoBack: boolean, onBack: () => void) {
  const btn = webApp()?.BackButton;
  if (!btn) return () => undefined;
  if (canGoBack) btn.show();
  else btn.hide();
  btn.onClick(onBack);
  return () => btn.offClick(onBack);
}

export function readInitData(): string {
  return webApp()?.initData?.trim() || "";
}
