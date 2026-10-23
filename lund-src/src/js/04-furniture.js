// ============================================================ furniture, appliances, doors and windows (from the 20 listing photos)
// Local frames: pg(px, py, rot) is a group standing on our floor at a plan point; its local x runs along plan x (towards
// Trollebergsvägen), local z along plan y (into the building), turned by rot (radians, plan sense: +x towards +y).
const INTER = [];
function pg(px, py, rot = 0, z = FZ) { const g = new THREE.Group(); const c = P(px, py); g.position.set(c[0], z, -c[1]); g.rotation.y = PANG - rot; return g; }
// local box: w (x) × h (up) × d (z), centred at x/z, standing on y
function lb(par, w, h, d, x, y, z, mat, o = {}) {
  const g = o.round ? new RoundedBoxGeometry(w, h, d, 2, Math.min(o.round, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  if (!o.round) boxUVs(g, w, h, d);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y + h / 2, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.shadow !== false; m.receiveShadow = true; par.add(m); return m;
}
function lcyl(par, rt, rb, h, x, y, z, mat, seg = 20, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z);
  if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = o.shadow !== false; m.receiveShadow = true; par.add(m); return m;
}
function lsph(par, r, x, y, z, mat, o = {}) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 16, o.seg2 || 12), mat); m.position.set(x, y, z); if (o.sy) m.scale.y = o.sy; m.castShadow = o.shadow !== false; par.add(m); return m; }
// merge a finished static group into the batches
function bake(g, flags = {}) {
  g.updateMatrixWorld(true);
  g.traverse((m) => { if (!m.isMesh) return; const geo = m.geometry.clone().applyMatrix4(m.matrixWorld); addStatic(geo, m.material, { ...flags, noShadow: flags.noShadow || m.castShadow === false }); });
}
// an interactable: parts = meshes you can point at; apply(t) poses it for t in 0..1
function inter(o) {
  const it = { t: 0, target: 0, dur: 0.6, ...o };
  if (!it.act) it.act = () => { it.target = it.target ? 0 : 1; if (o.onAct) o.onAct(it); };
  if (!it.anchor) it.anchor = (v) => { const b = new THREE.Box3(); for (const p of it.parts) b.expandByObject(p); return b.getCenter(v); };
  it.label = it.label || (() => (it.target ? 'Close ' : 'Open ') + it.name);
  INTER.push(it); return it;
}
function hingedLeaf(par, { w, h, d, mat, hingeAt = 'left', handle = true, handleMat = MATS.steel, handleH = 1.0, knob }) {
  // returns a pivot group at the hinge; the leaf extends along +x (hingeAt left) or -x (right)
  const piv = new THREE.Group(); par.add(piv);
  const s = hingeAt === 'left' ? 1 : -1;
  const leaf = lb(piv, w, h, d, s * w / 2, 0, 0, mat);
  const parts = [leaf];
  if (handle) {
    for (const side of [-1, 1]) {
      if (knob) parts.push(lsph(piv, 0.018, s * (w - 0.06), handleH, side * (d / 2 + 0.015), handleMat));
      else parts.push(lb(piv, 0.12, 0.02, 0.02, s * (w - 0.1), handleH, side * (d / 2 + 0.03), handleMat));
    }
  }
  return { piv, leaf, parts };
}

// ============================================================ doors
MATS.brass = std({ color: 0xc9a663, roughness: 0.3, metalness: 1 });
MATS.doorPanel = std({ map: canvasTex(256, 512, (g, W, Hh) => {
  g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, W, Hh);
  // two raised panels with arched top (classic 1980s Swedish interior door, as in the photos)
  g.strokeStyle = 'rgba(0,0,0,.10)'; g.lineWidth = 6;
  const r = (x, y, w, h, arch) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + (arch ? 30 : 0)); if (arch) g.quadraticCurveTo(x + w / 2, y - 22, x + w, y + 30); else g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.closePath(); g.stroke(); };
  r(40, 60, W - 80, 260, true); r(40, 360, W - 80, 110, false);
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; r(44, 64, W - 88, 252, true); r(44, 364, W - 88, 102, false);
}, [1, 1]), roughness: 0.4 });
{
  // panel door: map the canvas onto the faces (u across the leaf, v up)
  MATS.doorPanel.map.repeat.set(1, 1);
}
function panelDoorMesh(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv, pos = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) { if (Math.abs(n.getZ(i)) > 0.5) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5); else uv.setXY(i, 0.02, 0.02); }
  return g;
}
function doorAt({ name, px, py0, py1, wallX, thick, opensTo = 1, hinge = 'low', mat = MATS.doorPanel, height = 2.04, angle = 95, z = FZ, knob = false, frosted = false }) {
  // a door in a wall running along plan y; leaf turns about the hinge edge into +x (opensTo 1) or -x side
  const yh = hinge === 'low' ? py0 : py1, w = pw(py1 - py0) - 0.01;
  const g = pg(wallX, yh, 0, z); scene.add(g);
  const piv = new THREE.Group(); g.add(piv);
  const sgn = hinge === 'low' ? 1 : -1;         // leaf runs along +z (plan +y) from a low hinge
  const geo = mat === MATS.doorPanel ? panelDoorMesh(thick, height, w) : new THREE.BoxGeometry(thick, height, w);
  const leaf = new THREE.Mesh(geo, mat); leaf.position.set(0, height / 2, sgn * w / 2); leaf.castShadow = leaf.receiveShadow = true; piv.add(leaf);
  const parts = [leaf];
  for (const side of [-1, 1]) {
    const hz = sgn * (w - 0.07);
    if (knob) parts.push(lsph(piv, 0.025, side * (thick / 2 + 0.03), 1.0, hz, MATS.brass));
    else { parts.push(lb(piv, 0.02, 0.02, 0.13, side * (thick / 2 + 0.04), 1.0, hz - sgn * 0.05, MATS.brass)); parts.push(lb(piv, 0.03, 0.05, 0.05, side * (thick / 2 + 0.015), 0.97, hz, MATS.brass)); }
  }
  if (frosted) { const fg = lb(piv, thick + 0.004, height * 0.55, w * 0.6, 0, height * 0.35, sgn * w / 2, MATS.frosted, { shadow: false }); parts.push(fg); }
  parts.forEach((p) => collidables.push(p));
  return inter({ name, parts, handle: parts[parts.length - 1], dur: 0.7, apply: (t) => { piv.rotation.y = -sgn * opensTo * t * angle * D2R; } });
}
const DOORS = {};
// front door: oak veneer, opens out into the stairwell, hinge at the hall end (handle by the coat rack, as in the photos)
DOORS.front = doorAt({ name: 'front door', px: 258, py0: 1291, py1: 1428, wallX: 258, thick: 0.06, opensTo: 1, hinge: 'low', mat: MATS.oakdoor, height: 2.08 });
DOORS.bath = doorAt({ name: 'bathroom door', px: 448, py0: 992, py1: 1111, wallX: 448, thick: 0.04, opensTo: 1, hinge: 'high' });
DOORS.bed = doorAt({ name: 'bedroom door', px: 644, py0: 1284, py1: 1402, wallX: 644, thick: 0.04, opensTo: -1, hinge: 'high' });
// the main door in the left arch on Rådmansgatan: red frame, glazed double door into the gateway to the yard
MATS.redframe = MATS.redframe || std({ color: 0x9a2a22, roughness: 0.45 });
if (GATEWAY.at) {
  const { at, ang } = GATEWAY, w = GATEWAY.s1 - GATEWAY.s0, h = 2.0, parts = [], pivs = [];
  for (const side of [0, 1]) {
    const hp = at(side ? GATEWAY.s1 : GATEWAY.s0, -0.2);
    const g = new THREE.Group(); g.position.set(hp[0], 0.0, -hp[1]); g.rotation.y = ang; scene.add(g);
    const piv = new THREE.Group(); g.add(piv); pivs.push(piv);
    const d = side ? -1 : 1, lw = w / 2 - 0.01, X = (v) => d * v;
    for (const [x, y, ww, hh] of [[lw / 2, 0, lw, 0.14], [lw / 2, h - 0.1, lw, 0.1], [0.05, 0, 0.1, h], [lw - 0.05, 0, 0.1, h], [lw / 2, 1.0, lw, 0.08]]) parts.push(lb(piv, ww, hh, 0.06, X(x), y, 0, MATS.redframe));
    parts.push(lb(piv, lw - 0.2, h - 0.24, 0.02, X(lw / 2), 0.14, 0, MATS.glass, { shadow: false }));
    parts.push(lb(piv, 0.03, 0.35, 0.03, X(lw - 0.12), 0.85, 0.07, MATS.steel), lb(piv, 0.03, 0.35, 0.03, X(lw - 0.12), 0.85, -0.07, MATS.steel));
  }
  // red glazed fanlight in the arch above the doors
  { const r = w / 2, c = at((GATEWAY.s0 + GATEWAY.s1) / 2, -0.2); const sh = new THREE.Shape(); sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.absarc(0, 0, r, 0, Math.PI, false);
    const fg = new THREE.ShapeGeometry(sh, 16); fg.rotateY(ang); fg.translate(c[0], 2.05, -c[1]); addStatic(fg, MATS.darkglass, {});
    const bar = new THREE.BoxGeometry(w, 0.08, 0.07); bar.rotateY(ang); bar.translate(c[0], 2.04, -c[1]); addStatic(bar, MATS.redframe, {}); }
  parts.forEach((p) => collidables.push(p));
  DOORS.street = inter({ name: 'main door', parts, handle: parts.find((p) => p.material === MATS.steel), dur: 0.9, apply: (t) => { pivs[0].rotation.y = t * 92 * D2R; pivs[1].rotation.y = -t * 92 * D2R; } });
  // house number on the stone beside the arch
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.14), new THREE.MeshStandardMaterial({ map: canvasTex(130, 70, (gg) => { gg.fillStyle = '#f3f1ea'; gg.fillRect(0, 0, 130, 70); gg.fillStyle = '#1d2a3a'; gg.font = '700 44px Schibsted Grotesk, Arial'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('1A', 65, 38); }, [1, 1]), roughness: 0.5 }));
  sign.material.map.repeat.set(1, 1); const sp = at(GATEWAY.s0 - 0.45, 0.02); sign.position.set(sp[0], 2.0, -sp[1]); sign.rotation.y = ang; scene.add(sign);
}
// the red courtyard door at the inner corner of the block (glazed, flush with the yard: no steps), with its little blue canopy
{
  const g = pg(-600, 1676, 0, FZ); scene.add(g); const piv = new THREE.Group(); g.add(piv);
  const w = pw(130), h = 2.12, parts = [];
  for (const [x, y, ww, hh] of [[w / 2, 0, w, 0.14], [w / 2, h - 0.1, w, 0.1], [0.05, 0, 0.1, h], [w - 0.05, 0, 0.1, h], [w / 2, 1.0, w, 0.08]]) parts.push(lb(piv, ww, hh, 0.05, x, y, 0, MATS.redframe));
  parts.push(lb(piv, w - 0.2, h - 0.24, 0.02, w / 2, 0.14, 0, MATS.glass, { shadow: false }));
  parts.push(lb(piv, 0.12, 0.03, 0.03, w - 0.12, 1.0, 0.05, MATS.steel), lb(piv, 0.12, 0.03, 0.03, w - 0.12, 1.0, -0.05, MATS.steel));
  parts.forEach((p) => collidables.push(p));
  DOORS.yard = inter({ name: 'courtyard door', parts, handle: parts[parts.length - 2], dur: 0.8, apply: (t) => { piv.rotation.y = -t * 95 * D2R; } });
  const c = pg(-535, 1685 + 0.45 * PXM / 1, 0, FZ); lb(c, 1.4, 0.05, 0.75, 0, 2.35, 0, MATS.bayBlue, { rx: 0.12 }); for (const x of [-0.6, 0.6]) lb(c, 0.04, 0.04, 0.7, x, 2.28, -0.05, MATS.steel, { rx: -0.5 }); bake(c);
  const lamp = pg(-430, 1690, 0, FZ); lcyl(lamp, 0.09, 0.09, 0.05, 0, 2.05, 0, MATS.white, 16, { rx: Math.PI / 2 }); bake(lamp);
}

