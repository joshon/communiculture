"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, RoundedBox } from "@react-three/drei";
import { useBuilderStore } from "./builderStore";
import { AVATAR_PARTS, isSymmetric, type AvatarPart, type MeshElement } from "./types";
import { createTaperedBoxGeometry } from "@/lib/taperedBoxGeometry";
import { getStickerTexture } from "@/lib/stickerTextures";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MouseEvent as ReactMouseEvent } from "react";

// Closest point on a world-axis line to the camera ray.
function closestPointOnLine(
  rayOrigin: THREE.Vector3,
  rayDir: THREE.Vector3,
  lineOrigin: THREE.Vector3,
  lineDir: THREE.Vector3
): THREE.Vector3 {
  const w = new THREE.Vector3().subVectors(rayOrigin, lineOrigin);
  const b = rayDir.dot(lineDir);
  const d = w.dot(rayDir);
  const e = w.dot(lineDir);
  const denom = 1 - b * b;
  if (Math.abs(denom) < 1e-10) return lineOrigin.clone();
  const s = (e - b * d) / denom;
  return lineOrigin.clone().addScaledVector(lineDir, s);
}

// Suppresses the click/select that fires on whatever mesh is under the cursor
// when a gizmo drag ends — set in onUp, cleared after the browser event loop.
let suppressNextClick = false;

// ─── canvas shell ────────────────────────────────────────────────────────────

export function BuilderCanvas() {
  const setSelectedElementId = useBuilderStore((s) => s.setSelectedElementId);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="w-full h-full bg-[#f0f0ee]"
      onPointerDown={(e: ReactMouseEvent) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 1.5, 4.5], zoom: 160, near: -100, far: 100 }}
        shadows
        onPointerMissed={(e: MouseEvent) => {
          if (suppressNextClick) return;
          const down = pointerDownRef.current;
          if (!down) return;
          const dx = e.clientX - down.x;
          const dy = e.clientY - down.y;
          if (Math.sqrt(dx * dx + dy * dy) < 5) {
            setSelectedElementId(null);
          }
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 4]} intensity={1.2} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.4} />

        <CharacterPreview />

        <Grid
          position={[0, 0, 0]}
          args={[6, 6]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#cccccc"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#aaaaaa"
          fadeDistance={10}
          infiniteGrid={false}
        />

        <OrbitControls
          makeDefault
          enablePan={true}
          minDistance={1.5}
          maxDistance={10}
          target={[0, 1.2, 0]}
        />

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}

// ─── character preview ────────────────────────────────────────────────────────

function CharacterPreview() {
  const library = useBuilderStore((s) => s.library);
  const activeVariantIndex = useBuilderStore((s) => s.activeVariantIndex);
  const selectedPart = useBuilderStore((s) => s.selectedPart);
  const selectedElementId = useBuilderStore((s) => s.selectedElementId);
  const selectedElementIds = useBuilderStore((s) => s.selectedElementIds);
  const previewColors = useBuilderStore((s) => s.previewColors);
  const setSelectedPart = useBuilderStore((s) => s.setSelectedPart);
  const setSelectedElementId = useBuilderStore((s) => s.setSelectedElementId);
  const toggleSelectedElementId = useBuilderStore((s) => s.toggleSelectedElementId);
  const editingVariantIndex = useBuilderStore((s) => s.editingVariantIndex);

  return (
    <group>
      {AVATAR_PARTS.map((part) => {
        const variantIndex = activeVariantIndex[part];
        const variant = library[part][variantIndex];
        if (!variant) return null;

        const isSelectedPart = part === selectedPart;
        const color = previewColors[part];
        const sym = isSymmetric(part);

        return (
          <group key={part}>
            {variant.elements.map((el, elIdx) => {
              // For symmetric parts: odd-indexed mirrors redirect to even-indexed primary.
              // For manual pairs: the mirror redirects to its primary.
              let primaryId = el.id;
              if (sym && elIdx % 2 === 1) {
                primaryId = variant.elements[elIdx - 1]?.id ?? el.id;
              } else if (el.pairedWith) {
                const pairedIdx = variant.elements.findIndex((e) => e.id === el.pairedWith);
                if (pairedIdx !== -1 && pairedIdx < elIdx) primaryId = el.pairedWith;
              }

              const isPrimary = isSelectedPart && el.id === selectedElementId;
              const isMultiSelected = isSelectedPart && selectedElementIds.includes(primaryId) && primaryId !== selectedElementId;
              const isSelectedEl =
                isSelectedPart &&
                (el.id === selectedElementId ||
                  (sym && elIdx % 2 === 1 && variant.elements[elIdx - 1]?.id === selectedElementId) ||
                  (el.pairedWith === selectedElementId));
              const isMultiEl =
                isSelectedPart &&
                !isSelectedEl &&
                (selectedElementIds.includes(el.id) ||
                  selectedElementIds.includes(primaryId));

              return (
                <ElementMesh
                  key={el.id}
                  element={el}
                  color={color}
                  isSelectedElement={isSelectedEl}
                  isMultiSelected={isMultiEl}
                  onClick={(shiftKey) => {
                    if (shiftKey) {
                      if (part !== selectedPart) setSelectedPart(part);
                      toggleSelectedElementId(primaryId);
                    } else {
                      setSelectedPart(part);
                      setSelectedElementId(primaryId);
                    }
                  }}
                />
              );
            })}
          </group>
        );
      })}

      {/* Axis drag gizmo — rendered last so it's on top */}
      <SelectionGizmo />
    </group>
  );
}

