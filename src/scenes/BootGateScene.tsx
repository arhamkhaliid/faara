import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BOOT_GATE_COPY } from '../copy';
import type { SceneProps } from '../types';

export const BootGateScene: React.FC<SceneProps> = ({ onNavigate }) => {
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const safeTimeout = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const handleEntry = () => {
    if (isExiting) return;

    // Optional audio unlock context on user gesture
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch {
      // Audio is non-blocking and silent-first
    }

    setIsExiting(true);
    safeTimeout(() => {
      onNavigate('opening');
    }, 550);
  };

  return (
    <section className="garden-entrance-hud" aria-label="Garden Entrance Gate">
      <div className={`garden-landing-container ${isExiting ? 'transitioning-out' : ''}`}>
        <div className="garden-landing-content">
          <h1 className="garden-landing-title">{BOOT_GATE_COPY.mainTitle}</h1>
          <p className="garden-landing-subtitle">{BOOT_GATE_COPY.subtitle}</p>

          <div className="garden-landing-message">
            <p className="garden-landing-message-line">
              {BOOT_GATE_COPY.personalMessage[0]}
            </p>
            <p className="garden-landing-message-line">
              {BOOT_GATE_COPY.personalMessage[1]}
            </p>
          </div>

          <button
            id="boot-gate-primary-btn"
            type="button"
            className="garden-entry-link"
            onClick={handleEntry}
            aria-label={BOOT_GATE_COPY.entryAction}
          >
            <span className="entry-text">Come have a look</span>{' '}
            <span className="entry-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};
