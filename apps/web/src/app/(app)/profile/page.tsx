import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { ProfileClient } from "@/components/profile/ProfileClient";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      name: true, email: true, slogan: true, url: true, avatarConfig: true,
      accounts: { select: { provider: true, id: true } },
      passwordHash: true,
    },
  });

  return (
    <ProfileClient
      user={{
        name: user?.name ?? "",
        email: user?.email ?? "",
        slogan: user?.slogan ?? "",
        url: user?.url ?? "",
        avatarConfig: (user?.avatarConfig ?? {}) as object,
        connectedProviders: (user?.accounts ?? []).map((a) => a.provider),
        hasPassword: !!user?.passwordHash,
      }}
    />
  );
}