// ─── frame ring geometry ──────────────────────────────────────────────────────
// Builds a flat ring (outer rect minus inner rect with hole) so the frame has zero
// geometry over the lens area — transparent lenses stay transparent inside the ring.

function addRoundedRect(p: THREE.Shape | THREE.Path, hw: number, hh: number, r: number) {
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

function useFrameGeometry(
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
    addRoundedRect(shape, 0.5, 0.5, outerRadius);
    const hole = new THREE.Path();
    addRoundedRect(hole, innerHW, innerHH, innerRadius);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, Math.max(3, curveSegs));
  }, [borderX, borderY, outerRadius, curveSegs]);
}

// ─── element mesh ─────────────────────────────────────────────────────────────

function ElementMesh({
  element,
  color,
  isSelectedElement,
  isMultiSelected,
  onClick,
}: {
  element: MeshElement;
  color: string;
  isSelectedElement: boolean;
  isMultiSelected: boolean;
  onClick: (shiftKey: boolean) => void;
}) {
  const baseEmissive = new THREE.Color(element.emissiveColor ?? "#000000");
  const baseEmissiveIntensity = element.emissiveIntensity ?? 0;

  const emissive = isSelectedElement
    ? new THREE.Color("#ff6600")
    : isMultiSelected
    ? new THREE.Color("#4488ff")
    : baseEmissive;

  const emissiveIntensity = isSelectedElement ? 0.65 : isMultiSelected ? 0.5 : baseEmissiveIntensity;

  const isFlat = element.flat ?? false;

  const stickerTex = useMemo(
    () => (element.texture ? getStickerTexture(element.texture) : null),
    [element.texture]
  );

  const opacity = element.opacity ?? 1;
  const needsTransparency = opacity < 1 || !!stickerTex;
  const meshColor = useMemo(() => {
    const base = element.color ?? color;
    if (!element.colorLightness) return base;
    const c = new THREE.Color(base);
    c.offsetHSL(0, 0, element.colorLightness);
    return c;
  }, [element.color, element.colorLightness, color]);

  const useRounded = element.type === "box" && !!element.radius && element.radius > 0;
  const roundRadius = element.radius ?? 0;
  const roundSmooth = element.smoothness ?? 2;
  const cylSegs = element.segments ?? 14;
  const sphSegs = element.segments ?? 16;

  const outlineWidth = element.outlineWidth ?? 0;
  const hasOutline = outlineWidth > 0;
  const outlineColor = element.outlineColor ?? "#ffffff";
  // Border width in local space (geometry is unit-size inside the scale group)
  const borderX = hasOutline ? outlineWidth / element.scale[0] : 0;
  const borderY = hasOutline ? outlineWidth / element.scale[1] : 0;
  const frameGeo = useFrameGeometry(borderX, borderY, roundRadius, Math.max(3, roundSmooth * 2));

  const wireMat = (
    <meshBasicMaterial
      color={isSelectedElement ? "#ff8800" : "#4488ff"}
      wireframe
      depthTest={false}
      toneMapped={false}
      transparent
      opacity={0.7}
    />
  );

  // For planes the local Z=0 is the face; for volumetric types the front face is at local Z=0.5.
  // The ring renders via renderOrder=2 so exact Z doesn't matter for lens/ring ordering —
  // it only affects depth-testing against other opaque scene objects.
  const frameLocalZ = element.type === "plane" ? 0.001 : 0.501;

  return (
    <group position={element.position} rotation={element.rotation}>
      <group scale={element.scale}>
      {useRounded ? (
        <RoundedBox
          args={[1, 1, 1]}
          radius={roundRadius}
          smoothness={roundSmooth}
          renderOrder={hasOutline ? 1 : 0}
          onClick={(e) => { e.stopPropagation(); if (!suppressNextClick) onClick(e.shiftKey); }}
        >
          {isFlat ? (
            <meshBasicMaterial
              color={meshColor}
              transparent
              opacity={opacity}
              depthWrite={hasOutline ? false : !needsTransparency}
              map={stickerTex ?? undefined}
              alphaTest={stickerTex ? 0.05 : 0}
            />
          ) : (
            <meshStandardMaterial
              color={meshColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              roughness={0.7}
              metalness={0.05}
              transparent
              opacity={opacity}
              depthWrite={hasOutline ? false : !needsTransparency}
              map={stickerTex ?? undefined}
              alphaTest={stickerTex ? 0.05 : 0}
            />
          )}
        </RoundedBox>
      ) : (
        <mesh
          renderOrder={hasOutline ? 1 : 0}
          onClick={(e) => { e.stopPropagation(); if (!suppressNextClick) onClick(e.shiftKey); }}
        >
          {element.type === "box" && <boxGeometry args={[1, 1, 1]} />}
          {element.type === "sphere" && <sphereGeometry args={[0.5, sphSegs, Math.max(2, Math.round(sphSegs * 0.75))]} />}
          {element.type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1, cylSegs]} />}
          {element.type === "tapered" && <TaperedGeom topScale={element.topScale ?? [1, 1]} />}
          {element.type === "plane" && <planeGeometry args={[1, 1]} />}
          {isFlat ? (
            <meshBasicMaterial
              color={meshColor}
              transparent
              opacity={opacity}
              depthWrite={hasOutline ? false : !needsTransparency}
              map={stickerTex ?? undefined}
              alphaTest={stickerTex ? 0.05 : 0}
              side={element.type === "plane" ? THREE.DoubleSide : THREE.FrontSide}
            />
          ) : (
            <meshStandardMaterial
              color={meshColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              roughness={0.7}
              metalness={0.05}
              transparent
              opacity={opacity}
              depthWrite={hasOutline ? false : !needsTransparency}
              map={stickerTex ?? undefined}
              alphaTest={stickerTex ? 0.05 : 0}
              side={element.type === "plane" ? THREE.DoubleSide : THREE.FrontSide}
            />
          )}
        </mesh>
      )}

      {/* Frame ring — renderOrder=2 draws after the lens (renderOrder=1) so depth-buffer
          precision between the two is irrelevant. Both use depthWrite=false to stay in
          the transparent pass and avoid writing stale depth for subsequent objects. */}
      {hasOutline && frameGeo && (
        <mesh
          position={[0, 0, frameLocalZ]}
          renderOrder={2}
          onClick={(e) => { e.stopPropagation(); if (!suppressNextClick) onClick(e.shiftKey); }}
        >
          <primitive object={frameGeo} attach="geometry" />
          <meshBasicMaterial
            color={outlineColor}
            side={THREE.DoubleSide}
            transparent
            opacity={1}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Wireframe outline for selected element — no fill, always on top */}
      {(isSelectedElement || isMultiSelected) && (
        useRounded ? (
          <RoundedBox args={[1, 1, 1]} radius={roundRadius} smoothness={roundSmooth} renderOrder={10}>
            {wireMat}
          </RoundedBox>
        ) : (
          <mesh renderOrder={10}>
            {element.type === "box" && <boxGeometry args={[1, 1, 1]} />}
            {element.type === "sphere" && <sphereGeometry args={[0.5, sphSegs, Math.max(2, Math.round(sphSegs * 0.75))]} />}
            {element.type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1, cylSegs]} />}
            {element.type === "tapered" && <TaperedGeom topScale={element.topScale ?? [1, 1]} />}
            {element.type === "plane" && <planeGeometry args={[1, 1]} />}
            {wireMat}
          </mesh>
        )
      )}
      </group>
    </group>
  );
}

