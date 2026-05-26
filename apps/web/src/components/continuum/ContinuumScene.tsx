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

const CROWD_WIDTH = 24;   // world X units, position 0→100 maps to -12→+12
const AVATAR_SCALE = 0.59;
const CURRENT_SCALE = 0.67;
const BLUE = "#0083FF";
const SYNTHETIC_COLORS = Object.fromEntries(
  ["hair","head","face","neck","arms","body","pants","legs","shoes"].map((p) => [p, BLUE])
) as Record<AvatarPart, string>;

// Pre-join bar animation constants
const BAR_FRAC = 1 / 3;
const CENTER_L = 41 / 523;
const CENTER_R = 476.725 / 523;
const SPEED = 0.00008;

// Camera tilt factor: how much world Z contributes to screen Y
// Derived from camera at (0,8,10) looking at (0,0,0): up_cam.z component / magnitude
const Z_TO_SCREEN = 0.625;

// ─── helpers ──────────────────────────────────────────────────────────────────

function posToX(pos: number) {
  return (pos / 100 - 0.5) * CROWD_WIDTH;
}

function seededRand(userId: string, salt: string): number {
  let h = 0;
  const s = userId + salt;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return ((h >>> 0) % 10000) / 10000;
}

function avatarRotationY(pos: number): number {
  const distance = Math.abs(pos / 100 - 0.5);
  const t = distance / 0.5;
  const degrees = 15 + t * 60;
  const sign = pos >= 50 ? -1 : 1;
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
  return Object.fromEntries(AVATAR_PARTS.map((p) => [p, 0])) as Record<AvatarPart, number>;
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

// Convert screen coords → world (X, Z) on the Y=0 ground plane using raycasting
function screenToWorldXZ(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  canvas: HTMLCanvasElement
): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y=0
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, target);
  return [target.x, target.z];
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

interface PreJoinProps {
  library: AvatarVariantLibrary;
  avatarConfig: AvatarConfig;
  onBarFracUpdate: (frac: number) => void;
  onPreJoinCommit: (posX: number, posZ: number) => void;
}

function PreJoinAvatar({ library, avatarConfig, onBarFracUpdate, onPreJoinCommit }: PreJoinProps) {
  const { camera, gl, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const isDraggingRef = useRef(false);
  const barFracRef = useRef(0);
  const dirRef = useRef(1);
  const avatarXFracRef = useRef(BAR_FRAC / 2); // 0–1 fraction of container width

  // Stable refs for callbacks
  const onBarFracUpdateRef = useRef(onBarFracUpdate);
  const onPreJoinCommitRef = useRef(onPreJoinCommit);
  onBarFracUpdateRef.current = onBarFracUpdate;
  onPreJoinCommitRef.current = onPreJoinCommit;

  // Crowd depth and pre-join Z derived from canvas size
  // halfHeightCam = visible half-height in camera units = 13 * H/W
  // worldZBottom = Z value that places Y=0 object at canvas bottom = halfHeightCam / Z_TO_SCREEN
  const halfHeightCam = (size.height / size.width) * 13;
  const crowdDepth = halfHeightCam * 2 * 0.7 / Z_TO_SCREEN;
  const preJoinZ = halfHeightCam / Z_TO_SCREEN; // feet exactly at canvas bottom

  const preJoinZRef = useRef(preJoinZ);
  const crowdDepthRef = useRef(crowdDepth);
  preJoinZRef.current = preJoinZ;
  crowdDepthRef.current = crowdDepth;

  const colors = useMemo(() => colorsFromConfig(avatarConfig), [avatarConfig]);
  const variants = useMemo(() => variantsFromConfig(avatarConfig), [avatarConfig]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const [worldX] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      // X fraction of crowd width
      avatarXFracRef.current = Math.max(0, Math.min(1, worldX / CROWD_WIDTH + 0.5));
    };

    const onUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      canvas.style.cursor = "";
      const [worldX, worldZ] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      const posX = Math.max(0, Math.min(100, (worldX / CROWD_WIDTH + 0.5) * 100));
      const posZ = Math.max(0, Math.min(100, (worldZ / crowdDepthRef.current + 0.5) * 100));
      onBarFracUpdateRef.current(barFracRef.current);
      onPreJoinCommitRef.current(posX, posZ);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [gl, camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta * 1000, 50);

    if (!isDraggingRef.current) {
      barFracRef.current += dirRef.current * SPEED * dt;
      const maxPos = 1 - BAR_FRAC;
      if (barFracRef.current >= maxPos) { barFracRef.current = maxPos; dirRef.current = -1; }
      if (barFracRef.current <= 0) { barFracRef.current = 0; dirRef.current = 1; }

      const cLeft  = barFracRef.current + BAR_FRAC * CENTER_L;
      const cRight = barFracRef.current + BAR_FRAC * CENTER_R;
      avatarXFracRef.current = Math.max(cLeft, Math.min(cRight, avatarXFracRef.current));

      onBarFracUpdateRef.current(barFracRef.current);
    }

    if (groupRef.current) {
      groupRef.current.position.x = posToX(avatarXFracRef.current * 100);
      groupRef.current.position.z = preJoinZRef.current;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[posToX(BAR_FRAC / 2 * 100), 0, preJoinZ]}
      scale={CURRENT_SCALE}
      renderOrder={10}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDraggingRef.current = true;
        gl.domElement.style.cursor = "grabbing";
        onBarFracUpdateRef.current(-1);
        (e.nativeEvent.target as HTMLElement).setPointerCapture(e.nativeEvent.pointerId);
      }}
    >
      <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
        <boxGeometry args={[1.4, 2.5, 1.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <CharacterGroup
        library={library}
        variantIndices={variants}
        colors={colors}
        showOutline={true}
      />
    </group>
  );
}

