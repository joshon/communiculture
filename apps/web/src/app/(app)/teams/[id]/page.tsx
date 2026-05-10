import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InviteMemberForm } from "@/components/teams/InviteMemberForm";
import Image from "next/image";

export default async function TeamPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId: session!.user.id, teamId: params.id } },
  });
  if (!membership) notFound();

  const [team, continuums] = await Promise.all([
    prisma.team.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    }),
    prisma.continuum.findMany({
      where: { teamId: params.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!team) notFound();

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="text-comm-blue lowercase text-2xl font-bold mb-8">{team.name}</h2>

      {/* Members */}
      <div className="mb-10">
        <h3 className="text-gray-500 lowercase text-sm mb-4">members</h3>
        <div className="space-y-2">
          {team.members.map(({ user, role }) => (
            <div key={user.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
              {user.image && (
                <Image src={user.image} alt={user.name ?? ""} width={28} height={28} className="rounded-none" />
              )}
              <div className="flex-1">
                <p className="text-sm lowercase">{user.name ?? user.email}</p>
                <p className="text-xs text-gray-400 lowercase">{user.email}</p>
              </div>
              <span className="text-xs text-gray-400 lowercase">{role.toLowerCase()}</span>
            </div>
          ))}
        </div>
        {canManage && <InviteMemberForm teamId={params.id} />}
      </div>

      {/* Continuums */}
      <div>
        <h3 className="text-gray-500 lowercase text-sm mb-4">continuums</h3>
        {continuums.length === 0 ? (
          <p className="text-gray-400 text-xs lowercase">no continuums yet.</p>
        ) : (
          <div className="space-y-2">
            {continuums.map((c) => (
              <Link
                key={c.id}
                href={`/continuum/${c.id}`}
                className="block border border-gray-200 p-4 hover:border-comm-blue"
              >
                <p className="lowercase">{c.title}</p>
                <p className="text-xs text-gray-400 lowercase mt-1">
                  {c.leftLabel} ← → {c.rightLabel}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
