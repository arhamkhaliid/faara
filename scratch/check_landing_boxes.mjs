import { spawn } from 'child_process';

const port = 9256;
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--window-size=1280,800',
    'http://localhost:5173/',
  ]
);

async function run() {
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
  await new Promise((r) => setTimeout(r, 1500));

  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const title = document.querySelector('.garden-landing-title');
      const subtitle = document.querySelector('.garden-landing-subtitle');
      const msg1 = document.querySelectorAll('.garden-landing-message-line')[0];
      const msg2 = document.querySelectorAll('.garden-landing-message-line')[1];
      const link = document.querySelector('.garden-entry-link');
      const toBox = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      };
      return {
        title: toBox(title),
        subtitle: toBox(subtitle),
        msg1: toBox(msg1),
        msg2: toBox(msg2),
        link: toBox(link),
      };
    })()`,
    returnByValue: true,
  });

  console.log('Element Bounding Boxes:', JSON.stringify(result.result?.value || result, null, 2));
  ws.close();
  chrome.kill();
}

run().catch((e) => {
  console.error(e);
  chrome.kill();
});
