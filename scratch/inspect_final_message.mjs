import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const port = 9260;

async function run() {
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=1280,800',
      '--incognito',
      `http://localhost:5173/?scene=final-message&_t=${Date.now()}`,
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

  // Take screenshot of Scene 7
  const initialShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene7_initial.png`, Buffer.from(initialShot.data, 'base64'));
  console.log('Saved scene7_initial.png');

  // Inspect DOM elements
  const domInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = document.querySelector('.final-message-scene');
      const placeholder = document.querySelector('.placeholder-info');
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        className: b.className,
        disabled: b.disabled,
        rect: b.getBoundingClientRect(),
        outerHTML: b.outerHTML
      }));
      const bodyText = document.body.innerText;
      return {
        hasScene: !!scene,
        hasPlaceholder: !!placeholder,
        placeholderText: placeholder ? placeholder.innerText : null,
        buttons,
        bodyTextSnippet: bodyText.slice(0, 500)
      };
    })()`,
    returnByValue: true
  });
  console.log('DOM Info:', JSON.stringify(domInfo?.result?.value, null, 2));

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
