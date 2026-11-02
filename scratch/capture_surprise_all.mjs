import { spawn } from 'child_process';
import * as fs from 'node:fs';
import path from 'node:path';

const SCRATCH_DIR = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';

function captureStep(options) {
  return new Promise((resolve, reject) => {
    const {
      name,
      width = 1280,
      height = 800,
      targetAction,
      waitMs = 1000,
    } = options;

    const chrome = spawn(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--remote-debugging-port=9228',
        `--window-size=${width},${height}`,
        'http://localhost:5173/',
      ]
    );

    let attempts = 0;
    const checkTarget = async () => {
      try {
        const res = await fetch('http://localhost:9228/json');
        const pages = await res.json();
        const target = pages.find((p) => p.url.includes('5173'));
        if (!target) {
          if (++attempts > 30) {
            chrome.kill();
            return reject(new Error('Target not found'));
          }
          return setTimeout(checkTarget, 250);
        }
        setupWs(target.webSocketDebuggerUrl);
      } catch {
        if (++attempts > 30) {
          chrome.kill();
          return reject(new Error('Connection failed'));
        }
        setTimeout(checkTarget, 250);
      }
    };
    setTimeout(checkTarget, 400);

    const setupWs = (url) => {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

        let pollId = 100;
        const poll = setInterval(() => {
          pollId++;
          ws.send(
            JSON.stringify({
              id: pollId,
              method: 'Runtime.evaluate',
              params: {
                expression: `(async () => {
                  window.__step = window.__step || {};
                  const s = window.__step;

                  // 1. Boot gate
                  const bootBtn = document.getElementById('boot-gate-primary-btn');
                  if (bootBtn && !s.clickedBoot) {
                    s.clickedBoot = true;
                    bootBtn.click();
                    return 'clicked_boot';
                  }

                  // 2. Skip initialization / dialogue if needed
                  const skipBtn = document.querySelector('.romantic-skip-btn');
                  if (skipBtn && !s.clickedSkip) {
                    s.clickedSkip = true;
                    skipBtn.click();
                    return 'clicked_skip';
                  }

                  // 3. Opening dialogue choices
                  const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
                  if (choiceBtns.length > 0 && !s.clickedChoice) {
                    s.clickedChoice = true;
                    choiceBtns[0].click();
                    return 'clicked_choice';
                  }

                  // 4. Opening continue button
                  const continueBtn = document.querySelector('.btn-romantic-primary');
                  if (continueBtn && !s.clickedContinue) {
                    s.clickedContinue = true;
                    continueBtn.click();
                    return 'clicked_continue';
                  }

                  // 5. Control Room module launch
                  const surpriseLaunchBtn = document.querySelector('.btn-observatory-launch');
                  if (surpriseLaunchBtn && !s.clickedSurpriseLaunch) {
                    s.clickedSurpriseLaunch = true;
                    surpriseLaunchBtn.click();
                    return 'clicked_open_surprise';
                  }

                  // 6. Inside Surprise Scene
                  const surpriseHud = document.querySelector('.garden-surprise-hud');
                  if (surpriseHud) {
                    if ('${targetAction}' === 'initial') {
                      return 'READY_TARGET';
                    }

                    if ('${targetAction}' === 'popup1') {
                      if (!s.clickedInitialChoice) {
                        const surpriseChoices = document.querySelectorAll('.btn-surprise-choice');
                        if (surpriseChoices.length === 2) {
                          s.clickedInitialChoice = true;
                          surpriseChoices[1].click(); // "Show me."
                          return 'clicked_show_me';
                        }
                      }
                      const badge = document.querySelector('.popup-id-badge');
                      if (badge && badge.textContent.includes('NOTICE // 01')) {
                        return 'READY_TARGET';
                      }
                    }

                    if ('${targetAction}' === 'popup2') {
                      if (!s.clickedInitialChoice) {
                        const surpriseChoices = document.querySelectorAll('.btn-surprise-choice');
                        if (surpriseChoices.length === 2) {
                          s.clickedInitialChoice = true;
                          surpriseChoices[1].click();
                          return 'clicked_show_me';
                        }
                      }
                      const dismissBtn = document.querySelector('.popup-actions-row button');
                      const badge = document.querySelector('.popup-id-badge');
                      if (badge && badge.textContent.includes('NOTICE // 01') && dismissBtn && !s.clickedDismiss) {
                        s.clickedDismiss = true;
                        dismissBtn.click();
                        return 'clicked_dismiss';
                      }
                      const punchline = document.querySelector('.popup-punchline-text');
                      if (punchline) {
                        return 'READY_TARGET';
                      }
                    }

                    if ('${targetAction}' === 'popup3') {
                      if (!s.clickedInitialChoice) {
                        const surpriseChoices = document.querySelectorAll('.btn-surprise-choice');
                        if (surpriseChoices.length === 2) {
                          s.clickedInitialChoice = true;
                          surpriseChoices[1].click();
                          return 'clicked_show_me';
                        }
                      }
                      const dismissBtn = document.querySelector('.popup-actions-row button');
                      const badge = document.querySelector('.popup-id-badge');
                      if (badge && badge.textContent.includes('NOTICE // 01') && dismissBtn && !s.clickedDismiss) {
                        s.clickedDismiss = true;
                        dismissBtn.click();
                        return 'clicked_dismiss';
                      }
                      const punchline = document.querySelector('.popup-punchline-text');
                      const understoodBtn = document.querySelector('.popup-actions-row button');
                      if (punchline && understoodBtn && !s.clickedUnderstood) {
                        s.clickedUnderstood = true;
                        understoodBtn.click();
                        return 'clicked_understood';
                      }
                      const dodgeBtn = document.querySelector('.btn-dodging-close');
                      if (dodgeBtn) {
                        if (!s.triggeredDodge) {
                          s.triggeredDodge = true;
                          dodgeBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                          return 'triggered_dodge';
                        }
                        if (dodgeBtn.classList.contains('dodged')) {
                          return 'READY_TARGET';
                        }
                      }
                    }

                    if ('${targetAction}' === 'popup4') {
                      if (!s.clickedInitialChoice) {
                        const surpriseChoices = document.querySelectorAll('.btn-surprise-choice');
                        if (surpriseChoices.length === 2) {
                          s.clickedInitialChoice = true;
                          surpriseChoices[1].click();
                          return 'clicked_show_me';
                        }
                      }
                      const dismissBtn = document.querySelector('.popup-actions-row button');
                      const badge = document.querySelector('.popup-id-badge');
                      if (badge && badge.textContent.includes('NOTICE // 01') && dismissBtn && !s.clickedDismiss) {
                        s.clickedDismiss = true;
                        dismissBtn.click();
                        return 'clicked_dismiss';
                      }
                      const punchline = document.querySelector('.popup-punchline-text');
                      const understoodBtn = document.querySelector('.popup-actions-row button');
                      if (punchline && understoodBtn && !s.clickedUnderstood) {
                        s.clickedUnderstood = true;
                        understoodBtn.click();
                        return 'clicked_understood';
                      }
                      const dodgeBtn = document.querySelector('.btn-dodging-close');
                      if (dodgeBtn) {
                        if (!dodgeBtn.classList.contains('dodged')) {
                          dodgeBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                        } else if (!s.clickedDodged) {
                          s.clickedDodged = true;
                          dodgeBtn.click();
                          return 'clicked_dodged';
                        }
                      }
                      const summaryBtn = document.querySelector('.btn-summary-return');
                      if (summaryBtn) {
                        return 'READY_TARGET';
                      }
                    }

                    if ('${targetAction}' === 'return_control_room') {
                      if (!s.clickedInitialChoice) {
                        const surpriseChoices = document.querySelectorAll('.btn-surprise-choice');
                        if (surpriseChoices.length === 2) {
                          s.clickedInitialChoice = true;
                          surpriseChoices[1].click();
                          return 'clicked_show_me';
                        }
                      }
                      const dismissBtn = document.querySelector('.popup-actions-row button');
                      const badge = document.querySelector('.popup-id-badge');
                      if (badge && badge.textContent.includes('NOTICE // 01') && dismissBtn && !s.clickedDismiss) {
                        s.clickedDismiss = true;
                        dismissBtn.click();
                        return 'clicked_dismiss';
                      }
                      const punchline = document.querySelector('.popup-punchline-text');
                      const understoodBtn = document.querySelector('.popup-actions-row button');
                      if (punchline && understoodBtn && !s.clickedUnderstood) {
                        s.clickedUnderstood = true;
                        understoodBtn.click();
                        return 'clicked_understood';
                      }
                      const dodgeBtn = document.querySelector('.btn-dodging-close');
                      if (dodgeBtn) {
                        if (!dodgeBtn.classList.contains('dodged')) {
                          dodgeBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                        } else if (!s.clickedDodged) {
                          s.clickedDodged = true;
                          dodgeBtn.click();
                          return 'clicked_dodged';
                        }
                      }
                      const summaryBtn = document.querySelector('.btn-summary-return');
                      if (summaryBtn && !s.clickedReturn) {
                        s.clickedReturn = true;
                        summaryBtn.click();
                        return 'clicked_return';
                      }
                    }
                  }

                  // 7. Returned to Control Room
                  if ('${targetAction}' === 'return_control_room') {
                    const controlHud = document.querySelector('.garden-control-hud');
                    if (controlHud && s.clickedReturn) {
                      const visited = document.querySelector('.visited-progress-pill');
                      if (visited && visited.textContent.includes('1/3')) {
                        return 'READY_TARGET';
                      }
                    }
                  }

                  return 'waiting';
                })()`,
                awaitPromise: true,
              },
            })
          );
        }, 350);

        let captured = false;
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id > 100 && msg.id < 900 && msg.result?.result?.value) {
            const val = msg.result.result.value;
            console.log(`[${name}] status:`, val);
            if (val === 'READY_TARGET' && !captured) {
              captured = true;
              clearInterval(poll);
              setTimeout(() => {
                ws.send(
                  JSON.stringify({
                    id: 999,
                    method: 'Page.captureScreenshot',
                    params: { format: 'png' },
                  })
                );
              }, waitMs);
            }
          }
          if (msg.id === 999) {
            console.log(`[${name}] Received screenshot response, data length:`, msg.result?.data?.length);
            if (msg.result?.data) {
              const savePath = path.join(SCRATCH_DIR, `${name}.png`);
              try {
                fs.writeFileSync(savePath, Buffer.from(msg.result.data, 'base64'));
                const stats = fs.statSync(savePath);
                console.log(`[SUCCESS] Wrote ${stats.size} bytes to ${savePath}`);
              } catch (e) {
                console.error(`[ERROR WRITING FILE ${savePath}]:`, e);
              }
              ws.close();
              chrome.kill();
              resolve(savePath);
            }
          }
        };
      };
    };
  });
}

