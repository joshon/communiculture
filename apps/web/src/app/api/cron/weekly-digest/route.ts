import { NextResponse } from "next/server";
import { prisma } from "@communiculture/db";
import { adminEmails } from "@/lib/admin";
import { sendEmail, escapeHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

// Weekly moderation/feedback digest. Triggered by a scheduler (GitHub Actions or
// a Railway cron that curls this URL). Secured by CRON_SECRET — must be passed as
// `Authorization: Bearer <secret>` or `?key=<secret>`. If CRON_SECRET is unset,
// the endpoint refuses to run (so it can't be hit anonymously in prod).
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("key") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [newFeedback, openReports, weekFeedback, weekReports] = await Promise.all([
    prisma.feedback.count({ where: { status: "NEW" } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.feedback.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { type: true, message: true, createdAt: true },
    }),
    prisma.report.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { category: true, targetType: true, targetSnapshot: true, status: true, createdAt: true },
    }),
  ]);

  const to = adminEmails();
  if (!to.length) return NextResponse.json({ ok: true, skipped: "no admins" });

  // Nothing happened this week and no backlog → skip the email entirely.
  if (weekFeedback.length === 0 && weekReports.length === 0 && openReports === 0 && newFeedback === 0) {
    return NextResponse.json({ ok: true, skipped: "nothing to report" });
  }

  const base = process.env.NEXTAUTH_URL ?? "";
  const fbRows = weekFeedback
    .map((f) => `<li style="margin:0 0 6px"><b>${f.type}</b> — ${escapeHtml(f.message.slice(0, 160))}</li>`)
    .join("");
  const rpRows = weekReports
    .map((r) => `<li style="margin:0 0 6px"><b>${r.category}</b> (${r.targetType}, ${r.status}) — ${escapeHtml((r.targetSnapshot ?? "").slice(0, 160))}</li>`)
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <p style="font-size:13px;color:${"#0083FF"};letter-spacing:0.05em;margin:0 0 16px">COMMUNICULTURE — WEEKLY DIGEST</p>
      <p style="font-size:14px;color:#333;margin:0 0 16px">
        <b>${openReports}</b> open report(s) · <b>${newFeedback}</b> new feedback item(s) outstanding.
      </p>
      <h2 style="font-size:16px;color:#1a1a1a;margin:20px 0 8px">Reports this week (${weekReports.length})</h2>
      <ul style="font-size:13px;color:#444;padding-left:18px;margin:0">${rpRows || "<li>None</li>"}</ul>
      <h2 style="font-size:16px;color:#1a1a1a;margin:20px 0 8px">Feedback this week (${weekFeedback.length})</h2>
      <ul style="font-size:13px;color:#444;padding-left:18px;margin:0">${fbRows || "<li>None</li>"}</ul>
      <p style="font-size:13px;color:#888;margin:24px 0 0">Manage everything in the <a href="${base}/admin">admin dashboard</a>.</p>
    </div>`;

  const sent = await sendEmail({
    to,
    subject: `[Communiculture] Weekly digest — ${openReports} open report(s), ${newFeedback} new feedback`,
    html,
    text: `Communiculture weekly digest\nOpen reports: ${openReports}\nNew feedback: ${newFeedback}\nReports this week: ${weekReports.length}\nFeedback this week: ${weekFeedback.length}\nAdmin: ${base}/admin`,
  });

  return NextResponse.json({ ok: true, sent, openReports, newFeedback, weekFeedback: weekFeedback.length, weekReports: weekReports.length });
}
