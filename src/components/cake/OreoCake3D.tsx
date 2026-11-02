import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface OreoCake3DProps {
  candle1Lit: boolean;
  candle2Lit: boolean;
  onLightCandle: (index: 0 | 1) => void;
  isBlownOut: boolean;
  isCut: boolean;
  stage: 'lighting' | 'wish' | 'cutting' | 'celebration';
  dragProgress?: number;
  reducedMotion?: boolean;
}

// Deterministic pseudo-random helper for delicate decoration variation
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// -------------------------------------------------------------
// Procedural Canvas Textures for Haute-Pâtisserie Chocolate Cake
// -------------------------------------------------------------
function createPatisserieTextures() {
  if (typeof document === 'undefined') {
    return { spongeTex: null, creamFillingTex: null, glazeTex: null, shadowTex: null };
  }

  // 1. Dark Chocolate Chiffon Sponge Texture (Rich cocoa crumb, gentle horizontal stratification, fine pores)
  const c1 = document.createElement('canvas');
  c1.width = 512;
  c1.height = 256;
  const ctx1 = c1.getContext('2d');
  if (ctx1) {
    // Rich warm dark cocoa base
    ctx1.fillStyle = '#402216';
    ctx1.fillRect(0, 0, 512, 256);

    // Subtle, organic horizontal crumb density variation (restrained natural stratification)
    for (let y = 0; y < 256; y++) {
      const wave1 = Math.sin((y / 256) * Math.PI * 6);
      const wave2 = Math.sin((y / 256) * Math.PI * 14 + 1.2);
      const band = (wave1 * 0.6 + wave2 * 0.4) * 0.5 + 0.5; // 0 to 1
      const noise = (pseudoRandom(y * 2.3) - 0.5) * 0.2;
      const factor = Math.max(0, Math.min(1, band + noise));

      // Delicate variation between #381d12 and #472619 (always warm chocolate, never black or orange)
      const r = Math.round(56 + factor * 15);
      const g = Math.round(29 + factor * 9);
      const b = Math.round(18 + factor * 7);
      ctx1.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx1.fillRect(0, y, 512, 1);
    }

    // Porous sponge air pockets & cocoa granules (fine, irregular, isotropic)
    for (let i = 0; i < 2200; i++) {
      const x = pseudoRandom(i * 3 + 1) * 512;
      const y = pseudoRandom(i * 3 + 2) * 256;
      const isPocket = pseudoRandom(i * 5) > 0.88;
      const r = isPocket ? 1.3 + pseudoRandom(i * 7) * 0.9 : 0.55 + pseudoRandom(i * 7) * 0.65;

      // Pore indentation (warm dark cavity)
      ctx1.beginPath();
      ctx1.arc(x, y, r, 0, Math.PI * 2);
      ctx1.fillStyle = 'rgba(26, 13, 8, 0.42)';
      ctx1.fill();

      // Delicate crumb highlight crescent along pore bottom (depth shading)
      if (isPocket) {
        ctx1.beginPath();
        ctx1.arc(x + 0.35, y + 0.35, r * 0.85, 0, Math.PI * 0.75);
        ctx1.strokeStyle = 'rgba(96, 54, 34, 0.22)';
        ctx1.lineWidth = 0.6;
        ctx1.stroke();
      }
    }

    // Fine roasted cocoa micro-flecks
    for (let i = 0; i < 450; i++) {
      const x = pseudoRandom(i * 2 + 13) * 512;
      const y = pseudoRandom(i * 2 + 17) * 256;
      ctx1.fillStyle = 'rgba(20, 10, 6, 0.55)';
      ctx1.fillRect(x, y, 1.2, 1.2);
    }
  }
  const spongeTex = new THREE.CanvasTexture(c1);
  spongeTex.colorSpace = THREE.SRGBColorSpace;
  spongeTex.wrapS = THREE.RepeatWrapping;
  spongeTex.wrapT = THREE.RepeatWrapping;
  spongeTex.repeat.set(1, 1);

  // 2. Silky Ivory Dairy Cream Texture (Warm satin cream with delicate vanilla specks)
  const c2 = document.createElement('canvas');
  c2.width = 512;
  c2.height = 256;
  const ctx2 = c2.getContext('2d');
  if (ctx2) {
    ctx2.fillStyle = '#f6efe2';
    ctx2.fillRect(0, 0, 512, 256);

    // Soft vertical gradient representing velvety layered cream depth with subtle contact shading
    const grad = ctx2.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(68, 36, 22, 0.18)');
    grad.addColorStop(0.12, 'rgba(240, 230, 214, 0.28)');
    grad.addColorStop(0.5, 'rgba(255, 253, 248, 0.18)');
    grad.addColorStop(0.88, 'rgba(240, 230, 214, 0.28)');
    grad.addColorStop(1, 'rgba(68, 36, 22, 0.18)');
    ctx2.fillStyle = grad;
    ctx2.fillRect(0, 0, 512, 256);

    // Microscopic vanilla bean specks
    for (let i = 0; i < 300; i++) {
      const x = pseudoRandom(i * 3 + 7) * 512;
      const y = 8 + pseudoRandom(i * 3 + 9) * 240;
      ctx2.fillStyle = 'rgba(65, 36, 22, 0.20)';
      ctx2.fillRect(x, y, 1.2, 1.2);
    }
  }
  const creamFillingTex = new THREE.CanvasTexture(c2);
  creamFillingTex.colorSpace = THREE.SRGBColorSpace;
  creamFillingTex.wrapS = THREE.RepeatWrapping;
  creamFillingTex.wrapT = THREE.RepeatWrapping;
  creamFillingTex.repeat.set(1, 1);

  // 3. Deep Chocolate Mirror Glaze Texture
  const c3 = document.createElement('canvas');
  c3.width = 512;
  c3.height = 512;
  const ctx3 = c3.getContext('2d');
  if (ctx3) {
    ctx3.fillStyle = '#30150b';
    ctx3.fillRect(0, 0, 512, 512);

    // Concentric silky warm cocoa sheen
    const radGrad = ctx3.createRadialGradient(256, 256, 16, 256, 256, 256);
    radGrad.addColorStop(0, '#542918');
    radGrad.addColorStop(0.50, '#3f1d10');
    radGrad.addColorStop(1, '#2a0f05');
    ctx3.fillStyle = radGrad;
    ctx3.fillRect(0, 0, 512, 512);
  }
  const glazeTex = new THREE.CanvasTexture(c3);
  glazeTex.colorSpace = THREE.SRGBColorSpace;

  // 4. Soft Radial Contact Shadow Texture
  const c4 = document.createElement('canvas');
  c4.width = 256;
  c4.height = 256;
  const ctx4 = c4.getContext('2d');
  if (ctx4) {
    const grad = ctx4.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(18, 10, 6, 0.78)');
    grad.addColorStop(0.4, 'rgba(22, 12, 8, 0.45)');
    grad.addColorStop(0.72, 'rgba(24, 14, 9, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx4.fillStyle = grad;
    ctx4.fillRect(0, 0, 256, 256);
  }
  const shadowTex = new THREE.CanvasTexture(c4);

  return { spongeTex, creamFillingTex, glazeTex, shadowTex };
}

// -------------------------------------------------------------
// Sculpted 3D Number '2' Shape Generator
// -------------------------------------------------------------
function createNumeral2Shape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.13, 0);
  s.lineTo(0.14, 0);
  s.lineTo(0.14, 0.07);
  s.lineTo(-0.02, 0.07);
  s.lineTo(0.10, 0.25);
  s.bezierCurveTo(0.17, 0.35, 0.14, 0.49, 0.01, 0.49);
  s.bezierCurveTo(-0.12, 0.49, -0.15, 0.39, -0.13, 0.32);
  s.lineTo(-0.05, 0.32);
  s.bezierCurveTo(-0.05, 0.37, -0.02, 0.41, 0.01, 0.41);
  s.bezierCurveTo(0.06, 0.41, 0.09, 0.35, 0.03, 0.27);
  s.lineTo(-0.13, 0.07);
  s.closePath();
  return s;
}

