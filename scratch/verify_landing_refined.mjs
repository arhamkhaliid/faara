import { spawn } from 'child_process';
import fs from 'fs';

const artifactDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';

async function captureAndVerify(width, height, filename, checkNavigation = false) {
  const port = 9300 + Math.floor(Math.random() * 50);
  console.log(`Testing Chrome at ${width}x${height} on port ${port}...`);
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${width},${height}`,
      '--incognito',
      '--disable-cache',
      '--disk-cache-size=1',
      `http://localhost:5173/?_t=${Date.now()}`,
    ]
  );

  try {
    let target = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch(`http://localhost:${port}/json`);
        const pages = await res.json();
        target = pages.find((p) => p.url.includes('5173'));
        if (target) break;
      } catch {}
    }

    if (!target) {
      throw new Error('Chrome target not found');
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });

    // Wait 3.8s for landing text reveal animations to finish
    await new Promise((r) => setTimeout(r, 4000));

    // Capture Landing Screenshot
    const snap = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });

    const outPath = `${artifactDir}/${filename}`;
    fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
    console.log(`Saved screenshot to ${outPath}`);

    // Inspect bounding boxes of text elements
    const boxEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const hud = document.querySelector('.garden-entrance-hud');
        const container = document.querySelector('.garden-landing-container');
        const title = document.querySelector('.garden-landing-title');
        const subtitle = document.querySelector('.garden-landing-subtitle');
        const link = document.querySelector('.garden-entry-link');
        const toBox = el => el ? {
          top: Math.round(el.getBoundingClientRect().top),
          bottom: Math.round(el.getBoundingClientRect().bottom),
          left: Math.round(el.getBoundingClientRect().left),
          right: Math.round(el.getBoundingClientRect().right),
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height),
        } : null;
        return {
          hud: toBox(hud),
          container: toBox(container),
          title: toBox(title),
          subtitle: toBox(subtitle),
          link: toBox(link),
        };
      })()`,
      returnByValue: true,
    });

    console.log(`${width}x${height} layout positions:`, JSON.stringify(boxEval.result?.value, null, 2));

    if (checkNavigation) {
      console.log('Testing "Come have a look ->" navigation click...');
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('.garden-entry-link');
          if (btn) btn.click();
        })()`,
      });

      // Wait 1.2s for transition to OpeningScene
      await new Promise((r) => setTimeout(r, 1200));

      const navEval = await send('Runtime.evaluate', {
        expression: `(() => {
          const storyHud = document.querySelector('.garden-story-hud');
          const storyTitle = document.querySelector('.romantic-lead-quote');
          return {
            navigatedToOpening: !!storyHud,
            storyText: storyTitle ? storyTitle.textContent : null,
          };
        })()`,
        returnByValue: true,
      });

      console.log('Navigation Result:', navEval.result?.value);

      const navSnap = await send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      fs.writeFileSync(`${artifactDir}/landing_navigated_opening.png`, Buffer.from(navSnap.data, 'base64'));
    }

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function main() {
  await captureAndVerify(1280, 800, 'landing_refined_desktop.png', true);
  await captureAndVerify(390, 844, 'landing_refined_mobile.png', false);
}

main().catch(console.error);

