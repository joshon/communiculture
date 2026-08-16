"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html, Line } from "@react-three/drei";
import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import type { AvatarVariantLibrary, AvatarPart, MeshElement } from "@/components/avatar-builder/types";
import { AVATAR_PARTS, isSymmetric } from "@/components/avatar-builder/types";
import { createTaperedBoxGeometry } from "@/lib/taperedBoxGeometry";
import { getStickerTexture } from "@/lib/stickerTextures";

// Logo blue — must match the SVG and editor
const LOGO_BLUE = "#0083FF";

// Editor camera elevation above the horizon (lower = more level / less top-down).
// Was 30°; the continuum is ~26.6°. Set a touch lower for a clearly flatter view.
const EDITOR_ELEVATION_DEG = 20;
const EDITOR_POLAR_ANGLE = ((90 - EDITOR_ELEVATION_DEG) * Math.PI) / 180;

// ─── viewport-proportional zoom (scales avatar like a video with page width) ──

function CameraController({ zoomMultiplier = 1, fixedZoom }: { zoomMultiplier?: number; fixedZoom?: number }) {
  const { size, camera } = useThree();
  useEffect(() => {
    const orthoCamera = camera as THREE.OrthographicCamera;
    if (fixedZoom !== undefined) {
      orthoCamera.zoom = fixedZoom;
      orthoCamera.updateProjectionMatrix();
      return;
    }
    const mobile = size.width < 1024;
    const base = mobile
      ? Math.max(40, Math.min(size.width / 3.6, 150))
      : Math.max(55, Math.min(170, size.width / 9));
    orthoCamera.zoom = base * zoomMultiplier;
    // Mobile: center avatar. Desktop: shift ~72% from left.
    const offsetX = mobile ? 0 : -size.width * 0.22;
    orthoCamera.setViewOffset(size.width, size.height, offsetX, 0, size.width, size.height);
    orthoCamera.updateProjectionMatrix();
  }, [size.width, size.height, camera, zoomMultiplier, fixedZoom]);
  return null;
}

// ─── frame geometry ───────────────────────────────────────────────────────────

function addRoundedRectPath(p: THREE.Shape | THREE.Path, hw: number, hh: number, r: number) {
  const cr = Math.min(Math.abs(r), hw, hh);
  if (cr < 0.001) {
    p.moveTo(-hw, -hh); p.lineTo(hw, -hh); p.lineTo(hw, hh); p.lineTo(-hw, hh); p.lineTo(-hw, -hh);
  } else {
    p.moveTo(-hw + cr, -hh);
    p.lineTo(hw - cr, -hh);  p.quadraticCurveTo(hw, -hh, hw, -hh + cr);
    p.lineTo(hw, hh - cr);   p.quadraticCurveTo(hw, hh, hw - cr, hh);
    p.lineTo(-hw + cr, hh);  p.quadraticCurveTo(-hw, hh, -hw, hh - cr);
    p.lineTo(-hw, -hh + cr); p.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);
  }
}

function useFrameGeo(
  borderX: number, borderY: number,
  outerRadius: number, curveSegs: number
): THREE.BufferGeometry | null {
  return useMemo(() => {
    if (borderX <= 0 || borderY <= 0) return null;
    const innerHW = 0.5 - borderX;
    const innerHH = 0.5 - borderY;
    if (innerHW < 0.01 || innerHH < 0.01) return null;
    const innerRadius = Math.max(0, outerRadius - Math.min(borderX, borderY));
    const shape = new THREE.Shape();
    addRoundedRectPath(shape, 0.5, 0.5, outerRadius);
    const hole = new THREE.Path();
    addRoundedRectPath(hole, innerHW, innerHH, innerRadius);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, Math.max(3, curveSegs));
  }, [borderX, borderY, outerRadius, curveSegs]);
}

// ─── tapered geometry ─────────────────────────────────────────────────────────

function TaperedGeom({ topScale }: { topScale: [number, number] }) {
  const geo = useMemo(
    () => createTaperedBoxGeometry(topScale[0], topScale[1]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topScale[0], topScale[1]]
  );
  return <primitive object={geo} attach="geometry" />;
}

