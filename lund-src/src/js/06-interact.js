// ============================================================ interaction: doors, cupboards, appliances, windows, lamps
// Everything usable registers in INTER (see inter() in 04-furniture). E / Space / a click uses what is under the crosshair,
// or the nearest thing in front of you within reach; on touch, a tap on it does the same.
const REACH = 2.3;
const _ray = new THREE.Raycaster();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
let interMeshes = null;
function interPickList() {
  if (!interMeshes) { interMeshes = []; for (const it of INTER) for (const m of it.parts) { m.userData.inter = it; interMeshes.push(m); } }
  return interMeshes;
}
function interAtRay(origin, dir, far = REACH) {
  _ray.set(origin, dir); _ray.far = far;
  const hits = _ray.intersectObjects([...interPickList(), ...collidables], false);
  for (const h of hits) {
    if (h.object.userData.inter) return h.object.userData.inter;
    // a wall in front of the thing: nothing
    return null;
  }
  return null;
}
function interNear() {
  if (typeof hudFocus !== 'undefined' && hudFocus) return hudFocus;
  // under the crosshair first
  camera.getWorldDirection(_v);
  const hit = interAtRay(camera.position, _v);
  if (hit) return hit;
  // else the nearest one roughly in front, within reach, not behind a wall
  let best = null, bestS = Infinity;
  for (const it of INTER) {
    if (it.noNear) continue;
    it.anchor(_v2);
    const d = _v2.distanceTo(camera.position); if (d > REACH - 0.3) continue;
    const dir = _v2.clone().sub(camera.position).normalize();
    const facing = dir.dot(_v); if (facing < 0.55) continue;
    _ray.set(camera.position, dir); _ray.far = d - 0.15;
    if (_ray.intersectObjects(collidables, false).some((h) => !it.parts.includes(h.object))) continue;
    const s = d * (2 - facing);
    if (s < bestS) { bestS = s; best = it; }
  }
  return best;
}
function useInter(it) {
  if (!it) return false;
  it.act();
  shadowDirty = true;
  return true;
}
function stepInter(dt) {
  let moving = false;
  for (const it of INTER) {
    if (it.t === undefined || it.t === it.target) continue;
    const sp = dt / (it.dur || 0.6);
    it.t = it.target > it.t ? Math.min(it.target, it.t + sp) : Math.max(it.target, it.t - sp);
    const e = it.t * it.t * (3 - 2 * it.t);
    it.apply(e);
    moving = true;
  }
  if (moving) shadowDirty = true;
  return moving;
}

// ---- interaction points: a ring at the handle of everything usable within reach (like the Copenhagen walkthrough);
// the one nearest the centre of the view is highlighted and is what E / a click uses. Clicking a ring uses it too.
let hudFocus = null;
const hud = { el: $('hud3d'), pool: [], n: 0, occ: new Map() };
const _hp = new THREE.Vector3(), _hs = new THREE.Vector3(), _hq = new THREE.Vector3();
function hudEl(i) {
  if (hud.pool[i]) return hud.pool[i];
  const b = document.createElement('button'); b.className = 'ipt'; b.type = 'button'; b.innerHTML = '<span class="k">E</span>';
  b.addEventListener('click', (e) => { e.stopPropagation(); if (b._it) useInter(b._it); });
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  hud.el.appendChild(b); hud.pool.push(b); return b;
}
function anchorOf(it, v) { if (it.handle) return it.handle.getWorldPosition(v); return it.anchor(v); }
function hudUpdate() {
  hud.n++;
  let used = 0, best = null, bestD = 0.36;
  if (mode === 'walk' && started) {
    for (const it of INTER) {
      anchorOf(it, _hp);
      const d = _hp.distanceTo(camera.position); if (d > REACH) continue;
      _hs.copy(_hp).project(camera); if (_hs.z > 1 || Math.abs(_hs.x) > 1.05 || Math.abs(_hs.y) > 1.05) continue;
      // line of sight (cached a few frames): walls and other things hide a point
      let c = hud.occ.get(it);
      if (!c || hud.n - c.n > 5) {
        const dir = _hq.copy(_hp).sub(camera.position).normalize(); _ray.set(camera.position, dir); _ray.far = Math.max(0.01, d - 0.08);
        const vis = !_ray.intersectObjects(collidables, false).some((h) => !it.parts.includes(h.object));
        c = { n: hud.n, v: vis }; hud.occ.set(it, c);
      }
      if (!c.v) continue;
      const b = hudEl(used++); b.hidden = false; b._it = it;
      b.style.left = ((_hs.x * 0.5 + 0.5) * innerWidth) + 'px'; b.style.top = ((-_hs.y * 0.5 + 0.5) * innerHeight) + 'px';
      b.title = it.label(); b.setAttribute('aria-label', b.title); b.classList.remove('focus');
      const dc = Math.hypot(_hs.x / 2, _hs.y / 2);
      if (dc < bestD) { bestD = dc; best = b; }
    }
  }
  for (let i = used; i < hud.pool.length; i++) hud.pool[i].hidden = true;
  hudFocus = best ? best._it : null;
  if (best) best.classList.add('focus');
}
