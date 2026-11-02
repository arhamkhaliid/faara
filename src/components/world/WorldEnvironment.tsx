import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FloatingPetals } from './FloatingPetals';

interface WorldEnvironmentProps {
  reducedMotion?: boolean;
}

/**
 * Creates an architectural raised ivory-marble planter wall along a 2D guide curve.
 * Features a solid projecting base plinth, recessed paneled wall die, and prominent
 * beveled coping top rail with believable classical construction.
 * Wall top coping: Y = 0.44m. Recessed planter soil: Y = 0.28m.
 */
function createArchitecturalPlanterWall(
  points: Array<{ x: number; z: number }>,
  isLeft = true
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const n = points.length;
  const normals2D: Array<{ x: number; z: number }> = [];
  const outwardSign = isLeft ? -1 : 1;

  for (let i = 0; i < n; i++) {
    const pPrev = points[Math.max(0, i - 1)];
    const pNext = points[Math.min(n - 1, i + 1)];
    const dx = pNext.x - pPrev.x;
    const dz = pNext.z - pPrev.z;
    const len = Math.hypot(dx, dz) || 1;
    normals2D.push({ x: outwardSign * (-dz / len), z: outwardSign * (dx / len) });
  }

  // Classical architectural profile:
  // 0: Walkway floor contact (off: -0.06, y: 0.00) - projecting base plinth foot
  // 1: Base plinth top step (off: -0.06, y: 0.10)
  // 2: Wall die face (off: 0.00, y: 0.10) - recessed wall panel
  // 3: Wall die top (off: 0.00, y: 0.36)
  // 4: Coping top rail inner bevel (off: -0.07, y: 0.44) - sculpted overhang
  // 5: Coping top rail flat ledge (off: 0.24, y: 0.44) - wide polished stone top
  // 6: Back wall down to soil (off: 0.24, y: 0.28) - recessed soil contact
  const profile = [
    { off: -0.06, y: 0.00 },
    { off: -0.06, y: 0.10 },
    { off: 0.00, y: 0.10 },
    { off: 0.00, y: 0.36 },
    { off: -0.07, y: 0.44 },
    { off: 0.24, y: 0.44 },
    { off: 0.24, y: 0.28 },
  ];

  let dist = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const norm = normals2D[i];
    if (i > 0) {
      dist += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    }
    const u = dist * 1.5;

    for (let j = 0; j < profile.length; j++) {
      const pr = profile[j];
      const vx = p.x + norm.x * pr.off;
      const vz = p.z + norm.z * pr.off;
      vertices.push(vx, pr.y, vz);
      uvs.push(u, pr.y * 2.5);
    }
  }

  const P = profile.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < P - 1; j++) {
      const r1 = i * P + j;
      const r2 = (i + 1) * P + j;
      if (isLeft) {
        indices.push(r1, r2, r1 + 1);
        indices.push(r2, r2 + 1, r1 + 1);
      } else {
        indices.push(r1, r1 + 1, r2);
        indices.push(r2, r1 + 1, r2 + 1);
      }
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Procedural raised planting bed soil base behind the marble wall.
 */
function createBedRibbon(
  points: Array<{ x: number; z: number }>,
  width = 3.5,
  isLeft = true
): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p = points[i];
    const t = i / (n - 1);
    const xOuter = isLeft ? p.x - width : p.x + width;

    // Inner edge along back of marble wall (at elevated soil height Y=0.28m)
    vertices.push(p.x, 0.28, p.z);
    uvs.push(0, t * 8);

    // Outer edge
    vertices.push(xOuter, 0.28, p.z);
    uvs.push(1, t * 8);
  }

  for (let i = 0; i < n - 1; i++) {
    const r1 = i * 2;
    const r2 = (i + 1) * 2;

    if (isLeft) {
      indices.push(r1, r2, r1 + 1);
      indices.push(r2, r2 + 1, r1 + 1);
    } else {
      indices.push(r1, r1 + 1, r2);
      indices.push(r2, r1 + 1, r2 + 1);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Classical carved marble pier/pedestal with an ornamental urn overflowing with roses.
 */
interface PedestalUrnProps {
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  urnTexture: THREE.Texture;
  marbleTexture: THREE.Texture;
}

const PedestalUrn: React.FC<PedestalUrnProps> = ({
  position,
  scale = 1.0,
  rotationY = 0,
  urnTexture,
  marbleTexture,
}) => {
  const s = scale;
  return (
    <group position={position}>
      {/* 1. Base Plinth Foot */}
      <mesh position={[0, 0.06 * s, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.48 * s, 0.12 * s, 0.48 * s]} />
        <meshStandardMaterial
          map={marbleTexture}
          color="#f6f2ec"
          roughness={0.22}
          metalness={0.03}
        />
      </mesh>

      {/* 2. Column Die / Shaft */}
      <mesh position={[0, 0.26 * s, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.38 * s, 0.28 * s, 0.38 * s]} />
        <meshStandardMaterial
          map={marbleTexture}
          color="#fcf8f2"
          roughness={0.20}
          metalness={0.03}
        />
      </mesh>

      {/* 3. Molded Capstone */}
      <mesh position={[0, 0.44 * s, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.50 * s, 0.08 * s, 0.50 * s]} />
        <meshStandardMaterial
          map={marbleTexture}
          color="#f6f2ec"
          roughness={0.22}
          metalness={0.03}
        />
      </mesh>

      {/* 4. Carved Marble Urn Overflowing with Roses */}
      <mesh
        position={[0, 0.48 * s + 0.44 * s, 0]}
        rotation={[0, rotationY, 0]}
        castShadow
      >
        <planeGeometry args={[0.92 * s, 0.92 * s]} />
        <meshStandardMaterial
          map={urnTexture}
          transparent
          alphaTest={0.08}
          roughness={0.38}
        />
      </mesh>
    </group>
  );
};

/**
 * Classical fastigiate Italian Cypress tree with authentic organic foliage silhouette,
 * multi-planar volumetric 3D volume, and sunset golden-hour rim illumination.
 */
interface RealisticCypressTreeProps {
  position: [number, number, number];
  height?: number;
  rotationY?: number;
  leanX?: number;
  leanZ?: number;
  cypressTexture: THREE.Texture;
}

const RealisticCypressTree: React.FC<RealisticCypressTreeProps> = ({
  position,
  height = 3.2,
  rotationY = 0,
  leanX = 0,
  leanZ = 0,
  cypressTexture,
}) => {
  const width = height * 0.28;
  return (
    <group position={position} rotation={[leanX, rotationY, leanZ]}>
      {/* Plane 1: Primary orientation */}
      <mesh position={[0, height * 0.50, 0]} castShadow receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={cypressTexture}
          transparent
          alphaTest={0.08}
          roughness={0.65}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Plane 2: Orthogonal cross-plane for 3D depth */}
      <mesh position={[0, height * 0.50, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[width * 0.96, height * 0.99]} />
        <meshStandardMaterial
          map={cypressTexture}
          transparent
          alphaTest={0.08}
          roughness={0.65}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Plane 3: 45-degree diagonal plane for full volume */}
      <mesh position={[0, height * 0.50, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <planeGeometry args={[width * 0.92, height * 0.98]} />
        <meshStandardMaterial
          map={cypressTexture}
          transparent
          alphaTest={0.08}
          roughness={0.68}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

/**
 * Volumetric ornamental palace garden shrub / laurel topiary with delicate blush/cream flower buds.
 */
interface GardenShrubProps {
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
  shrubTexture: THREE.Texture;
}

const GardenShrub: React.FC<GardenShrubProps> = ({
  position,
  scale = 1.0,
  rotationY = 0,
  shrubTexture,
}) => {
  const w = 1.45 * scale;
  const h = 1.00 * scale;
  return (
    <group position={position}>
      {/* Primary shrub bush facing */}
      <mesh position={[0, h * 0.48, 0]} rotation={[0, rotationY, 0]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={shrubTexture}
          transparent
          alphaTest={0.08}
          roughness={0.62}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Angled backing cluster for 3D volume */}
      <mesh
        position={[-0.06 * scale, h * 0.50, -0.06 * scale]}
        rotation={[0, rotationY + 1.15, 0]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[w * 0.94, h * 0.96]} />
        <meshStandardMaterial
          map={shrubTexture}
          transparent
          alphaTest={0.08}
          roughness={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

/**
 * Generates an optical bloom glow texture for the hanging brass lanterns.
 * Softened to keep lanterns luminous without washing out central typography.
 */
function createLanternHaloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 250, 230, 0.85)');     // Warm white-gold core
    gradient.addColorStop(0.20, 'rgba(255, 195, 75, 0.60)');  // Golden amber glow
    gradient.addColorStop(0.48, 'rgba(255, 140, 40, 0.20)');  // Champagne warmth
    gradient.addColorStop(0.78, 'rgba(255, 95, 25, 0.04)');   // Soft falloff
    gradient.addColorStop(1.0, 'rgba(255, 80, 20, 0.0)');     // Transparent perimeter
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural dynamic cascading water texture with translucent streaming rivulets
 * and specular highlights that animate downward between fountain tiers.
 */
function createWaterCascadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    // Subtle translucent flowing base
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(230, 250, 255, 0.82)');
    grad.addColorStop(0.35, 'rgba(190, 238, 248, 0.58)');
    grad.addColorStop(0.70, 'rgba(175, 232, 246, 0.62)');
    grad.addColorStop(1.0, 'rgba(235, 252, 255, 0.88)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Vertical falling water rivulets with natural variations
    for (let x = 0; x < 256; x += 4) {
      const alpha = 0.16 + Math.sin(x * 0.22) * 0.12 + Math.cos(x * 0.55) * 0.08;
      const w = 2 + (x % 3);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, 0, w, 256);
    }

    // Glistening water droplets and specular highlight strands
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    for (let i = 0; i < 80; i++) {
      const rx = (i * 47) % 256;
      const ry = (i * 73) % 256;
      const rlen = 4 + (i % 7);
      ctx.fillRect(rx, ry, 1.5, rlen);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural concentric ripple & caustic reflection texture for the fountain water pools.
 */
function createWaterRippleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    // Rich aquatic turquoise base
    ctx.fillStyle = 'rgba(84, 182, 198, 0.88)';
    ctx.fillRect(0, 0, 256, 256);

    const cx = 128;
    const cy = 128;

    // Concentric ripple rings
    for (let r = 8; r < 128; r += 10) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 2.2;
      const alpha = 0.20 + Math.sin(r * 0.3) * 0.14;
      ctx.strokeStyle = `rgba(235, 252, 255, ${alpha})`;
      ctx.stroke();
    }

    // Radial caustic refraction rays
    ctx.lineWidth = 1.4;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const r = 115 + Math.sin(a * 4) * 10;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Elegant arching botanical spray of blue Phalaenopsis orchids with stems, buds,
 * and delicate periwinkle petals nestled naturally within the pink rose beds.
 */
interface BlueOrchidSprayProps {
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  isAlt?: boolean;
  orchidTexture: THREE.Texture;
  orchidAltTexture: THREE.Texture;
}

const BlueOrchidSpray: React.FC<BlueOrchidSprayProps> = ({
  position,
  scale = 1.0,
  rotation = [0, 0, 0],
  isAlt = false,
  orchidTexture,
  orchidAltTexture,
}) => {
  const width = 0.52 * scale;
  const height = 0.69 * scale;
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={isAlt ? orchidAltTexture : orchidTexture}
        transparent
        alphaTest={0.08}
        roughness={0.40}
        metalness={0.02}
        emissive="#152448"
        emissiveIntensity={0.32}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Grand Classical 3-Tier Marble Fountain — The Starlight Dream Garden's focal terminus.
 *
 * Architecture (bottom to top):
 *   Tier 0 — Wide octagonal stone terrace apron grounding the fountain to the walkway
 *   Tier 1 — Broad stepped circular ivory marble dais (3 concentric steps)
 *   Tier 2 — Grand lower catch basin with sculpted torus coping, champagne-gold fillet,
 *            dark stone bed, and reflective water surface with animated concentric ripples
 *   Tier 3 — Central fluted baluster pedestal with filigree collar & bracket capital
 *   Tier 4 — Upper scalloped shell bowl with gold-trimmed rim & water disc
 *   Tier 5 — 4 graceful curved water streams (TubeGeometry) arcing from upper bowl
 *            down into the lower basin, animated with UV scroll
 *   Tier 6 — Carved acanthus finial spire with champagne-gold nozzle
 *   Tier 7 — Crystalline vertical spray plume with arching droplet crest
 *   Roses & orchids planted around the outer dais perimeter
 *   Soft twilight accent light for specular highlights
 */
interface DistantMarbleFountainProps {
  position?: [number, number, number];
  scale?: number;
  marbleTexture: THREE.Texture;
  roseTexture: THREE.Texture;
  orchidTexture: THREE.Texture;
  orchidAltTexture: THREE.Texture;
  cascadeTexture?: THREE.Texture | null;
  waterRippleTexture?: THREE.Texture | null;
  waterRef?: React.RefObject<THREE.Mesh | null>;
  cascadeRef?: React.RefObject<THREE.Mesh | null>;
  plumeRef?: React.RefObject<THREE.Group | null>;
}

/**
 * Creates a curved TubeGeometry water stream arcing from the upper bowl rim
 * down to the lower basin, simulating a graceful parabolic water ribbon.
 */
function createWaterStreamGeometry(
  startAngle: number,
  upperRadius: number,
  lowerRadius: number,
  upperY: number,
  lowerY: number
): THREE.TubeGeometry {
  const sx = Math.cos(startAngle) * upperRadius;
  const sz = Math.sin(startAngle) * upperRadius;
  const ex = Math.cos(startAngle) * lowerRadius;
  const ez = Math.sin(startAngle) * lowerRadius;
  const midY = upperY + (lowerY - upperY) * 0.35;
  const midR = (upperRadius + lowerRadius) * 0.54;
  const mx = Math.cos(startAngle) * midR;
  const mz = Math.sin(startAngle) * midR;

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(sx, upperY, sz),
    new THREE.Vector3(mx, midY, mz),
    new THREE.Vector3(ex, lowerY, ez)
  );
  return new THREE.TubeGeometry(curve, 18, 0.026, 8, false);
}

const DistantMarbleFountain: React.FC<DistantMarbleFountainProps> = ({
  position = [0, 0, -8.6],
  scale = 0.84,
  marbleTexture,
  roseTexture,
  orchidTexture,
  orchidAltTexture,
  cascadeTexture,
  waterRippleTexture,
  waterRef,
  cascadeRef,
  plumeRef,
}) => {
  // Pre-compute 6 curved water stream geometries arcing from upper bowl into lower basin
  const streamGeometries = useMemo(() => {
    const streams: THREE.TubeGeometry[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.PI / count;
      streams.push(createWaterStreamGeometry(angle, 0.68, 1.02, 1.12, 0.45));
    }
    return streams;
  }, []);

  return (
    <group position={position} scale={scale} name="grand-marble-fountain">
      {/* ── Tier 0: Stone Terrace Apron ──
          Wide octagonal ground plane connecting fountain to the walkway */}
      <mesh position={[0, 0.004, 0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.4, 8]} />
        <meshStandardMaterial
          map={marbleTexture}
          color="#ece5d8"
          roughness={0.38}
          metalness={0.02}
        />
      </mesh>
      {/* Grounding shadow disc */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.2, 36]} />
        <meshBasicMaterial color="#1a1410" transparent opacity={0.38} depthWrite={false} />
      </mesh>

      {/* ── Tier 1: Stepped 3-Tier Circular Ivory Marble Dais ── */}
      {/* Bottom step — widest */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[1.88, 1.96, 0.08, 36]} />
        <meshStandardMaterial
          map={marbleTexture} color="#ede6db" roughness={0.32} metalness={0.02}
        />
      </mesh>
      {/* Middle step */}
      <mesh position={[0, 0.10, 0]} receiveShadow>
        <cylinderGeometry args={[1.68, 1.74, 0.06, 36]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f4eee4" roughness={0.28} metalness={0.02}
        />
      </mesh>
      {/* Upper plinth step */}
      <mesh position={[0, 0.155, 0]} receiveShadow>
        <cylinderGeometry args={[1.48, 1.54, 0.05, 36]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f8f3ea" roughness={0.26} metalness={0.02}
        />
      </mesh>
      {/* Plinth edge moulding torus */}
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.48, 0.028, 16, 48]} />
        <meshStandardMaterial
          map={marbleTexture} color="#eee6da" roughness={0.28} metalness={0.02}
        />
      </mesh>

      {/* ── Tier 2: Grand Lower Catch Basin ── */}
      {/* Basin exterior wall — slightly flared classical profile */}
      <mesh position={[0, 0.34, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.34, 1.26, 0.32, 36]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f3ede3" roughness={0.26} metalness={0.02}
        />
      </mesh>
      {/* Base moulding ring */}
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.30, 0.042, 16, 48]} />
        <meshStandardMaterial
          map={marbleTexture} color="#ebe2d4" roughness={0.28} metalness={0.02}
        />
      </mesh>
      {/* Mid-wall moulding ring */}
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.020, 16, 48]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f4eee4" roughness={0.26} metalness={0.02}
        />
      </mesh>
      {/* Flared coping support ring */}
      <mesh position={[0, 0.48, 0]} receiveShadow>
        <cylinderGeometry args={[1.42, 1.34, 0.06, 36]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f8f4ec" roughness={0.22} metalness={0.02}
        />
      </mesh>
      {/* Projecting bullnose torus coping rim */}
      <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.40, 0.058, 16, 48]} />
        <meshStandardMaterial
          map={marbleTexture} color="#fdfbf7" roughness={0.18} metalness={0.03}
        />
      </mesh>
      {/* Champagne-gold fillet under coping */}
      <mesh position={[0, 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.36, 0.016, 16, 48]} />
        <meshStandardMaterial color="#cda659" metalness={0.72} roughness={0.28} />
      </mesh>
      {/* Basin interior dark floor (depth illusion) */}
      <mesh position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.28, 32]} />
        <meshStandardMaterial color="#0f2225" roughness={0.92} />
      </mesh>
      {/* Lower basin water surface with animated concentric ripples */}
      <mesh ref={waterRef} position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.34, 36]} />
        <meshStandardMaterial
          map={waterRippleTexture ?? undefined}
          color="#4fb8cc"
          roughness={0.04}
          metalness={0.28}
          transparent
          opacity={0.90}
        />
      </mesh>
      {/* Concentric impact ripple ring where streams land */}
      <mesh position={[0, 0.445, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.10, 36]} />
        <meshBasicMaterial color="#d4f6fc" transparent opacity={0.30} depthWrite={false} />
      </mesh>

      {/* ── Tier 3: Central Classical Fluted Baluster Pedestal ── */}
      {/* Base plinth block */}
      <mesh position={[0, 0.58, 0]} receiveShadow>
        <cylinderGeometry args={[0.40, 0.48, 0.18, 28]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f2ebe0" roughness={0.26} metalness={0.02}
        />
      </mesh>
      {/* Lower collar torus moulding */}
      <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.44, 0.022, 16, 32]} />
        <meshStandardMaterial
          map={marbleTexture} color="#eee6da" roughness={0.28} metalness={0.02}
        />
      </mesh>
      {/* Fluted column shaft body (entasis taper) */}
      <mesh position={[0, 0.82, 0]} receiveShadow>
        <cylinderGeometry args={[0.24, 0.32, 0.38, 24]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f6f0e6" roughness={0.24} metalness={0.02}
        />
      </mesh>
      {/* Champagne-gold filigree collar ring at shaft midpoint */}
      <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.30, 0.026, 16, 32]} />
        <meshStandardMaterial color="#cda659" metalness={0.75} roughness={0.26} />
      </mesh>
      {/* Flared bracket capital */}
      <mesh position={[0, 1.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.50, 0.26, 0.16, 28]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f2ebe0" roughness={0.26} metalness={0.02}
        />
      </mesh>
      {/* Capital moulding torus */}
      <mesh position={[0, 1.00, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.018, 16, 32]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f4eee4" roughness={0.26} metalness={0.02}
        />
      </mesh>

      {/* ── Tier 4: Upper Scalloped Shell Bowl ── */}
      {/* Under-bowl flared shell form */}
      <mesh position={[0, 1.17, 0]} receiveShadow>
        <cylinderGeometry args={[0.78, 0.44, 0.14, 36]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f2ebe0" roughness={0.24} metalness={0.02}
        />
      </mesh>
      {/* Torus coping rim */}
      <mesh position={[0, 1.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.048, 16, 44]} />
        <meshStandardMaterial
          map={marbleTexture} color="#fdfbf7" roughness={0.18} metalness={0.03}
        />
      </mesh>
      {/* Gold trim along upper bowl lip */}
      <mesh position={[0, 1.20, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.76, 0.016, 16, 44]} />
        <meshStandardMaterial color="#cda659" metalness={0.72} roughness={0.28} />
      </mesh>
      {/* Upper basin dark floor */}
      <mesh position={[0, 1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 32]} />
        <meshStandardMaterial color="#122628" roughness={0.90} />
      </mesh>
      {/* Upper basin water disc */}
      <mesh position={[0, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.74, 36]} />
        <meshStandardMaterial
          map={waterRippleTexture ?? undefined}
          color="#4fb8cc"
          roughness={0.04}
          metalness={0.28}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* ── Tier 5: Curved Water Streams (6 graceful arcs) & Translucent Cascading Water Veil ── */}
      {/* 6 Curved Parabolic Water Streams arcing from upper bowl rim into lower basin */}
      {streamGeometries.map((geom, i) => (
        <mesh key={`stream-${i}`} geometry={geom}>
          <meshStandardMaterial
            map={cascadeTexture ?? undefined}
            color="#eaf8fc"
            transparent
            opacity={0.68}
            roughness={0.03}
            metalness={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Primary Cascading Translucent Water Veil Curtain with flowing rivulets */}
      <mesh ref={cascadeRef} position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.70, 1.04, 0.76, 32, 1, true]} />
        <meshStandardMaterial
          map={cascadeTexture ?? undefined}
          color="#dcf4fa"
          transparent
          opacity={0.44}
          roughness={0.05}
          metalness={0.16}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Inner Soft Water Shimmer Cylinder for optical depth and refraction */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.62, 0.90, 0.72, 24, 1, true]} />
        <meshStandardMaterial
          color="#b4ecf7"
          transparent
          opacity={0.15}
          roughness={0.08}
          metalness={0.10}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Tier 6: Carved Acanthus Finial Spire ── */}
      {/* Spire pedestal */}
      <mesh position={[0, 1.40, 0]} receiveShadow>
        <cylinderGeometry args={[0.14, 0.22, 0.32, 20]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f6f0e6" roughness={0.26} metalness={0.02}
        />
      </mesh>
      {/* Carved acanthus finial boss (egg shape) */}
      <mesh position={[0, 1.60, 0]} scale={[1, 1.35, 1]} receiveShadow>
        <sphereGeometry args={[0.15, 20, 16]} />
        <meshStandardMaterial
          map={marbleTexture} color="#f6f0e6" roughness={0.24} metalness={0.02}
        />
      </mesh>
      {/* Champagne-gold nozzle cap */}
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.042, 0.055, 0.09, 16]} />
        <meshStandardMaterial color="#cda659" metalness={0.75} roughness={0.26} />
      </mesh>

      {/* ── Tier 7: Crystalline Vertical Spray Plume ── */}
      <group ref={plumeRef} position={[0, 1.88, 0]}>
        {/* Core vertical spray column */}
        <mesh>
          <cylinderGeometry args={[0.020, 0.055, 0.34, 16]} />
          <meshBasicMaterial
            color="#d8f6fc"
            transparent opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* Arching droplet dome crest */}
        <mesh position={[0, 0.14, 0]} scale={[1, 1.40, 1]}>
          <sphereGeometry args={[0.06, 16, 12]} />
          <meshBasicMaterial
            color="#eefcff"
            transparent opacity={0.46}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* Soft mist flare at nozzle base */}
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.040, 0.10, 0.14, 16]} />
          <meshBasicMaterial
            color="#d8f8ff"
            transparent opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ── Rose Plantings Around Outer Dais Perimeter ── */}
      {/* Front-left rose cluster (viewer-facing) */}
      <group position={[-1.48, 0.06, 1.08]}>
        <mesh position={[0, 0.30, 0]} rotation={[0, 0.25, 0]}>
          <planeGeometry args={[1.05, 0.78]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[-0.14, 0.34, -0.12]} rotation={[0, -0.35, 0]}>
          <planeGeometry args={[0.98, 0.74]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>
      </group>
      {/* Front-right rose cluster */}
      <group position={[1.48, 0.06, 1.08]}>
        <mesh position={[0, 0.30, 0]} rotation={[0, -0.25, 0]}>
          <planeGeometry args={[1.05, 0.78]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[0.14, 0.34, -0.12]} rotation={[0, 0.35, 0]}>
          <planeGeometry args={[0.98, 0.74]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>
      </group>
      {/* Rear-left rose accent */}
      <group position={[-1.68, 0.06, -0.52]}>
        <mesh position={[0, 0.28, 0]} rotation={[0, -0.40, 0]}>
          <planeGeometry args={[0.95, 0.70]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
      </group>
      {/* Rear-right rose accent */}
      <group position={[1.68, 0.06, -0.52]}>
        <mesh position={[0, 0.28, 0]} rotation={[0, 0.40, 0]}>
          <planeGeometry args={[0.95, 0.70]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
      </group>
      {/* Side-left rose accent filling gap */}
      <group position={[-1.82, 0.06, 0.28]}>
        <mesh position={[0, 0.26, 0]} rotation={[0, 0.55, 0]}>
          <planeGeometry args={[0.88, 0.68]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
      </group>
      {/* Side-right rose accent filling gap */}
      <group position={[1.82, 0.06, 0.28]}>
        <mesh position={[0, 0.26, 0]} rotation={[0, -0.55, 0]}>
          <planeGeometry args={[0.88, 0.68]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
      </group>

      {/* ── Blue Orchid Sprays Nestled at the Fountain Base ── */}
      <BlueOrchidSpray
        position={[-1.24, 0.16, 1.10]}
        scale={0.65}
        rotation={[0.05, 0.20, 0.04]}
        isAlt={false}
        orchidTexture={orchidTexture}
        orchidAltTexture={orchidAltTexture}
      />
      <BlueOrchidSpray
        position={[1.24, 0.16, 1.10]}
        scale={0.65}
        rotation={[0.05, -0.20, -0.04]}
        isAlt={true}
        orchidTexture={orchidTexture}
        orchidAltTexture={orchidAltTexture}
      />

      {/* ── Warm Twilight Accent Light (soft specular highlights on wet marble & water) ── */}
      <pointLight
        position={[0, 2.2, 0.5]}
        color="#ffe8cc"
        intensity={0.55}
        distance={5.0}
        decay={2}
      />
      {/* Subtle under-water glow for depth */}
      <pointLight
        position={[0, 0.30, 0]}
        color="#6ed8ef"
        intensity={0.25}
        distance={2.5}
        decay={2}
      />
    </group>
  );
};


export function WorldEnvironment({ reducedMotion = false }: WorldEnvironmentProps) {
  const waterRef = useRef<THREE.Mesh>(null);
  const cascadeRef = useRef<THREE.Mesh>(null);
  const plumeRef = useRef<THREE.Group>(null);
  const lanternGlow1Ref = useRef<THREE.PointLight>(null);
  const lanternGlow2Ref = useRef<THREE.PointLight>(null);
  const lanternHalo1Ref = useRef<THREE.Group>(null);
  const lanternHalo2Ref = useRef<THREE.Group>(null);
  const beaconGlowRef = useRef<THREE.PointLight>(null);

  // Optical bloom halo texture for brass lanterns
  const lanternHaloTexture = useMemo(() => {
    if (typeof document === 'undefined') return new THREE.Texture();
    return createLanternHaloTexture();
  }, []);

  // Fountain water textures initialized on mount
  const [fountainTextures] = useState(() => {
    if (typeof document === 'undefined') {
      return {
        cascadeTexture: new THREE.Texture(),
        waterRippleTexture: new THREE.Texture(),
      };
    }
    return {
      cascadeTexture: createWaterCascadeTexture(),
      waterRippleTexture: createWaterRippleTexture(),
    };
  });

  // Load high-fidelity curated assets with sRGB color space
  const {
    archTexture,
    roseTexture,
    orchidTexture,
    orchidAltTexture,
    urnTexture,
    vistaTexture,
    marbleTexture,
    cypressTexture,
    shrubTexture,
  } = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const loadTex = (url: string) => {
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
      const tex = loader.load(`${import.meta.env.BASE_URL}${cleanUrl}`);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const mTex = loadTex('/environment/polished_ivory_marble.webp');
    mTex.wrapS = THREE.RepeatWrapping;
    mTex.wrapT = THREE.RepeatWrapping;
    mTex.repeat.set(3, 4);

    return {
      archTexture: loadTex('/environment/foreground_arch.webp'),
      roseTexture: loadTex('/environment/rose_bush.webp'),
      orchidTexture: loadTex('/environment/blue_orchid.webp'),
      orchidAltTexture: loadTex('/environment/blue_orchid_alt.webp'),
      urnTexture: loadTex('/environment/marble_urn.webp'),
      vistaTexture: loadTex('/environment/pavilion_vista.webp'),
      marbleTexture: mTex,
      cypressTexture: loadTex('/environment/italian_cypress.webp'),
      shrubTexture: loadTex('/environment/garden_shrub.webp'),
    };
  }, []);

  // Generate sculpted architectural marble planter walls & raised bed bases
  const {
    wallLeftNear,
    wallRightNear,
    wallLeftMid,
    wallRightMid,
    bedLeftNear,
    bedRightNear,
    bedLeftMid,
    bedRightMid,
  } = useMemo(() => {
    // 1. Near Crescent Balustrade Planters (Z = 1.05 down to -2.25)
    // Curving gracefully: starts at X = ±1.02m, sweeps gently inward to X = ±0.88m,
    // then flares softly out to X = ±1.16m, framing the view in classical palace symmetry.
    const ptsLNear: Array<{ x: number; z: number }> = [];
    const ptsRNear: Array<{ x: number; z: number }> = [];
    const stepsNear = 20;
    for (let i = 0; i <= stepsNear; i++) {
      const t = i / stepsNear;
      const z = 1.05 - t * 3.30; // 1.05 down to -2.25
      const arcInward = Math.sin(t * Math.PI) * 0.14;
      const flareOut = Math.pow(t, 2.0) * 0.14;
      const x = 1.02 - arcInward + flareOut;
      ptsLNear.push({ x: -x, z });
      ptsRNear.push({ x, z });
    }

    // 2. Mid-Ground Promenade Planters (Z = -2.35 down to -7.20)
    const ptsLMid: Array<{ x: number; z: number }> = [];
    const ptsRMid: Array<{ x: number; z: number }> = [];
    const stepsMid = 20;
    for (let i = 0; i <= stepsMid; i++) {
      const t = i / stepsMid;
      const z = -2.35 - t * 4.85; // -2.35 down to -7.20
      const spread = Math.pow(t, 1.15) * 0.52;
      const x = 1.18 + spread;
      ptsLMid.push({ x: -x, z });
      ptsRMid.push({ x, z });
    }

    // Bed ribbons start behind the arch plinth (Z = 1.35) and extend 10.0m outward across garden terrace
    const ptsBedLNear: Array<{ x: number; z: number }> = [{ x: -1.02, z: 1.35 }, ...ptsLNear];
    const ptsBedRNear: Array<{ x: number; z: number }> = [{ x: 1.02, z: 1.35 }, ...ptsRNear];

    return {
      wallLeftNear: createArchitecturalPlanterWall(ptsLNear, true),
      wallRightNear: createArchitecturalPlanterWall(ptsRNear, false),
      wallLeftMid: createArchitecturalPlanterWall(ptsLMid, true),
      wallRightMid: createArchitecturalPlanterWall(ptsRMid, false),
      bedLeftNear: createBedRibbon(ptsBedLNear, 10.0, true),
      bedRightNear: createBedRibbon(ptsBedRNear, 10.0, false),
      bedLeftMid: createBedRibbon(ptsLMid, 10.0, true),
      bedRightMid: createBedRibbon(ptsRMid, 10.0, false),
    };
  }, []);

  // Ambient environmental lighting motions
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.getElapsedTime();

    // Cascading water veil flowing rivulets animation & specular shimmer
    if (cascadeRef.current) {
      const mat = cascadeRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.opacity = 0.44 + Math.sin(t * 3.2) * 0.05;
        if (mat.map) {
          mat.map.offset.y -= 0.012;
        }
      }
    }

    // Dynamic water specular shimmer & ripple rotation on lower basin
    if (waterRef.current) {
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.roughness = 0.04 + Math.sin(t * 1.8) * 0.014;
        if (mat.map) {
          mat.map.rotation += 0.0025;
        }
      }
    }
    if (plumeRef.current) {
      const pScale = 1.0 + Math.sin(t * 4.2) * 0.05;
      plumeRef.current.scale.set(pScale, 1.0 + Math.cos(t * 3.4) * 0.06, pScale);
    }

    // Calibrated natural candle flicker on foreground brass lanterns (softened to prevent text washout)
    const flick1 = Math.sin(t * 5.2) * 0.35 + Math.cos(t * 8.7) * 0.18;
    const flick2 = Math.cos(t * 4.9) * 0.35 + Math.sin(t * 7.4) * 0.18;

    if (lanternGlow1Ref.current) {
      lanternGlow1Ref.current.intensity = 1.45 + flick1 * 0.18;
    }
    if (lanternGlow2Ref.current) {
      lanternGlow2Ref.current.intensity = 1.45 + flick2 * 0.18;
    }
    if (lanternHalo1Ref.current) {
      const s = 1.0 + flick1 * 0.03;
      lanternHalo1Ref.current.scale.set(s, s, 1);
    }
    if (lanternHalo2Ref.current) {
      const s = 1.0 + flick2 * 0.03;
      lanternHalo2Ref.current.scale.set(s, s, 1);
    }

    // Distant pavilion cake beacon gentle pulse
    if (beaconGlowRef.current) {
      beaconGlowRef.current.intensity = 2.4 + Math.sin(t * 1.8) * 0.6;
    }
  });

  return (
    <group name="starlight-dream-garden">
      {/* ========================================================
          1. Distant Domed Birthday Pavilion & Sunset Vista (Z = -14.0)
          Neoclassical rotunda with golden filigree dome, stepped marble terrace,
          cascading waterfall, and weeping cherry trees
          ======================================================== */}
      <mesh position={[0, 2.1, -14.0]} renderOrder={-10}>
        <planeGeometry args={[28, 15.6]} />
        <meshBasicMaterial map={vistaTexture} depthWrite={false} fog={false} />
      </mesh>

      {/* Warm Golden Glow Beacon inside the Distant Pavilion Rotunda */}
      <pointLight
        ref={beaconGlowRef}
        position={[3.2, 3.4, -13.5]}
        color="#ffe28a"
        intensity={2.4}
        distance={12}
        decay={2}
      />

      {/* ========================================================
          2. Continuous Polished Ivory Marble Terrace Floor
          One unbroken, seamless expanse of polished warm ivory Calacatta marble.
          Smooth, silky specular sheen that catches the ambient sunset and lantern glow.
          ======================================================== */}
      <mesh position={[0, -0.005, -1.0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 32]} />
        <meshStandardMaterial
          map={marbleTexture}
          color="#fffbf5"
          roughness={0.16}
          metalness={0.06}
        />
      </mesh>

      {/* Subtle Warm Sunset Specular Glow along the Central Walkway */}
      <pointLight
        position={[0, 1.8, 0.6]}
        color="#ffe2b8"
        intensity={1.6}
        distance={9}
        decay={2}
      />

      {/* ========================================================
          3. Architectural Raised Ivory-Marble Planters
          Solid base plinth, recessed die, and prominent beveled coping top rail (Y=0.44m).
          Clearly visible along the walkway edges, giving structured garden architecture.
          ======================================================== */}
      {/* Near Crescent Planter Walls */}
      <mesh geometry={wallLeftNear} receiveShadow castShadow>
        <meshStandardMaterial
          map={marbleTexture}
          color="#faf6f0"
          roughness={0.20}
          metalness={0.03}
        />
      </mesh>
      <mesh geometry={wallRightNear} receiveShadow castShadow>
        <meshStandardMaterial
          map={marbleTexture}
          color="#faf6f0"
          roughness={0.20}
          metalness={0.03}
        />
      </mesh>

      {/* Mid-Ground Promenade Planter Walls */}
      <mesh geometry={wallLeftMid} receiveShadow castShadow>
        <meshStandardMaterial
          map={marbleTexture}
          color="#faf6f0"
          roughness={0.20}
          metalness={0.03}
        />
      </mesh>
      <mesh geometry={wallRightMid} receiveShadow castShadow>
        <meshStandardMaterial
          map={marbleTexture}
          color="#faf6f0"
          roughness={0.20}
          metalness={0.03}
        />
      </mesh>

      {/* ========================================================
          4. Raised Planting Bed Soil Foundations
          Rich dark loam behind the marble walls at Y=0.28m, elevating the garden beds.
          ======================================================== */}
      <mesh geometry={bedLeftNear} receiveShadow>
        <meshStandardMaterial color="#2f382a" roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh geometry={bedRightNear} receiveShadow>
        <meshStandardMaterial color="#2f382a" roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh geometry={bedLeftMid} receiveShadow>
        <meshStandardMaterial color="#2f382a" roughness={0.92} metalness={0.02} />
      </mesh>
      <mesh geometry={bedRightMid} receiveShadow>
        <meshStandardMaterial color="#2f382a" roughness={0.92} metalness={0.02} />
      </mesh>

      {/* ========================================================
          5. Ornamental Classical Marble Urns on 3D Pedestals
          Framing the entrance threshold and transition points in classical rhythm.
          ======================================================== */}
      {/* Urn 1 — Foreground Left Entrance Terminal */}
      <PedestalUrn
        position={[-1.02, 0, 1.05]}
        scale={0.90}
        rotationY={0.20}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* Urn 2 — Foreground Right Entrance Terminal */}
      <PedestalUrn
        position={[1.02, 0, 1.05]}
        scale={0.90}
        rotationY={-0.20}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* Urn 3 — Mid-Terrace Left Terminal */}
      <PedestalUrn
        position={[-1.18, 0, -2.25]}
        scale={0.82}
        rotationY={0.25}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* Urn 4 — Mid-Terrace Right Terminal */}
      <PedestalUrn
        position={[1.18, 0, -2.25]}
        scale={0.82}
        rotationY={-0.25}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* Urn 5 — Mid-Promenade Left Accent */}
      <PedestalUrn
        position={[-1.48, 0, -5.00]}
        scale={0.70}
        rotationY={0.18}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* Urn 6 — Mid-Promenade Right Accent */}
      <PedestalUrn
        position={[1.48, 0, -5.00]}
        scale={0.70}
        rotationY={-0.18}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* Urn 7 — Promenade Terminus Left Accent (Framing Fountain Terrace) */}
      <PedestalUrn
        position={[-1.72, 0, -7.20]}
        scale={0.68}
        rotationY={0.22}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* Urn 8 — Promenade Terminus Right Accent (Framing Fountain Terrace) */}
      <PedestalUrn
        position={[1.72, 0, -7.20]}
        scale={0.68}
        rotationY={-0.22}
        urnTexture={urnTexture}
        marbleTexture={marbleTexture}
      />

      {/* ========================================================
          6. Realistic Italian Cypress Trees & Layered Garden Greenery
          Continuous, deeply layered landscape flanking both sides of the walkway:
          multi-planar evergreen cypress spires and ornamental blush laurel shrubs
          creating unbroken, cinematic botanical depth from foreground to distant vista.
          ======================================================== */}

      {/* ─── LEFT GARDEN TERRACE DEPTH (X <= -1.75m) ─── */}
      {/* 1. Entrance Framing Tier (Z = 0.8m to -0.6m) — Wraps corner behind arch column */}
      <GardenShrub
        position={[-1.80, 0.28, 0.50]}
        scale={1.05}
        rotationY={0.25}
        shrubTexture={shrubTexture}
      />
      <GardenShrub
        position={[-2.10, 0.28, 0.10]}
        scale={0.95}
        rotationY={-0.35}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[-2.30, 0.28, 0.40]}
        height={3.70}
        rotationY={0.35}
        leanX={0.01}
        leanZ={-0.02}
        cypressTexture={cypressTexture}
      />

      {/* 2. Mid-Crescent Garden Tier (Z = -0.8m to -2.7m) */}
      <GardenShrub
        position={[-1.75, 0.28, -1.10]}
        scale={1.00}
        rotationY={0.30}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[-1.70, 0.28, -1.65]}
        height={3.90}
        rotationY={0.28}
        leanX={0.01}
        leanZ={-0.02}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[-2.15, 0.28, -1.95]}
        scale={1.10}
        rotationY={-0.45}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[-2.05, 0.28, -2.45]}
        height={3.30}
        rotationY={-0.50}
        leanX={-0.02}
        leanZ={0.01}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[-2.45, 0.28, -2.60]}
        scale={1.00}
        rotationY={0.55}
        shrubTexture={shrubTexture}
      />

      {/* 3. Promenade Garden Tier (Z = -2.8m to -5.5m) */}
      <GardenShrub
        position={[-2.50, 0.28, -3.20]}
        scale={1.10}
        rotationY={0.20}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[-2.85, 0.28, -3.85]}
        height={3.65}
        rotationY={1.15}
        leanZ={-0.02}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[-2.75, 0.28, -4.40]}
        scale={1.05}
        rotationY={-0.35}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[-3.15, 0.28, -5.00]}
        height={3.40}
        rotationY={0.45}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[-2.95, 0.28, -5.50]}
        scale={1.12}
        rotationY={0.45}
        shrubTexture={shrubTexture}
      />

      {/* 4. Far Terrace Tier (Z = -5.8m to -7.6m) — Seamlessly connects to pavilion vista */}
      <RealisticCypressTree
        position={[-3.35, 0.28, -6.10]}
        height={3.10}
        rotationY={0.50}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[-3.15, 0.28, -6.50]}
        scale={1.15}
        rotationY={-0.40}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[-3.50, 0.28, -7.20]}
        height={2.75}
        rotationY={0.40}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[-3.25, 0.28, -7.50]}
        scale={1.05}
        rotationY={0.35}
        shrubTexture={shrubTexture}
      />

      {/* ─── RIGHT GARDEN TERRACE DEPTH (X >= 1.75m) ─── */}
      {/* 1. Entrance Framing Tier (Z = 0.8m to -0.6m) — Symmetrical wrap */}
      <GardenShrub
        position={[1.80, 0.28, 0.50]}
        scale={1.05}
        rotationY={-0.25}
        shrubTexture={shrubTexture}
      />
      <GardenShrub
        position={[2.10, 0.28, 0.10]}
        scale={0.95}
        rotationY={0.35}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[2.30, 0.28, 0.40]}
        height={3.70}
        rotationY={-0.35}
        leanX={-0.01}
        leanZ={0.02}
        cypressTexture={cypressTexture}
      />

      {/* 2. Mid-Crescent Garden Tier (Z = -0.8m to -2.7m) */}
      <GardenShrub
        position={[1.75, 0.28, -1.10]}
        scale={1.00}
        rotationY={-0.30}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[1.70, 0.28, -1.65]}
        height={3.85}
        rotationY={-0.28}
        leanX={-0.01}
        leanZ={0.01}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[2.15, 0.28, -1.95]}
        scale={1.10}
        rotationY={0.45}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[2.10, 0.28, -2.45]}
        height={3.35}
        rotationY={0.50}
        leanX={0.02}
        leanZ={-0.01}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[2.45, 0.28, -2.60]}
        scale={1.00}
        rotationY={-0.55}
        shrubTexture={shrubTexture}
      />

      {/* 3. Promenade Garden Tier (Z = -2.8m to -5.5m) */}
      <GardenShrub
        position={[2.50, 0.28, -3.20]}
        scale={1.10}
        rotationY={-0.20}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[2.80, 0.28, -3.85]}
        height={3.65}
        rotationY={-1.15}
        leanZ={0.02}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[2.75, 0.28, -4.40]}
        scale={1.05}
        rotationY={0.35}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[3.10, 0.28, -5.00]}
        height={3.40}
        rotationY={-0.45}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[2.95, 0.28, -5.50]}
        scale={1.12}
        rotationY={-0.45}
        shrubTexture={shrubTexture}
      />

      {/* 4. Far Terrace Tier (Z = -5.8m to -7.6m) */}
      <RealisticCypressTree
        position={[3.30, 0.28, -6.10]}
        height={3.15}
        rotationY={-0.50}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[3.15, 0.28, -6.50]}
        scale={1.15}
        rotationY={0.40}
        shrubTexture={shrubTexture}
      />
      <RealisticCypressTree
        position={[3.45, 0.28, -7.20]}
        height={2.80}
        rotationY={-0.40}
        cypressTexture={cypressTexture}
      />
      <GardenShrub
        position={[3.25, 0.28, -7.50]}
        scale={1.05}
        rotationY={-0.35}
        shrubTexture={shrubTexture}
      />

      {/* ========================================================
          7. Composed Planting Inside the Marble Beds
          Continuous, dense English pink roses, lush green foliage, and exactly
          6 subtle blue orchid Easter eggs nestled throughout the planting beds.
          ======================================================== */}

      {/* ─── SECTION A: FOREGROUND CRESCENT PLANTERS ─── */}
      {/* Left Foreground Cluster (Z = 0.40m) */}
      <group position={[-1.40, 0.28, 0.40]}>
        <mesh position={[0, 0.38, 0]} rotation={[0, 0.22, 0]}>
          <planeGeometry args={[1.30, 0.98]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.58} />
        </mesh>
        <mesh position={[-0.20, 0.44, -0.16]} rotation={[0, -0.32, 0]}>
          <planeGeometry args={[1.25, 1.00]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[0.12, 0.20, 0.12]} rotation={[0, 0.35, 0]}>
          <planeGeometry args={[1.05, 0.68]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>

        {/* ── Rare Blue Orchid Accent #1 ── */}
        <BlueOrchidSpray
          position={[0.16, 0.22, 0.12]}
          scale={0.78}
          rotation={[0.04, 0.18, 0.06]}
          isAlt={false}
          orchidTexture={orchidTexture}
          orchidAltTexture={orchidAltTexture}
        />
      </group>

      {/* Left Mid-Crescent Cluster (Z = -1.45m) */}
      <group position={[-1.48, 0.28, -1.45]}>
        <mesh position={[0, 0.42, 0]} rotation={[0, 0.18, 0]}>
          <planeGeometry args={[1.35, 1.04]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.58} />
        </mesh>
        <mesh position={[-0.20, 0.48, -0.16]} rotation={[0, -0.28, 0]}>
          <planeGeometry args={[1.28, 1.00]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[0.10, 0.22, 0.12]} rotation={[0, 0.32, 0]}>
          <planeGeometry args={[1.08, 0.70]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>

        {/* ── Rare Blue Orchid Accent #2 ── */}
        <BlueOrchidSpray
          position={[0.12, 0.22, 0.10]}
          scale={0.75}
          rotation={[0.04, 0.16, 0.06]}
          isAlt={false}
          orchidTexture={orchidTexture}
          orchidAltTexture={orchidAltTexture}
        />
      </group>

      {/* Right Foreground Cluster (Z = 0.40m) */}
      <group position={[1.40, 0.28, 0.40]}>
        <mesh position={[0, 0.38, 0]} rotation={[0, -0.22, 0]}>
          <planeGeometry args={[1.30, 0.98]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.58} />
        </mesh>
        <mesh position={[0.20, 0.44, -0.16]} rotation={[0, 0.32, 0]}>
          <planeGeometry args={[1.25, 1.00]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[-0.12, 0.20, 0.12]} rotation={[0, -0.35, 0]}>
          <planeGeometry args={[1.05, 0.68]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>

        {/* ── Rare Blue Orchid Accent #3 ── */}
        <BlueOrchidSpray
          position={[-0.16, 0.22, 0.12]}
          scale={0.78}
          rotation={[0.04, -0.18, -0.06]}
          isAlt={true}
          orchidTexture={orchidTexture}
          orchidAltTexture={orchidAltTexture}
        />
      </group>

      {/* Right Mid-Crescent Cluster (Z = -1.45m) */}
      <group position={[1.48, 0.28, -1.45]}>
        <mesh position={[0, 0.42, 0]} rotation={[0, -0.18, 0]}>
          <planeGeometry args={[1.35, 1.04]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.58} />
        </mesh>
        <mesh position={[0.20, 0.48, -0.16]} rotation={[0, 0.28, 0]}>
          <planeGeometry args={[1.28, 1.00]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[-0.10, 0.22, 0.12]} rotation={[0, -0.32, 0]}>
          <planeGeometry args={[1.08, 0.70]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>

        {/* ── Rare Blue Orchid Accent #4 ── */}
        <BlueOrchidSpray
          position={[-0.12, 0.22, 0.10]}
          scale={0.75}
          rotation={[0.04, -0.16, -0.06]}
          isAlt={true}
          orchidTexture={orchidTexture}
          orchidAltTexture={orchidAltTexture}
        />
      </group>

      {/* ─── SECTION B: PROMENADE TRANSITION CLUSTERS ─── */}
      {/* Left Transition Cluster (Z = -2.65m) — Bridging near-crescent to mid-ground */}
      <group position={[-1.68, 0.28, -2.65]}>
        <mesh position={[0, 0.42, 0]} rotation={[0, 0.20, 0]}>
          <planeGeometry args={[1.36, 1.05]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.58} />
        </mesh>
        <mesh position={[-0.18, 0.46, -0.16]} rotation={[0, -0.25, 0]}>
          <planeGeometry args={[1.30, 1.00]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[0.10, 0.22, 0.12]} rotation={[0, 0.30, 0]}>
          <planeGeometry args={[1.08, 0.68]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>
      </group>

      {/* Right Transition Cluster (Z = -2.65m) — Bridging near-crescent to mid-ground */}
      <group position={[1.68, 0.28, -2.65]}>
        <mesh position={[0, 0.42, 0]} rotation={[0, -0.20, 0]}>
          <planeGeometry args={[1.36, 1.05]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.58} />
        </mesh>
        <mesh position={[0.18, 0.46, -0.16]} rotation={[0, 0.25, 0]}>
          <planeGeometry args={[1.30, 1.00]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[-0.10, 0.22, 0.12]} rotation={[0, -0.30, 0]}>
          <planeGeometry args={[1.08, 0.68]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>
      </group>

      {/* ─── SECTION C: MID-GROUND PROMENADE PLANTERS ─── */}
      {/* Left Mid-Ground Cluster (Z = -3.85m) */}
      <group position={[-1.85, 0.28, -3.85]}>
        <mesh position={[0, 0.44, 0]} rotation={[0, 0.18, 0]}>
          <planeGeometry args={[1.42, 1.10]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.60} />
        </mesh>
        <mesh position={[-0.22, 0.50, -0.18]} rotation={[0, -0.28, 0]}>
          <planeGeometry args={[1.35, 1.05]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[0.10, 0.24, 0.14]} rotation={[0, 0.35, 0]}>
          <planeGeometry args={[1.14, 0.72]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>

        {/* ── Rare Blue Orchid Accent #5 ── */}
        <BlueOrchidSpray
          position={[0.14, 0.22, 0.10]}
          scale={0.72}
          rotation={[0.02, 0.12, 0.04]}
          isAlt={false}
          orchidTexture={orchidTexture}
          orchidAltTexture={orchidAltTexture}
        />
      </group>

      {/* Right Mid-Ground Cluster (Z = -3.85m) */}
      <group position={[1.85, 0.28, -3.85]}>
        <mesh position={[0, 0.44, 0]} rotation={[0, -0.18, 0]}>
          <planeGeometry args={[1.42, 1.10]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.60} />
        </mesh>
        <mesh position={[0.22, 0.50, -0.18]} rotation={[0, 0.28, 0]}>
          <planeGeometry args={[1.35, 1.05]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[-0.10, 0.24, 0.14]} rotation={[0, -0.35, 0]}>
          <planeGeometry args={[1.14, 0.72]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>

        {/* ── Rare Blue Orchid Accent #6 (Completes the 6 Easter Eggs in flowerbeds) ── */}
        <BlueOrchidSpray
          position={[-0.14, 0.22, 0.10]}
          scale={0.72}
          rotation={[0.02, -0.12, -0.04]}
          isAlt={true}
          orchidTexture={orchidTexture}
          orchidAltTexture={orchidAltTexture}
        />
      </group>

      {/* ─── SECTION D: FAR PROMENADE & DISTANT FLOWERING BEDS ─── */}
      {/* Left Far Promenade Cluster (Z = -5.20m) */}
      <group position={[-2.05, 0.28, -5.20]}>
        <mesh position={[0, 0.46, 0]} rotation={[0, 0.16, 0]}>
          <planeGeometry args={[1.45, 1.12]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[-0.20, 0.50, -0.16]} rotation={[0, -0.24, 0]}>
          <planeGeometry args={[1.38, 1.06]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
      </group>

      {/* Right Far Promenade Cluster (Z = -5.20m) */}
      <group position={[2.05, 0.28, -5.20]}>
        <mesh position={[0, 0.46, 0]} rotation={[0, -0.16, 0]}>
          <planeGeometry args={[1.45, 1.12]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.62} />
        </mesh>
        <mesh position={[0.20, 0.50, -0.16]} rotation={[0, 0.24, 0]}>
          <planeGeometry args={[1.38, 1.06]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
      </group>

      {/* Left Distant Soft Flowering Bed (Z = -6.5m) */}
      <group position={[-2.30, 0.28, -6.50]}>
        <mesh position={[0, 0.48, 0]} rotation={[0, 0.12, 0]}>
          <planeGeometry args={[1.55, 1.20]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
        <mesh position={[-0.18, 0.52, -0.16]} rotation={[0, -0.22, 0]}>
          <planeGeometry args={[1.45, 1.15]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>
      </group>

      {/* Right Distant Soft Flowering Bed (Z = -6.5m) */}
      <group position={[2.30, 0.28, -6.50]}>
        <mesh position={[0, 0.48, 0]} rotation={[0, -0.12, 0]}>
          <planeGeometry args={[1.55, 1.20]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.64} />
        </mesh>
        <mesh position={[0.18, 0.52, -0.16]} rotation={[0, 0.22, 0]}>
          <planeGeometry args={[1.45, 1.15]} />
          <meshStandardMaterial map={roseTexture} transparent alphaTest={0.08} roughness={0.65} />
        </mesh>
      </group>

      {/* ─── SECTION E: GRAND THREE-TIER MARBLE FOUNTAIN (Z = -8.6m) ───
          Grand focal terminus at the end of the ivory marble promenade.
          3-tier stepped circular marble dais, grand basin with torus coping rim,
          fluted baluster pedestal with champagne-gold carved collar,
          upper scalloped bowl, 6 curved cascading water streams, flowing veil,
          crystalline vertical spray plume, and grounding rose/orchid plantings. */}
      <DistantMarbleFountain
        position={[0.0, 0.0, -8.6]}
        scale={0.84}
        marbleTexture={marbleTexture}
        roseTexture={roseTexture}
        orchidTexture={orchidTexture}
        orchidAltTexture={orchidAltTexture}
        cascadeTexture={fountainTextures.cascadeTexture}
        waterRippleTexture={fountainTextures.waterRippleTexture}
        waterRef={waterRef}
        cascadeRef={cascadeRef}
        plumeRef={plumeRef}
      />

      {/* ========================================================
          7. Foreground Classical Architectural Framing Archway (Z = 1.6)
          Neoclassical Corinthian columns, carved plinths, blooming climbing roses,
          and hanging brass lanterns framing the open portal.
          ======================================================== */}
      <group position={[0, 2.15, 1.6]}>
        <mesh>
          <planeGeometry args={[9.6, 5.36]} />
          <meshStandardMaterial
            map={archTexture}
            transparent
            alphaTest={0.05}
            roughness={0.42}
            metalness={0.02}
          />
        </mesh>

        {/* ── Left Entrance Brass Lantern (framing archway): Luminous Glow & Candlelight ── */}
        <group ref={lanternHalo1Ref} position={[-0.84, -0.37, 0.14]}>
          {/* Warm candlelight flame core — tuned to balance warmth without glare */}
          <mesh renderOrder={10}>
            <planeGeometry args={[0.13, 0.17]} />
            <meshBasicMaterial
              map={lanternHaloTexture}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.48}
            />
          </mesh>
          {/* Soft golden glass corona calibrated to prevent central text washout */}
          <mesh position={[0, 0, 0.01]} renderOrder={9}>
            <planeGeometry args={[0.18, 0.22]} />
            <meshBasicMaterial
              map={lanternHaloTexture}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.06}
            />
          </mesh>
        </group>

        {/* Left Entrance Lantern Candlelight Point Light (restrained distance to preserve text readability) */}
        <pointLight
          ref={lanternGlow1Ref}
          position={[-0.84, -0.37, 0.22]}
          color="#ffaa36"
          intensity={1.25}
          distance={2.1}
          decay={2}
        />

        {/* Left Column & Rose Carving Warm Spill Light (preserves architectural illumination) */}
        <pointLight
          position={[-1.25, -0.35, 0.38]}
          color="#ffd48a"
          intensity={1.3}
          distance={3.8}
          decay={2}
        />

        {/* ── Right Entrance Brass Lantern (framing archway): Luminous Glow & Candlelight ── */}
        <group ref={lanternHalo2Ref} position={[0.87, -0.34, 0.14]}>
          {/* Warm candlelight flame core — tuned to balance warmth without glare */}
          <mesh renderOrder={10}>
            <planeGeometry args={[0.13, 0.17]} />
            <meshBasicMaterial
              map={lanternHaloTexture}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.48}
            />
          </mesh>
          {/* Soft golden glass corona calibrated to prevent central text washout */}
          <mesh position={[0, 0, 0.01]} renderOrder={9}>
            <planeGeometry args={[0.18, 0.22]} />
            <meshBasicMaterial
              map={lanternHaloTexture}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.06}
            />
          </mesh>
        </group>

        {/* Right Entrance Lantern Candlelight Point Light (restrained distance to preserve text readability) */}
        <pointLight
          ref={lanternGlow2Ref}
          position={[0.87, -0.34, 0.22]}
          color="#ffaa36"
          intensity={1.25}
          distance={2.1}
          decay={2}
        />

        {/* Right Column & Rose Carving Warm Spill Light (preserves architectural illumination) */}
        <pointLight
          position={[1.25, -0.32, 0.38]}
          color="#ffd48a"
          intensity={1.4}
          distance={4.0}
          decay={2}
        />

        {/* ── Outer Colonnade Lanterns: Subtle Warm Golden Depth ── */}
        {/* Left Outer Colonnade Lantern */}
        <mesh position={[-2.27, -0.11, 0.14]} renderOrder={9}>
          <planeGeometry args={[0.20, 0.25]} />
          <meshBasicMaterial
            map={lanternHaloTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.24}
          />
        </mesh>
        <pointLight
          position={[-2.27, -0.11, 0.20]}
          color="#ffaa36"
          intensity={1.1}
          distance={3.0}
          decay={2}
        />

        {/* Right Outer Colonnade Lantern */}
        <mesh position={[2.30, -0.09, 0.14]} renderOrder={9}>
          <planeGeometry args={[0.20, 0.25]} />
          <meshBasicMaterial
            map={lanternHaloTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.24}
          />
        </mesh>
        <pointLight
          position={[2.30, -0.09, 0.20]}
          color="#ffaa36"
          intensity={1.1}
          distance={3.0}
          decay={2}
        />
      </group>

      {/* ========================================================
          8. True 3D Floating Rose Petals & Golden Light Motes
          ======================================================== */}
      <FloatingPetals count={90} reducedMotion={reducedMotion} />
    </group>
  );
}
