// Transactional email via Resend's HTTP API. Railway (and most PaaS) block
// outbound SMTP, so we never use nodemailer here. The key comes from
// RESEND_API_KEY, or is parsed from the password in the EMAIL_SERVER URL
// (smtps://resend:<key>@smtp.resend.com:465) — matching how auth.ts sends
// magic links.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function resendKey(): string {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  try {
    return decodeURIComponent(new URL(process.env.EMAIL_SERVER as string).password);
  } catch {
    return "";
  }
}

const DEFAULT_FROM = process.env.EMAIL_FROM ?? "Communiculture <noreply@communiculture.org>";

/**
 * Send an email via Resend. Returns true on success, false otherwise — never
 * throws, so a failed notification can't break the action that triggered it
 * (e.g. submitting a report still succeeds even if the admin alert bounces).
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<boolean> {
  const key = resendKey();
  if (!key) {
    console.warn("[email] no Resend key configured; skipping send:", opts.subject);
    return false;
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: opts.from ?? DEFAULT_FROM,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend error:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed:", e);
    return false;
  }
}

/** Minimal HTML escape for interpolating user content into email bodies. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
