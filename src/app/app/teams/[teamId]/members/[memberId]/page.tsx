import { notFound } from "next/navigation";
import { MemberProfile } from "@/components/member-directory/member-profile";
import { getMemberProfileForCurrentUser } from "@/features/member-directory/data";

type MemberProfilePageProps = {
  params: Promise<{ teamId: string; memberId: string }>;
};

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { teamId, memberId } = await params;
  const profile = await getMemberProfileForCurrentUser(teamId, memberId);
  if (!profile) notFound();

  return (
    <main>
      <MemberProfile profile={profile} />
    </main>
  );
}
