import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";

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

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "white" }}>

      <SiteHeader />

      <main style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "clamp(40px,8vw,80px) clamp(20px,5vw,48px)",
      }}>
        <h1 style={{ fontFamily: INTER, fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
          Terms of Service
        </h1>
        <p style={{ fontFamily: INTER, fontSize: 14, color: "#aaa", margin: "0 0 48px" }}>
          Last updated: May 2026
        </p>

        <Section title="Who we are">
          <p style={{ margin: 0 }}>
            Communiculture is a service provided by Futurefarmers, operated by Josh On. By using communiculture.org, you agree to these terms. Questions: <a href="mailto:josh@theyrule.net" style={{ color: BLUE }}>josh@theyrule.net</a>
          </p>
        </Section>

        <Section title="What Communiculture is">
          <p style={{ margin: 0 }}>
            Communiculture is a group exercise tool. It lets people place themselves on a spectrum between two positions on a question, see where others stand, and leave comments. It is not a polling platform, a debate forum, or a social network.
          </p>
        </Section>

        <Section title="Your account">
          <p style={{ margin: "0 0 12px" }}>
            You may create an account using Google or email. You are responsible for keeping your account secure and for all activity that occurs under it.
          </p>
          <p style={{ margin: 0 }}>
            You must be at least 13 years old to use this service. By creating an account you confirm that you meet this requirement.
          </p>
        </Section>

        <Section title="Your content">
          <p style={{ margin: "0 0 12px" }}>
            You own the comments and positions you post. By posting, you grant us a non-exclusive license to display that content to other participants in the same continuum.
          </p>
          <p style={{ margin: 0 }}>
            You may not post content that is illegal, harassing, hateful, or deliberately deceptive. We reserve the right to remove content or suspend accounts that violate these terms.
          </p>
        </Section>

        <Section title="Our responsibilities">
          <p style={{ margin: 0 }}>
            We provide this service as-is. We make no guarantees about uptime or data preservation. We are not responsible for the content posted by other users. The service is provided free of charge; we may introduce paid features in the future with advance notice.
          </p>
        </Section>

        <Section title="Intellectual property">
          <p style={{ margin: 0 }}>
            The Communiculture name, logo, avatar designs, and software are owned by Futurefarmers. The original Futurefarmers 2002 design was created by Amy Franceschini and Brian Won. You may not copy or redistribute these without permission.
          </p>
        </Section>

        <Section title="Termination">
          <p style={{ margin: 0 }}>
            You may delete your account at any time by contacting <a href="mailto:josh@theyrule.net" style={{ color: BLUE }}>josh@theyrule.net</a>. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted within 30 days.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p style={{ margin: 0 }}>
            To the fullest extent permitted by law, Futurefarmers shall not be liable for any indirect, incidental, or consequential damages arising from your use of Communiculture.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p style={{ margin: 0 }}>
            We may update these terms from time to time. We will update the date at the top of this page. Continued use of the service after changes constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="Governing law">
          <p style={{ margin: 0 }}>
            These terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.
          </p>
        </Section>

        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 32, marginTop: 8, display: "flex", gap: 24 }}>
          <Link href="/privacy" style={{ fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link href="/" style={{ fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "none" }}>
            ← back to communiculture
          </Link>
        </div>

      </main>
    </div>
  );
}
