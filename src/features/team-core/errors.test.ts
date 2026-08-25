import { describe, expect, it } from "vitest";
import { teamCoreErrorMessage } from "./errors";

describe("teamCoreErrorMessage", () => {
  it("maps unique violations to a slug collision message", () => {
    expect(teamCoreErrorMessage({ code: "23505", message: "duplicate key" })).toBe(
      "このURL名はすでに使用されています。別のスラッグを指定してください。",
    );
  });

  it("maps authorization failures to a safe permission message", () => {
    expect(teamCoreErrorMessage({ code: "42501", message: "row-level security" })).toBe(
      "この操作を実行する権限がありません。",
    );
  });

  it("does not expose unknown database messages", () => {
    expect(teamCoreErrorMessage({ code: "XX000", message: "sensitive internals" })).toBe(
      "処理を完了できませんでした。時間をおいてもう一度お試しください。",
    );
  });
});
