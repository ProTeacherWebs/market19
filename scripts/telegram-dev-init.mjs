#!/usr/bin/env node
/** Prints a signed initData for local Mini App smoke (needs TELEGRAM_BOT_TOKEN). */
import { createHmac } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!botToken) {
  console.error("Set TELEGRAM_BOT_TOKEN in .env.local");
  process.exit(1);
}

const authDate = Math.floor(Date.now() / 1000);
const user = JSON.stringify({
  id: Number(process.env.TELEGRAM_DEV_USER_ID || 10001),
  first_name: process.env.TELEGRAM_DEV_NAME || "Dev",
  username: "velin_dev",
});

const params = new URLSearchParams({ user, auth_date: String(authDate) });
const dataCheckString = [...params.entries()]
  .map(([k, v]) => `${k}=${v}`)
  .sort()
  .join("\n");
const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
params.set("hash", hash);

console.log(params.toString());
console.log("\n# apps/telegram/.env.local:");
console.log(`VITE_API_BASE_URL=http://localhost:3000`);
console.log(`VITE_DEV_INIT_DATA=${params.toString()}`);
