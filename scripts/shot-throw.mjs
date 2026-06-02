import { chromium } from 'playwright';
const URL = 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById('throw-btn').click());
// 윷이 공중/착지하는 순간들 캡처
for (const [ms, name] of [[500, 'air'], [1100, 'land'], [1700, 'rest']]) {
  await page.waitForTimeout(name === 'air' ? 500 : 600);
  await page.screenshot({ path: `scripts/throw-${name}.png` });
}
await browser.close();
console.log('done');
