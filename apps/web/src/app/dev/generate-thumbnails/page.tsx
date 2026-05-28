"use client";

import { useEffect, useState, useCallback } from "react";
import { AvatarHeadCapture } from "@/components/avatar/AvatarHeadCapture";
import { getAvatarLibrary } from "@/lib/avatarLibraryCache";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

const INTER = "Inter, sans-serif";

interface SyntheticUser {
  id: string;
  name: string | null;
  avatarConfig: any;
}

interface Captured {
  id: string;
  name: string | null;
  url: string;
}

function colorsFromConfig(cfg: any): Record<AvatarPart, string> {
  const source = cfg?.format === "v2" ? cfg.colors : cfg;
  return Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, source?.[p] ?? "#cccccc"])
  ) as Record<AvatarPart, string>;
}

function variantsFromConfig(cfg: any): Record<AvatarPart, number> {
  if (cfg?.format === "v2" && cfg.variants) {
    return Object.fromEntries(
      AVATAR_PARTS.map((p) => [p, cfg.variants[p] ?? 0])
    ) as Record<AvatarPart, number>;
  }
  return Object.fromEntries(AVATAR_PARTS.map((p) => [p, 0])) as Record<AvatarPart, number>;
}

export default function GenerateThumbnailsPage() {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
  const [users, setUsers] = useState<SyntheticUser[]>([]);
  const [index, setIndex] = useState(0);
  const [captured, setCaptured] = useState<Captured[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAvatarLibrary().then(setLibrary).catch(console.error);
  }, []);

  useEffect(() => {
    fetch("/api/dev/synthetic-users")
      .then(r => r.json())
      .then(({ users: u }: { users: SyntheticUser[] }) => setUsers(u))
      .catch(console.error);
  }, []);

  const current = users[index] ?? null;
  const total = users.length;
  const done = captured.length;
  const finished = total > 0 && done >= total;

  const handleCapture = useCallback(async (dataUrl: string) => {
    if (!current || saving) return;
    setSaving(true);
    await fetch("/api/dev/set-thumbnail", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: current.id, thumbnail: dataUrl }),
    });
    setCaptured(prev => [...prev, { id: current.id, name: current.name, url: dataUrl }]);
    setIndex(i => i + 1);
    setSaving(false);
  }, [current, saving]);

  return (
    <div style={{ padding: 40, fontFamily: INTER }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Generate Synthetic Thumbnails</h1>

      {total === 0 && <p style={{ color: "#999" }}>Loading…</p>}

      {total > 0 && !finished && (
        <p style={{ color: "#555", marginBottom: 16 }}>
          {saving ? `Saving ${current?.name ?? current?.id}…` : `Rendering ${current?.name ?? current?.id ?? "…"}`}
        </p>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ height: 8, background: "#eee", borderRadius: 4, overflow: "hidden", width: 400 }}>
            <div style={{
              height: "100%", background: "#0083FF", borderRadius: 4,
              width: `${(done / total) * 100}%`, transition: "width 0.2s",
            }} />
          </div>
          <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>
            {finished ? `✓ All ${total} thumbnails generated` : `${done} / ${total}`}
          </p>
        </div>
      )}

      {/* Live thumbnail grid */}
      {captured.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 40,
          maxHeight: 480, overflowY: "auto",
        }}>
          {captured.map(c => (
            <div key={c.id} style={{ textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt={c.name ?? ""} style={{ width: 64, height: 64, objectFit: "contain", display: "block" }} />
              <p style={{ fontSize: 10, color: "#999", margin: "2px 0 0", width: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Off-screen render — key forces full Canvas remount per user */}
      {library && current && !finished && (
        <div key={current.id} style={{ position: "fixed", left: -9999, top: 0, opacity: 0, pointerEvents: "none" }}>
          <AvatarHeadCapture
            library={library}
            variantIndices={variantsFromConfig(current.avatarConfig)}
            colors={colorsFromConfig(current.avatarConfig)}
            onCapture={handleCapture}
          />
        </div>
      )}
    </div>
  );
}
