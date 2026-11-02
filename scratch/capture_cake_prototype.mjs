import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const width = 1280;
const height = 800;
const port = 9245;

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

  console.log('Waiting 3.5s for 3D world canvas & textures to render...');
  await new Promise((r) => setTimeout(r, 3500));

  console.log('Capturing screenshot...');
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = `${artifactsDir}/cake_refined_initial.png`;
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`Saved screenshot to ${outPath}`);

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
