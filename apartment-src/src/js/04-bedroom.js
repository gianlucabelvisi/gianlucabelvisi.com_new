// ------------------------------------------------------------ furniture: bed in the main bedroom (160 or 180 × 200, click to swap)
const toBl = (v) => [v.x, -v.z];                              // three -> Blender plan coords
const fabricTex = canvasTex(256, 256, (g, W) => { const r = rng(71); g.fillStyle = '#d6cdbf'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 9000; i++) { const v = 190 + r() * 40; g.fillStyle = `rgba(${v},${v - 8},${v - 20},.35)`; g.fillRect(r() * W, r() * W, 1.5, 1.5); } }, [0.4, 0.4]);
MATS.fabric = std({ map: fabricTex, color: 0xe9e1d4, roughness: 0.95 });
MATS.linen = std({ color: 0xf6f4ef, roughness: 0.9 });
MATS.legwood = std({ color: 0xc9a473, roughness: 0.5 });
const bed = { width: 1.6, offset: null, doorGap: 0.90, group: null, dims: [], door: null, wall: null };
// one draw call per material for a finished piece of furniture (the pieces never move relative to each other)
// many small static meshes with the same material (lamp lenses, spots, fittings) → one draw call per material
function bakeLoose(list, opts = {}) {
  const byMat = new Map();
  for (const m of list) { m.updateMatrixWorld(true); const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    (byMat.get(m.material) || byMat.set(m.material, []).get(m.material)).push(g); if (m.parent) m.parent.remove(m); }
  const out = [];
  for (const [mat, geos] of byMat) { const mm = new THREE.Mesh(mergeGeometries(geos, false), mat); mm.castShadow = !!opts.shadow; mm.receiveShadow = !!opts.receive; if (opts.order) mm.renderOrder = opts.order; scene.add(mm); out.push(mm); }
  return out;
}
function mergeByMaterial(g, solid = null) {
  const byMat = new Map();
  for (const c of [...g.children]) {
    if (!c.isMesh || c.children.length || Array.isArray(c.material)) continue;   // multi-material meshes stay as they are
    c.updateMatrix();
    const geo = c.geometry.index ? c.geometry.clone() : c.geometry.clone();
    geo.applyMatrix4(c.matrix);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    const e = byMat.get(c.material) || { geos: [], solid: false, shadow: false, ud: null, order: 0 };
    e.geos.push(geo.index ? geo : geo); e.solid ||= !solid || solid.has(c); e.shadow ||= c.castShadow; e.ud ||= c.userData; e.order = Math.max(e.order, c.renderOrder);
    byMat.set(c.material, e);
    g.remove(c); c.geometry.dispose();
  }
  const all = [], solids = [];
  for (const [mat, e] of byMat) {
    const idx = e.geos.every((x) => x.index), geos = idx ? e.geos : e.geos.map((x) => (x.index ? x.toNonIndexed() : x));
    const merged = mergeGeometries(geos, false);
    if (!merged) { for (const x of geos) { const m1 = new THREE.Mesh(x, mat); m1.castShadow = e.shadow; m1.receiveShadow = true; m1.userData = { ...e.ud }; g.add(m1); all.push(m1); if (e.solid) solids.push(m1); } continue; }
    const m = new THREE.Mesh(merged, mat);
    for (const x of geos) x.dispose();
    m.castShadow = e.shadow; m.receiveShadow = true; m.renderOrder = e.order; m.userData = { ...e.ud };
    if (merged.attributes.position.count > 300) merged.computeBoundsTree();          // perf: rays against rebuilt furniture stay fast
    g.add(m); all.push(m); if (e.solid) solids.push(m);
  }
  return { all, solids };
}
const furnDims = new THREE.Group(); dimsGroup.add(furnDims);
function findBedWall() {
  // inner face of the bedroom wall towards Værelse, found by casting from the middle of the room
  const u3 = b2t(0.0672, 0.9977).normalize();                 // along the wall (towards the window)
  const n3 = b2t(0.9977, -0.0672).normalize();                // into the room
  const from = b2t(8.6, 6.1, 0.5);
  const r = new THREE.Raycaster(from, n3.clone().negate(), 0, 5);
  const hit = r.intersectObjects(collidables.filter((o) => o.material !== MATS.glass), false)[0];
  const W = hit ? hit.point.clone().setY(0) : b2t(7.4, 6.1, 0);
  const cast = (o, d) => { const rc = new THREE.Raycaster(o, d, 0, 8); const h = rc.intersectObjects(collidables.filter((x) => !bed.parts?.includes(x)), false)[0]; return h ? h.distance : 8; };
  const door = PLAN.doors.find((d) => d.id === 'door_bed');
  const j1 = b2t(door.hinge[0], door.hinge[1], 0), j2 = j1.clone().add(b2t(door.closed[0], door.closed[1]).multiplyScalar(door.len));
  const sDoor = Math.max(j1.clone().sub(W).dot(u3), j2.clone().sub(W).dot(u3));
  // measure to the window wall right next to our wall (further out the ray would slip into the window recess)
  const sEnd = Math.min(cast(W.clone().addScaledVector(n3, 0.06).setY(1.2), u3), cast(W.clone().addScaledVector(n3, 0.06).setY(0.5), u3));
  return { W, u3, n3, sDoor, sEnd, cast };
}
function buildBed() {
  if (!bed.wall) bed.wall = findBedWall();
  const { W, u3, n3, sDoor, sEnd, cast } = bed.wall;
  if (bed.group) { scene.remove(bed.group); for (const p of bed.parts) { const i = collidables.indexOf(p); if (i >= 0) collidables.splice(i, 1); } }
  furnDims.clear();
  const w = bed.width, L = 2.0, HB = 0.08;
  const w0 = bed.width;
  const lim = (sEnd - sDoor) / 2 - w0 / 2 - 0.02;                  // keep the bed clear of the door opening and the window wall
  if (bed.offset === null) bed.offset = sDoor + bed.doorGap + 0.02 + w0 / 2 - (sDoor + sEnd) / 2;   // default: frame edge 90 cm from the door opening
  bed.offset = Math.max(-lim, Math.min(lim, bed.offset));
  const sC = (sDoor + sEnd) / 2 + bed.offset;                     // centred on the free stretch of wall, plus your shift
  const O = W.clone().addScaledVector(u3, sC);
  const g = new THREE.Group(); g.position.copy(O); g.rotation.y = Math.atan2(-n3.z, n3.x);
  const parts = [];
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); parts.push(m); return m; };
  // headboard with three buttons
  add(new THREE.BoxGeometry(HB, 1.15, w + 0.04), MATS.fabric, HB / 2, 0.575, 0);
  for (const z of [-0.28, 0, 0.28]) add(new THREE.SphereGeometry(0.018, 10, 8), MATS.fabric, HB + 0.004, 0.9, z * w / 1.6);
  // two base units side by side, with the drawer grip on the long side
  const half = w / 2;
  for (const zc of [-half / 2, half / 2]) {
    add(new THREE.BoxGeometry(L, 0.3, half - 0.006), MATS.fabric, HB + L / 2, 0.1 + 0.15, zc);
    add(new THREE.BoxGeometry(L - 0.02, 0.012, half - 0.02), MATS.linen, HB + L / 2, 0.1 + 0.3 + 0.001, zc).visible = false;
  }
  add(new THREE.BoxGeometry(0.22, 0.03, 0.012), new THREE.MeshStandardMaterial({ color: 0x8e8779, roughness: 1 }), HB + 0.45, 0.34, -w / 2 - 0.001);
  // continental mattress, duvet, pillows
  add(new THREE.BoxGeometry(L, 0.2, w), MATS.fabric, HB + L / 2, 0.4 + 0.1, 0);
  add(new THREE.BoxGeometry(L - 0.02, 0.06, w - 0.02), MATS.linen, HB + L / 2, 0.63, 0);             // topper
  const duvet = add(new THREE.BoxGeometry(L * 0.72, 0.1, w + 0.1), MATS.linen, HB + L - L * 0.36, 0.7, 0);
  duvet.geometry.translate(0, 0, 0);
  add(new THREE.BoxGeometry(0.02, 0.28, w + 0.1), MATS.linen, HB + L + 0.005, 0.56, 0);                 // duvet drop at the foot
  for (const zc of (w > 1.7 ? [-0.43, 0.43] : [-0.38, 0.38])) {
    const pl = add(new THREE.BoxGeometry(0.42, 0.13, 0.66), MATS.linen, HB + 0.26, 0.73, zc); pl.rotation.z = 0.18;
  }
  // oak legs: corners + the seam between the two units
  for (const x of [HB + 0.08, HB + L - 0.08]) for (const z of [-w / 2 + 0.06, 0, w / 2 - 0.06]) add(new THREE.CylinderGeometry(0.024, 0.02, 0.1, 12), MATS.legwood, x, 0.05, z);
  // nightstands (a real product, picked in the bed's panel); Hue pendants hang above them
  { const sC0 = (sDoor + sEnd) / 2 + bed.offset, room = [sC0 - w / 2 - 0.02 - sDoor, sEnd - sC0 - w / 2 - 0.02];
    g.userData.pendSpots = buildNightstands(add, w, room); }
  { const mg = mergeByMaterial(g); parts.length = 0; parts.push(...mg.all); }
  const door = { kind: 'swap', label: 'Bed', parts, center: O.clone().addScaledVector(n3, HB + L / 2).setY(0.6),
    swap: () => selectFurniture(selected === bedMover ? null : bedMover),
    prompt: () => (selected === bedMover ? 'Done moving the bed' : 'Move or resize the bed') };
  for (const p of parts) { p.userData.door = door; p.userData.furniture = true; collidables.push(p); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Bed'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  scene.add(g); g.updateMatrixWorld(true);
  bed.group = g; bed.parts = parts;
  try { placeBedPendants(g.userData.pendSpots.filter(Boolean).map((v) => g.localToWorld(v.clone()))); } catch (_) { /* room lights not defined yet: furnish() places them */ }
  // distances along the wall (shown with "Dimensions"): bed edge → door opening, bed edge → window wall, foot → opposite wall
  const off = 0.18, Y = 0.04;
  const along = (s) => W.clone().addScaledVector(u3, s).addScaledVector(n3, off);
  const e1 = sC - w / 2 - 0.02, e2 = sC + w / 2 + 0.02;
  furnDims.add(dimLine(toBl(along(sDoor)), toBl(along(e1)), `${Math.max(0, e1 - sDoor).toFixed(2)} m to door`, Y));
  furnDims.add(dimLine(toBl(along(e2)), toBl(along(sEnd)), `${Math.max(0, sEnd - e2).toFixed(2)} m`, Y));
  const foot = O.clone().addScaledVector(n3, HB + L + 0.02);
  const clear = cast(foot.clone().setY(0.5), n3);
  furnDims.add(dimLine(toBl(foot), toBl(foot.clone().addScaledVector(n3, clear)), `${clear.toFixed(2)} m`, Y));
  const tag = labelSprite(`Bed ${Math.round(w * 100)} × 200 cm`, { h: 0.036 });
  tag.position.copy(O).addScaledVector(n3, HB + L / 2).setY(1.15); furnDims.add(tag);
}

