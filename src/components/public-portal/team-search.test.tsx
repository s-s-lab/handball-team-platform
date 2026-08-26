import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicTeamSearchResult } from "@/features/public-portal/types";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...props }, children),
  };
});

import { TeamSearch } from "./team-search";

const result: PublicTeamSearchResult = {
  id: "66000000-0000-4000-8000-000000000031",
  name: "Portal Team",
  slug: "portal-team",
  shortName: "PT",
  description: "Public handball team",
};

describe("TeamSearch", () => {
  it("renders a GET form and preserves the submitted query", () => {
    const html = renderToStaticMarkup(
      <TeamSearch query="Portal" results={[]} submitted={false} />,
    );

    expect(html).toContain('<form action="/" method="get"');
    expect(html).toContain('name="team_q"');
    expect(html).toContain('value="Portal"');
    expect(html).toContain("チーム名・略称で検索");
    expect(html).toContain(">検索<");
  });

  it("shows the exact no-results message after a submitted search", () => {
    const html = renderToStaticMarkup(
      <TeamSearch query="Unknown" results={[]} submitted />,
    );

    expect(html).toContain("該当する公開チームは見つかりませんでした。");
  });

  it("renders public team result identity and link", () => {
    const html = renderToStaticMarkup(
      <TeamSearch query="PT" results={[result]} submitted />,
    );

    expect(html).toContain('href="/teams/portal-team"');
    expect(html).toContain("Portal Team");
    expect(html).toContain("PT");
    expect(html).toContain("Public handball team");
  });
});
