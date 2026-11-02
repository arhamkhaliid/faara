import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9287;

async function run() {
  console.log('Connecting to Chrome on port', port);
  const tabRes = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:5173/?scene=cake&_t=${Date.now()}`, { method: 'PUT' });
  const cakePage = await tabRes.json();
  console.log('Created cake page tab:', cakePage.id);

  const ws = new WebSocket(cakePage.webSocketDebuggerUrl);
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

  // 1. Wait for lighting stage
  console.log('Waiting for lighting stage...');
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

  // 6. Wait for celebration step 'success', then wait for transition to 'bridge' (9.5s timer)
  console.log('Waiting for transition to celebration bridge scene (.celebration-bridge-hero)...');
  let bridgeVisible = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 500));
    const res = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.celebration-bridge-hero'))`,
      returnByValue: true
    });
    if (res?.result?.value) {
      bridgeVisible = true;
      console.log(`Bridge scene appeared after ~${(i + 1) * 0.5}s!`);
      break;
    }
  }

  if (!bridgeVisible) {
    throw new Error('FAIL: .celebration-bridge-hero did not appear within 20s');
  }

  await new Promise(r => setTimeout(r, 800));

  // 7. Audit Bridge Scene Copy & Button Design on Desktop
  const bridgeAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const hero = document.querySelector('.celebration-bridge-hero');
      const headline = hero?.querySelector('.celebration-bridge-headline');
      const line = hero?.querySelector('.celebration-bridge-line');
      const button = hero?.querySelector('.btn-cake-proceed-final');
      const backBtn = document.querySelector('.cake-discreet-back');

      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const buttonRect = button ? button.getBoundingClientRect() : null;
      const btnStyles = button ? window.getComputedStyle(button) : null;
      const backStyles = backBtn ? window.getComputedStyle(backBtn) : null;

      return {
        headline: headline?.textContent?.trim(),
        line: line?.textContent?.trim(),
        buttonText: button?.textContent?.trim(),
        buttonTitle: button?.getAttribute('title'),
        buttonAria: button?.getAttribute('aria-label'),
        heroRect: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, left: heroRect.left, width: heroRect.width, height: heroRect.height } : null,
        buttonRect: buttonRect ? { top: buttonRect.top, bottom: buttonRect.bottom, left: buttonRect.left, width: buttonRect.width, height: buttonRect.height } : null,
        btnStyles: btnStyles ? {
          fontFamily: btnStyles.fontFamily,
          fontSize: btnStyles.fontSize,
          fontWeight: btnStyles.fontWeight,
          color: btnStyles.color,
          backgroundColor: btnStyles.backgroundColor,
          border: btnStyles.border,
          borderColor: btnStyles.borderColor,
          borderRadius: btnStyles.borderRadius,
          boxShadow: btnStyles.boxShadow
        } : null,
        backStyles: backStyles ? {
          fontFamily: backStyles.fontFamily,
          fontSize: backStyles.fontSize,
          fontWeight: backStyles.fontWeight,
          color: backStyles.color,
          backgroundColor: backStyles.backgroundColor,
          borderColor: backStyles.borderColor,
          borderRadius: backStyles.borderRadius
        } : null
      };
    })()`,
    returnByValue: true
  });

  const bData = bridgeAudit.result.value;
  console.log('Bridge Audit Data:', JSON.stringify(bData, null, 2));

  // Verify exact text requirements
  const expectedHeadline = 'One Last Message';
  const expectedLine = 'And now, Faara, something I really want you to know.';
  const expectedButton = 'Read my message →';

  if (bData.headline !== expectedHeadline) {
    throw new Error(`FAIL: Headline mismatch.\nExpected: "${expectedHeadline}"\nGot:      "${bData.headline}"`);
  }
  if (bData.line !== expectedLine) {
    throw new Error(`FAIL: Supporting line mismatch.\nExpected: "${expectedLine}"\nGot:      "${bData.line}"`);
  }
  if (bData.buttonText !== expectedButton) {
    throw new Error(`FAIL: Button text mismatch.\nExpected: "${expectedButton}"\nGot:      "${bData.buttonText}"`);
  }
  console.log('PASS: All copy matches exact requirements!');

  // Verify button styling matching .cake-discreet-back
  // Color should be burgundy rgb(107, 23, 48)
  if (!bData.btnStyles.color.includes('107, 23, 48')) {
    throw new Error(`FAIL: Button text color is not burgundy.\nGot: "${bData.btnStyles.color}"`);
  }
  // Border radius should be pill (24px)
  if (!bData.btnStyles.borderRadius.includes('24px') && !bData.btnStyles.borderRadius.includes('22px')) {
    throw new Error(`FAIL: Button border radius is not pill shape.\nGot: "${bData.btnStyles.borderRadius}"`);
  }
  // Font family should be serif / Times
  if (!bData.btnStyles.fontFamily.toLowerCase().includes('times') && !bData.btnStyles.fontFamily.toLowerCase().includes('serif')) {
    throw new Error(`FAIL: Button font family is not elegant serif.\nGot: "${bData.btnStyles.fontFamily}"`);
  }
  console.log('PASS: Button styling matches established cream/burgundy pill design!');

  // Capture desktop screenshot
  const shotDesk = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'cake_bridge_desktop.png'), Buffer.from(shotDesk.data, 'base64'));
  console.log('Saved cake_bridge_desktop.png');

  // 8. Mobile Viewport (390x844)
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
      const hero = document.querySelector('.celebration-bridge-hero');
      const button = hero?.querySelector('.btn-cake-proceed-final');
      const heroRect = hero ? hero.getBoundingClientRect() : null;
      const buttonRect = button ? button.getBoundingClientRect() : null;

      return {
        heroRect: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, left: heroRect.left, width: heroRect.width, height: heroRect.height } : null,
        buttonRect: buttonRect ? { top: buttonRect.top, bottom: buttonRect.bottom, left: buttonRect.left, width: buttonRect.width, height: buttonRect.height } : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Mobile layout rect:', JSON.stringify(mobileAudit.result.value, null, 2));

  const mHeroRect = mobileAudit.result.value.heroRect;
  if (mHeroRect.bottom > 840) {
    throw new Error(`FAIL: Mobile bridge hero is clipped past viewport bottom (844px)! bottom=${mHeroRect.bottom}`);
  }
  console.log('PASS: Mobile bridge hero fits cleanly without clipping!');

  const shotMobile = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'cake_bridge_mobile.png'), Buffer.from(shotMobile.data, 'base64'));
  console.log('Saved cake_bridge_mobile.png');

  // 9. Reset to Desktop and click the button to verify transition to final message
  console.log('Clicking "Read my message →" button to verify transition to final-message...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 300));

  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-cake-proceed-final');
      if (btn) btn.click();
    })()`
  });

  // Wait for transition to final-message
  let finalMessageReached = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    const sceneCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const sceneEl = document.querySelector('.final-message-scene-full') || document.querySelector('.final-letter-scroll-area');
        const greeting = document.querySelector('.final-letter-greeting');
        return {
          sceneFound: Boolean(sceneEl),
          greetingText: greeting ? greeting.textContent.trim() : null
        };
      })()`,
      returnByValue: true
    });
    const s = sceneCheck.result.value;
    if (s.sceneFound || s.greetingText) {
      finalMessageReached = true;
      console.log(`PASS: Navigated to final-message scene! Greeting: ${s.greetingText}`);
      break;
    }
  }

  if (!finalMessageReached) {
    throw new Error('FAIL: Transition to final-message scene did not complete upon button click.');
  }

  // Capture final message screenshot to confirm smooth transition
  const shotFinal = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'cake_bridge_transition_success.png'), Buffer.from(shotFinal.data, 'base64'));
  console.log('Saved cake_bridge_transition_success.png');

  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${cakePage.id}`).catch(() => {});
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

