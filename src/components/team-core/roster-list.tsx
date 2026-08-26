import Link from "next/link";
import { Pencil, ShieldCheck, ShieldOff } from "lucide-react";
import { updateTeamMemberVisibility } from "@/features/team-core/actions";
import type { TeamMemberRecord } from "@/features/team-core/types";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RosterListProps = {
  teamId: string;
  roster: TeamMemberRecord[];
  isAdmin: boolean;
};

function memberRoleLabel(member: TeamMemberRecord) {
  if (member.kind === "staff") return "スタッフ";
  return member.primaryPosition ?? "選手";
}

function memberName(member: TeamMemberRecord) {
  return member.displayName ? `${member.fullName}（公開: ${member.displayName}）` : member.fullName;
}

export function RosterList({ teamId, roster, isAdmin }: RosterListProps) {
  if (roster.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ロスター</CardTitle>
          <CardDescription>まだ選手・スタッフが登録されていません。</CardDescription>
        </CardHeader>
        {isAdmin ? (
          <CardContent>
            <Button asChild>
              <Link href={`/app/teams/${teamId}/members/new`}>最初のメンバーを追加</Link>
            </Button>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  const active = roster.filter((member) => member.isActive);
  const inactive = roster.filter((member) => !member.isActive);
  const groups = [
    { title: "在籍中", members: active },
    { title: "非在籍", members: inactive },
  ].filter((group) => group.members.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-muted-foreground">{group.title}</h2>
          <div className="flex flex-col gap-3">
            {group.members.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-bold text-foreground">
                        {member.shirtNumber !== null ? `#${member.shirtNumber} ` : ""}
                        {memberName(member)}
                      </p>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {memberRoleLabel(member)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {member.gradeOrAge ? <span>{member.gradeOrAge}</span> : null}
                      <span className="inline-flex items-center gap-1.5">
                        {member.isPublic ? (
                          <ShieldCheck className="size-4" aria-hidden="true" />
                        ) : (
                          <ShieldOff className="size-4" aria-hidden="true" />
                        )}
                        {member.isPublic ? "公開中" : "非公開"}
                      </span>
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/app/teams/${teamId}/members/${member.id}/edit`}>
                          <Pencil aria-hidden="true" /> 編集
                        </Link>
                      </Button>

                      {member.displayName || member.isPublic ? (
                        <form action={updateTeamMemberVisibility}>
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="memberId" value={member.id} />
                          <input type="hidden" name="isPublic" value={member.isPublic ? "" : "on"} />
                          <PendingSubmitButton
                            idleLabel={member.isPublic ? "非公開にする" : "公開する"}
                            pendingLabel="更新中…"
                          />
                        </form>
                      ) : (
                        <p className="text-xs text-muted-foreground">公開には表示名の設定が必要です。</p>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
