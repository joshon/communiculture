import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import Link from "next/link";
import { CreateContinuumButton } from "@/components/continuum/CreateContinuumButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [continuums, teams] = await Promise.all([
    prisma.continuum.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.teamMember.findMany({
      where: { userId },
      include: { team: true },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const canCreate = user?.plan !== "FREE" || continuums.length < 3;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-comm-blue lowercase text-2xl font-bold">your continuums</h2>
        <CreateContinuumButton canCreate={canCreate} count={continuums.length} />
      </div>

      {continuums.length === 0 ? (
        <p className="text-gray-400 lowercase">no continuums yet. create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {continuums.map((c) => (
            <Link
              key={c.id}
              href={`/continuum/${c.id}`}
              className="block border border-gray-200 p-4 hover:border-comm-blue transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium lowercase">{c.title}</p>
                  <p className="text-sm text-gray-500 lowercase mt-1">
                    {c.leftLabel} ← → {c.rightLabel}
                  </p>
                </div>
                <span className="text-xs text-gray-400 lowercase">{c.visibility.toLowerCase()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {teams.length > 0 && (
        <div className="mt-12">
          <h2 className="text-comm-blue lowercase text-2xl font-bold mb-6">your teams</h2>
          <div className="space-y-3">
            {teams.map(({ team }) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="block border border-gray-200 p-4 hover:border-comm-blue transition-colors"
              >
                <p className="font-medium lowercase">{team.name}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
