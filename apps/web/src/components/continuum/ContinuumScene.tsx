"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { meshBounds } from "@react-three/drei";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/store/avatarStore";
import { useContinuumStore } from "@/store/continuumStore";

// ─── constants ────────────────────────────────────────────────────────────────

const CROWD_WIDTH = 24;
const AVATAR_SCALE = 0.59;
const CURRENT_SCALE = 0.67;
const ROW_YS = [-1.1, 0, 1.1];
const BLUE = "#0083FF";
const SYNTHETIC_COLORS = Object.fromEntries(
  ["hair","head","face","neck","arms","body","pants","legs","shoes"].map((p) => [p, BLUE])
) as Record<AvatarPart, string>;

// Pre-join animation constants — mirror the SVG bar geometry
const BAR_FRAC = 1 / 3;
const CENTER_L = 41 / 523;       // left edge of center text rect (7.84% from bar left)
const CENTER_R = 476.725 / 523;  // right edge of center text rect (91.15% from bar left)
const SPEED = 0.00008;           // bar travel speed, fraction per ms

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
  const distance = Math.abs(pos - 0.5);
  const t = distance / 0.5;
  const degrees = 15 + t * 60;
  const sign = pos >= 0.5 ? -1 : 1;
  return sign * (degrees * Math.PI / 180);
}

function colorsFromConfig(cfg: AvatarConfig | null | undefined): Record<AvatarPart, string> {
  const raw = cfg as any;
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

// ─── pre-join bouncing avatar ─────────────────────────────────────────────────
// Renders inside the main crowd canvas before the user has placed themselves.
// Uses useFrame for zero-cost animation and DOM canvas listeners for drag.

interface PreJoinProps {
  library: AvatarVariantLibrary;
  avatarConfig: AvatarConfig;
  onBarFracUpdate: (frac: number) => void;
  onPreJoinCommit: (position: number) => void;
}

function PreJoinAvatar({ library, avatarConfig, onBarFracUpdate, onPreJoinCommit }: PreJoinProps) {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const isDraggingRef = useRef(false);
  const barFracRef = useRef(0);
  const dirRef = useRef(1);
  const avatarFracRef = useRef(BAR_FRAC / 2); // center of bar initially

  // Stable refs so canvas event listeners never need to be re-added
  const onBarFracUpdateRef = useRef(onBarFracUpdate);
  const onPreJoinCommitRef = useRef(onPreJoinCommit);
  onBarFracUpdateRef.current = onBarFracUpdate;
  onPreJoinCommitRef.current = onPreJoinCommit;

  const colors = useMemo(() => colorsFromConfig(avatarConfig), [avatarConfig]);
  const variants = useMemo(() => variantsFromConfig(avatarConfig), [avatarConfig]);

  // Convert screen x to 0-1 continuum fraction using the orthographic camera
  const screenToFrac = useCallback(
    (clientX: number): number => {
      const canvas = gl.domElement;
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const cam = camera as THREE.OrthographicCamera;
      // visible world width = (right - left) / zoom; with default R3F ortho setup
      // left = -size.width/2, right = size.width/2, so visible world width = size.width / zoom
      const visibleHalfWidth = (cam.right - cam.left) / (2 * cam.zoom);
      const worldX = ndcX * visibleHalfWidth;
      return Math.max(0, Math.min(1, worldX / CROWD_WIDTH + 0.5));
    },
    [camera, gl]
  );

  // Canvas DOM events handle dragging across the full canvas, not just the avatar mesh
  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      avatarFracRef.current = screenToFrac(e.clientX);
    };

    const onUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      canvas.style.cursor = "";
      const frac = screenToFrac(e.clientX);
      avatarFracRef.current = frac;
      onBarFracUpdateRef.current(barFracRef.current); // restore bar visibility
      onPreJoinCommitRef.current(frac);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [gl, screenToFrac]);

  useFrame((_, delta) => {
    const dt = Math.min(delta * 1000, 50);

    if (!isDraggingRef.current) {
      barFracRef.current += dirRef.current * SPEED * dt;
      const maxPos = 1 - BAR_FRAC;
      if (barFracRef.current >= maxPos) { barFracRef.current = maxPos; dirRef.current = -1; }
      if (barFracRef.current <= 0) { barFracRef.current = 0; dirRef.current = 1; }

      // Avatar stays still until the center rect edge sweeps past it
      const cLeft  = barFracRef.current + BAR_FRAC * CENTER_L;
      const cRight = barFracRef.current + BAR_FRAC * CENTER_R;
      avatarFracRef.current = Math.max(cLeft, Math.min(cRight, avatarFracRef.current));

      onBarFracUpdateRef.current(barFracRef.current);
    }

    if (groupRef.current) {
      groupRef.current.position.x = posToX(avatarFracRef.current);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[posToX(BAR_FRAC / 2), 0, 0]}
      scale={CURRENT_SCALE}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDraggingRef.current = true;
        gl.domElement.style.cursor = "grabbing";
        onBarFracUpdateRef.current(-1); // -1 signals: hide the bar div
        (e.nativeEvent.target as HTMLElement).setPointerCapture(e.nativeEvent.pointerId);
      }}
    >
      {/* Hit box — meshBounds uses bounding sphere instead of per-triangle raycasting */}
      <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
        <boxGeometry args={[1.4, 2.5, 1.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.38, 0.55, 32]} />
          <meshBasicMaterial color={BLUE} />
        </mesh>
        <CharacterGroup
          library={library}
          variantIndices={variants}
          colors={colors}
          showOutline={true}
        />
      </group>
    </group>
  );
}

// ─── inner scene (reads store) ────────────────────────────────────────────────

interface SceneProps {
  library: AvatarVariantLibrary;
  currentUserId: string;
  currentUserAvatarConfig: AvatarConfig;
  localPosition: number;
  selectedUserId: string | null;
  onSelectUser: (uid: string | null) => void;
  isInCrowd: boolean;
  onBarFracUpdate: (frac: number) => void;
  onPreJoinCommit: (position: number) => void;
}

function CrowdScene({
  library, currentUserId, currentUserAvatarConfig,
  localPosition, selectedUserId, onSelectUser,
  isInCrowd, onBarFracUpdate, onPreJoinCommit,
}: SceneProps) {
  const participants = useContinuumStore((s) => s.participants);

  const sorted = useMemo(
    () => Object.values(participants).sort((a, b) => a.position - b.position),
    [participants]
  );

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
          // Outer group: position + scale + click (NOT rotated so hit box always faces camera)
          <group
            key={p.userId}
            position={[x, y, 0]}
            scale={scale}
            onClick={(e) => {
              e.stopPropagation();
              onSelectUser(p.userId === selectedUserId ? null : p.userId);
            }}
          >
            <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
              <boxGeometry args={[1.4, 2.5, 1.4]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {/* Inner group: Y rotation for visual appearance */}
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
        <PreJoinAvatar
          library={library}
          avatarConfig={currentUserAvatarConfig}
          onBarFracUpdate={onBarFracUpdate}
          onPreJoinCommit={onPreJoinCommit}
        />
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
  isInCrowd: boolean;
  onBarFracUpdate: (frac: number) => void;
  onPreJoinCommit: (position: number) => void;
}

export function ContinuumScene({
  currentUserId, currentUserAvatarConfig,
  localPosition, selectedUserId, onSelectUser,
  isInCrowd, onBarFracUpdate, onPreJoinCommit,
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
            isInCrowd={isInCrowd}
            onBarFracUpdate={onBarFracUpdate}
            onPreJoinCommit={onPreJoinCommit}
          />
        </Canvas>
      )}
    </div>
  );
}
