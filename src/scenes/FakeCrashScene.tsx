import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FAKE_CRASH_COPY } from '../copy';
import type { FakeCrashSceneProps } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';

type CrashBeat =
  | 'glitch'          // Beat 1: 0.4s glitch
  | 'silent_pause'    // Beat 2 & 3: Vintage dialog appears, 2.0s silent pause
  | 'reboot_line1'    // Beat 4a: "Error: too much birthday emotion detected."
  | 'reboot_line2'    // Beat 4b: "Restarting with unnecessary confidence…"
  | 'reboot_progress' // Beat 4c: Progress bar jumps directly to 100%
  | 'reboot_done'     // Beat 4d: "Okay, bye now. We have made this weird enough."
  | 'actions';        // Beat 5: Action buttons appear

export const FakeCrashScene: React.FC<FakeCrashSceneProps> = ({
  onNavigate,
  onReplayCake,
}) => {
  const [beat, setBeat] = useState<CrashBeat>('glitch');
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const prefersReducedMotion = useReducedMotion();
  const timerRef = useRef<number | null>(null);

  // Beat progression sequence
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    let nextBeat: CrashBeat | null = null;
    let delayMs = 0;

    switch (beat) {
      case 'glitch':
        nextBeat = 'silent_pause';
        delayMs = prefersReducedMotion ? 50 : 400; // 0.4s controlled glitch
        break;
      case 'silent_pause':
        nextBeat = 'reboot_line1';
        delayMs = 2000; // 2.0s silent pause
        break;
      case 'reboot_line1':
        nextBeat = 'reboot_line2';
        delayMs = 1200;
        break;
      case 'reboot_line2':
        nextBeat = 'reboot_progress';
        delayMs = 800;
        break;
      case 'reboot_progress':
        nextBeat = 'reboot_done';
        delayMs = 1100;
        break;
      case 'reboot_done':
        nextBeat = 'actions';
        delayMs = 900;
        break;
      case 'actions':
      default:
        nextBeat = null;
        break;
    }

    if (nextBeat && delayMs > 0) {
      timerRef.current = window.setTimeout(() => {
        setBeat(nextBeat);
      }, delayMs);
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [beat, prefersReducedMotion]);

  // Handle action buttons
  const handleReplay = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    onReplayCake();
  }, [isNavigating, onReplayCake]);

  const handleBackToControl = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    onNavigate('control-room');
  }, [isNavigating, onNavigate]);

  // Fast-forward / tap-to-advance if user clicks dialog
  const handleDialogClick = useCallback(() => {
    if (beat === 'actions') return;
    // Allow advancing to actions quickly if user clicks
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    if (beat === 'glitch') setBeat('silent_pause');
    else if (beat === 'silent_pause') setBeat('reboot_line1');
    else if (beat === 'reboot_line1') setBeat('reboot_line2');
    else if (beat === 'reboot_line2') setBeat('reboot_progress');
    else if (beat === 'reboot_progress') setBeat('reboot_done');
    else if (beat === 'reboot_done') setBeat('actions');
  }, [beat]);

  const showWindow = beat !== 'glitch';
  const showLine1 = beat === 'reboot_line1' || beat === 'reboot_line2' || beat === 'reboot_progress' || beat === 'reboot_done' || beat === 'actions';
  const showLine2 = beat === 'reboot_line2' || beat === 'reboot_progress' || beat === 'reboot_done' || beat === 'actions';
  const showProgress = beat === 'reboot_progress' || beat === 'reboot_done' || beat === 'actions';
  const showRebootDone = beat === 'reboot_done' || beat === 'actions';
  const showActions = beat === 'actions';

  return (
    <div
      className={`fake-crash-scene-full ${beat === 'glitch' ? 'glitch-active' : ''}`}
      role="region"
      aria-label="System Alert Scene"
      onClick={handleDialogClick}
    >
      {/* Glitch Overlay Effect during Beat 1 */}
      {beat === 'glitch' && (
        <div className="controlled-glitch-overlay" aria-hidden="true" />
      )}

      {/* Deep Midnight Plum Backdrop */}
      <div className="crash-backdrop" aria-hidden="true" />

      {/* ========================================================
          Beat 2: Deliberate In-World Vintage System Dialog
          ======================================================== */}
      {showWindow && (
        <div
          className={`vintage-system-dialog ${beat === 'silent_pause' ? 'dialog-enter-silent' : ''}`}
          role="alertdialog"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-desc"
          onClick={e => e.stopPropagation()}
        >
          {/* Vintage OS Title Bar */}
          <div className="vintage-title-bar">
            <div className="vintage-title-left">
              <span className="vintage-title-icon" aria-hidden="true">⚠️</span>
              <span id="dialog-title" className="vintage-title-text">
                {FAKE_CRASH_COPY.windowTitle}
              </span>
            </div>
            <div className="vintage-window-controls" aria-hidden="true">
              <span className="vintage-close-btn">×</span>
            </div>
          </div>

          {/* Dialog Body */}
          <div className="vintage-body" id="dialog-desc">
            {/* Beat 3 Silent Pause Notice */}
            {beat === 'silent_pause' && (
              <div className="vintage-silent-standby">
                <p className="standby-text">Analyzing unexpected emotional payload…</p>
              </div>
            )}

            {/* Beat 4: Reboot Sequence */}
            {(showLine1 || showLine2 || showProgress || showRebootDone) && (
              <div className="vintage-log-area">
                {showLine1 && (
                  <p className="vintage-log-line line-highlight fade-in-line">
                    &gt; {FAKE_CRASH_COPY.logs[0]}
                  </p>
                )}
                {showLine2 && (
                  <p className="vintage-log-line fade-in-line">
                    &gt; {FAKE_CRASH_COPY.logs[1]}
                  </p>
                )}

                {/* Progress bar jumping directly to 100% */}
                {showProgress && (
                  <div className="vintage-progress-block fade-in-line">
                    <div className="vintage-progress-track">
                      <div className="vintage-progress-fill" style={{ width: '100%' }} />
                    </div>
                    <div className="vintage-progress-label">
                      <span>Status:</span>
                      <span className="status-percent">100% (Instant Recovery)</span>
                    </div>
                  </div>
                )}

                {/* Deadpan final punchline */}
                {showRebootDone && (
                  <p className="vintage-reboot-closing fade-in-line">
                    {FAKE_CRASH_COPY.rebootLine}
                  </p>
                )}
              </div>
            )}

            {/* Beat 5: Final Understated Actions */}
            {showActions && (
              <div className="vintage-actions-row fade-in-line">
                <button
                  type="button"
                  className="vintage-action-btn btn-replay-cake"
                  onClick={handleReplay}
                  disabled={isNavigating}
                >
                  <span className="btn-icon">🎂</span>
                  <span>{FAKE_CRASH_COPY.buttons.replayCake}</span>
                </button>
                <button
                  type="button"
                  className="vintage-action-btn btn-back-control"
                  onClick={handleBackToControl}
                  disabled={isNavigating}
                >
                  <span>{FAKE_CRASH_COPY.buttons.backToControlRoom}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
