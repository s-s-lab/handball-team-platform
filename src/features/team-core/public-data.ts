import "server-only";

import { createPublicClient } from "@/lib/supabase/public-client";
import { shapePublicTeamMembers, type PublicTeamMember } from "./public-data-shaping";
import type { HandballPosition, TeamMemberKind } from "./types";

export type PublicTeam = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  description: string | null;
};

type PublicTeamRow = {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  description: string | null;
};

type PublicTeamMemberRow = {
  id: string;
  kind: TeamMemberKind;
  display_name: string | null;
  shirt_number: number | null;
  primary_position: HandballPosition | null;
  grade_or_age: string | null;
  image_path: string | null;
};

export async function getPublicTeamBySlug(slug: string): Promise<PublicTeam | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_team", { p_slug: slug });

  if (error) throw new Error("公開チーム情報を読み込めませんでした。");
  const row = Array.isArray(data) ? (data[0] as PublicTeamRow | undefined) : undefined;
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortName: row.short_name,
    description: row.description,
  };
}

export async function getPublicTeamMembers(teamId: string): Promise<PublicTeamMember[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_team_members", { p_team_id: teamId });

  if (error) throw new Error("公開ロスターを読み込めませんでした。");
  return shapePublicTeamMembers((data ?? []) as PublicTeamMemberRow[]);
}
