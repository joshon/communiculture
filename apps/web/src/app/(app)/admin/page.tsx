export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@communiculture/db";
import { notFound } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { AdminClient } from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) notFound();

  const [feedback, actions] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
  ]);

  return (
    <AdminClient
      feedback={feedback.map((f) => ({
        id: f.id,
        type: f.type,
        message: f.message,
        status: f.status,
        email: f.email,
        userName: f.user?.name ?? null,
        userEmail: f.user?.email ?? null,
        createdAt: f.createdAt.toISOString(),
      }))}
      actions={actions.map((a) => ({
        id: a.id,
        adminEmail: a.adminEmail,
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        detail: a.detail,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
