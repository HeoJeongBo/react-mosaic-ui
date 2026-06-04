// Real-browser reproduction/verification for the persisted-layout content bug.
// jsdom cannot observe it (no StrictMode effect-replay DOM replacement, no layout),
// so we drive the example with the system Chrome via puppeteer-core (no download).
//
// Usage:
//   cd example && npm run build && npm run preview -- --port 4173   # terminal 1
//   node scripts/repro-persisted.mjs                                 # terminal 2
//
// Exits 0 (PASS) when every restored panel's .panel-content is inside .react-mosaic
// with non-zero size; exits 1 (FAIL) when content is orphaned/zero-sized.

import puppeteer from 'puppeteer-core';

const URL = process.env.URL ?? 'http://localhost:4173';
const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const STORAGE_KEY = 'react-mosaic-demo-layout';
const PERSISTED_TAB = '💾 Persisted layout';

async function clickByText(page, text) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('button')].some((b) => b.textContent?.includes(t)),
    { timeout: 8000 },
    text,
  );
  await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(t));
    btn?.click();
  }, text);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--no-default-browser-settings'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Clean baseline: clear any stored layout, then reload.
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
  await page.reload({ waitUntil: 'networkidle0' });

  // 2. Persisted tab → arrange (remove one panel so a non-default 2-panel tree is
  //    saved; this exercises the reshuffle→portal path) → Save.
  await clickByText(page, PERSISTED_TAB);
  await page.waitForSelector('.react-mosaic', { timeout: 8000 });
  await clickByText(page, '− Gamma'); // remove gamma → arranged 2-panel tree
  await new Promise((r) => setTimeout(r, 200));
  await clickByText(page, '💾 Save layout');

  // 3. Reload → re-select Persisted tab = restore-on-first-mount path.
  await page.reload({ waitUntil: 'networkidle0' });
  await clickByText(page, PERSISTED_TAB);
  await page.waitForSelector('.react-mosaic', { timeout: 8000 });

  // Give React a tick to settle the restored layout.
  await new Promise((r) => setTimeout(r, 300));

  // 4. Audit where panel content actually lives.
  const result = await page.evaluate(() => {
    const root = document.querySelector('.react-mosaic');
    const all = [...document.querySelectorAll('.panel-content')];
    const inside = all.filter((el) => root && root.contains(el));
    const orphaned = all.filter((el) => !root || !root.contains(el));
    const sized = inside.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return {
      total: all.length,
      inside: inside.length,
      orphaned: orphaned.length,
      sized: sized.length,
    };
  });

  console.log('panel-content audit:', JSON.stringify(result));

  // We saved a 2-panel arrangement (alpha+beta), so expect exactly 2 restored.
  const EXPECTED = 2;
  if (result.total !== EXPECTED || result.orphaned > 0 || result.sized < EXPECTED) {
    console.error(
      `FAIL: expected ${EXPECTED} restored panels inside .react-mosaic & sized; got ${JSON.stringify(result)}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${result.sized} panel(s) restored, inside .react-mosaic, sized`);
  }
} finally {
  await browser.close();
}