// ─── inner scene ──────────────────────────────────────────────────────────────

interface SceneProps {
  library: AvatarVariantLibrary;
  currentUserId: string;
  currentUserAvatarConfig: AvatarConfig;
  localPosition: number;   // X, 0–100
  localPositionZ: number;  // Z, 0–100
  selectedUserId: string | null;
  onSelectUser: (uid: string | null) => void;
  isInCrowd: boolean;
  onBarFracUpdate: (frac: number) => void;
  onPreJoinCommit: (posX: number, posZ: number) => void;
  onPositionChange: (posX: number, posZ: number) => void;
  onPositionCommit: (posX: number, posZ: number) => void;
}

function CrowdScene({
  library, currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, onBarFracUpdate, onPreJoinCommit,
  onPositionChange, onPositionCommit,
}: SceneProps) {
  const { size, gl, camera } = useThree();
  const participants = useContinuumStore((s) => s.participants);

  // Crowd depth: how much world-Z the crowd spans (scales with canvas aspect ratio)
  const halfHeightCam = (size.height / size.width) * 13;
  const crowdDepth = halfHeightCam * 2 * 0.7 / Z_TO_SCREEN;

  const crowdDepthRef = useRef(crowdDepth);
  crowdDepthRef.current = crowdDepth;

  function posToZ(posZ: number) {
    return (posZ / 100 - 0.5) * crowdDepth;
  }

  // In-crowd drag state for current user's avatar
  const isDraggingRef = useRef(false);
  const onPositionChangeRef = useRef(onPositionChange);
  const onPositionCommitRef = useRef(onPositionCommit);
  onPositionChangeRef.current = onPositionChange;
  onPositionCommitRef.current = onPositionCommit;

  useEffect(() => {
    if (!isInCrowd) return;
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const [worldX, worldZ] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      const posX = Math.max(0, Math.min(100, (worldX / CROWD_WIDTH + 0.5) * 100));
      const posZ = Math.max(0, Math.min(100, (worldZ / crowdDepthRef.current + 0.5) * 100));
      onPositionChangeRef.current(posX, posZ);
    };

    const onUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      canvas.style.cursor = "";
      const [worldX, worldZ] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      const posX = Math.max(0, Math.min(100, (worldX / CROWD_WIDTH + 0.5) * 100));
      const posZ = Math.max(0, Math.min(100, (worldZ / crowdDepthRef.current + 0.5) * 100));
      onPositionCommitRef.current(posX, posZ);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [gl, camera, isInCrowd]);

  // Sort back-to-front so far avatars render first (correct depth for opaque geometry)
  const sorted = useMemo(
    () => Object.values(participants).sort((a, b) => a.positionZ - b.positionZ),
    [participants]
  );

  return (
    <group>
      {sorted.map((p) => {
        const isCurrent = p.userId === currentUserId;
        const pos  = isCurrent ? localPosition  : p.position;
        const posZ = isCurrent ? localPositionZ : p.positionZ;
        const x = posToX(pos);
        const z = posToZ(posZ);
        const scale = isCurrent ? CURRENT_SCALE : AVATAR_SCALE;
        const isBot = p.isSynthetic;
        const cfg = isCurrent ? currentUserAvatarConfig : p.avatarConfig;
        const colors = isBot ? SYNTHETIC_COLORS : colorsFromConfig(cfg);
        const variants = isBot
          ? variantsForBot(p.userId, library)
          : variantsFromConfig(isCurrent ? currentUserAvatarConfig : p.avatarConfig);
        const rotY = avatarRotationY(pos);

        return (
          <group
            key={p.userId}
            position={[x, 0, z]}
            scale={scale}
            onClick={(e) => {
              if (isDraggingRef.current) return;
              e.stopPropagation();
              onSelectUser(p.userId === selectedUserId ? null : p.userId);
            }}
            onPointerDown={isCurrent ? (e) => {
              e.stopPropagation();
              isDraggingRef.current = true;
              gl.domElement.style.cursor = "grabbing";
              (e.nativeEvent.target as HTMLElement).setPointerCapture(e.nativeEvent.pointerId);
            } : undefined}
          >
            <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
              <boxGeometry args={[1.4, 2.5, 1.4]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <group rotation={[0, rotY, 0]}>
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
  localPositionZ: number;
  selectedUserId: string | null;
  onSelectUser: (uid: string | null) => void;
  isInCrowd: boolean;
  onBarFracUpdate: (frac: number) => void;
  onPreJoinCommit: (posX: number, posZ: number) => void;
  onPositionChange: (posX: number, posZ: number) => void;
  onPositionCommit: (posX: number, posZ: number) => void;
}

export function ContinuumScene({
  currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, onBarFracUpdate, onPreJoinCommit,
  onPositionChange, onPositionCommit,
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
            localPositionZ={localPositionZ}
            selectedUserId={selectedUserId}
            onSelectUser={onSelectUser}
            isInCrowd={isInCrowd}
            onBarFracUpdate={onBarFracUpdate}
            onPreJoinCommit={onPreJoinCommit}
            onPositionChange={onPositionChange}
            onPositionCommit={onPositionCommit}
          />
        </Canvas>
      )}
    </div>
  );
}
