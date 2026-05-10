"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useAvatarStore, COLOR_PALETTE, type AvatarPart } from "@/store/avatarStore";
import { BlockyAvatar } from "./BlockyAvatar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PARTS: AvatarPart[] = ["hair", "head", "face", "neck", "arms", "body", "pants", "legs", "shoes"];

export function AvatarEditor() {
  const { config, selectedPart, setColor, setSelectedPart, randomize, setConfig } = useAvatarStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handlePartClick = (part: string) => {
    setSelectedPart(part as AvatarPart);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/users/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarConfig: config }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      hair: "#3d2b1f",
      head: "#f5c5a3",
      face: "#1a1a1a",
      neck: "#f5c5a3",
      arms: "#4a9e6b",
      body: "#4a9e6b",
      pants: "#3b6bcc",
      legs: "#3b6bcc",
      shoes: "#555555",
    });
    setSelectedPart(null);
  };

  return (
    <div className="flex gap-8 items-start">
      {/* 3D Preview */}
      <div className="relative">
        <div className="w-72 h-96 bg-gray-50 border border-gray-200">
          <Canvas camera={{ position: [0, 1.2, 4], fov: 45 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <BlockyAvatar
              config={config}
              position={[0, -1.2, 0]}
              onClick={handlePartClick}
            />
            <OrbitControls
              enablePan={false}
              minDistance={2}
              maxDistance={6}
              target={[0, 0.5, 0]}
            />
          </Canvas>
        </div>
        {/* Part labels around avatar (matching original layout) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-gray-500 lowercase">hair</div>
        <div className="absolute top-16 right-0 translate-x-full pl-2 text-xs text-gray-500 lowercase">head</div>
        <div className="absolute top-28 right-0 translate-x-full pl-2 text-xs text-gray-500 lowercase">face</div>
        <div className="absolute top-44 left-0 -translate-x-full pr-2 text-xs text-gray-500 lowercase">arms</div>
        <div className="absolute top-52 right-0 translate-x-full pl-2 text-xs text-gray-500 lowercase">body</div>
        <div className="absolute bottom-28 right-0 translate-x-full pl-2 text-xs text-gray-500 lowercase">pants</div>
        <div className="absolute bottom-16 right-0 translate-x-full pl-2 text-xs text-gray-500 lowercase">legs</div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 lowercase">shoes</div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        {/* Active part selector */}
        {selectedPart && (
          <div>
            <p className="text-xs text-gray-500 lowercase mb-2">
              editing: <span className="text-comm-blue">{selectedPart}</span>
            </p>
            <ColorGrid
              selected={config[selectedPart]}
              onSelect={(color) => setColor(selectedPart, color)}
            />
          </div>
        )}

        {!selectedPart && (
          <div>
            <p className="text-xs text-gray-500 lowercase mb-3">click a part to edit its color</p>
            <div className="grid grid-cols-2 gap-1">
              {PARTS.map((part) => (
                <button
                  key={part}
                  onClick={() => setSelectedPart(part)}
                  className="text-xs lowercase px-3 py-1.5 border border-gray-200 hover:border-comm-blue text-left flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-none inline-block border border-gray-300"
                    style={{ background: config[part] }}
                  />
                  {part}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-comm-blue text-white px-4 py-2 text-xs lowercase hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? "saving..." : "submit"}
          </button>
          <button
            onClick={handleReset}
            className="border border-gray-300 px-4 py-2 text-xs lowercase hover:border-gray-500"
          >
            reset
          </button>
          <button
            onClick={randomize}
            className="border border-gray-300 px-4 py-2 text-xs lowercase hover:border-gray-500"
          >
            random
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorGrid({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1 w-fit">
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className="w-7 h-7 border-2 transition-transform hover:scale-110"
          style={{
            background: color,
            borderColor: selected === color ? "#0033cc" : "transparent",
          }}
          title={color}
        />
      ))}
    </div>
  );
}
