import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  prisma,
  type ReportTargetType,
  type ReportCategory,
} from "@communiculture/db";
import { getRedis } from "@/lib/redis";
import { adminEmails } from "@/lib/admin";
import { sendEmail, escapeHtml } from "@/lib/email";

const TARGET_TYPES: ReportTargetType[] = ["CONTINUUM", "USER", "COMMENT"];
const CATEGORIES: ReportCategory[] = ["SPAM", "HARASSMENT", "HATE", "MISINFORMATION", "OTHER"];
// Categories severe enough to email admins immediately (not just the digest).
const URGENT: ReportCategory[] = ["HARASSMENT", "HATE"];
const RATE_LIMIT = 10; // reports per hour per user

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const reporterId = session.user.id;

  let body: {
    targetType?: unknown;
    targetId?: unknown;
    continuumId?: unknown;
    category?: unknown;
    note?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const targetType = TARGET_TYPES.includes(body.targetType as ReportTargetType)
    ? (body.targetType as ReportTargetType)
    : null;
  const category = CATEGORIES.includes(body.category as ReportCategory)
    ? (body.category as ReportCategory)
    : null;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const continuumId = typeof body.continuumId === "string" ? body.continuumId : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : null;

  if (!targetType || !category || !targetId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Rate limit per reporter (fails open if Redis is down).
  const redis = getRedis();
  if (redis) {
    try {
      const key = `report:rl:${reporterId}`;
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 3600);
      if (n > RATE_LIMIT) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
    } catch {
      /* fail open */
    }
  }

  // Snapshot the reported content at report time, so admins can review even if
  // it's later edited or removed.
  const snapshot = await snapshotTarget(targetType, targetId, continuumId);

  // One report per user per target — re-reporting just refreshes the snapshot
  // rather than erroring (and never reopens an already-resolved report).
  try {
    await prisma.report.upsert({
      where: {
        reporterId_targetType_targetId: { reporterId, targetType, targetId },
      },
      update: { category, note, targetSnapshot: snapshot, continuumId },
      create: {
        targetType,
        targetId,
        continuumId,
        targetSnapshot: snapshot,
        category,
        note,
        reporterId,
      },
    });
  } catch (e) {
    console.error("[reports] create failed:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Immediate alert for the severe categories; everything else rides the digest.
  if (URGENT.includes(category)) {
    void emailUrgentReport({ category, targetType, targetId, note, snapshot, reporterId });
  }

  return NextResponse.json({ ok: true });
}

async function snapshotTarget(
  targetType: ReportTargetType,
  targetId: string,
  continuumId: string | null
): Promise<string | null> {
  try {
    if (targetType === "CONTINUUM") {
      const c = await prisma.continuum.findUnique({
        where: { id: targetId },
        select: { title: true, leftLabel: true, rightLabel: true },
      });
      return c ? `Continuum: "${c.title}" (${c.leftLabel} ↔ ${c.rightLabel})` : null;
    }
    if (targetType === "USER") {
      const u = await prisma.user.findUnique({
        where: { id: targetId },
        select: { name: true, email: true },
      });
      return u ? `User: ${u.name ?? "(no name)"} <${u.email ?? "?"}>` : null;
    }
    // COMMENT: identified by the author's userId within a continuum.
    if (targetType === "COMMENT" && continuumId) {
      const p = await prisma.continuumParticipant.findUnique({
        where: { continuumId_userId: { continuumId, userId: targetId } },
        select: { comment: true, user: { select: { name: true } } },
      });
      return p ? `Comment by ${p.user?.name ?? "?"}: "${p.comment ?? ""}"` : null;
    }
  } catch (e) {
    console.error("[reports] snapshot failed:", e);
  }
  return null;
}

async function emailUrgentReport(r: {
  category: ReportCategory;
  targetType: ReportTargetType;
  targetId: string;
  note: string | null;
  snapshot: string | null;
  reporterId: string;
}) {
  const to = adminEmails();
  if (!to.length) return;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:13px;color:#c00;letter-spacing:0.05em;margin:0 0 8px">URGENT REPORT — ${r.category}</p>
      <p style="font-size:14px;color:#333;margin:0 0 4px"><b>Type:</b> ${r.targetType}</p>
      <p style="font-size:14px;color:#333;margin:0 0 4px"><b>Target:</b> ${escapeHtml(r.targetId)}</p>
      <p style="font-size:14px;color:#333;margin:0 0 4px"><b>Content:</b> ${escapeHtml(r.snapshot ?? "(unavailable)")}</p>
      ${r.note ? `<p style="font-size:14px;color:#333;margin:0 0 4px"><b>Reporter note:</b> ${escapeHtml(r.note)}</p>` : ""}
      <p style="font-size:13px;color:#888;margin:16px 0 0">Review it in the admin dashboard: <a href="${process.env.NEXTAUTH_URL ?? ""}/admin">/admin</a></p>
    </div>`;
  await sendEmail({
    to,
    subject: `[Communiculture] Urgent report: ${r.category} (${r.targetType})`,
    html,
    text: `Urgent report — ${r.category}\nType: ${r.targetType}\nTarget: ${r.targetId}\nContent: ${r.snapshot ?? "(unavailable)"}\n${r.note ? `Note: ${r.note}\n` : ""}Review: ${process.env.NEXTAUTH_URL ?? ""}/admin`,
  });
}
