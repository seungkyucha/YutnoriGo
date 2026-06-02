import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL || 'http://localhost:4173/';
const sizes = [
  { name: 'tall360x800', w: 360, h: 800 },
  { name: 'short375x667', w: 375, h: 667 },
  { name: 'big430x932', w: 430, h: 932 },
  { name: 'desktop1440x900', w: 1440, h: 900 },
  { name: 'tablet820x1180', w: 820, h: 1180 },
];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const s of sizes) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  const stage = await page.evaluate(() => {
    const a = document.getElementById('app');
    return { w: a.clientWidth, h: a.clientHeight, vw: window.innerWidth, vh: window.innerHeight };
  });
  await page.screenshot({ path: `scripts/resp-${s.name}.png` });
  console.log(`${s.name}: stage ${stage.w}x${stage.h} (vp ${stage.vw}x${stage.vh}) errs=${errs.length}`);
  await page.close();
}
await browser.close();
console.log('done');
