import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { ModuleId } from '../../types';

interface ControlRoomPlatformsProps {
  onSelectModule?: (moduleId: ModuleId) => void;
  visitedModules?: ModuleId[];
  reducedMotion?: boolean;
}

// ---------------------------------------------------------------------------
// Procedural Canvas Texture for Platform Marble Top
// ---------------------------------------------------------------------------
function createPlatformMarbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Warm ivory base
    ctx.fillStyle = '#fefcf8';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle Calacatta veins
    ctx.strokeStyle = 'rgba(215, 195, 175, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, 80);
    ctx.bezierCurveTo(140, 190, 280, 150, 480, 360);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(230, 210, 190, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 20);
    ctx.bezierCurveTo(220, 180, 310, 320, 420, 490);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(190, 160, 135, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(350, 40);
    ctx.bezierCurveTo(280, 140, 160, 260, 80, 460);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  return texture;
}

// ---------------------------------------------------------------------------
// 3D Platform 1: Surprise (Wrapped Gift Box with Silk Ribbon & Tag)
// ---------------------------------------------------------------------------
const SurpriseGiftBox: React.FC = () => {
  return (
    <group position={[0, 0.025, 0]} rotation={[0.08, 0.42, -0.04]}>
      {/* Box Body */}
      <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.26, 0.20, 0.26]} />
        <meshStandardMaterial
          color="#d4738c"
          roughness={0.28}
          metalness={0.15}
        />
      </mesh>

      {/* Box Lid */}
      <mesh position={[0, 0.218, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.276, 0.038, 0.276]} />
        <meshStandardMaterial
          color="#c45f78"
          roughness={0.25}
          metalness={0.16}
        />
      </mesh>

      {/* Champagne Gold Ribbon Wrap — X Axis */}
      <mesh position={[0, 0.11, 0]} castShadow>
        <boxGeometry args={[0.282, 0.204, 0.042]} />
        <meshStandardMaterial
          color="#edd39b"
          metalness={0.85}
          roughness={0.22}
        />
      </mesh>

      {/* Champagne Gold Ribbon Wrap — Z Axis */}
      <mesh position={[0, 0.11, 0]} castShadow>
        <boxGeometry args={[0.042, 0.204, 0.282]} />
        <meshStandardMaterial
          color="#edd39b"
          metalness={0.85}
          roughness={0.22}
        />
      </mesh>

      {/* Ribbon on Top of Lid */}
      <mesh position={[0, 0.238, 0]} castShadow>
        <boxGeometry args={[0.282, 0.010, 0.042]} />
        <meshStandardMaterial
          color="#edd39b"
          metalness={0.85}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[0, 0.238, 0]} castShadow>
        <boxGeometry args={[0.042, 0.010, 0.282]} />
        <meshStandardMaterial
          color="#edd39b"
          metalness={0.85}
          roughness={0.22}
        />
      </mesh>

      {/* Central Ribbon Knot */}
      <mesh position={[0, 0.252, 0]} castShadow>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshStandardMaterial
          color="#dfbe78"
          metalness={0.88}
          roughness={0.20}
        />
      </mesh>

      {/* Ribbon Loops (Bow) */}
      <mesh position={[-0.035, 0.268, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <torusGeometry args={[0.032, 0.009, 10, 24, Math.PI * 1.5]} />
        <meshStandardMaterial color="#edd39b" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0.035, 0.268, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <torusGeometry args={[0.032, 0.009, 10, 24, Math.PI * 1.5]} />
        <meshStandardMaterial color="#edd39b" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.268, -0.035]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <torusGeometry args={[0.032, 0.009, 10, 24, Math.PI * 1.5]} />
        <meshStandardMaterial color="#edd39b" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.268, 0.035]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
        <torusGeometry args={[0.032, 0.009, 10, 24, Math.PI * 1.5]} />
        <meshStandardMaterial color="#edd39b" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* Trailing Ribbon Tails */}
      <mesh position={[0.05, 0.21, 0.08]} rotation={[0.4, 0.3, -0.2]} castShadow>
        <planeGeometry args={[0.032, 0.09]} />
        <meshStandardMaterial
          color="#edd39b"
          metalness={0.85}
          roughness={0.22}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Delicate Little Gift Tag */}
      <mesh position={[-0.065, 0.21, 0.07]} rotation={[-0.3, -0.4, 0.2]} castShadow>
        <boxGeometry args={[0.060, 0.040, 0.003]} />
        <meshStandardMaterial color="#fdf6ec" roughness={0.55} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 3D Platform 2: Certificate (Rolled Parchment Scroll with Velvet Ribbon & Wax Seal)
