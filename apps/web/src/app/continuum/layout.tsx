import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@communiculture/db";
import { GlobalAvatarCapture } from "@/components/avatar/GlobalAvatarCapture";
import { AvatarStoreHydrator } from "@/components/avatar/AvatarStoreHydrator";

// Unlike the (app) group, continuum pages are publicly viewable — anonymous
// visitors are allowed (individual pages enforce their own access rules). For
// signed-in users we still hydrate the avatar and enforce the site ban.
export default async function ContinuumLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  let thumbnailUrl: string | null = null;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarThumbnail: true, bannedAt: true },
    });
    if (dbUser?.bannedAt) redirect("/banned");
    thumbnailUrl = dbUser?.avatarThumbnail ?? null;
  }

  return (
    <>
      {session && <AvatarStoreHydrator thumbnailUrl={thumbnailUrl} />}
      {children}
      {session && <GlobalAvatarCapture />}
    </>
  );
}
