import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function captureScene(width, height, isMobile) {
  const port = 9560 + Math.floor(Math.random() * 30);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_ctrl_'));
  const prefix = isMobile ? 'control_room_mobile' : 'control_room_desktop';
  console.log(`Starting Chrome at ${width}x${height} (port ${port})...`);

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    `--window-size=${width},${height}`,
    'http://127.0.0.1:5173/'
  ]);

  try {
    let target = null;
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const pages = await res.json();
        target = pages.find(p => p.type === 'page' && p.url.includes('5173'));
        if (target) break;
      } catch {}
    }

    if (!target) throw new Error('Target not found');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) => new Promise(res => {
      const id = Math.floor(Math.random() * 1000000);
      const h = e => {
        const d = JSON.parse(e.data);
        if (d.id === id) {
          ws.removeEventListener('message', h);
          res(d.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile
    });

    // Wait for boot scene to load
    await new Promise(r => setTimeout(r, 2500));

    // Navigate to Opening Scene (Scene 2) by clicking "Come have a look ->"
    await send('Runtime.evaluate', {
      expression: 'document.querySelector(".garden-entry-link")?.click()'
    });

    // Wait for camera to settle in Opening Scene
    await new Promise(r => setTimeout(r, 1500));

    // Skip pacing in Opening Scene to reveal "Enter Control Room ->"
    await send('Runtime.evaluate', {
      expression: 'document.querySelector(".romantic-skip-btn")?.click()'
    });
    await new Promise(r => setTimeout(r, 600));

    // Click "Enter Control Room ->" to transition from Scene 2 to Scene 3
    await send('Runtime.evaluate', {
      expression: 'document.querySelector(".btn-romantic-primary")?.click()'
    });

    // Wait for camera to glide forward into Control Room (Scene 3) and settle
    await new Promise(r => setTimeout(r, 2200));

    // Capture screenshot of Control Room Scene
    const snap = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(`${artifactDir}/${prefix}_centered.png`, Buffer.from(snap.data, 'base64'));
    console.log(`Saved ${prefix}_centered.png`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function run() {
  await captureScene(1280, 800, false);
  await captureScene(390, 844, true);
  console.log('ALL CONTROL ROOM SCREENSHOTS CAPTURED!');
}

run().catch(console.error);

