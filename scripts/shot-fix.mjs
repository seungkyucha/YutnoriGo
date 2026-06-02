import { chromium } from 'playwright';
const URL = 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL, { waitUntil: 'load' });
// 건물 건설(레벨업)해서 바닥 묻힘 확인용
await page.waitForTimeout(2600);
await page.evaluate(() => window.YG.testBuildAll());
await page.waitForTimeout(2000);
await page.screenshot({ path: 'scripts/fix-built.png' });
// 윷 던지기 → 결과 토스트 위치 확인
await page.evaluate(() => document.getElementById('throw-btn').click());
await page.waitForTimeout(2300);
await page.screenshot({ path: 'scripts/fix-toast.png' });
console.log('errs=', errs.length, errs.slice(0, 3));
await browser.close();
console.log('done');
