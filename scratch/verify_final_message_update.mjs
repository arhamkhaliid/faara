import fs from 'fs';
import path from 'path';

const artifactsDir = '/Users/arhamkhalid/.gemini/antigravity/brain/f267f321-7dd6-4f93-a3f1-2af786a266b1';
const port = 9287;

async function run() {
  console.log('Connecting to Chrome on port', port);
  const tabRes = await fetch(`http://127.0.0.1:${port}/json/new?http://127.0.0.1:5173/?scene=final-message&_t=${Date.now()}`, { method: 'PUT' });
  const page = await tabRes.json();
  console.log('Created tab:', page.id);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
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

  // Wait for initial mount
  await new Promise(r => setTimeout(r, 600));

  // Advance through all beats up to maxStep (step 9)
  console.log('Advancing through all beats...');
  for (let i = 0; i < 12; i++) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const scene = document.querySelector('.final-message-scene-full');
        if (scene) scene.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 300));
  }

  // Allow animations and motes to stabilize
  await new Promise(r => setTimeout(r, 800));

  // 1. Audit Text and DOM structure
  const audit = await send('Runtime.evaluate', {
    expression: `(() => {
      const greeting = document.querySelector('.final-letter-greeting')?.textContent?.trim();
      const paragraphs = Array.from(document.querySelectorAll('.final-letter-p')).map(p => p.textContent?.trim());
      const signoff = document.querySelector('.final-letter-signoff')?.textContent?.trim();
      const button = document.querySelector('.btn-one-last-thing')?.textContent?.trim();

      const scrollArea = document.querySelector('.final-letter-scroll-area');
      const content = document.querySelector('.final-letter-content');
      const signoffEl = document.querySelector('.final-letter-signoff');
      const pEl = document.querySelector('.final-letter-p');

      const signoffStyle = signoffEl ? window.getComputedStyle(signoffEl) : null;
      const pStyle = pEl ? window.getComputedStyle(pEl) : null;

      return {
        greeting,
        paragraphs,
        paragraphCount: paragraphs.length,
        signoff,
        button,
        signoffColor: signoffStyle?.color,
        pColor: pStyle?.color,
        pFont: pStyle?.fontFamily,
        pLineHeight: pStyle?.lineHeight,
        scrollMetrics: scrollArea ? {
          scrollHeight: scrollArea.scrollHeight,
          clientHeight: scrollArea.clientHeight,
          scrollTop: scrollArea.scrollTop,
          isScrollable: scrollArea.scrollHeight > scrollArea.clientHeight
        } : null
      };
    })()`,
    returnByValue: true
  });

  const data = audit.result.value;
  console.log('Final Message Audit Data:\n', JSON.stringify(data, null, 2));

  // Expected texts
  const expectedGreeting = 'Faara,';
  const expectedParagraphs = [
    'Before anything else, I just want to say thank you.',
    'Thank you for always listening, especially when I\'m worried about something, dealing with a problem, or just have too much going on in my head. You always listen so patiently, and somehow, when you say, “Koi baat nahi, main hoon,” things feel a little easier to deal with.',
    'I don\'t know if I\'ve ever properly thanked you for that, but I\'m genuinely grateful to have you in my life. And honestly, talking to you has a way of making a bad day feel a little better.',
    'For your birthday, I hope you get to experience all the things you\'ve been working towards, all the places you want to see, and all the dreams you\'ve been quietly carrying with you. I hope you achieve everything you\'re hoping for, and even find yourself somewhere beyond what you once imagined possible.',
    'And more than anything, I hope life gives you plenty of reasons to smile. Not just today, or because it\'s your birthday, but on ordinary days too. I hope you always have people around you who listen when you need them, who remind you that things will be okay, and who make you feel as cared for as you make others feel.',
    'I made all of this for one very simple reason: I wanted to make you smile. That\'s genuinely it. I just wanted you to have a little something made especially for you, something that might make your birthday a little more memorable.',
    'So, I hope this made you smile, even if just a little.'
  ];
  const expectedSignoff = 'Happy birthday, Faara. ❤️';
  const expectedButton = 'One last thing… →';

  if (data.greeting !== expectedGreeting) {
    throw new Error(`FAIL: Greeting mismatch.\nExpected: "${expectedGreeting}"\nGot:      "${data.greeting}"`);
  }
  if (data.paragraphCount !== 7) {
    throw new Error(`FAIL: Expected 7 paragraphs, got ${data.paragraphCount}`);
  }
  for (let i = 0; i < 7; i++) {
    if (data.paragraphs[i] !== expectedParagraphs[i]) {
      throw new Error(`FAIL: Paragraph ${i + 1} mismatch.\nExpected: "${expectedParagraphs[i]}"\nGot:      "${data.paragraphs[i]}"`);
    }
  }
  if (data.signoff !== expectedSignoff) {
    throw new Error(`FAIL: Signoff mismatch.\nExpected: "${expectedSignoff}"\nGot:      "${data.signoff}"`);
  }
  if (!data.button.includes('One last thing…')) {
    throw new Error(`FAIL: Button label mismatch.\nGot: "${data.button}"`);
  }
  console.log('PASS: All texts match 100% of the exact requested copy!');

  // Verify Soft Pink emphasis on signoff: rgb(253, 164, 175) is #fda4af
  if (!data.signoffColor.includes('253, 164, 175')) {
    throw new Error(`FAIL: Signoff color is not soft pink.\nGot: "${data.signoffColor}"`);
  }
  console.log('PASS: Signoff color has exact soft pink emphasis!');

  // Scroll to top for initial desktop screenshot
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.final-letter-scroll-area').scrollTop = 0;`
  });
  await new Promise(r => setTimeout(r, 300));

  const deskTopShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'final_message_desktop_top.png'), Buffer.from(deskTopShot.data, 'base64'));
  console.log('Saved final_message_desktop_top.png');

  // Scroll to bottom for scrolled desktop screenshot
  await send('Runtime.evaluate', {
    expression: `const el = document.querySelector('.final-letter-scroll-area'); el.scrollTop = el.scrollHeight;`
  });
  await new Promise(r => setTimeout(r, 400));

  const deskBottomShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'final_message_desktop_bottom.png'), Buffer.from(deskBottomShot.data, 'base64'));
  console.log('Saved final_message_desktop_bottom.png');

  // 2. Mobile Viewport (390x844)
  console.log('Testing Mobile Viewport (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));

  // Scroll to top on mobile
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.final-letter-scroll-area').scrollTop = 0;`
  });
  await new Promise(r => setTimeout(r, 300));

  const mobileTopShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'final_message_mobile_top.png'), Buffer.from(mobileTopShot.data, 'base64'));
  console.log('Saved final_message_mobile_top.png');

  // Scroll to bottom on mobile
  await send('Runtime.evaluate', {
    expression: `const el = document.querySelector('.final-letter-scroll-area'); el.scrollTop = el.scrollHeight;`
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileBottomShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'final_message_mobile_bottom.png'), Buffer.from(mobileBottomShot.data, 'base64'));
  console.log('Saved final_message_mobile_bottom.png');

  // 3. Test "One last thing…" button click navigation to fake-crash
  console.log('Clicking "One last thing…" button to verify transition to fake-crash scene...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('.btn-one-last-thing');
      if (btn) btn.click();
    })()`
  });

  let fakeCrashReached = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    const crashCheck = await send('Runtime.evaluate', {
      expression: `Boolean(document.querySelector('.fake-crash-scene-full'))`,
      returnByValue: true
    });
    if (crashCheck?.result?.value) {
      fakeCrashReached = true;
      console.log('PASS: Successfully transitioned to fake-crash scene!');
      break;
    }
  }

  if (!fakeCrashReached) {
    throw new Error('FAIL: Transition to fake-crash scene failed after clicking "One last thing…".');
  }

  const crashShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactsDir, 'final_message_to_crash_transition.png'), Buffer.from(crashShot.data, 'base64'));
  console.log('Saved final_message_to_crash_transition.png');

  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`).catch(() => {});
  console.log('ALL FINAL MESSAGE VERIFICATION CHECKS PASSED SUCCESSFULLY!');
}

run().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});

