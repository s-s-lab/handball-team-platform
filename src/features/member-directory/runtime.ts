import type { TeamMemberRecord } from "@/features/team-core/types";

export const MEMBER_DIRECTORY_FILTERS = ["all", "players", "staff", "inactive"] as const;
export type MemberDirectoryFilter = (typeof MEMBER_DIRECTORY_FILTERS)[number];

export type MemberDirectoryQuery = {
  filter: MemberDirectoryFilter;
  query: string;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("ja");
}

function searchableText(member: TeamMemberRecord) {
  const number = member.shirtNumber === null ? "" : `${member.shirtNumber} #${member.shirtNumber}`;
  return normalize([
    member.fullName,
    member.displayName,
    number,
    member.primaryPosition,
    member.gradeOrAge,
  ].filter(Boolean).join(" "));
}

function matchesFilter(member: TeamMemberRecord, filter: MemberDirectoryFilter) {
  if (filter === "players") return member.kind === "player" && member.isActive;
  if (filter === "staff") return member.kind === "staff" && member.isActive;
  if (filter === "inactive") return !member.isActive;
  return true;
}

function memberOrder(a: TeamMemberRecord, b: TeamMemberRecord) {
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  if (a.kind !== b.kind) return a.kind === "player" ? -1 : 1;

  if (a.kind === "player" && b.kind === "player") {
    const aNumber = a.shirtNumber ?? Number.MAX_SAFE_INTEGER;
    const bNumber = b.shirtNumber ?? Number.MAX_SAFE_INTEGER;
    if (aNumber !== bNumber) return aNumber - bNumber;
  }

  return a.fullName.localeCompare(b.fullName, "ja");
}

export function filterDirectoryMembers(
  members: TeamMemberRecord[],
  { filter, query }: MemberDirectoryQuery,
): TeamMemberRecord[] {
  const search = normalize(query);

  return [...members]
    .filter((member) => matchesFilter(member, filter))
    .filter((member) => !search || searchableText(member).includes(search))
    .sort(memberOrder);
}

export function memberDirectoryCounts(members: TeamMemberRecord[]) {
  return {
    all: members.length,
    players: members.filter((member) => member.kind === "player" && member.isActive).length,
    staff: members.filter((member) => member.kind === "staff" && member.isActive).length,
    inactive: members.filter((member) => !member.isActive).length,
  };
}

export function parseMemberDirectoryFilter(value: string | string[] | undefined): MemberDirectoryFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return MEMBER_DIRECTORY_FILTERS.includes(raw as MemberDirectoryFilter)
    ? (raw as MemberDirectoryFilter)
    : "all";
}