// ─── axis drag gizmo ──────────────────────────────────────────────────────────

const AXIS_DIR: [number, number, number][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const AXIS_COLOR  = ["#e05050", "#50c050", "#5080e0"] as const;
const AXIS_BRIGHT = ["#ff9999", "#99ff99", "#99aaff"] as const;
const SHAFT_LEN = 0.30;
const HANDLE_DIST = 0.38;
const HANDLE_R = 0.048;
const SNAP_THRESHOLD = 0.08;

function SelectionGizmo() {
  const library         = useBuilderStore((s) => s.library);
  const selectedPart    = useBuilderStore((s) => s.selectedPart);
  const selectedId      = useBuilderStore((s) => s.selectedElementId);
  const editingIdx      = useBuilderStore((s) => s.editingVariantIndex);
  const updateElement   = useBuilderStore((s) => s.updateElement);
  const snapEnabled     = useBuilderStore((s) => s.snapEnabled);
  const snapshotLibrary = useBuilderStore((s) => s.snapshotLibrary);

  const { camera, gl } = useThree();
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const raycaster = useRef(new THREE.Raycaster());
  const [hoverAxis, setHoverAxis] = useState<number | null>(null);

  const variant = library[selectedPart]?.[editingIdx];
  const element = variant?.elements.find((el) => el.id === selectedId) ?? null;

  if (!element) return null;

  // Don't render on mirror (odd-index) elements of symmetric parts
  if (isSymmetric(selectedPart)) {
    const idx = variant!.elements.findIndex((el) => el.id === selectedId);
    if (idx % 2 === 1) return null;
  }

  const startDrag = (e: any, axis: 0 | 1 | 2) => {
    e.stopPropagation();

    // Snapshot before drag so the whole drag is one undo step
    snapshotLibrary();

    const axisDir    = new THREE.Vector3(...AXIS_DIR[axis]);
    const startPos   = [...element.position] as [number, number, number];
    const lineOrigin = new THREE.Vector3(...startPos);

    // Capture start positions of all other selected elements for multi-drag
    const { selectedElementIds } = useBuilderStore.getState();
    const currentVariant = useBuilderStore.getState().library[selectedPart]?.[editingIdx];
    const siblingStarts = new Map<string, [number, number, number]>();
    for (const id of selectedElementIds) {
      if (id === element.id) continue;
      const el = currentVariant?.elements.find((el) => el.id === id);
      if (el) siblingStarts.set(id, [...el.position] as [number, number, number]);
    }

    // Capture pointer position at drag start to compute delta (prevents jump)
    const rect0 = gl.domElement.getBoundingClientRect();
    const nx0 = ((e.clientX - rect0.left) / rect0.width) * 2 - 1;
    const ny0 = -((e.clientY - rect0.top) / rect0.height) * 2 + 1;
    raycaster.current.setFromCamera(new THREE.Vector2(nx0, ny0), camera);
    const initialHit = closestPointOnLine(
      raycaster.current.ray.origin,
      raycaster.current.ray.direction,
      lineOrigin,
      axisDir
    );
    const startAxisValue = initialHit.getComponent(axis);

    if (controls) controls.enabled = false;
    gl.domElement.setPointerCapture(e.pointerId);
    gl.domElement.style.cursor = "grabbing";

    let moved = false;
    const onMove = (ev: PointerEvent) => {
      moved = true;
      const rect = gl.domElement.getBoundingClientRect();
      const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(new THREE.Vector2(nx, ny), camera);

      const pt = closestPointOnLine(
        raycaster.current.ray.origin,
        raycaster.current.ray.direction,
        lineOrigin,
        axisDir
      );

      const rawValue = startPos[axis] + (pt.getComponent(axis) - startAxisValue);
      let snapped = Math.round(rawValue * 1000) / 1000;

      if (snapEnabled && variant) {
        const otherElements = variant.elements.filter((el) => el.id !== selectedId);
        let bestDist = SNAP_THRESHOLD;
        for (const other of otherElements) {
          const lo = other.position[axis] - other.scale[axis] / 2;
          const hi = other.position[axis] + other.scale[axis] / 2;
          const ourHalf = element.scale[axis] / 2;
          const candidates = [
            lo - ourHalf, hi + ourHalf, lo + ourHalf, hi - ourHalf,
            other.position[axis], lo, hi,
          ];
          for (const c of candidates) {
            const dist = Math.abs(rawValue - c);
            if (dist < bestDist) { bestDist = dist; snapped = c; }
          }
        }
      }

      // Move primary element
      const newPos = [...startPos] as [number, number, number];
      newPos[axis] = snapped;
      updateElement(selectedPart, editingIdx, element.id, { position: newPos });

      // Move all other selected elements by the same delta
      const delta = snapped - startPos[axis];
      siblingStarts.forEach((sPos, id) => {
        const sibPos = [...sPos] as [number, number, number];
        sibPos[axis] = sPos[axis] + delta;
        updateElement(selectedPart, editingIdx, id, { position: sibPos });
      });
    };

    const onUp = (ev: PointerEvent) => {
      if (controls) controls.enabled = true;
      gl.domElement.releasePointerCapture(ev.pointerId);
      gl.domElement.style.cursor = "";
      gl.domElement.removeEventListener("pointermove", onMove);
      gl.domElement.removeEventListener("pointerup", onUp);
      if (moved) {
        suppressNextClick = true;
        setTimeout(() => { suppressNextClick = false; }, 0);
      }
    };

    gl.domElement.addEventListener("pointermove", onMove);
    gl.domElement.addEventListener("pointerup", onUp);
  };

  return (
    <group position={element.position}>
      {([0, 1, 2] as const).map((axis) => {
        const d = AXIS_DIR[axis];
        const color  = hoverAxis === axis ? AXIS_BRIGHT[axis] : AXIS_COLOR[axis];
        const sx = d[0] * SHAFT_LEN;
        const sy = d[1] * SHAFT_LEN;
        const sz = d[2] * SHAFT_LEN;
        const hx = d[0] * HANDLE_DIST;
        const hy = d[1] * HANDLE_DIST;
        const hz = d[2] * HANDLE_DIST;

        return (
          <group key={axis}>
            {/* shaft — visual only */}
            <mesh
              position={[sx / 2, sy / 2, sz / 2]}
              renderOrder={100}
            >
              <boxGeometry
                args={[
                  axis === 0 ? SHAFT_LEN : 0.007,
                  axis === 1 ? SHAFT_LEN : 0.007,
                  axis === 2 ? SHAFT_LEN : 0.007,
                ]}
              />
              <meshBasicMaterial color={color} depthTest={false} toneMapped={false} transparent />
            </mesh>

            {/* sphere handle — clickable */}
            <mesh
              position={[hx, hy, hz]}
              renderOrder={101}
              onPointerDown={(e) => startDrag(e, axis)}
              onPointerEnter={() => {
                setHoverAxis(axis);
                gl.domElement.style.cursor = "grab";
              }}
              onPointerLeave={() => {
                setHoverAxis(null);
                if (gl.domElement.style.cursor !== "grabbing")
                  gl.domElement.style.cursor = "";
              }}
            >
              <sphereGeometry args={[HANDLE_R, 10, 10]} />
              <meshBasicMaterial color={color} depthTest={false} toneMapped={false} transparent />
            </mesh>
          </group>
        );
      })}
    </group>
  );
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
