"use client";

import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { meshBounds } from "@react-three/drei";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import { SpinningAsterisk } from "@/components/avatar/SpinningAsterisk";
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

// World X units the crowd spans (position 0→100 maps to ±CROWD_WIDTH/2).
// Narrowed on portrait/mobile (set per-render in CrowdScene) so the whole scene
// scales up — bigger avatars + platform — while still fitting on screen.
const CROWD_WIDTH_DESKTOP = 24;
const CROWD_WIDTH_MOBILE = 10;
let CROWD_WIDTH = CROWD_WIDTH_DESKTOP;
const BASE_AVATAR_SCALE = 0.59;
const BASE_CURRENT_SCALE = 0.67;
const OUTLINE_EXPANSION = 0.12; // local outline thickness — scales WITH the avatar (× scaleMult in world)

// Platform max screen width (px) — avatars never stretch wider than this
const PLATFORM_MAX_PX = 600;

// Largest avatar scale multiplier (few participants) — outline reference point.
const MAX_SCALE_MULT = 2.24;
// Cap on the outline scale factor so the biggest avatars aren't over-outlined.
const OUTLINE_MAX_FACTOR = 0.6;

// Avatar scale multiplier based on total visible participant count
function avatarScaleMult(count: number): number {
  if (count <= 6) return MAX_SCALE_MULT;
  if (count >= 100) return 0.90;
  return 2.24 - ((count - 6) / 94) * 1.34;
}

// Crowd cap: max real (non-synthetic) participants shown
const CROWD_CAP = 100;

// Shoe geometry in AvatarRenderer sits at local Y ≈ -0.2 (unscaled).
// With CURRENT_SCALE=0.67 and group at Y=0 the feet land at world Y≈-0.13 → clips.
// Lifting by AVATAR_Y puts feet at world Y ≈ 0 (just above ground plane).
const AVATAR_Y = 0.18;

// Platform geometry (world units). On mobile the bar is a larger fraction of the
// (narrower) crowd so it reads at a usable size. Set per-render in CrowdScene.
const PLATFORM_WIDTH_DESKTOP = 8;   // = 1/3 of CROWD_WIDTH
const PLATFORM_WIDTH_MOBILE = 6;    // leaves room to slide within the mobile crowd
let PLATFORM_WIDTH = PLATFORM_WIDTH_DESKTOP;
// How far up from the very bottom edge the platform surface sits (NDC units),
// leaving room for the bar graphic below the surface.
const PLATFORM_BOTTOM_MARGIN = 0.2;

// Pre-join bar animation constants
// PNG is 1068×90; avatar bounce zone is 82px from each edge (inner rect, excluding arrows)
const BAR_FRAC = 1 / 3;
// Inner platform edge as a fraction of the PNG width (arrow boxes are ~130px of 1068).
const CENTER_R = (1068 - 130) / 1068;
const SPEED = 0.00008;

// PNG aspect ratio (1068×90); top border is 4px (unscaled) before the platform surface.
// The surface offset from the sprite top is derived per-frame from the sprite's
// actual height (since the platform width is now responsive).
const PLATFORM_PNG_ASPECT = 1068 / 90;
const PLATFORM_TOP_BORDER_FRAC = 4 / 90;

// Camera tilt: world Z→screenY factor (from camera at [0,5,10] looking at origin)
const Z_TO_SCREEN = 0.447; // 5/√125
// cos(atan(5/10)) ≈ 0.894 — camera elevation's world-Y → screen-Y factor
const ELEV_COS = 0.894; // 10/√125

// The pre-join avatar + platform sit this far in front of the crowd's front edge
// (so normal depth testing draws them on top). Their Y is then raised to keep the
// same on-screen position despite being pushed toward the camera.
const PREJOIN_FRONT_MARGIN = 1.5;

