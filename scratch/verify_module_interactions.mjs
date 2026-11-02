import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

async function testInteractions() {
  const port = 9590;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_test_nav_'));

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

    // Nav to Opening
    await send('Runtime.evaluate', { expression: 'document.querySelector(".garden-entry-link")?.click()' });
    await new Promise(r => setTimeout(r, 1000));

    // Skip pacing
    await send('Runtime.evaluate', { expression: 'document.querySelector(".romantic-skip-btn")?.click()' });
    await new Promise(r => setTimeout(r, 500));

    // Enter Control Room
    await send('Runtime.evaluate', { expression: 'document.querySelector(".btn-romantic-primary")?.click()' });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Navigated to Control Room');

    // Check presence of platform buttons
    const btnRes = await send('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll(".platform-label-btn")).map(b => b.textContent.trim())',
      returnByValue: true
    });
    console.log('Found Platform Buttons:', btnRes.result.value);

    // Test Surprise Click
    await send('Runtime.evaluate', {
      expression: 'document.querySelector(".slot-surprise .platform-label-btn")?.click()'
    });
    await new Promise(r => setTimeout(r, 1000));

    const sceneAfterSurprise = await send('Runtime.evaluate', {
      expression: 'document.body.innerHTML.includes("Surprise") || document.querySelector(".surprise-viewport") !== null',
      returnByValue: true
    });
    console.log('Surprise Scene active:', sceneAfterSurprise.result.value);

    ws.close();
  } finally {
    chrome.kill();
  }
}

testInteractions().then(() => console.log('Test done')).catch(console.error);