// ============================================================ windows: inward-opening casements (two sashes each)
for (const w of windows) {
  const { u, n } = w, fw = w.frameW, W = w.s1 - w.s0 - 2 * fw, Hh = w.z1 - w.z0 - 2 * fw, oF = w.oF;
  const parts = [], pivs = []; let winHandle = null;
  for (const side of [0, 1]) {
    const sw = W / 2, hingeS = side ? w.s1 - fw : w.s0 + fw;
    const hp = w.at(hingeS, oF - 0.03);
    const g = new THREE.Group(); g.position.set(hp[0], w.z0 + fw, -hp[1]); g.rotation.y = Math.atan2(u[1], u[0]); scene.add(g);
    const piv = new THREE.Group(); g.add(piv); pivs.push(piv);
    const dir = side ? -1 : 1, x = (v) => dir * v;
    const sf = 0.05, sd = 0.085;      // coupled sash (two panes ~5 cm apart, as in Swedish "kopplade bågar")
    parts.push(lb(piv, sf, Hh, sd, x(sf / 2), 0, 0, MATS.frame), lb(piv, sf, Hh, sd, x(sw - sf / 2), 0, 0, MATS.frame));
    parts.push(lb(piv, sw, sf, sd, x(sw / 2), 0, 0, MATS.frame), lb(piv, sw, sf, sd, x(sw / 2), Hh - sf, 0, MATS.frame));
    parts.push(lb(piv, sw - 2 * sf, Hh * 0.42, 0.006, x(sw / 2), sf, 0.03, MATS.frosted, { shadow: false }));
    parts.push(lb(piv, sw - 2 * sf, Hh - 2 * sf, 0.006, x(sw / 2), sf, 0.022, MATS.glass, { shadow: false }));
    parts.push(lb(piv, sw - 2 * sf, Hh - 2 * sf, 0.006, x(sw / 2), sf, -0.03, MATS.glass, { shadow: false }));
    // the coupling strip between the two panes, seen in the gap
    parts.push(lb(piv, sw - 2 * sf, 0.012, 0.05, x(sw / 2), sf, -0.004, MATS.frame, { shadow: false }));
    // handle on the room side of the meeting edge
    if (!side) { winHandle = lb(piv, 0.02, 0.13, 0.025, x(sw - 0.035), Hh * 0.5, 0.07, MATS.chrome); parts.push(winHandle); lb(piv, 0.03, 0.05, 0.02, x(sw - 0.035), Hh * 0.5 + 0.05, 0.05, MATS.chrome); }
    else { const h2 = lb(piv, 0.02, 0.13, 0.025, x(sw - 0.035), Hh * 0.5, 0.07, MATS.chrome); parts.push(h2); }
  }
  if (w.id === 'win_bed') {
    // dark grey roller blind across the top, pulled down by its cord (the bedroom photo)
    const c = w.at((w.s0 + w.s1) / 2, -0.07);
    const g = new THREE.Group(); g.position.set(c[0], w.z1 + 0.14, -c[1]); g.rotation.y = w.ang; scene.add(g);
    const Wb = w.s1 - w.s0 + 0.16;
    const cas = lcyl(g, 0.04, 0.04, Wb, 0, -Wb / 2, 0, MATS.blind || (MATS.blind = std({ color: 0x3c3e42, roughness: 0.7 })), 20, { rz: Math.PI / 2 });
    cas.position.y = 0;
    const fab = new THREE.Mesh(new THREE.BoxGeometry(Wb - 0.04, 1, 0.004).translate(0, -0.5, 0), std({ color: 0x45474b, roughness: 0.95, side: THREE.DoubleSide }));
    fab.position.set(0, -0.03, 0.035); fab.scale.y = 0.001; fab.castShadow = true; g.add(fab);
    const bar = lb(g, Wb - 0.03, 0.025, 0.02, 0, -0.06, 0.035, MATS.matblack);
    const drop = w.z1 + 0.14 - w.z0 - 0.08;
    inter({ name: 'roller blind', parts: [cas, bar, fab], handle: bar, dur: 1.4, label: function () { return (this.target ? 'Raise ' : 'Lower ') + 'the roller blind'; },
      apply: (t) => { fab.scale.y = Math.max(0.001, t * drop); bar.position.y = -0.06 - t * drop; } });
  } else {
    // venetian blind head rail (white, as in the photos)
    const c = w.at((w.s0 + w.s1) / 2, oF - 0.07); sbox(w.s1 - w.s0 - 0.12, 0.04, 0.04, c[0], c[1], w.z1 - 0.1, w.ang, MATS.white, {});
  }
  const inward = 1;   // sashes swing into the room (n points outward, so negative local z)
  inter({ name: 'window', parts, handle: winHandle, dur: 0.9, anchor: (v) => { const c = w.at((w.s0 + w.s1) / 2, 0); return v.set(c[0], w.z0 + 0.6, -c[1]); },
    apply: (t) => { pivs[0].rotation.y = -t * 80 * D2R * inward; pivs[1].rotation.y = -pivs[0].rotation.y; } });   // local +z is the room side
}

