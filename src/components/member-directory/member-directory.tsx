import Link from "next/link";
import { ArrowRight, Pencil, Plus, Search, ShieldCheck, ShieldOff, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamMemberRecord } from "@/features/team-core/types";
import {
  filterDirectoryMembers,
  memberDirectoryCounts,
  type MemberDirectoryFilter,
} from "@/features/member-directory/runtime";

type MemberDirectoryProps = {
  teamId: string;
  teamName: string;
  roster: TeamMemberRecord[];
  isAdmin: boolean;
  filter: MemberDirectoryFilter;
  query: string;
};

const filters: Array<{ value: MemberDirectoryFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "players", label: "選手" },
  { value: "staff", label: "スタッフ" },
  { value: "inactive", label: "非在籍" },
];

function filterHref(teamId: string, filter: MemberDirectoryFilter, query: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (query.trim()) params.set("q", query.trim());
  const suffix = params.toString();
  return `/app/teams/${teamId}/members${suffix ? `?${suffix}` : ""}`;
}

function memberLabel(member: TeamMemberRecord) {
  if (member.kind === "staff") return "STAFF";
  return member.primaryPosition ?? "PLAYER";
}

function secondaryName(member: TeamMemberRecord) {
  return member.displayName && member.displayName !== member.fullName ? member.displayName : null;
}

function MemberNumber({ member }: { member: TeamMemberRecord }) {
  if (member.kind === "staff") {
    return (
      <div className="grid size-16 shrink-0 place-items-center border border-border bg-muted/40 md:size-20">
        <UserRound className="size-7 text-muted-foreground md:size-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="grid size-16 shrink-0 place-items-center bg-[var(--workspace-ink)] text-3xl font-black tabular-nums tracking-[-0.06em] text-white md:size-20 md:text-4xl">
      {member.shirtNumber ?? "–"}
    </div>
  );
}

function DirectoryMemberRow({ teamId, member, isAdmin }: { teamId: string; member: TeamMemberRecord; isAdmin: boolean }) {
  const profileHref = `/app/teams/${teamId}/members/${member.id}`;
  const secondary = secondaryName(member);

  return (
    <article className="group relative border-t border-border/80 py-4 first:border-t-0 md:py-5">
      <div className="flex items-center gap-4 md:gap-5">
        <MemberNumber member={member} />

        <Link href={profileHref} className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[11px] font-black tracking-[0.16em] text-[var(--workspace-accent)]">{memberLabel(member)}</span>
            {!member.isActive ? (
              <span className="text-[11px] font-black tracking-[0.12em] text-muted-foreground">INACTIVE</span>
            ) : null}
          </div>
          <div className="mt-1 flex items-end gap-2">
            <h2 className="truncate text-xl font-black tracking-[-0.03em] md:text-2xl">{member.fullName}</h2>
            <ArrowRight className="mb-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
          {secondary ? <p className="mt-0.5 truncate text-sm font-semibold text-muted-foreground">{secondary}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
            {member.primaryPosition ? <span>{member.primaryPosition}</span> : null}
            {member.gradeOrAge ? <span>{member.gradeOrAge}</span> : null}
            {isAdmin ? (
              <span className="inline-flex items-center gap-1">
                {member.isPublic ? <ShieldCheck className="size-3.5" aria-hidden="true" /> : <ShieldOff className="size-3.5" aria-hidden="true" />}
                {member.isPublic ? "公開中" : "非公開"}
              </span>
            ) : null}
          </div>
        </Link>

        {isAdmin ? (
          <Button asChild variant="ghost" size="icon" className="shrink-0" aria-label={`${member.fullName}を編集`}>
            <Link href={`/app/teams/${teamId}/members/${member.id}/edit`}>
              <Pencil aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function MemberDirectory({ teamId, teamName, roster, isAdmin, filter, query }: MemberDirectoryProps) {
  const counts = memberDirectoryCounts(roster);
  const members = filterDirectoryMembers(roster, { filter, query });

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-muted-foreground">
            <UsersRound className="size-4" aria-hidden="true" /> TEAM ROSTER
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-5xl">メンバー</h1>
          <p className="mt-2 text-sm text-muted-foreground">{teamName} の選手・スタッフを一覧できます。</p>
        </div>
        {isAdmin ? (
          <Button asChild size="lg" className="self-start lg:self-auto">
            <Link href={`/app/teams/${teamId}/members/new`}><Plus aria-hidden="true" /> メンバー追加</Link>
          </Button>
        ) : null}
      </header>

      <section aria-label="メンバー検索と絞り込み" className="space-y-4">
        <form method="get" className="flex gap-2">
          {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input name="q" defaultValue={query} placeholder="名前・背番号・ポジション・学年で検索" className="pl-10" />
          </div>
          <Button type="submit" variant="outline">検索</Button>
        </form>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="メンバー種別">
          {filters.map((item) => {
            const selected = filter === item.value;
            return (
              <Link
                key={item.value}
                href={filterHref(teamId, item.value, query)}
                aria-current={selected ? "page" : undefined}
                className={selected
                  ? "inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 border-[var(--workspace-accent)] px-3 text-sm font-black text-foreground"
                  : "inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-bold text-muted-foreground hover:text-foreground"}
              >
                {item.label}
                <span className="text-xs tabular-nums opacity-65">{counts[item.value]}</span>
              </Link>
            );
          })}
        </nav>
      </section>

      {members.length > 0 ? (
        <section aria-label="メンバー一覧" className="border-y border-border/80">
          {members.map((member) => (
            <DirectoryMemberRow key={member.id} teamId={teamId} member={member} isAdmin={isAdmin} />
          ))}
        </section>
      ) : (
        <section className="border-y border-border/80 py-12 text-center">
          <p className="font-black">条件に一致するメンバーはいません。</p>
          <p className="mt-2 text-sm text-muted-foreground">検索条件または絞り込みを変更してください。</p>
          <Button asChild variant="outline" className="mt-5">
            <Link href={`/app/teams/${teamId}/members`}>すべて表示</Link>
          </Button>
        </section>
      )}
    </div>
  );
}
