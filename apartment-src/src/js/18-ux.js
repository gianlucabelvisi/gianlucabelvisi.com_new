// ------------------------------------------------------------ UX pass (2026-11-16, Gianluca): start from above, pick where to stand, loading states
// · The model opens straight into the view from above (no "start" click). A View switch (From above · Walk) sits on top.
// · Walk → "pick where to stand": tap/click the floor, drag to choose which way you face; or jump to a room chip. The camera flies down.
// · Slow moments (lights switching = shader recompiles, time of day = new sky lighting) show a small "Updating…" chip first.

// ---- busy chip
const busyUI = { frames: 0, gate: 0, shownAt: 0 };
function busyShow(txt) { $('busyTxt').textContent = txt; $('busy').hidden = false; busyUI.shownAt = performance.now(); }
function busyHide() { const wait = Math.max(0, 420 - (performance.now() - busyUI.shownAt)); setTimeout(() => { if (!busyUI.frames && !busyUI.gate) $('busy').hidden = true; }, wait); }
function busyRun(txt, fn) {                               // paint the chip first, then do the slow thing, hide once a frame got through
  busyShow(txt);
  requestAnimationFrame(() => requestAnimationFrame(() => { try { fn(); } finally { busyUI.frames = 3; shadowDirty = true; } }));
}
function busyAfterRender() { if (busyUI.frames > 0 && --busyUI.frames === 0) busyHide(); }
function lightSig() {                                     // what three.js compiles shaders for: how many lights of each kind are visible, and how many cast shadows
  if (!autoLights) return '';
  let p = 0, s = 0, r = 0, d = 0, sh = 0;
  for (const L of autoLights) if (L.visible) { if (L.isPointLight) p++; else if (L.isSpotLight) s++; else if (L.isRectAreaLight) r++; else d++; if (L.castShadow) sh++; }
  return `${p}.${s}.${r}.${d}.${sh}`;
}
// called by the render loop after perfTick: true = skip rendering this frame (the chip gets painted before the recompile freezes the page)
function busyGateLights() {
  if (!started) return false;
  const sig = lightSig();
  if (frame.lsig === undefined) { frame.lsig = sig; return false; }
  if (sig === frame.lsig) { busyUI.gate = 0; return false; }
  if (!busyUI.gate) { busyUI.gate = 2; busyShow(LIGHTS && Object.values(LIGHTS).some((L) => L.on) ? 'Switching the lights…' : 'Updating the light…'); }
  if (--busyUI.gate > 0) return true;
  frame.lsig = sig; busyUI.frames = 3; return false;
}

// ---- view switch (top centre on desktop, under the room card on phones)
function syncModeUI() {
  const over = mode === 'over';
  $('segOver').setAttribute('aria-pressed', String(over && !place.on));
  $('segWalk').setAttribute('aria-pressed', String(!over || place.on));
  $('modeSeg').hidden = !started;
  if ((!over || place.on) && !$('coach').hidden) { $('coach').hidden = true; document.body.classList.remove('coaching'); try { localStorage.setItem('aptCoach2', '1'); } catch (_) { /* ignore */ } }
  $('qView').innerHTML = over ? '<i>V</i>Walk' : '<i>V</i>From above';
  $('qView').title = over ? 'Walk: pick where to stand (V)' : 'View from above (V)';
}
function toggleView() { if (place.on) { stopPlacing(); return; } if (mode === 'walk') setMode('over'); else startPlacing(); }

