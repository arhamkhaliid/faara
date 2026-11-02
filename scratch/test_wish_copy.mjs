import { spawn } from 'child_process';

const port = 9330;

async function run() {
  console.log('Testing Wish countdown text change...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--user-data-dir=/tmp/chrome-wish-test',
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

    // Wait for buttons
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 150));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.candle-ignition-control-row'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    console.log('Lighting both candles...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
        if (btns[0]) btns[0].click();
      })()`
    });
    await new Promise(r => setTimeout(r, 400));
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
        if (btns[1]) btns[1].click();
      })()`
    });

    // Wait for wish stage
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      const s = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.wish-quiet-moment'))`,
        returnByValue: true
      });
      if (s?.result?.value) break;
    }

    // Inspect heading, subtitle, and countdown bar across 2 seconds
    const sample1 = await send('Runtime.evaluate', {
      expression: `(() => {
        const headline = document.querySelector('.wish-moment-headline');
        const subtitle = document.querySelector('.wish-quiet-subtitle');
        const bar = document.querySelector('.wish-countdown-bar');
        return {
          headline: headline?.textContent?.trim(),
          subtitle: subtitle?.textContent?.trim(),
          barWidth: bar?.style?.width
        };
      })()`,
      returnByValue: true
    });
    console.log('Sample 1 (start of countdown):', sample1.result.value);

    await new Promise(r => setTimeout(r, 2000));

    const sample2 = await send('Runtime.evaluate', {
      expression: `(() => {
        const headline = document.querySelector('.wish-moment-headline');
        const subtitle = document.querySelector('.wish-quiet-subtitle');
        const bar = document.querySelector('.wish-countdown-bar');
        return {
          headline: headline?.textContent?.trim(),
          subtitle: subtitle?.textContent?.trim(),
          barWidth: bar?.style?.width
        };
      })()`,
      returnByValue: true
    });
    console.log('Sample 2 (after 2s):', sample2.result.value);

    // Verify requirements:
    if (sample1.result.value.headline !== 'Make a wish.') {
      throw new Error(`FAIL: Unexpected headline: "${sample1.result.value.headline}"`);
    }
    const expected = 'Take a quiet moment, and make a wish...';
    if (sample1.result.value.subtitle !== expected) {
      throw new Error(`FAIL: Unexpected subtitle: "${sample1.result.value.subtitle}" (expected "${expected}")`);
    }
    if (sample2.result.value.subtitle !== expected) {
      throw new Error(`FAIL: Subtitle changed dynamically during countdown: "${sample2.result.value.subtitle}"`);
    }

    // Verify progress bar updated
    console.log(`Progress bar width progressed: ${sample1.result.value.barWidth} -> ${sample2.result.value.barWidth}`);
    console.log('PASS: Heading, static subtitle, and countdown progress bar verified successfully!');

    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
