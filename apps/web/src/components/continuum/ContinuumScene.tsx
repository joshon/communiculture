"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { meshBounds } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/store/avatarStore";
import { useContinuumStore } from "@/store/continuumStore";

// ─── platform SVG (pixel-art "DRAG YOURSELF INTO THE CONTINUUM" bar) ────────

// Simplified version of the original DragBarSVG — red background + white pixel paths, no drop-shadow filters.
const PLATFORM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 523 29" width="1046" height="58"><rect width="523" height="29" fill="#DA5F44"/><path fill="white" d="M9.5231 15.8142V12.2554H13.0818V15.8142H9.5231ZM13.0818 12.2554V8.6967H16.6406V12.2554H13.0818ZM13.0818 19.3729V15.8142H16.6406V19.3729H13.0818ZM16.6406 8.6967V5.13797H20.1993V8.6967H16.6406ZM16.6406 22.9316V19.3729H20.1993V22.9316H16.6406Z"/><path fill="white" d="M54.2858 22.9316V5.13797H57.8445V22.9316H54.2858ZM54.2858 8.6967V5.13797H61.4033V8.6967H54.2858ZM54.2858 22.9316V19.3729H61.4033V22.9316H54.2858ZM61.4033 19.3729V8.6967H64.962V19.3729H61.4033ZM67.8048 22.9316V5.13797H71.3636V22.9316H67.8048ZM67.8048 8.6967V5.13797H78.481V8.6967H67.8048ZM67.8048 15.8142V12.2554H74.9223V15.8142H67.8048ZM74.9223 12.2554V5.13797H78.481V12.2554H74.9223ZM74.9223 22.9316V15.8142H78.481V22.9316H74.9223ZM81.3238 22.9316V5.13797H84.8826V22.9316H81.3238ZM81.3238 8.6967V5.13797H92V8.6967H81.3238ZM81.3238 15.8142V12.2554H92V15.8142H81.3238ZM88.4413 22.9316V5.13797H92V22.9316H88.4413ZM94.8429 19.3729V8.6967H98.4016V19.3729H94.8429ZM98.4016 8.6967V5.13797H105.519V8.6967H98.4016ZM98.4016 22.9316V19.3729H105.519V22.9316H98.4016ZM101.96 22.9316V15.8142H105.519V22.9316H101.96ZM118.319 15.8142V5.13797H121.877V15.8142H118.319ZM118.319 15.8142V12.2554H128.995V15.8142H118.319ZM121.877 22.9316V15.8142H125.436V22.9316H121.877ZM125.436 15.8142V5.13797H128.995V15.8142H125.436ZM131.838 19.3729V8.6967H135.396V19.3729H131.838ZM135.396 8.6967V5.13797H138.955V8.6967H135.396ZM135.396 22.9316V19.3729H138.955V22.9316H135.396ZM138.955 19.3729V8.6967H142.514V19.3729H138.955ZM145.357 22.9316V5.13797H148.915V22.9316H145.357ZM145.357 22.9316V19.3729H156.033V22.9316H145.357ZM152.474 22.9316V5.13797H156.033V22.9316H152.474ZM158.876 22.9316V5.13797H162.434V22.9316H158.876ZM158.876 8.6967V5.13797H169.552V8.6967H158.876ZM158.876 15.8142V12.2554H165.993V15.8142H158.876ZM165.993 12.2554V5.13797H169.552V12.2554H165.993ZM165.993 22.9316V15.8142H169.552V22.9316H165.993ZM172.395 8.6967V5.13797H183.071V8.6967H172.395ZM172.395 15.8142V5.13797H175.954V15.8142H172.395ZM172.395 15.8142V12.2554H183.071V15.8142H172.395ZM172.395 22.9316V19.3729H183.071V22.9316H172.395ZM179.512 22.9316V12.2554H183.071V22.9316H179.512ZM185.914 22.9316V5.13797H189.473V22.9316H185.914ZM185.914 8.6967V5.13797H196.59V8.6967H185.914ZM185.914 15.8142V12.2554H196.59V15.8142H185.914ZM185.914 22.9316V19.3729H196.59V22.9316H185.914ZM199.433 22.9316V5.13797H202.992V22.9316H199.433ZM199.433 22.9316V19.3729H210.109V22.9316H199.433ZM212.952 22.9316V5.13797H216.511V22.9316H212.952ZM212.952 8.6967V5.13797H223.628V8.6967H212.952ZM212.952 15.8142V12.2554H223.628V15.8142H212.952ZM236.428 22.9316V5.13797H239.986V22.9316H236.428ZM242.84 22.9316V5.13797H246.398V22.9316H242.84ZM242.84 8.6967V5.13797H253.516V8.6967H242.84ZM249.957 22.9316V5.13797H253.516V22.9316H249.957ZM256.359 8.6967V5.13797H267.035V8.6967H256.359ZM259.917 22.9316V5.13797H263.476V22.9316H259.917ZM269.878 19.3729V8.6967H273.436V19.3729H269.878ZM273.436 8.6967V5.13797H276.995V8.6967H273.436ZM273.436 22.9316V19.3729H276.995V22.9316H273.436ZM276.995 19.3729V8.6967H280.554V19.3729H276.995ZM293.354 8.6967V5.13797H304.03V8.6967H293.354ZM296.912 22.9316V5.13797H300.471V22.9316H296.912ZM306.873 22.9316V5.13797H310.431V22.9316H306.873ZM306.873 15.8142V12.2554H317.549V15.8142H306.873ZM313.99 22.9316V5.13797H317.549V22.9316H313.99ZM320.392 22.9316V5.13797H323.95V22.9316H320.392ZM320.392 8.6967V5.13797H331.068V8.6967H320.392ZM320.392 15.8142V12.2554H331.068V15.8142H320.392ZM320.392 22.9316V19.3729H331.068V22.9316H320.392ZM343.867 19.3729V8.6967H347.426V19.3729H343.867ZM347.426 8.6967V5.13797H354.544V8.6967H347.426ZM347.426 22.9316V19.3729H354.544V22.9316H347.426ZM357.386 19.3729V8.6967H360.945V19.3729H357.386ZM360.945 8.6967V5.13797H364.504V8.6967H360.945ZM360.945 22.9316V19.3729H364.504V22.9316H360.945ZM364.504 19.3729V8.6967H368.063V19.3729H364.504ZM370.905 22.9316V5.13797H374.464V22.9316H370.905ZM370.905 8.6967V5.13797H381.582V8.6967H370.905ZM378.023 22.9316V5.13797H381.582V22.9316H378.023ZM384.425 8.6967V5.13797H395.101V8.6967H384.425ZM387.983 22.9316V5.13797H391.542V22.9316H387.983ZM397.944 22.9316V5.13797H401.502V22.9316H397.944ZM404.356 22.9316V5.13797H407.914V22.9316H404.356ZM404.356 8.6967V5.13797H415.032V8.6967H404.356ZM411.473 22.9316V5.13797H415.032V22.9316H411.473ZM417.875 22.9316V5.13797H421.433V22.9316H417.875ZM417.875 22.9316V19.3729H428.551V22.9316H417.875ZM424.992 22.9316V5.13797H428.551V22.9316H424.992ZM431.394 22.9316V5.13797H434.952V22.9316H431.394ZM431.394 22.9316V19.3729H442.07V22.9316H431.394ZM438.511 22.9316V5.13797H442.07V22.9316H438.511ZM444.913 22.9316V5.13797H448.471V22.9316H444.913ZM444.913 8.6967V5.13797H462.706V8.6967H444.913ZM452.03 22.9316V5.13797H455.589V22.9316H452.03ZM459.147 22.9316V5.13797H462.706V22.9316H459.147Z"/><path fill="white" d="M497.048 8.6967V5.13797H500.607V8.6967H497.048ZM497.048 22.9316V19.3729H500.607V22.9316H497.048ZM500.607 12.2554V8.6967H504.166V12.2554H500.607ZM500.607 19.3729V15.8142H504.166V19.3729H500.607ZM504.166 15.8142V12.2554H507.725V15.8142H504.166Z"/></svg>`;

