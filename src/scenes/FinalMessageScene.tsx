import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { FINAL_MESSAGE_COPY } from '../copy';
import type { SceneProps } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { isWebGLAvailable } from '../utils/webgl';
import { FloatingPetals } from '../components/world/FloatingPetals';

interface FallbackPetal {
  id: number;
  left: string;
  delay: string;
  duration: string;
  scale: number;
}

export const FinalMessageScene: React.FC<SceneProps> = ({ onNavigate }) => {
  // Steps:
  // 0: Greeting ("Faara,")
  // 1..7: Paragraphs 1 to 7
  // 8: Signoff ("Happy birthday, Faara. ❤️")
  // 9: "One last thing…" button appears
  const [step, setStep] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const prefersReducedMotion = useReducedMotion();
  const [webGLSupported] = useState<boolean>(() => isWebGLAvailable());

  const lastAdvanceTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const { greeting, paragraphs, signOff, nextButton: nextButtonText } = FINAL_MESSAGE_COPY;
  const paragraphCount = paragraphs.length; // 7
  const signOffStep = paragraphCount + 1; // 8
  const maxStep = paragraphCount + 2; // 9

  // CSS fallback petals for non-WebGL environments (identical palette & motion)
  const fallbackPetals = useMemo<FallbackPetal[]>(() => {
    const list: FallbackPetal[] = [];
    for (let i = 0; i < 24; i++) {
      list.push({
        id: i,
        left: `${(i * 4.3 + 3) % 94}%`,
        delay: `${((i * 1.3) % 11).toFixed(1)}s`,
        duration: `${(10 + (i % 6) * 1.8).toFixed(1)}s`,
        scale: Number((0.65 + ((i * 7) % 8) * 0.08).toFixed(2)),
      });
    }
    return list;
  }, []);

  // Timed progression state machine
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    let delayMs = 0;
    if (step === 0) {
      delayMs = 2400; // Greeting -> P1
    } else if (step >= 1 && step <= paragraphCount) {
      const pText = paragraphs[step - 1];
      // Adaptive reading delay based on paragraph length
      delayMs = Math.min(4200, Math.max(2600, Math.round(pText.length * 20)));
    } else if (step === signOffStep) {
      delayMs = 2800; // Signoff -> Button reveal
    }

    if (delayMs > 0 && step < maxStep) {
      timerRef.current = window.setTimeout(() => {
        setStep(prev => Math.min(prev + 1, maxStep));
      }, delayMs);
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [step, paragraphCount, paragraphs, signOffStep, maxStep]);

  // Smoothly scroll down as new content beats appear
  useEffect(() => {
    if (step > 0 && scrollAreaRef.current) {
      const el = scrollAreaRef.current;
      const targetScroll = el.scrollHeight - el.clientHeight;
      if (targetScroll > 0) {
        el.scrollTo({
          top: targetScroll,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    }
  }, [step, prefersReducedMotion]);

  // Tap / Click to advance early
  const handleSceneClick = useCallback((e: React.MouseEvent) => {
    // If the click is on the final action button, do not intercept
    const target = e.target as HTMLElement | null;
    if (target?.closest('.btn-one-last-thing')) {
      return;
    }

    const now = Date.now();
    // 250ms cooldown to prevent accidental double-tap skips
    if (now - lastAdvanceTimeRef.current < 250) {
      return;
    }
    lastAdvanceTimeRef.current = now;

    if (step < maxStep) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setStep(prev => Math.min(prev + 1, maxStep));
    }
  }, [step, maxStep]);

  // Handler for "One last thing…" button
  const handleNextScene = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransitioning) return;
    setIsTransitioning(true);

    try {
      onNavigate('fake-crash');
    } catch (err) {
      console.error('Failed to navigate to fake-crash:', err);
      setIsTransitioning(false);
    }
  }, [isTransitioning, onNavigate]);

  return (
    <div
      className={`final-message-scene-full ${prefersReducedMotion ? 'reduced-motion' : ''}`}
      onClick={handleSceneClick}
      role="region"
      aria-label="Final Birthday Message"
    >
      {/* ========================================================
          1. Full-Screen Romantic Twilight Garden Terrace Backdrop
          ======================================================== */}
      <div className="final-terrace-backdrop" aria-hidden="true">
        <img
          src="/environment/final_terrace_bg.jpg"
          alt=""
          className="final-terrace-img"
          loading="eager"
        />
        <div className="final-terrace-overlay" />
      </div>

      <div className="cinematic-starlight-glow" aria-hidden="true" />

      {/* ========================================================
          2. Falling Rose Petals Layer (matching earlier garden scenes)
             Petals fall naturally from top to bottom with gentle sway
          ======================================================== */}
      <div className="final-message-petals-canvas" aria-hidden="true">
        {webGLSupported ? (
          <Canvas
            camera={{ position: [0, 1.55, 4.8], fov: 46 }}
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            }}
          >
            <FloatingPetals
              count={65}
              reducedMotion={prefersReducedMotion}
              showButterflies={false}
            />
          </Canvas>
        ) : (
          <div className="fallback-petals-container">
            {fallbackPetals.map(p => (
              <span
                key={p.id}
                className="ambient-petal"
                style={{
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                  ['--petal-scale' as string]: p.scale,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          3. Cinematic Warm Cream Serif Letter Typography
          ======================================================== */}
      <div className="final-letter-scroll-area" ref={scrollAreaRef}>
        <article className="final-letter-content">
          {/* Beat 0: Greeting */}
          {step >= 0 && (
            <h1 className="final-letter-greeting fade-in-beat">
              {greeting}
            </h1>
          )}

          {/* Beats 1 to 7: Paragraphs */}
          {paragraphs.map((p, idx) => {
            const beatStep = idx + 1;
            if (step < beatStep) return null;
            return (
              <p key={idx} className="final-letter-p fade-in-beat">
                {p}
              </p>
            );
          })}

          {/* Beat 8: Signoff */}
          {step >= signOffStep && (
            <div className="final-letter-signoff fade-in-beat">
              {signOff}
            </div>
          )}

          {/* Beat 9: Small Understated "One last thing…" Button */}
          {step >= maxStep && (
            <div className="final-button-container fade-in-beat">
              <button
                type="button"
                className="btn-one-last-thing"
                onClick={handleNextScene}
                disabled={isTransitioning}
                aria-label={nextButtonText}
              >
                <span>{nextButtonText}</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </article>

        {/* Subtle non-intrusive tap prompt while reading */}
        {step < maxStep && (
          <div className="tap-advance-hint" aria-hidden="true">
            tap anywhere to continue
          </div>
        )}
      </div>
    </div>
  );
};
