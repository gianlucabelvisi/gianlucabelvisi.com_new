// ------------------------------------------------------------ player
const player = { pos: new THREE.Vector3(), yaw: 0, pitch: -0.05, fy: 0 };
function setFeet(y) { player.fy = y; player.pos.y = y + EYE; }
function spawn(id) {
  const s = PLAN.spawns[id];
  player.pos.copy(b2t(s.p[0], s.p[1], (s.fy || 0) + EYE)); player.fy = s.fy || 0;
  const d = b2t(s.t[0], s.t[1]).sub(b2t(s.p[0], s.p[1]));
  player.yaw = Math.atan2(-d.x, -d.z);
  player.pitch = s.pitch || 0;
}
// start on our landing looking towards the lift: front door on the left, the open stair well behind
PLAN.spawns.stair = { p: [4.25, -2.4], t: [7.2, -0.75], pitch: -0.12 };
spawn('stair');

const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const ray = new THREE.Raycaster();
const tmp = new THREE.Vector3();
function blocked(from, step) {
  const len = step.length();
  if (len < 1e-6) return false;
  tmp.copy(step).normalize();
  ray.far = len + RADIUS; ray.firstHitOnly = true;
  const fy = from.y - EYE, list = fy < -0.6 ? outdoorBlockers(from) : collidables;
  for (const h of [0.45, 0.95, 1.55]) {
    ray.set(new THREE.Vector3(from.x, fy + h, from.z), tmp);
    if (ray.intersectObjects(list, false).length) return true;
  }
  return false;
}
// below our floor (stairwell, lobby, street) the buildings and street furniture outside also block you
let _outdoor = null;
function outdoorBlockers(at) {
  if (!_outdoor) {
    _outdoor = [];
    const skip = new Set([MATS.water, MATS.quay, MATS.asphalt, MATS.roadpaint, MATS.deck, MATS.floor, MATS.terrazzo, MATS.entryconcrete, MATS.roof]);
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || collidables.includes(o) || o.userData.walk || !o.visible || skip.has(o.material) || Array.isArray(o.material) && o.material.some((m) => skip.has(m))) return;
      if (o.material && o.material.visible === false) return;
      const bb = new THREE.Box3().setFromObject(o); if (bb.min.y > -6.5 || bb.isEmpty()) return;
      if (o.geometry && !o.geometry.boundsTree && o.geometry.computeBoundsTree && o.geometry.attributes.position.count > 200) o.geometry.computeBoundsTree();
      _outdoor.push({ o, bb });
    });
  }
  const near = collidables.slice();
  for (const e of _outdoor) if (at.x > e.bb.min.x - 3 && at.x < e.bb.max.x + 3 && at.z > e.bb.min.z - 3 && at.z < e.bb.max.z + 3) near.push(e.o);
  return near;
}
// the floor under a point: floors, stair treads, landings, the lift, the quay and the street. null = no floor to step on
const probe = new THREE.Raycaster(); probe.firstHitOnly = false;
let _ground = null;
function groundAt(x, z, fy) {
  if (!_ground) { _ground = pickables.slice(); modelRoot && modelRoot.traverse((o) => { if (o.isMesh && o.name.startsWith('nocollide') && !_ground.includes(o)) _ground.push(o); }); }
  probe.set(new THREE.Vector3(x, fy + 0.5, z), new THREE.Vector3(0, -1, 0)); probe.far = 3.5;
  const hits = probe.intersectObjects(_ground.concat(jsWalk), false);
  const h = hits[0];
  if (!h) return fy > -0.05 ? fy : null;                          // tiny gaps between floor slabs on our floor
  if (h.object.material === MATS.water) return null;
  const y = h.point.y;
  if (y > fy + 0.45 || y < fy - 0.6) return null;                  // too high a step, or a drop
  return y;
}
function tryMove(step) {
  for (const s of [step, new THREE.Vector3(step.x, 0, 0), new THREE.Vector3(0, 0, step.z)]) {
    if (s.lengthSq() < 1e-12 || blocked(player.pos, s)) continue;
    const nx = player.pos.x + s.x, nz = player.pos.z + s.z, g = groundAt(nx, nz, player.fy);
    if (g === null) continue;
    player.pos.x = nx; player.pos.z = nz; setFeet(g); return;
  }
}

// look: pointer lock on desktop, drag fallback, touch joystick + drag
let locked = false;
const canvas = renderer.domElement;
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  $('cross').hidden = !locked || mode !== 'walk';
  showHint();
});
canvas.addEventListener('click', () => {
  if (mode === 'walk' && started && !coarse && !locked && !measuring) {
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* optional */ }
  }
});
document.addEventListener('mousemove', (e) => {
  if (!locked || mode !== 'walk') return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.35, 1.35);
});
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const look = { id: null, x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'walk' || !started) return;
  autoTarget = null;
  if ((e.pointerType === 'touch' || !locked) && look.id === null) {
    Object.assign(look, { id: e.pointerId, x: e.clientX, y: e.clientY });
  }
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* capture is optional */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === joy.id) {
    const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, m = Math.hypot(dx, dy), k = Math.min(1, m / 50) / (m || 1);
    joy.x = dx * k; joy.y = dy * k;
    $('joy').firstElementChild.style.transform = `translate(${joy.x * 32}px, ${joy.y * 32}px)`;
  } else if (e.pointerId === look.id) {
    if (e.pointerType === 'mouse' && !e.buttons) { look.id = null; return; }
    const s = e.pointerType === 'touch' ? 0.005 : 0.004;
    player.yaw += (e.clientX - look.x) * s;
    player.pitch = THREE.MathUtils.clamp(player.pitch + (e.clientY - look.y) * s, -1.35, 1.35);
    look.x = e.clientX; look.y = e.clientY;
  }
});
function endPointer(e) {
  if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; $('joy').hidden = true; $('joy').firstElementChild.style.transform = ''; }
  if (e.pointerId === look.id) look.id = null;
}
addEventListener('pointerup', endPointer);
addEventListener('pointercancel', endPointer);

