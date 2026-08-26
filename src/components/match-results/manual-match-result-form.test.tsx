import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("ManualMatchResultForm", () => {
  it("renders a focused historical result entry form", async () => {
    const loaded = await import("./manual-match-result-form").catch(() => null);
    expect(loaded?.ManualMatchResultForm).toBeTypeOf("function");
    if (!loaded?.ManualMatchResultForm) return;

    const html = renderToStaticMarkup(
      loaded.ManualMatchResultForm({ teamId: "11111111-1111-4111-8111-111111111111" }),
    );
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("過去の結果を登録");
    expect(text).toContain("大会・リーグ名");
    expect(text).toContain("試合名");
    expect(text).toContain("対戦相手");
    expect(text).toContain("自チーム得点");
    expect(text).toContain("相手得点");
    expect(text).toContain("最終スコアだけでも登録できます");
    expect(text).toContain("試合結果を登録");
    expect(html).toContain('name="teamScore"');
    expect(html).toContain('name="opponentScore"');
    expect(html).toContain('name="scheduledAt"');
    expect(html).toContain('name="isPublic"');
  });
});
