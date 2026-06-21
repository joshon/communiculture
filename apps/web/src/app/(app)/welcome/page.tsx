import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { redirect } from "next/navigation";
import { WelcomeClient } from "@/components/onboarding/WelcomeClient";

export const dynamic = "force-dynamic";

// Only allow internal return paths (no open redirects).
function safeNext(next?: string): string | null {
  if (!next) return null;
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return null;
}

// First-run onboarding: capture a display name (required) and let the user see /
// customise their avatar, then continue to wherever they were headed.
export default async function WelcomePage({ searchParams }: { searchParams: { next?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, avatarConfig: true },
  });

  const next = safeNext(searchParams.next) ?? "/dashboard";

  // Already onboarded → straight to the destination.
  if (user?.name?.trim()) redirect(next);

  return <WelcomeClient next={next} initialAvatarConfig={user?.avatarConfig ?? null} />;
}
