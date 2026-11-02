import React from 'react';

interface CakeFallback2DProps {
  candle1Lit: boolean;
  candle2Lit: boolean;
  onLightCandle: (index: 0 | 1) => void;
  isBlownOut: boolean;
  isCut: boolean;
}

export const CakeFallback2D: React.FC<CakeFallback2DProps> = ({
  candle1Lit,
  candle2Lit,
  onLightCandle,
  isBlownOut,
  isCut,
}) => {
  return (
    <div className="cake-2d-fallback-stage" aria-label="Layered Birthday Cake">
      {/* Candles 2 and 2 */}
      <div className="cake-2d-candles-row">
        {/* Left Candle 2 */}
        <button
          type="button"
          className={`cake-2d-candle ${candle1Lit ? 'candle-lit' : 'candle-unlit'} ${isBlownOut ? 'candle-blown' : ''}`}
          onClick={() => onLightCandle(0)}
          aria-label={`Candle 2, ${candle1Lit ? (isBlownOut ? 'extinguished' : 'burning') : 'unlit'}`}
        >
          {candle1Lit && !isBlownOut && <span className="flame-flicker">🔥</span>}
          {isBlownOut && <span className="smoke-puff">💨</span>}
          <div className="candle-body">2</div>
        </button>

        {/* Right Candle 2 */}
        <button
          type="button"
          className={`cake-2d-candle ${candle2Lit ? 'candle-lit' : 'candle-unlit'} ${isBlownOut ? 'candle-blown' : ''}`}
          onClick={() => onLightCandle(1)}
          aria-label={`Candle 2, ${candle2Lit ? (isBlownOut ? 'extinguished' : 'burning') : 'unlit'}`}
        >
          {candle2Lit && !isBlownOut && <span className="flame-flicker">🔥</span>}
          {isBlownOut && <span className="smoke-puff">💨</span>}
          <div className="candle-body">2</div>
        </button>
      </div>

      {/* 2D Layered Cake Assembly */}
      <div className={`cake-2d-cylinder ${isCut ? 'slice-revealed' : ''}`}>
        {/* Top Crushed Oreo Cookie Crumbs Crust */}
        <div className="cake-layer-top-crumbs">
          <div className="mini-oreo-ring">
            <span className="mini-oreo">🍪</span>
            <span className="mini-oreo">🍪</span>
            <span className="mini-oreo">🍪</span>
            <span className="mini-oreo">🍪</span>
            <span className="mini-oreo">🍪</span>
          </div>
        </div>

        {/* Top Sponge */}
        <div className="cake-sponge-layer layer-sponge-3"></div>

        {/* Upper Cream with Oreo Crumbs */}
        <div className="cake-cream-layer layer-cream-2">
          <span className="cream-cookie-specks"></span>
        </div>

        {/* Middle Sponge */}
        <div className="cake-sponge-layer layer-sponge-2"></div>

        {/* Lower Cream with Oreo Crumbs */}
        <div className="cake-cream-layer layer-cream-1">
          <span className="cream-cookie-specks"></span>
        </div>

        {/* Bottom Sponge */}
        <div className="cake-sponge-layer layer-sponge-1"></div>

        {/* Sliced Wedge (Revealed on cut) */}
        {isCut && (
          <div className="cake-2d-cut-slice-revealed" aria-label="Cut cake slice">
            <div className="slice-sponge"></div>
            <div className="slice-cream"></div>
            <div className="slice-sponge"></div>
            <span className="slice-cookie">🍪</span>
          </div>
        )}
      </div>

      {/* Gold & Marble Platter */}
      <div className="cake-2d-pedestal-stand">
        <div className="platter-rim-gold"></div>
        <div className="platter-base-stem"></div>
      </div>
    </div>
  );
};
