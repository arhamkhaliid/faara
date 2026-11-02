import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';

async function capture(width, height, filename) {
  const port = 9255;
  console.log(`Launching headless Chrome ${width}x${height}...`);
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      '--incognito',
      '--disable-cache',
      '--disk-cache-size=1',
      `http://localhost:5173/?_t=${Date.now()}`,
    ]
  );

  try {
    let target = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(`http://localhost:${port}/json`);
        const pages = await res.json();
        target = pages.find((p) => p.url.includes('5173'));
        if (target) break;
      } catch {}
    }

    if (!target) {
      throw new Error('Chrome target not found');
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });

    // Wait for 3.5 seconds so all landing animations have revealed
    await new Promise((r) => setTimeout(r, 3800));

    const snap = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });

    const outPath = `${artifactsDir}/${filename}`;
    fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
    console.log(`Saved screenshot to ${outPath}`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function main() {
  await capture(1280, 800, 'landing_refined_desktop.png');
  await capture(390, 844, 'landing_refined_mobile.png');
}

main().catch(console.error);
