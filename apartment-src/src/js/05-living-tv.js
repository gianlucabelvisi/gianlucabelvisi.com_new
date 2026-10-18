// ------------------------------------------------------------ living room: 65" TV wall (TV + Sonos Arc Ultra + wall-hung media unit) and the L sofa
// Samsung 65" QN90F: 1445 × 828 × 28 mm (spec sheet). Sonos Arc Ultra: 1178 × 75 × 110.6 mm. Media unit: 180 × 38 × 40 cm, wall-hung.
MATS.tvScreen = std({ color: 0x08090b, roughness: 0.12, metalness: 0.4 });
MATS.tvFrame = std({ color: 0x1b1c1f, roughness: 0.4, metalness: 0.5 });
MATS.sonos = std({ color: 0x161616, roughness: 0.85 });
// sofa upholstery: MeshPhysical with sheen (soft cloth look) and a per-weave canvas texture (melange colour + bump), UVs in metres
const FABRIC_TEX = {};
function weaveTex(kind) {
  if (FABRIC_TEX[kind]) return FABRIC_TEX[kind];
  const r = rng({ flat: 31, boucle: 32, chenille: 33, canvas: 34, velvet: 35, leather: 36 }[kind] || 31);
  const tile = { flat: 0.06, boucle: 0.09, chenille: 0.07, canvas: 0.05, velvet: 0.12, leather: 0.2 }[kind] || 0.06;
  const t = canvasTex(256, 256, (g, W) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, W, W);
    if (kind === 'boucle') {                       // tight loops: lots of small light/dark blobs
      for (let k = 0; k < 2600; k++) { const v = 150 + r() * 105 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * W, r() * W, 1.5 + r() * 3.2, 0, 7); g.fill(); }
    } else if (kind === 'leather') {               // fine pebble grain
      for (let k = 0; k < 5000; k++) { const v = 190 + r() * 50 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * W, r() * W, 1 + r() * 2, 1 + r() * 2); }
    } else if (kind === 'velvet') {                // almost smooth pile, soft mottling
      for (let k = 0; k < 900; k++) { const v = 200 + r() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.beginPath(); g.arc(r() * W, r() * W, 3 + r() * 10, 0, 7); g.fill(); }
    } else if (kind === 'chenille') {              // soft horizontal ribs with slubs
      for (let y = 0; y < W; y += 4) { const v = 175 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, W, 2.6); }
      for (let k = 0; k < 600; k++) { const v = 215 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * W, r() * W, 4 + r() * 10, 2); }
    } else {                                       // flat weave / canvas: two-tone basket weave + melange flecks
      const st = kind === 'canvas' ? 4 : 3;
      for (let y = 0; y < W; y += st) for (let x = 0; x < W; x += st) { const on = ((x / st) + (y / st)) % 2, v = (on ? 205 : 180) + r() * 35 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, st, st); }
      for (let k = 0; k < 700; k++) { const v = r() < 0.5 ? 140 + r() * 30 | 0 : 235; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * W, r() * W, 1 + r() * 3, 1); }
    }
    // normalise so the texture averages ~0.93 (it multiplies the fabric colour; the colour itself stays as picked)
    const id = g.getImageData(0, 0, W, W), d = id.data; let sum = 0; for (let k = 0; k < d.length; k += 4) sum += d[k];
    const kk = 238 / (sum / (d.length / 4)); for (let k = 0; k < d.length; k += 4) d[k] = d[k + 1] = d[k + 2] = Math.min(255, d[k] * kk); g.putImageData(id, 0, 0);
  }, [tile, tile]);
  return (FABRIC_TEX[kind] = t);
}
function fabricTexKind(kind = '') { const k = kind.toLowerCase(); return /boucl/.test(k) ? 'boucle' : /fløjl|velvet/.test(k) ? 'velvet' : /læder|leather/.test(k) ? 'leather' : /chenille/.test(k) ? 'chenille' : /lærred|canvas/.test(k) ? 'canvas' : 'flat'; }
const fabricMat = (hex) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.6, sheenColor: 0xffffff, envMapIntensity: 0.25 });
MATS.sofa = fabricMat(0x8f8577);
MATS.sofaCush = fabricMat(0x998f82);
MATS.sofaPipe = fabricMat(0x8f8577);
MATS.blackMetal = std({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.6 });
MATS.ps5 = std({ color: 0xf2f2f0, roughness: 0.5 });
const liv = { media: null, sofa: null };
const livDims = new THREE.Group(); dimsGroup.add(livDims);
// real wall-hung TV units you can buy in Denmark (W × H × D m). Fronts: 'doors' = hinged doors, 'fabric' = flip-down flaps with
// acoustic fabric, 'octave' = drawers either side of perforated flaps. Colours matched by eye.
const IKEA_DK = (s) => `https://www.ikea.com/dk/da/p/${s}/`;
// floor-standing wooden TV benches (vente-unique.dk "TV-borde i træ", Oct 2026 — not the tall, white or black ones; + Logo Møbler Yasumi)
// H = carcass height above the legs (legH); bench: sections across the front (fractions of the width) and a front style
const VU = (slug) => `https://www.vente-unique.dk/p/${slug}`;
const BENCH_MODELS = [
  { brand: 'Logo Møbler', name: 'Yasumi RTV195', W: 1.95, D: 0.39, H: 0.445, legH: 0.08, legs: 'sled', front: 'bench', style: 'plain', lip: true, sections: [['door', .25], ['door', .25], ['door', .25], ['door', .25]],
    price: '1,460 kr (før 1,950)', note: '195 × 39 × 55 cm · laminated oak · 4 push doors · set-back sled base', finishes: [{ name: 'Lamineret eg', body: 0xc39463, front: 0xc39463, grain: true, url: 'https://logomoebler.dk/products/yasumi-rtv195-tv-bord' }] },
  { brand: 'Vente-unique', name: 'ISLARA (mango)', W: 1.65, D: 0.40, H: 0.44, legH: 0.06, legs: 'block', front: 'bench', style: 'fluted', round: true, sections: [['door', .36], ['niche2', .28], ['door', .36]],
    price: '3,979 kr', note: '165 × 40 × 50 cm · solid mango wood · 2 doors + 2 niches · rounded ends', finishes: [{ name: 'Naturlig mango', body: 0xb98a5a, front: 0xb98a5a, grain: true, url: VU('islara-tv-mobel-med-2-lager-og-2-nicher-i-mangotrae-naturlig-islara') }] },
  { brand: 'Vente-unique', name: 'LOTULA', W: 1.80, D: 0.445, H: 0.40, legH: 0.026, legs: 'plinth', front: 'bench', style: 'grain', topC: 0xd6c8b2, sections: [['door', .25], ['nicheTop', .3], ['door', .2], ['door', .25]],
    price: '1,459 kr', note: '180 × 44.5 × 44.6 cm · dark natural wood look with a beige travertine-look top · 3 doors + 1 niche', finishes: [{ name: 'Mørk naturlig / beige travertin', body: 0x5a4636, front: 0x5e4a39, grain: true, url: VU('lotula-tv-mobel-med-3-lager-og-1-niche-mork-naturlig-og-beige-travertin-effekt-lotula') }] },
  { brand: 'Vente-unique', name: 'EROLYA', W: 1.80, D: 0.445, H: 0.42, legH: 0.026, legs: 'plinth', front: 'bench', style: 'fluted', sections: [['door', .3], ['nicheTop', .4], ['door', .3]],
    price: '1,699 kr', note: '180 × 44.5 × 44.6 cm · beige fluted fronts · 3 doors + 1 niche', finishes: [{ name: 'Beige', body: 0xc0b099, front: 0xc2b29b, url: VU('erolya-tv-bord-med-3-dore-og-1-niche-beige-erolya') }] },
  { brand: 'Vente-unique', name: 'Walnut 4 drawers + 2 sliding doors', W: 1.80, D: 0.35, H: 0.36, legH: 0.14, legs: 'taper', front: 'bench', style: 'fluted', sections: [['door', .27], ['drawers4', .46], ['door', .27]],
    price: '1,336 kr', note: '180 × 35 × 50 cm · brown walnut look · fluted sliding doors, 4 drawers with metal pulls, wooden legs', finishes: [{ name: 'Brun', body: 0x7a4f30, front: 0x7f5333, grain: true, url: VU('tv-mobel-180x35x50-cm-4-skuffer-og-2-skydedore-ben-i-trae-og-handtag-i-metal-brun') }] },
  { brand: 'Vente-unique', name: 'Louvre doors 150', W: 1.50, D: 0.35, H: 0.32, legH: 0.12, legs: 'splay', front: 'bench', style: 'louvre', sections: [['door', .33], ['nicheDrawer', .34], ['door', .33]],
    price: '852 kr', note: '150 × 35 × 44 cm · dark walnut look · 2 louvre doors + drawer, cable management', finishes: [{ name: 'Brun', body: 0x5b3b28, front: 0x5e3e2a, grain: true, url: VU('moderne-tv-mobel-150-x-35-x-44-cm-2-persiennelager-og-1-skuffe-kabelstyring-mdf-brun') }] },
  { brand: 'Vente-unique', name: 'Checker oak 200', W: 2.00, D: 0.35, H: 0.32, legH: 0.125, legs: 'metal', front: 'bench', style: 'checker', sections: [['door', .38], ['drawer', .24], ['door', .38]],
    price: '731 kr', note: '200 × 35 × 44.5 cm · natural oak look, carved checker fronts, black metal legs · 2 sliding doors + drawer', finishes: [{ name: 'Natur', body: 0xd2a463, front: 0xd6a967, url: VU('moderne-tv-mobel-180x40x40-cm-afrundede-hjorner-2-skydedore-og-1-skuffe-mdf-natur') }] },
  { brand: 'Vente-unique', name: 'DEVIKA (LED)', W: 1.90, D: 0.40, H: 0.38, legH: 0.06, legs: 'plinth', front: 'bench', style: 'grain', led: true, sections: [['drawer', .34], ['niche2', .32], ['drawer', .34]],
    price: '2,999 kr', note: '190 × 40 × 44 cm · dark natural and beige · 2 drawers + 2 niches with LED · floating plinth', finishes: [{ name: 'Mørk natur / beige', body: 0x8a5a36, front: 0x8e5e39, grain: true, url: VU('devika-tv-mobel-med-2-skuffer-og-2-nicher-med-led-lys-i-mdf-mork-natur-og-beige-devika-af-pascal-morabito') }] },
  { brand: 'Vente-unique', name: 'Gold legs 160', W: 1.60, D: 0.36, H: 0.30, legH: 0.12, legs: 'gold', front: 'bench', style: 'chevron', sections: [['drawers2', .25], ['niche2', .3], ['door', .225], ['door', .225]],
    price: '629 kr', note: '160 × 36 × 42 cm · natural wood look · 2 drawers, open shelves, 2 chevron doors · gold legs', finishes: [{ name: 'Naturlig', body: 0xc9a066, front: 0xcca469, grain: true, url: VU('tv-bord-160x36x42-cm-med-2-skuffer-og-2-dore-guldben-naturlig') }] },
];
function buildBenchFront(add, UM, UF, bodyM, inM, ub, uh, uw, ud) {
  const grainy = UF.grain ? { map: weaveTex('flat') } : {};
  const fm = stdc({ color: UF.front, roughness: 0.72, envMapIntensity: 0.5, ...grainy }), dark = stdc({ color: new THREE.Color(UF.body).multiplyScalar(0.45).getHex(), roughness: 0.8 });
  const fz = ud + 0.005, T2 = 0.018;
  let x = -uw / 2;
  for (const [kind, f] of UM.sections) {
    const w = uw * f, cx = x + w / 2; x += w;
    if (x < uw / 2 - 0.01) add(new THREE.BoxGeometry(T2, uh - 2 * T2, ud - 0.02), bodyM, x, ub + uh / 2, (ud - 0.02) / 2);
    const face = (fw, fh, py, style = UM.style) => {
      add(new THREE.BoxGeometry(fw, fh, 0.014), fm, cx, py, fz);
      if (style === 'fluted') { const n = Math.max(4, Math.round(fw / 0.028)); for (let i = 0; i < n; i++) add(new THREE.CylinderGeometry(0.009, 0.009, fh - 0.01, 8), fm, cx - fw / 2 + (i + 0.5) * fw / n, py, fz + 0.005, false); }
      else if (style === 'louvre') { const n = Math.round(fh / 0.03); for (let i = 0; i < n; i++) { const s = add(new THREE.BoxGeometry(fw - 0.03, 0.022, 0.006), fm, cx, py - fh / 2 + (i + 0.5) * fh / n, fz + 0.01, false); s.rotation.x = -0.5; } }
      else if (style === 'checker') { const nx = Math.max(2, Math.round(fw / 0.11)), ny = Math.max(2, Math.round(fh / 0.11)), cw = fw / nx, ch = fh / ny;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 2) add(new THREE.BoxGeometry(cw - 0.006, ch - 0.006, 0.008), stdc({ color: new THREE.Color(UF.front).multiplyScalar(0.88).getHex(), roughness: 0.55, ...grainy }), cx - fw / 2 + (i + 0.5) * cw, py - fh / 2 + (j + 0.5) * ch, fz + 0.009, false); }
      else if (style === 'chevron') { for (let i = -3; i <= 3; i++) { const s = add(new THREE.BoxGeometry(0.006, fh * 0.9, 0.004), dark, cx + i * fw / 8, py, fz + 0.009, false); s.rotation.z = (i < 0 ? 1 : -1) * 0.6; s.scale.y = 0.6; } }
    };
    const pull = (py) => add(new THREE.BoxGeometry(0.08, 0.008, 0.012), stdc({ color: UM.legs === 'gold' ? 0xc9a25a : 0x2a2a2a, metalness: 0.7, roughness: 0.35 }), cx, py, fz + 0.012, false);
    if (kind === 'door') face(w - 0.006, uh - 0.008, ub + uh / 2);
    else if (kind === 'drawer') { face(w - 0.006, uh - 0.008, ub + uh / 2, UM.style === 'checker' ? 'checker' : 'plain'); pull(ub + uh - 0.05); }
    else if (kind === 'drawers2' || kind === 'drawers4') {
      const rows = 2, cols = kind === 'drawers4' ? 2 : 1, dw = w / cols;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const px = x - w + (c + 0.5) * dw, py = ub + (r + 0.5) * uh / rows;
        add(new THREE.BoxGeometry(dw - 0.006, uh / rows - 0.006, 0.014), fm, px, py, fz); add(new THREE.BoxGeometry(0.07, 0.008, 0.012), stdc({ color: UM.legs === 'gold' ? 0xc9a25a : 0x2a2a2a, metalness: 0.7, roughness: 0.35 }), px, py + uh / rows * 0.25, fz + 0.012, false); }
    } else if (kind === 'niche2') { add(new THREE.BoxGeometry(w - 0.02, T2, ud - 0.03), inM, cx, ub + uh / 2, (ud - 0.03) / 2);
      if (UM.led) add(new THREE.BoxGeometry(w - 0.04, 0.006, 0.01), new THREE.MeshBasicMaterial({ color: 0xffc98a, toneMapped: false }), cx, ub + uh - T2 - 0.004, ud - 0.03, false); }
    else if (kind === 'nicheTop') { add(new THREE.BoxGeometry(w - 0.02, T2, ud - 0.03), inM, cx, ub + uh * 0.55, (ud - 0.03) / 2); face(w - 0.006, uh * 0.55 - 0.008, ub + uh * 0.275); }
    else if (kind === 'nicheDrawer') { face(w - 0.006, uh * 0.35 - 0.006, ub + uh * 0.825, 'plain'); pull(ub + uh * 0.8); }
  }
  // top: travertine-look slab, or a lip (Yasumi)
  if (UM.topC) add(new THREE.BoxGeometry(uw + 0.01, 0.02, ud + 0.012), stdc({ color: UM.topC, roughness: 0.6, map: weaveTex('velvet') }), 0, ub + uh + 0.01, ud / 2);
  if (UM.lip) { add(new THREE.BoxGeometry(uw, 0.025, 0.018), fm, 0, ub + uh + 0.0125, 0.009); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.018, 0.025, ud), fm, s * (uw / 2 - 0.009), ub + uh + 0.0125, ud / 2); }
  if (UM.round) for (const s of [-1, 1]) { const c = add(new THREE.CylinderGeometry(ud / 2, ud / 2, uh, 24, 1, false, s < 0 ? Math.PI : 0, Math.PI), fm, s * uw / 2, ub + uh / 2, ud / 2); c.rotation.y = 0; }
  // legs
  const lm = UM.legs === 'gold' ? stdc({ color: 0xc9a25a, metalness: 0.85, roughness: 0.3 }) : UM.legs === 'metal' ? stdc({ color: 0x1d1d1d, metalness: 0.6, roughness: 0.4 }) : stdc({ color: new THREE.Color(UF.body).multiplyScalar(0.85).getHex(), roughness: 0.6, ...grainy });
  const LH = UM.legH;
  if (UM.legs === 'plinth') add(new THREE.BoxGeometry(uw - 0.08, LH, ud - 0.06), dark, 0, LH / 2, ud / 2);
  else if (UM.legs === 'sled') for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.04, LH, ud - 0.08), lm, s * (uw / 2 - 0.22), LH / 2, ud / 2); }
  else for (const sx of [-1, 1]) for (const sz of [0.06, ud - 0.06]) {
    const lx = sx * (uw / 2 - (UM.round ? 0.1 : 0.06));
    const geo = UM.legs === 'block' ? new THREE.BoxGeometry(0.05, LH, 0.05) : UM.legs === 'taper' || UM.legs === 'splay' ? new THREE.CylinderGeometry(0.018, 0.011, LH, 12) : new THREE.CylinderGeometry(0.008, 0.008, LH, 8);
    const l = add(geo, lm, lx, LH / 2, sz); if (UM.legs === 'splay') { l.rotation.z = -sx * 0.25; l.position.x += sx * 0.012; }
  }
}
const UNIT_MODELS = [
  { brand: 'IKEA', name: 'BESTÅ tv-bord med låger', W: 1.80, H: 0.38, D: 0.42, front: 'doors', n: 3, price: 'from ≈ 1,400 kr + wall rail', note: '3 soft-close doors · hangs on the BESTÅ suspension rail',
    finishes: [
      { name: 'Sortbrun / Lappviken brun valnøddemønster', body: 0x2c2420, front: 0x6a4a33, url: IKEA_DK('besta-tv-bord-med-lager-sortbrun-lappviken-brun-valnoddetraesmonster-s09612171') },
      { name: 'Sortbrun / Hedeviken egetræsfiner', body: 0x2c2420, front: 0xb58a5e, url: IKEA_DK('besta-tv-bord-med-lager-sortbrun-hedeviken-egetraesfiner-s59422178') },
      { name: 'Sortbrun Björköviken / brun bejdset egetræsfiner', body: 0x2c2420, front: 0x5c4231, url: IKEA_DK('besta-tv-bord-med-lager-sortbrun-bjoerkoeviken-brun-egetraesfiner-med-bejdse-s69422187') },
      { name: 'Hvid / Lappviken hvid', body: 0xf1f0eb, front: 0xf3f2ee, url: IKEA_DK('besta-tv-bord-med-lager-hvid-lappviken-hvid-s89330691') },
      { name: 'Hvid / Bergsviken beige', body: 0xf1f0eb, front: 0xd6cab5, url: IKEA_DK('besta-tv-bord-med-lager-hvid-bergsviken-beige-s49422211') },
    ] },
  { brand: 'Hammel', name: 'Mistral tv-bord, væghængt', W: 1.612, H: 0.416, D: 0.45, front: 'fabric', n: 2, price: '≈ 6,900 kr (white)', note: '2 flip-down doors with acoustic fabric (remotes work through it) · Danish made',
    finishes: [
      { name: 'Hvid lak', body: 0xf1efea, front: 0x222222, url: 'https://hjemmehos.dk/products/mistral-tv-skaenk-2' },
      { name: 'Hvidpigmenteret eg', body: 0xd8c7ab, front: 0x222222, url: 'https://hjemmehos.dk/products/mistral-tv-skaenk' },
      { name: 'Beige', body: 0xcbbfa8, front: 0x2a2826, url: 'https://hjemmehos.dk/products/mistral-tv-bord' },
    ] },
  { brand: 'Montana', name: 'Octave VII', W: 1.836, H: 0.366, D: 0.30, front: 'octave', n: 4, price: 'price at dealers', note: '2 drawers + 2 perforated flaps · wall-mounting bracket · 41 lacquer colours',
    finishes: [
      { name: 'Truffle', body: 0x584840, front: 0x584840, url: 'https://www.montanafurniture.com/en/octave-vii-tv-bench' },
      { name: 'Oat', body: 0xd8cbb3, front: 0xd8cbb3, url: 'https://www.montanafurniture.com/en/octave-vii-tv-bench' },
      { name: 'Mushroom', body: 0xa29483, front: 0xa29483, url: 'https://www.montanafurniture.com/en/octave-vii-tv-bench' },
      { name: 'New White', body: 0xf1efe9, front: 0xf1efe9, url: 'https://www.montanafurniture.com/en/octave-vii-tv-bench' },
      { name: 'Black', body: 0x1d1d1d, front: 0x1d1d1d, url: 'https://www.montanafurniture.com/en/octave-vii-tv-bench' },
    ] },
  { brand: 'Montana', name: 'Octave V', W: 1.38, H: 0.24, D: 0.30, front: 'octave', n: 3, price: '≈ 13,100 kr', note: '2 drawers + a perforated flap · low and shallow · wall-mounting bracket',
    finishes: [
      { name: 'Truffle', body: 0x584840, front: 0x584840, url: 'https://vester-moebler.dk/montana/montana-selection/montana-octave-v-tv-bord-ophaengt/' },
      { name: 'Oat', body: 0xd8cbb3, front: 0xd8cbb3, url: 'https://vester-moebler.dk/montana/montana-selection/montana-octave-v-tv-bord-ophaengt/' },
      { name: 'Mushroom', body: 0xa29483, front: 0xa29483, url: 'https://vester-moebler.dk/montana/montana-selection/montana-octave-v-tv-bord-ophaengt/' },
      { name: 'New White', body: 0xf1efe9, front: 0xf1efe9, url: 'https://vester-moebler.dk/montana/montana-selection/montana-octave-v-tv-bord-ophaengt/' },
      { name: 'Black', body: 0x1d1d1d, front: 0x1d1d1d, url: 'https://vester-moebler.dk/montana/montana-selection/montana-octave-v-tv-bord-ophaengt/' },
    ] },
  ...BENCH_MODELS,
];
const unitSel = { m: UNIT_MODELS.findIndex((u) => u.name === 'Yasumi RTV195'), f: 0 };   // Gianluca: source the bench from vente-unique / Yasumi
const TVW = { W: 1.445, H: 0.828, D: 0.028, bottom: 0.74, off: 0.03 }, UNIT = { W: 1.8, H: 0.38, D: 0.42, bottom: 0.20 }, ARC = { W: 1.178, H: 0.075, D: 0.1106, bottom: 0.62 };
function wallRun(C0, n, a, maxS = 6) {
  // how far the wall face runs from C0 along a: stop at a corner or where the wall steps back (an opening)
  const along = gapTo(C0.clone().addScaledVector(n, 0.05).setY(1.2), a, maxS) ?? maxS;
  for (let s = 0.02; s < along; s += 0.02) {
    const d = gapTo(C0.clone().addScaledVector(a, s).addScaledVector(n, 0.3).setY(1.2), n.clone().negate(), 0.6);
    if (d === null || d > 0.36) return s - 0.01;
  }
  return along;
}
function removeHingedDoor(d) {
  let top = d.pivot; while (top.parent && top.parent !== scene) top = top.parent;
  scene.remove(top);
  for (const p of d.parts) { const i = collidables.indexOf(p); if (i >= 0) collidables.splice(i, 1); }
  const i = doors.indexOf(d); if (i >= 0) doors.splice(i, 1);
}
function dropParts(list) { for (const p of list || []) { const i = collidables.indexOf(p); if (i >= 0) collidables.splice(i, 1); } }
function buildMedia() {
  let M = liv.media;
  if (!M) {
    const Wl = wallLine([3.0, 5.6], [3.0, 7.2], [1, 0]); if (!Wl) return;
    const n = Wl.n, a = new THREE.Vector3().crossVectors(UP, n).normalize();
    const probe = b2t(4.3, 6.4, 0); const C0 = Wl.p.clone().addScaledVector(a, probe.clone().sub(Wl.p).dot(a)).setY(0);
    const eP = wallRun(C0, n, a), eN = wallRun(C0, n, a.clone().negate());
    const mid = (eP - eN) / 2;
    M = liv.media = { n, a, base: C0.clone().addScaledVector(a, mid), half: (eP + eN) / 2, offset: 0, group: null, parts: [], doors: [] };
    // which way along a is the balcony? (for the info text)
    M.aToBalcony = toBl(a)[1] > 0;
  }
  if (M.group) { scene.remove(M.group); dropParts(M.parts); for (const d of M.doors) removeHingedDoor(d); M.doors = []; }
  { const UM = UNIT_MODELS[unitSel.m]; UNIT.W = UM.W; UNIT.H = UM.H; UNIT.D = UM.D; UNIT.bottom = UM.legH ?? 0.20; ARC.bottom = UM.legH !== undefined ? UM.legH + UM.H + (UM.lip ? 0.002 : UM.topC ? 0.02 : 0) : 0.62; }   // floor benches: the soundbar stands on top
  M.offset = Math.max(-(M.half - UNIT.W / 2 - 0.02), Math.min(M.half - UNIT.W / 2 - 0.02, M.offset));
  const { n, a } = M, O = M.base.clone().addScaledVector(a, M.offset);
  const g = new THREE.Group(); g.position.copy(O); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, UP, n));
  const parts = [];
  const add = (geo, mat, x, y, z, solid = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); if (solid) parts.push(m); return m; };
  // TV: thin slab, near-black glass front, 3 cm off the wall on a slim mount
  const ty = TVW.bottom + TVW.H / 2, tz = TVW.off + TVW.D / 2;
  add(new THREE.BoxGeometry(TVW.W, TVW.H, TVW.D), MATS.tvFrame, 0, ty, tz);
  const screen = add(new THREE.PlaneGeometry(TVW.W - 0.012, TVW.H - 0.012), (typeof tvState !== 'undefined' && tvState.on) ? MATS.tvOn : MATS.tvScreen, 0, ty, TVW.off + TVW.D + 0.0006, false);
  screen.castShadow = false;
  add(new THREE.BoxGeometry(0.4, 0.3, 0.02), MATS.blackMetal, 0, ty, 0.012, false);                 // wall plate (VESA 400 × 300)
  // Sonos Arc Ultra right below, on its own wall mount
  const sy = ARC.bottom + ARC.H / 2, sz = 0.02 + ARC.D / 2;
  const bar = add(new THREE.CapsuleGeometry(ARC.H / 2, ARC.W - ARC.H, 6, 16), MATS.sonos, 0, sy, sz); bar.rotation.z = Math.PI / 2; bar.scale.set(1, 1, ARC.D / ARC.H);
  add(new THREE.BoxGeometry(ARC.W - 0.1, 0.004, ARC.D * 0.7), MATS.tvFrame, 0, ARC.bottom + ARC.H - 0.001, sz, false);
  // wall-hung media unit (the selected real model); inside a PS5 and an Apple TV
  const UM = UNIT_MODELS[unitSel.m], UF = UM.finishes[unitSel.f];
  const bodyM = UM.front === 'bench' ? std({ color: UF.body, roughness: 0.78, envMapIntensity: 0.5, ...(UF.grain ? { map: weaveTex('flat') } : {}) }) : std({ color: UF.body, roughness: 0.55 }), frontM = UM.front === 'fabric' ? std({ color: UF.front, roughness: 1 }) : std({ color: UF.front, roughness: 0.5 });
  const inM = std({ color: new THREE.Color(UF.body).multiplyScalar(UM.front === 'bench' ? 0.5 : 0.8), roughness: 0.7 });
  const ub = UNIT.bottom, uh = UNIT.H, uw = UNIT.W, ud = UNIT.D, T2 = 0.018;
  add(new THREE.BoxGeometry(uw, T2, ud), bodyM, 0, ub + uh - T2 / 2, ud / 2);
  add(new THREE.BoxGeometry(uw, T2, ud), bodyM, 0, ub + T2 / 2, ud / 2);
  add(new THREE.BoxGeometry(uw, uh, T2), inM, 0, ub + uh / 2, T2 / 2);
  for (const x of [-uw / 2 + T2 / 2, uw / 2 - T2 / 2]) add(new THREE.BoxGeometry(T2, uh - 2 * T2, ud - 0.02), bodyM, x, ub + uh / 2, (ud - 0.02) / 2);
  const inY = ub + T2, sc = Math.min(1, (uh - 2 * T2) / 0.11);
  add(new THREE.BoxGeometry(0.39, 0.104 * sc, 0.26), MATS.ps5, -uw * 0.25, inY + 0.052 * sc, ud * 0.5, false);            // PS5 lying flat
  add(new THREE.BoxGeometry(0.33, 0.106 * sc, 0.2), MATS.tvFrame, -uw * 0.25, inY + 0.052 * sc, ud * 0.5, false);
  add(new THREE.BoxGeometry(0.093, 0.031, 0.093), MATS.tvFrame, uw * 0.17, inY + 0.016, ud * 0.5, false);          // Apple TV
  const toBlL = (lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyQuaternion(g.quaternion).add(O); return [v.x, -v.z]; };
  const aBl = toBl(a), nBl = toBl(n), fz = ud + 0.011;
  if (UM.front === 'doors') {                              // BESTÅ: n equal doors; the outer ones hinge at the ends, the middle one on its left
    const dw = uw / UM.n;
    for (let k = 0; k < UM.n; k++) {
      const right = k === UM.n - 1, hx = right ? -uw / 2 + (k + 1) * dw - 0.002 : -uw / 2 + k * dw + 0.002;
      if (k > 0 && k < UM.n) add(new THREE.BoxGeometry(T2, uh - 2 * T2, ud - 0.02), inM, -uw / 2 + k * dw, ub + uh / 2, (ud - 0.02) / 2);
      const d = addHinged({ id: `tvunit_${k}`, label: 'TV unit', name: 'TV unit', shape: 'closet', handle: false, doorMat: frontM,
        hinge: toBlL(hx, fz), closed: right ? [-aBl[0], -aBl[1]] : aBl, open: nBl, len: dw - 0.004, h: uh - 0.006, z0: ub + 0.003, thick: 0.02 });
      for (const p of d.parts) p.userData.furniture = true;
      d.pivot.updateMatrixWorld(true); M.doors.push(d);
    }
  } else if (UM.front === 'fabric') {                      // Mistral: body-coloured frame round two fabric flaps
    const fw2 = (uw - 3 * 0.03) / 2;
    for (const x of [-1, 1]) add(new THREE.BoxGeometry(fw2, uh - 0.06, 0.012), frontM, x * (fw2 / 2 + 0.015), ub + uh / 2, ud + 0.004);
    add(new THREE.BoxGeometry(uw, 0.03, 0.02), bodyM, 0, ub + uh - 0.015, ud + 0.004); add(new THREE.BoxGeometry(uw, 0.03, 0.02), bodyM, 0, ub + 0.015, ud + 0.004);
    for (const x of [-uw / 2 + 0.015, 0, uw / 2 - 0.015]) add(new THREE.BoxGeometry(0.03, uh, 0.02), bodyM, x, ub + uh / 2, ud + 0.004);
  } else if (UM.front === 'bench') buildBenchFront(add, UM, UF, bodyM, inM, ub, uh, uw, ud);
  else {                                                 // Octave: drawer | perforated flap(s) | drawer, flush lacquered fronts with thin gaps
    const fwk = (uw - 0.004 * (UM.n + 1)) / UM.n, perfTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#' + new THREE.Color(UF.front).getHexString(); x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(8 + i * 16, 8 + j * 16, 3, 0, Math.PI * 2); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
    for (let k = 0; k < UM.n; k++) {
      const x = -uw / 2 + 0.004 + fwk / 2 + k * (fwk + 0.004), perf = k > 0 && k < UM.n - 1;
      let m = frontM;
      if (perf) { const t = perfTex.clone(); t.needsUpdate = true; t.repeat.set(fwk / 0.02, (uh - 0.01) / 0.02); m = std({ map: t, roughness: 0.5 }); }
      add(new THREE.BoxGeometry(fwk, uh - 0.008, 0.012), m, x, ub + uh / 2, ud + 0.004);
      if (!perf) add(new THREE.BoxGeometry(0.12, 0.012, 0.004), inM, x, ub + uh - 0.03, ud + 0.011, false);   // finger groove
    }
  }
  g.remove(screen);
  { const mg = mergeByMaterial(g, new Set(parts)); parts.length = 0; parts.push(...mg.solids); }
  g.add(screen); M.screen = screen;
  // the screen itself: click (or E while looking at it) to switch the TV on / off
  const tvHit = new THREE.Mesh(new THREE.BoxGeometry(TVW.W, TVW.H, 0.03), new THREE.MeshBasicMaterial({ visible: false })); tvHit.position.set(0, ty, TVW.off + TVW.D + 0.02); g.add(tvHit);
  const tvDoor = { kind: 'swap', label: 'TV screen', parts: [tvHit], center: O.clone().setY(ty).addScaledVector(n, TVW.off + TVW.D + 0.05),
    swap: () => setTV(!tvState.on), prompt: () => (tvState.on ? 'Turn the TV off' : 'Turn the TV on') };
  tvHit.userData.door = tvDoor; tvHit.userData.furniture = true;
  { const i = doors.findIndex((d) => d.kind === 'swap' && d.label === 'TV screen'); if (i >= 0) doors.splice(i, 1); }
  doors.push(tvDoor);
  const door = { kind: 'swap', label: 'TV wall', parts, center: O.clone().setY(UNIT.bottom + UNIT.H / 2).addScaledVector(n, 0.3),
    swap: () => selectFurniture(selected === mediaMover ? null : mediaMover),
    prompt: () => (selected === mediaMover ? 'Done moving the TV' : 'Move the TV wall') };
  for (const p of parts) { p.userData.door = door; p.userData.furniture = true; collidables.push(p); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'TV wall'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  scene.add(g); g.updateMatrixWorld(true);
  M.group = g; M.parts = parts;
  // Hue Lightstrip under the unit: 8 cm in from the wall, just below its bottom panel, pointing down
  { const L = UNIT.W - 0.1, P = O.clone().addScaledVector(n, 0.08).setY(UNIT.bottom - 0.006);
    stripMesh.position.copy(P); stripMesh.quaternion.copy(g.quaternion); stripMesh.scale.set(L, 1, 1);
    stripLight.width = L; stripLight.height = 0.04; stripLight.position.copy(P).setY(UNIT.bottom - 0.012);
    stripLight.lookAt(P.clone().setY(0).addScaledVector(n, 0.25));
    stripWash.position.copy(O).addScaledVector(n, 0.05).setY(Math.max(0.08, UNIT.bottom - 0.08));
    if (typeof applyLights === 'function' && LIGHTS.tvstrip) applyLights(); }
  { const ty = TVW.bottom + TVW.H, P = O.clone().addScaledVector(n, TVW.off * 0.5).setY(ty - 0.04);
    backMesh.position.copy(P); backMesh.quaternion.copy(g.quaternion); backMesh.scale.set(TVW.W - 0.12, 1, 1);
    backLight.width = TVW.W - 0.12; backLight.position.copy(P); backLight.lookAt(O.clone().setY(ty + 0.45));
    backWash.position.copy(O).addScaledVector(n, 0.06).setY(ty + 0.12); }
  if (typeof placeTVGlow === 'function') placeTVGlow();
  if (typeof books !== 'undefined' && books.group) buildBooks();
}
// ------------------------------------------------------------ living TV: click the screen to switch it on (Apple TV-style aerial screensaver)
// Each scene = a sky layer and a transparent landscape layer, both wider than the screen: they pan at different speeds
// (parallax) with a slow zoom, with animated extras in between (sun, clouds, aurora, stars, surf) and a place name bottom-left.
const tvState = { on: false, scene: 0, t0: 0, last: 0 };
const TVS = { W: 960, H: 540 };
const tvCanvas = document.createElement('canvas'); tvCanvas.width = TVS.W; tvCanvas.height = TVS.H;
const tvCtx = tvCanvas.getContext('2d');
const aerTex = new THREE.CanvasTexture(tvCanvas); aerTex.colorSpace = THREE.SRGBColorSpace;
MATS.tvOn = new THREE.MeshBasicMaterial({ map: aerTex, toneMapped: false });
const tvGlow = new THREE.RectAreaLight(0xbfd2ff, 0, TVW.W, TVW.H); scene.add(tvGlow);
function tvLayer(w, draw) { const c = document.createElement('canvas'); c.width = w; c.height = TVS.H; draw(c.getContext('2d'), w, TVS.H); return c; }
function tvRidge(g, w, H, base, amp, rough, seed, fill, sharp = 1) {
  // midpoint-displacement ridge line, filled down to the bottom
  const r = rng(seed), n = 257, ys = new Array(n).fill(0);
  let step = n - 1, a = amp; ys[0] = r() * amp - amp / 2; ys[n - 1] = r() * amp - amp / 2;
  while (step > 1) { const h = step / 2; for (let i = h; i < n; i += step) ys[i] = (ys[i - h] + ys[i + h]) / 2 + (r() - 0.5) * a; a *= rough; step = h; }
  g.beginPath(); g.moveTo(0, H);
  for (let i = 0; i < n; i++) g.lineTo((i / (n - 1)) * w, base - Math.sign(ys[i]) * Math.pow(Math.abs(ys[i]) / amp, sharp) * amp);
  g.lineTo(w, H); g.closePath(); g.fillStyle = fill; g.fill();
}
function tvGrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
const tvCloud = tvLayer(256, (g) => { for (let i = 0; i < 9; i++) { const x = 40 + i * 22, y = 150 - Math.sin(i / 8 * Math.PI) * 50, r = 38 + Math.sin(i) * 12;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 540); } });
function tvClouds(g, t, tint, alpha, y0, y1, seed, speed) {
  const r = rng(seed); g.save(); g.globalAlpha = alpha;
  for (let i = 0; i < 7; i++) { const w = 260 + r() * 260, x = ((r() * 1400 + t * speed * (0.6 + r() * 0.8)) % 1500) - 300, y = y0 + r() * (y1 - y0) - 120;
    g.drawImage(tvCloud, x, y, w, w * 0.55 * 2.1); }
  if (tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = alpha * 0.35; g.fillStyle = tint; g.fillRect(0, 0, TVS.W, TVS.H); }
  g.restore();
}
const TV_SCENES = [
  { name: 'Dolomites, Italy', sky: tvLayer(1100, (g, w, H) => { g.fillStyle = tvGrad(g, 0, H * 0.7, [[0, '#23305e'], [0.55, '#c9798a'], [1, '#f6c592']]); g.fillRect(0, 0, w, H); }),
    land: tvLayer(1300, (g, w, H) => {
      tvRidge(g, w, H, H * 0.52, 190, 0.56, 11, '#b88aa0', 1.25);
      tvRidge(g, w, H, H * 0.62, 120, 0.55, 12, tvGrad(g, H * 0.4, H, [[0, '#7c5c7e'], [1, '#4a3c5a']]));
      tvRidge(g, w, H, H * 0.74, 70, 0.5, 13, tvGrad(g, H * 0.6, H, [[0, '#3b3450'], [1, '#262334']]));
      tvRidge(g, w, H, H * 0.86, 30, 0.45, 14, '#1b2226'); }),
    back: (g, t) => { const x = 600 - t * 1.2, y = 330 - t * 0.9, gr = g.createRadialGradient(x, y, 0, x, y, 260); gr.addColorStop(0, 'rgba(255,236,190,0.95)'); gr.addColorStop(0.08, 'rgba(255,214,160,0.7)'); gr.addColorStop(1, 'rgba(255,190,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, TVS.W, TVS.H);
      tvClouds(g, t, '#ffb7a0', 0.8, 60, 200, 5, 9); },
    front: (g, t) => { g.save(); g.globalAlpha = 0.25 + 0.05 * Math.sin(t * 0.3); g.fillStyle = tvGrad(g, 380, 540, [[0, 'rgba(255,220,200,0)'], [0.4, 'rgba(255,220,210,0.55)'], [1, 'rgba(255,220,210,0)']]); g.fillRect(0, 380, TVS.W, 160); g.restore(); } },
  { name: 'Lofoten, Norway', sky: tvLayer(1100, (g, w, H) => { g.fillStyle = tvGrad(g, 0, H * 0.75, [[0, '#02040c'], [0.7, '#0b1e33'], [1, '#17344a']]); g.fillRect(0, 0, w, H);
      const r = rng(3); for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`; g.fillRect(r() * w, r() * H * 0.7, r() < 0.1 ? 2 : 1, r() < 0.1 ? 2 : 1); } }),
    land: tvLayer(1300, (g, w, H) => {
      tvRidge(g, w, H, H * 0.6, 170, 0.55, 21, '#0d1720', 1.4);
      tvRidge(g, w, H, H * 0.6, 170, 0.55, 21, 'rgba(0,0,0,0)');
      g.fillStyle = tvGrad(g, H * 0.72, H, [[0, '#0f2436'], [1, '#050b12']]); g.fillRect(0, H * 0.72, w, H * 0.28);          // fjord
      tvRidge(g, w, H, H * 0.78, 40, 0.5, 22, '#05080c');
      const r = rng(9); for (let i = 0; i < 26; i++) { const x = r() * w, y = H * 0.775 + r() * 6; g.fillStyle = '#f0c27a'; g.fillRect(x, y, 3, 3); g.fillStyle = 'rgba(240,194,122,0.25)'; g.fillRect(x, y + 6, 3, 20); } }),
    back: (g, t) => { g.save(); g.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) for (let x = -20; x < TVS.W + 20; x += 3) {
        const y = 150 + b * 45 + Math.sin(x * 0.006 + t * 0.25 + b * 1.7) * 40 + Math.sin(x * 0.017 - t * 0.4 + b) * 14, h = 90 + 60 * Math.sin(x * 0.011 + t * 0.35 + b * 2.1) ** 2;
        const a = 0.06 + 0.05 * Math.sin(x * 0.02 + t * 0.9 + b * 3);
        const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, 'rgba(120,80,255,0)'); gr.addColorStop(0.6, `rgba(60,255,160,${a})`); gr.addColorStop(1, `rgba(40,255,140,${a * 1.6})`);
        g.fillStyle = gr; g.fillRect(x, y - h, 3, h); }
      g.restore(); },
    front: (g, t) => { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18;
      for (let i = 0; i < 40; i++) { const x = (i * 97 + t * 6) % TVS.W, y = 420 + (i * 37) % 110; g.fillStyle = '#3cffa0'; g.fillRect(x, y, 30 + (i % 5) * 12, 1); }
      g.restore(); } },
  { name: 'Faroe Islands', sky: tvLayer(1100, (g, w, H) => { g.fillStyle = tvGrad(g, 0, H * 0.55, [[0, '#8e9faa'], [1, '#e6ecec']]); g.fillRect(0, 0, w, H); }),
    land: tvLayer(1300, (g, w, H) => {
      g.fillStyle = tvGrad(g, H * 0.5, H, [[0, '#6f8f99'], [1, '#2f4f5a']]); g.fillRect(0, H * 0.5, w, H * 0.5);                 // sea
      tvRidge(g, w * 0.5, H, H * 0.47, 40, 0.5, 31, '#8aa0a3'); g.save(); g.translate(w * 0.62, 0); tvRidge(g, w * 0.4, H, H * 0.45, 50, 0.5, 32, '#7f9698'); g.restore();   // far islands
      g.beginPath(); g.moveTo(0, H * 0.28); g.bezierCurveTo(w * 0.2, H * 0.22, w * 0.34, H * 0.3, w * 0.42, H * 0.36); g.lineTo(w * 0.43, H); g.lineTo(0, H); g.closePath();
      g.fillStyle = tvGrad(g, H * 0.22, H * 0.45, [[0, '#6f9a4f'], [1, '#3f6b36']]); g.fill();                                   // grassy top
      g.beginPath(); g.moveTo(w * 0.42, H * 0.36); g.lineTo(w * 0.43, H); g.lineTo(w * 0.33, H); g.lineTo(w * 0.36, H * 0.42); g.closePath(); g.fillStyle = '#2b332f'; g.fill();   // cliff face
      g.beginPath(); g.moveTo(w, H * 0.35); g.bezierCurveTo(w * 0.9, H * 0.32, w * 0.84, H * 0.44, w * 0.8, H * 0.6); g.lineTo(w, H * 0.62); g.closePath(); g.fillStyle = '#35553a'; g.fill(); }),
    back: (g, t) => tvClouds(g, t, null, 0.9, 30, 190, 7, 14),
    front: (g, t) => { g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
      for (let i = 0; i < 70; i++) { const y = 290 + (i * 23) % 250, x = ((i * 131) % TVS.W + t * (4 + y / 60)) % (TVS.W + 60) - 30, l = 10 + y / 20, s = Math.sin(t * 1.3 + i) * 0.5 + 0.5;
        g.globalAlpha = 0.15 + 0.35 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
      g.globalAlpha = 0.35; tvClouds(g, t * 1.5, null, 0.5, 300, 380, 8, 20); g.restore(); } },
  { name: 'Sahara, Morocco', sky: tvLayer(1100, (g, w, H) => { g.fillStyle = tvGrad(g, 0, H * 0.6, [[0, '#4d82b8'], [0.7, '#e9c48a'], [1, '#f7dfae']]); g.fillRect(0, 0, w, H); }),
    land: tvLayer(1300, (g, w, H) => {
      const dune = (base, amp, per, ph, lit, shade) => { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= w; x += 4) g.lineTo(x, base - amp * Math.pow(0.5 + 0.5 * Math.sin(x / per + ph), 1.8)); g.lineTo(w, H); g.closePath();
        const gr = g.createLinearGradient(0, base - amp, w * 0.2, base + 80); gr.addColorStop(0, lit); gr.addColorStop(1, shade); g.fillStyle = gr; g.fill(); };
      dune(H * 0.6, 50, 120, 0.3, '#e7b77a', '#c98f55'); dune(H * 0.7, 70, 170, 2.1, '#dca468', '#a8683a'); dune(H * 0.82, 80, 230, 4.0, '#d08f52', '#8a4f2a'); dune(H * 0.96, 70, 300, 1.2, '#c27d45', '#6e3b1f'); }),
    back: (g, t) => { const x = 720 - t * 0.8, y = 250 + t * 1.1, gr = g.createRadialGradient(x, y, 0, x, y, 220); gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(0.07, 'rgba(255,236,190,0.8)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, TVS.W, TVS.H); },
    front: (g, t) => { g.save(); g.globalAlpha = 0.12; g.fillStyle = '#f5d9a8';
      for (let i = 0; i < 5; i++) { const y = 320 + i * 40 + Math.sin(t * 0.5 + i) * 6; g.fillRect(0, y, TVS.W, 3 + Math.sin(t + i) * 2); } g.restore(); } },
];
const TV_DUR = 36;       // seconds per scene
function drawTV(now) {
  const el = (now - tvState.t0) / 1000, idx = Math.floor(el / TV_DUR), k = (el % TV_DUR) / TV_DUR, t = el % TV_DUR;
  const S = TV_SCENES[(tvState.scene + idx) % TV_SCENES.length], g = tvCtx, W = TVS.W, H = TVS.H;
  const p = k * k * (3 - 2 * k) * 0.8 + k * 0.2, zoom = 1.04 + 0.06 * k;
  const layer = (c, par) => { const sw = W / zoom, sh = H / zoom, sx = (c.width - sw) * (par ? p : 1 - p), sy = (H - sh) * 0.55; g.drawImage(c, sx, sy, sw, sh, 0, 0, W, H); };
  layer(S.sky, false); S.back(g, t); layer(S.land, true); S.front(g, t);
  const cap = Math.min(1, Math.max(0, (t - 2) / 1.5)) * Math.min(1, Math.max(0, (TV_DUR - 4 - t) / 1.5));
  if (cap > 0) { g.save(); g.globalAlpha = cap * 0.9; g.fillStyle = '#fff'; g.font = '500 22px -apple-system, "Helvetica Neue", Arial, sans-serif'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 8; g.fillText(S.name, 40, H - 40); g.restore(); }
  const fade = Math.min(1, t / 1.2, (TV_DUR - t) / 1.2, el / 0.8);                     // dip to black between scenes, power-on fade
  if (fade < 1) { g.fillStyle = `rgba(0,0,0,${1 - Math.max(0, fade)})`; g.fillRect(0, 0, W, H); }
  aerTex.needsUpdate = true;
  // light the room a little with the picture's average colour
  const px = g.getImageData(W / 2 - 200, H / 2 - 100, 1, 1).data, px2 = g.getImageData(W / 2 + 200, H / 2 + 100, 1, 1).data;
  tvGlow.color.setRGB((px[0] + px2[0]) / 510, (px[1] + px2[1]) / 510, (px[2] + px2[2]) / 510).convertSRGBToLinear().lerp(new THREE.Color(0xffffff), 0.4);
  tvGlow.intensity = 5 * Math.max(0, fade);
}
function setTV(on) {
  tvState.on = on; const M = liv.media; if (!M || !M.screen) return;
  M.screen.material = on ? MATS.tvOn : MATS.tvScreen;
  if (on) { tvState.t0 = performance.now(); tvState.scene = (tvState.scene + 1) % TV_SCENES.length; drawTV(tvState.t0); } else tvGlow.intensity = 0;
  showToast(on ? 'TV on · Aerial screensaver' : 'TV off');
}
function updateTV(now) {
  if (!tvState.on || now - tvState.last < 45) return;     // ~22 fps is plenty for a slow pan
  tvState.last = now; drawTV(now);
}
function placeTVGlow() {
  const M = liv.media; if (!M || !M.group) return;
  const ty = TVW.bottom + TVW.H / 2, P = M.group.position.clone().addScaledVector(M.n, TVW.off + TVW.D + 0.01).setY(ty);
  tvGlow.position.copy(P); tvGlow.lookAt(P.clone().add(M.n));
}
const mediaMover = {
  name: '65" TV + Arc + unit', anchor: () => (liv.media && liv.media.group ? liv.media.group.position.clone().addScaledVector(liv.media.n, 0.5).setY(0.6) : null),
  axis: () => liv.media.a,
  shift: (dir) => { const M = liv.media, before = M.offset; M.offset += dir * 0.05; buildMedia(); livingDims(); if (Math.abs(M.offset - before) < 1e-6) showToast('Can’t go further: end of the wall'); },
  info: () => { const M = liv.media; const c = Math.abs(M.offset) < 0.025 ? 'centred on the wall' : `${Math.round(Math.abs(M.offset) * 100)} cm towards the ${(M.offset > 0) === M.aToBalcony ? 'balcony' : 'hallway'}`;
    const UM = UNIT_MODELS[unitSel.m];
    return `${UM.note} · ${UM.price} · ${(UM.W * 100).toFixed(1)} × ${(UM.H * 100).toFixed(1)} × ${(UM.D * 100).toFixed(0)} cm · ${c} · wall ${(M.half * 2).toFixed(2)} m`; },
  title: () => `${UNIT_MODELS[unitSel.m].brand} ${UNIT_MODELS[unitSel.m].name} + 65" + Arc`,
  selects: [
    { id: 'umodel', label: 'TV unit', options: () => UNIT_MODELS.map((m) => ({ group: m.legH !== undefined ? 'Floor-standing, wood (vente-unique / Logo Møbler)' : 'Wall-hung', label: `${m.brand} ${m.name} · ${(m.W * 100).toFixed(0)} cm${m.legH !== undefined ? ` · ${Math.round((m.H + m.legH) * 100 + (m.lip ? 2.5 : m.topC ? 2 : 0))} cm high · ${m.price}` : ''}` })), get: () => unitSel.m,
      set: (i) => { unitSel.m = i; unitSel.f = 0; buildMedia(); livingDims(); buildMoverSelects(mediaMover); } },
    { id: 'ufin', label: 'Finish', options: () => UNIT_MODELS[unitSel.m].finishes.map((f) => ({ label: f.name })), get: () => unitSel.f,
      set: (i) => { unitSel.f = i; buildMedia(); livingDims(); } },
  ],
  link: () => { const UM = UNIT_MODELS[unitSel.m]; return { href: UM.finishes[unitSel.f].url, text: `${UM.brand} ${UM.name} ↗` }; },
};
// ---- sofa models to compare. Each has its own configurations (names as the shop writes them), fabrics/colours and legs.
// sided configs come as left/right: "right" = the corner / chaise / open end sits on your right standing in front of the sofa (as in the shops' drawings).
// Colours are matched by eye from the shops' swatches. (est.) marks a measure the shop doesn't list, read from its drawings.
const ILVA_SERIES = 'https://ilva.dk/stuen/serier-til-stuen/nyland-sofaserie/c-2128/';
const IKEA_P = (s) => `https://www.ikea.com/dk/da/p/${s}/`;
// ILVA Nyland, read from ilva.dk (Oct 2026): per size, the price per fabric and the variant id per legs+seat ('10' = oak legs, cold foam; '11' = oak, pocket springs; '0x' = black metal)
const NYLAND = {"fabrics":[{"g":"Austin","c":"13 Winter Moss","kind":"fladvævet","tex":"flat","hex":"0x606254","slug":"austin-13-winter-moss-stof"},{"g":"Austin","c":"15 Deep Blue","kind":"fladvævet","tex":"flat","hex":"0x37414e","slug":"austin-15-deep-blue-stof"},{"g":"Austin","c":"18 Light Grey","kind":"fladvævet","tex":"flat","hex":"0x9b999a","slug":"austin-18-l-grey-stof"},{"g":"Austin","c":"19 Anthracite","kind":"fladvævet","tex":"flat","hex":"0x636362","slug":"austin-19-anthracite-stof"},{"g":"Austin","c":"3 Antelope","kind":"fladvævet","tex":"flat","hex":"0x696458","slug":"austin-3-antelope-stof"},{"g":"Crush","c":"150 Midnight Blue","kind":"bouclé","tex":"boucle","hex":"0x2d2e32","slug":"crush-150-midnight-blue-stof"},{"g":"Crush","c":"200 Forrest Green","kind":"bouclé","tex":"boucle","hex":"0x444734","slug":"crush-200-forrest-green-stof"},{"g":"Crush","c":"210 Cappuccino","kind":"bouclé","tex":"boucle","hex":"0x442c20","slug":"crush-210-cappuccino-stof"},{"g":"Crush","c":"220 Choco","kind":"bouclé","tex":"boucle","hex":"0x1f1917","slug":"crush-220-choco-stof"},{"g":"Crush","c":"40 Taupe","kind":"bouclé","tex":"boucle","hex":"0x665a4e","slug":"crush-40-taupe-stof"},{"g":"Crush","c":"90 Offwhite","kind":"bouclé","tex":"boucle","hex":"0xc7c3bb","slug":"crush-90-offwhite-stof"},{"g":"Kentucky","c":"9 Cognac","kind":"regenereret læder","tex":"leather","hex":"0x875c3d","slug":"kentucky-9-cognac-regenereret-laeder"},{"g":"Linde","c":"209 Off White","kind":"lærredsvævning","tex":"canvas","hex":"0xcac8c2","slug":"linde-209-off-white-stof"},{"g":"Verdon","c":"281 Natural","kind":"chenille","tex":"chenille","hex":"0xc3b8a2","slug":"verdon-281-natural-stof"},{"g":"Verdon","c":"388 Taupe","kind":"chenille","tex":"chenille","hex":"0x86706a","slug":"verdon-388-taupe-stof"},{"g":"Verdon","c":"416 Sand","kind":"chenille","tex":"chenille","hex":"0xb3a28a","slug":"verdon-416-sand-stof"},{"g":"Verdon","c":"482 Grey","kind":"chenille","tex":"chenille","hex":"0xb2a89a","slug":"verdon-482-grey-stof"},{"g":"Verdon","c":"742 Ocean","kind":"chenille","tex":"chenille","hex":"0x444548","slug":"verdon-742-ocean-stof"},{"g":"Verdon","c":"966 Antracite","kind":"chenille","tex":"chenille","hex":"0x4b4b49","slug":"verdon-966-antracite-stof"},{"g":"Wave","c":"180 Moss Green","kind":"fløjl","tex":"velvet","hex":"0x7f7255","slug":"wave-180-moss-green-stof"},{"g":"Wave","c":"70 Sand","kind":"fløjl","tex":"velvet","hex":"0xa59583","slug":"wave-70-sand-stof"},{"g":"Wave","c":"80 Taupe","kind":"fløjl","tex":"velvet","hex":"0x877e6e","slug":"wave-80-taupe-stof"},{"g":"Soil","c":"90 Indigo","kind":"struktur","tex":"flat","hex":"0x4e5c5f","slug":"soil-90-indigo-stof"}],"prods":{"corner263":{"item":1069363,"p":{"0":14399,"1":14399,"2":14399,"3":14399,"4":14399,"6":15599,"7":15599,"8":15599,"9":15599,"10":15599,"11":15599,"12":14999,"13":14999,"14":14999,"15":14999,"16":14999,"19":14399,"20":14399,"21":14399},"v":{"0":{"11":"5642657763","10":"5642657803","00":"5642658633","01":"5642658593"},"1":{"01":"5643222150","00":"5642933619"},"2":{"10":"5642657799","01":"5642658589","11":"5642657759","00":"5642658629"},"3":{"11":"5642657767","00":"5642658637","10":"5642657807","01":"5642658597"},"4":{"00":"5642658641","11":"5642657771","01":"5642658601","10":"5642657811"},"6":{"00":"5643224470","01":"5643224993"},"7":{"01":"5643225059","00":"5643093018"},"8":{"01":"5643225125","00":"5643092890"},"9":{"01":"5643225188","00":"5643224539"},"10":{"00":"5643224670","01":"5643225308"},"11":{"11":"5642657735","00":"5642658605","10":"5642657775","01":"5642657815"},"12":{"00":"5643093712"},"13":{"00":"5642933635"},"14":{"01":"5643229646","11":"5643229710"},"15":{"00":"5642933655"},"16":{"00":"5642933663"},"19":{"00":"5642933623"},"20":{"00":"5642933607"},"21":{"00":"5642933631"}}},"corner303":{"item":1069394,"p":{"0":16199,"1":16199,"2":16199,"3":16199,"4":16199,"6":17399,"7":17399,"8":17399,"9":17399,"10":17399,"11":17399,"12":16799,"13":16799,"14":16799,"15":16799,"16":16799,"19":16199,"20":16199,"21":16199},"v":{"0":{"11":"5642658846","01":"5642658926","10":"5642658886","00":"5642658966"},"1":{"01":"5643222158","00":"5642936884"},"2":{"11":"5642658842","01":"5642658922","00":"5642658962","10":"5642658882"},"3":{"00":"5642658970","10":"5642658890","01":"5642658930","11":"5642658850"},"4":{"11":"5642658854","01":"5642658934","10":"5642658894","00":"5642658974"},"6":{"01":"5643225001","00":"5643224478"},"7":{"01":"5643225067","00":"5643093026"},"8":{"01":"5643225133","00":"5643092898"},"9":{"00":"5643224547","01":"5643225196"},"10":{"00":"5643224678","01":"5643225316"},"11":{"10":"5642658858","01":"5642658898","11":"5642658818","00":"5642658938"},"12":{"00":"5643093720"},"13":{"01":"5643110946","00":"5642936900"},"14":{"11":"5643229718","01":"5643229654"},"15":{"00":"5642936920"},"16":{"00":"5642936928"},"19":{"00":"5642936888"},"20":{"00":"5642936872"},"21":{"00":"5642936896"}}},"pouf263":{"item":1069451,"p":{"0":14999,"1":14999,"2":14999,"3":14999,"4":14999,"6":16199,"7":16199,"8":16199,"9":16199,"10":16199,"11":16199,"12":15599,"13":15599,"14":15599,"15":15599,"16":15599,"19":14999,"20":14999,"21":14999,"22":15599},"v":{"0":{"11":"5642660586","01":"5642660666","00":"5642660706","10":"5642660626"},"1":{"00":"5642937876","01":"5643222177"},"2":{"11":"5642660582","01":"5642660662","00":"5642660702","10":"5642660622"},"3":{"00":"5642660710","10":"5642660630","01":"5642660670","11":"5642660590"},"4":{"00":"5642660714","01":"5642660674","11":"5642660594","10":"5642660634"},"6":{"01":"5643225029","00":"5643224506"},"7":{"01":"5643225095","00":"5643093054"},"8":{"00":"5643092926","01":"5643225161"},"9":{"00":"5643224570","01":"5643225219"},"10":{"01":"5643225344","00":"5643224706"},"11":{"01":"5642660638","00":"5642660678","10":"5642660598","11":"5642660558"},"12":{"00":"5643093748"},"13":{"00":"5642937892"},"14":{"11":"5643229746","01":"5643229682"},"15":{"00":"5642937912"},"16":{"00":"5642937920"},"19":{"00":"5642937880"},"20":{"01":"5642929819","00":"5642937864"},"21":{"00":"5642937888"},"22":{"10":"5642890461"}}},"pouf303":{"item":1068328,"p":{"0":15599,"1":15599,"2":15599,"3":15599,"4":15599,"5":16799,"6":16799,"7":16799,"8":16799,"9":16799,"10":16799,"11":16799,"14":16199,"20":15599,"21":15599},"v":{"0":{"01":"5642650443"},"1":{"01":"5643222133"},"2":{"11":"5642650537","01":"5642650439"},"3":{"01":"5642638723"},"4":{"01":"5642650447","10":"5642650589"},"5":{"11":"5643223677"},"6":{"01":"5642993618"},"7":{"01":"5643225039"},"8":{"01":"5643225105"},"9":{"01":"5643225171"},"10":{"01":"5643225295"},"11":{"01":"5642650419","11":"5642650513"},"14":{"11":"5643229690","01":"5643229626"},"20":{"01":"5642961879"},"21":{"01":"5643032893"}}},"u394":{"item":1069435,"p":{"0":21599,"1":21599,"2":21599,"3":21599,"4":21599,"6":22799,"7":22799,"8":22799,"9":22799,"10":22799,"11":22799,"12":22199,"13":22199,"14":22199,"15":22199,"16":22199,"18":22199,"19":21599,"20":21599,"21":21599},"v":{"0":{"11":"5642660338","01":"5642660438","10":"5642660388","00":"5642660488"},"1":{"00":"5642937363","01":"5643222162"},"2":{"11":"5642660333","10":"5642660383","01":"5642660433","00":"5642660483"},"3":{"10":"5642660393","00":"5642660493","11":"5642660343","01":"5642660443"},"4":{"11":"5642660348","01":"5642660448","10":"5642660398","00":"5642660498"},"6":{"00":"5643224491","01":"5643225014"},"7":{"00":"5643093039","01":"5643225080"},"8":{"00":"5643092911","01":"5643225146"},"9":{"01":"5643225209","00":"5643224560"},"10":{"01":"5643225329","00":"5643224691"},"11":{"00":"5642660453","10":"5642660353","11":"5642660303","01":"5642660403"},"12":{"00":"5643093733"},"13":{"01":"5642934335","00":"5642937383"},"14":{"01":"5643229667","11":"5643229731"},"15":{"00":"5642937408"},"16":{"00":"5642937418"},"18":{"10":"5642877351"},"19":{"00":"5642937368"},"20":{"00":"5642937348"},"21":{"00":"5642937378"}}},"u354":{"item":1069430,"p":{"0":20399,"1":20399,"2":20399,"3":20399,"4":20399,"6":21599,"7":21599,"8":21599,"9":21599,"10":21599,"11":21599,"12":20999,"13":20999,"14":20999,"15":20999,"16":20999,"19":20399,"20":20399,"21":20399},"v":{"0":{"10":"5642660177","00":"5642660277","11":"5642660127","01":"5642660227"},"1":{"01":"5642833106","00":"5642937203"},"2":{"10":"5642660172","00":"5642660272","01":"5642660222","11":"5642660122"},"3":{"11":"5642660132","01":"5642660232","10":"5642660182","00":"5642660282"},"4":{"10":"5642660187","00":"5642660287","11":"5642660137","01":"5642660237"},"6":{"01":"5643225009","00":"5643224486"},"7":{"01":"5643225075","00":"5643093034"},"8":{"01":"5643225141","00":"5643092906"},"9":{"01":"5643225204","00":"5643224555"},"10":{"01":"5643225324","00":"5643224686"},"11":{"00":"5642660242","10":"5642660142","11":"5642660092","01":"5642660192"},"12":{"00":"5643093728"},"13":{"00":"5642937223","01":"5642959493"},"14":{"01":"5643229662","11":"5643229726"},"15":{"00":"5642937243"},"16":{"00":"5642937253"},"19":{"00":"5642937208"},"20":{"00":"5642937188"},"21":{"00":"5642937218"}}},"chaise271":{"item":1069253,"p":{"0":13199,"1":13199,"2":13199,"3":13199,"4":13199,"6":14399,"7":14399,"8":14399,"9":14399,"10":14399,"11":14399,"12":13799,"13":13799,"14":13799,"15":13799,"16":13799,"19":13199,"20":13199,"21":13199},"v":{"0":{"10":"5642652295","00":"5642652355","01":"5642652325","11":"5642652271"},"1":{"00":"5642933164","01":"5643222137"},"2":{"00":"5642652352","01":"5642652322","10":"5642652292","11":"5642652270"},"3":{"01":"5642652328","10":"5642652298","00":"5642652358","11":"5642652272"},"4":{"10":"5642652301","01":"5642652331","00":"5642652361","11":"5642652273"},"6":{"01":"5643038922","00":"5643224457"},"7":{"00":"5643093005","01":"5643225046"},"8":{"00":"5643092877","01":"5643225112"},"9":{"01":"5643225178","00":"5643224526"},"10":{"01":"5643225302","00":"5643224660"},"11":{"00":"5642652334","11":"5642652264","01":"5642652304","10":"5642652274"},"12":{"00":"5643093699"},"13":{"00":"5642933176"},"14":{"11":"5643229697","01":"5643229633"},"15":{"00":"5642933191"},"16":{"00":"5642933197"},"19":{"00":"5642933167"},"20":{"00":"5642933155"},"21":{"00":"5642933173"}}},"chaise311":{"item":1069266,"p":{"0":16799,"1":16799,"2":16799,"3":16799,"4":16799,"5":17999,"6":17999,"7":17999,"8":17999,"9":17999,"10":17999,"11":17999,"12":17399,"13":17399,"14":17399,"15":17399,"16":17399,"19":16799,"20":16799,"21":16799},"v":{"0":{"10":"5642657179","11":"5642657149","01":"5642657209","00":"5642657239"},"1":{"00":"5642933368","01":"5643222143"},"2":{"01":"5642657206","10":"5642657176","00":"5642657236","11":"5642657146"},"3":{"10":"5642657182","01":"5642657212","11":"5642657152","00":"5642657242"},"4":{"10":"5642657185","00":"5642657245","01":"5642657215","11":"5642657155"},"5":{"11":"5643223690"},"6":{"00":"5643224463","01":"5643224986"},"7":{"00":"5643093011","01":"5643225052"},"8":{"00":"5643092883","01":"5643225118"},"9":{"01":"5642992425","00":"5643224532"},"10":{"10":"5642895344","01":"5642977133","00":"5643224663"},"11":{"10":"5642657158","01":"5642657188","00":"5642657218","11":"5642657128"},"12":{"00":"5643093705"},"13":{"01":"5642886119","00":"5642933380"},"14":{"11":"5643229703","01":"5643229639"},"15":{"01":"5642886122","00":"5642933395"},"16":{"00":"5642933401"},"19":{"00":"5642933371"},"20":{"00":"5642933359"},"21":{"00":"5642933377"}}},"three220":{"item":1068327,"p":{"0":8099,"2":8099,"3":8099,"4":8099,"5":8699,"10":8699,"11":8699,"13":8399,"14":8399,"15":8399,"16":8399,"17":8399,"18":8399,"20":8099},"v":{"0":{"10":"5642650416","00":"5642650510"},"2":{"10":"5642650415"},"3":{"10":"5642650417"},"4":{"10":"5642650418","00":"5642650512"},"5":{"10":"5642928440"},"10":{"10":"5642882410"},"11":{"11":"5642650483","10":"5642650410"},"13":{"10":"5642933945"},"14":{"11":"5643229622"},"15":{"10":"5642933950"},"16":{"10":"5642933952"},"17":{"10":"5642933951"},"18":{"10":"5642933953"},"20":{"10":"5642933940"}}},"two180":{"item":1069239,"p":{"0":7499,"1":7499,"2":7499,"3":7499,"4":7499,"6":8099,"7":8099,"8":8099,"9":8099,"10":8099,"11":8099,"12":7799,"13":7799,"14":7799,"15":7799,"16":7799,"19":7499,"20":7499,"21":7499},"v":{"0":{"10":"5642653216","00":"5642653236","01":"5642653226","11":"5642653206"},"1":{"01":"5642823332","00":"5642934244"},"2":{"10":"5642653215","01":"5642653225","11":"5642653205","00":"5642653235"},"3":{"10":"5642653217","00":"5642653237","11":"5642653207","01":"5642653227"},"4":{"10":"5642653218","01":"5642653228","00":"5642653238","11":"5642653208"},"6":{"01":"5643224979","00":"5642894149"},"7":{"00":"5643092570","01":"5643225038"},"8":{"01":"5643225104","00":"5643092583"},"9":{"01":"5643225170","00":"5643224516"},"10":{"10":"5642911423","01":"5643225294","00":"5643224650"},"11":{"11":"5642653199","01":"5642653219","10":"5642653209","00":"5642653229"},"12":{"00":"5643092418"},"13":{"00":"5642934248"},"14":{"11":"5643229624","01":"5643229625"},"15":{"00":"5642934253"},"16":{"00":"5642934255"},"19":{"00":"5642934245"},"20":{"00":"5642913759","01":"5642961901"},"21":{"00":"5642934247"}}}},"pouf":{"1068895":{"item":1068895,"p":{"0":2699,"1":2699,"2":2699,"3":2699,"4":2699,"6":3299,"7":3299,"8":3299,"9":3299,"10":3299,"11":3299,"12":2999,"13":2999,"14":2999,"15":2999,"16":2999,"19":2699,"20":2699,"21":2699},"v":{"0":"5642652749","1":"5642823331","2":"5642652748","3":"5642652760","4":"5642652751","6":"5643224447","7":"5643092568","8":"5643092581","9":"5643224515","10":"5642977136","11":"5642652742","12":"5643092416","13":"5642934216","14":"5643092606","15":"5642886105","16":"5642934222","19":"5642934213","20":"5642934210","21":"5642934215"}},"1069440":{"item":1069440,"p":{"0":2399,"1":2399,"2":2399,"3":2399,"4":2399,"6":2999,"7":2999,"8":2999,"9":2999,"10":2999,"11":2999,"12":2699,"13":2699,"14":2699,"15":2699,"16":2699,"19":2399,"20":2399,"21":2399},"v":{"0":"5642661627","1":"5642937449","2":"5642661626","3":"5642661628","4":"5642661639","6":"5643224449","7":"5643092574","8":"5643092587","9":"5643224518","10":"5643224652","11":"5642661630","12":"5643092422","13":"5642937453","14":"5643092612","15":"5642937458","16":"5642937460","19":"5642937450","20":"5642937446","21":"5642937452"}}}};
const SOFA_MODELS = [
  { brand: 'ILVA', name: 'Nyland', url: 'https://ilva.dk/stuen/sofaer/hjoernesofaer/nyland/austin-13-winter-moss-stof/p-1069363-5642657763/', D: 0.93, defaultCfg: 4, defaultLegs: 1, ilva: true,
    side: (n) => n,
    // from the ILVA drawings: seat 47, back 82, arms ≈60 high and ≈15 wide (track arms with piping), loose pillow backs, round tapered legs no. 141 (oak) / no. 145 (black metal)
    style: { LEG: 0.14, BASE: 0.375, SEAT: 0.47, ARMH: 0.60, BACKH: 0.82, AW: 0.15, BT2: 0.17, POUF: 1.25, legR: 0.017, taper: 0.6, r: 0.028, pipe: true },
    // only the versions whose returns sit on the kitchen side, backs to the outer wall (Gianluca, 2026-10-04); ILVA's hand in the name
    configs: [
      { name: '2 Personer', L: 1.80, R: 0.93, ny: 'two180', cat: 'sofaer/2-personers-sofaer' },
      { name: '3 Personer', L: 2.20, R: 0.93, ny: 'three220', cat: 'sofaer/2-personers-sofaer' },
      { name: 'Venstrevendt sofa med chaiselong', L: 2.71, R: 1.52, sided: true, main: { t: 'chaise', R: 1.52, W: 1.0 }, ny: 'chaise271', cat: 'sofaer/chaiselongsofaer' },
      { name: 'Venstrevendt sofa med chaiselong · ekstra længde', L: 3.11, R: 1.52, sided: true, main: { t: 'chaise', R: 1.52, W: 1.0 }, ny: 'chaise311', cat: 'sofaer/chaiselongsofaer' },
      { name: 'Venstrevendt hjørnesofa', L: 2.63, R: 1.92, sided: true, main: { t: 'corner', R: 1.92 }, ny: 'corner263', cat: 'sofaer/hjoernesofaer' },
      { name: 'Venstrevendt hjørnesofa · ekstra længde', L: 3.03, R: 2.12, sided: true, main: { t: 'corner', R: 2.12 }, ny: 'corner303', cat: 'sofaer/hjoernesofaer' },
      { name: 'Venstrevendt hjørnesofa med pufafslutning', L: 2.63, R: 2.22, sided: true, main: { t: 'pouf', R: 2.22 }, ny: 'pouf263', cat: 'sofaer/hjoernesofaer' },
      { name: 'Venstrevendt hjørnesofa med pufafslutning · ekstra længde', L: 3.03, R: 2.22, sided: true, main: { t: 'pouf', R: 2.22 }, ny: 'pouf303', cat: 'sofaer/hjoernesofaer' },
      { name: 'Højrevendt hjørnesofa med chaiselong (U)', L: 3.54, R: 2.22, sided: true, main: { t: 'corner', R: 2.22 }, other: { t: 'chaise', R: 1.52, W: 1.0 }, ny: 'u354', cat: 'sofaer/hjoernesofaer' },
      { name: 'Højrevendt hjørnesofa med chaiselong (U) · ekstra længde', L: 3.94, R: 2.22, sided: true, main: { t: 'corner', R: 2.22 }, other: { t: 'chaise', R: 1.52, W: 1.0 }, ny: 'u394', cat: 'sofaer/hjoernesofaer' },
    ],
    fabrics: (() => { const out = []; for (const f of NYLAND.fabrics) { const last = out[out.length - 1]; if (last && last[0] === f.g) last[2].push([f.c, f.hex, f.tex]); else out.push([f.g, f.kind, [[f.c, f.hex, f.tex]], f.tex === 'leather' ? 0.5 : f.tex === 'velvet' ? 0.75 : 1]); } return out; })(),
    legs: [['Sort metal (no. 145)', 'black'], ['Lakeret massiv eg (no. 141)', 'oak']] },
  { brand: 'ILVA', name: 'Linea', url: 'https://ilva.dk/stuen/sofaer/hjoernesofaer/linea/austin-18-grey-stof/p-1083602-5643106935/', D: 0.88, defaultCfg: 4,
    side: (n, r) => (n.startsWith('3 Personer') ? n.replace('3 Personer', `3 Personer ${r ? 'Højrevendt' : 'Venstrevendt'}`) : `${r ? 'Højrevendt' : 'Venstrevendt'} ${n}`),
    style: { LEG: 0.16, BASE: 0.28, SEAT: 0.44, ARMH: 0.60, BACKH: 0.80, AW: 0.11, BT2: 0.15, POUF: 0.45, legR: 0.02, taper: 0.55 },
    configs: [
      { name: '2 Personer', L: 1.57, R: 0.88 },
      { name: '3 Personer', L: 2.22, R: 0.88 },
      { name: '3 Personer Med Chaiselong', L: 2.21, R: 1.49, sided: true, main: { t: 'chaise', R: 1.49, W: 0.9 } },
      { name: 'Hjørnesofa Med Chaiselong', L: 2.94, R: 2.03, sided: true, main: { t: 'chaise', R: 1.49, W: 0.9 }, other: { t: 'corner', R: 2.03 } },
      { name: 'Hjørnesofa Med Pufafslutning', L: 2.29, R: 2.03, sided: true, main: { t: 'pouf', R: 2.03 } },
    ],
    fabrics: [
      ['Austin', 'fladvævet', [['Antelope', 0x958777], ['Anthracite', 0x6f7173], ['Deep Blue', 0x28324a], ['Grey', 0xb4b4b6], ['Ivory', 0xe2dccf], ['Taupe', 0x7d7065], ['Winter Moss', 0x676d5f]], 1],
      ['Cord', 'fladvævet', [['Charcoal', 0x3d3d3f], ['Off White', 0xdcd6ca], ['Sand', 0xbfae93], ['Taupe', 0x7a6d60], ['Winter Moss', 0x646b5c]], 1],
      ['Crush', 'bouclé', [['Cappuccino', 0x4f3727], ['Forest', 0x2f3b34], ['Off White', 0xdcd6cb], ['Taupe', 0x4d4239]], 1],
      ['Kentucky', 'regenereret læder', [['Cognac', 0x7d4024]], 0.5],
      ['Linde', 'lærredsvævning', [['Okker', 0xb58a3c]], 1],
      ['Narv', 'semianilinlæder', [['Black', 0x1c1c1c]], 0.45],
      ['Rustic', 'bouclé', [['Forest', 0x3a4a3d], ['Natural', 0xcfc5b3], ['Off White', 0xe0dbd0], ['Taupe', 0x6e6257]], 1],
      ['Soil', 'fladvævet', [['Coffee', 0x4b3a2f], ['Hunter', 0x3f4a3a], ['Sand', 0xb9a88f], ['Taupe', 0x7a6c5f]], 1],
      ['Verdon', 'chenille', [['Grey', 0x9c9e9c], ['Natural', 0xb3ac9c], ['Sand', 0x9d8f7b]], 0.95],
      ['Wave', 'fløjl', [['Moss Green', 0x6e6b47], ['Royal Blue', 0x2b3f7a], ['Sand', 0xcbc0b2], ['Taupe', 0x7a7366]], 0.75],
    ],
    legs: [['Eg', 'oak']] },
  { brand: 'IKEA', name: 'EKHOLMA', url: IKEA_P('ekholma-hjornesofa-4-pers-med-aben-ende-hakebo-beige-s59562970'), D: 0.85, defaultCfg: 2,
    side: (n, r) => `${n} (${r ? 'åben ende højre' : 'åben ende venstre'})`,
    style: { LEG: 0.15, BASE: 0.32, SEAT: 0.49, ARMH: 0.62, BACKH: 0.90, AW: 0.09, BT2: 0.14, POUF: 0.62, legR: 0.014, taper: 0.9 },
    configs: [
      { name: '2-pers. sofa', L: 1.67, R: 0.85, url: IKEA_P('ekholma-2-pers-sofa-hakebo-morkegra-s99535588') },
      { name: '3-pers. sofa', L: 2.07, R: 0.85, url: IKEA_P('ekholma-3-pers-sofa-kilanda-rodbrun-s29535596') },
      { name: 'hjørnesofa, 4-pers., med åben ende', L: 2.36, R: 1.95, sided: true, main: { t: 'pouf', R: 1.95 } },
    ],
    fabrics: [['', 'betræk', [['Hakebo beige', 0xbfb3a0], ['Hakebo mørkegrå', 0x4a4b4d], ['Kilanda rødbrun', 0x7a3e2c], ['Kilanda lys beige', 0xd6ccb9], ['Hemmesta grågrøn', 0x7c8573], ['Hemmesta gråbeige', 0xa9a192]], 1]],
    legs: [['Standard', 'black']] },
  { brand: 'IKEA', name: 'LILLEHEM', url: IKEA_P('lillehem-modulopb-hjornesofa-4-p-vissle-beige-metal-s79536169'), D: 0.76, defaultCfg: 6,
    side: (n, r) => `${n} (${r ? 'højre' : 'venstre'})`,
    style: { LEG: 0.10, BASE: 0.26, SEAT: 0.42, ARMH: 0.55, BACKH: 0.73, AW: 0.04, BT2: 0.12, POUF: 0.4, legR: 0.018, taper: 1, frame: true },
    configs: [
      { name: '2-pers. modulopbygget sofa', L: 1.52, R: 0.76, url: IKEA_P('lillehem-2-pers-modulopbygget-sofa-gunnared-morkegra-trae-s99471261') },
      { name: '3-pers. modulopbygget sofa', L: 2.24, R: 0.76, url: IKEA_P('lillehem-3-pers-modulopbygget-sofa-gunnared-rodbrun-metal-s99617782') },
      { name: '4-pers. modulopbygget sofa', L: 2.96, R: 0.76, url: IKEA_P('lillehem-4-pers-modulopbygget-sofa-gunnared-rodbrun-trae-s99536031') },
      { name: '6-pers. modulopbygget sofa', L: 4.40, R: 0.80, url: IKEA_P('lillehem-6-pers-modulopbygget-sofa-gunnared-rodbrun-trae-s89536201') },
      { name: '3-pers. modulsofa med chaiselong', L: 2.24, R: 1.48, sided: true, main: { t: 'chaise', R: 1.48, W: 0.76 }, url: IKEA_P('lillehem-3-pers-modulsofa-med-chaiselong-gunnared-rodbrun-trae-s89568292'), est: 'chaise length' },
      { name: 'modulopbygget hjørnesofa (3 moduler)', L: 1.48, R: 1.48, sided: true, main: { t: 'corner', R: 1.48 }, url: 'https://www.ikea.com/dk/da/search/?q=lillehem%20hj%C3%B8rnesofa' },
      { name: 'modulopb hjørnesofa 4-p', L: 2.24, R: 2.24, sided: true, main: { t: 'corner', R: 2.24 }, url: IKEA_P('lillehem-modulopb-hjornesofa-4-p-vissle-beige-metal-s79536169') },
    ],
    fabrics: [['', 'betræk', [['Vissle beige', 0xc8bba5], ['Gunnared mørkegrå', 0x4b4c4e], ['Gunnared rødbrun', 0x7b4a3a]], 1]],
    legs: [['Træ', 'oak'], ['Metal', 'black']] },
  { brand: 'IKEA', name: 'EKTORP', url: IKEA_P('ektorp-hjornesofa-4-pers-blekinge-hvid-s69628659'), D: 0.88, defaultCfg: 3,
    side: (n, r) => `${n} (${r ? 'højre' : 'venstre'})`,
    style: { LEG: 0.06, BASE: 0.26, SEAT: 0.45, ARMH: 0.64, BACKH: 0.88, AW: 0.20, BT2: 0.18, POUF: 0.4, legR: 0.02, taper: 1 },
    configs: [
      { name: '2-pers. sofa', L: 1.79, R: 0.88, url: 'https://www.ikea.com/dk/da/search/?q=ektorp%202-pers%20sofa' },
      { name: '3-pers. sofa', L: 2.18, R: 0.88, url: 'https://www.ikea.com/dk/da/search/?q=ektorp%203-pers%20sofa' },
      { name: '3-pers. sofa med chaiselong', L: 2.52, R: 1.63, sided: true, main: { t: 'chaise', R: 1.63, W: 0.9 }, url: IKEA_P('ektorp-3-pers-sofa-med-chaiselong-blekinge-hvid-s69627966'), est: 'chaise length' },
      { name: 'hjørnesofa 4-pers.', L: 2.43, R: 2.43, sided: true, main: { t: 'corner', R: 2.43 }, url: IKEA_P('ektorp-hjornesofa-4-pers-blekinge-hvid-s69628659') },
    ],
    fabrics: [['', 'betræk', [['Blekinge hvid', 0xeeece6], ['Kilanda mørkeblå', 0x2a3550], ['Kilanda lys beige', 0xd6ccb9], ['Hakebo grågrøn', 0x7e8a7a], ['Hakebo mørkegrå', 0x4a4b4d], ['Tallmyra beige', 0xc9bca6], ['Mångbyn brun/flerfarvet', 0x7b5b45], ['Alhamn mørk gul-brun', 0x8a6a2e], ['Näggen grågrøn', 0x6f7a6c]], 1]],
    legs: [['Standard', 'black']] },
  { brand: 'Muuto', name: 'Outline', url: 'https://www.muuto.com/product/Outline-Corner-Sofa/', D: 0.84, defaultCfg: 4,
    side: (n, r) => `${n} (${r ? 'right' : 'left'})`,
    style: { LEG: 0.10, BASE: 0.24, SEAT: 0.40, ARMH: 0.60, BACKH: 0.71, AW: 0.08, BT2: 0.10, POUF: 0.4, legR: 0.011, taper: 0.7 },
    configs: [
      { name: '2 Seater', L: 1.70, R: 0.84, url: 'https://www.muuto.com/product/Outline-Sofa-2-Seater/' },
      { name: '3 Seater', L: 2.20, R: 0.84, url: 'https://www.muuto.com/product/Outline-Sofa-3-Seater/' },
      { name: '3½ Seater', L: 2.54, R: 0.84, url: 'https://www.muuto.com/product/Outline-Sofa-3-5-Seater/' },
      { name: 'Chaise Longue', L: 2.63, R: 1.42, sided: true, main: { t: 'chaise', R: 1.42, W: 0.85 }, url: 'https://www.muuto.com/product/Outline-Sofa-Chaise-Longue/' },
      { name: 'Corner Sofa', L: 2.55, R: 2.55, sided: true, main: { t: 'corner', R: 2.55 }, url: 'https://www.muuto.com/product/Outline-Corner-Sofa/' },
    ],
    fabrics: [
      ['Ocean', 'textile', [['Mud', 0x7c6f60], ['Grey', 0x8e8e8c], ['Dark grey', 0x4c4c4e], ['Dove grey', 0xb5b3ae], ['Dark brown', 0x4a3a2f], ['Black', 0x1f1f20], ['Dark green', 0x33443a]], 1],
      ['Fiord', 'textile', [['151', 0xbdbab3]], 1],
      ['Refine', 'leather', [['Cognac', 0x8a4a28], ['Black', 0x1a1a1a], ['Stone', 0xb9ae9e], ['Camel', 0xa9784a]], 0.45],
    ],
    legs: [['Black aluminium', 'black'], ['Polished aluminium', 'chrome']] },
];
let SOFAS, FABRICS, LEGS, SD, SSTY, SMODEL;
function useModel(i) {
  SMODEL = SOFA_MODELS[i]; SOFAS = SMODEL.configs; SD = SMODEL.D; SSTY = SMODEL.style;
  FABRICS = SMODEL.fabrics.flatMap(([g, kind, cols, rough]) => cols.map(([c, hex, tex]) => ({ g, kind, c, hex, rough, tex: tex || fabricTexKind(kind) })));
  LEGS = SMODEL.legs.map(([n, k]) => [n, () => (k === 'oak' ? MATS.legwood : k === 'chrome' ? MATS.chromeK : MATS.blackMetal)]);
}
useModel(0);

function sofaName(S) { const c = SOFAS[S.cfg]; return c.sided ? SMODEL.side(c.name, false) : c.name; }
// ---- ILVA Nyland: availability, price and the exact product page per size × fabric × legs × seat
const NY_FILL = ['Koldskum', 'Pocketfjedre / koldskum'];
function nyProd(S) { const c = SOFAS[S.cfg]; return c.ny ? NYLAND.prods[c.ny] : null; }
function nyFix(S, quiet) {                              // keep the chosen fabric/legs/seat valid for this size; returns a note when something had to change
  const P = nyProd(S); if (!P) return '';
  let note = '';
  if (!P.v[S.fabric]) { const was = FABRICS[S.fabric]; const alt = Object.keys(P.v).map(Number).sort((a, b) => Math.abs(a - S.fabric) - Math.abs(b - S.fabric))[0]; S.fabric = alt; note = `${was.g} ${was.c} isn’t made in this size · showing ${FABRICS[alt].g} ${FABRICS[alt].c}`; }
  const V = P.v[S.fabric], want = `${S.legs}${S.fill}`;
  if (!V[want]) {
    const k = V[`${S.legs}${1 - S.fill}`] ? `${S.legs}${1 - S.fill}` : Object.keys(V)[0];
    const nl = +k[0], nf = +k[1];
    if (!note) note = nl !== S.legs ? `${FABRICS[S.fabric].c} comes with ${LEGS[nl][0].toLowerCase()} legs only here` : `${FABRICS[S.fabric].c}: seat ${NY_FILL[nf].toLowerCase()} only`;
    S.legs = nl; S.fill = nf;
  }
  if (note && !quiet) showToast(note);
  return note;
}
function nyUrl(S) {
  const c = SOFAS[S.cfg], P = nyProd(S); if (!P) return null;
  const erp = (P.v[S.fabric] || {})[`${S.legs}${S.fill}`] || Object.values(P.v[S.fabric] || {})[0];
  return `https://ilva.dk/stuen/${c.cat}/nyland/${NYLAND.fabrics[S.fabric].slug}/p-${P.item}-${erp}/`;
}
const nyKr = (v) => `${Math.round(v).toLocaleString('da-DK')} kr`;
function nyPouf(S) { if (!S.pouf) return null; const P = NYLAND.pouf[S.pouf === 1 ? '1069440' : '1068895'], f = P.p[S.fabric] ? S.fabric : 0;
  return { P, price: P.p[f], url: `https://ilva.dk/stuen/puffer-fodskamler/nyland/${NYLAND.fabrics[f].slug}/p-${P.item}-${P.v[f]}/`, size: S.pouf === 1 ? '72 × 59 × 47' : '92 × 59 × 47', missing: !P.p[S.fabric] }; }
function sofaFull(S) { return `${SMODEL.brand} ${SMODEL.name} ${sofaName(S)}`; }
function applyFabric(S) {
  const fb = FABRICS[S.fabric];
  const T = weaveTex(fb.tex), leather = fb.tex === 'leather', velvet = fb.tex === 'velvet';
  const bump = { boucle: 0.012, chenille: 0.006, flat: 0.004, canvas: 0.004, velvet: 0.0015, leather: 0.002 }[fb.tex] ?? 0.004;
  for (const [m, dl] of [[MATS.sofa, -0.01], [MATS.sofaCush, 0.015], [MATS.sofaPipe, -0.04]]) {
    m.color.setHex(fb.hex).offsetHSL(0, 0, dl); m.map = T; m.bumpMap = T; m.bumpScale = bump;
    m.roughness = leather ? 0.48 : velvet ? 0.8 : 0.97; m.sheen = leather ? 0 : velvet ? 0.8 : 0.3; m.sheenRoughness = velvet ? 0.4 : 0.8;
    m.sheenColor.setHex(fb.hex).lerp(new THREE.Color(0xffffff), velvet ? 0.25 : 0.08); m.clearcoat = leather ? 0.15 : 0; m.needsUpdate = true;
  }
}
function sofaFrame() { const M = liv.media; const f = M.n.clone().negate(); return { f, x: new THREE.Vector3().crossVectors(UP, f).normalize() }; }
function sofaEnds(cfg, side) {
  // [{s, t, R, W}] for the two ends; s = +1 is your right standing in front
  if (!cfg.sided) return [{ s: 1, t: 'arm' }, { s: -1, t: 'arm' }];
  return [{ s: side, ...cfg.main, W: cfg.main.W || SD }, { s: -side, ...(cfg.other ? { ...cfg.other, W: cfg.other.W || SD } : { t: 'arm' }) }];
}
function sofaClear(O, cfg, side) {
  const { f, x } = sofaFrame(), L = cfg.L;
  const P = (lx, lz) => O.clone().addScaledVector(x, lx).addScaledVector(f, lz).setY(0.3);
  const g = (p, d) => gapTo(p, d, 6) ?? 6;
  let worst = 9;
  for (const lz of [0.1, SD / 2, SD - 0.1]) worst = Math.min(worst, g(P(0, lz), x) - L / 2, g(P(0, lz), x.clone().negate()) - L / 2);
  for (const lx of [-L / 2 + 0.1, 0, L / 2 - 0.1]) worst = Math.min(worst, g(P(lx, SD / 2), f.clone().negate()) - SD / 2, g(P(lx, SD / 2), f) - SD / 2);
  for (const e of sofaEnds(cfg, side)) if (e.t !== 'arm') {
    const cx = e.s * (L / 2 - e.W / 2), cz = (SD + e.R) / 2;
    worst = Math.min(worst, g(P(cx, cz), f) - (e.R - SD) / 2, g(P(cx, cz), x) - e.W / 2, g(P(cx, cz), x.clone().negate()) - e.W / 2);
  }
  return worst;
}
// rounded, subdivided box with analytic normals and metric UVs (for fabric); o.top / o.front / o.side crown the faces like a filled cushion
function softBox(w, h, d, r, o = {}) {
  r = Math.max(0.002, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  const geo = new THREE.BoxGeometry(w, h, d, Math.max(2, Math.ceil(w / 0.05)), Math.max(2, Math.ceil(h / 0.05)), Math.max(2, Math.ceil(d / 0.05)));
  const P = geo.attributes.position, N = geo.attributes.normal, UVa = geo.attributes.uv, hx = w / 2, hy = h / 2, hz = d / 2;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), cl = THREE.MathUtils.clamp;
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    c.set(cl(v.x, -hx + r, hx - r), cl(v.y, -hy + r, hy - r), cl(v.z, -hz + r, hz - r));
    n.subVectors(v, c); const len = n.length(); if (len < 1e-9) n.fromBufferAttribute(N, i); else n.divideScalar(len);
    v.copy(c).addScaledVector(n, r);
    const ux = Math.max(0, 1 - (v.x / hx) ** 2), uy = Math.max(0, 1 - (v.y / hy) ** 2), uz = Math.max(0, 1 - (v.z / hz) ** 2);
    let gx = 0, gy = 0, gz = 0;
    if (o.top && n.y > 0) { const k = o.top * n.y; v.y += k * ux * uz; gx += k * uz * (-2 * v.x / hx / hx); gz += k * ux * (-2 * v.z / hz / hz); n.x -= gx * n.y; n.z -= gz * n.y; }
    if (o.front && n.z > 0) { const k = o.front * n.z; v.z += k * ux * uy; n.x -= k * uy * (-2 * v.x / hx / hx) * n.z; n.y -= k * ux * (-2 * v.y / hy / hy) * n.z; }
    if (o.side && Math.abs(n.x) > 0) { const k = o.side * Math.abs(n.x), sg = Math.sign(n.x); v.x += sg * k * uy * uz; n.y -= sg * k * uz * (-2 * v.y / hy / hy) * n.x; n.z -= sg * k * uy * (-2 * v.z / hz / hz) * n.x; }
    n.normalize();
    P.setXYZ(i, v.x, v.y, v.z); N.setXYZ(i, n.x, n.y, n.z);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    if (ay >= ax && ay >= az) UVa.setXY(i, v.x, v.z); else if (ax >= az) UVa.setXY(i, v.z, v.y); else UVa.setXY(i, v.x, v.y);
  }
  return geo;
}
function buildSofa(tryMove) {
  let S = liv.sofa; const M = liv.media; if (!M) return false;
  const { f, x } = sofaFrame();
  if (!S) {
    // back of the sofa 90 cm off the window wall (a proper walkway), centred on the TV
    const WW = wallLine([2.5, 7.6], [2.5, 4.9], [-1, 0]);
    const depth = WW ? M.base.clone().sub(WW.p).dot(WW.n) : 4.0;
    S = liv.sofa = { model: 0, cfg: SOFA_MODELS[0].defaultCfg, flip: false, fabric: 0, legs: SOFA_MODELS[0].defaultLegs ?? 0, fill: 1, pouf: 0, O: M.base.clone().addScaledVector(M.n, depth - 0.92), group: null, parts: [] };
  }
  if (S.group) { scene.remove(S.group); dropParts(S.parts); }
  applyFabric(S);
  nyFix(S, true); applyFabric(S);
  const cfg = SOFAS[S.cfg], side = -1;                // returns always on the kitchen side (left, standing in front)
  let moved = true;
  if (tryMove) { const cand = tryMove(S.O.clone()); if (sofaClear(cand, cfg, side) > 0.015) S.O = cand; else moved = false; }
  else if (sofaClear(S.O, cfg, side) <= 0.015) {
    let best = null;                                   // doesn't fit here: nearest free spot
    for (let k = 1; k <= 60 && !best; k++) for (const [dx, dz] of [[k, 0], [-k, 0], [0, k], [0, -k], [k, k], [-k, k]]) {
      const c = S.O.clone().addScaledVector(x, dx * 0.05).addScaledVector(f, dz * 0.05); if (sofaClear(c, cfg, side) > 0.015) { best = c; break; }
    }
    if (best) S.O = best;
  }
  const O = S.O, L = cfg.L;
  const g = new THREE.Group(); g.position.copy(O); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, UP, f));
  const parts = [];
  const box = (x0, x1, y0, y1, z0, z1, mat, rotX = 0) => {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(z0, z1), zb = Math.max(z0, z1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, y1 - y0, zb - za), mat); m.position.set((xa + xb) / 2, (y0 + y1) / 2, (za + zb) / 2); m.rotation.x = rotX;
    m.castShadow = m.receiveShadow = true; g.add(m); parts.push(m); return m;
  };
  const { LEG, BASE, SEAT, ARMH, BACKH, AW, BT2, POUF } = SSTY, RF = SSTY.r ?? 0.03;
  const legs = [], seatIn = {};
  // soft, upholstered pieces: rounded edges everywhere, crowned seat cushions, plump back pillows, piping on the arms
  const soft = (x0, x1, y0, y1, z0, z1, mat, r, o, rotX = 0) => {
    const xa = Math.min(x0, x1), xb = Math.max(x0, x1), za = Math.min(z0, z1), zb = Math.max(z0, z1);
    const m = new THREE.Mesh(softBox(xb - xa, y1 - y0, zb - za, r, o), mat); m.position.set((xa + xb) / 2, (y0 + y1) / 2, (za + zb) / 2); m.rotation.x = rotX;
    m.castShadow = m.receiveShadow = true; g.add(m); parts.push(m); return m;
  };
  const pipe = (pts) => {                                          // welt cord along a polyline (local coords), corners rounded
    const path = new THREE.CurvePath(), V = pts.map((q) => new THREE.Vector3(...q)), rr = 0.025;
    let prev = V[0];
    for (let k = 1; k < V.length; k++) {
      const a = V[k], last = k === V.length - 1;
      if (last) { path.add(new THREE.LineCurve3(prev, a)); break; }
      const b = V[k + 1], p1 = a.clone().add(prev.clone().sub(a).setLength(rr)), p2 = a.clone().add(b.clone().sub(a).setLength(rr));
      path.add(new THREE.LineCurve3(prev, p1)); path.add(new THREE.QuadraticBezierCurve3(p1, a, p2)); prev = p2;
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(path, 48, 0.0042, 6, false), MATS.sofaPipe); m.castShadow = false; m.receiveShadow = true; g.add(m); parts.push(m);
  };
  const armPipes = (xo, xi, z1, top) => { if (!SSTY.pipe) return; for (const xx of [xo, xi]) pipe([[xx, top - 0.012, 0.03], [xx, top - 0.012, z1 - 0.012], [xx, LEG + 0.02, z1 - 0.012]]); };
  const seatCush = (xa, xb, z0, z1) => soft(xa, xb, BASE - 0.005, SEAT - 0.012, z0, z1, MATS.sofaCush, 0.045, { top: 0.022, front: 0.012 });
  const cushRow = (xa, xb, z0, z1, seg = 0.8) => {
    const a0 = Math.min(xa, xb), a1 = Math.max(xa, xb), k = Math.max(1, Math.round((a1 - a0) / seg)), w = (a1 - a0) / k;
    for (let i = 0; i < k; i++) seatCush(a0 + i * w + 0.004, a0 + (i + 1) * w - 0.004, z0, z1);
  };
  const backRow = (xa, xb, seg = 0.8) => {
    const a0 = Math.min(xa, xb), a1 = Math.max(xa, xb), k = Math.max(1, Math.round((a1 - a0) / seg)), w = (a1 - a0) / k;
    for (let i = 0; i < k; i++) soft(a0 + i * w + 0.006, a0 + (i + 1) * w - 0.006, SEAT - 0.03, BACKH, BT2 - 0.01, BT2 + 0.19, MATS.sofaCush, 0.05, { front: 0.022, top: 0.008 }, -0.12);
  };
  const cushCol = (x0, x1, za, zb, back, seg = 0.75) => {          // seats (or back pillows) running along a return
    if (zb - za < 0.1) return;
    const k = Math.max(1, Math.round((zb - za) / seg)), w = (zb - za) / k;
    for (let i = 0; i < k; i++) {
      if (!back) { seatCush(x0, x1, za + i * w + 0.004, za + (i + 1) * w - 0.004); continue; }
      const m = soft(x0, x1, SEAT - 0.03, BACKH, za + i * w + 0.006, za + (i + 1) * w - 0.006, MATS.sofaCush, 0.05, { side: 0.022, top: 0.008 });
      m.rotation.z = Math.sign(x1 - x0) * 0.12;                    // lean outwards like the main backs
    }
  };
  soft(-L / 2, L / 2, LEG, BASE, 0, SD, MATS.sofa, 0.022);                                   // main base
  soft(-L / 2, L / 2, BASE - 0.03, 0.64, 0, BT2, MATS.sofa, RF, { top: 0.008 });             // back frame
  for (const e of sofaEnds(cfg, side)) {
    const s = e.s, ex = s * L / 2, inX = (d) => ex - s * d;
    legs.push([inX(0.06), 0.06]);
    if (e.t === 'arm') {
      soft(ex, inX(AW), LEG, ARMH, 0, SD, MATS.sofa, RF, { top: 0.006 }); armPipes(ex + s * 0.0015, inX(AW) - s * 0.0015, SD, ARMH);
      seatIn[s] = inX(AW); legs.push([inX(0.06), SD - 0.06]); continue;
    }
    soft(ex, inX(e.W), LEG, BASE, SD - 0.02, e.R, MATS.sofa, 0.022);                       // the return's base
    legs.push([inX(0.06), e.R - 0.06], [inX(e.W - 0.06), e.R - 0.06]);
    if (e.t === 'chaise') {                                                                 // arm block at the back, long open lounge in front
      soft(ex, inX(AW), LEG, ARMH, 0, SD, MATS.sofa, RF, { top: 0.006 }); armPipes(ex + s * 0.0015, inX(AW) - s * 0.0015, SD, ARMH);
      seatIn[s] = inX(AW);
      seatCush(inX(0.004), inX(e.W - 0.004), SD - 0.01, e.R + 0.008);
    } else {                                                                                // corner / pouf end: backrest along the outside
      const backEnd = e.t === 'pouf' ? e.R - POUF : e.R;
      soft(ex, inX(BT2), BASE - 0.03, 0.64, 0, backEnd, MATS.sofa, RF, { top: 0.008 }); seatIn[s] = inX(BT2);
      const seatEnd = e.t === 'corner' ? e.R - AW : e.R;
      if (e.t === 'corner') { soft(ex, inX(e.W), LEG, ARMH, e.R - AW, e.R, MATS.sofa, RF, { top: 0.006 });                     // arm cap at the end of the return
        if (SSTY.pipe) for (const zz of [e.R - AW - 0.0015, e.R + 0.0015]) pipe([[ex, ARMH - 0.012, zz], [inX(e.W - 0.012), ARMH - 0.012, zz], [inX(e.W - 0.012), LEG + 0.02, zz]]); }
      cushCol(inX(BT2), inX(e.W), SD, seatEnd + (e.t === 'pouf' ? 0.008 : 0), false);
      cushCol(inX(BT2 - 0.01), inX(BT2 + 0.19), BT2 + 0.2, e.t === 'pouf' ? backEnd : seatEnd, true);
    }
  }
  cushRow(seatIn[-1], seatIn[1], BT2 + 0.02, SD + 0.01);
  backRow(seatIn[-1], seatIn[1]);
  const legMat = LEGS[S.legs][1](), metal = legMat === MATS.blackMetal, lr = metal ? SSTY.legR * 0.7 : SSTY.legR;
  for (const [lx, lz] of legs) { const m = new THREE.Mesh(new THREE.CylinderGeometry(lr, lr * (metal ? 0.85 : SSTY.taper), LEG, 14), legMat); m.position.set(lx, LEG / 2, lz); m.castShadow = true; g.add(m); }
  // ILVA Nyland puf / fodskammel (72 or 92 × 59 × 47) in front of the seats
  if (SMODEL.ilva && S.pouf) {
    const PW = S.pouf === 1 ? 0.72 : 0.92, PD = 0.59, lims = sofaEnds(cfg, side).map((e) => (e.t === 'arm' ? e.s * L / 2 : e.s * (L / 2 - e.W)));
    const px = (lims[0] + lims[1]) / 2, z0 = SD + 0.4;
    soft(px - PW / 2, px + PW / 2, LEG, 0.37, z0, z0 + PD, MATS.sofa, 0.03);
    soft(px - PW / 2 + 0.005, px + PW / 2 - 0.005, 0.365, 0.47, z0 + 0.005, z0 + PD - 0.005, MATS.sofaCush, 0.05, { top: 0.018 });
    for (const dx of [-1, 1]) for (const dz of [0.06, PD - 0.06]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(lr, lr * (metal ? 0.85 : SSTY.taper), LEG, 14), legMat); m.position.set(px + dx * (PW / 2 - 0.06), LEG / 2, z0 + dz); m.castShadow = true; g.add(m); }
  }
  { const mg = mergeByMaterial(g); parts.length = 0; parts.push(...mg.all); }
  const door = { kind: 'swap', label: 'Sofa', parts, center: O.clone().addScaledVector(f, SD / 2).setY(0.5),
    swap: () => selectFurniture(selected === sofaMover ? null : sofaMover),
    prompt: () => (selected === sofaMover ? 'Done with the sofa' : 'Move or change the sofa') };
  for (const p of parts) { p.userData.door = door; p.userData.furniture = true; collidables.push(p); }
  const di = doors.findIndex((d) => d.kind === 'swap' && d.label === 'Sofa'); if (di >= 0) doors.splice(di, 1);
  doors.push(door);
  scene.add(g); g.updateMatrixWorld(true);
  S.group = g; S.parts = parts; S.seatIn = seatIn;
  if (typeof buildConsole === 'function' && typeof cons !== 'undefined') setTimeout(buildConsole, 0);   // the IKEA-hack console follows the sofa
  return moved;
}
function sofaGaps() {
  const S = liv.sofa, M = liv.media; if (!S || !S.group) return null;
  const cfg = SOFAS[S.cfg], side = -1, { f, x } = sofaFrame(), L = cfg.L;
  const P = (lx, lz, y = 0.35) => S.O.clone().addScaledVector(x, lx).addScaledVector(f, lz).setY(y);
  const ends = sofaEnds(cfg, side);
  // middle of the open seating (between the returns)
  const lim = ends.map((e) => (e.t === 'arm' ? e.s * L / 2 : e.s * (L / 2 - e.W)));
  const mainX = (lim[0] + lim[1]) / 2;
  const out = { rets: [] };
  out.back = { from: P(mainX, -0.005), dir: f.clone().negate() }; out.back.d = gapTo(out.back.from, out.back.dir, 5);
  out.front = { from: P(mainX, SD + 0.005), dir: f.clone() }; out.front.d = gapTo(out.front.from, out.front.dir, 5); out.front.name = hitName();
  for (const e of ends) if (e.t !== 'arm') { const r = { from: P(e.s * (L / 2 - e.W / 2), e.R + 0.005), dir: f.clone() }; r.d = gapTo(r.from, r.dir, 5); r.name = hitName(); out.rets.push(r); }
  for (const s of [1, -1]) { const k = s > 0 ? 'endP' : 'endN'; out[k] = { from: P(s * (L / 2 + 0.005), SD / 2), dir: x.clone().multiplyScalar(s) }; out[k].d = gapTo(out[k].from, out[k].dir, 5, true); out[k].name = lastGapHit && lastGapHit.material === MATS.glass ? ' to glass door' : hitName(); }
  const eye = P(mainX, 0.45, 1.1), screenOff = TVW.off + TVW.D;
  out.view = eye.clone().sub(M.group.position).dot(M.n) - screenOff; out.eye = eye;
  out.ret = out.rets[0];
  return out;
}
function livingDims() {
  livDims.clear();
  const M = liv.media;
  if (M && M.group) {
    const O = M.group.position, n = M.n, a = M.a;
    for (const sgn of [1, -1]) {
      const ed = O.clone().addScaledVector(a, sgn * UNIT.W / 2).addScaledVector(n, 0.25);
      const d = sgn > 0 ? M.half - M.offset - UNIT.W / 2 : M.half + M.offset - UNIT.W / 2;
      if (d > 0.02) livDims.add(dimLine(toBl(ed), toBl(ed.clone().addScaledVector(a, sgn * d)), `${d.toFixed(2)} m to wall end`, 0.04));
    }
    const hl = labelSprite(`TV centre ${(TVW.bottom + TVW.H / 2).toFixed(2)} m · unit ${UNIT.bottom.toFixed(2)}–${(UNIT.bottom + UNIT.H).toFixed(2)} m`, { h: 0.03 });
    hl.position.copy(O).addScaledVector(n, 0.25).setY(TVW.bottom + TVW.H + 0.14); livDims.add(hl);
  }
  const G = sofaGaps();
  if (G) {
    const Y = 0.04;
    const line = (o, lbl) => { if (o && o.d !== null && o.d !== undefined) livDims.add(dimLine(toBl(o.from), toBl(o.from.clone().addScaledVector(o.dir, o.d)), lbl(o.d, o.name || ''), Y)); };
    line(G.back, (d) => `${d.toFixed(2)} m walkway behind${d < 0.8 ? ' (tight)' : ''}`);
    line(G.front, (d, nm) => `${d.toFixed(2)} m${nm}`);
    for (const r of G.rets) line(r, (d, nm) => `${d.toFixed(2)} m${nm}${nm === ' to TV unit' && d < 0.6 ? ' (tight)' : ''}`);
    line(G.endP, (d, nm) => `${d.toFixed(2)} m${nm}`); line(G.endN, (d, nm) => `${d.toFixed(2)} m${nm}`);
    const S = liv.sofa, cfg = SOFAS[S.cfg], fb = FABRICS[S.fabric];
    const tag = labelSprite(`${sofaFull(S)} ${Math.round(cfg.L * 100)} × ${Math.round(cfg.R * 100)} cm · ${fb.g} ${fb.c} · ${G.view.toFixed(1)} m to screen`, { h: 0.03 });
    tag.position.copy(G.eye).setY(1.25); livDims.add(tag);
  }
}
const sofaMover = {
  name: 'Sofa', anchor: () => (liv.sofa && liv.sofa.group ? liv.sofa.O.clone().addScaledVector(sofaFrame().f, SD / 2).setY(1.1) : null),
  axis: () => sofaFrame().x, axis2: () => sofaFrame().f,
  title: () => sofaFull(liv.sofa),
  link: () => { const S = liv.sofa, u = nyUrl(S), pf = SMODEL.ilva ? nyPouf(S) : null;
    const L = { href: u || SOFAS[S.cfg].url || SMODEL.url, text: u ? `ILVA · Nyland in ${FABRICS[S.fabric].c} · ${nyKr(nyProd(S).p[S.fabric])} ↗` : `${SMODEL.brand} product page ↗` };
    if (pf) { L.href2 = pf.url; L.text2 = `ILVA · Nyland puf ${pf.size} · ${nyKr(pf.price)} ↗`; } return L; },
  shift: (dir) => { if (!buildSofa((O) => O.addScaledVector(sofaFrame().x, dir * 0.05))) showToast('Can’t go further: wall or furniture'); livingDims(); },
  shift2: (dir) => { if (!buildSofa((O) => O.addScaledVector(sofaFrame().f, dir * 0.05))) showToast('Can’t go further: wall or furniture'); livingDims(); },
  info: () => { const G = sofaGaps(), S = liv.sofa, cfg = SOFAS[S.cfg], P = nyProd(S), pf = SMODEL.ilva ? nyPouf(S) : null;
    const price = P ? ` · ${nyKr(P.p[S.fabric])}${pf ? ` + puf ${nyKr(pf.price)}` : ''} · seat ${NY_FILL[S.fill].toLowerCase()}` : '';
    return `L ${Math.round(cfg.L * 100)} × D ${Math.round(cfg.R * 100)} cm${price} · ${G && G.back.d !== null ? G.back.d.toFixed(2) : '–'} m behind · ${G && G.front.d !== null ? G.front.d.toFixed(2) : '–'} m to TV unit · ${G ? G.view.toFixed(1) : '–'} m to screen${pf && pf.missing ? ' · puf not made in this fabric (price shown for Winter Moss)' : ''}`; },
  // chosen (Gianluca, 2026-10-07): ILVA Nyland venstrevendt hjørnesofa 263 × 192, Austin 13 Winter Moss, lakeret massiv eg legs (no. 141),
  // pocketfjedre / koldskum seat, no puf. The choices are gone; the panel shows the order read-only.
  get readonly() { const S = liv.sofa, c = SOFAS[S.cfg], P = nyProd(S);
    return [['Model', `${SMODEL.brand} ${SMODEL.name}`], ['Size', `${c.name} · ${Math.round(c.L * 100)} × ${Math.round(c.R * 100)} cm`], ['Fabric & colour', `${FABRICS[S.fabric].g} ${FABRICS[S.fabric].c}`],
      ['Legs', LEGS[S.legs][0]], ['Seat', NY_FILL[S.fill]], ['Puf / fodskammel', 'None'], ['Price', P ? nyKr(P.p[S.fabric]) : '–']]; },
  get selects() { return []; },
};
