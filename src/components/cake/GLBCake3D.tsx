import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { OreoCake3DProps } from './OreoCake3D';
import { OrnateGoldenKnife, CuttingGuide3D } from './OreoCake3D';

// -------------------------------------------------------------
// Interactive 3D Birthday Cake Powered by Imported GLB Models
// Supports seamless pre-cut intact state and post-cut wedge separation
// -------------------------------------------------------------
export const GLBCake3D: React.FC<OreoCake3DProps> = ({
  candle1Lit,
  candle2Lit,
  onLightCandle,
  isBlownOut,
  isCut,
  stage,
  dragProgress = 0,
  reducedMotion = false,
}) => {
  // Load both GLB assets from public/models
  const intactGltf = useLoader(GLTFLoader, `${import.meta.env.BASE_URL}models/birthday_cake_intact.glb`);
  const cutGltf = useLoader(GLTFLoader, `${import.meta.env.BASE_URL}models/birthday_cake_cut.glb`);

  // Clone scenes to isolate instances from loader cache, and hide stray board curl
  const intactScene = useMemo(() => {
    const s = intactGltf.scene.clone(true);
    s.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const strayCurl = s.getObjectByName('board_chocolate_curl');
    if (strayCurl) strayCurl.visible = false;
    return s;
  }, [intactGltf]);

  const cutScene = useMemo(() => {
    const s = cutGltf.scene.clone(true);
    s.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const strayCurl = s.getObjectByName('board_chocolate_curl');
    if (strayCurl) strayCurl.visible = false;
    return s;
  }, [cutGltf]);

  // Master model scale: model cake radius is 0.125m; scale 8.0 gives cake radius 1.00m (diameter 2.00m),
  // platter diameter 2.40m, comfortably framed and perfectly centered horizontally.
  const cakeScale = 8.0;
  const cakeBaseY = -0.40;
  const cakeRotY = 0.12;

  // Active scene selection: intact model before cutting; cut model during/after cutting
  const showCutModel = isCut || stage === 'celebration' || (stage === 'cutting' && dragProgress > 15);
  const activeScene = showCutModel ? cutScene : intactScene;

  // Refs for dynamic candle flame and hitbox attachment
  const flame1Pos = useRef(new THREE.Vector3());
  const flame2Pos = useRef(new THREE.Vector3());
  const candle1Pos = useRef(new THREE.Vector3());
  const candle2Pos = useRef(new THREE.Vector3());

  // Hitbox & flame refs
  const candleHitbox1Ref = useRef<THREE.Mesh>(null);
  const candleHitbox2Ref = useRef<THREE.Mesh>(null);
  const flameLight1Ref = useRef<THREE.PointLight>(null);
  const flameLight2Ref = useRef<THREE.PointLight>(null);
  const flameGroup1Ref = useRef<THREE.Group>(null);
  const flameGroup2Ref = useRef<THREE.Group>(null);
  const smokeRef = useRef<THREE.Group>(null);
  const smokeInitRef = useRef<boolean>(false);

  // Soft Radial Contact Shadow Texture
  const shadowTex = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(18, 10, 6, 0.78)');
    grad.addColorStop(0.4, 'rgba(22, 12, 8, 0.45)');
    grad.addColorStop(0.72, 'rgba(24, 14, 9, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);

  // Organic 3D tapered flame teardrop geometry
  // 1. Outer subtle warm-amber mantle
  const outerFlameGeom = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.002, 0),
      new THREE.Vector2(0.014, 0.014),
      new THREE.Vector2(0.018, 0.030),
      new THREE.Vector2(0.014, 0.052),
      new THREE.Vector2(0.007, 0.074),
      new THREE.Vector2(0.001, 0.092),
    ];
    return new THREE.LatheGeometry(pts, 18);
  }, []);

  // 2. Middle radiant golden-yellow mantle
  const midFlameGeom = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0015, 0.002),
      new THREE.Vector2(0.011, 0.014),
      new THREE.Vector2(0.014, 0.028),
      new THREE.Vector2(0.010, 0.048),
      new THREE.Vector2(0.005, 0.066),
      new THREE.Vector2(0.001, 0.080),
    ];
    return new THREE.LatheGeometry(pts, 16);
  }, []);

  // 3. Inner warm incandescent golden-white core
  const innerFlameGeom = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.001, 0.003),
      new THREE.Vector2(0.007, 0.012),
      new THREE.Vector2(0.009, 0.024),
      new THREE.Vector2(0.006, 0.038),
      new THREE.Vector2(0.001, 0.052),
    ];
    return new THREE.LatheGeometry(pts, 14);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // 1. Smooth physical slice separation during cutting and celebration
    if (showCutModel) {
      const sliceWedge = cutScene.getObjectByName('slice_wedge');
      if (sliceWedge) {
        // Model wedge bisector angle is 0.575 rad (~33 deg)
        const targetDist = isCut
          ? 0.038
          : stage === 'cutting' && dragProgress > 30
          ? ((dragProgress - 30) / 70) * 0.038
          : 0;

        const dirX = Math.cos(0.575);
        const dirZ = Math.sin(0.575);
        const targetX = targetDist * dirX;
        const targetZ = targetDist * dirZ;

        sliceWedge.position.x += (targetX - sliceWedge.position.x) * (delta * 4.5);
        sliceWedge.position.z += (targetZ - sliceWedge.position.z) * (delta * 4.5);
      }
    }

    // 2. Query exact bone / locator positions from the active model
    const anchorA = activeScene.getObjectByName('flame_anchor_a');
    if (anchorA) anchorA.getWorldPosition(flame1Pos.current);

    const anchorB = activeScene.getObjectByName('flame_anchor_b');
    if (anchorB) anchorB.getWorldPosition(flame2Pos.current);

    const candleA = activeScene.getObjectByName('candle_2a');
    if (candleA) candleA.getWorldPosition(candle1Pos.current);

    const candleB = activeScene.getObjectByName('candle_2b');
    if (candleB) candleB.getWorldPosition(candle2Pos.current);

    // Update Hitbox positions
    if (candleHitbox1Ref.current) {
      candleHitbox1Ref.current.position.set(candle1Pos.current.x, candle1Pos.current.y + 0.18, candle1Pos.current.z);
    }
    if (candleHitbox2Ref.current) {
      candleHitbox2Ref.current.position.set(candle2Pos.current.x, candle2Pos.current.y + 0.18, candle2Pos.current.z);
    }

    // 3. Flame 1 Wavering Animation & Light
    if (flameGroup1Ref.current) {
      if (candle1Lit && !isBlownOut) {
        flameGroup1Ref.current.visible = true;
        flameGroup1Ref.current.position.copy(flame1Pos.current);
        const flicker1 = reducedMotion ? 0 : (Math.sin(t * 7.5) * 0.022 + Math.sin(t * 13.2) * 0.014 + Math.sin(t * 22.7) * 0.008);
        const stretchY1 = 1 + flicker1;
        const waverX1 = reducedMotion ? 0 : (Math.sin(t * 8.3) * 0.014 + Math.cos(t * 15.1) * 0.008);
        const waverZ1 = reducedMotion ? 0 : (Math.cos(t * 9.1) * 0.014 + Math.sin(t * 14.3) * 0.008);
        flameGroup1Ref.current.scale.set(1 - flicker1 * 0.35, stretchY1, 1 - flicker1 * 0.35);
        flameGroup1Ref.current.rotation.set(waverZ1 * 0.35, 0, waverX1 * 0.35);
      } else {
        flameGroup1Ref.current.visible = false;
      }
    }

    if (flameLight1Ref.current) {
      if (candle1Lit && !isBlownOut) {
        flameLight1Ref.current.position.set(flame1Pos.current.x, flame1Pos.current.y + 0.04, flame1Pos.current.z);
        flameLight1Ref.current.intensity = 0.95 + (reducedMotion ? 0 : Math.sin(t * 11) * 0.06 + Math.sin(t * 23) * 0.03);
      } else {
        flameLight1Ref.current.intensity = 0;
      }
    }

    // 4. Flame 2 Wavering Animation & Light
    if (flameGroup2Ref.current) {
      if (candle2Lit && !isBlownOut) {
        flameGroup2Ref.current.visible = true;
        flameGroup2Ref.current.position.copy(flame2Pos.current);
        const flicker2 = reducedMotion ? 0 : (Math.sin(t * 8.1 + 1.3) * 0.022 + Math.sin(t * 12.8 + 0.7) * 0.014 + Math.sin(t * 24.1 + 2.1) * 0.008);
        const stretchY2 = 1 + flicker2;
        const waverX2 = reducedMotion ? 0 : (Math.sin(t * 7.9 + 1.1) * 0.014 + Math.cos(t * 16.3 + 0.5) * 0.008);
        const waverZ2 = reducedMotion ? 0 : (Math.cos(t * 9.7 + 2.0) * 0.014 + Math.sin(t * 13.7 + 1.8) * 0.008);
        flameGroup2Ref.current.scale.set(1 - flicker2 * 0.35, stretchY2, 1 - flicker2 * 0.35);
        flameGroup2Ref.current.rotation.set(waverZ2 * 0.35, 0, waverX2 * 0.35);
      } else {
        flameGroup2Ref.current.visible = false;
      }
    }

    if (flameLight2Ref.current) {
      if (candle2Lit && !isBlownOut) {
        flameLight2Ref.current.position.set(flame2Pos.current.x, flame2Pos.current.y + 0.04, flame2Pos.current.z);
        flameLight2Ref.current.intensity = 0.95 + (reducedMotion ? 0 : Math.sin(t * 12 + 1.5) * 0.06 + Math.sin(t * 25 + 0.8) * 0.03);
      } else {
        flameLight2Ref.current.intensity = 0;
      }
    }

    // 5. Smoke Wisps on Blowout
    if (smokeRef.current && isBlownOut) {
      if (!smokeInitRef.current) {
        smokeInitRef.current = true;
        smokeRef.current.position.set(flame1Pos.current.x, flame1Pos.current.y + 0.02, flame1Pos.current.z);
      }
      smokeRef.current.position.y += 0.005;
      smokeRef.current.scale.multiplyScalar(1.01);
      if (smokeRef.current.position.y > flame1Pos.current.y + 1.2) {
        smokeRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      {/* =======================================================
          1. Floor Contact Shadow on Marble Table (y = -0.819)
          ======================================================= */}
      <mesh position={[0, -0.819, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.0, 2.0]} />
        <meshBasicMaterial
          map={shadowTex || undefined}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* =======================================================
          2. Neoclassical Fluted Gold Pedestal Stem (Under Plate)
          ======================================================= */}
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

      {/* =======================================================
          3. Imported GLB Birthday Cake (Intact or Cut)
          ======================================================= */}
      <group
        position={[0, cakeBaseY, 0]}
        rotation={[0, cakeRotY, 0]}
        scale={[cakeScale, cakeScale, cakeScale]}
      >
        <primitive object={activeScene} />
      </group>

      {/* =======================================================
          4. Interactive Candle Lighting Hitboxes
          ======================================================= */}
      {/* Candle 1 Touch Hitbox */}
      <mesh
        ref={candleHitbox1Ref}
        onClick={(e) => {
          e.stopPropagation();
          onLightCandle(0);
        }}
        onPointerOver={() => {
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
        }}
      >
        <cylinderGeometry args={[0.22, 0.22, 0.55, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Candle 2 Touch Hitbox */}
      <mesh
        ref={candleHitbox2Ref}
        onClick={(e) => {
          e.stopPropagation();
          onLightCandle(1);
        }}
        onPointerOver={() => {
          if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
        }}
      >
        <cylinderGeometry args={[0.22, 0.22, 0.55, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* =======================================================
          5. Candle Flames (Attached to flame_anchor_a and flame_anchor_b)
          ======================================================= */}
      {/* Flame 1 */}
      <group ref={flameGroup1Ref} visible={candle1Lit && !isBlownOut}>
        {/* Outer subtle warm-amber edge */}
        <mesh geometry={outerFlameGeom}>
          <meshBasicMaterial color="#f5841f" transparent opacity={0.48} depthWrite={false} />
        </mesh>
        {/* Middle radiant golden-yellow mantle */}
        <mesh geometry={midFlameGeom} position={[0, 0.002, 0]}>
          <meshBasicMaterial color="#ffc43d" transparent opacity={0.88} depthWrite={false} />
        </mesh>
        {/* Inner incandescent golden-white core */}
        <mesh geometry={innerFlameGeom} position={[0, 0.004, 0]}>
          <meshBasicMaterial color="#fffde6" transparent opacity={0.96} depthWrite={false} />
        </mesh>
      </group>
      <pointLight
        ref={flameLight1Ref}
        color="#ffae42"
        intensity={candle1Lit && !isBlownOut ? 0.95 : 0}
        distance={2.4}
        decay={2}
      />

      {/* Flame 2 */}
      <group ref={flameGroup2Ref} visible={candle2Lit && !isBlownOut}>
        {/* Outer subtle warm-amber edge */}
        <mesh geometry={outerFlameGeom}>
          <meshBasicMaterial color="#f5841f" transparent opacity={0.48} depthWrite={false} />
        </mesh>
        {/* Middle radiant golden-yellow mantle */}
        <mesh geometry={midFlameGeom} position={[0, 0.002, 0]}>
          <meshBasicMaterial color="#ffc43d" transparent opacity={0.88} depthWrite={false} />
        </mesh>
        {/* Inner incandescent golden-white core */}
        <mesh geometry={innerFlameGeom} position={[0, 0.004, 0]}>
          <meshBasicMaterial color="#fffde6" transparent opacity={0.96} depthWrite={false} />
        </mesh>
      </group>
      <pointLight
        ref={flameLight2Ref}
        color="#ffae42"
        intensity={candle2Lit && !isBlownOut ? 0.95 : 0}
        distance={2.4}
        decay={2}
      />

      {/* Subtle Smoke Wisps on Blowout */}
      {isBlownOut && (
        <group ref={smokeRef}>
          <mesh position={[0, 0.035, 0]}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshBasicMaterial color="#dfd8d4" transparent opacity={0.30} />
          </mesh>
          <mesh position={[0.010, 0.075, 0]}>
            <sphereGeometry args={[0.036, 8, 8]} />
            <meshBasicMaterial color="#dfd8d4" transparent opacity={0.20} />
          </mesh>
        </group>
      )}

      {/* =======================================================
          6. Recognizable Metallic Cake Knife & Luminous Guide
          ======================================================= */}
      <CuttingGuide3D progress={dragProgress} isCut={isCut} stage={stage} />
      <OrnateGoldenKnife progress={dragProgress} isCut={isCut} stage={stage} />
    </group>
  );
};

