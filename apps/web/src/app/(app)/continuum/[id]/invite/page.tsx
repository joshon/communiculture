import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound } from "next/navigation";
import { nanoid } from "@/lib/nanoid";

/**
 * Enables share link for a continuum and redirects back.
 * Hit via server action or simple form POST.
 */
export default async function InvitePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const continuum = await prisma.continuum.findUnique({ where: { id: params.id } });
  if (!continuum || continuum.ownerId !== session.user.id) notFound();

  if (!continuum.shareToken) {
    await prisma.continuum.update({
      where: { id: params.id },
      data: {
        shareToken: nanoid(),
        visibility: "PUBLIC_LINK",
      },
    });
  }

  const updated = await prisma.continuum.findUnique({
    where: { id: params.id },
    select: { shareToken: true },
  });

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <h2 className="text-comm-blue lowercase text-xl font-bold mb-4">share link</h2>
      <p className="text-sm text-gray-600 lowercase mb-4">
        anyone with this link can participate in your continuum:
      </p>
      <code className="block bg-gray-50 border border-gray-200 p-3 text-xs break-all">
        {process.env.NEXTAUTH_URL}/continuum/{params.id}?token={updated?.shareToken}
      </code>
      <p className="text-xs text-gray-400 lowercase mt-4">
        for MS Teams, use the embed url instead:
      </p>
      <code className="block bg-gray-50 border border-gray-200 p-3 text-xs break-all mt-1">
        {process.env.NEXTAUTH_URL}/embed/{params.id}?token={updated?.shareToken}
      </code>
    </div>
  );
}
