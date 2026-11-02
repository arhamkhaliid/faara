import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const width = 1280;
const height = 800;
const port = 9246;

async function run() {
  console.log('Launching headless Chrome...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      'http://localhost:5173/?scene=cake',
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

  await new Promise((r) => setTimeout(r, 2000));

  // Click candle 1
  console.log('Clicking Candle 1...');
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

  await new Promise((r) => setTimeout(r, 800));

  // Click candle 2
  console.log('Clicking Candle 2...');
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

  await new Promise((r) => setTimeout(r, 1200));

  console.log('Waiting 11s for wish countdown to finish...');
  await new Promise((r) => setTimeout(r, 11000));

  // Blow out candle
  console.log('Clicking blowout...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.cake-blowout-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Blow'));
      if (btn) btn.click();
    })()`,
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Perform cut
  console.log('Completing cut...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.cake-cut-action-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cut'));
      if (btn) btn.click();
    })()`,
  });

  await new Promise((r) => setTimeout(r, 2000));

  console.log('Capturing cut screenshot...');
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = `${artifactsDir}/cake_refined_cut.png`;
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Saved screenshot to ${outPath}`);

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
