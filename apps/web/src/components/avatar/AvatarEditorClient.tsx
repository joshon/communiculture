"use client";

import { useEffect, useState } from "react";
import { useAvatarStore, type AvatarConfig } from "@/store/avatarStore";
import { AvatarEditor } from "./AvatarEditor";

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
  const setConfig = useAvatarStore((s) => s.setConfig);
  const [profile, setProfile] = useState({
    name: user.name ?? "",
    slogan: user.slogan ?? "",
    url: user.url ?? "",
  });
  const [saving, setSaving] = useState(false);

  // Hydrate store with saved avatar config on mount
  useEffect(() => {
    if (user.avatarConfig && typeof user.avatarConfig === "object") {
      setConfig(user.avatarConfig as AvatarConfig);
    }
  }, []);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <AvatarEditor />

      <div className="border-t pt-8">
        <h3 className="text-comm-blue lowercase mb-4">profile info</h3>
        <div className="grid gap-3 max-w-md">
          {(["name", "slogan", "url"] as const).map((field) => (
            <div key={field} className="flex items-center gap-3">
              <label className="text-sm text-gray-500 lowercase w-16">{field}</label>
              <input
                type="text"
                value={profile[field]}
                onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                className="flex-1 border-b border-gray-300 focus:border-comm-blue outline-none text-sm py-1 lowercase"
              />
            </div>
          ))}
          <button
            onClick={handleProfileSave}
            disabled={saving}
            className="mt-2 bg-comm-blue text-white px-4 py-2 text-xs lowercase hover:bg-blue-800 disabled:opacity-50 w-fit"
          >
            {saving ? "saving..." : "save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
