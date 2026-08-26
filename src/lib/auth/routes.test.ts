import { describe, expect, it } from "vitest";
import { isAuthPath, isProtectedPath, safeNextPath } from "./routes";

describe("route classification", () => {
  it("protects the application area", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/teams/123")).toBe(true);
  });

  it("keeps public portal routes public", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/teams/aoyama-handball")).toBe(false);
    expect(isProtectedPath("/live/match-id")).toBe(false);
  });

  it("recognizes authentication routes", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/signup")).toBe(true);
    expect(isAuthPath("/auth/confirm")).toBe(true);
    expect(isAuthPath("/app")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps a local path", () => {
    expect(safeNextPath("/app/teams/123")).toBe("/app/teams/123");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/app");
    expect(safeNextPath("//evil.example")).toBe("/app");
  });
});