// ─── constants ────────────────────────────────────────────────────────────────

const CROWD_WIDTH = 24;   // world X units, position 0→100 maps to -12→+12
const AVATAR_SCALE = 0.59;
const CURRENT_SCALE = 0.67;

// Shoe geometry in AvatarRenderer sits at local Y ≈ -0.2 (unscaled).
// With CURRENT_SCALE=0.67 and group at Y=0 the feet land at world Y≈-0.13 → clips.
// Lifting by AVATAR_Y puts feet at world Y ≈ 0 (just above ground plane).
const AVATAR_Y = 0.18;

const BLUE = "#0083FF";
const PLATFORM_COLOR = "#DA5F44";
const SYNTHETIC_COLORS = Object.fromEntries(
  ["hair","head","face","neck","arms","body","pants","legs","shoes"].map((p) => [p, BLUE])
) as Record<AvatarPart, string>;

// Pre-join bar animation constants
const BAR_FRAC = 1 / 3;
const CENTER_L = 41 / 523;
const CENTER_R = 476.725 / 523;
const SPEED = 0.00008;

// Camera tilt: world Z→screenY factor (from camera at [0,8,10] looking at origin)
const Z_TO_SCREEN = 0.625;

// Platform geometry (world units)
const PLATFORM_WIDTH = 8;   // = 1/3 of CROWD_WIDTH
const PLATFORM_DEPTH = 1.0; // how deep the platform is in world-Z

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

