// ============================================================ walking, looking, the view from above, HUD and mini map
const player = { pos: new THREE.Vector3(), fy: 0, yaw: 0, pitch: -0.02 };
function setFeet(fy) { player.fy = fy; player.pos.y = fy + EYE; }
function placeAt(px, py, z, lookPx, lookPy) {
  const c = P(px, py); player.pos.set(c[0], z + EYE, -c[1]); player.fy = z;
  if (lookPx !== undefined) { const t = P(lookPx, lookPy); player.yaw = Math.atan2(-(t[0] - c[0]), (t[1] - c[1])) ; }
}
// spawn: on the Rådmansgatan pavement in front of the main door (left arch of the gateway house)
function spawn() {
  const sc = (GATEWAY.s0 + GATEWAY.s1) / 2, p = GATEWAY.at(sc, 3.4), t = GATEWAY.at(sc, 0);
  player.pos.set(p[0], EYE, -p[1]); player.fy = 0; player.yaw = Math.atan2(-(t[0] - p[0]), t[1] - p[1]); player.pitch = 0.02;
}
spawn();

const keys = {};
let running = false;
const ray = new THREE.Raycaster();
const _dn = new THREE.Vector3(0, -1, 0);
function blocked(from, dir, dist) {
  for (const h of [0.3, 0.7, 1.1, 1.55]) {
    ray.set(_v.set(from.x, player.fy + h, from.z), dir); ray.far = dist + RADIUS;
    const hit = ray.intersectObjects(collidables, false)[0];
    if (hit) return hit;
  }
  return null;
}
function groundAt(x, z, fy) {
  ray.set(_v.set(x, fy + 0.5, z), _dn); ray.far = 1.4;
  const hits = ray.intersectObjects(floors, false);
  for (const h of hits) { const gy = h.point.y; if (gy <= fy + 0.46 && gy >= fy - 0.65) return gy; }
  return null;
}
function tryMove(dx, dz) {
  const len = Math.hypot(dx, dz); if (len < 1e-5) return false;
  const dir = new THREE.Vector3(dx / len, 0, dz / len);
  let moved = false;
  const go = (d, l) => {
    if (blocked(player.pos, d, l)) return false;
    const nx = player.pos.x + d.x * l, nz = player.pos.z + d.z * l;
    const gy = groundAt(nx, nz, player.fy); if (gy === null) return false;
    player.pos.x = nx; player.pos.z = nz; setFeet(gy); return true;
  };
  if (go(dir, len)) return true;
  // slide along walls
  for (const d of [new THREE.Vector3(dir.x, 0, 0), new THREE.Vector3(0, 0, dir.z)]) { const l = d.length() * len; if (l < 1e-4) continue; d.normalize(); if (go(d, l)) moved = true; }
  return moved;
}

