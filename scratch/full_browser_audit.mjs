import { spawn } from 'child_process';
import fs from 'fs';

const port = 9279;

async function runAudit() {
  console.log('=== STARTING FAARA.EXE AUTOMATED FULL-EXPERIENCE BROWSER AUDIT ===\n');

  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=1280,800',
      '--incognito',
      `http://localhost:5173/?_t=${Date.now()}`,
    ]
  );

  let target = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch(`http://localhost:${port}/json`);
      const pages = await res.json();
      target = pages.find((p) => p.url.includes('5173'));
      if (target) break;
    } catch {}
  }

  if (!target) {
    chrome.kill();
    throw new Error('Chrome remote debugging target not found');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const consoleLogs = [];
  const errors = [];
  const failedRequests = [];

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
      consoleLogs.push({ type: data.params.type, text });
      if (data.params.type === 'error') {
        errors.push(text);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      errors.push(data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || ''));
    }
    if (data.method === 'Network.loadingFailed') {
      failedRequests.push(data.params);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  const evalInPage = async (expr) => {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error((res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Eval error'));
    }
    return res?.result?.value;
  };

  const waitFor = async (fn, timeoutMs = 8000, intervalMs = 200) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await evalInPage(`(${fn.toString()})()`);
        if (val) return val;
      } catch {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timeout waiting for ${fn.toString()}`);
  };

  const results = {};

  // ==========================================
  // PHASE 4A: BOOT GATE AUDIT
  // ==========================================
  console.log('--- Testing Scene 0: Boot Gate ---');
  await waitFor(() => !!document.querySelector('.garden-hero-title'));

  const bootInitial = await evalInPage(`(() => {
    const prompt = document.querySelector('.prompt-text')?.textContent;
    const title = document.querySelector('.garden-hero-title')?.textContent;
    const skipBtn = document.querySelector('.romantic-skip-btn');
    const startBtn = document.getElementById('boot-gate-primary-btn');
    return { prompt, title, hasSkipBtn: !!skipBtn, hasStartBtn: !!startBtn };
  })()`);

  console.log('Boot Initial State:', bootInitial);
  results.bootInitial = bootInitial;

  // Click start boot
  await evalInPage(`document.getElementById('boot-gate-primary-btn').click()`);
  await new Promise((r) => setTimeout(r, 600));

  const bootMid = await evalInPage(`(() => {
    const whispers = Array.from(document.querySelectorAll('.whisper-item')).map(w => w.textContent.trim());
    const progressNum = document.querySelector('.progress-num')?.textContent;
    const skipBtn = document.querySelector('.romantic-skip-btn');
    return { whispers, progressNum, hasSkipBtn: !!skipBtn };
  })()`);
  console.log('Boot Mid Progress State:', bootMid);
  results.bootMid = bootMid;

  // Test Skip Button
  await evalInPage(`document.querySelector('.romantic-skip-btn')?.click()`);
  
  // ==========================================
  // PHASE 4B: OPENING SEQUENCE AUDIT
  // ==========================================
  console.log('\n--- Testing Scene 1: Opening Sequence ---');
  await waitFor(() => !!document.querySelector('.romantic-lead-quote'));

  // Test tap-to-skip pacing to reveal all beats immediately
  await evalInPage(`(() => {
    const content = document.querySelector('.romantic-dialogue-content');
    if (content) content.click();
  })()`);
  await waitFor(() => document.querySelectorAll('.btn-romantic-choice').length >= 2);

  const openingState = await evalInPage(`(() => {
    const quote = document.querySelector('.romantic-lead-quote')?.textContent;
    const body = document.querySelector('.romantic-opening-body')?.textContent;
    const status = document.querySelector('.romantic-status-pill')?.textContent;
    const choices = Array.from(document.querySelectorAll('.btn-romantic-choice')).map(b => b.textContent.trim());
    return { quote, body, status, choices };
  })()`);
  console.log('Opening State:', openingState);
  results.openingState = openingState;

  // Test Choice: "Let's see"
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-romantic-choice')).find(b => b.textContent.includes("Let's see"));
    if (btn) btn.click();
  })()`);
  await waitFor(() => !!document.querySelector('.reply-message'));

  const letsSeeReply = await evalInPage(`document.querySelector('.reply-message')?.textContent`);
  console.log('Choice "Let\'s see" Reply:', letsSeeReply);
  results.letsSeeReply = letsSeeReply;

  // Test Choice: "Who is 'we'?"
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-romantic-choice')).find(b => b.textContent.includes("Who is 'we'?"));
    if (btn) btn.click();
  })()`);
  await waitFor(() => document.querySelectorAll('.reply-beat-line').length === 3, 3000);

  const whoIsWeBeats = await evalInPage(`Array.from(document.querySelectorAll('.reply-beat-line')).map(b => b.textContent.trim())`);
  console.log('Choice "Who is \'we\'?" Beats:', whoIsWeBeats);
  results.whoIsWeBeats = whoIsWeBeats;

  // Transition to Control Room
  await evalInPage(`(() => {
    const btn = document.querySelector('.btn-romantic-primary');
    if (btn) btn.click();
  })()`);

  // ==========================================
  // PHASE 4C: CONTROL ROOM AUDIT
  // ==========================================
  console.log('\n--- Testing Scene 2: Control Room ---');
  await waitFor(() => !!document.querySelector('.observatory-headline'));
  await new Promise((r) => setTimeout(r, 400)); // allow navigation lock to release

  const controlRoomState = await evalInPage(`(() => {
    const headline = document.querySelector('.observatory-headline')?.textContent;
    const modules = Array.from(document.querySelectorAll('.observatory-module-card')).map(m => {
      const title = m.querySelector('.observatory-card-title')?.textContent;
      const badge = m.querySelector('.observatory-badge')?.textContent;
      const isVisited = m.classList.contains('module-visited');
      return { title, badge, isVisited };
    });
    const exploredPill = document.querySelector('.visited-progress-pill')?.textContent;
    return { headline, modules, exploredPill };
  })()`);
  console.log('Control Room State:', controlRoomState);
  results.controlRoomState = controlRoomState;

  // ==========================================
  // PHASE 4D: SURPRISE MODULE AUDIT
  // ==========================================
  console.log('\n--- Testing Scene 3: Surprise Module ---');
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-observatory-launch')).find(b => b.textContent.includes('Surprise'));
    if (btn) btn.click();
  })()`);

  await waitFor(() => !!document.querySelector('.surprise-alert-text'));

  const surpriseInitial = await evalInPage(`(() => {
    const alert = document.querySelector('.surprise-alert-text')?.textContent;
    const choices = Array.from(document.querySelectorAll('.btn-surprise-choice')).map(b => b.textContent.trim());
    return { alert, choices };
  })()`);
  console.log('Surprise Initial:', surpriseInitial);
  results.surpriseInitial = surpriseInitial;

  // Select "That sounds suspicious."
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-surprise-choice')).find(b => b.textContent.includes('suspicious'));
    if (btn) btn.click();
  })()`);

  // Wait for transition to popups (Popup 1)
  await waitFor(() => !!document.querySelector('.popup-id-badge'));

  const popup1 = await evalInPage(`(() => {
    const title = document.querySelector('.popup-id-badge')?.textContent;
    const text = document.querySelector('.popup-main-text')?.textContent;
    const closeBtn = document.querySelector('.btn-observatory-launch')?.textContent?.trim();
    return { title, text, closeBtn };
  })()`);
  console.log('Popup 1:', popup1);
  results.popup1 = popup1;

  // Advance to Popup 2
  await evalInPage(`document.querySelector('.btn-observatory-launch').click()`);
  await waitFor(() => document.querySelector('.popup-id-badge')?.textContent?.includes('02'));

  const popup2Wait = await evalInPage(`(() => {
    const lead = document.querySelector('.popup-lead-text')?.textContent;
    const punchlineWaiting = document.querySelector('.punchline-waiting-pulse')?.textContent;
    const btnDisabled = document.querySelector('.btn-observatory-launch')?.disabled;
    return { lead, punchlineWaiting, btnDisabled };
  })()`);
  console.log('Popup 2 before pause:', popup2Wait);

  await waitFor(() => !!document.querySelector('.popup-punchline-text'), 3000);
  const popup2Revealed = await evalInPage(`(() => {
    const punchline = document.querySelector('.popup-punchline-text')?.textContent;
    const btnDisabled = document.querySelector('.btn-observatory-launch')?.disabled;
    return { punchline, btnDisabled };
  })()`);
  console.log('Popup 2 after punchline:', popup2Revealed);
  results.popup2 = { ...popup2Wait, ...popup2Revealed };

  // Advance to Popup 3
  await evalInPage(`document.querySelector('.btn-observatory-launch').click()`);
  await waitFor(() => document.querySelector('.popup-id-badge')?.textContent?.includes('03'));

  const dodgeInitial = await evalInPage(`(() => {
    const btn = document.querySelector('.btn-dodging-close');
    return { label: btn?.textContent?.trim(), hasDodgedClass: btn?.classList?.contains('dodged') };
  })()`);

  // First click: Dodges and changes label to "Fine. Close."
  await evalInPage(`document.querySelector('.btn-dodging-close').click()`);
  await new Promise((r) => setTimeout(r, 300));

  const dodgeAfter = await evalInPage(`(() => {
    const btn = document.querySelector('.btn-dodging-close');
    return { label: btn?.textContent?.trim(), hasDodgedClass: btn?.classList?.contains('dodged') };
  })()`);
  console.log('Popup 3 Dodge Test:', { before: dodgeInitial, after: dodgeAfter });
  results.popup3Dodge = { before: dodgeInitial, after: dodgeAfter };

  // Second click: Advances to Popup 4
  await evalInPage(`document.querySelector('.btn-dodging-close').click()`);
  await waitFor(() => document.querySelector('.popup-id-badge')?.textContent?.includes('04'));

  await waitFor(() => !!document.querySelector('.popup-summary-text.revealed'), 3000);
  const popup4 = await evalInPage(`(() => {
    const text = document.querySelector('.popup-summary-text')?.textContent;
    const btnLabel = document.querySelector('.btn-summary-return')?.textContent?.trim();
    return { text, btnLabel };
  })()`);
  console.log('Popup 4:', popup4);
  results.popup4 = popup4;

  // Return to Control Room
  await evalInPage(`document.querySelector('.btn-summary-return').click()`);
  await waitFor(() => !!document.querySelector('.observatory-headline'));
  await new Promise((r) => setTimeout(r, 400));

  const crAfterSurprise = await evalInPage(`document.querySelector('.visited-progress-pill')?.textContent`);
  console.log('Control Room after Surprise:', crAfterSurprise);

  // ==========================================
  // PHASE 4E: CERTIFICATE MODULE AUDIT
  // ==========================================
  console.log('\n--- Testing Scene 4: Certificate Module ---');
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-observatory-launch')).find(b => b.textContent.includes('Certificate'));
    if (btn) btn.click();
  })()`);
  await waitFor(() => !!document.querySelector('.cert-headline'));

  const certContent = await evalInPage(`(() => {
    const dept = document.querySelector('.cert-department-text')?.textContent;
    const formNum = document.querySelector('.cert-form-number')?.textContent;
    const title = document.querySelector('.cert-headline')?.textContent;
    const recipient = document.querySelector('.cert-recipient-name')?.textContent;
    const body = document.querySelector('.cert-body-narrative')?.textContent;
    const qual = document.querySelector('.clause-formal-text')?.textContent;
    const terms = document.querySelector('.cert-terms-notice')?.textContent;
    const stampVisible = !!document.querySelector('.cert-official-stamp');
    return { dept, formNum, title, recipient, body, qual, terms, stampVisible };
  })()`);
  console.log('Certificate Content Verification:', certContent);
  results.certContent = certContent;

  // Test "Sign for me" fallback
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-cert-mini')).find(b => b.textContent.includes('Sign for me'));
    if (btn) btn.click();
  })()`);
  await waitFor(() => !!document.querySelector('.cert-official-stamp'));

  const certApprovedState = await evalInPage(`(() => {
    const stamp = document.querySelector('.cert-official-stamp .stamp-main-text')?.textContent;
    const statusPill = document.querySelector('.cert-status-pill')?.textContent;
    const hasDownloadBtn = !!document.querySelector('.btn-cert-download-prominent');
    return { stamp, statusPill, hasDownloadBtn };
  })()`);
  console.log('Certificate Approved State:', certApprovedState);
  results.certApprovedState = certApprovedState;

  // Test Clear Signature button
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-cert-mini')).find(b => b.textContent.includes('Clear'));
    if (btn) btn.click();
  })()`);
  await waitFor(() => !!document.querySelector('.cert-seal-placeholder'));
  const certClearedState = await evalInPage(`(() => {
    const stamp = !!document.querySelector('.cert-official-stamp');
    const placeholder = !!document.querySelector('.cert-seal-placeholder');
    return { stampVisible: stamp, placeholderVisible: placeholder };
  })()`);
  console.log('Certificate Cleared State:', certClearedState);

  // Re-sign using "Sign for me"
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-cert-mini')).find(b => b.textContent.includes('Sign for me'));
    if (btn) btn.click();
  })()`);
  await waitFor(() => !!document.querySelector('.cert-official-stamp'));

  // Return to Control Room
  await evalInPage(`document.querySelector('.btn-cert-nav-back').click()`);
  await waitFor(() => !!document.querySelector('.observatory-headline'));
  await new Promise((r) => setTimeout(r, 400));

  // ==========================================
  // PHASE 4F: CAKE SCENE AUDIT
  // ==========================================
  console.log('\n--- Testing Scene 5: Cake Scene ---');
  await evalInPage(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn-observatory-launch')).find(b => b.textContent.includes('Cake'));
    if (btn) btn.click();
  })()`);
  await waitFor(() => !!document.querySelector('.cake-minimal-status'));

  const cakeInitial = await evalInPage(`(() => {
    const title = document.querySelector('.cake-minimal-status')?.textContent;
    const promptTitle = document.querySelector('.prompt-title')?.textContent;
    const candleButtons = Array.from(document.querySelectorAll('.btn-candle-touch')).map(b => b.textContent.trim());
    const webglCanvas = !!document.querySelector('.cake-3d-scene-container canvas');
    return { title, promptTitle, candleButtons, webglCanvas };
  })()`);
  console.log('Cake Initial State:', cakeInitial);
  results.cakeInitial = cakeInitial;

  // Light both candles
  await evalInPage(`(() => {
    const btns = document.querySelectorAll('.btn-candle-touch');
    if (btns[0]) btns[0].click();
    if (btns[1]) btns[1].click();
  })()`);

  await waitFor(() => !!document.querySelector('.wish-moment-headline'));
  const wishStage = await evalInPage(`(() => {
    const prompt = document.querySelector('.wish-moment-headline')?.textContent;
    const countdown = document.querySelector('.wish-quiet-subtitle')?.textContent;
    return { prompt, countdown };
  })()`);
  console.log('Wish Countdown Stage:', wishStage);
  results.wishStage = wishStage;

  // Wait for 10s countdown to complete and reveal blow button
  console.log('Waiting for 10s wish countdown to complete...');
  await waitFor(() => !!document.querySelector('.btn-cake-action-blow'), 14000);

  // Click blow button
  await evalInPage(`document.querySelector('.btn-cake-action-blow').click()`);
  await waitFor(() => document.querySelector('.prompt-title')?.textContent?.includes('cut'));

  const cuttingStage = await evalInPage(`(() => {
    const title = document.querySelector('.prompt-title')?.textContent;
    const subtitle = document.querySelector('.prompt-subtitle')?.textContent;
    return { title, subtitle };
  })()`);
  console.log('Cutting Stage:', cuttingStage);
  results.cuttingStage = cuttingStage;

  // Drag knife to cut
  console.log('Executing knife drag cut interaction...');
  await evalInPage(`(() => {
    const canvas = document.querySelector('.cake-3d-scene-container') || document.querySelector('.cake-stage-container');
    if (canvas) {
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 200 }));
      canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 380, clientY: 380 }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 380, clientY: 380 }));
    }
  })()`);

  await waitFor(() => !!document.querySelector('.celebration-grand-title'));
  const celebrationStage = await evalInPage(`(() => {
    const grandTitle = document.querySelector('.celebration-grand-title')?.textContent;
    const successText = document.querySelector('.celebration-success-text')?.textContent;
    const confettiActive = !!document.querySelector('.confetti-canvas') || !!document.querySelector('.confetti-container') || !!document.querySelector('.canvas-confetti');
    return { grandTitle, successText, confettiActive };
  })()`);
  console.log('Celebration Stage:', celebrationStage);
  results.celebrationStage = celebrationStage;

  console.log('Waiting for celebration to transition to bridge line (9.5s)...');
  await waitFor(() => !!document.querySelector('.btn-cake-proceed-final'), 12000);

  const bridgeContent = await evalInPage(`(() => {
    const headline = document.querySelector('.celebration-bridge-headline')?.textContent;
    const line = document.querySelector('.celebration-bridge-line')?.textContent;
    const btnLabel = document.querySelector('.btn-cake-proceed-final')?.textContent?.trim();
    return { headline, line, btnLabel };
  })()`);
  console.log('Cake Bridge Content (with visited surprise):', bridgeContent);
  results.bridgeContent = bridgeContent;

  // Click "Go on, then. ->" to navigate to Final Message Scene
  await evalInPage(`document.querySelector('.btn-cake-proceed-final').click()`);
  await waitFor(() => !!document.querySelector('.final-message-scene-full'));

  // ==========================================
  // PHASE 4G: FINAL MESSAGE SCENE AUDIT
  // ==========================================
  console.log('\n--- Testing Scene 6: Final Message Scene ---');
  // Advance paragraphs
  for (let i = 0; i < 5; i++) {
    await evalInPage(`(() => {
      const area = document.querySelector('.final-letter-scroll-area');
      if (area) area.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 350));
  }

  await waitFor(() => !!document.querySelector('.btn-one-last-thing'));

  const finalMessageContent = await evalInPage(`(() => {
    const greeting = document.querySelector('.final-letter-greeting')?.textContent;
    const paragraphs = Array.from(document.querySelectorAll('.final-letter-p')).map(p => p.textContent.trim());
    const signoff = document.querySelector('.final-letter-signoff')?.textContent;
    const nextBtn = document.querySelector('.btn-one-last-thing')?.textContent?.trim();
    const hasTwilightBackdrop = !!document.querySelector('.enchanted-twilight-backdrop img');
    const particlesCount = document.querySelectorAll('.champagne-particle')?.length;
    return { greeting, paragraphs, signoff, nextBtn, hasTwilightBackdrop, particlesCount };
  })()`);
  console.log('Final Message Verification:', finalMessageContent);
  results.finalMessageContent = finalMessageContent;

  // Click "One last thing…"
  await evalInPage(`document.querySelector('.btn-one-last-thing').click()`);
  await waitFor(() => !!document.querySelector('.fake-crash-scene-full'));

  // ==========================================
  // PHASE 4H: FAKE CRASH & REBOOT AUDIT
  // ==========================================
  console.log('\n--- Testing Scene 7: Fake Crash & Reboot ---');
  const crashInitial = await evalInPage(`(() => {
    const title = document.querySelector('#dialog-title')?.textContent;
    const standby = document.querySelector('.standby-text')?.textContent;
    return { title, standby };
  })()`);
  console.log('Crash Initial State:', crashInitial);

  console.log('Waiting for reboot sequence to finish (5s)...');
  await waitFor(() => !!document.querySelector('.btn-replay-cake'), 8000);

  const crashFinal = await evalInPage(`(() => {
    const logs = Array.from(document.querySelectorAll('.vintage-log-line')).map(l => l.textContent.trim());
    const closing = document.querySelector('.vintage-reboot-closing')?.textContent;
    const replayBtn = document.querySelector('.btn-replay-cake')?.textContent?.trim();
    const backBtn = document.querySelector('.btn-back-control')?.textContent?.trim();
    return { logs, closing, replayBtn, backBtn };
  })()`);
  console.log('Crash Final State:', crashFinal);
  results.crashFinal = crashFinal;

  // Test "Replay cake" button
  await evalInPage(`document.querySelector('.btn-replay-cake').click()`);
  await waitFor(() => !!document.querySelector('.garden-cake-hud'));

  const cakeReplayed = await evalInPage(`(() => {
    const isCakeScene = !!document.querySelector('.garden-cake-hud');
    const promptTitle = document.querySelector('.prompt-title')?.textContent;
    return { isCakeScene, promptTitle };
  })()`);
  console.log('Replay Cake Result:', cakeReplayed);
  results.cakeReplayed = cakeReplayed;

  // Return to Control Room from cake
  await evalInPage(`document.querySelector('.cake-discreet-back')?.click()`);
  await waitFor(() => !!document.querySelector('.observatory-headline'));

  // Verify all 3 modules visited indicator
  const crAllVisited = await evalInPage(`document.querySelector('.visited-progress-pill')?.textContent`);
  console.log('Control Room All Visited Status:', crAllVisited);
  results.crAllVisited = crAllVisited;

  // ==========================================
  // PHASE 6: MOBILE VIEWPORT & A11Y TESTS
  // ==========================================
  console.log('\n--- Testing Mobile Viewport (390x844) & Accessibility ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 500));

  const mobileCheck = await evalInPage(`(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const hasHorizontalOverflow = scrollWidth > clientWidth;
    const smallTouchTargets = Array.from(document.querySelectorAll('button')).filter(b => {
      const rect = b.getBoundingClientRect();
      return (rect.width > 0 && rect.width < 40) || (rect.height > 0 && rect.height < 40);
    }).map(b => ({ text: b.textContent?.trim(), w: b.offsetWidth, h: b.offsetHeight }));
    return { scrollWidth, clientWidth, hasHorizontalOverflow, smallTouchTargets };
  })()`);
  console.log('Mobile 390x844 Layout Audit:', mobileCheck);
  results.mobileCheck = mobileCheck;

  // Test Reduced Motion
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await new Promise((r) => setTimeout(r, 500));
  const reducedMotionActive = await evalInPage(`window.matchMedia('(prefers-reduced-motion: reduce)').matches`);
  console.log('Reduced Motion Emulated:', reducedMotionActive);
  results.reducedMotionActive = reducedMotionActive;

  // Log errors / console issues
  console.log('\n--- Console Logs & Exceptions ---');
  console.log('Total console logs captured:', consoleLogs.length);
  console.log('Errors caught:', errors);
  console.log('Failed network requests:', failedRequests);

  results.errors = errors;
  results.failedRequests = failedRequests;

  fs.writeFileSync('scratch/full_audit_results.json', JSON.stringify(results, null, 2));
  console.log('\n=== AUDIT RUN COMPLETE — RESULTS SAVED TO scratch/full_audit_results.json ===');

  chrome.kill();
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
