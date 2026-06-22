"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { useAvatarStore } from "@/store/avatarStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PillButton } from "@/components/ui/PillButton";

const INTER = "Inter, sans-serif";

interface V2Config {
  format: "v2";
  colors: Record<AvatarPart, string>;
  variants: Record<AvatarPart, number>;
}

function parseAvatarConfig(raw: unknown): { colors: Record<AvatarPart, string>; variants: Record<AvatarPart, number> } | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.format === "v2" && obj.colors && obj.variants) {
    return { colors: obj.colors as V2Config["colors"], variants: obj.variants as V2Config["variants"] };
  }
  return null;
}

export function WelcomeClient({ next, initialAvatarConfig }: { next: string; initialAvatarConfig: unknown }) {
  const router = useRouter();
  const { update } = useSession();
  const isMobile = useIsMobile(900);
  const setEditingConfig = useAvatarStore((s) => s.setEditingConfig);
  const setPendingCapture = useAvatarStore((s) => s.setPendingCapture);
  const editingColors = useAvatarStore((s) => s.editingColors);
  const editingVariants = useAvatarStore((s) => s.editingVariants);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);

  const parsed = parseAvatarConfig(initialAvatarConfig);
  const initialColors = editingColors ?? parsed?.colors;
  const initialVariants = editingVariants ?? parsed?.variants;
  const autoSpin = !parsed && !editingColors;

  useEffect(() => {
    fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((d: { library?: AvatarVariantLibrary } | null) => { if (d?.library) setLibrary(d.library); })
      .catch(() => {});
  }, []);

  const handleAvatarSave = useCallback(
    async (colors: Record<AvatarPart, string>, variants: Record<AvatarPart, number>) => {
      setPendingCapture({ colors, variants });
      const avatarConfig: V2Config = { format: "v2", colors, variants };
      await fetch("/api/users/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarConfig }),
      }).catch(() => {});
    },
    [setPendingCapture]
  );

  const handleAvatarChange = useCallback(
    (colors: Record<AvatarPart, string>, variants: Record<AvatarPart, number>) => setEditingConfig(colors, variants),
    [setEditingConfig]
  );

  const continueLabel = next.startsWith("/continuum/") ? "Continue to the continuum" : "Continue";

  async function handleContinue() {
    if (loading) return;
    const n = name.trim();
    if (!n) { setError("please choose a name"); return; }
    setError(""); setLoading(true);
    try {
      if (editingColors && editingVariants) {
        await fetch("/api/users/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarConfig: { format: "v2", colors: editingColors, variants: editingVariants } }),
        }).catch(() => {});
      }
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) { setError("something went wrong — try again"); return; }
      await update();
      router.push(next);
    } catch {
      setError("something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }

  const logo = (
    <Image src="/logo.svg" alt="communi*culture" width={361} height={65} priority
      style={{ width: "clamp(120px, 18vw, 180px)", height: "auto", display: "block" }} />
  );

  const heading = (
    <>
      <h1 style={{ fontFamily: INTER, fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>
        Set up your profile
      </h1>
      <p style={{ fontFamily: INTER, fontSize: 14, color: "#888", margin: "0 0 16px" }}>
        Choose a name and make your avatar your own.
      </p>
      <label style={{ fontFamily: INTER, fontSize: 13, color: "#6b6b6b", display: "block", marginBottom: 6 }}>Your name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Josh"
        autoFocus
        maxLength={60}
        style={{
          width: "100%", boxSizing: "border-box", border: "1.5px solid #AAAAAA", borderRadius: 10,
          padding: "12px 16px", fontFamily: INTER, fontSize: 16, color: "#1a1a1a", outline: "none",
        }}
      />
    </>
  );

  const editor = library ? (
    <AvatarEditor
      library={library}
      initialColors={initialColors}
      initialVariants={initialVariants}
      autoSpin={autoSpin}
      onSave={handleAvatarSave}
      onChange={handleAvatarChange}
      embedded
    />
  ) : (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER, color: "#bbb" }}>loading…</div>
  );

  const cta = (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {error && <span style={{ fontFamily: INTER, color: "#c00", fontSize: 13 }}>{error}</span>}
      <div style={{ marginLeft: "auto" }}>
        <PillButton variant="primary" label={continueLabel} onClick={handleContinue} loading={loading} disabled={!name.trim()} />
      </div>
    </div>
  );

  // ── Desktop: form/heading on the left, avatar on the right ──────────────────
  if (!isMobile) {
    return (
      <div style={{ height: "100svh", display: "flex", flexDirection: "column", background: "white", overflow: "hidden" }}>
        <div style={{ padding: "20px clamp(20px, 4vw, 48px) 8px", flexShrink: 0 }}>{logo}</div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "stretch", gap: "clamp(24px, 4vw, 64px)", padding: "0 clamp(20px, 4vw, 48px) 24px" }}>
          {/* Left: heading + name + CTA */}
          <div style={{ flex: "0 0 clamp(280px, 32vw, 420px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {heading}
            <div style={{ marginTop: 28 }}>{cta}</div>
          </div>
          {/* Right: avatar editor (fills the column, scales to fit) */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{editor}</div>
        </div>
      </div>
    );
  }

  // ── Mobile: stacked ─────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100svh", display: "flex", flexDirection: "column", background: "white", overflow: "hidden" }}>
      <div style={{ padding: "16px clamp(16px, 4vw, 32px) 4px", flexShrink: 0 }}>{logo}</div>
      <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", padding: "8px clamp(16px, 4vw, 32px) 0", flexShrink: 0 }}>{heading}</div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginTop: 8 }}>{editor}</div>
      <div style={{ marginTop: "auto", padding: "14px clamp(16px, 4vw, 32px)", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>{cta}</div>
    </div>
  );
}
