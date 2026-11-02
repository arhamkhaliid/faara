import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9287;

async function run() {
  console.log('Connecting to Chrome on port', port);
  // Create a new tab for testing
  const tabRes = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:5173/?scene=cake&_t=${Date.now()}`, { method: 'PUT' });
  const cakePage = await tabRes.json();
  console.log('Created cake page tab:', cakePage.id);

  const ws = new WebSocket(cakePage.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const timer = setTimeout(() => reject(new Error('Timeout on ' + method)), 10000);
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

  // 1. Wait for lighting stage
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 150));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.candle-ignition-control-row'))`,
      returnByValue: true
    });
    if (res?.result?.value) break;
  }

  console.log('Lighting candles...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
      if (btns[0]) btns[0].click();
      if (btns[1]) btns[1].click();
    })()`
  });

  // 2. Wait for wish countdown (10s) -> Blow controls
  console.log('Waiting for wish countdown...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.btn-cake-action-blow'))`,
      returnByValue: true
    });
    if (res?.result?.value) break;
  }

  // 3. Blow out candles
  console.log('Extinguishing candles...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-cake-action-blow');
      if (btn) btn.click();
    })()`
  });

  // 4. Wait for stage === 'cutting'
  console.log('Waiting for stage === cutting...');
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.prompt-flow-cut'))`,
      returnByValue: true
    });
    if (res?.result?.value) break;
  }

  await new Promise(r => setTimeout(r, 600));

  // 5. Drag-to-cut
  console.log('Dragging pointer downward to cut the cake...');
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 640,
    y: 320,
    button: 'left',
    clickCount: 1
  });

  for (let step = 1; step <= 10; step++) {
    await new Promise(r => setTimeout(r, 35));
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 640 + step * 4,
      y: 320 + step * 20,
      button: 'left'
    });
  }

  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 680,
    y: 520,
    button: 'left',
    clickCount: 1
  });

  // 6. Wait for celebration step 'success'
  console.log('Waiting for celebration hero block...');
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.celebration-hero-block'))`,
      returnByValue: true
    });
    if (res?.result?.value) break;
  }

  await new Promise(r => setTimeout(r, 800));

  // 7. Audit Celebration Copy on Desktop
  const celebAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const hero = document.querySelector('.celebration-hero-block');
      const headline = hero?.querySelector('.celebration-grand-title');
      const successText = hero?.querySelector('.celebration-success-text');
      const subtext = hero?.querySelector('.celebration-event-subtext');
      const rect = hero ? hero.getBoundingClientRect() : null;

      return {
        headline: headline?.textContent?.trim(),
        successText: successText?.textContent?.trim(),
        subtext: subtext?.textContent?.trim(),
        rect: rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height } : null
      };
    })()`,
    returnByValue: true
  });

  const data = celebAudit.result.value;
  console.log('Celebration Audit Data:', JSON.stringify(data, null, 2));

  // Strict text assertions
  const expectedHeadline = '✨ Happy 22nd Birthday, Faara! ✨';
  const expectedSuccess = 'And that concludes the most unnecessarily elaborate cake-cutting ceremony in internet history.';
  const expectedSubtext = 'The first slice has been cut. Enjoy this moment!';

  if (data.headline !== expectedHeadline) {
    throw new Error(`FAIL: Headline mismatch.\nExpected: "${expectedHeadline}"\nGot:      "${data.headline}"`);
  }
  if (data.successText !== expectedSuccess) {
    throw new Error(`FAIL: Success text mismatch.\nExpected: "${expectedSuccess}"\nGot:      "${data.successText}"`);
  }
  if (data.subtext !== expectedSubtext) {
    throw new Error(`FAIL: Subtext mismatch.\nExpected: "${expectedSubtext}"\nGot:      "${data.subtext}"`);
  }

  console.log('PASS: All celebration copy strictly matched!');

  // Desktop screenshot
  const shotDesk = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'cake_celebration_desktop.png'), Buffer.from(shotDesk.data, 'base64'));
  console.log('Saved cake_celebration_desktop.png');

  // 8. Test Mobile Viewport (390x844)
  console.log('Testing Mobile Viewport (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 600));

  const mobileAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const hero = document.querySelector('.celebration-hero-block');
      const rect = hero ? hero.getBoundingClientRect() : null;
      return {
        rect: rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height } : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Mobile layout rect:', JSON.stringify(mobileAudit.result.value, null, 2));

  const mRect = mobileAudit.result.value.rect;
  if (mRect.bottom > 840) {
    throw new Error(`FAIL: Mobile celebration block is clipped past viewport bottom (844px)! bottom=${mRect.bottom}`);
  }
  console.log('PASS: Mobile celebration block fits cleanly without clipping!');

  const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'cake_celebration_mobile.png'), Buffer.from(shotMobile.data, 'base64'));
  console.log('Saved cake_celebration_mobile.png');

  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${cakePage.id}`).catch(() => {});
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

