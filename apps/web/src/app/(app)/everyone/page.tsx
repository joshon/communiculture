import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { redirect } from "next/navigation";
import { EveryoneGallery } from "@/components/everyone/EveryoneGallery";

export const dynamic = "force-dynamic";

// Everyone who has joined a public continuum, ordered chronologically by when
// they joined the app (User.createdAt — ContinuumParticipant has no createdAt).
export default async function EveryonePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const currentUserId = session.user.id;

  const people = await prisma.user.findMany({
    where: {
      isSynthetic: false,
      participations: {
        some: { continuum: { visibility: { in: ["PUBLIC", "PUBLIC_LINK"] }, deletedAt: null } },
      },
    },
    select: { id: true, name: true, avatarConfig: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Always include the current user so the gallery can centre on them, even if
  // they haven't joined a public continuum yet.
  let list = people;
  if (!people.some((p) => p.id === currentUserId)) {
    const me = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, name: true, avatarConfig: true, createdAt: true },
    });
    if (me) {
      list = [...people, me].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
  }

  return (
    <EveryoneGallery
      people={list.map((p) => ({ id: p.id, name: p.name, avatarConfig: p.avatarConfig }))}
      currentUserId={currentUserId}
    />
  );
}
