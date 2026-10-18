// ------------------------------------------------------------ outside: care home between us and the street, GYM signs, rooftop details
// (Gianluca: the street is ~10 m further out than first drawn; in between a 2-storey retirement home with a roof garden is being built)
const ZG = -9.6;                                           // street level (Blender z)
function boxUV(w, h, d, tile = 1) {                         // box with metre-based UVs (like the GLB; facade textures repeat every 6 m), base at y = 0
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    const u = ny > 0.5 ? x : nx > 0.5 ? z : x, v = ny > 0.5 ? z : y;
    uv.setXY(i, u / tile, v / tile);
  }
  return g;
}
function textTex(lines, o = {}) {
  const W = o.w || 1024, H = o.h || 128, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = o.bg || '#1b1d20'; g.fillRect(0, 0, W, H);
  g.fillStyle = o.fg || '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${o.weight || 800} ${o.size || Math.round(H * 0.62)}px ${o.font || 'system-ui, -apple-system, Helvetica, Arial, sans-serif'}`;
  if (o.vertical) { const L = lines[0].split(''); L.forEach((ch, i) => g.fillText(ch, W / 2, H * (i + 0.5) / L.length)); }
  else g.fillText(lines[0], W / 2, H / 2 + (o.dy || 0));
  if (o.accent) { g.fillStyle = o.accent; g.fillRect(W * 0.04, H * 0.82, W * 0.92, H * 0.05); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function buildOutside() {
  const put = (grp, geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; grp.add(o); return o; };
  // ---- care home (plejecenter) on the empty lot between our block's end and the main road (aerial photo, ~10 px/m):
  // a 2-storey courtyard block, x 3 … 30, y 19 … 40, wings 7.5 m deep — kept back so there is a wide paved sidewalk/forecourt
  // in front of our block (~9 m) and towards the main road (~8 m) (Gianluca: it was too big)
  const CH = { x0: 3.0, x1: 30.0, y0: 19.0, y1: 40.0, d: 7.5, h: 6.0, par: 0.95 };
  const cx = (CH.x0 + CH.x1) / 2, cy = (CH.y0 + CH.y1) / 2;
  const cg = new THREE.Group(); cg.position.copy(b2t(cx, cy, ZG)); scene.add(cg);
  const Lx = (bx) => bx - cx, Lz = (by) => -(by - cy);          // Blender → local
  MATS.careBrick = MATS.careBrick || std({ map: facadeTex({ seed: 61, brick: '#b48f68', mortar: '#d6c8b0', frame: '#4f5357', vary: 0.12, win: [1.7, 1.9, 0.8], balcony: false }), roughness: 0.9 });
  if (!MATS.careBrick.userData.litTiers) addNightMat(MATS.careBrick, { seed: 61, win: [1.7, 1.9, 0.8] });
  const concL = std({ color: 0xc9c5bd, roughness: 0.9 }), deckM = std({ color: 0x9a7552, roughness: 0.8 }), lawn = std({ color: 0x6f944c, roughness: 1 }), paver = std({ color: 0xb9b3a8, roughness: 0.95 });
  const leaf = std({ color: 0x4f7a3a, roughness: 1 }), leaf2 = std({ color: 0x6a8f3e, roughness: 1 }), bark = std({ color: 0x5a4432, roughness: 1 }), planterM = std({ color: 0x7a4b2e, roughness: 0.85 });
  const flowers = [std({ color: 0xd9a441, roughness: 1 }), std({ color: 0xc46a8a, roughness: 1 }), std({ color: 0xe8e2d0, roughness: 1 })];
  const rect = (x0, y0, x1, y1) => ({ x0, y0, x1, y1, w: x1 - x0, l: y1 - y0, mx: Lx((x0 + x1) / 2), mz: Lz((y0 + y1) / 2) });
  const I = rect(CH.x0 + CH.d, CH.y0 + CH.d, CH.x1 - CH.d, CH.y1 - CH.d);                    // courtyard
  const wings = [rect(CH.x0, CH.y0, CH.x1, I.y0), rect(CH.x0, I.y1, CH.x1, CH.y1), rect(CH.x0, I.y0, I.x0, I.y1), rect(I.x1, I.y0, CH.x1, I.y1)];
  for (const W of wings) {
    put(cg, boxUV(W.w, CH.h, W.l), MATS.careBrick, W.mx, 0, W.mz);
    put(cg, new THREE.BoxGeometry(W.w, 0.05, W.l), paver, W.mx, CH.h + 0.02, W.mz);
  }
  const RY = CH.h + 0.07, O = rect(CH.x0, CH.y0, CH.x1, CH.y1);
  const ringEdges = (R, inset) => [[R.w, 0.25, R.mx, Lz(R.y0) - inset], [R.w, 0.25, R.mx, Lz(R.y1) + inset], [0.25, R.l, Lx(R.x0) + inset, R.mz], [0.25, R.l, Lx(R.x1) - inset, R.mz]];
  const rg = new THREE.MeshStandardMaterial({ color: 0xcfe0e4, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
  for (const [R, sgn] of [[O, 1], [I, -1]]) for (const [w, d, x, z] of ringEdges(R, sgn * 0.125)) {
    put(cg, new THREE.BoxGeometry(w, CH.par, d), concL, x, CH.h + CH.par / 2, z);
    put(cg, new THREE.BoxGeometry(w, 0.3, d === 0.25 ? 0.02 : d), rg, x, CH.h + CH.par + 0.15, z).renderOrder = 2;
  }
  // roof garden on each wing: boardwalk along the wing, lawns either side, raised planters with shrubs/flowers, a few small trees
  wings.forEach((W, wi) => {
    const along = W.w >= W.l, len = along ? W.w : W.l, n = Math.max(2, Math.floor(len / 7));
    put(cg, new THREE.BoxGeometry(along ? len - 2 : 1.6, 0.05, along ? 1.6 : len - 2), deckM, W.mx, RY, W.mz);
    for (let k = 0; k < n; k++) {
      const t = -len / 2 + (k + 0.5) * len / n, seg = len / n - 1.4;
      for (const sd of [-1, 1]) {
        const off = sd * (Math.min(W.w, W.l) / 4 + 0.4);
        const [px, pz] = along ? [W.mx + t, W.mz + off] : [W.mx + off, W.mz + t];
        put(cg, new THREE.BoxGeometry(along ? seg : Math.min(W.w, W.l) / 2 - 1.6, 0.08, along ? Math.min(W.w, W.l) / 2 - 1.6 : seg), lawn, px, RY + 0.02, pz);
        if ((k + wi) % 2 === 0) {                                  // raised planter
          const pw = seg * 0.7; const pl = put(cg, new THREE.BoxGeometry(along ? pw : 0.7, 0.5, along ? 0.7 : pw), planterM, px, RY + 0.25, pz);
          for (let j = 0; j < 4; j++) { const q = -pw / 2 + (j + 0.5) * pw / 4; const b = put(cg, new THREE.SphereGeometry(0.3 + (j % 2) * 0.08, 10, 8), j % 2 ? leaf : leaf2, along ? px + q : px, RY + 0.62, along ? pz : pz + q); b.scale.y = 0.8; }
          for (let j = 0; j < 5; j++) { const q = -pw / 2 + (j + 0.5) * pw / 5; put(cg, new THREE.SphereGeometry(0.09, 8, 6), flowers[(j + k) % 3], along ? px + q : px + 0.18, RY + 0.8, along ? pz + 0.18 : pz + q); }
        } else if ((k + wi) % 3 === 0) {                           // small tree
          const sc = 0.62; put(cg, new THREE.CylinderGeometry(0.07 * sc, 0.1 * sc, 2 * sc, 8), bark, px, RY + sc, pz);
          for (const [dx, dy, dz, r] of [[0, 2.3, 0, 0.9], [0.45, 2.0, 0.2, 0.65], [-0.4, 2.05, -0.25, 0.7]]) put(cg, new THREE.SphereGeometry(r * sc, 12, 10), leaf, px + dx * sc, RY + dy * sc, pz + dz * sc);
        }
      }
    }
  });
  { const W = wings[1], px = W.mx - 6, pz = W.mz, steel = std({ color: 0x3a3c3f, roughness: 0.6, metalness: 0.6 });    // pergola + benches on the road wing
    for (const dx of [-2, 2]) for (const dz of [-1.3, 1.3]) put(cg, new THREE.BoxGeometry(0.1, 2.4, 0.1), steel, px + dx, RY + 1.2, pz + dz);
    for (const dz of [-1.3, 1.3]) put(cg, new THREE.BoxGeometry(4.3, 0.12, 0.08), steel, px, RY + 2.42, pz + dz);
    for (let k = 0; k < 9; k++) put(cg, new THREE.BoxGeometry(0.06, 0.1, 2.9), deckM, px - 2 + k * 0.5, RY + 2.5, pz);
    for (const dz of [-0.8, 0.8]) { put(cg, new THREE.BoxGeometry(1.8, 0.08, 0.45), deckM, px, RY + 0.45, pz + dz); put(cg, new THREE.BoxGeometry(1.8, 0.4, 0.06), deckM, px, RY + 0.7, pz + dz + (dz > 0 ? 0.2 : -0.2)); }
  }
  { const W = wings[3]; put(cg, boxUV(3.4, 2.8, 3.0), std({ color: 0xd8d2c6, roughness: 0.9 }), W.mx, CH.h + 0.05, W.mz); }          // lift/stair house on the far wing
  // courtyard garden: lawn, crossing paths, trees, benches
  put(cg, new THREE.BoxGeometry(I.w, 0.06, I.l), lawn, I.mx, 0.03, I.mz);
  put(cg, new THREE.BoxGeometry(I.w, 0.07, 1.8), paver, I.mx, 0.04, I.mz); put(cg, new THREE.BoxGeometry(1.8, 0.07, I.l), paver, I.mx, 0.04, I.mz);
  for (const [fx, fz] of [[-0.3, -0.3], [0.3, 0.28], [-0.28, 0.3], [0.3, -0.25]]) {
    const x = I.mx + fx * I.w, z = I.mz + fz * I.l;
    put(cg, new THREE.CylinderGeometry(0.12, 0.16, 3.2, 8), bark, x, 1.6, z);
    for (const [dx, dy, dz, r] of [[0, 3.9, 0, 1.5], [0.8, 3.4, 0.3, 1.1], [-0.7, 3.5, -0.4, 1.2]]) put(cg, new THREE.SphereGeometry(r, 12, 10), leaf, x + dx, dy, z + dz);
  }
  // entrance on the street side (y = 45 face): glazed doors, canopy, name
  { const ez = Lz(CH.y1), ex = Lx(CH.x0 + 9);
    put(cg, new THREE.BoxGeometry(3.2, 2.6, 0.08), MATS.shopglass, ex, 1.3, ez - 0.03);
    put(cg, new THREE.BoxGeometry(4.2, 0.18, 1.6), concL, ex, 3.0, ez - 0.8);
    const t = textTex(['Plejecenter'], { bg: '#e9e3d6', fg: '#3b3f44', weight: 600, w: 1024, h: 160 }); const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.53), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    m.position.set(ex, 3.45, ez - 0.02); m.rotation.y = Math.PI; cg.add(m); }
  mergeByMaterial(cg);
  // paved sidewalks / forecourt around it: in front of our block's end, along the main road, and along the canal-side quay
  { const pv = std({ color: 0xa9a49b, roughness: 0.95 }), pg2 = new THREE.Group(); scene.add(pg2);
    for (const [x0, y0, x1, y1] of [[-2.6, 9.9, 34, 19], [-2.6, 40, 34, 48], [-2.6, 19, 3, 40], [30, 19, 34, 40]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.04, y1 - y0), pv); m.position.copy(b2t((x0 + x1) / 2, (y0 + y1) / 2, ZG + 0.02)); m.receiveShadow = true; pg2.add(m); }
    mergeByMaterial(pg2); }
  // ---- the red SATS corner building across the canal (3D map view): 7 storeys of red brick standing at the water's edge,
  // loggias on the canal face, arched windows on the road face, SATS glazing on the ground floor, plant on the roof;
  // L footprint: canal wing x -39…-25.3 / y 8…40, road wing x -60…-39 / y 26…40; roof at +22.5 m
  { const sg = new THREE.Group(); scene.add(sg); const H = 22.5;
    const mk = (kind) => {
      const t = facadeTex({ seed: 91, brick: '#a4492f', mortar: '#c98f79', frame: '#e6e1d8', vary: 0.12, windows: false, balcony: false });
      const c = t.image, g = c.getContext('2d'), W = c.width, pxm = W / 6;
      for (let bx = 0; bx < 2; bx++) for (let by = 0; by < 2; by++) {
        const cx = (bx * 3 + 1.5) * pxm, yb = W - (by * 3 + 0.85) * pxm;        // canvas y of the sill
        const glass = (x, y, w, h) => { const gl = g.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, '#9fb5c4'); gl.addColorStop(0.5, '#3c4a55'); gl.addColorStop(1, '#262d33'); g.fillStyle = gl; g.fillRect(x, y, w, h); };
        if (kind === 'canal' && bx === 0) {                                          // loggia: deep dark recess, glazed door at the back, railing
          const w = 2.3 * pxm, h = 2.55 * pxm, x0 = cx - w / 2, y0 = W - (by * 3 + 0.05) * pxm - h;
          g.fillStyle = '#231e1c'; g.fillRect(x0, y0, w, h);
          glass(x0 + 0.35 * pxm, y0 + 0.3 * pxm, w - 0.7 * pxm, h - 0.35 * pxm);
          g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x0, y0, w, 0.25 * pxm);          // shadow under the slab above
          g.strokeStyle = '#8b8f91'; g.lineWidth = 3; const ry = y0 + h - 1.0 * pxm;
          g.beginPath(); g.moveTo(x0, ry); g.lineTo(x0 + w, ry); g.stroke();
          for (let k = 1; k < 16; k++) { g.beginPath(); g.moveTo(x0 + k * w / 16, ry); g.lineTo(x0 + k * w / 16, y0 + h); g.stroke(); }
        } else {                                                                     // window with a round-arched head in a white frame
          const w = (kind === 'canal' ? 0.9 : 1.2) * pxm, h = 1.95 * pxm, r = w / 2, x0 = cx - w / 2, y0 = yb - h;
          g.fillStyle = '#e6e1d8'; g.beginPath(); g.moveTo(x0 - 6, yb + 6); g.lineTo(x0 - 6, y0 + r); g.arc(cx, y0 + r, r + 6, Math.PI, 0); g.lineTo(x0 + w + 6, yb + 6); g.closePath(); g.fill();
          g.save(); g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, y0 + r); g.arc(cx, y0 + r, r, Math.PI, 0); g.lineTo(x0 + w, yb); g.closePath(); g.clip(); glass(x0, y0, w, h); g.restore();
          g.fillStyle = '#e6e1d8'; g.fillRect(cx - 3, y0 + r, 6, h - r); g.fillRect(x0, y0 + r + 0.35 * pxm, w, 5);
          g.fillStyle = '#7d3524'; g.fillRect(x0 - 10, yb + 6, w + 20, 0.07 * pxm);  // brick sill
        }
      }
      t.needsUpdate = true; return std({ map: t, roughness: 0.85 });
    };
    const mCanal = mk('canal'), mRoad = mk('road'), roofM = std({ color: 0x3a3b3d, roughness: 0.9 }), parM = std({ color: 0x9c4530, roughness: 0.85 });
    const steel = std({ color: 0xb7bbbe, roughness: 0.35, metalness: 0.85 }), plantW = std({ color: 0xd9dbdc, roughness: 0.6, metalness: 0.2 });
    const blk = (x0, y0, x1, y1, mSide) => {                                          // brick volume; the side facing +x (canal) or +y (road) gets its own texture
      const w = x1 - x0, d = y1 - y0, geo = boxUV(w, H, d);
      const m = new THREE.Mesh(geo, [mSide.px || mCanal, mSide.nx || mRoad, roofM, roofM, mSide.nz || mRoad, mSide.pz || mRoad]);
      m.position.copy(b2t((x0 + x1) / 2, (y0 + y1) / 2, ZG)); m.castShadow = m.receiveShadow = true; scene.add(m);   // multi-material: not merged
      // parapet
      for (const [pw, pd, px, py] of [[w, 0.25, (x0 + x1) / 2, y0 + 0.125], [w, 0.25, (x0 + x1) / 2, y1 - 0.125], [0.25, d, x0 + 0.125, (y0 + y1) / 2], [0.25, d, x1 - 0.125, (y0 + y1) / 2]]) {
        const q = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.7, pd), parM); q.position.copy(b2t(px, py, ZG + H + 0.35)); q.castShadow = true; sg.add(q); }
    };
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z → Blender +x (canal) = +x; Blender +y (road) = three -z
    blk(-39, 8, -25.3, 40, { px: mCanal, nz: mRoad });
    blk(-60, 26, -39, 40, { px: mRoad, nz: mRoad });
    // roof plant: air-handling boxes and ducts (silver), as on the map view
    for (const [bx, by, w, d, h] of [[-33, 30, 4.5, 2.6, 1.6], [-29.5, 22, 3.2, 2.2, 1.3], [-35, 16, 5, 3, 1.8], [-46, 33, 4, 2.4, 1.4], [-30, 36, 2.2, 2.2, 1.1], [-53, 31, 3, 2, 1.2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plantW); m.position.copy(b2t(bx, by, ZG + H + h / 2)); m.castShadow = true; sg.add(m); }
    for (const [x0, y0, x1, y1] of [[-33, 27.5, -33, 17.5], [-35, 30, -46, 32], [-29.5, 23.1, -29.5, 34.5]]) {
      const A = b2t(x0, y0, ZG + H + 0.7), B = b2t(x1, y1, ZG + H + 0.7), len = A.distanceTo(B);
      const dct = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, len, 16), steel); dct.position.copy(A).add(B).multiplyScalar(0.5);
      dct.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); sg.add(dct); }
    // SATS ground floor: glazing on the road face and the corner of the canal face, plain sign bands, navy blade on the corner
    const gl1 = new THREE.Mesh(new THREE.BoxGeometry(13.2, 4.0, 0.08), MATS.shopglass); gl1.position.copy(b2t(-32.15, 40.05, ZG + 2.0)); sg.add(gl1);
    const gl2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.0, 9.5), MATS.shopglass); gl2.position.copy(b2t(-25.25, 35.0, ZG + 2.0)); sg.add(gl2);
    const band = std({ color: 0x1b1d20, roughness: 0.7 });
    for (const [w, d, bx, by] of [[13.4, 0.12, -32.15, 40.08], [0.12, 9.7, -25.22, 35.0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), band); b.position.copy(b2t(bx, by, ZG + 4.4)); sg.add(b); }
    mergeByMaterial(sg);
    const gymMat = (w, h) => { const t = textTex(['SATS'], { bg: '#16181b', fg: '#ffffff', w: Math.min(4096, Math.round(128 * w / h)), h: 128, size: 78 });
      return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.6 }); };
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.55), gymMat(4.0, 0.55)); s1.position.copy(b2t(-25.15, 35.0, ZG + 4.4)); s1.rotation.y = Math.PI / 2; scene.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.55), gymMat(4.0, 0.55)); s2.position.copy(b2t(-29.0, 40.15, ZG + 4.4)); scene.add(s2);
    const bladeT = textTex(['SATS'], { vertical: true, w: 160, h: 800, bg: '#1f2a44', fg: '#ffffff', size: 150 });
    const bladeM = new THREE.MeshStandardMaterial({ map: bladeT, emissiveMap: bladeT, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6, side: THREE.DoubleSide });
    const blade = new THREE.Group(); blade.position.copy(b2t(-25.9, 40.7, ZG + 8.5));
    blade.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.0, 1.0), std({ color: 0x1b1c1f, roughness: 0.6 })));
    for (const sx of [1, -1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 3.8), bladeM); f.position.x = sx * 0.065; f.rotation.y = sx * Math.PI / 2; blade.add(f); }
    scene.add(blade);
    // the pier between the building and the bridge: broad steps from the street down to a timber landing at the water, with a small jetty
    const pg3 = new THREE.Group(); scene.add(pg3);
    const conc = std({ color: 0xa9a59d, roughness: 0.9 }), tmb = std({ color: 0x7a5a3e, roughness: 0.85 }), rail2 = std({ color: 0x5b5f63, roughness: 0.5, metalness: 0.6 });
    const PX0 = -35, CW0 = -25, PY0 = 40, PY1 = 48, nSt = 6, run = 1.15, rise = 0.15;
    for (let k = 0; k < nSt; k++) {                                                   // steps descend towards the canal (+x); alternate timber seats and concrete treads
      const x0 = PX0 + k * run, top = ZG - k * rise;
      const m = new THREE.Mesh(new THREE.BoxGeometry(run, top - (ZG - 1.8), PY1 - PY0), k % 2 ? tmb : conc);
      m.position.copy(b2t(x0 + run / 2, (PY0 + PY1) / 2, (top + ZG - 1.8) / 2)); m.receiveShadow = true; pg3.add(m);
    }
    const landX0 = PX0 + nSt * run, landTop = ZG - nSt * rise;
    { const m = new THREE.Mesh(new THREE.BoxGeometry(CW0 - landX0, landTop - (ZG - 1.8), PY1 - PY0), tmb); m.position.copy(b2t((landX0 + CW0) / 2, (PY0 + PY1) / 2, (landTop + ZG - 1.8) / 2)); m.receiveShadow = true; pg3.add(m); }
    { const j = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 3.6), tmb); j.position.copy(b2t(CW0 + 1.6, 45.6, landTop - 0.06)); j.castShadow = j.receiveShadow = true; pg3.add(j);   // jetty over the water
      for (const [dx, dy] of [[0.2, -1.6], [3.0, -1.6], [0.2, 1.6], [3.0, 1.6]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8), tmb); p.position.copy(b2t(CW0 + dx, 45.6 + dy, landTop - 0.6)); pg3.add(p); }
      for (const [w, d, bx, by] of [[3.2, 0.05, CW0 + 1.6, 43.8], [0.05, 3.6, CW0 + 3.2, 45.6]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), rail2); r.position.copy(b2t(bx, by, landTop + 1.0)); pg3.add(r); } }
    for (const [by, d] of [[PY0 + 0.15, 0.3], [PY1 - 0.15, 0.3]]) { const w = new THREE.Mesh(new THREE.BoxGeometry(CW0 - PX0, 1.8, d), conc); w.position.copy(b2t((PX0 + CW0) / 2, by, ZG - 0.9 + 0.02)); pg3.add(w); }   // side walls
    mergeByMaterial(pg3); }
  // ---- the canal-side row NW of SATS (map view): four buildings standing at the water, ~7 storeys with recessed tops;
  // charcoal-brick ones with a grid of projecting balconies, a tan one with a white stepped crown, a light grey one next to SATS
  { const rg3 = new THREE.Group(); scene.add(rg3);
    const railM = new THREE.MeshStandardMaterial({ color: 0x9aa4a8, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.45, depthWrite: false });
    const slabM = std({ color: 0x8d8a85, roughness: 0.85 }), whiteM = std({ color: 0xece9e2, roughness: 0.8 }), roofM2 = std({ color: 0x3a3b3d, roughness: 0.9 });
    const segs = [
      { y0: -2, y1: 8, H: 21.5, tex: { seed: 71, brick: '#b9b6ae', mortar: '#d5d2ca', frame: '#3f4447', vary: 0.06, win: [1.3, 1.8, 0.8] }, balc: false },
      { y0: -22, y1: -2, H: 22.5, tex: { seed: 72, brick: '#211f1e', mortar: '#393532', frame: '#2a2c2e', vary: 0.14, win: [1.5, 2.1, 0.4] }, balc: true },
      { y0: -34, y1: -22, H: 23.5, tex: { seed: 73, brick: '#a88f76', mortar: '#c3ad96', frame: '#3b3f42', vary: 0.1, win: [1.4, 2.0, 0.5] }, balc: true, crown: true },
      { y0: -56, y1: -34, H: 22.0, tex: { seed: 74, brick: '#262220', mortar: '#3d3834', frame: '#2a2c2e', vary: 0.14, win: [1.5, 2.1, 0.4] }, balc: true },
    ];
    for (const S of segs) {
      const mat = std({ map: facadeTex({ ...S.tex, balcony: false }), roughness: 0.95, envMapIntensity: 0.35 }), d = 14, x0 = -25.3 - d, L = S.y1 - S.y0;
      addNightMat(mat, { seed: S.tex.seed, win: S.tex.win });
      const body = new THREE.Mesh(boxUV(d, S.H - 3, L), [mat, mat, roofM2, roofM2, mat, mat]); body.position.copy(b2t(x0 + d / 2, (S.y0 + S.y1) / 2, ZG)); body.castShadow = body.receiveShadow = true; scene.add(body);
      const top = new THREE.Mesh(boxUV(d - 2.5, 3, L - 1.0), [mat, mat, roofM2, roofM2, mat, mat]); top.position.copy(b2t(x0 + (d - 2.5) / 2, (S.y0 + S.y1) / 2, ZG + S.H - 3)); top.castShadow = true; scene.add(top);   // recessed top storey
      const add = (geo, m, bx, by, bz) => { const o = new THREE.Mesh(geo, m); o.position.copy(b2t(bx, by, bz)); o.castShadow = true; rg3.add(o); return o; };
      add(new THREE.BoxGeometry(2.5, 1.0, L - 1.0), railM, -25.3 - 1.25, (S.y0 + S.y1) / 2, ZG + S.H - 3 + 0.5).renderOrder = 2;          // roof-terrace glass rail
      if (S.crown) {                                                                                     // white stepped frame round the top
        for (const [w, h, dd, bx, by, bz] of [[0.5, 0.6, L, -25.05, (S.y0 + S.y1) / 2, ZG + S.H - 0.3], [0.5, S.H - 3, 0.5, -25.05, S.y0 + 0.25, ZG + (S.H - 3) / 2], [0.5, S.H - 3, 0.5, -25.05, S.y1 - 0.25, ZG + (S.H - 3) / 2], [0.5, 0.5, L - 3, -25.05, (S.y0 + S.y1) / 2, ZG + S.H - 3.25]])
          add(new THREE.BoxGeometry(w, h, dd), whiteM, bx, by, bz);
      }
      if (S.balc) for (let fl = 1; fl < Math.round((S.H - 3) / 3); fl++) for (let by = S.y0 + 1.5; by < S.y1 - 1.4; by += 3) {
        if ((fl + Math.round(by)) % 2) continue;                                                        // staggered, like the photo
        const z = ZG + fl * 3;
        add(new THREE.BoxGeometry(1.3, 0.18, 2.6), slabM, -25.3 + 0.65, by + 1.5, z);
        add(new THREE.BoxGeometry(0.03, 1.0, 2.6), railM, -25.3 + 1.28, by + 1.5, z + 0.6).renderOrder = 2;
        for (const e of [0.05, 2.55]) add(new THREE.BoxGeometry(1.3, 1.0, 0.03), railM, -25.3 + 0.65, by + e, z + 0.6).renderOrder = 2;
      }
    }
    mergeByMaterial(rg3);
    // small motor boats moored along the far-side quay (and one on ours)
    const hullM = std({ color: 0xf2f1ee, roughness: 0.45 }), deckB = std({ color: 0xcfc3ad, roughness: 0.8 }), darkB = std({ color: 0x2b3440, roughness: 0.5 }), glassB = new THREE.MeshStandardMaterial({ color: 0x9fb4c0, roughness: 0.1, transparent: true, opacity: 0.6 });
    const boat = (bx, by, len, ang, dark) => {
      const b = new THREE.Group(); b.position.copy(b2t(bx, by, ZG - 1.1)); b.rotation.y = ang; scene.add(b);
      const sh = new THREE.Shape(); const w = len * 0.36;
      sh.moveTo(-len / 2, -w / 2); sh.lineTo(len * 0.2, -w / 2); sh.quadraticCurveTo(len * 0.48, -w * 0.35, len / 2, 0); sh.quadraticCurveTo(len * 0.48, w * 0.35, len * 0.2, w / 2); sh.lineTo(-len / 2, w / 2); sh.closePath();
      const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }), dark ? darkB : hullM);
      hull.rotation.x = -Math.PI / 2; hull.position.y = -0.25; hull.castShadow = true; b.add(hull);
      const deck = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }), deckB); deck.rotation.x = -Math.PI / 2; deck.position.y = 0.34; deck.scale.set(0.92, 0.85, 1); b.add(deck);
      const con = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.7), hullM); con.position.set(0.1, 0.58, 0); b.add(con);
      const ws = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.75), glassB); ws.position.set(0.37, 0.86, 0); ws.rotation.z = -0.4; b.add(ws);
      const eng = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.3), darkB); eng.position.set(-len / 2 - 0.12, 0.35, 0); b.add(eng);
    };
    boat(-23.9, 3.5, 5.2, 0.02, false); boat(-23.8, -9.0, 4.4, -0.05, false); boat(-23.9, -30.0, 6.0, 0.04, true); boat(-12.1, -20.0, 4.6, Math.PI + 0.03, false);
  }
  // ---- steel lattice footbridge across the harbour mouth (aerial photo): from the far-side quay corner to our side's harbour quay
  { const A = b2t(-31, -61.5, ZG), B = b2t(-4, -94, ZG), span = A.distanceTo(B), fb = new THREE.Group(); scene.add(fb);
    fb.position.copy(A).add(B).multiplyScalar(0.5); fb.rotation.y = Math.atan2(-(B.z - A.z), B.x - A.x);
    const galv = std({ color: 0xb9bdbf, roughness: 0.45, metalness: 0.7 }), deckW = std({ color: 0x8a6a4c, roughness: 0.85 });
    const W = 3.0, Hs = 2.2, n = Math.round(span / 2.5), dx = span / n;
    const bx = (w, h, d, x, y, z, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), galv); o.position.set(x, y, z); o.rotation.z = rz; o.castShadow = true; fb.add(o); return o; };
    const deck = new THREE.Mesh(new THREE.BoxGeometry(span, 0.08, W), deckW); deck.position.y = 0.34; deck.receiveShadow = true; fb.add(deck);
    bx(span, 0.28, W + 0.1, 0, 0.16, 0);                                            // deck beam
    for (const sz of [-W / 2, W / 2]) {
      bx(span, 0.12, 0.12, 0, 0.36, sz); bx(span, 0.12, 0.12, 0, 0.36 + Hs, sz);    // bottom + top chords
      for (let k = 0; k <= n; k++) bx(0.08, Hs, 0.08, -span / 2 + k * dx, 0.36 + Hs / 2, sz);
      const dl = Math.hypot(dx, Hs), ang = Math.atan2(Hs, dx);
      for (let k = 0; k < n; k++) bx(dl, 0.06, 0.06, -span / 2 + (k + 0.5) * dx, 0.36 + Hs / 2, sz, k % 2 ? ang : -ang);   // alternating diagonals
      bx(span, 0.05, 0.05, 0, 1.36, sz);                                            // handrail
    }
    for (let k = 0; k <= n; k += 2) bx(0.08, 0.08, W, -span / 2 + k * dx, 0.36 + Hs, 0);   // top cross-ties
    mergeByMaterial(fb); }
  // ---- our building: steel pergola and vent pipes on the setback roof (like the photo from across the canal)
  const pg = new THREE.Group(); scene.add(pg); const st = std({ color: 0x3d3f42, roughness: 0.55, metalness: 0.7 });
  const RZ = 14.85;                                        // top of the recessed top storey (build.py: TOP + STOREY, 3 storeys above us)
  const pp = (w, h, d, bx, by, bz, m = st) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.copy(b2t(bx, by, bz)); o.castShadow = true; pg.add(o); return o; };
  for (const bx of [1.4, 4.4, 7.4]) for (const by of [1.2, 6.6]) pp(0.12, 2.4, 0.12, bx, by, RZ + 1.2);
  for (const by of [1.2, 6.6]) pp(6.3, 0.14, 0.14, 4.4, by, RZ + 2.4);
  for (let k = 0; k < 13; k++) pp(0.08, 0.1, 5.6, 1.4 + k * 0.5, 3.9, RZ + 2.5);
  for (const [bx, by] of [[8.6, 1.6], [8.9, 2.4], [2.2, 5.0]]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.3, 14), std({ color: 0xa8abad, roughness: 0.35, metalness: 0.9 })); v.position.copy(b2t(bx, by, RZ + 0.65)); v.castShadow = true; pg.add(v); }
  mergeByMaterial(pg);
  // ---- glazed roof lights along the top of our block's wings (3D map view) and the timber-clad raised terraces along the lot side
  { const rg2 = new THREE.Group(); scene.add(rg2);
    const glassR = new THREE.MeshStandardMaterial({ color: 0x9fb2bd, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 }), steelR = std({ color: 0x6c7176, roughness: 0.5, metalness: 0.6 });
    const ridge = (x0, x1, y, z) => {                        // gabled glass strip along x at Blender y, sitting on roof height z
      const len = x1 - x0, w = 2.4, hgt = 0.8, cx = (x0 + x1) / 2, ang = Math.atan2(hgt, w / 2), sl = Math.hypot(w / 2, hgt);
      for (const sd of [1, -1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, sl), glassR); m.position.copy(b2t(cx, y + sd * w / 4, z + hgt / 2)); m.rotation.x = sd * ang; rg2.add(m); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), steelR); top.position.copy(b2t(cx, y, z + hgt)); rg2.add(top);
      for (let x = x0; x <= x1 + 0.01; x += 1.2) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, w), steelR); f.position.copy(b2t(x, y, z + 0.05)); rg2.add(f); }
    };
    ridge(12, 31, 1.8, 14.85); ridge(35, 68, 1.9, 14.85); ridge(56, 68, -36, 14.85);
    mergeByMaterial(rg2);
    const tg = new THREE.Group(); scene.add(tg);
    const timber = std({ color: 0x7b5436, roughness: 0.85 }), paveT = std({ color: 0xc4c0b7, roughness: 0.95 });
    for (let k = 0; k < 9; k++) {                            // stepped terraces in front of the ground-floor flats, x 12 … 70
      const x0 = 12 + k * 6.4, x1 = x0 + 5.8, h = k % 3 === 1 ? 0.6 : 0.9;
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, 2.6), timber); m.position.copy(b2t((x0 + x1) / 2, 11.2, ZG + h / 2)); m.castShadow = m.receiveShadow = true; tg.add(m);
      const t = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.2, 0.05, 2.4), paveT); t.position.copy(b2t((x0 + x1) / 2, 11.15, ZG + h + 0.02)); tg.add(t);
    }
    mergeByMaterial(tg); }
}
// wall switch on the kitchen end wall (from the photos) → the room's light panel
const livingLights = {
  name: 'Lights · kitchen & living', title: () => 'Lights · kitchen & living',
  anchor: () => b2t(4.3, 2.815, 1.35),
  lights: ['table', 'tvstrip', 'tvback', 'books', 'plant', 'kitchen'],
  info: () => 'Philips Hue: dim and pick a white temperature or any colour for each light. Try it after sunset with the time slider.',
};
function buildSwitches() {
  const P = b2t(4.486 - 0.014, 2.815, 1.05);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.16), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(P); scene.add(hit);
  const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.035), std({ color: 0xf4f4f2, roughness: 0.3 })); rocker.position.copy(P).add(new THREE.Vector3(-0.004, 0, 0)); scene.add(rocker);
  const door = { kind: 'swap', label: 'Light switch', parts: [hit], center: P.clone(),
    swap: () => selectFurniture(selected === livingLights ? null : livingLights),
    prompt: () => (selected === livingLights ? 'Close the light panel' : 'Lights') };
  hit.userData.door = door; collidables.push(hit); doors.push(door);
}
// ------------------------------------------------------------ night: lit windows, street lamps, the moon
// Lit windows: an emissive layer over each facade texture, 24 m square (4 × 4 facade tiles) so the pattern doesn't repeat every 6 m.
// Three versions per facade: evening (about a third of the windows lit), around midnight (fewer), and the small hours (only a few
// night owls). Every window keeps its random draws in all three, so the late ones are a subset of the evening ones.
function litWindowsTex(o, tier = 0) {
  return canvasTex(512, 512, (g, W) => {
    const r = rng(o.seed * 7 + 3), pxm = W / 24, [ww, wh, ws] = o.win || [1.5, 1.75, 0.9], keep = [1, 0.42, 0.12][tier];
    g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
    for (let bx = 0; bx < 8; bx++) for (let by = 0; by < 8; by++) {
      const lit = r(), up = r(), tv = r() < 0.15, c1 = r(), c2 = r(), kk = r(), cur = r(), side = r();
      if (lit > 0.34 || up > keep) continue;
      const x0 = (bx * 3 + (3 - ww) / 2) * pxm, w = ww * pxm, yTop = W - (by * 3 + ws + wh) * pxm, h = wh * pxm;
      const warm = tv ? [150, 175, 255] : [255, 190 + c1 * 30, 110 + c2 * 50], k = 0.55 + kk * 0.45;
      const gr = g.createLinearGradient(0, yTop, 0, yTop + h);
      gr.addColorStop(0, `rgba(${warm.map((v) => Math.round(v * k * 0.8)).join(',')},1)`); gr.addColorStop(1, `rgba(${warm.map((v) => Math.round(v * k)).join(',')},1)`);
      g.fillStyle = gr; g.fillRect(x0, yTop, w, h);
      g.fillStyle = '#000'; g.fillRect(x0 + w / 2 - 1.5, yTop, 3, h);               // mullion
      if (cur < 0.5) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x0 + (side < 0.5 ? 0 : w / 2), yTop, w / 2, h); }   // one half curtained
    }
  }, [24, 24]);
}
const NIGHT_MATS = [];
function addNightMat(m, o) {
  m.userData.litTiers = [0, 1, 2].map((t) => litWindowsTex(o, t));
  m.emissiveMap = m.userData.litTiers[0]; m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = 0; m.needsUpdate = true; NIGHT_MATS.push(m);
}
for (const [key, o] of [['brickyellow', { seed: 5 }], ['brickred', { seed: 9 }], ['brickdark', { seed: 13 }], ['bricklight', { seed: 17 }],
  ['owntile', { seed: 31, win: [1.3, 2.3, 0.3] }], ['ownterra', { seed: 37, win: [1.3, 2.3, 0.3] }], ['ownbays', { seed: 47, win: [1.3, 1.9, 0.6] }], ['owncream', { seed: 43, win: [1.3, 2.3, 0.3] }]]) {
  if (MATS[key]) addNightMat(MATS[key], o);
}
let clockHour = 9;     // the time-of-day slider (set in updateSun)
function windowTier(h) { return h >= 23.5 || h < 0.75 ? 1 : h < 5.5 ? 2 : h < 7.5 ? 1 : 0; }
// street lamps (the poles and heads are in build.py): glowing lens, a warm pool of light on the ground, and three real lights
// on our quay so the facade and the entrance get some light
const LAMPS = [[-27.1, 48.15], [-8.9, 60.85], [-27.1, 60.85], [-8.9, 48.15], [8, 48.4], [32, 48.4], [-50, 48.4], [-75, 48.4], [12, 60.6], [36, 60.6], [-55, 60.6],
  [-8.1, -60], [-8.1, -35], [-8.1, -10], [-8.1, 15], [-8.1, 38]];
