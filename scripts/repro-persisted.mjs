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

  // 2. Persisted tab → Save the default 3-panel layout (alpha + beta + gamma).
  //    beta carries a custom toolbar, gamma a wrapper — so restoring all three
  //    lets us verify component + toolbar + wrapper are all rebuilt from the registry.
  await clickByText(page, PERSISTED_TAB);
  await page.waitForSelector('.react-mosaic', { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 200));
  await clickByText(page, '💾 Save layout');

  // 3. Reload → re-select Persisted tab = restore-on-first-mount path.
  await page.reload({ waitUntil: 'networkidle0' });
  await clickByText(page, PERSISTED_TAB);
  await page.waitForSelector('.react-mosaic', { timeout: 8000 });

  // Give React a tick to settle the restored layout.
  await new Promise((r) => setTimeout(r, 300));

  // 3b. RESHUFFLE: toggle Beta off then on. Removing + re-adding re-nests the tree,
  //     so panels' tiles remount — the path that detaches the portal anchor on the
  //     current (buggy) library. After this, content must still be inside its slot.
  await clickByText(page, '− Beta');
  await new Promise((r) => setTimeout(r, 150));
  await clickByText(page, '+ Beta');
  await new Promise((r) => setTimeout(r, 300));

  // 4. Audit content placement AND that the registry-driven toolbar / wrapper were
  //    rebuilt on restore (only the tree is persisted; toolbar/wrapper come from the
  //    registry via entryToConfig).
  const result = await page.evaluate(() => {
    const root = document.querySelector('.react-mosaic');
    const all = [...document.querySelectorAll('.panel-content')];
    const inside = all.filter((el) => root && root.contains(el));
    const sized = inside.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    // toolbar: beta's custom toolbar is wrapped by the library in .rm-mosaic-custom-toolbar
    const toolbarEl = root?.querySelector('.rm-mosaic-custom-toolbar') ?? null;
    const toolbar = !!toolbarEl && /Beta \(custom toolbar\)/.test(toolbarEl.textContent ?? '');

    // wrapper: gamma's BorderProvider must wrap gamma's content, inside the mosaic
    const wrapperEl = root?.querySelector('[data-testid="border-wrapper"]') ?? null;
    const wrapperContent = wrapperEl?.querySelector('.panel-content') ?? null;
    const wrapper = !!wrapperEl && !!wrapperContent && wrapperEl.contains(wrapperContent);

    return {
      total: all.length,
      inside: inside.length,
      orphaned: all.length - inside.length,
      sized: sized.length,
      toolbar,
      wrapper,
    };
  });

  console.log('restore audit:', JSON.stringify(result));

  // Default registry has 3 panels (alpha, beta, gamma) → expect all 3 restored,
  // plus beta's toolbar and gamma's wrapper rebuilt from the registry.
  const EXPECTED = 3;
  const failures = [];
  if (result.total !== EXPECTED) failures.push(`expected ${EXPECTED} panels, got ${result.total}`);
  if (result.orphaned > 0) failures.push(`${result.orphaned} orphaned (outside .react-mosaic)`);
  if (result.sized < EXPECTED) failures.push(`only ${result.sized} sized`);
  if (!result.toolbar) failures.push('beta custom toolbar NOT restored');
  if (!result.wrapper) failures.push('gamma wrapper NOT restored');

  if (failures.length > 0) {
    console.error(`FAIL: ${failures.join('; ')}`);
    process.exitCode = 1;
  } else {
    console.log(
      `PASS: ${result.sized} panels restored, sized & inside .react-mosaic; toolbar + wrapper rebuilt`,
    );
  }
} finally {
  await browser.close();
}
