// ------------------------------------------------------------ clouds
(function clouds() {
  const W = 2048, Hh = 512;
  const c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, Hh);
  const r = rng(29);
  for (const [cells, alpha] of [[6, 0.55], [12, 0.45], [24, 0.35], [48, 0.25], [96, 0.18]]) {
    const s = document.createElement('canvas'); s.width = cells * 4; s.height = cells;
    const sg = s.getContext('2d'); const id = sg.createImageData(s.width, s.height);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    sg.putImageData(id, 0, 0);
    g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(s, 0, 0, W, Hh);
  }
  g.globalAlpha = 1;
  const img = g.getImageData(0, 0, W, Hh), px = img.data;
  for (let y = 0; y < Hh; y++) {
    const fade = Math.min(1, y / (Hh * 0.25)) * Math.min(1, (Hh - y) / (Hh * 0.08)); // soft at zenith seam and horizon
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, v = px[i] / 255;
      const a = Math.max(0, Math.min(1, (v - 0.74) / 0.12)) * fade * 0.85;   // a few fair-weather clouds
      px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = a * 235;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  // upper hemisphere only
  const geo = new THREE.SphereGeometry(1800, 48, 12, 0, Math.PI * 2, 0, Math.PI * 0.49);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.renderOrder = -1;
  scene.add(dome);
  window.__clouds = dome;
})();

// ------------------------------------------------------------ performance housekeeping
// Lights at zero intensity are switched off entirely (each visible light costs every pixel of every material, even at 0), and
// the render resolution adapts to the device: it steps down when frames are slow and back up when there is headroom.
let autoLights = null;
const PR_MAX = Math.min(devicePixelRatio, coarse ? 1.5 : 2), PR_MIN = coarse ? 0.7 : 1;
let prNow = PR_MAX, ftAvg = 16, prCheck = 0;
function perfTick(dt) {
  if (!autoLights && modelRoot) { autoLights = []; scene.traverse((o) => { if (o.isLight && o !== sun && o !== hemi) autoLights.push(o); }); }
  if (autoLights && frame.n % 3 === 0) for (const L of autoLights) { const v = L.userData.pool || L.intensity > 0.001 || (lightHold && hueLights().includes(L)); if (L.visible !== v) L.visible = v; }
  if (!started || document.hidden) return;
  ftAvg += (Math.min(dt, 0.1) * 1000 - ftAvg) * 0.05;
  if ((prCheck += dt) < 2.5) return; prCheck = 0;
  let next = prNow;
  if (ftAvg > 24 && prNow > PR_MIN) next = Math.max(PR_MIN, prNow - 0.15);
  else if (ftAvg < 13 && prNow < PR_MAX) next = Math.min(PR_MAX, prNow + 0.1);
  if (next !== prNow) { prNow = +next.toFixed(2); renderer.setPixelRatio(prNow); resize(); }
}
window.__perf = () => ({ prNow, ftAvg: +ftAvg.toFixed(1), lights: autoLights && autoLights.filter((l) => l.visible).length });

