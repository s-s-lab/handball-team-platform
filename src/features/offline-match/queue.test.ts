import { describe, expect, it } from "vitest";
import {
  buildQueueItem,
  detectReplayState,
  pendingActionsForMatch,
} from "./queue";
import type { OfflineQueueItem } from "./types";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_MATCH_ID = "22222222-2222-4222-8222-222222222222";

function build(existing: OfflineQueueItem[], suffix: number, matchId = MATCH_ID) {
  return buildQueueItem(
    {
      matchId,
      clientActionId: `30000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
      action: "goal",
      payload: { side: "home" },
      baseServerVersion: 10,
      eventTime: {
        period: 1,
        periodElapsedMs: 300_000 + suffix * 1_000,
        competitionElapsedMs: 300_000 + suffix * 1_000,
      },
      enqueuedAt: `2026-08-26T09:00:0${suffix}.000Z`,
    },
    existing,
  );
}

describe("offline action queue", () => {
  it("assigns a stable ordered local sequence", () => {
    const first = build([], 1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.item.localSequence).toBe(1);
    expect(first.item.syncState).toBe("pending");

    const second = build([first.item], 2);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.item.localSequence).toBe(2);
    expect(second.item.baseServerVersion).toBe(10);
  });

  it("rejects a duplicate client action id before persistence", () => {
    const first = build([], 1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const duplicate = buildQueueItem(
      {
        ...first.item,
        eventTime: first.item.eventTime,
        enqueuedAt: "2026-08-26T09:01:00.000Z",
      },
      [first.item],
    );

    expect(duplicate).toMatchObject({ ok: false });
  });

  it("restores one match queue in sequence order with event-time snapshots intact", () => {
    const first = build([], 1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const other = build([first.item], 2, OTHER_MATCH_ID);
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    const third = build([first.item, other.item], 3);
    expect(third.ok).toBe(true);
    if (!third.ok) return;

    const restored = pendingActionsForMatch([third.item, other.item, first.item], MATCH_ID);
    expect(restored.map((item) => item.clientActionId)).toEqual([
      first.item.clientActionId,
      third.item.clientActionId,
    ]);
    expect(restored[0]?.eventTime).toEqual({
      period: 1,
      periodElapsedMs: 301_000,
      competitionElapsedMs: 301_000,
    });
  });

  it("detects ready, conflict and empty replay states from the first queued base version", () => {
    const first = build([], 1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(detectReplayState(10, [])).toBe("empty");
    expect(detectReplayState(10, [first.item])).toBe("ready");
    expect(detectReplayState(11, [first.item])).toBe("conflict");
  });
});