// ---------------------------------------------------------------------------
const CertificateScroll: React.FC = () => {
  return (
    <group position={[0, 0.03, 0]} rotation={[0.12, 0.28, -0.02]}>
      {/* Decorative Champagne Gold Display Cradle */}
      <group position={[0, 0.02, 0]}>
        <mesh position={[-0.09, 0, 0]} rotation={[0, 0, 0]} castShadow>
          <torusGeometry args={[0.032, 0.004, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#ecd09b" metalness={0.85} roughness={0.22} />
        </mesh>
        <mesh position={[0.09, 0, 0]} rotation={[0, 0, 0]} castShadow>
          <torusGeometry args={[0.032, 0.004, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#ecd09b" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>

      {/* Rolled Parchment Scroll Body (Horizontal) */}
      <mesh position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.038, 0.038, 0.32, 32]} />
        <meshStandardMaterial
          color="#faf3e3"
          roughness={0.65}
          metalness={0.02}
        />
      </mesh>

      {/* Inner Core Hollow Shading at Scroll Ends */}
      <mesh position={[-0.161, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}>
        <circleGeometry args={[0.034, 24]} />
        <meshStandardMaterial color="#5e4430" roughness={0.9} />
      </mesh>
      <mesh position={[0.161, 0.07, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <circleGeometry args={[0.034, 24]} />
        <meshStandardMaterial color="#5e4430" roughness={0.9} />
      </mesh>

      {/* Gold Trimmed Rings at Scroll Edges */}
      <mesh position={[-0.145, 0.07, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.039, 0.0035, 8, 24]} />
        <meshStandardMaterial color="#ecd09b" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0.145, 0.07, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.039, 0.0035, 8, 24]} />
        <meshStandardMaterial color="#ecd09b" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* Deep Maroon Velvet Ribbon around Center */}
      <mesh position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.043, 0.043, 0.038, 32]} />
        <meshStandardMaterial
          color="#7A1E38"
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>

      {/* Imperial Crimson Wax Seal */}
      <mesh position={[0, 0.112, 0.018]} rotation={[0.35, 0, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.007, 24]} />
        <meshStandardMaterial
          color="#6B1730"
          roughness={0.22}
          metalness={0.20}
        />
      </mesh>
      {/* Gold Embossed Star inside Wax Seal */}
      <mesh position={[0, 0.116, 0.022]} rotation={[0.35, 0, 0]}>
        <sphereGeometry args={[0.007, 8, 8]} />
        <meshStandardMaterial color="#eec676" metalness={0.88} roughness={0.2} />
      </mesh>

      {/* Trailing Ribbon Ends */}
      <mesh position={[-0.010, 0.038, 0.045]} rotation={[-0.3, 0.2, -0.4]} castShadow>
        <planeGeometry args={[0.022, 0.065]} />
        <meshStandardMaterial color="#7A1E38" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.010, 0.035, 0.045]} rotation={[-0.25, -0.2, 0.4]} castShadow>
        <planeGeometry args={[0.022, 0.065]} />
        <meshStandardMaterial color="#7A1E38" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 3D Platform 3: Birthday Cake (Miniature Celebration Cake with Candles)
