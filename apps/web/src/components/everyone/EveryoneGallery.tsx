"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import { AppHeader } from "@/components/ui/AppHeader";
import { getAvatarLibrary } from "@/lib/avatarLibraryCache";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/store/avatarStore";

// ─── tunable layout constants ────────────────────────────────────────────────
const SLOT_W = 1.4;            // world units between neighbours — hands overlap a little
const AVATAR_SCALE = 1.0;
const AVATAR_Y = 0.05;         // feet just above the ground line
const ASTERISK_Y = 2.2;        // placeholder sits where the body will appear
const VIEW_WIDTH_DESKTOP = 22; // world units across the canvas at zoom 1
const VIEW_WIDTH_MOBILE = 13;  // narrower → bigger avatars on phones
const MAX_ANGLE = (32 * Math.PI) / 180; // max turn-toward-centre
const MOUNT_HALF = 30;         // slots mounted each side of centre → 61 total (≤ 100)
const SPIN_TURNS = 3;
const SPIN_DURATION = 1.4;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.4;
const ZOOM_KEY_STEP = 1.15;
// momentum: friction decay (per second) and impulse helpers
const FRICTION_DECAY = 2.6;    // higher = stops sooner
const MAX_VELOCITY = 70;       // slots/sec cap
const KEY_IMPULSE = 5;         // arrow-key nudge velocity
const VELOCITY_EPS = 0.04;     // below this we snap to rest
const FLICK_IDLE_MS = 120;     // ignore stale velocity if the finger paused before release
const BREADCRUMBS = [{ label: "home", href: "/dashboard" }, { label: "everyone" }];

const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
const clampVel = (v: number) => Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));

interface Person {
  id: string;
  name: string | null;
  avatarConfig: unknown;
}

// ─── avatar config helpers (mirror ContinuumScene) ───────────────────────────
function colorsFromConfig(cfg: unknown): Record<AvatarPart, string> {
  const raw = cfg as { format?: string; colors?: Record<string, string> } | null;
  const source = raw?.format === "v2" ? raw.colors : (raw as Record<string, string> | null);
  const base = source && Object.keys(source).length > 0 ? source : DEFAULT_AVATAR;
  return Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, base[p] ?? DEFAULT_AVATAR[p as keyof AvatarConfig] ?? "#cccccc"])
  ) as Record<AvatarPart, string>;
}

function variantsFromConfig(cfg: unknown): Record<AvatarPart, number> {
  const raw = cfg as { format?: string; variants?: Record<string, number> } | null;
  if (raw?.format === "v2" && raw.variants) {
    return Object.fromEntries(
      AVATAR_PARTS.map((p) => [p, raw.variants?.[p] ?? 0])
    ) as Record<AvatarPart, number>;
  }
  return Object.fromEntries(AVATAR_PARTS.map((p) => [p, 0])) as Record<AvatarPart, number>;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

// ─── spinning asterisk loading placeholder ───────────────────────────────────
let _astTex: THREE.CanvasTexture | null = null;
function getAsteriskTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (_astTex) return _astTex;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.translate(S / 2, S / 2);
  ctx.strokeStyle = "#0083FF";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
    ctx.lineTo(-Math.cos(a) * 44, -Math.sin(a) * 44);
    ctx.stroke();
  }
  _astTex = new THREE.CanvasTexture(c);
  return _astTex;
}

function AsteriskSprite({ x }: { x: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => getAsteriskTexture(), []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z -= delta * 3.2;
  });
  if (!tex) return null;
  return (
    <mesh ref={ref} position={[x, ASTERISK_Y, 0]}>
      <planeGeometry args={[1.2, 1.2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ─── entrance spin-in wrapper ────────────────────────────────────────────────
function SpinIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef(-1);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (start.current < 0) start.current = clock.elapsedTime;
    const t = (clock.elapsedTime - start.current) / SPIN_DURATION;
    if (t >= 1) { ref.current.rotation.y = 0; return; }
    const eased = 1 - Math.pow(1 - t, 3);
    ref.current.rotation.y = SPIN_TURNS * Math.PI * 2 * (1 - eased);
  });
  return <group ref={ref}>{children}</group>;
}

