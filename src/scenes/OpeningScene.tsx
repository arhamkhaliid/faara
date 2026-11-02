import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OPENING_COPY } from '../copy';
import type { SceneProps } from '../types';

type SelectedChoice = 'letsSee' | 'whoIsWe' | null;

export const OpeningScene: React.FC<SceneProps> = ({ onNavigate }) => {
  const [deliveryStage, setDeliveryStage] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<SelectedChoice>(null);
  const [whoIsWeBeatsRevealed, setWhoIsWeBeatsRevealed] = useState<number>(0);
  const [isTransitioningToHub, setIsTransitioningToHub] = useState<boolean>(false);

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

  // Timed delivery of the opening dialogue beats
  useEffect(() => {
    // Stage 1: Reveal body after ~1300ms pause
    safeTimeout(() => {
      setDeliveryStage(prev => Math.max(prev, 1));
    }, 1300);

    // Stage 2: Reveal status label after ~2500ms
    safeTimeout(() => {
      setDeliveryStage(prev => Math.max(prev, 2));
    }, 2500);

    // Stage 3: Reveal choice buttons after text has had time to land (~3700ms)
    safeTimeout(() => {
      setDeliveryStage(prev => Math.max(prev, 3));
    }, 3700);
  }, [safeTimeout]);

  // Click anywhere on speech card to reveal all stages instantly
  const handleSkipPacing = () => {
    if (deliveryStage < 3) {
      setDeliveryStage(3);
    }
  };

  const handleSelectChoice = (choice: 'letsSee' | 'whoIsWe') => {
    setSelectedChoice(choice);

    if (choice === 'whoIsWe') {
      setWhoIsWeBeatsRevealed(1);
      safeTimeout(() => setWhoIsWeBeatsRevealed(2), 350);
      safeTimeout(() => setWhoIsWeBeatsRevealed(3), 750);
    }
  };

  const handleProceedToControlRoom = () => {
    if (isTransitioningToHub) return;
    setIsTransitioningToHub(true);

    // Smooth visual transition into the Control Room
    safeTimeout(() => {
      onNavigate('control-room');
    }, 650);
  };

  return (
    <section className="garden-story-hud" aria-label="Opening Narrative">
      <div className={`story-plaque-wrapper ${isTransitioningToHub ? 'transitioning-out' : ''}`}>
        <div className="story-plaque-card">
          {/* Skip Pace Action */}
          {deliveryStage < 3 && (
            <div className="opening-skip-pace-wrap">
              <button
                type="button"
                className="romantic-skip-btn"
                onClick={handleSkipPacing}
                aria-label="Skip pacing"
              >
                Skip pace ✧
              </button>
            </div>
          )}

          {/* Narrative Dialogue Section */}
          <div className="story-plaque-body">
            {/* Story Message Card with Frosted Glassmorphism */}
            <div
              className="romantic-dialogue-content"
              onClick={handleSkipPacing}
              title={deliveryStage < 3 ? 'Click to reveal all' : undefined}
              role="region"
              aria-label="Opening Message"
            >
              <h2 className="romantic-lead-quote fade-in-beat">
                {OPENING_COPY.lead}
              </h2>

              {deliveryStage >= 1 && (
                <p className="romantic-opening-body fade-in-beat">
                  {OPENING_COPY.body}
                </p>
              )}

              {deliveryStage >= 2 && (
                <div className="romantic-status-pill fade-in-beat">
                  <span className="status-sparkle-dot pulse">✧</span>
                  <span className="status-text">{OPENING_COPY.status}</span>
                </div>
              )}
            </div>

            {/* Interactive Response Choices */}
            {deliveryStage >= 3 && (
              <div className="romantic-choice-section fade-in-beat">
                <span className="choice-label">Choose your response:</span>
                <div className="romantic-choice-grid">
                  <button
                    type="button"
                    className={`btn btn-romantic-choice ${selectedChoice === 'letsSee' ? 'selected' : ''}`}
                    onClick={() => handleSelectChoice('letsSee')}
                  >
                    <span>{OPENING_COPY.choices.letsSee.button}</span>
                    <span className="choice-arrow">→</span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-romantic-choice ${selectedChoice === 'whoIsWe' ? 'selected' : ''}`}
                    onClick={() => handleSelectChoice('whoIsWe')}
                  >
                    <span>{OPENING_COPY.choices.whoIsWe.button}</span>
                    <span className="choice-arrow">→</span>
                  </button>
                </div>
              </div>
            )}

            {/* System Replies */}
            {selectedChoice === 'letsSee' && (
              <div className="romantic-reply-box fade-in-beat" role="region" aria-label="System Response">
                <span className="reply-eyebrow">SYSTEM CONFESSION ✧</span>
                <p className="reply-message">{OPENING_COPY.choices.letsSee.response}</p>
              </div>
            )}

            {selectedChoice === 'whoIsWe' && (
              <div className="romantic-reply-box fade-in-beat" role="region" aria-label="System Response">
                <span className="reply-eyebrow">TEAM CLARIFICATION ✧</span>
                <div className="reply-beats-stack">
                  {OPENING_COPY.choices.whoIsWe.responseBeats.slice(0, whoIsWeBeatsRevealed).map((beat, index) => (
                    <p key={index} className="reply-beat-line fade-in-beat">
                      <span className="beat-star">✧</span> {beat}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Continue Action */}
            {deliveryStage >= 3 && (
              <div className="romantic-action-row fade-in-beat">
                <button
                  type="button"
                  className="btn btn-romantic-primary"
                  onClick={handleProceedToControlRoom}
                >
                  <span>{OPENING_COPY.continueButton}</span>
                  <span className="btn-sparkle">✧</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
