import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { NewContinuumForm } from "@/components/continuum/NewContinuumForm";

export default async function NewContinuumPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [userRecord, count] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }).catch(() => null),
    prisma.continuum.count({ where: { ownerId: userId } }),
  ]);

  const canCreate = userRecord?.plan !== "FREE" || count < 3;

  return <NewContinuumForm canCreate={canCreate} />;
}
