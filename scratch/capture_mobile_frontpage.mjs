import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9312;

async function capture() {
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=390,844',
      '--incognito',
      `http://127.0.0.1:5173/?scene=surprise&stage=frontpage&_t=${Date.now()}`,
    ]
  );

  let wsUrl = null;
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 150));
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

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = 123;
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === id) resolve(d.result);
      };
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await new Promise(r => setTimeout(r, 800));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'refined_step_2_frontpage_mobile.png'), Buffer.from(shot.data, 'base64'));

  ws.close();
  chrome.kill();
  console.log('Mobile frontpage captured');
}

capture();

