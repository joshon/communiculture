import Link from "next/link";
import Image from "next/image";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: INTER, fontSize: 16, fontWeight: 600, color: "#111", margin: "0 0 12px" }}>
        {title}
      </h2>
      <div style={{ fontFamily: INTER, fontSize: 15, lineHeight: 1.75, color: "#444" }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "white" }}>

      <div style={{ borderBottom: "1px solid #f0f0f0", padding: "20px clamp(20px,5vw,48px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/">
            <Image src="/logo.svg" alt="Communiculture" width={160} height={31}
              style={{ width: "clamp(120px,20vw,160px)", height: "auto", display: "block" }} />
          </Link>
          <Link href="/login" style={{ fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "none" }}>
            sign in →
          </Link>
        </div>
      </div>

      <main style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "clamp(40px,8vw,80px) clamp(20px,5vw,48px)",
      }}>
        <h1 style={{ fontFamily: INTER, fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
          Privacy Policy
        </h1>
        <p style={{ fontFamily: INTER, fontSize: 14, color: "#aaa", margin: "0 0 48px" }}>
          Last updated: May 2026
        </p>

        <Section title="Who we are">
          <p style={{ margin: "0 0 12px" }}>
            Communiculture is a project by <a href="https://futurefarmers.com" style={{ color: BLUE }}>Futurefarmers</a>, operated by Josh On. The service is available at communiculture.org.
          </p>
          <p style={{ margin: 0 }}>
            Questions about this policy: <a href="mailto:josh@theyrule.net" style={{ color: BLUE }}>josh@theyrule.net</a>
          </p>
        </Section>

        <Section title="What we collect">
          <p style={{ margin: "0 0 12px" }}>When you sign in and use Communiculture, we collect:</p>
          <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}><strong>Account info</strong> — your name, email address, and profile image from whichever sign-in method you use (Google or email)</li>
            <li style={{ marginBottom: 8 }}><strong>Avatar configuration</strong> — the colors and style choices you make for your blocky avatar</li>
            <li style={{ marginBottom: 8 }}><strong>Continuum positions</strong> — where you place yourself on each continuum question</li>
            <li style={{ marginBottom: 8 }}><strong>Comments</strong> — any text you add to explain your position</li>
            <li style={{ marginBottom: 0 }}><strong>Usage data</strong> — basic server logs (IP address, timestamps) for security and debugging</li>
          </ul>
          <p style={{ margin: 0 }}>
            We do not collect payment information, location data, or track you across other websites.
          </p>
        </Section>

        <Section title="How we use your data">
          <p style={{ margin: "0 0 12px" }}>We use your data only to provide the service:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>To display your avatar and position in continuums</li>
            <li style={{ marginBottom: 8 }}>To show other participants where you stand</li>
            <li style={{ marginBottom: 8 }}>To maintain your account and settings across sessions</li>
            <li style={{ marginBottom: 0 }}>To send sign-in emails if you use email magic link</li>
          </ul>
        </Section>

        <Section title="Third-party sign-in">
          <p style={{ margin: "0 0 12px" }}>
            If you sign in with Google, we receive your name, email, and profile image from that provider. We do not receive your password or any other account data from those services.
          </p>
          <p style={{ margin: 0 }}>
            Google has its own privacy policy: <a href="https://policies.google.com/privacy" style={{ color: BLUE }}>Google</a>
          </p>
        </Section>

        <Section title="Data sharing">
          <p style={{ margin: 0 }}>
            We do not sell your data. We do not share your data with advertisers or third parties, except for the infrastructure services required to run the app (Railway for hosting, PostgreSQL for the database). Your name and avatar are visible to other users of any continuum you participate in.
          </p>
        </Section>

        <Section title="Data retention">
          <p style={{ margin: 0 }}>
            We keep your data for as long as your account is active. If you would like to delete your account and all associated data, email <a href="mailto:josh@theyrule.net" style={{ color: BLUE }}>josh@theyrule.net</a> and we will delete it within 30 days.
          </p>
        </Section>


        <Section title="Cookies">
          <p style={{ margin: 0 }}>
            We use a single session cookie to keep you signed in. We do not use advertising cookies or third-party tracking cookies.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p style={{ margin: 0 }}>
            If we make material changes to this policy, we will update the date at the top of this page. Continued use of the service after changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 32, marginTop: 8, display: "flex", gap: 24 }}>
          <Link href="/terms" style={{ fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "none" }}>
            Terms of Service
          </Link>
          <Link href="/" style={{ fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "none" }}>
            ← back to communiculture
          </Link>
        </div>

      </main>
    </div>
  );
}
