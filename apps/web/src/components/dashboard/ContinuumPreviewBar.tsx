"use client";

import { Canvas } from "@react-three/fiber";
import { useState, useEffect } from "react";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import type { AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { getAvatarLibrary } from "@/lib/avatarLibraryCache";
import type { AvatarVariantLibrary } from "@/components/avatar-builder/types";

const DEFAULT_INDICES = Object.fromEntries(
  AVATAR_PARTS.map((p) => [p, 0])
) as Record<AvatarPart, number>;

const DOT_COUNT = 25;
const AVATAR_W = 34;
const AVATAR_H = 44;
const BAR_H = 14;

interface Props {
  positions: number[];
  userPosition: number | null;
  colors: Record<AvatarPart, string>;
}

export function ContinuumPreviewBar({ positions, userPosition, colors }: Props) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);

  useEffect(() => {
    if (userPosition !== null) {
      getAvatarLibrary().then(setLibrary);
    }
  }, [userPosition]);

  return (
    <div style={{ position: "relative", width: "100%", height: AVATAR_H + BAR_H }}>
      {/* Dots bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: BAR_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: AVATAR_W / 2,
        paddingRight: AVATAR_W / 2,
        boxSizing: "border-box",
      }}>
        {Array.from({ length: DOT_COUNT }).map((_, i) => {
          const frac = i / (DOT_COUNT - 1);
          const nearParticipant = positions.some(
            (p) => Math.abs(p - frac) < 0.6 / DOT_COUNT
          );
          const isMajor = i % 5 === 0;
          return (
            <div
              key={i}
              style={{
                width: isMajor ? 5 : 3,
                height: isMajor ? 5 : 3,
                borderRadius: "50%",
                background: nearParticipant ? "#777" : "#ccc",
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      {/* User avatar at their position */}
      {userPosition !== null && library && (
        <div style={{
          position: "absolute",
          bottom: BAR_H - 6,
          left: `calc(${userPosition * 100}% - ${AVATAR_W / 2}px)`,
          width: AVATAR_W,
          height: AVATAR_H,
          pointerEvents: "none",
        }}>
          <Canvas
            orthographic
            camera={{ position: [2.165, 3.7, 3.75], zoom: 130, near: -100, far: 100 }}
            gl={{ alpha: true }}
            style={{ background: "transparent", width: "100%", height: "100%" }}
          >
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 8, 5]} intensity={0.8} />
            <CharacterGroup
              library={library}
              variantIndices={DEFAULT_INDICES}
              colors={colors}
              showOutline={false}
            />
          </Canvas>
        </div>
      )}
    </div>
  );
}
