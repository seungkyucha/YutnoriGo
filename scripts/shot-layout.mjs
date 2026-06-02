import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errs = [];
async function shot(w, h, name) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `scripts/lay-${name}.png` });
  // 윷 던지기
  await page.evaluate(() => document.getElementById('throw-btn').click());
  await page.waitForTimeout(750);
  await page.screenshot({ path: `scripts/lay-${name}-throw.png` });
  await page.close();
}
await shot(390, 844, 'phone');
await shot(360, 800, 'tall');
await browser.close();
console.log('errs=', errs.length, errs.slice(0, 5));
console.log('done');
