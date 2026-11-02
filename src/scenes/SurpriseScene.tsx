import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SceneProps } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';

type SurpriseStage =
  | 'sealed'      // State A: Ivory stationery envelope
  | 'opening'     // Flap opening, seal release, warm champagne radiance
  | 'unfolding'   // Folded newspaper emerging and unfolding to center stage
  | 'frontpage'   // Brief pause on "The Birthday Times" masthead
  | 'turning'     // 3D paper page turn
  | 'revealed';   // State D: Final high-resolution newspaper reveal with zoom & controls

const FINAL_IMAGE_SRC = `${import.meta.env.BASE_URL}images/faara-birthday-newspaper.png`;

export const SurpriseScene: React.FC<SceneProps> = ({ onNavigate }) => {
  const [stage, setStage] = useState<SurpriseStage>(() => {
    if (typeof window !== 'undefined') {
      const stageParam = new URLSearchParams(window.location.search).get('stage') as SurpriseStage | null;
      if (stageParam && ['sealed', 'opening', 'unfolding', 'frontpage', 'turning', 'revealed'].includes(stageParam)) {
        return stageParam;
      }
    }
    return 'sealed';
  });
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prefersReducedMotion = useReducedMotion();

  // Preload the authentic broadsheet image immediately on mount to prevent any flicker
  useEffect(() => {
    const img = new Image();
    img.src = FINAL_IMAGE_SRC;
  }, []);

  // Keyboard accessibility: Escape returns to the garden (or exits zoom first)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onNavigate('control-room');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomed, onNavigate]);

  // Clean up all scheduled timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  // Single-click continuous automated reveal sequence
  const handleUnseal = useCallback(() => {
    if (stage !== 'sealed') return;

    // Reduced motion path: simplified soft dissolve with full reading interval
    if (prefersReducedMotion) {
      setStage('opening');
      const t1 = setTimeout(() => {
        setStage('frontpage');
      }, 500);
      const t2 = setTimeout(() => {
        setStage('revealed');
      }, 3700); // 500ms + 3200ms stationary reading pause
      timersRef.current.push(t1, t2);
      return;
    }

    // Step A: Envelope flap opens & seal releases (0 -> 700ms)
    setStage('opening');

    // Step B: Newspaper emerges from envelope and unfolds into center (700ms -> 1550ms)
    const t1 = setTimeout(() => {
      setStage('unfolding');
    }, 700);

    // Step B.2: Unfolding completes at 1550ms. Front page becomes fully stationary.
    const t2 = setTimeout(() => {
      setStage('frontpage');
    }, 1550);

    // Step C: Minimum 3,000ms reading interval starts at 1550ms and runs to 4800ms (3,250ms).
    // Automatic 3D paper page turn begins at 4800ms.
    const t3 = setTimeout(() => {
      setStage('turning');
    }, 4800);

    // Step D: Transition completes to final interactive viewer (4800ms + 850ms = 5650ms)
    const t4 = setTimeout(() => {
      setStage('revealed');
    }, 5650);

    timersRef.current.push(t1, t2, t3, t4);
  }, [stage, prefersReducedMotion]);

  const handleReturnToGarden = useCallback(() => {
    onNavigate('control-room');
  }, [onNavigate]);

  const handleToggleZoom = useCallback(() => {
    setIsZoomed(prev => !prev);
  }, []);

  const isTransitioning = stage === 'unfolding' || stage === 'frontpage' || stage === 'turning';

  return (
    <section className="newspaper-reveal-hud" aria-label="Surprise Edition">
      {stage !== 'revealed' ? (
        <div className={`surprise-cinematic-stage stage-${stage} ${prefersReducedMotion ? 'reduced-motion' : ''}`}>
          {/* ========================================================
              STATE A — DISCOVERY: Ivory Envelope Presentation
              ======================================================== */}
          {stage !== 'frontpage' && stage !== 'turning' && (
            <div className={`envelope-wrapper ${stage !== 'sealed' ? 'envelope-opened' : ''}`}>
              <div className="envelope-card">
                {/* Flap with gold bevel trim */}
                <div className="envelope-flap" aria-hidden="true">
                  <div className="envelope-flap-inner" />
                  {/* Wax seal that dissolves upon unsealing */}
                  <div className={`envelope-wax-seal ${stage !== 'sealed' ? 'seal-released' : ''}`}>
                    <span className="seal-glyph">✦</span>
                  </div>
                </div>

                {/* Restrained champagne-gold interior radiance */}
                <div className="envelope-interior-glow" aria-hidden="true" />

                {/* Envelope Body Content — strictly non-revealing */}
                <div className="envelope-content">
                  <div className="envelope-monogram" aria-hidden="true">
                    <span className="monogram-gem">✧</span>
                    <span className="monogram-seal-icon">✦</span>
                    <span className="monogram-gem">✧</span>
                  </div>

                  <span className="envelope-eyebrow">A SPECIAL DISPATCH</span>

                  <h2 className="envelope-headline">
                    Something worth remembering has arrived.
                  </h2>

                  <p className="envelope-subtext">
                    Some stories are too special to go untold.
                  </p>

                  <div className="envelope-divider" aria-hidden="true">
                    <span className="divider-line" />
                    <span className="divider-gem">✧</span>
                    <span className="divider-line" />
                  </div>

                  {/* Single Primary Action: Unseal the edition */}
                  <div className="envelope-actions">
                    <button
                      type="button"
                      className="btn-unseal-edition"
                      onClick={handleUnseal}
                      disabled={stage !== 'sealed'}
                      aria-label="Unseal the edition"
                    >
                      <span className="seal-gem">✧</span>
                      <span className="seal-label">Unseal the edition</span>
                      <span className="seal-arrow">→</span>
                    </button>
                  </div>

                  {/* Discreet Return Link */}
                  <div className="envelope-return-wrap">
                    <button
                      type="button"
                      className="btn-discreet-back"
                      onClick={handleReturnToGarden}
                      disabled={stage !== 'sealed'}
                      aria-label="Back to the garden"
                    >
                      ← Back to the garden
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STATE B & C — AUTOMATED NEWSPAPER EMERGENCE & 3D PAGE TURN
              ======================================================== */}
          {isTransitioning && (
            <div
              className={`newspaper-stage-wrapper ${stage === 'turning' ? 'turning-active' : ''}`}
              aria-hidden="true"
            >
              <div className="newspaper-booklet">
                {/* Layer Underneath: The authentic newspaper broadsheet */}
                <div className="newspaper-under-sheet">
                  <img
                    src={FINAL_IMAGE_SRC}
                    alt="The Birthday Edition Newspaper"
                    className="newspaper-image-canvas"
                  />
                  {/* Dynamic optical shadow cast by the turning page */}
                  <div className={`turning-cast-shadow ${stage === 'turning' ? 'shadow-sweeping' : ''}`} />
                </div>

                {/* Layer On Top: The turning front cover with "The Birthday Times" masthead */}
                <div className={`newspaper-turning-page ${stage === 'turning' ? 'page-turning' : ''}`}>
                  {/* Front Face: Polished intentional broadsheet front page */}
                  <div className="page-face page-front">
                    {/* Small edition label */}
                    <div className="broadsheet-edition-tag">
                      <span className="tag-gem">✧</span>
                      <span className="tag-text">SPECIAL PERSONAL EDITION</span>
                      <span className="tag-gem">✧</span>
                    </div>

                    {/* Dominant Masthead */}
                    <h1 className="broadsheet-masthead">The Birthday Times</h1>

                    {/* Date strip with left and right labels */}
                    <div className="broadsheet-date-strip">
                      <span className="date-left">8 November</span>
                      <span className="date-center-ornament">✦</span>
                      <span className="date-right">A Day Worth Celebrating</span>
                    </div>

                    {/* Main headline and supporting copy */}
                    <div className="broadsheet-lead-section">
                      <h2 className="broadsheet-headline">
                        Some stories deserve their own front page.
                      </h2>

                      <p className="broadsheet-supporting-copy">
                        A special edition, prepared with care, for someone who makes ordinary days feel a little less ordinary.
                      </p>
                    </div>

                    <div className="broadsheet-editorial-divider" aria-hidden="true">
                      <span className="editorial-divider-line" />
                      <span className="editorial-divider-gem">✧</span>
                      <span className="editorial-divider-line" />
                    </div>

                    {/* Two restrained editorial details */}
                    <div className="broadsheet-editorial-columns">
                      <div className="editorial-detail-column">
                        <span className="editorial-detail-label">INSIDE THIS EDITION</span>
                        <span className="editorial-detail-value">A story worth keeping</span>
                      </div>
                      <div className="editorial-detail-separator" aria-hidden="true" />
                      <div className="editorial-detail-column">
                        <span className="editorial-detail-label">THE OCCASION</span>
                        <span className="editorial-detail-value">One very special day</span>
                      </div>
                    </div>

                    {/* Small footer */}
                    <div className="broadsheet-footer">
                      <span className="footer-ornament">✦</span>
                      <span className="footer-text">Turn the page to discover the full story.</span>
                      <span className="footer-ornament">✦</span>
                    </div>
                  </div>

                  {/* Back Face: Clean ivory broadsheet reverse side */}
                  <div className="page-face page-back">
                    <div className="page-back-texture" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================
            STATE D — FINAL IMAGE REVEAL & INTERACTION
            ======================================================== */
        <div
          className="newspaper-viewer-overlay fade-in-reveal"
          role="dialog"
          aria-modal="true"
          aria-label="Birthday Newspaper Edition"
        >
          {/* Top Floating Utility Navigation */}
          <header className="newspaper-viewer-header">
            <button
              type="button"
              className="btn-newspaper-back"
              onClick={handleReturnToGarden}
              aria-label="Back to the garden"
            >
              <span className="back-arrow">←</span>
              <span className="back-text">Back to the garden</span>
            </button>

            <button
              type="button"
              className="btn-newspaper-zoom"
              onClick={handleToggleZoom}
              aria-label={isZoomed ? 'Fit to screen' : 'Zoom into newspaper'}
            >
              <span className="zoom-icon">{isZoomed ? '⊡' : '⊕'}</span>
              <span className="zoom-text">{isZoomed ? 'Fit screen' : 'Tap to zoom'}</span>
            </button>
          </header>

          {/* Newspaper Display Container */}
          <main className={`newspaper-viewport ${isZoomed ? 'zoomed' : ''}`}>
            <div className="newspaper-frame">
              <img
                src={FINAL_IMAGE_SRC}
                alt="The Birthday Edition Newspaper"
                className="newspaper-image"
                onClick={handleToggleZoom}
                title={isZoomed ? 'Click to fit screen' : 'Click to zoom'}
              />
            </div>
          </main>
        </div>
      )}
    </section>
  );
};