// ---------------------------------------------------------------------------
const BirthdayCakeMini: React.FC = () => {
  const flameGeom = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(0.010, 0.014),
      new THREE.Vector2(0.012, 0.028),
      new THREE.Vector2(0.007, 0.048),
      new THREE.Vector2(0.001, 0.065),
    ];
    return new THREE.LatheGeometry(pts, 14);
  }, []);

  return (
    <group position={[0, 0.025, 0]} rotation={[0.12, -0.32, 0.03]}>
      {/* Scalloped Champagne Gold Cake Stand */}
      <mesh position={[0, 0.012, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.20, 0.18, 0.014, 36]} />
        <meshStandardMaterial color="#ecd09b" metalness={0.84} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.004, 0]}>
        <cylinderGeometry args={[0.10, 0.12, 0.008, 24]} />
        <meshStandardMaterial color="#d4b47c" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Main Cake Layer — Dark Chocolate & Berry Ganache */}
      <mesh position={[0, 0.075, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.11, 36]} />
        <meshStandardMaterial
          color="#381d18"
          roughness={0.65}
          metalness={0.04}
        />
      </mesh>

      {/* Top Mirror Glaze / Pastel Strawberry-Vanilla Frosting */}
      <mesh position={[0, 0.133, 0]} receiveShadow>
        <cylinderGeometry args={[0.162, 0.162, 0.008, 36]} />
        <meshStandardMaterial
          color="#fcecee"
          roughness={0.16}
          metalness={0.08}
        />
      </mesh>

      {/* Piped Buttercream Rosettes around Rim */}
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const x = Math.cos(angle) * 0.145;
        const z = Math.sin(angle) * 0.145;
        return (
          <mesh key={i} position={[x, 0.142, z]} castShadow>
            <sphereGeometry args={[0.014, 10, 10]} />
            <meshStandardMaterial color="#fff4f6" roughness={0.28} />
          </mesh>
        );
      })}

      {/* Glossy Blackberries / Raspberries on Top */}
      <mesh position={[-0.035, 0.146, -0.035]} castShadow>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color="#4a1525" roughness={0.22} metalness={0.1} />
      </mesh>
      <mesh position={[0.042, 0.146, 0.025]} castShadow>
        <sphereGeometry args={[0.013, 12, 12]} />
        <meshStandardMaterial color="#7a1832" roughness={0.24} metalness={0.1} />
      </mesh>
      <mesh position={[-0.018, 0.146, 0.042]} castShadow>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color="#4a1525" roughness={0.22} metalness={0.1} />
      </mesh>

      {/* Two Slender Birthday Candles */}
      {/* Candle 1 */}
      <group position={[-0.038, 0.14, 0.01]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.005, 0.005, 0.08, 14]} />
          <meshStandardMaterial color="#fffbee" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.082, 0]}>
          <cylinderGeometry args={[0.0012, 0.0012, 0.008, 8]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
        {/* Flame */}
        <mesh position={[0, 0.088, 0]} geometry={flameGeom}>
          <meshBasicMaterial color="#ffe89e" />
        </mesh>
        <mesh position={[0, 0.088, 0]} scale={[0.65, 0.65, 0.65]} geometry={flameGeom}>
          <meshBasicMaterial color="#ff6b35" />
        </mesh>
      </group>

      {/* Candle 2 */}
      <group position={[0.038, 0.14, -0.01]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.005, 0.005, 0.08, 14]} />
          <meshStandardMaterial color="#fffbee" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.082, 0]}>
          <cylinderGeometry args={[0.0012, 0.0012, 0.008, 8]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
        </mesh>
        {/* Flame */}
        <mesh position={[0, 0.088, 0]} geometry={flameGeom}>
          <meshBasicMaterial color="#ffe89e" />
        </mesh>
        <mesh position={[0, 0.088, 0]} scale={[0.65, 0.65, 0.65]} geometry={flameGeom}>
          <meshBasicMaterial color="#ff6b35" />
        </mesh>
      </group>

      {/* Soft warm candle candlelight accent */}
      <pointLight
        position={[0, 0.24, 0]}
        color="#ffe2a4"
        intensity={0.45}
        distance={1.2}
        decay={2}
      />
    </group>
  );
};

// ---------------------------------------------------------------------------
// Single Modular Floating Display Platform
// ---------------------------------------------------------------------------
interface PlatformUnitProps {
  id: ModuleId;
  basePosition: [number, number, number];
  scale?: number;
  phase: number;
  marbleTexture: THREE.Texture;
  onSelect?: (id: ModuleId) => void;
  reducedMotion?: boolean;
  children: React.ReactNode;
}

