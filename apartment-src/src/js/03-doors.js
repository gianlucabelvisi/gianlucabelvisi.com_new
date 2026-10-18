// ------------------------------------------------------------ interactive doors, fridge and sliding balcony door
const doors = [];           // everything you can open: {kind:'hinge'|'slide', ...}
function dirAngle(v) { const t = b2t(v[0], v[1]); return Math.atan2(-t.z, t.x); }
function buildLeaf(d, pivot) {
  // returns the meshes of one opening leaf, laid out along +x from the hinge (local frame of the pivot)
  const parts = [];
  const add = (geo, mat, x, y, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = mat !== MATS.glass; m.receiveShadow = true; pivot.add(m); parts.push(m); return m; };
  if (d.shape === 'sash') {                       // window leaf: frame + glass
    const f = d.frameMat ? 0.09 : 0.05, w = d.len, h = d.h, y0 = d.z0, FM = d.frameMat || MATS.frame;
    add(new THREE.BoxGeometry(f, h, f), FM, f / 2, y0 + h / 2);
    add(new THREE.BoxGeometry(f, h, f), FM, w - f / 2, y0 + h / 2);
    add(new THREE.BoxGeometry(w, f, f), FM, w / 2, y0 + f / 2);
    add(new THREE.BoxGeometry(w, f, f), FM, w / 2, y0 + h - f / 2);
    add(new THREE.BoxGeometry(w - 2 * f, h - 2 * f, 0.012), MATS.glass, w / 2, y0 + h / 2).renderOrder = 2;
    add(new THREE.BoxGeometry(0.02, 0.12, 0.05), MATS.steel, w - 0.03, y0 + h * 0.48, 0.04);
  } else if (d.shape === 'round') {               // washing machine / dryer porthole
    const r = d.len / 2;
    const ring = add(new THREE.CylinderGeometry(r, r, d.thick, 40), MATS.chrome, r, d.z0 + r);
    ring.rotation.x = Math.PI / 2;
    const glass = add(new THREE.CylinderGeometry(r * 0.8, r * 0.8, d.thick + 0.008, 40), MATS.portholeglass, r, d.z0 + r);
    glass.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.04, 0.08, 0.03), MATS.chrome, d.len - 0.02, d.z0 + r, 0.03);
  } else if (d.shape === 'lid') {                 // toilet lid: an ellipse lying flat, hinged at the back
    const lid = add(new THREE.CylinderGeometry(1, 1, d.thick, 32), MATS.porcelain, 0, d.thick / 2, d.len / 2);
    lid.scale.set(d.w / 2, 1, d.len / 2);
  } else if (d.shape === 'closet') {             // wardrobe door: flat panel + slim vertical bar handle on both faces
    add(new THREE.BoxGeometry(d.len, d.h, d.thick), d.doorMat || MATS.closet, d.len / 2, d.z0 + d.h / 2);
    if (d.handle !== false) for (const zz of [-1, 1]) add(new THREE.BoxGeometry(0.014, Math.min(0.32, d.h * 0.5), 0.022), MATS.steel, d.len - 0.05, d.z0 + d.h * 0.45, zz * (d.thick / 2 + 0.012));
    if (d.grooves) { MATS.groove = MATS.groove || std({ color: 0x000000, roughness: 1, transparent: true, opacity: 0.18 });   // FLISBERGET: three panels split by two fine grooves
      for (const f of [1 / 3, 2 / 3]) add(new THREE.BoxGeometry(d.len - 0.004, 0.004, d.thick + 0.002), MATS.groove, d.len / 2, d.z0 + d.h * f); }
  } else {                                        // door or fridge front
    add(new THREE.BoxGeometry(d.len, d.h, d.thick), d.mat === 'oak' ? MATS.oak : MATS.door, d.len / 2, d.z0 + d.h / 2);
    if (d.handle) add(new THREE.BoxGeometry(0.13, 0.022, 0.12), MATS.steel, d.len - 0.08, 1.0);
  }
  return parts;
}
function addHinged(d) {
  const pivot = new THREE.Group();
  const h = b2t(d.hinge[0], d.hinge[1], 0);
  pivot.position.copy(h);
  let a0, a1, axis, center;
  if (d.shape === 'lid') {
    pivot.position.y = d.z0;
    pivot.rotation.y = Math.atan2(b2t(d.closed[0], d.closed[1]).x, b2t(d.closed[0], d.closed[1]).z);   // lid extends along local +z
    axis = 'x'; a0 = 0; a1 = -(d.open_angle || 1.6);
    center = h.clone().addScaledVector(b2t(d.closed[0], d.closed[1]), d.len / 2); center.y = d.z0 + 0.1;
  } else {
    axis = 'y';
    a0 = dirAngle(d.closed);
    let diff = dirAngle(d.open) - a0;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    a1 = a0 + (d.swingDeg ? Math.sign(diff) * d.swingDeg * Math.PI / 180 : diff);
    pivot.rotation.y = a0;
    center = h.clone().addScaledVector(b2t(d.closed[0], d.closed[1]), d.len / 2);
    center.y = d.z0 + d.h / 2;
  }
  // the lid rotates around its own hinge axis, so nest it in a second group
  let spin = pivot;
  if (axis === 'x') { spin = new THREE.Group(); pivot.add(spin); }
  const parts = buildLeaf(d, spin);
  const door = { ...d, kind: 'hinge', pivot: spin, axis, parts, a0, a1, t: 0, target: 0, center };
  for (const p of parts) { p.userData.door = door; collidables.push(p); }
  scene.add(pivot);
  doors.push(door);
  return door;
}
for (const d of PLAN.doors) addHinged(d);
if (BAL) {
  // fixed pane (left) + mullion, then the two outward-opening leaves
  const { sd, ad, nIn, fw, S1, SM, L } = BAL, z0 = sd.z0, z1 = sd.z1;
  const fixed = new THREE.Group();
  const seg = (s0, s1, za, zb, dep, mat) => {
    const a = BAL.at(s0), b = BAL.at(s1), A = b2t(a[0], a[1], 0), B = b2t(b[0], b[1], 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(A.distanceTo(B), zb - za, dep), mat);
    m.position.copy(A).add(B).multiplyScalar(0.5); m.position.y = (za + zb) / 2;
    m.rotation.y = dirAngle(ad); m.castShadow = mat !== MATS.glass; if (mat === MATS.glass) m.renderOrder = 2;
    fixed.add(m); collidables.push(m); return m;
  };
  seg(fw, S1 - 0.03, z0 + fw, z1 - fw, 0.012, MATS.glass);
  seg(S1 - 0.035, S1 + 0.035, z0, z1, 0.07, MATS.frame);
  scene.add(fixed);
  const out = [-nIn[0], -nIn[1]], leafH = z1 - z0 - 2 * fw;
  const common = { label: 'Balcony door', h: leafH, z0: z0 + fw, thick: 0.05, mat: 'frame', shape: 'sash', open: out };
  addHinged({ ...common, id: 'balcony_leaf_narrow', hinge: BAL.at(S1 + 0.035), closed: ad, len: +(SM - S1 - 0.035).toFixed(3), swingDeg: 172 });
  addHinged({ ...common, id: 'balcony_leaf_wide', hinge: BAL.at(L - fw), closed: [-ad[0], -ad[1]], len: +(L - fw - SM).toFixed(3) });
}
for (const sd of (BAL ? [] : PLAN.sliders || [])) {
  const g = new THREE.Group();
  const a = b2t(sd.a[0], sd.a[1], 0), dir = b2t(sd.dir[0], sd.dir[1]).normalize(), nrm = b2t(sd.n[0], sd.n[1]).normalize();
  g.position.copy(a).addScaledVector(nrm, sd.inset);
  g.rotation.y = Math.atan2(-dir.z, dir.x);
  const hgt = sd.z1 - sd.z0, fw = 0.06, parts = [];
  const add = (w, hh, x, y, m, dz = 0.05) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hh, dz), m);
    mesh.position.set(x, y, 0); mesh.castShadow = m !== MATS.glass; g.add(mesh); parts.push(mesh); return mesh;
  };
  add(fw, hgt, fw / 2, sd.z0 + hgt / 2, MATS.frame);
  add(fw, hgt, sd.w - fw / 2, sd.z0 + hgt / 2, MATS.frame);
  add(sd.w, fw, sd.w / 2, sd.z0 + fw / 2, MATS.frame);
  add(sd.w, fw, sd.w / 2, sd.z1 - fw / 2, MATS.frame);
  add(sd.w - 2 * fw, hgt - 2 * fw, sd.w / 2, sd.z0 + hgt / 2, MATS.glass, 0.012).renderOrder = 2;
  add(0.03, 0.3, sd.w - fw - 0.03, 1.05, MATS.steel, 0.06);            // pull handle
  scene.add(g);
  const door = { ...sd, kind: 'slide', group: g, parts, base: g.position.clone(), dirV: dir, t: 0, target: 0,
    center: a.clone().addScaledVector(dir, sd.w / 2).setY(1.2) };
  for (const p of parts) { p.userData.door = door; if (p.material !== MATS.glass || true) collidables.push(p); }
  doors.push(door);
}
function toggleDoor(door) { if (door.kind === 'swap') { door.swap(); return; } door.target = door.target > 0.5 ? 0 : 1; }
const doorRay = new THREE.Raycaster();
function doorHidden(d) {
  // a wall between you and the door (e.g. the bedroom door seen from the bathroom) rules it out
  const to = d.center.clone().sub(camera.position);
  const dist = to.length();
  doorRay.set(camera.position, to.normalize()); doorRay.far = Math.max(0.01, dist - 0.25);
  return doorRay.intersectObjects(collidables, false).some((h) => h.object.material !== MATS.glass && !d.parts.includes(h.object));
}
function nearestDoor() {
  // the opening you are looking at: within reach, best aligned with the view direction (pitch included)
  if (mode !== 'walk') return null;
  const f = new THREE.Vector3(); camera.getWorldDirection(f);
  let best = null, bestScore = 0.5;
  for (const d of doors) {
    const flat = Math.hypot(d.center.x - player.pos.x, d.center.z - player.pos.z);
    if (flat > 2.1 || Math.abs(d.center.y - (player.fy + 1.1)) > 1.7) continue;
    const to = d.center.clone().sub(camera.position).normalize();
    const score = to.dot(f) - flat * 0.05;
    if (score > bestScore && !doorHidden(d)) { best = d; bestScore = score; }
  }
  return best;
}
let doorNear = null;
function updateDoors(dt) {
  for (const d of doors) {
    if (d.kind === 'curtain') { updateCurtain(d, dt); continue; }
    if (d.kind === 'swap' || d.t === d.target) continue;
    d.t = d.target > d.t ? Math.min(1, d.t + dt * 1.6) : Math.max(0, d.t - dt * 1.6); shadowDirty = true;
    const e = d.t * d.t * (3 - 2 * d.t);
    if (d.kind === 'hinge') d.pivot.rotation[d.axis] = d.a0 + (d.a1 - d.a0) * e;
    else d.group.position.copy(d.base).addScaledVector(d.dirV, d.travel * e);
  }
  updateDoors.k = ((updateDoors.k || 0) + 1) % 4;
  doorNear = started && $('lightbox').hidden ? hud.focusDoor : null;       // the interaction point nearest the centre of view (E / Space)
  $('doorTip').hidden = true;
}
addEventListener('keydown', (e) => {
  if (e.repeat || e.target.tagName === 'INPUT' || !$('lightbox').hidden) return;
  if ((e.code === 'KeyE' || e.code === 'Space') && doorNear) { e.preventDefault(); toggleDoor(doorNear); }
});
$('doorTip').addEventListener('click', () => { if (doorNear) toggleDoor(doorNear); });
// doors, cabinets, switches and the TV are opened only through their interaction points (see the world HUD below);
// with the mouse captured, a click opens whatever point sits under the crosshair
canvas.addEventListener('click', (e) => {
  if (!started || !locked || mode !== 'walk' || measuring) return;
  if (hudClickAtCentre()) e.stopImmediatePropagation();
}, true);

