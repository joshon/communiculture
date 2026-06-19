import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { redirect } from "next/navigation";
import { WelcomeClient } from "@/components/onboarding/WelcomeClient";

export const dynamic = "force-dynamic";

// First-run onboarding: capture a display name (required) and, optionally, a
// password for faster future sign-ins. Skipped once the user has a name.
export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, passwordHash: true },
  });

  if (user?.name?.trim()) redirect("/dashboard");

  return <WelcomeClient email={session.user.email ?? ""} hasPassword={!!user?.passwordHash} />;
}