// ------------------------------------------------------------ modes
let mode = 'walk', started = false;
let focus = null, camTween = null, moveLayer = false, infoLayer = true;   // furniture close-up (info button), camera fly, move-arrows layer
const orbit = new OrbitControls(camera, canvas);
orbit.enabled = false;
orbit.enableDamping = true;
orbit.maxPolarAngle = 1.35;
orbit.minDistance = 4;
orbit.maxDistance = 40;
orbit.touches = { ONE: null, TWO: null };          // touch is handled below; mouse and trackpad stay with OrbitControls
// "From above" on touch: one finger turns the view, two fingers pinch to zoom, twist to rotate and drag to slide. Every time a finger
// lands or lifts the gesture restarts from where it is, so nothing jumps.
const otouch = { pts: new Map(), base: null };
function otBase() {
  const P = [...otouch.pts.values()], c = camera.position, t = orbit.target, off = c.clone().sub(t);
  const sph = new THREE.Spherical().setFromVector3(off);
  const b = { sph, t: t.clone(), p0: P[0] && { ...P[0] } };
  if (P.length >= 2) { b.span = Math.max(20, Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y)); b.ang = Math.atan2(P[1].y - P[0].y, P[1].x - P[0].x); b.mid = { x: (P[0].x + P[1].x) / 2, y: (P[0].y + P[1].y) / 2 }; }
  otouch.base = b;
}
function otApply() {
  const B = otouch.base, P = [...otouch.pts.values()]; if (!B || !P.length) return;
  const sph = B.sph.clone(), t = B.t.clone(), H = canvas.clientHeight || innerHeight;
  if (P.length === 1) {
    const dx = P[0].x - B.p0.x, dy = P[0].y - B.p0.y, k = 2 * Math.PI / H;
    sph.theta -= dx * k; sph.phi = THREE.MathUtils.clamp(sph.phi - dy * k, 0.05, orbit.maxPolarAngle);
  } else {
    const span = Math.max(20, Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y)), ang = Math.atan2(P[1].y - P[0].y, P[1].x - P[0].x);
    let da = ang - B.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    sph.radius = THREE.MathUtils.clamp(B.sph.radius * B.span / span, orbit.minDistance, orbit.maxDistance);
    sph.theta += da;                                                    // the plan turns with your fingers
    const mid = { x: (P[0].x + P[1].x) / 2, y: (P[0].y + P[1].y) / 2 }, m = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * B.sph.radius / H;
    const right = new THREE.Vector3(Math.cos(B.sph.theta), 0, -Math.sin(B.sph.theta)), fwd = new THREE.Vector3(-Math.sin(B.sph.theta), 0, -Math.cos(B.sph.theta));
    t.addScaledVector(right, -(mid.x - B.mid.x) * m).addScaledVector(fwd, (mid.y - B.mid.y) * m / Math.max(0.35, Math.cos(B.sph.phi)));
    t.x = THREE.MathUtils.clamp(t.x, CENTER.x - 14, CENTER.x + 14); t.z = THREE.MathUtils.clamp(t.z, CENTER.z - 14, CENTER.z + 14);
  }
  orbit.target.copy(t); camera.position.copy(t).add(new THREE.Vector3().setFromSpherical(sph)); camera.lookAt(t);
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || mode !== 'over' || camTween) return;
  otouch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); otBase();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (!otouch.pts.has(e.pointerId)) return;
  otouch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (mode === 'over') otApply();
});
const otEnd = (e) => { if (!otouch.pts.delete(e.pointerId)) return; otBase(); };
addEventListener('pointerup', otEnd); addEventListener('pointercancel', otEnd);
// never let a pinch zoom the page itself (iOS Safari ignores touch-action inside the blog's iframe for gestures)
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
function setOverlayDepth(test) {
  lineMat.depthTest = test; lineMat.needsUpdate = true;
}
function setMode(m, internal) {
  if (focus && !internal) { const f = focus; focus = null; endFocusLook(); if (selected === f.mover) selectFurniture(null); }
  mode = m; shadowDirty = true;
  setOverlayDepth(m === 'walk');
  $('mWalk').setAttribute('aria-pressed', m === 'walk');
  $('mOver').setAttribute('aria-pressed', m === 'over');
  if (ceiling) ceiling.visible = m === 'walk';
  for (const o of aboveMeshes) o.visible = m === 'walk';
  orbit.enabled = m === 'over';
  if (m === 'over') {
    if (document.pointerLockElement) document.exitPointerLock();
    orbit.target.copy(CENTER);
    camera.position.copy(CENTER).add(new THREE.Vector3(1.5, 15, 8.5));
    orbit.update();
  } else {
    camera.rotation.set(player.pitch, player.yaw, 0);
  }
  $('cross').hidden = true;
  showHint();
}
$('mWalk').addEventListener('click', () => { setMode('walk'); closeMenu(); });
$('mOver').addEventListener('click', () => { setMode('over'); closeMenu(); });
// overview: double-click / double-tap the floor to walk there
// Only clean taps count: one finger, hardly moved, quick. (Lifting two fingers after a pinch used to read as a double tap and
// dropped you into the walk view.)
let lastTap = null; const tapDown = new Map();
canvas.addEventListener('pointerdown', (e) => {
  const multi = tapDown.size > 0; for (const d of tapDown.values()) d.multi = true;
  tapDown.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), multi });
});
addEventListener('pointercancel', (e) => tapDown.delete(e.pointerId));
canvas.addEventListener('pointerup', (e) => {
  const d = tapDown.get(e.pointerId); tapDown.delete(e.pointerId);
  if (mode !== 'over' || focus) return;
  const now = performance.now();
  if (!d || d.multi || now - d.t > 300 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) { lastTap = null; return; }
  const prev = lastTap; lastTap = { t: now, x: e.clientX, y: e.clientY };
  if (prev && now - prev.t < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40) {
    lastTap = null;
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.far = Infinity;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) {
      const f = new THREE.Vector3(); camera.getWorldDirection(f);
      player.pos.set(hit.point.x, hit.point.y + EYE, hit.point.z); player.fy = hit.point.y;
      player.yaw = Math.atan2(-f.x, -f.z); player.pitch = -0.05;
      setMode('walk');
    }
  }
});

