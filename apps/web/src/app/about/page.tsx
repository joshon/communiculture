import Link from "next/link";
import Image from "next/image";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#aaa", marginBottom: 16, margin: "0 0 16px" }}>
        {title}
      </h2>
      <div style={{ fontFamily: INTER, fontSize: 16, lineHeight: 1.75, color: "#1a1a1a" }}>
        {children}
      </div>
    </section>
  );
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: BLUE, textDecoration: "underline" }}>
      {children}
    </a>
  );
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "white" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #f0f0f0", padding: "20px clamp(20px,5vw,48px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/">
            <Image src="/logo.svg" alt="communi*culture" width={160} height={31}
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

        {/* Title */}
        <h1 style={{ fontFamily: INTER, fontSize: "clamp(28px,4vw,40px)", fontWeight: 700, color: "#1a1a1a", marginBottom: 8, marginTop: 0 }}>
          communi<span style={{ color: BLUE }}>*</span>culture
        </h1>
        <p style={{ fontFamily: INTER, fontSize: 16, color: "#888", marginBottom: 56, marginTop: 0 }}>
          a division of <A href="https://futurefarmers.com">futurefarmers</A>
        </p>

        <Section title="What is a continuum?">
          <p style={{ margin: "0 0 16px" }}>
            A continuum is a group exercise where two positions are set at opposite ends of a space — physical or conceptual — and people place themselves along the spectrum between them, based on where they honestly stand on the question being asked.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            The technique has roots in <strong>sociometry</strong>, the study of social relationships developed by psychiatrist{" "}
            <A href="https://en.wikipedia.org/wiki/Jacob_L._Moreno">Jacob Levy Moreno</A> in the 1920s and 30s. Moreno's core idea was that the relationships between people could be made visible and worked with experientially — in space, with bodies, rather than just in language.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            The specific form of the continuum exercise was first formally described as the{" "}
            <strong>Spectrogram</strong> by Delbert M. Kole in a 1967 paper published in <em>Group Psychotherapy</em>. It has since spread through education, conflict resolution, and group facilitation under many names: the <em>Human Barometer</em>, <em>Spectrum Lines</em>, <em>Continuum Dialogue</em>, <em>Four Corners</em>, and <em>Values Clarification</em>.
          </p>
          <p style={{ margin: 0 }}>
            What all versions share is the same quiet power: they make abstract positions concrete, they reveal nuance inside apparent consensus, and they let people see — literally, spatially — where they stand in relation to one another.
          </p>
        </Section>

        <Section title="History of this project">
          <p style={{ margin: "0 0 16px" }}>
            In 2000, <A href="https://joshon.com">Josh On</A> built the first digital version as his graduate project at the{" "}
            <A href="https://www.rca.ac.uk">Royal College of Art</A> (Interaction Design). Called <strong>Prototype World</strong>, it moved the spectrogram online for the first time — turning what had been a physical, room-scale exercise into something that could happen across a network, with strangers.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            In 2002, the project was rebuilt at <A href="https://futurefarmers.com">Futurefarmers</A> with{" "}
            <A href="https://futurefarmers.com">Amy Franceschini</A> and illustrator Brian Won. Built in Flash, it introduced the blocky, hand-drawn avatars that became the project's signature — characters that wore your position without explaining it.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            <A href="https://vimeo.com/165099530">Watch the 2002 version on Vimeo →</A>
          </p>
          <p style={{ margin: 0 }}>
            In 2026, Josh rebuilt communi*culture from scratch with{" "}
            <A href="https://claude.ai">Claude</A> — bringing it into the present as a real-time, multiplayer web app with 3D avatars, live positioning, and team tools.
          </p>
        </Section>

        <Section title="How it works">
          <p style={{ margin: "0 0 16px" }}>
            Someone poses a question with two opposing positions — <em>early bird</em> or <em>night owl</em>, <em>books always</em> or <em>cinema is the highest art</em> — and everyone in the group drags their avatar to where they stand on the spectrum.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            You see the crowd form in real time. You can leave a comment. You can see where your teammates, friends, or strangers placed themselves, and why.
          </p>
          <p style={{ margin: 0 }}>
            The result isn't a poll. It's a picture of a group — where it agrees, where it's divided, and all the texture in between.
          </p>
        </Section>

        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <Link href="/" style={{ fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "none" }}>
            ← back to communiculture
          </Link>
          <Link href="/login" style={{ fontFamily: INTER, fontSize: 13, color: BLUE, textDecoration: "none" }}>
            sign in and participate →
          </Link>
        </div>

      </main>
    </div>
  );
}
