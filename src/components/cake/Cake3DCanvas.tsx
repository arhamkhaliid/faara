import React, { useRef, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { CelebrationPavilion3D } from './CelebrationPavilion3D';
import { GLBCake3D } from './GLBCake3D';
import type { OreoCake3DProps } from './OreoCake3D';
import { FloatingPetals } from '../world/FloatingPetals';

interface Cake3DCanvasProps extends OreoCake3DProps {
  onCanvasPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerUp?: (e?: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerCancel?: (e?: React.PointerEvent<HTMLDivElement>) => void;
}

// -------------------------------------------------------------
// Cinematic Smooth Camera Controller for Cake Celebration
// -------------------------------------------------------------
// Cinematic Stable Camera Controller for Cake Celebration
// Completely stationary during interaction; smooth transition on stage changes
// -------------------------------------------------------------
const CakeCameraController: React.FC<{
  stage: string;
  isCut: boolean;
  reducedMotion?: boolean;
}> = ({ stage, isCut, reducedMotion = false }) => {
  const currentPos = useRef(new THREE.Vector3(0, 1.28, 3.45));
  const currentTarget = useRef(new THREE.Vector3(0, 0.18, 0));

  useFrame((state, delta) => {
    // Fixed target camera stations based on celebration stage
    // Perfectly centered horizontally on the cake axis X = 0
    let baseStationPos: [number, number, number] = [0, 1.28, 3.45];
    let baseLookAt: [number, number, number] = [0, 0.18, 0];

    if (stage === 'cutting') {
      baseStationPos = [0, 1.28, 3.45];
      baseLookAt = [0, 0.18, 0];
    } else if (stage === 'celebration' && isCut) {
      baseStationPos = [0, 1.30, 3.48];
      baseLookAt = [0, 0.18, 0];
    }

    const targetPos = new THREE.Vector3(...baseStationPos);
    const targetLook = new THREE.Vector3(...baseLookAt);

    if (reducedMotion) {
      state.camera.position.copy(targetPos);
      state.camera.lookAt(targetLook);
      return;
    }

    // Smooth cinematic spring lerp between stages without any pointer sway
    const lerpSpeed = Math.min(delta * 2.8, 0.1);
    currentPos.current.lerp(targetPos, lerpSpeed);
    currentTarget.current.lerp(targetLook, lerpSpeed);
    state.camera.position.copy(currentPos.current);
    state.camera.lookAt(currentTarget.current);
  });

  return null;
};

// -------------------------------------------------------------
// Subtle Loading Placeholder (Pedestal Stand Only, No Second Cake)
// -------------------------------------------------------------
const CakeLoadingPlaceholder: React.FC = () => {
  return (
    <group position={[0, -0.82, 0]}>
      {/* Tiered Pedestal Base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.54, 0.62, 0.04, 36]} />
        <meshStandardMaterial color="#d4b47c" metalness={0.82} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.46, 0.54, 0.04, 36]} />
        <meshStandardMaterial color="#cfa968" metalness={0.84} roughness={0.25} />
      </mesh>
      {/* Slender Fluted Pedestal Stem */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.14, 0.22, 0.26, 24]} />
        <meshStandardMaterial color="#d4b47c" metalness={0.82} roughness={0.28} />
      </mesh>
      {/* Decorative Gold Collar Rings */}
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.022, 12, 24]} />
        <meshStandardMaterial color="#cfa968" metalness={0.84} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.020, 12, 24]} />
        <meshStandardMaterial color="#cfa968" metalness={0.84} roughness={0.25} />
      </mesh>
    </group>
  );
};

// -------------------------------------------------------------
// Master Responsive 3D Canvas Container
// -------------------------------------------------------------
export const Cake3DCanvas: React.FC<Cake3DCanvasProps> = ({
  candle1Lit,
  candle2Lit,
  onLightCandle,
  isBlownOut,
  isCut,
  stage,
  dragProgress = 0,
  reducedMotion = false,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onCanvasPointerCancel,
}) => {
  return (
    <div
      className="cake-3d-scene-container"
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onPointerCancel={onCanvasPointerCancel}
      aria-label="3D Celebration Chamber and Birthday Cake"
    >
      <Canvas
        camera={{ position: [0, 1.28, 3.45], fov: 44 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <CakeCameraController
          stage={stage}
          isCut={isCut}
          reducedMotion={reducedMotion}
        />

        {/* 1. Neoclassical Sunset Pavilion Environment */}
        <CelebrationPavilion3D
          reducedMotion={reducedMotion}
          celebrationActive={stage === 'celebration'}
        />

        {/* 2. Floating Rose Petals matching Control Room depth & density */}
        <FloatingPetals
          count={60}
          cakeMode
          reducedMotion={reducedMotion}
        />

        {/* 3. Interactive Imported GLB Cake (with subtle pedestal loading placeholder) */}
        <Suspense fallback={<CakeLoadingPlaceholder />}>
          <GLBCake3D
            candle1Lit={candle1Lit}
            candle2Lit={candle2Lit}
            onLightCandle={onLightCandle}
            isBlownOut={isBlownOut}
            isCut={isCut}
            stage={stage}
            dragProgress={dragProgress}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