// ------------------------------------------------------------ on-screen joystick (touch)
const joyBase = $('joyBase'), joyKnob = joyBase.querySelector('i');
joyBase.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const r = joyBase.getBoundingClientRect();
  Object.assign(joy, { id: e.pointerId, ox: r.left + r.width / 2, oy: r.top + r.height / 2, x: 0, y: 0 });
  autoTarget = null;
  try { joyBase.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
  moveJoy(e);
});
function moveJoy(e) {
  if (e.pointerId !== joy.id) return;
  const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, m = Math.hypot(dx, dy), k = Math.min(1, m / 48) / (m || 1);
  joy.x = dx * k; joy.y = dy * k;
  joyKnob.style.transform = `translate(${joy.x * 38}px, ${joy.y * 38}px)`;
}
joyBase.addEventListener('pointermove', moveJoy);
const endJoy = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; joyKnob.style.transform = ''; } };
joyBase.addEventListener('pointerup', endJoy);
joyBase.addEventListener('pointercancel', endJoy);

// ------------------------------------------------------------ tap the floor to walk there (touch)
let autoTarget = null;
const tapRing = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 32), new THREE.MeshBasicMaterial({ color: 0xcf9152, transparent: true, opacity: 0.9, depthTest: false, toneMapped: false }));
tapRing.rotation.x = -Math.PI / 2; tapRing.visible = false; tapRing.renderOrder = 33; scene.add(tapRing);
canvas.addEventListener('click', (e) => {
  if (!coarse || !started || mode !== 'walk' || measuring) return;
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.far = 25; ray.setFromCamera(ndc, camera);
  const all = ray.intersectObject(modelRoot, true).filter((h) => h.object.material !== MATS.glass);
  const hit = all[0];
  if (!hit || !pickables.includes(hit.object)) return;
  autoTarget = new THREE.Vector3(hit.point.x, EYE, hit.point.z);
  tapRing.position.set(hit.point.x, hit.point.y + 0.02, hit.point.z); tapRing.visible = true;
});
function stepAuto(dt) {
  if (!autoTarget) { tapRing.visible = false; return; }
  const to = new THREE.Vector3(autoTarget.x - player.pos.x, 0, autoTarget.z - player.pos.z);
  const d = to.length();
  if (d < 0.12) { autoTarget = null; tapRing.visible = false; return; }
  // turn towards the target, then walk
  const want = Math.atan2(-to.x, -to.z);
  let dy = want - player.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  player.yaw += dy * Math.min(1, dt * 5);
  const before = player.pos.clone();
  tryMove(to.normalize().multiplyScalar(Math.min(d, (running ? 3.0 : 1.4) * dt)));
  if (player.pos.distanceTo(before) < 1e-4) { autoTarget = null; tapRing.visible = false; }   // blocked
}

// ------------------------------------------------------------ quick bar: view mode, time of day (the old menu drawer is gone;
// its toggles stay hidden in the DOM as the state the quick-bar buttons drive)
function openMenu() { /* no drawer any more */ }
function closeMenu() { $('timePop').hidden = true; $('qTime').setAttribute('aria-pressed', 'false'); }
$('qView').addEventListener('click', () => setMode(mode === 'walk' ? 'over' : 'walk'));
{ const pop = $('timePop'); pop.append($('sun'), document.querySelector('.sunmarks'), $('sunlabel')); }
$('qTime').addEventListener('click', () => { const open = $('timePop').hidden; if (open) $('timePop').style.top = `${Math.max(8, $('qTime').getBoundingClientRect().top - 6)}px`; $('timePop').hidden = !open; $('qTime').setAttribute('aria-pressed', open); if (open && document.pointerLockElement) document.exitPointerLock(); });
canvas.addEventListener('pointerdown', () => { if (!$('timePop').hidden) closeMenu(); });
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey || !$('lightbox').hidden) return;
  if (e.code === 'KeyV' && !e.repeat) setMode(mode === 'walk' ? 'over' : 'walk');
  else if (e.code === 'KeyH' && !e.repeat) $('qTime').click();
  else if (e.code === 'Escape' && !$('timePop').hidden) closeMenu();
});
// the bar can fold away to one small button (phones start folded: less to look at); remembered per browser
function setQuickMin(min, save) {
  const q = $('quick'), b = $('qHide'); q.classList.toggle('min', min);
  b.setAttribute('aria-expanded', String(!min)); b.setAttribute('aria-label', min ? 'Show the bar' : 'Hide the bar'); b.title = min ? 'Show the bar (B)' : 'Hide the bar (B)';
  if (min) closeMenu();
  if (save) try { localStorage.setItem('aptQuickMin', min ? '1' : '0'); } catch (_) { /* private mode */ }
}
{ let v = null; try { v = localStorage.getItem('aptQuickMin'); } catch (_) { /* ignore */ }
  setQuickMin(v === null ? (coarse && innerWidth < 720) : v === '1'); }
