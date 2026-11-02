import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneId, ModuleId } from '../../types';
import { WorldLighting } from './WorldLighting';
import { WorldEnvironment } from './WorldEnvironment';
import { WorldCameraController } from './WorldCameraController';
import { ControlRoomPlatforms } from './ControlRoomPlatforms';

interface WorldCanvasProps {
  currentScene: SceneId;
  reducedMotion?: boolean;
  onSelectModule?: (moduleId: ModuleId) => void;
  visitedModules?: ModuleId[];
}

export function WorldCanvas({
  currentScene,
  reducedMotion = false,
  onSelectModule,
  visitedModules = [],
}: WorldCanvasProps) {
  return (
    <div
      className={`world-canvas-wrapper ${
        currentScene === 'control-room' ? 'interactive' : ''
      }`}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 1.55, 4.8], fov: 46 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
      >
        <WorldLighting currentScene={currentScene} />

        <Suspense fallback={null}>
          <WorldEnvironment reducedMotion={reducedMotion} />
          <WorldCameraController
            currentScene={currentScene}
            reducedMotion={reducedMotion}
          />
          {currentScene === 'control-room' && (
            <ControlRoomPlatforms
              onSelectModule={onSelectModule}
              visitedModules={visitedModules}
              reducedMotion={reducedMotion}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
