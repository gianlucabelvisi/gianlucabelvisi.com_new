// Smoke test for the walkthrough (2026-11-18). Serve the web dir on :8765 (python3 -m http.server 8765) and run:
//   node smoke.mjs [test.html]          (needs playwright: npm i playwright && npx playwright install chromium)
// It loads the page, waits for the model, then checks that every furniture piece built, that the info buttons, light switches
// and movers exist, opens each mover's panel once, steps into walk mode and back, and prints any page error. Exit code 1 on failure.
import { chromium } from 'playwright';
const page = process.argv[2] || 'test.html';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
const t0 = Date.now();
await p.goto(`http://localhost:8765/${page}?lite`);
await p.waitForFunction(() => document.getElementById('intro').hidden, null, { timeout: 240000 });
const ready = Date.now() - t0;
const r = await p.evaluate(async () => {
  const A = window.__apt, out = { missing: [], panels: 0, panelErrors: [] };
  const want = { sofa: A.liv.sofa && A.liv.sofa.group, tv: A.liv.media && A.liv.media.group, dining: A.dining.group, desk: A.desk && A.desk.group, skaenk: A.skaenk.group,
    coffee: A.ctab.group, rug: A.rug.on ? A.rug.group : true, books: A.books.hidden ? true : A.books.group, lounge: A.petra.group, closets: A.furn.runs && A.furn.runs.length };
  for (const [k, v] of Object.entries(want)) if (!v) out.missing.push(k);
  out.switches = A.doors.filter((d) => d.label === 'Light switch').length;
  out.furniture = A.doors.filter((d) => d.kind === 'swap').length;
  for (const d of A.doors.filter((d) => d.kind === 'swap')) { try { d.swap(); d.swap(); out.panels++; } catch (e) { out.panelErrors.push(`${d.label}: ${e.message}`); } }
  A.selectFurniture(null);
  A.setMode('walk'); await new Promise((res) => setTimeout(res, 300)); A.setMode('over');
  out.shop = A.shopLines().length; out.programs = A.renderer.info.programs.length;
  return out;
});
await b.close();
console.log(JSON.stringify({ readyMs: ready, ...r, errors }, null, 1));
const bad = errors.length || r.missing.length || r.panelErrors.length || r.switches < 5;
console.log(bad ? 'SMOKE: FAIL' : 'SMOKE: OK');
process.exit(bad ? 1 : 0);
