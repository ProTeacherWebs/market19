import { config } from "dotenv";

config({ path: ".env.local" });

const base = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, "");
const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
if (!base) {
  console.error("NEON_AUTH_BASE_URL missing");
  process.exit(1);
}

const users = [
  { email: "buyer@velin.demo", password: "demo1234", name: "Buyer Demo" },
  { email: "admin@velin.demo", password: "admin1234", name: "Admin Demo" },
];

for (const user of users) {
  const res = await fetch(`${base}/sign-up/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      referer: `${origin}/`,
    },
    body: JSON.stringify(user),
  });
  const text = await res.text();
  console.log(user.email, res.status, text.slice(0, 240));
}
