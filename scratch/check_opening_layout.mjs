import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

async function check() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_check_'));
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9452',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    'http://127.0.0.1:5173/'
  ]);

  try {
    let target = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch('http://127.0.0.1:9452/json');
        const pages = await res.json();
        target = pages.find(p => p.type === 'page' && p.url.includes('5173'));
        if (target) break;
      } catch {}
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) => new Promise(res => {
      const id = Math.floor(Math.random() * 100000);
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
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    await new Promise(r => setTimeout(r, 2500));
    await send('Runtime.evaluate', {
      expression: 'document.querySelector(".garden-entry-link")?.click()'
    });
    await new Promise(r => setTimeout(r, 2000));

    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const toObj = r => r ? ({ x: r.x, y: r.y, width: r.width, height: r.height, left: r.left, right: r.right }) : null;
        const card = document.querySelector('.story-plaque-card')?.getBoundingClientRect();
        const wrapper = document.querySelector('.story-plaque-wrapper')?.getBoundingClientRect();
        const hud = document.querySelector('.garden-story-hud')?.getBoundingClientRect();
        const vp = document.querySelector('.scene-viewport')?.getBoundingClientRect();
        const app = document.querySelector('.app-container')?.getBoundingClientRect();
        return {
          windowWidth: window.innerWidth,
          card: toObj(card),
          wrapper: toObj(wrapper),
          hud: toObj(hud),
          vp: toObj(vp),
          app: toObj(app)
        };
      })()`,
      returnByValue: true
    });

    console.log('Layout evaluation result:', JSON.stringify(evalRes.result?.value, null, 2));
    ws.close();
  } finally {
    chrome.kill();
  }
}

check().catch(console.error);
