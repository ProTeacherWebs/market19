# Velin

Демонстрационный магазин техники (RU/EN). Этап A работает на моках. Этап B (Neon) подключается через `DATABASE_URL`.

## Стек

- Next.js App Router, Tailwind, next-intl
- `packages/contracts` — Zod-контракты API
- `packages/data` — репозитории (mock по умолчанию)
- `db/` — схема Neon (пакеты Drizzle ставятся отдельно, см. `db/README.md`)

## Запуск

```bash
npm install
npm run dev
```

Демо-вход: `buyer@velin.demo` / `demo1234`  
Админ: `admin@velin.demo` / `admin1234`

Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET` в `.env.local` и в Vercel Env. Redirect URI — `{NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`. Сессия подписана cookie (без Neon вход не теряется на cold start); заказы/корзина в моках по-прежнему эфемерны.

## Скрипты

- `npm run dev` / `npm run build` / `npm test`

## Neon

Проект связан через `neon.ts` / `.neon` (branch `production`).

```bash
neon deploy          # postgres, auth, object-storage, functions
npm run db:migrate
npm run db:seed
```

Проверка сервисов: `GET /api/health/neon`.

- `DATA_SOURCE=mock` — витрина/корзина на моках (по умолчанию)
- `DATA_SOURCE=neon` — каталог читает Postgres
- Auth: Neon Managed Better Auth (`/api/auth/[...path]`), Google через shared provider
- Storage bucket `assets` — загрузка аватара в профиле
- Function `hello` — `NEON_FUNCTION_HELLO_BASE_URL`

## Деплой

Vercel Root Directory — **пустой** (корень репо).
