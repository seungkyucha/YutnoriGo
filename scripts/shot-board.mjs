import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'scripts/shot-board.png' });
// 윷 던지기 후 결과까지 대기
await page.click('#throw-btn').catch(() => {});
await page.waitForTimeout(2200);
await page.screenshot({ path: 'scripts/shot-yut.png' });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'scripts/shot-after.png' });
const coins = await page.$eval('.stat.coins .val', (e) => e.textContent).catch(() => '?');
console.log('coins after turn:', coins);
await browser.close();
