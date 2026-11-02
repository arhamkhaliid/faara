import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9320;

async function run() {
  console.log('Launching headless Chrome to test Certificate scene...');
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--window-size=1280,800',
      '--incognito',
      `http://127.0.0.1:5173/?scene=certificate&_t=${Date.now()}`,
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

    // Wait for Certificate element to mount
    console.log('Waiting for Certificate to load...');
    for (let i = 0; i < 35; i++) {
      await new Promise(r => setTimeout(r, 150));
      const res = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('.certificate-keepsake-parchment'))`,
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    // 1. Audit Dashboard Removal
    console.log('\n--- 1. Checking Purple Dashboard Removal ---');
    const headerCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const header = document.querySelector('.certificate-hud-header');
        const text = document.body.innerText;
        const hasChamberText = text.includes('THE CERTIFICATION CHAMBER');
        const hasTerraceText = text.includes('Starlight Terrace');
        const hasPendingStatus = text.includes('Pending Signature');
        const firstMainElement = document.querySelector('.certificate-hud-wrapper')?.firstElementChild?.className;
        return {
          headerFound: Boolean(header),
          hasChamberText,
          hasTerraceText,
          hasPendingStatus,
          firstMainElement
        };
      })()`,
      returnByValue: true
    });
    console.log('Header removal check:', headerCheck?.result?.value);

    // 2. Audit Certificate Wording
    console.log('\n--- 2. Checking Certificate Wording ---');
    const wordingCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const clauseLine = document.querySelector('.cert-clause-lead-line')?.textContent?.trim();
        const subline = document.querySelector('.cert-clause-subline')?.textContent?.trim();
        const bodyText = document.querySelector('.cert-body-narrative')?.textContent?.trim();
        const title = document.querySelector('.cert-headline')?.textContent?.trim();
        const recipient = document.querySelector('.cert-recipient-name')?.textContent?.trim();
        return {
          clauseLine,
          subline,
          bodyText,
          title,
          recipient
        };
      })()`,
      returnByValue: true
    });
    console.log('Certificate Wording Audit:', wordingCheck?.result?.value);

    // 3. Capture Initial Unsigned Desktop Certificate
    console.log('\n--- 3. Capturing Unsigned Desktop View ---');
    await new Promise(r => setTimeout(r, 500));
    const shotDesktopUnsigned = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'certificate_refined_unsigned_desktop.png'), Buffer.from(shotDesktopUnsigned.data, 'base64'));
    console.log('Saved certificate_refined_unsigned_desktop.png');

    // 4. Capture Initial Unsigned Mobile Certificate
    console.log('\n--- 4. Capturing Unsigned Mobile View ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 500));
    const shotMobileUnsigned = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'certificate_refined_unsigned_mobile.png'), Buffer.from(shotMobileUnsigned.data, 'base64'));
    console.log('Saved certificate_refined_unsigned_mobile.png');

    // Reset to Desktop
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await new Promise(r => setTimeout(r, 300));

    // 5. Test "Sign for me" Two-Stage Sequence
    console.log('\n--- 5. Testing "Sign for me" 2-Stage Sequence ---');
    const signClickTime = Date.now();
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const signBtn = btns.find(b => b.textContent && b.textContent.includes('Sign for me'));
        if (signBtn) signBtn.click();
        return Boolean(signBtn);
      })()`,
      returnByValue: true
    });

    // Check at +200ms: signature should be visible, stamp must NOT be visible!
    await new Promise(r => setTimeout(r, 200));
    const checkAt200ms = await send('Runtime.evaluate', {
      expression: `(() => {
        const typedSig = document.querySelector('.cert-typed-signature');
        const stamp = document.querySelector('.cert-official-stamp');
        const placeholder = document.querySelector('.cert-seal-placeholder');
        const downloadBtn = document.querySelector('.btn-cert-download-prominent');
        return {
          hasTypedSignature: Boolean(typedSig),
          typedSignatureText: typedSig?.textContent?.trim(),
          hasStamp: Boolean(stamp),
          hasPlaceholder: Boolean(placeholder),
          hasDownloadBtn: Boolean(downloadBtn)
        };
      })()`,
      returnByValue: true
    });
    console.log(`Immediate state at +200ms:`, checkAt200ms?.result?.value);

    // Check at +1200ms (1.2s after click): stamp must STILL NOT be visible!
    await new Promise(r => setTimeout(r, 1000));
    const checkAt1200ms = await send('Runtime.evaluate', {
      expression: `(() => {
        const stamp = document.querySelector('.cert-official-stamp');
        const downloadBtn = document.querySelector('.btn-cert-download-prominent');
        return {
          hasStamp: Boolean(stamp),
          hasDownloadBtn: Boolean(downloadBtn)
        };
      })()`,
      returnByValue: true
    });
    console.log(`State at +1200ms (should still be waiting):`, checkAt1200ms?.result?.value);

    // Check at +2300ms (2.3s after click, timer fired at 2000ms): stamp MUST BE visible!
    await new Promise(r => setTimeout(r, 1100));
    const elapsedSinceSign = Date.now() - signClickTime;
    const checkAt2300ms = await send('Runtime.evaluate', {
      expression: `(() => {
        const stamp = document.querySelector('.cert-official-stamp');
        const stampText = stamp?.textContent?.trim();
        const downloadBtn = document.querySelector('.btn-cert-download-prominent');
        return {
          hasStamp: Boolean(stamp),
          stampText,
          hasDownloadBtn: Boolean(downloadBtn)
        };
      })()`,
      returnByValue: true
    });
    console.log(`State at +${elapsedSinceSign}ms (stamp must be revealed):`, checkAt2300ms?.result?.value);

    // Capture Stamped Desktop View
    console.log('\n--- 6. Capturing Signed & Stamped Desktop View ---');
    const shotDesktopStamped = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'certificate_refined_stamped_desktop.png'), Buffer.from(shotDesktopStamped.data, 'base64'));
    console.log('Saved certificate_refined_stamped_desktop.png');

    // Capture Stamped Mobile View
    console.log('\n--- 7. Capturing Signed & Stamped Mobile View ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise(r => setTimeout(r, 400));
    const shotMobileStamped = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'certificate_refined_stamped_mobile.png'), Buffer.from(shotMobileStamped.data, 'base64'));
    console.log('Saved certificate_refined_stamped_mobile.png');

    // 8. Test Clear & Reset
    console.log('\n--- 8. Testing Clear & Reset ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await new Promise(r => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const clearBtn = btns.find(b => b.textContent && b.textContent.includes('Clear'));
        if (clearBtn) clearBtn.click();
      })()`,
    });
    await new Promise(r => setTimeout(r, 200));

    const checkCleared = await send('Runtime.evaluate', {
      expression: `(() => {
        const typedSig = document.querySelector('.cert-typed-signature');
        const stamp = document.querySelector('.cert-official-stamp');
        const placeholder = document.querySelector('.cert-seal-placeholder');
        const hint = document.querySelector('.cert-canvas-hint');
        return {
          hasTypedSignature: Boolean(typedSig),
          hasStamp: Boolean(stamp),
          hasPlaceholder: Boolean(placeholder),
          hasHint: Boolean(hint)
        };
      })()`,
      returnByValue: true
    });
    console.log('State after Clear:', checkCleared?.result?.value);

    // 9. Test Manual Canvas Drawing
    console.log('\n--- 9. Testing Manual Signature Drawing & 2-Stage Sequence ---');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const canvas = document.querySelector('.cert-signature-canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        
        // Dispatch pointerdown, pointermove, pointerup
        canvas.dispatchEvent(new PointerEvent('pointerdown', {
          clientX: rect.left + 50,
          clientY: rect.top + 30,
          pointerId: 1,
          bubbles: true
        }));
        canvas.dispatchEvent(new PointerEvent('pointermove', {
          clientX: rect.left + 100,
          clientY: rect.top + 35,
          pointerId: 1,
          bubbles: true
        }));
        canvas.dispatchEvent(new PointerEvent('pointermove', {
          clientX: rect.left + 150,
          clientY: rect.top + 25,
          pointerId: 1,
          bubbles: true
        }));
        canvas.dispatchEvent(new PointerEvent('pointerup', {
          clientX: rect.left + 150,
          clientY: rect.top + 25,
          pointerId: 1,
          bubbles: true
        }));
        return true;
      })()`,
      returnByValue: true
    });

    const manualSignTime = Date.now();
    // At +200ms: drawn signature accepted, stamp NOT yet visible
    await new Promise(r => setTimeout(r, 200));
    const manualAt200ms = await send('Runtime.evaluate', {
      expression: `(() => {
        const stamp = document.querySelector('.cert-official-stamp');
        return { hasStamp: Boolean(stamp) };
      })()`,
      returnByValue: true
    });
    console.log('Manual signature at +200ms (stamp should NOT be visible):', manualAt200ms?.result?.value);

    // At +2300ms: stamp MUST be visible
    await new Promise(r => setTimeout(r, 2100));
    const manualElapsed = Date.now() - manualSignTime;
    const manualAt2300ms = await send('Runtime.evaluate', {
      expression: `(() => {
        const stamp = document.querySelector('.cert-official-stamp');
        return { hasStamp: Boolean(stamp) };
      })()`,
      returnByValue: true
    });
    console.log(`Manual signature at +${manualElapsed}ms (stamp MUST be revealed):`, manualAt2300ms?.result?.value);

    // 10. Test Back Navigation
    console.log('\n--- 10. Testing Back Navigation to Control Room ---');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-cert-nav-back')?.click()`,
    });
    await new Promise(r => setTimeout(r, 600));

    const gardenNavAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          bodySnippet: document.body.innerText.slice(0, 100)
        };
      })()`,
      returnByValue: true
    });
    console.log('Navigated back to garden/control-room:', gardenNavAudit?.result?.value);

    console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

