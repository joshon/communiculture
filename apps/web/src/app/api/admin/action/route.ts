import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, type ReportStatus } from "@communiculture/db";
import { isAdminEmail, logAdminAction } from "@/lib/admin";

// Central moderation-action endpoint. Every action is reversible and
// non-destructive, and every action is written to the AdminAction audit log.
//
// Permissions:
//   hide_comment / unhide_comment   → admin OR the continuum's owner
//   ban_continuum / unban_continuum → admin OR the continuum's owner
//   ban_user / unban_user           → admin only (site-wide)
//   resolve_report                  → admin only
const RESOLVE_STATUSES: ReportStatus[] = ["OPEN", "REVIEWING", "ACTIONED", "DISMISSED"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;
  if (!email || !userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = isAdminEmail(email);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const isOwner = async (continuumId: string) =>
    !!(await prisma.continuum.findFirst({
      where: { id: continuumId, ownerId: userId },
      select: { id: true },
    }));

  try {
    switch (action) {
      // ── Hide / unhide a comment (speech bubble on a continuum) ──────────────
      case "hide_comment":
      case "unhide_comment": {
        const continuumId = String(body.continuumId ?? "");
        const targetUserId = String(body.userId ?? "");
        if (!continuumId || !targetUserId) return bad();
        if (!admin && !(await isOwner(continuumId))) return forbidden();
        const hidden = action === "hide_comment";
        await prisma.continuumParticipant.update({
          where: { continuumId_userId: { continuumId, userId: targetUserId } },
          data: { commentHidden: hidden, commentHiddenBy: hidden ? (admin ? "admin" : "owner") : null },
        });
        await logAdminAction({
          actorEmail: email,
          action,
          targetType: "COMMENT",
          targetId: targetUserId,
          detail: `continuum ${continuumId}`,
        });
        return ok();
      }

      // ── Ban / unban a user from a single continuum (owner power) ────────────
      case "ban_continuum":
      case "unban_continuum": {
        const continuumId = String(body.continuumId ?? "");
        const targetUserId = String(body.userId ?? "");
        if (!continuumId || !targetUserId) return bad();
        if (!admin && !(await isOwner(continuumId))) return forbidden();
        if (action === "ban_continuum") {
          await prisma.continuumBan.upsert({
            where: { continuumId_userId: { continuumId, userId: targetUserId } },
            update: {},
            create: { continuumId, userId: targetUserId, bannedBy: userId },
          });
          // Remove them from the continuum when banned (reversible: they can rejoin if unbanned).
          await prisma.continuumParticipant.deleteMany({ where: { continuumId, userId: targetUserId } });
        } else {
          await prisma.continuumBan.deleteMany({ where: { continuumId, userId: targetUserId } });
        }
        await logAdminAction({
          actorEmail: email,
          action,
          targetType: "USER",
          targetId: targetUserId,
          detail: `continuum ${continuumId}`,
        });
        return ok();
      }

      // ── Site-wide ban / unban (admin only) ──────────────────────────────────
      case "ban_user":
      case "unban_user": {
        if (!admin) return forbidden();
        const targetUserId = String(body.userId ?? "");
        if (!targetUserId) return bad();
        const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;
        await prisma.user.update({
          where: { id: targetUserId },
          data:
            action === "ban_user"
              ? { bannedAt: new Date(), banReason: reason }
              : { bannedAt: null, banReason: null },
        });
        await logAdminAction({
          actorEmail: email,
          action,
          targetType: "USER",
          targetId: targetUserId,
          detail: reason,
        });
        return ok();
      }

      // ── Resolve a report (admin only) ───────────────────────────────────────
      case "resolve_report": {
        if (!admin) return forbidden();
        const reportId = String(body.reportId ?? "");
        const status = RESOLVE_STATUSES.includes(body.status as ReportStatus)
          ? (body.status as ReportStatus)
          : null;
        if (!reportId || !status) return bad();
        await prisma.report.update({
          where: { id: reportId },
          data: { status, resolvedBy: email, resolvedAt: new Date() },
        });
        await logAdminAction({
          actorEmail: email,
          action: "resolve_report",
          targetType: "REPORT",
          targetId: reportId,
          detail: status,
        });
        return ok();
      }

      // ── Mark feedback read/resolved (admin only) ────────────────────────────
      case "feedback_status": {
        if (!admin) return forbidden();
        const feedbackId = String(body.feedbackId ?? "");
        const status = ["NEW", "READ", "RESOLVED"].includes(String(body.status))
          ? (String(body.status) as "NEW" | "READ" | "RESOLVED")
          : null;
        if (!feedbackId || !status) return bad();
        await prisma.feedback.update({ where: { id: feedbackId }, data: { status } });
        return ok();
      }

      default:
        return bad();
    }
  } catch (e) {
    console.error("[admin/action] failed:", action, e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const ok = () => NextResponse.json({ ok: true });
const bad = () => NextResponse.json({ error: "invalid_input" }, { status: 400 });
const forbidden = () => NextResponse.json({ error: "forbidden" }, { status: 403 });