// Max safe crowd depth so avatars at posZ=0 or posZ=100 don't clip the canvas edges.
// Constraint: head screen Y at most-back Z must stay within ±halfHeightCam.
// head_screenY = -(avatarScale * 3.5) * ELEV_COS - halfDepth * Z_TO_SCREEN ≥ -halfHeightCam
// → halfDepth ≤ (halfHeightCam - avatarScale * 3.5 * ELEV_COS) / Z_TO_SCREEN
function calcCrowdDepth(halfHeightCam: number, avatarScale: number): number {
  const headScreenH = avatarScale * 3.5 * ELEV_COS;
  return Math.max(2, Math.min((halfHeightCam - headScreenH) * 2 * 0.88 / Z_TO_SCREEN, 60));
}

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
  return -t * 30 * (Math.PI / 180);
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

// World Y (at depth z) that projects to near the bottom edge of the canvas.
// marginNdc lifts it up from the very bottom (0 = bottom edge, 0.2 = 10% up).
function worldYAtScreenBottom(camera: THREE.Camera, z: number, marginNdc: number): number {
  const a = new THREE.Vector3(0, 0, z).project(camera);
  const b = new THREE.Vector3(0, 1, z).project(camera);
  const targetNdc = -1 + marginNdc;
  return (targetNdc - a.y) / (b.y - a.y);
}

// Reused across every pointermove during a drag — allocating these per call
// caused GC stutter that made dragging feel laggy on mobile.
const _stwRaycaster = new THREE.Raycaster();
const _stwNdc = new THREE.Vector2();
const _stwPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Y=0
const _stwHit = new THREE.Vector3();

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

  _stwNdc.set(ndcX, ndcY);
  _stwRaycaster.setFromCamera(_stwNdc, camera);
  _stwRaycaster.ray.intersectPlane(_stwPlane, _stwHit);
  return [_stwHit.x, _stwHit.z];
}

// Mobile is decided by the VIEWPORT width, not the canvas aspect — on short
// screens the canvas itself can be landscape even though the phone is portrait.
function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

// World units shown across the canvas width — fits the (responsive) crowd width
// plus a small margin. Narrower on mobile so avatars + platform are larger.
function viewWidthFor(mobile: boolean): number {
  return mobile ? CROWD_WIDTH_MOBILE + 1 : CROWD_WIDTH_DESKTOP + 2;
}

// ─── camera controller ────────────────────────────────────────────────────────

// Aim above the ground so the crowd (which stands at Y≥0) is vertically centred,
// instead of the ground line sitting mid-canvas with empty floor below it.
// Camera look-target height. Raising it adds headroom above the avatars so tall
// hair isn't clipped at the top edge (mobile previously aimed too low).
function cameraLookY(mobile: boolean): number {
  return mobile ? 0.8 : 1.2;
}

function CrowdCamera() {
  const { size, camera } = useThree();
  const mobile = isMobileViewport();
  useEffect(() => {
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = size.width / viewWidthFor(mobile);
    ortho.lookAt(0, cameraLookY(mobile), 0);
    ortho.updateProjectionMatrix();
  }, [size.width, size.height, mobile, camera]);
  return null;
}

// ─── in-canvas platform sprite ────────────────────────────────────────────────

