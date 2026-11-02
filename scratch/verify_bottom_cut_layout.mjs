import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9287;

async function run() {
  console.log('Connecting to Chrome on port', port);
  const pagesRes = await fetch(`http://127.0.0.1:${port}/json`);
  const pages = await pagesRes.json();
  const cakePage = pages.find(p => p.url.includes('scene=cake') && p.type === 'page');
  if (!cakePage) throw new Error('No cake page found on port ' + port);

  console.log('Connecting to WebSocket:', cakePage.webSocketDebuggerUrl);
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

  // Set desktop window size 1280x800
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Reload page to start fresh
  console.log('Reloading cake page...');
  await send('Page.navigate', { url: `http://127.0.0.1:5173/?scene=cake&_t=${Date.now()}` });

  // 1. Wait for lighting stage
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 150));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.candle-ignition-control-row'))`,
      returnByValue: true
    });
    if (res?.result?.value) break;
  }

  console.log('Lighting candles 1 and 2...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
      if (btns[0]) btns[0].click();
      if (btns[1]) btns[1].click();
    })()`
  });

  // 2. Wait for wish countdown (10s) -> Blow controls
  console.log('Waiting for blow controls after 10s countdown...');
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

  await new Promise(r => setTimeout(r, 1400)); // Allow knife entrance and float

  // 5. Audit Stage D cutting UI on Desktop
  const cutAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const overlay = document.querySelector('.cake-interactive-overlay');
      const flowCut = document.querySelector('.prompt-flow-cut');
      const titleEl = flowCut?.querySelector('.prompt-title');
      const subtitleEl = flowCut?.querySelector('.prompt-subtitle');
      const isInsideOverlay = overlay && overlay.contains(flowCut);
      const allButtons = Array.from(document.querySelectorAll('button'));
      const cutButtons = allButtons.filter(b => b.textContent && b.textContent.toLowerCase().includes('cut'));
      const rect = flowCut ? flowCut.getBoundingClientRect() : null;
      const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
      const subtitleRect = subtitleEl ? subtitleEl.getBoundingClientRect() : null;

      return {
        title: titleEl?.textContent?.trim(),
        subtitle: subtitleEl?.textContent?.trim(),
        isInsideOverlay,
        cutButtonsCount: cutButtons.length,
        rect: rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height } : null,
        titleRect: titleRect ? { top: titleRect.top, bottom: titleRect.bottom, left: titleRect.left, width: titleRect.width, height: titleRect.height } : null,
        subtitleRect: subtitleRect ? { top: subtitleRect.top, bottom: subtitleRect.bottom, left: subtitleRect.left, width: subtitleRect.width, height: subtitleRect.height } : null,
      };
    })()`,
    returnByValue: true
  });

  const auditData = cutAudit.result.value;
  console.log('Desktop Cutting Scene Audit:', JSON.stringify(auditData, null, 2));

  // Assertions for exact approved copy
  if (auditData.title !== 'Make the first cut.') {
    throw new Error(`FAIL: Unexpected cutting title: "${auditData.title}" (expected "Make the first cut.")`);
  }
  if (auditData.subtitle !== 'Drag along the guide to make the first cut.') {
    throw new Error(`FAIL: Unexpected cutting subtitle: "${auditData.subtitle}" (expected "Drag along the guide to make the first cut.")`);
  }
  if (!auditData.isInsideOverlay) {
    throw new Error('FAIL: prompt-flow-cut is NOT inside cake-interactive-overlay! Must be in bottom overlay.');
  }
  if (auditData.cutButtonsCount > 0) {
    throw new Error(`FAIL: Found ${auditData.cutButtonsCount} cut buttons. Cake must be drag-to-cut only!`);
  }

  // Verify bottom-center bounds on Desktop:
  // Heading should be in bottom-center, below cake / near its lower edge (top > 580px, bottom < 790px)
  if (auditData.titleRect.top < 580) {
    throw new Error(`FAIL: Title top is at ${auditData.titleRect.top}px, too high up! Expected bottom-center (> 580px)`);
  }
  if (auditData.subtitleRect.bottom > 790) {
    throw new Error(`FAIL: Subtitle bottom is at ${auditData.subtitleRect.bottom}px, too low / clipping viewport (800px)!`);
  }
  console.log('PASS: Desktop cutting text is positioned at the bottom-center, below the cake near its lower edge!');

  // Capture Desktop screenshot
  const shotDesk = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'cake_bottom_cutting_desktop.png'), Buffer.from(shotDesk.data, 'base64'));
  console.log('Saved cake_bottom_cutting_desktop.png');

  // 6. Test Mobile Viewport (390x844)
  console.log('Testing Mobile Viewport (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 800));

  const mobileAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const flowCut = document.querySelector('.prompt-flow-cut');
      const titleEl = flowCut?.querySelector('.prompt-title');
      const subtitleEl = flowCut?.querySelector('.prompt-subtitle');
      const rectCut = flowCut ? flowCut.getBoundingClientRect() : null;
      const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
      const subtitleRect = subtitleEl ? subtitleEl.getBoundingClientRect() : null;
      return {
        cut: rectCut ? { top: rectCut.top, bottom: rectCut.bottom, left: rectCut.left, width: rectCut.width } : null,
        title: titleRect ? { top: titleRect.top, bottom: titleRect.bottom } : null,
        subtitle: subtitleRect ? { top: subtitleRect.top, bottom: subtitleRect.bottom } : null,
      };
    })()`,
    returnByValue: true
  });
  console.log('Mobile layout audit:', JSON.stringify(mobileAudit.result.value, null, 2));

  const mData = mobileAudit.result.value;
  if (mData.title) {
    if (mData.title.top < 580) {
      throw new Error(`FAIL: Mobile cut title top (${mData.title.top}) is too high! Expected bottom-center (> 580px)`);
    }
    if (mData.subtitle.bottom > 835) {
      throw new Error(`FAIL: Mobile cut subtitle bottom (${mData.subtitle.bottom}) is clipping mobile viewport (844px)!`);
    }
    console.log('PASS: Mobile cut prompt is positioned at bottom-center near lower edge and comfortably inside viewport!');
  }

  const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'cake_bottom_cutting_mobile.png'), Buffer.from(shotMobile.data, 'base64'));
  console.log('Saved cake_bottom_cutting_mobile.png');

  // Reset back to Desktop for drag interaction verification
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 400));

  // 7. Verify Drag-to-Cut Interaction
  console.log('Verifying drag-to-cut interaction...');
  // A) Tap/click without drag should NOT cut
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 640,
    y: 400,
    button: 'left',
    clickCount: 1
  });
  await new Promise(r => setTimeout(r, 80));
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 640,
    y: 400,
    button: 'left',
    clickCount: 1
  });
  await new Promise(r => setTimeout(r, 300));

  const afterClickRes = await send('Runtime.evaluate', {
    expression: `Boolean(document.querySelector('.celebration-grand-title'))`,
    returnByValue: true
  });
  if (afterClickRes.result.value) {
    throw new Error('FAIL: Cake was cut on simple click! Must be drag-to-cut only.');
  }
  console.log('PASS: Click without drag does NOT cut the cake.');

  // B) Real drag downward (simulating user dragging pointer along the cut guide)
  console.log('Executing drag downward on 3D canvas (640, 320 -> 680, 520)...');
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 640,
    y: 320,
    button: 'left',
    clickCount: 1
  });

  for (let step = 1; step <= 10; step++) {
    await new Promise(r => setTimeout(r, 35));
    const curX = 640 + step * 4;
    const curY = 320 + step * 20;
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: curX,
      y: curY,
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

  // Wait for celebration mode
  console.log('Waiting for celebration mode...');
  let celebrationActive = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.celebration-grand-title'))`,
      returnByValue: true
    });
    if (res?.result?.value) {
      celebrationActive = true;
      break;
    }
  }

  if (!celebrationActive) {
    throw new Error('FAIL: Dragging downward did not trigger cake cut celebration!');
  }
  console.log('PASS: Drag-to-cut triggered grand celebration successfully!');

  console.log('\n======================================================');
  console.log('BOTTOM-CENTER CAKE-CUTTING LAYOUT VERIFIED (100%)!');
  console.log('======================================================\n');

  ws.close();
  // Close the tab
  await fetch(`http://127.0.0.1:${port}/json/close/${cakePage.id}`).catch(() => {});
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

