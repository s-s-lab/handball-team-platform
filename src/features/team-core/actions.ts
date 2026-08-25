"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { teamCoreErrorMessage } from "./errors";
import {
  parseOrganizationForm,
  parseTeamForm,
  parseTeamMemberForm,
} from "./validation";

function errorPath(path: string, message: string) {
  const params = new URLSearchParams({ error: message });
  return `${path}?${params.toString()}`;
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createOrganization(formData: FormData) {
  const parsed = parseOrganizationForm(formData);
  if (!parsed.ok) redirect(errorPath("/app/organizations/new", parsed.message));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization_with_admin", {
    p_name: parsed.value.name,
    p_slug: parsed.value.slug,
  });

  if (error || typeof data !== "string") {
    redirect(errorPath("/app/organizations/new", teamCoreErrorMessage(error ?? {})));
  }

  revalidatePath("/app");
  redirect(`/app/organizations/${data}`);
}

export async function createTeam(formData: FormData) {
  const parsed = parseTeamForm(formData);
  const fallbackOrganizationId = formText(formData, "organizationId");
  const path = `/app/organizations/${fallbackOrganizationId}/teams/new`;
  if (!parsed.ok) redirect(errorPath(path, parsed.message));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_team_with_admin", {
    p_organization_id: parsed.value.organizationId,
    p_name: parsed.value.name,
    p_slug: parsed.value.slug,
  });

  if (error || typeof data !== "string") {
    redirect(errorPath(path, teamCoreErrorMessage(error ?? {})));
  }

  revalidatePath("/app");
  revalidatePath(`/app/organizations/${parsed.value.organizationId}`);
  redirect(`/app/teams/${data}`);
}

export async function createTeamMember(formData: FormData) {
  const parsed = parseTeamMemberForm(formData);
  const teamId = formText(formData, "teamId");
  const path = `/app/teams/${teamId}/members/new`;
  if (!parsed.ok) redirect(errorPath(path, parsed.message));

  const supabase = await createClient();
  const { error } = await supabase.from("team_members").insert({
    team_id: parsed.value.teamId,
    kind: parsed.value.kind,
    full_name: parsed.value.fullName,
    display_name: parsed.value.displayName,
    shirt_number: parsed.value.shirtNumber,
    primary_position: parsed.value.primaryPosition,
    grade_or_age: parsed.value.gradeOrAge,
    is_active: parsed.value.isActive,
    is_public: parsed.value.isPublic,
  });

  if (error) redirect(errorPath(path, teamCoreErrorMessage(error)));

  revalidatePath(`/app/teams/${parsed.value.teamId}`);
  revalidatePath("/teams/[slug]", "page");
  redirect(`/app/teams/${parsed.value.teamId}`);
}

export async function updateTeamMember(formData: FormData) {
  const parsed = parseTeamMemberForm(formData);
  const memberId = formText(formData, "memberId");
  const teamId = formText(formData, "teamId");
  const path = `/app/teams/${teamId}/members/${memberId}/edit`;
  if (!parsed.ok) redirect(errorPath(path, parsed.message));
  if (!memberId) redirect(errorPath(path, "メンバー情報が正しくありません。"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({
      kind: parsed.value.kind,
      full_name: parsed.value.fullName,
      display_name: parsed.value.displayName,
      shirt_number: parsed.value.shirtNumber,
      primary_position: parsed.value.primaryPosition,
      grade_or_age: parsed.value.gradeOrAge,
      is_active: parsed.value.isActive,
      is_public: parsed.value.isPublic,
    })
    .eq("id", memberId)
    .eq("team_id", parsed.value.teamId);

  if (error) redirect(errorPath(path, teamCoreErrorMessage(error)));

  revalidatePath(`/app/teams/${parsed.value.teamId}`);
  revalidatePath("/teams/[slug]", "page");
  redirect(`/app/teams/${parsed.value.teamId}`);
}

export async function updateTeamVisibility(formData: FormData) {
  const teamId = formText(formData, "teamId");
  if (!teamId) redirect("/app");

  const isPublic = formData.get("isPublic") === "on";
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ is_public: isPublic })
    .eq("id", teamId);

  if (error) {
    redirect(errorPath(`/app/teams/${teamId}`, teamCoreErrorMessage(error)));
  }

  revalidatePath(`/app/teams/${teamId}`);
  revalidatePath("/teams/[slug]", "page");
  redirect(`/app/teams/${teamId}`);
}

export async function updateTeamMemberVisibility(formData: FormData) {
  const teamId = formText(formData, "teamId");
  const memberId = formText(formData, "memberId");
  if (!teamId || !memberId) redirect("/app");

  const isPublic = formData.get("isPublic") === "on";
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ is_public: isPublic })
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    redirect(errorPath(`/app/teams/${teamId}`, teamCoreErrorMessage(error)));
  }

  revalidatePath(`/app/teams/${teamId}`);
  revalidatePath("/teams/[slug]", "page");
  redirect(`/app/teams/${teamId}`);
}
