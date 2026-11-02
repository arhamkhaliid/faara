import { spawn } from 'child_process';
import fs from 'fs';

const port = 9272;

async function run() {
  console.log('Testing Scene 6 bridge button navigation into Scene 7...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=1280,800',
      '--incognito',
      `http://localhost:5173/?scene=cake&_t=${Date.now()}`,
    ]
  );

  let target = null;
  for (let i = 0; i < 30; i++) {
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

  await new Promise((r) => (ws.onopen = r));
  await send('Runtime.enable');
  await send('Page.enable');

  await new Promise((r) => setTimeout(r, 1500));

  // Light both candles
  console.log('Lighting candles...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const c1 = btns.find(b => b.textContent.includes('First Candle'));
      const c2 = btns.find(b => b.textContent.includes('Second Candle'));
      if (c1) c1.click();
      if (c2) c2.click();
    })()`
  });

  // Wait for 10-second wish countdown to reveal blowout button
  console.log('Waiting for 10s wish countdown...');
  let blownOut = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-cake-action-blow') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Blow'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });
    if (res?.result?.value) {
      console.log('Blowout button appeared and clicked at iteration', i);
      blownOut = true;
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 1500));

  // Trigger cut on canvas
  console.log('Triggering cut...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('.cake-3d-scene-container');
      if (el) {
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + rect.width * 0.55, clientY: rect.top + rect.height * 0.45, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + rect.width * 0.55 + 160, clientY: rect.top + rect.height * 0.45 + 160, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { clientX: rect.left + rect.width * 0.55 + 160, clientY: rect.top + rect.height * 0.45 + 160, bubbles: true }));
      }
    })()`
  });

  console.log('Waiting 10s for celebration success to advance to bridge step...');
  await new Promise((r) => setTimeout(r, 10200));

  const bridgeBtnCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-cake-proceed-final');
      if (btn) {
        const text = btn.textContent.trim();
        btn.click();
        return { found: true, text, clicked: true };
      }
      return { found: false, buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()) };
    })()`,
    returnByValue: true
  });
  console.log('Bridge Button Result:', bridgeBtnCheck?.result?.value);

  await new Promise((r) => setTimeout(r, 1500));

  const sceneResult = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        scene: document.querySelector('.scene-indicator-val')?.textContent.trim(),
        hasFinalMessageScene: !!document.querySelector('.final-message-scene'),
        title: document.querySelector('.calm-sky-title')?.textContent.trim(),
        hasPlaceholder: !!document.querySelector('.placeholder-info')
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene Transition from Cake -> Scene 7:', sceneResult?.result?.value);

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
