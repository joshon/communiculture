import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { continuumsAllowed } from "@/lib/plans";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [user, totalOwned] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true, slogan: true, url: true, avatarConfig: true,
        avatarThumbnail: true,
        accounts: { select: { provider: true, id: true } },
        passwordHash: true,
        lifetimeContinuums: true,
        continuumCredits: true,
      },
    }),
    prisma.continuum.count({ where: { ownerId: userId } }),
  ]);

  const allowed = continuumsAllowed({
    lifetimeContinuums: user?.lifetimeContinuums ?? false,
    continuumCredits: user?.continuumCredits ?? 0,
    totalOwned,
  });

  return (
    <ProfileClient
      user={{
        name: user?.name ?? "",
        email: user?.email ?? "",
        slogan: user?.slogan ?? "",
        url: user?.url ?? "",
        avatarConfig: (user?.avatarConfig ?? {}) as object,
        avatarThumbnail: user?.avatarThumbnail ?? null,
        connectedProviders: (user?.accounts ?? []).map((a) => a.provider),
        hasPassword: !!user?.passwordHash,
      }}
      credits={{ totalOwned, allowed, purchased: user?.continuumCredits ?? 0 }}
    />
  );
}