$('qHide').addEventListener('click', () => setQuickMin(!$('quick').classList.contains('min'), true));
addEventListener('keydown', (e) => { if (e.code === 'KeyB' && !e.repeat && e.target.tagName !== 'INPUT' && !e.metaKey && !e.ctrlKey && !e.altKey) $('qHide').click(); });
toggle($('tMap'), null, (on) => { $('mapwrap').hidden = !on; });
if (coarse) { $('tMap').setAttribute('aria-pressed', 'false'); $('mapwrap').hidden = true; }
syncQuick();
function updateHud() {
  $('joyBase').hidden = !(coarse && started && mode === 'walk');
  $('qView').setAttribute('aria-pressed', mode === 'over');
}

function showHint() {
  updateHud();
  const h = $('hint');
  if (!started || coarse) { h.hidden = true; return; }
  if (measuring) { h.textContent = locked ? 'Aim the dot and click to drop a point · Esc to use the pointer' : 'Click two points to measure · Ctrl/Cmd+Z undoes the last one'; h.hidden = false; }
  else if (mode === 'over') { h.textContent = 'Drag to orbit · scroll to zoom · double-click a floor to walk there'; h.hidden = false; }
  else if (!locked) { h.textContent = 'Click the view to look around · W A S D to move · R to run'; h.hidden = false; }
  else h.hidden = true;
}

$('go').addEventListener('click', () => {
  $('intro').hidden = true;
  started = true;
  setTimeout(() => { try { prewarmShaders(); } catch (_) { /* best effort */ } }, 0);
  if (!coarse) {
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* optional */ }
  }
  canvas.focus();
  showHint();
  startArrow();
});
// ------------------------------------------------------------ first-seconds hint: a pulsing arrow by the front door pointing at it
// (shows for 5 s after the intro closes, gone as soon as you start walking; looking around doesn't count)
const hintArrow = (() => {
  const sh = new THREE.Shape();                          // arrow in its own XY plane, pointing along +x
  sh.moveTo(-0.28, 0.07); sh.lineTo(0.02, 0.07); sh.lineTo(0.02, 0.17); sh.lineTo(0.28, 0); sh.lineTo(0.02, -0.17); sh.lineTo(0.02, -0.07); sh.lineTo(-0.28, -0.07); sh.closePath();
  const mat = new THREE.MeshBasicMaterial({ color: 0xcf9152, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
  const g = new THREE.Group(); g.add(m); g.visible = false; g.renderOrder = 30;
  // 0.55 m out from the front door (leaf spans x 5.46–6.50 at y≈0.23), 1.15 m up; the arrow lies in a plane facing the start spot and points +y (into the door)
  g.position.copy(b2t(5.98, -0.55, 1.15));
  const along = b2t(0, 1).normalize(), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3().crossVectors(along, up);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, up, nrm));
  g.lookAtStart = () => { const to = b2t(2.0, -1.5, 1.2).sub(g.position); if (to.dot(nrm) < 0) g.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI); };
  g.lookAtStart();
  scene.add(g);
  return { g, m, mat, t0: 0, on: false };
})();
function startArrow() { hintArrow.t0 = performance.now(); hintArrow.on = true; hintArrow.g.visible = true; }
function stopArrow() { hintArrow.on = false; }
function updateArrow() {
  const H = hintArrow; if (!H.g.visible) return;
  const t = (performance.now() - H.t0) / 1000;
  if (t > 5) H.on = false;
  if (!H.on) { H.mat.opacity -= 0.06; if (H.mat.opacity <= 0) { H.mat.opacity = 0; H.g.visible = false; } return; }
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.2);
  H.mat.opacity = Math.min(1, t * 3) * (0.6 + 0.4 * pulse);
  H.m.scale.setScalar(0.92 + 0.12 * pulse);
  H.m.position.x = 0.08 * pulse;                        // nudges towards the door
}

// ------------------------------------------------------------ rooms, chips, minimap
const ROOM_BY_ID = Object.fromEntries(PLAN.rooms.map((r) => [r.id, r]));
const chipDefs = [['stair', 'Stairwell'], ['living', 'Living'], ['kitchen', 'Kitchen'], ['hall', 'Entré'], ['vaer', 'Værelse'], ['bed', 'Bedroom'], ['bath', 'Bathroom'], ['bal', 'Balcony']];
for (const [id, label] of chipDefs) {
  const b = document.createElement('button');
  b.className = 'chip'; b.textContent = label; b.dataset.room = id === 'kitchen' ? 'living' : id;
  b.addEventListener('click', () => { spawn(id); setMode('walk'); closeMenu(); });
  $('chips').appendChild(b);
}
function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const order = ['stair', 'bath', 'tek', 'vaer', 'bed', 'bal', 'living', 'hall'];
let currentRoom = null;
function updateRoom() {
  const x = player.pos.x, y = -player.pos.z;
  let found = null;
  if (player.fy < -0.3 || player.fy > 0.3) {
    const lab = levelLabel(), key = lab ? lab.join('|') : 'out';
    if (key === updateRoom.key) return; updateRoom.key = key; currentRoom = null;
    $('roomDa').textContent = lab ? lab[0] : 'Udenfor'; $('roomEn').textContent = lab ? lab[1] : 'Outside · Sluseholmen'; $('roomDim').textContent = '';
    for (const c of $('chips').children) c.classList.remove('here');
    return;
  }
  for (const id of order) if (inPoly(x, y, ROOM_BY_ID[id].poly)) { found = id; break; }
  if (!found) { const lab = levelLabel(); if (lab) { const key = lab.join('|'); if (key === updateRoom.key) return; updateRoom.key = key; currentRoom = null; $('roomDa').textContent = lab[0]; $('roomEn').textContent = lab[1]; $('roomDim').textContent = ''; return; } }
  if (found === currentRoom && !updateRoom.key) return; updateRoom.key = null;
  currentRoom = found;
  const r = found ? ROOM_BY_ID[found] : null;
  $('roomDa').textContent = r ? r.da : 'Udenfor';
  $('roomEn').textContent = r ? r.en : 'Outside';
  $('roomDim').textContent = r ? r.dim : '';
  for (const c of $('chips').children) c.classList.toggle('here', c.dataset.room === found);
}

