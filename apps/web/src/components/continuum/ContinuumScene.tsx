"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/store/avatarStore";
import { useContinuumStore } from "@/store/continuumStore";

// ─── constants ────────────────────────────────────────────────────────────────

const CROWD_WIDTH = 24; // world units, x = (position – 0.5) * 24
const AVATAR_SCALE = 0.38;
const CURRENT_SCALE = 0.43;
// Three rows, centred at y=0 so the camera lookAt=[0,0,0] frames them well
const ROW_YS = [-1.1, 0, 1.1];
const BLUE = "#0083FF";

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

function colorsFromConfig(cfg: AvatarConfig | null | undefined): Record<AvatarPart, string> {
  const base = cfg && Object.keys(cfg).length > 0 ? cfg : DEFAULT_AVATAR;
  return Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, (base as any)[p] ?? DEFAULT_AVATAR[p as keyof AvatarConfig] ?? "#cccccc"])
  ) as Record<AvatarPart, string>;
}

// ─── camera controller ────────────────────────────────────────────────────────

function CrowdCamera() {
  const { size, camera } = useThree();
  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    // Show ≈±13 world units horizontally (accounting for the angled camera
    // whose right-vector contributes ~0.866 of world-X to screen-X)
    ortho.zoom = size.width / 22;
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
    <group onPointerMissed={() => onSelectUser(null)}>
      {/* Participants from store */}
      {sorted.map((p, i) => {
        const isCurrent = p.userId === currentUserId;
        const pos = isCurrent ? localPosition : p.position;
        const [x, y] = avatarXY(pos, p.userId, i);
        const scale = isCurrent ? CURRENT_SCALE : AVATAR_SCALE;
        const colors = isCurrent
          ? colorsFromConfig(currentUserAvatarConfig)
          : colorsFromConfig(p.avatarConfig);

        return (
          <group
            key={p.userId}
            position={[x, y, 0]}
            scale={scale}
            onClick={(e) => {
              e.stopPropagation();
              onSelectUser(p.userId === selectedUserId ? null : p.userId);
            }}
          >
            {isCurrent && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.38, 0.55, 32]} />
                <meshBasicMaterial color={BLUE} />
              </mesh>
            )}
            <CharacterGroup
              library={library}
              variantIndices={DEFAULT_VARIANTS}
              colors={colors}
              showOutline={false}
            />
          </group>
        );
      })}

      {/* Ghost avatar if current user hasn't placed yet — shows at localPosition */}
      {!isInCrowd && (
        <group position={[posToX(localPosition), ROW_YS[0], 0]} scale={CURRENT_SCALE}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.38, 0.55, 32]} />
            <meshBasicMaterial color={BLUE} />
          </mesh>
          <CharacterGroup
            library={library}
            variantIndices={DEFAULT_VARIANTS}
            colors={colorsFromConfig(currentUserAvatarConfig)}
            showOutline={false}
          />
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
          camera={{ position: [2.165, 3.7, 3.75], zoom: 46, near: -100, far: 100 }}
          gl={{ antialias: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <CrowdCamera />
          <color attach="background" args={["#ffffff"]} />
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 8, 5]} intensity={0.8} />
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