// ============================================================ materials for the furniture
MATS.cab = std({ color: 0xf7f7f5, roughness: 0.38 });
MATS.knob = std({ color: 0x151515, roughness: 0.4, metalness: 0.4 });
MATS.blackgloss = std({ color: 0x0a0a0b, roughness: 0.08, metalness: 0.3, envMapIntensity: 1.3 });
MATS.hob = std({ color: 0x050506, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.5 });
MATS.sofa = std({ color: 0xd8d4cb, roughness: 1 });
MATS.sofa2 = std({ color: 0xe4e1da, roughness: 1 });
MATS.red = std({ color: 0xc81e24, roughness: 0.8 });
MATS.navy = std({ color: 0x3a5487, roughness: 0.9 });
MATS.redGloss = std({ color: 0xd2231c, roughness: 0.15 });
MATS.duvet = std({ map: canvasTex(256, 256, (g, W) => { g.fillStyle = '#8e99b9'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(60,70,105,.25)'; g.lineWidth = 2; for (let k = 0; k <= W; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, W); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(W, k); g.stroke(); } }, [0.25, 0.25]), roughness: 1 });
MATS.throw = std({ color: 0x6e735e, roughness: 1 });
MATS.pillow = std({ color: 0xbfd0ea, roughness: 1 });
MATS.sheet = std({ color: 0xc9d7ee, roughness: 1 });
MATS.oakLeg = std({ color: 0xd2a874, roughness: 0.6 });
MATS.plant = std({ color: 0x3d7a34, roughness: 0.9, side: THREE.DoubleSide });
MATS.pink = std({ color: 0xe36aa4, roughness: 0.8 });
MATS.apple = std({ color: 0xb3161c, roughness: 0.35 });
MATS.orangeTowel = std({ color: 0xf08a2c, roughness: 1 });
MATS.limeTowel = std({ color: 0x9cb03a, roughness: 1 });
MATS.screenOff = std({ color: 0x050607, roughness: 0.12, metalness: 0.4, envMapIntensity: 1.2 });
MATS.showerBack = std({ color: 0x15171a, roughness: 0.1, metalness: 0.3 });
MATS.greyCab = std({ color: 0x9da2a6, roughness: 0.4 });
MATS.flag = std({ map: canvasTex(512, 512, (g, W) => {
  // a faded, washed cotton US-flag cushion cover: 13 stripes, canton with 50 small stars, soft vignette at the seams
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#efe9df' : '#a8343a'; g.fillRect(0, i * W / 13, W, W / 13 + 1); }
  g.fillStyle = '#2e3b62'; g.fillRect(0, 0, W * 0.48, W * 7 / 13);
  g.fillStyle = '#efe9df';
  const star = (x, y, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  for (let row = 0; row < 9; row++) for (let col = 0; col < (row % 2 ? 5 : 6); col++) star(W * 0.48 * ((col + (row % 2 ? 1 : 0.5)) / 6), W * 7 / 13 * ((row + 0.6) / 9.6), 7);
  const v = g.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,40,30,.28)'); g.fillStyle = v; g.fillRect(0, 0, W, W);
}, [1, 1]), roughness: 1 });
MATS.flag.map.repeat.set(1, 1);
const STATIC_C = { collide: true };

// Fellow Espresso Series 1: 315 W × 438 D × 279 H mm. Niche Zero: 122 × 211 × 311 mm (ported from the Copenhagen kitchen)
MATS.espresso = std({ color: 0x141414, roughness: 0.55 });
MATS.chromeK = std({ color: 0xd9dadc, roughness: 0.12, metalness: 1 });
MATS.nicheBlack = std({ color: 0x0e0e0f, roughness: 0.18, metalness: 0.2 });
MATS.nicheOak = std({ color: 0xa4643a, roughness: 0.45 });
MATS.clearLid = new THREE.MeshStandardMaterial({ color: 0xe8eef2, roughness: 0.05, transparent: true, opacity: 0.35 });
MATS.canister = std({ color: 0x3b3d40, roughness: 0.4, metalness: 0.5 });
function coffeeKit(par, x, zWall, top) {
  // local frame inside: +z = towards the room, +x = along the counter; the run's own front is at -z, so turn it round
  const kit = (dx, dz) => { const g = new THREE.Group(); g.position.set(x + dx, top, zWall - dz); g.rotation.y = Math.PI; par.add(g); return g; };
  const put = (g, geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const cyl = (rt, rb, h, seg = 28) => new THREE.CylinderGeometry(rt, rb, h, seg);
  const E = kit(0, 0.03 + 0.219);
  put(E, new THREE.BoxGeometry(0.315, 0.035, 0.438), MATS.espresso, 0, 0.0175, 0);
  put(E, new THREE.BoxGeometry(0.29, 0.006, 0.13), MATS.chromeK, 0, 0.037, 0.14);
  put(E, new THREE.BoxGeometry(0.315, 0.244, 0.3), MATS.espresso, 0, 0.035 + 0.122, -0.069);
  put(E, new THREE.BoxGeometry(0.3, 0.008, 0.29), MATS.blackgloss, 0, 0.283, -0.069);
  put(E, cyl(0.072, 0.072, 0.07), MATS.chromeK, -0.03, 0.2, 0.1);
  put(E, cyl(0.036, 0.034, 0.035), MATS.chromeK, -0.03, 0.148, 0.1);
  put(E, new THREE.BoxGeometry(0.025, 0.025, 0.14), MATS.espresso, -0.03, 0.145, 0.2).rotation.x = 0.12;
  put(E, cyl(0.005, 0.005, 0.2, 10), MATS.chromeK, 0.115, 0.17, 0.1);
  put(E, cyl(0.007, 0.007, 0.03, 10), std({ color: 0xff5a1f, roughness: 0.5 }), 0.115, 0.075, 0.1);
  put(E, new THREE.CircleGeometry(0.03, 24), new THREE.MeshStandardMaterial({ color: 0x2f6fe0, emissive: 0x2f6fe0, emissiveIntensity: 0.8 }), 0.12, 0.2, 0.0815);
  put(E, cyl(0.02, 0.02, 0.025), MATS.espresso, 0.12, 0.1, 0.09).rotation.x = Math.PI / 2;
  put(E, cyl(0.045, 0.038, 0.1), MATS.chromeK, 0.09, 0.337, -0.17);
  put(E, cyl(0.04, 0.042, 0.03), MATS.espresso, 0.09, 0.302, -0.07);
  const N = kit(-0.315 / 2 - 0.05 - 0.07, 0.03 + 0.105);
  put(N, new THREE.BoxGeometry(0.14, 0.03, 0.21), MATS.nicheOak, 0, 0.015, 0);
  put(N, cyl(0.058, 0.05, 0.2), MATS.nicheBlack, 0, 0.14, -0.02);
  put(N, cyl(0.06, 0.058, 0.03), MATS.nicheBlack, 0, 0.255, -0.02);
  put(N, new THREE.SphereGeometry(0.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MATS.clearLid, 0, 0.27, -0.02).scale.y = 0.6;
  put(N, cyl(0.03, 0.03, 0.05), MATS.chromeK, 0, 0.055, 0.06);
  const K = kit(-0.12, 0.03 + 0.34);
  put(K, new THREE.BoxGeometry(0.28, 0.01, 0.2), MATS.espresso, -0.1, 0.005, 0);
  put(K, cyl(0.029, 0.029, 0.02), MATS.espresso, -0.02, 0.02, 0);
  put(K, cyl(0.012, 0.016, 0.08, 14), MATS.espresso, -0.02, 0.07, 0);
  put(K, new THREE.SphereGeometry(0.02, 14, 10), MATS.espresso, -0.02, 0.115, 0);
  const C = kit(-0.48, 0.1);
  put(C, cyl(0.06, 0.06, 0.19), MATS.canister, 0, 0.095, 0);
  put(C, cyl(0.062, 0.062, 0.02), MATS.espresso, 0, 0.2, 0);
  put(C, cyl(0.07, 0.07, 0.13), MATS.espresso, 0.02, 0.065, 0.22);
}

// ============================================================ kitchen: white L kitchen, grey worktop, mosaic splashback, black Bosch dishwasher, steel oven and hood
{
  // run A along the Rådmansgatan side wall... (plan-left wall), worktop front at x = 125
  const g = pg(32, 357), L = pw(834 - 357), D = 0.62, kz = (v) => v;
  const unitDoors = (z0, z1, kind) => {
    const w = z1 - z0, zc = (z0 + z1) / 2;
    if (kind === 'drawers') { for (const [y0, hh] of [[0.12, 0.22], [0.36, 0.22], [0.6, 0.26]]) { lb(g, 0.02, hh - 0.01, w - 0.006, D + 0.01, y0, zc, MATS.cab); lsph(g, 0.014, D + 0.03, y0 + hh / 2, zc, MATS.knob); } return; }
    const n = w > 0.65 ? 2 : 1;
    for (let k = 0; k < n; k++) { const ww = w / n, zz = z0 + ww * (k + 0.5); lb(g, 0.02, 0.74, ww - 0.006, D + 0.01, 0.12, zz, MATS.cab); lsph(g, 0.014, D + 0.03, 0.75, zz + (n === 2 ? (k ? -1 : 1) : 1) * (ww / 2 - 0.05), MATS.knob); }
  };
  lb(g, D - 0.05, 0.1, L, (D - 0.05) / 2, 0, L / 2, MATS.matblack, { shadow: false });     // plinth
  lb(g, D, 0.76, L - pw(91), D / 2, 0.11, pw(91) + (L - pw(91)) / 2, MATS.cab);           // carcasses
  lb(g, D + 0.02, 0.03, L, (D + 0.02) / 2, 0.88, L / 2, MATS.worktop);                    // worktop
  unitDoors(pw(448 - 357), pw(570 - 357)); unitDoors(pw(570 - 357), pw(650 - 357), 'drawers'); unitDoors(pw(650 - 357), L - 0.62);
  // sink: two steel bowls, tall arched mixer
  lb(g, 0.42, 0.005, 0.66, 0.31, 0.912, pw(517 - 357), MATS.steel);
  for (const zc of [pw(490 - 357), pw(541 - 357)]) lb(g, 0.36, 0.004, 0.3, 0.31, 0.914, zc, std({ color: 0x6f7376, roughness: 0.3, metalness: 1 }));
  lcyl(g, 0.016, 0.022, 0.32, 0.08, 0.91, pw(517 - 357), MATS.chrome);
  { const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.08, 1.23, pw(517 - 357)), new THREE.Vector3(0.08, 1.42, pw(517 - 357)), new THREE.Vector3(0.3, 1.33, pw(517 - 357)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.012, 8), MATS.chrome); g.add(m); }
  // splashback mosaic + wall cabinets to the soffit
  lb(g, 0.006, 0.54, L, 0.003, 0.91, L / 2, MATS.mosaic, { shadow: false });
  lb(g, 0.31, 0.82, pw(760 - 357), 0.155, 1.45, pw(760 - 357) / 2, MATS.cab);
  for (let k = 0; k < 6; k++) { const zz = pw(760 - 357) / 6 * (k + 0.5); lb(g, 0.02, 0.8, pw(760 - 357) / 6 - 0.006, 0.32, 1.46, zz, MATS.cab); lsph(g, 0.013, 0.34, 1.5, zz + (k % 2 ? -1 : 1) * 0.1, MATS.knob); }
  lb(g, 0.33, 0.2, L, 0.165, 2.3, L / 2, MATS.wall);                                       // soffit
  // knife rail with knives, fruit bowl, coffee machines, kettle
  lb(g, 0.02, 0.04, 0.45, 0.012, 1.25, pw(600 - 357), MATS.matblack);
  for (let k = 0; k < 6; k++) lb(g, 0.005, 0.24 + (k % 3) * 0.04, 0.03, 0.026, 1.05, pw(600 - 357) - 0.18 + k * 0.07, MATS.steel);
  lcyl(g, 0.16, 0.1, 0.06, 0.32, 0.91, pw(690 - 357), MATS.white);
  for (const [dx, dz] of [[0, 0], [0.07, 0.05], [-0.06, 0.06], [0.02, -0.07], [-0.05, -0.04]]) lsph(g, 0.042, 0.32 + dx, 0.99, pw(690 - 357) + dz, MATS.apple);
  bake(g, STATIC_C);
  // the dishwasher (black Bosch): a steel tub with two racks that roll out when the door folds down
  const gd = pg(32, 357); scene.add(gd);
  const DW = pw(91) - 0.01, DD = D - 0.02;
  MATS.tub = MATS.tub || std({ color: 0xbfc3c6, roughness: 0.3, metalness: 0.8 });
  MATS.rackGrey = MATS.rackGrey || std({ color: 0x8d9296, roughness: 0.5, metalness: 0.4 });
  lb(gd, 0.02, 0.76, DW, 0.01, 0.11, DW / 2, MATS.tub);                                      // back
  for (const z of [0.01, DW - 0.01]) lb(gd, DD, 0.76, 0.02, DD / 2, 0.11, z, MATS.tub);    // sides
  lb(gd, DD, 0.02, DW, DD / 2, 0.85, DW / 2, MATS.tub); lb(gd, DD, 0.03, DW, DD / 2, 0.11, DW / 2, MATS.tub);
  lcyl(gd, 0.025, 0.025, 0.03, DD / 2, 0.14, DW / 2, MATS.rackGrey, 12);                    // spray arm hub
  lb(gd, 0.04, 0.012, DW * 0.8, DD / 2, 0.16, DW / 2, MATS.rackGrey, { ry: 0.6 });
  const piv = new THREE.Group(); piv.position.set(D, 0.11, DW / 2 + 0.005); gd.add(piv);
  const door = lb(piv, 0.03, 0.74, DW - 0.002, 0.015, 0, 0, MATS.blackgloss);
  const doorIn = lb(piv, 0.004, 0.68, DW - 0.06, -0.002, 0.03, 0, MATS.tub, { shadow: false });
  const panel = lb(piv, 0.031, 0.05, DW - 0.07, 0.015, 0.66, 0, std({ color: 0x2a2c2f, roughness: 0.3, metalness: 0.6 }));
  // wire racks: a frame of thin rods with plates (lower) and cups + glasses (upper), and a cutlery basket
  const rack = (y, h) => { const r = new THREE.Group(); r.position.set(0, y, 0); gd.add(r);
    const W2 = DW - 0.06, L2 = DD - 0.06;
    for (const z of [0.03, 0.03 + W2]) { lb(r, L2, 0.008, 0.008, 0.03 + L2 / 2, 0, z, MATS.rackGrey, { shadow: false }); lb(r, L2, 0.008, 0.008, 0.03 + L2 / 2, h, z, MATS.rackGrey, { shadow: false }); }
    for (const x of [0.03, 0.03 + L2]) { lb(r, 0.008, 0.008, W2, x, 0, 0.03 + W2 / 2, MATS.rackGrey, { shadow: false }); lb(r, 0.008, 0.008, W2, x, h, 0.03 + W2 / 2, MATS.rackGrey, { shadow: false }); }
    for (let k = 1; k < 9; k++) lb(r, 0.005, 0.005, W2, 0.03 + L2 * k / 9, 0, 0.03 + W2 / 2, MATS.rackGrey, { shadow: false });
    for (const x of [0.03, 0.03 + L2]) for (const z of [0.03, 0.03 + W2]) lb(r, 0.008, h, 0.008, x, 0, z, MATS.rackGrey, { shadow: false });
    return r; };
  const low = rack(0.2, 0.12), up = rack(0.52, 0.1);
  MATS.plate = MATS.plate || std({ color: 0xf6f6f2, roughness: 0.25 });
  for (let k = 0; k < 9; k++) lcyl(low, 0.12, 0.12, 0.012, 0.12 + k * 0.035, 0.125, DW * 0.36, MATS.plate, 28, { rz: Math.PI / 2 });
  for (let k = 0; k < 6; k++) lcyl(low, 0.1, 0.1, 0.01, 0.15 + k * 0.045, 0.105, DW * 0.78, MATS.plate, 24, { rz: Math.PI / 2 });
  lb(low, 0.12, 0.13, 0.1, DD - 0.12, 0.008, DW * 0.62, MATS.rackGrey);                     // cutlery basket
  for (let k = 0; k < 7; k++) lb(low, 0.006, 0.08, 0.012, DD - 0.16 + (k % 4) * 0.025, 0.12, DW * 0.6 + Math.floor(k / 4) * 0.03, MATS.steel);
  for (let k = 0; k < 4; k++) { lcyl(up, 0.04, 0.035, 0.08, 0.1 + k * 0.1, 0.01, 0.12, MATS.plate, 18); lcyl(up, 0.032, 0.025, 0.12, 0.1 + k * 0.1, 0.01, DW - 0.13, MATS.glass, 16, { shadow: false }); }
  for (let k = 0; k < 3; k++) lcyl(up, 0.07, 0.03, 0.06, 0.13 + k * 0.14, 0.012, DW / 2, MATS.plate, 22);
  collidables.push(door);
  inter({ name: 'dishwasher', parts: [door, panel, doorIn], handle: panel, dur: 0.9, apply: (t) => { piv.rotation.z = -Math.min(1, t * 1.25) * 88 * D2R; const r = Math.max(0, t - 0.45) / 0.55; low.position.x = r * 0.32; up.position.x = r * 0.18; } });
}
{
  // run B along the bathroom wall: cabinets, oven + hob + hood, narrow drawers, cabinets up to the fridge wall
  const g = pg(125, 834), L = pw(440 - 125), D = 0.62;
  lb(g, L, 0.1, D - 0.05, L / 2, 0, -(D - 0.05) / 2, MATS.matblack, { shadow: false });
  const xo0 = pw(214 - 125), xo1 = pw(305 - 125);
  // carcass with a real oven cavity: black enamel inside, a steel control strip above the door
  lb(g, xo0, 0.76, D, xo0 / 2, 0.11, -D / 2, MATS.cab); lb(g, L - xo1, 0.76, D, (xo1 + L) / 2, 0.11, -D / 2, MATS.cab);
  { const ow = xo1 - xo0, xc = (xo0 + xo1) / 2, en = std({ color: 0x141416, roughness: 0.35 });
    lb(g, ow, 0.09, D, xc, 0.11, -D / 2, MATS.cab); lb(g, ow, 0.18, D, xc, 0.69, -D / 2, MATS.cab);
    for (const sx of [-1, 1]) lb(g, 0.02, 0.5, D - 0.05, xc + sx * (ow / 2 - 0.02), 0.2, -(D - 0.05) / 2 - 0.0, en);
    lb(g, ow - 0.04, 0.02, D - 0.05, xc, 0.2, -(D - 0.05) / 2, en); lb(g, ow - 0.04, 0.02, D - 0.05, xc, 0.68, -(D - 0.05) / 2, en);
    lb(g, ow - 0.04, 0.48, 0.02, xc, 0.2, -0.06, en);
    for (const zz of [-0.25, -0.4]) lb(g, ow - 0.06, 0.006, 0.006, xc, 0.36, zz, MATS.steel, { shadow: false });
    const lampIn = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), std({ color: 0xfff0d0, emissive: 0xffd9a0, emissiveIntensity: 0.4 })); lampIn.position.set(xc + ow / 2 - 0.05, 0.6, -0.08); g.add(lampIn); }
  lb(g, L + 0.62, 0.03, D + 0.02, (L - 0.62) / 2, 0.88, -(D + 0.02) / 2, MATS.worktop);
  const doorsAt = (x0, x1, kind) => { const w = x1 - x0, xc = (x0 + x1) / 2;
    if (kind === 'drawers') { for (const [y0, hh] of [[0.12, 0.22], [0.36, 0.22], [0.6, 0.26]]) { lb(g, w - 0.006, hh - 0.01, 0.02, xc, y0, -D - 0.01, MATS.cab); lsph(g, 0.014, xc, y0 + hh / 2, -D - 0.03, MATS.knob); } return; }
    lb(g, w - 0.006, 0.74, 0.02, xc, 0.12, -D - 0.01, MATS.cab); lsph(g, 0.014, x1 - 0.06, 0.75, -D - 0.03, MATS.knob); };
  doorsAt(0, xo0); doorsAt(xo1, pw(348 - 125), 'drawers'); doorsAt(pw(348 - 125), L);
  // oven fascia: a steel frame round the door and the control strip with its knobs
  lb(g, xo1 - xo0 - 0.01, 0.16, 0.02, (xo0 + xo1) / 2, 0.71, -D - 0.006, MATS.steel);
  for (const sx of [-1, 1]) lb(g, 0.02, 0.52, 0.02, (xo0 + xo1) / 2 + sx * ((xo1 - xo0) / 2 - 0.015), 0.19, -D - 0.005, MATS.steel);
  for (let k = 0; k < 4; k++) lcyl(g, 0.016, 0.016, 0.015, xo0 + 0.08 + k * 0.05, 0.78, -D - 0.02, MATS.matblack, 12, { rx: Math.PI / 2 });
  lb(g, xo1 - xo0 - 0.02, 0.006, 0.52, (xo0 + xo1) / 2, 0.912, -0.3, MATS.hob);               // ceramic hob
  for (const [dx, dz, r] of [[-0.12, -0.15, 0.09], [0.12, -0.15, 0.07], [-0.12, -0.42, 0.07], [0.12, -0.42, 0.09]]) { const m = lcyl(g, r, r, 0.001, (xo0 + xo1) / 2 + dx, 0.918, dz, std({ color: 0x3a1a14, roughness: 0.2 }), 24); m.castShadow = false; }
  // hood: steel chimney + curved glass canopy
  lb(g, 0.26, 0.85, 0.24, (xo0 + xo1) / 2, 1.65, -0.13, MATS.steel);
  lb(g, 0.62, 0.06, 0.5, (xo0 + xo1) / 2, 1.6, -0.25, MATS.steel);
  lb(g, 0.64, 0.01, 0.46, (xo0 + xo1) / 2, 1.58, -0.28, std({ color: 0xbfd6cc, roughness: 0.05, transparent: true, opacity: 0.45 }), { shadow: false });
  // splashback, wall cabinets left and right of the hood, soffit
  lb(g, L + 0.62, 0.54, 0.006, (L - 0.62) / 2, 0.91, -0.003, MATS.mosaic, { shadow: false });
  lb(g, xo1 - xo0, 0.75, 0.006, (xo0 + xo1) / 2, 1.45, -0.003, MATS.mosaic, { shadow: false });
  for (const [a, b] of [[-0.62 + 0.31, xo0], [xo1, L]]) {
    lb(g, b - a, 0.82, 0.31, (a + b) / 2, 1.45, -0.155, MATS.cab);
    const n = Math.max(1, Math.round((b - a) / 0.45));
    for (let k = 0; k < n; k++) { const xx = a + (b - a) / n * (k + 0.5); lb(g, (b - a) / n - 0.006, 0.8, 0.02, xx, 1.46, -0.32, MATS.cab); lsph(g, 0.013, xx + (k % 2 ? -1 : 1) * 0.1, 1.5, -0.34, MATS.knob); }
  }
  lb(g, L + 0.62, 0.2, 0.33, (L - 0.62) / 2, 2.3, -0.165, MATS.wall);
  // the coffee corner: Fellow Espresso Series 1 and the Niche Zero grinder (the same pair as in Copenhagen), kettle by the hob
  coffeeKit(g, 0.18, -0.03, 0.91);
  lcyl(g, 0.07, 0.08, 0.22, xo1 + 0.15, 0.91, -0.35, MATS.matblack);
  bake(g, STATIC_C);
  // oven door (drops down)
  const go = pg(125, 834); scene.add(go);
  const piv = new THREE.Group(); piv.position.set((xo0 + xo1) / 2, 0.2, -D - 0.025); go.add(piv);
  const od = lb(piv, xo1 - xo0 - 0.02, 0.5, 0.04, 0, 0, 0, MATS.steel);
  const ogl = lb(piv, xo1 - xo0 - 0.14, 0.3, 0.042, 0, 0.1, 0, MATS.blackgloss, { shadow: false });
  const oh = lb(piv, xo1 - xo0 - 0.1, 0.025, 0.025, 0, 0.44, -0.05, MATS.steel);
  for (const sx of [-1, 1]) lb(piv, 0.02, 0.025, 0.04, sx * ((xo1 - xo0) / 2 - 0.06), 0.44, -0.03, MATS.steel);
  // the green tea towel folded over the oven handle: it rides on the door
  MATS.teaTowel = MATS.teaTowel || std({ map: canvasTex(128, 128, (c, S) => { c.fillStyle = '#9cb03a'; c.fillRect(0, 0, S, S); c.fillStyle = 'rgba(255,255,255,.45)'; for (let k = 0; k < S; k += 32) { c.fillRect(0, k + 4, S, 5); } c.fillStyle = 'rgba(40,60,20,.25)'; for (let k = 0; k < S; k += 16) c.fillRect(k, 0, 2, S); }, [0.22, 0.22]), roughness: 1 });
  const tw1 = lb(piv, 0.2, 0.36, 0.008, -0.07, 0.085, -0.074, MATS.teaTowel, { round: 0.003 });
  const tw2 = lb(piv, 0.2, 0.3, 0.008, -0.07, 0.15, -0.026, MATS.teaTowel, { round: 0.003 });
  const tw3 = lcyl(piv, 0.026, 0.026, 0.2, -0.07, 0.355, -0.05, MATS.teaTowel, 14, { rz: Math.PI / 2 }); tw3.position.y = 0.448;
  lb(go, xo1 - xo0 - 0.06, 0.012, 0.46, (xo0 + xo1) / 2, 0.35, -0.32, std({ color: 0x2a2b2e, roughness: 0.4, metalness: 0.5 }), { shadow: false });     // baking tray
  collidables.push(od);
  inter({ name: 'oven', parts: [od, ogl, oh, tw1, tw2, tw3], handle: oh, dur: 0.7, apply: (t) => { piv.rotation.x = -t * 85 * D2R; } });
}
{
  // fridge (K) and freezer (F), side by side against the fridge wall, doors opening like French doors
  const g = pg(348, 372), W = 0.6, H2 = 1.86, Lz = pw(555 - 372);
  lb(g, W, H2, Lz, W / 2 + 0.02, 0, Lz / 2, MATS.white);
  lb(g, W, 0.36, Lz + 0.02, W / 2 + 0.02, H2 + 0.05, Lz / 2, MATS.cab);                     // cabinet above
  lb(g, 0.33, 0.14, Lz + 0.04, 0.165, H2 + 0.41, Lz / 2, MATS.wall);
  // interiors (fridge: white liner, glass shelves, food; freezer: drawers)
  const inner = (z0) => { lb(g, 0.02, H2 - 0.1, Lz / 2 - 0.08, 0.04, 0.05, z0 + Lz / 4, MATS.white); };
  // hollow fronts: cut away by drawing the inside as a darker box behind the doors
  lb(g, 0.03, H2 - 0.12, Lz / 2 - 0.06, 0.035, 0.06, Lz / 4, std({ color: 0xf2f5f7, roughness: 0.3 }));
  lb(g, 0.03, H2 - 0.12, Lz / 2 - 0.06, 0.035, 0.06, Lz * 3 / 4, std({ color: 0xe6ecf0, roughness: 0.3 }));
  scene.add(g);
  const mkDoor = (low, name) => {
    const piv = new THREE.Group(); piv.position.set(-0.01, 0.02, low ? 0 : Lz); g.add(piv);
    const s = low ? 1 : -1, w = Lz / 2 - 0.004;
    const d = lb(piv, 0.05, H2 - 0.04, w, 0, 0, s * w / 2, MATS.white);
    const h = lb(piv, 0.03, 0.55, 0.025, -0.05, 0.85, s * (w - 0.05), MATS.steel);
    const h2 = lb(piv, 0.04, 0.025, 0.025, -0.03, 1.12, s * (w - 0.05), MATS.steel); const h3 = lb(piv, 0.04, 0.025, 0.025, -0.03, 0.85, s * (w - 0.05), MATS.steel);
    // door shelves
    for (const y of [0.5, 0.9, 1.3]) lb(piv, 0.08, 0.06, w - 0.08, 0.06, y, s * w / 2, std({ color: 0xdfe8ee, roughness: 0.2, transparent: true, opacity: 0.7 }), { shadow: false });
    collidables.push(d);
    return { piv, parts: [d, h, h2, h3], s };
  };
  const K = mkDoor(true, 'fridge'), Fz = mkDoor(false, 'freezer');
  // inside the fridge: shelves and food, a light that comes on with the door
  const gi = pg(348, 372); scene.add(gi); gi.visible = true;
  for (const y of [0.45, 0.85, 1.25]) lb(gi, 0.5, 0.008, Lz / 2 - 0.08, 0.34, y, Lz / 4, std({ color: 0xd6e6ea, roughness: 0.05, transparent: true, opacity: 0.6 }), { shadow: false });
  const food = [[0.46, 0.08, 0.18, 0.12, MATS.red], [0.46, 0.2, 0.1, 0.18, std({ color: 0xf2e6c8, roughness: 0.6 })], [0.86, 0.12, 0.2, 0.1, std({ color: 0x3b7a3c, roughness: 0.6 })], [1.26, 0.25, 0.08, 0.08, MATS.white], [1.26, 0.14, 0.14, 0.14, std({ color: 0xe9b23a, roughness: 0.5 })]];
  for (const [y, h, w, dz, m] of food) lb(gi, 0.18, h, w, 0.3, y, Lz / 4 + dz - 0.1, m);
  for (let k = 0; k < 4; k++) lb(gi, 0.5, 0.36, Lz / 2 - 0.1, 0.33, 0.15 + k * 0.42, Lz * 3 / 4, std({ color: 0xe9eef2, roughness: 0.2, transparent: true, opacity: 0.85 }), { shadow: false });
  const flc = P(348 + 30, 372 + 45), fl = lightSrc(flc[0], flc[1], FZ + 1.5, 0xfff4e0, 1.4);
  inter({ name: 'fridge', parts: K.parts, handle: K.parts[1], dur: 0.6, apply: (t) => { K.piv.rotation.y = -t * 105 * D2R; fl.level = t > 0.05 ? 0.8 : 0; poolDirty = true; } });
  inter({ name: 'freezer', parts: Fz.parts, handle: Fz.parts[1], dur: 0.6, apply: (t) => { Fz.piv.rotation.y = t * 105 * D2R; } });
  // week planner (glass board) on the end of the fridge wall, facing the dining table
}

// ============================================================ dining: white pedestal table, four black shell chairs, the book tower, a monstera on the sill
function shellChair(px, py, rot) {
  const g = pg(px, py, rot);
  // seat shell + back (black), dowel legs in oak with black wire bracing
  lb(g, 0.46, 0.04, 0.42, 0, 0.43, 0, MATS.matblack, { round: 0.02 });
  lb(g, 0.46, 0.36, 0.04, 0, 0.47, -0.21, MATS.matblack, { round: 0.02, rx: -0.18 });
  for (const [x, z] of [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]]) lcyl(g, 0.012, 0.014, 0.44, x * 1.1, 0, z * 1.15, MATS.oakLeg, 8);
  lb(g, 0.36, 0.006, 0.006, 0, 0.2, 0.15, MATS.matblack); lb(g, 0.36, 0.006, 0.006, 0, 0.2, -0.15, MATS.matblack);
  lb(g, 0.006, 0.006, 0.3, 0.17, 0.2, 0, MATS.matblack); lb(g, 0.006, 0.006, 0.3, -0.17, 0.2, 0, MATS.matblack);
  bake(g, STATIC_C);
}
{
  const g = pg(215, 205);
  lb(g, 1.2, 0.04, 0.8, 0, 0.72, 0, MATS.gloss, { round: 0.01 });
  lb(g, 0.16, 0.66, 0.5, 0, 0.06, 0, MATS.gloss);
  lb(g, 0.36, 0.05, 0.62, 0, 0.0, 0, MATS.steel);
  // a silver bowl in the middle
  lcyl(g, 0.17, 0.08, 0.07, 0, 0.76, 0, MATS.chrome, 10);
  bake(g, STATIC_C);
  shellChair(165, 120, 0); shellChair(265, 120, 0); shellChair(165, 290, Math.PI); shellChair(265, 290, Math.PI);
}
{
  // the book tower (a spine shelf stacked to 1.8 m) beside the dining window
  const g = pg(395, 45), r = rng(77);
  lb(g, 0.02, 1.85, 0.02, 0, 0, -0.03, MATS.matblack);
  let y = 0.02;
  const cols = ['#2b4a7a', '#b5332e', '#e8e1d1', '#1d1d1f', '#c78a2a', '#5a7f4a', '#7b3b5e', '#d9d2c2', '#3e6c8f', '#a8382f', '#f0ece2', '#2f2f33'];
  while (y < 1.8) { const t = 0.025 + r() * 0.03, w = 0.15 + r() * 0.08, d = 0.13 + r() * 0.07; lb(g, w, t, d, (r() - 0.5) * 0.03, y, 0.05 + (r() - 0.5) * 0.02, stdc({ color: new THREE.Color(cols[Math.floor(r() * cols.length)]), roughness: 0.7 }), { rx: 0, ry: (r() - 0.5) * 0.3 }); y += t + 0.002; }
  bake(g);
}
function pottedPlant(px, py, z, s = 1, potMat = MATS.white) {
  const g = pg(px, py, 0, z), r = rng(Math.floor(px * 7 + py));
  lcyl(g, 0.09 * s, 0.07 * s, 0.16 * s, 0, 0, 0, potMat, 16);
  for (let k = 0; k < 9; k++) {
    const a = r() * Math.PI * 2, l = (0.18 + r() * 0.14) * s;
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.075 * s, 10), MATS.plant);
    leaf.scale.set(1, 1.4, 1); leaf.position.set(Math.cos(a) * l * 0.5, 0.18 * s + l * (0.6 + r() * 0.6), Math.sin(a) * l * 0.5);
    leaf.rotation.set(-0.6 - r() * 0.6, a, 0); g.add(leaf);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, l, 4), MATS.plant); st.position.set(Math.cos(a) * l * 0.25, 0.16 * s + l * 0.5, Math.sin(a) * l * 0.25); st.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(st);
  }
  bake(g, { noShadow: false });
}
pottedPlant(300, 52, FZ + WIN.sill, 0.75);
// tall black floor speakers: by the dining end of the fridge wall and beside the TV
function floorSpeaker(px, py) { const g = pg(px, py); lb(g, 0.2, 1.05, 0.24, 0, 0.05, 0, MATS.blackgloss, { round: 0.06 }); for (const y of [0.75, 0.95]) lcyl(g, 0.06, 0.06, 0.01, 0, y, 0.12, MATS.matblack, 16, { rx: Math.PI / 2 }); lcyl(g, 0.012, 0.012, 0.05, 0, 0, 0, MATS.chrome, 6); lb(g, 0.3, 0.012, 0.3, 0, 0, 0, MATS.blackgloss); bake(g, STATIC_C); }
floorSpeaker(478, 340);
floorSpeaker(478, 552);

