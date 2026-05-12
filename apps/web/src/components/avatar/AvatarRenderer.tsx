"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { AvatarVariantLibrary, AvatarPart, MeshElement } from "@/components/avatar-builder/types";
import { AVATAR_PARTS, isSymmetric } from "@/components/avatar-builder/types";
import { createTaperedBoxGeometry } from "@/lib/taperedBoxGeometry";
import { getStickerTexture } from "@/lib/stickerTextures";

// ─── frame geometry (hollow rect with optional rounded corners) ───────────────

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

// ─── single element mesh (no selection/gizmo state) ───────────────────────────

function RenderMesh({
  element,
  color,
  isMirror = false,
  highlight = false,
  showOutline = false,
}: {
  element: MeshElement;
  color: string;
  isMirror?: boolean;
  highlight?: boolean;
  showOutline?: boolean;
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
    if (highlight) return new THREE.Color("#3366ff");
    return new THREE.Color(element.emissiveColor ?? "#000000");
  }, [highlight, element.emissiveColor]);
  const emissiveIntensity = highlight ? 0.4 : (element.emissiveIntensity ?? 0);

  const stickerTex = useMemo(
    () => (element.texture ? getStickerTexture(element.texture) : null),
    [element.texture]
  );

  // When showOutline is active every main mesh writes stencil=1.
  // The outline shells (rendered later at renderOrder=5) test stencil≠1,
  // so they only appear outside the combined silhouette — no interior lines.
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

  return (
    <group position={element.position} rotation={element.rotation}>
      <group scale={element.scale}>
        {useRounded ? (
          <RoundedBox args={[1, 1, 1]} radius={roundRadius} smoothness={roundSmooth} renderOrder={mainRenderOrder}>
            {isFlat ? (
              <meshBasicMaterial {...sharedMat} />
            ) : (
              <meshStandardMaterial {...sharedMat} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={0.7} metalness={0.05} />
            )}
          </RoundedBox>
        ) : (
          <mesh rotation={meshPreRot} renderOrder={mainRenderOrder}>
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

      {/* Silhouette outline shell — only draws where stencil=0 (outside avatar silhouette).
          renderOrder=5 ensures ALL main meshes have written stencil before this tests it. */}
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
                  isMirror={isMirror}
                  highlight={isSelected}
                  showOutline={showOutline}
                />
              );
            })}
          </group>
        );
      })}
    </group>
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
}

export function AvatarRenderer({
  library,
  variantIndices,
  colors,
  selectedPart,
  onPartClick,
  showOutline = true,
}: AvatarRendererProps) {
  return (
    <Canvas
      orthographic
      // Camera at 30° elevation: offset = [0, 2.5, 4.33] from target [0,1.2,0]
      // polar angle = atan2(4.33, 2.5) = 60° from Y axis = 30° above horizontal
      camera={{ position: [0, 3.7, 4.33], zoom: 130, near: -100, far: 100 }}
      shadows
      gl={{ stencil: true }}
    >
      {/* White scene background */}
      <color attach="background" args={["#ffffff"]} />

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

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2}
        maxDistance={8}
        target={[0, 1.2, 0]}
        // Lock to Y-axis rotation only — polar angle fixed at 60° (30° above horizontal)
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
      />
    </Canvas>
  );
}
