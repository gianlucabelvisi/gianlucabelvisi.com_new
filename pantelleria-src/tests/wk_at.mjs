// node wk_at.mjs '[{"x":..,"y":..,"yaw":..,"out":"name.png"}]' : walk-mode eye-level shots
import { chromium } from 'playwright';
const S = '/tmp/claude-0/-home-claude/a36f7772-a762-51a3-9f5d-ca4a82d08706/scratchpad/';
const V = JSON.parse(process.argv[2]);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 560 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate((v) => window.__pan.setView({ x: v.x, y: v.y, dist: 80, heading: 0, tilt: 55 }), V[0]); await p.waitForTimeout(4000);
await p.evaluate(() => window.__pan.setMode('walk')); await p.waitForTimeout(8000);
for (const v of V) {
  await p.evaluate((v) => { const W = window.__pan.WALK; W.x = v.x; W.y = v.y; W.yaw = v.yaw; if (v.pitch !== undefined) W.pitch = v.pitch; window.__pan.vSim(2, []); }, v);
  await p.waitForTimeout(v.wait || 22000); await p.screenshot({ path: S + v.out });
  console.log(v.out, JSON.stringify(await p.evaluate(() => { const W = window.__pan.WALK; return [W.x, W.y, W.z].map((q) => +q.toFixed(1)); })));
}
await b.close();