// ─── in-canvas platform plane ─────────────────────────────────────────────────
// Lies flat (horizontal) at ground level, tracks the bouncing bar's X position.
// The SVG is loaded once as a CanvasTexture (blob URL → Image → canvas); falls
// back to solid colour while loading.

function usePlatformTexture(): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    const blob = new Blob([PLATFORM_SVG], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1046;
      canvas.height = 58;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      setTexture(tex);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, []);
  return texture;
}

function PlatformPlane({
  platformXRef,
  preJoinZ,
}: {
  platformXRef: React.MutableRefObject<number>;
  preJoinZ: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = usePlatformTexture();

  useFrame(() => {
    if (meshRef.current) meshRef.current.position.x = platformXRef.current;
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, preJoinZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={5}
    >
      <planeGeometry args={[PLATFORM_WIDTH, PLATFORM_DEPTH]} />
      <meshBasicMaterial
        map={texture ?? undefined}
        color={texture ? "white" : PLATFORM_COLOR}
        transparent={!!texture}
      />
    </mesh>
  );
}

// ─── pre-join bouncing avatar ─────────────────────────────────────────────────

interface PreJoinProps {
  library: AvatarVariantLibrary;
  avatarConfig: AvatarConfig;
  platformXRef: React.MutableRefObject<number>;
  onPreJoinCommit: (posX: number, posZ: number) => void;
}

function PreJoinAvatar({ library, avatarConfig, platformXRef, onPreJoinCommit }: PreJoinProps) {
  const { camera, gl, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const rotGroupRef = useRef<THREE.Group>(null);
  const isDraggingRef = useRef(false);
  const barFracRef = useRef(0);
  const dirRef = useRef(1);
  const avatarXFracRef = useRef(BAR_FRAC / 2); // 0–1 fraction of container width

  // Stable ref for callback
  const onPreJoinCommitRef = useRef(onPreJoinCommit);
  onPreJoinCommitRef.current = onPreJoinCommit;

  // Crowd depth and pre-join Z derived from canvas size.
  // Pull preJoinZ back by one platform depth so avatar is fully visible in canvas.
  const halfHeightCam = (size.height / size.width) * 13;
  const crowdDepth = halfHeightCam * 2 * 0.7 / Z_TO_SCREEN;
  const preJoinZ = halfHeightCam / Z_TO_SCREEN - PLATFORM_DEPTH;

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
      avatarXFracRef.current = Math.max(0, Math.min(1, worldX / CROWD_WIDTH + 0.5));
    };

    const onUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      canvas.style.cursor = "";
      const [worldX, worldZ] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      const posX = Math.max(0, Math.min(100, (worldX / CROWD_WIDTH + 0.5) * 100));
      const posZ = Math.max(0, Math.min(100, (worldZ / crowdDepthRef.current + 0.5) * 100));
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
    }

    // Update platform X (bar center in world space)
    const barCenterFrac = barFracRef.current + BAR_FRAC / 2;
    platformXRef.current = posToX(barCenterFrac * 100);

    if (groupRef.current) {
      groupRef.current.position.x = posToX(avatarXFracRef.current * 100);
      groupRef.current.position.z = preJoinZRef.current;
    }

    // Apply Y rotation matching the crowd avatar pattern
    if (rotGroupRef.current) {
      rotGroupRef.current.rotation.y = avatarRotationY(avatarXFracRef.current * 100);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[posToX(BAR_FRAC / 2 * 100), AVATAR_Y, preJoinZ]}
      scale={CURRENT_SCALE}
      renderOrder={10}
      onPointerDown={(e) => {
        e.stopPropagation();
        isDraggingRef.current = true;
        gl.domElement.style.cursor = "grabbing";
        (e.nativeEvent.target as HTMLElement).setPointerCapture(e.nativeEvent.pointerId);
      }}
    >
      <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
        <boxGeometry args={[1.4, 2.5, 1.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={rotGroupRef}>
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

// ─── inner scene ──────────────────────────────────────────────────────────────

interface SceneProps {
  library: AvatarVariantLibrary;
  participants: ReturnType<typeof useContinuumStore.getState>["participants"];
  currentUserId: string;
  currentUserAvatarConfig: AvatarConfig;
  localPosition: number;   // X, 0–100
  localPositionZ: number;  // Z, 0–100
  selectedUserId: string | null;
  onSelectUser: (uid: string | null) => void;
  isInCrowd: boolean;
  onPreJoinCommit: (posX: number, posZ: number) => void;
  onPositionChange: (posX: number, posZ: number) => void;
  onPositionCommit: (posX: number, posZ: number) => void;
}

function CrowdScene({
  library, participants,
  currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, onPreJoinCommit,
  onPositionChange, onPositionCommit,
}: SceneProps) {
  const { size, gl, camera } = useThree();

  // Crowd depth: how much world-Z the crowd spans (scales with canvas aspect ratio)
  const halfHeightCam = (size.height / size.width) * 13;
  const crowdDepth = halfHeightCam * 2 * 0.7 / Z_TO_SCREEN;
  // Pre-join Z pulled back by one platform depth so avatar sits fully inside canvas
  const preJoinZ = halfHeightCam / Z_TO_SCREEN - PLATFORM_DEPTH;

  const crowdDepthRef = useRef(crowdDepth);
  crowdDepthRef.current = crowdDepth;

  // Shared ref: pre-join avatar writes its bar-center X here; PlatformPlane reads it
  const platformXRef = useRef(0);

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
            position={[x, AVATAR_Y, z]}
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
        <>
          <PreJoinAvatar
            library={library}
            avatarConfig={currentUserAvatarConfig}
            platformXRef={platformXRef}
            onPreJoinCommit={onPreJoinCommit}
          />
          <PlatformPlane
            platformXRef={platformXRef}
            preJoinZ={preJoinZ}
          />
        </>
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
  onPreJoinCommit: (posX: number, posZ: number) => void;
  onPositionChange: (posX: number, posZ: number) => void;
  onPositionCommit: (posX: number, posZ: number) => void;
}

export function ContinuumScene({
  currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, onPreJoinCommit,
  onPositionChange, onPositionCommit,
}: Props) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
  // Read participants outside the Canvas so Zustand subscriptions work in the normal React tree
  const participants = useContinuumStore((s) => s.participants);

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
            participants={participants}
            currentUserId={currentUserId}
            currentUserAvatarConfig={currentUserAvatarConfig}
            localPosition={localPosition}
            localPositionZ={localPositionZ}
            selectedUserId={selectedUserId}
            onSelectUser={onSelectUser}
            isInCrowd={isInCrowd}
            onPreJoinCommit={onPreJoinCommit}
            onPositionChange={onPositionChange}
            onPositionCommit={onPositionCommit}
          />
        </Canvas>
      )}
    </div>
  );
}