// a soft square cushion: puffy in the middle, thin at the seams; leans back against the sofa (facing plan -y, turned by rot)
function pillowGeo(size, depth) {
  const n = 14, pos = [], uv = [], idx = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const u = i / n * 2 - 1, v = j / n * 2 - 1, k = Math.sqrt(Math.max(0, (1 - u ** 4) * (1 - v ** 4)));
      const sq = 1 - 0.06 * (1 - Math.abs(v)) * Math.abs(u) ** 6;        // corners pulled in a little
      pos.push(u * size / 2 * sq, v * size / 2, side * depth / 2 * k); uv.push(side > 0 ? i / n : 1 - i / n, j / n);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = base + j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; if (side > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function pillow(px, py, size, mat, rot = 0, tilt = 0) {
  const g = pg(px, py, rot), m = new THREE.Mesh(pillowGeo(size, size * 0.32), mat);
  m.position.set(0, 0.5 + size / 2 * 0.95, 0.04); m.rotation.order = 'YXZ'; m.rotation.set(-0.22, Math.PI, tilt * 0.4); m.castShadow = m.receiveShadow = true; g.add(m); bake(g);
}
// ============================================================ living room: big pale L sofa with ottoman, white gloss coffee table, TV on the pillar, desk in the corner window
{
  const s = pg(0, 0), seatH = 0.42, backH = 0.78;
  const blockPx = (x0, y0, x1, y1, y, h, mat, o) => { const c = P((x0 + x1) / 2, (y0 + y1) / 2); const m = lb(s, pw(x1 - x0), h, pw(y1 - y0), 0, y, 0, mat, o); m.position.x = 0; m.userData.c = c; return m; };
  const g = new THREE.Group();
  const box = (x0, y0, x1, y1, z0, h, mat, round = 0.06) => { const c = P((x0 + x1) / 2, (y0 + y1) / 2); const gg = pg((x0 + x1) / 2, (y0 + y1) / 2); lb(gg, pw(x1 - x0), h, pw(y1 - y0), 0, z0, 0, mat, { round }); bake(gg, STATIC_C); };
  // long arm against the bedroom wall, short arm under the living-room window, ottoman at the hall end
  box(770, 692, 1173, 834, 0.1, seatH - 0.1, MATS.sofa);                    // seat block
  box(770, 800, 1173, 834, 0.1, backH - 0.1, MATS.sofa);                    // back
  box(1031, 455, 1173, 692, 0.1, seatH - 0.1, MATS.sofa);
  box(1139, 455, 1173, 800, 0.1, backH - 0.1, MATS.sofa);
  box(770, 692, 800, 800, 0.1, 0.55, MATS.sofa);                            // arm at the hall end
  box(1031, 455, 1139, 485, 0.1, 0.55, MATS.sofa);                          // arm at the window end
  box(658, 662, 768, 772, 0.1, 0.32, MATS.sofa);                            // ottoman
  // seat cushions, big back cushions, the accent pillows (red, navy, two US-flag ones), a grey throw
  for (let x = 800; x < 1139; x += 85) box(x + 2, 694, x + 83, 798, 0.4, 0.1, MATS.sofa2, 0.04);
  for (let y = 489; y < 690; y += 100) box(1033, y, 1137, y + 98, 0.4, 0.1, MATS.sofa2, 0.04);
  for (let x = 800; x < 1110; x += 72) box(x, 786, x + 70, 814, 0.5, 0.42, MATS.sofa2, 0.08);
  for (let y = 487; y < 780; y += 74) box(1120, y, 1148, y + 72, 0.5, 0.42, MATS.sofa2, 0.08);
  pillow(1075, 772, 0.46, MATS.red, 0, 0.35); pillow(1000, 776, 0.44, MATS.flag, 0, -0.05);
  pillow(1108, 560, 0.44, MATS.navy, -Math.PI / 2, 0.2); pillow(1110, 702, 0.44, MATS.flag, -Math.PI / 2, -0.1);
  box(880, 735, 960, 790, 0.5, 0.025, std({ color: 0x9a9894, roughness: 1 }), 0.01);
}
{
  // coffee table: white high gloss with a glass shelf (rounded ends), flowers and a coffee-table book
  const g = pg(895, 575, Math.PI / 2);
  lb(g, 1.15, 0.04, 0.6, 0, 0.38, 0, MATS.gloss, { round: 0.02 });
  lb(g, 0.04, 0.36, 0.6, -0.56, 0.02, 0, MATS.gloss, { round: 0.02 }); lb(g, 0.04, 0.36, 0.6, 0.56, 0.02, 0, MATS.gloss, { round: 0.02 });
  lb(g, 1.1, 0.04, 0.58, 0, 0.0, 0, MATS.gloss, { round: 0.02 });
  lb(g, 1.08, 0.01, 0.56, 0, 0.16, 0, MATS.glass, { shadow: false });
  lb(g, 0.3, 0.05, 0.22, 0.25, 0.42, 0.05, std({ color: 0xf2efe8, roughness: 0.6 }));
  lb(g, 0.24, 0.03, 0.18, -0.15, 0.17, 0, std({ color: 0x3a3a3c, roughness: 0.6 }));
  lcyl(g, 0.06, 0.05, 0.12, -0.2, 0.42, -0.05, MATS.white);
  for (let k = 0; k < 9; k++) lsph(g, 0.045, -0.2 + Math.cos(k) * 0.07, 0.58 + (k % 3) * 0.02, -0.05 + Math.sin(k) * 0.07, MATS.pink);
  bake(g, STATIC_C);
}
{
  // TV bench (white gloss) in front of the kitchen pillar, the TV on its floor stand
  const g = pg(456, 446);
  lb(g, 0.45, 0.4, 1.1, 0.24, 0.06, 0, MATS.gloss, { round: 0.01 });
  for (const z of [-0.5, 0.5]) for (const x of [0.06, 0.42]) lcyl(g, 0.02, 0.02, 0.06, x, 0, z, MATS.chrome, 8);
  lb(g, 0.01, 0.15, 1.04, 0.47, 0.08, 0, std({ color: 0xe9e9e7, roughness: 0.2 }));
  lb(g, 0.3, 0.06, 0.43, 0.25, 0.2, -0.25, MATS.matblack); lb(g, 0.3, 0.06, 0.36, 0.25, 0.2, 0.28, MATS.matblack);
  lcyl(g, 0.02, 0.02, 1.1, 0.12, 0.46, -0.3, MATS.matblack, 10);
  bake(g, STATIC_C);
}
// ---- the desk in the corner window: white top on sled legs, monitor on an arm, mic, black shell chair, red round storage and thermos
{
  const cx = 615, cy = 31 + 0.36 * PXM, rot = 0;    // along the Rådmansgatan wall, towards the corner window
  const g = pg(cx, cy, rot);
  lb(g, 1.4, 0.03, 0.7, 0, 0.72, 0, MATS.gloss);
  for (const x of [-0.66, 0.66]) { lb(g, 0.035, 0.72, 0.035, x, 0, -0.31, MATS.white); lb(g, 0.035, 0.72, 0.035, x, 0, 0.31, MATS.white); lb(g, 0.035, 0.035, 0.66, x, 0, 0, MATS.white); }
  lb(g, 0.6, 0.36, 0.02, 0, 0.92, -0.2, MATS.blackgloss); lb(g, 0.04, 0.2, 0.04, 0, 0.75, -0.22, MATS.steel); lb(g, 0.22, 0.01, 0.16, 0, 0.75, -0.22, MATS.steel);
  lb(g, 0.42, 0.02, 0.13, 0, 0.75, 0.08, std({ color: 0xdedede, roughness: 0.4 }));
  lb(g, 0.02, 0.4, 0.02, -0.55, 0.75, -0.28, MATS.matblack, { rz: -0.4 }); lsph(g, 0.04, -0.47, 1.18, -0.2, MATS.matblack, { sy: 1.5 });
  lcyl(g, 0.035, 0.035, 0.05, 0.4, 0.75, 0.05, std({ color: 0xf2f0ea, roughness: 0.5 }), 10);
  bake(g, STATIC_C);
  shellChair(615, 31 + 0.98 * PXM, Math.PI);
  // red Kartell Componibili (3 round modules, Ø 42 cm) with the red Stelton EM77 vacuum jug on top (living-room photo)
  { const r = pg(737, 66), R = 0.205, hm = 0.19, dark = std({ color: 0x7a1010, roughness: 0.6 }), hole = std({ color: 0x220606, roughness: 0.9 });
    lcyl(r, R - 0.015, R - 0.015, 0.012, 0, 0, 0, dark, 40);
    for (let k = 0; k < 3; k++) {
      const y0 = 0.012 + k * hm;
      lcyl(r, R, R, hm - 0.006, 0, y0, 0, MATS.redGloss, 48);
      lcyl(r, R - 0.006, R - 0.006, 0.006, 0, y0 + hm - 0.006, 0, dark, 48);           // the seam between modules
      const hd = new THREE.Mesh(new THREE.CircleGeometry(0.019, 20), hole); hd.position.set(0, y0 + hm * 0.62, R + 0.001); r.add(hd);
      for (const a of [-0.95, 0.95]) lb(r, 0.004, hm - 0.03, 0.004, Math.sin(a) * (R + 0.0005), y0 + 0.012, Math.cos(a) * (R + 0.0005), dark, { ry: a, shadow: false });
    }
    const top = 0.012 + 3 * hm;
    lcyl(r, R - 0.004, R, 0.014, 0, top - 0.006, 0, MATS.redGloss, 48);
    // EM77: cylinder body, a slightly waisted neck, the rocker stopper on a tilt, a loop handle
    const j = new THREE.Group(); j.position.set(-0.02, top + 0.008, -0.03); r.add(j);
    lcyl(j, 0.057, 0.057, 0.215, 0, 0, 0, MATS.redGloss, 36);
    lcyl(j, 0.052, 0.057, 0.02, 0, 0.215, 0, MATS.redGloss, 36);
    const cap = lcyl(j, 0.048, 0.05, 0.03, 0, 0.226, 0, MATS.redGloss, 32, { rz: 0.18 });
    lcyl(j, 0.012, 0.012, 0.01, 0.0, 0.258, 0, MATS.redGloss, 12);
    lb(j, 0.03, 0.012, 0.03, 0.05, 0.218, 0, MATS.redGloss, { rz: -0.35 });                 // spout lip
    const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 10, 28, Math.PI), MATS.redGloss); hdl.rotation.z = Math.PI / 2; hdl.scale.set(1, 1.15, 1); hdl.position.set(-0.052, 0.15, 0); j.add(hdl);
    bake(r, STATIC_C); }
}
// ---- the white shelving along the hall (open shelves, boxes, books), as in the hall photos
{
  // three bays; the one nearest the front door is shorter (two shelves fewer) with keys and little boxes on top
  const g = pg(636, 1050), D = 0.4, Lz = pw(1240 - 865), r = rng(41);
  const xs = -D / 2, ZB = [-Lz / 2, -Lz / 6, Lz / 6, Lz / 2], FULL = [0.1, 0.45, 0.8, 1.15, 1.5, 1.85], SHORT = FULL.slice(0, 4);
  ZB.forEach((z, i) => { const h = i === 3 ? 1.19 : 2.0; for (const x of [xs - D / 2 + 0.02, xs + D / 2 - 0.02]) lb(g, 0.025, h, 0.025, x, 0, z, MATS.white); });
  const bc = ['#3d6b4a', '#d64a5c', '#f2efe9', '#c9c3b6', '#2f5d83', '#e3a33c', '#7a2e38'];
  for (let b = 0; b < 3; b++) {
    const z0 = ZB[b], z1 = ZB[b + 1], lv = b === 2 ? SHORT : FULL;
    for (const y of lv) lb(g, D, 0.02, z1 - z0, xs, y, (z0 + z1) / 2, y > 1 && b < 2 ? MATS.white : std({ color: 0xe6c9a0, roughness: 0.6 }));
    for (const y of lv.slice(0, -1)) for (let z = z0 + 0.06; z < z1 - 0.32; z += 0.32 + r() * 0.08) if (r() < 0.7) lb(g, 0.32, 0.18 + r() * 0.1, 0.28, xs, y + 0.02, z + 0.14, stdc({ color: new THREE.Color(bc[Math.floor(r() * bc.length)]), roughness: 0.7 }));
  }
  // on top of the short bay: a key tray with keys, a few small boxes and a little dish
  { const top = 1.17, zc = (ZB[2] + ZB[3]) / 2;
    lb(g, 0.16, 0.02, 0.22, xs, top, zc + 0.18, std({ color: 0x2b2b2d, roughness: 0.5 }), { round: 0.008 });
    for (let k = 0; k < 3; k++) { lb(g, 0.02, 0.004, 0.06, xs - 0.04 + k * 0.035, top + 0.02, zc + 0.12 + k * 0.04, MATS.brass, { ry: 0.4 * k }); lcyl(g, 0.012, 0.012, 0.004, xs - 0.04 + k * 0.035, top + 0.02, zc + 0.09 + k * 0.04, MATS.steel, 12); }
    lb(g, 0.18, 0.12, 0.14, xs, top, zc - 0.08, std({ color: 0xd8c3a0, roughness: 0.8 }), { round: 0.005 });
    lb(g, 0.14, 0.09, 0.12, xs + 0.02, top + 0.12, zc - 0.08, std({ color: 0xf2efe9, roughness: 0.6 }), { round: 0.005 });
    lb(g, 0.12, 0.08, 0.1, xs, top, zc - 0.3, std({ color: 0x2f5d83, roughness: 0.6 }), { round: 0.005 });
    lcyl(g, 0.06, 0.045, 0.03, xs, top, zc + 0.42, std({ color: 0xe9e2d6, roughness: 0.4 }), 18); }
  bake(g, STATIC_C);
  // drawer tower at the living-room end
  const t = pg(705, 804, Math.PI);
  lb(t, 0.5, 2.0, 0.02, 0, 0, -0.18, MATS.white); for (const x of [-0.24, 0.24]) lb(t, 0.02, 2.0, 0.4, x, 0, 0, MATS.white);
  for (let k = 0; k < 4; k++) lb(t, 0.46, 0.2, 0.36, 0, 0.12 + k * 0.23, 0.0, MATS.white);
  lb(t, 0.46, 0.02, 0.38, 0, 1.4, 0, MATS.white); lb(t, 0.3, 0.12, 0.3, 0, 1.42, 0, std({ color: 0xe86a2c, roughness: 0.6 }));
  bake(t, STATIC_C);
}
// ---- small wall speakers in the living room (black)
for (const [x, y, rot] of [[1173 - 12, 470, 0], [1150, 834 - 12, 0]]) { const g = pg(x, y, rot); lb(g, 0.1, 0.16, 0.1, 0, 1.55, 0, MATS.blackgloss, { round: 0.03 }); bake(g); }

