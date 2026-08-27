import Link from "next/link";
import { CalendarRange, Medal, Shield, Target, Trophy, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  goalsPerAppearance,
  savePercentage,
  sortGoalkeeperLeaderboard,
  sortScoringLeaderboard,
  type SeasonRecord,
} from "@/features/season-stats/runtime";

export type SeasonSummary = {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type SeasonPlayerRow = {
  teamMemberId: string;
  displayName: string;
  shirtNumber: number | null;
  primaryPosition: string | null;
  appearances: number;
  starts: number;
  goals: number;
  sevenMeterGoals: number;
  sevenMeterAttempts: number;
  warnings: number;
  twoMinuteSuspensions: number;
  disqualifications: number;
  saves: number;
  shotsFaced: number;
  notes: string | null;
};

export type SeasonMatchAssignment = {
  id: string;
  name: string;
  opponentName: string;
  scheduledAt: string;
  status: string;
  seasonId: string | null;
};

type SeasonStatsBoardProps = {
  teamId: string;
  teamName: string;
  isAdmin: boolean;
  seasons: SeasonSummary[];
  selectedSeason: SeasonSummary | null;
  record: SeasonRecord;
  players: SeasonPlayerRow[];
  matches: SeasonMatchAssignment[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00+09:00`));
}

function numberInput(name: string, value: number, label: string) {
  return (
    <input
      aria-label={label}
      name={name}
      type="number"
      min={0}
      max={9999}
      defaultValue={value}
      className="h-10 w-20 border border-border bg-background px-2 text-right text-sm font-bold tabular-nums outline-none focus:border-[var(--workspace-accent)] focus:ring-2 focus:ring-[var(--workspace-accent-soft)]"
    />
  );
}

export function SeasonStatsBoard({ teamId, teamName, isAdmin, seasons, selectedSeason, record, players, matches }: SeasonStatsBoardProps) {
  const scoring = sortScoringLeaderboard(players).filter((row) => row.goals > 0).slice(0, 5);
  const goalkeepers = sortGoalkeeperLeaderboard(players).slice(0, 5);

  return (
    <div className="space-y-8 pb-10">
      <header className="border-b border-border/80 pb-6 pt-2">
        <p className="text-xs font-black tracking-[0.18em] text-[var(--workspace-accent)]">SEASON PERFORMANCE</p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.05em] text-[var(--workspace-ink)] md:text-5xl">成績</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{teamName} のシーズン戦績と選手成績をまとめて確認します。</p>
          </div>
          {seasons.length > 0 ? (
            <nav aria-label="シーズン選択" className="flex flex-wrap gap-2">
              {seasons.map((season) => (
                <Button key={season.id} asChild size="sm" variant={season.id === selectedSeason?.id ? "default" : "outline"}>
                  <Link href={`/app/teams/${teamId}/stats?season=${season.id}`}>{season.name}{season.isCurrent ? " · 現在" : ""}</Link>
                </Button>
              ))}
            </nav>
          ) : null}
        </div>
      </header>

      {!selectedSeason ? (
        <section className="border border-dashed border-border bg-muted/30 p-8 text-center">
          <CalendarRange className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black">シーズンがまだありません</h2>
          <p className="mt-2 text-sm text-muted-foreground">最初のシーズンを登録すると、戦績と選手成績を管理できます。</p>
          {isAdmin ? <SeasonCreateForm teamId={teamId} compact /> : null}
        </section>
      ) : (
        <>
          <section aria-label="シーズン戦績" className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="PLAYED" value={record.played} detail={`${record.wins}勝 ${record.draws}分 ${record.losses}敗`} icon={Trophy} />
            <Metric label="GOALS FOR" value={record.goalsFor} detail={`平均 ${record.played ? (record.goalsFor / record.played).toFixed(1) : "0.0"}`} icon={Target} />
            <Metric label="GOALS AGAINST" value={record.goalsAgainst} detail={`平均 ${record.played ? (record.goalsAgainst / record.played).toFixed(1) : "0.0"}`} icon={Shield} />
            <Metric label="GOAL DIFF" value={record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference} detail={`${formatDate(selectedSeason.startDate)} – ${formatDate(selectedSeason.endDate)}`} icon={Medal} />
          </section>

          <div className="grid gap-8 xl:grid-cols-2">
            <RankingSection title="得点ランキング" eyebrow="SCORING" rows={scoring} mode="goals" />
            <RankingSection title="GKセーブ" eyebrow="GOALKEEPING" rows={goalkeepers} mode="saves" />
          </div>

          <section>
            <div className="flex items-end justify-between gap-4 border-b border-border/80 pb-4">
              <div>
                <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">PLAYER STATS</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">選手成績{isAdmin ? "を編集" : ""}</h2>
              </div>
              <span className="text-xs font-bold text-muted-foreground"><UsersRound className="mr-1 inline size-4" aria-hidden="true" />{players.length}名</span>
            </div>
            <form className="mt-4">
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="seasonId" value={selectedSeason.id} />
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[1180px] border-collapse text-sm">
                  <thead className="bg-[var(--workspace-ink)] text-left text-[11px] font-black tracking-[0.08em] text-white/70">
                    <tr><th className="px-4 py-3">選手</th><th>出場</th><th>先発</th><th>得点</th><th>7m</th><th>7m試投</th><th>警告</th><th>2分</th><th>DQ</th><th>セーブ</th><th>被シュート</th><th className="pr-4">メモ</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {players.map((player) => (
                      <tr key={player.teamMemberId} className="bg-card align-middle">
                        <td className="px-4 py-3"><div className="font-black">#{player.shirtNumber ?? "–"} {player.displayName}</div><div className="text-xs text-muted-foreground">{player.primaryPosition ?? "–"}</div></td>
                        {isAdmin ? <>
                          <td>{numberInput(`appearances:${player.teamMemberId}`, player.appearances, `${player.displayName} 出場`)}</td>
                          <td>{numberInput(`starts:${player.teamMemberId}`, player.starts, `${player.displayName} 先発`)}</td>
                          <td>{numberInput(`goals:${player.teamMemberId}`, player.goals, `${player.displayName} 得点`)}</td>
                          <td>{numberInput(`sevenMeterGoals:${player.teamMemberId}`, player.sevenMeterGoals, `${player.displayName} 7m得点`)}</td>
                          <td>{numberInput(`sevenMeterAttempts:${player.teamMemberId}`, player.sevenMeterAttempts, `${player.displayName} 7m試投`)}</td>
                          <td>{numberInput(`warnings:${player.teamMemberId}`, player.warnings, `${player.displayName} 警告`)}</td>
                          <td>{numberInput(`twoMinuteSuspensions:${player.teamMemberId}`, player.twoMinuteSuspensions, `${player.displayName} 2分`)}</td>
                          <td>{numberInput(`disqualifications:${player.teamMemberId}`, player.disqualifications, `${player.displayName} DQ`)}</td>
                          <td>{numberInput(`saves:${player.teamMemberId}`, player.saves, `${player.displayName} セーブ`)}</td>
                          <td>{numberInput(`shotsFaced:${player.teamMemberId}`, player.shotsFaced, `${player.displayName} 被シュート`)}</td>
                          <td className="pr-4"><input name={`notes:${player.teamMemberId}`} defaultValue={player.notes ?? ""} className="h-10 w-52 border border-border bg-background px-2 outline-none focus:border-[var(--workspace-accent)]" /></td>
                        </> : <ReadOnlyStats player={player} />}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isAdmin ? <div className="mt-4 flex justify-end"><Button type="submit">選手成績を保存</Button></div> : null}
            </form>
          </section>
        </>
      )}

      {isAdmin ? (
        <div className="grid gap-8 xl:grid-cols-2">
          <section className="border-t-4 border-[var(--workspace-accent)] bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">新しいシーズン</h2>
            <p className="mt-1 text-sm text-muted-foreground">年度やリーグ期間ごとに戦績を分けて管理します。</p>
            <SeasonCreateForm teamId={teamId} />
          </section>
          <section className="border-t-4 border-[var(--workspace-highlight)] bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">試合をシーズンに紐付け</h2>
            <p className="mt-1 text-sm text-muted-foreground">未分類の過去試合も、ここからシーズンへ整理できます。</p>
            <div className="mt-4 space-y-3">
              {matches.map((match) => (
                <form key={match.id} className="grid gap-2 border-b border-border pb-3 sm:grid-cols-[1fr_12rem_auto] sm:items-center">
                  <input type="hidden" name="teamId" value={teamId} /><input type="hidden" name="matchId" value={match.id} />
                  <div><p className="font-black">{match.name}</p><p className="text-xs text-muted-foreground">vs {match.opponentName} · {new Date(match.scheduledAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</p></div>
                  <select name={`seasonId:${match.id}`} defaultValue={match.seasonId ?? ""} className="h-10 border border-border bg-background px-2 text-sm font-bold">
                    <option value="">未設定</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
                  </select>
                  <Button type="submit" size="sm" variant="outline">更新</Button>
                </form>
              ))}
              {matches.length === 0 ? <p className="py-4 text-sm text-muted-foreground">対象の試合はありません。</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Trophy }) {
  return <div className="bg-card p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black tracking-[0.18em] text-muted-foreground">{label}</p><Icon className="size-4 text-[var(--workspace-accent)]" aria-hidden="true" /></div><p className="mt-3 text-4xl font-black tabular-nums tracking-[-0.06em]">{value}</p><p className="mt-1 text-sm font-bold text-muted-foreground">{detail}</p></div>;
}

function RankingSection({ title, eyebrow, rows, mode }: { title: string; eyebrow: string; rows: SeasonPlayerRow[]; mode: "goals" | "saves" }) {
  return <section><div className="border-b border-border/80 pb-3"><p className="text-xs font-black tracking-[0.16em] text-muted-foreground">{eyebrow}</p><h2 className="mt-1 text-2xl font-black">{title}</h2></div><ol className="divide-y divide-border/80">{rows.map((row, index) => <li key={row.teamMemberId} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-4"><span className="text-lg font-black text-muted-foreground">{index + 1}</span><div><p className="font-black">#{row.shirtNumber ?? "–"} {row.displayName}</p><p className="text-xs text-muted-foreground">{mode === "goals" ? `${row.appearances}試合 · ${goalsPerAppearance(row.goals, row.appearances) ?? "–"}得点/試合` : `${row.saves}/${row.shotsFaced} セーブ`}</p></div><div className="text-right"><p className="text-2xl font-black tabular-nums">{mode === "goals" ? row.goals : `${savePercentage(row.saves, row.shotsFaced)?.toFixed(1) ?? "–"}%`}</p></div></li>)}{rows.length === 0 ? <li className="py-8 text-sm text-muted-foreground">記録はまだありません。</li> : null}</ol></section>;
}

function ReadOnlyStats({ player }: { player: SeasonPlayerRow }) {
  return <><td className="tabular-nums">{player.appearances}</td><td>{player.starts}</td><td className="font-black">{player.goals}</td><td>{player.sevenMeterGoals}</td><td>{player.sevenMeterAttempts}</td><td>{player.warnings}</td><td>{player.twoMinuteSuspensions}</td><td>{player.disqualifications}</td><td>{player.saves}</td><td>{player.shotsFaced}</td><td className="pr-4 text-xs text-muted-foreground">{player.notes ?? "–"}</td></>;
}

function SeasonCreateForm({ teamId, compact = false }: { teamId: string; compact?: boolean }) {
  return <form className={`mt-4 grid gap-3 ${compact ? "mx-auto max-w-lg text-left" : ""}`}><input type="hidden" name="teamId" value={teamId} /><label className="text-sm font-bold">シーズン名<input name="name" required maxLength={80} placeholder="2026-27" className="mt-1 h-11 w-full border border-border bg-background px-3 font-semibold outline-none focus:border-[var(--workspace-accent)]" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">開始日<input name="startDate" type="date" required className="mt-1 h-11 w-full border border-border bg-background px-3" /></label><label className="text-sm font-bold">終了日<input name="endDate" type="date" required className="mt-1 h-11 w-full border border-border bg-background px-3" /></label></div><label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input name="isCurrent" type="checkbox" value="true" /> 現在のシーズンにする</label><Button type="submit" className="justify-self-start">シーズンを作成</Button></form>;
}
