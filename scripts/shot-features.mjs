import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2600);
await page.screenshot({ path: 'scripts/feat-board.png' });

// 모든 랜드마크 건설 → 라벨/레벨 확인
await page.evaluate(() => window.YG.testBuildAll());
await page.waitForTimeout(900);
await page.screenshot({ path: 'scripts/feat-built.png' });

// 룰렛 (promise 기다리지 않게 호출 → 회전 중 캡처)
await page.evaluate(() => { window.YG.testRoulette(); });
await page.waitForTimeout(1300);
await page.screenshot({ path: 'scripts/feat-roulette-spin.png' });
await page.waitForTimeout(2600);
await page.screenshot({ path: 'scripts/feat-roulette-win.png' });

console.log('errs=', errs.length, errs.slice(0, 5));
await browser.close();
console.log('done');
