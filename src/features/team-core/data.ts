import "server-only";

import { createClient } from "@/lib/supabase/server";
import { attachOrganizationRoles, attachTeamRoles } from "./data-shaping";
import type {
  HandballPosition,
  MembershipRole,
  OrganizationDetail,
  OrganizationSummary,
  TeamDetail,
  TeamMemberKind,
  TeamMemberRecord,
  TeamSummary,
} from "./types";

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) return null;
  const subject = data?.claims?.sub;
  return typeof subject === "string" ? subject : null;
}

function databaseReadFailure() {
  return new Error("チーム情報を読み込めませんでした。");
}

export async function listMyOrganizations(): Promise<OrganizationSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId);

  if (membershipError) throw databaseReadFailure();
  if (!memberships?.length) return [];

  const organizationIds = memberships.map((membership) => membership.organization_id);
  const { data: organizations, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .in("id", organizationIds)
    .order("name");

  if (organizationError) throw databaseReadFailure();

  return attachOrganizationRoles(
    (organizations ?? []) as Array<{ id: string; name: string; slug: string }>,
    memberships as Array<{ organization_id: string; role: MembershipRole }>,
  );
}

export async function listMyTeams(): Promise<TeamSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("team_user_memberships")
    .select("team_id, role")
    .eq("user_id", userId);

  if (membershipError) throw databaseReadFailure();
  if (!memberships?.length) return [];

  const teamIds = memberships.map((membership) => membership.team_id);
  const { data: teams, error: teamError } = await supabase
    .from("teams")
    .select("id, organization_id, name, slug, is_public")
    .in("id", teamIds)
    .order("name");

  if (teamError) throw databaseReadFailure();

  return attachTeamRoles(
    (teams ?? []) as Array<{
      id: string;
      organization_id: string;
      name: string;
      slug: string;
      is_public: boolean;
    }>,
    memberships as Array<{ team_id: string; role: MembershipRole }>,
  );
}

export async function getOrganizationForCurrentUser(
  organizationId: string,
): Promise<OrganizationDetail | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw databaseReadFailure();
  if (!membership) return null;

  const [{ data: organization, error: organizationError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("teams")
        .select("id, name, slug, is_public")
        .eq("organization_id", organizationId)
        .order("name"),
    ]);

  if (organizationError || teamsError) throw databaseReadFailure();
  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    role: membership.role as MembershipRole,
    teams: (teams ?? []).map((team) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      isPublic: team.is_public,
    })),
  };
}

export async function getTeamForCurrentUser(teamId: string): Promise<TeamDetail | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, organization_id, name, slug, short_name, description, is_public")
    .eq("id", teamId)
    .maybeSingle();

  if (teamError) throw databaseReadFailure();
  if (!team) return null;

  const [{ data: membership, error: membershipError }, { data: roster, error: rosterError }] =
    await Promise.all([
      supabase
        .from("team_user_memberships")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("team_members")
        .select(
          "id, team_id, kind, full_name, display_name, shirt_number, primary_position, grade_or_age, image_path, is_active, is_public",
        )
        .eq("team_id", teamId)
        .order("kind")
        .order("shirt_number", { nullsFirst: false })
        .order("full_name"),
    ]);

  if (membershipError || rosterError) throw databaseReadFailure();

  const mappedRoster: TeamMemberRecord[] = (roster ?? []).map((member) => ({
    id: member.id,
    teamId: member.team_id,
    kind: member.kind as TeamMemberKind,
    fullName: member.full_name,
    displayName: member.display_name,
    shirtNumber: member.shirt_number,
    primaryPosition: member.primary_position as HandballPosition | null,
    gradeOrAge: member.grade_or_age,
    imagePath: member.image_path,
    isActive: member.is_active,
    isPublic: member.is_public,
  }));

  return {
    id: team.id,
    organizationId: team.organization_id,
    name: team.name,
    slug: team.slug,
    shortName: team.short_name,
    description: team.description,
    isPublic: team.is_public,
    role: membership ? (membership.role as MembershipRole) : null,
    roster: mappedRoster,
  };
}
