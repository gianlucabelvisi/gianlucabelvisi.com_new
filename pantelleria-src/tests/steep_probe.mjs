// drawn-road steepness: every drivable road (tier <= 1), grade of the drawn surface over 8 m
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html');
await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
const res = await p.evaluate((LIM) => {
  const P = window.__pan, R = P.roads2(), out = []; let total = 0;
  for (let ri = 0; ri < R.length; ri++) {
    const r = R[ri]; if (r.tier > 1 || r.w < 2) continue;
    const pr = P.roadProf(r), L = pr.L; total += L;
    let run = null;
    for (let s = 0; s + 8 <= L; s += 2) {
      const g = Math.abs(P.roadZAt(r, s + 8, 0) - P.roadZAt(r, s, 0)) / 8;
      if (g > LIM) { if (!run) run = { s0: s, g: 0 }; run.g = Math.max(run.g, g); run.s1 = s + 8; }
      else if (run) { out.push([ri, run.s0, run.s1, +run.g.toFixed(2)]); run = null; }
    }
    if (run) out.push([ri, run.s0, run.s1, +run.g.toFixed(2)]);
  }
  // locate
  return { total: Math.round(total), runs: out.map(([ri, s0, s1, g]) => { const r = R[ri], pr = P.roadProf(r); let i = 0; const sm = (s0 + s1) / 2; while (i < r.pts.length / 3 - 2 && pr.cum[i + 1] < sm) i++; return [Math.round(r.pts[i * 3]), Math.round(r.pts[i * 3 + 1]), Math.round(s1 - s0), g, r.tier, r.w]; }) };
}, +(process.env.LIM || 0.3));
await b.close();
fs.writeFileSync(process.env.OUT || '/tmp/claude-0/-home-claude/a36f7772-a762-51a3-9f5d-ca4a82d08706/scratchpad/steep.json', JSON.stringify(res));
const len = res.runs.reduce((a, r) => a + r[2], 0);
console.log(`roads ${(res.total / 1000).toFixed(0)} km · steeper than ${Math.round((+(process.env.LIM || 0.3)) * 100)} %: ${res.runs.length} stretches, ${len} m · worst ${Math.max(0, ...res.runs.map((r) => r[3])) * 100 | 0} %`);
