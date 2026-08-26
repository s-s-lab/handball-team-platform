import { redirect } from "next/navigation";
import { TeamWorkspaceShell } from "@/components/team-workspace/team-workspace-shell";
import { listMyTeams } from "@/features/team-core/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");

  const teams = await listMyTeams();
  const workspaceTeams = teams.map(({ id, name, slug }) => ({ id, name, slug }));

  return <TeamWorkspaceShell teams={workspaceTeams}>{children}</TeamWorkspaceShell>;
}
