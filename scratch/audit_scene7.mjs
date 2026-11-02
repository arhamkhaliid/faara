import { spawn } from 'child_process';

const port = 9270;

async function run() {
  console.log('--- AUDIT: Checking Live Browser Rendering of Scene 7 ---');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=1280,800',
      '--incognito',
      `http://localhost:5173/?scene=final-message&_t=${Date.now()}`,
    ]
  );

  let target = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch(`http://localhost:${port}/json`);
      const pages = await res.json();
      target = pages.find((p) => p.url.includes('5173'));
      if (target) break;
    } catch {}
  }

  if (!target) {
    chrome.kill();
    throw new Error('Chrome target not found');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise((r) => setTimeout(r, 1500));

  // Advance to show all paragraphs + finishing motes
  for (let step = 1; step <= 4; step++) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const area = document.querySelector('.final-letter-scroll-area');
        if (area) area.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      })()`,
    });
    await new Promise((r) => setTimeout(r, 350));
  }

  // Audit DOM & Styles
  const auditResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const scene = document.querySelector('.final-message-scene-full');
      const backdrop = document.querySelector('.plum-sky-backdrop');
      const glow = document.querySelector('.cinematic-starlight-glow');
      const starsLayer = document.querySelector('.stars-layer');
      const distantStars = document.querySelectorAll('.soft-star.depth-distant');
      const midStars = document.querySelectorAll('.soft-star.depth-mid');
      const champagneParticles = document.querySelectorAll('.champagne-particle');
      const finishingLayer = document.querySelector('.finishing-motes-layer');
      const finishingMotes = document.querySelectorAll('.finishing-mote');
      const letterContent = document.querySelector('.final-letter-content');
      const letterP = document.querySelector('.final-letter-p');
      const signoff = document.querySelector('.final-letter-signoff');

      // Check stacking context & overlapping elements
      const hitTestAtCenter = document.elementFromPoint(640, 400);

      // Extract computed styles
      const getStyles = (el, props) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        const res = {};
        for (const p of props) res[p] = cs.getPropertyValue(p);
        return res;
      };

      return {
        domElements: {
          hasScene: !!scene,
          hasBackdrop: !!backdrop,
          hasGlow: !!glow,
          hasStarsLayer: !!starsLayer,
          distantStarsCount: distantStars.length,
          midStarsCount: midStars.length,
          champagneParticlesCount: champagneParticles.length,
          hasFinishingLayer: !!finishingLayer,
          finishingLayerActive: finishingLayer ? finishingLayer.classList.contains('is-active') : false,
          finishingMotesCount: finishingMotes.length,
        },
        hitElementAtCenter: {
          tagName: hitTestAtCenter?.tagName,
          className: hitTestAtCenter?.className,
        },
        sceneStyles: getStyles(scene, ['background-color', 'background-image', 'z-index', 'position']),
        backdropStyles: getStyles(backdrop, ['background', 'background-image', 'opacity', 'z-index']),
        glowStyles: getStyles(glow, ['background-image', 'filter', 'opacity', 'width', 'height', 'animation']),
        distantStarSample: getStyles(distantStars[0], ['background-color', 'box-shadow', 'opacity', 'width', 'height']),
        midStarSample: getStyles(midStars[0], ['background-color', 'box-shadow', 'opacity', 'width', 'height']),
        champagneSample: getStyles(champagneParticles[0], ['background-image', 'box-shadow', 'opacity', 'width', 'height']),
        letterContentStyles: getStyles(letterContent, ['max-width', 'margin-top', 'margin-bottom', 'padding']),
        letterPStyles: getStyles(letterP, ['font-family', 'font-size', 'line-height', 'color']),
        signoffStyles: getStyles(signoff, ['color', 'text-shadow', 'font-size'])
      };
    })()`,
    returnByValue: true
  });

  console.log('AUDIT RESULT:\n', JSON.stringify(auditResult?.result?.value, null, 2));

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
