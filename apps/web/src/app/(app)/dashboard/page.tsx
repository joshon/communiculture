import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import Link from "next/link";
import Image from "next/image";
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
    <div className="flex min-h-screen">

      {/* ── Left column: logo + nav ── */}
      <div className="w-52 flex-shrink-0 px-6 py-8 flex flex-col gap-3">
        <Link href="/dashboard" className="block overflow-visible">
          <Image
            src="/logo.svg"
            alt="communi*culture"
            width={200}
            height={37}
            style={{ width: "clamp(100px, 10vw, 180px)", height: "auto" }}
            priority
          />
          <span
            className="block text-black/40 uppercase leading-none mt-1"
            style={{
              fontFamily: "var(--font-pixelify)",
              fontSize: "clamp(7px, 0.6vw, 10px)",
              letterSpacing: "0.2em",
              whiteSpace: "nowrap",
            }}
          >
            a division of futurefarmers
          </span>
        </Link>
        <nav
          className="flex flex-col gap-0.5 text-[#0083FF] lowercase"
          style={{ fontFamily: "var(--font-pixelify)", fontSize: "clamp(11px, 1vw, 16px)" }}
        >
          <Link href="/dashboard" className="hover:underline">continuums</Link>
          <Link href="/dashboard" className="hover:underline">view others</Link>
          <Link href="/profile" className="hover:underline">edit yourself</Link>
        </nav>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 px-8 py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[#3F58D0] lowercase text-xl font-bold">your continuums</h2>
          <CreateContinuumButton canCreate={canCreate} count={continuums.length} />
        </div>

        {continuums.length === 0 ? (
          <p className="text-black/30 lowercase text-sm">no continuums yet. create one to get started.</p>
        ) : (
          <div className="space-y-0">
            {continuums.map((c) => (
              <Link
                key={c.id}
                href={`/continuum/${c.id}`}
                className="flex items-center justify-between py-3 border-b border-black/10 hover:border-[#3F58D0] transition-colors group"
              >
                <div>
                  <p className="text-sm lowercase text-[#3F58D0] group-hover:underline">{c.title}</p>
                  <p className="text-xs text-black/40 lowercase mt-0.5">
                    {c.leftLabel} — {c.rightLabel}
                  </p>
                </div>
                <span className="text-xs text-black/30 lowercase">{c.visibility.toLowerCase()}</span>
              </Link>
            ))}
          </div>
        )}

        {teams.length > 0 && (
          <div className="mt-12">
            <h2 className="text-[#3F58D0] lowercase text-xl font-bold mb-6">your teams</h2>
            <div className="space-y-0">
              {teams.map(({ team }) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="flex items-center py-3 border-b border-black/10 hover:border-[#3F58D0] transition-colors group"
                >
                  <p className="text-sm lowercase text-[#3F58D0] group-hover:underline">{team.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
