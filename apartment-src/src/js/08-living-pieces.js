// ------------------------------------------------------------ Værelse: Møbelkompagniet Arezzo 3-pers sovesofa (with storage) against the wall to the living room (x≈4.57, y 5.29–8.21)
// shop drawing: 237 W × 107 D × 93 H cm, seat height 43, seat depth 60, inner width 198 (arms ≈ 19.5 each), back cushions 50 high;
// bed 198 × 152 cm (pull-out; open depth ≈ 180 cm from the wall is our estimate). Black plastic legs, dark wood base strip.
const GS_COLORS = [
  ['Loop', 'Grå', 0x8a8886], ['Loop', 'Beige', 0xc9bca8], ['Loop', 'Mørk beige', 0xa39380], ['Loop', 'Grøn', 0x6f7a5e], ['Loop', 'Mørkeblå', 0x34405a],
  ['Aragon', 'Beige', 0xcfc2ac], ['Aragon', 'Grå/Beige', 0xa8a095], ['Aragon', 'Grøn', 0x6b7a60], ['Aragon', 'Krystal Blå', 0x7f97a8], ['Aragon', 'Blå', 0x44597a],
  ['Modesto', 'Brun', 0x6b4e3b], ['Modesto', 'Mørkegrøn', 0x3f4c3c], ['Modesto', 'Mørkeblå', 0x2e3a52], ['Modesto', 'Creme', 0xe4dccb],
  ['Puente', 'Lys Greige', 0xc8c0b3], ['Puente', 'Grøn', 0x75805f], ['Puente', 'Gul', 0xc9a24a], ['Puente', 'Grå/blå', 0x7c8791],
];
const GS = { W: 2.37, D: 1.07, H: 0.93, seatH: 0.43, arm: 0.195, bedD: 1.52, openD: 1.80, url: 'https://moebelkompagniet.dk/products/arezzo-3-personers-sovesofa', price: '6,999 kr (sale, was 9,999)' };
const guest = { offset: 0, open: false, color: 0, group: null, parts: [], wall: null };
const guestDims = new THREE.Group(); dimsGroup.add(guestDims);
function buildGuestSofa() {
  if (!guest.wall) {
    const Wl = wallLine([6.4, 6.0], [6.4, 7.8], [-1, 0]); if (!Wl) return;
    const n = Wl.n, a = new THREE.Vector3().crossVectors(UP, n).normalize();
    const C0 = Wl.p.clone().addScaledVector(a, b2t(4.6, 6.75, 0).sub(Wl.p).dot(a)).setY(0);
    // this wall runs y 5.29 (corner of the jog by the door) – 8.21 (window wall) in the plan; centre the sofa on it
    guest.wall = { n, a, base: C0, half: (8.21 - 5.29) / 2 - 0.02 };
  }
  if (guest.group) { scene.remove(guest.group); dropParts(guest.parts); }
  const { n, a } = guest.wall, lim = guest.wall.half - GS.W / 2 - 0.01;
  guest.offset = Math.max(-lim, Math.min(lim, guest.offset));
  const O = guest.wall.base.clone().addScaledVector(a, guest.offset).addScaledVector(n, 0.01);
  const g = new THREE.Group(); g.position.copy(O); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, UP, n));
  const [, , hex] = GS_COLORS[guest.color];
  const fab = std({ color: hex, roughness: 1 }), wood = std({ color: 0x4a3222, roughness: 0.6 }), leg = std({ color: 0x151515, roughness: 0.5 });
  const parts = [];
  const add = (geo, m, x, y, z, solid = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); if (solid) parts.push(o); return o; };
  const RB = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) - 1e-4);
  const W = GS.W, D = GS.D, iw = W - 2 * GS.arm, legH = 0.05, baseTop = 0.13;
  for (const x of [-W / 2 + 0.12, W / 2 - 0.12]) for (const z of [0.1, D - 0.12]) add(new THREE.BoxGeometry(0.04, legH, 0.05), leg, x, legH / 2, z, false);
  add(new THREE.BoxGeometry(iw + 0.06, baseTop - legH, D - 0.14), wood, 0, legH + (baseTop - legH) / 2, (D - 0.14) / 2 + 0.04);   // storage base
  for (const sx of [-1, 1]) add(RB(GS.arm, 0.62 - legH, D, 0.09), fab, sx * (W / 2 - GS.arm / 2), legH + (0.62 - legH) / 2, D / 2);  // rounded arms
  add(RB(iw, 0.62 - baseTop, 0.24, 0.05), fab, 0, baseTop + (0.62 - baseTop) / 2, 0.12);                                           // back frame
  if (!guest.open) {
    add(RB(iw, GS.seatH - baseTop, D - 0.22, 0.05), fab, 0, baseTop + (GS.seatH - baseTop) / 2, 0.22 + (D - 0.22) / 2);            // seat
  } else {                                                                                                                         // pulled out as a bed
    const z0 = 0.26, bd = GS.bedD, top = 0.44;
    add(RB(iw - 0.01, top - 0.2, bd, 0.04), fab, 0, 0.2 + (top - 0.2) / 2, z0 + bd / 2);
    add(new THREE.BoxGeometry(iw - 0.04, 0.2 - legH, 0.04), wood, 0, legH + (0.2 - legH) / 2, z0 + bd - 0.03, false);
    for (const x of [-iw / 2 + 0.08, iw / 2 - 0.08]) add(new THREE.BoxGeometry(0.04, legH, 0.05), leg, x, legH / 2, z0 + bd - 0.05, false);
  }
  // two back cushions (tilted back a little) and the round bolster by the left arm
  for (const sx of [-1, 1]) { const c = add(RB(iw / 2 - 0.01, 0.5, 0.2, 0.07), fab, sx * iw / 4, GS.seatH + 0.25 + (guest.open ? 0.01 : 0), 0.2); c.rotation.x = -0.12; }
  if (!guest.open) add(new THREE.SphereGeometry(0.12, 20, 14), fab, -iw / 2 + 0.15, GS.seatH + 0.12, 0.42, false);
  { const mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids); }
  const door = { kind: 'swap', label: 'Sofa bed', parts, center: O.clone().setY(0.5).addScaledVector(n, 0.5),
    swap: () => selectFurniture(selected === guestMover ? null : guestMover),
    prompt: () => (selected === guestMover ? 'Done with the sofa bed' : 'Move or open the sofa bed') };
  for (const p of parts) { p.userData.door = door; p.userData.furniture = true; collidables.push(p); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Sofa bed'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  scene.add(g); g.updateMatrixWorld(true);
  guest.group = g; guest.parts = parts;
  guestDimsUpdate();
}
function guestFront() { return guest.open ? 0.26 + GS.bedD : GS.D; }
function guestGaps() {
  const { n, a } = guest.wall, O = guest.group.position, f = guestFront();
  const front = gapTo(O.clone().addScaledVector(n, f + 0.01).setY(0.3), n.clone(), 4) ?? 4;
  const sideP = gapTo(O.clone().addScaledVector(a, GS.W / 2 + 0.01).addScaledVector(n, 0.5).setY(0.3), a.clone(), 4) ?? 4;
  const sideN = gapTo(O.clone().addScaledVector(a, -GS.W / 2 - 0.01).addScaledVector(n, 0.5).setY(0.3), a.clone().negate(), 4) ?? 4;
  return { front, sideP, sideN };
}
function guestDimsUpdate() {
  guestDims.clear(); if (!guest.group) return;
  const { n, a } = guest.wall, O = guest.group.position, f = guestFront(), G = guestGaps();
  const P = (s, t) => toBl(O.clone().addScaledVector(a, s).addScaledVector(n, t));
  guestDims.add(dimLine(P(-GS.W / 2, f + 0.08), P(GS.W / 2, f + 0.08), `${(GS.W * 100).toFixed(0)} cm`, 0.06));
  guestDims.add(dimLine(P(GS.W / 2 + 0.08, 0), P(GS.W / 2 + 0.08, f), `${(f * 100).toFixed(0)} cm ${guest.open ? '(bed, est.)' : 'deep'}`, 0.06));
  guestDims.add(dimLine(P(0, f), P(0, f + G.front), `${G.front.toFixed(2)} m free${G.front < 0.6 ? ' (tight)' : ''}`, 0.3));
  for (const [s, d] of [[1, G.sideP], [-1, G.sideN]]) guestDims.add(dimLine(P(s * GS.W / 2, 0.5), P(s * (GS.W / 2 + d), 0.5), `${d.toFixed(2)} m`, 0.3));
  const [coll, name] = GS_COLORS[guest.color];
  const t = labelSprite(`Arezzo sovesofa · ${coll} ${name}${guest.open ? ' · bed 198 × 152' : ''}`, { h: 0.03 }); t.position.copy(O).addScaledVector(n, 0.5).setY(1.2); guestDims.add(t);
}
// ------------------------------------------------------------ Living: &Tradition Little Petra VB1 lounge chair (Viggo Boesen, 1938), free to move and turn
// interiorshop.dk (Oct 2026): W 81 × D 83 × H 75 cm, seat 40; oiled oak or walnut legs; 6 upholsteries; variantId per combination
const PETRA = {
  url: (id) => `https://www.interiorshop.dk/shop/52-and-tradition/21770-tradition-little-petra-vb1-loungestol/?variantId=${id}`,
  woods: [{ name: 'Oiled Oak', c: 0xc9a473 }, { name: 'Oiled Walnut', c: 0x6e4c34 }],
  covers: [
    { name: 'Hallingdal 130', kind: 'wool, light grey', c: 0xb3b1ad, tex: 'flat', ids: [35183, 35181], kr: [15996, 17246], was: 22995 },
    { name: 'Ectriture 0640', kind: 'wool, dusty rose', c: 0xd9aaa3, tex: 'canvas', ids: [35166, 35165], kr: [17996, 17996], was: 23995 },
    { name: 'Karakorum 003', kind: 'bouclé, off-white', c: 0xcfc7ba, tex: 'boucle', ids: [35187, 35184], kr: [18746, 18746], was: 24995 },
    { name: 'Sheepskin Honey 50mm', kind: 'long-pile sheepskin', c: 0xb98a55, tex: 'boucle', pile: 2.6, ids: [35167, 35164], kr: [25496, 25496], was: 33995 },
    { name: 'Sheepskin Moonlight 17mm', kind: 'sheepskin', c: 0xe6dfd0, tex: 'boucle', pile: 1.6, ids: [35186, 35189], kr: [24222, 23695], was: 33995 },
    { name: 'Sheepskin Sahara 17mm', kind: 'sheepskin', c: 0x76594a, tex: 'boucle', pile: 1.6, ids: [35185, 35182], kr: [25496, 25496], was: 33995 },
  ],
};
const petra = { pos: null, angle: 0, cover: 2, wood: 0, model: 0, group: null, parts: [] };
const GUDRUN = { name: 'House Nordic Gudrun', c: 0x9a8063, url: 'https://www.boozt.com/dk/da/house-nordic-aps/gudrun-lounge-chair_32977013', kr: 3974, was: 5677 };
const petraDims = new THREE.Group(); dimsGroup.add(petraDims);
const LIV_BOX = { x0: 0.5, x1: 4.46, y0: 0.5, y1: 8.45 };            // living room inner faces (Blender)
function buildPetra(tryPos, tryAngle) {
  if (!petra.pos) { petra.pos = [3.86, 7.82]; petra.angle = Math.atan2(-2.46, 1.42); }   // left of the TV (seen from the sofa), by the balcony door, turned towards the sofa
  let pos = tryPos || petra.pos, ang = tryAngle ?? petra.angle, ok = true;
  const R = 0.41, cx = THREE.MathUtils.clamp(pos[0], LIV_BOX.x0 + R, LIV_BOX.x1 - R), cy = THREE.MathUtils.clamp(pos[1], LIV_BOX.y0 + R, LIV_BOX.y1 - R);
  if (Math.abs(cx - pos[0]) > 1e-6 || Math.abs(cy - pos[1]) > 1e-6) ok = false;
  pos = [cx, cy];
  if (petra.group) { scene.remove(petra.group); dropParts(petra.parts); }
  petra.pos = pos; petra.angle = ang;
  const C = PETRA.covers[petra.cover], W = PETRA.woods[petra.wood];
  const fab = new THREE.MeshPhysicalMaterial({ color: C.c, map: weaveTex(C.tex), bumpMap: weaveTex(C.tex), bumpScale: 0.006 * (C.pile || 1), roughness: 0.97, sheen: C.pile ? 0.7 : 0.35, sheenRoughness: 0.75, sheenColor: new THREE.Color(C.c).lerp(new THREE.Color(0xffffff), 0.15), envMapIntensity: 0.25 });
  const wood = std({ color: W.c, roughness: 0.55 });
  const g = new THREE.Group(); g.position.copy(b2t(pos[0], pos[1], 0)); g.rotation.y = ang;
  const parts = [];
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); parts.push(o); return o; };
  if (petra.model === 1) {
    // House Nordic Gudrun: a plump wingback in curly light-brown teddy fabric, 84 × 86 × 87 cm, short black splayed legs
    const G = GUDRUN, gf = new THREE.MeshPhysicalMaterial({ color: G.c, map: weaveTex('boucle'), bumpMap: weaveTex('boucle'), bumpScale: 0.035, roughness: 0.98, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(G.c).lerp(new THREE.Color(0xffffff), 0.2), envMapIntensity: 0.2 });
    const legM = std({ color: 0x1b1a19, roughness: 0.5 });
    const W2 = 0.42, D2 = 0.43, y0 = 0.14;
    add(softBox(0.8, 0.22, 0.8, 0.1, { top: 0.01, front: 0.03 }), gf, 0, y0 + 0.11, 0.02);                      // base
    add(softBox(0.56, 0.14, 0.6, 0.06, { top: 0.03, front: 0.03 }), gf, 0, y0 + 0.27, 0.08);                    // seat cushion (seat ≈ 42 cm)
    const back = add(softBox(0.62, 0.62, 0.22, 0.1, { front: 0.06, top: 0.04 }), gf, 0, y0 + 0.42, -D2 + 0.13); back.rotation.x = -0.12;   // tall back, leaning, highest in the middle
    for (const sx of [-1, 1]) {
      const arm = add(softBox(0.17, 0.34, 0.68, 0.085, { top: 0.04, side: 0.03 }), gf, sx * (W2 - 0.085), y0 + 0.32, 0.03); arm.rotation.z = sx * 0.1;   // rolled arms, flaring out
      const wing = add(softBox(0.17, 0.34, 0.32, 0.09, { side: 0.04, top: 0.03 }), gf, sx * (W2 - 0.1), y0 + 0.5, -D2 + 0.22); wing.rotation.set(-0.1, sx * 0.3, sx * 0.12);   // wings, lower than the back
      for (const sz of [-1, 1]) { const leg = add(new THREE.CylinderGeometry(0.018, 0.012, 0.15, 12), legM, sx * (W2 - 0.08), 0.07, sz * (D2 - 0.1)); leg.rotation.x = sz < 0 ? -0.22 : 0.08; leg.rotation.z = -sx * 0.06; }
    }
    // a few tufting buttons on the back
    const btn = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(G.c).multiplyScalar(0.75), roughness: 0.9 });
    for (const [bx, by] of [[-0.12, 0.72], [0.12, 0.72], [0, 0.62]]) add(new THREE.SphereGeometry(0.014, 8, 6), btn, bx, by, -D2 + 0.24);
  } else {
  // the shell: a thick wall swept round the back (lathe), high at the back (75) falling to the arm fronts (≈58), plan 81 × 83
  const prof = [], T = 0.13, y0 = 0.27, Hb = 0.75;
  const ri = 0.27, ro = ri + T;
  prof.push(new THREE.Vector2(ri, y0)); prof.push(new THREE.Vector2(ro - 0.03, y0)); prof.push(new THREE.Vector2(ro, y0 + 0.04));
  for (let k = 0; k <= 10; k++) { const a = Math.PI * k / 10; prof.push(new THREE.Vector2((ri + ro) / 2 + Math.cos(a) * T / 2, Hb - T / 2 + Math.sin(a) * T / 2 * 1.1)); }
  prof.push(new THREE.Vector2(ri, y0 + 0.02));
  const span = Math.PI * 1.22, phi0 = Math.PI - span / 2;   // open towards +z (the front)
  const shell = new THREE.LatheGeometry(prof, 56, phi0, span);
  { const P = shell.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      const front = Math.max(0, v.z / ro);                                  // 0 at the back half … 1 at the arm ends
      const hk = 1 - 0.3 * Math.pow(front, 1.3);                            // arms lower than the back
      v.y = y0 + (v.y - y0) * hk;
      v.x *= 1.0; v.z = v.z * 1.0 - 0.02;
      P.setXYZ(i, v.x * (0.405 / ro), v.y, v.z * (0.4 / ro));
      shell.attributes.uv.setXY(i, Math.atan2(v.x, v.z) * 0.36, v.y + Math.hypot(v.x, v.z) * 0.5);   // metric UVs so the weave isn't stretched
    }
    shell.computeVertexNormals(); }
  add(shell, fab, 0, 0, 0);
  // round off the open arm ends
  for (const sg of [-1, 1]) { const a = phi0 + (sg < 0 ? 0 : span), rm = (ri + ro) / 2;
    const ex = Math.sin(a) * rm * (0.405 / ro), ez = Math.cos(a) * rm * (0.4 / ro) - 0.02;
    const hk = 1 - 0.3 * Math.pow(Math.max(0, Math.cos(a) * rm / ro), 1.3), hh = (Hb - y0) * hk;
    const cap = add(new THREE.SphereGeometry(1, 20, 14), fab, ex, y0 + hh / 2, ez); cap.scale.set(0.045, hh / 2 * 0.98, T / 2 * 0.98); cap.rotation.y = a; }
  // deep seat cushion, front rolled
  add(softBox(0.6, 0.15, 0.6, 0.06, { top: 0.025, front: 0.02 }), fab, 0, 0.33, 0.08);
  add(softBox(0.62, 0.08, 0.6, 0.03), fab, 0, 0.245, 0.05);                 // seat base
  // button tufting on the inside of the back
  const btn = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(C.c).multiplyScalar(0.8), roughness: 0.9 });
  for (const [bx, by] of [[-0.12, 0.6], [0.12, 0.6], [0, 0.5], [-0.2, 0.5], [0.2, 0.5]]) { const zz = -Math.sqrt(Math.max(0, (ri * 1.04) ** 2 - bx * bx)) * (0.4 / ro) + 0.01; add(new THREE.SphereGeometry(0.012, 8, 6), btn, bx, by, zz); }
  // four splayed tapered legs
  for (const [lx, lz] of [[-0.26, -0.24], [0.26, -0.24], [-0.27, 0.26], [0.27, 0.26]]) {
    const leg = add(new THREE.CylinderGeometry(0.018, 0.013, 0.25, 12), wood, lx * 1.05, 0.12, lz * 1.05);
    leg.rotation.z = -Math.sign(lx) * 0.12; leg.rotation.x = Math.sign(lz) * 0.12;
  }
  }
  const door = { kind: 'swap', label: 'Lounge chair', parts, center: g.position.clone().setY(0.5),
    swap: () => selectFurniture(selected === petraMover ? null : petraMover), prompt: () => (selected === petraMover ? 'Done with the chair' : 'Move or turn the lounge chair') };
  for (const q of parts) { q.userData.door = door; q.userData.furniture = true; collidables.push(q); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Lounge chair'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  scene.add(g); g.updateMatrixWorld(true);
  petra.group = g; petra.parts = parts; shadowDirty = true;
  petraDimsUpdate();
  return ok;
}
function petraGaps() {
  const g = petra.group; if (!g) return null;
  const out = {};
  for (const [k, d] of [['N', [-1, 0]], ['S', [1, 0]], ['E', [0, 1]], ['W', [0, -1]]]) {
    const dir = b2t(d[0], d[1]).normalize(), from = g.position.clone().setY(0.3).addScaledVector(dir, 0.42);
    out[k] = { from, dir, d: gapTo(from, dir, 5) };
  }
  return out;
}
function petraDimsUpdate() {
  petraDims.clear(); const G = petraGaps(); if (!G) return;
  for (const o of Object.values(G)) if (o.d !== null && o.d !== undefined && o.d < 2.5) petraDims.add(dimLine(toBl(o.from), toBl(o.from.clone().addScaledVector(o.dir, o.d)), `${o.d.toFixed(2)} m`, 0.05));
  const t = labelSprite(`Little Petra · ${PETRA.covers[petra.cover].name} · ${PETRA.woods[petra.wood].name}`, { h: 0.03 }); t.position.copy(petra.group.position).setY(1.0); petraDims.add(t);
}
const petraMover = {
  name: 'Lounge chair', title: () => (petra.model ? 'House Nordic Gudrun lounge chair · light brown' : `&Tradition Little Petra VB1 · ${PETRA.covers[petra.cover].name}`),
  anchor: () => (petra.group ? petra.group.position.clone().setY(1.05) : null),
  axis: () => b2t(1, 0).normalize(), axis2: () => b2t(0, 1).normalize(),
  shift: (dir) => { const p0 = petra.pos; if (!buildPetra([p0[0] + dir * 0.05, p0[1]])) showToast('Can’t go further: wall'); },
  shift2: (dir) => { const p0 = petra.pos; if (!buildPetra([p0[0], p0[1] + dir * 0.05])) showToast('Can’t go further: wall'); },
  rotate: (dir) => { buildPetra(null, petra.angle + dir * Math.PI / 12); },
  angle: () => petra.angle,
  get selects() { const model = { id: 'pmodel', label: 'Chair', options: () => [{ label: '&Tradition Little Petra VB1' }, { label: `House Nordic Gudrun · ${GUDRUN.kr.toLocaleString('da-DK')} kr` }], get: () => petra.model, set: (i) => { petra.model = i; buildPetra(); buildMoverSelects(petraMover); } };
    return petra.model ? [model] : [model, ...PETRA_SELECTS]; },
  link: () => { if (petra.model) return { href: GUDRUN.url, text: `Boozt · Gudrun lounge chair · ${GUDRUN.kr.toLocaleString('da-DK')} kr (før ${GUDRUN.was.toLocaleString('da-DK')}) ↗` }; const C = PETRA.covers[petra.cover]; return { href: PETRA.url(C.ids[petra.wood]), text: `Interiorshop · ${C.name} / ${PETRA.woods[petra.wood].name} · ${C.kr[petra.wood].toLocaleString('da-DK')} kr ↗` }; },
  info: () => { const C = PETRA.covers[petra.cover], G = petraGaps(), f = (o) => (o && o.d !== null ? o.d.toFixed(2) : '>5');
    if (petra.model) return `84 × 86 × 87 cm wingback · curly light-brown teddy (polyester), black legs · ${GUDRUN.kr.toLocaleString('da-DK')} kr on Boozt (før ${GUDRUN.was.toLocaleString('da-DK')}) · free: ${f(G.N)} m towards the window wall, ${f(G.S)} m towards the TV wall, ${f(G.E)} m towards the balcony, ${f(G.W)} m towards the kitchen · ⟲ ⟳ turn 15°`;
    return `81 × 83 × 75 cm · seat 40 · ${C.kr[petra.wood].toLocaleString('da-DK')} kr (list ${C.was.toLocaleString('da-DK')}) · free: ${f(G.N)} m towards the window wall, ${f(G.S)} m towards the TV wall, ${f(G.E)} m towards the balcony, ${f(G.W)} m towards the kitchen · ⟲ ⟳ turn 15°`; },
};
const PETRA_SELECTS = [
    { id: 'pcov', label: 'Upholstery', options: () => PETRA.covers.map((c) => ({ label: `${c.name} · ${c.kind}` })), get: () => petra.cover, set: (i) => { petra.cover = i; buildPetra(); } },
    { id: 'pwood', label: 'Legs', options: () => PETRA.woods.map((w) => ({ label: w.name })), get: () => petra.wood, set: (i) => { petra.wood = i; buildPetra(); } },
];
// ------------------------------------------------------------ living: ART-GIFTREE floating book tower (amazon.com, white) + vertical Hue strip
// Each piece: a white steel spine 31 cm tall with two "invisible" shelves 16 × 13 cm, 15.5 cm apart; the books lie flat, spines out, and hide
// the plates. 2, 3 or 4 pieces stacked = 4, 6 or 8 tiers. On the TV wall between the TV unit and the opening to the hall; slides along it.
const BOOKT = {
  url: (asin) => `https://www.amazon.com/dp/${asin}?th=1`,
  packs: [
    { n: 2, asin: 'B0BN2XP5D9', sek: 290.91 },
    { n: 3, asin: 'B0DMZKYD5Y', sek: 481.57 },
    { n: 4, asin: 'B0BX3XD1BZ', sek: 662.19 },
  ],
  PIECE: 0.31, SH_W: 0.16, SH_D: 0.13, PITCH: 0.155, STRIP: 2.0,
};
const books = { pack: 2, s: null, z0: null, group: null, parts: [], seed: 7, gap: 1 };
const BOOK_GAPS = [{ label: 'Pieces stacked tight (31 cm each)', g: 0 }, { label: 'Spaced like ours: 30 % taller (40 cm per piece)', g: 0.093 }];
const booksDims = new THREE.Group(); dimsGroup.add(booksDims);
MATS.booksMetal = std({ color: 0xf1f1ee, roughness: 0.42, metalness: 0.25 });
MATS.booksPaper = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
MATS.booksLed = new THREE.MeshStandardMaterial({ color: 0xf6f1e8, emissive: 0xffb070, emissiveIntensity: 0, roughness: 0.4 });
const booksLight = new THREE.RectAreaLight(0xffb070, 0, 0.03, BOOKT.STRIP);
const booksWash = new THREE.PointLight(0xffb070, 0, 1.3, 2);
const booksHaloTex = canvasTex(64, 256, (g, W, H) => {
  const id = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W - 0.5, v = (y + 0.5) / H;
    const across = Math.exp(-Math.pow(u / 0.17, 2)), ends = Math.min(1, v / 0.16, (1 - v) / 0.16);
    const a = across * Math.pow(Math.max(0, ends), 1.4), i = (y * W + x) * 4;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = Math.round(255 * a);
  }
  g.putImageData(id, 0, 0);
}, [1, 1]);
booksHaloTex.wrapS = booksHaloTex.wrapT = THREE.ClampToEdgeWrapping; booksHaloTex.repeat.set(1, 1);
MATS.booksHalo = new THREE.MeshBasicMaterial({ map: booksHaloTex, color: 0x000000, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const booksHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1), MATS.booksHalo); booksHalo.renderOrder = 2;
const booksLed = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1, 0.003), MATS.booksLed);
booksLight.visible = booksWash.visible = false;
scene.add(booksLight, booksWash, booksHalo, booksLed);
const BOOK_COLS = ['#1f2a44', '#7a2e2a', '#2f4a3a', '#c9b48a', '#e8e2d4', '#3a3a3a', '#b5651d', '#5d6d7e', '#d8c9a3', '#2c5d63', '#a39171', '#151515', '#efe9dc', '#6b4f3a', '#c44536', '#9fb1a0', '#e3b448', '#f2efe8', '#3e5c8a', '#8a8f5a', '#d97a52', '#1d1d1d', '#b9c4cc', '#6d2f4f'];
function booksRange() {
  const M = liv.media; if (!M) return null;
  const hw = 0.125;                                                       // books overhang the 16 cm plates: half the widest book
  return { lo: M.offset + UNIT.W / 2 + 0.06 + hw, hi: M.half - 0.05 - hw, hw };
}
function bookStackGeo(r, W, h0, h1, list) {
  // books lying flat from h0 up to h1, spines facing the room (+z), fore-edge against the wall
  const col = new THREE.Color(), pg = new THREE.Color();
  let y = h0; const stack = [];
  while (true) { const t = 0.016 + r() * 0.026; if (y + t > h1 + 0.004) break; stack.push(t); y += t; }
  if (!stack.length) return;
  const k = (h1 - h0) / stack.reduce((a, b) => a + b, 0); y = h0;              // stretch a little so the stack fills to the plate above
  for (const t0 of stack) {
    const t = t0 * Math.min(k, 1.25), L = 0.19 + r() * 0.06, D = 0.13 + r() * 0.035;
    col.setStyle(BOOK_COLS[Math.floor(r() * BOOK_COLS.length)]); const tone = 0.85 + r() * 0.25; col.multiplyScalar(tone);
    pg.setStyle(r() < 0.8 ? '#efe6d0' : '#f6f2e8').multiplyScalar(0.92 + r() * 0.08);
    const geo = new THREE.BoxGeometry(L, t - 0.0008, D);
    const n = geo.attributes.position.count, cols = new Float32Array(n * 3);
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each)
    const faceCol = [pg, pg, col, col, col, pg];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) faceCol[f].toArray(cols, (f * 4 + v) * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const off = (r() - 0.5) * 0.02, rot = (r() - 0.5) * 0.06, jz = 0.02 + D / 2 + (r() - 0.5) * 0.006;
    geo.rotateY(rot); geo.translate(off, y + t / 2, jz);
    list.push(geo);
    if (r() < 0.55 && t > 0.02) {                                            // a title band on the spine
      const b = new THREE.BoxGeometry(L * (0.3 + r() * 0.35), t * 0.42, 0.0012), bc = new THREE.Color(r() < 0.5 ? '#e9dcc0' : '#2b2b2b');
      if (col.getHSL({}).l < 0.35) bc.setStyle(r() < 0.6 ? '#d9c08a' : '#efe9dc');
      const bn = b.attributes.position.count, bcol = new Float32Array(bn * 3); for (let i = 0; i < bn; i++) bc.toArray(bcol, i * 3);
      b.setAttribute('color', new THREE.BufferAttribute(bcol, 3));
      b.translate(0, 0, D / 2 + 0.0006); b.rotateY(rot); b.translate(off, y + t / 2, jz); list.push(b);
    }
    y += t;
  }
}
function buildBooks() {
  const M = liv.media, R = booksRange(); if (!M || !R) return false;
  const P = BOOKT.packs[books.pack], PP = BOOKT.PIECE + BOOK_GAPS[books.gap].g, H = P.n * PP;
  if (books.s === null) books.s = (R.lo + R.hi) / 2;
  if (books.z0 === null) books.z0 = 0.36;
  let ok = true;
  const s = THREE.MathUtils.clamp(books.s, R.lo, Math.max(R.lo, R.hi)); if (Math.abs(s - books.s) > 1e-6) ok = false; books.s = s;
  const zmax = Math.min(2.6 - 0.05 - H - 0.16, 1.4), z0 = THREE.MathUtils.clamp(books.z0, 0.12, zmax); if (Math.abs(z0 - books.z0) > 1e-6) ok = false; books.z0 = +z0.toFixed(3);
  if (books.group) { scene.remove(books.group); dropParts(books.parts); }
  const { n, a } = M, O = M.base.clone().addScaledVector(a, books.s);
  const g = new THREE.Group(); g.position.copy(O); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, UP, n));
  const metal = [], paper = [], r = rng(books.seed * 7919 + 104729); for (let i = 0; i < 12; i++) r();
  const shelfYs = [];
  for (let k = 0; k < P.n; k++) {
    const b0 = books.z0 + k * PP;                                        // pieces mounted with a gap (books fill it)
    metal.push(new THREE.BoxGeometry(0.03, BOOKT.PIECE - 0.004, 0.012).translate(0, b0 + BOOKT.PIECE / 2, 0.012));      // spine, 6 mm off the wall
    for (const sy of [0.0775, 0.2325]) {
      const y = b0 + sy; shelfYs.push(y);
      metal.push(new THREE.BoxGeometry(BOOKT.SH_W, 0.002, BOOKT.SH_D).translate(0, y, 0.018 + BOOKT.SH_D / 2));          // the plate
      metal.push(new THREE.BoxGeometry(0.03, 0.03, 0.004).translate(0, y - 0.015, 0.02));                                 // bent flange onto the spine
    }
    for (const sy of [0.025, BOOKT.PIECE - 0.025]) metal.push(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 10).rotateX(Math.PI / 2).translate(0, b0 + sy, 0.0185));   // screw heads
  }
  for (let i = 0; i < shelfYs.length; i++) {
    const h0 = shelfYs[i] + 0.001, h1 = i + 1 < shelfYs.length ? shelfYs[i + 1] - 0.0015 : shelfYs[i] + 0.12 + r() * 0.03;
    bookStackGeo(r, BOOKT.SH_W, h0, h1, paper);
  }
  const mm = new THREE.Mesh(mergeGeometries(metal, false), MATS.booksMetal), pm = new THREE.Mesh(mergeGeometries(paper, false), MATS.booksPaper);
  for (const m of [mm, pm]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  for (const x of [...metal, ...paper]) x.dispose();
  const top = shelfYs[shelfYs.length - 1] + 0.15;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.26, top - books.z0 + 0.02, 0.19), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, (books.z0 + top) / 2, 0.105); g.add(hit);
  scene.add(g); g.updateMatrixWorld(true);
  const door = { kind: 'swap', label: 'Book tower', parts: [hit], center: O.clone().setY((books.z0 + top) / 2),
    swap: () => selectFurniture(selected === booksMover ? null : booksMover), prompt: () => (selected === booksMover ? 'Done with the book tower' : 'Move the book tower') };
  hit.userData.door = door; hit.userData.furniture = true; collidables.push(hit);
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Book tower'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  books.group = g; books.parts = [hit]; books.top = top;
  // Hue Lightstrip Plus (2 m) on the wall behind the spine: an area light facing the wall and an additive halo on the wall around the books
  const L = Math.min(BOOKT.STRIP, books.top - 0.03 - (books.z0 + 0.02)), ymid = books.z0 + 0.02 + L / 2;      // cut to the tower's height, hidden behind the books
  const W0 = O.clone().setY(ymid);
  booksLed.position.copy(W0).addScaledVector(n, 0.0025); booksLed.quaternion.copy(g.quaternion); booksLed.scale.set(1, L, 1);
  booksLight.height = L; booksLight.position.copy(W0).addScaledVector(n, 0.02); booksLight.lookAt(W0.clone().addScaledVector(n, -1));
  booksHalo.position.copy(W0).addScaledVector(n, 0.0015); booksHalo.quaternion.copy(g.quaternion); booksHalo.scale.set(1, L + 0.7, 1);
  booksWash.position.copy(W0).addScaledVector(n, 0.07);
  shadowDirty = true;
  booksDimsUpdate();
  if (typeof applyLights === 'function' && LIGHTS.books) applyLights();
  return ok;
}
function booksGaps() {
  const M = liv.media, R = booksRange(); if (!M || !books.group) return null;
  const toUnit = books.s - (M.offset + UNIT.W / 2) - R.hw, toEnd = M.half - books.s - R.hw;
  return { toUnit, toEnd };
}
function booksDimsUpdate() {
  booksDims.clear(); const M = liv.media, G = booksGaps(); if (!G) return;
  const R = booksRange(), y = 1.0, p = (s) => toBl(M.base.clone().addScaledVector(M.n, 0.12).addScaledVector(M.a, s));
  booksDims.add(dimLine(p(books.s - R.hw), p(M.offset + UNIT.W / 2), `${G.toUnit.toFixed(2)} m to TV unit`, 0.32));
  booksDims.add(dimLine(p(books.s + R.hw), p(M.half), `${G.toEnd.toFixed(2)} m to the hall opening`, 0.32));
  const t = labelSprite(`Book tower · ${BOOKT.packs[books.pack].n * 2} tiers · ${Math.round((books.top - books.z0) * 100)} cm`, { h: 0.03 });
  t.position.copy(books.group.position).addScaledVector(M.n, 0.25).setY(books.top + 0.18); booksDims.add(t);
}
const booksMover = {
  name: 'Book tower', title: () => `ART-GIFTREE floating book tower · ${BOOKT.packs[books.pack].n} pcs, ${BOOKT.packs[books.pack].n * 2} tiers · white`,
  anchor: () => (books.group ? books.group.position.clone().addScaledVector(liv.media.n, 0.2).setY(books.top + 0.1) : null),
  axis: () => liv.media.a.clone(),
  shift: (dir) => { books.s += dir * 0.05; if (!buildBooks()) showToast(dir > 0 ? 'Can’t go further: the opening to the hall' : 'Can’t go further: the TV unit'); },
  axis2: () => new THREE.Vector3(0, 1, 0),
  shift2: (dir) => { books.z0 += dir * 0.05; if (!buildBooks()) showToast(dir > 0 ? 'That’s as high as it goes under the ceiling' : 'That’s as low as it goes'); },
  variant: { label: () => 'New books', run: () => { books.seed++; buildBooks(); showToast('Shuffled the books'); } },
  lights: ['books'],
  selects: [
    { id: 'bpack', label: 'Pack', options: () => BOOKT.packs.map((p) => ({ label: `${p.n} pieces · ${p.n * 2} tiers` })), get: () => books.pack,
      set: (i) => { books.pack = i; buildBooks(); } },
    { id: 'bgap', label: 'Spacing', options: () => BOOK_GAPS.map((g) => ({ label: g.label })), get: () => books.gap, set: (i) => { books.gap = i; buildBooks(); } },
  ],
  link: () => { const p = BOOKT.packs[books.pack]; return { href: BOOKT.url(p.asin), text: `Amazon · ${p.n}-pack white · SEK ${p.sek.toFixed(2).replace('.', ',')} ↗` }; },
  info: () => { const G = booksGaps(), p = BOOKT.packs[books.pack];
    return `Each piece 31 cm with 2 shelves 16 × 13 cm${BOOK_GAPS[books.gap].g ? ', mounted 40 cm apart' : ', stacked tight'} · ${Math.round((books.top - books.z0) * 100)} cm tall; spine and books ≈ 25 cm wide · bottom shelf ${Math.round((books.z0 + 0.0775) * 100)} cm off the floor · ${G ? `${G.toUnit.toFixed(2)} m to the TV unit, ${G.toEnd.toFixed(2)} m to the hall opening` : ''} · Hue Lightstrip Plus 2 m behind it · SEK ${p.sek.toFixed(2)} + shipping from amazon.com · ▲▼ raise/lower`; },
};
LIGHTS.books = { name: 'Book tower', room: 'living', model: 'Philips Hue Lightstrip Plus 2 m, vertical behind the book tower', on: false, bri: 0.7, ct: 2700, mode: 'ct', color: '#ff7a45',
  apply: (L, rgb, lv) => {
    booksLight.color.copy(rgb); booksLight.intensity = 22 * lv; booksLight.visible = lv > 0;
    booksWash.color.copy(rgb); booksWash.intensity = 0.35 * lv; booksWash.visible = lv > 0;
    MATS.booksLed.emissive.copy(rgb); MATS.booksLed.emissiveIntensity = 1.6 * lv;
    MATS.booksHalo.color.copy(rgb).multiplyScalar(0.2 * lv); booksHalo.visible = lv > 0;
  } };
