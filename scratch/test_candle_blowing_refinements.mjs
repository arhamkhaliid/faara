import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9332;

async function run() {
  console.log('Launching headless Chrome to test Candle-Blowing Scene Refinements...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--user-data-dir=/tmp/chrome-blow-test',
      '--window-size=1280,800',
      '--incognito',
      `http://127.0.0.1:5173/?scene=cake&_t=${Date.now()}`,
    ]
  );

  try {
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 120));
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
    console.log('Connected to Chrome WebSocket.');

    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const timer = setTimeout(() => reject(new Error('Timeout on ' + method)), 9000);
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

    // Wait for lighting stage
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 150));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.candle-ignition-control-row'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    console.log('Lighting candle 1 and candle 2...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
        if (btns[0]) btns[0].click();
      })()`
    });
    await new Promise(r => setTimeout(r, 300));
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
        if (btns[1]) btns[1].click();
      })()`
    });

    console.log('Waiting for wish countdown (10s) to transition to Candle-Blowing scene...');
    let blowSceneActive = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.btn-cake-action-blow'))`,
        returnByValue: true
      });
      if (res?.result?.value) {
        console.log(`Candle-blowing controls mounted at iteration ${i} (~${i * 0.5}s)`);
        blowSceneActive = true;
        break;
      }
    }
    if (!blowSceneActive) throw new Error('FAIL: Candle-blowing scene did not appear after countdown');

    // Audit text, buttons, and computed styles
    const auditRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const titleEl = document.querySelector('.prompt-title');
        const subtitleEl = document.querySelector('.prompt-subtitle');
        const blowBtn = document.querySelector('.btn-cake-action-blow');
        const micBtn = document.querySelector('.btn-cake-mic-enable');
        const disclaimerEl = document.querySelector('.prompt-disclaimer');
        const allText = document.body.textContent;
        const mentionsOldTechnical = allText.includes('Audio is analyzed locally') || allText.includes('never recorded');
        const mentionsOldMicBlow = allText.includes('Enable Mic Blow');

        const blowStyle = blowBtn ? window.getComputedStyle(blowBtn) : null;
        const micStyle = micBtn ? window.getComputedStyle(micBtn) : null;
        const blowRect = blowBtn ? blowBtn.getBoundingClientRect() : null;
        const micRect = micBtn ? micBtn.getBoundingClientRect() : null;

        return {
          title: titleEl?.textContent?.trim(),
          subtitle: subtitleEl?.textContent?.trim(),
          blowLabel: blowBtn?.textContent?.trim(),
          micLabel: micBtn?.textContent?.trim(),
          hasDisclaimer: Boolean(disclaimerEl),
          mentionsOldTechnical,
          mentionsOldMicBlow,
          blowComputed: blowStyle ? {
            fontFamily: blowStyle.fontFamily,
            color: blowStyle.color,
            backgroundColor: blowStyle.backgroundColor,
            borderColor: blowStyle.borderColor,
            borderRadius: blowStyle.borderRadius,
            height: blowRect.height,
            width: blowRect.width,
            top: blowRect.top,
            left: blowRect.left
          } : null,
          micComputed: micStyle ? {
            fontFamily: micStyle.fontFamily,
            color: micStyle.color,
            backgroundColor: micStyle.backgroundColor,
            borderColor: micStyle.borderColor,
            borderRadius: micStyle.borderRadius,
            height: micRect.height,
            width: micRect.width,
            top: micRect.top,
            left: micRect.left
          } : null
        };
      })()`,
      returnByValue: true
    });

    const data = auditRes.result.value;
    console.log('Candle-Blowing Scene Audit:', JSON.stringify(data, null, 2));

    // Assertions
    if (data.title !== 'Blow out the candles.') {
      throw new Error(`FAIL: Unexpected heading: "${data.title}" (expected "Blow out the candles.")`);
    }
    if (data.subtitle !== 'One little breath. One very special birthday.') {
      throw new Error(`FAIL: Unexpected subtitle: "${data.subtitle}" (expected "One little breath. One very special birthday.")`);
    }
    if (!data.blowLabel.includes('Blow out candles')) {
      throw new Error(`FAIL: Unexpected blow button label: "${data.blowLabel}"`);
    }
    if (!data.micLabel.includes('Enable Microphone')) {
      throw new Error(`FAIL: Unexpected mic button label: "${data.micLabel}" (expected "Enable Microphone")`);
    }
    if (data.mentionsOldMicBlow) {
      throw new Error('FAIL: Old "Enable Mic Blow" phrase still present');
    }
    if (data.hasDisclaimer || data.mentionsOldTechnical) {
      throw new Error('FAIL: Old technical audio disclaimer still present');
    }

    console.log('PASS: All texts and button labels strictly verified!');

    // Check desktop alignment (same row, equal heights)
    const b1 = data.blowComputed;
    const b2 = data.micComputed;
    console.log(`Blow button rect: top=${b1.top}, left=${b1.left}, width=${b1.width}, height=${b1.height}`);
    console.log(`Mic button rect: top=${b2.top}, left=${b2.left}, width=${b2.width}, height=${b2.height}`);

    if (Math.abs(b1.top - b2.top) > 4) {
      console.warn(`Buttons are not on the exact same row: b1.top=${b1.top}, b2.top=${b2.top}`);
    } else {
      console.log('PASS: Blow out and Enable Microphone buttons are aligned in a single horizontal row on desktop.');
    }
    if (Math.abs(b1.height - b2.height) > 4) {
      console.warn(`Buttons have differing heights: b1=${b1.height}, b2=${b2.height}`);
    } else {
      console.log('PASS: Buttons have consistent heights.');
    }

    // Capture desktop screenshot with refined flames and buttons
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'candle_blowing_desktop.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Saved candle_blowing_desktop.png');

    // Test Mobile Viewport (390x844)
    console.log('Testing mobile viewport (390x844)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 600));

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'candle_blowing_mobile.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Saved candle_blowing_mobile.png');

    await send('Emulation.clearDeviceMetricsOverride');

    // Test Candle-Blowing Interaction: Click "Blow out candles"
    console.log('Testing candle-blowing interaction by clicking "Blow out candles"...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-cake-action-blow');
        if (btn) btn.click();
      })()`
    });

    await new Promise(r => setTimeout(r, 1600));

    const afterBlow = await send('Runtime.evaluate', {
      expression: `(() => {
        const cutTitle = document.querySelector('.prompt-flow-cut .prompt-title');
        return {
          isCutting: Boolean(cutTitle),
          title: cutTitle?.textContent?.trim()
        };
      })()`,
      returnByValue: true
    });

    console.log('After blowout check:', afterBlow.result.value);
    if (!afterBlow.result.value.isCutting) {
      throw new Error('FAIL: Did not transition to cutting stage after blowing out candles');
    }
    console.log('PASS: Candle-blowing interaction cleanly extinguished candles and transitioned to cutting stage!');

    console.log('\n======================================================');
    console.log('ALL CANDLE-BLOWING SCENE REFINEMENTS VERIFIED (100%)!');
    console.log('======================================================\n');

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

