import { notFound } from "next/navigation";
import { MemberDirectory } from "@/components/member-directory/member-directory";
import { parseMemberDirectoryFilter } from "@/features/member-directory/runtime";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type TeamMembersPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
};

export default async function TeamMembersPage({ params, searchParams }: TeamMembersPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || !team.role) notFound();

  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const filter = parseMemberDirectoryFilter(query.filter);

  return (
    <main>
      <MemberDirectory
        teamId={team.id}
        teamName={team.name}
        roster={team.roster}
        isAdmin={team.role === "admin"}
        filter={filter}
        query={search}
      />
    </main>
  );
}