// ---- look: pointer lock on desktop, drag on touch; joystick for walking on touch
const canvas = renderer.domElement;
let locked = false;
// desktop: a click on a door, lamp or cupboard uses it; a click elsewhere captures the mouse for looking around
// (Esc gives the pointer back); dragging with the button held also looks around without capturing.
let lastDrag = 0;
canvas.addEventListener('click', (e) => {
  if (mode === 'over' || coarse || !started) return;
  if (locked) { useInter(hudFocus || interNear()); return; }
  if (performance.now() - lastDrag < 250) return;
  const it = interAtScreen(e.clientX, e.clientY); if (it) { useInter(it); return; }
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* optional */ }
});
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; $('cross').hidden = !locked; document.body.classList.toggle('locked', locked); });
let started = false;
function interAtScreen(cx, cy) {
  const r = canvas.getBoundingClientRect(); _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(_ndc, camera); ray.far = REACH + 0.8;
  const hit = ray.intersectObjects([...interPickList(), ...collidables], false)[0];
  return hit && hit.object.userData.inter ? hit.object.userData.inter : null;
}
document.addEventListener('mousemove', (e) => {
  if (!locked || mode !== 'walk') return;
  player.yaw -= e.movementX * 0.0022; player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.35, 1.35);
});
// touch / drag look
const look = { id: null, x: 0, y: 0, moved: 0, t: 0 };
canvas.addEventListener('pointerdown', (e) => {
  if (!$('timePop').hidden) closeTime();
  if (e.pointerType === 'mouse' && mode === 'walk' && (locked || e.button !== 0)) return;
  look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; look.moved = 0; look.t = performance.now();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== look.id) return;
  const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY; look.moved += Math.abs(dx) + Math.abs(dy);
  if (mode === 'walk') { player.yaw += dx * 0.005; player.pitch = THREE.MathUtils.clamp(player.pitch + dy * 0.005, -1.35, 1.35); if (look.moved > 6) lastDrag = performance.now(); }
  else orbitDrag(dx, dy);
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerId !== look.id) return;
  look.id = null;
  if (look.moved < 8 && performance.now() - look.t < 450 && (e.pointerType !== 'mouse' || mode === 'over')) tapAt(e.clientX, e.clientY);
});
// a tap: use what is there, or walk to that spot on the floor (in the view from above: jump there)
const _ndc = new THREE.Vector2();
let autoTarget = null;
function tapAt(cx, cy) {
  const r = canvas.getBoundingClientRect(); _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(_ndc, camera); ray.far = mode === 'walk' ? 30 : 400;
  const list = mode === 'walk' ? [...interPickList(), ...collidables, ...floors] : floors.filter((m) => m.visible);
  const hit = ray.intersectObjects(list, false)[0];
  if (!hit) return;
  if (mode === 'walk' && hit.object.userData.inter && hit.distance < REACH + 0.6) { useInter(hit.object.userData.inter); return; }
  if (floors.includes(hit.object)) {
    if (mode === 'over') { player.pos.set(hit.point.x, hit.point.y + EYE, hit.point.z); setFeet(hit.point.y); setMode('walk'); return; }
    autoTarget = hit.point.clone();
  }
}
// joystick
const joy = { id: null, x: 0, y: 0, cx: 0, cy: 0 };
if (coarse) $('joyBase').hidden = false;
$('joyBase').addEventListener('pointerdown', (e) => { joy.id = e.pointerId; const r = $('joyBase').getBoundingClientRect(); joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; $('joyBase').setPointerCapture(e.pointerId); moveJoy(e); });
$('joyBase').addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; $('joyBase').querySelector('i').style.transform = ''; };
$('joyBase').addEventListener('pointerup', endJoy); $('joyBase').addEventListener('pointercancel', endJoy);
function moveJoy(e) { let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const l = Math.hypot(dx, dy), m = 52; if (l > m) { dx *= m / l; dy *= m / l; } joy.x = dx / m; joy.y = dy / m; $('joyBase').querySelector('i').style.transform = `translate(${dx}px,${dy}px)`; }

// ---- keyboard
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyE' || e.code === 'Space') { if (mode === 'walk') { useInter(hudFocus || interNear()); e.preventDefault(); } }
  else if (e.code === 'KeyV') $('qView').click();
  else if (e.code === 'KeyM') $('qMap').click();
  else if (e.code === 'KeyL') $('qLights').click();
  else if (e.code === 'KeyR' || e.code === 'Digit6') $('qRun').click();
  else if (e.code === 'KeyH') $('qTime').click();
  else if (e.code === 'KeyB') $('qHide').click();
  else if (e.code === 'Escape') { if (document.pointerLockElement) document.exitPointerLock(); closeTime(); closePanel(); }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// ---- view from above (orbit) / walk