// ------------------------------------------------------------ living: a tall plant in the corner between the canal wall and the balcony door
// Modelled leaf by leaf (outlines as shapes, bent and cupped), merged per material; pot + saucer by lathe. Moves anywhere, turns 15°.
const PLANTS = [
  { name: 'Fiddle-leaf fig', latin: 'Ficus lyrata', h: 2.1, leaf: 0x2a6a26, kind: 'fig' },
  { name: 'Kentia palm', latin: 'Howea forsteriana', h: 2.1, leaf: 0x2f6a2b, kind: 'palm' },
  { name: 'Bird of paradise', latin: 'Strelitzia nicolai', h: 2.1, leaf: 0x2c5f2d, kind: 'strel' },
  { name: 'Olive tree', latin: 'Olea europaea', h: 1.9, leaf: 0x56703f, kind: 'olive' },
];
const POTS = [
  { name: 'Matte white ceramic', c: 0xeeebe4, r: 0.6 },
  { name: 'Terracotta', c: 0xb8643f, r: 0.85 },
  { name: 'Black ceramic', c: 0x24221f, r: 0.45 },
  { name: 'Concrete grey', c: 0x9c9a94, r: 0.95, grain: true },
  { name: 'Woven seagrass basket', c: 0xb89a6a, r: 0.95, weave: true },
];
const plant = { pos: null, angle: 0, kind: 0, pot: 0, group: null, parts: [] };
const plantDims = new THREE.Group(); dimsGroup.add(plantDims);
function leafShape(kind, L, W) {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  if (kind === 'fig') {            // violin: narrow waist, wide rounded tip, slight notch at the tip
    s.bezierCurveTo(W * 0.35, L * 0.05, W * 0.32, L * 0.35, W * 0.42, L * 0.55);
    s.bezierCurveTo(W * 0.58, L * 0.8, W * 0.4, L * 1.0, W * 0.04, L * 0.99); s.lineTo(0, L * 0.97); s.lineTo(-W * 0.04, L * 0.99);
    s.bezierCurveTo(-W * 0.4, L * 1.0, -W * 0.58, L * 0.8, -W * 0.42, L * 0.55);
    s.bezierCurveTo(-W * 0.32, L * 0.35, -W * 0.35, L * 0.05, 0, 0);
  } else if (kind === 'strel') {   // long paddle, blunt tip
    s.bezierCurveTo(W * 0.5, L * 0.02, W * 0.52, L * 0.6, W * 0.4, L * 0.92); s.quadraticCurveTo(0, L * 1.04, -W * 0.4, L * 0.92);
    s.bezierCurveTo(-W * 0.52, L * 0.6, -W * 0.5, L * 0.02, 0, 0);
  } else {                         // lanceolate (palm leaflets, olive leaves)
    s.quadraticCurveTo(W * 0.62, L * 0.35, 0, L); s.quadraticCurveTo(-W * 0.62, L * 0.35, 0, 0);
  }
  return s;
}
function leafGeo(kind, L, W, cup, droop, segs = 6) {
  const g = new THREE.ShapeGeometry(leafShape(kind, L, W), segs), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), u = y / L;
    P.setZ(i, cup * x * x / (W * W) * W - droop * u * u * L);                 // cupped across, drooping towards the tip
  }
  g.computeVertexNormals(); g.deleteAttribute('uv'); return g;
}
function orientLeaf(geo, base, dir, roll) {
  // leaf local: +y along the midrib, +z its face normal → world: +y → dir, rolled around dir
  const d = dir.clone().normalize(), up = Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(d, up).normalize(), z = new THREE.Vector3().crossVectors(x, d).normalize();
  const m = new THREE.Matrix4().makeBasis(x, d, z).multiply(new THREE.Matrix4().makeRotationY(roll)); m.setPosition(base);
  geo.applyMatrix4(m); return geo;
}
function tintGeo(geo, c) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
}
function stemGeo(pts, r0, r1, segs = 24) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, segs, 1, 7, false), P = g.attributes.position;
  // taper: TubeGeometry has radius 1; scale each ring towards its centre
  const ring = 8, cs = curve.getSpacedPoints(segs);
  for (let i = 0; i < P.count; i++) { const k = Math.floor(i / ring), c = cs[Math.min(k, segs)], t = k / segs, r = r0 + (r1 - r0) * t;
    const v = new THREE.Vector3().fromBufferAttribute(P, i).sub(c).normalize().multiplyScalar(r).add(c); P.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); g.deleteAttribute('uv'); return g;
}
function buildPlant(tryPos, tryAngle) {
  if (!plant.pos) { plant.pos = [0.72, 8.2]; plant.angle = 0.4; }
  let pos = tryPos || plant.pos, ok = true;
  const R = 0.2, cx = THREE.MathUtils.clamp(pos[0], LIV_BOX.x0 + R, LIV_BOX.x1 - R), cy = THREE.MathUtils.clamp(pos[1], LIV_BOX.y0 + R, LIV_BOX.y1 - R);
  if (Math.abs(cx - pos[0]) > 1e-6 || Math.abs(cy - pos[1]) > 1e-6) ok = false;
  plant.pos = [cx, cy]; plant.angle = tryAngle ?? plant.angle;
  if (plant.group) { scene.remove(plant.group); dropParts(plant.parts); plant.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  const S = PLANTS[plant.kind], PT = POTS[plant.pot], r = rng(17 + plant.kind * 101);
  const g = new THREE.Group(); g.position.copy(b2t(cx, cy, 0)); g.rotation.y = plant.angle;
  // pot Ø34 × 34 (basket a little wider), saucer, soil
  const potR = PT.weave ? 0.19 : 0.17, potH = 0.34;
  const potMat = PT.weave ? new THREE.MeshStandardMaterial({ color: PT.c, map: weaveTex('canvas'), bumpMap: weaveTex('canvas'), bumpScale: 0.01, roughness: PT.r })
    : std({ color: PT.c, roughness: PT.r, ...(PT.grain ? { map: weaveTex('flat') } : {}) });
  const prof = [[0.0, 0.012], [potR * 0.78, 0.012], [potR * 0.8, 0.0], [potR * 0.86, 0.004], [potR, potH - 0.02], [potR + 0.008, potH - 0.004], [potR + 0.004, potH], [potR - 0.012, potH], [potR - 0.016, potH - 0.03]].map(([a, b]) => new THREE.Vector2(a, b));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), potMat); pot.castShadow = pot.receiveShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(potR - 0.016, 32), std({ color: 0x3b2a1e, roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.y = potH - 0.035; soil.receiveShadow = true; g.add(soil);
  if (!PT.weave) { const sau = new THREE.Mesh(new THREE.CylinderGeometry(potR * 0.95, potR * 0.9, 0.018, 36), potMat); sau.position.y = 0.009; sau.castShadow = sau.receiveShadow = true; g.add(sau); }
  const leaves = [], wood = [], top = potH - 0.035, base = new THREE.Vector3(0, top, 0);
  const lc = new THREE.Color(S.leaf), tc = new THREE.Color();
  const tint = (k = 0.12) => tc.copy(lc).offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.08, (r() - 0.5) * k);
  if (S.kind === 'fig') {
    // single trunk with a slight lean, three side branches; big leaves spiral densely up the top 1.35 m (a full, mature fig)
    const H = S.h, trunk = [base.clone(), new THREE.Vector3(0.02, H * 0.42, 0.01), new THREE.Vector3(0.0, H * 0.7, -0.02), new THREE.Vector3(0.03, H - 0.12, 0.0)];
    wood.push(stemGeo(trunk, 0.026, 0.009));
    const branches = [
      [new THREE.Vector3(0.01, H * 0.5, 0), new THREE.Vector3(0.2, H * 0.6, 0.07), new THREE.Vector3(0.34, H * 0.72, 0.12)],
      [new THREE.Vector3(0.0, H * 0.58, 0), new THREE.Vector3(-0.18, H * 0.68, -0.09), new THREE.Vector3(-0.3, H * 0.82, -0.14)],
      [new THREE.Vector3(0.0, H * 0.66, 0), new THREE.Vector3(-0.05, H * 0.75, 0.2), new THREE.Vector3(-0.08, H * 0.88, 0.32)]];
    for (const b of branches) wood.push(stemGeo(b, 0.011, 0.005, 10));
    const spots = [];
    const tc3 = new THREE.CatmullRomCurve3(trunk);
    for (let i = 0; i < 48; i++) { const t = 0.36 + 0.64 * i / 47; spots.push([tc3.getPoint(t), i * 2.4, 1 - t]); }
    for (const b of branches) { const c = new THREE.CatmullRomCurve3(b); for (let i = 0; i < 11; i++) spots.push([c.getPoint(0.2 + i * 0.08), i * 2.4 + 1, 0.3]); }
    for (const [p, a, low] of spots) {
      const L = 0.28 + r() * 0.14, W = L * (0.7 + r() * 0.1), out = new THREE.Vector3(Math.cos(a), 0.85 + r() * 0.7 - low * 0.6, Math.sin(a));
      const pet = p.clone().addScaledVector(out.clone().setY(0.25).normalize(), 0.035);
      wood.push(stemGeo([p, pet], 0.003, 0.0025, 2));
      leaves.push(tintGeo(orientLeaf(leafGeo('fig', L, W, 0.12, 0.1, 8), pet, out, (r() - 0.5) * 0.5), tint(0.07)));
    }
  } else if (S.kind === 'palm') {
    // 5 slim canes from the pot, each with arching fronds of drooping leaflets
    for (let c = 0; c < 7; c++) {
      const a = c * 0.9 + r() * 0.3, lean = 0.04 + r() * 0.05, hc = S.h * (0.75 + r() * 0.4);
      const cb = base.clone().add(new THREE.Vector3(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04)), ct = new THREE.Vector3(Math.cos(a) * lean * 2, hc * 0.62, Math.sin(a) * lean * 2);
      wood.push(stemGeo([cb, cb.clone().lerp(ct, 0.5), ct], 0.011, 0.008, 8));
      for (let f = 0; f < 2; f++) {
        const fa = a + (f - 0.5) * 1.1 + (r() - 0.5) * 0.4, FL = 0.8 + r() * 0.25, dir = new THREE.Vector3(Math.cos(fa), 0, Math.sin(fa));
        const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(ct.clone().addScaledVector(dir, FL * t * 0.62).add(new THREE.Vector3(0, FL * (0.95 * t - 0.8 * t * t), 0))); }
        wood.push(stemGeo(pts, 0.005, 0.0015, 12));
        const rc = new THREE.CatmullRomCurve3(pts), side = new THREE.Vector3(-dir.z, 0, dir.x);
        for (let i = 2; i < 30; i++) { const t = i / 30, p = rc.getPoint(t), tg = rc.getTangent(t), Ll = 0.12 + 0.2 * Math.sin(Math.PI * t) + r() * 0.03;
          for (const sg of [-1, 1]) { const d = side.clone().multiplyScalar(sg).addScaledVector(tg, 0.55).add(new THREE.Vector3(0, -0.35 - t * 0.4, 0));
            leaves.push(tintGeo(orientLeaf(leafGeo('lance', Ll, 0.022, 0.25, 0.12, 3), p, d, sg * 1.2), tint(0.08))); } }
      }
    }
  } else if (S.kind === 'strel') {
    // upright fan of long petioles carrying big paddle blades
    for (let i = 0; i < 10; i++) {
      const a = i * 0.66 + r() * 0.3, tilt = 0.12 + r() * 0.28, len = 0.7 + r() * 0.6;
      const b0 = base.clone().add(new THREE.Vector3(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03)), d = new THREE.Vector3(Math.cos(a) * tilt, 1, Math.sin(a) * tilt).normalize();
      const b1 = b0.clone().addScaledVector(d, len);
      wood.push(tintGeo(stemGeo([b0, b0.clone().lerp(b1, 0.5), b1], 0.012, 0.007, 6), tint(0.05)));
      const L = Math.min(0.85, S.h - b1.y - 0.02) * (0.85 + r() * 0.15), W = 0.24 + r() * 0.06;
      const bd = d.clone().add(new THREE.Vector3(Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15));
      leaves.push(tintGeo(orientLeaf(leafGeo('strel', L, W, 0.1, 0.06, 10), b1, bd, a + Math.PI / 2 + (r() - 0.5) * 0.6), tint(0.1)));
    }
  } else {
    // olive: gnarled trunk, three branches, a loose crown of small narrow grey-green leaves (silvery undersides via two tints)
    const trunk = [base.clone(), new THREE.Vector3(0.03, 0.55, 0.0), new THREE.Vector3(-0.02, 0.85, 0.02), new THREE.Vector3(0.0, 0.98, 0.0)];
    wood.push(stemGeo(trunk, 0.03, 0.02, 12));
    const k = S.h / 1.6, tips = [[0.3, 1.45 * k, 0.05], [-0.24, 1.5 * k, 0.12], [0.02, 1.55 * k, -0.26], [0.05, 1.58 * k, 0.22], [-0.12, 1.4 * k, -0.1]];
    const crown = [];
    for (const [x, y, z] of tips) { const pts = [new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(x * 0.4, 1.15, z * 0.4), new THREE.Vector3(x, y, z)]; wood.push(stemGeo(pts, 0.014, 0.004, 10)); crown.push(new THREE.CatmullRomCurve3(pts)); }
    const silver = new THREE.Color(0x8d977c);
    for (let i = 0; i < 1500; i++) {
      const c = crown[i % crown.length], t = 0.3 + r() * 0.7, p = c.getPoint(t).add(new THREE.Vector3((r() - 0.5) * 0.36, (r() - 0.3) * 0.3, (r() - 0.5) * 0.36));
      if (p.y > S.h) p.y = S.h - r() * 0.05;
      const d = new THREE.Vector3(r() - 0.5, r() * 0.6 - 0.15, r() - 0.5);
      leaves.push(tintGeo(orientLeaf(leafGeo('lance', 0.065 + r() * 0.03, 0.02, 0.2, 0.05, 2), p, d, r() * Math.PI), r() < 0.2 ? tc.copy(silver) : tint(0.08)));
    }
  }
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: S.kind === 'fig' ? 0.42 : S.kind === 'olive' ? 0.8 : 0.6, envMapIntensity: 0.6 });
  const woodMat = S.kind === 'strel' ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }) : std({ color: S.kind === 'olive' ? 0x3d362d : S.kind === 'palm' ? 0x4a6236 : 0x40372c, roughness: 0.9 });
  if (S.kind !== 'strel') for (const w of wood) if (w.attributes.color) w.deleteAttribute('color');
  const lm = new THREE.Mesh(mergeGeometries(leaves, false), leafMat), wm = new THREE.Mesh(mergeGeometries(wood, false), woodMat);
  for (const m of [lm, wm]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  for (const x of [...leaves, ...wood]) x.dispose();
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(potR + 0.02, potR + 0.02, 1.2, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.6; g.add(hit);
  scene.add(g); g.updateMatrixWorld(true);
  const door = { kind: 'swap', label: 'Plant', parts: [hit], center: g.position.clone().setY(1.0),
    swap: () => selectFurniture(selected === plantMover ? null : plantMover), prompt: () => (selected === plantMover ? 'Done with the plant' : 'Move or turn the plant') };
  hit.userData.door = door; hit.userData.furniture = true; collidables.push(hit);
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Plant'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  plant.group = g; plant.parts = [hit]; plant.potR = potR; shadowDirty = true;
  plantDimsUpdate(); placePlantStrip();
  return ok;
}
function plantDimsUpdate() {
  plantDims.clear(); const g = plant.group; if (!g) return;
  for (const d of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
    const dir = b2t(d[0], d[1]).normalize(), from = g.position.clone().setY(0.3).addScaledVector(dir, plant.potR + 0.005), dd = gapTo(from, dir, 3);
    if (dd !== null && dd < 1.5) plantDims.add(dimLine(toBl(from), toBl(from.clone().addScaledVector(dir, dd)), `${dd.toFixed(2)} m`, 0.05));
  }
  const t = labelSprite(`${PLANTS[plant.kind].name} · ${Math.round(PLANTS[plant.kind].h * 100)} cm`, { h: 0.03 }); t.position.copy(g.position).setY(PLANTS[plant.kind].h + 0.12); plantDims.add(t);
}
// Hue Lightstrip Plus (2 m) on the wall behind the plant: picks the wall behind it as seen from the room (the nearest wall roughly away from
// the room's centre), runs from the floor up, and washes the wall so the leaves stand out in silhouette. Same parts as the book-tower strip.
const plantLight = new THREE.RectAreaLight(0xffb070, 0, 0.03, 2);
const plantWash = new THREE.PointLight(0xffb070, 0, 1.6, 2);
MATS.plantLed = new THREE.MeshStandardMaterial({ color: 0xf6f1e8, emissive: 0xffb070, emissiveIntensity: 0, roughness: 0.4 });
MATS.plantHalo = new THREE.MeshBasicMaterial({ map: booksHaloTex, color: 0x000000, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const plantHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1), MATS.plantHalo); plantHalo.renderOrder = 2;
const plantLed = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1, 0.003), MATS.plantLed);
plantLight.visible = plantWash.visible = plantHalo.visible = false;
scene.add(plantLight, plantWash, plantHalo, plantLed);
function placePlantStrip() {
  const g = plant.group; if (!g) return;
  const C = b2t(2.48, 4.48, 0), away = g.position.clone().sub(C).setY(0).normalize();
  let best = null;
  for (const d of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
    const dir = b2t(d[0], d[1]).normalize(), from = g.position.clone().setY(1.0), dd = gapTo(from, dir, 3);
    if (dd === null) continue;
    const score = dd - 0.8 * dir.dot(away);                     // close, and behind the plant as seen from the room
    if (!best || score < best.score) best = { dir, dd, score };
  }
  if (!best) return;
  const n = best.dir.clone().negate(), L = Math.min(2.0, PLANTS[plant.kind].h + 0.15), y0 = 0.06;
  const W0 = g.position.clone().addScaledVector(best.dir, best.dd).setY(y0 + L / 2);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(UP, n).normalize(), UP, n));
  plantLed.position.copy(W0).addScaledVector(n, 0.0025); plantLed.quaternion.copy(q); plantLed.scale.set(1, L, 1);
  plantLight.height = L; plantLight.position.copy(W0).addScaledVector(n, 0.02); plantLight.lookAt(W0.clone().addScaledVector(n, -1));
  plantHalo.position.copy(W0).addScaledVector(n, 0.0015); plantHalo.quaternion.copy(q); plantHalo.scale.set(1, L + 0.7, 1);
  plantWash.position.copy(W0).addScaledVector(n, 0.08);
  plant.stripWall = best.dd;
}
LIGHTS.plant = { name: 'Plant', room: 'living', model: 'Philips Hue Lightstrip Plus 2 m, vertical on the wall behind the plant', on: false, bri: 0.7, ct: 2700, mode: 'ct', color: '#7cff8a',
  apply: (L, rgb, lv) => {
    plantLight.color.copy(rgb); plantLight.intensity = 22 * lv; plantLight.visible = lv > 0;
    plantWash.color.copy(rgb); plantWash.intensity = 0.4 * lv; plantWash.visible = lv > 0;
    MATS.plantLed.emissive.copy(rgb); MATS.plantLed.emissiveIntensity = 1.6 * lv;
    MATS.plantHalo.color.copy(rgb).multiplyScalar(0.2 * lv); plantHalo.visible = lv > 0;
  } };
