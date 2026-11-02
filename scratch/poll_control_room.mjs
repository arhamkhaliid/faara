import { spawn } from 'child_process';
import fs from 'fs';

function testNavigate() {
  return new Promise((resolve, reject) => {
    const chrome = spawn(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--remote-debugging-port=9224',
        '--window-size=1280,800',
        'http://localhost:5173/',
      ]
    );

    let attempts = 0;
    const checkTarget = async () => {
      try {
        const res = await fetch('http://localhost:9224/json');
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
          return reject(new Error('Failed to connect'));
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
        ws.send(JSON.stringify({ id: 3, method: 'Console.enable' }));

        const pollInterval = setInterval(() => {
          ws.send(
            JSON.stringify({
              id: 100,
              method: 'Runtime.evaluate',
              params: {
                expression: `(() => {
                  const bootBtn = document.getElementById('boot-gate-primary-btn');
                  if (bootBtn) {
                    bootBtn.click();
                    const skipBoot = document.getElementById('boot-gate-skip-btn');
                    if (skipBoot) skipBoot.click();
                    return 'clicked boot';
                  }

                  const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
                  if (choiceBtns.length > 0) {
                    choiceBtns[0].click();
                    const continueBtn = document.querySelector('.btn-romantic-primary');
                    if (continueBtn) {
                      continueBtn.click();
                      return 'clicked continue';
                    }
                    return 'clicked choice, waiting continue';
                  }

                  const skipPace = document.querySelector('.romantic-skip-btn');
                  if (skipPace) {
                    skipPace.click();
                    return 'clicked skip pace';
                  }

                  const controlRoom = document.querySelector('.control-room') || document.querySelector('[aria-label="Control Room"]');
                  if (controlRoom) {
                    return 'IN_CONTROL_ROOM';
                  }

                  return 'waiting...';
                })()`,
              },
            })
          );
        }, 500);

        let captured = false;
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === 100 && msg.result?.result?.value) {
            console.log('Poll status:', msg.result.result.value);
            if (msg.result.result.value === 'IN_CONTROL_ROOM' && !captured) {
              captured = true;
              clearInterval(pollInterval);
              setTimeout(() => {
                ws.send(JSON.stringify({ id: 200, method: 'Page.captureScreenshot' }));
              }, 1200);
            }
          }
          if (msg.id === 200 && msg.result?.data) {
            const dir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
            fs.writeFileSync(`${dir}/captured_control_room_live.png`, Buffer.from(msg.result.data, 'base64'));
            console.log('Saved captured_control_room_live.png!');
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

testNavigate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
