import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ConsoleSnapshot } from "@/features/match-console/types";
import { ConflictPanel } from "./conflict-panel";

const serverSnapshot: ConsoleSnapshot = {
  matchId: "match-1",
  version: 12,
  currentPeriod: 2,
  clockElapsedMs: 300_000,
  competitionElapsedMs: 2_100_000,
  clockRunning: false,
  clockStartedAt: null,
  homeScore: 10,
  awayScore: 9,
  matchStatus: "live",
  periodDurationMs: 1_800_000,
  serverNow: "2026-08-26T09:00:00.000Z",
};

const localSnapshot: ConsoleSnapshot = {
  ...serverSnapshot,
  version: 10,
  currentPeriod: 1,
  clockElapsedMs: 1_200_000,
  competitionElapsedMs: 1_200_000,
  homeScore: 11,
  awayScore: 9,
};

describe("ConflictPanel", () => {
  it("shows server/local differences and the conservative discard action", () => {
    const html = renderToStaticMarkup(
      <ConflictPanel
        serverSnapshot={serverSnapshot}
        localSnapshot={localSnapshot}
        pendingCount={2}
        onDiscardLocal={vi.fn()}
      />,
    );

    expect(html).toContain("競合あり");
    expect(html).toContain("サーバー");
    expect(html).toContain("ローカル");
    expect(html).toContain("2件の未同期操作");
    expect(html).toContain("ローカル未同期を破棄してサーバー状態へ戻る");
  });
});
