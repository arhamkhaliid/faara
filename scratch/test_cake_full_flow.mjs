import { spawn } from 'child_process';

const port = 9326;

async function run() {
  console.log('Testing full Cake flow from lighting to cutting...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
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

    // Wait for Cake Scene
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 150));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.candle-ignition-control-row'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    console.log('Lighting candle 1...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
        if (btns[0]) btns[0].click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    console.log('Lighting candle 2...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
        if (btns[1]) btns[1].click();
      })()`
    });

    // Wait for the 600ms transition timeout to wish stage
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      const s = await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('.btn-candle-touch'));
          const wish = document.querySelector('.wish-quiet-moment') || document.querySelector('.prompt-flow-wish');
          return {
            b1: btns[0]?.textContent,
            b2: btns[1]?.textContent,
            hasWish: Boolean(wish)
          };
        })()`,
        returnByValue: true
      });
      if (s?.result?.value?.hasWish) {
        console.log(`Wish stage active at ${i * 200}ms!`, s.result.value);
        break;
      }
    }

    // Verify wish stage is active
    const wishCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const wishEl = document.querySelector('.wish-quiet-moment') || document.querySelector('.prompt-flow-wish');
        const headline = document.querySelector('.wish-moment-headline');
        return { hasWish: Boolean(wishEl), headlineText: headline?.textContent };
      })()`,
      returnByValue: true
    });
    console.log('Wish stage check:', wishCheck.result.value);
    if (!wishCheck.result.value.hasWish) throw new Error('Wish stage failed to activate');

    console.log('Waiting for wish countdown to complete (10s)...');
    let blowBtnFound = false;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 600));
      const blowCheck = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.btn-cake-action-blow'))`,
        returnByValue: true
      });
      if (blowCheck?.result?.value) {
        console.log(`Blow button visible at ~${i * 0.6}s!`);
        blowBtnFound = true;
        break;
      }
    }
    if (!blowBtnFound) throw new Error('Blow button did not appear after countdown');

    console.log('Clicking blow button...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-cake-action-blow');
        if (btn) btn.click();
      })()`
    });

    await new Promise(r => setTimeout(r, 1500));

    // Verify transition to cutting stage
    const cuttingCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const cutTitle = document.querySelector('.prompt-flow-cut .prompt-title');
        return { isCutting: Boolean(cutTitle), title: cutTitle?.textContent };
      })()`,
      returnByValue: true
    });
    console.log('Cutting stage check:', cuttingCheck.result.value);
    if (!cuttingCheck.result.value.isCutting) throw new Error('Cutting stage failed to activate');

    console.log('Simulating knife drag to cut cake...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const container = document.querySelector('.cake-3d-scene-container') || document.querySelector('canvas');
        if (!container) return;

        container.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
        container.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 300 }));
        container.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 300, clientY: 300 }));
      })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const celebrationCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const celeb = document.querySelector('.celebration-grand-title');
        const confetti = document.querySelector('.confetti-canvas-container') || document.querySelector('.confetti-container');
        return { hasCelebration: Boolean(celeb), celebText: celeb?.textContent, hasConfetti: Boolean(confetti) };
      })()`,
      returnByValue: true
    });
    console.log('Celebration check:', celebrationCheck.result.value);
    if (!celebrationCheck.result.value.hasCelebration) throw new Error('Celebration failed to trigger on cake cut');

    console.log('\nFULL CAKE FLOW TEST PASSED PERFECTLY!\n');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
