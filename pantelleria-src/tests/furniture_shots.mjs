import { chromium } from 'playwright';
const S = '/tmp/claude-0/-home-claude/a36f7772-a762-51a3-9f5d-ca4a82d08706/scratchpad/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(() => window.__pan.setView({ x: -4040, y: 5122, dist: 120, heading: 200, tilt: 55 })); await p.waitForTimeout(3000);
await p.evaluate(() => window.__pan.setMode('walk'));
for (const [ci, name] of [[1, "fs1.png"]]) {
  const r = await p.evaluate((ci) => { const P = window.__pan, im = P.TOWN.furn.children[ci], e = im.instanceMatrix.array; let best = null, bd = 1e9;
    for (let k = 0; k < im.count; k++) { const x = e[k * 16 + 12], y = -e[k * 16 + 14], d = Math.hypot(x + 4040, y - 5122) + (ci ? 0 : Math.abs(Math.hypot(x + 4040, y - 5122) - 150)); if (d < bd) { bd = d; best = [x, y]; } }
    const q = P.nearestRoad ? null : null; const W = P.WALK; const dx = best[0] - W.x, dy = best[1] - W.y;
    // stand 6 m away on the street side: step back along the direction to the map centre of the street
    W.x = best[0] + 2.6; W.y = best[1] + 1.8; W.yaw = Math.atan2(best[1] - W.y, best[0] - W.x); W.pitch = -0.12; W.z = 0; P.vSim(0.5, []); return best; }, ci);
  console.log(name, r); await p.waitForTimeout(34000); await p.screenshot({ path: S + name });
}
await b.close();
