import { spawn } from 'child_process';
import fs from 'fs';

function testTiming() {
  return new Promise((resolve, reject) => {
    const chrome = spawn(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--remote-debugging-port=9222',
        '--window-size=1280,800',
        'http://localhost:5173/',
      ]
    );

    let attempts = 0;
    const checkTarget = async () => {
      try {
        const res = await fetch('http://localhost:9222/json');
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
          console.log('Clicking Start button...');
          ws.send(
            JSON.stringify({
              id: 10,
              method: 'Runtime.evaluate',
              params: {
                expression: `(() => {
                  const btn = document.getElementById('boot-gate-primary-btn');
                  if (btn) btn.click();
                  return !!btn;
                })()`,
              },
            })
          );

          // Capture at 2800ms into initialization (should show the sequence messages and progress bar)
          setTimeout(() => {
            console.log('Capturing mid-initialization screenshot at 2800ms...');
            ws.send(JSON.stringify({ id: 20, method: 'Page.captureScreenshot' }));
          }, 2800);

          // Capture after transition at 5200ms (should show opening scene)
          setTimeout(() => {
            console.log('Capturing post-transition screenshot at 5200ms...');
            ws.send(JSON.stringify({ id: 30, method: 'Page.captureScreenshot' }));
          }, 5200);
        }, 1500);
      };

      const dir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 20 && msg.result?.data) {
          fs.writeFileSync(`${dir}/boot_mid_sequence.png`, Buffer.from(msg.result.data, 'base64'));
          console.log('Saved boot_mid_sequence.png');
        }
        if (msg.id === 30 && msg.result?.data) {
          fs.writeFileSync(`${dir}/boot_post_transition.png`, Buffer.from(msg.result.data, 'base64'));
          console.log('Saved boot_post_transition.png');
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

testTiming()
  .then(() => {
    console.log('Timing test complete!');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
