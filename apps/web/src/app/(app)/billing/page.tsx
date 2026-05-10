import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { PLANS } from "@/lib/stripe";
import { BillingClient } from "@/components/billing/BillingClient";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { plan: true, stripeCustomerId: true },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h2 className="text-comm-blue lowercase text-2xl font-bold mb-2">billing</h2>
      <p className="text-gray-400 text-xs lowercase mb-8">
        current plan: <span className="text-black">{user?.plan.toLowerCase()}</span>
      </p>

      {searchParams.success && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 lowercase mb-6">
          upgrade successful! your plan has been updated.
        </div>
      )}

      <BillingClient
        currentPlan={user?.plan ?? "FREE"}
        hasSubscription={!!user?.stripeCustomerId}
        plans={PLANS}
      />
    </div>
  );
}
