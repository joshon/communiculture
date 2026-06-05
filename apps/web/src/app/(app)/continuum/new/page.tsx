import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { NewContinuumForm } from "@/components/continuum/NewContinuumForm";
import { canCreateContinuum } from "@/lib/plans";

export default async function NewContinuumPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [userRecord, totalOwned] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { lifetimeContinuums: true, continuumCredits: true } }).catch(() => null),
    prisma.continuum.count({ where: { ownerId: userId } }),
  ]);

  const canCreate = canCreateContinuum({
    lifetimeContinuums: userRecord?.lifetimeContinuums ?? false,
    continuumCredits: userRecord?.continuumCredits ?? 0,
    totalOwned,
  });

  return <NewContinuumForm canCreate={canCreate} />;
}
