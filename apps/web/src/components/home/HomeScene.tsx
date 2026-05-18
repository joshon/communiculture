"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PillButton } from "@/components/ui/PillButton";
import * as THREE from "three";
import { CharacterGroup } from "@/components/avatar/AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

const LOGO_BLUE = "#0083FF";

// ─── same palette as AvatarEditor ─────────────────────────────────────────────
const COLOR_PALETTE = [
  "#608E76", "#90994F", "#E2F161", "#F7D45D", "#917143", "#F3BD87",
  "#6CAE8C", "#659AC7", "#6EBBD9", "#3F58D0", "#93559C", "#E96475",
  "#EA6BA8", "#EDA5CF", "#EE9181", "#A7A6A4", "#191A1C", "#F5F3F2",
];
const SKIN_TONES = ["#F5F3F2", "#F3BD87", "#EE9181", "#917143", "#191A1C"];
const SKIN_PARTS: AvatarPart[] = ["head", "neck", "arms", "legs"];

function randomColors(): Record<AvatarPart, string> {
  const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
  const rand = () => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  return {
    hair:  rand(),
    head:  skin,
    face:  "#191A1C",
    neck:  skin,
    arms:  skin,
    body:  rand(),
    pants: rand(),
    legs:  skin,
    shoes: rand(),
  };
}

function randomVariants(library: AvatarVariantLibrary): Record<AvatarPart, number> {
  return Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, Math.floor(Math.random() * (library[p]?.length ?? 1))])
  ) as Record<AvatarPart, number>;
}

const DEFAULT_VARIANTS = Object.fromEntries(
  AVATAR_PARTS.map((p) => [p, 0])
) as Record<AvatarPart, number>;

// ─── animation constants ──────────────────────────────────────────────────────
const PEAK         = 2.5;
const BOUNCE_SPEED = 0.4;
const BASE_SPIN    = Math.PI * 1.2;
const LAND_SPIN    = Math.PI * 8;

// ─── asterisk animation ───────────────────────────────────────────────────────
// 6 spikes at 60° intervals, first pointing straight up.
const SPIKE_COUNT  = 6;
const SPIKE_R      = 9;
const REST_ANGLES  = [0, 60, 120, 180, 240, 300] as const;
// Each spike folds to 0° via the shortest path.
// Spikes 0-3: counterclockwise (→ 0). Spikes 4-5: clockwise (→ 360 ≡ 0).
const FOLD_TARGETS = [0, 0, 0, 0, 360, 360] as const;

// Single compression scalar p (0 = at rest, 1 = fully pushed / folded).
// Spring stiffness / damping — underdamped so p overshoots below 0 on rebound
// (asterisk briefly pops above rest, which looks like a launch).
const SPRING_K     = 200;    // stiffness
const SPRING_D     = 8;      // damping (underdamped → overshoot)
const PUSH_VEL     = 16;     // initial downward velocity given to p at landing
// p must exceed FOLD_START before spikes begin folding (asterisk travels down
// first; spikes only engage once it hits the N letterform).
// Spikes reach full collapse at FOLD_FULL — well below the spring's peak (~0.9)
// so they snap fully shut and hold there while inside the N.
const FOLD_START   = 0.35;
const FOLD_FULL    = 0.72;
// Y push expressed as % of the overlay div's own height (CSS transform units).
// Overlay height ≈ 32% of logo height, so 47% of overlay ≈ 15% of logo height.
const MAX_PUSH_PCT = 122;
// Initial spin speed in deg/s — decays to near-zero in ~1.7 s.
const SPIN_BURST   = 1800;

// ─── logo sizing ─────────────────────────────────────────────────────────────
const LOGO_WORLD_WIDTH  = 4.5;
const LOGO_ASPECT       = 361 / 65;
const LOGO_ASTERISK_X   = 246.67 / 361;   // exact centre from SVG path
const LOGO_ASTERISK_TOP = 8.73   / 65;

// ─── responsive camera ────────────────────────────────────────────────────────
function responsiveZoom(w: number) { return Math.max(48, Math.min(100, w / 20)); }
const CAM_POS: [number, number, number] = [2.165, 3.0, 3.75];
const CAM_LOOKAT = new THREE.Vector3(0, 1.3, 0);

function CameraSetup() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = responsiveZoom(size.width);
    cam.lookAt(CAM_LOOKAT);
    cam.updateProjectionMatrix();
  }, [camera, size.width]);
  return null;
}

function LogoAligner({ onUpdate }: { onUpdate: (sx: number, sy: number, zoom: number) => void }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const v = new THREE.Vector3(0, 0, 0);
    v.project(camera);
    onUpdate(((v.x + 1) / 2) * size.width, ((-v.y + 1) / 2) * size.height, (camera as THREE.OrthographicCamera).zoom);
  });
  return null;
}

