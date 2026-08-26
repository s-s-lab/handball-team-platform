import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SyncStatus } from "./sync-status";

describe("SyncStatus", () => {
  it("renders the five operator-visible sync states", () => {
    expect(renderToStaticMarkup(<SyncStatus status="saved" pendingCount={0} />)).toContain("保存済み");
    expect(renderToStaticMarkup(<SyncStatus status="saving" pendingCount={0} />)).toContain("保存中");
    expect(renderToStaticMarkup(<SyncStatus status="syncing" pendingCount={2} />)).toContain("同期中");
    expect(renderToStaticMarkup(<SyncStatus status="offline" pendingCount={3} />)).toContain("オフライン・3件未同期");
    expect(renderToStaticMarkup(<SyncStatus status="conflict" pendingCount={2} />)).toContain("競合あり");
  });
});
