import { chromium } from 'playwright';
const [,, out = 'shot.png', setup = '', hour = '13', w = '1280', h = '800'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:8765/test.html?lite', { waitUntil: 'load' });
try { await page.waitForFunction(() => document.getElementById('go') && !document.getElementById('go').disabled, null, { timeout: 120000 }); } catch (e) { errs.push('TIMEOUT go'); }
await page.evaluate(() => document.getElementById('go').click());
await page.evaluate((hh) => { const r = document.getElementById('sunrange'); r.value = hh; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }, hour);
if (setup) { try { const res = await page.evaluate(setup); if (res !== undefined) console.log('SETUP', JSON.stringify(res)); } catch (e) { errs.push('SETUP ' + e.message); } }
await page.waitForTimeout(3500);
await page.screenshot({ path: out });
console.log(errs.join('\n') || 'no errors');
console.log('PERF', JSON.stringify(await page.evaluate(() => window.__perf && window.__perf())));
await browser.close();
