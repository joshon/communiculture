"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { meshBounds } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/store/avatarStore";
import { useContinuumStore } from "@/store/continuumStore";

// ─── constants ────────────────────────────────────────────────────────────────

const CROWD_WIDTH = 24; // world units, x = (position – 0.5) * 24
const AVATAR_SCALE = 0.59;  // 0.51 * 1.15
const CURRENT_SCALE = 0.67; // 0.58 * 1.15
const ROW_YS = [-1.1, 0, 1.1];
const BLUE = "#0083FF";
const SYNTHETIC_COLORS = Object.fromEntries(
  ["hair","head","face","neck","arms","body","pants","legs","shoes"].map((p) => [p, BLUE])
) as Record<AvatarPart, string>;

// ─── helpers ──────────────────────────────────────────────────────────────────

function posToX(pos: number) {
  return (pos - 0.5) * CROWD_WIDTH;
}

function seededRand(userId: string, salt: string): number {
  let h = 0;
  const s = userId + salt;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 10000) / 10000;
}

function avatarXY(pos: number, userId: string, rowIndex: number): [number, number] {
  const jitterX = (seededRand(userId, "x") - 0.5) * 0.5;
  const jitterY = (seededRand(userId, "y") - 0.5) * 0.2;
  return [posToX(pos) + jitterX, ROW_YS[rowIndex % ROW_YS.length] + jitterY];
}

const DEFAULT_VARIANTS = Object.fromEntries(
  AVATAR_PARTS.map((p) => [p, 0])
) as Record<AvatarPart, number>;

function avatarRotationY(pos: number): number {
  const distance = Math.abs(pos - 0.5); // 0 at center, 0.5 at extremes
  const t = distance / 0.5; // 0 → 1
  const degrees = 15 + t * 60; // 15° at center, 75° at extremes
  const sign = pos >= 0.5 ? -1 : 1; // left side faces right (+), right side faces left (-)
  return sign * (degrees * Math.PI / 180);
}

function colorsFromConfig(cfg: AvatarConfig | null | undefined): Record<AvatarPart, string> {
  const raw = cfg as any;
  // v2 format stores colors nested under .colors
  const source = raw?.format === "v2" ? raw.colors : raw;
  const base = source && Object.keys(source).length > 0 ? source : DEFAULT_AVATAR;
  return Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, base[p] ?? DEFAULT_AVATAR[p as keyof AvatarConfig] ?? "#cccccc"])
  ) as Record<AvatarPart, string>;
}

function variantsFromConfig(cfg: AvatarConfig | null | undefined): Record<AvatarPart, number> {
  const raw = cfg as any;
  if (raw?.format === "v2" && raw.variants) {
    return Object.fromEntries(
      AVATAR_PARTS.map((p) => [p, raw.variants[p] ?? 0])
    ) as Record<AvatarPart, number>;
  }
  return DEFAULT_VARIANTS;
}

// For bots: derive variant indices from userId so each bot looks distinct and
// is consistent across page loads without requiring DB variant data.
function variantsForBot(userId: string, library: AvatarVariantLibrary): Record<AvatarPart, number> {
  return Object.fromEntries(
    AVATAR_PARTS.map((p) => {
      const count = (library[p as keyof typeof library] as any[])?.length ?? 1;
      const idx = Math.floor(seededRand(userId, `v_${p}`) * count);
      return [p, Math.min(Math.max(0, idx), count - 1)];
    })
  ) as Record<AvatarPart, number>;
}

// ─── camera controller ────────────────────────────────────────────────────────

function CrowdCamera() {
  const { size, camera } = useThree();
  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = size.width / 26;
    ortho.updateProjectionMatrix();
  }, [size.width, camera]);
  return null;
}

// ─── inner scene (reads store) ────────────────────────────────────────────────

interface SceneProps {
  library: AvatarVariantLibrary;
  currentUserId: string;
  currentUserAvatarConfig: AvatarConfig;
  localPosition: number;
  selectedUserId: string | null;
  onSelectUser: (uid: string | null) => void;
}

