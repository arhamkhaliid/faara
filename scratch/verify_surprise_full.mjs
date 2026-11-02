import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runStep(options) {
  return new Promise((resolve, reject) => {
    const { width = 1280, height = 800, name, evaluateFn, waitAfter = 500 } = options;

    const chrome = spawn(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--remote-debugging-port=9226',
        `--window-size=${width},${height}`,
        'http://localhost:5173/',
      ]
    );

    let attempts = 0;
    const checkTarget = async () => {
      try {
        const res = await fetch('http://localhost:9226/json');
        const pages = await res.json();
        const target = pages.find((p) => p.url.includes('5173'));
        if (!target) {
          if (++attempts > 30) {
            chrome.kill();
            return reject(new Error('Target not found'));
          }
          return setTimeout(checkTarget, 250);
        }
        connectWs(target.webSocketDebuggerUrl);
      } catch {
        if (++attempts > 30) {
          chrome.kill();
          return reject(new Error('Connection error'));
        }
        setTimeout(checkTarget, 250);
      }
    };
    setTimeout(checkTarget, 400);

    const connectWs = (url) => {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

        let pollCount = 0;
        const poll = setInterval(() => {
          pollCount++;
          ws.send(
            JSON.stringify({
              id: 100 + pollCount,
              method: 'Runtime.evaluate',
              params: {
                expression: `(${evaluateFn.toString()})()`,
                awaitPromise: true,
              },
            })
          );
        }, 350);

        let capturing = false;
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id > 100 && msg.id < 500 && msg.result?.result?.value) {
            const res = msg.result.result.value;
            if (typeof res === 'object' && res.ready && !capturing) {
              capturing = true;
              clearInterval(poll);
              setTimeout(() => {
                ws.send(
                  JSON.stringify({
                    id: 999,
                    method: 'Page.captureScreenshot',
                    params: { format: 'png' },
                  })
                );
              }, waitAfter);
            }
          }
          if (msg.id === 999 && msg.result?.data) {
            const filePath = path.join(__dirname, `${name}.png`);
            fs.writeFileSync(filePath, Buffer.from(msg.result.data, 'base64'));
            console.log(`Saved screenshot: ${filePath}`);
            ws.close();
            chrome.kill();
            resolve({ name, filePath });
          }
        };
      };
    };
  });
}

