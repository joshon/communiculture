const INTER = "Inter, sans-serif";

export default function BannedPage() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "white" }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <h1 style={{ fontFamily: INTER, fontSize: 24, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>
          Your account has been suspended
        </h1>
        <p style={{ fontFamily: INTER, fontSize: 15, color: "#666", lineHeight: 1.6, margin: "0 0 20px" }}>
          Access to Communiculture has been restricted for this account. If you believe this is a
          mistake, reach out and we&rsquo;ll take a look.
        </p>
        <a href="/contact" style={{ fontFamily: INTER, fontSize: 14, color: "#0083FF", textDecoration: "underline" }}>
          Contact us
        </a>
      </div>
    </main>
  );
}
