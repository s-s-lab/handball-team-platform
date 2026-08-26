import type { ConsoleActionPayload, ConsoleTeamSide } from "@/features/match-console/types";
import type { RecordEvent, RecordEventType } from "@/features/match-records/types";
import type {
  OfflineLocalAction,
  OfflineLocalActionResult,
  OfflineMatchState,
} from "./types";

const REVERSAL_TYPES = new Set<RecordEventType>(["event_reverted", "goal_reverted"]);
const REVERSIBLE_TYPES = new Set<RecordEventType>([
  "goal",
  "goal_attributed",
  "seven_meter_missed",
  "warning",
  "suspension",
  "disqualification",
  "team_timeout",
]);

function fail(message: string): OfflineLocalActionResult {
  return { ok: false, message };
}

function stringPayload(payload: ConsoleActionPayload | Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberPayload(payload: ConsoleActionPayload | Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanPayload(payload: ConsoleActionPayload | Record<string, unknown>, key: string): boolean {
  return payload[key] === true;
}

function sidePayload(payload: ConsoleActionPayload): ConsoleTeamSide | null {
  const side = payload.side;
  return side === "home" || side === "away" ? side : null;
}

function periodDurationMs(state: OfflineMatchState, period = state.snapshot.currentPeriod) {
  const overtime = period > state.rules.periodCount;
  const seconds = overtime ? state.rules.overtimePeriodSeconds : state.rules.periodSeconds;
  return Math.max(0, seconds * 1000);
}

function effectiveClocks(state: OfflineMatchState, nowMs: number) {
  const persistedPeriodMs = Math.max(0, state.snapshot.clockElapsedMs);
  const persistedCompetitionMs = Math.max(0, state.snapshot.competitionElapsedMs);
  if (!state.snapshot.clockRunning || !state.snapshot.clockStartedAt) {
    return {
      periodElapsedMs: Math.min(persistedPeriodMs, periodDurationMs(state)),
      competitionElapsedMs: persistedCompetitionMs,
    };
  }

  const anchor = Date.parse(state.snapshot.clockStartedAt);
  const delta = Number.isFinite(anchor) ? Math.max(0, nowMs - anchor) : 0;
  const periodElapsedMs = Math.min(persistedPeriodMs + delta, periodDurationMs(state));
  const advanced = Math.max(0, periodElapsedMs - persistedPeriodMs);
  return {
    periodElapsedMs,
    competitionElapsedMs: persistedCompetitionMs + advanced,
  };
}

function revertedIds(events: RecordEvent[]) {
  const reverted = new Set<string>();
  for (const event of events) {
    if (REVERSAL_TYPES.has(event.eventType) && event.relatedEventId) {
      reverted.add(event.relatedEventId);
    }
  }
  return reverted;
}

function isActiveEvent(event: RecordEvent, reverted: Set<string>) {
  return !REVERSAL_TYPES.has(event.eventType) && !reverted.has(event.id);
}

function participantMatches(event: RecordEvent, payload: ConsoleActionPayload, side: ConsoleTeamSide) {
  const rosterId = stringPayload(payload, "subject_match_roster_id");
  if (rosterId) return event.subjectMatchRosterId === rosterId;

  const shirtNumber = numberPayload(payload, "shirt_number");
  const displayName = stringPayload(payload, "display_name");
  return (
    event.subjectSide === side &&
    numberPayload(event.payload, "shirt_number") === shirtNumber &&
    stringPayload(event.payload, "display_name") === displayName
  );
}

function participantFields(payload: ConsoleActionPayload) {
  const rosterId = stringPayload(payload, "subject_match_roster_id");
  const teamMemberId = stringPayload(payload, "scorer_team_member_id");
  return {
    subjectTeamMemberId: teamMemberId,
    subjectMatchRosterId: rosterId,
  };
}

function appendEvent(
  state: OfflineMatchState,
  action: OfflineLocalAction,
  nowMs: number,
  eventType: RecordEventType,
  payload: Record<string, unknown>,
  options: {
    side?: ConsoleTeamSide | null;
    relatedEventId?: string | null;
    periodElapsedMs?: number;
    competitionElapsedMs?: number;
    subjectTeamMemberId?: string | null;
    subjectMatchRosterId?: string | null;
  } = {},
) {
  const effective = effectiveClocks(state, nowMs);
  const event: RecordEvent = {
    id: action.clientActionId,
    matchId: state.snapshot.matchId,
    stateVersion: state.snapshot.version + state.nextLocalSequence,
    eventType,
    relatedEventId: options.relatedEventId ?? null,
    period: state.snapshot.currentPeriod,
    periodElapsedMs: options.periodElapsedMs ?? effective.periodElapsedMs,
    competitionElapsedMs: options.competitionElapsedMs ?? effective.competitionElapsedMs,
    subjectSide: options.side ?? null,
    subjectTeamMemberId: options.subjectTeamMemberId ?? null,
    subjectMatchRosterId: options.subjectMatchRosterId ?? null,
    payload,
    createdAt: new Date(nowMs).toISOString(),
  };

  return {
    event,
    nextState: {
      ...state,
      events: [...state.events, event],
      nextLocalSequence: state.nextLocalSequence + 1,
    },
  };
}

function materializeStoppedSnapshot(state: OfflineMatchState, nowMs: number) {
  const effective = effectiveClocks(state, nowMs);
  return {
    ...state.snapshot,
    clockRunning: false,
    clockStartedAt: null,
    clockElapsedMs: effective.periodElapsedMs,
    competitionElapsedMs: effective.competitionElapsedMs,
    serverNow: new Date(nowMs).toISOString(),
  };
}

function activeEvents(state: OfflineMatchState, eventType?: RecordEventType) {
  const reverted = revertedIds(state.events);
  return state.events.filter(
    (event) => isActiveEvent(event, reverted) && (!eventType || event.eventType === eventType),
  );
}

function validateParticipant(payload: ConsoleActionPayload) {
  return Boolean(
    stringPayload(payload, "subject_match_roster_id") ||
    numberPayload(payload, "shirt_number") !== null ||
    stringPayload(payload, "display_name"),
  );
}

export function applyLocalAction(
  state: OfflineMatchState,
  action: OfflineLocalAction,
  nowMs: number,
): OfflineLocalActionResult {
  if (state.snapshot.matchStatus === "finished" || state.snapshot.matchStatus === "cancelled") {
    return fail("終了済みの試合はオフライン編集できません。");
  }

  const effective = effectiveClocks(state, nowMs);
  const nowIso = new Date(nowMs).toISOString();
  const participant = participantFields(action.payload);

  switch (action.action) {
    case "start_clock": {
      if (state.snapshot.clockRunning) return fail("時計はすでに動いています。");
      if (effective.periodElapsedMs >= periodDurationMs(state)) return fail("このピリオドの時間は終了しています。");
      const { event, nextState } = appendEvent(state, action, nowMs, "clock_started", {
        period: state.snapshot.currentPeriod,
        elapsed_ms: effective.periodElapsedMs,
      });
      return {
        ok: true,
        event,
        state: {
          ...nextState,
          snapshot: {
            ...state.snapshot,
            clockRunning: true,
            clockStartedAt: nowIso,
            serverNow: nowIso,
            matchStatus: state.snapshot.matchStatus === "scheduled" ? "live" : state.snapshot.matchStatus,
          },
        },
      };
    }

    case "stop_clock": {
      if (!state.snapshot.clockRunning) return fail("時計はすでに停止しています。");
      const { event, nextState } = appendEvent(state, action, nowMs, "clock_stopped", {
        period: state.snapshot.currentPeriod,
        elapsed_ms: effective.periodElapsedMs,
      });
      return {
        ok: true,
        event,
        state: { ...nextState, snapshot: materializeStoppedSnapshot(state, nowMs) },
      };
    }

    case "reset_clock": {
      const { event, nextState } = appendEvent(state, action, nowMs, "clock_reset", {
        period: state.snapshot.currentPeriod,
        previous_elapsed_ms: effective.periodElapsedMs,
      });
      return {
        ok: true,
        event,
        state: {
          ...nextState,
          snapshot: {
            ...state.snapshot,
            clockRunning: false,
            clockStartedAt: null,
            clockElapsedMs: 0,
            competitionElapsedMs: Math.max(0, effective.competitionElapsedMs - effective.periodElapsedMs),
            serverNow: nowIso,
          },
        },
      };
    }

    case "set_period": {
      const target = numberPayload(action.payload, "period");
      const maxPeriod = state.rules.periodCount + (state.rules.overtimeEnabled ? state.rules.overtimePeriodCount : 0);
      if (target === null || !Number.isSafeInteger(target) || target < 1 || target > maxPeriod) {
        return fail("ピリオドが正しくありません。");
      }
      const { event, nextState } = appendEvent(state, action, nowMs, "period_changed", {
        previous_period: state.snapshot.currentPeriod,
        period: target,
      });
      return {
        ok: true,
        event,
        state: {
          ...nextState,
          snapshot: {
            ...state.snapshot,
            currentPeriod: target,
            clockRunning: false,
            clockStartedAt: null,
            clockElapsedMs: 0,
            competitionElapsedMs: effective.competitionElapsedMs,
            periodDurationMs: periodDurationMs(state, target),
            serverNow: nowIso,
          },
        },
      };
    }

    case "goal": {
      const side = sidePayload(action.payload);
      if (!side) return fail("得点したチームを指定してください。");
      const goalMethod = stringPayload(action.payload, "goal_method") ?? "open_play";
      if (goalMethod !== "open_play" && goalMethod !== "seven_meter") return fail("得点方法が正しくありません。");
      const payload = { ...action.payload, side, goal_method: goalMethod };
      const { event, nextState } = appendEvent(state, action, nowMs, "goal", payload, {
        side,
        ...participant,
      });
      return {
        ok: true,
        event,
        state: {
          ...nextState,
          snapshot: {
            ...state.snapshot,
            homeScore: state.snapshot.homeScore + (side === "home" ? 1 : 0),
            awayScore: state.snapshot.awayScore + (side === "away" ? 1 : 0),
            serverNow: nowIso,
          },
        },
      };
    }

    case "attribute_goal": {
      const targetId = stringPayload(action.payload, "target_event_id");
      if (!targetId || !validateParticipant(action.payload)) return fail("得点者を指定してください。");
      const reverted = revertedIds(state.events);
      const target = state.events.find((event) => event.id === targetId && event.eventType === "goal" && !reverted.has(event.id));
      if (!target) return fail("得点記録が見つかりません。");
      const alreadyAttributed = state.events.some(
        (event) => event.eventType === "goal_attributed" && event.relatedEventId === targetId && !reverted.has(event.id),
      );
      if (alreadyAttributed) return fail("この得点にはすでに得点者が登録されています。");
      const side = target.subjectSide ?? sidePayload(target.payload as ConsoleActionPayload);
      const { event, nextState } = appendEvent(
        state,
        action,
        nowMs,
        "goal_attributed",
        { ...action.payload, side: side ?? undefined },
        {
          side,
          relatedEventId: target.id,
          periodElapsedMs: target.periodElapsedMs ?? effective.periodElapsedMs,
          competitionElapsedMs: target.competitionElapsedMs ?? effective.competitionElapsedMs,
          ...participant,
        },
      );
      return { ok: true, event, state: { ...nextState, snapshot: { ...state.snapshot, serverNow: nowIso } } };
    }

    case "seven_meter_missed": {
      const side = sidePayload(action.payload);
      if (!side) return fail("7mを行ったチームを指定してください。");
      const { event, nextState } = appendEvent(state, action, nowMs, "seven_meter_missed", { ...action.payload, side }, {
        side,
        ...participant,
      });
      return { ok: true, event, state: { ...nextState, snapshot: { ...state.snapshot, serverNow: nowIso } } };
    }

    case "warning": {
      const side = sidePayload(action.payload);
      if (!side || !validateParticipant(action.payload)) return fail("警告の対象者を指定してください。");
      if (side === state.managedSide && !participant.subjectMatchRosterId) return fail("自チームの警告は試合ロスターから選択してください。");
      const active = activeEvents(state);
      if (active.some((event) => event.eventType === "warning" && participantMatches(event, action.payload, side))) {
        return fail("この対象にはすでに警告があります。");
      }
      if (active.some((event) => (event.eventType === "suspension" || event.eventType === "disqualification") && participantMatches(event, action.payload, side))) {
        return fail("上位の罰則があるため警告は追加できません。");
      }
      const kind = stringPayload(action.payload, "subject_kind") ?? "player";
      const warningCount = active.filter(
        (event) => event.eventType === "warning" && event.subjectSide === side && (stringPayload(event.payload, "subject_kind") ?? "player") === kind,
      ).length;
      if (kind === "player" && warningCount >= 3) return fail("チームの選手警告上限に達しています。");
      if (kind === "staff" && warningCount >= 1) return fail("チーム役員の警告上限に達しています。");
      const { event, nextState } = appendEvent(state, action, nowMs, "warning", { ...action.payload, side, subject_kind: kind }, {
        side,
        ...participant,
      });
      return { ok: true, event, state: { ...nextState, snapshot: { ...state.snapshot, serverNow: nowIso } } };
    }

    case "suspension": {
      const side = sidePayload(action.payload);
      if (!side || !validateParticipant(action.payload)) return fail("2分間退場の対象者を指定してください。");
      if (side === state.managedSide && !participant.subjectMatchRosterId) return fail("自チームの2分間退場は試合ロスターから選択してください。");
      const kind = stringPayload(action.payload, "subject_kind") ?? "player";
      const active = activeEvents(state);
      if (active.some((event) => event.eventType === "disqualification" && participantMatches(event, action.payload, side))) {
        return fail("失格済みの対象には2分間退場を追加できません。");
      }
      const previousSuspensions = active.filter(
        (event) => event.eventType === "suspension" && participantMatches(event, action.payload, side),
      ).length;
      const teamStaffSuspensions = active.filter(
        (event) => event.eventType === "suspension" && event.subjectSide === side && (stringPayload(event.payload, "subject_kind") ?? "player") === "staff",
      ).length;
      if (kind === "staff" && teamStaffSuspensions >= 1) return fail("チーム役員の2分間退場上限に達しています。");
      const suspensionCount = kind === "player" ? previousSuspensions + 1 : 1;
      if (suspensionCount > 3) return fail("この選手にはすでに3回の2分間退場があります。");
      const stopped = materializeStoppedSnapshot(state, nowMs);
      const payload = {
        ...action.payload,
        side,
        subject_kind: kind,
        suspension_count: suspensionCount,
        starts_at_competition_elapsed_ms: effective.competitionElapsedMs,
        expires_at_competition_elapsed_ms: effective.competitionElapsedMs + 120_000,
        resulting_disqualification: kind === "player" && suspensionCount === 3,
      };
      const { event, nextState } = appendEvent(state, action, nowMs, "suspension", payload, {
        side,
        ...participant,
      });
      return { ok: true, event, state: { ...nextState, snapshot: stopped } };
    }

    case "disqualification": {
      const side = sidePayload(action.payload);
      if (!side || !validateParticipant(action.payload)) return fail("失格の対象者を指定してください。");
      if (side === state.managedSide && !participant.subjectMatchRosterId) return fail("自チームの失格は試合ロスターから選択してください。");
      if (activeEvents(state, "disqualification").some((event) => participantMatches(event, action.payload, side))) {
        return fail("この対象はすでに失格です。");
      }
      const stopped = materializeStoppedSnapshot(state, nowMs);
      const payload = {
        ...action.payload,
        side,
        subject_kind: stringPayload(action.payload, "subject_kind") ?? "player",
        report_required: booleanPayload(action.payload, "report_required"),
        team_reduction_starts_at_competition_elapsed_ms: effective.competitionElapsedMs,
        team_reduction_expires_at_competition_elapsed_ms: effective.competitionElapsedMs + 120_000,
      };
      const { event, nextState } = appendEvent(state, action, nowMs, "disqualification", payload, {
        side,
        ...participant,
      });
      return { ok: true, event, state: { ...nextState, snapshot: stopped } };
    }

    case "team_timeout": {
      const side = sidePayload(action.payload);
      if (!side) return fail("チームタイムアウトのチームを指定してください。");
      if (state.snapshot.currentPeriod > state.rules.periodCount) return fail("延長戦ではチームタイムアウトを取得できません。");
      const activeTimeouts = activeEvents(state, "team_timeout").filter((event) => event.subjectSide === side);
      const periodTimeouts = activeTimeouts.filter((event) => event.period === state.snapshot.currentPeriod);
      if (activeTimeouts.length >= state.rules.teamTimeoutsPerGame) return fail("試合のチームタイムアウト上限に達しています。");
      if (periodTimeouts.length >= state.rules.teamTimeoutsPerPeriod) return fail("このピリオドのチームタイムアウト上限に達しています。");
      const finalFiveStart = Math.max(0, periodDurationMs(state) - 300_000);
      if (
        state.rules.teamTimeoutsPerGame >= 3 &&
        state.snapshot.currentPeriod === state.rules.periodCount &&
        effective.periodElapsedMs >= finalFiveStart &&
        periodTimeouts.some((event) => (event.periodElapsedMs ?? -1) >= finalFiveStart)
      ) {
        return fail("後半残り5分では同じチームが取得できるタイムアウトは1回までです。");
      }
      const stopped = materializeStoppedSnapshot(state, nowMs);
      const { event, nextState } = appendEvent(state, action, nowMs, "team_timeout", {
        side,
        timeout_number: activeTimeouts.length + 1,
        period_timeout_number: periodTimeouts.length + 1,
      }, { side });
      return { ok: true, event, state: { ...nextState, snapshot: stopped } };
    }

    case "revert_event": {
      const targetId = stringPayload(action.payload, "target_event_id");
      if (!targetId) return fail("訂正対象を指定してください。");
      const reverted = revertedIds(state.events);
      const target = state.events.find((event) => event.id === targetId);
      if (!target || !REVERSIBLE_TYPES.has(target.eventType)) return fail("この記録は訂正対象にできません。");
      if (reverted.has(target.id)) return fail("この記録はすでに訂正済みです。");
      let homeScore = state.snapshot.homeScore;
      let awayScore = state.snapshot.awayScore;
      if (target.eventType === "goal") {
        const side = target.subjectSide ?? (target.payload.side === "home" || target.payload.side === "away" ? target.payload.side : null);
        if (side === "home") {
          if (homeScore <= 0) return fail("得点状態が不整合です。");
          homeScore -= 1;
        } else if (side === "away") {
          if (awayScore <= 0) return fail("得点状態が不整合です。");
          awayScore -= 1;
        }
      }
      const reason = stringPayload(action.payload, "reason");
      const { event, nextState } = appendEvent(state, action, nowMs, "event_reverted", {
        target_event_type: target.eventType,
        side: target.subjectSide ?? undefined,
        ...(reason ? { reason } : {}),
      }, {
        side: target.subjectSide,
        relatedEventId: target.id,
        subjectTeamMemberId: target.subjectTeamMemberId,
        subjectMatchRosterId: target.subjectMatchRosterId,
      });
      return {
        ok: true,
        event,
        state: {
          ...nextState,
          snapshot: { ...state.snapshot, homeScore, awayScore, serverNow: nowIso },
        },
      };
    }

    case "undo_last_goal": {
      const reverted = revertedIds(state.events);
      const target = [...state.events]
        .filter((event) => event.eventType === "goal" && !reverted.has(event.id))
        .sort((a, b) => b.stateVersion - a.stateVersion)[0];
      if (!target) return fail("取り消せる得点がありません。");
      const side = target.subjectSide ?? (target.payload.side === "home" || target.payload.side === "away" ? target.payload.side : null);
      if (!side) return fail("得点したチームを判定できません。");
      const homeScore = state.snapshot.homeScore - (side === "home" ? 1 : 0);
      const awayScore = state.snapshot.awayScore - (side === "away" ? 1 : 0);
      if (homeScore < 0 || awayScore < 0) return fail("得点状態が不整合です。");
      const { event, nextState } = appendEvent(state, action, nowMs, "goal_reverted", { side }, {
        side,
        relatedEventId: target.id,
      });
      return {
        ok: true,
        event,
        state: { ...nextState, snapshot: { ...state.snapshot, homeScore, awayScore, serverNow: nowIso } },
      };
    }

    case "finish_match": {
      const stopped = materializeStoppedSnapshot(state, nowMs);
      const { event, nextState } = appendEvent(state, action, nowMs, "match_finished", {
        home_score: state.snapshot.homeScore,
        away_score: state.snapshot.awayScore,
        period: state.snapshot.currentPeriod,
        elapsed_ms: effective.periodElapsedMs,
        competition_elapsed_ms: effective.competitionElapsedMs,
      });
      return {
        ok: true,
        event,
        state: { ...nextState, snapshot: { ...stopped, matchStatus: "finished" } },
      };
    }
  }
}
