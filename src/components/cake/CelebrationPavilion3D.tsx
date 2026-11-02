import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';

interface CelebrationPavilion3DProps {
  reducedMotion?: boolean;
  celebrationActive?: boolean;
}

// -------------------------------------------------------------
// Neoclassical Celebration Pavilion Chamber Stage & Lighting
// -------------------------------------------------------------
export const CelebrationPavilion3D: React.FC<CelebrationPavilion3DProps> = ({
  reducedMotion = false,
  celebrationActive = false,
}) => {
  const celebrationGlowRef = useRef<THREE.PointLight>(null);
  const ambientWarmthRef = useRef<THREE.AmbientLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (celebrationGlowRef.current) {
      if (celebrationActive) {
        celebrationGlowRef.current.intensity =
          2.6 + (reducedMotion ? 0 : Math.sin(t * 5.0) * 0.45);
      } else {
        celebrationGlowRef.current.intensity = 0.25;
      }
    }

    if (ambientWarmthRef.current && !reducedMotion) {
      ambientWarmthRef.current.intensity = 0.95 + Math.sin(t * 0.8) * 0.04;
    }
  });

  return (
    <group>
      {/* =======================================================
          Cinematic Sunset Lighting Rig
          - Warm key light from background sunset direction
          - Soft hemisphere fill for dark chocolate crumb visibility
          - Subtle rim light for cake silhouette separation
          - Point light warm glow pulse
          ======================================================= */}
      {/* Soft Ambient Warmth Fill */}
      <ambientLight ref={ambientWarmthRef} color="#fff6eb" intensity={0.95} />

      {/* Hemisphere Fill: Warm sky peach above, chocolate bounce from below */}
      <hemisphereLight
        color="#fff0e2"
        groundColor="#3d2218"
        intensity={0.95}
      />

      {/* Radiant Golden Hour Key Light (from sunset direction at front-right) */}
      <directionalLight
        position={[3.0, 4.4, 2.8]}
        color="#ffeed5"
        intensity={1.65}
      />

      {/* Subtle Rim / Separation Light (from back-left to edge cake silhouette) */}
      <directionalLight
        position={[-2.2, 3.2, -3.5]}
        color="#ffd4ad"
        intensity={1.15}
      />

      {/* Soft Overhead Warmth Fill */}
      <directionalLight
        position={[0, 5.0, 0]}
        color="#fff0db"
        intensity={0.45}
      />

      {/* Celebratory Warm Glow Pulse */}
      <pointLight
        ref={celebrationGlowRef}
        position={[0, 1.4, 0.6]}
        color="#ffd700"
        intensity={celebrationActive ? 2.6 : 0.25}
        distance={7.5}
        decay={2}
      />
    </group>
  );
};