const map = $('map'), mg = map.getContext('2d');
const all = PLAN.walls.flat(2).concat(PLAN.balcony, ROOM_BY_ID.stair.poly);
const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
let mapXf = null;
map.addEventListener('click', (e) => {
  if (!mapXf || !started) return;
  const r = map.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const x = minX + (mx - mapXf.ox) / mapXf.s, y = minY + (mapXf.H - mapXf.oy - my) / mapXf.s;
  let px = x, py = y;
  if (!PLAN.rooms.some((rm) => inPoly(px, py, rm.poly))) {
    // tapped on a wall or just outside: slide towards the nearest room's middle until inside
    let best = null, bd = Infinity;
    for (const rm of PLAN.rooms) { const c = rm.poly.reduce((a, p) => [a[0] + p[0] / rm.poly.length, a[1] + p[1] / rm.poly.length], [0, 0]); const d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = c; } }
    if (bd > 2.5) { showToast('Tap inside the flat to go there'); return; }
    for (let k = 1; k <= 20 && !PLAN.rooms.some((rm) => inPoly(px, py, rm.poly)); k++) { px = x + (best[0] - x) * k / 20; py = y + (best[1] - y) * k / 20; }
    px = x + (px - x) * 1.15; py = y + (py - y) * 1.15;          // a little further in, away from the wall
  }
  const x2 = px, y2 = py;
  autoTarget = null;
  player.pos.set(x2, EYE, -y2); player.fy = 0;
  setMode('walk');
});
map.style.cursor = 'crosshair';
function drawMap() {
  if ($('mapwrap').hidden) return;
  const key = [Math.round(player.pos.x * 50), Math.round(player.pos.z * 50), Math.round(player.yaw * 60), currentRoom, plugsGroup.visible, pinsGroup.visible, map.clientWidth].join('|');
  if (key === drawMap.key) return; drawMap.key = key;
  const dpr = devicePixelRatio || 1, W = map.clientWidth, H = map.clientHeight;
  if (map.width !== Math.round(W * dpr)) { map.width = Math.round(W * dpr); map.height = Math.round(H * dpr); }
  mg.setTransform(dpr, 0, 0, dpr, 0, 0);
  mg.clearRect(0, 0, W, H);
  const pad = 6, s = Math.min((W - 2 * pad) / (maxX - minX), (H - 2 * pad) / (maxY - minY));
  const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxY - minY) * s) / 2;
  const tx = (x) => ox + (x - minX) * s, ty = (y) => H - oy - (y - minY) * s;
  mapXf = { ox, oy, s, H };
  const path = (ring) => { mg.moveTo(tx(ring[0][0]), ty(ring[0][1])); for (const p of ring.slice(1)) mg.lineTo(tx(p[0]), ty(p[1])); mg.closePath(); };
  mg.fillStyle = 'rgba(242,237,228,.07)'; mg.beginPath(); path(PLAN.floor); path(PLAN.balcony); path(ROOM_BY_ID.stair.poly); mg.fill();
  if (currentRoom) { mg.fillStyle = 'rgba(207,145,82,.30)'; mg.beginPath(); path(ROOM_BY_ID[currentRoom].poly); mg.fill(); }
  mg.fillStyle = 'rgba(242,237,228,.82)';
  for (const rings of PLAN.walls) { mg.beginPath(); for (const r of rings) path(r); mg.fill('evenodd'); }
  mg.strokeStyle = 'rgba(242,237,228,.5)'; mg.lineWidth = 1; mg.beginPath(); path(PLAN.balcony); mg.stroke();
  if (plugsGroup.visible) { mg.fillStyle = '#f2ede4'; for (const o of PLAN.outlets) { mg.beginPath(); mg.arc(tx(o.p[0]), ty(o.p[1]), 2.6, 0, 7); mg.fill(); } }
  if (pinsGroup.visible) for (const sh of PLAN.shots) { if (!sh.p) continue; mg.fillStyle = sh.kind === 'render' ? '#cf9152' : '#f2ede4'; mg.fillRect(tx(sh.p[0]) - 2.5, ty(sh.p[1]) - 2.5, 5, 5); }
  // player + view cone (yaw 0 looks toward -z = plan up)
  const px = tx(player.pos.x), py = ty(-player.pos.z);
  const a = -player.yaw - Math.PI / 2, fov = 0.55;
  const cone = mg.createRadialGradient(px, py, 0, px, py, 30);
  cone.addColorStop(0, 'rgba(207,145,82,.55)'); cone.addColorStop(1, 'rgba(207,145,82,0)');
  mg.fillStyle = cone; mg.beginPath(); mg.moveTo(px, py); mg.arc(px, py, 30, a - fov, a + fov); mg.closePath(); mg.fill();
  mg.fillStyle = '#cf9152'; mg.beginPath(); mg.arc(px, py, 4, 0, Math.PI * 2); mg.fill();
  mg.strokeStyle = '#1a1814'; mg.lineWidth = 1.5; mg.stroke();
}


