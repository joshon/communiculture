"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { BlockyAvatar } from "@/components/avatar/BlockyAvatar";
import { useContinuumStore } from "@/store/continuumStore";
import type { AvatarConfig } from "@/store/avatarStore";

const SCENE_WIDTH = 20; // total width of continuum in 3D units

interface Props {
  continuumId: string;
  leftLabel: string;
  rightLabel: string;
  currentUserId: string;
  currentUserAvatarConfig: AvatarConfig;
  onPositionChange: (position: number) => void;
  onPositionCommit: (position: number) => void;
}

export function ContinuumScene({
  continuumId,
  leftLabel,
  rightLabel,
  currentUserId,
  currentUserAvatarConfig,
  onPositionChange,
  onPositionCommit,
}: Props) {
  return (
    <div className="w-full h-[480px] bg-white border border-gray-100">
      <Canvas
        camera={{ position: [0, 4, 14], fov: 50 }}
        shadows
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[8, 10, 5]} intensity={1} castShadow />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[SCENE_WIDTH + 4, 8]} />
          <meshStandardMaterial color="#f8f8f8" />
        </mesh>

        {/* Continuum axis line */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SCENE_WIDTH, 0.04]} />
          <meshStandardMaterial color="#0033cc" />
        </mesh>

        {/* Labels */}
        <Text
          position={[-(SCENE_WIDTH / 2) - 0.5, 0.5, 0]}
          fontSize={0.5}
          color="#0033cc"
          anchorX="right"
          anchorY="middle"
          maxWidth={4}
        >
          {leftLabel}
        </Text>
        <Text
          position={[(SCENE_WIDTH / 2) + 0.5, 0.5, 0]}
          fontSize={0.5}
          color="#0033cc"
          anchorX="left"
          anchorY="middle"
          maxWidth={4}
        >
          {rightLabel}
        </Text>

        <CrowdScene
          currentUserId={currentUserId}
          currentUserAvatarConfig={currentUserAvatarConfig}
          onPositionChange={onPositionChange}
          onPositionCommit={onPositionCommit}
        />

        <OrbitControls
          enablePan={false}
          enableRotate={false}
          enableZoom={true}
          minDistance={6}
          maxDistance={20}
          target={[0, 1, 0]}
        />
      </Canvas>
    </div>
  );
}

function CrowdScene({
  currentUserId,
  currentUserAvatarConfig,
  onPositionChange,
  onPositionCommit,
}: Pick<Props, "currentUserId" | "currentUserAvatarConfig" | "onPositionChange" | "onPositionCommit">) {
  const participants = useContinuumStore((s) => s.participants);
  const { camera, gl } = useThree();
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const isDragging = useRef(false);
  const [localPosition, setLocalPosition] = useState(
    participants[currentUserId]?.position ?? 0.5
  );

  const posToX = (pos: number) => (pos - 0.5) * SCENE_WIDTH;
  const xToPos = (x: number) => Math.min(1, Math.max(0, x / SCENE_WIDTH + 0.5));

  const handlePointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();
      isDragging.current = true;
      gl.domElement.style.cursor = "grabbing";
    },
    [gl]
  );

  const handlePointerMove = useCallback(
    (e: any) => {
      if (!isDragging.current) return;
      const mouse = new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(dragPlane.current, target);
      const newPos = xToPos(target.x);
      setLocalPosition(newPos);
      onPositionChange(newPos);
    },
    [camera, gl, onPositionChange]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    gl.domElement.style.cursor = "default";
    onPositionCommit(localPosition);
  }, [gl, localPosition, onPositionCommit]);

  return (
    <group
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Invisible drag surface */}
      <mesh visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial />
      </mesh>

      {/* Other participants */}
      {Object.values(participants)
        .filter((p) => p.userId !== currentUserId)
        .map((p, i) => (
          <BlockyAvatar
            key={p.userId}
            config={p.avatarConfig}
            position={[posToX(p.position), 0, (i % 3) * 0.6 - 0.6]}
            scale={0.5}
          />
        ))}

      {/* Current user's draggable avatar */}
      <group
        position={[posToX(localPosition), 0, 0.8]}
        onPointerDown={handlePointerDown}
      >
        <BlockyAvatar
          config={currentUserAvatarConfig}
          scale={0.6}
        />
        {/* Highlight ring under feet */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.3, 0.45, 32]} />
          <meshBasicMaterial color="#0033cc" />
        </mesh>
      </group>
    </group>
  );
}