// -------------------------------------------------------------
// Beaded Gold Rim Trim for Neoclassical Platter (Refined Antique Gold)
// -------------------------------------------------------------
const PlatterBeadedRim: React.FC = () => {
  const beads = useMemo(() => {
    const list: [number, number, number][] = [];
    const count = 56;
    const r = 1.25;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      list.push([Math.cos(a) * r, 0.385, Math.sin(a) * r]);
    }
    return list;
  }, []);

  return (
    <group>
      {beads.map((pos, idx) => (
        <mesh key={`platter-bead-${idx}`} position={pos}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#c49e5c" metalness={0.86} roughness={0.22} />
        </mesh>
      ))}
    </group>
  );
};

// -------------------------------------------------------------
// Procedural Fluted Star-Piped Rosette Geometry (Ateco 8-Star Tip)
// -------------------------------------------------------------
function createPipedRosetteGeometry(flutes = 8, height = 0.145, baseRadius = 0.078): THREE.BufferGeometry {
  const radialSegments = 48;
  const heightSegments = 28;
  const geom = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let j = 0; j <= heightSegments; j++) {
    const v = j / heightSegments; // 0 (bottom) to 1 (top peak)
    const y = v * height;

    // Authentic pastry chef swirl: broad fluted base, voluptuous rounded middle swell, tapering spiral peak
    const swell = (1 - v) * (0.35 + 0.95 * Math.sin(v * Math.PI) + 0.65 * (1 - v));
    const rad = baseRadius * swell;
    const twist = v * 2.0; // Graceful spiral swirl twist wrapping up to peak

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const angle = u * Math.PI * 2;

      // 8 crisp star ridges with deep fluted piping valleys
      const fluteMod = 1.0 + 0.20 * Math.cos(flutes * angle + twist);
      const r = rad * fluteMod;

      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle);

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * (radialSegments + 1) + i;
      const b = (j + 1) * (radialSegments + 1) + i;
      const c = (j + 1) * (radialSegments + 1) + (i + 1);
      const d = j * (radialSegments + 1) + (i + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// -------------------------------------------------------------
// Artisanal Piped Cream Rosette (Single unified fluted swirl, velvety Chantilly)
// -------------------------------------------------------------
const ArtisanalCreamRosette: React.FC<{
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
}> = ({ position, scale = 1, rotationY = 0 }) => {
  const rosetteGeom = useMemo(() => createPipedRosetteGeometry(), []);

  return (
    <group position={position} scale={[scale * 1.15, scale * 1.15, scale * 1.15]} rotation={[0, rotationY, 0]}>
      {/* 1. Main fluted star-piped cream swirl with soft velvety diffuse response */}
      <mesh geometry={rosetteGeom}>
        <meshStandardMaterial
          color="#fffaf0"
          roughness={0.42}
          metalness={0.0}
        />
      </mesh>

      {/* 2. Delicate crown highlight atop swirl apex */}
      <mesh position={[0, 0.138, 0]}>
        <sphereGeometry args={[0.013, 12, 10]} />
        <meshStandardMaterial color="#fffef8" roughness={0.32} />
      </mesh>

      {/* 3. Crowned with a single glossy dark chocolate pearl at apex */}
      <mesh position={[0, 0.148, 0]}>
        <sphereGeometry args={[0.013, 12, 12]} />
        <meshStandardMaterial color="#220e06" roughness={0.10} metalness={0.08} />
      </mesh>

      {/* 4. Delicate gold flake garnish beside apex */}
      <mesh position={[0.020, 0.138, 0.012]} rotation={[0.2, 0.4, 0.1]}>
        <planeGeometry args={[0.016, 0.012]} />
        <meshStandardMaterial color="#dfb96c" metalness={0.92} roughness={0.16} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// -------------------------------------------------------------
// Edible Gold Leaf Flake (Delicate Luxury Accent on Dark Glaze)
// -------------------------------------------------------------
const GoldLeafFlake: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
}> = ({ position, rotation, scale = 1 }) => {
  return (
    <mesh position={position} rotation={rotation} scale={[scale * 1.4, scale * 1.4, scale * 1.4]}>
      <planeGeometry args={[0.032, 0.024]} />
      <meshStandardMaterial
        color="#dfb96c"
        metalness={0.92}
        roughness={0.18}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// -------------------------------------------------------------
// Sculpted 3D Number Candle ('2') with Tapered 3D Teardrop Flame
// -------------------------------------------------------------
const SculptedNumberCandle: React.FC<{
  digit: number;
  position: [number, number, number];
  isLit: boolean;
  isBlownOut: boolean;
  onLight: () => void;
  reducedMotion?: boolean;
}> = ({ position, isLit, isBlownOut, onLight, reducedMotion = false }) => {
  const flameGroupRef = useRef<THREE.Group>(null);
  const flameLightRef = useRef<THREE.PointLight>(null);
  const smokeRef = useRef<THREE.Group>(null);

  const numeralShape = useMemo(() => createNumeral2Shape(), []);
  const extrudeSettings = useMemo(
    () => ({
      depth: 0.065,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.015,
    }),
    []
  );

  // Organic 3D tapered flame teardrop profiles
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

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (flameGroupRef.current) {
      if (isLit && !isBlownOut) {
        flameGroupRef.current.visible = true;
        const flicker = reducedMotion ? 0 : (Math.sin(t * 7.5) * 0.022 + Math.sin(t * 13.2) * 0.014 + Math.sin(t * 22.7) * 0.008);
        const stretchY = 1 + flicker;
        const waverX = reducedMotion ? 0 : (Math.sin(t * 8.3) * 0.014 + Math.cos(t * 15.1) * 0.008);
        const waverZ = reducedMotion ? 0 : (Math.cos(t * 9.1) * 0.014 + Math.sin(t * 14.3) * 0.008);
        flameGroupRef.current.scale.set(1 - flicker * 0.35, stretchY, 1 - flicker * 0.35);
        flameGroupRef.current.rotation.set(waverZ * 0.35, 0, waverX * 0.35);
      } else {
        flameGroupRef.current.visible = false;
      }
    }

    if (flameLightRef.current) {
      if (isLit && !isBlownOut) {
        flameLightRef.current.intensity = 0.95 + (reducedMotion ? 0 : Math.sin(t * 11) * 0.06 + Math.sin(t * 23) * 0.03);
      } else {
        flameLightRef.current.intensity = 0;
      }
    }

    if (smokeRef.current && isBlownOut) {
      smokeRef.current.position.y += 0.005;
      smokeRef.current.scale.multiplyScalar(1.010);
      if (smokeRef.current.position.y > 1.2) {
        smokeRef.current.visible = false;
      }
    }
  });

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onLight();
      }}
      onPointerOver={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        if (typeof document !== 'undefined') document.body.style.cursor = 'auto';
      }}
    >
      {/* Invisible Touch Hitbox for Easy Clicking */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.72, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Gold Pedestal Base Plinth */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.03, 20]} />
        <meshStandardMaterial color="#ecd09b" metalness={0.9} roughness={0.18} />
      </mesh>

      {/* 3D Extruded Ivory Numeral '2' Body with Champagne Pearl Glow */}
      <mesh position={[0, 0.03, -0.032]}>
        <extrudeGeometry args={[numeralShape, extrudeSettings]} />
        <meshStandardMaterial
          color="#fbf7ee"
          roughness={0.26}
          emissive="#ecd09b"
          emissiveIntensity={isLit && !isBlownOut ? 0.20 : 0.04}
        />
      </mesh>

      {/* Gold Foil Accent Trim on Front Face */}
      <mesh position={[0, 0.03, 0.034]} scale={[0.96, 0.96, 0.1]}>
        <extrudeGeometry args={[numeralShape, extrudeSettings]} />
        <meshStandardMaterial color="#dfb76c" metalness={0.92} roughness={0.16} />
      </mesh>

      {/* Cotton Wick */}
      <mesh position={[0.01, 0.54, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.05, 8]} />
        <meshStandardMaterial color="#281d1a" roughness={0.9} />
      </mesh>

      {/* Tapered 3D Teardrop Flame */}
      <group ref={flameGroupRef} position={[0.01, 0.565, 0]} visible={isLit && !isBlownOut}>
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

      {/* Restrained Candle Point Light */}
      <pointLight
        ref={flameLightRef}
        position={[0.01, 0.60, 0]}
        color="#ffae42"
        intensity={isLit && !isBlownOut ? 0.95 : 0}
        distance={2.4}
        decay={2}
      />

      {/* Subtle Smoke Wisps on Blowout */}
      {isBlownOut && (
        <group ref={smokeRef} position={[0.01, 0.58, 0]}>
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
    </group>
  );
};

