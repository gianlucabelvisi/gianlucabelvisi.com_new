import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await p.goto('http://localhost:8765/test.html?lite');
await p.waitForFunction(() => !document.getElementById('go').disabled, null, { timeout: 120000 });
await p.click('#go'); await p.waitForTimeout(1500); await p.keyboard.press('Escape');
const W = (bx, by, d) => p.evaluate(([bx, by, d]) => window.__apt.stepWalk(bx, by, d), [bx, by, d]);
const log = async (n, r) => console.log(n, JSON.stringify(await r));
await log('to 5,-2.2', W(1, 0, 0.75)); await log('', W(0, 1, 0.2));
for (let lvl = 0; lvl < 3; lvl++) {
  await log('A down', W(-1, 0, 4.6));
  await log('cross', W(0, 1, 1.4));
  await log('B down', W(1, 0, 4.4));
  if (lvl < 2) await log('back to A', W(0, -1, 1.4));
}
await p.evaluate(() => { const d = window.__apt.doors.find((d) => d.id === 'street_door'); d.target = 1; });
await p.waitForTimeout(3000);
await log('to 5.5,-2.3', W(0, -1, 1.5));
await log('into lobby', W(0, -1, 2.8));
await log('to door', W(-1, 0, 5.8));
await log('out', W(-1, 0, 3));
await log('along quay W', W(0, -1, 12));
await log('along quay E', W(0, 1, 30));
await log('to canal', W(-1, 0, 15));
await b.close();
