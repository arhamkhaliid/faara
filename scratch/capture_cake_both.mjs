import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const width = 1280;
const height = 800;
const port = 9249;

async function run() {
  console.log('Launching headless Chrome...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      '--incognito',
      '--disable-cache',
      '--disk-cache-size=1',
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

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  await new Promise((r) => setTimeout(r, 2500));

  console.log('Capturing Initial Arrival / Lighting state screenshot...');
  const initialScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  const initialPath = `${artifactsDir}/cake_glb_initial.png`;
  fs.writeFileSync(initialPath, Buffer.from(initialScreenshot.data, 'base64'));
  console.log(`Saved initial arrival screenshot to ${initialPath}`);

  // Light Candle 1
  console.log('Lighting Candle 1...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent && b.textContent.includes('First Candle')) {
          b.click();
          return true;
        }
      }
      return false;
    })()`,
  });

  await new Promise((r) => setTimeout(r, 600));

  // Light Candle 2
  console.log('Lighting Candle 2...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent && b.textContent.includes('Second Candle')) {
          b.click();
          return true;
        }
      }
      return false;
    })()`,
  });

  console.log('Waiting for wish countdown and blowout button to appear...');
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
      console.log('Blowout clicked successfully at iteration', i);
      blownOut = true;
      break;
    }
  }

  if (!blownOut) {
    console.warn('Blowout button not found after waiting, attempting forced blowout click');
  }

  // Wait for transition into cutting stage
  console.log('Waiting 2s for cutting stage to settle...');
  await new Promise((r) => setTimeout(r, 2000));

  // Capture Pre-Cut state
  console.log('Capturing Pre-Cut state screenshot...');
  const preCutScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  const preCutPath = `${artifactsDir}/cake_glb_pre_cut.png`;
  fs.writeFileSync(preCutPath, Buffer.from(preCutScreenshot.data, 'base64'));
  fs.writeFileSync(`${artifactsDir}/cake_pre_cut.png`, Buffer.from(preCutScreenshot.data, 'base64'));
  console.log(`Saved pre-cut screenshot to ${preCutPath}`);

  // Now trigger cut via dragging on canvas (and fallback button if present)
  console.log('Triggering drag-to-cut...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('.cake-3d-scene-container');
      if (el) {
        const rect = el.getBoundingClientRect();
        const startX = rect.left + rect.width * 0.55;
        const startY = rect.top + rect.height * 0.45;
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: startX, clientY: startY, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointermove', { clientX: startX + 160, clientY: startY + 160, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { clientX: startX + 160, clientY: startY + 160, bubbles: true }));
      }
      const fallbackBtn = document.querySelector('.btn-cake-cut-fallback');
      if (fallbackBtn) fallbackBtn.click();
      return true;
    })()`,
  });

  // Wait for celebration and cut animation to settle
  console.log('Waiting 2.5s for celebration & slice animation...');
  await new Promise((r) => setTimeout(r, 2500));

  // Capture Celebration Post-Cut state
  console.log('Capturing Post-Cut celebration screenshot...');
  const postCutScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  const postCutPath = `${artifactsDir}/cake_glb_cut.png`;
  fs.writeFileSync(postCutPath, Buffer.from(postCutScreenshot.data, 'base64'));
  fs.writeFileSync(`${artifactsDir}/cake_refined_cut.png`, Buffer.from(postCutScreenshot.data, 'base64'));
  console.log(`Saved post-cut screenshot to ${postCutPath}`);

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