MATS.lampLens = new THREE.MeshBasicMaterial({ color: 0x3a3a38, toneMapped: false });
const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,196,120,0.55)'); gr.addColorStop(0.35, 'rgba(255,180,100,0.22)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
MATS.lampPool = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
const lampLights = [];
{
  const ZGf = -9.6, lens = new THREE.CircleGeometry(0.19, 20), pool = new THREE.PlaneGeometry(11, 11), lampBits = [], poolBits = [];
  for (const [x, y] of LAMPS) {
    const onBridge = x > -27.4 && x < -8.6 && y > 47 && y < 62;
    const l = new THREE.Mesh(lens, MATS.lampLens); l.rotation.x = Math.PI / 2; l.position.copy(b2t(x, y, ZGf + 6.845)); scene.add(l); lampBits.push(l);
    const p = new THREE.Mesh(pool, MATS.lampPool); p.rotation.x = -Math.PI / 2; p.position.copy(b2t(x, y, ZGf + (onBridge ? 0.2 : 0.08))); scene.add(p); poolBits.push(p);
  }
  bakeLoose(lampBits); bakeLoose(poolBits, { order: 3 });
  for (const [x, y] of [[-8.1, -10], [-8.1, 15], [-8.1, -35]]) { const L = new THREE.PointLight(0xffc27a, 0, 22, 1.4); L.position.copy(b2t(x, y, ZGf + 6.6)); scene.add(L); lampLights.push(L); }
}
// the moon: a pale disc with soft maria at its real position and phase (lit side turned towards the sun); drawn ~2× its real size
const moonBase = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.beginPath(); g.arc(128, 128, 62, 0, Math.PI * 2); g.fillStyle = '#f4f1e6'; g.fill(); g.save(); g.clip();
  const r = rng(77); for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(150,150,145,${0.15 + r() * 0.25})`; g.beginPath(); g.arc(80 + r() * 100, 80 + r() * 100, 6 + r() * 20, 0, Math.PI * 2); g.fill(); }
  g.restore(); return c;
})();
const moonCanvas = document.createElement('canvas'); moonCanvas.width = moonCanvas.height = 256;
const moon = (() => {
  const t = new THREE.CanvasTexture(moonCanvas); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: 0 }));
  m.scale.setScalar(40); m.renderOrder = -1; m.visible = false; scene.add(m); return m;
})();
let moonPhaseSig = -1;
function setMoonPhase(illum, fv) {
  const k = Math.round(fv); if (k === moonPhaseSig) return; moonPhaseSig = k;
  const g = moonCanvas.getContext('2d'), R = 62; g.clearRect(0, 0, 256, 256);
  const halo = g.createRadialGradient(128, 128, 60, 128, 128, 128), ha = 0.12 + 0.25 * illum;
  halo.addColorStop(0, `rgba(220,230,255,${ha})`); halo.addColorStop(1, 'rgba(220,230,255,0)'); g.fillStyle = halo; g.fillRect(0, 0, 256, 256);
  g.drawImage(moonBase, 0, 0);
  // night side: from the dark limb (left) to the terminator; a little earthshine left in
  const c = Math.cos(fv * D2R); g.beginPath();
  for (let i = 0; i <= 48; i++) { const y = -R + 2 * R * i / 48, w = Math.sqrt(Math.max(0, R * R - y * y)); g.lineTo(128 - w, 128 + y); }
  for (let i = 48; i >= 0; i--) { const y = -R + 2 * R * i / 48, w = Math.sqrt(Math.max(0, R * R - y * y)); g.lineTo(128 - c * w, 128 + y); }
  g.closePath(); g.fillStyle = 'rgba(14,18,32,0.93)'; g.fill();
  moon.material.map.needsUpdate = true;
}
function updateNight() {
  const night = THREE.MathUtils.clamp((0.6 - dayLevel) / 0.45, 0, 1);
  const tier = windowTier(clockHour);
  for (const m of NIGHT_MATS) { m.emissiveIntensity = 1.1 * night; const t = m.userData.litTiers && m.userData.litTiers[tier]; if (t && m.emissiveMap !== t) m.emissiveMap = t; }
  MATS.lampLens.color.setRGB(0.23 + 2.2 * night, 0.23 + 1.7 * night, 0.22 + 0.9 * night);
  MATS.lampPool.opacity = night;
  for (const L of lampLights) L.intensity = 30 * night;
  if (window.__candles) window.__candles.set(night);
  moon.visible = night > 0.02 && skyNow.moonUp; moon.material.opacity = Math.min(1, night * 1.3);
  moon.position.copy(CENTER).addScaledVector(MOON, 700); moon.lookAt(CENTER);
  { const sp = SUN_REAL.clone().addScaledVector(MOON, -SUN_REAL.dot(MOON)); moon.updateMatrixWorld();        // turn the lit limb towards the sun
    const ax = new THREE.Vector3().setFromMatrixColumn(moon.matrixWorld, 0).normalize(), ay = new THREE.Vector3().setFromMatrixColumn(moon.matrixWorld, 1).normalize();
    if (sp.lengthSq() > 1e-8) moon.rotateZ(Math.atan2(sp.dot(ay), sp.dot(ax))); }
}
// ------------------------------------------------------------ stairwell: street door (no. 9) and the lift (stuen ↔ 3. sal)
// Floor tops in the stairwell (build.py LV): stuen / 1. / 2. / 3. sal (us). The lift car is a moving box behind sliding
// landing doors; the call button beside each door fetches it, the panel inside picks the floor.
const LIFT = { levels: [-9.55, -5.9, -2.95, 0], names: ['Stuen · street & lobby', '1. sal', '2. sal', '3. sal · home'], short: ['0', '1', '2', '3'],
  x0: 7.45, x1: 8.95, y0: -2.25, y1: -0.55, dY0: -1.95, dY1: -0.85, wallX: 7.2 };
const lift = { at: 3, y: 0, moving: null, car: null, leaves: [], open: [0, 0, 0, 0], want: [0, 0, 0, 0], closeAt: [0, 0, 0, 0], after: null, lamps: [] };
const jsWalk = [];                     // walkable JS meshes (lift floor, door sills) for the floor probe
MATS.liftSteel = std({ color: 0xb9bcbf, roughness: 0.32, metalness: 0.75 });
MATS.liftFloor = std({ color: 0x3b3b3c, roughness: 0.7 });
MATS.liftLight = new THREE.MeshBasicMaterial({ color: 0xfff4e2, toneMapped: false });
MATS.liftBtn = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, emissive: 0xffa640, emissiveIntensity: 0, roughness: 0.3 });
const liftDisp = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t, last: '' }; })();
MATS.liftDisp = new THREE.MeshBasicMaterial({ map: liftDisp.t, toneMapped: false });
function drawLiftDisp() {
  const f = lift.moving ? (lift.moving.to > lift.moving.from ? '▲ ' : '▼ ') : '', lvl = LIFT.levels.reduce((b, v, i) => (Math.abs(v - lift.y) < Math.abs(LIFT.levels[b] - lift.y) ? i : b), 0);
  const s = f + (lvl === 0 ? 'ST' : lvl); if (s === liftDisp.last) return; liftDisp.last = s;
  const g = liftDisp.c.getContext('2d'); g.fillStyle = '#050505'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#ff9b3a'; g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.fillText(s, 64, 25); liftDisp.t.needsUpdate = true;
}
function buildLift() {
  const g = new THREE.Group(), L = LIFT, w = L.x1 - L.x0, d = L.y1 - L.y0, cx = (L.x0 + L.x1) / 2, cy = (L.y0 + L.y1) / 2, HH = 2.25;
  const add = (geo, mat, x, y, z, solid = true, walk = false) => { const m = new THREE.Mesh(geo, mat); const P = b2t(x, y, z); m.position.copy(P); m.castShadow = false; m.receiveShadow = true; g.add(m); if (solid) collidables.push(m); if (walk) { m.userData.walk = true; jsWalk.push(m); } return m; };
  add(new THREE.BoxGeometry(w, 0.05, d), MATS.liftFloor, cx, cy, -0.025, false, true);                                  // floor (top at the car level)
  add(new THREE.BoxGeometry(w, 0.04, d), MATS.liftSteel, cx, cy, HH + 0.02, false);                                      // ceiling
  add(new THREE.BoxGeometry(w * 0.6, 0.01, d * 0.6), MATS.liftLight, cx, cy, HH - 0.005, false);                        // light panel
  add(new THREE.BoxGeometry(0.03, HH, d), MATS.liftSteel, L.x1 + 0.015, cy, HH / 2);                                  // back wall
  add(new THREE.BoxGeometry(0.01, 1.2, d * 0.7), MATS.mirror || MATS.glass, L.x1 - 0.006, cy, 1.45, false);           // mirror
  add(new THREE.BoxGeometry(0.03, 0.03, d * 0.8), MATS.liftSteel, L.x1 - 0.06, cy, 0.9, false);                         // handrail
  for (const y of [L.y0 - 0.015, L.y1 + 0.015]) add(new THREE.BoxGeometry(w, HH, 0.03), MATS.liftSteel, cx, y, HH / 2);   // side walls (three: z = -y)
  for (const [a, b] of [[L.y0, L.dY0], [L.dY1, L.y1]]) add(new THREE.BoxGeometry(0.04, HH, Math.abs(b - a)), MATS.liftSteel, L.x0 + 0.02, (a + b) / 2, HH / 2);   // front jambs
  add(new THREE.BoxGeometry(0.02, 0.4, 0.14), MATS.liftSteel, L.x0 + 0.18, L.y1 - 0.02, 1.15, false);                 // button panel
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12), MATS.liftBtn, L.x0 + 0.18, L.y1 - 0.035, 1.03 + i * 0.07, false).rotation.x = Math.PI / 2;
  const disp = add(new THREE.PlaneGeometry(0.12, 0.03), MATS.liftDisp, L.x0 + 0.18, L.y1 - 0.034, 1.33, false);
  const panelHit = add(new THREE.BoxGeometry(0.1, 0.5, 0.2), new THREE.MeshBasicMaterial({ visible: false }), L.x0 + 0.18, L.y1 - 0.06, 1.15, false);
  const lampC = new THREE.PointLight(0xfff0dc, 0, 3.5, 2); lampC.position.copy(b2t(cx, cy, HH - 0.2)); g.add(lampC); lift.carLamp = lampC;
  // the car is laid out at level 0 in world space; the group moves up and down
  scene.add(g); lift.car = g;
  const panelDoor = { kind: 'swap', label: 'Lift panel', parts: [panelHit], get center() { return panelHit.getWorldPosition(new THREE.Vector3()); },
    swap: () => selectFurniture(selected === liftMover ? null : liftMover), prompt: () => (selected === liftMover ? 'Close the lift panel' : 'Choose a floor') };
  panelHit.userData.door = panelDoor; doors.push(panelDoor);
  // landing doors, sills, call buttons and floor displays on every floor
  for (let k = 0; k < 4; k++) {
    const z = LIFT.levels[k], lw = (L.dY1 - L.dY0) / 2;
    const leaves = [0, 1].map((s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.13, lw), MATS.liftSteel); m.position.copy(b2t(7.33, L.dY0 + lw * (s + 0.5), z + 1.065)); m.castShadow = true; scene.add(m); collidables.push(m); return m; });
    lift.leaves.push(leaves);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.02, L.dY1 - L.dY0), MATS.liftSteel); sill.position.copy(b2t(7.32, (L.dY0 + L.dY1) / 2, z - 0.01)); scene.add(sill); sill.userData.walk = true; jsWalk.push(sill);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.16, 0.08), MATS.liftSteel); plate.position.copy(b2t(L.wallX - 0.005, L.dY1 + 0.2, z + 1.1)); scene.add(plate);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 16), MATS.liftBtn); btn.rotation.z = Math.PI / 2; btn.position.copy(b2t(L.wallX - 0.012, L.dY1 + 0.2, z + 1.1)); scene.add(btn);
    const dsp = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.1), MATS.liftDisp); dsp.position.copy(b2t(L.wallX - 0.022, (L.dY0 + L.dY1) / 2, z + 2.36)); dsp.rotation.y = -Math.PI / 2; scene.add(dsp);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.25), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(btn.position); scene.add(hit);
    const door = { kind: 'swap', label: `Lift call ${k}`, parts: [hit], center: btn.position.clone(),
      swap: () => callLift(k), prompt: () => (lift.at === k && !lift.moving ? (lift.want[k] ? 'Lift doors are open' : 'Open the lift') : lift.moving ? 'Lift is on its way' : 'Call the lift') };
    hit.userData.door = door; doors.push(door);
  }
  // ceiling fittings on every landing and in the lobby, wall lights at the half landings (glow with the motion-sensor lights)
  MATS.stairLamp = new THREE.MeshStandardMaterial({ color: 0xf2efe8, emissive: 0xfff1dc, emissiveIntensity: 0, roughness: 0.5 });
  { const disc = new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24), wl = new THREE.BoxGeometry(0.06, 0.12, 0.3);
    const bits = [];
    for (const [x, y, z] of [[5.6, -1.4, 2.6], [5.6, -1.4, -0.25], [5.6, -1.4, -3.2], [5.6, -1.4, -6.15], [3.6, -5.3, -6.17]]) { const m = new THREE.Mesh(disc, MATS.stairLamp); m.position.copy(b2t(x, y, z - 0.025)); scene.add(m); bits.push(m); }
    for (const lh of [-1.475, -4.425, -7.725]) { const m = new THREE.Mesh(wl, MATS.stairLamp); m.position.copy(b2t(0.28, -2.45, lh + 2.0)); scene.add(m); bits.push(m); }
    bakeLoose(bits); }
  // two lights that follow you round the stairwell (a lit landing + the half landing / lobby next to it)
  for (let i = 0; i < 2; i++) { const p = new THREE.PointLight(0xfff0dc, 0, 7, 1.6); scene.add(p); lift.lamps.push(p); }
  // street door (no. 9): red-brown glazed leaf, hinged on the stairwell side, opening into the lobby
  addHinged({ id: 'street_door', label: 'Street door', name: 'the street door', shape: 'sash', frameMat: MATS.entryframe, hinge: [-0.035, -4.6], closed: [0, -1], open: [1, 0], len: 1.05, h: 2.4, z0: -9.6 });
  drawLiftDisp();
}
const inCar = () => { const x = player.pos.x, y = -player.pos.z; return x > LIFT.x0 - 0.02 && x < LIFT.x1 && y > LIFT.y0 && y < LIFT.y1; };
const inLiftDoorway = (k) => { const x = player.pos.x, y = -player.pos.z; return Math.abs(player.fy - LIFT.levels[k]) < 0.5 && x > 6.5 && x < 7.75 && y > LIFT.dY0 - 0.1 && y < LIFT.dY1 + 0.1; };
function callLift(k) {
  if (lift.moving) { showToast('The lift is on its way'); return; }
  if (lift.at === k) { lift.want[k] = 1; lift.closeAt[k] = performance.now() + 7000; MATS.liftBtn.emissiveIntensity = 0; return; }
  MATS.liftBtn.emissiveIntensity = 1.2; rideTo(k);
}
function rideTo(k) {
  if (lift.moving || k === lift.at) { if (k === lift.at) callLift(k); return; }
  const from = lift.at; lift.want[from] = 0;
  lift.after = () => { lift.moving = { from: LIFT.levels[from], to: LIFT.levels[k], k, t0: performance.now(), dur: 1200 + 900 * Math.abs(k - from), riding: inCar() && Math.abs(player.fy - lift.y) < 0.3 }; };
  if (selected === liftMover) selectFurniture(null);
  showToast(`Lift → ${LIFT.names[k]}`);
}
function updateLift(dt) {
  if (!lift.car) return;
  const now = performance.now();
  // doors
  for (let k = 0; k < 4; k++) {
    if (lift.want[k] && now > lift.closeAt[k] && !inLiftDoorway(k) && !inCar()) lift.want[k] = 0;
    if (lift.want[k] && now > lift.closeAt[k] && inCar() && !inLiftDoorway(k) && now > lift.closeAt[k] + 5000) lift.want[k] = 0;
    const tgt = lift.want[k], o = lift.open[k];
    if (o !== tgt) {
      lift.open[k] = tgt > o ? Math.min(1, o + dt * 1.4) : Math.max(0, o - dt * 1.4);
      const e = lift.open[k] * lift.open[k] * (3 - 2 * lift.open[k]), lw = (LIFT.dY1 - LIFT.dY0) / 2, z = LIFT.levels[k];
      lift.leaves[k][0].position.copy(b2t(7.33, LIFT.dY0 + lw * 0.5 - e * lw * 0.98, z + 1.065));
      lift.leaves[k][1].position.copy(b2t(7.33, LIFT.dY0 + lw * 1.5 + e * lw * 0.98, z + 1.065));
      shadowDirty = true;
    }
  }
  if (lift.after && lift.open.every((o) => o === 0)) { const f = lift.after; lift.after = null; f(); }
  // travel
  if (lift.moving) {
    const M = lift.moving, t = Math.min(1, (now - M.t0) / M.dur), e = t * t * (3 - 2 * t), riding = M.riding;
    lift.y = M.from + (M.to - M.from) * e; lift.car.position.y = lift.y;
    if (riding) setFeet(lift.y);
    if (t >= 1) { lift.at = M.k; lift.moving = null; MATS.liftBtn.emissiveIntensity = 0; lift.want[M.k] = 1; lift.closeAt[M.k] = now + 7000; }
  }
  drawLiftDisp();
  // stairwell / lobby: motion-sensor lights after dark. Walking anywhere in the stairwell (our landing included) switches them on;
  // they stay on 40 s after you leave, then fade. The two real lights follow you; the ceiling fittings on every floor glow.
  const inWell = player.pos.x > 0 && player.pos.x < 9 && -player.pos.z > -7.9 && -player.pos.z < 0.05 && player.fy < 3 && mode === 'walk';
  if (inWell) lift.motionAt = now;
  const dark = THREE.MathUtils.clamp((0.75 - dayLevel) / 0.5, 0, 1), since = (now - (lift.motionAt ?? -1e9)) / 1000;
  const sensor = since < 40 ? 1 : Math.max(0, 1 - (since - 40) / 1.5), lit = dark * sensor;
  const lv = LIFT.levels.reduce((b, v, i) => (Math.abs(v - player.fy) < Math.abs(LIFT.levels[b] - player.fy) ? i : b), 0), base = LIFT.levels[lv];
  lift.lamps[0].position.copy(b2t(5.6, -1.4, base + 2.35)); lift.lamps[0].intensity = 2.4 * lit;
  lift.lamps[1].position.copy(lv === 0 && -player.pos.z < -2.9 ? b2t(3.6, -5.3, base + 3.0) : b2t(1.2, -1.4, base - 0.6)); lift.lamps[1].intensity = 1.8 * lit;
  if (Math.abs(lit - (lift.litWas ?? -1)) > 0.01) { lift.litWas = lit; MATS.stairLamp.emissiveIntensity = 2.2 * lit; }
  lift.carLamp.intensity = inCar() || lift.open.some((o) => o > 0) ? 1.2 : 0;
}
const liftMover = {
  name: 'Lift', title: () => `Lift · ${LIFT.names[lift.at]}`,
  anchor: () => (lift.car ? b2t(LIFT.x0 + 0.4, LIFT.y1 - 0.2, lift.y + 1.5) : null),
  selects: [{ id: 'floor', label: 'Go to', options: () => LIFT.names.map((n) => ({ label: n })), get: () => lift.at, set: (i) => rideTo(i) }],
  info: () => 'Doors close by themselves; the lift takes you with it. Walk out at the street floor to stroll outside.',
};
// room label below our floor: the stairwell floors, the street lobby, or outside
function levelLabel() {
  const x = player.pos.x, y = -player.pos.z, lv = LIFT.levels.reduce((b, v, i) => (Math.abs(v - player.fy) < Math.abs(LIFT.levels[b] - player.fy) ? i : b), 0);
  if (inCar()) return ['Elevator', `Lift · ${lv === 0 ? 'stuen' : lv + '. sal'}`, ''];
  if (x > 0 && x < 7.5 && y > -3.05 && y < 0) return ['Opgang', `Stairwell · ${lv === 0 ? 'stuen' : lv + '. sal'}`, ''];
  if (x > 0 && x < 7.5 && y > -7.9 && y <= -3.05) return ['Opgang nr. 9', 'Street lobby', ''];
  return null;
}
