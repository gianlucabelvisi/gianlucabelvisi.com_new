// Road surface guard (2026-11-11): walks every drivable road in the real viewer and fails when the ground pokes through
// the tarmac (> 0.25 m) or the road has a kink (> 0.5 m against its 10 m mean) in a 100 m cell that was clean in the
// baseline (data/road_check_baseline.json, keys poke / kink).  node tests/road_check.mjs [--accept]
import { chromium } from 'playwright';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srv = spawn('python3', ['-m', 'http.server', '8767'], { cwd: path.join(ROOT, 'web'), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1200));
let code = 0;
try {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.goto('http://localhost:8767/test.html');
  await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  const res = await p.evaluate(() => {
    const P = window.__pan, R = P.roads2(), out = { poke: [], kink: [] };
    for (const r of R) {
      if (r.tier > 1 || r.w < 2) continue;
      const pr = P.roadProf(r), n = r.pts.length / 3, hw = r.w / 2, prof = [];
      for (let i = 0; i < n - 1; i++) {
        const ax = r.pts[i * 3], ay = r.pts[i * 3 + 1], bx = r.pts[i * 3 + 3], by = r.pts[i * 3 + 4], L = Math.hypot(bx - ax, by - ay); if (L < 0.01) continue;
        const dx = (bx - ax) / L, dy = (by - ay) / L;
        for (let s = 0; s < L; s += 1) {
          const x = ax + dx * s, y = ay + dy * s, sa = pr.cum[i] + s; let poke = 0;
          for (const f of [-0.85, -0.5, 0, 0.5, 0.85]) poke = Math.max(poke, P.groundTop(x - dy * hw * f, y + dx * hw * f) - P.roadZAt(r, sa, f * hw / (hw + 0.15)));
          prof.push([x, y, P.roadZAt(r, sa, 0), poke]);
        }
      }
      for (let k = 0; k < prof.length; k++) {
        if (prof[k][3] > 0.25) out.poke.push([prof[k][0], prof[k][1]]);
        let s = 0, c = 0; for (let j = Math.max(0, k - 5); j <= Math.min(prof.length - 1, k + 5); j++) { s += prof[j][2]; c++; }
        if (Math.abs(prof[k][2] - s / c) > 0.5 && k > 5 && k < prof.length - 6) out.kink.push([prof[k][0], prof[k][1]]);
      }
    }
    return out;
  });
  await b.close();
  const BF = path.join(ROOT, 'data/road_check_baseline.json'), base = fs.existsSync(BF) ? JSON.parse(fs.readFileSync(BF)) : {};
  const accept = process.argv.includes('--accept'); let bad = false;
  for (const k of ['poke', 'kink']) {
    const cells = [...new Set(res[k].map(([x, y]) => Math.floor(x / 100) * 100 + ',' + Math.floor(y / 100) * 100))].sort();
    const fresh = cells.filter((c) => !(base[k] || []).includes(c));
    console.log(`road surface · ${k.padEnd(5)} ${String(res[k].length).padStart(5)} points in ${String(cells.length).padStart(3)} cells (${fresh.length} new)`);
    for (const c of fresh.slice(0, 8)) { const [x, y] = c.split(',').map(Number); console.log(`    new at x ${x + 50} y ${y + 50}`); }
    if (fresh.length && base[k] && !accept) bad = true;
    if (accept || !base[k]) base[k] = cells;
  }
  if (accept || !fs.existsSync(BF)) console.log('road surface · baseline saved');
  fs.writeFileSync(BF, JSON.stringify(base));
  if (bad) { console.log('ROAD SURFACE CHECK FAILED: the ground or a kink newly affects a road (see above). Fix it, or accept with: node tests/road_check.mjs --accept'); code = 1; }
  else console.log('road surface · OK (nothing new)');
} catch (e) { console.log('road surface check could not run:', e.message); code = 2; }
srv.kill(); process.exit(code);
