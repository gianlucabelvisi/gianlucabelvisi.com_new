import { chromium } from 'playwright';
import fs from 'fs';
const shots = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const W = +(process.argv[3] || 1000), Hh = +(process.argv[4] || 640);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: Hh } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push('CONSOLE ' + m.text()); if (m.type() === 'log') errs.push('LOG ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:8765/test.html?lite', { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('go') && !document.getElementById('go').disabled, null, { timeout: 120000 });
await page.evaluate(() => { document.getElementById('go').click(); document.getElementById('hint').style.display = 'none'; });
for (const s of shots) {
  await page.evaluate((hh) => { const r = document.getElementById('sunrange'); r.value = hh; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }, String(s.hour ?? 13));
  try { const res = await page.evaluate(s.setup); if (res !== undefined) console.log(s.name, JSON.stringify(res)); } catch (e) { errs.push(s.name + ' SETUP ' + e.message); }
  await page.waitForTimeout(s.wait || 3000);
  await page.screenshot({ path: `/tmp/v_${s.name}.png`, timeout: 240000 });
}
console.log(errs.join('\n') || 'no errors');
await browser.close();
