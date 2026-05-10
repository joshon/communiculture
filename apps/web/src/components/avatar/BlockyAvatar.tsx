"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { AvatarConfig } from "@/store/avatarStore";

interface BlockyAvatarProps {
  config: AvatarConfig;
  position?: [number, number, number];
  scale?: number;
  animate?: boolean; // idle bob animation
  onClick?: (part: string) => void;
}

export function BlockyAvatar({
  config,
  position = [0, 0, 0],
  scale = 1,
  animate = false,
  onClick,
}: BlockyAvatarProps) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!animate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.3;
  });

  const handleClick = (part: string) => (e: any) => {
    e.stopPropagation();
    onClick?.(part);
  };

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Shoes */}
      <mesh position={[-0.18, 0.12, 0]} onClick={handleClick("shoes")}>
        <boxGeometry args={[0.22, 0.15, 0.35]} />
        <meshStandardMaterial color={config.shoes} />
      </mesh>
      <mesh position={[0.18, 0.12, 0]} onClick={handleClick("shoes")}>
        <boxGeometry args={[0.22, 0.15, 0.35]} />
        <meshStandardMaterial color={config.shoes} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.18, 0.55, 0]} onClick={handleClick("legs")}>
        <boxGeometry args={[0.22, 0.65, 0.28]} />
        <meshStandardMaterial color={config.legs} />
      </mesh>
      <mesh position={[0.18, 0.55, 0]} onClick={handleClick("legs")}>
        <boxGeometry args={[0.22, 0.65, 0.28]} />
        <meshStandardMaterial color={config.legs} />
      </mesh>

      {/* Pants (crotch connector) */}
      <mesh position={[0, 0.88, 0]} onClick={handleClick("pants")}>
        <boxGeometry args={[0.48, 0.2, 0.28]} />
        <meshStandardMaterial color={config.pants} />
      </mesh>

      {/* Body / torso */}
      <mesh position={[0, 1.3, 0]} onClick={handleClick("body")}>
        <boxGeometry args={[0.7, 0.7, 0.38]} />
        <meshStandardMaterial color={config.body} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.52, 1.3, 0]} onClick={handleClick("arms")}>
        <boxGeometry args={[0.22, 0.6, 0.28]} />
        <meshStandardMaterial color={config.arms} />
      </mesh>
      <mesh position={[0.52, 1.3, 0]} onClick={handleClick("arms")}>
        <boxGeometry args={[0.22, 0.6, 0.28]} />
        <meshStandardMaterial color={config.arms} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.66, 0]} onClick={handleClick("neck")}>
        <cylinderGeometry args={[0.1, 0.1, 0.22, 14]} />
        <meshStandardMaterial color={config.neck} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.95, 0]} onClick={handleClick("head")}>
        <boxGeometry args={[0.58, 0.58, 0.52]} />
        <meshStandardMaterial color={config.head} />
      </mesh>

      {/* Face — eyes and mouth (face color = feature color) */}
      {/* Left eye */}
      <mesh position={[-0.12, 2.02, 0.27]} onClick={handleClick("face")}>
        <boxGeometry args={[0.1, 0.1, 0.04]} />
        <meshStandardMaterial color={config.face} />
      </mesh>
      {/* Right eye */}
      <mesh position={[0.12, 2.02, 0.27]} onClick={handleClick("face")}>
        <boxGeometry args={[0.1, 0.1, 0.04]} />
        <meshStandardMaterial color={config.face} />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, 1.84, 0.27]} onClick={handleClick("face")}>
        <boxGeometry args={[0.22, 0.07, 0.04]} />
        <meshStandardMaterial color={config.face} />
      </mesh>

      {/* Hair (flat slab on top) */}
      <mesh position={[0, 2.32, 0]} onClick={handleClick("hair")}>
        <boxGeometry args={[0.62, 0.18, 0.56]} />
        <meshStandardMaterial color={config.hair} />
      </mesh>
    </group>
  );
}
