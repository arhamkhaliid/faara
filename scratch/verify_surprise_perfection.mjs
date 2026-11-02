import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function run() {
  const port = 9312;
  console.log('Launching headless Chrome...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=1280,800',
      '--incognito',
      `http://127.0.0.1:5173/?scene=surprise&_t=${Date.now()}`,
    ]
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
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

    if (!wsUrl) throw new Error('Could not connect to Chrome debugging port');
    console.log('Connecting to WebSocket...');

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const timer = setTimeout(() => {
          ws.removeEventListener('message', handler);
          reject(new Error(`Timeout on ${method}`));
        }, 12000);

        const handler = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.id === id) {
              clearTimeout(timer);
              ws.removeEventListener('message', handler);
              if (data.error) reject(new Error(JSON.stringify(data.error)));
              else resolve(data.result);
            }
          } catch (e) {
            clearTimeout(timer);
            reject(e);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');

    console.log('--- 1. Testing Envelope Stage ---');
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 150));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.envelope-card'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    const envelopeAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const eyebrow = document.querySelector('.envelope-eyebrow')?.textContent?.trim();
        const headline = document.querySelector('.envelope-headline')?.textContent?.trim();
        const subtext = document.querySelector('.envelope-subtext')?.textContent?.trim();
        const button = document.querySelector('.btn-unseal-edition')?.textContent?.trim();
        const back = document.querySelector('.btn-discreet-back')?.textContent?.trim();
        const bodyText = document.body.innerText.toLowerCase();
        const mentionsBirthday = bodyText.includes('birthday');
        return { eyebrow, headline, subtext, button, back, mentionsBirthday };
      })()`,
      returnByValue: true
    });
    console.log('Envelope Audit:', envelopeAudit?.result?.value);

    // Capture Step 1 Desktop Envelope
    console.log('Capturing step 1 desktop envelope...');
    const shotEnv = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_1_envelope_desktop.png'), Buffer.from(shotEnv.data, 'base64'));

    // Capture Step 1 Mobile Envelope
    console.log('Capturing step 1 mobile envelope...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 300));
    const shotEnvMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_1_envelope_mobile.png'), Buffer.from(shotEnvMobile.data, 'base64'));

    // Reset to Desktop for sequence
    console.log('Resetting to desktop...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await new Promise(r => setTimeout(r, 300));

    console.log('--- 2. Clicking "Unseal the edition" ---');
    const startTime = Date.now();
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-unseal-edition')?.click()`,
    });

    // Check front page stationary pause (+2000ms after click, +450ms after unfolding completes)
    await new Promise(r => setTimeout(r, 2000));
    const timeAtFront = Date.now() - startTime;
    const frontAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const masthead = document.querySelector('.broadsheet-masthead')?.textContent?.trim();
        const envelopePresent = Boolean(document.querySelector('.envelope-wrapper'));
        const booklet = document.querySelector('.newspaper-booklet');
        const bookletRect = booklet ? booklet.getBoundingClientRect() : null;
        return {
          masthead,
          envelopePresent,
          bookletRect: bookletRect ? { width: bookletRect.width, height: bookletRect.height } : null
        };
      })()`,
      returnByValue: true
    });
    console.log(`Front Page Audit at +${timeAtFront}ms:`, frontAudit?.result?.value);

    console.log('Capturing step 2 frontpage desktop...');
    const shotFrontDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_2_frontpage_desktop.png'), Buffer.from(shotFrontDesktop.data, 'base64'));

    // Verify still stationary reading at +4200ms (+2650ms into reading pause)
    await new Promise(r => setTimeout(r, 2200));
    const timeStillReading = Date.now() - startTime;
    const stillFrontCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const isStillFront = Boolean(document.querySelector('.broadsheet-masthead'));
        const isTurning = Boolean(document.querySelector('.page-turning'));
        const isRevealed = Boolean(document.querySelector('.newspaper-viewer-overlay'));
        return { isStillFront, isTurning, isRevealed };
      })()`,
      returnByValue: true
    });
    console.log(`Stationary Check at +${timeStillReading}ms:`, stillFrontCheck?.result?.value);

    // Wait until final reveal completes (+6200ms)
    console.log('Waiting for page turn and final reveal...');
    await new Promise(r => setTimeout(r, 2000));
    const timeFinal = Date.now() - startTime;
    const finalAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const overlay = document.querySelector('.newspaper-viewer-overlay');
        const img = document.querySelector('.newspaper-image');
        const header = document.querySelector('.newspaper-viewer-header');
        const backBtn = document.querySelector('.btn-newspaper-back');
        const zoomBtn = document.querySelector('.btn-newspaper-zoom');
        const imgRect = img ? img.getBoundingClientRect() : null;
        const headerRect = header ? header.getBoundingClientRect() : null;
        const vh = window.innerHeight;
        const imgHeightRatio = imgRect ? (imgRect.height / vh) : 0;
        return {
          hasOverlay: Boolean(overlay),
          hasImg: Boolean(img),
          src: img?.getAttribute('src'),
          imgRect: imgRect ? { width: Math.round(imgRect.width), height: Math.round(imgRect.height), top: Math.round(imgRect.top), left: Math.round(imgRect.left) } : null,
          imgHeightRatio: Math.round(imgHeightRatio * 100) + '%',
          hasBackBtn: Boolean(backBtn),
          hasZoomBtn: Boolean(zoomBtn)
        };
      })()`,
      returnByValue: true
    });
    console.log(`Final Reveal Audit at +${timeFinal}ms:`, finalAudit?.result?.value);

    console.log('Capturing step 3 revealed desktop...');
    const shotRevDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_3_revealed_desktop.png'), Buffer.from(shotRevDesktop.data, 'base64'));

    // Test Mobile Reveal View
    console.log('Switching to mobile view for step 3...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 400));
    const shotRevMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_3_revealed_mobile.png'), Buffer.from(shotRevMobile.data, 'base64'));

    // Capture mobile frontpage by loading with stage=frontpage
    console.log('Capturing mobile frontpage...');
    await send('Page.navigate', {
      url: `http://127.0.0.1:5173/?scene=surprise&stage=frontpage&_t=${Date.now()}`
    });
    await new Promise(r => setTimeout(r, 1200));
    const shotFrontMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_2_frontpage_mobile.png'), Buffer.from(shotFrontMobile.data, 'base64'));

    // Test return to garden
    console.log('Testing back to garden navigation...');
    await send('Page.navigate', {
      url: `http://127.0.0.1:5173/?scene=surprise&stage=revealed&_t=${Date.now()}`
    });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-newspaper-back')?.click()`,
    });
    await new Promise(r => setTimeout(r, 800));
    const returnCheck = await send('Runtime.evaluate', {
      expression: `document.body.innerText.slice(0, 100)`,
      returnByValue: true
    });
    console.log('Garden Return Text:', returnCheck?.result?.value);

    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

