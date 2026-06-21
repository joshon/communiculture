import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";
import { adminEmails } from "@/lib/admin";
import { sendEmail, escapeHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

// Weekly feedback digest. Triggered by a scheduler (GitHub Actions or a Railway
// cron that curls this URL). Secured by CRON_SECRET — passed as
// `Authorization: Bearer <secret>` or `?key=<secret>`. If CRON_SECRET is unset
// the endpoint refuses to run, so it can't be hit anonymously in prod.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [outstanding, weekFeedback] = await Promise.all([
    prisma.feedback.count({ where: { status: "NEW" } }),
    prisma.feedback.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const to = adminEmails();
  if (!to.length) return NextResponse.json({ ok: true, skipped: "no admins" });

  // Nothing new and no backlog → skip the email entirely.
  if (weekFeedback.length === 0 && outstanding === 0) {
    return NextResponse.json({ ok: true, skipped: "nothing to report" });
  }

  const base = process.env.NEXTAUTH_URL ?? "";
  const rows = weekFeedback
    .map((f) => {
      const replyTo = f.email || f.user?.email || null;
      return `<li style="margin:0 0 8px"><b>${f.type}</b> — ${escapeHtml(f.message.slice(0, 240))}${
        replyTo ? ` <span style="color:#888">· reply: ${escapeHtml(replyTo)}</span>` : ""
      }</li>`;
    })
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <p style="font-size:13px;color:#0083FF;letter-spacing:0.05em;margin:0 0 16px">COMMUNICULTURE — WEEKLY FEEDBACK</p>
      <p style="font-size:14px;color:#333;margin:0 0 16px"><b>${outstanding}</b> unread feedback item(s) outstanding.</p>
      <h2 style="font-size:16px;color:#1a1a1a;margin:20px 0 8px">Feedback this week (${weekFeedback.length})</h2>
      <ul style="font-size:13px;color:#444;padding-left:18px;margin:0">${rows || "<li>None</li>"}</ul>
      <p style="font-size:13px;color:#888;margin:24px 0 0">See all of it in the <a href="${base}/admin">admin dashboard</a>.</p>
    </div>`;

  const sent = await sendEmail({
    to,
    subject: `[Communiculture] Weekly feedback — ${weekFeedback.length} new, ${outstanding} unread`,
    html,
    text: `Communiculture weekly feedback\nUnread outstanding: ${outstanding}\nThis week: ${weekFeedback.length}\nAdmin: ${base}/admin`,
  });

  return NextResponse.json({ ok: true, sent, outstanding, weekFeedback: weekFeedback.length });
}
