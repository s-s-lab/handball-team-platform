const INVALID_ACTION_FALLBACK = "この操作は現在の試合状態では実行できません。最新状態を確認してください。";

const INVALID_ACTION_MESSAGES: Array<[string, string]> = [
  ["Participant has already been warned", "この選手にはすでに警告が記録されています。"],
  ["Warning is not allowed after progressive sanction", "この対象にはすでに上位の罰則が記録されているため、警告は追加できません。"],
  ["Team player warning limit reached", "チームの選手警告上限に達しています。必要に応じて2分間退場を記録してください。"],
  ["Team-timeout game limit has been reached", "この試合で取得できるチームタイムアウトの上限に達しています。"],
  ["Team-timeout period limit has been reached", "このピリオドで取得できるチームタイムアウトの上限に達しています。"],
  ["Team timeout is not available in overtime", "延長戦ではチームタイムアウトを取得できません。"],
  ["Only one team timeout is available in the final five minutes", "後半残り5分では、このチームはすでにチームタイムアウトを取得しています。"],
  ["Event has already been reverted", "この記録はすでに訂正済みです。"],
  ["Correction target is not a reversible record event", "この記録は訂正対象にできません。"],
  ["Participant is not in this match roster", "対象選手がこの試合のロスターに含まれていません。"],
  ["Managed-team warning requires a match-roster participant", "自チームの警告は試合ロスターから対象者を選択してください。"],
  ["Managed-team sanction requires a match-roster participant", "自チームの罰則は試合ロスターから対象者を選択してください。"],
  ["Goal already has scorer attribution", "この得点にはすでに得点者が記録されています。"],
  ["Goal already has a scorer", "この得点にはすでに得点者が記録されています。"],
  ["Managed-team goal attribution requires a match-roster participant", "自チームの得点者は試合ロスターから選択してください。"],
  ["Goal attribution target is not an active goal", "この得点は得点者を追加できる状態ではありません。"],
];

export function mapConsoleActionDatabaseError(code?: string, detail?: string): string {
  if (code === "42501") return "この試合を操作する権限がありません。";
  if (code !== "22023") return "試合状態を更新できませんでした。通信状態を確認してもう一度お試しください。";

  const message = detail ?? "";
  const matched = INVALID_ACTION_MESSAGES.find(([needle]) => message.includes(needle));
  return matched?.[1] ?? INVALID_ACTION_FALLBACK;
}