// ============================================================ entrance and hall: wardrobes, coat rack with hat shelf, shoe rack, mirror
// built-in wardrobes: white, 2.3 m, brass bar handles; each pair opens together
function wardrobe(x0, x1, yWall, name, n, inside = true) {
  const W = pw(x1 - x0), D = 0.6, Hh = 2.3, g = pg(x0, yWall); scene.add(g);
  const body = []; const lbS = (...a) => { const m = lb(g, ...a); body.push(m); return m; };
  lbS(W, Hh, 0.02, W / 2, 0, -0.01, MATS.cab);                      // back
  for (const x of [0.01, W - 0.01]) lbS(0.02, Hh, D, x, 0, -D / 2, MATS.cab);
  lbS(W, 0.02, D, W / 2, Hh - 0.02, -D / 2, MATS.cab); lbS(W, 0.08, D, W / 2, 0, -D / 2, MATS.cab);
  lb(g, W, FZ + H - FZ - Hh, D + 0.02, W / 2, Hh, -D / 2, MATS.wall);   // soffit to the ceiling
  // inside: a hat shelf, a rail and some clothes
  if (inside) {
    lb(g, W - 0.04, 0.02, D - 0.04, W / 2, 1.85, -D / 2, MATS.cab, { shadow: false });
    lcyl(g, 0.012, 0.012, W - 0.06, W / 2, 1.75, -D / 2, MATS.chrome, 8, { rz: Math.PI / 2 });
    const r = rng(Math.floor(x0)); const cc = ['#2c2f36', '#6b4c34', '#a8a39a', '#3d4a5c', '#7a2e2e', '#d8d2c6', '#4d5a3c'];
    for (let x = 0.08; x < W - 0.08; x += 0.07 + r() * 0.05) lb(g, 0.04, 0.6 + r() * 0.5, 0.42, x, 1.72 - (0.6 + r() * 0.5), -D / 2, stdc({ color: new THREE.Color(cc[Math.floor(r() * cc.length)]), roughness: 1 }), { shadow: false });
  }
  body.forEach((m) => collidables.push(m));
  const per = W / n, leaves = [];
  for (let k = 0; k < n; k++) {
    const left = k % 2 === 0, hx = left ? k * per : (k + 1) * per;
    const piv = new THREE.Group(); piv.position.set(hx, 0.08, -D - 0.012); g.add(piv);
    const s = left ? 1 : -1;
    const leaf = lb(piv, per - 0.006, Hh - 0.1, 0.022, s * per / 2, 0, 0, MATS.cab);
    const handle = lb(piv, 0.015, 0.14, 0.015, s * (per - 0.05), 1.0, -0.03, MATS.brass);
    collidables.push(leaf);
    leaves.push({ piv, s, parts: [leaf, handle] });
  }
  for (let k = 0; k < n; k += 2) {
    const pair = leaves.slice(k, k + 2);
    inter({ name, parts: pair.flatMap((p) => p.parts), handle: pair[0].parts[1], dur: 0.7, apply: (t) => { for (const p of pair) p.piv.rotation.y = p.s * t * 100 * D2R; } });
  }
}
wardrobe(478, 636, 1523, 'wardrobe', 2);
wardrobe(652, 1173, 1523, 'wardrobe', 6);
{
  // coat rack on the back wall of the entrance: white hat shelf on black brackets with hooks, coats, a straw hat and a box
  const g = pg(370, 1523);
  lb(g, 1.0, 0.025, 0.26, 0, 1.78, -0.13, MATS.white);
  for (const x of [-0.42, 0.42]) lb(g, 0.02, 0.2, 0.24, x, 1.6, -0.12, MATS.matblack);
  lcyl(g, 0.01, 0.01, 0.92, 0, 1.68, -0.22, MATS.matblack, 8, { rz: Math.PI / 2 });
  const coats = [[-0.25, 0x2d3328], [-0.1, 0x8a6a45], [0.05, 0x3b4232], [0.18, 0x9c5b33]];
  for (const [x, c] of coats) lb(g, 0.3, 0.86, 0.12, x + 0.08, 0.84, -0.18 - (x + 0.25) * 0.2, std({ color: c, roughness: 1 }), { round: 0.05, ry: 0.35 });
  lb(g, 0.36, 0.16, 0.24, 0.0, 1.81, -0.13, std({ color: 0xe8e2d4, roughness: 0.8 }));
  lcyl(g, 0.17, 0.2, 0.03, 0.05, 1.97, -0.13, std({ color: 0xd8bf86, roughness: 1 }), 18); lcyl(g, 0.09, 0.1, 0.09, 0.05, 1.99, -0.13, std({ color: 0xd8bf86, roughness: 1 }), 14);
  // shoe rack
  lb(g, 0.7, 0.02, 0.3, 0.05, 0.12, -0.18, MATS.matblack); lb(g, 0.7, 0.02, 0.3, 0.05, 0.3, -0.18, MATS.matblack);
  for (const x of [-0.3, 0.4]) for (const z of [-0.04, -0.32]) lb(g, 0.015, 0.32, 0.015, x, 0, z, MATS.matblack);
  for (let k = 0; k < 6; k++) lb(g, 0.1, 0.08, 0.27, -0.24 + k * 0.11, k % 2 ? 0.32 : 0.14, -0.18, std({ color: [0x7a5a3e, 0xe9e6df, 0x2a2a2a][k % 3], roughness: 0.7 }), { round: 0.03 });
  bake(g, STATIC_C);
  // doormat by the front door, a tall mirror on the bathroom wall in the hall
  const m = pg(300, 1360); lb(m, 0.5, 0.012, 0.8, 0, 0, 0, std({ color: 0x2f3134, roughness: 1 })); bake(m);
  const mi = pg(456, 765); lb(mi, 0.03, 1.75, 0.62, 0.015, 0.25, 0, MATS.white); lb(mi, 0.032, 1.67, 0.54, 0.018, 0.29, 0, MATS.mirror); bake(mi);
}

