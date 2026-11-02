import { spawn } from 'child_process';
import fs from 'fs';

const port = 9280;

async function runFinish() {
  console.log('=== RUNNING FINAL PASS: MOBILE VIEWPORT & ACCESSIBILITY AUDIT ===\n');

  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=390,844',
      '--incognito',
      `http://localhost:5173/?scene=control-room&_t=${Date.now()}`,
    ]
  );

  let target = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch(`http://localhost:${port}/json`);
      const pages = await res.json();
      target = pages.find((p) => p.url.includes('5173'));
      if (target) break;
    } catch {}
  }

  if (!target) {
    chrome.kill();
    throw new Error('Chrome remote debugging target not found');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const consoleLogs = [];
  const errors = [];
  const failedRequests = [];

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
      consoleLogs.push({ type: data.params.type, text });
      if (data.params.type === 'error') {
        errors.push(text);
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      errors.push(data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || ''));
    }
    if (data.method === 'Network.loadingFailed') {
      failedRequests.push(data.params);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  const evalInPage = async (expr) => {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error((res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Eval error'));
    }
    return res?.result?.value;
  };

  await new Promise((r) => setTimeout(r, 1500));

  console.log('Auditing Mobile Layout at 390px (Control Room):');
  const crMobile = await evalInPage(`(() => {
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;
    const overflow = scrollW > clientW;
    const buttons = Array.from(document.querySelectorAll('button')).map(b => {
      const r = b.getBoundingClientRect();
      return { text: b.textContent?.trim(), w: Math.round(r.width), h: Math.round(r.height) };
    });
    return { scrollW, clientW, overflow, buttons };
  })()`);
  console.log('Control Room Mobile:', crMobile);

  // Navigate to Cake Scene on Mobile
  await send('Page.navigate', { url: `http://localhost:5173/?scene=cake&_t=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 2000));

  const cakeMobile = await evalInPage(`(() => {
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;
    const overflow = scrollW > clientW;
    const buttons = Array.from(document.querySelectorAll('button')).map(b => {
      const r = b.getBoundingClientRect();
      return { text: b.textContent?.trim(), w: Math.round(r.width), h: Math.round(r.height) };
    });
    return { scrollW, clientW, overflow, buttons };
  })()`);
  console.log('Cake Mobile:', cakeMobile);

  // Navigate to Final Message Scene on Mobile
  await send('Page.navigate', { url: `http://localhost:5173/?scene=final-message&_t=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 1500));

  const finalMobile = await evalInPage(`(() => {
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;
    const overflow = scrollW > clientW;
    const letter = document.querySelector('.final-letter-content');
    const letterW = letter ? Math.round(letter.getBoundingClientRect().width) : 0;
    return { scrollW, clientW, overflow, letterW };
  })()`);
  console.log('Final Message Mobile:', finalMobile);

  // Test Certificate on Mobile
  await send('Page.navigate', { url: `http://localhost:5173/?scene=certificate&_t=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 1500));

  const certMobile = await evalInPage(`(() => {
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;
    const overflow = scrollW > clientW;
    const canvas = document.querySelector('.cert-signature-canvas');
    const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
    return { scrollW, clientW, overflow, canvasW: canvasRect ? Math.round(canvasRect.width) : 0 };
  })()`);
  console.log('Certificate Mobile:', certMobile);

  // Test Reduced Motion
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await new Promise((r) => setTimeout(r, 500));

  const reducedMotionCheck = await evalInPage(`(() => {
    const mediaMatches = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isRootAnimZero = getComputedStyle(document.body).animationDuration === '0.00001s' || getComputedStyle(document.body).animationDuration === '0s';
    return { mediaMatches, isRootAnimZero };
  })()`);
  console.log('Reduced Motion Audit:', reducedMotionCheck);

  console.log('\n--- Console Logs & Errors Across Mobile Tests ---');
  console.log('Total logs:', consoleLogs.length);
  console.log('Errors caught:', errors);
  console.log('Failed network requests:', failedRequests);

  chrome.kill();
  process.exit(0);
}

runFinish().catch(err => {
  console.error(err);
  process.exit(1);
});