let mode = 'walk';
const orbit = { theta: -0.6, phi: 0.75, r: 17, target: CENTER.clone() };
function orbitDrag(dx, dy) { orbit.theta -= dx * 0.006; orbit.phi = THREE.MathUtils.clamp(orbit.phi - dy * 0.005, 0.12, 1.45); }
canvas.addEventListener('wheel', (e) => { if (mode !== 'over') return; e.preventDefault(); orbit.r = THREE.MathUtils.clamp(orbit.r * Math.exp(e.deltaY * 0.001), 5, 140); }, { passive: false });
// pinch zoom in the view from above
const pinch = new Map(); let pinchD = 0;
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') pinch.set(e.pointerId, [e.clientX, e.clientY]); });
canvas.addEventListener('pointermove', (e) => { if (!pinch.has(e.pointerId)) return; pinch.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch.size === 2 && mode === 'over') { const [a, b] = [...pinch.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinchD) orbit.r = THREE.MathUtils.clamp(orbit.r * pinchD / d, 5, 140); pinchD = d; look.moved = 99; } });
const unpinch = (e) => { pinch.delete(e.pointerId); if (pinch.size < 2) pinchD = 0; };
canvas.addEventListener('pointerup', unpinch); canvas.addEventListener('pointercancel', unpinch);
function setUpperVisible(v) { for (const m of statics) { if (m.userData.layer === 'above') m.visible = v; if (m.userData.layer === 'over') m.visible = !v; } litMeshes.forEach((m) => { if (m) m.userData.hideOver = !v; }); }
function setMode(m) {
  mode = m;
  $('qView').setAttribute('aria-pressed', m === 'over');
  setUpperVisible(m === 'walk');
  if (m === 'over') { if (document.pointerLockElement) document.exitPointerLock(); orbit.target.set(player.pos.x, FZ, player.pos.z); if (orbit.target.distanceTo(CENTER) > 25) orbit.target.copy(CENTER); }
  shadowDirty = true;
  updateHint();
}

// ---- rooms, HUD
function planOfPlayer() { return toPlan(player.pos.x, -player.pos.z); }
let currentRoom = null;
function updateRoom() {
  const [x, y] = planOfPlayer();
  let r = ROOMS.find((q) => inPolyW(x, y, q.poly));
  const outside = !r;
  const gate = !r && GATE && inPolyW(player.pos.x, -player.pos.z, GATE.p);
  const id = r ? r.id : gate ? 'gate' : 'out';
  if (id === currentRoom) return; currentRoom = id;
  const blk = !r || id === 'stair'; if (blk !== mapBlock) { mapBlock = blk; mapXf = null; }
  if (r) { $('roomDa').textContent = r.sv; $('roomEn').textContent = r.en; $('roomDim').textContent = ['stair'].includes(r.id) ? '' : `${roomArea(r).toFixed(1).replace('.', ',')} m²`; }
  else { const yard = inPolyW(player.pos.x, -player.pos.z, YARD); $('roomDa').textContent = gate ? 'Porten' : yard ? 'Gården' : 'Rådmansgatan'; $('roomEn').textContent = gate ? 'Gateway to the courtyard' : yard ? 'Courtyard' : 'Outside, Väster, Lund'; $('roomDim').textContent = ''; }
  if (typeof onRoomChange === 'function') onRoomChange(id);
  drawMap();
}
function showToast(t, ms = 1600) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(showToast.k); showToast.k = setTimeout(() => { el.hidden = true; }, ms); }
function updateHint() {
  const h = $('hint');
  if (coarse) { h.hidden = true; return; }
  h.hidden = false;
  h.textContent = mode === 'over' ? 'Drag to turn · scroll to zoom · click the floor to stand there · V to walk again'
    : locked ? 'W A S D walk · E or click uses the highlighted point · Esc frees the mouse' : 'Click the view (or drag) to look around · click a point to use it';
}
document.addEventListener('pointerlockchange', updateHint);

