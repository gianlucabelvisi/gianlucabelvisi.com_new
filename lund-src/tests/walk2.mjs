import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto('http://localhost:8765/test.html?lite', { waitUntil: 'load' });
await page.waitForFunction(() => window.__lund, null, { timeout: 120000 });
const R = await page.evaluate(() => {
  const L = window.__lund, T = L.THREE;
  L.placeAt(540, 1111, 0.9);
  const t = L.P(546, 800); const out = [];
  for (let i = 0; i < 60; i++) {
    const dx = t[0] - L.player.pos.x, dz = -t[1] - L.player.pos.z, d = Math.hypot(dx, dz);
    const dir = new T.Vector3(dx / d, 0, dz / d);
    const h = L.blocked(L.player.pos, dir, 0.1);
    if (h) { out.push(['hit', L.toPlan(L.player.pos.x, -L.player.pos.z).map(Math.round), h.distance.toFixed(3), h.point.y.toFixed(2), L.toPlan(h.point.x, -h.point.z).map(Math.round), h.object.geometry.attributes.position.count, h.object.material.color && h.object.material.color.getHexString(), h.face && h.face.normal.toArray().map(v => v.toFixed(2))]); break; }
    if (!L.tryMove(dx / d * 0.1, dz / d * 0.1)) { out.push('tm false'); break; }
  }
  return out;
});
console.log(JSON.stringify(R));
await browser.close();
