import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const width = 1280;
const height = 800;
const port = 9240;

async function run() {
  console.log('Launching Chrome to verify Cake Scene...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      'http://localhost:5173/',
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

  console.log('Navigating to Cake Scene...');
  // Poll until we are in the Cake Scene
  for (let i = 0; i < 40; i++) {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        // If already in Cake scene
        if (document.querySelector('.garden-cake-hud')) {
          return { ready: true };
        }

        // 1. Boot Gate
        const bootBtn = document.getElementById('boot-gate-primary-btn');
        if (bootBtn) {
          bootBtn.click();
          return { step: 'boot' };
        }

        // 2. Opening / Rose Path
        const skipBtn = document.querySelector('.romantic-skip-btn');
        if (skipBtn) {
          skipBtn.click();
          return { step: 'skip_opening' };
        }

        const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
        if (choiceBtns.length > 0) {
          choiceBtns[0].click();
          const cont = document.querySelector('.btn-romantic-primary');
          if (cont) { cont.click(); return { step: 'cont_opening' }; }
        }

        // 3. Control Room
        const cakeCard = Array.from(document.querySelectorAll('.observatory-module-card button, .module-card-interactive-btn, button')).find(
          b => b.textContent && (b.textContent.includes('Cake') || b.textContent.includes('Cut the Cake'))
        );
        if (cakeCard) {
          cakeCard.click();
          return { step: 'clicked_cake_module' };
        }

        // If generic module cards exist, cake is 3rd (index 2)
        const obsCards = document.querySelectorAll('.observatory-module-card button');
        if (obsCards.length >= 3) {
          obsCards[2].click();
          return { step: 'clicked_obs_card_2' };
        }

        return { step: 'waiting' };
      })()`,
      returnByValue: true,
    });

    if (res?.result?.value?.ready) {
      console.log('Successfully arrived at Cake Scene!');
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  // Allow 3D canvas and procedural textures to render
  await new Promise((r) => setTimeout(r, 1800));

  // Step 1: Capture initial lighting state
  console.log('Capturing cake_initial_lighting.png...');
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap1?.data) {
    fs.writeFileSync(path.join(artifactsDir, 'cake_initial_lighting.png'), Buffer.from(snap1.data, 'base64'));
  }

  // Step 2: Light both candles
  console.log('Lighting both candles...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = document.querySelectorAll('.btn-candle-touch');
      if (btns.length >= 2) {
        btns[0].click();
        setTimeout(() => btns[1].click(), 250);
      }
    })()`,
  });

  // Wait 1s for transition into Wish stage
  await new Promise((r) => setTimeout(r, 1200));

  // Capture wish countdown state
  console.log('Capturing cake_wish_stage.png...');
  const snapWish = await send('Page.captureScreenshot', { format: 'png' });
  if (snapWish?.data) {
    fs.writeFileSync(path.join(artifactsDir, 'cake_wish_stage.png'), Buffer.from(snapWish.data, 'base64'));
  }

  // Wait for 10-second countdown to finish (wait 9.5s)
  console.log('Waiting for wish countdown to complete...');
  await new Promise((r) => setTimeout(r, 9600));

  // Blow out candles
  console.log('Clicking Blow out candles button...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const blowBtn = document.querySelector('.btn-cake-action-blow');
      if (blowBtn) blowBtn.click();
    })()`,
  });

  // Wait for blowout smoke and cutting stage
  await new Promise((r) => setTimeout(r, 1600));

  // Step 4: Make first cut
  console.log('Making cake cut...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const cutBtn = document.querySelector('.btn-cake-cut-fallback');
      if (cutBtn) cutBtn.click();
    })()`,
  });

  // Wait 2.2s for slice to slide out, confetti to burst, and celebration text to display
  await new Promise((r) => setTimeout(r, 2200));

  console.log('Capturing cake_cut_celebration.png...');
  const snap2 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap2?.data) {
    fs.writeFileSync(path.join(artifactsDir, 'cake_cut_celebration.png'), Buffer.from(snap2.data, 'base64'));
  }

  // Step 5: Wait for celebration duration to reach bridge step (~9.8s total in celebration)
  console.log('Waiting for celebration bridge transition (~8s)...');
  await new Promise((r) => setTimeout(r, 8500));

  console.log('Capturing cake_bridge_final.png...');
  const snap3 = await send('Page.captureScreenshot', { format: 'png' });
  if (snap3?.data) {
    fs.writeFileSync(path.join(artifactsDir, 'cake_bridge_final.png'), Buffer.from(snap3.data, 'base64'));
  }

  // Inspect DOM elements in bridge step
  const domInspection = await send('Runtime.evaluate', {
    expression: `(() => {
      const proceedBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('Go on, then'));
      const headerExists = !!document.querySelector('.cake-hud-header');
      const bridgeHeadline = document.querySelector('.celebration-bridge-headline')?.textContent;
      const backBtn = document.querySelector('.cake-discreet-back')?.textContent;
      const floatingTools = document.querySelectorAll('.cake-floating-btn');
      return {
        proceedBtnCount: proceedBtns.length,
        headerExists,
        bridgeHeadline,
        backBtn,
        floatingToolsCount: floatingTools.length
      };
    })()`,
    returnByValue: true,
  });

  console.log('DOM Inspection Results:', domInspection?.result?.value);

  ws.close();
  chrome.kill();
  console.log('Verification completed successfully!');
}

run().catch((err) => {
  console.error('Error during verification:', err);
  process.exit(1);
});