// ---- moving furniture: select (click / E), then ◀ ▶ shift it 5 cm along its wall; the bed can also swap 160 ↔ 180
let selected = null;
const bedMover = {
  name: 'Bed', anchor: () => (bed.group ? bed.group.position.clone().addScaledVector(bed.wall.n3, 1.08).setY(1.05) : null),
  axis: () => bed.wall.u3,                                   // positive shift = along the wall towards the window
  shift: (dir) => { const before = bed.offset; bed.offset += dir * 0.05; buildBed(); if (furn.gianluca || furn.svetlanaInfo) furnitureDims();
    if (Math.abs(bed.offset - before) < 1e-6) showToast('Can’t go further: door or wall'); },
  info: () => { const w = bed.wall; const sC = (w.sDoor + w.sEnd) / 2 + bed.offset; const e1 = sC - bed.width / 2 - 0.02 - w.sDoor, e2 = w.sEnd - sC - bed.width / 2 - 0.02;
    return `${Math.round(bed.width * 100)} × 200 cm · ${e1.toFixed(2)} m to door · ${e2.toFixed(2)} m to window wall`; },
  variant: { label: () => `Try ${bed.width > 1.7 ? '160' : '180'} cm`, run: () => { const nw = bed.width > 1.7 ? 1.6 : 1.8; bed.offset += (nw - bed.width) / 2; bed.width = nw; buildBed(); if (furn.gianluca || furn.svetlanaInfo) furnitureDims(); showToast(`Bed ${Math.round(bed.width * 100)} × 200 cm`); } },
};
function selectFurniture(m) {
  if (focus && m !== focus.mover && !focus.switching) exitFocus();
  selected = m; lightPanelSync = null;
  setLightHold(!!(m && m.lights));
  $('mover').hidden = !m;
  if (m) {
    if (document.pointerLockElement) document.exitPointerLock();
    // moving and turning happen with the arrows in the scene; the panel keeps only choices (and the odd action button)
    $('mvName').textContent = m.name; $('mvVar').hidden = !m.variant;
    $('mvRow2').hidden = !m.variant2; $('mvUp').style.visibility = $('mvDown').style.visibility = 'hidden';
    $('mvVar2').hidden = !m.variant2;
    $('mvRow3').hidden = true;
    $('mvRow1').hidden = !m.variant;
    $('mvLeft').style.visibility = $('mvRight').style.visibility = 'hidden';
    buildMoverSelects(m);
    updateMoverInfo();
  }
}
function buildMoverSelects(m) {
  const box = $('mvSelects'); box.innerHTML = ''; box.hidden = !(m.selects && m.selects.length) && !m.lights && !m.readonly;
  if (m.readonly) { const dl = document.createElement('dl'); dl.className = 'mvro'; for (const [k, v] of m.readonly) { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; dl.append(dt, dd); } box.appendChild(dl); }
  if (m.lights) buildLightControls(box, m.lights);
  for (const sel of m.selects || []) {
    const lab = document.createElement('label'); const head = document.createElement('span'); head.textContent = sel.label; lab.appendChild(head);
    const el = document.createElement('select'); el.dataset.id = sel.id; let grp = null, cur = null;
    sel.options().forEach((o, i) => {
      if (o.group !== undefined && o.group !== '' && o.group !== cur) { grp = document.createElement('optgroup'); grp.label = o.group; el.appendChild(grp); cur = o.group; }
      const op = document.createElement('option'); op.value = i; op.textContent = o.label; (o.group ? grp : el).appendChild(op);
    });
    el.value = sel.get();
    el.addEventListener('change', () => { sel.set(+el.value); updateMoverInfo(); });
    el.addEventListener('keydown', (e) => e.stopPropagation());
    lab.appendChild(el); box.appendChild(lab);
  }
}
function updateMoverInfo() { if (!selected) return; shadowDirty = true;     // a choice or a move just changed the piece if (selected.title) $('mvName').textContent = selected.title();
  const lk = $('mvLink'), lk2 = $('mvLink2'); lk.hidden = !selected.link; lk2.hidden = true;
  if (selected.link) { const L = selected.link(); lk.href = L.href; lk.textContent = L.text; if (L.href2) { lk2.hidden = false; lk2.href = L.href2; lk2.textContent = L.text2; } }
  if (selected.rotate) $('mvAng').textContent = `${Math.round((((selected.angle ? selected.angle() : dining.angle) * 180 / Math.PI) % 360 + 360) % 360)}°`; $('mvInfo').textContent = selected.info();
  for (const sel of selected.selects || []) { const el = $('mvSelects').querySelector(`select[data-id="${sel.id}"]`); if (el && +el.value !== sel.get()) el.value = sel.get(); }
  if (selected.variant2) $('mvVar2').disabled = selected.variant2.label() === '—'; if (selected.variant) $('mvVar').textContent = selected.variant.label(); if (selected.variant2) $('mvVar2').textContent = selected.variant2.label(); }