// ============================================================ bedroom: 160 bed with storage, round white bedside drawers, valet stand, plant and twig lamp on the sill
{
  const g = pg(900, 849);
  lb(g, 1.62, 0.32, 2.02, 0, 0.06, 1.01, MATS.white, { round: 0.01 });
  lb(g, 1.62, 0.95, 0.06, 0, 0.06, 0.03, MATS.white, { round: 0.01 });          // headboard
  lb(g, 1.58, 0.2, 1.96, 0, 0.38, 1.02, MATS.sheet, { round: 0.05 });           // mattress
  lb(g, 1.7, 0.08, 1.6, 0, 0.56, 1.22, MATS.duvet, { round: 0.04 });            // quilt
  lb(g, 1.66, 0.36, 0.03, 0, 0.26, 2.02, MATS.duvet);                            // quilt drop at the foot
  for (const x of [-0.82, 0.82]) lb(g, 0.03, 0.3, 1.5, x, 0.3, 1.28, MATS.duvet);
  lb(g, 1.0, 0.05, 0.75, 0.25, 0.62, 1.6, MATS.throw, { round: 0.02, ry: 0.05 });
  lb(g, 0.04, 0.4, 0.75, 0.75, 0.25, 1.6, MATS.throw);
  for (const x of [-0.4, 0.4]) lb(g, 0.62, 0.16, 0.4, x, 0.58, 0.28, MATS.pillow, { round: 0.07 });
  bake(g, STATIC_C);
  // round bedside drawers (three stacked drums), a book and a little lamp
  // oval bedside tables in three white lacquer tiers; the middle one swivels out on a pin at the back corner
  const ovalTier = (par, h, y, mat) => { const m = lcyl(par, 0.25, 0.25, h, 0, y, 0, mat, 48); m.scale.z = 0.76; return m; };
  for (const [nx, sd] of [[735, -1], [1065, 1]]) {
    const n = pg(nx, 888); scene.add(n);
    ovalTier(n, 0.185, 0, MATS.gloss); ovalTier(n, 0.185, 0.39, MATS.gloss);
    lb(n, 0.18, 0.025, 0.13, sd * 0.06, 0.575, 0.05, MATS.navy, { ry: 0.1 * sd });       // a book
    const piv = new THREE.Group(); piv.position.set(sd * 0.2, 0, -0.1); n.add(piv);
    const mid = ovalTier(piv, 0.185, 0.195, MATS.gloss); mid.position.x -= sd * 0.2; mid.position.z += 0.1;
    const inner = ovalTier(piv, 0.004, 0.375, std({ color: 0xe4e2dd, roughness: 0.6 })); inner.scale.x = 0.9; inner.scale.z = 0.66; inner.position.x -= sd * 0.2; inner.position.z += 0.1;
    const lip = lb(piv, 0.12, 0.02, 0.06, -sd * 0.2, 0.378, 0.15, std({ color: 0x2d3440, roughness: 0.8 }));       // glasses case in the drawer
    for (const m of n.children.slice(0, 3)) collidables.push(m);
    collidables.push(mid);
    inter({ name: 'bedside drawer', parts: [mid, inner, lip], handle: mid, dur: 0.6, anchor: (v) => mid.getWorldPosition(v).setY(FZ + 0.29),
      label: function () { return (this.target ? 'Close ' : 'Swivel out ') + 'the bedside drawer'; }, apply: (t) => { piv.rotation.y = sd * t * 75 * D2R; } });
  }
  // valet stand
  // white valet stand by the window wall (bedroom photo): two splayed legs, a column, a curved shoulder hanger,
  // a trouser bar, and the black coat and trousers hanging on it
  const v = pg(1128, 1300, Math.PI / 2);
  for (const a of [-1, 1]) lb(v, 0.025, 0.025, 0.42, a * 0.13, 0, 0, MATS.white, { ry: a * 0.25 });
  lcyl(v, 0.014, 0.016, 1.32, 0, 0, 0.0, MATS.white, 12);
  const hang = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.014, 8, 24, 1.0), MATS.white); hang.rotation.z = Math.PI / 2 - 0.5; hang.position.set(0, 0.92, 0); v.add(hang);
  lb(v, 0.36, 0.022, 0.022, 0, 0.62, 0.03, MATS.white, { round: 0.01 });
  const coat = std({ color: 0x18191b, roughness: 0.95 });
  lb(v, 0.44, 0.7, 0.1, 0, 0.6, 0.01, coat, { round: 0.04 }); lb(v, 0.4, 0.06, 0.12, 0, 1.24, 0.01, coat, { round: 0.03 });
  for (const a of [-1, 1]) lb(v, 0.08, 0.62, 0.08, a * 0.2, 0.66, 0.03, coat, { round: 0.03, rz: a * 0.05 });
  lb(v, 0.3, 0.42, 0.03, 0, 0.22, 0.05, std({ color: 0x232427, roughness: 1 }));
  bake(v, STATIC_C);
}
pottedPlant(1165, 972, FZ + WIN.sill, 0.85);