// ---- mini map (north up)
const map = $('map'), mctx = map.getContext('2d');
let mapXf = null, mapBlock = false;   // block view (yard, gateway) when you are outside the flat
function mapSetup() {
  const dpr = Math.min(2, devicePixelRatio || 1); const w = map.clientWidth, h = map.clientHeight; map.width = w * dpr; map.height = h * dpr;
  const pts = []; for (const r of ROOMS) if (mapBlock || !['stair'].includes(r.id)) for (const p of r.poly) pts.push(P(...p));
  if (mapBlock) { for (const q of YARD) pts.push(q); if (GATE) for (const q of GATE.p) pts.push(q); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pad = 1.2, s = Math.min(w / (x1 - x0 + 2 * pad), h / (y1 - y0 + 2 * pad)) * dpr;
  mapXf = { s, ox: (w * dpr - (x1 - x0) * s) / 2 - x0 * s, oy: (h * dpr + (y1 - y0) * s) / 2 + y0 * s, dpr };
}
const toMap = (x, y) => [mapXf.ox + x * mapXf.s, mapXf.oy - y * mapXf.s];
function drawMap() {
  if ($('mapwrap').hidden) return;
  if (!mapXf) mapSetup();
  const g = mctx, W = map.width, Hh = map.height; g.clearRect(0, 0, W, Hh);
  const poly = (pl, fill, stroke, lw = 1, world = false) => { g.beginPath(); pl.forEach((p, i) => { const [x, y] = world ? toMap(...p) : toMap(...P(...p)); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw * mapXf.dpr; g.stroke(); } };
  if (mapBlock) {
    poly(YARD, currentRoom === 'out' && inPolyW(player.pos.x, -player.pos.z, YARD) ? 'rgba(207,145,82,.22)' : 'rgba(150,120,100,.18)', null, 1, true);
    for (const b of [MAIN, GATE]) if (b) poly(b.p, 'rgba(242,237,228,.06)', 'rgba(242,237,228,.45)', 1, true);
    if (GATEWAY.at) { const sc = (GATEWAY.s0 + GATEWAY.s1) / 2, w = (GATEWAY.s1 - GATEWAY.s0) / 2; poly([GATEWAY.at(sc - w, 0.3), GATEWAY.at(sc + w, 0.3), GATEWAY.at(sc + w, -GATEWAY.L), GATEWAY.at(sc - w, -GATEWAY.L)], currentRoom === 'gate' ? 'rgba(207,145,82,.38)' : 'rgba(242,237,228,.18)', null, 1, true); }
  }
  for (const r of ROOMS) poly(r.poly, r.id === currentRoom ? 'rgba(207,145,82,.38)' : ['stair', 'passage'].includes(r.id) ? 'rgba(242,237,228,.05)' : 'rgba(242,237,228,.12)', null);
  for (const [x0, y0, x1, y1] of IW) poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 'rgba(242,237,228,.75)', null);
  poly([[11, -29], [808, -29], [1232, 399], [1232, 1544], [1195, 1544], [1195, 420], [785, 31], [11, 31]], 'rgba(242,237,228,.85)', null);
  // you
  const [mx, my] = toMap(player.pos.x, -player.pos.z);
  if (mx > -10 && my > -10 && mx < W + 10 && my < Hh + 10) {
    const a = -player.yaw - Math.PI / 2, s = 7 * mapXf.dpr;
    g.save(); g.translate(mx, my); g.rotate(a);
    g.fillStyle = 'rgba(207,145,82,.25)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, s * 3.2, -0.6, 0.6); g.closePath(); g.fill();
    g.fillStyle = '#cf9152'; g.beginPath(); g.arc(0, 0, s * 0.55, 0, Math.PI * 2); g.fill();
    g.restore();
  }
}
map.addEventListener('click', (e) => {
  if (!mapXf) return;
  const r = map.getBoundingClientRect(), x = (e.clientX - r.left) * mapXf.dpr, y = (e.clientY - r.top) * mapXf.dpr;
  const wx = (x - mapXf.ox) / mapXf.s, wy = (mapXf.oy - y) / mapXf.s;
  const [px, py] = toPlan(wx, wy);
  const room = ROOMS.find((q) => inPolyW(px, py, q.poly)); if (!room) return;
  const gy = (() => { ray.set(_v.set(wx, FZ + 1.5, -wy), _dn); ray.far = 3; const h = ray.intersectObjects(floors, false)[0]; return h ? h.point.y : FZ; })();
  player.pos.set(wx, gy + EYE, -wy); setFeet(gy); if (mode !== 'walk') setMode('walk'); currentRoom = null; updateRoom();
});

// ---- quick bar
$('qHide').addEventListener('click', () => { const q = $('quick'), min = !q.classList.contains('min'); q.classList.toggle('min', min); $('qHide').setAttribute('aria-expanded', !min); });
$('qView').addEventListener('click', () => setMode(mode === 'walk' ? 'over' : 'walk'));
$('qMap').addEventListener('click', () => { const on = $('mapwrap').hidden; $('mapwrap').hidden = !on; $('qMap').setAttribute('aria-pressed', on); if (on) drawMap(); });
$('qRun').addEventListener('click', () => { running = !running; $('qRun').setAttribute('aria-pressed', running); showToast(running ? 'Running' : 'Walking', 900); });
function closeTime() { $('timePop').hidden = true; $('qTime').setAttribute('aria-pressed', 'false'); }
$('qTime').addEventListener('click', () => { const open = $('timePop').hidden; if (open) $('timePop').style.top = `${Math.max(8, $('qTime').getBoundingClientRect().top - 6)}px`; $('timePop').hidden = !open; $('qTime').setAttribute('aria-pressed', open); if (open && document.pointerLockElement) document.exitPointerLock(); });

// ---- per-frame player update
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
let tipFor = null, tipTick = 0;
function updatePlayer(dt) {
  if (mode === 'walk') {
    let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
    let s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
    if (Math.abs(f) + Math.abs(s) > 0.05) autoTarget = null;
    fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); right.set(-fwd.z, 0, fwd.x);
    const speed = (running || keys.ShiftLeft || keys.ShiftRight ? 3.4 : 1.55) * dt;
    if (autoTarget) {
      const d = _v2.set(autoTarget.x - player.pos.x, 0, autoTarget.z - player.pos.z); const l = d.length();
      if (l < 0.15) autoTarget = null; else { d.normalize(); if (!tryMove(d.x * Math.min(l, speed), d.z * Math.min(l, speed))) autoTarget = null; }
    } else if (Math.abs(f) + Math.abs(s) > 0.05) {
      const m = Math.min(1, Math.hypot(f, s)); const dx = fwd.x * f + right.x * s, dz = fwd.z * f + right.z * s, l = Math.hypot(dx, dz) || 1;
      // sub-steps so fast frames don't tunnel
      const total = speed * m, n = Math.ceil(total / 0.12);
      for (let i = 0; i < n; i++) tryMove(dx / l * total / n, dz / l * total / n);
    }
    camera.position.copy(player.pos);
    camera.rotation.set(player.pitch, player.yaw, 0);
    // the tip for the nearest usable thing
    if (++tipTick % 6 === 0) {
      const it = hudFocus || interNear();
      tipFor = it;
      if (it) { $('doorTipText').textContent = it.label(); $('doorTip').hidden = false; } else $('doorTip').hidden = true;
    }
  } else {
    $('doorTip').hidden = true;
    const t = orbit.target, r = orbit.r;
    camera.position.set(t.x + r * Math.sin(orbit.phi) * Math.sin(orbit.theta), t.y + r * Math.cos(orbit.phi), t.z + r * Math.sin(orbit.phi) * Math.cos(orbit.theta));
    camera.lookAt(t);
  }
  updateRoom();
}
$('doorTip').addEventListener('click', () => useInter(tipFor));
