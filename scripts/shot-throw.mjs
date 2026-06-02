import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById('throw-btn').click());
const shots = [[700, 'air'], [1400, 'settle'], [2400, 'toast']];
let acc = 0;
for (const [ms, name] of shots) { await page.waitForTimeout(ms - acc); acc = ms; await page.screenshot({ path: `scripts/throw-${name}.png` }); }
console.log('errs=', errs.length, errs.slice(0, 3));
await browser.close();
console.log('done');