// ============================================================ bathroom: corner shower cabin (black back panels), washing machine, wall-hung WC, vanity with mirror cabinet, chrome towel rail
{
  // shower cabin, plan 185..315 × 855..985
  const g = pg(185, 855), S = pw(315 - 185) - 0.02;
  lb(g, S, 0.15, S, S / 2, 0, S / 2, MATS.porcelain, { round: 0.02 });
  lb(g, 0.02, 2.05, S, 0.01, 0.15, S / 2, MATS.showerBack); lb(g, S, 2.05, 0.02, S / 2, 0.15, 0.01, MATS.showerBack);
  lb(g, S, 0.04, S, S / 2, 2.2, S / 2, MATS.white);
  for (const [x, z] of [[S, S], [S, 0.02], [0.02, S]]) lb(g, 0.03, 2.05, 0.03, x - 0.015, 0.15, z - 0.015, MATS.chrome);
  lb(g, 0.02, 2.0, S * 0.5, S - 0.01, 0.17, S * 0.25, MATS.glass, { shadow: false });       // fixed side glass
  lb(g, S * 0.5, 2.0, 0.02, S * 0.25, 0.17, S - 0.01, MATS.glass, { shadow: false });
  lcyl(g, 0.012, 0.012, 1.0, 0.06, 0.9, 0.3, MATS.chrome, 8); lb(g, 0.05, 0.12, 0.05, 0.06, 1.9, 0.3, MATS.chrome);
  for (let k = 0; k < 6; k++) lsph(g, 0.012, 0.025, 0.9 + k * 0.15, 0.55, MATS.chrome);
  lcyl(g, 0.11, 0.11, 0.015, S / 2, 2.18, S / 2, MATS.chrome, 20);
  bake(g, STATIC_C);
  // sliding glass doors on the two open sides
  const gd = pg(185, 855); scene.add(gd);
  const d1 = lb(gd, 0.02, 2.0, S * 0.52, S - 0.035, 0.17, S * 0.72, MATS.glass, { shadow: false }), h1 = lb(gd, 0.03, 0.3, 0.02, S - 0.02, 1.0, S * 0.5, MATS.chrome);
  const d2 = lb(gd, S * 0.52, 2.0, 0.02, S * 0.72, 0.17, S - 0.035, MATS.glass, { shadow: false }), h2 = lb(gd, 0.02, 0.3, 0.03, S * 0.5, 1.0, S - 0.02, MATS.chrome);
  // a towel hanging on the door handle
  const tw = lb(gd, 0.02, 0.5, 0.25, S + 0.01, 0.55, S * 0.5, std({ color: 0xece8e2, roughness: 1 }));
  [d1, d2].forEach((m) => collidables.push(m));
  const z1 = d1.position.z, h1z = h1.position.z, x2 = d2.position.x, h2x = h2.position.x, twz = tw.position.z;
  inter({ name: 'shower', parts: [d1, d2, h1, h2, tw], handle: h1, dur: 0.6, apply: (t) => { d1.position.z = z1 - t * 0.4; h1.position.z = h1z - t * 0.4; tw.position.z = twz - t * 0.4; d2.position.x = x2 - t * 0.4; h2.position.x = h2x - t * 0.4; } });
}
{
  // washing machine (S on the plan), with towels on top
  const g = pg(374, 855);
  lb(g, 0.52, 0.85, 0.5, 0, 0, 0.26, MATS.white, { round: 0.02 });
  lcyl(g, 0.17, 0.17, 0.02, 0, 0.45, 0.51, MATS.chrome, 28, { rx: Math.PI / 2 }); lcyl(g, 0.14, 0.14, 0.025, 0, 0.45, 0.515, std({ color: 0x2b3238, roughness: 0.05, metalness: 0.4 }), 28, { rx: Math.PI / 2 });
  lb(g, 0.48, 0.08, 0.02, 0, 0.74, 0.51, std({ color: 0xe5e5e2, roughness: 0.3 }));
  lb(g, 0.36, 0.12, 0.3, 0, 0.85, 0.25, MATS.orangeTowel, { round: 0.04 }); lb(g, 0.34, 0.1, 0.28, 0.02, 0.97, 0.25, std({ color: 0xece8e2, roughness: 1 }), { round: 0.04 });
  bake(g, STATIC_C);
}
{
  // WC against the stairwell wall
  const g = pg(185, 1109);
  lb(g, 0.16, 0.42, 0.38, 0.09, 0.4, 0, MATS.porcelain, { round: 0.04 });
  lb(g, 0.06, 0.03, 0.12, 0.09, 0.82, 0, MATS.chrome);
  lb(g, 0.5, 0.36, 0.36, 0.42, 0.04, 0, MATS.porcelain, { round: 0.12 });
  lb(g, 0.46, 0.03, 0.36, 0.43, 0.4, 0, MATS.porcelain, { round: 0.015 });
  lb(g, 0.28, 0.2, 0.3, 0.34, 0.0, 0, MATS.porcelain, { round: 0.05 });
  // paper holder, the chrome towel radiator and the orange towel
  lcyl(g, 0.055, 0.055, 0.1, 0.12, 0.72, -0.38, MATS.white, 16, { rx: Math.PI / 2 });
  bake(g, STATIC_C);
  const tr = pg(250, 1241);
  for (let k = 0; k < 5; k++) lcyl(tr, 0.012, 0.012, 0.5, 0, 0.85 + k * 0.16, -0.06, MATS.chrome, 8, { rz: Math.PI / 2 });
  for (const x of [-0.25, 0.25]) lcyl(tr, 0.014, 0.014, 0.9, x, 0.75, -0.06, MATS.chrome, 8);
  lb(tr, 0.3, 0.55, 0.04, -0.05, 1.05, -0.09, MATS.orangeTowel, { round: 0.02 });
  bake(tr);
}
{
  // vanity: grey drawer unit, white cast basin, chrome mixer, mirror cabinet and its light
  const g = pg(371, 1241);
  lb(g, 0.6, 0.5, 0.44, 0, 0.3, -0.24, MATS.greyCab);
  lb(g, 0.42, 0.02, 0.01, 0, 0.55, -0.465, MATS.chrome);
  lb(g, 0.62, 0.06, 0.46, 0, 0.8, -0.24, MATS.porcelain, { round: 0.02 });
  lb(g, 0.42, 0.01, 0.3, 0, 0.855, -0.26, std({ color: 0xe2e3e1, roughness: 0.15 }));
  lcyl(g, 0.018, 0.02, 0.18, 0, 0.86, -0.05, MATS.chrome, 10); lb(g, 0.03, 0.03, 0.12, 0, 1.0, -0.1, MATS.chrome);
  lb(g, 0.6, 0.62, 0.14, 0, 1.18, -0.07, MATS.white); lb(g, 0.58, 0.6, 0.005, 0, 1.19, -0.142, MATS.mirror);
  bake(g, STATIC_C);
}
