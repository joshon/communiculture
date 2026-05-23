"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PillButton } from "@/components/ui/PillButton";

const INTER = "Inter, sans-serif";

const MESSAGES: Record<string, string> = {
  Verification: "That sign-in link has already been used or has expired. Request a new one below.",
  OAuthAccountNotLinked: "This email is already registered with a different sign-in method.",
  OAuthSignin: "Something went wrong signing in. Please try again.",
  OAuthCallback: "Something went wrong signing in. Please try again.",
  Default: "Something went wrong. Please try signing in again.",
};

export default function AuthErrorPage() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const message = MESSAGES[error] ?? MESSAGES.Default;

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
        <p style={{ fontFamily: INTER, fontSize: "clamp(14px, 3vw, 16px)", color: "#555", maxWidth: 380, lineHeight: 1.6, marginBottom: 32 }}>
          {message}
        </p>
        <PillButton href="/login" arrow label="Back to sign in" />
      </main>
    </div>
  );
}