// ─── asterisk controller ──────────────────────────────────────────────────────
// A single scalar p drives all asterisk motion:
//   p = 0          → at rest, no fold, no Y displacement
//   p = 0 → peak   → asterisk pushes DOWN; spikes start folding once p > FOLD_START
//   p = peak → 0   → spring-back; asterisk rises; spikes unfold; spin decelerates
//   p < 0          → overshoots upward (launch feel) then settles
//
// Everything updates via direct DOM mutation — no React re-renders.
function AsteriskController({
  avatarTRef,
  overlayRef,
  spinGroupRef,
  spikeGroupsRef,
}: {
  avatarTRef:    React.MutableRefObject<number>;
  overlayRef:    React.MutableRefObject<HTMLDivElement | null>;
  spinGroupRef:  React.MutableRefObject<SVGGElement | null>;
  spikeGroupsRef: React.MutableRefObject<(SVGGElement | null)[]>;
}) {
  const prevT       = useRef(0);
  const active      = useRef(false);
  const p           = useRef(0);
  const pVel        = useRef(0);
  const spinAngle   = useRef(0);
  const spinSpeed   = useRef(0);
  const spinStarted = useRef(false);

  useFrame((_, delta) => {
    const t = avatarTRef.current;

    // ── detect landing ────────────────────────────────────────────────────
    if (t < prevT.current && prevT.current > 0.9) {
      active.current      = true;
      p.current           = 0;
      pVel.current        = PUSH_VEL;   // kick downward
      spinStarted.current = false;      // spin fires only at peak, not landing
    }
    prevT.current = t;

    // ── spring physics ────────────────────────────────────────────────────
    if (active.current) {
      const acc = SPRING_K * (0 - p.current) - SPRING_D * pVel.current;
      pVel.current  += acc * delta;
      p.current     += pVel.current * delta;

      // Spin starts the moment the spring reverses (peak compression).
      // This lets the fold be clearly visible before the spin kicks in.
      if (!spinStarted.current && pVel.current < 0) {
        spinStarted.current = true;
        spinSpeed.current   = SPIN_BURST;
      }

      spinAngle.current += spinSpeed.current * delta;
      spinSpeed.current *= Math.pow(0.03, delta);

      if (Math.abs(p.current) < 0.005 && Math.abs(pVel.current) < 0.01 && spinSpeed.current < 0.5) {
        active.current    = false;
        p.current         = 0;
        pVel.current      = 0;
        // spinAngle kept as-is — no snap
        spinSpeed.current = 0;
      }
    }

    // ── derive fold progress from p ───────────────────────────────────────
    // Clamp to [0,1]: spikes don't move before the asterisk hits the N (p < FOLD_START)
    // and don't over-rotate past fully folded.
    const pPos       = Math.max(0, p.current);            // ignore upward overshoot for folding
    const foldProg   = Math.max(0, Math.min(1, (pPos - FOLD_START) / (FOLD_FULL - FOLD_START)));

    // ── DOM updates ───────────────────────────────────────────────────────
    // Y displacement: use raw p (allows negative overshoot → brief upward pop)
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.style.transform = `translate(-50%, calc(-50% + ${p.current * MAX_PUSH_PCT}%))`;
    }

    const sg = spinGroupRef.current;
    if (sg) sg.setAttribute("transform", `rotate(${spinAngle.current % 360})`);

    const groups = spikeGroupsRef.current;
    for (let i = 0; i < SPIKE_COUNT; i++) {
      const g = groups[i];
      if (g) {
        const angle = REST_ANGLES[i] + foldProg * (FOLD_TARGETS[i] - REST_ANGLES[i]);
        g.setAttribute("transform", `rotate(${angle})`);
      }
    }
  });

  return null;
}

// ─── bouncing avatar ──────────────────────────────────────────────────────────
function BouncingAvatar({ library, tRef }: {
  library: AvatarVariantLibrary;
  tRef: React.MutableRefObject<number>;
}) {
  const groupRef  = useRef<THREE.Group>(null);
  const t         = useRef(0);
  const rotY      = useRef(0);
  const spinSpeed = useRef(BASE_SPIN);

  const [colors,   setColors]   = useState<Record<AvatarPart, string>>(() => randomColors());
  const [variants, setVariants] = useState<Record<AvatarPart, number>>(DEFAULT_VARIANTS);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const nextT = (t.current + delta * BOUNCE_SPEED) % 1;
    if (nextT < t.current) {
      setColors(randomColors());
      setVariants(randomVariants(library));
      spinSpeed.current = LAND_SPIN;
    }
    t.current = nextT;
    tRef.current = nextT;
    if (spinSpeed.current > BASE_SPIN) {
      spinSpeed.current = Math.max(BASE_SPIN, spinSpeed.current * Math.pow(0.15, delta));
    }
    rotY.current += spinSpeed.current * delta;
    groupRef.current.position.y = PEAK * 4 * t.current * (1 - t.current);
    groupRef.current.rotation.y = rotY.current;
  });

  return (
    <group ref={groupRef} scale={0.768}>
      <CharacterGroup library={library} variantIndices={variants} colors={colors} showOutline={true} />
    </group>
  );
}

