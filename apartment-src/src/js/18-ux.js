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
  if (over && crawl.on) { crawl.on = false; $('qCrawl').setAttribute('aria-pressed', 'false'); }
  $('qCrawl').hidden = over; $('qRun').hidden = over;
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
  camTo(player.pos.clone(), q, 1100, { fov: walkFov(), done: () => { placeMark.g.visible = false; setMode('walk'); } });   // the lens widens during the glide, no jump at the end
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
  if (!coarse) setTimeout(() => { try { prewarmShaders(); } catch (_) { /* best effort */ } }, 0);   // phones compile shaders as they're needed: compiling them all at start ran iOS out of memory
  syncModeUI();
  let seen = false; try { seen = localStorage.getItem('aptCoach2') === '1'; } catch (_) { /* private mode */ }
  if (!seen) { $('coach').hidden = false; document.body.classList.add('coaching'); }
}
window.__onModelReady = enterApp;
$('coachOk').addEventListener('click', () => { $('coach').hidden = true; document.body.classList.remove('coaching'); try { localStorage.setItem('aptCoach2', '1'); } catch (_) { /* ignore */ } });
$('coachWalk').addEventListener('click', () => { $('coachOk').click(); startPlacing(); });

// ---- zoom in far enough from above and you step inside (2026-11-16, Gianluca)
// At the closest overview distance the zoom stops (a deliberate pause, so a fast zoom doesn't drop you in). Keep zooming after the pause
// and a chip fills up; once it's full the camera glides down to the floor under the middle of the screen and you're walking there.
// Only from above → walk; going back up stays a button press.
const zw = { armed: false, t0: 0, last: 0, acc: 0, span0: 0, need: 260, pause: 450, busy: false };
function zoomCentreHit() {
  ray.far = Infinity; ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  return ray.intersectObjects(pickables, false)[0] || null;
}
function zoomCanArm() { return mode === 'over' && started && !focus && !camTween && !place.on && !zw.busy && camera.position.distanceTo(orbit.target) <= orbit.minDistance + 0.05; }
function zoomShow(k) {
  const el = $('zoomWalk'); el.hidden = false; el.style.setProperty('--k', String(Math.max(0, Math.min(1, k))));
  $('zoomWalkTxt').textContent = k <= 0 ? 'Closest view · keep zooming to step inside' : 'Keep zooming to step inside…';
}
function zoomReset() {
  if (!zw.armed) return; zw.armed = false; zw.acc = 0; $('zoomWalk').hidden = true;
  if (!place.on && placeMark.g.visible && !camTween) placeMark.g.visible = false;
}
function zoomPush(kind, amount) {                         // kind 'wheel': amount = zoom-in delta (px); 'pinch': amount = current finger span
  if (!zoomCanArm()) return;
  const now = performance.now();
  if (!zw.armed) { zw.armed = true; zw.t0 = now; zw.acc = 0; zw.span0 = kind === 'pinch' ? amount : 0; }
  zw.last = now;
  const h = zoomCentreHit();
  if (h) placeMarkAt(h.point, camFlat(), true); else placeMark.g.visible = false;
  if (now - zw.t0 < zw.pause) { if (kind === 'pinch') zw.span0 = amount; zoomShow(0); return; }   // the stop: input during the pause is swallowed
  if (kind === 'wheel') zw.acc += amount; else zw.acc = Math.max(zw.acc, (amount / Math.max(1, zw.span0) - 1) * 700);   // ~37 % more spread = full
  const k = zw.acc / zw.need; zoomShow(k);
  if (k >= 1) {
    if (!h) { showToast('Zoom in over a floor of the flat to step inside'); zoomReset(); return; }
    zoomReset(); zw.busy = true;
    try { localStorage.setItem('aptCoach2', '1'); } catch (_) { /* ignore */ }
    placeFinish(h.point.clone(), camFlat());              // the same glide down as "pick where to stand"
    setTimeout(() => { zw.busy = false; }, 1400);
  }
}
canvas.addEventListener('wheel', (e) => {
  if (mode !== 'over') return;
  const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
  if (dy < 0) zoomPush('wheel', -dy); else if (dy > 0) zoomReset();
}, { passive: true });
setInterval(() => { if (zw.armed && performance.now() - zw.last > 2500) zoomReset(); }, 400);   // stopped zooming: forget it

