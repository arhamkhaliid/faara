import { spawn } from 'child_process';

const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--window-size=1280,800',
    'http://localhost:5173/',
  ]
);

let attempts = 0;
const checkTarget = async () => {
  try {
    const res = await fetch('http://localhost:9225/json');
    const pages = await res.json();
    const target = pages.find((p) => p.url.includes('5173'));
    if (!target) {
      if (++attempts > 25) {
        chrome.kill();
        process.exit(1);
      }
      return setTimeout(checkTarget, 300);
    }
    setupWs(target.webSocketDebuggerUrl);
  } catch {
    if (++attempts > 25) {
      chrome.kill();
      process.exit(1);
    }
    setTimeout(checkTarget, 300);
  }
};
setTimeout(checkTarget, 600);

function setupWs(url) {
  const ws = new WebSocket(url);
  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

    const poll = setInterval(() => {
      ws.send(
        JSON.stringify({
          id: 100,
          method: 'Runtime.evaluate',
          params: {
            expression: `(() => {
              const surprise = document.querySelector('.garden-surprise-hud');
              if (surprise) return 'FOUND_SURPRISE';

              const bootBtn = document.getElementById('boot-gate-primary-btn');
              if (bootBtn) { bootBtn.click(); return 'clicked_boot'; }

              const choiceBtns = document.querySelectorAll('.btn-romantic-choice');
              if (choiceBtns.length > 0) {
                choiceBtns[0].click();
                const cont = document.querySelector('.btn-romantic-primary');
                if (cont) { cont.click(); return 'clicked_continue'; }
              }

              const obsCards = document.querySelectorAll('.observatory-module-card button');
              if (obsCards.length > 0) {
                obsCards[0].click(); // Click Open Surprise
                return 'clicked_open_surprise';
              }

              const skipBtn = document.querySelector('.romantic-skip-btn');
              if (skipBtn) { skipBtn.click(); return 'clicked_skip'; }

              return 'waiting';
            })()`,
            awaitPromise: true,
          },
        })
      );
    }, 400);

    let done = false;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 100 && msg.result?.result?.value) {
        const val = msg.result.result.value;
        console.log('Poll status:', val);
        if (val === 'FOUND_SURPRISE' && !done) {
          done = true;
          clearInterval(poll);
          setTimeout(() => {
            ws.send(
              JSON.stringify({
                id: 200,
                method: 'Page.captureScreenshot',
                params: { format: 'png' },
              })
            );
          }, 1200);
        }
      }
      if (msg.id === 200 && msg.result?.data) {
        import('fs').then((fs) => {
          fs.writeFileSync('scratch/surprise_initial.png', Buffer.from(msg.result.data, 'base64'));
          console.log('Saved scratch/surprise_initial.png');
          ws.close();
          chrome.kill();
          process.exit(0);
        });
      }
    };
  };
}