// -------------------------------------------------------------
// Subtle Luminous 3D Cutting Guide for Cake Slicing
// Elegant dotted trajectory guiding the user's drag down through the wedge
// -------------------------------------------------------------
export const CuttingGuide3D: React.FC<{
  progress: number;
  isCut: boolean;
  stage: string;
}> = ({ progress, isCut, stage }) => {
  const guideRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<number>(0);

  // 8 subtle glowing starlight dots spanning vertically from blade hover height (y ~ 0.86) down to platter (y ~ 0.16)
  const dotPoints = useMemo(
    () => [
      { y: 0.86, baseOpacity: 0.90 },
      { y: 0.76, baseOpacity: 0.85 },
      { y: 0.66, baseOpacity: 0.80 },
      { y: 0.56, baseOpacity: 0.75 },
      { y: 0.46, baseOpacity: 0.70 },
      { y: 0.36, baseOpacity: 0.65 },
      { y: 0.26, baseOpacity: 0.60 },
      { y: 0.16, baseOpacity: 0.55 },
    ],
    []
  );

  useFrame((state, delta) => {
    if (!guideRef.current) return;
    if (stage === 'cutting' && !isCut) {
      guideRef.current.visible = true;
      pulseRef.current += delta * 3.2;

      const isNarrow = state.size.width < 768 || state.size.width / state.size.height < 0.8;
      const targetX = isNarrow ? 0.520 : 0.780;
      const targetZ = isNarrow ? 0.740 : 0.880;
      guideRef.current.position.set(targetX, 0, targetZ);

      const normProgress = Math.min(1, Math.max(0, progress / 100));

      // Each dot pulses in a downward starlight wave and dims as the knife slices past it
      guideRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        if (mesh && mesh.material) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          const dotY = dotPoints[i]?.y ?? 0.5;
          const dotNormalized = (dotY - 0.16) / (0.86 - 0.16);
          const isPassed = 1 - normProgress <= dotNormalized - 0.04;

          const wave = (Math.sin(pulseRef.current - i * 0.6) + 1) * 0.5;
          const targetOpacity = isPassed
            ? 0.10
            : (dotPoints[i]?.baseOpacity ?? 0.7) * (0.50 + wave * 0.50);
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.25);
        }
      });
    } else {
      guideRef.current.visible = false;
    }
  });

  return (
    <group ref={guideRef} position={[0.780, 0, 0.880]} visible={stage === 'cutting' && !isCut}>
      {dotPoints.map((pt, i) => (
        <mesh key={i} position={[0, pt.y, 0]}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshBasicMaterial
            color="#ffe49e"
            transparent
            opacity={pt.baseOpacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// -------------------------------------------------------------
// Recognizable Metallic Cake-Cutting Knife with Walnut Handle
// Refined proportions, polished steel blade, champagne gold accents
// -------------------------------------------------------------
export const OrnateGoldenKnife: React.FC<{
  progress: number;
  isCut: boolean;
  stage: string;
}> = ({ progress, isCut, stage }) => {
  const knifeRef = useRef<THREE.Group>(null);
  const entranceT = useRef<number>(0);

  // Recognizable ceremonial metallic blade with triangular/tapered tip and beveled cutting edge
  const bladeGeom = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.052); // bolster top
    s.lineTo(0.48, 0.050); // straight spine
    s.quadraticCurveTo(0.64, 0.032, 0.68, -0.006); // triangular drop-point tip
    s.lineTo(0.50, -0.056); // cutting edge curve up to tip
    s.lineTo(0, -0.062); // cutting heel at bolster
    s.closePath();

    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.008,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    g.translate(0, 0, -0.004);
    g.computeVertexNormals();
    return g;
  }, []);

  // Visible cutting edge bevel highlight strip
  const edgeBevelGeom = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.054);
    s.lineTo(0.50, -0.050);
    s.quadraticCurveTo(0.64, 0.026, 0.68, -0.006);
    s.lineTo(0.66, -0.012);
    s.lineTo(0.50, -0.059);
    s.lineTo(0, -0.064);
    s.closePath();

    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.009,
      bevelEnabled: false,
    });
    g.translate(0, 0, -0.0045);
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame((state, delta) => {
    if (!knifeRef.current) return;
    if (stage === 'cutting') {
      knifeRef.current.visible = true;

      // Smooth entrance transition - gently glides down from above, no abrupt pop
      entranceT.current = Math.min(1, entranceT.current + delta * 2.4);
      const ease = 1 - Math.pow(1 - entranceT.current, 3);
      const entryY = (1 - ease) * 0.32;

      const isNarrow = state.size.width < 768 || state.size.width / state.size.height < 0.8;
      const baseScale = isNarrow ? 0.68 : 0.78;
      const currentScale = baseScale * (0.92 + 0.08 * ease);
      knifeRef.current.scale.set(currentScale, currentScale, currentScale);

      const targetX = isNarrow ? 0.520 : 0.780;
      const targetZ = isNarrow ? 0.740 : 0.880;

      const t = isCut ? 1 : Math.min(1, Math.max(0, progress / 100));

      // 1. Prominent hovering pose poised above the cake, floating gently in clear air
      const hoverFloat = Math.sin(state.clock.elapsedTime * 2.6) * 0.018;
      const hoverPitch = Math.sin(state.clock.elapsedTime * 2.6) * 0.012;
      const hoverPos = new THREE.Vector3(targetX, 0.940 + hoverFloat + entryY, targetZ);
      const hoverRot = new THREE.Euler(2.850 + hoverPitch, 0.700, -3.250);

      // 2. Slice end pose: sliced cleanly down through the cake wedge to the board
      const endPos = new THREE.Vector3(targetX, 0.100, targetZ);
      const endRot = new THREE.Euler(2.850, 0.680, -3.141);

      if (t === 0) {
        knifeRef.current.position.copy(hoverPos);
        knifeRef.current.rotation.copy(hoverRot);
      } else {
        // Dragging slices the knife cleanly down through the cake with blade leading
        const sliceT = Math.min(1, Math.max(0, t));
        knifeRef.current.position.lerpVectors(hoverPos, endPos, sliceT);
        knifeRef.current.rotation.set(
          hoverRot.x + (endRot.x - hoverRot.x) * sliceT,
          hoverRot.y + (endRot.y - hoverRot.y) * sliceT,
          hoverRot.z + (endRot.z - hoverRot.z) * sliceT
        );
      }
    } else if (stage === 'celebration' && isCut) {
      // Natural resting pose on gold cake board to the right of the separated slice
      knifeRef.current.visible = true;
      const isNarrow = state.size.width < 768 || state.size.width / state.size.height < 0.8;
      const baseScale = isNarrow ? 0.68 : 0.78;
      knifeRef.current.scale.set(baseScale, baseScale, baseScale);
      const targetX = isNarrow ? 0.600 : 0.860;
      const targetPos = new THREE.Vector3(targetX, -0.340, 0.580);
      const targetRot = new THREE.Euler(-Math.PI / 2, 0.05, 0.650);

      knifeRef.current.position.lerp(targetPos, Math.min(1, delta * 5.0));
      knifeRef.current.rotation.set(
        THREE.MathUtils.lerp(knifeRef.current.rotation.x, targetRot.x, Math.min(1, delta * 5.0)),
        THREE.MathUtils.lerp(knifeRef.current.rotation.y, targetRot.y, Math.min(1, delta * 5.0)),
        THREE.MathUtils.lerp(knifeRef.current.rotation.z, targetRot.z, Math.min(1, delta * 5.0))
      );
    } else {
      knifeRef.current.visible = false;
      entranceT.current = 0;
    }
  });

  return (
    <group
      ref={knifeRef}
      position={[0.780, 0.940, 0.880]}
      rotation={[2.850, 0.700, -3.250]}
      scale={[0.78, 0.78, 0.78]}
    >
      {/* 1. Polished Metallic Stainless Steel Cake Knife Blade */}
      <mesh geometry={bladeGeom} castShadow receiveShadow>
        <meshStandardMaterial
          color="#f4f6f8"
          emissive="#ecd09b"
          emissiveIntensity={0.22}
          metalness={0.72}
          roughness={0.16}
        />
      </mesh>

      {/* 2. Highlighted Cutting Edge Bevel with Restrained Luminous Gleam */}
      <mesh geometry={edgeBevelGeom}>
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.50}
          metalness={0.88}
          roughness={0.05}
        />
      </mesh>

      {/* 3. Champagne Gold Bolster Collar */}
      <mesh position={[-0.017, -0.003, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.035, 0.032, 0.036, 16]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.20}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>

      {/* 4. Ergonomic Warm Walnut Wood Handle */}
      <mesh position={[-0.19, -0.003, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.034, 0.040, 0.34, 16]} />
        <meshStandardMaterial
          color="#462414"
          emissive="#1e0c05"
          emissiveIntensity={0.08}
          roughness={0.34}
          metalness={0.08}
        />
      </mesh>

      {/* 5. Brass / Gold Handle Rivets */}
      <mesh position={[-0.10, -0.003, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 10]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.18}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>
      <mesh position={[-0.19, -0.003, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 10]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.18}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>
      <mesh position={[-0.28, -0.003, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 10]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.18}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>

      <mesh position={[-0.10, -0.003, -0.028]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 10]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.18}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>
      <mesh position={[-0.19, -0.003, -0.028]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 10]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.18}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>
      <mesh position={[-0.28, -0.003, -0.028]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.004, 10]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.18}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>

      {/* 6. Champagne Gold Handle Butt Plate */}
      <mesh position={[-0.365, -0.003, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.040, 0.040, 0.016, 16]} />
        <meshStandardMaterial
          color="#ecd09b"
          emissive="#b8934a"
          emissiveIntensity={0.20}
          metalness={0.84}
          roughness={0.20}
        />
      </mesh>
    </group>
  );
};

