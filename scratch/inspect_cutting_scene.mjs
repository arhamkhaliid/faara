import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9335;

async function run() {
  console.log('Launching headless Chrome to inspect cutting scene...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--user-data-dir=/tmp/chrome-inspect-cut',
      '--window-size=1280,800',
      '--incognito',
      `http://127.0.0.1:5173/?scene=cake&_t=${Date.now()}`,
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

    if (!wsUrl) throw new Error('Could not connect to Chrome debugging port');
    console.log('Connected to Chrome WebSocket.');

    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const timer = setTimeout(() => reject(new Error('Timeout on ' + method)), 10000);
        const handler = (e) => {
          const d = JSON.parse(e.data);
          if (d.id === id) {
            clearTimeout(timer);
            ws.removeEventListener('message', handler);
            if (d.error) reject(new Error(JSON.stringify(d.error)));
            else resolve(d.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');

    // Wait for lighting buttons
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 150));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.candle-ignition-control-row'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    // Light both candles
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
        if (btns[0]) btns[0].click();
        if (btns[1]) btns[1].click();
      })()`
    });

    // Wait for wish countdown (10s) -> blow controls
    console.log('Waiting for blow scene...');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.btn-cake-action-blow'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    // Click blow out candles
    console.log('Blowing out candles...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-cake-action-blow');
        if (btn) btn.click();
      })()`
    });

    // Wait for stage === 'cutting'
    console.log('Waiting for cutting stage...');
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.prompt-flow-cut'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    await new Promise(r => setTimeout(r, 1200));

    // Capture desktop cutting scene
    const desktopShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'current_cutting_desktop.png'), Buffer.from(desktopShot.data, 'base64'));
    console.log('Saved current_cutting_desktop.png');

    // Switch to mobile viewport (390x844)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 800));

    const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'current_cutting_mobile.png'), Buffer.from(mobileShot.data, 'base64'));
    console.log('Saved current_cutting_mobile.png');

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(e => {
  console.error('Inspection error:', e);
  process.exit(1);
});

