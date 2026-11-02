import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CAKE_COPY, CONTROL_ROOM_COPY } from '../copy';
import type { CakeSceneProps } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Cake3DCanvas } from '../components/cake/Cake3DCanvas';
import { CakeFallback2D } from '../components/cake/CakeFallback2D';
import { ConfettiBurst } from '../components/cake/ConfettiBurst';
import { isWebGLAvailable } from '../utils/webgl';
import { celebrationAudio } from '../utils/celebrationAudio';

type CakeStage =
  | 'lighting'      // Stage A: Candles waiting to be lit
  | 'wish'          // Stage B/C: "Make a wish." (Strict 10s countdown) -> Blow out candles
  | 'cutting'       // Stage D: Cut the cake (knife slice & separated 3D slice)
  | 'celebration';  // Stage E: Grand celebration (8-12s event), music, bridge copy & "Go on, then."

export const CakeScene: React.FC<CakeSceneProps> = ({
  onNavigate,
  onProceedToFinal,
  hasVisitedSurprise = false,
}) => {
  const [hasWebGL] = useState<boolean>(() => isWebGLAvailable());
  const [stage, setStage] = useState<CakeStage>('lighting');
  const [candle1Lit, setCandle1Lit] = useState<boolean>(false);
  const [candle2Lit, setCandle2Lit] = useState<boolean>(false);
  const [isBlownOut, setIsBlownOut] = useState<boolean>(false);
  const [isCut, setIsCut] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Audio playback is unmuted by default for the grand celebration
  useEffect(() => {
    celebrationAudio.setMuted(false);
  }, []);

  // Stage B (Make a Wish): Strict 10-Second Countdown State
  const [wishCountdown, setWishCountdown] = useState<number>(10);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  // Stage D (Cutting) knife drag state
  const [dragProgress, setDragProgress] = useState<number>(0);
  const isDraggingKnife = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartY = useRef<number>(0);

  // Stage E (Celebration) sub-step: 'success' lasts ~9.5s, then 'bridge' shows single final continue action
  const [celebrationStep, setCelebrationStep] = useState<'success' | 'bridge'>('success');

  const prefersReducedMotion = useReducedMotion();

  // Audio / Mic detection refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // -------------------------------------------------------------
  // Stage A: Candle Lighting Handler
  // -------------------------------------------------------------
  const handleLightCandle = useCallback(
    (index: 0 | 1) => {
      if (stage !== 'lighting') return;

      if (index === 0) {
        setCandle1Lit(true);
        if (candle2Lit) {
          setTimeout(() => {
            setWishCountdown(10);
            setStage('wish');
          }, 600);
        }
      } else if (index === 1) {
        setCandle2Lit(true);
        if (candle1Lit) {
          setTimeout(() => {
            setWishCountdown(10);
            setStage('wish');
          }, 600);
        }
      }
    },
    [stage, candle1Lit, candle2Lit]
  );

  // Check if both candles are lit to trigger transition to Stage B
  useEffect(() => {
    if (candle1Lit && candle2Lit && stage === 'lighting') {
      const timer = setTimeout(() => {
        setWishCountdown(10);
        setStage('wish');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [candle1Lit, candle2Lit, stage]);

  // -------------------------------------------------------------
  // Stage B: Strict 10-Second "Make a Wish" Countdown Timer
  // -------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'wish') return;

    const interval = setInterval(() => {
      setWishCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  // -------------------------------------------------------------
  // Stage C: Stop Microphone & Clean up Web Audio APIs
  // -------------------------------------------------------------
  const stopMicrophone = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsMicActive(false);
  }, []);

  // Always clean up mic and celebration audio when unmounting
  useEffect(() => {
    return () => {
      stopMicrophone();
      celebrationAudio.stop();
    };
  }, [stopMicrophone]);

  // Handle extinguishing both candles (blown out via mic or button)
  const handleBlowOut = useCallback(() => {
    if (isBlownOut) return;
    setIsBlownOut(true);
    stopMicrophone();

    // Transition smoothly into cutting stage
    setTimeout(() => {
      setStage('cutting');
    }, 1300);
  }, [isBlownOut, stopMicrophone]);

  // Optional microphone activation (analyzes volume/frequencies locally, never records)
  const handleEnableMicrophone = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicNotice('Microphone not supported on this browser. Use the Blow out candles button.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setMicNotice('Audio API unavailable. Use the Blow out candles button.');
        return;
      }

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicActive(true);
      setMicNotice('Listening for breath… blow gently toward your device!');

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let sustainedFrames = 0;

      const detectBlow = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);

        let sum = 0;
        for (let i = 2; i < 28; i++) {
          sum += buffer[i];
        }
        const avg = sum / 26;

        if (avg > 52) {
          sustainedFrames++;
          if (sustainedFrames >= 4) {
            handleBlowOut();
            return;
          }
        } else {
          sustainedFrames = Math.max(0, sustainedFrames - 1);
        }

        animFrameRef.current = requestAnimationFrame(detectBlow);
      };

      detectBlow();
    } catch {
      setMicNotice('Microphone access skipped. Use the Blow out candles button below.');
    }
  };

  // -------------------------------------------------------------
  // Stage D & E: Grand Birthday Celebration Execution
  // -------------------------------------------------------------
  const executeCakeCut = useCallback(() => {
    if (isCut) return;
    setIsCut(true);
    setDragProgress(100);
    setShowConfetti(true);

    // Play Grand Birthday Celebration (Happy Birthday celesta melody + warm applause)
    celebrationAudio.playCelebration(false);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // Safe vibration fallback
      }
    }

    // Immediately enter celebration mode
    setStage('celebration');
    setCelebrationStep('success');
  }, [isCut]);

  // Pointer drag along cut line
  const handleCutPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== 'cutting' || isCut) return;
    isDraggingKnife.current = true;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
  };

  const handleCutPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingKnife.current || isCut) return;
    const diffX = e.clientX - dragStartX.current;
    const diffY = e.clientY - dragStartY.current;
    const travel = Math.max(diffX, diffY, (diffX + diffY) * 0.7);
    const progress = Math.min(100, Math.max(0, (travel / 140) * 100));
    setDragProgress(progress);

    if (progress >= 65) {
      isDraggingKnife.current = false;
      executeCakeCut();
    }
  };

  const handleCutPointerUp = () => {
    if (isDraggingKnife.current) {
      isDraggingKnife.current = false;
      if (dragProgress < 65) {
        setDragProgress(0);
      }
    }
  };

  // -------------------------------------------------------------
  // Stage E: Sustained Celebration (9.5s event) -> Bridge Transition
  // -------------------------------------------------------------
  useEffect(() => {
    if (stage === 'celebration') {
      const timer = setTimeout(() => {
        setCelebrationStep('bridge');
      }, 9500);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <section className="garden-cake-hud" aria-label="Cut the Cake Celebration Module">
      {/* Grand Multi-Wave Celebration Confetti Shower (11.5s total) */}
      {showConfetti && <ConfettiBurst />}

      <div className="cake-hud-wrapper">
        {/* Discreet Back to Control Room Action (Top-Left corner) */}
        <button
          type="button"
          className="cake-discreet-back"
          onClick={() => onNavigate('control-room')}
          title="Return to Control Room"
          aria-label="Back to Control Room"
        >
          <span>← {CONTROL_ROOM_COPY.backButton}</span>
        </button>

        {/* Central Viewport Spacer to let the cake shine as the hero */}
        <div className="cake-center-view-spacer" aria-hidden="true" />

        {/* =======================================================
            Interactive Prompts & Controls by Stage
            Minimalist floating overlay, unobtrusive, no bulky decorative cards
            ======================================================= */}
        <div className="cake-interactive-overlay">
          {/* Stage A: Lighting the two candles */}
          {stage === 'lighting' && (
            <div className="prompt-flow-lighting">
              <h3 className="prompt-title">Light the candles to begin</h3>
              <p className="prompt-subtitle">
                Two little flames. One very special birthday.
              </p>

              <div className="candle-ignition-control-row">
                <button
                  type="button"
                  className={`btn-candle-touch ${candle1Lit ? 'is-lit' : 'is-unlit'}`}
                  onClick={() => handleLightCandle(0)}
                  aria-label={`First Candle, ${candle1Lit ? 'lit' : 'light the first candle'}`}
                >
                  <span>{candle1Lit ? '🔥' : '🕯️'}</span>
                  <span>{candle1Lit ? 'First Candle Lit' : 'Light the First Candle'}</span>
                </button>

                <button
                  type="button"
                  className={`btn-candle-touch ${candle2Lit ? 'is-lit' : 'is-unlit'}`}
                  onClick={() => handleLightCandle(1)}
                  aria-label={`Second Candle, ${candle2Lit ? 'lit' : 'light the second candle'}`}
                >
                  <span>{candle2Lit ? '🔥' : '🕯️'}</span>
                  <span>{candle2Lit ? 'Second Candle Lit' : 'Light the Second Candle'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Stage B & C: Make a wish (10-second countdown) and blow out candles */}
          {stage === 'wish' && (
            <div className="prompt-flow-wish">
              {isBlownOut ? (
                <div className="wish-blown-feedback">
                  <h3 className="prompt-title">✨ Wish Sealed in the Stars ✨</h3>
                  <p className="prompt-subtitle">
                    The flames fade into rising wisps of smoke… preparing the golden knife…
                  </p>
                </div>
              ) : wishCountdown > 0 ? (
                /* Strict 10-second countdown for "Make a wish" */
                <div className="wish-quiet-moment">
                  <h3 className="wish-moment-headline">{CAKE_COPY.makeAWish}</h3>
                  <p className="wish-quiet-subtitle">
                    Take a quiet moment, and make a wish...
                  </p>

                  {/* Visual Progress Countdown Indicator */}
                  <div className="wish-countdown-track" aria-hidden="true">
                    <div
                      className="wish-countdown-bar"
                      style={{ width: `${((10 - wishCountdown) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                /* Countdown elapsed (full 10 seconds): Reveal Blow Controls */
                <>
                  <h3 className="prompt-title">Blow out the candles.</h3>
                  <p className="prompt-subtitle">
                    One little breath. One very special birthday.
                  </p>

                  <div className="wish-action-row">
                    <button
                      type="button"
                      className="btn-cake-action-blow"
                      onClick={handleBlowOut}
                      title="Blow out both candles immediately"
                      aria-label="Blow out candles"
                    >
                      <span>💨 Blow out candles</span>
                    </button>

                    {!isMicActive ? (
                      <button
                        type="button"
                        className="btn-cake-mic-enable"
                        onClick={handleEnableMicrophone}
                        title="Enable breath detection through your microphone"
                        aria-label="Enable Microphone"
                      >
                        <span>🎙️ Enable Microphone</span>
                      </button>
                    ) : (
                      <span className="mic-listening-badge">
                        <span className="mic-pulse-dot" /> Listening for blow…
                      </span>
                    )}
                  </div>

                  {micNotice && (
                    <p className="mic-status-hint">{micNotice}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Stage D: Cut the Cake - Consistent bottom-center placement near lower edge */}
          {stage === 'cutting' && (
            <div className="prompt-flow-cut">
              <h3 className="prompt-title">Make the first cut.</h3>
              <p className="prompt-subtitle">{CAKE_COPY.cutPrompt}</p>
            </div>
          )}

          {/* Stage E: Sustained Celebration (8-12s event) & Single Bridge Action */}
          {stage === 'celebration' && (
            <div className="prompt-flow-celebration">
              {celebrationStep === 'success' ? (
                <div className="celebration-hero-block">
                  <h3 className="celebration-grand-title">✨ Happy 22nd Birthday, Faara! ✨</h3>
                  <p className="celebration-success-text">{CAKE_COPY.cutSuccess}</p>
                  <p className="celebration-event-subtext">
                    The first slice has been cut. Enjoy this moment!
                  </p>
                </div>
              ) : (
                /* Unboxed Bridge Step: NO large card container, SINGLE continue button */
                <div className="celebration-bridge-hero">
                  <h3 className="celebration-bridge-headline">One Last Message</h3>
                  <p className="celebration-bridge-line">
                    {hasVisitedSurprise ? CAKE_COPY.bridgeAlternate : CAKE_COPY.bridgeStandard}
                  </p>

                  <button
                    type="button"
                    className="btn-cake-proceed-final"
                    onClick={onProceedToFinal}
                    title="Read my message"
                    aria-label="Read my message"
                  >
                    <span>{CAKE_COPY.bridgeButton}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =======================================================
          Dedicated 3D Celebration Canvas & Viewport Backdrop
          ======================================================= */}
      <div className="cake-stage-container">
        {/* Full-Screen Classical Sunset Garden Terrace Chamber Backdrop */}
        <div className="cake-chamber-backdrop" aria-hidden="true">
          <img
            src="/environment/cake_chamber_bg.jpg"
            alt=""
            className="cake-chamber-backdrop-img"
            draggable={false}
          />
          <div className="cake-chamber-backdrop-vignette" />
        </div>

        {hasWebGL ? (
          <Cake3DCanvas
            candle1Lit={candle1Lit}
            candle2Lit={candle2Lit}
            onLightCandle={handleLightCandle}
            isBlownOut={isBlownOut}
            isCut={isCut}
            stage={stage}
            dragProgress={dragProgress}
            reducedMotion={prefersReducedMotion}
            onCanvasPointerDown={handleCutPointerDown}
            onCanvasPointerMove={handleCutPointerMove}
            onCanvasPointerUp={handleCutPointerUp}
          />
        ) : (
          <CakeFallback2D
            candle1Lit={candle1Lit}
            candle2Lit={candle2Lit}
            onLightCandle={handleLightCandle}
            isBlownOut={isBlownOut}
            isCut={isCut}
          />
        )}
      </div>
    </section>
  );
};
