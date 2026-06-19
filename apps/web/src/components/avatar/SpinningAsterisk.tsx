"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Brand-blue asterisk drawn once to a canvas texture, shared across scenes.
let _tex: THREE.CanvasTexture | null = null;
export function getAsteriskTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (_tex) return _tex;
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
  _tex = new THREE.CanvasTexture(c);
  return _tex;
}

/** A flat, camera-facing asterisk that spins around its center — used as a loading placeholder. */
export function SpinningAsterisk({
  position,
  size = 1.2,
  speed = 3.2,
}: {
  position: [number, number, number];
  size?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => getAsteriskTexture(), []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z -= delta * speed;
  });
  if (!tex) return null;
  return (
    <mesh ref={ref} position={position}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
