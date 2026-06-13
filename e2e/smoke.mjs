// Post-build browser smoke test.
//
// Catches the class of failure a plain `vite build` cannot: the bundle compiles
// fine but the app throws at runtime (e.g. the Vite 8 / MUI-icon interop crash
// that hit production — React error #130, ErrorBoundary, silent console).
//
// Loads the built app in real Chromium and asserts that key routes actually
// render their own UI instead of the ErrorBoundary fallback, with no uncaught
// page errors. The backend is NOT required — failed API calls are handled by
// the app and must not take the page down.
//
// Usage: BASE_URL=http://localhost:4173 node e2e/smoke.mjs

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

// Unsigned JWT — the app only decodes it (jwt-decode), never verifies the signature
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const fakeToken = [
  b64url({ alg: 'none', typ: 'JWT' }),
  b64url({ role: 'admin', userID: 1, username: 'ci-smoke', exp: Math.floor(Date.now() / 1000) + 3600 }),
  'sig',
].join('.');

// Network/CORS noise is expected (no backend in CI) and must not fail the smoke
const IGNORABLE = [/Failed to load resource/i, /net::ERR/i, /CORS/i, /Access to fetch/i, /ERR_CONNECTION/i];
const ERROR_BOUNDARY_TEXT = 'Coś poszło nie tak';

const ROUTES = [
  { path: '/login', token: false, expect: 'Zaloguj się' },
  { path: '/home', token: true, expect: 'Home' },
];

const browser = await chromium.launch();
let failed = false;

for (const route of ROUTES) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (!IGNORABLE.some((re) => re.test(text))) consoleErrors.push(text);
  });

  if (route.token) {
    await page.addInitScript((t) => localStorage.setItem('token', t), fakeToken);
  }

  let navError = null;
  await page
    .goto(BASE_URL + route.path, { waitUntil: 'domcontentloaded', timeout: 30000 })
    .catch((e) => { navError = e.message; });
  await page.waitForTimeout(4000);

  const body = ((await page.textContent('body').catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  const problems = [];
  if (navError) problems.push(`navigation failed: ${navError}`);
  if (!body) problems.push('empty <body> (white page)');
  if (body.includes(ERROR_BOUNDARY_TEXT)) problems.push('rendered ErrorBoundary fallback');
  if (route.expect && !body.includes(route.expect)) problems.push(`missing expected text "${route.expect}"`);
  if (pageErrors.length) problems.push(`uncaught page errors:\n    ${pageErrors.join('\n    ')}`);
  if (consoleErrors.length) problems.push(`console errors:\n    ${consoleErrors.join('\n    ')}`);

  if (problems.length) {
    failed = true;
    console.error(`✗ ${route.path}`);
    problems.forEach((p) => console.error(`  - ${p}`));
  } else {
    console.log(`✓ ${route.path}`);
  }

  await ctx.close();
}

await browser.close();

if (failed) {
  console.error('\nSmoke test FAILED — the built app crashed at runtime.');
  process.exit(1);
}
console.log('\nSmoke test passed.');
