import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function captureScreen({ width, height, mobile, url, filename }) {
  const port = 9315;
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      '--incognito',
      url,
    ]
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 120));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const pages = await res.json();
        const target = pages.find(p => p.url.includes('5173'));
        if (target) {
          wsUrl = target.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) throw new Error('Could not connect to Chrome port');

    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const timer = setTimeout(() => reject(new Error('Timeout ' + method)), 8000);
        const handler = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === id) {
            clearTimeout(timer);
            ws.removeEventListener('message', handler);
            resolve(d.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');

    if (mobile) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: true,
      });
    }

    // Wait for canvas / React DOM to stabilize
    await new Promise(r => setTimeout(r, 1200));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, filename), Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${filename}`);

    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

async function run() {
  console.log('Capturing refined screenshots...');
  await captureScreen({
    width: 1280,
    height: 800,
    mobile: false,
    url: `http://127.0.0.1:5173/?scene=surprise&stage=sealed&_t=${Date.now()}`,
    filename: 'refined_step_1_envelope_desktop.png'
  });

  await captureScreen({
    width: 390,
    height: 844,
    mobile: true,
    url: `http://127.0.0.1:5173/?scene=surprise&stage=sealed&_t=${Date.now()}`,
    filename: 'refined_step_1_envelope_mobile.png'
  });

  await captureScreen({
    width: 1280,
    height: 800,
    mobile: false,
    url: `http://127.0.0.1:5173/?scene=surprise&stage=frontpage&_t=${Date.now()}`,
    filename: 'refined_step_2_frontpage_desktop.png'
  });

  await captureScreen({
    width: 390,
    height: 844,
    mobile: true,
    url: `http://127.0.0.1:5173/?scene=surprise&stage=frontpage&_t=${Date.now()}`,
    filename: 'refined_step_2_frontpage_mobile.png'
  });

  await captureScreen({
    width: 1280,
    height: 800,
    mobile: false,
    url: `http://127.0.0.1:5173/?scene=surprise&stage=revealed&_t=${Date.now()}`,
    filename: 'refined_step_3_revealed_desktop.png'
  });

  await captureScreen({
    width: 390,
    height: 844,
    mobile: true,
    url: `http://127.0.0.1:5173/?scene=surprise&stage=revealed&_t=${Date.now()}`,
    filename: 'refined_step_3_revealed_mobile.png'
  });

  console.log('All screenshots captured successfully!');
}

run().catch(console.error);

