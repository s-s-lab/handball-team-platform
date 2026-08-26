import type {
  PublicPortalMatch,
  PublicPortalMatchStatus,
  PublicPortalTeamSide,
  PublicTeamSearchResult,
} from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isPortalStatus(value: unknown): value is PublicPortalMatchStatus {
  return value === "live" || value === "scheduled" || value === "finished";
}

function isTeamSide(value: unknown): value is PublicPortalTeamSide {
  return value === "home" || value === "away";
}

function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function shapePortalMatchRow(value: unknown): PublicPortalMatch | null {
  if (!isRecord(value)) return null;

  const {
    match_id,
    match_name,
    team_id,
    team_name,
    team_slug,
    team_short_name,
    opponent_name,
    team_side,
    scheduled_at,
    venue,
    status,
    home_score,
    away_score,
  } = value;

  if (typeof match_id !== "string" || !UUID_PATTERN.test(match_id)) return null;
  if (typeof team_id !== "string" || !UUID_PATTERN.test(team_id)) return null;
  if (typeof match_name !== "string" || match_name.trim() === "") return null;
  if (typeof team_name !== "string" || team_name.trim() === "") return null;
  if (typeof team_slug !== "string" || !SLUG_PATTERN.test(team_slug)) return null;
  if (!isNullableString(team_short_name)) return null;
  if (typeof opponent_name !== "string" || opponent_name.trim() === "") return null;
  if (!isTeamSide(team_side)) return null;
  if (typeof scheduled_at !== "string" || Number.isNaN(Date.parse(scheduled_at))) return null;
  if (!isNullableString(venue)) return null;
  if (!isPortalStatus(status)) return null;
  if (!isValidScore(home_score) || !isValidScore(away_score)) return null;

  return {
    matchId: match_id,
    matchName: match_name,
    teamId: team_id,
    teamName: team_name,
    teamSlug: team_slug,
    teamShortName: team_short_name,
    opponentName: opponent_name,
    teamSide: team_side,
    scheduledAt: scheduled_at,
    venue,
    status,
    homeScore: home_score,
    awayScore: away_score,
  };
}

function shapeTeamSearchRow(value: unknown): PublicTeamSearchResult | null {
  if (!isRecord(value)) return null;

  const { id, name, slug, short_name, description } = value;

  if (typeof id !== "string" || !UUID_PATTERN.test(id)) return null;
  if (typeof name !== "string" || name.trim() === "") return null;
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) return null;
  if (!isNullableString(short_name) || !isNullableString(description)) return null;

  return {
    id,
    name,
    slug,
    shortName: short_name,
    description,
  };
}

export function shapePublicPortalMatches(input: unknown): PublicPortalMatch[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((value) => {
    const shaped = shapePortalMatchRow(value);
    return shaped ? [shaped] : [];
  });
}

export function shapePublicTeamSearchResults(input: unknown): PublicTeamSearchResult[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((value) => {
    const shaped = shapeTeamSearchRow(value);
    return shaped ? [shaped] : [];
  });
}

export function groupPublicPortalMatches(matches: PublicPortalMatch[]) {
  return {
    live: matches.filter((match) => match.status === "live"),
    scheduled: matches.filter((match) => match.status === "scheduled"),
    finished: matches.filter((match) => match.status === "finished"),
  };
}
