"use client";

import { useEffect, useState } from "react";
import { AvatarEditor } from "./AvatarEditor";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";

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
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);

  const parsed = parseAvatarConfig(user.avatarConfig);

  useEffect(() => {
    fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((data: { library: AvatarVariantLibrary } | null) => {
        if (data?.library) setLibrary(data.library);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (
    colors: Record<AvatarPart, string>,
    variants: Record<AvatarPart, number>
  ) => {
    const avatarConfig: V2Config = { format: "v2", colors, variants };
    await fetch("/api/users/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarConfig }),
    });
  };

  if (!library) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-black/30 lowercase font-mono">
        loading…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ minHeight: "calc(100vh - 52px)" }}>
      <AvatarEditor
        library={library}
        initialColors={parsed?.colors}
        initialVariants={parsed?.variants}
        onSave={handleSave}
      />
    </div>
  );
}
