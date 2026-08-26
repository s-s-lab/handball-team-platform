import type {
  MembershipRole,
  OrganizationSummary,
  TeamSummary,
} from "./types";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
};

type OrganizationMembershipRow = {
  organization_id: string;
  role: MembershipRole;
};

type TeamRow = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  is_public: boolean;
};

type TeamMembershipRow = {
  team_id: string;
  role: MembershipRole;
};

export function attachOrganizationRoles(
  organizations: OrganizationRow[],
  memberships: OrganizationMembershipRow[],
): OrganizationSummary[] {
  const roleByOrganizationId = new Map(
    memberships.map((membership) => [membership.organization_id, membership.role]),
  );

  return organizations.flatMap((organization) => {
    const role = roleByOrganizationId.get(organization.id);
    if (!role) return [];
    return [{ ...organization, role }];
  });
}

export function attachTeamRoles(
  teams: TeamRow[],
  memberships: TeamMembershipRow[],
): TeamSummary[] {
  const roleByTeamId = new Map(
    memberships.map((membership) => [membership.team_id, membership.role]),
  );

  return teams.flatMap((team) => {
    const role = roleByTeamId.get(team.id);
    if (!role) return [];
    return [
      {
        id: team.id,
        organizationId: team.organization_id,
        name: team.name,
        slug: team.slug,
        isPublic: team.is_public,
        role,
      },
    ];
  });
}