const PlatformUnit: React.FC<PlatformUnitProps> = ({
  id,
  basePosition,
  scale = 1.0,
  phase,
  marbleTexture,
  onSelect,
  reducedMotion = false,
  children,
}) => {
  const floatGroupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const isHoveredRef = useRef<boolean>(false);
  const liftSpring = useRef<number>(0);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((state, delta) => {
    if (!floatGroupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Silky-smooth harmonic buoyant float
    const bobY = reducedMotion
      ? 0
      : Math.sin(t * 1.15 + phase) * 0.015 + Math.sin(t * 2.30 + phase * 0.5) * 0.003;

    // Organic subtle pitch, roll and yaw
    const tiltX = reducedMotion ? 0 : Math.sin(t * 0.85 + phase) * 0.012;
    const tiltZ = reducedMotion ? 0 : Math.cos(t * 0.75 + phase) * 0.010;
    const swayY = reducedMotion ? 0 : Math.sin(t * 0.45 + phase) * 0.022;

    // Critically-damped framerate-independent hover lift
    const targetLift = isHoveredRef.current ? 0.032 : 0;
    liftSpring.current = THREE.MathUtils.damp(liftSpring.current, targetLift, 4.0, delta);

    floatGroupRef.current.position.y = bobY + liftSpring.current;
    floatGroupRef.current.rotation.x = tiltX;
    floatGroupRef.current.rotation.z = tiltZ;
    floatGroupRef.current.rotation.y = swayY;

    // Smoothly damp underglow light intensity without React re-renders
    if (lightRef.current) {
      const targetIntensity = isHoveredRef.current ? 0.75 : 0.40;
      lightRef.current.intensity = THREE.MathUtils.damp(
        lightRef.current.intensity,
        targetIntensity,
        4.0,
        delta
      );
    }
  });

  return (
    <group position={basePosition} scale={[scale, scale, scale]}>
      {/* ── Stable Invisible Raycast Hit Volume (prevents edge-hunting chatter & internal mesh thrashing) ── */}
      <mesh
        position={[0, 0.12, 0]}
        visible={false}
        onPointerEnter={(e) => {
          e.stopPropagation();
          isHoveredRef.current = true;
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          isHoveredRef.current = false;
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelect) onSelect(id);
        }}
      >
        <cylinderGeometry args={[0.36, 0.36, 0.42, 16]} />
      </mesh>

      {/* ── Animated Floating Visual Group (decoupled from static base transform) ── */}
      <group ref={floatGroupRef}>
        {/* ── Polished Ivory Marble Top Disc ── */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[0.32, 0.34, 0.040, 36]} />
          <meshStandardMaterial
            map={marbleTexture}
            color="#fdfbf7"
            roughness={0.18}
            metalness={0.06}
          />
        </mesh>

        {/* ── Champagne Gold Filigree Beveled Edge Rim (HORIZONTAL in XZ Plane) ── */}
        <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.328, 0.012, 12, 36]} />
          <meshStandardMaterial
            color="#ecd09b"
            metalness={0.88}
            roughness={0.22}
          />
        </mesh>

        {/* ── Underside Tapered Plinth ── */}
        <mesh position={[0, -0.038, 0]}>
          <cylinderGeometry args={[0.31, 0.12, 0.042, 24]} />
          <meshStandardMaterial
            color="#f5efe5"
            roughness={0.25}
            metalness={0.04}
          />
        </mesh>

        {/* ── Lower Gold Collar Finial ── */}
        <mesh position={[0, -0.068, 0]}>
          <sphereGeometry args={[0.024, 16, 16]} />
          <meshStandardMaterial
            color="#dfbe78"
            metalness={0.88}
            roughness={0.22}
          />
        </mesh>

        {/* ── Soft Warm Underglow on Walkway ── */}
        <pointLight
          ref={lightRef}
          position={[0, -0.12, 0]}
          color="#ffe8c2"
          intensity={0.4}
          distance={1.4}
          decay={2}
        />

        {/* Displayed 3D Artifact */}
        {children}
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Master Control Room 3D Platforms Component
// ---------------------------------------------------------------------------
export const ControlRoomPlatforms: React.FC<ControlRoomPlatformsProps> = ({
  onSelectModule,
  reducedMotion = false,
}) => {
  const { size } = useThree();
  const isMobile = size.width < 768;

  const marbleTexture = useMemo(() => {
    if (typeof document === 'undefined') return new THREE.Texture();
    return createPlatformMarbleTexture();
  }, []);

  // Desktop horizontal layout vs Mobile layout
  // Desktop: 3 separate floating platforms at consistent visual height (Y = 1.14, Z = -2.60)
  // Left: Surprise (X = -0.88), Center: Certificate (X = 0), Right: Cake (X = +0.88)
  // Raised above foreground planters and flowerbeds while preserving clear gap to fountain behind.
  const layout = useMemo(() => {
    if (isMobile) {
      return {
        surprise: { pos: [-0.37, 1.18, -2.75] as [number, number, number], scale: 0.48 },
        certificate: { pos: [0.0, 1.18, -2.75] as [number, number, number], scale: 0.48 },
        cake: { pos: [0.37, 1.18, -2.75] as [number, number, number], scale: 0.48 },
      };
    }
    return {
      surprise: { pos: [-0.88, 1.14, -2.60] as [number, number, number], scale: 0.90 },
      certificate: { pos: [0.0, 1.14, -2.60] as [number, number, number], scale: 0.90 },
      cake: { pos: [0.88, 1.14, -2.60] as [number, number, number], scale: 0.90 },
    };
  }, [isMobile]);

  return (
    <group name="control-room-3d-platforms">
      {/* Platform 1: Surprise (Gift Box) */}
      <PlatformUnit
        id="surprise"
        basePosition={layout.surprise.pos}
        scale={layout.surprise.scale}
        phase={0}
        marbleTexture={marbleTexture}
        onSelect={onSelectModule}
        reducedMotion={reducedMotion}
      >
        <SurpriseGiftBox />
      </PlatformUnit>

      {/* Platform 2: Certificate (Rolled Parchment Scroll) */}
      <PlatformUnit
        id="certificate"
        basePosition={layout.certificate.pos}
        scale={layout.certificate.scale}
        phase={1.8}
        marbleTexture={marbleTexture}
        onSelect={onSelectModule}
        reducedMotion={reducedMotion}
      >
        <CertificateScroll />
      </PlatformUnit>

      {/* Platform 3: Cake (Birthday Cake with Candles) */}
      <PlatformUnit
        id="cake"
        basePosition={layout.cake.pos}
        scale={layout.cake.scale}
        phase={3.6}
        marbleTexture={marbleTexture}
        onSelect={onSelectModule}
        reducedMotion={reducedMotion}
      >
        <BirthdayCakeMini />
      </PlatformUnit>
    </group>
  );
};
