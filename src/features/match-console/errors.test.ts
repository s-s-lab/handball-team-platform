import { describe, expect, it } from "vitest";
import { mapConsoleActionDatabaseError } from "./errors";

describe("mapConsoleActionDatabaseError", () => {
  it("maps progressive-sanction and timeout rule errors to safe Japanese messages", () => {
    expect(mapConsoleActionDatabaseError("22023", "Participant has already been warned")).toBe(
      "この選手にはすでに警告が記録されています。",
    );
    expect(mapConsoleActionDatabaseError("22023", "Team-timeout period limit has been reached")).toBe(
      "このピリオドで取得できるチームタイムアウトの上限に達しています。",
    );
    expect(mapConsoleActionDatabaseError("22023", "Team timeout is not available in overtime")).toBe(
      "延長戦ではチームタイムアウトを取得できません。",
    );
  });

  it("maps goal-attribution conflicts without exposing database details", () => {
    expect(mapConsoleActionDatabaseError("22023", "Goal already has scorer attribution")).toBe(
      "この得点にはすでに得点者が記録されています。",
    );
    expect(mapConsoleActionDatabaseError("22023", "Managed-team goal attribution requires a match-roster participant")).toBe(
      "自チームの得点者は試合ロスターから選択してください。",
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
