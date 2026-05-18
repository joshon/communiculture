import Link from "next/link";

export default function AboutPage() {
  return (
    <main style={{ minHeight: "100vh", background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "Proletarian, sans-serif", color: "#3F58D0", textAlign: "center" }}>
        <p style={{ fontSize: "clamp(12px,1vw,16px)", marginBottom: "1rem", opacity: 0.5 }}>about communiculture</p>
        <Link href="/" style={{ fontSize: "clamp(10px,0.8vw,13px)", textDecoration: "underline" }}>← back</Link>
      </div>
    </main>
  );
}
