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
