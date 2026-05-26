"use client";

import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { meshBounds } from "@react-three/drei";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/store/avatarStore";
import { useContinuumStore } from "@/store/continuumStore";

// ─── bot material config ──────────────────────────────────────────────────────

const BOT_CONFIG = {
  color: "#0083FF",
  outlineColor: "#0083FF",
  unlit: false,
  roughness: 0,
  metalness: 0,
  emissiveIntensity: 1.16,
  ambientIntensity: 1.4,
  dirLightIntensity: 1.6,
} as const;

// ─── constants ────────────────────────────────────────────────────────────────

const CROWD_WIDTH = 24;   // world X units, position 0→100 maps to -12→+12
const AVATAR_SCALE = 0.59;
const CURRENT_SCALE = 0.67;

// Shoe geometry in AvatarRenderer sits at local Y ≈ -0.2 (unscaled).
// With CURRENT_SCALE=0.67 and group at Y=0 the feet land at world Y≈-0.13 → clips.
// Lifting by AVATAR_Y puts feet at world Y ≈ 0 (just above ground plane).
const AVATAR_Y = 0.18;

// Platform geometry (world units)
const PLATFORM_WIDTH = 8;   // = 1/3 of CROWD_WIDTH
const PLATFORM_DEPTH = 1.0;

// Pre-join bar animation constants
// PNG is 1068×90; avatar bounce zone is 82px from each edge (inner rect, excluding arrows)
const BAR_FRAC = 1 / 3;
const CENTER_L = 130 / 1068;
const CENTER_R = (1068 - 130) / 1068;
const SPEED = 0.00008;

// PNG aspect ratio (1068×90); top border is 4px (unscaled) before the platform surface
const PLATFORM_PNG_ASPECT = 1068 / 90;
const PLATFORM_TOP_BORDER_FRAC = 4 / 90;
// sprite top = Y 0, platform surface = Y −(4/90)*spriteHeight ≈ −0.030
// feet world Y = groupY + CURRENT_SCALE*(−0.2); set equal to surface → groupY ≈ 0.104
const PLATFORM_SURFACE_Y = -PLATFORM_TOP_BORDER_FRAC * (PLATFORM_WIDTH / PLATFORM_PNG_ASPECT);
const PREJOIN_AVATAR_Y = PLATFORM_SURFACE_Y + CURRENT_SCALE * 0.2 - 0.06;

// Camera tilt: world Z→screenY factor (from camera at [0,8,10] looking at origin)
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
  // pos 0→100: left=+60°, center=0°, right=−60°
  const t = (pos / 100 - 0.5) * 2; // −1 … 0 … +1
  return -t * 60 * (Math.PI / 180);
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

// ─── in-canvas platform sprite ────────────────────────────────────────────────

