import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  issueAppSessionToken,
  validateTelegramInitData,
  verifyAppSessionToken,
} from "./telegram";

function buildInitData(botToken: string, user: object, authDate: number) {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify(user));
  params.set("auth_date", String(authDate));
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort();
  const dataCheckString = pairs.join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("telegram initData validation", () => {
  it("accepts signed payload and rejects tampering", () => {
    const botToken = "123456:ABC-DEF";
    const now = 1_700_000_000;
    const initData = buildInitData(botToken, { id: 42, first_name: "Ada" }, now);

    const ok = validateTelegramInitData(initData, botToken, now);
    expect(ok.user.id).toBe(42);
    expect(ok.user.first_name).toBe("Ada");

    expect(() => validateTelegramInitData(initData.replace("Ada", "Eve"), botToken, now)).toThrow();
    expect(() => validateTelegramInitData(initData, botToken, now + 60 * 60 * 25)).toThrow("AUTH_EXPIRED");
  });

  it("issues and verifies session token", () => {
    const secret = "test-secret-at-least-16";
    const token = issueAppSessionToken(
      {
        profileId: "11111111-1111-4111-8111-111111111111",
        email: "buyer@velin.demo",
      },
      secret,
    );
    const session = verifyAppSessionToken(token, secret);
    expect(session.email).toBe("buyer@velin.demo");
    expect(session.profileId).toBe("11111111-1111-4111-8111-111111111111");
  });
});
