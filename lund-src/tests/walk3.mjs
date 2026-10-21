import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_FAILED')) errs.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:8765/test.html?lite', { waitUntil: 'load' });
try { await page.waitForFunction(() => window.__lund, null, { timeout: 120000 }); } catch (e) { console.log(errs.join('\n')); process.exit(1); }
const res = await page.evaluate(() => {
  const L = window.__lund, out = [];
  const W = (x, y, label, steps = 600) => {
    for (let i = 0; i < steps; i++) {
      const dx = x - L.player.pos.x, dz = -y - L.player.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.12) break;
      const s = Math.min(0.1, d); if (!L.tryMove(dx / d * s, dz / d * s)) { out.push(`${label}: BLOCKED at world ${L.player.pos.x.toFixed(1)},${(-L.player.pos.z).toFixed(1)} plan ${L.toPlan(L.player.pos.x, -L.player.pos.z).map(Math.round)} fy ${L.player.fy.toFixed(2)}`); return false; }
    }
    out.push(`${label}: world ${L.player.pos.x.toFixed(1)},${(-L.player.pos.z).toFixed(1)} plan ${L.toPlan(L.player.pos.x, -L.player.pos.z).map(Math.round)} fy ${L.player.fy.toFixed(2)} room ${L.room()}`); return true;
  };
  const go = (px, py, label) => { const t = L.P(px, py); return W(t[0], t[1], label); };
  const open = (d) => { const it = L.DOORS[d]; it.target = 1; it.t = 1; it.apply(1); L.scene.updateMatrixWorld(true); };
  const G = L.GATEWAY, sc = (G.s0 + G.s1) / 2;
  out.push('spawn ' + L.player.pos.x.toFixed(1) + ',' + (-L.player.pos.z).toFixed(1));
  open('street');
  let q = G.at(sc, -1); W(q[0], q[1], 'through main door');
  q = G.at(sc, -G.L - 1.2); W(q[0], q[1], 'out of gateway');
  W(12, -6, 'yard south'); W(6.5, 5, 'along west wing'); W(6, 13.5, 'near corner');
  q = L.P(-535, 1800); W(q[0], q[1], 'in front of red door');
  open('yard'); go(-535, 1560, 'inside stairwell'); go(200, 1540, 'corridor end'); go(200, 1360, 'at our door');
  open('front'); go(330, 1360, 'entrance'); go(546, 1100, 'hall'); go(546, 800, 'living');
  return out;
});
console.log(res.join('\n')); console.log(errs.join('\n'));
await browser.close();
