import Link from "next/link";
import Image from "next/image";
import { PillButton } from "@/components/ui/PillButton";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

// Magic-link confirmation step.
//
// NextAuth email links are single-use: the FIRST GET to the callback URL
// consumes the token. Corporate/provider email security scanners (Outlook Safe
// Links, Mimecast, Proofpoint, antivirus, link unfurlers) pre-fetch every link
// in an incoming email, which burns the token before the human ever clicks —
// so the real click lands on "this link has already been used."
//
// The email therefore links here instead of straight to the callback. A scanner
// GETs this page (harmless — no token touched); only a human clicking the button
// navigates to the real /api/auth/callback/email URL that consumes the token.

// Only allow same-origin callback URLs that point at the NextAuth callback, so
// this page can't be turned into an open redirect.
function safeCallback(raw?: string): string | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  let target: URL;
  let base: URL;
  try {
    target = new URL(decoded);
    base = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  } catch {
    return null;
  }
  if (target.host !== base.host) return null;
  if (!target.pathname.startsWith("/api/auth/callback/")) return null;
  return target.toString();
}

export default function VerifySignInPage({
  searchParams,
}: {
  searchParams: { callback?: string };
}) {
  const callback = safeCallback(searchParams.callback);

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <Link href="/" style={{ position: "fixed", top: 24, left: "clamp(16px, 4vw, 32px)", zIndex: 10, display: "block" }}>
        <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
          style={{ width: "clamp(140px, 30vw, 208px)", height: "auto", display: "block" }} priority />
      </Link>

      <main style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "0 clamp(16px, 5vw, 48px)",
        textAlign: "center",
      }}>
        {callback ? (
          <>
            <h1 style={{ fontFamily: INTER, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 400, color: "#1a1a1a", margin: "0 0 16px" }}>
              Almost there
            </h1>
            <p style={{ fontFamily: INTER, fontSize: "clamp(14px, 3vw, 16px)", color: "#555", maxWidth: 380, lineHeight: 1.6, marginBottom: 32 }}>
              Click below to finish signing in to Communiculture.
            </p>
            {/* Plain anchor (not next/link) to force a full-document GET to the auth callback. */}
            <a
              href={callback}
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: BLUE,
                color: "white",
                textDecoration: "none",
                fontFamily: INTER,
                fontSize: "clamp(13px, 3vw, 16px)",
                fontWeight: 600,
                lineHeight: 1,
                padding: "10px 24px",
                borderRadius: 0,
              }}
            >
              Confirm sign in
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 7, flexShrink: 0 }}>
                <path d="M5.56702 1.11302L9.61902 5.56128L5.56702 10.0098M9.61902 5.56128L1.11283 5.56128"
                  stroke="white" strokeWidth="2.22569" strokeLinecap="round" />
              </svg>
            </a>
          </>
        ) : (
          <>
            <p style={{ fontFamily: INTER, fontSize: "clamp(14px, 3vw, 16px)", color: "#555", maxWidth: 380, lineHeight: 1.6, marginBottom: 32 }}>
              This sign-in link is invalid or has expired. Request a new one below.
            </p>
            <PillButton href="/login" arrow label="Back to sign in" />
          </>
        )}
      </main>
    </div>
  );
}
