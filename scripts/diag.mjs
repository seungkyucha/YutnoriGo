import { chromium } from 'playwright';
const URL = 'http://localhost:4173/';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('console', (m) => console.log(`[console.${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const before = await page.evaluate(() => ({ ...window.YG.state.data }));
console.log('BEFORE:', JSON.stringify(before));

// 버튼 상태
const btn = await page.evaluate(() => {
  const b = document.getElementById('throw-btn');
  return { disabled: b?.disabled, exists: !!b };
});
console.log('throwBtn:', JSON.stringify(btn));

// 클릭 (애니메이션 무시하고 DOM click 직접 디스패치)
await page.evaluate(() => document.getElementById('throw-btn').click());
for (let i = 0; i < 14; i++) {
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => ({ rolls: window.YG.state.data.rolls, coins: window.YG.state.data.coins, pos: window.YG.state.data.pos }));
  console.log(`t+${i + 1}s:`, JSON.stringify(s));
}
await browser.close();
