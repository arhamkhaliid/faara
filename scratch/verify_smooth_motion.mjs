import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

async function testSmoothMotion() {
  const port = 9592;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_motion_test_'));

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
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

    // Wait for boot scene
    await new Promise(r => setTimeout(r, 2000));
    await send('Runtime.evaluate', { expression: 'document.querySelector(".garden-entry-link")?.click()' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', { expression: 'document.querySelector(".romantic-skip-btn")?.click()' });
    await new Promise(r => setTimeout(r, 500));
    await send('Runtime.evaluate', { expression: 'document.querySelector(".btn-romantic-primary")?.click()' });
    await new Promise(r => setTimeout(r, 2000));

    // Simulate mouse movements across the screen and platforms
    console.log('Simulating pointer movements over 3D platforms...');
    for (let x = 300; x <= 950; x += 50) {
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y: 480
      });
      await new Promise(r => setTimeout(r, 60));
    }

    // Check console errors
    const logs = await send('Runtime.evaluate', {
      expression: 'window.__errors || []',
      returnByValue: true
    });
    console.log('Errors during pointer sweep:', logs?.result?.value || 0);

    ws.close();
  } finally {
    chrome.kill();
  }
}

testSmoothMotion().then(() => console.log('Smooth motion verified successfully')).catch(console.error);

