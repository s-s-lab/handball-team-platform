import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("workspace design tokens", () => {
  it("defines the semantic athletic workspace palette", () => {
    const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

    for (const token of [
      "--workspace-ink",
      "--workspace-accent",
      "--workspace-surface",
      "--workspace-surface-strong",
      "--workspace-success",
      "--workspace-live",
    ]) {
      expect(css).toContain(token);
    }

    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("font-variant-numeric");
  });
});
