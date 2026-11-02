import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface FloatingPetalsProps {
  count?: number;
  reducedMotion?: boolean;
  cakeMode?: boolean;
  showButterflies?: boolean;
}

// Pure deterministic pseudo-random generator
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function FloatingPetals({
  count = 90,
  reducedMotion = false,
  cakeMode = false,
  showButterflies = !cakeMode,
}: FloatingPetalsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const butterfliesRef = useRef<THREE.Group>(null);

  // Programmatically generate a high-definition delicate rose petal texture with soft organic edges
  const petalTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 128, 128);

    // Draw an organic curved rose petal with natural delicate contour
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(-Math.PI / 7);

    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.bezierCurveTo(34, -46, 48, 12, 10, 48);
    ctx.bezierCurveTo(-6, 50, -22, 42, -32, 28);
    ctx.bezierCurveTo(-46, 8, -42, -26, -26, -38);
    ctx.closePath();

    // Soft pearlescent highlight gradient that lets vertexColors tint naturally
    const grad = ctx.createRadialGradient(-6, -12, 4, 0, 4, 52);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    grad.addColorStop(0.35, 'rgba(255, 245, 248, 0.95)');
    grad.addColorStop(0.70, 'rgba(250, 222, 232, 0.88)');
    grad.addColorStop(0.92, 'rgba(240, 180, 202, 0.65)');
    grad.addColorStop(1, 'rgba(235, 160, 188, 0)');

    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle delicate center petal vein for realism
    ctx.beginPath();
    ctx.moveTo(-4, -36);
    ctx.quadraticCurveTo(-1, 0, 6, 38);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Generate deterministic petal positions, colors, speeds, and rotation angles
  const { positions, colors, petalData } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const pData: Array<{ speedY: number; driftX: number; driftZ: number; phase: number }> = [];

    const palette = [
      new THREE.Color('#fff0f4'), // Soft ivory blush
      new THREE.Color('#f7a8b8'), // Rose petal pink
      new THREE.Color('#ef7896'), // Vibrant rose
      new THREE.Color('#fde4c8'), // Peach blossom
      new THREE.Color('#ecd09b'), // Champagne gold shimmer
      new THREE.Color('#ffb3c6'), // Cherry blossom pink
      new THREE.Color('#e05a7d'), // Deep romantic rose
    ];

    for (let i = 0; i < count; i++) {
      const r1 = pseudoRandom(i * 5 + 1);
      const r2 = pseudoRandom(i * 5 + 2);
      const r3 = pseudoRandom(i * 5 + 3);
      const r4 = pseudoRandom(i * 5 + 4);

      if (cakeMode) {
        // Cake Scene: distribute across broad 3D depth just like the Control Room,
        // producing natural perspective size variation (foreground large, midground medium, background small)
        const x = (r1 - 0.5) * 11; // X: -5.5 to 5.5
        const isCenter = Math.abs(x) < 1.35;
        const y = -0.15 + r2 * 4.3; // Y: -0.15 to 4.15
        
        // Center column (behind cake): depths strictly behind the cake (-4.2 to -0.45)
        // Terrace sides (past columns): full depth range (-4.2 to +1.8)
        const z = isCenter ? -4.2 + r3 * 3.75 : -4.2 + r3 * 6.0;

        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
      } else {
        // Standard World: Spread throughout the garden from foreground to midground
        pos[i * 3] = (r1 - 0.5) * 11; // X: -5.5 to 5.5
        pos[i * 3 + 1] = 0.2 + r2 * 4.2; // Y: 0.2 to 4.4
        pos[i * 3 + 2] = -6 + r3 * 11; // Z: -6 to 5
      }

      const colorIdx = Math.floor(r4 * palette.length);
      const chosenColor = palette[colorIdx];
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;

      pData.push({
        speedY: (cakeMode ? 0.22 : 0.25) + r2 * (cakeMode ? 0.26 : 0.35),
        driftX: (r1 - 0.46) * (cakeMode ? 0.26 : 0.28),
        driftZ: (cakeMode ? 0.05 : 0.15) + r3 * (cakeMode ? 0.12 : 0.25),
        phase: r4 * Math.PI * 2,
      });
    }

    return { positions: pos, colors: col, petalData: pData };
  }, [count, cakeMode]);

  // Small golden butterflies fluttering near flower clusters (standard world only)
  const butterflies = useMemo(() => {
    return [
      { basePos: [-2.4, 1.8, 1.5], offset: 0, color: '#fdd382' },
      { basePos: [2.5, 2.1, 1.2], offset: 1.6, color: '#f7b0c0' },
      { basePos: [-1.2, 1.4, -1.0], offset: 3.2, color: '#fbe2a7' },
      { basePos: [1.6, 1.6, -2.5], offset: 4.8, color: '#fcd0a1' },
    ];
  }, []);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const time = state.clock.getElapsedTime();

    // Petal drift animation
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const data = petalData[i];

        // Petals drift slowly downward and forward with gentle harmonic swaying (matching Control Room)
        array[idx + 1] -= data.speedY * delta;
        array[idx] +=
          Math.sin(time * 0.85 + data.phase) * delta * 0.35 +
          Math.cos(time * 0.42 + data.phase * 0.7) * delta * 0.12 +
          data.driftX * delta;
        array[idx + 2] +=
          Math.sin(time * 0.70 + data.phase * 1.1) * delta * 0.10 +
          data.driftZ * delta;

        // Keep foreground petals from swaying into the central cake cylinder
        if (cakeMode && array[idx + 2] > -0.45 && Math.abs(array[idx]) < 1.35) {
          array[idx] = array[idx] >= 0 ? 1.36 : -1.36;
        }

        // Reset if petal falls below floor or passes camera boundary
        const isCenter = cakeMode && Math.abs(array[idx]) < 1.35;
        const maxBoundaryZ = cakeMode ? (isCenter ? -0.40 : 2.1) : 5.5;

        if (array[idx + 1] < -0.30 || array[idx + 2] > maxBoundaryZ) {
          const rSeed1 = pseudoRandom(i * 7 + 1);
          const rSeed2 = pseudoRandom(i * 7 + 2);
          const rSeed3 = pseudoRandom(i * 7 + 3);

          if (cakeMode) {
            const newX = (rSeed2 - 0.5) * 11;
            const newIsCenter = Math.abs(newX) < 1.35;
            const newY = 3.6 + rSeed1 * 0.8;
            const newZ = newIsCenter ? -4.2 + rSeed3 * 3.75 : -4.2 + rSeed3 * 6.0;

            array[idx] = newX;
            array[idx + 1] = newY;
            array[idx + 2] = newZ;
          } else {
            array[idx + 1] = 3.8 + rSeed1 * 0.8;
            array[idx] = (pseudoRandom(i * 7 + 2) - 0.5) * 10;
            array[idx + 2] = -6 + rSeed3 * 5;
          }
        }
      }
      posAttr.needsUpdate = true;
    }

    // Butterfly fluttering (standard world only)
    if (showButterflies && butterfliesRef.current) {
      butterfliesRef.current.children.forEach((child, idx) => {
        const b = butterflies[idx];
        const flutter = Math.sin(time * 8 + b.offset);
        child.position.x = b.basePos[0] + Math.sin(time * 0.9 + b.offset) * 0.35;
        child.position.y = b.basePos[1] + Math.cos(time * 1.2 + b.offset) * 0.25 + flutter * 0.04;
        child.position.z = b.basePos[2] + Math.sin(time * 0.7 + b.offset) * 0.3;
        child.rotation.y = Math.sin(time * 1.5 + b.offset) * 0.5;
        child.rotation.z = flutter * 0.3;
      });
    }
  });

  return (
    <group>
      {/* Drifting Rose Petals */}
      {petalTexture && (
        <points ref={pointsRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[colors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            map={petalTexture}
            size={0.16}
            transparent
            opacity={0.88}
            vertexColors
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </points>
      )}

      {/* Fluttering Garden Butterflies (Shown in full garden world only) */}
      {showButterflies && (
        <group ref={butterfliesRef}>
          {butterflies.map((b, i) => (
            <group key={i} position={[b.basePos[0], b.basePos[1], b.basePos[2]]}>
              {/* Left Wing */}
              <mesh position={[-0.04, 0, 0]} rotation={[0, 0.4, 0]}>
                <planeGeometry args={[0.07, 0.05]} />
                <meshBasicMaterial
                  color={b.color}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              {/* Right Wing */}
              <mesh position={[0.04, 0, 0]} rotation={[0, -0.4, 0]}>
                <planeGeometry args={[0.07, 0.05]} />
                <meshBasicMaterial
                  color={b.color}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}