// Uses a regular Mesh (not Sprite) so renderOrder is respected in the main render
// pass — THREE.Sprite has its own post-geometry pass that ignores renderOrder.
// Billboard effect is achieved by copying camera.quaternion each frame.
function PlatformBillboardInner({
  platformXRef,
  preJoinZ,
}: {
  platformXRef: React.MutableRefObject<number>;
  preJoinZ: number;
}) {
  const texture = useLoader(THREE.TextureLoader, "/DragYourself.png");
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const width = PLATFORM_WIDTH;
  const height = width / PLATFORM_PNG_ASPECT;

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.x = platformXRef.current;
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={meshRef} renderOrder={-1} position={[0, -height / 2, preJoinZ]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function PlatformSprite(props: { platformXRef: React.MutableRefObject<number>; preJoinZ: number }) {
  return (
    <Suspense fallback={null}>
      <PlatformBillboardInner {...props} />
    </Suspense>
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
      position={[posToX(BAR_FRAC / 2 * 100), PREJOIN_AVATAR_Y, preJoinZ]}
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
  botConfig: typeof BOT_CONFIG;
  onHeadScreenY?: (y: number) => void;
}

function CrowdScene({
  library, participants,
  currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, onPreJoinCommit,
  onPositionChange, onPositionCommit,
  botConfig,
  onHeadScreenY,
}: SceneProps) {
  const { size, gl, camera } = useThree();

  // Crowd depth: how much world-Z the crowd spans (scales with canvas aspect ratio)
  const halfHeightCam = (size.height / size.width) * 13;
  const crowdDepth = halfHeightCam * 2 * 0.7 / Z_TO_SCREEN;
  // Pre-join Z pulled back by one platform depth so avatar sits fully inside canvas
  const preJoinZ = halfHeightCam / Z_TO_SCREEN - PLATFORM_DEPTH;

  // Minimum posZ so the current user's hair never clips off the top of the canvas.
  // cos(atan(8/10)) ≈ 0.780 is the camera elevation's Y→screenY factor.
  const ELEV_COS = 0.780;
  const avatarScreenTop = (AVATAR_Y + CURRENT_SCALE * 3.3) * ELEV_COS;
  const maxZBackWorld = Math.max(0, (halfHeightCam - avatarScreenTop) / Z_TO_SCREEN);
  const minPosZ = Math.max(0, (0.5 - maxZBackWorld / crowdDepth) * 100 + 5);

  const crowdDepthRef = useRef(crowdDepth);
  crowdDepthRef.current = crowdDepth;
  const minPosZRef = useRef(minPosZ);
  minPosZRef.current = minPosZ;

  function posToZ(posZ: number) {
    return (posZ / 100 - 0.5) * crowdDepth;
  }

  // Project current user's head to canvas-space Y each frame for speech bubble arrow
  const onHeadScreenYRef = useRef(onHeadScreenY);
  onHeadScreenYRef.current = onHeadScreenY;
  useFrame(({ camera, gl }) => {
    if (!onHeadScreenYRef.current || !isInCrowd) return;
    const wx = posToX(localPosition);
    const wy = AVATAR_Y + CURRENT_SCALE * 2.5; // approximate mid-head world Y
    const wz = (localPositionZ / 100 - 0.5) * crowdDepthRef.current;
    const v = new THREE.Vector3(wx, wy, wz);
    v.project(camera);
    // NDC y=1 is canvas top; convert to CSS pixels from top
    const screenY = (1 - (v.y + 1) / 2) * gl.domElement.clientHeight;
    onHeadScreenYRef.current(screenY);
  });

  // Shared ref: pre-join avatar writes its bar-center X here; PlatformPlane reads it
  const platformXRef = useRef(0);

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
      const posZ = Math.max(minPosZRef.current, Math.min(100, (worldZ / crowdDepthRef.current + 0.5) * 100));
      onPositionChangeRef.current(posX, posZ);
    };

    const onUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      canvas.style.cursor = "";
      const [worldX, worldZ] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      const posX = Math.max(0, Math.min(100, (worldX / CROWD_WIDTH + 0.5) * 100));
      const posZ = Math.max(minPosZRef.current, Math.min(100, (worldZ / crowdDepthRef.current + 0.5) * 100));
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
        const botColors = Object.fromEntries(
          ["hair","head","face","neck","arms","body","pants","legs","shoes"].map((part) => [part, botConfig.color])
        ) as Record<AvatarPart, string>;
        const colors = isBot ? botColors : colorsFromConfig(cfg);
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
                outlineColor={isBot ? botConfig.outlineColor : undefined}
                unlit={isBot ? botConfig.unlit : false}
                emissiveBoost={isBot ? botConfig.emissiveIntensity : 0}
                roughness={isBot ? botConfig.roughness : undefined}
                metalness={isBot ? botConfig.metalness : undefined}
                forceColor={isBot}
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
          <PlatformSprite
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
  onHeadScreenY?: (y: number) => void;
}

export function ContinuumScene({
  currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, onPreJoinCommit,
  onPositionChange, onPositionCommit,
  onHeadScreenY,
}: Props) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
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
          style={{ width: "100%", height: "100%" }}
          onPointerMissed={() => onSelectUser(null)}
        >
          <CrowdCamera />
          <color attach="background" args={["#ffffff"]} />
          <ambientLight intensity={BOT_CONFIG.ambientIntensity} />
          <directionalLight position={[-5, 7, 4]} intensity={BOT_CONFIG.dirLightIntensity} castShadow />
          <directionalLight position={[3, 2, -2]} intensity={0.15} />
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
            botConfig={BOT_CONFIG}
            onHeadScreenY={onHeadScreenY}
          />
        </Canvas>
      )}
    </div>
  );
}