// ---- crawl, like in a game (2026-11-16, Gianluca): C toggles; eyes at 50 cm, slow, only knee-height obstacles block you
const CRAWL_EYE = 0.5;
const crawl = { on: false, k: 0 };
function setCrawl(on) {
  if (on && mode !== 'walk') return;
  if (!on && crawl.on) {                                   // standing up needs head room
    const r = new THREE.Raycaster(new THREE.Vector3(player.pos.x, player.fy + 0.45, player.pos.z), new THREE.Vector3(0, 1, 0), 0, EYE - 0.3);
    if (r.intersectObjects(collidables, false).length) { showToast('No room to stand up here · crawl out first'); return; }
  }
  crawl.on = on; $('qCrawl').setAttribute('aria-pressed', String(on));
  showToast(on ? 'Crawling · C to stand up' : 'Standing up');
}
$('qCrawl').addEventListener('click', () => setCrawl(!crawl.on));
addEventListener('keydown', (e) => { if (e.code === 'KeyC' && !e.repeat && !e.metaKey && !e.ctrlKey && mode === 'walk' && !(e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) setCrawl(!crawl.on); });

// ---- see-through walls from above (2026-11-17, Gianluca): in the view from above, building walls between the camera and what you're
// looking at (the orbit target) fade to a fine screen-door pattern, so they're almost transparent. Only the architecture from the
// model is patched (walls, facades, frames; not floors, glass or furniture). One shader for both modes: a uniform switches it.
const xray = { on: { value: 0 }, cam: { value: new THREE.Vector3() }, tgt: { value: new THREE.Vector3() }, R: { value: 2 } };
function xrayPatch(mat) {
  if (!mat || mat.userData.xray || mat.transparent || !(mat.isMeshStandardMaterial || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial || mat.isMeshBasicMaterial)) return;
  mat.userData.xray = true;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.xOn = xray.on; sh.uniforms.xCam = xray.cam; sh.uniforms.xTgt = xray.tgt; sh.uniforms.xR = xray.R;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vXW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvXW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vXW;\nuniform float xOn; uniform vec3 xCam; uniform vec3 xTgt; uniform float xR;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (xOn > 0.5) {
        vec3 dd = xTgt - xCam; float L = length(dd); vec3 u = dd / max(L, 1e-4); vec3 p = vXW - xCam; float t = dot(p, u);
        if (t > 0.2 && t < L - 0.5) {
          float perp = length(p - u * t), rr = xR * (0.35 + 0.65 * t / L);           // a cone that opens towards the target
          if (perp < rr) {                                                              // ordered (Bayer 4×4) dither: ~15 % kept in the middle, soft edge
            vec2 q = mod(floor(gl_FragCoord.xy), 4.0); float bx = q.x, by = q.y;
            float bay = mod(bx * 8.0 + by * 4.0 + mod(bx + by, 2.0) * 2.0 + mod(by, 2.0), 16.0);   // a cheap 4×4 ordered threshold, 0..15
            bay = (mod(bay * 7.0, 16.0) + 0.5) / 16.0;
            float keep = 0.15 + 0.85 * smoothstep(rr * 0.7, rr, perp);
            if (bay > keep) discard;
          }
        }
      }`);
  };
  mat.customProgramCacheKey = () => prevKey() + '|xray';
  mat.needsUpdate = true;
}
function xrayPatchModel() {
  if (!modelRoot) return;
  const floors = new Set(pickables.map((o) => o.material));
  modelRoot.traverse((o) => { if (!o.isMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) if (!floors.has(m) && m !== MATS.glass) xrayPatch(m); });
}
function xrayTick() {
  const on = mode === 'over' && started;
  xray.on.value = on ? 1 : 0; if (!on) return;
  xray.cam.value.copy(camera.position); xray.tgt.value.copy(orbit.target); if (focus) xray.tgt.value.y += 0.4;
  const L = camera.position.distanceTo(orbit.target), elev = Math.asin(THREE.MathUtils.clamp((camera.position.y - orbit.target.y) / Math.max(L, 1e-3), -1, 1));
  // looking steeply down nothing is in the way (the roof and upper floors are already hidden): fade the effect out between ~34° and ~54°
  const k = 1 - THREE.MathUtils.smoothstep(elev, 0.6, 0.95);
  xray.R.value = THREE.MathUtils.clamp(1.4 + 0.18 * L, 1.8, 4.5) * k; if (k <= 0) xray.on.value = 0;
}

// ---- field of view (2026-11-17, Gianluca: walking, the flat felt smaller than it is). The walk camera was a fixed 60° vertical
// (66° on phones): fine on a wide screen, but a portrait phone then saw only ~37° across — like looking through a tube, which makes rooms
// feel cramped. Walking now aims for a natural horizontal view (≈96° on landscape screens, ≈84° asked on portrait, capped so verticals
// don't stretch): desktop 16:9 ≈ 64° vertical, portrait phone ≈ 52° across instead of 37°. The view from above keeps its old lens.
function viewFov() { return (typeof mode === 'undefined' || mode !== 'walk') ? (coarse ? 66 : 60) : walkFov(); }
function walkFov() {
  const a = innerWidth / Math.max(1, innerHeight), h = (a >= 1 ? 96 : 84) * Math.PI / 180;
  const v = 2 * Math.atan(Math.tan(h / 2) / a) * 180 / Math.PI;
  return THREE.MathUtils.clamp(v, 58, a >= 1 ? 72 : 88);
}

// ---- undo (2026-11-18): every furniture change (arrows, turns, panel buttons and dropdowns) keeps the state before it; Ctrl/Cmd+Z or
// the Undo chip steps back. Uses the same snapshot as the layout links (time of day left out).
const undoStack = [], UNDO_MAX = 30;
let undoLast = 0;
function undoPush() {
  const now = performance.now(); if (now - undoLast < 700) { undoLast = now; return; }      // holding an arrow = one step
  undoLast = now;
  try { const S = layoutSnapshot(); delete S.h; undoStack.push(JSON.stringify(S)); if (undoStack.length > UNDO_MAX) undoStack.shift(); } catch (_) { return; }
  const c = $('undoChip'); c.hidden = false; clearTimeout(undoPush.tm); undoPush.tm = setTimeout(() => { c.hidden = true; }, 7000);
}
function undo() {
  const S = undoStack.pop(); if (!S) { showToast('Nothing to undo'); return; }
  const keep = selected, f = focus;
  layoutApply(JSON.parse(S)); undoLast = 0;
  if (keep && !f) selectFurniture(keep);
  showToast(undoStack.length ? `Undone · ${undoStack.length} more step${undoStack.length > 1 ? 's' : ''}` : 'Undone');
  if (!undoStack.length) $('undoChip').hidden = true;
}
for (const m of Object.values(MOVERS_ALL())) for (const k of ['shift', 'shift2', 'rotate']) {
  if (typeof m[k] !== 'function' || m[k]._undo) continue;
  const fn = m[k]; m[k] = function (...a) { undoPush(); return fn.apply(this, a); }; m[k]._undo = true;
}
function MOVERS_ALL() { return { bedMover, closetMover, tvMover, mediaMover, sofaMover, lampMover, diningMover, petraMover, guestMover, vpaxMover, nookMover, booksMover, plantMover, artMover, alcoveMover, deskMover, entranceMover, bathMover, balconyMover, skaenkMover, mpMoverUp, mpMoverLo, ctabMover, rugMover }; }
for (const id of ['mvVar', 'mvVar2']) $(id).addEventListener('click', () => { if (selected && !selected.lights) undoPush(); }, true);
$('mvSelects').addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' && selected && !selected.lights) { undoLast = 0; undoPush(); } }, true);
$('undoChip').addEventListener('click', undo);
addEventListener('keydown', (e) => { if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !measuring && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) { e.preventDefault(); undo(); } });

// ---- quick bar: Pins, Sizes, Sockets and Tape fold into one "Measure" menu (2026-11-18); their keys still work
{
  const ids = ['qPins', 'qDims', 'qPlugs', 'qTape'].filter((id) => document.getElementById(id));
  if (ids.length) {
    const pop = $('measurePop');
    for (const id of ids) pop.appendChild($(id));
    const btn = $('qMeasure'), sync = () => btn.setAttribute('aria-pressed', String(ids.some((id) => $(id).getAttribute('aria-pressed') === 'true')));
    btn.addEventListener('click', (e) => { e.stopPropagation(); const open = pop.hidden; pop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) pop.style.top = `${Math.max(8, btn.getBoundingClientRect().top - 4)}px`; });
    for (const id of ids) $(id).addEventListener('click', () => setTimeout(sync, 0));
    addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    setInterval(sync, 1000);
  }
}
