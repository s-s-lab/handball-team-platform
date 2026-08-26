export type RecordEventType =
  | "clock_started"
  | "clock_stopped"
  | "clock_reset"
  | "period_changed"
  | "goal"
  | "goal_reverted"
  | "match_finished"
  | "seven_meter_missed"
  | "warning"
  | "suspension"
  | "disqualification"
  | "team_timeout"
  | "event_reverted";

export type TeamSide = "home" | "away";

export type RecordSubject = {
  subjectSide: TeamSide | null;
  subjectTeamMemberId: string | null;
  subjectMatchRosterId: string | null;
  shirtNumber: number | null;
  displayName: string | null;
};

export type RecordEvent = {
  id: string;
  matchId: string;
  stateVersion: number;
  eventType: RecordEventType;
  relatedEventId: string | null;
  period: number | null;
  periodElapsedMs: number | null;
  competitionElapsedMs: number | null;
  subjectSide: TeamSide | null;
  subjectTeamMemberId: string | null;
  subjectMatchRosterId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ActiveSuspension = {
  eventId: string;
  side: TeamSide | null;
  subjectTeamMemberId: string | null;
  subjectMatchRosterId: string | null;
  shirtNumber: number | null;
  displayName: string | null;
  suspensionCount: number;
  remainingMs: number;
  resultingDisqualification: boolean;
};

export type ParticipantRecordSummary = RecordSubject & {
  goals: number;
  goalTimesMs: number[];
  sevenMeterGoals: number;
  sevenMeterAttempts: number;
  warnings: number;
  suspensions: number;
  disqualifications: number;
};

export type MatchRecordSummary = {
  participants: ParticipantRecordSummary[];
  teamTimeouts: Record<TeamSide, Array<{ period: number | null; periodElapsedMs: number | null }>>;
};
