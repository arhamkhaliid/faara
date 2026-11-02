import React from 'react';
import type { SceneId } from '../../types';

interface WorldLightingProps {
  currentScene?: SceneId;
}

export const WorldLighting: React.FC<WorldLightingProps> = ({ currentScene }) => {
  const isCakeScene = currentScene === 'cake';

  return (
    <>
      {/* Warm Rose-Peach Ambient Sky Fill (warmed to golden glow during cake celebration) */}
      <ambientLight color={isCakeScene ? '#fff2df' : '#ffe8ee'} intensity={isCakeScene ? 1.05 : 0.8} />

      {/* Radiant Sunset Sunbeam streaming across the garden from the right */}
      <directionalLight
        position={[8, 14, -4]}
        color={isCakeScene ? '#ffe8c9' : '#fff1db'}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* Gentle Lavender Skylight fill from above left */}
      <directionalLight
        position={[-6, 12, 6]}
        color="#e4d7f5"
        intensity={0.65}
      />

      {/* Foreground Entrance Architecture & Terrace Warmth Fill */}
      <pointLight
        position={[0, 2.4, 4.0]}
        color="#ffe8d6"
        intensity={1.85}
        distance={12.0}
        decay={2}
      />

      {/* Soft Upward Warm Bounce from Polished Ivory Marble Floor */}
      <pointLight
        position={[0, 0.40, 2.6]}
        color="#fff2e0"
        intensity={1.2}
        distance={7.0}
        decay={2}
      />

      {/* Golden Celebration Illumination for the Dome Pavilion in Cake Scene */}
      {isCakeScene && (
        <pointLight
          position={[1.2, 2.5, -6.5]}
          color="#ffdd88"
          intensity={3.4}
          distance={14}
          decay={2}
        />
      )}

      {/* Atmospheric Romantic Sunset Horizon Depth Fog */}
      <fog attach="fog" args={['#f6ccbe', 28, 65]} />
    </>
  );
};
