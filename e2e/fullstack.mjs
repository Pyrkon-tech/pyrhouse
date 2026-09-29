// Full-stack e2e: the app against a real backend and its database (loaded with the backend's fixtures). Each check
// drives one screen the way a person would, and confirms through the API that the backend really did it — what the
// smoke test (e2e/smoke.mjs) can't, since it runs without a backend.
//
// Usage: BASE_URL=<app> API_URL=<backend> SMOKE_TOKEN=<a token the backend accepts> node e2e/fullstack.mjs
// Prints one line per screen, "✓ /path" or "✗ /path" followed by "  - problem" lines.

import { chromium } from 'playwright';

const { BASE_URL, API_URL, SMOKE_TOKEN: TOKEN } = process.env;
if (!BASE_URL || !API_URL || !TOKEN) {
  console.error('Needs BASE_URL, API_URL and SMOKE_TOKEN (a token the backend accepts).');
  process.exit(2);
}

async function api(path, init = {}) {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} answered ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const text = async (page) => ((await page.textContent('body').catch(() => '')) || '').replace(/\s+/g, ' ');

const CHECKS = [
  {
    // Looking an item up by its Pyrcode lands on that item, as the database has it.
    path: '/home',
    async run(page) {
      const item = (await api('/items')).find((i) => i.pyrcode && i.serial);
      if (!item) throw new Error('the fixtures have no item with a Pyrcode and a serial number');
      await page.goto(BASE_URL + '/home');
      const box = page.getByPlaceholder(/PYR code/i);
      await box.waitFor({ timeout: 15000 });
      await box.fill(item.pyrcode);
      await box.press('Enter');
      await page.waitForURL(new RegExp(`/equipment/${item.id}\\b`), { timeout: 15000 });
      await page.waitForTimeout(1500);
      if (!(await text(page)).includes(item.serial)) throw new Error(`/equipment/${item.id} doesn't show serial number of ${item.pyrcode}`);
    },
  },
  {
    // A location added in the form is stored by the backend.
    path: '/locations',
    async run(page) {
      const name = `E2E lokalizacja ${Date.now()}`;
      await page.goto(BASE_URL + '/locations');
      await page.getByRole('button', { name: /Dodaj lokalizację/ }).click();
      await page.getByLabel(/Nazwa lokalizacji/).fill(name);
      await page.getByRole('dialog').getByRole('button', { name: /^Dodaj$/ }).click();
      await page.getByText(name).first().waitFor({ timeout: 15000 });
      const stored = (await api('/locations')).find((l) => l.name === name);
      if (!stored) throw new Error(`"${name}" is on the screen but not in GET /locations`);
      await api(`/locations/${stored.id}`, { method: 'DELETE' }).catch(() => {});
    },
  },
  {
    // The transfer list shows what the database holds, and one of them opens with its route.
    path: '/transfers',
    async run(page) {
      const transfers = await api('/transfers');
      if (!transfers.length) throw new Error('the fixtures have no transfers');
      const t = transfers[0];
      await page.goto(BASE_URL + '/transfers');
      await page.waitForTimeout(2500);
      const body = await text(page);
      for (const name of [t.from_location?.name, t.to_location?.name].filter(Boolean)) {
        if (!body.includes(name)) throw new Error(`the list doesn't show "${name}" (transfer ${t.id})`);
      }
    },
  },
  {
    path: '/transfers/:id',
    async run(page) {
      const t = (await api('/transfers'))[0];
      await page.goto(`${BASE_URL}/transfers/${t.id}`);
      await page.waitForTimeout(2500);
      const body = await text(page);
      const to = t.to_location?.name;
      if (to && !body.includes(to)) throw new Error(`/transfers/${t.id} doesn't show its destination "${to}"`);
    },
  },
];

const browser = await chromium.launch();
let failed = false;
for (const check of CHECKS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((t) => localStorage.setItem('token', t), TOKEN);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`uncaught: ${e.message}`));
  try {
    await check.run(page);
  } catch (e) {
    errors.unshift(e.message.split('\n')[0]);
  }
  if (errors.length) {
    failed = true;
    console.log(`✗ ${check.path}`);
    for (const e of errors) console.log(`  - ${e}`);
  } else console.log(`✓ ${check.path}`);
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
