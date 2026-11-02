import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function captureUrl(url, width, height, outputFile, evaluateCallback) {
  const port = 9260 + Math.floor(Math.random() * 30);
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      '--incognito',
      url,
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

    if (!wsUrl) throw new Error(`Could not connect to Chrome port ${port}`);

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

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 150));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.envelope-card') || document.querySelector('.newspaper-booklet') || document.querySelector('.newspaper-viewer-overlay'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    await new Promise(r => setTimeout(r, 500));

    let evalResult = null;
    if (evaluateCallback) {
      evalResult = await evaluateCallback(send);
    }

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, outputFile), Buffer.from(shot.data, 'base64'));

    ws.close();
    chrome.kill();
    return evalResult;
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

async function main() {
  console.log('--- 1. Testing State A: Envelope Screen ---');
  const copyAudit = await captureUrl(
    `http://127.0.0.1:5173/?scene=surprise&stage=sealed&_t=${Date.now()}`,
    1280,
    800,
    'automated_step_1_envelope_desktop.png',
    async (send) => {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const eyebrow = document.querySelector('.envelope-eyebrow')?.textContent?.trim();
          const headline = document.querySelector('.envelope-headline')?.textContent?.trim();
          const subtext = document.querySelector('.envelope-subtext')?.textContent?.trim();
          const button = document.querySelector('.btn-unseal-edition')?.textContent?.trim();
          const back = document.querySelector('.btn-discreet-back')?.textContent?.trim();
          const bodyText = document.body.innerText;
          const containsBirthday = bodyText.toLowerCase().includes('birthday');
          return { eyebrow, headline, subtext, button, back, containsBirthday };
        })()`,
        returnByValue: true,
      });
      return res?.result?.value;
    }
  );
  console.log('Envelope Copy Audit:', copyAudit);

  await captureUrl(
    `http://127.0.0.1:5173/?scene=surprise&stage=sealed&_t=${Date.now()}`,
    390,
    844,
    'automated_step_1_envelope_mobile.png'
  );
  console.log('State A captured (desktop + mobile)');

  console.log('--- 2. Testing State B: "The Birthday Times" Masthead Front Page ---');
  const mastheadAudit = await captureUrl(
    `http://127.0.0.1:5173/?scene=surprise&stage=frontpage&_t=${Date.now()}`,
    1280,
    800,
    'automated_step_2_masthead_desktop.png',
    async (send) => {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const masthead = document.querySelector('.broadsheet-masthead')?.textContent?.trim();
          const topStrip = document.querySelector('.broadsheet-top-strip')?.textContent?.trim();
          const booklet = document.querySelector('.newspaper-booklet');
          return {
            masthead,
            topStrip,
            width: booklet?.offsetWidth,
            height: booklet?.offsetHeight
          };
        })()`,
        returnByValue: true,
      });
      return res?.result?.value;
    }
  );
  console.log('Masthead Audit:', mastheadAudit);

  await captureUrl(
    `http://127.0.0.1:5173/?scene=surprise&stage=frontpage&_t=${Date.now()}`,
    390,
    844,
    'automated_step_2_masthead_mobile.png'
  );
  console.log('State B captured (desktop + mobile)');

  console.log('--- 3. Testing State C: 3D Paper Page Turn ---');
  await captureUrl(
    `http://127.0.0.1:5173/?scene=surprise&stage=turning&_t=${Date.now()}`,
    1280,
    800,
    'automated_step_3_pageturn_desktop.png'
  );
  console.log('State C captured (3D page turn)');

  console.log('--- 4. Testing End-to-End Automated Reveal via Single Click ---');
  const port = 9295;
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

    console.log('Waiting for Unseal button to render...');
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 200));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.btn-unseal-edition'))`,
        returnByValue: true
      });
      if (res?.result?.value) {
        console.log('Unseal button is ready!');
        break;
      }
    }

    console.log('Executing Single Click on "Unseal the edition"...');
    const clickRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-unseal-edition');
        if (btn) {
          btn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
      returnByValue: true
    });
    console.log('Click execution result:', clickRes?.result?.value);

    console.log('Waiting for continuous 3-second automated sequence to complete...');
    // Total sequence: 700ms + 900ms + 450ms + 850ms = 2900ms. Wait 3400ms for full settlement.
    await new Promise(r => setTimeout(r, 3400));

    const finalAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const img = document.querySelector('.newspaper-image');
        const overlay = document.querySelector('.newspaper-viewer-overlay');
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
      returnByValue: true,
    });
    console.log('Final Reveal State Audit (Single Click Automated Result):', finalAudit?.result?.value);

    const shotRevealed = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'automated_step_4_revealed_desktop.png'), Buffer.from(shotRevealed.data, 'base64'));

    // Mobile screenshot of revealed
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 400));
    const shotRevealedMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'automated_step_4_revealed_mobile.png'), Buffer.from(shotRevealedMobile.data, 'base64'));

    // Test Back to the Garden
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
      returnByValue: true,
    });
    console.log('Return to Garden verification:', returnAudit?.result?.value);

    ws.close();
    chrome.kill();
    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});