async function main() {
  console.log('Capturing 1: Initial Surprise Stage...');
  await captureStep({
    name: 'step1_surprise_initial',
    targetAction: 'initial',
    waitMs: 1200,
  });

  console.log('Capturing 2: Popup 1 (Dismiss)...');
  await captureStep({
    name: 'step2_surprise_popup1',
    targetAction: 'popup1',
    waitMs: 1000,
  });

  console.log('Capturing 3: Popup 2 (Timed Punchline)...');
  await captureStep({
    name: 'step3_surprise_popup2_punchline',
    targetAction: 'popup2',
    waitMs: 1600, // Punchline timer is 1400ms
  });

  console.log('Capturing 4: Popup 3 (Dodging Button)...');
  await captureStep({
    name: 'step4_surprise_popup3_dodged',
    targetAction: 'popup3',
    waitMs: 800,
  });

  console.log('Capturing 5: Popup 4 (Summary & Return)...');
  await captureStep({
    name: 'step5_surprise_popup4_summary',
    targetAction: 'popup4',
    waitMs: 1400, // Typing pause is 1200ms
  });

  console.log('Capturing 6: Return to Control Room (Visited 1/3)...');
  await captureStep({
    name: 'step6_control_room_visited_1_of_3',
    targetAction: 'return_control_room',
    waitMs: 1200,
  });

  console.log('Capturing 7: Mobile Viewport (390x844)...');
  await captureStep({
    name: 'step7_surprise_mobile_view',
    width: 390,
    height: 844,
    targetAction: 'initial',
    waitMs: 1200,
  });

  console.log('All verification captures completed successfully!');
}

main().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
