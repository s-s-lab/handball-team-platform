import { describe, expect, it } from "vitest";
import { mapConsoleActionDatabaseError } from "./errors";

describe("mapConsoleActionDatabaseError", () => {
  it("maps progressive-sanction and timeout rule errors to safe Japanese messages", () => {
    expect(mapConsoleActionDatabaseError("22023", "Participant has already been warned")).toBe(
      "この選手にはすでに警告が記録されています。",
    );
    expect(mapConsoleActionDatabaseError("22023", "Team timeout period limit reached")).toBe(
      "このピリオドで取得できるチームタイムアウトの上限に達しています。",
    );
    expect(mapConsoleActionDatabaseError("22023", "Team timeout is not allowed in overtime")).toBe(
      "延長戦ではチームタイムアウトを取得できません。",
    );
  });

  it("does not expose unknown database details", () => {
    const message = mapConsoleActionDatabaseError("22023", "sensitive internal table detail");
    expect(message).toBe("この操作は現在の試合状態では実行できません。最新状態を確認してください。");
    expect(message).not.toContain("sensitive");
  });

  it("maps permission errors without database detail", () => {
    expect(mapConsoleActionDatabaseError("42501", "private.can_manage_match failed")).toBe(
      "この試合を操作する権限がありません。",
    );
  });
});