// ─── one person slot (asterisk → avatar) ─────────────────────────────────────
function PersonSlot({
  slotIndex, person, library, scrollPosRef, halfViewRef, onPick,
}: {
  slotIndex: number;
  person: Person;
  library: AvatarVariantLibrary;
  scrollPosRef: React.MutableRefObject<number>;
  halfViewRef: React.MutableRefObject<number>;
  onPick: (id: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const rotRef = useRef<THREE.Group>(null);

  // Show the spinning asterisk briefly, then reveal the avatar — gives a
  // progressive "loading" feel as slots scroll into view.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 160 + Math.random() * 260);
    return () => clearTimeout(t);
  }, []);

  const colors = useMemo(() => colorsFromConfig(person.avatarConfig), [person.avatarConfig]);
  const variants = useMemo(() => variantsFromConfig(person.avatarConfig), [person.avatarConfig]);

  // Turn toward the centre of the view, based on the slot's live world X.
  useFrame(() => {
    if (!rotRef.current) return;
    const worldX = (slotIndex - scrollPosRef.current) * SLOT_W;
    const a = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, -(worldX / halfViewRef.current) * MAX_ANGLE));
    rotRef.current.rotation.y = a;
  });

  const x = slotIndex * SLOT_W;
  if (!ready) return <AsteriskSprite x={x} />;

  return (
    <group
      position={[x, AVATAR_Y, 0]}
      scale={AVATAR_SCALE}
      onClick={(e) => { e.stopPropagation(); onPick(person.id); }}
      onPointerOver={(e) => { const t = e.nativeEvent?.target as HTMLElement | undefined; if (t) t.style.cursor = "pointer"; }}
      onPointerOut={(e) => { const t = e.nativeEvent?.target as HTMLElement | undefined; if (t) t.style.cursor = ""; }}
    >
      {/* invisible hit box so the whole figure is clickable, not just the meshes */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[1.6, 3.4, 1.0]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={rotRef}>
        <SpinIn>
          <CharacterGroup
            library={library}
            variantIndices={variants}
            colors={colors}
            showOutline
            outlineExpansion={0.05}
          />
        </SpinIn>
      </group>
    </group>
  );
}

// ─── the moving strip ────────────────────────────────────────────────────────
function Strip({
  people, library, scrollPosRef, velocityRef, draggingRef, zoomRef, initialCenter, onPick,
}: {
  people: Person[];
  library: AvatarVariantLibrary;
  scrollPosRef: React.MutableRefObject<number>;
  velocityRef: React.MutableRefObject<number>;
  draggingRef: React.MutableRefObject<boolean>;
  zoomRef: React.MutableRefObject<number>;
  initialCenter: number;
  onPick: (id: string) => void;
}) {
  const { size, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [center, setCenter] = useState(initialCenter);
  const halfViewRef = useRef(VIEW_WIDTH_DESKTOP / 2);
  const appliedZoom = useRef(-1);

  // Look target (camera position is fixed; only the look height matters).
  useEffect(() => {
    (camera as THREE.OrthographicCamera).lookAt(0, 2.2, 0);
  }, [camera]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // While dragging, the pointer handler drives scrollPos directly. On release,
    // glide with friction (momentum) until we settle.
    if (!draggingRef.current) {
      scrollPosRef.current += velocityRef.current * dt;
      velocityRef.current *= Math.exp(-FRICTION_DECAY * dt);
      if (Math.abs(velocityRef.current) < VELOCITY_EPS) velocityRef.current = 0;
    }
    if (groupRef.current) groupRef.current.position.x = -scrollPosRef.current * SLOT_W;
    const c = Math.round(scrollPosRef.current);
    if (c !== center) setCenter(c);

    // Apply zoom live (keyboard / wheel / pinch) — effective view width shrinks
    // as zoom grows. Only touch the projection matrix when something changed.
    const baseViewW = size.width < 640 ? VIEW_WIDTH_MOBILE : VIEW_WIDTH_DESKTOP;
    const effViewW = baseViewW / zoomRef.current;
    halfViewRef.current = effViewW / 2;
    const desiredZoom = size.width / effViewW;
    if (Math.abs(desiredZoom - appliedZoom.current) > 1e-4) {
      const ortho = camera as THREE.OrthographicCamera;
      ortho.zoom = desiredZoom;
      ortho.updateProjectionMatrix();
      appliedZoom.current = desiredZoom;
    }
  });

  const N = people.length;
  const slots: number[] = [];
  for (let s = center - MOUNT_HALF; s <= center + MOUNT_HALF; s++) slots.push(s);

  return (
    <group ref={groupRef}>
      {slots.map((s) => (
        <PersonSlot
          key={s}
          slotIndex={s}
          person={people[mod(s, N)]}
          library={library}
          scrollPosRef={scrollPosRef}
          halfViewRef={halfViewRef}
          onPick={onPick}
        />
      ))}
    </group>
  );
}

