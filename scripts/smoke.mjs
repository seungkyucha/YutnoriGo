import { chromium } from 'playwright';

const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const errors = [];
const logs = [];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

page.on('console', (m) => { logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', (r) => {
  const u = r.url();
  if (!u.includes('fonts.g')) errors.push('REQFAIL: ' + u + ' ' + (r.failure()?.errorText || ''));
});

await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(2500);

// fatal-err 배너 확인
const fatal = await page.$('#fatal-err');
const fatalText = fatal ? await fatal.textContent() : null;

// 핵심 UI 존재 확인
const hasThrow = !!(await page.$('#throw-btn'));
const hasCoins = !!(await page.$('.stat.coins .val'));
const coinText = hasCoins ? await page.$eval('.stat.coins .val', (e) => e.textContent) : null;

// 윷 던지기 시도
let threw = false;
if (hasThrow) {
  await page.click('#throw-btn').catch(() => {});
  await page.waitForTimeout(4000);
  threw = true;
}
const coinTextAfter = hasCoins ? await page.$eval('.stat.coins .val', (e) => e.textContent) : null;

// 건설 시트 열기
let buildOk = false;
const buildBtn = await page.$('text=건설');
if (buildBtn) { await buildBtn.click().catch(() => {}); await page.waitForTimeout(800);
  buildOk = !!(await page.$('.lm-card')); }

await page.screenshot({ path: 'scripts/smoke-shot.png' });

await browser.close();

console.log('=== SMOKE RESULT ===');
console.log('hasThrowBtn:', hasThrow, '| hasCoins:', hasCoins, '| coins:', coinText, '->', coinTextAfter);
console.log('threw:', threw, '| buildSheetCards:', buildOk);
console.log('fatalBanner:', fatalText || '(none)');
console.log('pageErrors:', errors.length);
errors.forEach((e) => console.log('  ' + e));
console.log('--- console logs (last 20) ---');
logs.slice(-20).forEach((l) => console.log('  ' + l));
console.log('OK:', errors.length === 0 && !fatalText && hasThrow ? 'PASS' : 'CHECK');
