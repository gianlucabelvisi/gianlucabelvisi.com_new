import { chromium, devices } from 'playwright';
const S = '/tmp/claude-0/-home-claude/a36f7772-a762-51a3-9f5d-ca4a82d08706/scratchpad/', tag = process.argv[2] || 'a';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, vp] of [['p', { width: 390, height: 844 }], ['l', { width: 844, height: 390 }]]) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: vp, screen: vp, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.addInitScript(() => { try { localStorage.setItem('pan.seen', '1'); } catch (e) {} });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await p.evaluate(() => window.__pan.setView({ x: -4011, y: 5156, dist: 300, heading: 30, tilt: 50 })); await p.waitForTimeout(6000);
  await p.screenshot({ path: S + `ph_${tag}_${name}_map.png` });
  for (const m of ['car', 'plane', 'heli']) { await p.evaluate((m) => { const P = window.__pan; P.setMode(m); if (m === 'car') P.setMode(m); }, m); await p.waitForTimeout(5000); await p.screenshot({ path: S + `ph_${tag}_${name}_${m}.png` }); if (m === 'car') { await p.evaluate(() => document.querySelector('#hudMore').click()); await p.waitForTimeout(600); await p.screenshot({ path: S + `ph_${tag}_${name}_carmore.png` }); await p.evaluate(() => document.querySelector('#hudMore').click()); } }
  console.log(name, 'tilt', JSON.stringify(await p.evaluate(async () => { const P = window.__pan; P.setMode('car'); await P.setTilt(true); const out = [];
    for (const [b, g] of [[0, 0], [0, 20], [0, -20], [45, 0], [45, 15], [60, 0], [30, 0]]) { for (let i = 0; i < 30; i++) P.tiltEvent({ beta: b, gamma: g }); out.push([b, g, +P.TILT.steer.toFixed(2), +P.TILT.pitch.toFixed(2)]); } return out; })));
  await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('#hudMore').click()); await p.waitForTimeout(500); await p.screenshot({ path: S + `ph_${tag}_${name}_tilt.png` }); await p.evaluate(() => { document.querySelector('#hudMore').click(); return window.__pan.setTilt(false); });
  await p.evaluate(() => window.__pan.setMode('map')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const e = document.querySelector('#qMenu'); if (e) e.click(); }); await p.waitForTimeout(1200); await p.screenshot({ path: S + `ph_${tag}_${name}_menu.png` });
  await ctx.close();
}
await b.close();
