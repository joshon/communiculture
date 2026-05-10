import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import Link from "next/link";
import { CreateTeamButton } from "@/components/teams/CreateTeamButton";

export default async function TeamsPage() {
  const session = await getServerSession(authOptions);

  const memberships = await prisma.teamMember.findMany({
    where: { userId: session!.user.id },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, name: true, image: true } } } },
          _count: { select: { continuums: true } },
        },
      },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-comm-blue lowercase text-2xl font-bold">teams</h2>
        <CreateTeamButton />
      </div>

      {memberships.length === 0 ? (
        <p className="text-gray-400 lowercase">no teams yet.</p>
      ) : (
        <div className="space-y-4">
          {memberships.map(({ team, role }) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="block border border-gray-200 p-5 hover:border-comm-blue transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium lowercase text-lg">{team.name}</p>
                  <p className="text-xs text-gray-400 lowercase mt-1">
                    {team.members.length} member{team.members.length !== 1 ? "s" : ""} ·{" "}
                    {team._count.continuums} continuum{team._count.continuums !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-400 lowercase">{role.toLowerCase()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