const plantMover = {
  name: 'Plant', title: () => `${PLANTS[plant.kind].name} (${PLANTS[plant.kind].latin}) · ${POTS[plant.pot].name}`,
  anchor: () => (plant.group ? plant.group.position.clone().setY(PLANTS[plant.kind].h + 0.05) : null),
  axis: () => b2t(1, 0).normalize(), axis2: () => b2t(0, 1).normalize(),
  shift: (dir) => { const p0 = plant.pos; if (!buildPlant([p0[0] + dir * 0.05, p0[1]])) showToast('Can’t go further: wall'); },
  shift2: (dir) => { const p0 = plant.pos; if (!buildPlant([p0[0], p0[1] + dir * 0.05])) showToast('Can’t go further: wall'); },
  rotate: (dir) => { buildPlant(null, plant.angle + dir * Math.PI / 12); },
  angle: () => plant.angle,
  lights: ['plant'],
  selects: [
    { id: 'pkind', label: 'Plant', options: () => PLANTS.map((p) => ({ label: `${p.name} · ${p.latin} · ~${Math.round(p.h * 100)} cm` })), get: () => plant.kind, set: (i) => { plant.kind = i; buildPlant(); } },
    { id: 'ppot', label: 'Pot', options: () => POTS.map((p) => ({ label: p.name })), get: () => plant.pot, set: (i) => { plant.pot = i; buildPlant(); } },
  ],
  info: () => `About ${Math.round(PLANTS[plant.kind].h * 100)} cm tall in a Ø${Math.round(plant.potR * 200)} cm pot · a generic plant (no product picked yet) · Hue Lightstrip Plus on the wall behind it · ⟲ ⟳ turn it to show its best side`,
};
const guestMover = {
  name: 'Sofa bed', title: () => `Arezzo 3-pers sovesofa${guest.open ? ' · as bed' : ''}`,
  anchor: () => (guest.group ? guest.group.position.clone().addScaledVector(guest.wall.n, guestFront() + 0.2).setY(0.9) : null),
  axis: () => guest.wall.a,
  shift: (dir) => { const b = guest.offset; guest.offset += dir * 0.05; buildGuestSofa(); if (Math.abs(guest.offset - b) < 1e-6) showToast('Can’t go further: end of the wall'); },
  variant: { label: () => (guest.open ? 'Close to sofa' : 'Open as bed'), run: () => { guest.open = !guest.open; buildGuestSofa(); if (vpax.run) vpaxDimsUpdate(); showToast(guest.open ? 'Pulled out as a bed (198 × 152)' : 'Back to a sofa'); } },
  selects: [
    { id: 'gscol', label: 'Fabric & colour', options: () => GS_COLORS.map(([c, nm]) => ({ group: c, label: `${c} ${nm}` })), get: () => guest.color,
      set: (i) => { guest.color = i; buildGuestSofa(); } },
  ],
  link: () => ({ href: GS.url, text: 'Møbelkompagniet · Arezzo ↗' }),
  info: () => { const G = guestGaps();
    return `237 × 107 × 93 cm · seat 43 cm · bed 198 × 152 · ${GS.price} · ${G.front.toFixed(2)} m free in front${guest.open ? ' of the bed' : ''} · ${G.sideN.toFixed(2)} / ${G.sideP.toFixed(2)} m to the ends`; },
};
