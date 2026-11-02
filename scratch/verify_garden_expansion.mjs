import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const artifactDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function captureAndVerify(width, height, filename, checkNavigation = false) {
  const port = 9320 + Math.floor(Math.random() * 50);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_profile_'));
  console.log(`Testing Chrome at ${width}x${height} on port ${port}...`);
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${tmpDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--window-size=${width},${height}`,
      '--incognito',
      '--disable-cache',
      '--disk-cache-size=1',
      `http://127.0.0.1:5173/?_t=${Date.now()}`,
    ]
  );

  try {
    let target = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`).catch(() => fetch(`http://localhost:${port}/json`));
        const pages = await res.json();
        target = pages.find((p) => p.type === 'page' && (p.url.includes('5173') || p.title.includes('FAARA')));
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

    // Wait 3.5s for textures and 3D scene to load and render
    await new Promise((r) => setTimeout(r, 3500));

    // Capture Landing Screenshot
    const snap = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });

    const outPath = `${artifactDir}/${filename}`;
    fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
    console.log(`Saved screenshot to ${outPath}`);

    // If checkNavigation, click "Come have a look ->"
    if (checkNavigation) {
      console.log('Testing navigation click...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('.garden-entry-link');
          if (btn) btn.click();
        })()`,
      });

      // Wait 1.8s for camera to track forward into OpeningScene
      await new Promise((r) => setTimeout(r, 1800));

      const navSnap = await send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      const navPath = `${artifactDir}/garden_expansion_opening_nav.png`;
      fs.writeFileSync(navPath, Buffer.from(navSnap.data, 'base64'));
      console.log(`Saved opening navigation screenshot to ${navPath}`);
    }

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

async function run() {
  await captureAndVerify(1280, 800, 'garden_expansion_desktop.png', true);
  await captureAndVerify(390, 844, 'garden_expansion_mobile.png', false);
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