// ─── public component ────────────────────────────────────────────────────────
export function EveryoneGallery({ people, currentUserId }: { people: Person[]; currentUserId: string }) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initialCenter = useMemo(() => {
    const i = people.findIndex((p) => p.id === currentUserId);
    return i >= 0 ? i : 0;
  }, [people, currentUserId]);

  const scrollPosRef = useRef(initialCenter);
  const velocityRef = useRef(0);     // slots/sec, for flick momentum
  const draggingRef = useRef(false); // a 1-finger drag is in progress
  const zoomRef = useRef(1);
  // True once a gesture has moved enough to count as a drag/pinch — used to
  // suppress the click→navigate that would otherwise fire when a drag ends on
  // an avatar.
  const draggedRef = useRef(false);

  useEffect(() => { getAvatarLibrary().then(setLibrary).catch(() => {}); }, []);

  const onPick = (id: string) => {
    if (draggedRef.current) return;
    router.push(`/users/${id}`);
  };

  // Pixels per slot, accounting for the current zoom, for translating drag/wheel
  // deltas into scroll units.
  const pxPerSlot = () => {
    const w = wrapRef.current?.clientWidth ?? 1280;
    const baseViewW = w < 640 ? VIEW_WIDTH_MOBILE : VIEW_WIDTH_DESKTOP;
    const effViewW = baseViewW / zoomRef.current;
    return (w / effViewW) * SLOT_W;
  };

  // Inputs: drag to travel, mouse-wheel / Shift+=/− to zoom, horizontal
  // trackpad swipe to travel, two-finger pinch to zoom, arrow keys to travel.
  // The strip loops infinitely, so the scroll target is never clamped.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let startX = 0;
    let startPos = 0;          // scrollPos when the drag began
    let lastPos = 0;           // scrollPos at the previous move (for velocity)
    let lastMoveT = 0;
    let pinching = false;
    let pinchStartDist = 0;
    let pinchStartZoom = 1;

    const dist = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const beginDrag = (x: number) => {
      draggingRef.current = true;
      velocityRef.current = 0;
      startX = x;
      startPos = scrollPosRef.current;
      lastPos = scrollPosRef.current;
      lastMoveT = performance.now();
      el.style.cursor = "grabbing";
    };

    // NB: no setPointerCapture — capturing on the wrapper would stop the child
    // canvas from receiving pointerup, breaking R3F's click-to-navigate. We track
    // the gesture on window instead so drags still work outside the element.
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      draggedRef.current = false;
      if (pointers.size === 2) {
        pinching = true;
        draggingRef.current = false;
        pinchStartDist = dist();
        pinchStartZoom = zoomRef.current;
      } else if (pointers.size === 1) {
        beginDrag(e.clientX);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinching && pointers.size >= 2) {
        zoomRef.current = clampZoom(pinchStartZoom * (dist() / pinchStartDist));
        draggedRef.current = true;
        return;
      }
      if (draggingRef.current) {
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 6) draggedRef.current = true;
        const newPos = startPos - dx / pxPerSlot();
        const now = performance.now();
        const dtm = (now - lastMoveT) / 1000;
        if (dtm > 0) {
          const vInst = (newPos - lastPos) / dtm;
          velocityRef.current = clampVel(velocityRef.current * 0.6 + vInst * 0.4);
        }
        lastPos = newPos;
        lastMoveT = now;
        scrollPosRef.current = newPos;
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinching = false;
      if (pointers.size === 0) {
        draggingRef.current = false;
        // Drop stale velocity if the finger paused before lifting (no flick).
        if (performance.now() - lastMoveT > FLICK_IDLE_MS) velocityRef.current = 0;
        el.style.cursor = "grab";
      } else if (pointers.size === 1 && !pinching) {
        // one finger remains after a pinch — resume dragging from there
        const [p] = [...pointers.values()];
        beginDrag(p.x);
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // keep the gesture in-app (no browser back-swipe)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        scrollPosRef.current += e.deltaX / pxPerSlot(); // horizontal swipe travels
        velocityRef.current = 0;
      } else {
        zoomRef.current = clampZoom(zoomRef.current * Math.exp(-e.deltaY * 0.0015)); // wheel zooms
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") velocityRef.current = clampVel(velocityRef.current + KEY_IMPULSE);
      else if (e.key === "ArrowLeft") velocityRef.current = clampVel(velocityRef.current - KEY_IMPULSE);
      else if (e.key === "+" || e.key === "=") zoomRef.current = clampZoom(zoomRef.current * ZOOM_KEY_STEP);
      else if (e.key === "-" || e.key === "_") zoomRef.current = clampZoom(zoomRef.current / ZOOM_KEY_STEP);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div style={{ height: "100svh", display: "flex", flexDirection: "column", background: "white", overflow: "hidden" }}>
      <AppHeader breadcrumbs={BREADCRUMBS} />
      <div ref={wrapRef} style={{ position: "relative", flex: 1, cursor: "grab", touchAction: "none" }}>
        {library && people.length > 0 && (
          <Canvas
            orthographic
            camera={{ position: [0, 3.2, 10], zoom: 40, near: -100, far: 100 }}
            gl={{ antialias: true, stencil: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <color attach="background" args={["#ffffff"]} />
            <ambientLight intensity={1.4} />
            <directionalLight position={[-5, 7, 4]} intensity={1.2} />
            <directionalLight position={[3, 2, -2]} intensity={0.15} />
            <Strip
              people={people}
              library={library}
              scrollPosRef={scrollPosRef}
              velocityRef={velocityRef}
              draggingRef={draggingRef}
              zoomRef={zoomRef}
              initialCenter={initialCenter}
              onPick={onPick}
            />
          </Canvas>
        )}
        <p style={{
          position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center",
          fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 13, color: "#bbb",
          pointerEvents: "none", margin: 0,
        }}>
          drag or ← → to travel · scroll or pinch to zoom · click someone to visit them
        </p>
      </div>
    </div>
  );
}