// ------------------------------------------------------------ loop
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), step = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'walk') {
    let f = 0, s = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) s -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) s += 1;
    f -= joy.y; s += joy.x;
    if (f || s) {
      const speed = (running !== (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 3.2 : 1.5) * dt;
      fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
      right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      step.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(right, s);
      if (step.lengthSq() > 1) step.normalize();
      tryMove(step.multiplyScalar(speed));
      autoTarget = null; if (hintArrow.on) stopArrow();
    } else { if (autoTarget && hintArrow.on) stopArrow(); stepAuto(dt); }
    if (frame.camY === undefined || Math.abs(frame.camY - player.pos.y) > 0.8) frame.camY = player.pos.y;
    frame.camY += (player.pos.y - frame.camY) * Math.min(1, dt * 12);          // soften the steps on the stairs
    camera.position.set(player.pos.x, frame.camY, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  } else {
    if (!stepCamTween()) orbit.update();
  }
  updateLift(dt); updateFridgeLight();
  updateRoom();
  drawMap();
  updatePinTip();
  placeMover();
  hudUpdate();
  updateOcclusion();
  updateDoors(dt); if (frame.n % 3 === 0) roomDarkTick(); if (frame.n % 10 === 5) fxAssign(); updateArrow(); updateTV(performance.now());
  if (window.__clouds) window.__clouds.rotation.y += dt * 0.004;
  if (stars.visible) { stars.material.uniforms.uT.value += dt; stars.material.uniforms.uPR.value = renderer.getPixelRatio(); }
  frame.n = (frame.n || 0) + 1;
  if (frame.n % 10 === 0) window.__cam = camera.position.toArray().map((v) => +v.toFixed(2)).join(',') + ' ' + [player.yaw, player.pitch].map((v) => +v.toFixed(2)).join(',');
  perfTick(dt);
  // standing still with nothing animating: render at ~10 fps instead of 60 (saves battery; clouds and fades still move)
  const now = performance.now(), q = camera.quaternion, cp = camera.position;
  const sig = cp.x * 1.3 + cp.y * 7.1 + cp.z * 13.7 + q.x * 17 + q.y * 19 + q.z * 23 + q.w * 29;
  const busy = shadowDirty || camTween || selected || measuring || mode !== 'walk' || tvState.on || lift.moving || lift.after || lift.open.some((o) => o > 0 && o < 1) || hintArrow.on || Math.abs(sig - (frame.sig ?? 0)) > 1e-6;
  frame.sig = sig; if (busy) frame.busyAt = now;
  const idle = now - (frame.busyAt ?? 0) > 900;
  if (shadowDirty || frame.n % 600 === 0) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
  if (!idle || frame.n % 6 === 0) { if (composer) composer.render(); else renderer.render(scene, camera); }
  requestAnimationFrame(frame);
}
(function doorPlate() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = '#8c887f'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 154);
  g.fillStyle = '#1d1b18'; g.font = '600 50px "Schibsted Grotesk", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('Belvisi Jensen', 256, 82);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.2 }));
  plate.position.copy(b2t(6.8, -0.016, 1.42));       // right of the door, faces into the stairwell
  scene.add(plate);
  const bellBase = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.012), MATS.steel);
  bellBase.position.copy(b2t(6.8, -0.012, 1.28)); scene.add(bellBase);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 20), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc870, emissiveIntensity: 0.6 }));
  bell.rotation.x = Math.PI / 2; bell.position.copy(b2t(6.8, -0.02, 1.28)); scene.add(bell);
  const number = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), new THREE.MeshStandardMaterial({ map: (() => { const k = document.createElement('canvas'); k.width = 512; k.height = 160; const q = k.getContext('2d'); q.fillStyle = '#1d1b18'; q.fillRect(0, 0, 512, 160); q.fillStyle = '#eee'; q.font = '600 70px "Schibsted Grotesk", Arial'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText('3. th', 256, 84); const tt = new THREE.CanvasTexture(k); tt.colorSpace = THREE.SRGBColorSpace; return tt; })(), roughness: 0.5 }));
  number.position.copy(b2t(6.0, -0.016, 2.25)); scene.add(number);
})();
window.__overlays = [pinsGroup, dimsGroup, plugsGroup, measureGroup, tapRing];
updateRoom();
requestAnimationFrame(frame);
// ------------------------------------------------------------ world HUD (2026-10-05, Gianluca: "the furniture UX is confusing")
// · doors, cabinets, windows, switches, the TV: a small pulsing point at the handle, shown only within reach; click/tap it (or E) to use it
// · furniture: an (i) button above each piece → flies to a close aerial view with the options panel docked beside it (never on top)
// · moving/turning: arrows around the piece in the scene (always for the piece in close-up; for every piece with the Move layer, G)
const FURN_LABELS = new Set(['Bed', 'Closet', 'TV', 'TV wall', 'Sofa', 'Dining', 'Lamp', 'Sofa bed', 'Lounge chair', 'Book tower', 'Plant', 'Painting', 'Console', 'Alcove', 'Desk', 'Side table', 'Entrance', 'Bathroom', 'Balcony']);
const MOVERS = { bedMover, closetMover, tvMover, mediaMover, sofaMover, lampMover, diningMover, petraMover, guestMover, vpaxMover, nookMover, booksMover, plantMover, artMover, consoleMover, alcoveMover, deskMover, holmMover, entranceMover, bathMover, balconyMover };
function doorMover(d) { if (d._mover === undefined) { const m = String(d.swap).match(/selected === (\w+)/); d._mover = (m && MOVERS[m[1]]) || null; } return d._mover; }
const isFurn = (d) => d.kind === 'swap' && FURN_LABELS.has(d.label);
const hud = { el: $('hud3d'), pools: { ipt: [], finfo: [], marr: [] }, used: { ipt: 0, finfo: 0, marr: 0 }, focusDoor: null, n: 0, occ: new WeakMap(), vsig: '' };
const REACH = 2.0;
const ARROW_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function hudEl(kind) {
  const pool = hud.pools[kind], i = hud.used[kind]++;
  if (pool[i]) return pool[i];
  const b = document.createElement('button'); b.className = kind; b.type = 'button';
  if (kind === 'ipt') { b.innerHTML = '<span class="k">E</span>'; b.setAttribute('aria-label', 'Use');
    // curtains: drag the point up/down to draw them gradually (touch and mouse); a plain click still toggles
    b.addEventListener('pointerdown', (e) => { const d = b._door; if (!d || d.kind !== 'curtain') return; b._drag = { y: e.clientY, t: d.target, moved: false }; try { b.setPointerCapture(e.pointerId); } catch (_) { /* ok */ } });
    b.addEventListener('pointermove', (e) => { const g = b._drag, d = b._door; if (!g || !d) return; const dy = e.clientY - g.y; if (Math.abs(dy) > 6) g.moved = true; if (g.moved) d.target = THREE.MathUtils.clamp(g.t - dy / 160, 0, 1); });
    for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, () => { if (b._drag) { b._skip = b._drag.moved; b._drag = null; } });
  }
  if (kind === 'finfo') { b.textContent = 'i'; }
  if (kind === 'marr') {                                       // press and hold repeats
    let tm = null, iv = null; const stop = () => { clearTimeout(tm); clearInterval(iv); tm = iv = null; };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (b._act) b._act(); tm = setTimeout(() => { iv = setInterval(() => { if (b._act && !b.hidden) b._act(); else stop(); }, 110); }, 380); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
    b.addEventListener('click', (e) => e.stopPropagation());
  } else b.addEventListener('click', (e) => { e.stopPropagation(); if (b._skip) { b._skip = false; return; } if (b._act) b._act(); });
  b.addEventListener('keydown', (e) => e.stopPropagation());
  hud.el.appendChild(b); pool.push(b); return b;
}
const _hp = new THREE.Vector3(), _hq = new THREE.Vector3(), _hs = new THREE.Vector3();
function toScreen(v, out) { _hs.copy(v).project(camera); out.x = (_hs.x * 0.5 + 0.5) * innerWidth; out.y = (-_hs.y * 0.5 + 0.5) * innerHeight; out.z = _hs.z; return out.z < 1 && out.x > -40 && out.x < innerWidth + 40 && out.y > -40 && out.y < innerHeight + 40; }
function ringPoint(d, out) {
  if (d.kind === 'swap') return out.copy(d.center);
  if (d.kind === 'curtain') return curtainLead(d, out);
  const near = (a, b) => (b.distanceToSquared(camera.position) < a.distanceToSquared(camera.position) ? a.copy(b) : a);
  if (d.kind === 'slide') { out.set(d.w - 0.09, 1.05, 0.07); d.group.localToWorld(out); _hq.set(d.w - 0.09, 1.05, -0.07); d.group.localToWorld(_hq); return near(out, _hq); }
  if (d.axis === 'x') { out.set(0, (d.thick || 0.03) + 0.02, d.len * 0.82); return d.pivot.localToWorld(out); }      // toilet lid: near its front edge
  let x, y;
  if (d.shape === 'sash') { x = d.len - 0.05; y = d.z0 + d.h * 0.48; }
  else if (d.shape === 'round') { x = d.len - 0.03; y = d.z0 + d.len / 2; }
  else if (d.shape === 'closet') { x = d.len - 0.05; y = d.h > 1 ? Math.min(d.z0 + d.h * 0.45, 1.12) : d.z0 + d.h / 2; }
  else { x = d.len - 0.08; y = d.h > 1.5 ? 1.0 : d.z0 + d.h / 2; }
  const z = (d.thick || 0.04) / 2 + 0.03;
  out.set(x, y, z); d.pivot.localToWorld(out); _hq.set(x, y, -z); d.pivot.localToWorld(_hq);
  return near(out, _hq);
}
const hudRay = new THREE.Raycaster();
function hudVisible(key, from, to, own, every = 4) {     // cached line-of-sight test (walls and other furniture hide a point)
  const c = hud.occ.get(key);
  if (c && hud.n - c.n < every) return c.v;
  const dir = _hq.copy(to).sub(from), dist = dir.length(); dir.normalize();
  hudRay.set(from, dir); hudRay.far = Math.max(0.01, dist - 0.06);
  const v = !hudRay.intersectObjects(occluders(), false).some((h) => !(own && own.includes(h.object)));
  hud.occ.set(key, { n: hud.n, v }); return v;
}
function partsBox(d, fresh) {
  if (!d._bb || fresh) { d._bb = new THREE.Box3(); for (const p of d.parts) { p.updateMatrixWorld(true); d._bb.expandByObject(p); } }
  return d._bb;
}
const _sc = { x: 0, y: 0, z: 0 };
function hudUpdate() {
  hud.n++;
  { const q = camera.quaternion, c = camera.position, sig = c.x * 1.3 + c.y * 7.1 + c.z * 13.7 + q.x * 17 + q.y * 19 + q.z * 23 + q.w * 29 + innerWidth + innerHeight * 3;
    const still = sig === hud.lastSig && !camTween && hud.n % 8 !== 0 && !doors.some((d) => d.t !== undefined && d.t !== d.target) && hud.stateSig === `${mode}${!!focus}${moveLayer}${infoLayer}${measuring}`;
    hud.lastSig = sig; hud.stateSig = `${mode}${!!focus}${moveLayer}${infoLayer}${measuring}`;
    if (still) return; }                                             // perf: standing still → refresh the HUD only every 8th frame
  if (document.body.classList.contains('flying') !== !!camTween) document.body.classList.toggle('flying', !!camTween);
  for (const k in hud.used) hud.used[k] = 0;
  if (focus && !doors.includes(focus.door)) { const nd = doors.find((d) => isFurn(d) && doorMover(d) === focus.mover); if (nd) focus.door = nd; }   // pieces are rebuilt when they move
  const live = started && $('lightbox').hidden;
  hud.focusDoor = null;
  // 1. interaction points within reach (walk mode only)
  if (live && mode === 'walk' && !focus && !measuring) {
    let best = null, bestD = 0.42;
    for (const d of doors) {
      if (isFurn(d)) continue;
      const P = ringPoint(d, _hp);
      if (P.distanceTo(camera.position) > REACH) continue;
      if (!toScreen(P, _sc)) continue;
      if (!hudVisible(d, camera.position, P, d.parts)) continue;
      const b = hudEl('ipt'); b.hidden = false; b.style.left = _sc.x + 'px'; b.style.top = _sc.y + 'px';
      b._door = d; b._act = () => toggleDoor(d); b.classList.remove('focus');
      b.title = d.kind === 'swap' ? d.prompt() : d.name ? `${d.target > 0.5 ? 'Close' : 'Open'} ${d.name}${d.kind === 'curtain' ? ' (or scroll)' : ''}` : `${d.target > 0.5 ? 'Close' : 'Open'} the ${d.label.toLowerCase()}`;
      { const kk = b.querySelector('.k'); const want = d.kind === 'curtain' ? 'E · scroll' : 'E'; if (kk && kk.textContent !== want) kk.textContent = want; }
      b.setAttribute('aria-label', b.title);
      const dc = Math.hypot(_sc.x / innerWidth - 0.5, _sc.y / innerHeight - 0.5);
      if (dc < bestD) { bestD = dc; best = b; }
    }
    if (best) { best.classList.add('focus'); hud.focusDoor = best._door; }
  }
  // 2. furniture info buttons (quick bar I; the one of the piece in close-up always stays)
  if (live && !measuring && (infoLayer || focus)) {
    for (const d of doors) {
      if (!isFurn(d) || !d.parts.length) continue;
      if (focus && focus.door !== d) continue;
      if (mode === 'over' && coarse && !focus && camera.position.distanceTo(orbit.target) > 9) continue;   // phones: the plan from above stays clean until you zoom in
      const bb = partsBox(d, focus && focus.door === d);
      bb.getCenter(_hp); _hp.y = bb.max.y + 0.14;
      if (mode === 'walk') { const dist = _hp.distanceTo(camera.position); if (dist > 5.5 || dist < 0.5) continue; }
      if (!toScreen(_hp, _sc)) continue;
      if (mode === 'walk' && !hudVisible(d, camera.position, _hp, d.parts, 6)) continue;
      const b = hudEl('finfo'); b.hidden = false; b.style.left = _sc.x + 'px'; b.style.top = _sc.y + 'px';
      const on = !!focus && focus.door === d; b.classList.toggle('on', on);
      b.title = on ? 'Back to where you were' : `${d.label}: options`; b.setAttribute('aria-label', b.title);
      b._door = d; b._act = () => focusFurniture(d);
      d._infoAt = { x: _sc.x, y: _sc.y };
    }
  }
  // 3. move / turn arrows
  if (live && !measuring && (focus || moveLayer)) {
    const list = focus ? [focus.door] : doors.filter((d) => isFurn(d) && d.parts.length);
    for (const d of list) {
      const m = doorMover(d); if (!m || (!m.axis && !m.axis2 && !m.rotate)) continue;
      const bb = partsBox(d, true); bb.getCenter(_hp); const C = _hp.clone();
      if (!focus && mode === 'walk') { const dist = C.distanceTo(camera.position); if (dist > 7) continue; if (!hudVisible(d.parts[0], camera.position, C, d.parts, 6) && dist > 1.5) continue; }
      const hx = (bb.max.x - bb.min.x) / 2, hz = (bb.max.z - bb.min.z) / 2;
      const arrowPair = (ax, fn) => {
        if (!ax) return;
        const vertical = Math.abs(ax.y) > 0.9;
        const base = vertical && m.anchor ? (m.anchor() || C) : C.clone().setY(0.25);
        const ext = vertical ? 0.35 : Math.abs(ax.x) * hx + Math.abs(ax.z) * hz + 0.28;
        const bs = { x: 0, y: 0, z: 0 }; toScreen(base, bs);
        for (const sg of [1, -1]) {
          const P = base.clone().addScaledVector(ax, sg * ext);
          if (!toScreen(P, _sc)) continue;
          const b = hudEl('marr'); b.hidden = false; b.classList.remove('rot', 'ghost'); b.innerHTML = ARROW_SVG;
          b.style.left = _sc.x + 'px'; b.style.top = _sc.y + 'px';
          const ang = Math.atan2(_sc.y - bs.y, _sc.x - bs.x); b.firstChild.style.transform = `rotate(${ang}rad)`;
          b.title = vertical ? (sg > 0 ? 'Higher (5 cm)' : 'Lower (5 cm)') : 'Move 5 cm'; b.setAttribute('aria-label', b.title);
          b._act = () => { fn(sg); if (selected === m) updateMoverInfo(); hudRefreshSoon(); };
        }
      };
      arrowPair(m.axis && m.axis(), (sg) => m.shift(sg));
      arrowPair(m.axis2 && m.axis2(), (sg) => m.shift2(sg));
      if (m.rotate) {
        const top = C.clone(); top.y = bb.max.y + 0.14;
        if (toScreen(top, _sc)) for (const sg of [1, -1]) {
          const b = hudEl('marr'); b.hidden = false; b.classList.add('rot'); b.classList.remove('ghost'); b.textContent = sg > 0 ? '⟲' : '⟳';
          b.style.left = (_sc.x - sg * 38) + 'px'; b.style.top = _sc.y + 'px';
          b.title = sg > 0 ? 'Turn 15° anticlockwise' : 'Turn 15° clockwise'; b.setAttribute('aria-label', b.title);
          b._act = () => { m.rotate(sg); if (selected === m) updateMoverInfo(); hudRefreshSoon(); };
        }
      }
    }
  }
  for (const k in hud.pools) { const pool = hud.pools[k]; for (let i = hud.used[k]; i < pool.length; i++) if (!pool[i].hidden) { pool[i].hidden = true; pool[i]._act = null; } }
  // keep the close-up framed in the part of the screen the panel leaves free
  if (focus && !camTween) { const el = $('mover'), sig = `${innerWidth}x${innerHeight}:${el.offsetWidth}x${el.offsetHeight}`; if (sig !== hud.vsig) { hud.vsig = sig; applyViewOffset(); } }
}
function hudRefreshSoon() { shadowDirty = true; }
function hudClickAtCentre() {                    // mouse captured: the crosshair picks the HUD button under it
  const cx = innerWidth / 2, cy = innerHeight / 2;
  for (const k of ['marr', 'ipt', 'finfo']) for (const b of hud.pools[k]) {
    if (b.hidden || !b._act) continue;
    const r = b.getBoundingClientRect();
    if (cx > r.left - 10 && cx < r.right + 10 && cy > r.top - 10 && cy < r.bottom + 10) { b._act(); return true; }
  }
  return false;
}
// ---- close-up of one piece of furniture
function applyViewOffset(k = 1) {
  if (!focus && k >= 1) return;
  const W = innerWidth, H = innerHeight, el = $('mover');
  if (k <= 0.001) { camera.clearViewOffset(); return; }
  if (W <= 640) camera.setViewOffset(W, H, 0, k * Math.min(el.offsetHeight || H * 0.46, H * 0.46) / 2, W, H);
  else camera.setViewOffset(W, H, -k * ((el.offsetWidth || 360) + 12) / 2, 0, W, H);
}
// camera flights: position along a gentle arc, orientation slerped (no orbit-control fighting), the panel offset eased in/out,
// ceiling + upper floors shown or hidden at the moment the camera passes the ceiling, so nothing pops
const _m4 = new THREE.Matrix4();
const lookQuat = (pos, tgt) => new THREE.Quaternion().setFromRotationMatrix(_m4.lookAt(pos, tgt, UP));
function camTo(pos, q1, dur, opts = {}) {
  const p0 = camera.position.clone(), q0 = camera.quaternion.clone(), p1 = pos.clone();
  const lift = opts.lift ?? 0;                                   // extra height at mid-flight (an arc instead of a straight line)
  camTween = { p0, q0, p1, q1: q1.clone(), start: performance.now(), dur, lift, off: opts.off || null, tgt: opts.tgt || null, done: opts.done || null };
}
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;
function setUpperVisible(on) { if (ceiling && ceiling.visible !== on) ceiling.visible = on; for (const o of aboveMeshes) if (o.visible !== on) o.visible = on; }
function stepCamTween() {
  if (!camTween) return false;
  const T = camTween, k = Math.min(1, (performance.now() - T.start) / T.dur), e = easeIO(k), r = easeSine(Math.min(1, k * 1.15));
  camera.position.lerpVectors(T.p0, T.p1, e); camera.position.y += T.lift * Math.sin(Math.PI * e);
  camera.quaternion.slerpQuaternions(T.q0, T.q1, r);
  if (T.off) applyViewOffset(T.off[0] + (T.off[1] - T.off[0]) * e);
  setUpperVisible(camera.position.y - player.fy < 2.45);         // under the ceiling: keep the room closed
  if (k >= 1) {
    camTween = null;
    if (T.tgt) { orbit.target.copy(T.tgt); orbit.update(); }
    if (T.done) T.done();
  }
  return true;
}
function focusView(d, from) {
  const bb = partsBox(d, true), C = bb.getCenter(new THREE.Vector3()), size = bb.getSize(new THREE.Vector3());
  C.y = bb.min.y + size.y * 0.4;
  const dir = C.clone().sub(from).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1); dir.normalize();
  const R = Math.max(size.x, size.z) / 2, dist = THREE.MathUtils.clamp(2.4 + R * 1.5, 3.0, 7.0) * (innerWidth <= 640 ? 1.45 : 1);   // phones: the sheet takes the lower half
  return { pos: C.clone().addScaledVector(dir, -dist * 0.55).add(new THREE.Vector3(0, dist * 0.84, 0)), tgt: C };
}
function focusFurniture(d) {
  if (focus && focus.door === d) { selectFurniture(null); return; }
  if (focus) {                                                   // hop from one piece to another without leaving the close-up
    focus.switching = true; selectFurniture(null); d.swap(); focus.switching = false;
    if (!selected) { exitFocus(); return; }
    focus.door = d; focus.mover = selected; hud.vsig = '';
    const v = focusView(d, camera.position); camTo(v.pos, lookQuat(v.pos, v.tgt), 900, { tgt: v.tgt, off: [1, 1] }); return;
  }
  const prev = { mode, cam: camera.position.clone(), tgt: orbit.target.clone(), yaw: player.yaw, pitch: player.pitch };
  if (selected) selectFurniture(null);
  d.swap(); if (!selected) return;
  focus = { door: d, mover: selected, prev };
  document.body.classList.add('focus'); $('mover').classList.add('docked');
  const startCam = camera.position.clone(), startQ = camera.quaternion.clone(), wasWalk = mode === 'walk';
  if (mode !== 'over') setMode('over', true);
  camera.position.copy(startCam); camera.quaternion.copy(startQ);      // fly from exactly where you were looking
  if (wasWalk) setUpperVisible(true);
  hud.vsig = 'tween';
  const v = focusView(d, startCam);
  camTo(v.pos, lookQuat(v.pos, v.tgt), 1150, { tgt: v.tgt, off: [0, 1], lift: wasWalk ? 0.25 : 0, done: () => { hud.vsig = ''; } });
}
function endFocusLook(keepOffset) { if (!keepOffset) camera.clearViewOffset(); hud.vsig = ''; document.body.classList.remove('focus'); $('mover').classList.remove('docked'); }
function exitFocus() {
  if (!focus) return;
  const f = focus; focus = null; endFocusLook(true);               // the framing offset eases out during the flight back
  if (f.prev.mode === 'walk') {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(f.prev.pitch, f.prev.yaw, 0));
    camTo(f.prev.cam, q, 1000, { off: [1, 0], lift: 0.2, done: () => { camera.clearViewOffset(); if (!focus) setMode('walk', true); } });
  } else camTo(f.prev.cam, lookQuat(f.prev.cam, f.prev.tgt), 900, { off: [1, 0], tgt: f.prev.tgt, done: () => camera.clearViewOffset() });
}
// ---- Move layer (quick bar G)
function setMoveLayer(on) { moveLayer = on; $('qMove').setAttribute('aria-pressed', String(on)); showToast(on ? 'Move: use the arrows around each piece (hold to keep moving)' : 'Move arrows off'); }
$('qMove').addEventListener('click', () => setMoveLayer(!moveLayer));
function setInfoLayer(on) { infoLayer = on; $('qInfo').setAttribute('aria-pressed', String(on)); try { localStorage.setItem('aptInfo', on ? '1' : '0'); } catch (_) { /* private mode */ } }
try { if (localStorage.getItem('aptInfo') === '0') setInfoLayer(false); } catch (_) { /* ignore */ }
$('qInfo').addEventListener('click', () => { setInfoLayer(!infoLayer); showToast(infoLayer ? 'Info buttons on' : 'Info buttons off'); });
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey || e.repeat || !$('lightbox').hidden) return;
  if (e.code === 'KeyG') setMoveLayer(!moveLayer);
  else if (e.code === 'KeyI') $('qInfo').click();
  else if (e.code === 'KeyL') toggleAllLights();
});
$('qLights').addEventListener('click', () => toggleAllLights());
addEventListener('resize', () => { hud.vsig = ''; });
window.__hudDbg = () => doors.filter((d) => !isFurn(d)).map((d) => { const P = ringPoint(d, new THREE.Vector3()); const dist = P.distanceTo(camera.position); if (dist > REACH) return null; const sc = {}; const on = toScreen(P, sc); hud.occ.delete(d); const vis = hudVisible(d, camera.position, P, d.parts); return [d.label, dist.toFixed(2), on, vis, Math.round(sc.x), Math.round(sc.y), started, measuring, mode, !!focus]; }).filter(Boolean);
window.__bvc = () => buildVaerCloset(); window.__bs = () => { buildSofa(); livingDims(); }; window.__bd = () => { buildDining(); };
window.__apt = { shopLines, shopText, layoutSnapshot, layoutApply, layoutEncode, layoutDecode, placementCheck, computeDaylight, setPlan, roomsState, night, buildRoomFurniture, ROOMF, NIGHT, getDaylight: () => DAYLIGHT, curtainProbe, fxAssign, FX, LPOOL, setAutoLights, autoLightTick, autoLightsCfg, roomLightMovers, placeBedPendants, holm, buildHolm, holmMover, desk, buildDesk, deskMover, swapDeskCloset, alc, buildAlcove, alcoveMover, cons, buildConsole, consoleMover, art, buildArt, artMover, curtains, books, booksMover, buildBooks, plant, plantMover, buildPlant, setAllLights, toggleAllLights, hueLights, getHold: () => lightHold, THREE_Raycaster: THREE.Raycaster, blockedWhy: (bx, by) => { const d = b2t(bx, by).normalize(), fy = player.fy, out = []; const r = new THREE.Raycaster(); r.far = 0.4; for (const h of [0.45, 0.95, 1.55]) { r.set(new THREE.Vector3(player.pos.x, fy + h, player.pos.z), d); const hit = r.intersectObjects(fy < -0.6 ? outdoorBlockers(player.pos) : collidables, false)[0]; if (hit) out.push([h, hit.object.name, hit.object.material && hit.object.material.name, hit.distance.toFixed(2), Object.keys(MATS).find((k) => MATS[k] === hit.object.material)]); } return [out, groundAt(player.pos.x + d.x * 0.1, player.pos.z + d.z * 0.1, fy)]; }, stepWalk: (bx, by, dist) => { const d = b2t(bx, by).normalize(); let moved = 0; for (let t = 0; t < dist; t += 0.04) { const b = player.pos.clone(); tryMove(d.clone().multiplyScalar(0.04)); moved += b.distanceTo(player.pos) > 1e-4 ? 0.04 : 0; } return [...toBl(player.pos).map((v) => +v.toFixed(2)), +player.fy.toFixed(2), +moved.toFixed(2)]; }, lift, LIFT, rideTo, callLift, setFeet, groundAt, setTV, tvState, nook, nookMover, vpax, vpaxMover, petra, petraMover, buildPetra, hud, focusFurniture, exitFocus, setMoveLayer, getFocus: () => focus, getTween: () => camTween, LIGHTS, applyLights, livingLights, lamp, lampMover, guest, guestMover, furn, closetMover, dining, diningMover, diningGaps, renderer, scene, collidables, nearestDoor, blocked, player, doors, b2t, bed, tv, tvMover, liv, sofaMover, mediaMover, sofaGaps, SOFA_MODELS, sofaFull, getSofas: () => SOFAS, sofaName, selectFurniture, camera, orbit, setMode, furn, gapTo, getHit: () => lastGapHit };
