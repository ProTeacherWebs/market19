# Velin Mobile (Expo)

Нативные экраны каталога на тех же токенах и API/Neon, что сайт и Mini App.

## Запуск

```bash
# корень репо — API
npm run dev

# отдельный терминал
npm run dev:mobile
```

В `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

На физическом устройстве укажите LAN IP машины (`http://192.168.x.x:3000`), не `localhost`.

Демо-вход: `buyer@velin.demo` / `demo1234`  
Токен — SecureStore. Deep link товара: `velin://p/<slug>`.

## Проверки

- `npm run typecheck -w @market/mobile`
- Android/iOS в Expo Go или dev build (T11.5 — вручную)
