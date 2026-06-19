import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { AppHeader, type Breadcrumb } from "@/components/ui/AppHeader";
import { AvatarStoreHydrator } from "@/components/avatar/AvatarStoreHydrator";

/**
 * Server-side header for public pages (about, terms, privacy). Renders the same
 * AppHeader as in-app screens: logo menu on the left, and on the right the user's
 * avatar when signed in, or a "sign in →" link when not.
 *
 * Public pages live outside the (app) route group, so the avatar store isn't
 * hydrated for them — we do that here when a session exists.
 */
export async function SiteHeader({ breadcrumbs }: { breadcrumbs?: Breadcrumb[] }) {
  const session = await getServerSession(authOptions);

  let thumbnailUrl: string | null = null;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarThumbnail: true },
    });
    thumbnailUrl = dbUser?.avatarThumbnail ?? null;
  }

  return (
    <>
      {thumbnailUrl && <AvatarStoreHydrator thumbnailUrl={thumbnailUrl} />}
      <AppHeader breadcrumbs={breadcrumbs} authenticated={!!session} />
    </>
  );
}
