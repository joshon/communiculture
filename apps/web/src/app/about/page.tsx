import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";

const INTER = "Inter, sans-serif";
const BLUE = "#0083FF";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: INTER, fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 16, margin: "0 0 16px" }}>
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

      <SiteHeader />

      <main style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "clamp(40px,8vw,80px) clamp(20px,5vw,48px)",
      }}>

        <Section title="What is a continuum?">
          <p style={{ margin: "0 0 16px" }}>
            A continuum is a group exercise where two positions are set at opposite ends of a space — physical or conceptual — and people place themselves along the spectrum between them, based on where they stand on the question being asked.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            The technique has roots in <strong>sociometry</strong>, the study of social relationships developed by psychiatrist{" "}
            <A href="https://en.wikipedia.org/wiki/Jacob_L._Moreno">Jacob Levy Moreno</A> in the 1920s and 30s. Moreno's core idea was that the relationships between people could be made visible and worked with experientially — in space, with bodies, rather than just in language.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            The specific form of the continuum exercise was first formally described as the{" "}
            <A href="https://www.psychodramajournal.com/index.php/asgppjournal/article/view/866"><strong>Spectrogram</strong></A>{" "}
            by Delbert M. Kole in a 1967 paper published in <em>Group Psychotherapy</em>. It has since spread through education, conflict resolution, and group facilitation under many names: the{" "}
            <A href="https://www.facinghistory.org/resource-library/barometer-taking-stand-controversial-issues"><em>Human Barometer</em></A>,{" "}
            <A href="https://resistrenew.com/2021/02/13/toolbox-spectrum-lines/"><em>Spectrum Lines</em></A>,{" "}
            <A href="https://www.nsrfharmony.org/wp-content/uploads/2017/10/continuum_dialogue_0.pdf"><em>Continuum Dialogue</em></A>,{" "}
            <A href="https://ggie.berkeley.edu/practice/four-corners/"><em>Four Corners</em></A>, and{" "}
            <A href="https://en.wikipedia.org/wiki/Values_clarification"><em>Values Clarification</em></A>.
          </p>
          <p style={{ margin: 0 }}>
            All versions make abstract positions concrete, they reveal nuance inside apparent consensus, and they let people see — literally, spatially — where they stand in relation to one another.
          </p>
        </Section>

        <Section title="History of this project">
          <p style={{ margin: "0 0 16px" }}>
            In 2000, Josh On built the first digital version as his graduate project at the{" "}
            <A href="https://www.rca.ac.uk">Royal College of Art</A> (Computer Related Design). Called <strong>Prototype World</strong>, it moved the spectrogram online for the first time — turning what had been a physical, room-scale exercise into something that could happen across a network, with strangers.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            In 2002, the project was rebuilt at <A href="https://futurefarmers.com">Futurefarmers</A> with{" "}
            <A href="https://futurefarmers.com">Amy Franceschini</A> and illustrator <A href="https://brianwon.com/about">Brian Won</A>. Built in a very early version of Flash and PHP.
          </p>
          <p style={{ margin: "0 0 16px" }}>
            <A href="https://vimeo.com/165099530">Watch the 2002 version on Vimeo →</A>
          </p>
          <p style={{ margin: 0 }}>
            In 2026, Josh rebuilt communiculture from scratch with{" "}
            <A href="https://claude.ai">Claude</A> — with a real-time, multiplayer web app with 3D avatars, live positioning, mobile support, all building on the original Futurefarmers design.
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
