export const MEMBER_KINDS = ["player", "staff"] as const;
export type TeamMemberKind = (typeof MEMBER_KINDS)[number];

export const HANDBALL_POSITIONS = ["GK", "LW", "LB", "CB", "RB", "RW", "PV"] as const;
export type HandballPosition = (typeof HANDBALL_POSITIONS)[number];

export type MembershipRole = "admin" | "member";

export type OrganizationInput = {
  name: string;
  slug: string;
};

export type TeamInput = {
  organizationId: string;
  name: string;
  slug: string;
};

export type TeamMemberInput = {
  teamId: string;
  kind: TeamMemberKind;
  fullName: string;
  displayName: string | null;
  shirtNumber: number | null;
  primaryPosition: HandballPosition | null;
  gradeOrAge: string | null;
  isActive: boolean;
  isPublic: boolean;
};

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };
