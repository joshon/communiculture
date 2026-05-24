"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { AvatarEditor } from "./AvatarEditor";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { useAvatarStore } from "@/store/avatarStore";
import { DashboardAvatarHead } from "@/components/dashboard/DashboardAvatarHead";
import { useIsMobile } from "@/hooks/useIsMobile";

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

interface Props {
  user: {
    name: string | null;
    email: string | null;
    slogan: string | null;
    url: string | null;
    avatarConfig: unknown;
  };
}

export function AvatarEditorClient({ user }: Props) {
  const setEditingConfig = useAvatarStore((s) => s.setEditingConfig);
  const setPendingCapture = useAvatarStore((s) => s.setPendingCapture);
  const editingColors = useAvatarStore((s) => s.editingColors);
  const editingVariants = useAvatarStore((s) => s.editingVariants);
  const thumbnailUrl = useAvatarStore((s) => s.thumbnailUrl);
  const isMobile = useIsMobile(1024);

  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);

  const parsed = parseAvatarConfig(user.avatarConfig);

  // Prefer in-memory Zustand edits over (possibly stale) server DB value
  const initialColors  = editingColors  ?? parsed?.colors;
  const initialVariants = editingVariants ?? parsed?.variants;

  useEffect(() => {
    fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((data: { library: AvatarVariantLibrary } | null) => {
        if (!data?.library) return;
        setLibrary(data.library);
      })
      .catch(() => {});
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async (
    colors: Record<AvatarPart, string>,
    variants: Record<AvatarPart, number>
  ) => {
    setPendingCapture({ colors, variants });
    const avatarConfig: V2Config = { format: "v2", colors, variants };
    await fetch("/api/users/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarConfig }),
    }).catch(() => {});
  }, [setPendingCapture]);

  const handleChange = useCallback((
    colors: Record<AvatarPart, string>,
    variants: Record<AvatarPart, number>
  ) => {
    setEditingConfig(colors, variants);
  }, [setEditingConfig]);

  const autoSpin = !parsed && !editingColors;

  const crumbs = (fontSize: number) => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, fontFamily: INTER, fontSize }}>
      <Link href="/dashboard" className="ae-crumb">home</Link>
      <span style={{ color: "#ccc" }}>|</span>
      <Link href="/profile" className="ae-crumb">edit profile</Link>
      <span style={{ color: "#ccc" }}>|</span>
      <span style={{ color: "#1a1a1a", fontWeight: 500 }}>edit avatar</span>
    </div>
  );

  const header = isMobile ? (
    <>
      <style>{`.ae-crumb { color: #aaa; text-decoration: none; transition: color 0.2s; } .ae-crumb:hover { color: #1a1a1a; }`}</style>
      <header style={{
        position: "sticky", top: 0, zIndex: 20, background: "white",
        display: "flex", flexDirection: "column",
        padding: "10px 16px 6px", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/dashboard" style={{ display: "block", flexShrink: 0 }}>
            <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
              style={{ width: 140, height: "auto", display: "block" }} priority />
          </Link>
          <DashboardAvatarHead thumbnailUrl={thumbnailUrl ?? null} size="55px" />
        </div>
        {crumbs(13)}
      </header>
    </>
  ) : (
    <>
      <style>{`.ae-crumb { color: #aaa; text-decoration: none; transition: color 0.2s; } .ae-crumb:hover { color: #1a1a1a; }`}</style>
      <header style={{
        position: "sticky", top: 0, zIndex: 20, background: "white",
        display: "flex", alignItems: "center",
        padding: "16px clamp(16px, 4vw, 32px)", gap: 16,
      }}>
        <Link href="/dashboard" style={{ display: "block", flexShrink: 0 }}>
          <Image src="/logo.svg" alt="communi*culture" width={208} height={41}
            style={{ width: "clamp(120px, 20vw, 180px)", height: "auto", display: "block" }} priority />
        </Link>
        <div style={{ flex: 1 }}>{crumbs(16)}</div>
        <div style={{ flexShrink: 0 }}>
          <DashboardAvatarHead thumbnailUrl={thumbnailUrl ?? null} size="60px" />
        </div>
      </header>
    </>
  );

  const wrapperStyle = isMobile
    ? { background: "white", height: "100svh", display: "flex", flexDirection: "column" as const, overflow: "hidden" }
    : { background: "white" };

  if (!library) {
    return (
      <div style={wrapperStyle}>
        {header}
        <div className="flex items-center justify-center h-64 text-xs text-black/30 lowercase font-mono">
          loading…
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      {header}
      <AvatarEditor
        library={library}
        initialColors={initialColors}
        initialVariants={initialVariants}
        autoSpin={autoSpin}
        onSave={handleSave}
        onChange={handleChange}
      />
    </div>
  );
}
