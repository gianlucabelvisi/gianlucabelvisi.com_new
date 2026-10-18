import { chromium } from 'playwright';
const views = JSON.parse(process.argv[2]); const W = +(process.argv[3] || 1000), H = +(process.argv[4] || 620);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html' + (process.env.Q || ''));
await p.waitForFunction(() => window.__ready || document.getElementById('loadMsg')?.textContent.startsWith('Could'), null, { timeout: 180000 });
for (const v of views) {
  await p.evaluate((v) => { const P = window.__pan; if (v.ll) { const [x, y] = P.fromLatLon(v.ll[0], v.ll[1]); v.x = x; v.y = y; } P.setView(v); P.updateSun(v.hour ?? 17); P.setStyle(v.style !== 'std'); if (v.js) eval(v.js); }, v);
  await p.waitForTimeout(v.wait || 5000);
  await p.screenshot({ path: v.out });
  console.log(v.out, JSON.stringify(await p.evaluate(() => window.__pan.perf())));
}
await b.close();
