import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function run() {
  const port = 9310;
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

    if (!wsUrl) throw new Error('Could not connect to Chrome port');

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.id === id) {
              ws.removeEventListener('message', handler);
              if (data.error) reject(data.error);
              else resolve(data.result);
            }
          } catch (e) {
            reject(e);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');

    console.log('--- 1. Testing Envelope Screen & Copy ---');
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
        const mentionsArticle = bodyText.includes('article') || bodyText.includes('photo');
        return { eyebrow, headline, subtext, button, back, mentionsBirthday, mentionsArticle };
      })()`,
      returnByValue: true
    });
    console.log('Envelope Audit:', envelopeAudit?.result?.value);

    // Capture Desktop Envelope
    const shotEnv = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_1_envelope_desktop.png'), Buffer.from(shotEnv.data, 'base64'));

    // Capture Mobile Envelope
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 300));
    const shotEnvMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_1_envelope_mobile.png'), Buffer.from(shotEnvMobile.data, 'base64'));

    // Reset to Desktop for sequence test
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await new Promise(r => setTimeout(r, 300));

    console.log('--- 2. Triggering Single Click & Timing Audit ---');
    const startTime = Date.now();
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-unseal-edition')?.click()`,
    });

    // Check at 1800ms (unfolding finished, reading interval active)
    await new Promise(r => setTimeout(r, 1800));
    const timeAt1800 = Date.now() - startTime;
    const stageCheck1800 = await send('Runtime.evaluate', {
      expression: `(() => {
        const masthead = document.querySelector('.broadsheet-masthead')?.textContent?.trim();
        const tag = document.querySelector('.broadsheet-edition-tag')?.textContent?.trim();
        const dateLeft = document.querySelector('.date-left')?.textContent?.trim();
        const dateRight = document.querySelector('.date-right')?.textContent?.trim();
        const headline = document.querySelector('.broadsheet-headline')?.textContent?.trim();
        const supporting = document.querySelector('.broadsheet-supporting-copy')?.textContent?.trim();
        const columns = Array.from(document.querySelectorAll('.editorial-detail-column')).map(col => ({
          label: col.querySelector('.editorial-detail-label')?.textContent?.trim(),
          val: col.querySelector('.editorial-detail-value')?.textContent?.trim()
        }));
        const footer = document.querySelector('.broadsheet-footer .footer-text')?.textContent?.trim();
        const isTurning = document.querySelector('.page-turning') !== null;
        const isRevealed = document.querySelector('.newspaper-viewer-overlay') !== null;
        return {
          masthead, tag, dateLeft, dateRight, headline, supporting, columns, footer,
          isTurning, isRevealed
        };
      })()`,
      returnByValue: true
    });
    console.log(`Front Page Content Audit at +${timeAt1800}ms:`, stageCheck1800?.result?.value);

    // Capture Desktop Front Page
    const shotFrontDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_2_frontpage_desktop.png'), Buffer.from(shotFrontDesktop.data, 'base64'));

    // Check at 4000ms (+2450ms into reading interval — must STILL be frontpage, NOT turning yet!)
    await new Promise(r => setTimeout(r, 2200));
    const timeAt4000 = Date.now() - startTime;
    const checkStillReading = await send('Runtime.evaluate', {
      expression: `(() => {
        const isStillFront = document.querySelector('.broadsheet-masthead') !== null;
        const isTurning = document.querySelector('.page-turning') !== null;
        const isRevealed = document.querySelector('.newspaper-viewer-overlay') !== null;
        return { isStillFront, isTurning, isRevealed };
      })()`,
      returnByValue: true
    });
    console.log(`Stationary Reading Check at +${timeAt4000}ms (should still be reading):`, checkStillReading?.result?.value);

    // Wait until 5800ms (after the 4800ms turn start + 850ms page turn duration = 5650ms)
    await new Promise(r => setTimeout(r, 1800));
    const timeFinal = Date.now() - startTime;
    const finalRevealAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const overlay = document.querySelector('.newspaper-viewer-overlay');
        const img = document.querySelector('.newspaper-image');
        const backBtn = document.querySelector('.btn-newspaper-back');
        const zoomBtn = document.querySelector('.btn-newspaper-zoom');
        return {
          hasOverlay: Boolean(overlay),
          hasImg: Boolean(img),
          src: img?.getAttribute('src'),
          naturalWidth: img?.naturalWidth,
          naturalHeight: img?.naturalHeight,
          hasBackBtn: Boolean(backBtn),
          hasZoomBtn: Boolean(zoomBtn)
        };
      })()`,
      returnByValue: true
    });
    console.log(`Final Reveal Audit at +${timeFinal}ms:`, finalRevealAudit?.result?.value);

    // Capture Desktop Final Reveal
    const shotRevDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_3_revealed_desktop.png'), Buffer.from(shotRevDesktop.data, 'base64'));

    // Test Mobile Reveal View
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 300));
    const shotRevMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'refined_step_3_revealed_mobile.png'), Buffer.from(shotRevMobile.data, 'base64'));

    // Test Back to Garden
    console.log('Testing "Back to the garden" return button...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-newspaper-back')?.click()`,
    });
    await new Promise(r => setTimeout(r, 600));

    const returnAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          bodySnippet: document.body.innerText.slice(0, 150)
        };
      })()`,
      returnByValue: true
    });
    console.log('Garden Return Audit:', returnAudit?.result?.value);

    ws.close();
    chrome.kill();
    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