// ------------------------------------------------------------ overlays: dimensions, sockets, tape measure
const occludable = [];
function labelSprite(text, { bg = 'rgba(22,20,16,.94)', fg = '#f3c998', border = '#cf9152', h = 0.036 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const font = '700 52px "Schibsted Grotesk", Arial, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 52, hp = 84;
  c.width = w; c.height = hp;
  g.font = font;
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 8;
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(4, 4, w - 8, hp - 8, 18); g.fill();
  g.shadowBlur = 0;
  g.lineWidth = 4; g.strokeStyle = border; g.stroke();
  g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(text, 26, hp / 2 + 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false, toneMapped: false });
  const sp = new THREE.Sprite(m);
  sp.scale.set(h * w / hp, h, 1);
  sp.renderOrder = 30;
  occludable.push(sp);
  return sp;
}
const lineMat = new THREE.LineBasicMaterial({ color: 0xcf9152, depthTest: true, transparent: true, toneMapped: false });
function dimLine(a, b, label, y) {
  const g = new THREE.Group();
  const A = b2t(a[0], a[1], y), B = b2t(b[0], b[1], y);
  const dir = B.clone().sub(A).normalize(), n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.12);
  const pts = [A, B, A.clone().add(n), A.clone().sub(n), B.clone().add(n), B.clone().sub(n)];
  const geo = new THREE.BufferGeometry().setFromPoints([pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]]);
  const ls = new THREE.LineSegments(geo, lineMat); ls.renderOrder = 29;
  g.add(ls);
  const sp = labelSprite(label); sp.position.copy(A).lerp(B, 0.5); g.add(sp);
  return g;
}
const dimsGroup = new THREE.Group(), plugsGroup = new THREE.Group(), measureGroup = new THREE.Group();
dimsGroup.visible = plugsGroup.visible = false;
scene.add(dimsGroup, plugsGroup, measureGroup);
document.fonts.ready.then(() => {
  for (const d of PLAN.dims) dimsGroup.add(dimLine(d.a, d.b, d.label, 0.06));
  for (const o of PLAN.outlets) {
    const base = b2t(o.p[0], o.p[1], o.z), nn = b2t(o.n[0], o.n[1]).multiplyScalar(0.02);
    const top = base.clone().add(nn).add(new THREE.Vector3(0, 0.22, 0));
    const geo = new THREE.BufferGeometry().setFromPoints([base.clone().add(nn), top]);
    const l = new THREE.Line(geo, lineMat); l.renderOrder = 29; plugsGroup.add(l);
    const icon = o.kind === 'switch' ? 'Switch' : (o.kind === 'socket2' ? 'Double socket' : 'Socket');
    const sp = labelSprite(`${icon} · ${o.z.toFixed(2)} m`, { bg: 'rgba(244,240,232,.96)', fg: '#16140f', border: '#16140f', h: 0.032 });
    sp.position.copy(top).add(new THREE.Vector3(0, 0.05, 0)); plugsGroup.add(sp);
  }
});
function syncQuick() { for (const q of document.querySelectorAll('#quick button[data-for]')) q.setAttribute('aria-pressed', $(q.dataset.for).getAttribute('aria-pressed')); }
function toggle(btn, group, extra) {
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', on);
    if (group) group.visible = on;
    if (extra) extra(on);
    syncQuick();
  });
}
for (const q of document.querySelectorAll('#quick button[data-for]')) q.addEventListener('click', () => $(q.dataset.for).click());
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  const map = { KeyP: 'tPhotos', KeyZ: 'tDims', KeyK: 'tPlugs', KeyT: 'tMeasure', KeyM: 'tMap' };
  if (map[e.code]) { $(map[e.code]).click(); }
  if (e.code === 'KeyR' && !selected && !e.repeat) setRun(!running);
});
// run toggle: double walking speed until switched off (Shift still flips it while held)
let running = false;
function setRun(on) { running = on; $('qRun').setAttribute('aria-pressed', on); showToast(on ? 'Running' : 'Walking'); }
$('qRun').addEventListener('click', () => setRun(!running));
let measuring = false, mA = null;
toggle($('tDims'), dimsGroup);
toggle($('tPlugs'), plugsGroup);
toggle($('tMeasure'), null, (on) => {
  measuring = on; mA = null; clearPending();
  measureGroup.visible = on || measurements.length > 0;
  $('measureOut').hidden = !on;
  updateMeasureUi();
  showHint();
});
// ---- tape measure: every pair of points stays until "Clear all measurements"
const measurements = [];          // { objs: [...] }
let pendingDot = null;
function dotSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fillStyle = 'rgba(22,20,16,.85)'; g.fill();
  g.beginPath(); g.arc(32, 32, 20, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
  g.beginPath(); g.arc(32, 32, 12, 0, Math.PI * 2); g.fillStyle = '#cf9152'; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const dotTex = dotSprite();
function makeDot(p) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false, toneMapped: false }));
  sp.scale.set(0.028, 0.028, 1); sp.position.copy(p); sp.renderOrder = 34;
  return sp;
}
const tapeMat = new THREE.MeshBasicMaterial({ color: 0xcf9152, depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
const tapeEdgeMat = new THREE.MeshBasicMaterial({ color: 0x16140f, depthTest: false, depthWrite: false, transparent: true, opacity: 0.8, toneMapped: false });
function makeTape(a, b) {
  const g = new THREE.Group();
  const len = a.distanceTo(b), mid = a.clone().lerp(b, 0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 8), tapeEdgeMat);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, len, 8), tapeMat);
  for (const m of [edge, core]) { m.position.copy(mid); m.quaternion.copy(q); g.add(m); }
  edge.renderOrder = 32; core.renderOrder = 33;
  return g;
}
function disposeObj(o) {
  o.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material && c.material !== tapeMat && c.material !== tapeEdgeMat) { if (c.material.map && c.material.map !== dotTex) c.material.map.dispose(); c.material.dispose(); } });
  const i = occludable.indexOf(o); if (i >= 0) occludable.splice(i, 1);
}
function clearPending() { if (pendingDot) { measureGroup.remove(pendingDot); disposeObj(pendingDot); pendingDot = null; } }
function clearMeasurements() {
  clearPending(); mA = null;
  for (const m of measurements) for (const o of m.objs) { measureGroup.remove(o); disposeObj(o); }
  measurements.length = 0;
  updateMeasureUi();
}
function updateMeasureUi() {
  const n = measurements.length;
  $('mClear').disabled = n === 0 && !pendingDot;
  $('mClear').textContent = n ? `Clear all measurements (${n})` : 'Clear all measurements';
  $('mUndo').disabled = n === 0;
  if (!measuring) return;
  if (mA) { $('measureVal').textContent = 'Now pick the end'; $('measureSub').textContent = 'Tap or click the second point.'; }
  else if (n) {
    const last = measurements[n - 1];
    $('measureVal').textContent = `${last.d.toFixed(2)} m`;
    $('measureSub').textContent = `Horizontal ${last.dh.toFixed(2)} m · vertical ${last.dv.toFixed(2)} m. Pick a new first point to add another.`;
  } else { $('measureVal').textContent = 'Pick a first point'; $('measureSub').textContent = 'Tap or click on any surface; every measurement stays until you clear it.'; }
}
function measureAt(clientX, clientY) {
  if (!modelRoot) return;
  const ndc = locked ? new THREE.Vector2(0, 0)
    : new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  ray.far = 60;
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(modelRoot, true).find((h) => h.object.material !== MATS.glass);
  if (!hit) return;
  const p = hit.point.clone();
  if (!mA) {
    mA = p; pendingDot = makeDot(p); measureGroup.add(pendingDot);
    updateMeasureUi();
    return;
  }
  const d = mA.distanceTo(p);
  if (d < 0.01) return;             // same spot clicked twice: keep waiting for the end point
  const tape = makeTape(mA, p), dotB = makeDot(p);
  const sp = labelSprite(`${d.toFixed(2)} m`, { h: 0.04 });
  sp.position.copy(mA).lerp(p, 0.5); sp.renderOrder = 35;
  const i = occludable.indexOf(sp); if (i >= 0) occludable.splice(i, 1);   // measurement labels always visible
  measureGroup.add(tape, dotB, sp);
  measurements.push({ objs: [pendingDot, tape, dotB, sp], d, dh: Math.hypot(p.x - mA.x, p.z - mA.z), dv: Math.abs(p.y - mA.y) });
  pendingDot = null; mA = null;
  updateMeasureUi();
}
$('mClear').addEventListener('click', clearMeasurements);
$('mClear2').addEventListener('click', clearMeasurements);
$('mUndo').addEventListener('click', () => {
  if (pendingDot) { clearPending(); mA = null; }
  else { const m = measurements.pop(); if (m) for (const o of m.objs) { measureGroup.remove(o); disposeObj(o); } }
  updateMeasureUi();
});
addEventListener('keydown', (e) => {
  if (!measuring || e.target.tagName === 'INPUT') return;
  if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') { e.preventDefault(); $('mUndo').click(); }
});
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!measuring || !downAt || !started) return;
  if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  if (joy.id !== null && e.pointerId === joy.id) return;
  measureAt(e.clientX, e.clientY);
});

