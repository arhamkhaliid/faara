import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

const artifactDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function captureScene(width, height, isMobile) {
  const port = 9520 + Math.floor(Math.random() * 40);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_edit_'));
  const prefix = isMobile ? 'opening_mobile' : 'opening_desktop';
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

    // Navigate to Opening Scene by clicking "Come have a look ->"
    await send('Runtime.evaluate', {
      expression: 'document.querySelector(".garden-entry-link")?.click()'
    });

    // Wait 2s for camera to track forward into Opening
    await new Promise(r => setTimeout(r, 2000));

    // Capture initial beat ("Oh. You're here.")
    let snap = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(`${artifactDir}/${prefix}_1_initial.png`, Buffer.from(snap.data, 'base64'));
    console.log(`Saved ${prefix}_1_initial.png`);

    // Skip pacing to reveal response choices
    await send('Runtime.evaluate', {
      expression: 'document.querySelector(".romantic-skip-btn")?.click()'
    });
    await new Promise(r => setTimeout(r, 800));

    snap = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(`${artifactDir}/${prefix}_2_choices.png`, Buffer.from(snap.data, 'base64'));
    console.log(`Saved ${prefix}_2_choices.png`);

    // Click "Let's see" choice
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-romantic-choice'));
        const letsSee = btns.find(b => b.textContent.includes("Let's see") || b.textContent.includes("see"));
        if (letsSee) letsSee.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 800));

    snap = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(`${artifactDir}/${prefix}_3_confession.png`, Buffer.from(snap.data, 'base64'));
    console.log(`Saved ${prefix}_3_confession.png`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function run() {
  await captureScene(1280, 800, false);
  await captureScene(390, 844, true);
  console.log('ALL EDITORIAL OPENING SCREENSHOTS CAPTURED!');
}

run().catch(console.error);

