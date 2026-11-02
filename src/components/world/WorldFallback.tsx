import React from 'react';

export const WorldFallback: React.FC = () => {
  return (
    <div className="world-fallback-backdrop" aria-hidden="true">
      <div className="fallback-sky-gradient"></div>
      <div className="fallback-mountains"></div>
      <div className="fallback-garden-terrace"></div>
      <div className="fallback-pavilion-silhouette">
        <div className="fallback-dome-roof"></div>
        <div className="fallback-columns-row">
          <span className="fallback-column"></span>
          <span className="fallback-column"></span>
          <span className="fallback-column"></span>
          <span className="fallback-column"></span>
        </div>
        <div className="fallback-beacon-glow">✧</div>
      </div>
    </div>
  );
};
