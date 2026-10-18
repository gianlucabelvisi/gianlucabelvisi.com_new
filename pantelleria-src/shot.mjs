// node shot.mjs out.png '{"x":0,"y":0,"dist":20000,"heading":0,"tilt":45}' [hour] [style] [w] [h]
import { chromium } from 'playwright';
const [,, out, viewJson, hour, style, W, H] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(W || 1280), height: +(H || 800) } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html' + (process.env.Q || ''));
await p.waitForFunction(() => window.__ready || document.getElementById('loadMsg')?.textContent.startsWith('Could'), null, { timeout: 180000 });
await p.evaluate(([v, h, s]) => { const P = window.__pan; if (v) P.setView(JSON.parse(v)); if (h) P.updateSun(+h); if (s) P.setStyle(s === 'cel'); }, [viewJson, hour, style]);
await p.waitForTimeout(+(process.env.WAIT || 6000));
await p.screenshot({ path: out });
console.log(JSON.stringify(await p.evaluate(() => window.__pan.perf())));
await b.close();
