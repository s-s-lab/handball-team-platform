import { describe, expect, it } from "vitest";
import {
  parseOrganizationForm,
  parseTeamForm,
  parseTeamMemberForm,
  slugify,
} from "./validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("slugify", () => {
  it("normalizes spaces, case, and repeated separators", () => {
    expect(slugify("  Tokyo Handball -- Club  ")).toBe("tokyo-handball-club");
  });

  it("removes characters that are not safe ASCII slug characters", () => {
    expect(slugify("東京 Handball! 2026")).toBe("handball-2026");
  });
});

describe("parseOrganizationForm", () => {
  it("trims a valid organization name and slug", () => {
    expect(parseOrganizationForm(form({ name: "  Aoyama HC  ", slug: " aoyama-hc " }))).toEqual({
      ok: true,
      value: { name: "Aoyama HC", slug: "aoyama-hc" },
    });
  });

  it("rejects an invalid slug", () => {
    expect(parseOrganizationForm(form({ name: "Aoyama HC", slug: "A" })).ok).toBe(false);
  });
});

describe("parseTeamForm", () => {
  it("parses an organization id with a valid team", () => {
    expect(
      parseTeamForm(
        form({
          organizationId: "11111111-1111-4111-8111-111111111111",
          name: "U18 Boys",
          slug: "u18-boys",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        organizationId: "11111111-1111-4111-8111-111111111111",
        name: "U18 Boys",
        slug: "u18-boys",
      },
    });
  });

  it("rejects a malformed organization id", () => {
    expect(parseTeamForm(form({ organizationId: "bad", name: "U18", slug: "u18" })).ok).toBe(false);
  });
});

describe("parseTeamMemberForm", () => {
  it("parses a player with optional handball fields", () => {
    expect(
      parseTeamMemberForm(
        form({
          teamId: "22222222-2222-4222-8222-222222222222",
          kind: "player",
          fullName: "  Hanako Yamada  ",
          displayName: "Hanako",
          shirtNumber: "12",
          primaryPosition: "CB",
          gradeOrAge: "高校2年",
          isActive: "on",
          isPublic: "on",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        teamId: "22222222-2222-4222-8222-222222222222",
        kind: "player",
        fullName: "Hanako Yamada",
        displayName: "Hanako",
        shirtNumber: 12,
        primaryPosition: "CB",
        gradeOrAge: "高校2年",
        isActive: true,
        isPublic: true,
      },
    });
  });

  it("accepts staff without number or position and defaults checkboxes to false", () => {
    const result = parseTeamMemberForm(
      form({
        teamId: "22222222-2222-4222-8222-222222222222",
        kind: "staff",
        fullName: "Coach",
        displayName: "",
        shirtNumber: "",
        primaryPosition: "",
        gradeOrAge: "",
      }),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        teamId: "22222222-2222-4222-8222-222222222222",
        kind: "staff",
        fullName: "Coach",
        displayName: null,
        shirtNumber: null,
        primaryPosition: null,
        gradeOrAge: null,
        isActive: false,
        isPublic: false,
      },
    });
  });

  it.each(["-1", "100", "12.5", "abc"])("rejects invalid shirt number %s", (shirtNumber) => {
    expect(
      parseTeamMemberForm(
        form({
          teamId: "22222222-2222-4222-8222-222222222222",
          kind: "player",
          fullName: "Player",
          displayName: "",
          shirtNumber,
          primaryPosition: "GK",
          gradeOrAge: "",
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects unsupported positions", () => {
    expect(
      parseTeamMemberForm(
        form({
          teamId: "22222222-2222-4222-8222-222222222222",
          kind: "player",
          fullName: "Player",
          displayName: "",
          shirtNumber: "1",
          primaryPosition: "XX",
          gradeOrAge: "",
        }),
      ).ok,
    ).toBe(false);
  });
});
