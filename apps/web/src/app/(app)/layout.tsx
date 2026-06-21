import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@communiculture/db";
import { GlobalAvatarCapture } from "@/components/avatar/GlobalAvatarCapture";
import { AvatarStoreHydrator } from "@/components/avatar/AvatarStoreHydrator";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarThumbnail: true, bannedAt: true },
  });

  // Site-banned users are still signed in but locked out of the whole app.
  if (dbUser?.bannedAt) redirect("/banned");

  const thumbnailUrl = dbUser?.avatarThumbnail ?? null;

  return (
    <>
      <AvatarStoreHydrator thumbnailUrl={thumbnailUrl} />
      {children}
      <GlobalAvatarCapture />
    </>
  );
}