// -------------------------------------------------------------
// Cylindrical UV Mapper for Watertight Extruded Cake Wedges
// Maps outer walls cylindrically (eliminating vertical stretching),
// internal cuts radially, and caps planar-centered.
// -------------------------------------------------------------
function applyCylindricalCakeUVs(
  geometry: THREE.BufferGeometry,
  radius: number,
  startAngle: number,
  endAngle: number,
  _height: number
) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const count = pos.count;
  const uScale = 0.48; // 48cm per texture repeat
  const vScale = 0.24; // 24cm per texture repeat (isotropic with 512x256 canvas)
  const totalArc = endAngle - startAngle;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = norm ? norm.getX(i) : 0;
    const ny = norm ? norm.getY(i) : 0;
    const nz = norm ? norm.getZ(i) : 0;
    const r = Math.hypot(x, z);

    // Top / bottom caps
    if (Math.abs(ny) > 0.85) {
      uv.setXY(i, (x / radius) * 0.5 + 0.5, (z / radius) * 0.5 + 0.5);
    } else {
      const radialDot = r > 0.01 ? (nx * x + nz * z) / r : 0;

      // Outer cylinder: normal points outward and radius is near outer rim
      if (radialDot > 0.45 && r > radius - 0.06) {
        let angle = Math.atan2(z, x);
        let relAngle = angle - startAngle;
        while (relAngle < 0) relAngle += Math.PI * 2;
        while (relAngle >= Math.PI * 2) relAngle -= Math.PI * 2;

        // Prevent numerical floating-point wrap at the start boundary
        if (relAngle > totalArc + 0.05) {
          relAngle = 0;
        } else if (relAngle > totalArc) {
          relAngle = totalArc;
        }

        const arcDist = relAngle * radius;
        uv.setXY(i, arcDist / uScale, y / vScale);
      } else {
        // Interior radial cut walls
        uv.setXY(i, r / uScale, y / vScale);
      }
    }
  }
  uv.needsUpdate = true;
}

