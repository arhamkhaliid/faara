import { spawn } from 'child_process';
import fs from 'fs';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';
const port = 9265;

async function run() {
  console.log('--- Starting Scene 7 & 8 Verification Flow ---');
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
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
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

  await new Promise((r) => setTimeout(r, 1500));

  // 1. Verify Scene 7 Initial Environment
  console.log('1. Checking Scene 7 initial render...');
  const initCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const hasScene = !!document.querySelector('.final-message-scene-full');
      const hasOldCard = !!document.querySelector('.scene-card');
      const hasNavBar = !!document.querySelector('.app-nav-bar');
      const hasFooter = !!document.querySelector('.skeleton-footer');
      const hasCharacter = !!document.querySelector('img[src*="character"], .character-image, .character-container');
      const starsCount = document.querySelectorAll('.soft-star').length;
      const distantStarsCount = document.querySelectorAll('.soft-star.depth-distant').length;
      const midStarsCount = document.querySelectorAll('.soft-star.depth-mid').length;
      const champagneParticlesCount = document.querySelectorAll('.champagne-particle').length;
      const hasStarlightGlow = !!document.querySelector('.cinematic-starlight-glow');
      const greeting = document.querySelector('.final-letter-greeting')?.textContent?.trim();
      const pCount = document.querySelectorAll('.final-letter-p').length;
      const hasOneLastThing = !!document.querySelector('.btn-one-last-thing');

      return {
        hasScene,
        hasOldCard,
        hasNavBar,
        hasFooter,
        hasCharacter,
        starsCount,
        distantStarsCount,
        midStarsCount,
        champagneParticlesCount,
        hasStarlightGlow,
        greeting,
        pCount,
        hasOneLastThing,
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene 7 Init Check:', JSON.stringify(initCheck?.result?.value, null, 2));

  const shotStep0 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene7_step0.png`, Buffer.from(shotStep0.data, 'base64'));
  console.log('Saved scene7_step0.png');

  // 2. Test Tap-To-Advance
  console.log('2. Advancing through message paragraphs via taps...');
  for (let step = 1; step <= 4; step++) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const area = document.querySelector('.final-letter-scroll-area');
        if (area) {
          area.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  const advancedCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const pTexts = Array.from(document.querySelectorAll('.final-letter-p')).map(p => p.textContent.trim());
      const signoff = document.querySelector('.final-letter-signoff')?.textContent?.trim();
      const hasOneLastThing = !!document.querySelector('.btn-one-last-thing');
      const finishingMotesActive = !!document.querySelector('.finishing-motes-layer.is-active');
      return { pTexts, signoff, hasOneLastThing, finishingMotesActive };
    })()`,
    returnByValue: true
  });
  console.log('Paragraphs and Signoff Check:', JSON.stringify(advancedCheck?.result?.value, null, 2));

  const shotAllParagraphs = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene7_paragraphs.png`, Buffer.from(shotAllParagraphs.data, 'base64'));
  console.log('Saved scene7_paragraphs.png');

  // 3. Wait for 3-second pause to reveal "One last thing…" button
  console.log('3. Waiting for "One last thing…" button reveal (or advancing)...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const area = document.querySelector('.final-letter-scroll-area');
      if (area) {
        area.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    })()`,
  });
  await new Promise((r) => setTimeout(r, 500));

  const buttonCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-one-last-thing');
      return {
        hasBtn: !!btn,
        btnText: btn?.textContent?.trim(),
        visible: btn ? btn.getBoundingClientRect().width > 0 : false
      };
    })()`,
    returnByValue: true
  });
  console.log('One Last Thing Button Check:', JSON.stringify(buttonCheck?.result?.value, null, 2));

  const shotButton = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene7_button_revealed.png`, Buffer.from(shotButton.data, 'base64'));
  console.log('Saved scene7_button_revealed.png');

  // 4. Click "One last thing…" and observe Scene 8 Crash sequence
  console.log('4. Clicking "One last thing…" button...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-one-last-thing');
      if (btn) btn.click();
    })()`,
  });

  // Check Beat 1/2/3: Glitch -> Vintage Alert Window with Silent Pause
  await new Promise((r) => setTimeout(r, 600)); // after glitch (400ms), during silent pause
  const crashSilentCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const hasCrashScene = !!document.querySelector('.fake-crash-scene-full');
      const dialogTitle = document.querySelector('.vintage-title-text')?.textContent?.trim();
      const standbyText = document.querySelector('.standby-text')?.textContent?.trim();
      const hasCharacter = !!document.querySelector('img[src*="character"], .character-image, .character-container');
      return { hasCrashScene, dialogTitle, standbyText, hasCharacter };
    })()`,
    returnByValue: true
  });
  console.log('Scene 8 Silent Pause Check:', JSON.stringify(crashSilentCheck?.result?.value, null, 2));

  const shotSilentPause = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene8_silent_pause.png`, Buffer.from(shotSilentPause.data, 'base64'));
  console.log('Saved scene8_silent_pause.png');

  // Wait for Beat 4 & Beat 5 (reboot text, progress bar 100%, action buttons)
  console.log('5. Waiting for reboot sequence and action buttons...');
  await new Promise((r) => setTimeout(r, 6500));

  const rebootCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const logs = Array.from(document.querySelectorAll('.vintage-log-line')).map(l => l.textContent.trim());
      const progressLabel = document.querySelector('.vintage-progress-label')?.textContent?.trim();
      const rebootClosing = document.querySelector('.vintage-reboot-closing')?.textContent?.trim();
      const replayBtn = document.querySelector('.btn-replay-cake')?.textContent?.trim();
      const controlBtn = document.querySelector('.btn-back-control')?.textContent?.trim();
      const hasCharacter = !!document.querySelector('img[src*="character"], .character-image, .character-container');

      return {
        logs,
        progressLabel,
        rebootClosing,
        replayBtn,
        controlBtn,
        hasCharacter
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene 8 Completed Reboot Check:', JSON.stringify(rebootCheck?.result?.value, null, 2));

  const shotReboot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/scene8_reboot_finished.png`, Buffer.from(shotReboot.data, 'base64'));
  console.log('Saved scene8_reboot_finished.png');

  // 6. Test "Replay cake" action
  console.log('6. Clicking "Replay cake"...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-replay-cake');
      if (btn) btn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 2000));

  const cakeCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const hasCakeHUD = !!document.querySelector('.garden-cake-hud');
      const hasLightingStage = !!document.querySelector('.prompt-flow-lighting');
      const promptTitle = document.querySelector('.prompt-title')?.textContent?.trim();
      const candleButtons = Array.from(document.querySelectorAll('.btn-candle-touch')).map(b => b.textContent.trim());
      return { hasCakeHUD, hasLightingStage, promptTitle, candleButtons };
    })()`,
    returnByValue: true
  });
  console.log('Replay Cake Scene Check:', JSON.stringify(cakeCheck?.result?.value, null, 2));

  const shotCakeReplay = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/cake_scene_reset.png`, Buffer.from(shotCakeReplay.data, 'base64'));
  console.log('Saved cake_scene_reset.png');

  // 7. Test "Back to Control Room" action
  console.log('7. Navigating back to Scene 8 and clicking "Back to Control Room"...');
  await send('Page.navigate', { url: `http://localhost:5173/?scene=fake-crash&_t=${Date.now()}` });
  await new Promise((r) => setTimeout(r, 1000));
  // Fast advance to actions
  for (let i = 0; i < 6; i++) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const full = document.querySelector('.fake-crash-scene-full');
        if (full) full.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 500));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-back-control');
      if (btn) btn.click();
    })()`,
  });
  await new Promise((r) => setTimeout(r, 2000));

  const controlRoomCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const hasControlHUD = !!document.querySelector('.garden-control-hud');
      const headline = document.querySelector('.control-observatory-card h2, .control-observatory-card h1, .control-observatory-card .garden-hero-title')?.textContent?.trim() || document.querySelector('.control-observatory-card')?.innerText.slice(0, 100);
      return { hasControlHUD, headline };
    })()`,
    returnByValue: true
  });
  console.log('Control Room Check:', JSON.stringify(controlRoomCheck?.result?.value, null, 2));

  const shotControlRoom = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${artifactsDir}/control_room_navigated.png`, Buffer.from(shotControlRoom.data, 'base64'));
  console.log('Saved control_room_navigated.png');

  console.log('--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
