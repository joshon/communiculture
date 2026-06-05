import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { PACKS } from "@/lib/stripe";
import { BillingClient } from "@/components/billing/BillingClient";
import { continuumsAllowed } from "@/lib/plans";
import { AppHeader } from "@/components/ui/AppHeader";

const INTER = "Inter, sans-serif";

export default async function BillingPage({ searchParams }: { searchParams: { success?: string } }) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const [user, totalOwned] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { lifetimeContinuums: true, continuumCredits: true },
    }),
    prisma.continuum.count({ where: { ownerId: userId } }),
  ]);

  const allowed = continuumsAllowed({
    lifetimeContinuums: user?.lifetimeContinuums ?? false,
    continuumCredits: user?.continuumCredits ?? 0,
    totalOwned,
  });

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <AppHeader />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px" }}>
        <h2 style={{ fontFamily: INTER, fontSize: 24, fontWeight: 700, color: "#0083FF", marginBottom: 24 }}>
          billing
        </h2>

        {searchParams.success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px 16px", marginBottom: 24, fontFamily: INTER, fontSize: 14, color: "#15803d" }}>
            purchase successful — your continuums have been added.
          </div>
        )}

        <BillingClient
          totalOwned={totalOwned}
          allowed={allowed}
          continuumCredits={user?.continuumCredits ?? 0}
          packs={PACKS}
        />
      </div>
    </div>
  );
}
