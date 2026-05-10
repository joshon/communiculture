import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { AvatarEditorClient } from "@/components/avatar/AvatarEditorClient";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, slogan: true, url: true, avatarConfig: true },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="text-comm-blue lowercase text-2xl font-bold mb-8">edit yourself</h2>
      <AvatarEditorClient user={user!} />
    </div>
  );
}
