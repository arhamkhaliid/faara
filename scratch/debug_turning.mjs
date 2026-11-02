import { spawn } from 'child_process';

const port = 9288;
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--window-size=1280,800',
    '--incognito',
    'http://127.0.0.1:5173/?scene=surprise&stage=turning',
  ]
);

async function inspect() {
  let wsUrl = null;
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 150));
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
  if (!wsUrl) throw new Error('No target found');

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = 123;
      ws.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === id) resolve(d.result);
      };
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 1000));

  const info = await send('Runtime.evaluate', {
    expression: `(() => {
      const img = document.querySelector('.newspaper-image-canvas');
      const booklet = document.querySelector('.newspaper-booklet');
      return {
        bookletRect: booklet ? {
          width: booklet.offsetWidth,
          height: booklet.offsetHeight,
          top: booklet.offsetTop,
          left: booklet.offsetLeft
        } : null,
        imgSrc: img?.src,
        imgComplete: img?.complete,
        imgNaturalWidth: img?.naturalWidth,
        imgNaturalHeight: img?.naturalHeight,
        imgRect: img ? {
          width: img.offsetWidth,
          height: img.offsetHeight
        } : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Image details:', info?.result?.value);

  ws.close();
  chrome.kill();
}

inspect().catch(err => {
  console.error(err);
  chrome.kill();
});