// Uses a regular Mesh (not Sprite) so renderOrder is respected in the main render
// pass — THREE.Sprite has its own post-geometry pass that ignores renderOrder.
// Billboard effect is achieved by copying camera.quaternion each frame.
function PlatformBillboardInner({
  platformXRef,
  preJoinZ,
  renderOrder,
}: {
  platformXRef: React.MutableRefObject<number>;
  preJoinZ: number;
  renderOrder: number;
}) {
  const texture = useLoader(THREE.TextureLoader, "/DragYourself.png");
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const ortho = camera as THREE.OrthographicCamera;
  const width = Math.min(PLATFORM_WIDTH, PLATFORM_MAX_PX / (ortho.zoom || 46));
  const height = width / PLATFORM_PNG_ASPECT;

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.x = platformXRef.current;
    // Pin the bar surface to the bottom of the canvas (independent of crowd depth).
    // Surface = sprite top minus the top border; place it at floorY.
    const floorY = worldYAtScreenBottom(camera, preJoinZ, PLATFORM_BOTTOM_MARGIN);
    meshRef.current.position.y = floorY - height / 2 + PLATFORM_TOP_BORDER_FRAC * height;
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={meshRef} renderOrder={renderOrder} position={[0, 0, preJoinZ]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function PlatformSprite(props: { platformXRef: React.MutableRefObject<number>; preJoinZ: number; renderOrder: number }) {
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
  scaleMult: number;
  baseRenderOrder: number;
  preJoinZ: number;
  crowdDepth: number;
}

function PreJoinAvatar({ library, avatarConfig, platformXRef, onPreJoinCommit, scaleMult, baseRenderOrder, preJoinZ, crowdDepth }: PreJoinProps) {
  // Platform (idle): 35% bigger than crowd, feet on the platform surface (which
  // is pinned to the canvas bottom — see the idle branch of the frame loop).
  const platformScale = BASE_CURRENT_SCALE * scaleMult * 1.035;
  // Drag/drop: same scale as crowd avatars, feet at crowd ground level
  const dragScale = BASE_AVATAR_SCALE * scaleMult;
  const dragAvatarY = dragScale * 0.2 + 0.046;

  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const rotGroupRef = useRef<THREE.Group>(null);
  const isDraggingRef = useRef(false);
  const isDroppedRef = useRef(false); // stays true after drop to prevent platform flash
  const barFracRef = useRef(0);
  const dirRef = useRef(1);
  const avatarXFracRef = useRef(BAR_FRAC / 2); // 0–1 fraction of container width
  const avatarZFracRef = useRef(0.5);           // 0–1 fraction of crowd depth

  // Keep current render-time values accessible in useFrame
  const platformScaleRef = useRef(platformScale);
  const dragScaleRef = useRef(dragScale);
  const dragAvatarYRef = useRef(dragAvatarY);
  platformScaleRef.current = platformScale;
  dragScaleRef.current = dragScale;
  dragAvatarYRef.current = dragAvatarY;

  // Stable ref for callback
  const onPreJoinCommitRef = useRef(onPreJoinCommit);
  onPreJoinCommitRef.current = onPreJoinCommit;

  // Crowd depth and pre-join Z are passed in from CrowdScene so the avatar stays
  // aligned with the platform sprite and consistently in front of the crowd.
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
      const [worldX, worldZ] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      // Use drag scale (smaller than platform scale) for the body-margin constraint
      const arm = (0.853 * dragScaleRef.current + 1.5) / CROWD_WIDTH;
      avatarXFracRef.current = Math.max(arm, Math.min(1 - arm, worldX / CROWD_WIDTH + 0.5));
      avatarZFracRef.current = Math.max(0, Math.min(1, worldZ / crowdDepthRef.current + 0.5));
    };

    const onUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      isDroppedRef.current = true; // freeze at drop position until component unmounts
      canvas.style.cursor = "";
      const posX = Math.max(0, Math.min(100, avatarXFracRef.current * 100));
      const posZ = Math.max(0, Math.min(100, avatarZFracRef.current * 100));
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

    if (!isDraggingRef.current && !isDroppedRef.current) {
      // Bounce the bar, but clamp so the (responsive-width) platform never slides
      // past the view edge. EDGE_SLACK lets it reach a bit into the view margin.
      const EDGE_SLACK = 0.5;
      const platHalfFrac = Math.max(0, (PLATFORM_WIDTH / 2) - EDGE_SLACK) / CROWD_WIDTH;
      const barLo = Math.max(0, platHalfFrac - BAR_FRAC / 2);
      const barHi = Math.min(1 - BAR_FRAC, (1 - platHalfFrac) - BAR_FRAC / 2);
      barFracRef.current += dirRef.current * SPEED * dt;
      if (barFracRef.current >= barHi) { barFracRef.current = barHi; dirRef.current = -1; }
      if (barFracRef.current <= barLo) { barFracRef.current = barLo; dirRef.current = 1; }

      // Confine the avatar to the inner platform (between the arrow boxes). Blend
      // halfway between the old BAR_FRAC bound and the actual rendered platform
      // width, so the avatar stays off the arrows without being over-restricted.
      const ortho = camera as THREE.OrthographicCamera;
      const platformFrac = Math.min(PLATFORM_WIDTH, PLATFORM_MAX_PX / (ortho.zoom || 46)) / CROWD_WIDTH;
      const effFrac = (BAR_FRAC + platformFrac) / 2;
      const centerFrac = barFracRef.current + BAR_FRAC / 2;
      const innerHalfFrac = effFrac * (CENTER_R - 0.5) * 1.085;       // arrows excluded
      const feetHalfFrac = (0.225 * platformScale) / CROWD_WIDTH;     // keep feet on
      const allowHalf = Math.max(0, innerHalfFrac - feetHalfFrac);
      avatarXFracRef.current = Math.max(centerFrac - allowHalf, Math.min(centerFrac + allowHalf, avatarXFracRef.current));
    }

    // Update platform X (bar center in world space)
    const barCenterFrac = barFracRef.current + BAR_FRAC / 2;
    platformXRef.current = posToX(barCenterFrac * 100);

    if (groupRef.current) {
      const active = isDraggingRef.current || isDroppedRef.current;
      groupRef.current.scale.setScalar(active ? dragScaleRef.current : platformScaleRef.current);
      groupRef.current.position.x = posToX(avatarXFracRef.current * 100);
      if (active) {
        groupRef.current.position.y = dragAvatarYRef.current;
        groupRef.current.position.z = (avatarZFracRef.current - 0.5) * crowdDepthRef.current;
      } else {
        // Stand on the bar, which is pinned to the canvas bottom.
        const floorY = worldYAtScreenBottom(camera, preJoinZRef.current, PLATFORM_BOTTOM_MARGIN);
        groupRef.current.position.y = floorY - 0.19 + platformScaleRef.current * 0.2;
        groupRef.current.position.z = preJoinZRef.current;
      }
    }

    // Apply Y rotation matching the crowd avatar pattern
    if (rotGroupRef.current) {
      rotGroupRef.current.rotation.y = avatarRotationY(avatarXFracRef.current * 100);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[posToX(BAR_FRAC / 2 * 100), 0, preJoinZ]}
      scale={platformScale}
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
          outlineExpansion={OUTLINE_EXPANSION * Math.min(OUTLINE_MAX_FACTOR, scaleMult / MAX_SCALE_MULT)}
          baseRenderOrder={baseRenderOrder}
        />
      </group>
    </group>
  );
}

