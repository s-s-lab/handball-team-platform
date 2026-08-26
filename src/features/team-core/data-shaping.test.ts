import { describe, expect, it } from "vitest";
import {
  attachOrganizationRoles,
  attachTeamRoles,
} from "./data-shaping";

describe("attachOrganizationRoles", () => {
  it("keeps only organizations with a membership and attaches the role", () => {
    const result = attachOrganizationRoles(
      [
        { id: "org-1", name: "A", slug: "a" },
        { id: "org-2", name: "B", slug: "b" },
      ],
      [{ organization_id: "org-2", role: "admin" as const }],
    );

    expect(result).toEqual([
      { id: "org-2", name: "B", slug: "b", role: "admin" },
    ]);
  });
});

describe("attachTeamRoles", () => {
  it("attaches team role and maps database field names", () => {
    const result = attachTeamRoles(
      [
        {
          id: "team-1",
          organization_id: "org-1",
          name: "U18",
          slug: "u18",
          is_public: false,
        },
      ],
      [{ team_id: "team-1", role: "member" as const }],
    );

    expect(result).toEqual([
      {
        id: "team-1",
        organizationId: "org-1",
        name: "U18",
        slug: "u18",
        isPublic: false,
        role: "member",
      },
    ]);
  });
});
