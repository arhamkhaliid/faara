import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CERTIFICATE_COPY, CONTROL_ROOM_COPY } from '../copy';
import type { SceneProps } from '../types';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const CertificateScene: React.FC<SceneProps> = ({ onNavigate }) => {
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [signatureType, setSignatureType] = useState<'none' | 'drawn' | 'typed'>('none');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);
  const pointsCount = useRef<number>(0);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const stampTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefersReducedMotion = useReducedMotion();

  // Resize canvas according to device pixel ratio
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#2b1432';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  // Clean up any pending stamp timer on unmount
  useEffect(() => {
    return () => {
      if (stampTimerRef.current) {
        clearTimeout(stampTimerRef.current);
        stampTimerRef.current = null;
      }
    };
  }, []);

  // Schedule official stamp reveal with exactly 2000ms delay after signature completion
  const triggerStampSequence = useCallback(() => {
    // Prevent duplicate timers or repeated stamp animations
    if (stampTimerRef.current !== null || isApproved) return;

    stampTimerRef.current = setTimeout(() => {
      setIsApproved(true);
      stampTimerRef.current = null;
    }, 2000);
  }, [isApproved]);

  // Pointer event handlers for drawing
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const pos = getCanvasPos(e);
    lastPos.current = pos;
    pointsCount.current = 1;

    // Draw initial dot
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#2b1432';
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
    pointsCount.current += 1;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (pointsCount.current >= 3) {
      setSignatureType('drawn');
      triggerStampSequence();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  // "Sign for me" fallback
  const handleSignForMe = useCallback(() => {
    if (isApproved) return;
    if (stampTimerRef.current) {
      clearTimeout(stampTimerRef.current);
      stampTimerRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureType('typed');
    triggerStampSequence();
  }, [isApproved, triggerStampSequence]);

  // Clear signature control
  const handleClear = useCallback(() => {
    // Cancel pending stamp timer if any
    if (stampTimerRef.current) {
      clearTimeout(stampTimerRef.current);
      stampTimerRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    pointsCount.current = 0;
    setSignatureType('none');
    setIsApproved(false);
  }, []);

  // Keepsake image export / download
  const handleDownloadKeepsake = useCallback(() => {
    try {
      setIsExporting(true);
      // Create high-res offscreen canvas
      const width = 1200;
      const height = 860;
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');

      // 1. Warm parchment ivory background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#fefbf6');
      bgGrad.addColorStop(0.5, '#f8f2e6');
      bgGrad.addColorStop(1, '#faf4e9');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Double gold ornamental border
      ctx.strokeStyle = '#d4af66';
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      ctx.strokeStyle = '#ecd09b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(46, 46, width - 92, height - 92);

      // Corner flourishes
      ctx.fillStyle = '#c89e4e';
      ctx.font = '22px serif';
      ctx.fillText('✦', 54, 70);
      ctx.fillText('✦', width - 74, 70);
      ctx.fillText('✦', 54, height - 58);
      ctx.fillText('✦', width - 74, height - 58);

      // 3. Header & Form info
      ctx.fillStyle = '#6e5436';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(CERTIFICATE_COPY.department, width / 2, 95);

      ctx.fillStyle = '#8f7759';
      ctx.font = 'italic 13.5px "Lora", serif';
      ctx.fillText(CERTIFICATE_COPY.formNumber, width / 2, 120);

      // Decorative divider
      ctx.strokeStyle = '#e6c888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 200, 138);
      ctx.lineTo(width / 2 + 200, 138);
      ctx.stroke();

      // 4. Title
      ctx.fillStyle = '#2d1830';
      ctx.font = 'bold 30px "Playfair Display", Georgia, serif';
      ctx.fillText(CERTIFICATE_COPY.title, width / 2, 195);

      // 5. Recipient
      ctx.fillStyle = '#5a3861';
      ctx.font = 'italic 20px "Playfair Display", Georgia, serif';
      ctx.fillText('This certificate is presented to', width / 2, 245);

      ctx.fillStyle = '#a6264c';
      ctx.font = 'bold 44px "Playfair Display", Georgia, serif';
      ctx.fillText(CERTIFICATE_COPY.recipientName, width / 2, 305);

      // 6. Body text with word wrap
      ctx.fillStyle = '#2b1b2f';
      ctx.font = '18px/1.6 "Lora", Georgia, serif';
      const maxWidth = 940;
      const words = CERTIFICATE_COPY.body.split(' ');
      let line = '';
      let y = 360;
      for (const n of words) {
        const testLine = line + n + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, width / 2, y);
          line = n + ' ';
          y += 32;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, width / 2, y);

      // 7. Formal clauses line (Status, Validity, Issued By)
      const clauseY = y + 50;
      ctx.strokeStyle = '#e6c888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(140, clauseY - 14);
      ctx.lineTo(width - 140, clauseY - 14);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#6e4e2a';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('OFFICIALLY CERTIFIED:', width / 2, clauseY + 2);

      ctx.fillStyle = '#2b1428';
      ctx.font = 'italic 15px "Lora", Georgia, serif';
      ctx.fillText(`“${CERTIFICATE_COPY.qualification}”`, width / 2, clauseY + 24);

      ctx.font = '12.5px "Outfit", sans-serif';
      ctx.fillStyle = '#7a5a3a';
      ctx.fillText(
        `VALIDITY: ${CERTIFICATE_COPY.validity}    ✦    ISSUED BY: ${CERTIFICATE_COPY.issuedBy}`,
        width / 2,
        clauseY + 48
      );

      ctx.strokeStyle = '#e6c888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(140, clauseY + 64);
      ctx.lineTo(width - 140, clauseY + 64);
      ctx.stroke();

      // 8. Signature Area
      const sigY = clauseY + 95;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#44224c';
      ctx.font = 'italic 12.5px "Lora", serif';
      ctx.fillText(CERTIFICATE_COPY.terms, 120, sigY + 65);

      // Signature line
      ctx.strokeStyle = '#2b1b2f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(120, sigY + 40);
      ctx.lineTo(440, sigY + 40);
      ctx.stroke();

      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#75586d';
      ctx.fillText('SIGNATURE OF RECIPIENT', 120, sigY + 55);

      // Draw signature (drawn or typed)
      if (signatureType === 'drawn' && canvasRef.current) {
        ctx.drawImage(canvasRef.current, 120, sigY - 45, 320, 80);
      } else {
        ctx.fillStyle = '#2b1432';
        ctx.font = '42px "Caveat", cursive';
        ctx.fillText(CERTIFICATE_COPY.recipientName, 150, sigY + 30);
      }

      // 9. Official Stamped Seal (tilted impact look)
      ctx.save();
      ctx.translate(width - 240, sigY + 15);
      ctx.rotate((-12 * Math.PI) / 180);

      // Stamp double border
      ctx.strokeStyle = '#b82432';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(-120, -40, 240, 80);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-114, -34, 228, 68);

      ctx.fillStyle = '#b82432';
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText('★ OFFICIAL SEAL ★', 0, -8);
      ctx.font = '900 18px "Outfit", sans-serif';
      ctx.fillText(CERTIFICATE_COPY.stamp, 0, 18);
      ctx.restore();

      // Export as PNG
      const dataUrl = offscreen.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'FAARA_EXE_Official_Certificate.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportNotice('Keepsake saved to downloads!');
      setTimeout(() => setExportNotice(null), 3500);
    } catch {
      // Safe fallback: trigger window.print so user can save PDF or print
      setExportNotice('Opening printable certificate view...');
      window.print();
      setTimeout(() => setExportNotice(null), 3500);
    } finally {
      setIsExporting(false);
    }
  }, [signatureType]);

  return (
    <section className="garden-certificate-hud" aria-label="Official Certificate Module">
      <div className="certificate-hud-wrapper">
        {/* Parchment Keepsake Certificate */}
        <article
          className={`certificate-keepsake-parchment ${
            isApproved && !prefersReducedMotion ? 'parchment-impact-active' : ''
          }`}
          aria-label={CERTIFICATE_COPY.title}
        >
          {/* Gold corner ornaments */}
          <span className="cert-corner corner-top-left" aria-hidden="true">✦</span>
          <span className="cert-corner corner-top-right" aria-hidden="true">✦</span>
          <span className="cert-corner corner-bottom-left" aria-hidden="true">✦</span>
          <span className="cert-corner corner-bottom-right" aria-hidden="true">✦</span>

          {/* Certificate Inner Border */}
          <div className="cert-inner-frame">
            {/* Header / Department Banner */}
            <div className="cert-top-banner">
              <span className="cert-department-text">{CERTIFICATE_COPY.department}</span>
              <span className="cert-form-number">{CERTIFICATE_COPY.formNumber}</span>
              <div className="cert-gold-rule"></div>
            </div>

            {/* Title & Recipient */}
            <div className="cert-presentation-header">
              <h2 className="cert-headline">{CERTIFICATE_COPY.title}</h2>
              <p className="cert-present-lead">This certificate is officially presented to</p>
              <h3 className="cert-recipient-name">{CERTIFICATE_COPY.recipientName}</h3>
            </div>

            {/* Body */}
            <p className="cert-body-narrative">{CERTIFICATE_COPY.body}</p>

            {/* Formal Certificate Clauses (Integrated into document text, no dashboard cards) */}
            <div className="cert-formal-clauses">
              <div className="cert-clause-lead-line">
                <span className="clause-formal-label">OFFICIALLY CERTIFIED:</span>
                <span className="clause-formal-text">{CERTIFICATE_COPY.qualification}</span>
              </div>
              <div className="cert-clause-subline">
                <div className="clause-subline-item">
                  <span className="clause-formal-label">VALIDITY:</span>
                  <span className="clause-formal-text">{CERTIFICATE_COPY.validity}</span>
                </div>
                <span className="clause-subline-bullet" aria-hidden="true">✦</span>
                <div className="clause-subline-item">
                  <span className="clause-formal-label">ISSUED BY:</span>
                  <span className="clause-formal-text">{CERTIFICATE_COPY.issuedBy}</span>
                </div>
              </div>
            </div>

            {/* Signature & Seal Zone */}
            <div className="cert-signing-zone">
              {/* Left Column: Signature Canvas / Cursive Output */}
              <div className="cert-signature-column">
                <div className="cert-signature-surface">
                  {signatureType === 'typed' ? (
                    <div className="cert-typed-signature" aria-label="Typed signature Faara">
                      {CERTIFICATE_COPY.recipientName}
                    </div>
                  ) : (
                    <canvas
                      ref={canvasRef}
                      className="cert-signature-canvas"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      aria-label="Draw your signature here with finger or mouse"
                    />
                  )}

                  {signatureType === 'none' && (
                    <span className="cert-canvas-hint" aria-hidden="true">
                      Sign with finger or mouse
                    </span>
                  )}
                </div>

                <div className="cert-signature-baseline"></div>

                <div className="cert-signature-controls-row">
                  <span className="cert-signature-label">SIGNATURE OF RECIPIENT</span>

                  <div className="cert-signature-actions">
                    <button
                      type="button"
                      className="btn-cert-mini"
                      onClick={handleSignForMe}
                      title="Use elegant handwriting script fallback"
                    >
                      <span>✍️</span> {CERTIFICATE_COPY.actions.signForMe}
                    </button>

                    <button
                      type="button"
                      className="btn-cert-mini"
                      onClick={handleClear}
                      title="Clear signature to sign again"
                    >
                      {CERTIFICATE_COPY.actions.clear}
                    </button>
                  </div>
                </div>

                <p className="cert-terms-notice">{CERTIFICATE_COPY.terms}</p>
              </div>

              {/* Right Column: Official Seal / Stamp */}
              <div className="cert-seal-column">
                {isApproved ? (
                  <div
                    className={`cert-official-stamp ${
                      prefersReducedMotion ? 'stamp-instant' : 'stamp-animated'
                    }`}
                    role="status"
                    aria-label={CERTIFICATE_COPY.stamp}
                  >
                    <div className="stamp-inner-border">
                      <span className="stamp-seal-badge">★ OFFICIAL SEAL ★</span>
                      <span className="stamp-main-text">{CERTIFICATE_COPY.stamp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="cert-seal-placeholder" aria-label="Awaiting signature">
                    <div className="placeholder-seal-ring">
                      <span className="placeholder-seal-star">★</span>
                      <span className="placeholder-text">AWAITING SIGNATURE</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Keepsake Export Toast Notice */}
        {exportNotice && (
          <div className="cert-export-toast" role="status">
            <span>✧</span> {exportNotice}
          </div>
        )}

        {/* Global Action Bar */}
        <footer className="certificate-action-footer">
          <button
            type="button"
            className="btn btn-cert-nav-back"
            onClick={() => onNavigate('control-room')}
          >
            <span>← {CONTROL_ROOM_COPY.backButton}</span>
          </button>

          {isApproved && (
            <button
              type="button"
              className="btn btn-cert-download-prominent"
              onClick={handleDownloadKeepsake}
              disabled={isExporting}
            >
              <span>📥 {CERTIFICATE_COPY.actions.download}</span>
              <span className="download-sparkle" aria-hidden="true">✦</span>
            </button>
          )}
        </footer>
      </div>
    </section>
  );
};
