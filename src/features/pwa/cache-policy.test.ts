import { describe, expect, it } from "vitest";
import { shouldCacheRequest } from "./cache-policy";

const ORIGIN = "https://handball.example.com";

describe("PWA cache policy", () => {
  it("allows only same-origin static application assets", () => {
    expect(shouldCacheRequest({ method: "GET", url: `${ORIGIN}/_next/static/chunks/app.js` }, ORIGIN)).toBe(true);
    expect(shouldCacheRequest({ method: "GET", url: `${ORIGIN}/icons/icon-192.png` }, ORIGIN)).toBe(true);
    expect(shouldCacheRequest({ method: "GET", url: `${ORIGIN}/manifest.webmanifest` }, ORIGIN)).toBe(true);
  });

  it("never caches authenticated application pages or API/auth routes", () => {
    expect(shouldCacheRequest({ method: "GET", url: `${ORIGIN}/app/matches/match-1/console` }, ORIGIN)).toBe(false);
    expect(shouldCacheRequest({ method: "GET", url: `${ORIGIN}/api/matches` }, ORIGIN)).toBe(false);
    expect(shouldCacheRequest({ method: "GET", url: `${ORIGIN}/auth/login` }, ORIGIN)).toBe(false);
  });

  it("never caches Server Action/non-GET requests", () => {
    expect(shouldCacheRequest({ method: "POST", url: `${ORIGIN}/app/matches/match-1/console` }, ORIGIN)).toBe(false);
    expect(shouldCacheRequest({ method: "PUT", url: `${ORIGIN}/icons/icon-192.png` }, ORIGIN)).toBe(false);
  });

  it("never caches Supabase or any cross-origin request", () => {
    expect(shouldCacheRequest({ method: "GET", url: "https://project.supabase.co/rest/v1/matches" }, ORIGIN)).toBe(false);
    expect(shouldCacheRequest({ method: "GET", url: "https://cdn.example.net/app.js" }, ORIGIN)).toBe(false);
  });
});
