# Neon / Drizzle (этап B)

```bash
# DATABASE_URL / DATABASE_URL_UNPOOLED уже в .env.local после `neon deploy`
npm run db:migrate
npm run db:seed
```

`DATA_SOURCE=neon` переключает репозитории на Postgres. Тесты: `npm test` (mock + neon).
