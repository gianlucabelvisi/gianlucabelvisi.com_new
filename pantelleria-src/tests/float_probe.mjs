import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html' + (process.argv[2] || ''));
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
console.log(JSON.stringify(await p.evaluate(() => { const P = window.__pan, R = P.roads2(); let best = null;
  for (const r of R) { const n = r.pts.length / 3; if (r.tier !== 0 || Math.abs(r.w - 2.5) > 0.1) continue; let near = false; for (let i = 0; i < n; i++) if (Math.hypot(r.pts[i * 3] - 4366, r.pts[i * 3 + 1] - 727) < 80) near = true; if (near) best = r; }
  if (!best) return 'not found'; const pr = P.roadProf(best), out = []; let s = 0, mx = 0, c = 0, edge = 0;
  for (let i = 0; i < best.pts.length / 3 - 1; i++) { const ax = best.pts[i * 3], ay = best.pts[i * 3 + 1], bx = best.pts[i * 3 + 3], by = best.pts[i * 3 + 4], L = Math.hypot(bx - ax, by - ay) || 1, hw = best.w / 2 + 0.6;
    for (let d = 0; d < L; d += 2) { const x = ax + (bx - ax) * d / L, y = ay + (by - ay) * d / L, z = P.roadZAt(best, pr.cum[i] + d, 0), g = P.groundTop(x, y), dz = z - g; s += dz; c++; mx = Math.max(mx, dz);
      for (const sg of [-1, 1]) edge = Math.max(edge, P.roadZAt(best, pr.cum[i] + d, sg) - P.groundTop(x - (by - ay) / L * hw * sg, y + (bx - ax) / L * hw * sg)); } }
  return { len: Math.round(pr.L), meanAboveGround: +(s / c).toFixed(2), maxAboveGround: +mx.toFixed(2), maxEdgeAboveVerge: +edge.toFixed(2) }; })));
await b.close();
