import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneId } from '../../types';

interface WorldCameraControllerProps {
  currentScene: SceneId;
  reducedMotion?: boolean;
}

interface CameraStation {
  position: [number, number, number];
  target: [number, number, number];
}

// Purposeful camera stations tailored for the Starlight Dream Garden journey
const SCENE_CAMERA_STATIONS: Record<SceneId, CameraStation> = {
  // Scene 1: Boot Gate — Grand entrance framing through foreground archway down the rose path toward the distant pavilion
  boot: {
    position: [0, 1.55, 4.8],
    target: [0.3, 1.4, -6.0],
  },
  // Scene 2: Opening — Smooth forward tracking shot along the marble path, entering the garden (centered along the walkway)
  opening: {
    position: [0, 1.35, 2.2],
    target: [0, 1.45, -7.0],
  },
  // Scene 3: Control Room — Natural continuation along the rose path onto the upper terrace observatory (centered)
  'control-room': {
    position: [0, 1.42, 0.15],
    target: [0, 1.45, -7.5],
  },
  // Modules & Later scenes
  surprise: {
    position: [-0.4, 1.4, 1.6],
    target: [0.3, 1.3, -6.0],
  },
  certificate: {
    position: [0, 1.6, 2.8],
    target: [0.5, 1.4, -7.0],
  },
  cake: {
    position: [0.65, 1.45, -3.2],
    target: [0.75, 1.48, -13.0],
  },
  'final-message': {
    position: [0.2, 1.8, 3.2],
    target: [1.0, 1.5, -9.0],
  },
  'fake-crash': {
    position: [0, 1.4, 4.2],
    target: [0.3, 1.35, -6.0],
  },
};

export function WorldCameraController({
  currentScene,
  reducedMotion = false,
}: WorldCameraControllerProps) {
  const currentTarget = useRef(new THREE.Vector3(0.3, 1.4, -6.0));
  const pointerPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;

    const handlePointerMove = (e: PointerEvent) => {
      // Normalize to [-1, 1]
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      pointerPos.current = { x, y };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [reducedMotion]);

  useFrame((state, delta) => {
    const station = SCENE_CAMERA_STATIONS[currentScene] || SCENE_CAMERA_STATIONS.boot;

    const time = state.clock.getElapsedTime();
    // Gentle cinematic camera breathing (disabled if reduced motion)
    const idleSwayX = reducedMotion ? 0 : Math.sin(time * 0.35) * 0.03;
    const idleSwayY = reducedMotion ? 0 : Math.cos(time * 0.28) * 0.02;

    // Subtle pointer parallax offset
    const parallaxX = reducedMotion ? 0 : pointerPos.current.x * 0.22 + idleSwayX;
    const parallaxY = reducedMotion ? 0 : pointerPos.current.y * 0.14 + idleSwayY;

    const targetPos = new THREE.Vector3(
      station.position[0] + parallaxX,
      station.position[1] + parallaxY,
      station.position[2]
    );

    const targetLookAt = new THREE.Vector3(
      station.target[0] + parallaxX * 0.3,
      station.target[1] + parallaxY * 0.3,
      station.target[2]
    );

    if (reducedMotion) {
      state.camera.position.copy(targetPos);
      state.camera.lookAt(targetLookAt);
      currentTarget.current.copy(targetLookAt);
      return;
    }

    // Smooth cinematic camera travel (lerp)
    const smoothFactor = Math.min(delta * 2.2, 0.12);
    state.camera.position.lerp(targetPos, smoothFactor);
    currentTarget.current.lerp(targetLookAt, smoothFactor);
    state.camera.lookAt(currentTarget.current);
  });

  return null;
}
