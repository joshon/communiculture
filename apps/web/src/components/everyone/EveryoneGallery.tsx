"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import { AppHeader } from "@/components/ui/AppHeader";
import { getAvatarLibrary } from "@/lib/avatarLibraryCache";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";
import { DEFAULT_AVATAR, type AvatarConfig } from "@/store/avatarStore";

// ─── tunable layout constants ────────────────────────────────────────────────
const SLOT_W = 3.2;            // world units between neighbours (arms nearly touch)
const AVATAR_SCALE = 1.0;
const AVATAR_Y = 0.05;         // feet just above the ground line
const ASTERISK_Y = 2.2;        // placeholder sits where the body will appear
const VIEW_WIDTH_DESKTOP = 32; // world units across the canvas (~10 visible)
const VIEW_WIDTH_MOBILE = 16;  // narrower → bigger avatars on phones
const MAX_ANGLE = (32 * Math.PI) / 180; // max turn-toward-centre
const MOUNT_HALF = 24;         // slots mounted each side of centre → 49 total (≤ 100)
const SPIN_TURNS = 3;
const SPIN_DURATION = 1.4;
const BREADCRUMBS = [{ label: "home", href: "/dashboard" }, { label: "everyone" }];

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
  slotIndex, person, library, scrollPosRef, halfViewRef,
}: {
  slotIndex: number;
  person: Person;
  library: AvatarVariantLibrary;
  scrollPosRef: React.MutableRefObject<number>;
  halfViewRef: React.MutableRefObject<number>;
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
    <group position={[x, AVATAR_Y, 0]} scale={AVATAR_SCALE}>
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
  people, library, scrollPosRef, targetRef, initialCenter,
}: {
  people: Person[];
  library: AvatarVariantLibrary;
  scrollPosRef: React.MutableRefObject<number>;
  targetRef: React.MutableRefObject<number>;
  initialCenter: number;
}) {
  const { size, camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [center, setCenter] = useState(initialCenter);
  const halfViewRef = useRef(VIEW_WIDTH_DESKTOP / 2);

  // Responsive zoom + look target.
  useEffect(() => {
    const mobile = size.width < 640;
    const viewW = mobile ? VIEW_WIDTH_MOBILE : VIEW_WIDTH_DESKTOP;
    halfViewRef.current = viewW / 2;
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = size.width / viewW;
    ortho.lookAt(0, 2.2, 0);
    ortho.updateProjectionMatrix();
  }, [size.width, size.height, camera]);

  useFrame((_, delta) => {
    // Smooth-damp the strip toward the scroll target.
    const k = Math.min(1, delta * 9);
    scrollPosRef.current += (targetRef.current - scrollPosRef.current) * k;
    if (groupRef.current) groupRef.current.position.x = -scrollPosRef.current * SLOT_W;
    const c = Math.round(scrollPosRef.current);
    if (c !== center) setCenter(c);
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
        />
      ))}
    </group>
  );
}

// ─── public component ────────────────────────────────────────────────────────
export function EveryoneGallery({ people, currentUserId }: { people: Person[]; currentUserId: string }) {
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const initialCenter = useMemo(() => {
    const i = people.findIndex((p) => p.id === currentUserId);
    return i >= 0 ? i : 0;
  }, [people, currentUserId]);

  const scrollPosRef = useRef(initialCenter);
  const targetRef = useRef(initialCenter);

  useEffect(() => { getAvatarLibrary().then(setLibrary).catch(() => {}); }, []);

  // Pixels per slot, for translating drag/wheel deltas into scroll units.
  const pxPerSlot = () => {
    const w = wrapRef.current?.clientWidth ?? 1280;
    const viewW = w < 640 ? VIEW_WIDTH_MOBILE : VIEW_WIDTH_DESKTOP;
    return (w / viewW) * SLOT_W;
  };

  // Scroll inputs: drag, wheel, arrow keys. The strip loops infinitely, so the
  // target is never clamped.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let dragging = false;
    let startX = 0;
    let startTarget = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      startX = e.clientX;
      startTarget = targetRef.current;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      targetRef.current = startTarget - (e.clientX - startX) / pxPerSlot();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      el.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      targetRef.current += d / pxPerSlot();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") targetRef.current += 1;
      else if (e.key === "ArrowLeft") targetRef.current -= 1;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div style={{ height: "100svh", display: "flex", flexDirection: "column", background: "white", overflow: "hidden" }}>
      <AppHeader breadcrumbs={BREADCRUMBS} />
      <div ref={wrapRef} style={{ position: "relative", flex: 1, cursor: "grab", touchAction: "pan-y" }}>
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
              targetRef={targetRef}
              initialCenter={initialCenter}
            />
          </Canvas>
        )}
        <p style={{
          position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center",
          fontFamily: "var(--font-inter), Inter, sans-serif", fontSize: 13, color: "#bbb",
          pointerEvents: "none", margin: 0,
        }}>
          drag, scroll, or use ← → to travel through everyone
        </p>
      </div>
    </div>
  );
}
