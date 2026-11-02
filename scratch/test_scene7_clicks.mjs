import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const port = 9261;

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
  await send('Console.enable');

  const consoleLogs = [];
  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Console.messageAdded') {
      consoleLogs.push(data.params.message);
    }
  });

  await new Promise((r) => setTimeout(r, 1500));

  // Test Click 1: "One last thing…"
  console.log('Testing click on "One last thing…" button...');
  const clickRes1 = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('One last thing'));
      if (!btn) return { error: 'Button not found' };
      btn.click();
      return { clicked: true, text: btn.textContent };
    })()`,
    returnByValue: true,
  });
  console.log('Click 1 result:', clickRes1?.result?.value);

  await new Promise((r) => setTimeout(r, 1000));

  const afterClick1 = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        url: window.location.href,
        sceneIndicator: document.querySelector('.scene-indicator-val')?.textContent,
        hasFakeCrashScene: !!document.querySelector('.fake-crash-scene'),
        bodyTextSnippet: document.body.innerText.slice(0, 300)
      };
    })()`,
    returnByValue: true,
  });
  console.log('State after Click 1:', afterClick1?.result?.value);

  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene7_after_click_next.png`, Buffer.from(shot1.data, 'base64'));
  console.log('Saved scene7_after_click_next.png');

  // Now reload and test Click 2: "Back to Control Room"
  await send('Page.navigate', { url: `http://localhost:5173/?scene=final-message&_t=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('Testing click on "Back to Control Room" button...');
  const clickRes2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Back to Control Room'));
      if (!btn) return { error: 'Button not found' };
      btn.click();
      return { clicked: true, text: btn.textContent };
    })()`,
    returnByValue: true,
  });
  console.log('Click 2 result:', clickRes2?.result?.value);

  await new Promise((r) => setTimeout(r, 1000));

  const afterClick2 = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        url: window.location.href,
        sceneIndicator: document.querySelector('.scene-indicator-val')?.textContent,
        hasControlRoomScene: !!document.querySelector('.control-room-scene'),
        bodyTextSnippet: document.body.innerText.slice(0, 300)
      };
    })()`,
    returnByValue: true,
  });
  console.log('State after Click 2:', afterClick2?.result?.value);

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene7_after_click_back.png`, Buffer.from(shot2.data, 'base64'));
  console.log('Saved scene7_after_click_back.png');

  console.log('Console logs during test:', consoleLogs);

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