// -------------------------------------------------------------
// Watertight Solid 3D Sector Wedge Generator with Soft Rounded Bevels
// -------------------------------------------------------------
function createSolidCakeWedge(
  radius: number,
  startAngle: number,
  endAngle: number,
  height: number,
  bevelSize = 0.012,
  bevelThickness = 0.012,
  bevelSegments = 3
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(radius * Math.cos(startAngle), -radius * Math.sin(startAngle));
  shape.absarc(0, 0, radius, -startAngle, -endAngle, true);
  shape.lineTo(0, 0);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevelSize > 0,
    bevelSize: bevelSize,
    bevelThickness: bevelThickness,
    bevelSegments: bevelSegments,
    curveSegments: 48,
  });
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();

  // Apply isotropic cylindrical UV coordinates
  applyCylindricalCakeUVs(geom, radius, startAngle, endAngle, height);

  return geom;
}

// -------------------------------------------------------------
// Master Interactive 3D Birthday Cake Component
// -------------------------------------------------------------
export const OreoCake3D: React.FC<OreoCake3DProps> = ({
  candle1Lit,
  candle2Lit,
  onLightCandle,
  isBlownOut,
  isCut,
  stage,
  dragProgress = 0,
}) => {
  const cakeGroupRef = useRef<THREE.Group>(null);
  const sliceGroupRef = useRef<THREE.Group>(null);

  const { spongeTex, creamFillingTex, glazeTex, shadowTex } = useMemo(
    () => createPatisserieTextures(),
    []
  );

  // Exact 43-degree wedge slice facing forward-right: 0.20 to 0.95 radians
  const cutAngleStart = 0.20;
  const cutAngleEnd = 0.95;

  // Haute-pâtisserie 6-layer architecture with distinct physical radius profiles:
  // - 3 rich chocolate sponge tiers (radius 1.15, height 0.22, pillowed bevel 0.016)
  // - 2 indented ivory cream filling bands (radius 1.132, height 0.075, bevel 0.008)
  //   Indenting the cream bands creates genuine physical shadow grooves and highlight contours
  //   that are clearly visible at normal browser viewing distance!
  // - 1 rich mirror glaze dome crown (radius 1.162, height 0.09, rounded shoulder bevel 0.035)
  //   Extending the glaze creates an appetizing patisserie torte overhang.
  // 0.22 (sponge 1) + 0.075 (cream 1) + 0.22 (sponge 2) + 0.075 (cream 2) + 0.22 (sponge 3) + 0.09 (glaze crown) = 0.90m
  const rSponge = 1.15;
  const rCream = 1.132;
  const rGlaze = 1.162;

  const l1H = 0.22;  // Bottom chocolate sponge
  const l2H = 0.075; // Lower indented ivory cream band
  const l3H = 0.22;  // Middle chocolate sponge
  const l4H = 0.075; // Upper indented ivory cream band
  const l5H = 0.22;  // Top chocolate sponge
  const l6H = 0.09;  // Rounded mirror glaze crown
  const cakeHeight = l1H + l2H + l3H + l4H + l5H + l6H; // 0.90

  // Solid, watertight extruded geometries for each distinct layer of the main body (317°)
  const mainL1Geom = useMemo(
    () => createSolidCakeWedge(rSponge, cutAngleEnd, cutAngleStart + Math.PI * 2, l1H, 0.016, 0.016, 4),
    [rSponge, cutAngleStart, cutAngleEnd, l1H]
  );
  const mainL2Geom = useMemo(
    () => createSolidCakeWedge(rCream, cutAngleEnd, cutAngleStart + Math.PI * 2, l2H, 0.008, 0.008, 3),
    [rCream, cutAngleStart, cutAngleEnd, l2H]
  );
  const mainL3Geom = useMemo(
    () => createSolidCakeWedge(rSponge, cutAngleEnd, cutAngleStart + Math.PI * 2, l3H, 0.016, 0.016, 4),
    [rSponge, cutAngleStart, cutAngleEnd, l3H]
  );
  const mainL4Geom = useMemo(
    () => createSolidCakeWedge(rCream, cutAngleEnd, cutAngleStart + Math.PI * 2, l4H, 0.008, 0.008, 3),
    [rCream, cutAngleStart, cutAngleEnd, l4H]
  );
  const mainL5Geom = useMemo(
    () => createSolidCakeWedge(rSponge, cutAngleEnd, cutAngleStart + Math.PI * 2, l5H, 0.016, 0.016, 4),
    [rSponge, cutAngleStart, cutAngleEnd, l5H]
  );
  const mainL6Geom = useMemo(
    () => createSolidCakeWedge(rGlaze, cutAngleEnd, cutAngleStart + Math.PI * 2, l6H, 0.035, 0.035, 6),
    [rGlaze, cutAngleStart, cutAngleEnd, l6H]
  );

  // Solid, watertight extruded geometries for each distinct layer of the slice (43°)
  const sliceL1Geom = useMemo(
    () => createSolidCakeWedge(rSponge, cutAngleStart, cutAngleEnd, l1H, 0.016, 0.016, 4),
    [rSponge, cutAngleStart, cutAngleEnd, l1H]
  );
  const sliceL2Geom = useMemo(
    () => createSolidCakeWedge(rCream, cutAngleStart, cutAngleEnd, l2H, 0.008, 0.008, 3),
    [rCream, cutAngleStart, cutAngleEnd, l2H]
  );
  const sliceL3Geom = useMemo(
    () => createSolidCakeWedge(rSponge, cutAngleStart, cutAngleEnd, l3H, 0.016, 0.016, 4),
    [rSponge, cutAngleStart, cutAngleEnd, l3H]
  );
  const sliceL4Geom = useMemo(
    () => createSolidCakeWedge(rCream, cutAngleStart, cutAngleEnd, l4H, 0.008, 0.008, 3),
    [rCream, cutAngleStart, cutAngleEnd, l4H]
  );
  const sliceL5Geom = useMemo(
    () => createSolidCakeWedge(rSponge, cutAngleStart, cutAngleEnd, l5H, 0.016, 0.016, 4),
    [rSponge, cutAngleStart, cutAngleEnd, l5H]
  );
  const sliceL6Geom = useMemo(
    () => createSolidCakeWedge(rGlaze, cutAngleStart, cutAngleEnd, l6H, 0.035, 0.035, 6),
    [rGlaze, cutAngleStart, cutAngleEnd, l6H]
  );

  // Materials tailored for French Haute-Pâtisserie chocolate & cream
  // (color set to #ffffff so procedural canvas maps display their true rich cocoa & custard tones without darkening)
  const spongeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: spongeTex || undefined,
        roughness: 0.80,
        metalness: 0.01,
      }),
    [spongeTex]
  );

  const creamMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: creamFillingTex || undefined,
        roughness: 0.38,
        metalness: 0.0,
      }),
    [creamFillingTex]
  );

  // Luxurious Dark Chocolate Mirror Glaze with controlled, elegant patisserie highlights
  const mirrorGlazeMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        map: glazeTex || undefined,
        roughness: 0.12,
        metalness: 0.05,
        clearcoat: 0.90,
        clearcoatRoughness: 0.10,
        sheen: 0.40,
        sheenColor: new THREE.Color('#5e2a16'),
        reflectivity: 0.65,
      }),
    [glazeTex]
  );

  // Smooth chocolate ganache rim roll along top outer edge
  const ganacheRimMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#2a1107',
        roughness: 0.14,
        metalness: 0.04,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
      }),
    []
  );

  // Bisector angle for smooth radial slide of slice forward-right
  const bisectorAngle = (cutAngleStart + cutAngleEnd) / 2;
  const slideDirX = Math.cos(bisectorAngle);
  const slideDirZ = Math.sin(bisectorAngle);

  useFrame((_state, delta) => {
    // 1. Cake remains completely stationary and stable in its intended orientation
    if (cakeGroupRef.current) {
      cakeGroupRef.current.rotation.y = 0.12;
    }

    // 2. Smooth physical slice separation during cutting and celebration
    if (sliceGroupRef.current) {
      const targetDist = isCut
        ? 0.32
        : stage === 'cutting' && dragProgress > 35
        ? (dragProgress / 100) * 0.20
        : 0;

      const targetX = targetDist * slideDirX;
      const targetZ = targetDist * slideDirZ;
      sliceGroupRef.current.position.x +=
        (targetX - sliceGroupRef.current.position.x) * (delta * 4.5);
      sliceGroupRef.current.position.z +=
        (targetZ - sliceGroupRef.current.position.z) * (delta * 4.5);
      sliceGroupRef.current.rotation.y +=
        ((isCut ? 0.02 : 0) - sliceGroupRef.current.rotation.y) * (delta * 4.5);
    }
  });

  // 8 Artfully positioned cream rosettes around top rim (7 on main body, 1 on slice)
  const rosettePositions = useMemo(() => {
    const list: {
      pos: [number, number, number];
      scale: number;
      rotY: number;
      inSlice: boolean;
    }[] = [];
    const count = 8;
    const radius = 0.94;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.15;
      const inSlice = angle >= cutAngleStart - 0.02 && angle <= cutAngleEnd + 0.02;
      const scaleVar = 0.96 + pseudoRandom(i * 7) * 0.08;
      const rotY = pseudoRandom(i * 11) * Math.PI * 2;
      list.push({
        pos: [Math.cos(angle) * radius, cakeHeight + 0.004, Math.sin(angle) * radius],
        scale: scaleVar,
        rotY,
        inSlice,
      });
    }
    return list;
  }, [cutAngleStart, cutAngleEnd, cakeHeight]);

  // Delicate edible gold leaf flecks on dark glaze
  const goldLeafPositions = useMemo(() => {
    const list: {
      pos: [number, number, number];
      rot: [number, number, number];
      scale: number;
    }[] = [];
    const count = 12;
    const radius = 0.68;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.35;
      // Keep clear of candle center area
      if (Math.abs(Math.sin(angle) * radius) < 0.22 && Math.abs(Math.cos(angle) * radius) < 0.45) continue;
      list.push({
        pos: [Math.cos(angle) * radius, cakeHeight + 0.007, Math.sin(angle) * radius],
        rot: [-Math.PI / 2 + 0.05, 0, pseudoRandom(i * 5) * Math.PI * 2],
        scale: 0.85 + pseudoRandom(i * 9) * 0.35,
      });
    }
    return list;
  }, [cakeHeight]);

  return (
    <group ref={cakeGroupRef}>
      {/* =======================================================
          1. Floor Contact Shadow on Marble Table (y = -0.819)
          ======================================================= */}
      <mesh position={[0, -0.819, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial
          map={shadowTex || undefined}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* =======================================================
          2. Neoclassical Gold Cake Stand & Platter (Base sits at y = -0.82)
             Proportionate base radius 0.68, slender stem, modest beaded rim
          ======================================================= */}
      <group position={[0, -0.82, 0]}>
        {/* Tiered Pedestal Base */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.62, 0.68, 0.04, 36]} />
          <meshStandardMaterial color="#d4b47c" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.54, 0.62, 0.04, 36]} />
          <meshStandardMaterial color="#cfa968" metalness={0.84} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.54, 0.016, 12, 36]} />
          <meshStandardMaterial color="#d4b47c" metalness={0.82} roughness={0.28} />
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

        {/* Polished Gold Platter (Top surface sits at y = 0.40, world y = -0.42) */}
        {/* Modest visible gold platter rim: radius 1.25 for 1.15 cake */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[1.25, 1.18, 0.04, 48]} />
          <meshStandardMaterial color="#d4b47c" roughness={0.26} metalness={0.82} />
        </mesh>
        {/* Refined Beveled Platter Rim */}
        <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.25, 0.020, 16, 48]} />
          <meshStandardMaterial color="#cfa968" metalness={0.84} roughness={0.24} />
        </mesh>

        {/* Beaded Gold Trim Ring */}
        <PlatterBeadedRim />
      </group>

      {/* =======================================================
          3. Cake Platter Contact Shadow (y = -0.419)
          ======================================================= */}
      <mesh position={[0, -0.419, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.34, 2.34]} />
        <meshBasicMaterial
          map={shadowTex || undefined}
          transparent
          opacity={0.48}
          depthWrite={false}
        />
      </mesh>

      {/* =======================================================
          4. Main Cake Body (Solid, Distinct Aligned Layers 317° Sector)
             Sits directly on platter: y = -0.42 to +0.48
          ======================================================= */}
      <group position={[0, -0.42, 0]}>
        {/* Layer 1: Bottom Chocolate Sponge (y: 0 -> 0.22) */}
        <mesh geometry={mainL1Geom} material={spongeMat} position={[0, 0, 0]} />

        {/* Layer 2: Lower Ivory Cream Band (y: 0.22 -> 0.295) */}
        <mesh geometry={mainL2Geom} material={creamMat} position={[0, l1H, 0]} />

        {/* Layer 3: Middle Chocolate Sponge (y: 0.295 -> 0.515) */}
        <mesh geometry={mainL3Geom} material={spongeMat} position={[0, l1H + l2H, 0]} />

        {/* Layer 4: Upper Ivory Cream Band (y: 0.515 -> 0.59) */}
        <mesh geometry={mainL4Geom} material={creamMat} position={[0, l1H + l2H + l3H, 0]} />

        {/* Layer 5: Top Chocolate Sponge (y: 0.59 -> 0.81) */}
        <mesh geometry={mainL5Geom} material={spongeMat} position={[0, l1H + l2H + l3H + l4H, 0]} />

        {/* Layer 6: Deep Chocolate Mirror Glaze Crown (y: 0.81 -> 0.90) */}
        <mesh
          geometry={mainL6Geom}
          material={mirrorGlazeMat}
          position={[0, l1H + l2H + l3H + l4H + l5H, 0]}
        />

        {/* Smooth Ganache Rim Roll along main body top edge */}
        <mesh
          position={[0, cakeHeight - 0.008, 0]}
          rotation={[-Math.PI / 2, 0, cutAngleEnd]}
        >
          <torusGeometry args={[rGlaze - 0.010, 0.022, 14, 48, Math.PI * 2 - (cutAngleEnd - cutAngleStart)]} />
          <primitive object={ganacheRimMat} attach="material" />
        </mesh>

        {/* Piped Cream Rosettes on main body rim */}
        {rosettePositions
          .filter((r) => !r.inSlice)
          .map((r, idx) => (
            <ArtisanalCreamRosette
              key={`body-rosette-${idx}`}
              position={r.pos}
              scale={r.scale}
              rotationY={r.rotY}
            />
          ))}

        {/* Delicate Edible Gold Leaf Flecks */}
        {goldLeafPositions.map((flake, idx) => (
          <GoldLeafFlake
            key={`gold-flake-${idx}`}
            position={flake.pos}
            rotation={flake.rot}
            scale={flake.scale}
          />
        ))}
      </group>

      {/* =======================================================
          5. Separable Cake Wedge (Solid Distinct Aligned Layers 43° Slice)
             Sits directly on platter: y = -0.42 to +0.48
          ======================================================= */}
      <group ref={sliceGroupRef} position={[0, -0.42, 0]}>
        {/* Layer 1: Bottom Chocolate Sponge */}
        <mesh geometry={sliceL1Geom} material={spongeMat} position={[0, 0, 0]} />

        {/* Layer 2: Lower Ivory Cream Band */}
        <mesh geometry={sliceL2Geom} material={creamMat} position={[0, l1H, 0]} />

        {/* Layer 3: Middle Chocolate Sponge */}
        <mesh geometry={sliceL3Geom} material={spongeMat} position={[0, l1H + l2H, 0]} />

        {/* Layer 4: Upper Ivory Cream Band */}
        <mesh geometry={sliceL4Geom} material={creamMat} position={[0, l1H + l2H + l3H, 0]} />

        {/* Layer 5: Top Chocolate Sponge */}
        <mesh geometry={sliceL5Geom} material={spongeMat} position={[0, l1H + l2H + l3H + l4H, 0]} />

        {/* Layer 6: Deep Chocolate Mirror Glaze Crown */}
        <mesh
          geometry={sliceL6Geom}
          material={mirrorGlazeMat}
          position={[0, l1H + l2H + l3H + l4H + l5H, 0]}
        />

        {/* Smooth Ganache Rim Roll on slice top edge */}
        <mesh
          position={[0, cakeHeight - 0.008, 0]}
          rotation={[-Math.PI / 2, 0, cutAngleStart]}
        >
          <torusGeometry args={[rGlaze - 0.010, 0.022, 14, 16, cutAngleEnd - cutAngleStart]} />
          <primitive object={ganacheRimMat} attach="material" />
        </mesh>

        {/* Piped Cream Rosette on slice rim */}
        {rosettePositions
          .filter((r) => r.inSlice)
          .map((r, idx) => (
            <ArtisanalCreamRosette
              key={`slice-rosette-${idx}`}
              position={r.pos}
              scale={r.scale}
              rotationY={r.rotY}
            />
          ))}
      </group>

      {/* =======================================================
          6. Two Sculpted Number Candles: '2' and '2' in Center
             Rest cleanly on top surface at y = -0.42 + 0.90 = +0.48
          ======================================================= */}
      <group position={[0, 0.48, 0]}>
        {/* Left Candle ('2') */}
        <SculptedNumberCandle
          digit={2}
          position={[-0.22, 0, 0.08]}
          isLit={candle1Lit}
          isBlownOut={isBlownOut}
          onLight={() => onLightCandle(0)}
          reducedMotion={false}
        />

        {/* Right Candle ('2') */}
        <SculptedNumberCandle
          digit={2}
          position={[0.22, 0, 0.08]}
          isLit={candle2Lit}
          isBlownOut={isBlownOut}
          onLight={() => onLightCandle(1)}
          reducedMotion={false}
        />
      </group>

      {/* =======================================================
          7. Recognizable Metallic Cake Knife & Luminous Guide
          ======================================================= */}
      <CuttingGuide3D progress={dragProgress} isCut={isCut} stage={stage} />
      <OrnateGoldenKnife progress={dragProgress} isCut={isCut} stage={stage} />
    </group>
  );
};
