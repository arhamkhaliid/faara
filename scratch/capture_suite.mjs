import { spawn } from 'child_process';
import fs from 'fs';

function capturePage({ width, height, outputFile, clickStart = false }) {
  return new Promise((resolve, reject) => {
    const chrome = spawn(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      [
        '--headless=new',
        '--remote-debugging-port=9222',
        `--window-size=${width},${height}`,
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

        setTimeout(async () => {
          if (clickStart) {
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
            setTimeout(() => {
              ws.send(JSON.stringify({ id: 20, method: 'Page.captureScreenshot' }));
            }, 3600);
          } else {
            ws.send(JSON.stringify({ id: 20, method: 'Page.captureScreenshot' }));
          }
        }, 2000);
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
  console.log('Capturing desktop boot...');
  await capturePage({
    width: 1280,
    height: 800,
    outputFile: `${dir}/desktop_boot.png`,
    clickStart: false,
  });

  console.log('Capturing desktop opening...');
  await capturePage({
    width: 1280,
    height: 800,
    outputFile: `${dir}/desktop_opening.png`,
    clickStart: true,
  });

  console.log('Capturing mobile boot...');
  await capturePage({
    width: 390,
    height: 844,
    outputFile: `${dir}/mobile_boot.png`,
    clickStart: false,
  });

  console.log('Capturing mobile opening...');
  await capturePage({
    width: 390,
    height: 844,
    outputFile: `${dir}/mobile_opening.png`,
    clickStart: true,
  });

  console.log('All captures complete!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
