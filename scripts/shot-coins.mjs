import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate(() => window.YG.testBurst(80000, true));
const shots = [[90, 'pop'], [120, 'spread'], [180, 'stream'], [260, 'arrive']];
let acc = 0;
for (const [ms, name] of shots) { await page.waitForTimeout(ms - acc); acc = ms; await page.screenshot({ path: `scripts/coins-${name}.png` }); }
await browser.close();
console.log('done');
