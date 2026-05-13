"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html, Line } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import * as THREE from "three";
import type { AvatarVariantLibrary, AvatarPart, MeshElement } from "@/components/avatar-builder/types";
import { AVATAR_PARTS, isSymmetric } from "@/components/avatar-builder/types";
import { createTaperedBoxGeometry } from "@/lib/taperedBoxGeometry";
import { getStickerTexture } from "@/lib/stickerTextures";

// Logo blue — must match the SVG and editor
const LOGO_BLUE = "#0083FF";

// ─── viewport-proportional zoom (scales avatar like a video with page width) ──

function CameraController() {
  const { size, camera } = useThree();
  useEffect(() => {
    const orthoCamera = camera as THREE.OrthographicCamera;
    const zoom = Math.max(55, Math.min(170, size.width / 9));
    orthoCamera.zoom = zoom;
    // Shift the frustum so the avatar sits at ~72% from screen left
    // while the orbit pivot stays exactly at avatar center [0,1.2,0]
    orthoCamera.setViewOffset(size.width, size.height, -size.width * 0.22, 0, size.width, size.height);
    orthoCamera.updateProjectionMatrix();
  }, [size.width, size.height, camera]);
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
  onPartClick,
}: {
  element: MeshElement;
  color: string;
  part?: AvatarPart;
  isMirror?: boolean;
  highlight?: boolean;
  showOutline?: boolean;
  onPartClick?: (part: AvatarPart) => void;
}) {
  const meshColor = useMemo(() => {
    const base = element.color ?? color;
    if (!element.colorLightness) return base;
    const c = new THREE.Color(base);
    c.offsetHSL(0, 0, element.colorLightness);
    return c;
  }, [element.color, element.colorLightness, color]);

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
  const outlineColor = element.outlineColor ?? "#ffffff";
  const frameLocalZ = element.type === "plane" ? 0.001 : 0.501;
  const borderX = hasOutline ? outlineWidth / element.scale[0] : 0;
  const borderY = hasOutline ? outlineWidth / element.scale[1] : 0;
  const frameGeo = useFrameGeo(borderX, borderY, roundRadius, Math.max(3, roundSmooth * 2));

  const isFlat = element.flat ?? false;
  const emissive = useMemo(() => {
    return new THREE.Color(element.emissiveColor ?? "#000000");
  }, [element.emissiveColor]);
  const emissiveIntensity = element.emissiveIntensity ?? 0;

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

  const mainRenderOrder = hasOutline ? 1 : 0;

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
    e.stopPropagation();
    if (part) onPartClick?.(part);
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
              <meshStandardMaterial {...sharedMat} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.7} metalness={0.05} />
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
              <meshStandardMaterial {...sharedMat} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.7} metalness={0.05} />
            )}
          </mesh>
        )}

        {hasOutline && frameGeo && (
          <mesh position={[0, 0, frameLocalZ]} renderOrder={2}>
            <primitive object={frameGeo} attach="geometry" />
            <meshBasicMaterial color={outlineColor} side={THREE.DoubleSide} transparent opacity={1} depthWrite={false} />
          </mesh>
        )}
      </group>

      {showOutline && element.type !== "plane" && (
        <group scale={[
          element.scale[0] + 0.04,
          element.scale[1] + 0.04,
          element.scale[2] + 0.04,
        ]}>
          {useRounded ? (
            <RoundedBox args={[1, 1, 1]} radius={roundRadius} smoothness={roundSmooth} renderOrder={5}>
              <meshBasicMaterial
                color="#1a1a1a"
                side={THREE.BackSide}
                stencilWrite={false}
                stencilRef={1}
                stencilFunc={THREE.NotEqualStencilFunc}
                depthWrite={false}
              />
            </RoundedBox>
          ) : (
            <mesh rotation={meshPreRot} renderOrder={5}>
              {element.type === "box" && <boxGeometry args={[1, 1, 1]} />}
              {element.type === "sphere" && <sphereGeometry args={[0.5, sphSegs, Math.max(2, Math.round(sphSegs * 0.75))]} />}
              {element.type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1, cylSegs, 1, false, cylThetaStart, cylArc]} />}
              {element.type === "tapered" && <TaperedGeom topScale={element.topScale ?? [1, 1]} />}
              <meshBasicMaterial
                color="#1a1a1a"
                side={THREE.BackSide}
                stencilWrite={false}
                stencilRef={1}
                stencilFunc={THREE.NotEqualStencilFunc}
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

function CharacterGroup({
  library,
  variantIndices,
  colors,
  selectedPart,
  onPartClick,
  showOutline,
}: {
  library: AvatarVariantLibrary;
  variantIndices: Record<AvatarPart, number>;
  colors: Record<AvatarPart, string>;
  selectedPart?: AvatarPart | null;
  onPartClick?: (part: AvatarPart) => void;
  showOutline?: boolean;
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
                  onPartClick={onPartClick}
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
  hair:  [0.1,  3.15, 0.0],
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
  legs:  [0.0,  0.2,  0.0],
  shoes: [0.0,  -0.05, 0.0],
};

const LABEL_PARTS: AvatarPart[] = ["hair", "head", "face", "arms", "body", "pants", "legs", "shoes"];

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
                  fontFamily: "Proletarian, sans-serif",
                  fontSize: "clamp(15px, 1.87vw, 29px)",
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

            {isSelected && ppos && (
              <Line
                points={[lpos, ppos]}
                color={LOGO_BLUE}
                lineWidth={1.5}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

// ─── exported canvas component ────────────────────────────────────────────────

export interface AvatarRendererProps {
  library: AvatarVariantLibrary;
  variantIndices: Record<AvatarPart, number>;
  colors: Record<AvatarPart, string>;
  selectedPart?: AvatarPart | null;
  onPartClick?: (part: AvatarPart) => void;
  showOutline?: boolean;
  showLabels?: boolean;
}

export function AvatarRenderer({
  library,
  variantIndices,
  colors,
  selectedPart,
  onPartClick,
  showOutline = true,
  showLabels = false,
}: AvatarRendererProps) {
  return (
    <Canvas
      orthographic
      // 30° elevation, 0° initial Y rotation (front-facing)
      // horizontal r=4.33: x=0, z=4.33
      camera={{ position: [0, 3.7, 4.33], zoom: 130, near: -100, far: 100 }}
      shadows
      gl={{ stencil: true }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* White scene background */}
      <color attach="background" args={["#ffffff"]} />

      {/* Zoom scales with canvas width so avatar maintains visual proportion */}
      <CameraController />

      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 3, -3]} intensity={0.4} />

      <CharacterGroup
        library={library}
        variantIndices={variantIndices}
        colors={colors}
        selectedPart={selectedPart}
        onPartClick={onPartClick}
        showOutline={showOutline}
      />

      {showLabels && (
        <PartLabels selectedPart={selectedPart} onPartClick={onPartClick} />
      )}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minDistance={2}
        maxDistance={8}
        target={[0, 1.2, 0]}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
      />
    </Canvas>
  );
}
