import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const port = 9285;
const artifactDir = '/Users/arhamkhalid/.gemini/antigravity-ide/brain/2843e974-b0fe-4080-8fa8-db55f1c0f5df';

async function run() {
  console.log('--- VERIFY: Dreamy Cinematic Atmosphere in Scene 7 ---');
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
  await new Promise((r) => setTimeout(r, 2000));

  // 1. Capture Step 0 (Greeting) screenshot
  const shotStep0 = await send('Page.captureScreenshot', { format: 'png' });
  const step0Path = path.join(artifactDir, 'scene7_enchanted_twilight_step0.png');
  fs.writeFileSync(step0Path, Buffer.from(shotStep0.data, 'base64'));
  console.log(`Saved step 0 screenshot to: ${step0Path}`);

  // 2. Inspect computed styles at step 0
  const step0Audit = await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = document.querySelector('.final-message-scene-full');
      const backdrop = document.querySelector('.enchanted-twilight-backdrop');
      const img = document.querySelector('.enchanted-twilight-img');
      const overlay = document.querySelector('.enchanted-twilight-overlay');
      const glow = document.querySelector('.cinematic-starlight-glow');
      const champagne = document.querySelectorAll('.champagne-particle');
      const champagneRose = document.querySelectorAll('.champagne-particle.tone-rosegold');
      const champagneGold = document.querySelectorAll('.champagne-particle.tone-champagne');
      const greeting = document.querySelector('.final-letter-greeting');

      const csScene = window.getComputedStyle(scene);
      const csGlow = window.getComputedStyle(glow);
      const csChamp = window.getComputedStyle(champagne[0]);
      const csGreet = window.getComputedStyle(greeting);

      return {
        hasTwilightBackdrop: !!backdrop,
        hasTwilightImg: !!img,
        imgSrc: img?.src,
        imgComplete: img?.complete,
        imgNaturalWidth: img?.naturalWidth,
        imgNaturalHeight: img?.naturalHeight,
        hasTwilightOverlay: !!overlay,
        sceneBgColor: csScene.backgroundColor,
        glowBgImage: csGlow.backgroundImage,
        glowFilter: csGlow.filter,
        glowOpacity: csGlow.opacity,
        totalChampagne: champagne.length,
        champagneRoseCount: champagneRose.length,
        champagneGoldCount: champagneGold.length,
        champagneSize: csChamp.width,
        champagneBoxShadow: csChamp.boxShadow,
        greetingColor: csGreet.color,
      };
    })()`,
    returnByValue: true
  });
  console.log('STEP 0 AUDIT:\n', JSON.stringify(step0Audit?.result?.value, null, 2));

  // 3. Advance to final step (all paragraphs + sign-off + button)
  for (let s = 1; s <= 5; s++) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const area = document.querySelector('.final-letter-scroll-area');
        if (area) area.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 450));
  }

  // Wait a moment for button and finishing motes to animate in
  await new Promise((r) => setTimeout(r, 1200));

  // 4. Capture Final Step screenshot
  const shotFinal = await send('Page.captureScreenshot', { format: 'png' });
  const finalPath = path.join(artifactDir, 'scene7_enchanted_twilight_final.png');
  fs.writeFileSync(finalPath, Buffer.from(shotFinal.data, 'base64'));
  console.log(`Saved final step screenshot to: ${finalPath}`);

  // 5. Inspect final step elements
  const finalAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const pCount = document.querySelectorAll('.final-letter-p').length;
      const signoff = document.querySelector('.final-letter-signoff')?.textContent?.trim();
      const btn = document.querySelector('.btn-one-last-thing');
      const finishingLayer = document.querySelector('.finishing-motes-layer');
      const finishingMotes = document.querySelectorAll('.finishing-mote');

      return {
        pCount,
        signoff,
        hasButton: !!btn,
        buttonText: btn?.textContent?.trim(),
        finishingActive: finishingLayer?.classList.contains('is-active'),
        finishingMotesCount: finishingMotes.length,
      };
    })()`,
    returnByValue: true
  });
  console.log('FINAL STEP AUDIT:\n', JSON.stringify(finalAudit?.result?.value, null, 2));

  // 6. Test Button Click & Transition to Scene 8
  const clickResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-one-last-thing');
      if (!btn) return { error: 'Button not found' };
      btn.click();
      return { clicked: true };
    })()`,
    returnByValue: true
  });
  console.log('BUTTON CLICK RESULT:', clickResult?.result?.value);

  // Wait for transition to fake-crash
  await new Promise((r) => setTimeout(r, 600));

  const scene8Check = await send('Runtime.evaluate', {
    expression: `(() => {
      const crashScene = document.querySelector('.fake-crash-scene-full');
      const crashOverlay = document.querySelector('.crash-overlay');
      return {
        hasCrashScene: !!crashScene || !!crashOverlay,
        activeClasses: document.body.innerHTML.includes('crash') || document.body.innerHTML.includes('reboot'),
      };
    })()`,
    returnByValue: true
  });
  console.log('SCENE 8 TRANSITION CHECK:\n', JSON.stringify(scene8Check?.result?.value, null, 2));

  chrome.kill();
  console.log('--- AUDIT COMPLETE ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
