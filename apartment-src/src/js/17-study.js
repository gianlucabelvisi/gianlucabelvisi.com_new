// ------------------------------------------------------------ værelse (2026-11-15): Gianluca's own lattice closet + a desk chair
// The closet is one they already own (photo IMG_1011): honey-coloured solid wood, crown cornice, plinth with a scalloped skirt,
// two doors with four studded diagonal-lattice panels each, iron ring pulls. 85 × 37 × 180 cm (Gianluca).
const LATTICE = { W: 0.85, D: 0.37, H: 1.80, wood: 0xb5763f };
let _latticeTex = null;
function latticeDoorTex() {                               // one door leaf (frame + 4 lattice panels), drawn once; x = leaf width, y = leaf height
  if (_latticeTex) return _latticeTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d'), W = 256, H = 1024;
  g.fillStyle = '#b8783f'; g.fillRect(0, 0, W, H);
  const r = rng(77); for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${90 + r() * 40 | 0},${50 + r() * 20 | 0},20,${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 2; const x = r() * W; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + r() * 8 - 4, H * 0.3, x + r() * 8 - 4, H * 0.7, x + r() * 6 - 3, H); g.stroke(); }
  // panels (fractions of the leaf height from the top): a taller top panel, then three, as in the photo
  const fr = [[0.05, 0.31], [0.35, 0.56], [0.60, 0.80], [0.84, 0.97]], m = 34;
  for (const [t0, t1] of fr) {
    const x0 = m, x1 = W - m, y0 = t0 * H, y1 = t1 * H;
    g.fillStyle = 'rgba(70,38,16,0.55)'; g.fillRect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12);      // moulding shadow
    g.fillStyle = '#c98c4f'; g.fillRect(x0 - 3, y0 - 3, x1 - x0 + 6, 3); g.fillRect(x0 - 3, y0 - 3, 3, y1 - y0 + 6);
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.fillStyle = '#1e140d'; g.fillRect(x0, y0, x1 - x0, y1 - y0);                                      // the dark inside, seen through the holes
    const s = 30, lw = 13;
    for (const dir of [1, -1]) {
      for (let k = -H; k < H + W; k += s) {
        g.strokeStyle = '#7a4a24'; g.lineWidth = lw + 3; g.beginPath(); g.moveTo(x0 - 10, y0 + k); g.lineTo(x0 - 10 + 600, y0 + k - dir * 600); g.stroke();
        g.strokeStyle = '#b4733a'; g.lineWidth = lw; g.beginPath(); g.moveTo(x0 - 10, y0 + k); g.lineTo(x0 - 10 + 600, y0 + k - dir * 600); g.stroke();
      }
    }
    g.fillStyle = '#d4b06a';                                                                            // brass studs where the slats cross
    for (let yy = y0 - 40; yy < y1 + 40; yy += s / 2) for (let xx = x0 - 40; xx < x1 + 40; xx += s / 2) {
      const u = xx - (x0 - 10), v = yy - y0; if (Math.abs(((u + v) / s) % 1) < 0.08 || Math.abs(((u + v) / s) % 1) > 0.92) if (Math.abs(((v - u) / s) % 1) < 0.08 || Math.abs(((v - u) / s) % 1) > 0.92) { g.beginPath(); g.arc(xx, yy, 2.6, 0, 7); g.fill(); }
    }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return (_latticeTex = t);
}
function buildLatticeCloset(O, n, a) {                   // returns a run-like object for buildVaerCloset: { g, parts, doors, O, width }
  const { W, D, H } = LATTICE, g = new THREE.Group(); g.position.copy(O);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, UP, n));      // local x along the wall (0..W), z out of the wall (front at D)
  const parts = [], add = (geo, mat, x, y, z, solid = true) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); if (solid) parts.push(o); return o; };
  const wood = stdc({ color: LATTICE.wood, roughness: 0.6, map: grainTex() }), dark = stdc({ color: 0x8a5428, roughness: 0.65, map: grainTex() });
  const pl = 0.075, cor = 0.11, bodyH = H - pl - cor;
  add(new THREE.BoxGeometry(W - 0.03, bodyH, D - 0.04), wood, W / 2, pl + bodyH / 2, (D - 0.04) / 2);                     // carcass
  add(new THREE.BoxGeometry(W - 0.01, pl, D - 0.02), dark, W / 2, pl / 2, (D - 0.02) / 2);                                  // plinth
  { const sk = new THREE.Shape(); sk.moveTo(0, 0); sk.lineTo(W, 0); sk.lineTo(W, pl); sk.lineTo(0, pl); sk.lineTo(0, 0);    // scalloped skirt in front of the plinth
    const hole = new THREE.Path(); hole.moveTo(0.12, 0); hole.quadraticCurveTo(0.2, 0.045, W / 2, 0.03); hole.quadraticCurveTo(W - 0.2, 0.045, W - 0.12, 0); hole.lineTo(0.12, 0); sk.holes.push(hole);
    add(new THREE.ExtrudeGeometry(sk, { depth: 0.018, bevelEnabled: false }), wood, 0, 0, D - 0.02, false); }
  // crown cornice: three stepped mouldings, the top one widest
  [[W + 0.02, 0.035, D + 0.01, 0], [W + 0.05, 0.03, D + 0.025, 0.035], [W + 0.08, 0.045, D + 0.04, 0.065]].forEach(([w, h, d, y]) =>
    add(softBox(w, h, d, 0.008), wood, W / 2, H - cor + y + h / 2, d / 2 - 0.0));
  // doors: two leaves, front face carries the lattice drawing
  const lw = (W - 0.07) / 2, lh = bodyH - 0.07, ly = pl + 0.035 + lh / 2, fz = D - 0.02;
  const doorM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: latticeDoorTex(), roughness: 0.6, bumpMap: latticeDoorTex(), bumpScale: 0.004 });
  for (const s of [0, 1]) {
    const x = 0.035 + lw / 2 + s * (lw + 0.0) ;
    add(new THREE.BoxGeometry(lw - 0.004, lh, 0.022), [wood, wood, wood, wood, doorM, wood], x, ly, fz + 0.011);
  }
  add(new THREE.BoxGeometry(0.02, lh, 0.006), dark, W / 2, ly, fz + 0.025, false);                                         // centre astragal
  const iron = stdc({ color: 0x2a2421, roughness: 0.5, metalness: 0.6 });
  for (const s of [-1, 1]) { const ring = add(new THREE.TorusGeometry(0.022, 0.004, 8, 20), iron, W / 2 + s * 0.045, pl + bodyH * 0.47, fz + 0.03, false);
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 10).rotateX(Math.PI / 2), iron, W / 2 + s * 0.045, pl + bodyH * 0.47 + 0.022, fz + 0.026, false); ring.castShadow = true; }
  for (const s of [0, 1]) for (const yy of [0.25, 0.5, 0.85]) add(new THREE.BoxGeometry(0.012, 0.06, 0.006), stdc({ color: 0xb08a4a, metalness: 0.7, roughness: 0.4 }), s ? W - 0.03 : 0.03, pl + bodyH * yy, fz + 0.012, false);
  // what's on top in the photo: a few big books
  const bc = [0xece9e2, 0xd9d6cf, 0xe6e2da]; let by = H;
  for (let i = 0; i < 3; i++) { const t = 0.03 + i * 0.006; add(new THREE.BoxGeometry(0.34, t, 0.25), stdc({ color: bc[i], roughness: 0.7 }), 0.27, by + t / 2, D / 2, false); by += t; }
  { const mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids); }
  scene.add(g); g.updateMatrixWorld(true);
  for (const q of parts) { q.userData.furniture = true; collidables.push(q); }
  return { g, parts, doors: [], O: O.clone(), width: W };
}
// ---- desk chairs: low backs, no gamer chairs ("one Svetlana won't hate"). Danish prices, Nov 2026.
const DCHAIRS = [
  { name: 'HAY About A Chair AAC 53 Soft', style: 'tub', W: 0.69, D: 0.69, SH: 0.46, back: 0.30, kr: 6199, base: 0xc9cbcd, metal: true,
    url: 'https://www.kontorsyd.dk/da/moedestole/hay-aac-53-soft-stol', note: 'fully upholstered tub shell, polished aluminium 5-star base, soft castors, seat 42–56 cm',
    cols: [{ name: 'Grå', c: 0x8d8b88 }, { name: 'Hallingdal 130 (havre)', c: 0xc9c0b0 }, { name: 'Cognac læder', c: 0x8b4f2b, leather: true }] },
  { name: 'Muuto Fiber Armchair, swivel + gas lift', style: 'fiber', W: 0.70, D: 0.70, SH: 0.47, back: 0.30, kr: 6849, base: 0x222222,
    url: 'https://rosborgshop.dk/produkter/370-muuto/7372-fiber-armchair-swivel-gaslift-muuto/', note: 'moulded shell with upholstered seat (Kvadrat Remix), seat 46–53 cm',
    cols: [{ name: 'Sort / sort', c: 0x2b2b2c, base: 0x1c1c1c }, { name: 'Grå / grå', c: 0x8e8f8f, base: 0x8a8c8d }] },
  { name: 'IKEA LÅNGFJÄLL, no armrests', style: 'task', W: 0.68, D: 0.68, SH: 0.47, back: 0.40, kr: 999, base: 0x1d1d1d,
    url: 'https://www.ikea.com/dk/da/p/langfjaell-kontorstol-gunnared-beige-sort-s89177566/', note: 'budget pick: Gunnared fabric, seat 43–53 cm',
    cols: [{ name: 'Gunnared beige', c: 0xbfb39d }, { name: 'Gunnared mørkegrå', c: 0x56575a }] },
];
const dchair = { m: 0, col: 0 };
function deskChair(parent, x, z, rotY) {                  // builds the chair into the desk group; front of the chair = +z (towards the desk)
  const C = DCHAIRS[dchair.m], V = C.cols[Math.min(dchair.col, C.cols.length - 1)], cg = new THREE.Group(); cg.position.set(x, 0, z); cg.rotation.y = rotY; parent.add(cg);
  const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; cg.add(o); return o; };
  const fab = V.leather ? new THREE.MeshStandardMaterial({ color: V.c, roughness: 0.55, map: weaveTex('leather') })
    : new THREE.MeshPhysicalMaterial({ color: V.c, roughness: 0.95, sheen: 0.5, sheenRoughness: 0.6, sheenColor: 0xffffff, map: weaveTex(C.style === 'task' ? 'flat' : 'boucle') });
  const baseM = stdc({ color: V.base ?? C.base, roughness: C.metal ? 0.25 : 0.5, metalness: C.metal ? 0.85 : 0.2 }), black = stdc({ color: 0x151515, roughness: 0.6 });
  // 5-star base with castors and a gas column
  for (let k = 0; k < 5; k++) { const ang = k * Math.PI * 2 / 5, arm = add(new THREE.BoxGeometry(0.03, 0.03, 0.31), baseM, Math.sin(ang) * 0.155, 0.075, Math.cos(ang) * 0.155); arm.rotation.y = ang;
    add(new THREE.SphereGeometry(0.026, 12, 8), black, Math.sin(ang) * 0.3, 0.028, Math.cos(ang) * 0.3); }
  add(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 16), baseM, 0, 0.09, 0);
  add(new THREE.CylinderGeometry(0.022, 0.022, C.SH - 0.18, 14), baseM, 0, 0.11 + (C.SH - 0.18) / 2, 0);
  add(new THREE.BoxGeometry(0.2, 0.025, 0.2), black, 0, C.SH - 0.075, 0);                        // mechanism plate
  const sw = C.style === 'task' ? 0.5 : 0.52, sd = C.style === 'task' ? 0.46 : 0.45, st = C.style === 'fiber' ? 0.055 : 0.075;
  const seat = softBox(sw, st, sd, 0.025, { top: 0.008 }); if (C.style !== 'task') superRound(seat, 'xz', sw / 2, sd / 2, 2.4, 2.4); seat.computeVertexNormals();
  add(seat, fab, 0, C.SH - st / 2, 0.02);
  if (C.style === 'task') {                                // LÅNGFJÄLL: a padded back on a stem, armless
    add(new THREE.BoxGeometry(0.05, 0.3, 0.025), black, 0, C.SH + 0.08, -sd / 2 - 0.02).rotation.x = -0.1;
    const b = softBox(0.47, C.back, 0.06, 0.025, { front: 0.006 }); bendAroundY(b, 0.7); b.computeVertexNormals();
    add(b, fab, 0, C.SH + 0.1 + C.back / 2, -sd / 2 - 0.02).rotation.x = -0.1;
  } else {                                                 // tub shell: low back that wraps forward into the arms
    const bw = C.style === 'fiber' ? 0.98 : 1.02, bt = C.style === 'fiber' ? 0.02 : 0.055, R = 0.27;
    const b = softBox(bw, C.back, bt, Math.min(0.02, bt / 2 - 0.002), { front: 0.006 }); superRound(b, 'xy', bw / 2, C.back / 2, 3.2, 3.2); bendAroundY(b, R); b.computeVertexNormals();
    const shellM = C.style === 'fiber' ? stdc({ color: V.c, roughness: 0.6 }) : fab;
    const bm = add(b, shellM, 0, C.SH + C.back / 2 - 0.03, -sd / 2 + 0.02); bm.rotation.x = -0.08;
  }
  return cg;
}
