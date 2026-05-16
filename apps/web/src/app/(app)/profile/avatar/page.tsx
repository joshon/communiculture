import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { AvatarEditorClient } from "@/components/avatar/AvatarEditorClient";

export default async function AvatarEditorPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, slogan: true, url: true, avatarConfig: true },
  });

  return <AvatarEditorClient user={user!} />;
}
