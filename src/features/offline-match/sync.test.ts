import { describe, expect, it } from "vitest";
import type { OfflineQueueItem } from "./types";
import {
  advanceReplayQueue,
  buildReplayPlan,
  rebaseReplayQueue,
} from "./sync";

function item(sequence: number, baseServerVersion = 7): OfflineQueueItem {
  return {
    clientActionId: `action-${sequence}`,
    matchId: "match-1",
    localSequence: sequence,
    action: "goal",
    payload: { side: "home" },
    baseServerVersion,
    eventTime: {
      period: 1,
      periodElapsedMs: 10_000 + sequence,
      competitionElapsedMs: 10_000 + sequence,
    },
    enqueuedAt: `2026-08-26T09:00:0${sequence}.000Z`,
    syncState: "pending",
  };
}

describe("offline replay planning", () => {
  it("builds an ordered replay plan when server version matches the first base version", () => {
    const plan = buildReplayPlan(7, [item(2), item(1)]);

    expect(plan.state).toBe("ready");
    if (plan.state !== "ready") return;
    expect(plan.steps.map((step) => [step.item.clientActionId, step.expectedVersion])).toEqual([
      ["action-1", 7],
      ["action-2", 8],
    ]);
  });

  it("enters conflict instead of replaying over a newer server state", () => {
    const plan = buildReplayPlan(9, [item(1), item(2)]);
    expect(plan).toEqual({ state: "conflict", serverVersion: 9, baseServerVersion: 7 });
  });

  it("advances expected versions sequentially from the authoritative server version", () => {
    const plan = buildReplayPlan(12, [item(1, 12), item(2, 12), item(3, 12)]);
    expect(plan.state).toBe("ready");
    if (plan.state !== "ready") return;
    expect(plan.steps.map((step) => step.expectedVersion)).toEqual([12, 13, 14]);
  });

  it("removes accepted items but preserves a failed item and everything after it", () => {
    const queue = [item(1), item(2), item(3)];
    const afterFirst = advanceReplayQueue(queue, "action-1", "accepted");
    expect(afterFirst.map((entry) => entry.clientActionId)).toEqual(["action-2", "action-3"]);

    const afterFailure = advanceReplayQueue(afterFirst, "action-2", "failed");
    expect(afterFailure).toHaveLength(2);
    expect(afterFailure[0]?.syncState).toBe("failed");
    expect(afterFailure[1]?.syncState).toBe("pending");
  });

  it("rebases remaining items after a partial successful replay", () => {
    const remaining = advanceReplayQueue([item(1), item(2), item(3)], "action-1", "accepted");
    const rebased = rebaseReplayQueue(remaining, 8);

    expect(rebased.map((entry) => entry.baseServerVersion)).toEqual([8, 8]);
    expect(buildReplayPlan(8, rebased).state).toBe("ready");
  });
});