function CrowdScene({
  library, currentUserId, currentUserAvatarConfig,
  localPosition, selectedUserId, onSelectUser,
}: SceneProps) {
  const participants = useContinuumStore((s) => s.participants);

  const sorted = useMemo(
    () => Object.values(participants).sort((a, b) => a.position - b.position),
    [participants]
  );

  const isInCrowd = !!participants[currentUserId];

  return (
    <group>
      {sorted.map((p, i) => {
        const isCurrent = p.userId === currentUserId;
        const pos = isCurrent ? localPosition : p.position;
        const [x, y] = avatarXY(pos, p.userId, i);
        const scale = isCurrent ? CURRENT_SCALE : AVATAR_SCALE;
        const isBot = p.isSynthetic;
        const cfg = isCurrent ? currentUserAvatarConfig : p.avatarConfig;
        const colors = isBot ? SYNTHETIC_COLORS : colorsFromConfig(cfg);
        const variants = isBot
          ? variantsForBot(p.userId, library)
          : isCurrent ? variantsFromConfig(currentUserAvatarConfig) : variantsFromConfig(p.avatarConfig);

        const rotY = avatarRotationY(pos);

        return (
          // Outer group: handles position + scale + click. NOT rotated so hit box always faces camera.
          <group
            key={p.userId}
            position={[x, y, 0]}
            scale={scale}
            onClick={(e) => {
              e.stopPropagation();
              onSelectUser(p.userId === selectedUserId ? null : p.userId);
            }}
          >
            {/* Bounding-sphere hit area — meshBounds uses the sphere instead of per-triangle raycasting */}
            <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
              <boxGeometry args={[1.4, 2.5, 1.4]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Inner group: handles Y rotation for visual appearance */}
            <group rotation={[0, rotY, 0]}>
              {isCurrent && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                  <ringGeometry args={[0.38, 0.55, 32]} />
                  <meshBasicMaterial color={BLUE} />
                </mesh>
              )}
              <CharacterGroup
                library={library}
                variantIndices={variants}
                colors={colors}
                showOutline={true}
                outlineColor={isBot ? BLUE : undefined}
              />
            </group>
          </group>
        );
      })}

      {!isInCrowd && (
        <group position={[posToX(localPosition), ROW_YS[0], 0]} scale={CURRENT_SCALE}>
          <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
            <boxGeometry args={[1.4, 2.5, 1.4]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <group rotation={[0, avatarRotationY(localPosition), 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <ringGeometry args={[0.38, 0.55, 32]} />
              <meshBasicMaterial color={BLUE} />
            </mesh>
            <CharacterGroup
              library={library}
              variantIndices={variantsFromConfig(currentUserAvatarConfig)}
              colors={colorsFromConfig(currentUserAvatarConfig)}
              showOutline={true}
            />
          </group>
        </group>
      )}
    </group>
  );
}

// ─── public component ─────────────────────────────────────────────────────────

interface Props {
  currentUserId: string;
  currentUserAvatarConfig: AvatarConfig;
  localPosition: number;
  selectedUserId: string | null;
  onSelectUser: (uid: string | null) => void;
}

export function ContinuumScene({
  currentUserId, currentUserAvatarConfig,
  localPosition, selectedUserId, onSelectUser,
}: Props) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);

  useEffect(() => {
    fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((d) => setLibrary(d.library));
  }, []);

  return (
    <div style={{ width: "100%", height: 360 }}>
      {library && (
        <Canvas
          orthographic
          camera={{ position: [0, 8, 10], zoom: 46, near: -100, far: 100 }}
          gl={{ antialias: true }}
          style={{ width: "100%", height: "100%", filter: "saturate(1.6) contrast(1.08)" }}
          onPointerMissed={() => onSelectUser(null)}
        >
          <CrowdCamera />
          <color attach="background" args={["#ffffff"]} />
          <ambientLight intensity={1.8} />
          <directionalLight position={[5, 8, 5]} intensity={0.6} />
          <CrowdScene
            library={library}
            currentUserId={currentUserId}
            currentUserAvatarConfig={currentUserAvatarConfig}
            localPosition={localPosition}
            selectedUserId={selectedUserId}
            onSelectUser={onSelectUser}
          />
        </Canvas>
      )}
    </div>
  );
}