function moverMap(m) {
  // which of the mover's axes (and which sign) goes right / up on screen from where you look now
  const at = m.anchor(); const p0 = at.clone().project(camera);
  const scr = (ax) => { const p = at.clone().add(ax).project(camera); return [p.x - p0.x, p.y - p0.y]; };
  if (!m.axis && !m.axis2) return { h: null, v: null };
  if (!m.axis) { const B = scr(m.axis2()); return { h: null, v: [m.shift2, B[1] >= 0 ? 1 : -1] }; }   // vertical-only movers (the dining lamp)
  const A = scr(m.axis());
  if (!m.axis2) return { h: [m.shift, A[0] >= 0 ? 1 : -1], v: null };
  const B = scr(m.axis2());
  if (Math.abs(A[0]) >= Math.abs(B[0])) return { h: [m.shift, A[0] >= 0 ? 1 : -1], v: [m.shift2, B[1] >= 0 ? 1 : -1] };
  return { h: [m.shift2, B[0] >= 0 ? 1 : -1], v: [m.shift, A[1] >= 0 ? 1 : -1] };
}
function moveSel(kind, sign) {
  if (!selected || !selected.anchor()) return;
  const mm = moverMap(selected)[kind]; if (!mm) return;
  mm[0](sign * mm[1]); updateMoverInfo();
}
$('mvLeft').addEventListener('click', () => moveSel('h', -1));
$('mvRight').addEventListener('click', () => moveSel('h', 1));
$('mvUp').addEventListener('click', () => moveSel('v', 1));
$('mvDown').addEventListener('click', () => moveSel('v', -1));
$('mvVar').addEventListener('click', () => { if (selected && selected.variant) { selected.variant.run(); updateMoverInfo(); } });
$('mvVar2').addEventListener('click', () => { if (selected && selected.variant2) { selected.variant2.run(); updateMoverInfo(); } });
$('mvDone').addEventListener('click', () => selectFurniture(null));
$('mvRotL').addEventListener('click', () => { if (selected && selected.rotate) { selected.rotate(1); updateMoverInfo(); } });
$('mvRotR').addEventListener('click', () => { if (selected && selected.rotate) { selected.rotate(-1); updateMoverInfo(); } });
addEventListener('keydown', (e) => {
  if (!selected || e.target.tagName === 'INPUT') return;
  if (e.code === 'Comma' || e.code === 'BracketLeft') $('mvLeft').click();
  else if (e.code === 'Period' || e.code === 'BracketRight') $('mvRight').click();
  else if (e.code === 'Equal') $('mvUp').click();
  else if (e.code === 'Minus') $('mvDown').click();
  else if (e.code === 'KeyQ' && selected.rotate) $('mvRotL').click();
  else if (e.code === 'KeyR' && selected.rotate) $('mvRotR').click();
  else if (e.code === 'Escape') selectFurniture(null);
});
// desktop: grab the panel by its title bar and park it anywhere; it stays there (also for the next piece of furniture)
// until you drag it again. Double-click the title bar to let it follow the furniture again.
let moverPin = null;
try { moverPin = JSON.parse(localStorage.getItem('moverPin') || 'null'); } catch (e) { moverPin = null; }
const finePointer = matchMedia('(pointer: fine)');
function clampPin() {
  const el = $('mover'); if (!moverPin) return;
  moverPin.x = Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, moverPin.x));
  moverPin.y = Math.max(8, Math.min(innerHeight - el.offsetHeight - 8, moverPin.y));
}
function savePin() { try { localStorage.setItem('moverPin', JSON.stringify(moverPin)); } catch (e) { /* private mode */ } }
(() => {
  const el = $('mover'), bar = el.querySelector('.mvtop');
  let drag = null;
  bar.addEventListener('pointerdown', (e) => {
    if (!finePointer.matches || e.button !== 0 || e.target.closest('button')) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const r = el.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    moverPin = { x: r.left, y: r.top };
    el.classList.add('pinned', 'dragging'); bar.setPointerCapture(e.pointerId);
    e.preventDefault(); e.stopPropagation();
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    moverPin = { x: e.clientX - drag.dx, y: e.clientY - drag.dy }; clampPin();
    el.style.left = moverPin.x + 'px'; el.style.top = moverPin.y + 'px';
  });
  const end = (e) => { if (!drag) return; drag = null; el.classList.remove('dragging'); savePin(); };
  bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', (e) => { if (e.target.closest('button')) return; moverPin = null; el.classList.remove('pinned'); try { localStorage.removeItem('moverPin'); } catch (x) { /* ignore */ } showToast('Panel follows the furniture again'); });
  addEventListener('resize', () => { if (moverPin) { clampPin(); savePin(); } });
})();
function placeMover() {
  if (!selected) return;
  const el = $('mover');
  if (focus) { el.style.opacity = '1'; return; }                 // docked beside the close-up (CSS)
  if (moverPin && finePointer.matches) {                       // parked by you: leave it where it is
    el.classList.add('pinned'); el.style.opacity = '1';
    clampPin(); el.style.left = moverPin.x + 'px'; el.style.top = moverPin.y + 'px';
    return;
  }
  el.classList.remove('pinned');
  const at = selected.anchor(); if (!at) return;
  const v = at.clone().project(camera);
  if (v.z > 1) { el.style.opacity = '0.0'; return; }
  el.style.opacity = '1';
  const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
  const hw = el.offsetWidth / 2 + 8; el.style.left = Math.max(hw, Math.min(innerWidth - hw, x)) + 'px';
  el.style.top = Math.max(el.offsetHeight + 12, Math.min(innerHeight - 20, y)) + 'px';
}
function showToast(text) {
  const t = $('toast'); t.textContent = text; t.hidden = false;
  clearTimeout(showToast.tm); showToast.tm = setTimeout(() => { t.hidden = true; }, 1800);
}
// ------------------------------------------------------------ furniture: wardrobes (brown, IKEA-style 236 cm high)
MATS.closet = std({ color: 0x5c3e2b, roughness: 0.55 });
MATS.closetIn = std({ color: 0x7d5b42, roughness: 0.6 });
MATS.rail = std({ color: 0xc7c9cc, roughness: 0.25, metalness: 0.9 });
MATS.paxFrame = std({ color: 0xf1f0ec, roughness: 0.6 });            // PAX white
MATS.paxIn = std({ color: 0xe9e7e2, roughness: 0.7 });
MATS.paxDoor = std({ color: 0xd9cdb6, roughness: 0.65 });           // FLISBERGET light beige
const clothMat = {};
const cloth = (hex) => (clothMat[hex] ||= std({ color: hex, roughness: 0.95 }));
const UP = new THREE.Vector3(0, 1, 0);
function wallHit(fromBl, dirBl, y = 1.0) {
  const o = b2t(fromBl[0], fromBl[1], y), d = b2t(dirBl[0], dirBl[1]).normalize();
  const r = new THREE.Raycaster(o, d, 0, 6);
  const h = r.intersectObjects(collidables.filter((x) => x.material !== MATS.glass && !x.userData.furniture), false)[0];
  if (!h) return null;
  const n = h.face.normal.clone().transformDirection(h.object.matrixWorld).setY(0).normalize();
  if (n.dot(d) > 0) n.negate();
  return { p: h.point.clone().setY(0), n };
}
function wallLine(fromA, fromB, dirBl) {
  // wall face from two probes: the direction comes from the two hit points (face normals can be off on slanted walls)
  const h1 = wallHit(fromA, dirBl), h2 = wallHit(fromB, dirBl);
  if (!h1 || !h2) return h1;
  const t = h2.p.clone().sub(h1.p).normalize();
  const n = new THREE.Vector3(-t.z, 0, t.x);
  const d = b2t(dirBl[0], dirBl[1]);
  if (n.dot(d) > 0) n.negate();
  return { p: h1.p, n };
}
function lineMeet(p1, t1, p2, t2) {        // intersection of two horizontal lines p + t*s
  const den = t1.x * t2.z - t1.z * t2.x;
  const s = ((p2.x - p1.x) * t2.z - (p2.z - p1.z) * t2.x) / den;
  return p1.clone().addScaledVector(t1, s);
}
let H_CL = 2.364, DOOR_H = 2.294, D_CL = 0.58; const PL = 0.05, T = 0.018;   // IKEA PAX frame 58 cm deep; door front at 60 cm
function makeRun(O, n, width, name, sections) {
  // one straight wardrobe run. O = back corner on the wall where local x = 0; local x = UP × n, local z = n (towards the room)
  const a = new THREE.Vector3().crossVectors(UP, n).normalize();
  const g = new THREE.Group(); g.position.copy(O);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, UP, n));
  const parts = [];
  const add = (geo, mat, x, y, z, solid = false) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); if (solid) { m.userData.furniture = true; parts.push(m); } return m; };
  // carcass
  add(new THREE.BoxGeometry(width, H_CL, T), MATS.paxIn, width / 2, H_CL / 2, T / 2);
  add(new THREE.BoxGeometry(width, T, D_CL), MATS.paxFrame, width / 2, H_CL - T / 2, D_CL / 2, true);
  add(new THREE.BoxGeometry(width, PL, D_CL - 0.03), MATS.paxFrame, width / 2, PL / 2, (D_CL - 0.03) / 2, true);
  add(new THREE.BoxGeometry(width, T, D_CL - 0.02), MATS.paxIn, width / 2, PL + T / 2, (D_CL - 0.02) / 2);
  let x = 0;
  const edges = [0];
  for (const sec of sections) { x += sec.w; edges.push(x); }
  for (const ex of edges) add(new THREE.BoxGeometry(T, H_CL, D_CL - 0.02), ex === 0 || ex === width ? MATS.paxFrame : MATS.paxIn, Math.min(Math.max(ex, T / 2), width - T / 2), H_CL / 2, (D_CL - 0.02) / 2, true);
  // interiors + doors
  const toBlXZ = (lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyQuaternion(g.quaternion).add(O); return [v.x, -v.z]; };
  const aBl = [a.x, -a.z], nBl = [n.x, -n.z];
  x = 0;
  const made = [];
  for (const sec of sections) {
    const x0 = x, x1 = x + sec.w; x = x1;
    const ky = H_CL / 2.364, addS = (geo, mat, x, y, z, solid) => add(geo, mat, x, PL + (y - PL) * ky, z, solid);
    const ctx = { g, x0, x1, add: addS, w: sec.w };
    if (sec.fill) sec.fill(ctx);
    if (sec.open) continue;                                   // open frame, no doors
    if (sec.blind) { add(new THREE.BoxGeometry(sec.w - T, H_CL - PL - T, T), MATS.paxFrame, (x0 + x1) / 2, (PL + H_CL - T) / 2, D_CL - T / 2, true); continue; }
    const doorsIn = sec.doors || 1, dw = (sec.w - 0.004) / doorsIn;
    for (let k = 0; k < doorsIn; k++) {
      const hingeLeft = doorsIn === 2 ? k === 0 : !!sec.hingeLeft;
      const hx = hingeLeft ? x0 + k * dw + 0.002 : x0 + (k + 1) * dw - 0.002;
      const d = addHinged({ id: `${name}_${made.length}`, label: 'Closet', name, shape: 'closet',
        hinge: toBlXZ(hx, D_CL + 0.012), closed: hingeLeft ? aBl : [-aBl[0], -aBl[1]], open: nBl,
        len: dw - 0.004, h: DOOR_H, z0: Math.max(0.01, (H_CL - DOOR_H) / 2), thick: 0.02, doorMat: MATS.paxDoor, handle: false, grooves: true });
      for (const p of d.parts) p.userData.furniture = true;
      made.push(d);
    }
  }
  { const mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids); for (const m of mg.solids) m.userData.furniture = true; }
  for (const p of parts) collidables.push(p);
  scene.add(g); g.updateMatrixWorld(true);
  for (const d of made) d.pivot.updateMatrixWorld(true);
  return { g, a, n, O, width, doors: made, parts };
}
// ---- interior helpers (local run coordinates)
let zc = D_CL / 2;
function rail(c, y) { c.add(new THREE.CylinderGeometry(0.012, 0.012, c.w - 0.04, 12), MATS.rail, (c.x0 + c.x1) / 2, y, zc).rotation.z = Math.PI / 2; }
function shelf(c, y) { c.add(new THREE.BoxGeometry(c.w - T * 2, T, D_CL - 0.04), MATS.paxIn, (c.x0 + c.x1) / 2, y, (D_CL - 0.04) / 2); }
function hang(c, y, items) {           // items: [thickness, length, width, colour]
  const span = c.w - 0.1; let tot = items.reduce((s, it) => s + it[0], 0); const gap = Math.max(0.006, (span - tot) / (items.length + 1));
  let x = c.x0 + 0.05 + gap;
  for (const [t, l, wd, col] of items) {
    c.add(new THREE.BoxGeometry(t, l, wd), cloth(col), x + t / 2, y - 0.06 - l / 2, zc);
    c.add(new THREE.BoxGeometry(0.01, 0.02, wd * 0.9), MATS.legwood, x + t / 2, y - 0.045, zc);   // hanger
    x += t + gap;
  }
}
function stacks(c, y, cols, per = 5) {  // folded piles on a shelf
  const n = cols.length, sw = (c.w - 0.06) / n;
  cols.forEach((pile, i) => pile.slice(0, per).forEach((col, j) => c.add(new THREE.BoxGeometry(sw - 0.03, 0.045, 0.3), cloth(col), c.x0 + 0.03 + sw * (i + 0.5), y + T / 2 + 0.023 + j * 0.047, 0.2 + (j % 2) * 0.01)));
}
function drawers(c, y0, count, hgt = 0.2) {
  for (let i = 0; i < count; i++) {
    const y = y0 + i * (hgt + 0.01);
    c.add(new THREE.BoxGeometry(c.w - T * 2 - 0.01, hgt, 0.018), MATS.paxIn, (c.x0 + c.x1) / 2, y + hgt / 2, D_CL - 0.06);
    c.add(new THREE.BoxGeometry(0.16, 0.012, 0.02), MATS.rail, (c.x0 + c.x1) / 2, y + hgt - 0.04, D_CL - 0.045);
  }
}
function shoes(c, y, cols) {
  const n = cols.length, sw = (c.w - 0.06) / n;
  cols.forEach((col, i) => { for (const dx of [-0.045, 0.045]) { const m = c.add(new THREE.BoxGeometry(0.075, 0.08, 0.25), cloth(col), c.x0 + 0.03 + sw * (i + 0.5) + dx, y + T / 2 + 0.05, 0.3); m.rotation.x = -0.25; } });
}
function bags(c, y, cols) {
  const n = cols.length, sw = (c.w - 0.06) / n;
  cols.forEach((col, i) => { const bx = c.x0 + 0.03 + sw * (i + 0.5);
    c.add(new THREE.BoxGeometry(sw * 0.7, 0.2, 0.13), cloth(col), bx, y + T / 2 + 0.1, 0.25);
    const hd = c.add(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), cloth(col), bx, y + T / 2 + 0.2, 0.25); });
}
function boxes(c, y, cols) {
  const n = cols.length, sw = (c.w - 0.06) / n;
  cols.forEach((col, i) => c.add(new THREE.BoxGeometry(sw - 0.03, 0.22, 0.4), cloth(col), c.x0 + 0.03 + sw * (i + 0.5), y + T / 2 + 0.11, 0.24));
}
const SHIRTS = [0xf4f4f2, 0xbcd3ea, 0x2f4a6d, 0xe9e2d3, 0x8fb0cf, 0xffffff, 0xd9dde3];
const PANTS = [0x2b3240, 0x6b6557, 0xbfae8c, 0x1e1f24, 0x46505e];
const TEES = [[0x1f2229, 0x3e4f63, 0xf2f2f0, 0x7d8a6a, 0xb8b2a6], [0xf2f2f0, 0x9aa3ad, 0x243447, 0xc7b89a, 0x2b2b2b]];
const furn = { gianluca: null, svetlana: null };
const closetDims = new THREE.Group(); dimsGroup.add(closetDims);
function buildClosets() {
  // IKEA PAX / FLISBERGET: white PAX frames 58 cm deep + FLISBERGET doors (light beige, 49.5 cm wide, ~2 cm) = 60 cm overall;
  // 236.4 cm tall (doors 229.4) or 201.2 cm (doors 194.6). Every 100 cm frame has a pair of doors opening outwards.
  for (const r of furn.runs || []) { scene.remove(r.g); dropParts(r.parts); for (const d of r.doors) removeHingedDoor(d); const i = doors.indexOf(r.swapDoor); if (i >= 0) doors.splice(i, 1); }
  furn.runs = [];
  const PAIR = (fills) => [{ w: 0.5, hinge: 'near', fill: fills[0] }, { w: 0.5, hinge: 'far', fill: fills[1] }];
  // a run along a wall starting `start` from the corner C, sections listed from the corner outwards
  const runAlong = (C, n, dir, start, width, name, secs) => {
    const a = new THREE.Vector3().crossVectors(UP, n).normalize(), fwd = a.dot(dir) > 0;
    const O = fwd ? C.clone().addScaledVector(dir, start) : C.clone().addScaledVector(dir, start + width);
    const list = (fwd ? secs : [...secs].reverse()).map((s) => ({ ...s, doors: 1, hingeLeft: fwd ? s.hinge === 'near' : s.hinge === 'far' }));
    const r = makeRun(O, n, width, name, list); r.dir = dir; r.start = start; r.C = C; furn.runs.push(r); return r;
  };
  // --- Gianluca: 1 m (one 100 cm frame, 2 doors) on the window wall, between the window and the outside-wall corner
  const E = wallLine([8.8, 7.4], [8.8, 6.2], [1, 0]), Wn = wallLine([9.45, 6.8], [9.95, 6.8], [0, 1]);
  if (E && Wn) {
    const C = lineMeet(E.p, new THREE.Vector3().crossVectors(UP, E.n), Wn.p, new THREE.Vector3().crossVectors(UP, Wn.n));
    const a = new THREE.Vector3().crossVectors(UP, Wn.n).normalize();
    const toCorner = a.dot(E.n) < 0;
    const O = toCorner ? C.clone().addScaledVector(a, -1.01) : C.clone().addScaledVector(a, 0.01);
    const freeEnd = toCorner ? O.clone() : O.clone().addScaledVector(a, 1.0), freeDir = toCorner ? a.clone().negate() : a.clone();
    furn.gianluca = makeRun(O, Wn.n, 1.0, "Gianluca's closet", [
      { w: 0.5, doors: 1, hingeLeft: true, fill: (c) => {
        rail(c, 2.0); hang(c, 2.0, SHIRTS.map((col, i) => [0.035, 0.74, 0.42, col]));
        rail(c, 1.05); hang(c, 1.05, PANTS.map((col) => [0.03, 0.55, 0.36, col]));
      } },
      { w: 0.5, doors: 1, hingeLeft: false, fill: (c) => {
        drawers(c, PL + T + 0.01, 3, 0.19);
        for (const [y, cols] of [[0.8, TEES[0].map((x) => [x, x, x, x])], [1.15, [[0x2b2b2b, 0xf2f2f0, 0x3b4d63], [0x9aa3ad, 0x1f2229, 0xc7b89a]]], [1.5, [TEES[1], TEES[0]]], [1.85, [[0x5e4b3c, 0x2f3a4a, 0x8b8b86], [0x333333, 0x726a5e, 0xa99f8e]]]]) {
          shelf(c, y); stacks(c, y, cols.map((p) => (Array.isArray(p) ? p : [p])), 4);
        }
        shelf(c, 2.12); boxes(c, 2.12, [0x3a3a3a]);
      } },
    ]);
    furn.gianluca.freeEnd = freeEnd; furn.gianluca.freeDir = freeDir; furn.runs.push(furn.gianluca);
  }
  // --- Svetlana: 2 m of PAX (two 100 cm frames, 4 doors) as an L or an I
  const Bw = wallLine([8.7, 4.6], [9.7, 4.6], [0, -1]), E2 = wallLine([8.8, 3.9], [8.8, 5.2], [1, 0]);
  const bd = PLAN.doors.find((d) => d.id === 'door_bed');
  furn.svetlana = null; furn.svetlanaB = null; furn.svetlanaInfo = null;
  if (Bw && E2 && bd) {
    const tB = new THREE.Vector3().crossVectors(UP, Bw.n).normalize();
    const C2 = lineMeet(Bw.p, tB, E2.p, new THREE.Vector3().crossVectors(UP, E2.n));
    const tip = b2t(bd.hinge[0], bd.hinge[1], 0).add(b2t(bd.open[0], bd.open[1]).multiplyScalar(bd.len));
    const sTip = tip.clone().sub(C2).dot(tB);
    const dirA = tB.clone().multiplyScalar(Math.sign(sTip));                         // along the bathroom wall, towards the bedroom door
    const tE2 = new THREE.Vector3().crossVectors(UP, E2.n).normalize();
    const dirB = tE2.clone().multiplyScalar(tE2.dot(Bw.n) > 0 ? 1 : -1);             // along the outside wall, away from the bathroom wall
    const F = [
      (c) => { rail(c, 1.95); hang(c, 1.95, [[0.05, 1.15, 0.46, 0x1f2d3d], [0.045, 1.05, 0.44, 0xb5a38a], [0.03, 1.1, 0.4, 0x8a2f3a], [0.03, 1.2, 0.4, 0x1a1a1a], [0.03, 1.0, 0.4, 0xd8c7e0]]); shelf(c, 2.12); boxes(c, 2.12, [0xe8dccb]); shelf(c, PL + 0.2); shoes(c, PL + 0.2, [0x1a1a1a, 0xa0522d]); },
      (c) => { rail(c, 2.0); hang(c, 2.0, [0xf6efe9, 0xe8b4b8, 0xc9d6df, 0xffffff, 0xd9c4a9].map((col) => [0.03, 0.66, 0.4, col])); rail(c, 1.1); hang(c, 1.1, [0x2c2c2c, 0x7a5c61, 0xc8b89f, 0x324a5f].map((col) => [0.03, 0.62, 0.38, col])); },
      (c) => { drawers(c, PL + T + 0.01, 2, 0.17); shelf(c, 0.85); stacks(c, 0.85, [[0xe9dfd3, 0xcbb8a0, 0x8e8a86, 0xf3ece4]], 4); shelf(c, 1.2); stacks(c, 1.2, [[0xd7a9a4, 0x1f2d3d, 0xf5f0ea, 0xa8b5a2]], 4); shelf(c, 1.55); bags(c, 1.55, [0x7b4a2e, 0x1b1b1b]); shelf(c, 2.12); boxes(c, 2.12, [0xe8dccb]); },
      (c) => { shelf(c, 0.5); shoes(c, 0.5, [0x1a1a1a, 0xc9a27e]); shoes(c, PL + T, [0xe0c9b6, 0x3b3b3b]); rail(c, 1.9); hang(c, 1.9, [[0.05, 0.95, 0.46, 0x5d4b3a], [0.05, 0.9, 0.46, 0x2b2b2b], [0.04, 0.85, 0.44, 0xc4b59c]]); shelf(c, 2.12); boxes(c, 2.12, [0xd8c3a5]); },
    ];
    const lay = SV_LAYOUTS[furn.svLayout].id, gap = 0.62;                             // the second run of an L starts past the first run's doors (60 cm + 2 cm)
    const nm = "Svetlana's closet";
    let A = null, B = null;
    if (lay === 'L-bath') { A = runAlong(C2, Bw.n, dirA, 0, 1.0, nm, PAIR([F[0], F[1]])); B = runAlong(C2, E2.n, dirB, gap, 1.0, nm, PAIR([F[2], F[3]])); }
    else if (lay === 'L-out') { B = runAlong(C2, E2.n, dirB, 0, 1.0, nm, PAIR([F[2], F[3]])); A = runAlong(C2, Bw.n, dirA, gap, 1.0, nm, PAIR([F[0], F[1]])); }
    else if (lay === 'I-bath') { A = runAlong(C2, Bw.n, dirA, 0, 1.5, nm, [{ w: 0.5, hinge: 'near', fill: F[2] }, ...PAIR([F[0], F[1]])]); }   // PAX 50 + 100: the single door in the corner, the pair towards the bedroom door
    else { B = runAlong(C2, E2.n, dirB, 0, 2.0, nm, [...PAIR([F[0], F[1]]), ...PAIR([F[2], F[3]])]); }
    furn.svetlana = A || B; furn.svetlanaB = B;
    furn.svetlanaInfo = { C2, tB, sTip, tip, dirA, dirB, A, B, lay };
  }
  // click a closet body -> the closet panel
  for (const r of furn.runs) {
    const door = { kind: 'swap', label: 'Closet', parts: r.parts, center: r.O.clone().addScaledVector(r.a, r.width / 2).addScaledVector(r.n, 0.3).setY(1.2),
      swap: () => selectFurniture(selected === closetMover ? null : closetMover), prompt: () => (selected === closetMover ? 'Done with the closets' : 'Closet options') };
    for (const p of r.parts) p.userData.door = door;
    r.swapDoor = door; doors.push(door);
  }
  furnitureDims();
}
const SV_LAYOUTS = [
  { id: 'L-out', name: 'L · footprint only (ready-made corner wardrobe, ~100 + 100)' },
  { id: 'I-bath', name: 'I · 150 cm on the bathroom wall (100 + 50, 3 doors)' },
];
furn.svLayout = 1; furn.height = 0;   // default: I on the bathroom wall
const PAX_H = [{ name: '236.4 cm (doors 229.4)', H: 2.364, door: 2.294 }, { name: '201.2 cm (doors 194.6)', H: 2.012, door: 1.946 }];
// door swings: sweep each closet door from closed to 90° open, stop where it would hit something (bed, the other run, a wall)
const swingGroup = new THREE.Group(); dimsGroup.add(swingGroup);
const swingOK = new THREE.MeshBasicMaterial({ color: 0x3fa36b, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
const swingBad = new THREE.MeshBasicMaterial({ color: 0xd9534f, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const swingRay = new THREE.Raycaster();
function sector(H, c, o, len, a0, a1, mat) {
  const pts = [H.x, 0.012, H.z], steps = Math.max(2, Math.ceil((a1 - a0) / 0.08));
  for (let i = 0; i <= steps; i++) { const f = a0 + (a1 - a0) * i / steps, d = c.clone().multiplyScalar(Math.cos(f)).addScaledVector(o, Math.sin(f)); pts.push(H.x + d.x * len, 0.012, H.z + d.z * len); }
  const idx = []; for (let i = 1; i <= steps; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.renderOrder = 28; return m;
}
function closetSwings() {
  swingGroup.clear();
  const report = [];
  const leaves = new Set(); for (const r of furn.runs || []) for (const d of r.doors) for (const p of d.parts) leaves.add(p);
  const targets = collidables.filter((o) => o.material !== MATS.glass && !leaves.has(o));
  const lOnly = furn.svetlanaInfo && furn.svetlanaInfo.lay === 'L-out';
  for (const r of furn.runs || []) for (const d of r.doors) {
    if (lOnly && r !== furn.gianluca) continue;
    const H = b2t(d.hinge[0], d.hinge[1], 0), c = b2t(d.closed[0], d.closed[1]).normalize(), o = b2t(d.open[0], d.open[1]).normalize(), len = d.len;
    let block = null, by = '';
    for (let deg = 8; deg <= 90 && block === null; deg += 2) {
      const f = deg * Math.PI / 180, dir = c.clone().multiplyScalar(Math.cos(f)).addScaledVector(o, Math.sin(f));
      for (const y of [0.25, 0.55, 1.0, 1.6]) {
        swingRay.set(H.clone().setY(y).addScaledVector(dir, 0.03), dir); swingRay.far = len - 0.03;
        const h = swingRay.intersectObjects(targets, false)[0];
        if (h) { block = f - 2 * Math.PI / 180; lastGapHit = h.object; by = hitName().replace(' to ', ''); break; }
      }
    }
    const free = block === null ? Math.PI / 2 : Math.max(0, block);
    swingGroup.add(sector(H, c, o, len, 0, free, swingOK));
    if (block !== null) {
      swingGroup.add(sector(H, c, o, len, free, Math.PI / 2, swingBad));
      const mid = c.clone().multiplyScalar(Math.cos(free / 2 + Math.PI / 4)).addScaledVector(o, Math.sin(free / 2 + Math.PI / 4));
      const t = labelSprite(`opens only ${Math.round(free * 180 / Math.PI)}° (${by})`, { h: 0.026 }); t.position.copy(H).addScaledVector(mid, len * 0.6).setY(0.3); swingGroup.add(t);
      report.push({ name: d.name, deg: Math.round(free * 180 / Math.PI), by });
    }
  }
  furn.swingReport = report;
}
const closetMover = {
  name: 'Closets', title: () => 'Closets · IKEA PAX / FLISBERGET',
  anchor: () => (furn.svetlana ? furn.svetlana.O.clone().addScaledVector(furn.svetlana.a, furn.svetlana.width / 2).addScaledVector(furn.svetlana.n, 0.6).setY(1.6) : null),
  link: () => ({ href: 'https://www.ikea.com/dk/da/p/pax-flisberget-garderobeskab-hvid-lys-beige-s79480308/', text: 'PAX/FLISBERGET 100 cm ↗', href2: 'https://www.ikea.com/dk/da/p/pax-flisberget-garderobekombination-hvid-lys-beige-s59500680/', text2: 'PAX/FLISBERGET 150 cm (the one you sent) ↗' }),
  info: () => { const R = furn.swingReport || []; const S = furn.svetlanaInfo; let extra = '';
    if (S && S.lay === 'L-out') return `L shown as a footprint for a ready-made corner wardrobe (door swings not checked) · ${R.length ? 'Gianluca: ' + R.map((r) => `${r.deg}° (${r.by})`).join(', ') : 'Gianluca\'s doors open 90°'} · Sizes shows the gaps`;
    if (S && S.A) { const reach = S.A.start + S.A.width, free = Math.abs(S.sTip); extra = reach > free - 0.02 ? ` · bedroom door blocked (${Math.round((reach - free + 0.02) * 100)} cm overlap)` : ` · ${(free - reach).toFixed(2)} m to the open bedroom door`; }
    return (R.length ? `${R.length} door${R.length > 1 ? 's' : ''} can't open fully: ` + R.map((r) => `${r.deg}° (${r.by})`).join(', ') : 'all doors open 90°') + extra + ' · Sizes shows the swings'; },
  selects: [
    { id: 'svl', label: "Svetlana's closet", options: () => SV_LAYOUTS.map((l) => ({ label: l.name })), get: () => furn.svLayout, set: (i) => { furn.svLayout = i; buildClosets(); if (tv.E) buildTV(); } },
    { id: 'pxh', label: 'Height (both closets)', options: () => PAX_H.map((h) => ({ label: h.name })), get: () => furn.height, set: (i) => { furn.height = i; H_CL = PAX_H[i].H; DOOR_H = PAX_H[i].door; buildClosets(); } },
  ],
};
let lastGapHit = null;
function gapTo(from, dir, maxD = 4, glass = false) {
  const r = new THREE.Raycaster(from, dir, 0, maxD);
  const h = r.intersectObjects(glass ? collidables : collidables.filter((x) => x.material !== MATS.glass), false)[0];
  lastGapHit = h ? h.object : null;
  return h ? h.distance : null;
}
function hitName() {
  const o = lastGapHit; if (!o) return '';
  if (bed.parts && bed.parts.includes(o)) return ' to bed';
  const lb = o.userData.door && o.userData.door.label; if (lb === 'TV wall' || lb === 'TV unit') return ' to TV unit'; if (lb === 'Sofa') return ' to sofa';
  const dn = o.userData.door && o.userData.door.name; if (dn) return ` to ${dn}`;
  if (o.userData.furniture) return ' to closet';
  return ' to wall';
}
function furnitureDims() {
  closetDims.clear();
  if (typeof tvDimsUpdate === 'function' && tv.group) tvDimsUpdate();
  const Y = 0.04;
  const G = furn.gianluca;
  if (G) {
    // from the closet's side to the window jamb: step along the wall until the wall face steps back into the window recess
    const away = G.freeDir, back = G.n.clone().negate();
    const base = G.freeEnd.clone().addScaledVector(G.n, 0.05).setY(1.2);
    let jamb = null;
    for (let s = 0.01; s < 2.5; s += 0.01) { const q = base.clone().addScaledVector(away, s); const d = gapTo(q, back, 0.5); if (d === null || d > 0.09) { jamb = s - 0.005; break; } }
    if (jamb !== null) { const a0 = G.freeEnd.clone().addScaledVector(G.n, 0.3); closetDims.add(dimLine(toBl(a0), toBl(a0.clone().addScaledVector(away, jamb)), `${jamb.toFixed(2)} m to window`, Y)); }
    const tag = labelSprite("Gianluca's closet · PAX 100 × 60 cm, 2 doors", { h: 0.032 }); tag.position.copy(G.O).addScaledVector(G.a, 0.5).addScaledVector(G.n, 0.3).setY(H_CL + 0.12); closetDims.add(tag);
  }
  if (G && bed.group) {
    // bed → closet front: from the bed's window-side edge (and its foot) towards the closet; under 0.5 m the doors can't swing past the bed
    const w = bed.wall, sC = (w.sDoor + w.sEnd) / 2 + bed.offset;
    const isG = () => lastGapHit && (lastGapHit.parent === G.g || (lastGapHit.userData.door && lastGapHit.userData.door.name === "Gianluca's closet"));
    let best = null;
    for (const [along, dir] of [[2.0 - 0.03, w.u3], [1.6, w.u3], [2.1, w.n3]]) {
      const from = w.W.clone().addScaledVector(w.u3, sC + bed.width / 2 + (dir === w.u3 ? 0.01 : -0.03)).addScaledVector(w.n3, along).setY(0.35);
      const d = gapTo(from, dir, 1.5);
      if (d !== null && isG() && (!best || d < best.d)) best = { from, dir, d };
    }
    if (best) closetDims.add(dimLine(toBl(best.from), toBl(best.from.clone().addScaledVector(best.dir, best.d)), `${best.d.toFixed(2)} m bed → closet${best.d < 0.5 ? ' (doors hit the bed)' : ''}`, Y));
  }
  const S = furn.svetlanaInfo;
  if (S) {
    if (S.A) {   // bathroom-wall run vs the open bedroom door (its leaf lies along this wall when open)
      const n = S.A.n, reach = S.A.start + S.A.width, free = Math.abs(S.sTip);
      const endOnWall = S.C2.clone().addScaledVector(S.dirA, reach).addScaledVector(n, 0.3), tipOnWall = S.C2.clone().addScaledVector(S.dirA, free).addScaledVector(n, 0.3);
      const g2 = free - reach;
      closetDims.add(dimLine(toBl(tipOnWall), toBl(endOnWall), g2 >= 0.02 ? `${g2.toFixed(2)} m to open door` : `blocks the bedroom door by ${Math.round((0.02 - g2) * 100)} cm`, Y));
    }
    for (const r of [S.A, S.B].filter(Boolean)) {   // from the free end of each run to whatever is next along the wall
      const end = r.C.clone().addScaledVector(r.dir, r.start + r.width + 0.005).addScaledVector(r.n, 0.3).setY(0.35);
      if (r === S.A) continue;
      const d = gapTo(end, r.dir, 4);
      if (d !== null) closetDims.add(dimLine(toBl(end), toBl(end.clone().addScaledVector(r.dir, d)), `${d.toFixed(2)} m${hitName()}`, Y));
    }
    const lab = SV_LAYOUTS[furn.svLayout].name.split(' · ')[0];
    const R0 = S.A || S.B, tag = labelSprite(S.lay === 'L-out' ? `Svetlana's closet · L footprint ~100 + 100 (ready-made corner model)` : `Svetlana's closet · PAX I · 150 cm, 3 doors`, { h: 0.032 });
    tag.position.copy(R0.O).addScaledVector(R0.a, R0.width / 2).addScaledVector(R0.n, 0.6).setY(H_CL + 0.12); closetDims.add(tag);
  }
  // every closet: overall width along the top, each door's width, the free space in front, and the gap at each end
  for (const r of furn.runs || []) {
    const fr = (lx, lz = 0.6) => r.O.clone().addScaledVector(r.a, lx).addScaledVector(r.n, lz);
    closetDims.add(dimLine(toBl(fr(0)), toBl(fr(r.width)), `${Math.round(r.width * 100)} cm wide · 60 deep · ${(H_CL * 100).toFixed(1)} high`, H_CL + 0.06));
    if (r !== furn.gianluca && furn.svetlanaInfo && furn.svetlanaInfo.lay === 'L-out') continue;   // the L is only a footprint: overall sizes only
    for (const d of r.doors) {
      const H = b2t(d.hinge[0], d.hinge[1], 0), c = b2t(d.closed[0], d.closed[1]).normalize();
      const t = labelSprite(`door 49.5 cm`, { h: 0.022 }); t.position.copy(H).addScaledVector(c, d.len / 2).addScaledVector(r.n, 0.03).setY(1.75); closetDims.add(t);   // FLISBERGET spec width
    }
    // walking space in front (at knee height, so the bed counts)
    const f0 = fr(r.width / 2, 0.605).setY(0.35), df = gapTo(f0, r.n.clone(), 4);
    if (df !== null) closetDims.add(dimLine(toBl(f0), toBl(f0.clone().addScaledVector(r.n, df)), `${df.toFixed(2)} m in front${hitName()}`, 0.06));
    // ends: along the wall, a hand's width off it, at 1.2 m (above the bed), so walls, other closets and windows count
    for (const [lx, dir] of [[0, r.a.clone().negate()], [r.width, r.a.clone()]]) {
      if (r === furn.gianluca && furn.gianluca.freeDir && dir.dot(furn.gianluca.freeDir) > 0.5) continue;   // window side: measured to the jamb above
      const e = fr(lx, 0.3).setY(1.2).addScaledVector(dir, 0.004), de = gapTo(e, dir, 4, true);
      if (de === null) continue;
      const nm = lastGapHit && lastGapHit.material === MATS.glass ? ' to window' : hitName();
      if (de < 0.03) { const t = labelSprite(`against the wall`, { h: 0.02 }); t.position.copy(e).setY(0.9); closetDims.add(t); continue; }
      closetDims.add(dimLine(toBl(e), toBl(e.clone().addScaledVector(dir, de)), `${de.toFixed(2)} m${nm}`, 1.2));
    }
  }
  closetSwings();
}

// ------------------------------------------------------------ furniture: Samsung The Frame (32–65") on the outside wall, facing the bed
// set without stand 728.9 × 419.4 × 24.7 mm (2022 spec sheet), slim-fit mount ≈ 6 mm off the wall, art mode with a mat
const tv = { offset: 0, portrait: false, group: null, base: null, E: null, a: null, yC: 1.15, room: null };
const tvDims = new THREE.Group(); dimsGroup.add(tvDims);
MATS.tvBezel = std({ color: 0xa87a4f, roughness: 0.55 });          // teak-look bezel
MATS.tvBody = std({ color: 0x151515, roughness: 0.6 });
function tvArt(portrait) {
  // an original, quiet abstract (harbour at dusk) on a white mat, like art mode
  const W = portrait ? 540 : 960, H = portrait ? 960 : 540;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#f3f0ea'; g.fillRect(0, 0, W, H);
  const m = Math.round(Math.min(W, H) * 0.13), iw = W - 2 * m, ih = H - 2 * m;
  g.save(); g.translate(m, m); g.beginPath(); g.rect(0, 0, iw, ih); g.clip();
  const sky = g.createLinearGradient(0, 0, 0, ih * 0.62); sky.addColorStop(0, '#c9d3d8'); sky.addColorStop(0.6, '#e9d7bf'); sky.addColorStop(1, '#e4b995');
  g.fillStyle = sky; g.fillRect(0, 0, iw, ih);
  const r = rng(portrait ? 71 : 37);
  g.fillStyle = 'rgba(214,150,108,0.9)'; g.beginPath(); g.arc(iw * (portrait ? 0.62 : 0.7), ih * 0.44, Math.min(iw, ih) * 0.09, 0, Math.PI * 2); g.fill();
  const bands = [['#6f7f86', 0.58], ['#56666e', 0.66], ['#43525a', 0.76], ['#34414a', 0.88]];
  for (const [col, y0] of bands) {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, ih);
    for (let x = 0; x <= iw; x += iw / 12) g.lineTo(x, ih * y0 + (r() - 0.5) * ih * 0.03);
    g.lineTo(iw, ih); g.closePath(); g.fill();
  }
  g.globalAlpha = 0.35; g.strokeStyle = '#f2dcc2'; g.lineWidth = 2;
  for (let i = 0; i < 18; i++) { const y = ih * (0.6 + r() * 0.35), x = r() * iw; g.beginPath(); g.moveTo(x, y); g.lineTo(x + iw * (0.04 + r() * 0.08), y); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = '#2c2a28';
  const bx = iw * (portrait ? 0.18 : 0.12); g.fillRect(bx, ih * 0.48, iw * 0.012, ih * 0.14); g.fillRect(bx + iw * 0.03, ih * 0.52, iw * 0.012, ih * 0.1);
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3; g.strokeRect(m, m, iw, ih);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const tvTex = { land: null, port: null };
// Samsung The Frame sizes (set without stand, W × H × D m, Samsung spec sheets) and "from" prices on prisjagt.dk (Sep 2026)
const FRAME_SIZES = [
  { inch: 32, W: 0.7289, H: 0.4194, D: 0.0247, note: 'LS03C · Full HD · older model', price: '≈ 2,900 kr', url: 'https://www.samsung.com/dk/lifestyle-tvs/the-frame/the-frame-32-inch-4k-smart-tv-ls05t-black-qe32ls03tcuxxc/' },
  { inch: 43, W: 0.9695, H: 0.5578, D: 0.0249, note: 'LS03F / 2026 LS03H · 4K', price: '≈ 5,300 kr', url: 'https://www.samsung.com/dk/lifestyle-tvs/the-frame/ls03f-43-inch-art-store-black-tq43ls03fauxxc/' },
  { inch: 50, W: 1.1241, H: 0.6449, D: 0.0249, note: 'LS03F · 4K', price: '≈ 5,900 kr' },
  { inch: 55, W: 1.2379, H: 0.7088, D: 0.0249, note: 'LS03F / 2026 LS03H · 4K', price: '≈ 9,000 kr' },
  { inch: 65, W: 1.4568, H: 0.8319, D: 0.0249, note: 'LS03F / 2026 LS03H · 4K', price: '≈ 9,200 kr' },
];
// snap-on bezels (sold separately). Modern = flat, square profile; Beveled = 45° inner edge. Colours by eye.
const FRAME_BEZELS = [
  { name: 'No bezel (black edge)', style: 'none', color: 0x1b1b1d },
  { name: 'Modern · teak', style: 'modern', color: 0xa87a4f },
  { name: 'Modern · white', style: 'modern', color: 0xefeeea },
  { name: 'Modern · brown', style: 'modern', color: 0x5b3f2c },
  { name: 'Modern · beige', style: 'modern', color: 0xcdbfa6 },
  { name: 'Beveled · white', style: 'bevel', color: 0xf1f0ec },
  { name: 'Beveled · teak', style: 'bevel', color: 0xae7f52 },
  { name: 'Beveled · brown', style: 'bevel', color: 0x5f4230 },
];
tv.size = 1; tv.bezel = 2;                     // Modern · white (Gianluca, 2026-10-05)
function tvSize() { const F = FRAME_SIZES[tv.size]; return tv.portrait ? [F.H, F.W] : [F.W, F.H]; }
function buildTV() {
  if (!tv.E) {
    const E = wallLine([8.8, 7.4], [8.8, 6.2], [1, 0]); if (!E || !bed.wall) return;
    tv.E = E; tv.a = new THREE.Vector3().crossVectors(UP, E.n).normalize();
    // the bed's centre line hits the outside wall here
    const w = bed.wall, sC = (w.sDoor + w.sEnd) / 2 + bed.offset;
    const P = w.W.clone().addScaledVector(w.u3, sC);
    const t = E.p.clone().sub(P).dot(E.n) / w.n3.dot(E.n);
    tv.base = P.addScaledVector(w.n3, t).setY(0);
  }
  if (tv.group) { scene.remove(tv.group); for (const p of tv.parts) { const i = collidables.indexOf(p); if (i >= 0) collidables.splice(i, 1); } }
  const [W, H] = tvSize(), F = FRAME_SIZES[tv.size], D = F.D, gap = 0.006, BZ = FRAME_BEZELS[tv.bezel];
  // the set's own black edge is ~8 mm; a snap-on bezel sits over it and adds ~1 cm all round
  const edge = 0.008, bOut = BZ.style === 'none' ? 0 : 0.01, bz = BZ.style === 'none' ? edge : (BZ.style === 'bevel' ? 0.034 : 0.026);
  // free stretch of wall either side (closets, corners), measured at TV height 10 cm off the wall
  const from = tv.base.clone().addScaledVector(tv.E.n, 0.1).setY(tv.yC);
  const dPos = gapTo(from, tv.a.clone(), 4) ?? 4, dNeg = gapTo(from, tv.a.clone().negate(), 4) ?? 4;
  tv.room = { dPos, dNeg };
  tv.offset = Math.max(-dNeg + W / 2 + 0.05, Math.min(dPos - W / 2 - 0.05, tv.offset));
  const O = tv.base.clone().addScaledVector(tv.a, tv.offset);
  const g = new THREE.Group(); g.position.copy(O);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tv.a, UP, tv.E.n));
  const parts = [];
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); parts.push(m); return m; };
  const zc = gap + D / 2;
  add(new THREE.BoxGeometry(W - 0.004, H - 0.004, D - 0.004), MATS.tvBody, 0, tv.yC, zc - 0.002);
  const bm = BZ.style === 'none' ? MATS.tvBody : (MATS['bezel' + tv.bezel] ||= std({ color: BZ.color, roughness: BZ.color > 0xc00000 ? 0.7 : 0.55 }));
  const OW = W + 2 * bOut, OH = H + 2 * bOut, bd = BZ.style === 'none' ? D : D + 0.012, bzc = gap + bd / 2 - (BZ.style === 'none' ? 0 : 0.006);
  add(new THREE.BoxGeometry(OW, bz + bOut, bd), bm, 0, tv.yC + OH / 2 - (bz + bOut) / 2, bzc);
  add(new THREE.BoxGeometry(OW, bz + bOut, bd), bm, 0, tv.yC - OH / 2 + (bz + bOut) / 2, bzc);
  add(new THREE.BoxGeometry(bz + bOut, OH - 2 * (bz + bOut), bd), bm, -OW / 2 + (bz + bOut) / 2, tv.yC, bzc);
  add(new THREE.BoxGeometry(bz + bOut, OH - 2 * (bz + bOut), bd), bm, OW / 2 - (bz + bOut) / 2, tv.yC, bzc);
  if (BZ.style === 'bevel') {                            // 45° inner edge: a slanted strip just inside the bezel, catching the light
    const iw = W - 2 * bz, ih = H - 2 * bz, bv = 0.012, zf = gap + D + 0.004;
    for (const [w, h, x, y, rx, ry] of [[iw, bv, 0, ih / 2 - bv / 2, -0.785, 0], [iw, bv, 0, -ih / 2 + bv / 2, 0.785, 0], [bv, ih, -iw / 2 + bv / 2, 0, 0, -0.785], [bv, ih, iw / 2 - bv / 2, 0, 0, 0.785]])
      add(new THREE.BoxGeometry(w, h, 0.004), bm, x, tv.yC + y, zf).rotation.set(rx, ry, 0);
  }
  const key = tv.portrait ? 'port' : 'land'; tvTex[key] ||= tvArt(tv.portrait);
  const scr = add(new THREE.PlaneGeometry(W - 2 * bz, H - 2 * bz), new THREE.MeshStandardMaterial({ map: tvTex[key], emissiveMap: tvTex[key], emissive: 0xffffff, emissiveIntensity: 0.22, roughness: 0.9 }), 0, tv.yC, gap + D + 0.0005);
  scr.castShadow = false;
  // thin clear cable to the socket below
  add(new THREE.CylinderGeometry(0.0018, 0.0018, tv.yC - H / 2 - 0.3, 6), std({ color: 0xdedbd5, roughness: 0.6 }), W * 0.3, (tv.yC - H / 2 + 0.3) / 2, 0.003).castShadow = false;
  const door = { kind: 'swap', label: 'TV', parts, center: O.clone().setY(tv.yC).addScaledVector(tv.E.n, 0.05),
    swap: () => selectFurniture(selected === tvMover ? null : tvMover),
    prompt: () => (selected === tvMover ? 'Done moving the TV' : 'Move or rotate the TV') };
  for (const p of parts) { p.userData.door = door; p.userData.furniture = true; collidables.push(p); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'TV'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  scene.add(g); g.updateMatrixWorld(true);
  tv.group = g; tv.parts = parts;
  tvDimsUpdate();
}
function tvDimsUpdate() {
  tvDims.clear(); if (!tv.group) return;
  const [W, H] = tvSize(), n = tv.E.n, a = tv.a, O = tv.group.position;
  // along the wall: TV edge → next thing on each side
  const off = 0.35, Y = 1.15 + 0.3;
  for (const s of [1, -1]) {
    const edge = O.clone().addScaledVector(a, s * W / 2).addScaledVector(n, off);
    const d = s > 0 ? tv.room.dPos - tv.offset - W / 2 : tv.room.dNeg + tv.offset - W / 2;
    const end = edge.clone().addScaledVector(a, s * d);
    const lbl = d.toFixed(2) + ' m';
    tvDims.add(dimLine(toBl(edge), toBl(end), lbl, 0.04));
  }
  // height of the bottom edge above the floor
  const bot = tv.yC - H / 2, P = O.clone().addScaledVector(a, -W / 2 - 0.08).addScaledVector(n, 0.03);
  const v = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([P.clone().setY(0), P.clone().setY(bot), P.clone().setY(bot).addScaledVector(a, 0.06), P.clone().setY(bot).addScaledVector(a, -0.06)]), lineMat); v.renderOrder = 29; tvDims.add(v);
  const hl = labelSprite(`${bot.toFixed(2)} m to floor`); hl.position.copy(P).setY(bot / 2); tvDims.add(hl);
  // viewing distance from the foot of the bed
  if (bed.group) {
    const w = bed.wall, sC = (w.sDoor + w.sEnd) / 2 + bed.offset;
    const foot = w.W.clone().addScaledVector(w.u3, sC).addScaledVector(w.n3, 0.08 + 2.0 + 0.02);
    const d = O.clone().sub(foot).dot(w.n3);
    const A = foot.clone().addScaledVector(w.u3, 0), B = foot.clone().addScaledVector(w.n3, d);
    tvDims.add(dimLine(toBl(A), toBl(B), `${d.toFixed(2)} m bed foot → TV`, 0.62));
  }
  const F = FRAME_SIZES[tv.size];
  const tag = labelSprite(`${F.inch}" The Frame · ${(F.W * 100).toFixed(0)} × ${(F.H * 100).toFixed(0)} cm · ${FRAME_BEZELS[tv.bezel].name}`, { h: 0.032 }); tag.position.copy(O).addScaledVector(n, 0.2).setY(tv.yC + H / 2 + 0.12); tvDims.add(tag);
}
const tvMover = {
  name: 'TV', title: () => `Samsung The Frame ${FRAME_SIZES[tv.size].inch}"`, anchor: () => (tv.group ? tv.group.position.clone().addScaledVector(tv.E.n, 0.3).setY(tv.yC - 0.35) : null),
  axis: () => tv.a,
  shift: (dir) => { const before = tv.offset; tv.offset += dir * 0.05; buildTV(); if (Math.abs(tv.offset - before) < 1e-6) showToast('Can’t go further: closet or wall'); },
  info: () => { const [W, H] = tvSize(); const w = bed.wall, sC = (w.sDoor + w.sEnd) / 2 + bed.offset;
    const head = w.W.clone().addScaledVector(w.u3, sC); const rel = tv.group.position.clone().sub(head); const mis = rel.dot(w.u3);
    const F = FRAME_SIZES[tv.size], free = tv.room.dPos + tv.room.dNeg, fits = free - W > 0.1;
    return `${F.note} · ${F.price} · ${fits ? '' : `⚠ only ${free.toFixed(2)} m of free wall · `}${tv.portrait ? 'portrait' : 'landscape'} · ${Math.abs(mis) < 0.025 ? 'centred on the bed' : `${Math.abs(mis * 100).toFixed(0)} cm off the bed centre`} · ${(rel.dot(w.n3) - 0.3).toFixed(1)} m from the pillows`; },
  variant: { label: () => (tv.portrait ? 'Landscape' : 'Portrait'), run: () => { tv.portrait = !tv.portrait; buildTV(); showToast(tv.portrait ? 'TV in portrait' : 'TV in landscape'); } },
  selects: [
    { id: 'fsize', label: 'Size', options: () => FRAME_SIZES.map((f) => ({ label: `${f.inch}" · ${(f.W * 100).toFixed(1)} × ${(f.H * 100).toFixed(1)} cm` })), get: () => tv.size,
      set: (i) => { tv.size = i; buildTV(); } },
    { id: 'fbezel', label: 'Bezel', options: () => FRAME_BEZELS.map((b) => ({ label: b.name })), get: () => tv.bezel,
      set: (i) => { tv.bezel = i; buildTV(); } },
  ],
  link: () => { const F = FRAME_SIZES[tv.size];
    return { href: F.url || 'https://www.samsung.com/dk/lifestyle-tvs/the-frame/highlights/', text: F.url ? `Samsung DK · ${F.inch}" The Frame ↗` : 'Samsung DK · The Frame range ↗',
      href2: 'https://prisjagt.dk/s/samsung-the-frame/', text2: 'Prices on prisjagt.dk ↗' }; },
};
