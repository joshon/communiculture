// Site admins — can view feedback/reports and take admin moderation actions.
// Overridable via ADMIN_EMAILS (comma-separated); defaults to the two owners.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "joshononon@gmail.com,amy@futurefarmers.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export function adminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

import { prisma } from "@communiculture/db";

/** Append an entry to the moderation audit log. Never throws. */
export async function logAdminAction(entry: {
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string | null;
}): Promise<void> {
  try {
    await prisma.adminAction.create({
      data: {
        adminEmail: entry.actorEmail,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        detail: entry.detail ?? null,
      },
    });
  } catch (e) {
    console.error("[admin] failed to log action:", e);
  }
}