// ─── single element mesh ──────────────────────────────────────────────────────

function RenderMesh({
  element,
  color,
  part,
  isMirror = false,
  highlight = false,
  showOutline = false,
  overrideOutlineColor,
  outlineExpansion = 0.04,
  baseRenderOrder = 0,
  onPartClick,
  unlit = false,
  emissiveBoost = 0,
  roughness: roughnessOverride,
  metalness: metalnessOverride,
  forceColor = false,
}: {
  element: MeshElement;
  color: string;
  part?: AvatarPart;
  isMirror?: boolean;
  highlight?: boolean;
  showOutline?: boolean;
  overrideOutlineColor?: string;
  outlineExpansion?: number;
  baseRenderOrder?: number;
  onPartClick?: (part: AvatarPart) => void;
  unlit?: boolean;
  emissiveBoost?: number;
  roughness?: number;
  metalness?: number;
  forceColor?: boolean;
}) {
  const meshColor = useMemo(() => {
    // forceColor (bots): ignore element.color and colorLightness; planes get a -20% lightness to add detail
    if (forceColor) {
      if (element.type === "plane") {
        const c = new THREE.Color(color);
        c.offsetHSL(0, 0, -0.2);
        return c;
      }
      return color;
    }
    const base = element.color ?? color;
    if (!element.colorLightness) return base;
    const c = new THREE.Color(base);
    c.offsetHSL(0, 0, element.colorLightness);
    return c;
  }, [element.color, element.colorLightness, element.type, color, forceColor]);

  const opacity = element.opacity ?? 1;
  const needsTransparency = opacity < 1 || !!element.texture;
  const useRounded = element.type === "box" && !!element.radius && element.radius > 0;
  const roundRadius = element.radius ?? 0;
  const roundSmooth = element.smoothness ?? 2;
  const cylSegs = element.segments ?? 14;
  const sphSegs = element.segments ?? 16;
  const cylArc = element.halfCylinder ? Math.PI : Math.PI * 2;
  const cylThetaStart = isMirror && element.halfCylinder ? Math.PI : 0;
  const meshPreRot: [number, number, number] =
    element.type === "cylinder"
      ? element.cylinderAxis === "X" ? [0, 0, isMirror ? Math.PI / 2 : -Math.PI / 2]
      : element.cylinderAxis === "Z" ? [Math.PI / 2, 0, 0]
      : [0, 0, 0]
    : [0, 0, 0];

  const outlineWidth = element.outlineWidth ?? 0;
  const hasOutline = outlineWidth > 0;
  const outlineColor = overrideOutlineColor ?? element.outlineColor ?? "#ffffff";
  const silhouetteColor = overrideOutlineColor ?? "#1a1a1a";
  const frameLocalZ = element.type === "plane" ? 0.001 : 0.501;
  const borderX = hasOutline ? outlineWidth / element.scale[0] : 0;
  const borderY = hasOutline ? outlineWidth / element.scale[1] : 0;
  const frameGeo = useFrameGeo(borderX, borderY, roundRadius, Math.max(3, roundSmooth * 2));

  const isFlat = (element.flat ?? false) || unlit;
  const emissive = useMemo(() => {
    if (emissiveBoost > 0) return new THREE.Color(meshColor);
    return new THREE.Color(element.emissiveColor ?? "#000000");
  }, [element.emissiveColor, emissiveBoost, meshColor]);
  const emissiveIntensity = emissiveBoost > 0 ? emissiveBoost : (element.emissiveIntensity ?? 0);

  const stickerTex = useMemo(
    () => (element.texture ? getStickerTexture(element.texture) : null),
    [element.texture]
  );

  const stencilWrite = showOutline
    ? ({
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      } as const)
    : ({} as const);

  // Shell renders at baseRenderOrder (first), body overpaints at +1 or +2
  const mainRenderOrder = baseRenderOrder + 1 + (hasOutline ? 1 : 0);

  const sharedMat = {
    color: meshColor,
    transparent: true,
    opacity,
    depthWrite: hasOutline ? false : !needsTransparency,
    map: stickerTex ?? undefined,
    alphaTest: stickerTex ? 0.05 : 0,
    side: element.type === "plane" ? THREE.DoubleSide : THREE.FrontSide,
    ...stencilWrite,
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    if (part && onPartClick) {
      e.stopPropagation();
      onPartClick(part);
    }
  };

  return (
    <group position={element.position} rotation={element.rotation}>
      <group scale={element.scale}>
        {useRounded ? (
          <RoundedBox
            args={[1, 1, 1]}
            radius={roundRadius}
            smoothness={roundSmooth}
            renderOrder={mainRenderOrder}
            onClick={handleClick}
          >
            {isFlat ? (
              <meshBasicMaterial {...sharedMat} />
            ) : (
              <meshStandardMaterial {...sharedMat} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={roughnessOverride ?? 0.7} metalness={metalnessOverride ?? 0.05} />
            )}
          </RoundedBox>
        ) : (
          <mesh rotation={meshPreRot} renderOrder={mainRenderOrder} onClick={handleClick}>
            {element.type === "box" && <boxGeometry args={[1, 1, 1]} />}
            {element.type === "sphere" && <sphereGeometry args={[0.5, sphSegs, Math.max(2, Math.round(sphSegs * 0.75))]} />}
            {element.type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1, cylSegs, 1, false, cylThetaStart, cylArc]} />}
            {element.type === "tapered" && <TaperedGeom topScale={element.topScale ?? [1, 1]} />}
            {element.type === "plane" && <planeGeometry args={[1, 1]} />}
            {isFlat ? (
              <meshBasicMaterial {...sharedMat} />
            ) : (
              <meshStandardMaterial {...sharedMat} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={roughnessOverride ?? 0.7} metalness={metalnessOverride ?? 0.05} />
            )}
          </mesh>
        )}

        {hasOutline && frameGeo && (
          <mesh position={[0, 0, frameLocalZ]} renderOrder={baseRenderOrder + 3}>
            <primitive object={frameGeo} attach="geometry" />
            <meshBasicMaterial color={outlineColor} side={THREE.DoubleSide} transparent opacity={1} depthWrite={false} />
          </mesh>
        )}
      </group>

      {showOutline && element.type !== "plane" && (
        <group scale={[
          element.scale[0] + outlineExpansion,
          element.scale[1] + outlineExpansion,
          element.scale[2] + outlineExpansion,
        ]}>
          {useRounded ? (
            <RoundedBox args={[1, 1, 1]} radius={roundRadius} smoothness={roundSmooth} renderOrder={baseRenderOrder}>
              <meshBasicMaterial
                color={silhouetteColor}
                side={THREE.BackSide}
                transparent
                depthWrite={false}
              />
            </RoundedBox>
          ) : (
            <mesh rotation={meshPreRot} renderOrder={baseRenderOrder}>
              {element.type === "box" && <boxGeometry args={[1, 1, 1]} />}
              {element.type === "sphere" && <sphereGeometry args={[0.5, sphSegs, Math.max(2, Math.round(sphSegs * 0.75))]} />}
              {element.type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1, cylSegs, 1, false, cylThetaStart, cylArc]} />}
              {element.type === "tapered" && <TaperedGeom topScale={element.topScale ?? [1, 1]} />}
              <meshBasicMaterial
                color={silhouetteColor}
                side={THREE.BackSide}
                transparent
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}

// ─── character group ──────────────────────────────────────────────────────────

export function CharacterGroup({
  library,
  variantIndices,
  colors,
  selectedPart,
  onPartClick,
  showOutline,
  outlineColor,
  outlineExpansion = 0.04,
  baseRenderOrder = 0,
  unlit = false,
  emissiveBoost = 0,
  roughness,
  metalness,
  forceColor = false,
}: {
  library: AvatarVariantLibrary;
  variantIndices: Record<AvatarPart, number>;
  colors: Record<AvatarPart, string>;
  selectedPart?: AvatarPart | null;
  onPartClick?: (part: AvatarPart) => void;
  showOutline?: boolean;
  outlineColor?: string;
  outlineExpansion?: number;
  baseRenderOrder?: number;
  unlit?: boolean;
  emissiveBoost?: number;
  roughness?: number;
  metalness?: number;
  forceColor?: boolean;
}) {
  return (
    <group>
      {AVATAR_PARTS.map((part) => {
        const variantIdx = variantIndices[part] ?? 0;
        const variant = library[part]?.[variantIdx];
        if (!variant) return null;

        const color = colors[part];
        const sym = isSymmetric(part);
        const isSelected = part === selectedPart;

        return (
          <group key={part}>
            {variant.elements.map((el, elIdx) => {
              const isMirror =
                (sym && elIdx % 2 === 1) ||
                (!sym && !!el.pairedWith && (() => {
                  const pi = variant.elements.findIndex((e) => e.id === el.pairedWith);
                  return pi !== -1 && pi < elIdx;
                })());

              return (
                <RenderMesh
                  key={el.id}
                  element={el}
                  color={color}
                  part={part}
                  isMirror={isMirror}
                  highlight={isSelected}
                  showOutline={showOutline}
                  overrideOutlineColor={outlineColor}
                  outlineExpansion={outlineExpansion}
                  baseRenderOrder={baseRenderOrder}
                  onPartClick={onPartClick}
                  unlit={unlit}
                  emissiveBoost={emissiveBoost}
                  roughness={roughness}
                  metalness={metalness}
                  forceColor={forceColor}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

// ─── floating part labels (Html) ──────────────────────────────────────────────

// Label anchor positions in world space (tuned for -20° Y, 30° elevation camera)
const LABEL_POS: Partial<Record<AvatarPart, [number, number, number]>> = {
  hair:  [0.1,  3.31, 0.0],
  head:  [0.7,  2.6,  0.0],
  face:  [-0.7, 2.6,  0.0],
  arms:  [-1.0, 1.55, 0.0],
  body:  [1.05, 1.3,  0.0],
  pants: [-1.1, 0.65, 0.0],
  legs:  [1.0,  0.2,  0.0],
  shoes: [0.85, -0.2, 0.0],
};

// Body-part center world positions (line endpoint)
const PART_POS: Partial<Record<AvatarPart, [number, number, number]>> = {
  hair:  [0.0,  2.55, 0.0],
  head:  [0.05, 2.63, 0.0],
  face:  [0.05, 2.63, 0.0],
  arms:  [0.05, 2.38, 0.0],
  body:  [0.0,  1.95, 0.0],
  pants: [0.0,  0.65, 0.0],
  // legs and shoes are mirrored pairs, so x=0 is the empty gap between them.
  // Anchor on the limb nearest the label (both labels sit at +x) instead.
  legs:  [0.10, 0.2,  0.0],
  shoes: [0.10, -0.05, 0.0],
};

const LABEL_PARTS: AvatarPart[] = ["hair", "head", "face", "arms", "body", "pants", "legs", "shoes"];

// Target dash length for the label leader lines, in world units. The actual
// dash is derived per line from this so the pattern divides the line evenly —
// see the leader line in PartLabels.
const LEADER_DASH = 0.0375;

function PartLabels({
  selectedPart,
  onPartClick,
}: {
  selectedPart?: AvatarPart | null;
  onPartClick?: (part: AvatarPart) => void;
}) {
  return (
    <>
      {LABEL_PARTS.map((part) => {
        const lpos = LABEL_POS[part];
        const ppos = PART_POS[part];
        if (!lpos) return null;
        const isSelected = part === selectedPart;

        return (
          <group key={part}>
            <Html position={lpos} center zIndexRange={[200, 0]}>
              <button
                onClick={() => onPartClick?.(part)}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  lineHeight: 1,
                  color: isSelected ? "#003FA3" : LOGO_BLUE,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "3px 5px",
                  whiteSpace: "nowrap",
                  userSelect: "none",
                  textDecoration: "none",
                }}
              >
                {part}
              </button>
            </Html>

            {isSelected && ppos && (() => {
              const dx = ppos[0] - lpos[0], dy = ppos[1] - lpos[1], dz = ppos[2] - lpos[2];
              const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
              const t = Math.min(0.18 / len, 1);
              const lineStart: [number, number, number] = [lpos[0] + dx * t, lpos[1] + dy * t, lpos[2] + dz * t];

              // Fit a whole number of dashes into the drawn span so the line
              // begins and ends on a full dash rather than a clipped fragment,
              // and every leader reads with the same rhythm regardless of
              // length. n dashes separated by n-1 equal gaps spans (2n-1)*d.
              const span = len * (1 - t);
              const n = Math.max(1, Math.round((span + LEADER_DASH) / (2 * LEADER_DASH)));
              const dash = span / (2 * n - 1);

              return (
                <Line
                  points={[lineStart, ppos]}
                  color={LOGO_BLUE}
                  lineWidth={1.5}
                  dashed
                  dashSize={dash}
                  gapSize={dash}
                />
              );
            })()}
          </group>
        );
      })}
    </>
  );
}

// ─── exported canvas component ────────────────────────────────────────────────

// Spins the avatar 2 full rotations and eases to default (y=0) over 2 seconds.
// Locks on first active=true frame so prop changes don't interrupt the animation.
// idleSpin: continuous slow rotation for non-interactive display.
function SpinWrapper({ active, idleSpin, children }: { active: boolean; idleSpin?: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 2.0;
  const TOTAL_ANGLE = Math.PI * 4; // 2 full rotations

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (idleSpin) {
      ref.current.rotation.y = clock.elapsedTime * 0.4;
      return;
    }
    if (active && startRef.current === null) startRef.current = clock.elapsedTime;
    if (startRef.current === null) return;
    const t = Math.min((clock.elapsedTime - startRef.current) / DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
    ref.current.rotation.y = TOTAL_ANGLE * (1 - eased);
  });

  return <group ref={ref}>{children}</group>;
}

export interface AvatarRendererProps {
  library: AvatarVariantLibrary;
  variantIndices: Record<AvatarPart, number>;
  colors: Record<AvatarPart, string>;
  selectedPart?: AvatarPart | null;
  onPartClick?: (part: AvatarPart) => void;
  showOutline?: boolean;
  showLabels?: boolean;
  spinning?: boolean;
  disableOrbit?: boolean;
  idleSpin?: boolean;
  zoomMultiplier?: number;
  fixedZoom?: number;
  cameraTargetY?: number;
}

export function AvatarRenderer({
  library,
  variantIndices,
  colors,
  selectedPart,
  onPartClick,
  showOutline = true,
  showLabels = false,
  spinning = false,
  disableOrbit = false,
  idleSpin = false,
  zoomMultiplier = 1,
  fixedZoom,
  cameraTargetY = 1.35,
}: AvatarRendererProps) {
  return (
    <Canvas
      orthographic
      // +30° Y rotation (avatar faces screen-left); elevation is set by
      // OrbitControls' locked polar angle (EDITOR_POLAR_ANGLE) below.
      camera={{ position: [2.165, 3.7, 3.75], zoom: 130, near: -100, far: 100 }}
      shadows
      gl={{ stencil: true }}
      style={{ width: "100%", height: "100%", filter: "contrast(1.1) saturate(1.05)" }}
    >
      {/* White scene background */}
      <color attach="background" args={["#ffffff"]} />

      {/* Zoom scales with canvas width so avatar maintains visual proportion */}
      <CameraController zoomMultiplier={zoomMultiplier} fixedZoom={fixedZoom} />

      <ambientLight intensity={1.4} />
      <directionalLight position={[-5, 7, 4]} intensity={1.6} castShadow />
      <directionalLight position={[3, 2, -2]} intensity={0.15} />

      <SpinWrapper active={spinning} idleSpin={idleSpin}>
        <CharacterGroup
          library={library}
          variantIndices={variantIndices}
          colors={colors}
          selectedPart={selectedPart}
          onPartClick={onPartClick}
          showOutline={showOutline}
        />
      </SpinWrapper>

      {showLabels && (
        <PartLabels selectedPart={selectedPart} onPartClick={onPartClick} />
      )}

      <OrbitControls
        makeDefault
        enabled={!disableOrbit}
        enablePan={false}
        enableZoom={false}
        minDistance={2}
        maxDistance={8}
        target={[0, cameraTargetY, 0]}
        minPolarAngle={EDITOR_POLAR_ANGLE}
        maxPolarAngle={EDITOR_POLAR_ANGLE}
      />
    </Canvas>
  );
}
