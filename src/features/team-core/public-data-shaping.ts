import type { HandballPosition, TeamMemberKind } from "./types";

export type PublicTeamMember = {
  id: string;
  kind: TeamMemberKind;
  displayName: string;
  shirtNumber: number | null;
  primaryPosition: HandballPosition | null;
  gradeOrAge: string | null;
  imagePath: string | null;
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

export function shapePublicTeamMembers(rows: PublicTeamMemberRow[]): PublicTeamMember[] {
  return rows.flatMap((row) => {
    const displayName = row.display_name?.trim();
    if (!displayName) return [];

    return [
      {
        id: row.id,
        kind: row.kind,
        displayName,
        shirtNumber: row.shirt_number,
        primaryPosition: row.primary_position,
        gradeOrAge: row.grade_or_age,
        imagePath: row.image_path,
      },
    ];
  });
}
