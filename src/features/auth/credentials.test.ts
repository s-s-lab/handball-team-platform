import { describe, expect, it } from "vitest";
import { parseCredentials } from "./credentials";

function form(email: unknown, password: unknown) {
  const data = new FormData();
  if (typeof email === "string") data.set("email", email);
  if (typeof password === "string") data.set("password", password);
  return data;
}

describe("parseCredentials", () => {
  it("normalizes email and accepts an eight-character password", () => {
    expect(parseCredentials(form("  PLAYER@EXAMPLE.COM ", "12345678"))).toEqual({
      ok: true,
      value: { email: "player@example.com", password: "12345678" },
    });
  });

  it("rejects malformed email", () => {
    expect(parseCredentials(form("not-an-email", "12345678"))).toEqual({
      ok: false,
      message: "有効なメールアドレスを入力してください。",
    });
  });

  it("rejects passwords shorter than eight characters", () => {
    expect(parseCredentials(form("player@example.com", "1234567"))).toEqual({
      ok: false,
      message: "パスワードは8文字以上で入力してください。",
    });
  });
});
