import { describe, expect, it } from "vitest";
import { getPublicEnv } from "./env";

describe("getPublicEnv", () => {
  it("returns the Supabase public configuration when both values exist", () => {
    expect(
      getPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_test",
    });
  });

  it("rejects a missing Supabase URL", () => {
    expect(() =>
      getPublicEnv({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("rejects a missing Supabase publishable key", () => {
    expect(() =>
      getPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  });
});
