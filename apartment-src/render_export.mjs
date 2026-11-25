// Export the furnished walkthrough scene for Blender stills (2026-11-24).
// Serve web/ on :8765, then:  node render_export.mjs [outDir] [dayHour] [nightHour]
// Writes scene_day.glb, scene_night.glb (all Hue lights on: glowing shades, lit windows) and lights.json
// (sun direction for both times + every lit light / Hue fixture at night, in Blender coordinates).
import { createRequire } from 'module'; import fs from 'fs';
const { chromium } = createRequire('/home/claude/x.js')('playwright');
const out = process.argv[2] || 'renders/export', dayH = +(process.argv[3] || 10.5), nightH = +(process.argv[4] || 21);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
await p.goto('http://localhost:8765/test.html');   // full-size canvas textures (the oak floor at 2048)
await p.waitForFunction(() => document.getElementById('intro').hidden, null, { timeout: 240000 });
await p.waitForTimeout(1500);

async function exportAt(hour, night, file) {
  const res = await p.evaluate(async ({ hour, night }) => {
    const A = window.__apt;
    const r = document.getElementById('sunrange'); r.value = hour; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change'));
    A.setMode('walk'); A.player.pos.copy(A.b2t(2.5, 4.5, 1.62)); A.setFeet(0);
    A.setAllLights(!!night);
    await new Promise((res) => setTimeout(res, 2500));
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    for (const [k, m] of Object.entries(A.MATS || {})) if (m && !m.name) m.name = k;
    const hidden = [], hide = (o) => { if (o.visible) { o.visible = false; hidden.push(o); } };
    const sunL = []; let lights = [];
    const toBl = (v) => [+v.x.toFixed(4), +(-v.z).toFixed(4), +v.y.toFixed(4)];
    A.scene.updateMatrixWorld(true);
    A.scene.traverse((o) => {
      if (o.isLight) {
        if (o.isDirectionalLight && o.castShadow) { const d = o.position.clone().sub(o.target.position).normalize(); sunL.push({ dir: toBl(d), color: o.color.getHex(), intensity: o.intensity }); }
        const pool = o.userData && o.userData.pool;
        if (night && !pool && o.visible !== false && o.intensity > 0 && (o.isPointLight || o.isSpotLight || o.isRectAreaLight)) {
          const e = o.matrixWorld.elements, pos = { x: e[12], y: e[13], z: e[14] };
          const L = { type: o.isSpotLight ? 'spot' : o.isRectAreaLight ? 'area' : 'point', pos: [+pos.x.toFixed(4), +(-pos.z).toFixed(4), +pos.y.toFixed(4)], color: o.color.getHex(), intensity: o.intensity, distance: o.distance || 0 };
          if (o.isSpotLight) { const t = o.target.matrixWorld.elements; L.dir = [t[12] - pos.x, -(t[14] - pos.z), t[13] - pos.y]; L.angle = o.angle; L.penumbra = o.penumbra; }
          if (o.isRectAreaLight) { L.w = o.width; L.h = o.height; const q = o.getWorldDirection(o.position.clone()); L.dir = [q.x, -q.z, q.y]; }
          lights.push(L);
        }
        hide(o); return;
      }
      if (o.isSprite || o.isPoints || o.isLine || o.isLineSegments) { hide(o); return; }
      if (o.isMesh) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (ms.some((m) => !m || m.visible === false || m.isShaderMaterial || m.isRawShaderMaterial || m.blending === 2 /* additive halos */ || (m.isMeshBasicMaterial && m.transparent && m.opacity < 0.05))) hide(o);
      }
    });
    if (night) for (const f of A.FX) {
      const L = A.LIGHTS[f.id]; if (!L || !L.on) continue;
      lights.push({ type: 'fx', id: f.id, pos: toBl(f.pos), ct: L.mode === 'ct' ? L.ct : null, hex: L.mode === 'ct' ? null : L.color, bri: L.bri, power: f.power, distance: f.dist, room: f.room });
    }
    const living = night ? Object.entries(A.LIGHTS).filter(([, L]) => L.on).map(([id, L]) => ({ id, room: L.room || 'living', bri: L.bri, ct: L.mode === 'ct' ? L.ct : null, hex: L.mode === 'ct' ? null : L.color, model: L.model })) : [];
    const glb = await new GLTFExporter().parseAsync(A.scene, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
    for (const o of hidden) o.visible = true;
    const bytes = new Uint8Array(glb); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { b64: btoa(s), sun: sunL, lights, living };
  }, { hour, night });
  fs.writeFileSync(`${out}/${file}`, Buffer.from(res.b64, 'base64'));
  console.log(file, (res.b64.length * 0.75 / 1e6).toFixed(1), 'MB', 'lights', res.lights.length);
  return res;
}
const d = await exportAt(dayH, false, 'scene_day.glb');
const n = await exportAt(nightH, true, 'scene_night.glb');
fs.writeFileSync(`${out}/lights.json`, JSON.stringify({ dayHour: dayH, nightHour: nightH, sunDay: d.sun, sunNight: n.sun, lights: n.lights, hue: n.living }, null, 1));
await b.close();
