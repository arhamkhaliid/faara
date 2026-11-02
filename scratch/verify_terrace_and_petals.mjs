import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9287;

async function run() {
  console.log('Connecting to Chrome on port', port);
  const tabRes = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:5173/?scene=final-message&_t=${Date.now()}`, { method: 'PUT' });
  const page = await tabRes.json();
  console.log('Created tab:', page.id);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const timer = setTimeout(() => reject(new Error('Timeout on ' + method)), 15000);
      const handler = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === id) {
          clearTimeout(timer);
          ws.removeEventListener('message', handler);
          if (d.error) reject(new Error(JSON.stringify(d.error)));
          else resolve(d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Runtime.enable');
  await send('Page.enable');

  // Set desktop viewport (1280x800)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Wait for initial mount and assets
  await new Promise(r => setTimeout(r, 1000));

  // 1. Audit Background Image & Particle Structure
  const bgAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const bgImg = document.querySelector('.final-terrace-img');
      const bgBackdrop = document.querySelector('.final-terrace-backdrop');
      const overlay = document.querySelector('.final-terrace-overlay');
      const oldSky = document.querySelector('.enchanted-twilight-img');
      const lanterns = document.querySelector('.lanterns-layer');
      const champagne = document.querySelector('.champagne-particle');
      const finishingMotes = document.querySelector('.finishing-motes-layer');
      const petalsCanvas = document.querySelector('.final-message-petals-canvas canvas');
      const fallbackPetals = document.querySelectorAll('.ambient-petal');

      return {
        hasNewBg: Boolean(bgImg),
        bgSrc: bgImg?.src,
        isComplete: bgImg?.complete,
        naturalWidth: bgImg?.naturalWidth,
        naturalHeight: bgImg?.naturalHeight,
        hasOverlay: Boolean(overlay),
        hasOldSky: Boolean(oldSky),
        hasLanterns: Boolean(lanterns),
        hasChampagneOrbs: Boolean(champagne),
        hasFinishingMotes: Boolean(finishingMotes),
        hasPetalsCanvas: Boolean(petalsCanvas),
        fallbackPetalsCount: fallbackPetals.length
      };
    })()`,
    returnByValue: true
  });

  const bgData = bgAudit.result.value;
  console.log('Background & Particle Audit Data:', JSON.stringify(bgData, null, 2));

  if (!bgData.hasNewBg || !bgData.bgSrc.includes('final_terrace_bg.jpg')) {
    throw new Error('FAIL: Romantic twilight terrace background image not found!');
  }
  if (!bgData.isComplete || bgData.naturalWidth === 0) {
    throw new Error('FAIL: Background image failed to load or has 0 natural width.');
  }
  if (bgData.hasOldSky) {
    throw new Error('FAIL: Old cloudy sky image still present in DOM.');
  }
  if (bgData.hasLanterns || bgData.hasChampagneOrbs || bgData.hasFinishingMotes) {
    throw new Error('FAIL: Upward-floating orbs still present in DOM!');
  }
  if (!bgData.hasPetalsCanvas && bgData.fallbackPetalsCount === 0) {
    throw new Error('FAIL: No falling petals canvas or fallback petals found!');
  }

  console.log('PASS: New twilight terrace background loaded properly!');
  console.log('PASS: Upward floating orbs completely removed!');
  console.log('PASS: Falling rose petals layer active!');

  // Advance through all beats up to maxStep
  console.log('Advancing through all beats...');
  for (let i = 0; i < 12; i++) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const scene = document.querySelector('.final-message-scene-full');
        if (scene) scene.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 250));
  }

  await new Promise(r => setTimeout(r, 800));

  // Verify all 7 paragraphs and signoff are visible
  const contentAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const pCount = document.querySelectorAll('.final-letter-p').length;
      const greeting = document.querySelector('.final-letter-greeting')?.textContent?.trim();
      const signoff = document.querySelector('.final-letter-signoff')?.textContent?.trim();
      const button = document.querySelector('.btn-one-last-thing');
      return {
        greeting,
        pCount,
        signoff,
        hasButton: Boolean(button)
      };
    })()`,
    returnByValue: true
  });
  console.log('Content Audit:', JSON.stringify(contentAudit.result.value, null, 2));

  if (contentAudit.result.value.pCount !== 7) {
    throw new Error(`FAIL: Expected 7 paragraphs, got ${contentAudit.result.value.pCount}`);
  }

  // Scroll to top for initial desktop capture
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.final-letter-scroll-area').scrollTop = 0;`
  });
  await new Promise(r => setTimeout(r, 400));

  const deskTopShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'terrace_final_message_desktop_top.png'), Buffer.from(deskTopShot.data, 'base64'));
  console.log('Saved terrace_final_message_desktop_top.png');

  // Scroll to bottom for scrolled desktop capture
  await send('Runtime.evaluate', {
    expression: `const el = document.querySelector('.final-letter-scroll-area'); el.scrollTop = el.scrollHeight;`
  });
  await new Promise(r => setTimeout(r, 400));

  const deskBottomShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'terrace_final_message_desktop_bottom.png'), Buffer.from(deskBottomShot.data, 'base64'));
  console.log('Saved terrace_final_message_desktop_bottom.png');

  // Test Mobile Viewport (390x844)
  console.log('Testing Mobile Viewport (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));

  await send('Runtime.evaluate', {
    expression: `document.querySelector('.final-letter-scroll-area').scrollTop = 0;`
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileTopShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'terrace_final_message_mobile_top.png'), Buffer.from(mobileTopShot.data, 'base64'));
  console.log('Saved terrace_final_message_mobile_top.png');

  await send('Runtime.evaluate', {
    expression: `const el = document.querySelector('.final-letter-scroll-area'); el.scrollTop = el.scrollHeight;`
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileBottomShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'terrace_final_message_mobile_bottom.png'), Buffer.from(mobileBottomShot.data, 'base64'));
  console.log('Saved terrace_final_message_mobile_bottom.png');

  // Reset to desktop and test transition to fake crash
  console.log('Testing "One last thing…" transition...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 300));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-one-last-thing');
      if (btn) btn.click();
    })()`
  });

  let transitioned = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.fake-crash-scene-full'))`,
      returnByValue: true
    });
    if (res?.result?.value) {
      transitioned = true;
      console.log('PASS: Successfully transitioned to fake-crash scene!');
      break;
    }
  }

  if (!transitioned) {
    throw new Error('FAIL: Transition to fake-crash scene failed.');
  }

  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`).catch(() => {});
  console.log('ALL TERRACE AND FALLING PETALS CHECKS PASSED SUCCESSFULLY!');
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

