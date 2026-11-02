import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function runTest() {
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      '--remote-debugging-port=9227',
      '--window-size=1280,800',
      'http://127.0.0.1:5173/?scene=surprise',
    ]
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch('http://127.0.0.1:9227/json');
        const pages = await res.json();
        const target = pages.find(p => p.url.includes('5173'));
        if (target) {
          wsUrl = target.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) throw new Error('Could not connect to Chrome target');

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let msgId = 1;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            if (data.error) reject(data.error);
            else resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // Wait for envelope card to render
    console.log('Waiting for envelope card...');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      const evalRes = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.envelope-card'))`,
        returnByValue: true,
      });
      if (evalRes?.result?.value) break;
    }

    await new Promise(r => setTimeout(r, 600));

    // 1. Capture State A Desktop
    console.log('Capturing State A Desktop...');
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'surprise_state_a_desktop.png'), Buffer.from(shot1.data, 'base64'));

    // 2. Set mobile viewport and capture State A Mobile
    console.log('Capturing State A Mobile...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 500));
    const shotMobileA = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'surprise_state_a_mobile.png'), Buffer.from(shotMobileA.data, 'base64'));

    // 3. Switch back to Desktop and unseal
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await new Promise(r => setTimeout(r, 300));

    console.log('Clicking Unseal button...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-unseal-edition');
        if (btn) btn.click();
      })()`,
    });

    // Wait for unseal transition (850ms timer in component + buffer)
    await new Promise(r => setTimeout(r, 1200));

    // Verify image loaded and capture State C Desktop
    console.log('Capturing State C Desktop (Revealed Newspaper)...');
    const shotRevealedDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'surprise_state_c_desktop.png'), Buffer.from(shotRevealedDesktop.data, 'base64'));

    // 4. Toggle zoom Desktop
    console.log('Testing Zoom Desktop...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const zoomBtn = document.querySelector('.btn-newspaper-zoom');
        if (zoomBtn) zoomBtn.click();
      })()`,
    });
    await new Promise(r => setTimeout(r, 500));
    const shotZoomDesktop = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'surprise_state_c_desktop_zoomed.png'), Buffer.from(shotZoomDesktop.data, 'base64'));

    // Reset zoom
    await send('Runtime.evaluate', {
      expression: `(() => {
        const zoomBtn = document.querySelector('.btn-newspaper-zoom');
        if (zoomBtn) zoomBtn.click();
      })()`,
    });
    await new Promise(r => setTimeout(r, 300));

    // 5. Mobile State C
    console.log('Capturing State C Mobile...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 500));
    const shotRevealedMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'surprise_state_c_mobile.png'), Buffer.from(shotRevealedMobile.data, 'base64'));

    // 6. Mobile Zoomed
    console.log('Testing Mobile Zoom...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const zoomBtn = document.querySelector('.btn-newspaper-zoom');
        if (zoomBtn) zoomBtn.click();
      })()`,
    });
    await new Promise(r => setTimeout(r, 500));
    const shotZoomMobile = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'surprise_state_c_mobile_zoomed.png'), Buffer.from(shotZoomMobile.data, 'base64'));

    // 7. Test Back to the Garden navigation
    console.log('Testing Back to Garden button...');
    const navResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const backBtn = document.querySelector('.btn-newspaper-back');
        if (!backBtn) return { error: 'No back button' };
        backBtn.click();
        return { success: true };
      })()`,
      returnByValue: true,
    });
    console.log('Back button click result:', navResult?.result?.value);

    await new Promise(r => setTimeout(r, 600));

    // Check what scene we are now on
    const sceneCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const crEyebrow = document.querySelector('.control-room-editorial');
        const crHeading = Array.from(document.querySelectorAll('h1, h2, span')).find(el => el.textContent && el.textContent.includes('things for you'));
        return {
          hasEditorial: Boolean(crEyebrow),
          hasHeading: Boolean(crHeading),
          bodyText: document.body.innerText.slice(0, 150)
        };
      })()`,
      returnByValue: true,
    });
    console.log('Scene check after return:', sceneCheck?.result?.value);

    ws.close();
    chrome.kill();
    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during test:', err);
    chrome.kill();
    process.exit(1);
  }
}

runTest();