// ─── per-avatar bounce + rotate animation ────────────────────────────────────

const SPIN_DURATION = 1.8;
const SPIN_TURNS = 3;

function AnimatedAvatarGroup({
  isAnimating,
  animTrigger,
  rotY,
  spinTrigger = 0,
  children,
}: {
  isAnimating: boolean;
  animTrigger: number;
  rotY: number;
  spinTrigger?: number; // non-zero value starts a 3-turn entrance spin
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const startRef = useRef(-1);
  const lastTriggerRef = useRef(animTrigger);
  const spinStartRef = useRef(-1);
  const lastSpinRef = useRef(0);
  const DURATION = 0.6;
  const BOUNCE_H = 0.5;

  useFrame(({ clock }) => {
    if (!ref.current) return;

    // Entrance spin takes priority — 3 full turns easing to the resting rotation
    if (spinTrigger && lastSpinRef.current !== spinTrigger) {
      lastSpinRef.current = spinTrigger;
      spinStartRef.current = clock.elapsedTime;
    }
    if (spinStartRef.current >= 0) {
      const st = (clock.elapsedTime - spinStartRef.current) / SPIN_DURATION;
      if (st < 1) {
        const eased = 1 - Math.pow(1 - st, 3); // cubic ease-out
        ref.current.rotation.y = rotY + SPIN_TURNS * Math.PI * 2 * (1 - eased);
        ref.current.position.y = 0;
        return;
      }
      spinStartRef.current = -1; // done — fall through to normal behaviour
    }

    if (isAnimating) {
      if (lastTriggerRef.current !== animTrigger || startRef.current < 0) {
        lastTriggerRef.current = animTrigger;
        startRef.current = clock.elapsedTime;
      }
      const t = Math.min((clock.elapsedTime - startRef.current) / DURATION, 1);
      const phase = Math.sin(t * Math.PI); // 0 → 1 → 0
      ref.current.position.y = phase * BOUNCE_H;
      ref.current.rotation.y = rotY * (1 - phase * 0.9); // sweep toward camera, back
    } else {
      startRef.current = -1;
      lastTriggerRef.current = animTrigger;
      ref.current.position.y = 0;
      ref.current.rotation.y = rotY;
    }
  });

  return <group ref={ref}>{children}</group>;
}

// Memoized crowd avatar — only re-renders when its own derived props change,
// so dragging one avatar doesn't reconcile the geometry of all the others.
const CrowdAvatar = React.memo(function CrowdAvatar({
  userId, x, groupY, z, scale, rotY, isCurrent, isBot, cfg, library,
  botConfig, baseRenderOrder, spinTrigger, outlineExpansion,
  onSelect, onDragStart,
}: {
  userId: string;
  x: number; groupY: number; z: number; scale: number; rotY: number;
  isCurrent: boolean; isBot: boolean;
  cfg: AvatarConfig | null | undefined;
  library: AvatarVariantLibrary;
  botConfig: typeof BOT_CONFIG;
  baseRenderOrder: number;
  spinTrigger: number;
  outlineExpansion: number;
  onSelect: (userId: string) => void;
  onDragStart: (e: any) => void;
}) {
  const colors = useMemo(() => {
    if (isBot) {
      return Object.fromEntries(
        ["hair","head","face","neck","arms","body","pants","legs","shoes"].map((part) => [part, botConfig.color])
      ) as Record<AvatarPart, string>;
    }
    return colorsFromConfig(cfg);
  }, [isBot, cfg, botConfig]);

  const variants = useMemo(
    () => (isBot ? variantsForBot(userId, library) : variantsFromConfig(cfg)),
    [isBot, userId, library, cfg]
  );

  return (
    <group
      position={[x, groupY, z]}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(userId);
      }}
      onPointerDown={isCurrent ? onDragStart : undefined}
    >
      <mesh position={[0, 1.25, 0]} raycast={meshBounds}>
        <boxGeometry args={[1.4, 2.5, 1.4]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <AnimatedAvatarGroup
        isAnimating={false}
        animTrigger={0}
        rotY={rotY}
        spinTrigger={spinTrigger}
      >
        <CharacterGroup
          library={library}
          variantIndices={variants}
          colors={colors}
          showOutline={true}
          outlineColor={isBot ? botConfig.outlineColor : undefined}
          outlineExpansion={outlineExpansion}
          baseRenderOrder={baseRenderOrder}
          unlit={isBot ? botConfig.unlit : false}
          emissiveBoost={isBot ? botConfig.emissiveIntensity : 0}
          roughness={isBot ? botConfig.roughness : undefined}
          metalness={isBot ? botConfig.metalness : undefined}
          forceColor={isBot}
        />
      </AnimatedAvatarGroup>
    </group>
  );
});

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
  readOnly?: boolean;
  onPreJoinCommit: (posX: number, posZ: number) => void;
  onPositionChange: (posX: number, posZ: number) => void;
  onPositionCommit: (posX: number, posZ: number) => void;
  botConfig: typeof BOT_CONFIG;
  onHeadScreen?: (x: number, y: number) => void;
}

