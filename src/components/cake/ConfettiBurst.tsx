import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotate: number;
  delay: number;
  duration: number;
  shape: 'rect' | 'circle' | 'star' | 'ribbon';
  wave: 1 | 2 | 3 | 4;
  depth: 'fg' | 'mid' | 'bg';
  driftX: number;
}

const CONFETTI_COLORS = [
  '#ecd09b', // champagne gold
  '#d4af66', // burnished deep gold
  '#ffd700', // radiant yellow gold
  '#fff9e6', // warm ivory shimmer
  '#f8a5c2', // rose petal pink
  '#ffccd5', // blush cream
  '#ffffff', // diamond sparkle white
  '#fdf0d5', // warm cream
];

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Generate 160 rich, staggered celebration particles across 4 waves covering 12 seconds
const CONFETTI_PIECES: ConfettiPiece[] = Array.from({ length: 160 }, (_, i) => {
  // Wave distribution:
  // Wave 1 (0-45): Immediate central explosive burst (0-3.5s)
  // Wave 2 (46-85): Side-launching cannon arcs (1.0-5.5s)
  // Wave 3 (86-125): Overhead golden shower cascade (3.2-8.5s)
  // Wave 4 (126-159): Sustained floating ribbons & diamond sparkles (6.0-12.0s)
  const wave: 1 | 2 | 3 | 4 = i < 45 ? 1 : i < 85 ? 2 : i < 125 ? 3 : 4;

  const depthRand = pseudoRandom(i * 7 + 1);
  const depth: 'fg' | 'mid' | 'bg' = depthRand > 0.65 ? 'fg' : depthRand > 0.3 ? 'mid' : 'bg';
  const shapeRand = pseudoRandom(i * 7 + 2);
  const shape: 'rect' | 'circle' | 'star' | 'ribbon' =
    shapeRand > 0.72 ? 'star' : shapeRand > 0.48 ? 'ribbon' : shapeRand > 0.24 ? 'circle' : 'rect';

  const baseSize = depth === 'fg' ? 12.5 : depth === 'mid' ? 8.5 : 5.5;
  const size = baseSize + pseudoRandom(i * 7 + 3) * (baseSize * 0.6);

  let x = 50;
  let y = 50;
  let delay = 0;
  let duration = 3.5;
  let driftX = (pseudoRandom(i * 7 + 8) - 0.5) * 160;

  if (wave === 1) {
    // Wave 1: Central cake cut explosion radiating outwards
    x = 50 + (pseudoRandom(i * 7 + 4) - 0.5) * 85;
    y = 48 + (pseudoRandom(i * 7 + 5) - 0.5) * 35;
    delay = pseudoRandom(i * 7 + 6) * 0.35;
    duration = 2.4 + pseudoRandom(i * 7 + 7) * 1.4;
  } else if (wave === 2) {
    // Wave 2: Side cannon arcs launched from lower corners
    const isLeft = i % 2 === 0;
    x = isLeft ? 5 + pseudoRandom(i * 7 + 4) * 20 : 75 + pseudoRandom(i * 7 + 4) * 20;
    y = 75 + pseudoRandom(i * 7 + 5) * 20;
    delay = 1.0 + pseudoRandom(i * 7 + 6) * 1.2;
    duration = 3.2 + pseudoRandom(i * 7 + 7) * 1.5;
    driftX = isLeft ? 120 + pseudoRandom(i * 7 + 8) * 80 : -120 - pseudoRandom(i * 7 + 8) * 80;
  } else if (wave === 3) {
    // Wave 3: Overhead golden cascade raining down across full screen
    x = pseudoRandom(i * 7 + 4) * 100;
    y = -6 - pseudoRandom(i * 7 + 5) * 15;
    delay = 3.2 + pseudoRandom(i * 7 + 6) * 2.2;
    duration = 3.6 + pseudoRandom(i * 7 + 7) * 1.8;
  } else {
    // Wave 4: Slow sustained floating ribbons and sparkles
    x = pseudoRandom(i * 7 + 4) * 100;
    y = -10 - pseudoRandom(i * 7 + 5) * 20;
    delay = 5.8 + pseudoRandom(i * 7 + 6) * 2.5;
    duration = 4.2 + pseudoRandom(i * 7 + 7) * 2.2;
    driftX = (pseudoRandom(i * 7 + 8) - 0.5) * 220;
  }

  return {
    id: i,
    x,
    y,
    color: CONFETTI_COLORS[Math.floor(pseudoRandom(i * 7 + 9) * CONFETTI_COLORS.length)],
    size,
    rotate: Math.floor(pseudoRandom(i * 7 + 10) * 360),
    delay,
    duration,
    shape,
    wave,
    depth,
    driftX,
  };
});

interface ConfettiBurstProps {
  onComplete?: () => void;
}

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ onComplete }) => {
  const [isActive, setIsActive] = useState<boolean>(true);

  // Sustained celebration duration: 11.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(false);
      onComplete?.();
    }, 11500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isActive) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {/* Radiant Golden Sunburst Bloom Pulse at Cut Impact */}
      <div className="celebration-golden-bloom celebration-bloom-pulse" />

      {/* Multi-Wave Staggered Confetti Particle Shower */}
      {CONFETTI_PIECES.map((p) => {
        const isStar = p.shape === 'star';
        const isRibbon = p.shape === 'ribbon';

        return (
          <span
            key={p.id}
            className={`confetti-particle confetti-${p.shape} depth-${p.depth} wave-${p.wave}`}
            style={
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                backgroundColor: !isStar ? p.color : undefined,
                color: isStar ? p.color : undefined,
                width: !isStar
                  ? isRibbon
                    ? `${p.size * 0.45}px`
                    : `${p.size}px`
                  : undefined,
                height: !isStar
                  ? isRibbon
                    ? `${p.size * 2.4}px`
                    : p.shape === 'rect'
                    ? `${p.size * 1.3}px`
                    : `${p.size}px`
                  : undefined,
                fontSize: isStar ? `${p.size * 1.7}px` : undefined,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--drift-x': `${p.driftX}px`,
                transform: `rotate(${p.rotate}deg)`,
              } as React.CSSProperties
            }
          >
            {isStar && '✦'}
          </span>
        );
      })}
    </div>
  );
};
