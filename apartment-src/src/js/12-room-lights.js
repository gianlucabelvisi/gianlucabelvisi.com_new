// ------------------------------------------------------------ room lights: entrance, bedroom (over the nightstands), værelse, bathroom
// All Philips Hue like the living room. Perf: the new fixtures don't each get a three.js light. A fixed pool of 4 point lights
// (always present, so the shader light count never changes) is handed every frame-or-so to the lit fixtures nearest you,
// preferring the room you're in; every fixture's own glow (emissive) is always right.
const FX = [];                                          // { id: LIGHTS id, pos: Vector3 (light source), room, power, dist }
const LPOOL = [];
for (let i = 0; i < 4; i++) { const L = new THREE.PointLight(0xffd6a8, 0, 4, 2); L.userData.pool = true; scene.add(L); LPOOL.push(L); }
let fxSig = '';
// light bouncing off walls and ceiling: a warm ambient fill that follows the lamps that are on in the room you're in (so faces
// turned away from every lamp aren't pitch black at night). Ambient lights add no shader cost.
const bounce = new THREE.AmbientLight(0xffd2a0, 0); scene.add(bounce);
const BOUNCE_W = { table: 0.5, tvstrip: 0.15, tvback: 0.15, kitchen: 0.5, books: 0.15, plant: 0.1, hall: 0.6, bedA: 0.45, bedB: 0.45, vaer: 0.7, bath: 0.8 };
function bounceTick(here) {
  let lv = 0; const c = new THREE.Color(0, 0, 0);
  for (const [id, L] of Object.entries(LIGHTS)) { if (!L.on || (L.room || 'living') !== here) continue; const w = (BOUNCE_W[id] ?? 0.2) * Math.pow(L.bri, 1.6); lv += w; c.add(lightRGB(L).multiplyScalar(w)); }
  bounce.intensity = Math.min(0.45, lv * 0.35) * (1 - 0.7 * (dayLevel ?? 0));
  if (lv > 0) bounce.color.copy(c.multiplyScalar(1 / lv));
}
function playerRoomId() { const [x, y] = toBl(player.pos); for (const r of PLAN.rooms) if (inPoly(x, y, r.poly)) return r.id; return null; }
function fxAssign(force) {
  const here = mode === 'walk' ? playerRoomId() : null, cam = mode === 'walk' ? player.pos : camera.position;
  bounceTick(here);
  const lit = FX.filter((f) => LIGHTS[f.id] && LIGHTS[f.id].on);
  const sig = here + '|' + lit.map((f) => f.id).join(',') + '|' + Math.round(cam.x * 2) + ',' + Math.round(cam.z * 2);
  if (!force && sig === fxSig) return; fxSig = sig;
  lit.sort((p, q) => ((p.room === here ? 0 : 6) + p.pos.distanceTo(cam)) - ((q.room === here ? 0 : 6) + q.pos.distanceTo(cam)));
  LPOOL.forEach((L, i) => {
    const f = lit[i];
    if (!f) { L.intensity = 0; return; }
    const Lt = LIGHTS[f.id], lv = Math.pow(Lt.bri, 1.6);
    L.position.copy(f.pos); L.color.copy(lightRGB(Lt)); L.intensity = f.power * lv; L.distance = f.dist;
  });
}
function fxGlow(mat, L, rgb, lv, k = 3) { if (!mat) return; mat.emissive.copy(rgb); mat.emissiveIntensity = k * lv; }
MATS.fxHall = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, emissive: 0xffd6a8, emissiveIntensity: 0, roughness: 0.4 });
MATS.fxBath = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, emissive: 0xffd6a8, emissiveIntensity: 0, roughness: 0.4 });
MATS.fxBedA = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, emissive: 0xffd6a8, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.94 });
MATS.fxBedB = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, emissive: 0xffd6a8, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.94 });
MATS.fxCove = new THREE.MeshStandardMaterial({ color: 0xf6f1e8, emissive: 0xffb070, emissiveIntensity: 0, roughness: 0.4 });
MATS.fxCoveHalo = new THREE.MeshBasicMaterial({ map: booksHaloTex, color: 0x000000, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const fxWhite = stdc({ color: 0xf2f2ef, roughness: 0.4 });
Object.assign(LIGHTS, {
  hall: { name: 'Entrance spots', room: 'hall', model: '3 × Philips Hue surface-mounted ceiling spots (White & Color Ambiance)', on: false, bri: 0.75, ct: 2900, mode: 'ct', color: '#ffd9a0',
    apply: (L, rgb, lv) => { fxGlow(MATS.fxHall, L, rgb, lv, 3.5); fxAssign(true); } },
  bedA: { name: 'Bedside · door', room: 'bed', model: 'Philips Hue E27 globe in an opal-glass pendant over the nightstand', on: false, bri: 0.55, ct: 2400, mode: 'ct', color: '#ffb36b',
    apply: (L, rgb, lv) => { fxGlow(MATS.fxBedA, L, rgb, lv, 1.6); fxAssign(true); } },
  bedB: { name: 'Bedside · window', room: 'bed', model: 'Philips Hue E27 globe in an opal-glass pendant over the nightstand', on: false, bri: 0.55, ct: 2400, mode: 'ct', color: '#ffb36b',
    apply: (L, rgb, lv) => { fxGlow(MATS.fxBedB, L, rgb, lv, 1.6); fxAssign(true); } },
  vaer: { name: 'Cove light', room: 'vaer', model: 'Philips Hue Lightstrip Plus in a slim profile high on the wall, washing the ceiling', on: false, bri: 0.7, ct: 2700, mode: 'ct', color: '#ff9a5a',
    apply: (L, rgb, lv) => { fxGlow(MATS.fxCove, L, rgb, lv, 1.8); MATS.fxCoveHalo.color.copy(rgb).multiplyScalar(0.16 * lv); fxAssign(true); } },
  bath: { name: 'Bathroom spots', room: 'bath', model: '2 × Philips Hue recessed spots (White Ambiance, IP44)', on: false, bri: 0.85, ct: 3500, mode: 'ct', color: '#ffe0b0',
    apply: (L, rgb, lv) => { fxGlow(MATS.fxBath, L, rgb, lv, 3.5); fxAssign(true); } },
});
function buildRoomFixtures() {
  const g = new THREE.Group(); scene.add(g); const CEIL = 2.6;
  // entrance: three small white cylinders on the ceiling along the hall, glowing lens underneath
  for (const [x, y] of [[6.1, 1.15], [6.1, 2.75], [5.75, 4.25]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 24), fxWhite); c.position.copy(b2t(x, y, CEIL - 0.05)); g.add(c);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), MATS.fxHall); lens.rotation.x = Math.PI / 2; lens.position.copy(b2t(x, y, CEIL - 0.101)); g.add(lens);
    FX.push({ id: 'hall', room: 'hall', pos: b2t(x, y, CEIL - 0.3), power: 1.3, dist: 4 });
  }
  // bathroom: two flush recessed spots
  for (const [x, y] of [[7.95, 2.2], [9.1, 2.05]]) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.004, 24), fxWhite); rim.position.copy(b2t(x, y, CEIL - 0.002)); g.add(rim);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 20), MATS.fxBath); lens.rotation.x = Math.PI / 2; lens.position.copy(b2t(x, y, CEIL - 0.005)); g.add(lens);
    FX.push({ id: 'bath', room: 'bath', pos: b2t(x, y, CEIL - 0.25), power: 1.8, dist: 3.5 });
  }
  // værelse: cove profile high on the wall to the living room (above the sofa bed), light washing up the ceiling
  { const P = curtainProbe(5.6, 6.75, 2.3, [-1, 0]); const wx = P ? toBl(P)[0] : 4.57, L = 2.3;
    const prof = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, L), fxWhite); prof.position.copy(b2t(wx + 0.015, 6.75, 2.4)); g.add(prof);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, L - 0.04), MATS.fxCove); led.position.copy(b2t(wx + 0.02, 6.75, 2.42)); g.add(led);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.9, L + 0.6), MATS.fxCoveHalo); halo.rotation.set(Math.PI / 2, 0, 0); halo.position.copy(b2t(wx + 0.35, 6.75, CEIL - 0.003)); halo.renderOrder = 2; g.add(halo);
    FX.push({ id: 'vaer', room: 'vaer', pos: b2t(wx + 0.9, 6.75, 2.15), power: 1.9, dist: 5 }); }
  for (const o of g.children) if (o.material === fxWhite) o.castShadow = true;
}
// bedroom pendants over the two nightstands (placed by buildBed through placeBedPendants)
const bedPend = { group: null };
function placeBedPendants(spots) {
  if (bedPend.group) { scene.remove(bedPend.group); bedPend.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  const g = new THREE.Group(); scene.add(g); bedPend.group = g; const CEIL = 2.6, cordM = stdc({ color: 0xf2f2f0, roughness: 0.5 });
  for (let i = FX.length - 1; i >= 0; i--) if (FX[i].room === 'bed') FX.splice(i, 1);
  spots.forEach((P, k) => {
    const id = k === 0 ? 'bedA' : 'bedB', yC = 1.32, mat = k === 0 ? MATS.fxBedA : MATS.fxBedB;
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), fxWhite); rose.position.copy(P).setY(CEIL - 0.01); g.add(rose);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, CEIL - yC - 0.11, 6), cordM); cord.position.copy(P).setY((CEIL + yC + 0.11) / 2); g.add(cord);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.03, 16), stdc({ color: 0xb08d57, roughness: 0.35, metalness: 0.7 })); cap.position.copy(P).setY(yC + 0.1); g.add(cap);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 18), mat); globe.position.copy(P).setY(yC); g.add(globe);
    FX.push({ id, room: 'bed', pos: P.clone().setY(yC - 0.02), power: 2.4, dist: 3.5 });
  });
  fxAssign(true);
}
// wall switches: one by each room's door, opening that room's Hue panel (like the kitchen/living one)
const roomLightMovers = {
  hall: { name: 'Lights · entrance', title: () => 'Lights · entrance', lights: ['hall'], info: () => 'Philips Hue ceiling spots along the hall. Comes on by itself at dusk.' },
  bed: { name: 'Lights · bedroom', title: () => 'Lights · bedroom', lights: ['bedA', 'bedB'], info: () => 'No ceiling light here: two opal pendants over the nightstands, 2400 K for reading.' },
  vaer: { name: 'Lights · værelse', title: () => 'Lights · værelse', lights: ['vaer'], info: () => 'A hidden Lightstrip high on the wall washes the ceiling: soft, no fixture in sight.' },
  bath: { name: 'Lights · bathroom', title: () => 'Lights · bathroom', lights: ['bath'], info: () => 'Two flush recessed spots.' },
};
function addWallSwitch(bx, by, dir, mover, label) {
  const P = curtainProbe(bx, by, 1.05, dir); if (!P) return;
  const nIn = b2t(-dir[0], -dir[1]).normalize(), Q = P.clone().addScaledVector(nIn, 0.006);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.01), stdc({ color: 0xf4f4f2, roughness: 0.35 })); plate.position.copy(Q); plate.lookAt(Q.clone().add(nIn)); scene.add(plate);
  const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.008), stdc({ color: 0xfbfbfa, roughness: 0.3 })); rocker.position.copy(Q).addScaledVector(nIn, 0.008); rocker.lookAt(Q.clone().add(nIn)); scene.add(rocker);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(Q).addScaledVector(nIn, 0.02); hit.lookAt(Q.clone().add(nIn)); scene.add(hit);
  mover.anchor = () => Q.clone().addScaledVector(nIn, 0.25).setY(1.35);
  const door = { kind: 'swap', label: 'Light switch', name: label, parts: [hit], center: Q.clone().addScaledVector(nIn, 0.01),
    swap: () => selectFurniture(selected === mover ? null : mover), prompt: () => (selected === mover ? 'Close the light panel' : `Lights · ${label}`) };
  hit.userData.door = door; collidables.push(hit); doors.push(door);
  SWITCH_SPOTS.push({ label: `Light switch, ${label}`, p: toBl(Q), z: 1.05, n: [-dir[0], -dir[1]], kind: 'switch' });
}
function buildRoomSwitches() {
  addWallSwitch(6.75, 0.9, [0, -1], roomLightMovers.hall, 'entrance');       // on the entrance wall, beside the front door
  addWallSwitch(7.75, 4.5, [-1, 0], roomLightMovers.bed, 'bedroom');         // inside the bedroom, by the door's latch side
  addWallSwitch(6.0, 4.95, [0, -1], roomLightMovers.vaer, 'værelse');         // inside værelse, beside its door
  addWallSwitch(7.55, 2.4, [-1, 0], roomLightMovers.bath, 'bathroom');        // inside the bathroom, beside its door
}
// automation: every Hue light comes on by itself when it gets dark and goes off at 01:00 (and again in daylight); manual changes
// in between stay until the next switch-over. Toggle per house in any light panel ("Auto at dusk").
const autoLightsCfg = { on: true, last: null };
try { if (localStorage.getItem('aptAutoLights') === '0') autoLightsCfg.on = false; } catch (_) { /* private mode */ }
function autoLightTick(h, dusk, force) {
  const want = dusk < 0.3 && !(h >= 1 && h < 6.5);
  if (!force && want === autoLightsCfg.last) return; autoLightsCfg.last = want;
  if (!autoLightsCfg.on) return;
  for (const L of Object.values(LIGHTS)) L.on = want;
  applyLights(); if (lightPanelSync) lightPanelSync();
}
function setAutoLights(on) { autoLightsCfg.on = on; try { localStorage.setItem('aptAutoLights', on ? '1' : '0'); } catch (_) { /* ignore */ }
  if (on) autoLightTick(clockHour, dayLevel, true); showToast(on ? 'Lights: on by themselves at dusk, off at 01:00' : 'Automatic lights off'); }

