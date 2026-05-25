"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { CharacterGroup } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

// Camera target: top-of-head level so the face sits in the lower portion of the frame
const HEAD_CENTER_Y = 2.7;
const HEAD_PARTS: AvatarPart[] = ["hair", "head", "face", "neck"];

function buildHeadIndices(variantIndices: Record<AvatarPart, number>): Record<AvatarPart, number> {
  return Object.fromEntries(
    AVATAR_PARTS.map((p) => [p, HEAD_PARTS.includes(p) ? (variantIndices[p] ?? 0) : 999])
  ) as Record<AvatarPart, number>;
}

function Capturer({
  colorsKey,
  onCapture,
}: {
  colorsKey: string;        // serialised colors+variants — changes only when config really changes
  onCapture: (url: string) => void;
}) {
  const { gl } = useThree();
  // 0 = idle; >0 = frames remaining before capture (useFrame fires before render,
  // so we wait 2 frames: frame N renders the scene, frame N+1 captures it)
  const framesLeft = useRef(0);

  useEffect(() => {
    framesLeft.current = 2;
  }, [colorsKey]);

  useFrame(() => {
    if (framesLeft.current <= 0) return;
    framesLeft.current -= 1;
    if (framesLeft.current === 0) {
      onCapture(gl.domElement.toDataURL("image/png"));
    }
  });

  return null;
}

interface Props {
  library: AvatarVariantLibrary;
  variantIndices: Record<AvatarPart, number>;
  colors: Record<AvatarPart, string>;
  onCapture: (dataUrl: string) => void;
}

export function AvatarHeadCapture({ library, variantIndices, colors, onCapture }: Props) {
  const headIndices = buildHeadIndices(variantIndices);
  const colorsKey = JSON.stringify({ colors, variantIndices });

  return (
    <Canvas
      orthographic
      // Lowered Y from 3.7 → 2.0 for a face-level angle so eyes are visible
      camera={{ position: [2.165, 2.0, 3.75], zoom: 164, near: -100, far: 100 }}
      gl={{ preserveDrawingBuffer: true, stencil: true }}
      style={{ width: 200, height: 200 }}
    >
      <color attach="background" args={["#ffffff"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <group position={[0, -HEAD_CENTER_Y, 0]}>
        <CharacterGroup
          library={library}
          variantIndices={headIndices}
          colors={colors}
          showOutline={true}
        />
      </group>
      <Capturer colorsKey={colorsKey} onCapture={onCapture} />
    </Canvas>
  );
}