function CrowdScene({
  library, participants,
  currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, readOnly, onPreJoinCommit,
  onPositionChange, onPositionCommit,
  botConfig,
  onHeadScreen,
}: SceneProps) {
  const { size, gl, camera } = useThree();
  // Responsive world widths (single ContinuumScene mounts at a time, so module-level
  // is safe). Set before any posToX / platform math reads them this render.
  const portrait = isMobileViewport();
  CROWD_WIDTH = portrait ? CROWD_WIDTH_MOBILE : CROWD_WIDTH_DESKTOP;
  PLATFORM_WIDTH = portrait ? PLATFORM_WIDTH_MOBILE : PLATFORM_WIDTH_DESKTOP;

  // Per-avatar spin trigger: clicking an avatar spins it (same entrance spin).
  const [clickSpin, setClickSpin] = useState<{ userId: string; at: number } | null>(null);

  // Entrance spin: wait a beat after load, then spin the current user's avatar
  // 3× so they can find themselves, settling at the intended facing direction.
  const [entranceSpin, setEntranceSpin] = useState(0);
  const hasCurrentInCrowd = !!currentUserId && !!participants[currentUserId];
  useEffect(() => {
    if (!hasCurrentInCrowd) return;
    const t = setTimeout(() => setEntranceSpin(Date.now()), 700);
    return () => clearTimeout(t);
  }, [hasCurrentInCrowd]);

  // Crowd depth: how much world-Z the crowd spans, capped so no avatar clips the canvas
  const halfHeightCam = (size.height / size.width) * (viewWidthFor(portrait) / 2);

  // Cap real participants at CROWD_CAP; bots are always shown regardless
  const allParticipants = useMemo(() => Object.values(participants), [participants]);
  const cappedParticipants = useMemo(() => {
    const real = allParticipants.filter(p => !p.isSynthetic);
    const bots = allParticipants.filter(p => p.isSynthetic);
    const cappedReal = real.slice(0, CROWD_CAP);
    return [...cappedReal, ...bots];
  }, [allParticipants]);

  // Scale based on total visible count (bots count for density purposes)
  const scaleMultRaw = useMemo(() => avatarScaleMult(cappedParticipants.length), [cappedParticipants.length]);

  // Cap scale so the frontmost avatar (posZ=0, world Z ≈ -crowdDepth/2 ≈ -1) never clips
  // the top of the canvas. At front Z=-1: screen_Y = ELEV_COS*(AVATAR_Y + scale*3.3) + Z_TO_SCREEN*1
  // must be ≤ halfHeightCam. Solve for max scale:
  const maxScaleForHeight = Math.max(BASE_AVATAR_SCALE * 0.5,
    (halfHeightCam - Z_TO_SCREEN - ELEV_COS * AVATAR_Y) / (ELEV_COS * 3.3));
  // On short (squarer) portrait canvases (e.g. iPhone SE), scale the avatars up so
  // they fill the vertical space instead of sitting small in the middle. Taller
  // phones (aspect ≳ 1.45) stay at ~1×.
  const canvasAspect = size.height / size.width;
  const shortBoost = portrait ? Math.min(1.7, Math.max(1, 1.23 / canvasAspect)) : 1;
  const scaleMult = Math.min(scaleMultRaw, maxScaleForHeight / BASE_AVATAR_SCALE) * shortBoost;

  const AVATAR_SCALE = BASE_AVATAR_SCALE * scaleMult;
  const CURRENT_SCALE = BASE_CURRENT_SCALE * scaleMult;

  // Outline scales with the avatar, but super-linearly so small (dense) avatars
  // get a proportionally thinner outline. Capped below 1 so the largest avatars
  // aren't over-outlined.
  const crowdOutlineExpansion = OUTLINE_EXPANSION * Math.min(OUTLINE_MAX_FACTOR, scaleMult / MAX_SCALE_MULT);

  // Crowd depth: sized so the tallest avatar at the most extreme Z stays in canvas
  const crowdDepth = calcCrowdDepth(halfHeightCam, AVATAR_SCALE);
  // Push the platform in front of the crowd's front edge so it always renders on
  // top; its on-screen Y is then pinned to the canvas bottom each frame.
  const preJoinZ = crowdDepth / 2 + PREJOIN_FRONT_MARGIN;

  // Minimum posZ so the current user's hair never clips off the top of the canvas.
  const avatarScreenTop = (AVATAR_Y + CURRENT_SCALE * 3.3) * ELEV_COS;
  const maxZBackWorld = Math.max(0, (halfHeightCam - avatarScreenTop) / Z_TO_SCREEN);
  const minPosZ = Math.max(0, (0.5 - maxZBackWorld / crowdDepth) * 100 + 5);

  const crowdDepthRef = useRef(crowdDepth);
  crowdDepthRef.current = crowdDepth;
  const minPosZRef = useRef(minPosZ);
  minPosZRef.current = minPosZ;

  // Minimum posX (0–100) so arm tips + outline don't exceed the camera's ±13 viewport.
  // arm half-width ≈ 0.853×scale; outline adds OUTLINE_EXPANSION/scaleMult world units.
  const bodyEdgeMarginPosX = Math.max(0, (0.853 * AVATAR_SCALE + OUTLINE_EXPANSION / scaleMult - 1.0) / CROWD_WIDTH * 100);
  const bodyEdgeMarginPosXRef = useRef(bodyEdgeMarginPosX);
  bodyEdgeMarginPosXRef.current = bodyEdgeMarginPosX;

  function posToZ(posZ: number) {
    return (posZ / 100 - 0.5) * crowdDepth;
  }

  // Project the selected avatar's head to canvas-space (x, y) each frame for speech bubble
  const onHeadScreenRef = useRef(onHeadScreen);
  onHeadScreenRef.current = onHeadScreen;
  const selectedUserIdRef = useRef(selectedUserId);
  selectedUserIdRef.current = selectedUserId;
  const scaleMultRef = useRef(scaleMult);
  scaleMultRef.current = scaleMult;
  useFrame(({ camera, gl }) => {
    if (!onHeadScreenRef.current || !selectedUserIdRef.current) return;
    const uid = selectedUserIdRef.current;
    const isCurrent = uid === currentUserId;
    const p = isCurrent ? null : participants[uid];
    const pos  = isCurrent ? localPosition  : (p?.position  ?? 50);
    const posZ = isCurrent ? localPositionZ : (p?.positionZ ?? 50);
    const scale = BASE_AVATAR_SCALE * scaleMultRef.current;
    const wx = posToX(pos);
    const wy = AVATAR_Y + scale * 2.5;
    const wz = (posZ / 100 - 0.5) * crowdDepthRef.current;
    const v = new THREE.Vector3(wx, wy, wz);
    v.project(camera);
    const cw = gl.domElement.clientWidth;
    const ch = gl.domElement.clientHeight;
    const screenX = ((v.x + 1) / 2) * cw;
    const screenY = (1 - (v.y + 1) / 2) * ch;
    onHeadScreenRef.current(screenX, screenY);
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
      const m = bodyEdgeMarginPosXRef.current;
      const posX = Math.max(m, Math.min(100 - m, (worldX / CROWD_WIDTH + 0.5) * 100));
      const posZ = Math.max(minPosZRef.current, Math.min(100, (worldZ / crowdDepthRef.current + 0.5) * 100));
      onPositionChangeRef.current(posX, posZ);
    };

    const onUp = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      canvas.style.cursor = "";
      const [worldX, worldZ] = screenToWorldXZ(e.clientX, e.clientY, camera, canvas);
      const m = bodyEdgeMarginPosXRef.current;
      const posX = Math.max(m, Math.min(100 - m, (worldX / CROWD_WIDTH + 0.5) * 100));
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

  // Stable callbacks so memoized CrowdAvatars don't re-render on every parent render.
  const handleSelect = React.useCallback((userId: string) => {
    if (isDraggingRef.current) return;
    const uid = userId === selectedUserIdRef.current ? null : userId;
    onSelectUser(uid);
    if (uid) setClickSpin({ userId: uid, at: Date.now() }); // spin the clicked avatar
  }, [onSelectUser]);

  const handleDragStart = React.useCallback((e: any) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    gl.domElement.style.cursor = "grabbing";
    (e.nativeEvent.target as HTMLElement).setPointerCapture(e.nativeEvent.pointerId);
  }, [gl]);

  // Sort back-to-front so far avatars render first (correct depth for opaque geometry)
  const sorted = useMemo(
    () => cappedParticipants.slice().sort((a, b) => a.positionZ - b.positionZ),
    [cappedParticipants]
  );

  return (
    <group>
      {sorted.map((p, sortIndex) => {
        const isCurrent = p.userId === currentUserId;
        const posRaw  = isCurrent ? localPosition  : p.position;
        const posZ = isCurrent ? localPositionZ : p.positionZ;
        const pos = Math.max(bodyEdgeMarginPosX, Math.min(100 - bodyEdgeMarginPosX, posRaw));
        const scale = AVATAR_SCALE;
        // Clicking spins the avatar; a fresh entrance spin overrides for the current user.
        const clickAt = clickSpin?.userId === p.userId ? clickSpin.at : 0;
        const spin = isCurrent ? Math.max(clickAt, entranceSpin) : clickAt;
        return (
          <CrowdAvatar
            key={p.userId}
            userId={p.userId}
            x={posToX(pos)}
            z={posToZ(posZ)}
            groupY={scale * 0.2 + 0.046}
            scale={scale}
            rotY={avatarRotationY(pos)}
            isCurrent={isCurrent}
            isBot={p.isSynthetic}
            cfg={isCurrent ? currentUserAvatarConfig : p.avatarConfig}
            library={library}
            botConfig={botConfig}
            baseRenderOrder={sortIndex * 4}
            spinTrigger={spin}
            outlineExpansion={crowdOutlineExpansion}
            onSelect={handleSelect}
            onDragStart={handleDragStart}
          />
        );
      })}

      {!isInCrowd && !readOnly && (
        <>
          {/* Layer order: crowd (< 4N) < platform bar < the user's own avatar,
              so the bar sits above the crowd but the user stands on top of it. */}
          <PlatformSprite
            platformXRef={platformXRef}
            preJoinZ={preJoinZ}
            renderOrder={sorted.length * 4 + 1}
          />
          <PreJoinAvatar
            library={library}
            avatarConfig={currentUserAvatarConfig}
            platformXRef={platformXRef}
            onPreJoinCommit={onPreJoinCommit}
            scaleMult={scaleMult}
            baseRenderOrder={sorted.length * 4 + 5}
            preJoinZ={preJoinZ}
            crowdDepth={crowdDepth}
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
  readOnly?: boolean;
  onPreJoinCommit: (posX: number, posZ: number) => void;
  onPositionChange: (posX: number, posZ: number) => void;
  onPositionCommit: (posX: number, posZ: number) => void;
  onHeadScreen?: (x: number, y: number) => void;
  isSeeding?: boolean;
}

const SEEDING_POSITIONS = [10, 30, 50, 70, 90];

export function ContinuumScene({
  currentUserId, currentUserAvatarConfig,
  localPosition, localPositionZ,
  selectedUserId, onSelectUser,
  isInCrowd, readOnly, onPreJoinCommit,
  onPositionChange, onPositionCommit,
  onHeadScreen, isSeeding,
}: Props) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
  const participants = useContinuumStore((s) => s.participants);

  useEffect(() => {
    fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((d) => setLibrary(d.library));
  }, []);

  return (
    // Absolutely fill the flex parent (sized to fit the viewport) so the canvas
    // reliably takes the full available height instead of collapsing.
    <div style={{ position: "absolute", inset: 0 }}>
      {library && (
        <Canvas
          orthographic
          camera={{ position: [0, 5, 10], zoom: 46, near: -100, far: 100 }}
          gl={{ antialias: true, stencil: true }}
          // Cap pixel ratio so high-DPR phones (2–3x) don't render at full res,
          // which tanks FPS and makes dragging feel laggy.
          dpr={[1, 2]}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
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
            readOnly={readOnly}
            onPreJoinCommit={onPreJoinCommit}
            onPositionChange={onPositionChange}
            onPositionCommit={onPositionCommit}
            botConfig={BOT_CONFIG}
            onHeadScreen={onHeadScreen}
          />
          {isSeeding && SEEDING_POSITIONS.map((pos) => (
            <SpinningAsterisk
              key={pos}
              position={[(pos / 100 - 0.5) * CROWD_WIDTH, 1.0, 0]}
              size={0.55}
            />
          ))}
        </Canvas>
      )}
    </div>
  );
}
