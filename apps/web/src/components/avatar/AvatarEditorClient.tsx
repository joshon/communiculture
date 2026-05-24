"use client";

import { useEffect, useState, useCallback } from "react";
import { AvatarEditor } from "./AvatarEditor";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { useAvatarStore } from "@/store/avatarStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AppHeader } from "@/components/ui/AppHeader";

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

const BREADCRUMBS = [
  { label: "home", href: "/dashboard" },
  { label: "edit profile", href: "/profile" },
  { label: "edit avatar" },
];

export function AvatarEditorClient({ user }: Props) {
  const setEditingConfig = useAvatarStore((s) => s.setEditingConfig);
  const setPendingCapture = useAvatarStore((s) => s.setPendingCapture);
  const editingColors = useAvatarStore((s) => s.editingColors);
  const editingVariants = useAvatarStore((s) => s.editingVariants);
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

  const wrapperStyle = isMobile
    ? { background: "white", height: "100svh", display: "flex", flexDirection: "column" as const, overflow: "hidden" }
    : { background: "white" };

  if (!library) {
    return (
      <div style={wrapperStyle}>
        <AppHeader breadcrumbs={BREADCRUMBS} />
        <div className="flex items-center justify-center h-64 text-xs text-black/30 lowercase font-mono">
          loading…
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <AppHeader breadcrumbs={BREADCRUMBS} />
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
