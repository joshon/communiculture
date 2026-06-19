"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { CharacterGroup } from "./AvatarRenderer";
import type { AvatarVariantLibrary, AvatarPart } from "@/components/avatar-builder/types";
import { AVATAR_PARTS } from "@/components/avatar-builder/types";

// Camera target: top-of-head level so the face sits in the lower portion of the frame
const HEAD_CENTER_Y = 2.74;
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
  // so we let the scene paint for a few frames before reading the canvas).
  const framesLeft = useRef(0);
  const attempts = useRef(0);

  useEffect(() => {
    framesLeft.current = 3;
    attempts.current = 0;
  }, [colorsKey]);

  useFrame(() => {
    if (framesLeft.current <= 0) return;
    framesLeft.current -= 1;
    if (framesLeft.current > 0) return;

    const url = gl.domElement.toDataURL("image/png");
    // A blank/unpainted frame compresses to a tiny PNG. If the scene hasn't
    // painted yet (cold WebGL context after mount), wait a few more frames and
    // retry rather than saving a blank thumbnail over the user's avatar.
    if (url.length < 4000 && attempts.current < 10) {
      attempts.current += 1;
      framesLeft.current = 2;
      return;
    }
    onCapture(url);
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
      camera={{ position: [2.165, 2.0, 3.75], zoom: 200, near: -100, far: 100 }}
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