// Sequence of tests to run
async function runAll() {
  console.log('--- 1. Testing Surprise Scene: Initial Stage ---');
  await runStep({
    name: 'surprise_01_initial_stage',
    evaluateFn: () => {
      window.__step = window.__step || {};
      const surprise = document.querySelector('.garden-surprise-hud');
      if (surprise) {
        const choiceBtns = document.querySelectorAll('.btn-surprise-choice');
        if (choiceBtns.length === 2) {
          return { ready: true };
        }
      }

      const bootBtn = document.getElementById('boot-gate-primary-btn');
      if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

      const skipBtn = document.querySelector('.romantic-skip-btn');
      if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

      const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
      if (choiceBtns.length > 0) {
        choiceBtns[0].click();
        const cont = document.querySelector('.btn-romantic-primary');
        if (cont) { cont.click(); return 'clicked_continue'; }
      }

      const obsCards = document.querySelectorAll('.observatory-module-card button');
      if (obsCards.length > 0) {
        obsCards[0].click(); // Open Surprise
        return 'clicked_open_surprise';
      }

      return 'polling';
    },
    waitAfter: 1000,
  });

  console.log('--- 2. Testing Surprise Scene: Popup 1 (Dismiss) ---');
  await runStep({
    name: 'surprise_02_popup1',
    evaluateFn: () => {
      window.__step = window.__step || {};
      const surprise = document.querySelector('.garden-surprise-hud');
      if (surprise) {
        const popup1 = document.querySelector('.popup-id-badge');
        if (popup1 && popup1.textContent.includes('NOTICE // 01')) {
          return { ready: true };
        }

        const choiceBtns = document.querySelectorAll('.btn-surprise-choice');
        if (choiceBtns.length === 2 && !window.__step.clickedChoice) {
          window.__step.clickedChoice = true;
          choiceBtns[1].click(); // Click "Show me."
          return 'clicked_show_me';
        }
      }

      const bootBtn = document.getElementById('boot-gate-primary-btn');
      if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

      const skipBtn = document.querySelector('.romantic-skip-btn');
      if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

      const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
      if (choiceBtns.length > 0) {
        choiceBtns[0].click();
        const cont = document.querySelector('.btn-romantic-primary');
        if (cont) { cont.click(); return 'clicked_continue'; }
      }

      const obsCards = document.querySelectorAll('.observatory-module-card button');
      if (obsCards.length > 0) {
        obsCards[0].click();
        return 'clicked_open_surprise';
      }

      return 'polling';
    },
    waitAfter: 600,
  });

  console.log('--- 3. Testing Surprise Scene: Popup 2 (Timed Punchline) ---');
  await runStep({
    name: 'surprise_03_popup2_punchline',
    evaluateFn: () => {
      window.__step = window.__step || {};
      const surprise = document.querySelector('.garden-surprise-hud');
      if (surprise) {
        const punchline = document.querySelector('.popup-punchline-text');
        if (punchline) {
          return { ready: true };
        }

        const popup1Btn = document.querySelector('.popup-actions-row button');
        const popupBadge = document.querySelector('.popup-id-badge');
        if (popupBadge && popupBadge.textContent.includes('NOTICE // 01') && popup1Btn && !window.__step.clickedDismiss) {
          window.__step.clickedDismiss = true;
          popup1Btn.click();
          return 'clicked_dismiss';
        }

        const choiceBtns = document.querySelectorAll('.btn-surprise-choice');
        if (choiceBtns.length === 2 && !window.__step.clickedChoice) {
          window.__step.clickedChoice = true;
          choiceBtns[1].click();
          return 'clicked_show_me';
        }
      }

      const bootBtn = document.getElementById('boot-gate-primary-btn');
      if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

      const skipBtn = document.querySelector('.romantic-skip-btn');
      if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

      const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
      if (choiceBtns.length > 0) {
        choiceBtns[0].click();
        const cont = document.querySelector('.btn-romantic-primary');
        if (cont) { cont.click(); return 'clicked_continue'; }
      }

      const obsCards = document.querySelectorAll('.observatory-module-card button');
      if (obsCards.length > 0) {
        obsCards[0].click();
        return 'clicked_open_surprise';
      }

      return 'polling';
    },
    waitAfter: 1800, // Wait for 1400ms punchline timer
  });

  console.log('--- 4. Testing Surprise Scene: Popup 3 (Dodging Button) ---');
  await runStep({
    name: 'surprise_04_popup3_dodged',
    evaluateFn: () => {
      window.__step = window.__step || {};
      const surprise = document.querySelector('.garden-surprise-hud');
      if (surprise) {
        const dodgeBtn = document.querySelector('.btn-dodging-close');
        if (dodgeBtn) {
          if (!window.__step.dodged) {
            window.__step.dodged = true;
            // Trigger mouseenter or touch to dodge
            dodgeBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            return 'triggered_dodge';
          }
          if (dodgeBtn.classList.contains('dodged')) {
            return { ready: true };
          }
        }

        const punchline = document.querySelector('.popup-punchline-text');
        const understoodBtn = document.querySelector('.popup-actions-row button');
        if (punchline && understoodBtn && !window.__step.clickedUnderstood) {
          window.__step.clickedUnderstood = true;
          understoodBtn.click();
          return 'clicked_understood';
        }

        const popup1Btn = document.querySelector('.popup-actions-row button');
        const popupBadge = document.querySelector('.popup-id-badge');
        if (popupBadge && popupBadge.textContent.includes('NOTICE // 01') && popup1Btn && !window.__step.clickedDismiss) {
          window.__step.clickedDismiss = true;
          popup1Btn.click();
          return 'clicked_dismiss';
        }

        const choiceBtns = document.querySelectorAll('.btn-surprise-choice');
        if (choiceBtns.length === 2 && !window.__step.clickedChoice) {
          window.__step.clickedChoice = true;
          choiceBtns[1].click();
          return 'clicked_show_me';
        }
      }

      const bootBtn = document.getElementById('boot-gate-primary-btn');
      if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

      const skipBtn = document.querySelector('.romantic-skip-btn');
      if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

      const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
      if (choiceBtns.length > 0) {
        choiceBtns[0].click();
        const cont = document.querySelector('.btn-romantic-primary');
        if (cont) { cont.click(); return 'clicked_continue'; }
      }

      const obsCards = document.querySelectorAll('.observatory-module-card button');
      if (obsCards.length > 0) {
        obsCards[0].click();
        return 'clicked_open_surprise';
      }

      return 'polling';
    },
    waitAfter: 600,
  });

  console.log('--- 5. Testing Surprise Scene: Popup 4 (Summary & Return) ---');
  await runStep({
    name: 'surprise_05_popup4_summary',
    evaluateFn: () => {
      window.__step = window.__step || {};
      const surprise = document.querySelector('.garden-surprise-hud');
      if (surprise) {
        const summaryBtn = document.querySelector('.btn-summary-return');
        if (summaryBtn) {
          return { ready: true };
        }

        const dodgeBtn = document.querySelector('.btn-dodging-close');
        if (dodgeBtn && !window.__step.clickedDodged) {
          if (!dodgeBtn.classList.contains('dodged')) {
            dodgeBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          } else {
            window.__step.clickedDodged = true;
            dodgeBtn.click();
            return 'clicked_dodged_btn';
          }
        }

        const punchline = document.querySelector('.popup-punchline-text');
        const understoodBtn = document.querySelector('.popup-actions-row button');
        if (punchline && understoodBtn && !window.__step.clickedUnderstood) {
          window.__step.clickedUnderstood = true;
          understoodBtn.click();
          return 'clicked_understood';
        }

        const popup1Btn = document.querySelector('.popup-actions-row button');
        const popupBadge = document.querySelector('.popup-id-badge');
        if (popupBadge && popupBadge.textContent.includes('NOTICE // 01') && popup1Btn && !window.__step.clickedDismiss) {
          window.__step.clickedDismiss = true;
          popup1Btn.click();
          return 'clicked_dismiss';
        }

        const choiceBtns = document.querySelectorAll('.btn-surprise-choice');
        if (choiceBtns.length === 2 && !window.__step.clickedChoice) {
          window.__step.clickedChoice = true;
          choiceBtns[1].click();
          return 'clicked_show_me';
        }
      }

      const bootBtn = document.getElementById('boot-gate-primary-btn');
      if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

      const skipBtn = document.querySelector('.romantic-skip-btn');
      if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

      const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
      if (choiceBtns.length > 0) {
        choiceBtns[0].click();
        const cont = document.querySelector('.btn-romantic-primary');
        if (cont) { cont.click(); return 'clicked_continue'; }
      }

      const obsCards = document.querySelectorAll('.observatory-module-card button');
      if (obsCards.length > 0) {
        obsCards[0].click();
        return 'clicked_open_surprise';
      }

      return 'polling';
    },
    waitAfter: 1400,
  });

  console.log('--- 6. Testing Return Navigation & Visited State in Control Room ---');
  await runStep({
    name: 'surprise_06_control_room_visited',
    evaluateFn: () => {
      window.__step = window.__step || {};
      const controlHud = document.querySelector('.garden-control-hud');
      if (controlHud && window.__step.returnedFromSurprise) {
        const visitedPill = document.querySelector('.visited-progress-pill');
        if (visitedPill && visitedPill.textContent.includes('1/3')) {
          return { ready: true };
        }
      }

      const surprise = document.querySelector('.garden-surprise-hud');
      if (surprise) {
        const summaryBtn = document.querySelector('.btn-summary-return');
        if (summaryBtn && !window.__step.returnedFromSurprise) {
          window.__step.returnedFromSurprise = true;
          summaryBtn.click();
          return 'clicked_back_to_control_room';
        }

        const dodgeBtn = document.querySelector('.btn-dodging-close');
        if (dodgeBtn) {
          if (!dodgeBtn.classList.contains('dodged')) {
            dodgeBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          } else {
            dodgeBtn.click();
            return 'clicked_dodged_btn';
          }
        }

        const punchline = document.querySelector('.popup-punchline-text');
        const understoodBtn = document.querySelector('.popup-actions-row button');
        if (punchline && understoodBtn && !window.__step.clickedUnderstood) {
          window.__step.clickedUnderstood = true;
          understoodBtn.click();
          return 'clicked_understood';
        }

        const popup1Btn = document.querySelector('.popup-actions-row button');
        const popupBadge = document.querySelector('.popup-id-badge');
        if (popupBadge && popupBadge.textContent.includes('NOTICE // 01') && popup1Btn && !window.__step.clickedDismiss) {
          window.__step.clickedDismiss = true;
          popup1Btn.click();
          return 'clicked_dismiss';
        }

        const choiceBtns = document.querySelectorAll('.btn-surprise-choice');
        if (choiceBtns.length === 2 && !window.__step.clickedChoice) {
          window.__step.clickedChoice = true;
          choiceBtns[1].click();
          return 'clicked_show_me';
        }
      }

      const bootBtn = document.getElementById('boot-gate-primary-btn');
      if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

      const skipBtn = document.querySelector('.romantic-skip-btn');
      if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

      const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
      if (choiceBtns.length > 0) {
        choiceBtns[0].click();
        const cont = document.querySelector('.btn-romantic-primary');
        if (cont) { cont.click(); return 'clicked_continue'; }
      }

      const obsCards = document.querySelectorAll('.observatory-module-card button');
      if (obsCards.length > 0) {
        obsCards[0].click();
        return 'clicked_open_surprise';
      }

      return 'polling';
    },
    waitAfter: 1200,
  });

  console.log('--- 7. Testing Mobile Viewport (390x844) ---');
  await runStep({
    width: 390,
    height: 844,
    name: 'surprise_07_mobile_view',
    evaluateFn: () => {
      window.__step = window.__step || {};
      const surprise = document.querySelector('.garden-surprise-hud');
      if (surprise) {
        const choiceBtns = document.querySelectorAll('.btn-surprise-choice');
        if (choiceBtns.length === 2) {
          return { ready: true };
        }
      }

      const bootBtn = document.getElementById('boot-gate-primary-btn');
      if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

      const skipBtn = document.querySelector('.romantic-skip-btn');
      if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

      const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
      if (choiceBtns.length > 0) {
        choiceBtns[0].click();
        const cont = document.querySelector('.btn-romantic-primary');
        if (cont) { cont.click(); return 'clicked_continue'; }
      }

      const obsCards = document.querySelectorAll('.observatory-module-card button');
      if (obsCards.length > 0) {
        obsCards[0].click();
        return 'clicked_open_surprise';
      }

      return 'polling';
    },
    waitAfter: 1000,
  });

  console.log('--- All Surprise Milestone automated tests completed successfully! ---');
}

runAll().catch((err) => {
  console.error('Error in verification:', err);
  process.exit(1);
});
