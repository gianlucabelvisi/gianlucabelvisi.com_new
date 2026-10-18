// ------------------------------------------------------------ living: a painting on the canal wall between the two windows (above the socket)
// "Dansevise" — an original, earthy mid-century Danish-style piece nodding to Grethe & Jørgen Ingmann (the street's namesake and her
// 1963 Eurovision winner): a stylised couple dancing under a low sun, a guitar, rolling fields. Faceless shapes, not a likeness.
const ART_PALETTES = [
  { name: 'Dansevise · day', bg: '#efe4cf', sun: '#d9a441', ring: '#b8613d', arch: '#dca07a', hills: ['#a3a77a', '#7a7d45', '#b8613d', '#6b4a33'], skirt: '#b8613d', man: '#3f4a3a', skin: '#c98d68', hair: '#4a3022', guitar: '#c58a3e', ink: '#3b2a1e' },
  { name: 'Aftensang · evening', bg: '#e6d7bd', sun: '#f0d9a0', ring: '#c7774a', arch: '#2f4a5a', hills: ['#5f6b4a', '#3e4a35', '#9c4f33', '#2e2620'], skirt: '#c7774a', man: '#22313b', skin: '#c98d68', hair: '#2e2018', guitar: '#b9853f', ink: '#2a1f18' },
];
const ART_SIZES = [{ w: 0.7, h: 0.5 }, { w: 1.0, h: 0.6 }, { w: 1.2, h: 0.8 }];
const ART_FRAMES = [{ name: 'Oak', c: 0xc8a273 }, { name: 'Black', c: 0x1e1d1b }, { name: 'White', c: 0xf2f0ea }, { name: 'No frame (canvas)', c: null }];
const art = { pal: 0, size: 1, frame: 0, y: 4.54, z: 1.55, group: null, parts: [] };
function drawArt(g, W, H, P) {
  const r = rng(1963), u = W / 100;
  g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
  // low sun with a ring
  g.fillStyle = P.sun; g.beginPath(); g.arc(W * 0.74, H * 0.34, H * 0.2, 0, 7); g.fill();
  g.strokeStyle = P.ring; g.lineWidth = u * 0.5; g.beginPath(); g.arc(W * 0.74, H * 0.34, H * 0.25, 0, 7); g.stroke();
  // a tall arch behind the dancers
  g.fillStyle = P.arch; g.beginPath(); const ax = W * 0.18, aw = W * 0.3, at = H * 0.16; g.moveTo(ax, H); g.lineTo(ax, at + aw / 2); g.arc(ax + aw / 2, at + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, H); g.fill();
  // rolling fields, back to front
  P.hills.forEach((c, k) => {
    const y0 = H * (0.62 + k * 0.1), amp = H * (0.07 - k * 0.012), ph = k * 1.7 + 0.5;
    g.fillStyle = c; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 60) g.lineTo(x, y0 + Math.sin(x / W * Math.PI * (1.4 + k * 0.4) + ph) * amp);
    g.lineTo(W, H); g.fill();
    if (k === 1) { g.strokeStyle = 'rgba(255,240,210,0.25)'; g.lineWidth = u * 0.25; for (let i = 0; i < 14; i++) { g.beginPath(); const x = W * (0.05 + i * 0.07); g.moveTo(x, y0 + amp * 0.6); g.quadraticCurveTo(x + W * 0.03, y0 + amp * 1.3, x + W * 0.02, H * 0.9); g.stroke(); } }   // furrows
  });
  // the dancers: she spins (bell skirt), he leans in; joined hands arc over
  const cx = W * 0.4, fy = H * 0.8;
  g.save(); g.translate(cx - W * 0.06, fy); g.rotate(-0.12);
  g.fillStyle = P.skirt; g.beginPath(); g.moveTo(-W * 0.012, -H * 0.36); g.quadraticCurveTo(-W * 0.11, -H * 0.12, -W * 0.13, 0); g.quadraticCurveTo(0, H * 0.035, W * 0.09, -H * 0.02); g.quadraticCurveTo(W * 0.03, -H * 0.2, W * 0.012, -H * 0.36); g.fill();
  g.fillStyle = P.man; g.beginPath(); g.ellipse(0, -H * 0.4, W * 0.018, H * 0.06, 0, 0, 7); g.fill();       // bodice
  g.fillStyle = P.skin; g.beginPath(); g.arc(0, -H * 0.5, H * 0.04, 0, 7); g.fill();
  g.fillStyle = P.hair; g.beginPath(); g.arc(-H * 0.006, -H * 0.515, H * 0.042, Math.PI * 0.9, Math.PI * 2.05); g.fill(); g.beginPath(); g.arc(-H * 0.045, -H * 0.5, H * 0.02, 0, 7); g.fill();   // hair with a bun
  g.restore();
  g.save(); g.translate(cx + W * 0.075, fy); g.rotate(0.1);
  g.fillStyle = P.man; g.beginPath(); g.moveTo(-W * 0.035, 0); g.lineTo(-W * 0.012, -H * 0.42); g.quadraticCurveTo(0, -H * 0.47, W * 0.014, -H * 0.42); g.lineTo(W * 0.03, 0); g.lineTo(W * 0.008, 0); g.lineTo(0, -H * 0.18); g.lineTo(-W * 0.012, 0); g.fill();
  g.fillStyle = P.skin; g.beginPath(); g.arc(0, -H * 0.52, H * 0.038, 0, 7); g.fill();
  g.fillStyle = P.hair; g.beginPath(); g.arc(0, -H * 0.53, H * 0.039, Math.PI * 1.05, Math.PI * 1.95); g.fill();
  g.restore();
  g.strokeStyle = P.ink; g.lineWidth = u * 0.55; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - W * 0.05, fy - H * 0.42); g.quadraticCurveTo(cx, fy - H * 0.66, cx + W * 0.06, fy - H * 0.42); g.stroke();       // raised joined arms
  g.beginPath(); g.moveTo(cx - W * 0.07, fy - H * 0.38); g.quadraticCurveTo(cx - W * 0.14, fy - H * 0.33, cx - W * 0.16, fy - H * 0.42); g.stroke();
  // guitar leaning at the right
  g.save(); g.translate(W * 0.8, H * 0.86); g.rotate(-0.35); g.fillStyle = P.guitar;
  g.beginPath(); g.ellipse(0, 0, W * 0.05, H * 0.1, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(0, -H * 0.13, W * 0.038, H * 0.075, 0, 0, 7); g.fill();
  g.fillStyle = P.ink; g.beginPath(); g.arc(0, -H * 0.06, H * 0.026, 0, 7); g.fill(); g.fillRect(-W * 0.006, -H * 0.5, W * 0.012, H * 0.36); g.fillRect(-W * 0.012, -H * 0.54, W * 0.024, H * 0.06);
  g.restore();
  // a melody drifting up from the guitar: dotted arcs
  g.fillStyle = P.ink; for (let i = 0; i < 26; i++) { const t = i / 25, x = W * (0.76 - 0.3 * t), y = H * (0.5 - 0.3 * Math.sin(t * Math.PI) - 0.1 * t); g.globalAlpha = 0.7 - 0.4 * t; g.beginPath(); g.arc(x, y, u * (0.35 + (i % 4 === 0 ? 0.35 : 0)), 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // paper grain and a few dry brush strokes
  const id = g.getImageData(0, 0, W, H); for (let i = 0; i < id.data.length; i += 4) { const n = (r() - 0.5) * 18; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; } g.putImageData(id, 0, 0);
  g.fillStyle = P.ink; g.globalAlpha = 0.8; g.font = `italic ${Math.round(u * 1.9)}px Georgia, serif`; g.textAlign = 'right'; g.fillText(P.name.split(' · ')[0], W * 0.965, H * 0.965); g.globalAlpha = 1;
}
const artTexCache = {};
function artTex(i) {
  if (artTexCache[i]) return artTexCache[i];
  const t = canvasTex(1200, 720, (g, W, H) => drawArt(g, W, H, ART_PALETTES[i]), [1, 1]); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1, 1);
  return (artTexCache[i] = t);
}
function buildArt() {
  const Wl = 0.476 + 0.0005; if (art.group) { scene.remove(art.group); dropParts(art.parts); }
  const S = ART_SIZES[art.size], F = ART_FRAMES[art.frame], fw = F.c === null ? 0 : 0.025, D = F.c === null ? 0.03 : 0.035;
  art.y = THREE.MathUtils.clamp(art.y, 3.55 + S.w / 2, 5.45 - S.w / 2); art.z = THREE.MathUtils.clamp(art.z, 0.5 + S.h / 2, 2.45 - S.h / 2);
  const g = new THREE.Group(); g.position.copy(b2t(Wl, art.y, art.z)); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(b2t(0, 1).normalize(), UP, b2t(1, 0).normalize()));
  const iw = S.w - 2 * fw, ih = S.h - 2 * fw;
  const canvasM = new THREE.MeshStandardMaterial({ map: artTex(art.pal), color: 0xb4b4b4, envMapIntensity: 0.35, roughness: 0.92, bumpMap: weaveTex('canvas'), bumpScale: 0.0015 });
  const side = stdc({ color: 0xece4d4, roughness: 0.9 });
  const pic = new THREE.Mesh(new THREE.BoxGeometry(iw, ih, D - 0.006), [side, side, side, side, canvasM, side]); pic.position.z = (D - 0.006) / 2; g.add(pic);
  if (F.c !== null) {
    const fm = MATS['artFrame' + art.frame] ||= stdc({ color: F.c, roughness: art.frame === 0 ? 0.6 : 0.45, ...(art.frame === 0 ? { map: weaveTex('flat') } : {}) });
    for (const [x, y, w, h] of [[0, (S.h - fw) / 2, S.w, fw], [0, -(S.h - fw) / 2, S.w, fw], [(S.w - fw) / 2, 0, fw, ih], [-(S.w - fw) / 2, 0, fw, ih]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, D), fm); b.position.set(x, y, D / 2); g.add(b); }
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  mergeByMaterial(g);                                                    // perf
  const hit = new THREE.Mesh(new THREE.BoxGeometry(S.w, S.h, 0.05), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = 0.025; g.add(hit);
  scene.add(g); g.updateMatrixWorld(true);
  const door = { kind: 'swap', label: 'Painting', parts: [hit], center: g.position.clone(),
    swap: () => selectFurniture(selected === artMover ? null : artMover), prompt: () => (selected === artMover ? 'Done with the painting' : 'Change the painting') };
  hit.userData.door = door; hit.userData.furniture = true; collidables.push(hit);
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Painting'); if (di >= 0) doors.splice(di, 1);
  doors.push(door); art.group = g; art.parts = [hit]; shadowDirty = true;
}
const artMover = {
  name: 'Painting', title: () => `“${ART_PALETTES[art.pal].name.split(' · ')[0]}” · ${Math.round(ART_SIZES[art.size].w * 100)} × ${Math.round(ART_SIZES[art.size].h * 100)} cm`,
  anchor: () => (art.group ? art.group.position.clone().add(b2t(0.3, 0, 0)).setY(art.z + ART_SIZES[art.size].h / 2 + 0.1) : null),
  axis: () => b2t(0, 1).normalize(),
  shift: (dir) => { const b = art.y; art.y += dir * 0.05; buildArt(); if (Math.abs(art.y - b) < 1e-6) showToast('Can’t go further: window'); },
  axis2: () => new THREE.Vector3(0, 1, 0),
  shift2: (dir) => { const b = art.z; art.z += dir * 0.05; buildArt(); if (Math.abs(art.z - b) < 1e-6) showToast(dir > 0 ? 'That’s as high as it goes' : 'That’s as low as it goes'); },
  selects: [
    { id: 'apal', label: 'Painting', options: () => ART_PALETTES.map((p) => ({ label: p.name })), get: () => art.pal, set: (i) => { art.pal = i; buildArt(); } },
    { id: 'asize', label: 'Size', options: () => ART_SIZES.map((s) => ({ label: `${Math.round(s.w * 100)} × ${Math.round(s.h * 100)} cm` })), get: () => art.size, set: (i) => { art.size = i; buildArt(); } },
    { id: 'aframe', label: 'Frame', options: () => ART_FRAMES.map((f) => ({ label: f.name })), get: () => art.frame, set: (i) => { art.frame = i; buildArt(); } },
  ],
  info: () => `An original piece for this wall, inspired by Grethe Ingmann (the street's name) and “Dansevise”, her 1963 Eurovision winner with Jørgen Ingmann · centre ${art.z.toFixed(2)} m above the floor · ◀▶ along the wall, ▲▼ up/down`,
};
// ------------------------------------------------------------ living: IKEA-hack console along the sofa's short side (the return, facing the dining area)
// Modelled on the popular "behind-the-couch BESTÅ" hacks (ikeahackers.net 2022/04 behind-couch-cabinet-hack, Instructables "IKEA Besta Couch
// Table Shelf Hack"): a row of the shallow BESTÅ 60×20×64 frames on 10 cm legs with a solid board on top — 20 cm deep, 76.5 cm high (under the
// 82 cm sofa back), storage inside, plants and candles on top. ikea.dk prices Oct 2026.
const CONSOLE = {
  frames: [
    { name: 'Hvid', c: 0xf3f2ee, art: 'besta-stel-hvid-60245919', kr: 220, art38: 'besta-stel-hvid-00245917', kr38: 170 },
    { name: 'Sortbrun', c: 0x3a302a, art: 'besta-stel-sortbrun-20245959', kr: 220, art38: 'besta-stel-sortbrun-60245957', kr38: 170 },
    { name: 'Egetræsmønster m. hvid bejdse', c: 0xd9ccb6, grain: true, art: 'besta-stel-egetraesmonster-med-hvid-bejdse-80247413', kr: 220, art38: 'besta-stel-egetraesmonster-med-hvid-bejdse-80247408', kr38: 170 },
  ],
  fronts: [
    { name: 'Open (no doors)', open: true, kr: 0 },
    { name: 'LAPPVIKEN · hvid', c: 0xf4f3ef, style: 'slab', art: 'lappviken-lage-hvid-50291676', kr: 130, art38: 'lappviken-lage-skuffefront-hvid-00291674', kr38: 90 },
    { name: 'HANVIKEN · hvid', c: 0xf2f1ec, style: 'frame', art: 'hanviken-lage-hvid-60291845', kr: 160, art38: 'hanviken-lage-skuffefront-hvid-00291848', kr38: 100 },
    { name: 'FÄNRIK · ask', c: 0xd6bf98, style: 'slab', grain: true, art: 'faenrik-lage-ask-10590385', kr: 130, art38: 'faenrik-lage-skuffefront-ask-90590386', kr38: 90 },
    { name: 'BJÖRKÖVIKEN · egetræsfiner', c: 0xc79b68, style: 'slab', grain: true, art: 'bjoerkoeviken-lage-egetraesfiner-60638610', kr: 400, art38: 'bjoerkoeviken-lage-skuffefront-egetraesfiner-10638617', kr38: 290 },
    { name: 'HEDEVIKEN · brun egetræsfiner', c: 0x7a5236, style: 'slab', grain: true, art: 'hedeviken-lage-brun-egetraesfiner-med-bejdse-70638624', kr: 400, art38: 'hedeviken-lage-skuffefront-brun-egetraesfiner-med-bejdse-40638625', kr38: 290 },
    { name: 'KRUKMAKARE · mørk grågrøn', c: 0x4f5a4f, style: 'frame', art: 'krukmakare-lage-mork-gragron-60602324', kr: 240, art38: 'krukmakare-lage-skuffefront-mork-gragron-90602327', kr38: 170 },
    { name: 'STUDSVIKEN · hvid/flettet poppel', c: 0xf2f1ec, style: 'woven', art: 'studsviken-lage-hvid-flettet-poppel-70468240', kr: 220, art38: 'studsviken-lage-skuffefront-hvid-flettet-poppel-60472884', kr38: 130 },
    { name: 'SELSVIKEN · højglans sort', c: 0x161616, style: 'slab', gloss: true, art: 'selsviken-lage-hojglans-sort-00291626', kr: 260 },
    { name: 'HAMMARSMED · antracit', c: 0x3b3d3f, style: 'frame', art: 'hammarsmed-lage-antracit-00590362', kr: 290 },
  ],
  heights: [
    { name: 'BESTÅ 64 on the floor · 66.5 cm', H: 0.64, leg: 0 },
    { name: 'BESTÅ 38 on 10 cm legs · 50.5 cm', H: 0.38, leg: 0.10 },
    { name: 'BESTÅ 38 on the floor · 40.5 cm', H: 0.38, leg: 0 },
  ],
  layouts: ['Doors on every frame', 'Doors at the ends, open in the middle', 'Open in the ends, door in the middle'],
  legs: [
    { name: 'MEJARP · birk', c: 0xd7b98e, shape: 'taper', art: 'mejarp-ben-birk-70489916', kr: 140 },
    { name: 'STUBBARP · hvid', c: 0xf2f1ec, shape: 'taper', art: 'stubbarp-ben-hvid-10293564', kr: 100 },
    { name: 'NANNARP · sort', c: 0x1c1c1c, shape: 'taper', art: 'nannarp-ben-sort-10293597', kr: 90 },
    { name: 'KABBARP · hvid', c: 0xf2f1ec, shape: 'cyl', art: 'kabbarp-ben-hvid-70472930', kr: 100 },
    { name: 'ÖSARP · messingfarvet', c: 0xc9a25a, shape: 'cyl', metal: true, art: 'oesarp-ben-messingfarvet-90489901', kr: 160 },
  ],
  tops: [{ name: 'Oak board (cut to size)', c: 0xc69a64, grain: true }, { name: 'Walnut board', c: 0x6a4a33, grain: true }, { name: 'White board', c: 0xf3f2ee }, { name: 'No board (frames only)', c: null }],
};
const cons = { frame: 0, front: 4, layout: 1, legs: 0, top: 0, h: 0, decor: true, on: true, group: null, parts: [], n: 0 };
const consLow = () => CONSOLE.heights[cons.h].H < 0.5;
const consFrontOK = (F) => F.open || !consLow() || !!F.art38;
const ikeaUrl = (art) => `https://www.ikea.com/dk/da/p/${art}/`;
MATS.candleWax = std({ color: 0xf1e9d8, roughness: 0.6 });
MATS.candleFlame = new THREE.MeshBasicMaterial({ color: 0xffc56b, toneMapped: false, transparent: true, opacity: 0 });
const candleLight = new THREE.PointLight(0xffa64a, 0, 2.2, 2); candleLight.visible = false; scene.add(candleLight);
window.__candles = { set: (night) => { MATS.candleFlame.opacity = Math.min(1, night * 1.4); candleLight.intensity = 0.35 * night; candleLight.visible = night > 0.02 && !!cons.group && cons.decor; } };
function buildConsole() {
  if (cons.group) { scene.remove(cons.group); dropParts(cons.parts); cons.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); cons.group = null; }
  const S = liv.sofa; if (!S || !S.group || !cons.on) return;
  const cfg = SOFAS[S.cfg], L = cfg.L, end = sofaEnds(cfg, -1)[0], R = end.t !== 'arm' ? end.R : SD;
  const n = Math.max(1, Math.floor((R + 0.06) / 0.6)), Lc = n * 0.6; cons.n = n; cons.R = R;
  const FR = CONSOLE.frames[cons.frame], FT = CONSOLE.fronts[cons.front], LG = CONSOLE.legs[cons.legs], TP = CONSOLE.tops[cons.top];
  const { f, x } = sofaFrame(), g = new THREE.Group(); g.position.copy(S.O); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, UP, f));
  const parts = [], add = (geo, m, px, py, pz, solid = false) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; g.add(o); if (solid) parts.push(o); return o; };
  const grainM = (c, rough = 0.6) => stdc({ color: c, roughness: rough, map: weaveTex('flat') });
  const fm = FR.grain ? grainM(FR.c) : stdc({ color: FR.c, roughness: 0.55 });
  const HT = CONSOLE.heights[cons.h], D = 0.20, H = HT.H, LEG = HT.leg, gap = 0.03, xo = -L / 2 - gap, xc = xo - D / 2;            // frames 20 deep against the sofa's side, fronts face out
  const z0 = (R - Lc) / 2, T = 0.016;
  const noDoors = FT.open || !consFrontOK(FT);
  const doorM = noDoors ? null : FT.gloss ? stdc({ color: FT.c, roughness: 0.08, metalness: 0.1 }) : FT.grain ? grainM(FT.c, 0.55) : stdc({ color: FT.c, roughness: 0.6 });
  for (let k = 0; k < n; k++) {
    const zc = z0 + 0.3 + 0.6 * k, y0 = LEG;
    add(new THREE.BoxGeometry(D, T, 0.6), fm, xc, y0 + T / 2, zc); add(new THREE.BoxGeometry(D, T, 0.6), fm, xc, y0 + H - T / 2, zc);       // bottom, top
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(D, H, T), fm, xc, y0 + H / 2, zc + s * (0.3 - T / 2));                              // sides
    add(new THREE.BoxGeometry(0.004, H, 0.6), fm, xo - 0.002, y0 + H / 2, zc);                                                            // back (sofa side)
    if (H > 0.5) add(new THREE.BoxGeometry(D - 0.02, T, 0.6 - 2 * T), fm, xc + 0.01, y0 + H / 2, zc);                                      // the shelf (64 frames only)
    const isDoor = !noDoors && (cons.layout === 0 || (cons.layout === 1 ? (k === 0 || k === n - 1 || n < 3) : (k !== 0 && k !== n - 1)));
    if (isDoor) {
      const dx = xo - D - 0.009;
      add(new THREE.BoxGeometry(0.018, H - 0.004, 0.596), doorM, dx, y0 + H / 2, zc);
      if (FT.style === 'frame') { const rail = stdc({ color: new THREE.Color(FT.c).multiplyScalar(0.94).getHex(), roughness: 0.6 });
        for (const [h, w, py, pz] of [[0.05, 0.596, y0 + 0.03, zc], [0.05, 0.596, y0 + H - 0.03, zc], [H - 0.1, 0.05, y0 + H / 2, zc - 0.273], [H - 0.1, 0.05, y0 + H / 2, zc + 0.273]]) add(new THREE.BoxGeometry(0.006, h, w), rail, dx - 0.012, py, pz); }
      if (FT.style === 'woven') { const wv = new THREE.MeshStandardMaterial({ color: 0xc8a978, map: weaveTex('canvas'), bumpMap: weaveTex('canvas'), bumpScale: 0.004, roughness: 0.9 });
        add(new THREE.BoxGeometry(0.004, H - 0.12, 0.48), wv, dx - 0.01, y0 + H / 2, zc); }
    } else {
      // open frame: a few things inside (books lying, a basket)
      const r = rng(k * 13 + 3), bc = [0x2f4a3a, 0xc9b48a, 0x7a2e2a, 0x1f2a44, 0xe8e2d4];
      for (let i = 0, yy = y0 + T; i < 4; i++) { const t = 0.025 + r() * 0.02; add(new THREE.BoxGeometry(0.15, t, 0.21), stdc({ color: bc[Math.floor(r() * 5)], roughness: 0.8 }), xc - 0.01, yy + t / 2, zc - 0.13 + (r() - 0.5) * 0.02); yy += t; }
      const bh = H > 0.5 ? 0.2 : 0.18, by0 = H > 0.5 ? y0 + H / 2 + T / 2 : y0 + T;
      add(new THREE.BoxGeometry(0.16, bh, 0.26), new THREE.MeshStandardMaterial({ color: 0xbf9d6a, map: weaveTex('canvas'), roughness: 0.95 }), xc - 0.01, by0 + bh / 2, zc + 0.12);   // seagrass basket
      if (H > 0.5) add(new THREE.CylinderGeometry(0.05, 0.045, 0.14, 20), stdc({ color: 0xd9cfc0, roughness: 0.5 }), xc - 0.02, y0 + T + 0.07, zc + 0.15);         // vase
    }
    // legs: 4 per frame, set in from the corners
    if (LEG > 0) for (const [lx, lz] of [[xo - 0.04, zc - 0.25], [xo - D + 0.04, zc - 0.25], [xo - 0.04, zc + 0.25], [xo - D + 0.04, zc + 0.25]]) {
      const lm = LG.metal ? stdc({ color: LG.c, roughness: 0.3, metalness: 0.85 }) : stdc({ color: LG.c, roughness: 0.6 });
      add(LG.shape === 'taper' ? new THREE.CylinderGeometry(0.016, 0.011, LEG, 12) : new THREE.CylinderGeometry(0.014, 0.014, LEG, 12), lm, lx, LEG / 2, lz);
    }
  }
  let topY = LEG + H;
  if (TP.c !== null) { add(new THREE.BoxGeometry(D + 0.02, 0.025, Lc + 0.02), TP.grain ? grainM(TP.c, 0.5) : stdc({ color: TP.c, roughness: 0.5 }), xc - 0.01, topY + 0.0125, z0 + Lc / 2); topY += 0.025; }
  // on top: a trailing pothos, a snake plant, three pillar candles on a round tray, two books
  if (cons.decor) {
    const leafM = new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.55, side: THREE.DoubleSide }), potM = stdc({ color: 0xe8e1d6, roughness: 0.7 }), r = rng(77);
    const pz1 = z0 + 0.14, pz2 = z0 + Lc - 0.12;
    add(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 24), potM, xc - 0.01, topY + 0.06, pz1);
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, rr = 0.05 + r() * 0.05, drop = r() * 0.25, lf = new THREE.Mesh(new THREE.CircleGeometry(0.03, 8), leafM);
      lf.position.set(xc - 0.01 + Math.cos(a) * rr * (r() < 0.5 ? 1 : 1.6), topY + 0.13 - drop * (Math.cos(a) < -0.3 ? 1.6 : 0.5), pz1 + Math.sin(a) * rr); lf.rotation.set(r() * 2, r() * 6, r()); lf.castShadow = true; g.add(lf); }
    add(new THREE.CylinderGeometry(0.06, 0.055, 0.13, 24), stdc({ color: 0x8a5a3c, roughness: 0.85 }), xc - 0.01, topY + 0.065, pz2);
    const swordM = new THREE.MeshStandardMaterial({ color: 0x3d5e33, roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) { const h = 0.3 + r() * 0.18, sw = new THREE.Mesh(new THREE.PlaneGeometry(0.045, h), swordM); sw.position.set(xc - 0.01 + (r() - 0.5) * 0.06, topY + 0.12 + h / 2, pz2 + (r() - 0.5) * 0.06); sw.rotation.set((r() - 0.5) * 0.2, r() * 3, (r() - 0.5) * 0.25); sw.castShadow = true; g.add(sw); }
    const tz = z0 + Lc / 2 + 0.12;
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 32), stdc({ color: 0x6b4a33, roughness: 0.5 }), xc - 0.01, topY + 0.006, tz);          // wooden tray
    let k = 0; for (const [dz, dx, h] of [[-0.05, 0.02, 0.2], [0.04, 0.03, 0.14], [0.0, -0.05, 0.1]]) {
      add(new THREE.CylinderGeometry(0.035, 0.035, h, 20), MATS.candleWax, xc - 0.01 + dx, topY + 0.012 + h / 2, tz + dz);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.022, 8), MATS.candleFlame); fl.position.set(xc - 0.01 + dx, topY + 0.012 + h + 0.014, tz + dz); g.add(fl);
      if (k++ === 0) { g.updateMatrixWorld(true); candleLight.position.copy(fl.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0.08, 0)); }
    }
    add(new THREE.BoxGeometry(0.14, 0.03, 0.21), stdc({ color: 0x2c5d63, roughness: 0.8 }), xc - 0.01, topY + 0.015, z0 + Lc / 2 - 0.2);
    add(new THREE.BoxGeometry(0.13, 0.025, 0.19), stdc({ color: 0xe8e2d4, roughness: 0.8 }), xc - 0.01, topY + 0.0425, z0 + Lc / 2 - 0.2);
  }
  mergeByMaterial(g);                                                    // perf: one draw call per material
  parts.length = 0;
  const hit = add(new THREE.BoxGeometry(D + 0.04, topY + 0.02, Lc + 0.02), new THREE.MeshBasicMaterial({ visible: false }), xc - 0.01, (topY + 0.02) / 2, z0 + Lc / 2, true);
  hit.castShadow = false;
  scene.add(g); g.updateMatrixWorld(true);
  const door = { kind: 'swap', label: 'Console', parts: [hit], center: hit.getWorldPosition(new THREE.Vector3()),
    swap: () => selectFurniture(selected === consoleMover ? null : consoleMover), prompt: () => (selected === consoleMover ? 'Done with the console' : 'Change the console') };
  hit.userData.door = door; hit.userData.furniture = true; collidables.push(hit);
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Console'); if (di >= 0) doors.splice(di, 1);
  doors.push(door); cons.group = g; cons.parts = [hit]; cons.topY = topY; cons.Lc = Lc; shadowDirty = true;
  if (window.__candles) window.__candles.set(typeof dayLevel === 'number' ? THREE.MathUtils.clamp((0.6 - dayLevel) / 0.45, 0, 1) : 0);
}
function consoleCost() {
  const FT = CONSOLE.fronts[cons.front], n = cons.n, low = consLow(), FR = CONSOLE.frames[cons.frame];
  const doorsN = !consFrontOK(FT) || FT.open ? 0 : cons.layout === 0 ? n : cons.layout === 1 ? (n < 3 ? n : 2) : Math.max(0, n - 2);
  const legsPacks = CONSOLE.heights[cons.h].leg ? n * 2 : 0, LG = CONSOLE.legs[cons.legs];
  return { doorsN, kr: n * (low ? FR.kr38 : FR.kr) + doorsN * (low ? (FT.kr38 || 0) : FT.kr) + legsPacks * LG.kr, legsPacks };
}
const consoleMover = {
  name: 'Console', title: () => `IKEA hack · ${cons.n} × BESTÅ 60×20×${consLow() ? 38 : 64} · ${CONSOLE.fronts[cons.front].name.split(' · ')[0]}`,
  anchor: () => (cons.group ? cons.parts[0].getWorldPosition(new THREE.Vector3()).setY(1.1) : null),
  variant: { label: () => (cons.decor ? 'Clear the top' : 'Plants & candles on top'), run: () => { cons.decor = !cons.decor; buildConsole(); } },
  get selects() { return [
    { id: 'chgt', label: 'Height', options: () => CONSOLE.heights.map((v) => ({ label: v.name })), get: () => cons.h, set: (i) => { cons.h = i; buildConsole(); buildMoverSelects(consoleMover); } },
    { id: 'cfr', label: 'Frames', options: () => CONSOLE.frames.map((v) => ({ label: `BESTÅ ${v.name} · ${consLow() ? v.kr38 : v.kr} kr` })), get: () => cons.frame, set: (i) => { cons.frame = i; buildConsole(); } },
    { id: 'cft', label: 'Fronts', options: () => CONSOLE.fronts.map((v) => ({ label: v.open ? v.name : !consFrontOK(v) ? `${v.name} · not made in 60×38` : `${v.name} · ${consLow() ? v.kr38 : v.kr} kr` })), get: () => cons.front, set: (i) => { cons.front = i; buildConsole(); } },
    { id: 'clay', label: 'Doors', options: () => CONSOLE.layouts.map((v) => ({ label: v })), get: () => cons.layout, set: (i) => { cons.layout = i; buildConsole(); } },
    { id: 'clg', label: 'Legs (10 cm)', options: () => CONSOLE.legs.map((v) => ({ label: `${v.name} · ${v.kr} kr/2` })), get: () => cons.legs, set: (i) => { cons.legs = i; buildConsole(); } },
    { id: 'ctp', label: 'Top', options: () => CONSOLE.tops.map((v) => ({ label: v.name })), get: () => cons.top, set: (i) => { cons.top = i; buildConsole(); } },
  ].filter((x) => x.id !== 'clg' || CONSOLE.heights[cons.h].leg); },
  link: () => ({ href: ikeaUrl(consLow() ? CONSOLE.frames[cons.frame].art38 : CONSOLE.frames[cons.frame].art), text: `IKEA · BESTÅ stel ${CONSOLE.frames[cons.frame].name} ↗`, ...(CONSOLE.fronts[cons.front].art && consFrontOK(CONSOLE.fronts[cons.front]) ? { href2: ikeaUrl(consLow() ? CONSOLE.fronts[cons.front].art38 : CONSOLE.fronts[cons.front].art), text2: `${CONSOLE.fronts[cons.front].name.split(' · ')[0]} låge ↗` } : {}) }),
  info: () => { const C = consoleCost();
    return `${Math.round(cons.Lc * 100)} × 20 cm, ${Math.round(cons.topY * 100)} cm high (sofa back 82) along the ${Math.round(cons.R * 100)} cm side · ${cons.n} frames, ${C.doorsN} doors, ${C.legsPacks ? C.legsPacks + ' × 2 legs' : 'standing on the floor'} ≈ ${C.kr.toLocaleString('da-DK')} kr + the board · follows the sofa`; },
};
// ------------------------------------------------------------ hall: the alcove behind the TV wall (≈104 × 60 cm, floor to ceiling)
// Two ideas to compare: a custom built-in closet with flush handleless doors (real, openable leaves), or open oak shelves behind a linen curtain
// on a ceiling track (same curtain mechanics: E/click, scroll, or drag the point).
const ALC = {
  models: ['Custom built-in closet', 'Open shelves + curtain'],
  fronts: [{ name: 'Painted like the walls (handleless)', c: 0xeeeeea }, { name: 'Oak veneer', c: 0xc69a64, grain: true }, { name: 'Sage green', c: 0x8f9a84 }, { name: 'Warm grey', c: 0x8a847b }],
  shelves: [{ name: 'Oak', c: 0xc69a64, grain: true }, { name: 'White', c: 0xf2f1ec }, { name: 'Walnut', c: 0x6a4a33, grain: true }],
  linens: [{ name: 'Natural linen', c: 0xd8cdb8 }, { name: 'White linen', c: 0xf1eee6 }, { name: 'Terracotta', c: 0xb8694a }, { name: 'Sage', c: 0x9aa58c }],
};
const alc = { model: 0, front: 0, shelf: 0, linen: 0, group: null, doors: [], curtain: null, box: null, hitDoor: null };
function alcoveBox() {
  if (alc.box) return alc.box;
  const P = (bx, by, dir) => curtainProbe(bx, by, 1.2, dir);
  const back = P(5.08, 4.75, [0, 1]), left = P(5.08, 4.95, [-1, 0]), right = P(5.08, 4.95, [1, 0]);
  const yB = back ? -back.z : 5.2, x0 = left ? left.x : 4.561, x1 = right ? right.x : 5.606;
  return (alc.box = { x0, x1, yF: 4.60, yB, W: x1 - x0, D: yB - 4.60 });
}
function removeCurtain(c) {
  if (!c) return; for (const p of c.panels) { scene.remove(p.mesh); p.mesh.geometry.dispose(); } if (c.track) scene.remove(c.track);
  let i = doors.indexOf(c); if (i >= 0) doors.splice(i, 1); i = curtains.indexOf(c); if (i >= 0) curtains.splice(i, 1);
}
function buildAlcove() {
  const B = alcoveBox(); if (!B || B.W < 0.6 || B.D < 0.3) return;
  if (alc.group) { scene.remove(alc.group); dropParts(alc.parts || []); }
  for (const d of alc.doors) removeHingedDoor(d); alc.doors = [];
  removeCurtain(alc.curtain); alc.curtain = null;
  const g = new THREE.Group(); scene.add(g); const parts = [];
  const add = (geo, m, bx, by, z, solid = false) => { const o = new THREE.Mesh(geo, m); o.position.copy(b2t(bx, by, z)); o.castShadow = o.receiveShadow = true; g.add(o); if (solid) { parts.push(o); collidables.push(o); } return o; };
  const cx = (B.x0 + B.x1) / 2, Hc = 2.6;
  const rr = rng(5), stuff = (bx, by, z, w, d, h, c) => add(new THREE.BoxGeometry(w, h, d), stdc({ color: c, roughness: 0.85 }), bx, by, z + h / 2);
  if (alc.model === 0) {
    // carcass: white melamine inside, a hat shelf, a rail with coats, two shoe shelves; flush doors in the alcove mouth
    const inM = stdc({ color: 0xf4f3ef, roughness: 0.6 }), T = 0.018, yIn0 = B.yF + 0.025, yIn1 = B.yB;
    add(new THREE.BoxGeometry(B.W - 0.004, Hc - 0.03, 0.006), inM, cx, yIn1 - 0.003, (Hc - 0.03) / 2);
    for (const z of [0.02, 2.12, Hc - 0.03]) add(new THREE.BoxGeometry(B.W - 0.004, T, yIn1 - yIn0), inM, cx, (yIn0 + yIn1) / 2, z);
    for (const z of [0.22, 0.42]) add(new THREE.BoxGeometry(B.W - 0.004, T, (yIn1 - yIn0) * 0.85), inM, cx, yIn1 - (yIn1 - yIn0) * 0.425, z);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, B.W - 0.04, 12), stdc({ color: 0xb9bcbf, roughness: 0.3, metalness: 0.8 }));
    rail.rotation.z = Math.PI / 2; rail.position.copy(b2t(cx, (yIn0 + yIn1) / 2, 2.0)); g.add(rail);
    const coatC = [0x2f3b4a, 0x8a6a4a, 0x3a3a3a, 0xb7a68a];
    for (let i = 0; i < 4; i++) { const x = B.x0 + 0.16 + i * (B.W - 0.32) / 3, L = 0.9 + rr() * 0.25; add(new THREE.BoxGeometry(0.06 + rr() * 0.04, L, 0.42), stdc({ color: coatC[i], roughness: 0.9 }), x, (yIn0 + yIn1) / 2, 1.98 - L / 2); }
    for (let i = 0; i < 4; i++) { stuff(B.x0 + 0.15 + i * 0.24, yIn1 - 0.2, 0.031, 0.1, 0.26, 0.09, [0x222222, 0x7a5236, 0xe8e2d4, 0x3f4a3a][i]); stuff(B.x0 + 0.15 + i * 0.24, yIn1 - 0.2, 0.231, 0.1, 0.26, 0.11, [0x6b4a33, 0x1f2a44, 0x9a9a9a, 0x5a2f2a][i]); }
    stuff(cx - 0.2, (yIn0 + yIn1) / 2, 2.13, 0.3, 0.35, 0.18, 0xbf9d6a); stuff(cx + 0.22, (yIn0 + yIn1) / 2, 2.13, 0.32, 0.36, 0.2, 0xe8e2d4);
    const F = ALC.fronts[alc.front], fm = F.grain ? stdc({ color: F.c, roughness: 0.55, map: weaveTex('flat') }) : stdc({ color: F.c, roughness: 0.7 });
    const dw = (B.W - 0.006) / 2, hd = Hc - 0.04;
    for (const k of [0, 1]) {
      const left = k === 0, hx = left ? B.x0 + 0.002 : B.x1 - 0.002;
      const d = addHinged({ id: `alcove_door_${k}`, label: 'Closet', name: 'the hall closet', shape: 'closet', hinge: [hx, B.yF - 0.011], closed: left ? [1, 0] : [-1, 0], open: [0, -1],
        len: dw - 0.002, h: hd, z0: 0.012, thick: 0.022, doorMat: fm, handle: false, grooves: false, swingDeg: 100 });
      for (const p of d.parts) p.userData.furniture = true;
      alc.doors.push(d);
    }
  } else {
    // open oak shelves on hidden brackets, filled with baskets, folded linen, books and shoes; a linen curtain closes the alcove
    const S = ALC.shelves[alc.shelf], sm = S.grain ? stdc({ color: S.c, roughness: 0.5, map: weaveTex('flat') }) : stdc({ color: S.c, roughness: 0.55 }), sd = Math.min(0.4, B.D - 0.06);
    const zs = [0.12, 0.5, 0.9, 1.3, 1.7, 2.1];
    for (const z of zs) add(new THREE.BoxGeometry(B.W - 0.004, 0.028, sd), sm, cx, B.yB - sd / 2, z);
    const items = [
      (x, z) => add(new THREE.BoxGeometry(0.3, 0.22, sd - 0.06), new THREE.MeshStandardMaterial({ color: 0xbf9d6a, map: weaveTex('canvas'), roughness: 0.95 }), x, B.yB - sd / 2, z + 0.11),   // basket
      (x, z) => { for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.3, 0.04, 0.28), stdc({ color: [0xe9e4da, 0xc9b9a0, 0x9aa58c, 0xf3f1ec][i], roughness: 0.95 }), x, B.yB - sd / 2, z + 0.02 + i * 0.041); },   // folded linen
      (x, z) => { let xx = x - 0.13; for (let i = 0; i < 9; i++) { const w = 0.02 + rr() * 0.02, h = 0.2 + rr() * 0.07; add(new THREE.BoxGeometry(w, h, 0.16), stdc({ color: BOOK_COLS[Math.floor(rr() * BOOK_COLS.length)], roughness: 0.8 }), xx + w / 2, B.yB - 0.1, z + h / 2); xx += w + 0.002; } },   // books
      (x, z) => add(new THREE.CylinderGeometry(0.07, 0.06, 0.24, 20), stdc({ color: 0xd9cfc0, roughness: 0.5 }), x, B.yB - sd / 2, z + 0.12),   // vase
    ];
    zs.slice(1).forEach((z, i) => { items[i % 4](B.x0 + 0.26, z + 0.014); items[(i + 2) % 4](B.x1 - 0.26, z + 0.014); });
    for (let i = 0; i < 4; i++) stuff(B.x0 + 0.17 + i * 0.24, B.yB - 0.18, 0.134, 0.1, 0.26, 0.1, [0x222222, 0x7a5236, 0xe8e2d4, 0x3f4a3a][i]);   // shoes on the bottom shelf
    const lin = ALC.linens[alc.linen];
    MATS.alcLinen = MATS.alcLinen || new THREE.MeshStandardMaterial({ roughness: 0.97, side: THREE.DoubleSide, map: weaveTex('canvas') });
    MATS.alcLinen.color.set(lin.c);
    const A = b2t(B.x0 + 0.01, B.yF + 0.04, 0), Bp = b2t(B.x1 - 0.01, B.yF + 0.04, 0);
    alc.curtain = addCurtain({ id: 'cur_alc', name: 'the alcove curtain', room: 'hall', A, B: Bp, dir: [0, 1], top: 2.55, Wmin: 0.2, mat: MATS.alcLinen, folds: 9, open: 0 });
  }
  { const mg = mergeByMaterial(g, new Set(parts)); for (const q of parts) { const i = collidables.indexOf(q); if (i >= 0) collidables.splice(i, 1); } parts.length = 0; for (const q of mg.solids) { parts.push(q); collidables.push(q); } }   // perf
  // info button: an invisible box in the alcove mouth (not solid)
  const hit = new THREE.Mesh(new THREE.BoxGeometry(B.W, 2.2, 0.05), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(b2t(cx, B.yF + 0.03, 1.15)); g.add(hit);
  const door = { kind: 'swap', label: 'Alcove', parts: [hit], center: hit.position.clone(),
    swap: () => selectFurniture(selected === alcoveMover ? null : alcoveMover), prompt: () => (selected === alcoveMover ? 'Done with the alcove' : 'Closet or shelves?') };
  hit.userData.door = door; hit.userData.furniture = true;
  if (alc.hitDoor) { const i = doors.indexOf(alc.hitDoor); if (i >= 0) doors.splice(i, 1); }
  doors.push(door); alc.hitDoor = door; alc.group = g; alc.parts = parts; shadowDirty = true;
}
const alcoveMover = {
  name: 'Alcove', title: () => `Hall alcove · ${ALC.models[alc.model]}`,
  anchor: () => { const B = alcoveBox(); return b2t((B.x0 + B.x1) / 2, B.yF - 0.3, 1.9); },
  variant: { label: () => (alc.model ? 'Try the built-in closet' : 'Try shelves + curtain'), run: () => { alc.model = 1 - alc.model; buildAlcove(); buildMoverSelects(alcoveMover); updateMoverInfo(); } },
  get selects() {
    const list = [{ id: 'amodel', label: 'Idea', options: () => ALC.models.map((v) => ({ label: v })), get: () => alc.model, set: (i) => { alc.model = i; buildAlcove(); buildMoverSelects(alcoveMover); } }];
    if (alc.model === 0) list.push({ id: 'afront', label: 'Doors', options: () => ALC.fronts.map((v) => ({ label: v.name })), get: () => alc.front, set: (i) => { alc.front = i; buildAlcove(); } });
    else list.push({ id: 'ashelf', label: 'Shelves', options: () => ALC.shelves.map((v) => ({ label: v.name })), get: () => alc.shelf, set: (i) => { alc.shelf = i; buildAlcove(); } },
      { id: 'alinen', label: 'Curtain', options: () => ALC.linens.map((v) => ({ label: v.name })), get: () => alc.linen, set: (i) => { alc.linen = i; if (MATS.alcLinen) MATS.alcLinen.color.set(ALC.linens[i].c); } });
    return list;
  },
  info: () => { const B = alcoveBox(); return `Alcove ${Math.round(B.W * 100)} × ${Math.round(B.D * 100)} cm, 260 cm high · ${alc.model ? 'six shelves 40 cm deep, curtain on a ceiling track (scroll or click its point)' : 'carpenter-built closet: hat shelf, coat rail, two shoe shelves; flush push-open doors (use their points)'}`; },
};
// ------------------------------------------------------------ værelse: a desk on the wall shared with the big bedroom (ILVA, not white, 60 cm deep)
// With Gianluca's own kit: ASUS ProArt 32" monitor, a mic on a bending boom arm with a pop filter, a space-grey MacBook Pro.
// Desk and the closet share that wall; "Swap" puts the desk by the window and the closet by the door (or back).
const DESKS = [
  { name: 'Torsby 140 × 60', W: 1.4, D: 0.6, H: 0.75, kr: 3999, top: 0xaeafab, hpl: true, legs: 'round', leg: 0xcfae80, apron: 'drawers2', url: 'torsby/bordplade-i-lysgraa-hpl-laminat/p-1086853-5643327580', desc: 'light-grey HPL top, lacquered solid oak legs, 2 drawers + open niche' },
  { name: 'Wilton 120 × 60', W: 1.2, D: 0.6, H: 0.75, kr: 2999, top: 0xb98b56, grain: true, legs: 'square', leg: 0xb58852, apron: 'drawer1', url: 'wilton/top-i-olieret-egefiner/p-1078250-5642877578', desc: 'oiled oak veneer, solid oak legs, drawer + open niche' },
  { name: 'Richmont 120 × 60', W: 1.2, D: 0.6, H: 0.76, kr: 2999, was: 4299, top: 0xb4875a, grain: true, legs: 'splay', leg: 0xb3885a, apron: 'drawers2', url: 'richmont/bordplade-i-olieret-egefiner/p-1085316-5643267757', desc: 'oiled oak veneer top, splayed solid oak legs, 2 drawers + open niche' },
  { name: 'Landholm 120 × 60', W: 1.2, D: 0.6, H: 0.75, kr: 3199, top: 0xbb9465, grain: true, legs: 'panel', leg: 0xbb9465, apron: 'plain', url: 'landholm/bordplade-i-matlakeret-egefiner/p-1080578-5642948860', desc: 'matt-lacquered oak veneer, fluted panel legs' },
];
const desk = { m: 1, arm: 0, mac: 0, group: null, parts: [] };          // default Wilton (oak) — Gianluca doesn't like white desks
const DESK_ARMS = ['ProArt stand', 'Monitor arm (clamped, frees the desk)'];
const MACS = [{ name: 'MacBook Pro 14″', W: 0.3126, D: 0.2212, T: 0.0155 }, { name: 'MacBook Pro 16″', W: 0.3557, D: 0.2481, T: 0.0168 }];
function screenTex(kind) {
  return canvasTex(512, 300, (g, W, H) => {
    g.fillStyle = kind === 'mac' ? '#1b1e24' : '#202630'; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#2c3e57'); gr.addColorStop(1, '#5a4a6a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(W * 0.08, H * 0.12, W * 0.55, H * 0.7);
    g.fillStyle = '#e9edf2'; g.fillRect(W * 0.08, H * 0.12, W * 0.55, H * 0.07);
    g.fillStyle = '#c7ced8'; for (let i = 0; i < 9; i++) g.fillRect(W * 0.11, H * (0.24 + i * 0.06), W * (0.2 + (i * 37 % 30) / 100), H * 0.025);
    g.fillStyle = 'rgba(25,28,34,0.92)'; g.fillRect(W * 0.67, H * 0.2, W * 0.27, H * 0.5);
    g.fillStyle = '#7fd1a1'; for (let i = 0; i < 6; i++) g.fillRect(W * 0.69, H * (0.25 + i * 0.07), W * (0.08 + (i * 13 % 10) / 60), H * 0.02);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, H - H * 0.06, W, H * 0.06);
  }, [1, 1]);
}
function deskSpan() {
  const w = vpax.wall; if (!w) return null; const Dm = DESKS[desk.m];
  const room = w.sDoor - w.sWin, need = Dm.W + vpaxW() + 0.04;
  const s0 = vpax.atWin ? w.sDoor - Dm.W : w.sWin + 0.02;
  return { s0, s1: s0 + Dm.W, fits: need <= room + 1e-6, room, need };
}
function buildDesk() {
  if (desk.group) { scene.remove(desk.group); dropParts(desk.parts); desk.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); desk.group = null; }
  const w = vpax.wall, sp = deskSpan(); if (!w || !sp) return;
  const Dm = DESKS[desk.m], { n, a, p } = w, sc = (sp.s0 + sp.s1) / 2;
  const g = new THREE.Group(); g.position.copy(p).addScaledVector(a, sc).addScaledVector(n, 0.01 + Dm.D / 2);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a.clone().negate(), UP, n.clone().negate()));   // local +z = towards the wall, x = along it
  // local frame: x along the wall (+x = towards the window), z = 0 desk centre, +z towards the wall (back edge at +D/2), user sits at -z
  const parts = [], add = (geo, m, x, y, z, solid = false) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); if (solid) parts.push(o); return o; };
  const W = Dm.W, D = Dm.D, H = Dm.H, tt = 0.025;
  const topM = Dm.grain ? stdc({ color: Dm.top, roughness: 0.5, map: weaveTex('flat') }) : stdc({ color: Dm.top, roughness: 0.45 });
  const legM = stdc({ color: Dm.leg, roughness: 0.55, map: weaveTex('flat') });
  add(new THREE.BoxGeometry(W, tt, D), topM, 0, H - tt / 2, 0, true);
  if (Dm.hpl) add(new THREE.BoxGeometry(W + 0.002, 0.006, D + 0.002), stdc({ color: 0xcfae80, roughness: 0.5 }), 0, H - tt + 0.003, 0);   // oak edge band under the HPL
  // apron with drawers / niche
  const ah = Dm.apron === 'plain' ? 0.06 : 0.11, ay = H - tt - ah / 2;
  if (Dm.apron === 'plain') add(new THREE.BoxGeometry(W - 0.2, ah, 0.02), legM, 0, ay, D / 2 - 0.06);
  else {
    add(new THREE.BoxGeometry(W - 0.06, 0.012, D - 0.06), legM, 0, H - tt - ah, 0);                     // apron bottom
    add(new THREE.BoxGeometry(W - 0.06, ah, 0.012), stdc({ color: new THREE.Color(Dm.leg).multiplyScalar(0.55).getHex(), roughness: 0.7 }), 0, ay, D / 2 - 0.035);   // back of the niche (in shadow)
    const knob = stdc({ color: 0x2a2622, roughness: 0.4 });
    const fronts = Dm.apron === 'drawers2' ? [[-W * 0.32, W * 0.3], [W * 0.32, W * 0.3]] : [[-W * 0.17, W * 0.52]];
    for (const [x, fw] of fronts) { add(new THREE.BoxGeometry(fw, ah - 0.012, 0.018), legM, x, ay, -D / 2 + 0.03); add(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 12).rotateX(Math.PI / 2), knob, x, ay, -D / 2 + 0.018); }
    if (Dm.apron === 'drawer1') add(new THREE.BoxGeometry(0.012, ah, D - 0.06), legM, W * 0.1, ay, 0);
  }
  // legs
  const lx = W / 2 - 0.05, lz = D / 2 - 0.05, lh = H - tt;
  if (Dm.legs === 'panel') { for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.03, lh, D - 0.08), legM, s * (W / 2 - 0.12), lh / 2, 0, true);
    for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.006, lh - 0.02, 0.008), legM, s * (W / 2 - 0.12) + s * 0.016, lh / 2, -(D - 0.1) / 2 + i * (D - 0.1) / 8); } }
  else for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = Dm.legs === 'round' ? new THREE.CylinderGeometry(0.022, 0.022, lh, 16) : Dm.legs === 'square' ? new THREE.BoxGeometry(0.04, lh, 0.04) : new THREE.CylinderGeometry(0.022, 0.014, lh + 0.02, 14);
    const l = add(leg, legM, sx * (lx - (Dm.legs === 'splay' ? 0.04 : 0)), lh / 2, sz * (lz - (Dm.legs === 'splay' ? 0.03 : 0)), true);
    if (Dm.legs === 'splay') { l.rotation.z = -sx * 0.1; l.rotation.x = sz * 0.08; }
    if (Dm.legs === 'square') { l.scale.set(1, 1, 1); }
  }
  // ASUS ProArt 32": panel ≈72.7 × 42.3 cm, dark-grey; on its stand at the back, or on a clamped arm floating closer to the wall
  const mon = new THREE.Group(); g.add(mon);
  const darkM = stdc({ color: 0x2b2c2f, roughness: 0.45, metalness: 0.2 }), scrM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveMap: screenTex('mon'), emissiveIntensity: 0.55, roughness: 0.2 });
  const PW = 0.727, PH = 0.423, mx = -0.12 * (W > 1.3 ? 1 : 0.5), mz = desk.arm ? D / 2 - 0.12 : D / 2 - 0.16, my = H + (desk.arm ? 0.16 : 0.12) + PH / 2;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.05), darkM); panel.position.set(mx, my, mz); panel.castShadow = true; mon.add(panel);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.012, PH - 0.02), scrM); scr.position.set(mx, my + 0.004, mz - 0.0255); scr.rotation.y = Math.PI; mon.add(scr);
  const logo = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.002), stdc({ color: 0x8a8d92, metalness: 0.7, roughness: 0.3 })); logo.position.set(mx, my - PH / 2 + 0.008, mz - 0.026); mon.add(logo);
  if (!desk.arm) {
    add(new THREE.BoxGeometry(0.27, 0.012, 0.21), darkM, mx, H + 0.006, mz + 0.02);                  // square-ish base
    add(new THREE.BoxGeometry(0.07, my - H - 0.05, 0.035), darkM, mx, H + (my - H - 0.05) / 2, mz + 0.06);   // column
  } else {
    const armM = stdc({ color: 0x1e1e1f, roughness: 0.4, metalness: 0.4 });
    add(new THREE.BoxGeometry(0.06, 0.08, 0.07), armM, mx + 0.25, H - 0.02, D / 2 - 0.02);           // clamp at the back edge
    add(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 12), armM, mx + 0.25, H + 0.15, D / 2 - 0.03);
    const seg = add(new THREE.BoxGeometry(0.28, 0.03, 0.035), armM, mx + 0.12, H + 0.3, D / 2 - 0.06); seg.rotation.y = 0.35;
    add(new THREE.BoxGeometry(0.1, 0.1, 0.02), armM, mx, my, mz + 0.035);                               // VESA plate
  }
  // MacBook Pro (space grey), open ~110°, to the left of the monitor, turned slightly towards you
  const M = MACS[desk.mac], mac = new THREE.Group(); g.add(mac); const alu = stdc({ color: 0x5c5e62, roughness: 0.32, metalness: 0.75 });
  mac.position.set(W / 2 - M.W / 2 - 0.08, H, -D / 2 + M.D / 2 + 0.08); mac.rotation.y = -0.32;
  const base = new THREE.Mesh(new THREE.BoxGeometry(M.W, M.T * 0.6, M.D), alu); base.position.y = M.T * 0.3; base.castShadow = true; mac.add(base);
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(M.W * 0.86, M.D * 0.42), stdc({ color: 0x141416, roughness: 0.6 })); kb.rotation.x = -Math.PI / 2; kb.position.set(0, M.T * 0.6 + 0.0005, M.D * 0.14); mac.add(kb);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(M.W * 0.42, M.D * 0.3), stdc({ color: 0x6a6c70, roughness: 0.3, metalness: 0.6 })); tp.rotation.x = -Math.PI / 2; tp.position.set(0, M.T * 0.6 + 0.0006, -M.D * 0.27); mac.add(tp);
  const lid = new THREE.Group(); lid.position.set(0, M.T * 0.6, M.D / 2); lid.rotation.x = 0.35; mac.add(lid);
  const lidM = new THREE.Mesh(new THREE.BoxGeometry(M.W, M.D, M.T * 0.4), alu); lidM.position.y = M.D / 2; lidM.castShadow = true; lid.add(lidM);
  const ls = new THREE.Mesh(new THREE.PlaneGeometry(M.W * 0.94, M.D * 0.9), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, emissive: 0xffffff, emissiveMap: screenTex('mac'), emissiveIntensity: 0.45 }));
  ls.position.set(0, M.D / 2, -M.T * 0.21); ls.rotation.y = Math.PI; lid.add(ls);
  // microphone on a bending boom arm (clamped at the right back corner) with a round pop filter in front
  const armM2 = stdc({ color: 0x1b1b1c, roughness: 0.45, metalness: 0.3 }), cx = -W / 2 + 0.07, cz = D / 2 - 0.04;
  add(new THREE.BoxGeometry(0.05, 0.08, 0.06), armM2, cx, H - 0.02, cz);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10), armM2, cx, H + 0.06, cz);
  const j1 = new THREE.Vector3(cx, H + 0.12, cz), j2 = new THREE.Vector3(cx + 0.06, H + 0.5, cz - 0.18), j3 = new THREE.Vector3(cx + 0.1, H + 0.36, -D / 2 + 0.14);
  for (const [A, B] of [[j1, j2], [j2, j3]]) {
    const L = A.distanceTo(B), mid = A.clone().lerp(B, 0.5);
    for (const off of [-0.012, 0.012]) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, L, 8), armM2); rod.position.copy(mid).add(new THREE.Vector3(off, 0, 0)); rod.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); rod.castShadow = true; g.add(rod); }
    const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, L * 0.6, 6), stdc({ color: 0x9a9da2, metalness: 0.8, roughness: 0.3 })); spring.position.copy(mid).add(new THREE.Vector3(0, 0.02, 0)); spring.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); g.add(spring);
  }
  for (const J of [j2, j3]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), armM2); k.position.copy(J); g.add(k); }
  const micBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.17, 18), stdc({ color: 0x232325, roughness: 0.5, metalness: 0.3 }));
  micBody.position.copy(j3).add(new THREE.Vector3(0.01, -0.06, -0.03)); micBody.rotation.x = 1.2; micBody.castShadow = true; g.add(micBody);
  const grille = new THREE.Mesh(new THREE.SphereGeometry(0.031, 16, 10), stdc({ color: 0x3a3b3e, roughness: 0.7, metalness: 0.4 })); grille.position.copy(micBody.position).add(new THREE.Vector3(0, -0.03, -0.075)); g.add(grille);
  const pf = new THREE.Group(); pf.position.copy(grille.position).add(new THREE.Vector3(0, 0, -0.08)); g.add(pf);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.005, 8, 32), armM2); pf.add(ring);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.073, 32), new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.9 })); pf.add(mesh);
  const goose = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), armM2); goose.position.set(0.05, 0.08, 0.06); goose.rotation.set(0.6, 0, -0.5); pf.add(goose);
  { const mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids); }   // perf: direct children merged per material (monitor, laptop, pop filter groups stay)
  scene.add(g); g.updateMatrixWorld(true);
  const hitC = new THREE.Vector3(0, H, 0).applyMatrix4(g.matrixWorld);
  const door = { kind: 'swap', label: 'Desk', parts, center: hitC.clone().setY(H + 0.2),
    swap: () => selectFurniture(selected === deskMover ? null : deskMover), prompt: () => (selected === deskMover ? 'Done with the desk' : 'Desk options') };
  for (const q of parts) { q.userData.door = door; q.userData.furniture = true; collidables.push(q); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Desk'); if (di >= 0) doors.splice(di, 1);
  doors.push(door); desk.group = g; desk.parts = parts; shadowDirty = true; window.__deskReady = true;
}
window.__buildDesk = () => buildDesk();
function swapDeskCloset() {
  const w = vpax.wall; if (!w) return;
  vpax.atWin = !vpax.atWin; vpax.off = vpax.atWin ? 99 : 0;
  buildVaerCloset(); buildDesk();
  const sp = deskSpan(); showToast(`Desk by the ${vpax.atWin ? 'door' : 'window'}, closet by the ${vpax.atWin ? 'window' : 'door'}${sp && !sp.fits ? ' — they overlap: pick a narrower closet or desk' : ''}`);
}
const deskMover = {
  name: 'Desk', title: () => `ILVA ${DESKS[desk.m].name} · desk by the ${vpax.atWin ? 'door' : 'window'}`,
  anchor: () => (desk.group ? desk.group.position.clone().setY(1.5) : null),
  variant: { label: () => `Swap: desk by the ${vpax.atWin ? 'window' : 'door'}, closet by the ${vpax.atWin ? 'door' : 'window'}`, run: () => { swapDeskCloset(); if (selected === deskMover) updateMoverInfo(); } },
  selects: [
    { id: 'dmod', label: 'Desk (ILVA)', options: () => DESKS.map((d) => ({ label: `${d.name} · ${d.kr.toLocaleString('da-DK')} kr` })), get: () => desk.m, set: (i) => { desk.m = i; buildDesk(); const sp = deskSpan(); if (sp && !sp.fits) showToast('Desk + closet are wider than the wall here'); } },
    { id: 'darm', label: 'Monitor', options: () => DESK_ARMS.map((v) => ({ label: `ASUS ProArt 32″ · ${v}` })), get: () => desk.arm, set: (i) => { desk.arm = i; buildDesk(); } },
    { id: 'dmac', label: 'Laptop', options: () => MACS.map((v) => ({ label: `${v.name} · space grey` })), get: () => desk.mac, set: (i) => { desk.mac = i; buildDesk(); } },
  ],
  link: () => ({ href: `https://ilva.dk/kontoret/skriveborde/${DESKS[desk.m].url}/`, text: `ILVA · ${DESKS[desk.m].name.split(' ')[0]} skrivebord ↗` }),
  info: () => { const Dm = DESKS[desk.m], sp = deskSpan();
    return `${Math.round(Dm.W * 100)} × ${Math.round(Dm.D * 100)} × ${Math.round(Dm.H * 100)} cm · ${Dm.desc} · ${Dm.kr.toLocaleString('da-DK')} kr${Dm.was ? ` (før ${Dm.was.toLocaleString('da-DK')})` : ''} · the 32″ screen sits ≈${desk.arm ? 50 : 45} cm from the front edge (≈70–75 cm from your eyes)${sp && !sp.fits ? ' · ⚠ desk + closet don’t fit on this wall together' : ''}`; },
};
// ------------------------------------------------------------ living: IKEA HOLMERUD side table (80 × 31 × 52) at the sofa's free end
const HOLM = { cols: [{ name: 'Egetræsmønstret', c: 0xc8a06e, url: 'https://www.ikea.com/dk/da/p/holmerud-sidebord-egetraesmonstret-40541421/' }, { name: 'Mørkebrun', c: 0x47352a, url: 'https://www.ikea.com/dk/da/p/holmerud-sidebord-morkebrun-20538721/' }], kr: 499 };
const holm = { pos: null, angle: 0, col: 0, group: null, parts: [] };
function buildHolm(tryPos, tryAngle) {
  const S = liv.sofa; if (!S || !S.group) return false;
  if (!holm.pos) { const { f, x } = sofaFrame(), L = SOFAS[S.cfg].L; const P = S.O.clone().addScaledVector(x, L / 2 + 0.03 + 0.155).addScaledVector(f, SD / 2); holm.pos = toBl(P); holm.angle = Math.atan2(-f.z, f.x); }
  let pos = tryPos || holm.pos, ok = true;
  const cx = THREE.MathUtils.clamp(pos[0], LIV_BOX.x0 + 0.2, LIV_BOX.x1 - 0.2), cy = THREE.MathUtils.clamp(pos[1], LIV_BOX.y0 + 0.2, LIV_BOX.y1 - 0.2);
  if (Math.abs(cx - pos[0]) > 1e-6 || Math.abs(cy - pos[1]) > 1e-6) ok = false;
  holm.pos = [cx, cy]; holm.angle = tryAngle ?? holm.angle;
  if (holm.group) { scene.remove(holm.group); dropParts(holm.parts); holm.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  const C = HOLM.cols[holm.col], m = stdc({ color: C.c, roughness: 0.55, ...(holm.col === 0 ? { map: weaveTex('flat') } : {}) }), edge = stdc({ color: new THREE.Color(C.c).multiplyScalar(0.92).getHex(), roughness: 0.5 });
  const g = new THREE.Group(); g.position.copy(b2t(cx, cy, 0)); g.rotation.y = holm.angle;
  const D = 0.31, T = 0.018, parts = [];
  const add = (x0, x1, y0, y1, mat = m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, D), mat); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); o.castShadow = o.receiveShadow = true; g.add(o); parts.push(o); return o; };
  add(-0.40, 0.40, 0.52 - T, 0.52);                 // top, full 80 cm
  add(-0.385, -0.385 + T, 0, 0.52 - T);             // tall side panel, the top overhangs it a little
  add(-0.385 + T, 0.40, 0.07, 0.07 + T);            // base shelf, 7 cm off the floor
  add(0.40 - T, 0.40, 0, 0.07);                     // low foot at the open end
  add(0.12, 0.12 + T, 0.07 + T, 0.52 - T);          // middle partition
  add(-0.385 + T, 0.12, 0.29, 0.29 + T);            // half-height shelf
  // a few things on it: two books and a small vase
  const bk = (w, h, d, c, x, y) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdc({ color: c, roughness: 0.8 })); o.position.set(x, y, 0); o.castShadow = true; g.add(o); };
  bk(0.22, 0.03, 0.16, 0x2c5d63, -0.2, 0.535); bk(0.2, 0.025, 0.15, 0xe8e2d4, -0.2, 0.5625);
  const v = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.18, 20), stdc({ color: 0xc9b9a0, roughness: 0.5 })); v.position.set(0.25, 0.61, 0.02); v.castShadow = true; g.add(v);
  { const mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids); }   // perf
  scene.add(g); g.updateMatrixWorld(true);
  const door = { kind: 'swap', label: 'Side table', parts, center: g.position.clone().setY(0.4),
    swap: () => selectFurniture(selected === holmMover ? null : holmMover), prompt: () => (selected === holmMover ? 'Done with the side table' : 'Move or turn the side table') };
  for (const q of parts) { q.userData.door = door; q.userData.furniture = true; collidables.push(q); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Side table'); if (di >= 0) doors.splice(di, 1);
  doors.push(door); holm.group = g; holm.parts = parts; shadowDirty = true;
  return ok;
}
const holmMover = {
  name: 'Side table', title: () => `IKEA HOLMERUD sidebord · ${HOLM.cols[holm.col].name}`,
  anchor: () => (holm.group ? holm.group.position.clone().setY(0.95) : null),
  axis: () => b2t(1, 0).normalize(), axis2: () => b2t(0, 1).normalize(),
  shift: (dir) => { const p = holm.pos; if (!buildHolm([p[0] + dir * 0.05, p[1]])) showToast('Can’t go further: wall'); },
  shift2: (dir) => { const p = holm.pos; if (!buildHolm([p[0], p[1] + dir * 0.05])) showToast('Can’t go further: wall'); },
  rotate: (dir) => { buildHolm(null, holm.angle + dir * Math.PI / 12); },
  angle: () => holm.angle,
  selects: [{ id: 'hcol', label: 'Colour', options: () => HOLM.cols.map((c) => ({ label: `${c.name} · ${HOLM.kr} kr` })), get: () => holm.col, set: (i) => { holm.col = i; buildHolm(); } }],
  link: () => ({ href: HOLM.cols[holm.col].url, text: `IKEA · HOLMERUD ${HOLM.cols[holm.col].name.toLowerCase()} · ${HOLM.kr} kr ↗` }),
  info: () => '80 × 31 × 52 cm · open shelf + half-height shelf, base 7 cm off the floor · max 15 kg on top, 5 kg per shelf · ⟲ ⟳ turn 15°',
};
