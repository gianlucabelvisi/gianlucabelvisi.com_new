import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 480, height: 300 } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)));
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
await p.evaluate(() => window.__pan.setView({ x: -3900, y: 5460, dist: 200, heading: 60, tilt: 50 })); await p.waitForTimeout(2500);
await p.evaluate(() => { const P = window.__pan; P.setMode('car'); P.makeCar('rally', true); P.rallyStart(); P.RALLY.state = 'idle'; });
await p.waitForTimeout(3000);
await p.evaluate(() => { const P = window.__pan.PROF; P.sum = {}; P.max = {}; P.n = 0; });
// drive along the stage by teleporting gate to gate (the software renderer is too slow to drive in real time): every
// frame the car moves on, so tiles, rings and road profiles get built as they would while driving
const res = await p.evaluate(async () => {
  const P = window.__pan, c = P.VEH.car, G = [P.RALLY.start, ...P.RALLY.gates]; const log = [];
  for (let k = 0; k < G.length - 1; k++) for (let f = 0; f < 1; f += 0.34) {
    c.x = G[k].x + (G[k + 1].x - G[k].x) * f; c.y = G[k].y + (G[k + 1].y - G[k].y) * f; c.h = c.phi = G[k].a; c.v = 0; c.z = undefined;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  return { n: P.PROF.n, avg: Object.fromEntries(Object.entries(P.PROF.sum).map(([k, v]) => [k, +(v / P.PROF.n).toFixed(2)])), max: Object.fromEntries(Object.entries(P.PROF.max).map(([k, v]) => [k, Math.round(v)])), dyn: P.PROF.dyn };
});
console.log(JSON.stringify(res));
await b.close();
