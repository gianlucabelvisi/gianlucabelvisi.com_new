import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:8765/test.html?lite', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lund, null, { timeout: 120000 });
const res = await page.evaluate(() => {
  const L = window.__lund, out = [];
  const go = (px, py, label, steps = 400) => {
    const t = L.P(px, py);
    for (let i = 0; i < steps; i++) {
      const dx = t[0] - L.player.pos.x, dz = -t[1] - L.player.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.12) break;
      const s = Math.min(0.1, d); if (!L.tryMove(dx / d * s, dz / d * s)) { out.push(`${label}: BLOCKED at plan ${L.toPlan(L.player.pos.x, -L.player.pos.z).map(Math.round)} fy ${L.player.fy.toFixed(2)}`); return false; }
    }
    out.push(`${label}: plan ${L.toPlan(L.player.pos.x, -L.player.pos.z).map(Math.round)} fy ${L.player.fy.toFixed(2)}`); return true;
  };
  const open = (d) => { const it = L.DOORS[d]; it.target = 1; it.t = 1; it.apply(1); L.scene.updateMatrixWorld(true); };
  go(-120, -100, 'to street door (closed)');
  open('street');
  go(-120, 40, 'inside door'); go(-120, 400, 'up the steps'); go(-120, 900, 'stair hall'); go(150, 1360, 'at our door (closed)');
  open('front'); go(330, 1360, 'entrance'); go(546, 1100, 'hall'); go(546, 800, 'into living'); go(900, 450, 'living middle');
  go(600, 620, 'living by tv'); go(300, 630, 'kitchen'); go(240, 420, 'kitchen north'); go(360, 340, 'dining edge'); go(330, 420, 'kitchen'); go(330, 630, 'kitchen mid'); go(600, 620, 'living'); go(600, 800, 'living south'); go(546, 900, 'hall mouth');
  open('bed'); go(546, 1050, 'hall'); go(546, 1340, 'back to entrance'); go(800, 1340, 'bedroom'); go(900, 1300, 'bed foot'); go(546, 1340, 'out of bedroom');
  open('bath'); go(546, 1340, 'entr'); go(546, 1050, 'hall again'); go(320, 1050, 'bathroom'); go(546, 1050, 'out'); go(546, 1340, 'entrance'); go(150, 1350, 'stairwell'); go(150, 1450, 'stair s'); go(-200, 1590, 'stair mid'); go(-535, 1590, 'by stairs'); go(-535, 1640, 'to courtyard door'); open('yard'); go(-535, 1800, 'down steps'); go(-535, 2300, 'courtyard');
  return out;
});
console.log(res.join('\n')); console.log(errs.join('\n'));
await browser.close();
