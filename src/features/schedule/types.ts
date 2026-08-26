export const TEAM_EVENT_TYPES = ["practice", "official_match", "friendly", "meeting", "other"] as const;
export type TeamEventType = (typeof TEAM_EVENT_TYPES)[number];

export const TEAM_EVENT_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type TeamEventStatus = (typeof TEAM_EVENT_STATUSES)[number];

export type ScheduleEventInput = {
  teamId: string;
  eventType: TeamEventType;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  memo: string | null;
  status: TeamEventStatus;
};

export type ScheduleEvent = ScheduleEventInput & {
  id: string;
  linkedMatchId: string | null;
};

export const TEAM_EVENT_LABELS: Record<TeamEventType, string> = {
  practice: "練習",
  official_match: "公式戦",
  friendly: "練習試合",
  meeting: "ミーティング",
  other: "その他",
};

export const TEAM_EVENT_STATUS_LABELS: Record<TeamEventStatus, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "中止",
};
