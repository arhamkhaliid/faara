import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const port = 9265;

async function run() {
  console.log('Launching browser to verify Scene 7 Final Birthday Message...');
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

  const errors = [];
  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Console.messageAdded' && data.params?.message?.level === 'error') {
      errors.push(data.params.message.text);
    }
  });

  await new Promise((r) => setTimeout(r, 1500));

  // 1. Verify Placeholder is gone in Scene 7
  console.log('Verifying Scene 7 layout and absence of placeholder note...');
  const scene7Check = await send('Runtime.evaluate', {
    expression: `(() => {
      const placeholder = document.querySelector('.placeholder-info');
      const bodyText = document.body.innerText;
      const hasOldText = bodyText.includes('Placeholder for Scene 4');
      const paragraphs = Array.from(document.querySelectorAll('.message-paragraph')).map(p => p.textContent.trim());
      const signoff = document.querySelector('.message-signoff')?.textContent.trim();
      const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('One last thing'));
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to Control Room'));

      return {
        hasPlaceholderElement: !!placeholder,
        hasOldTextInBody: hasOldText,
        paragraphsCount: paragraphs.length,
        signoff,
        hasNextBtn: !!nextBtn,
        hasBackBtn: !!backBtn,
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene 7 Check:', scene7Check?.result?.value);

  // Take screenshot of clean Scene 7
  const shotScene7 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene7_verified_clean.png`, Buffer.from(shotScene7.data, 'base64'));
  console.log('Saved scene7_verified_clean.png');

  // 2. Test "One last thing…" click -> transitions to Scene 8 (fake-crash)
  console.log('Clicking "One last thing…" to verify Scene 8 transition...');
  const nextClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('One last thing'));
      if (!btn) return { error: 'Next button missing' };
      btn.click();
      return { clicked: true };
    })()`,
    returnByValue: true
  });
  console.log('Next click triggered:', nextClick?.result?.value);

  await new Promise((r) => setTimeout(r, 1200));

  const scene8Check = await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = document.querySelector('.fake-crash-scene');
      const indicator = document.querySelector('.scene-indicator-val')?.textContent.trim();
      const title = document.querySelector('.crash-title-text')?.textContent.trim();
      return {
        hasFakeCrashScene: !!scene,
        sceneIndicator: indicator,
        crashTitle: title
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene 8 Transition Result:', scene8Check?.result?.value);

  const shotScene8 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene8_from_scene7.png`, Buffer.from(shotScene8.data, 'base64'));
  console.log('Saved scene8_from_scene7.png');

  // 3. Test "Back to Control Room" from Scene 7
  console.log('Navigating back to Scene 7 to test "Back to Control Room"...');
  await send('Page.navigate', { url: `http://localhost:5173/?scene=final-message&_t=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('Clicking "Back to Control Room"...');
  const backClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Back to Control Room'));
      if (!btn) return { error: 'Back button missing' };
      btn.click();
      return { clicked: true };
    })()`,
    returnByValue: true
  });
  console.log('Back click triggered:', backClick?.result?.value);

  await new Promise((r) => setTimeout(r, 1200));

  const controlRoomCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const hud = document.querySelector('.garden-control-hud');
      const title = document.querySelector('.observatory-header')?.textContent.trim();
      const cards = Array.from(document.querySelectorAll('.control-module-card, .module-card')).length;
      return {
        hasControlRoomHUD: !!hud,
        headerSnippet: title?.slice(0, 80),
        cardCount: cards
      };
    })()`,
    returnByValue: true
  });
  console.log('Control Room Transition Result:', controlRoomCheck?.result?.value);

  const shotControlRoom = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/control_room_from_scene7.png`, Buffer.from(shotControlRoom.data, 'base64'));
  console.log('Saved control_room_from_scene7.png');

  // 4. Test Transition from Scene 6 (CakeScene) into Scene 7
  console.log('Testing Scene 6 bridge button navigation into Scene 7...');
  await send('Page.navigate', { url: `http://localhost:5173/?scene=cake&_t=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 2000));

  // Trigger lighting candles and skipping to bridge
  await send('Runtime.evaluate', {
    expression: `(() => {
      // Light candle 1 & 2
      const btns = Array.from(document.querySelectorAll('button'));
      const c1 = btns.find(b => b.textContent.includes('First Candle'));
      const c2 = btns.find(b => b.textContent.includes('Second Candle'));
      if (c1) c1.click();
      if (c2) c2.click();
    })()`
  });

  // Wait a moment, click blowout and then trigger cut
  await new Promise((r) => setTimeout(r, 1000));
  await send('Runtime.evaluate', {
    expression: `(() => {
      const blow = document.querySelector('.btn-cake-action-blow') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Blow'));
      if (blow) blow.click();
    })()`
  });

  await new Promise((r) => setTimeout(r, 1000));
  await send('Runtime.evaluate', {
    expression: `(() => {
      // Trigger cut on canvas
      const el = document.querySelector('.cake-3d-scene-container');
      if (el) {
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + rect.width * 0.55, clientY: rect.top + rect.height * 0.45, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + rect.width * 0.55 + 160, clientY: rect.top + rect.height * 0.45 + 160, bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { clientX: rect.left + rect.width * 0.55 + 160, clientY: rect.top + rect.height * 0.45 + 160, bubbles: true }));
      }
    })()`
  });

  // Wait for celebration and bridge button
  let bridgeFound = false;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const bridgeRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-cake-proceed-final');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });
    if (bridgeRes?.result?.value) {
      console.log('Clicked "Go on, then. ->" bridge button at iteration', i);
      bridgeFound = true;
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 1000));

  const afterCakeBridge = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        scene: document.querySelector('.scene-indicator-val')?.textContent.trim(),
        hasFinalMessageScene: !!document.querySelector('.final-message-scene')
      };
    })()`,
    returnByValue: true
  });
  console.log('Result after Cake Bridge:', afterCakeBridge?.result?.value);

  console.log('Captured console errors count:', errors.length);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
  }

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