// ------------------------------------------------------------ photo & render pins (Google-Maps style)
const MEDIA = document.getElementById('stage').dataset.media || 'media/';
function pinTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2);
  g.fillStyle = kind === 'render' ? '#cf9152' : '#f2ede4'; g.fill();
  g.lineWidth = 8; g.strokeStyle = 'rgba(22,20,16,.85)'; g.stroke();
  const ink = kind === 'render' ? '#1a1208' : '#1a1814';
  g.fillStyle = ink;
  g.beginPath(); g.roundRect(30, 46, 68, 44, 8); g.fill();
  g.beginPath(); g.roundRect(50, 38, 26, 12, 3); g.fill();
  g.beginPath(); g.arc(64, 68, 14, 0, Math.PI * 2); g.fillStyle = kind === 'render' ? '#cf9152' : '#f2ede4'; g.fill();
  g.beginPath(); g.arc(64, 68, 8, 0, Math.PI * 2); g.fillStyle = ink; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const pinTex = { photo: pinTexture('photo'), render: pinTexture('render') };
const pinsGroup = new THREE.Group();
scene.add(pinsGroup);
const shots = PLAN.shots;
const pinSprites = [];
for (const [i, sh] of shots.entries()) {
  if (!sh.p) continue;
  const m = new THREE.SpriteMaterial({ map: pinTex[sh.kind], depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false, toneMapped: false });
  const sp = new THREE.Sprite(m);
  sp.scale.set(0.05, 0.05, 1);
  sp.position.copy(b2t(sh.p[0], sh.p[1], (sh.z || 1.5) + 0.35));
  sp.renderOrder = 32;
  sp.userData.shot = i;
  pinsGroup.add(sp); pinSprites.push(sp); occludable.push(sp);
}
const pinRay = new THREE.Raycaster();
function pinAt(clientX, clientY) {
  if (!pinsGroup.visible || !$('lightbox').hidden) return null;
  const ndc = locked ? new THREE.Vector2(0, 0)
    : new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  pinRay.setFromCamera(ndc, camera);
  const hits = pinRay.intersectObjects(pinSprites, false);
  if (!hits.length) return null;
  // in walk mode ignore pins hidden behind walls
  if (mode === 'walk' && modelRoot) {
    const wall = pinRay.intersectObject(modelRoot, true).find((h) => h.object.material !== MATS.glass);
    if (wall && wall.distance < hits[0].distance) return null;
  }
  return hits[0].object.userData.shot;
}
let lbIndex = 0;
const lbOrder = shots.map((_, i) => i);
function openShot(i) {
  lbIndex = i;
  const sh = shots[i];
  if (document.pointerLockElement) document.exitPointerLock();
  $('lbImg').src = MEDIA + sh.id + '.jpg';
  $('lbImg').alt = sh.title;
  $('lbKind').textContent = 'Blender render · Cycles';
  $('lbTitle').textContent = sh.title;
  $('lbRoom').textContent = sh.room;
  $('lbGo').hidden = !sh.p;
  $('lightbox').hidden = false;
  $('lbClose').focus();
}
function closeShot() { $('lightbox').hidden = true; canvas.focus(); }
function stepShot(d) { openShot((lbIndex + d + shots.length) % shots.length); }
$('lbClose').addEventListener('click', closeShot);
$('lbPrev').addEventListener('click', () => stepShot(-1));
$('lbNext').addEventListener('click', () => stepShot(1));
$('lbGo').addEventListener('click', () => {
  const sh = shots[lbIndex];
  player.pos.copy(b2t(sh.p[0], sh.p[1], EYE)); player.fy = 0;
  const d = b2t(sh.t[0], sh.t[1]).sub(b2t(sh.p[0], sh.p[1]));
  player.yaw = Math.atan2(-d.x, -d.z); player.pitch = 0;
  closeShot(); closeMenu(); setMode('walk');
});
$('lightbox').addEventListener('click', (e) => { if (e.target === $('lightbox') || e.target.tagName === 'FIGURE') closeShot(); });
addEventListener('keydown', (e) => {
  if ($('lightbox').hidden) return;
  if (e.key === 'Escape') closeShot();
  else if (e.key === 'ArrowRight') stepShot(1);
  else if (e.key === 'ArrowLeft') stepShot(-1);
  e.stopPropagation();
}, true);
// gallery
for (const [i, sh] of shots.entries()) {
  const b = document.createElement('button');
  b.innerHTML = `<img loading="lazy" alt=""><span></span>`;
  b.querySelector('img').src = MEDIA + sh.id + '_t.jpg';
  b.querySelector('img').alt = sh.title;
  const tag = b.querySelector('span');
  tag.textContent = sh.room === 'Overview' ? 'Overview' : sh.room;
  tag.className = 'r';
  b.addEventListener('click', () => openShot(i));
  (sh.p ? $('gRenders') : $('gOverview')).appendChild(b);
}
toggle($('tPhotos'), pinsGroup);
pinsGroup.visible = false;
// click routing: pins win over pointer-lock / measuring
canvas.addEventListener('click', (e) => {
  if (!started) return;
  const i = pinAt(e.clientX, e.clientY);
  if (i !== null) { e.stopImmediatePropagation(); openShot(i); }
}, true);
canvas.addEventListener('pointerup', (e) => {
  if (!started || !downAt) return;
  if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  if (pinAt(e.clientX, e.clientY) !== null) e.stopImmediatePropagation();
}, true);
let hoverTick = 0;
canvas.addEventListener('pointermove', (e) => {
  if (locked || coarse || (hoverTick++ % 3)) return;
  canvas.style.cursor = pinAt(e.clientX, e.clientY) !== null || overFurniture(e.clientX, e.clientY) ? 'pointer' : '';
});
function overFurniture(cx, cy) {
  if (!bed.parts) return false;
  pinRay.setFromCamera(new THREE.Vector2((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1), camera);
  const h = pinRay.intersectObjects(bed.parts, false)[0];
  return !!h && h.distance < 8;
}
function updatePinTip() {
  $('pinTip').hidden = !(locked && mode === 'walk' && pinAt(0, 0) !== null);
}

// ------------------------------------------------------------ occlusion for labels and pins (walk mode)
const occRay = new THREE.Raycaster();
const occV = new THREE.Vector3(), occD = new THREE.Vector3();
let occTick = 0;
let _occ = null, _occN = -1, _occT = 0;
function ensureBVH(o) { const g = o.geometry; if (g && !g.boundsTree && g.computeBoundsTree && g.attributes.position && g.attributes.position.count > 300) g.computeBoundsTree(); }
function occluders() { if (_occN !== collidables.length || ++_occT % 15 === 0) { _occ = collidables.filter((o) => o.material !== MATS.glass); _occN = collidables.length; for (const o of _occ) ensureBVH(o); } return _occ; }
function updateOcclusion() {
  if (occTick++ % 4) return;
  const occ = occluders();
  for (const sp of occludable) {
    if (!sp.parent) continue;
    if (mode !== 'walk') { sp.visible = true; continue; }
    sp.getWorldPosition(occV);
    const d = occV.distanceTo(camera.position);
    if (d > 11) { sp.visible = false; continue; }
    occD.copy(occV).sub(camera.position).normalize();
    occRay.set(camera.position, occD);
    occRay.far = Math.max(0.01, d - 0.15);
    sp.visible = occRay.intersectObjects(occ, false).length === 0;
  }
}

