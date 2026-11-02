import { spawn } from 'child_process';
import fs from 'fs';

function captureControlRoom(width, height, outputFile) {
  return new Promise((resolve, reject) => {
    const chrome = spawn(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--remote-debugging-port=9223',
        `--window-size=${width},${height}`,
        'http://localhost:5173/',
      ]
    );

    let attempts = 0;
    const checkTarget = async () => {
      try {
        const res = await fetch('http://localhost:9223/json');
        const pages = await res.json();
        const target = pages.find((p) => p.url.includes('5173'));
        if (!target) {
          if (++attempts > 25) {
            chrome.kill();
            return reject(new Error('No target page found'));
          }
          return setTimeout(checkTarget, 300);
        }
        setupWs(target.webSocketDebuggerUrl);
      } catch {
        if (++attempts > 25) {
          chrome.kill();
          return reject(new Error('Failed to connect to Chrome debugging port'));
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

        setTimeout(() => {
          // Click start on boot gate
          ws.send(
            JSON.stringify({
              id: 10,
              method: 'Runtime.evaluate',
              params: {
                expression: `(() => {
                  const startBtn = document.getElementById('boot-gate-primary-btn');
                  if (startBtn) startBtn.click();
                  // Also click skip boot if present to advance immediately
                  setTimeout(() => {
                    const skipBoot = document.getElementById('boot-gate-skip-btn');
                    if (skipBoot) skipBoot.click();
                  }, 100);
                  return !!startBtn;
                })()`,
              },
            })
          );

          // Once in opening scene, skip dialogue pace, select choice, and proceed to Control Room
          setTimeout(() => {
            ws.send(
              JSON.stringify({
                id: 11,
                method: 'Runtime.evaluate',
                params: {
                  expression: `(async () => {
                    // Click skip pace button
                    const skipBtn = document.querySelector('.romantic-skip-btn');
                    if (skipBtn) skipBtn.click();
                    
                    await new Promise(r => setTimeout(r, 400));
                    
                    // Choose first choice
                    const choiceBtn = document.querySelector('.btn-romantic-choice');
                    if (choiceBtn) choiceBtn.click();

                    await new Promise(r => setTimeout(r, 400));

                    // Click continue to control room
                    const continueBtn = document.querySelector('.btn-romantic-primary');
                    if (continueBtn) continueBtn.click();
                  })()`,
                  awaitPromise: true,
                },
              })
            );

            // Wait for transition to control-room (600ms transition + camera lerp)
            setTimeout(() => {
              ws.send(JSON.stringify({ id: 20, method: 'Page.captureScreenshot' }));
            }, 3000);
          }, 4500);
        }, 1500);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 20 && msg.result?.data) {
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
  });
}

async function main() {
  const dir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
  console.log('Capturing control room on desktop (1280x800)...');
  await captureControlRoom(1280, 800, `${dir}/current_control_room_desktop.png`);

  console.log('Capturing control room on mobile (390x844)...');
  await captureControlRoom(390, 844, `${dir}/current_control_room_mobile.png`);

  console.log('Done!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
