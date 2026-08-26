import { describe, expect, it } from "vitest";
import {
  OFFLINE_DB_STORES,
  matchRecordKey,
} from "./idb";

describe("offline IndexedDB schema", () => {
  it("persists only the four planned match stores", () => {
    expect(OFFLINE_DB_STORES).toEqual([
      "matchSnapshots",
      "matchEvents",
      "matchParticipants",
      "pendingActions",
    ]);
    expect(OFFLINE_DB_STORES.join(" ").toLowerCase()).not.toMatch(/token|session|credential|auth/);
  });

  it("creates stable match-scoped record keys", () => {
    expect(matchRecordKey("match-1", "snapshot")).toBe("match-1:snapshot");
    expect(matchRecordKey("match-1", "participants")).toBe("match-1:participants");
  });
});
