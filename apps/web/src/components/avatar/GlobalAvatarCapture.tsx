"use client";

import { useEffect, useState } from "react";
import { useAvatarStore } from "@/store/avatarStore";
import { AvatarHeadCapture } from "./AvatarHeadCapture";
import { getAvatarLibrary } from "@/lib/avatarLibraryCache";
import type { AvatarVariantLibrary } from "@/components/avatar-builder/types";

export function GlobalAvatarCapture() {
  const pendingCapture = useAvatarStore((s) => s.pendingCapture);
  const setThumbnailUrl = useAvatarStore((s) => s.setThumbnailUrl);
  const setPendingCapture = useAvatarStore((s) => s.setPendingCapture);
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);

  // Load the library so it's ready when a capture is queued. Re-runs while a
  // capture is pending but the library still isn't loaded, so a transient fetch
  // failure self-heals on the next capture instead of breaking captures for good.
  useEffect(() => {
    if (library) return;
    let cancelled = false;
    getAvatarLibrary()
      .then((l) => { if (!cancelled) setLibrary(l); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [library, pendingCapture]);

  const handleCapture = async (dataUrl: string) => {
    setThumbnailUrl(dataUrl);
    setPendingCapture(null);
    await fetch("/api/users/avatar-thumbnail", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnail: dataUrl }),
    });
  };

  if (!pendingCapture || !library) return null;

  return (
    <div style={{
      position: "fixed", right: 0, bottom: 0,
      width: 300, height: 300,
      opacity: 0, pointerEvents: "none", zIndex: -1,
    }}>
      <AvatarHeadCapture
        library={library}
        variantIndices={pendingCapture.variants}
        colors={pendingCapture.colors}
        onCapture={handleCapture}
      />
    </div>
  );
}