// ---- pick where to stand
const place = { on: false, down: null, dir: null };
const placeMark = (() => {
  const g = new THREE.Group(); g.visible = false; g.renderOrder = 31;
  const mat = new THREE.MeshBasicMaterial({ color: 0xcf9152, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const ghost = new THREE.MeshBasicMaterial({ color: 0xf2ede4, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.27, 48), mat); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 31; g.add(ring);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), mat); dot.rotation.x = -Math.PI / 2; dot.renderOrder = 31; g.add(dot);
  const sh = new THREE.Shape(); sh.moveTo(-0.16, 0.32); sh.lineTo(0.16, 0.32); sh.lineTo(0, 0.62); sh.closePath();     // a wedge in front of the ring = which way you'll face
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat); arrow.rotation.x = -Math.PI / 2; arrow.renderOrder = 31;
  const yawG = new THREE.Group(); yawG.add(arrow); g.add(yawG);
  scene.add(g);
  return { g, yawG, ring, dot, arrow, mat, ghost };
})();
function placeMarkAt(p, dir, isGhost) {
  const M = placeMark; M.g.visible = true; M.g.position.set(p.x, p.y + 0.02, p.z);
  for (const o of [M.ring, M.dot, M.arrow]) o.material = isGhost ? M.ghost : M.mat;
  // the wedge points along -y of its shape plane before rotation.x = -π/2, i.e. towards -z; turn it to dir
  M.yawG.rotation.y = Math.atan2(-dir.x, -dir.z);
}
function camFlat() { const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); return f.normalize(); }
function floorHitAt(e) {
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.far = Infinity; ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(pickables, false)[0] || null;
}
function planeHitAt(e, y) {
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera); const p = new THREE.Vector3();
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), p) ? p : null;
}
function startPlacing() {
  if (typeof focus !== 'undefined' && focus) exitFocus();
  if (selected) selectFurniture(null);
  if (mode !== 'over') setMode('over');
  place.on = true; place.down = null; place.dir = null;
  orbit.enableRotate = false; orbit.enablePan = false;           // mouse: clicks place, the wheel still zooms
  document.body.classList.add('placing'); $('placeBar').hidden = false; canvas.style.cursor = 'crosshair';
  syncModeUI(); showHint();
}
function stopPlacing() {
  place.on = false; place.down = null; placeMark.g.visible = false;
  orbit.enableRotate = true; orbit.enablePan = true;
  document.body.classList.remove('placing'); $('placeBar').hidden = true; canvas.style.cursor = '';
  syncModeUI(); showHint();
}
function placeFinish(p, dir) {
  stopPlacing();
  player.fy = p.y; player.pos.set(p.x, p.y + EYE, p.z);
  player.yaw = Math.atan2(-dir.x, -dir.z); player.pitch = -0.05; frame.camY = undefined;
  placeMarkAt(p, dir, false);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0, camera.rotation.order));
  orbit.enabled = false;
  camTo(player.pos.clone(), q, 1100, { done: () => { placeMark.g.visible = false; setMode('walk'); } });
}
canvas.addEventListener('pointerdown', (e) => {
  if (!place.on || camTween) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const h = floorHitAt(e);
  if (!h) { showToast('Pick a spot on a floor'); return; }
  place.down = { id: e.pointerId, p: h.point.clone(), x: e.clientX, y: e.clientY }; place.dir = null;
  placeMarkAt(h.point, camFlat(), false);
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (!place.on) return;
  if (!place.down) { if (e.pointerType === 'mouse') { const h = floorHitAt(e); if (h) placeMarkAt(h.point, camFlat(), true); else placeMark.g.visible = false; } return; }
  if (e.pointerId !== place.down.id) return;
  const q = planeHitAt(e, place.down.p.y); if (!q) return;
  const d = q.sub(place.down.p).setY(0);
  if (d.length() > 0.12 || Math.hypot(e.clientX - place.down.x, e.clientY - place.down.y) > 14) { place.dir = d.normalize(); placeMarkAt(place.down.p, place.dir, false); }
});
canvas.addEventListener('pointerup', (e) => {
  if (!place.on || !place.down || e.pointerId !== place.down.id) return;
  const D = place.down; place.down = null;
  placeFinish(D.p, place.dir || camFlat());
});
addEventListener('keydown', (e) => { if (place.on && e.code === 'Escape') { e.preventDefault(); stopPlacing(); } });
$('placeCancel').addEventListener('click', () => stopPlacing());
for (const [id, label] of chipDefs) {                     // or jump straight to a room
  const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
  b.addEventListener('click', () => { stopPlacing(); spawn(id); setMode('walk'); });
  $('placeChips').appendChild(b);
}
$('segOver').addEventListener('click', () => { if (place.on) stopPlacing(); if (mode !== 'over') setMode('over'); });
$('segWalk').addEventListener('click', () => { if (mode === 'over' && !place.on) startPlacing(); });

// ---- open straight into the view from above
function enterApp() {
  if (started) return;
  $('intro').hidden = true; started = true;
  setMode('over');
  setTimeout(() => { try { prewarmShaders(); } catch (_) { /* best effort */ } }, 0);
  syncModeUI();
  let seen = false; try { seen = localStorage.getItem('aptCoach2') === '1'; } catch (_) { /* private mode */ }
  if (!seen) { $('coach').hidden = false; document.body.classList.add('coaching'); }
}
window.__onModelReady = enterApp;
$('coachOk').addEventListener('click', () => { $('coach').hidden = true; document.body.classList.remove('coaching'); try { localStorage.setItem('aptCoach2', '1'); } catch (_) { /* ignore */ } });
$('coachWalk').addEventListener('click', () => { $('coachOk').click(); startPlacing(); });
