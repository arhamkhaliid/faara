import React from 'react';
import { CONTROL_ROOM_COPY } from '../copy';
import type { ControlRoomSceneProps } from '../types';

export const ControlRoomScene: React.FC<ControlRoomSceneProps> = ({
  visitedModules,
  onSelectModule,
}) => {
  return (
    <section className="garden-control-hud" aria-label="A Little Place, Just For You">
      <div className="control-editorial-wrapper">
        {/* Upper Editorial Text Section */}
        <header className="control-editorial-header">
          <span className="control-editorial-eyebrow">
            {CONTROL_ROOM_COPY.eyebrow}
          </span>
          <h1 className="control-editorial-headline">
            {CONTROL_ROOM_COPY.headline}
          </h1>
          <div className="control-editorial-divider" aria-hidden="true">
            <span className="divider-line" />
            <span className="divider-gem">✧</span>
            <span className="divider-line" />
          </div>
          <p className="control-editorial-supporting">
            {CONTROL_ROOM_COPY.supportingLine}
          </p>
          <p className="control-editorial-closing">
            {CONTROL_ROOM_COPY.closingLine}
          </p>
        </header>

        {/* Floating Interactive Platform Labels */}
        <div className="control-platforms-nav" role="navigation" aria-label="Exhibits">
          <div className="platform-nav-slot slot-surprise">
            <button
              type="button"
              className={`platform-label-btn ${visitedModules.includes('surprise') ? 'visited' : ''}`}
              onClick={() => onSelectModule('surprise')}
              aria-label="Surprise"
            >
              <span className="platform-label-gem">✧</span>
              <span className="platform-label-text">Surprise</span>
              {visitedModules.includes('surprise') && (
                <span className="platform-visited-dot" title="Explored">✓</span>
              )}
              <span className="platform-arrow">→</span>
            </button>
          </div>

          <div className="platform-nav-slot slot-certificate">
            <button
              type="button"
              className={`platform-label-btn ${visitedModules.includes('certificate') ? 'visited' : ''}`}
              onClick={() => onSelectModule('certificate')}
              aria-label="Certificate"
            >
              <span className="platform-label-gem">✧</span>
              <span className="platform-label-text">Certificate</span>
              {visitedModules.includes('certificate') && (
                <span className="platform-visited-dot" title="Explored">✓</span>
              )}
              <span className="platform-arrow">→</span>
            </button>
          </div>

          <div className="platform-nav-slot slot-cake">
            <button
              type="button"
              className={`platform-label-btn ${visitedModules.includes('cake') ? 'visited' : ''}`}
              onClick={() => onSelectModule('cake')}
              aria-label="Cake"
            >
              <span className="platform-label-gem">✧</span>
              <span className="platform-label-text">Cake</span>
              {visitedModules.includes('cake') && (
                <span className="platform-visited-dot" title="Explored">✓</span>
              )}
              <span className="platform-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
