# Velin

Демонстрационный магазин техники (RU/EN). Этап A работает на моках. Этап B (Neon) подключается через `DATABASE_URL`.

## Стек

- Next.js App Router, Tailwind, next-intl
- `packages/contracts` — Zod-контракты API
- `packages/api-client` — HTTP-клиент для Mini App / мобильного
- `packages/design-tokens` — общие CSS-токены
- `packages/data` — репозитории (mock / Neon)
- `apps/telegram` — Telegram Mini App (Vite)
- `apps/mobile` — Expo Router (Android/iOS)
- `db/` — схема Neon

## Запуск

```bash
npm install
npm run dev
```

Демо-вход: `buyer@velin.demo` / `demo1234`  
Админ: `admin@velin.demo` / `admin1234`

Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` в `.env.local`. Redirect URI в Google Console: `{NEON_AUTH_BASE_URL}/callback/google`.

## Telegram Mini App

```bash
npm run db:migrate          # таблица telegram_identities
# .env.local: TELEGRAM_BOT_TOKEN, AUTH_SECRET (или TELEGRAM_SESSION_SECRET)
npm run dev                 # API на :3000
npm run dev:telegram        # UI на :5173
```

В BotFather укажите Web App URL на деплой `apps/telegram` (или туннель на :5173). Сервер проверяет `initData` (HMAC), пишет `telegram_identities` + `profiles`, отдаёт Bearer-токен. Корзина/заказы идут в тот же Neon через `/api/v1/*`.

`TELEGRAM_MINIAPP_ORIGIN` — CORS origin Mini App (по умолчанию `http://localhost:5173`).

Проверка на Android / iOS / desktop Telegram — вручную после публикации URL бота (T10.5).

## Мобильное приложение (Expo)

```bash
npm run dev                 # API :3000, DATA_SOURCE=neon
npm run dev:mobile          # Expo
```

`apps/mobile/.env`: `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` (на телефоне — LAN IP).  
Вход: `buyer@velin.demo` / `demo1234` → `POST /api/v1/auth/email` → Bearer в SecureStore.  
Deep link: `velin://p/<slug>`.

## Скрипты

- `npm run dev` / `npm run build` / `npm test`
- `npm run dev:telegram` / `npm run build:telegram`
- `npm run dev:mobile` / `npm run typecheck:mobile`

## Neon

```bash
neon deploy
npm run db:migrate
npm run db:seed
```

Проверка: `GET /api/health/neon`. `DATA_SOURCE=neon|mock`.

```bash
npm run db:migrate && npm run db:seed && npm test && npm run build
```

## Деплой

Vercel Root Directory — **пустой** (корень репо). Mini App можно задеплоить отдельно (статика Vite) с `VITE_API_BASE_URL` на production API.
