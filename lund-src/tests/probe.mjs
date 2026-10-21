import { chromium } from 'playwright';
const [,, expr] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'log') errs.push(m.type() + ' ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:8765/test.html?lite', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lund, null, { timeout: 120000 });
try { console.log(JSON.stringify(await page.evaluate(expr), null, 0)); } catch (e) { console.log('ERR', e.message); }
console.log(errs.filter((e) => !e.includes('ERR_FAILED')).join('\n'));
await browser.close();
