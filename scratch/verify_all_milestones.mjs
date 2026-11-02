import { spawn } from 'child_process';
import fs from 'fs';

function captureState({ width, height, outputFile, action }) {
  return new Promise((resolve, reject) => {
    const chrome = spawn(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--remote-debugging-port=9225',
        `--window-size=${width},${height}`,
        'http://localhost:5173/',
      ]
    );

    let attempts = 0;
    const checkTarget = async () => {
      try {
        const res = await fetch('http://localhost:9225/json');
        const pages = await res.json();
        const target = pages.find((p) => p.url.includes('5173'));
        if (!target) {
          if (++attempts > 25) {
            chrome.kill();
            return reject(new Error('Target page not found'));
          }
          return setTimeout(checkTarget, 300);
        }
        setupWs(target.webSocketDebuggerUrl);
      } catch {
        if (++attempts > 25) {
          chrome.kill();
          return reject(new Error('Connection failed'));
        }
        setTimeout(checkTarget, 300);
      }
    };
    setTimeout(checkTarget, 600);

    const setupWs = (url) => {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

        const pollInterval = setInterval(() => {
          ws.send(
            JSON.stringify({
              id: 100,
              method: 'Runtime.evaluate',
              params: {
                expression: `(async () => {
                  const state = window.__test_state || { stage: 'init' };
                  window.__test_state = state;

                  if ('${action}' === 'boot') {
                    // Just wait for initial boot render
                    return 'READY_BOOT';
                  }

                  if ('${action}' === 'opening') {
                    const bootBtn = document.getElementById('boot-gate-primary-btn');
                    if (bootBtn) {
                      bootBtn.click();
                      return 'clicked_boot';
                    }

                    const plaque = document.querySelector('.garden-story-hud');
                    if (plaque) return 'READY_OPENING';

                    const skipBtn = document.querySelector('.romantic-skip-btn');
                    if (skipBtn) {
                      skipBtn.click();
                      return 'clicked_skip';
                    }

                    return 'waiting_opening';
                  }

                  if ('${action}' === 'control_room' || '${action}' === 'control_room_focus3d') {
                    const controlHud = document.querySelector('.garden-control-hud');
                    if (controlHud) {
                      if ('${action}' === 'control_room_focus3d' && !state.focused3D) {
                        const focusBtn = document.querySelector('.btn-romantic-toggle-view');
                        if (focusBtn) {
                          state.focused3D = true;
                          focusBtn.click();
                          return 'clicked_focus3d';
                        }
                      }
                      return 'READY_CONTROL_ROOM';
                    }

                    const bootBtn = document.getElementById('boot-gate-primary-btn');
                    if (bootBtn) {
                      bootBtn.click();
                      return 'clicked_boot';
                    }

                    const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
                    if (choiceBtns.length > 0) {
                      choiceBtns[0].click();
                      const continueBtn = document.querySelector('.btn-romantic-primary');
                      if (continueBtn) {
                        continueBtn.click();
                        return 'clicked_continue';
                      }
                      return 'waiting_continue';
                    }

                    const skipBtn = document.querySelector('.romantic-skip-btn');
                    if (skipBtn) {
                      skipBtn.click();
                      return 'clicked_skip';
                    }

                    return 'waiting_scene';
                  }

                  return 'unknown_action';
                })()`,
                awaitPromise: true,
              },
            })
          );
        }, 400);

        let captured = false;
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 100 && msg.result?.result?.value) {
            const val = msg.result.result.value;
            if (
              (val === 'READY_BOOT' || val === 'READY_OPENING' || val === 'READY_CONTROL_ROOM') &&
              !captured
            ) {
              captured = true;
              clearInterval(pollInterval);
              // Wait 1200ms for camera lerp and any transitions
              setTimeout(() => {
                ws.send(JSON.stringify({ id: 200, method: 'Page.captureScreenshot' }));
              }, 1400);
            }
          }
          if (msg.id === 200 && msg.result?.data) {
            fs.writeFileSync(outputFile, Buffer.from(msg.result.data, 'base64'));
            console.log(`Saved screenshot: ${outputFile}`);
            chrome.kill();
            resolve();
          }
        };

        ws.onerror = (err) => {
          chrome.kill();
          reject(err);
        };
      };
    };
  });
}

async function main() {
  const dir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';

  console.log('1. Capturing Opening Scene (Desktop 1280x800)...');
  await captureState({
    width: 1280,
    height: 800,
    outputFile: `${dir}/refined_rose_path_desktop.png`,
    action: 'opening',
  });

  console.log('2. Capturing Control Room (Desktop 1280x800)...');
  await captureState({
    width: 1280,
    height: 800,
    outputFile: `${dir}/control_room_desktop.png`,
    action: 'control_room',
  });

  console.log('3. Capturing Control Room Focus 3D Mode (Desktop 1280x800)...');
  await captureState({
    width: 1280,
    height: 800,
    outputFile: `${dir}/control_room_focus3d_desktop.png`,
    action: 'control_room_focus3d',
  });

  console.log('4. Capturing Control Room (Mobile 390x844)...');
  await captureState({
    width: 390,
    height: 844,
    outputFile: `${dir}/control_room_mobile.png`,
    action: 'control_room',
  });

  console.log('Verification captures complete!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