// ─── main scene ───────────────────────────────────────────────────────────────
export function HomeScene() {
  const router = useRouter();
  const [library, setLibrary] = useState<AvatarVariantLibrary | null>(null);

  const logoDivRef        = useRef<HTMLDivElement>(null);
  const asteriskOverlayRef = useRef<HTMLDivElement>(null);
  const avatarTRef        = useRef(0);
  const spinGroupRef      = useRef<SVGGElement | null>(null);
  const spikeGroupsRef    = useRef<(SVGGElement | null)[]>(new Array(SPIKE_COUNT).fill(null));

  useEffect(() => {
    fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((d: { library: AvatarVariantLibrary } | null) => {
        if (d?.library) setLibrary(d.library);
      });
  }, []);

  const handleLogoUpdate = useCallback((sx: number, sy: number, zoom: number) => {
    const el = logoDivRef.current;
    if (!el) return;
    const w = LOGO_WORLD_WIDTH * zoom;
    const h = w / LOGO_ASPECT;
    el.style.width      = `${w}px`;
    el.style.height     = `${h}px`;
    el.style.left       = `${sx - LOGO_ASTERISK_X * w}px`;
    el.style.top        = `${sy - LOGO_ASTERISK_TOP * h}px`;
    el.style.visibility = "visible";

    const ov = asteriskOverlayRef.current;
    if (ov) {
      const size = 0.058 * w;
      ov.style.width      = `${size}px`;
      ov.style.height     = `${size}px`;
      ov.style.left       = `${sx + 0.008 * w}px`;
      ov.style.top        = `${sy}px`;
      ov.style.visibility = "visible";
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100svh", background: "white", position: "relative", overflow: "hidden" }}>

      {/* About button */}
      <div style={{ position: "absolute", top: "clamp(14px,2vw,24px)", right: "clamp(14px,2vw,24px)", zIndex: 10, pointerEvents: "auto" }}>
        <PillButton href="/about">about communiculture</PillButton>
      </div>

      {/* Animated asterisk — behind everything else (zIndex 0) */}
      <div
        ref={asteriskOverlayRef}
        style={{
          position:    "absolute",
          visibility:  "hidden",
          transform:   "translate(-50%, -50%)",
          pointerEvents: "none",
          overflow:    "visible",
          zIndex:      0,
        }}
      >
        <svg viewBox="-12 -12 24 24" width="100%" height="100%" style={{ overflow: "visible" }}>
          {/* Outer <g>: overall post-spring spin */}
          <g ref={(el) => { spinGroupRef.current = el; }}>
            {Array.from({ length: SPIKE_COUNT }, (_, i) => (
              // Inner <g>: individual spike rotation (fold/unfold)
              <g
                key={i}
                ref={(el) => { spikeGroupsRef.current[i] = el; }}
                transform={`rotate(${REST_ANGLES[i]})`}
              >
                <line x1="0" y1="0" x2="0" y2={-SPIKE_R}
                  stroke={LOGO_BLUE} strokeWidth="3.2" strokeLinecap="round" />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Logo (no baked-in asterisk) */}
      <div
        ref={logoDivRef}
        onClick={() => router.push("/login")}
        style={{ position: "absolute", visibility: "hidden", cursor: "pointer", zIndex: 2, pointerEvents: "auto" }}
      >
        <Image
          src="/logo-no-asterisk.svg"
          alt="communi*culture"
          width={361} height={65}
          style={{ width: "100%", height: "auto", display: "block" }}
          priority
        />
      </div>

      {/* R3F canvas */}
      <Canvas
        orthographic
        camera={{ position: CAM_POS, zoom: 72, near: -100, far: 100 }}
        style={{ position: "absolute", inset: 0, cursor: "pointer", zIndex: 1 }}
        gl={{ alpha: true }}
        onClick={() => router.push("/login")}
      >
        <CameraSetup />
        <LogoAligner onUpdate={handleLogoUpdate} />
        <AsteriskController
          avatarTRef={avatarTRef}
          overlayRef={asteriskOverlayRef}
          spinGroupRef={spinGroupRef}
          spikeGroupsRef={spikeGroupsRef}
        />

        <ambientLight intensity={1.5} />
        <directionalLight position={[-5, 7, 4]} intensity={1.6} castShadow />
        <directionalLight position={[3, 2, -2]} intensity={0.15} />

        {library && <BouncingAvatar library={library} tRef={avatarTRef} />}
      </Canvas>
    </div>
  );
}
