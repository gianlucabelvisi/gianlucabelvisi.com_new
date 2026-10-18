import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
// fast raycasts (walking collisions, door picking, distance markers) through a BVH on the big merged model meshes
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const PLAN = __PLAN__;
const $ = (id) => document.getElementById(id);
const coarse = matchMedia('(pointer: coarse)').matches;
const lite = coarse || location.search.includes('lite');
const EYE = 1.62, RADIUS = 0.28;
// Blender (x, y up-plan, z) -> three (x, z, -y)
const b2t = (x, y, z = 0) => new THREE.Vector3(x, z, -y);
const CENTER = b2t(5.3, 4.8, 0);

// ------------------------------------------------------------ renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.debug.checkShaderErrors = /[?&]debug/.test(location.search);   // perf: the checks force a sync wait on every shader compile
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;              // redrawn only when the scene, the sun or a door changes (see frame())
let shadowDirty = true;
$('stage').appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;

const scene = new THREE.Scene();
{ const add = scene.add.bind(scene), rem = scene.remove.bind(scene);
  scene.add = (...o) => { shadowDirty = true; return add(...o); }; scene.remove = (...o) => { shadowDirty = true; return rem(...o); }; }
const camera = new THREE.PerspectiveCamera(coarse ? 66 : 60, 1, 0.05, 6000);
camera.rotation.order = 'YXZ';

const sky = new Sky();
sky.scale.setScalar(4000);
Object.assign(sky.material.uniforms, {});
sky.material.uniforms.turbidity.value = 1.3;
sky.material.uniforms.rayleigh.value = 3.2;
sky.material.uniforms.mieCoefficient.value = 0.0018;
sky.material.uniforms.mieDirectionalG.value = 0.8;
// deeper, bluer daytime sky: tone the physical sky down a touch and push its saturation (the raw shader washes out to white under ACES)
sky.material.uniforms.skyGain = { value: 0.56 };
sky.material.fragmentShader = sky.material.fragmentShader.replace('varying vec3 vWorldPosition;', 'varying vec3 vWorldPosition;\nuniform float skyGain;')
  .replace(/gl_FragColor = vec4\( (\w+), 1\.0 \);/, (m, v) => `vec3 sc = mix( vec3( dot( ${v}, vec3( 0.3333 ) ) ), ${v}, 1.7 ); gl_FragColor = vec4( max( sc, 0.0 ) * skyGain, 1.0 );`);
sky.material.needsUpdate = true;
scene.add(sky);
const skyScene = new THREE.Scene();
const skyForEnv = new Sky();
skyForEnv.scale.setScalar(4000);
skyForEnv.material.uniforms.turbidity.value = 1.6;
skyForEnv.material.uniforms.rayleigh.value = 3.0;
skyScene.add(skyForEnv);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;

const sun = new THREE.DirectionalLight(0xfff1dc, 3.4);
sun.castShadow = true;
sun.shadow.mapSize.set(lite ? 2048 : 4096, lite ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 80 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
sun.target.position.copy(CENTER);
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xe4ecf7, 0x8c6c4c, 0.45);
scene.add(hemi);

// ------------------------------------------------------------ procedural textures
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function canvasTex(w, h, draw, repeatMetres, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / repeatMetres[0], 1 / repeatMetres[1]);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function grain(g, x, y, w, h, r, base, n, strength) {
  for (let k = 0; k < n; k++) {
    const gx = x + r() * w, amp = 1 + r() * 3, freq = 0.004 + r() * 0.01, ph = r() * 6;
    g.strokeStyle = `rgba(${base},${(0.04 + r() * strength).toFixed(3)})`;
    g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath();
    for (let yy = y; yy <= y + h; yy += 8) g.lineTo(gx + Math.sin(yy * freq + ph) * amp, yy);
    g.stroke();
  }
}
// oak floorboards: 2.4 m square tile, 20 cm planks running along v
const floorTex = canvasTex(2048, 2048, (g, W) => {
  const r = rng(7), pxm = W / 2.4, pw = 0.2 * pxm;
  g.fillStyle = '#6b4a2c'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 12; i++) {
    let y = -r() * 2.0 * pxm;
    while (y < W) {
      const len = (1.3 + r() * 1.1) * pxm;
      const tone = 0.93 + r() * 0.12;
      const col = [196 * tone, 146 * tone, 96 * tone].map((v) => Math.round(v));
      for (const off of [0, W]) {
        const yy = y - off;
        if (yy + len < 0 || yy > W) continue;
        g.fillStyle = `rgb(${col})`;
        g.fillRect(i * pw + 1.2, yy + 1.2, pw - 2.4, len - 2.4);
        g.save(); g.beginPath(); g.rect(i * pw + 1.2, yy + 1.2, pw - 2.4, len - 2.4); g.clip();
        grain(g, i * pw, yy, pw, len, r, '70,42,20', 26, 0.16);
        grain(g, i * pw, yy, pw, len, r, '235,200,150', 10, 0.10);
        if (r() < 0.12) { // knot
          const kx = i * pw + pw * (0.2 + r() * 0.6), ky = yy + r() * len;
          const kg = g.createRadialGradient(kx, ky, 0, kx, ky, 7 + r() * 8);
          kg.addColorStop(0, 'rgba(60,34,16,.75)'); kg.addColorStop(1, 'rgba(60,34,16,0)');
          g.fillStyle = kg; g.fillRect(kx - 20, ky - 20, 40, 40);
        }
        g.restore();
      }
      y += len;
    }
  }
}, [2.4, 2.4]);
// oak veneer for the kitchen: vertical grain, 1 m tile
const veneerTex = canvasTex(1024, 1024, (g, W) => {
  const r = rng(11);
  const grd = g.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, '#be8a55'); grd.addColorStop(0.5, '#c9975f'); grd.addColorStop(1, '#be8a55');
  g.fillStyle = grd; g.fillRect(0, 0, W, W);
  grain(g, 0, -20, W, W + 40, r, '120,78,40', 140, 0.14);
  grain(g, 0, -20, W, W + 40, r, '240,205,160', 50, 0.10);
}, [1, 1]);
const tileTex = canvasTex(1024, 1024, (g, W) => {
  const r = rng(3), t = W / 2;
  g.fillStyle = '#8f8374'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const s = 0.94 + r() * 0.08;
    g.fillStyle = `rgb(${[150 * s, 138 * s, 122 * s].map(Math.round)})`;
    g.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
  }
}, [1.2, 1.2]);

const std = (o) => new THREE.MeshStandardMaterial(o);
// perf: shared materials for static furniture (same look → same material → merged into one draw call). Never mutate a stdc() material.
const _stdc = new Map();
const stdc = (o) => { const k = Object.keys(o).sort().map((key) => { const v = o[key]; return key + ':' + (v && v.isTexture ? v.uuid : v && v.isColor ? v.getHex() : v); }).join('|');   // (no JSON.stringify: textures would serialise their canvases)
  let m = _stdc.get(k); if (!m) { m = std(o); _stdc.set(k, m); } return m; };
const MATS = {
  floor: std({ map: floorTex, roughness: 0.55, envMapIntensity: 0.6 }),
  oak: std({ map: veneerTex, roughness: 0.6, envMapIntensity: 0.6 }),
  wall: std({ color: 0xebe8e2, roughness: 0.92 }),
  ceiling: std({ color: 0xf0eeea, roughness: 0.95 }),
  frame: std({ color: 0xf1f0ec, roughness: 0.45 }),
  door: std({ color: 0xdfddd7, roughness: 0.4 }),   // a touch darker than the walls so the leaves read
  worktop: std({ color: 0xeeebe6, roughness: 0.25 }),
  black: std({ color: 0x0b0b0c, roughness: 0.12, metalness: 0.2 }),
  steel: std({ color: 0xcfd1d4, roughness: 0.25, metalness: 1 }),
  galv: std({ color: 0x9fa3a6, roughness: 0.45, metalness: 0.85 }),
  concrete: std({ color: 0xa39d95, roughness: 0.9 }),
  tile: std({ map: tileTex, roughness: 0.45 }),
  facade: std({ color: 0x8d857b, roughness: 0.9 }),
  brickyellow: std({ color: 0xc4ab85, roughness: 0.9 }),
  brickred: std({ color: 0x8e3f2a, roughness: 0.9 }),
  brickdark: std({ color: 0x3b3836, roughness: 0.9 }),
  water: std({ color: 0x1d3129, roughness: 0.08, metalness: 0.3 }),
  quay: std({ color: 0x9b958c, roughness: 0.95 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true,
    opacity: 0.12, envMapIntensity: 1.2, depthWrite: false }),
};

// facades of the neighbouring blocks, coloured after the site photos: 6 m tile = 2 bays x 2 storeys
function facadeTex(o) {
  return canvasTex(1024, 1024, (g, W) => {
    const r = rng(o.seed), pxm = W / 6;
    g.fillStyle = o.brick; g.fillRect(0, 0, W, W);
    if (o.style === 'tile') {        // glazed square tiles (the dark bays of our building)
      const ts = 0.3 * pxm;
      for (let yy = 0; yy < W; yy += ts) for (let xx = 0; xx < W; xx += ts) {
        const v = (r() - 0.5) * o.vary;
        g.fillStyle = `rgba(${v > 0 ? '150,170,200' : '0,0,0'},${Math.abs(v).toFixed(3)})`;
        g.fillRect(xx + 1.5, yy + 1.5, ts - 3, ts - 3);
      }
      g.fillStyle = o.mortar;
      for (let p = 0; p < W; p += ts) { g.fillRect(p, 0, 1.5, W); g.fillRect(0, p, W, 1.5); }
    } else if (o.style === 'bays') {   // lot-side facade: salmon ribbed bay (0–3 m) | light grey panel bay (3–6 m), concrete fins + floor bands
      const half = 3 * pxm;
      g.fillStyle = o.brick; g.fillRect(0, 0, half, W);
      for (let xx = 0; xx < half; xx += 0.08 * pxm) { g.fillStyle = 'rgba(0,0,0,.09)'; g.fillRect(xx, 0, 2.5, W); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(xx + 3, 0, 2, W); }
      g.fillStyle = o.panel || '#b8b7b1'; g.fillRect(half, 0, half, W);
      g.fillStyle = 'rgba(0,0,0,.08)'; for (let p = 0; p < W; p += 1.5 * pxm) g.fillRect(half, p, half, 1.5);
      g.fillStyle = o.mortar;
      for (const x of [0, half]) g.fillRect(x, 0, 0.14 * pxm, W);                                   // vertical concrete fins
      for (let p = 0; p < W; p += 3 * pxm) g.fillRect(0, W - p - 0.16 * pxm, W, 0.16 * pxm);       // floor bands
    } else if (o.style === 'stripe') { // vertical ribbed panels (the terracotta bays)
      for (let xx = 0; xx < W; xx += 0.08 * pxm) {
        g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(xx, 0, 2.5, W);
        g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(xx + 3, 0, 2, W);
      }
      g.fillStyle = o.mortar;
      for (let p = 0; p < W; p += 3 * pxm) g.fillRect(0, W - p - 0.12 * pxm, W, 0.12 * pxm);   // floor bands
    } else
    // brick courses (7.5 cm) with running bond
    for (let row = 0; row < 80; row++) {
      const y = row * 0.075 * pxm;
      g.fillStyle = o.mortar; g.fillRect(0, y, W, 1.2);
      for (let x = (row % 2) * 0.12 * pxm; x < W; x += 0.24 * pxm) {
        g.fillRect(x, y, 1.2, 0.075 * pxm);
        const v = (r() - 0.5) * o.vary;
        g.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v).toFixed(3)})`;
        g.fillRect(x + 1.2, y + 1.2, 0.24 * pxm - 1.2, 0.075 * pxm - 1.2);
        g.fillStyle = o.mortar;
      }
    }
    if (o.windows !== false) for (let bx = 0; bx < 2; bx++) for (let by = 0; by < 2; by++) {
      const [ww, wh, ws] = o.win || [1.5, 1.75, 0.9];
      const x0 = (bx * 3 + (3 - ww) / 2) * pxm, w = ww * pxm;
      const yTop = W - (by * 3 + ws + wh) * pxm, h = wh * pxm; // canvas y is flipped (v up)
      g.fillStyle = o.frame; g.fillRect(x0 - 6, yTop - 6, w + 12, h + 12);
      const gl = g.createLinearGradient(0, yTop, 0, yTop + h);
      gl.addColorStop(0, '#9fb5c4'); gl.addColorStop(0.5, '#3c4a55'); gl.addColorStop(1, '#262d33');
      g.fillStyle = gl; g.fillRect(x0, yTop, w, h);
      g.fillStyle = o.frame; g.fillRect(x0 + w / 2 - 3, yTop, 6, h);
      if (o.balcony && bx === 0) { // galvanised balcony box in front of the lower half
        const bw = 2.4 * pxm, bxl = x0 + w / 2 - bw / 2, byt = yTop + h - 1.05 * pxm;
        g.fillStyle = 'rgba(40,42,44,.35)'; g.fillRect(bxl, byt, bw, 1.15 * pxm);
        g.strokeStyle = 'rgba(165,170,174,.95)'; g.lineWidth = 3;
        for (let k = 0; k <= 22; k++) { const xx = bxl + k * bw / 22; g.beginPath(); g.moveTo(xx, byt); g.lineTo(xx, byt + 1.1 * pxm); g.stroke(); }
        g.lineWidth = 7; g.beginPath(); g.moveTo(bxl, byt); g.lineTo(bxl + bw, byt); g.stroke();
        g.fillStyle = '#8f8a84'; g.fillRect(bxl, byt + 1.1 * pxm, bw, 0.12 * pxm);
      }
    }
  }, [6, 6]);
}
MATS.brickyellow = std({ map: facadeTex({ seed: 5, brick: '#c9b18b', mortar: '#e3d8c3', frame: '#f1efe9', vary: 0.10, balcony: true }), roughness: 0.9 });
MATS.brickred = std({ map: facadeTex({ seed: 9, brick: '#914230', mortar: '#b8765f', frame: '#3b2c26', vary: 0.12, balcony: false }), roughness: 0.9 });
MATS.brickdark = std({ map: facadeTex({ seed: 13, brick: '#4a4643', mortar: '#6b6660', frame: '#2c2c2c', vary: 0.16, balcony: true }), roughness: 0.9 });
MATS.bricklight = std({ map: facadeTex({ seed: 17, brick: '#d4ccbd', mortar: '#ebe4d6', frame: '#f4f2ee', vary: 0.07, balcony: true }), roughness: 0.9 });
// our own building, from the photo taken across the canal
MATS.owntile = std({ map: facadeTex({ seed: 31, style: 'tile', brick: '#1f2531', mortar: '#4a515c', frame: '#7b3a26', vary: 0.26, win: [1.3, 2.3, 0.3], balcony: false }), roughness: 0.55, metalness: 0.05 });   // deep blue-black glazed tile (was washing out to grey)
MATS.ownterra = std({ map: facadeTex({ seed: 37, style: 'stripe', brick: '#c07a62', mortar: '#d9cdb9', frame: '#7b3a26', vary: 0.1, win: [1.3, 2.3, 0.3], balcony: true }), roughness: 0.8 });
MATS.ownbays = std({ map: facadeTex({ seed: 47, style: 'bays', brick: '#d5937b', panel: '#b9b8b1', mortar: '#dcd8ce', frame: '#4f5458', vary: 0.1, win: [1.3, 1.9, 0.6], balcony: false }), roughness: 0.85 });
MATS.owncream = std({ map: facadeTex({ seed: 43, style: 'stripe', brick: '#cdbfa6', mortar: '#e2d9c6', frame: '#7b3a26', vary: 0.05, win: [1.3, 2.3, 0.3], balcony: false }), roughness: 0.85 });
MATS.skintile = std({ map: facadeTex({ seed: 31, style: 'tile', brick: '#1f2531', mortar: '#4a515c', frame: '#7b3a26', vary: 0.26, windows: false }), roughness: 0.55, metalness: 0.05 });
MATS.railglass = new THREE.MeshPhysicalMaterial({ color: 0x6f7c83, roughness: 0.1, transparent: true, opacity: 0.2, depthWrite: false });   // lighter touch so the stacked balconies don't grey out the dark tile bay
MATS.porcelain = std({ color: 0xf2f2ef, roughness: 0.15 });
MATS.appliancepanel = std({ color: 0xd4d6d8, roughness: 0.3 });
MATS.chrome = std({ color: 0xdadde0, roughness: 0.12, metalness: 1 });
MATS.portholeglass = std({ color: 0x101316, roughness: 0.05, metalness: 0.3 });
MATS.mirror = std({ color: 0xffffff, roughness: 0.02, metalness: 1 });
MATS.showertile = std({ map: canvasTex(512, 512, (g, W) => { g.fillStyle = '#3e332b'; g.fillRect(0, 0, W, W); g.fillStyle = '#2c241e'; g.fillRect(0, W / 2 - 1, W, 2); g.fillRect(W / 2 - 1, 0, 2, W); }, [1.2, 1.2]), roughness: 0.3 });
MATS.bathwall = std({ color: 0xa9b0b2, roughness: 0.6 });
MATS.vanity = std({ map: veneerTex, color: 0x9a6a48, roughness: 0.5 });
MATS.fridgeliner = std({ color: 0xf1f3f5, roughness: 0.3 });
MATS.fridgelight = std({ color: 0xffffff, emissive: 0xfff4dd, emissiveIntensity: 2.2 });
MATS.shelfglass = new THREE.MeshPhysicalMaterial({ color: 0xcfe3e3, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
MATS.bathmirror = std({ color: 0xc3d0d6, roughness: 0.08, metalness: 0.55, envMapIntensity: 1.6 });
MATS.basin = std({ color: 0xd9dbdc, roughness: 0.2 });
MATS.towel = std({ color: 0x9aa58f, roughness: 1.0 });
MATS.bottleamber = std({ color: 0x8c5a2e, roughness: 0.25 });
MATS.terrazzo = std({ map: canvasTex(512, 512, (g, W) => { const r = rng(61); g.fillStyle = '#8e8c87'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 2600; i++) { const v = 90 + r() * 110; g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; const s = 1 + r() * 3.5; g.fillRect(r() * W, r() * W, s, s); } }, [1, 1]), roughness: 0.35 });
MATS.stairwall = std({ color: 0xcfcbc3, roughness: 0.85 });
MATS.entrybeige = std({ map: facadeTex({ seed: 51, style: 'stripe', brick: '#bdb3a0', mortar: '#d8d0c0', frame: '#7b3a26', vary: 0.05, windows: false }), roughness: 0.8 });
MATS.entryorange = std({ map: facadeTex({ seed: 53, style: 'stripe', brick: '#dd8c5c', mortar: '#e9b08a', frame: '#7b3a26', vary: 0.08, windows: false }), roughness: 0.8 });
MATS.entryconcrete = std({ color: 0x9d9990, roughness: 0.9 });
MATS.entryframe = std({ color: 0x74301a, roughness: 0.5 });
MATS.shopglass = std({ color: 0x14171a, roughness: 0.05, metalness: 0.4, emissive: 0xffd9a8, emissiveIntensity: 0.12 });
MATS.gymsign = std({ color: 0xf2f2f2, emissive: 0xffffff, emissiveIntensity: 0.6 });
MATS.asphalt = std({ color: 0x2e2f31, roughness: 0.92 });
MATS.roadpaint = std({ color: 0xe6e4dc, roughness: 0.6 });
MATS.facade = std({ map: facadeTex({ seed: 21, brick: '#b7aa98', mortar: '#d6ccbd', frame: '#f1efe9', vary: 0.08, balcony: false }), roughness: 0.9 });
const deckTex = floorTex.clone(); deckTex.needsUpdate = true; deckTex.repeat.set(1 / 1.6, 1 / 1.6);
MATS.deck = std({ map: deckTex, color: 0x9a7d62, roughness: 0.85 });
MATS.roof = std({ color: 0x5f5c58, roughness: 0.95 });
MATS.water.color.set(0x24392f); MATS.water.roughness = 0.04; MATS.water.metalness = 0.4;
function pickMat(k) {
  const order = [['ownbays', 'ownbays'], ['bathmirror', 'bathmirror'], ['basin', 'basin'], ['towel', 'towel'], ['bottlewhite', 'porcelain'], ['bottleamber', 'bottleamber'], ['stairterrazzo', 'terrazzo'], ['stairwall', 'stairwall'], ['entrybeige', 'entrybeige'], ['entryorange', 'entryorange'], ['entryconcrete', 'entryconcrete'], ['entryframe', 'entryframe'], ['shopglass', 'shopglass'], ['gymsign', 'gymsign'], ['asphalt', 'asphalt'], ['roadpaint', 'roadpaint'], ['sockethole', 'black'], ['socketplate', 'frame'], ['fridgelight', 'fridgelight'], ['fridgeliner', 'fridgeliner'], ['shelfglass', 'shelfglass'], ['portholeglass', 'portholeglass'], ['railglass', 'railglass'], ['owndarktile', 'owntile'], ['ownterracotta', 'ownterra'], ['owncream', 'owncream'], ['skintile', 'skintile'], ['porcelain', 'porcelain'], ['appliancepanel', 'appliancepanel'], ['chrome', 'chrome'], ['mirror', 'mirror'], ['showertile', 'showertile'], ['bathwall', 'bathwall'], ['vanityoak', 'vanity'], ['oakfloor', 'floor'], ['oakveneer', 'oak'], ['wallwhite', 'wall'], ['ceiling', 'ceiling'],
    ['windowframe', 'frame'], ['doorwhite', 'door'], ['blackglass', 'black'], ['glass', 'glass'], ['worktop', 'worktop'],
    ['steel', 'steel'], ['galvanised', 'galv'], ['concrete', 'concrete'], ['bathfloor', 'tile'], ['facade', 'facade'],
    ['brickyellow', 'brickyellow'], ['brickred', 'brickred'], ['brickdark', 'brickdark'], ['bricklight', 'bricklight'], ['deckwood', 'deck'], ['roof', 'roof'], ['water', 'water'], ['quay', 'quay']];
  for (const [needle, m] of order) if (k.includes(needle)) return MATS[m];
  return MATS.wall;
}

// ------------------------------------------------------------ load model
const collidables = [];
const pickables = [];
let ceiling = null;
const aboveMeshes = [];
let modelRoot = null;
// balcony door, as drawn on the plan: fixed glass on the left (~1.63 m), then two leaves opening outwards onto the balcony:
// a narrow one (~0.56 m) hinged on its left that swings right round against the fixed glass, and a wide one (~0.97 m) hinged at the right jamb.
// The GLB still has the old 3-pane split, so the glass and mullions of panes 2-3 are cut out of it here and rebuilt in JS.
const BAL = (() => {
  const sd = (PLAN.sliders || [])[0]; if (!sd) return null;
  const ad = sd.dir, pr = [ad[1], -ad[0]], nIn = (pr[0] * sd.n[0] + pr[1] * sd.n[1]) > 0 ? pr : [-pr[0], -pr[1]], fw = 0.06, pw = sd.w + fw * 0.5, L = pw * 3;
  const P0 = [sd.a[0] - ad[0] * fw * 0.5, sd.a[1] - ad[1] * fw * 0.5];
  return { sd, ad, nIn, fw, pw, L, P0, S1: 1.63, SM: 2.22, at: (s, d = 0) => [P0[0] + ad[0] * s + nIn[0] * d, P0[1] + ad[1] * s + nIn[1] * d] };
})();
function trimBalcony(o) {
  if (!BAL) return;
  const isGlass = o.material === MATS.glass, isFrame = o.material === MATS.frame;
  if (!isGlass && !isFrame) return;
  const g = o.geometry, pos = g.attributes.position, n = g.index ? g.index.count : pos.count;
  const idx = g.index ? g.index.array : null, keep = [];
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  let cut = 0;
  for (let t = 0; t < n; t += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, idx ? idx[t + k] : t + k).applyMatrix4(o.matrixWorld); c.add(v); }
    c.multiplyScalar(1 / 3);
    const bx = c.x - BAL.P0[0], by = -c.z - BAL.P0[1], z = c.y;
    const s = bx * BAL.ad[0] + by * BAL.ad[1], d = bx * BAL.nIn[0] + by * BAL.nIn[1];
    let drop = false;
    if (isGlass) drop = Math.abs(d) < 0.03 && s > BAL.pw - 0.05 && s < BAL.L - 0.03 && z > 0 && z < 2.5;
    else drop = Math.abs(d) < 0.05 && z > 0.15 && z < 2.3 && (Math.abs(s - BAL.pw) < 0.045 || Math.abs(s - 2 * BAL.pw) < 0.045);
    if (drop) { cut++; continue; }
    for (let k = 0; k < 3; k++) keep.push(idx ? idx[t + k] : t + k);
  }
  if (cut) g.setIndex(keep);
}
const glbBytes = Uint8Array.from(atob(document.getElementById('model').textContent.trim()), (c) => c.charCodeAt(0));
new GLTFLoader().parse(glbBytes.buffer, '', (gltf) => {
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const k = o.name.toLowerCase().replace(/[^a-z]/g, '');
    o.material = pickMat(k);
    trimBalcony(o);
    // glTF stores v flipped (v = 1 - z): turn it back into metres up the wall, shifted so the facade textures' 3 m window
    // grid lines up with the real storeys (slabs at z = 2.85 + 3k above us, -2.95 / -5.9 below), not between them
    { const uv = o.geometry.attributes.uv; if (uv) { for (let i = 0; i < uv.count; i++) uv.setY(i, 1.15 - uv.getY(i)); uv.needsUpdate = true; } }
    const isGlass = o.material === MATS.glass;
    o.castShadow = !isGlass;
    o.receiveShadow = !isGlass;
    if (k.startsWith('collide') || k.startsWith('nocollide')) o.geometry.computeBoundsTree();
    if (k.startsWith('collide')) collidables.push(o);
    if (k.includes('oakfloor') || k.includes('bathfloor') || k.includes('concrete') || k.includes('stairterrazzo')) pickables.push(o);
    if (k.startsWith('ceiling')) ceiling = o;
    if (k.startsWith('above')) aboveMeshes.push(o);
    if (isGlass) o.renderOrder = 2;
  });
  scene.add(gltf.scene);
  modelRoot = gltf.scene;
  setTimeout(() => { if (window.__afterModel) window.__afterModel(); }, 0);
  $('go').disabled = false;
  $('go').textContent = 'Start walking';
  updateSun(+$('sunrange').value, true);
}, (err) => {
  $('go').textContent = 'Could not load the 3D model. Reload the page to try again.';
  console.error(err);
});

// ------------------------------------------------------------ sun (balcony faces east; plan top = east)
const D2R = Math.PI / 180;
// the plan's "east" (balcony side) isn't true east: in reality the sun rises ~45° to the left of it, seen from the balcony (Gianluca, 2026-10-05)
const PLAN_TURN = -45;
function sunDir(h) {
  // Copenhagen, late September: sunrise ~07:10 at az 93°, sunset ~19:00 at az 267°, noon elevation ~33°
  const t = (h - 7.1) / (19.0 - 7.1);
  const el = 33 * Math.sin(Math.PI * t);   // negative below the horizon (night)
  const az = 93 + 174 * t + PLAN_TURN;
  const A = az * D2R, E = el * D2R;
  const bx = -Math.cos(A) * Math.cos(E); // plan right = south, so +x is south
  const by = Math.sin(A) * Math.cos(E);  // plan up = east
  return { v: new THREE.Vector3(bx, Math.sin(E), -by).normalize(), el };
}
// ---- the real night sky over Copenhagen (55.66° N, 12.56° E) for today's date at the slider's clock time (Danish time):
// the ~1,000 stars brighter than magnitude 4.6 (Yale/Hipparcos bright stars via d3-celestial; a city sky shows little fainter),
// sized and tinted by magnitude and colour index, plus the planets and the Moon (position + phase) from a low-precision ephemeris.
// Low-precision ephemeris (Paul Schlyter, "How to compute planetary positions"): Sun, Moon (main perturbations), Mercury–Saturn.
// Good to a few arcminutes — plenty for a sky seen from a window. Angles in degrees; d = days since 2000 Jan 0.0 UT.
const SKY_LAT = 55.66, SKY_LON = 12.56;                  // Sluseholmen, Copenhagen
const rad = Math.PI / 180, rev = (x) => ((x % 360) + 360) % 360;
const sind = (x) => Math.sin(x * rad), cosd = (x) => Math.cos(x * rad), atan2d = (y, x) => Math.atan2(y, x) / rad;
const EPH_EL = {
  sun: (d) => [0, 0, 282.9404 + 4.70935e-5 * d, 1, 0.016709 - 1.151e-9 * d, 356.0470 + 0.9856002585 * d],
  moon: (d) => [125.1228 - 0.0529538083 * d, 5.1454, 318.0634 + 0.1643573223 * d, 60.2666, 0.0549, 115.3654 + 13.0649929509 * d],
  Mercury: (d) => [48.3313 + 3.24587e-5 * d, 7.0047 + 5e-8 * d, 29.1241 + 1.01444e-5 * d, 0.387098, 0.205635 + 5.59e-10 * d, 168.6562 + 4.0923344368 * d],
  Venus: (d) => [76.6799 + 2.4659e-5 * d, 3.3946 + 2.75e-8 * d, 54.891 + 1.38374e-5 * d, 0.72333, 0.006773 - 1.302e-9 * d, 48.0052 + 1.6021302244 * d],
  Mars: (d) => [49.5574 + 2.11081e-5 * d, 1.8497 - 1.78e-8 * d, 286.5016 + 2.92961e-5 * d, 1.523688, 0.093405 + 2.516e-9 * d, 18.6021 + 0.5240207766 * d],
  Jupiter: (d) => [100.4542 + 2.76854e-5 * d, 1.303 - 1.557e-7 * d, 273.8777 + 1.64505e-5 * d, 5.20256, 0.048498 + 4.469e-9 * d, 19.895 + 0.0830853001 * d],
  Saturn: (d) => [113.6634 + 2.3898e-5 * d, 2.4886 - 1.081e-7 * d, 339.3939 + 2.97661e-5 * d, 9.55475, 0.055546 - 9.499e-9 * d, 316.967 + 0.0334442282 * d],
};
function ephOrbit([N, i, w, a, e, M]) {
  M = rev(M); let E = M + (e / rad) * sind(M) * (1 + e * cosd(M));
  for (let k = 0; k < 6; k++) E = E - (E - (e / rad) * sind(E) - M) / (1 - e * cosd(E));
  const xv = a * (cosd(E) - e), yv = a * Math.sqrt(1 - e * e) * sind(E), v = atan2d(yv, xv), r = Math.hypot(xv, yv);
  const x = r * (cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i)), y = r * (sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i)), z = r * sind(v + w) * sind(i);
  return { x, y, z, r, v, lon: rev(atan2d(y, x)), lat: atan2d(z, Math.hypot(x, y)) };
}
function ephDay(date) { return date.getTime() / 86400000 + 2440587.5 - 2451543.5; }
function eclToEq(x, y, z, d) { const ec = 23.4393 - 3.563e-7 * d; return [x, y * cosd(ec) - z * sind(ec), y * sind(ec) + z * cosd(ec)]; }
// RA/Dec (deg) → altitude/azimuth (deg, azimuth from north through east) at Copenhagen
function ephAltAz(ra, dec, d) {
  const gmst = rev(280.46061837 + 360.98564736629 * (d - 1.5)), ha = rev(gmst + SKY_LON - ra);   // d is from 2000 Jan 0.0, J2000 = d 1.5
  const sa = sind(dec) * sind(SKY_LAT) + cosd(dec) * cosd(SKY_LAT) * cosd(ha), alt = Math.asin(sa) / rad;
  const az = rev(atan2d(-sind(ha) * cosd(dec), sind(dec) * cosd(SKY_LAT) - cosd(dec) * sind(SKY_LAT) * cosd(ha)));
  return { alt, az };
}
function ephSky(date) {
  const d = ephDay(date), out = {};
  const S = ephOrbit(EPH_EL.sun(d)), sx = S.r * cosd(S.v + EPH_EL.sun(d)[2]), sy = S.r * sind(S.v + EPH_EL.sun(d)[2]);
  const slon = rev(S.v + EPH_EL.sun(d)[2]);
  const toRaDec = (x, y, z) => { const [xe, ye, ze] = eclToEq(x, y, z, d); return [rev(atan2d(ye, xe)), atan2d(ze, Math.hypot(xe, ye))]; };
  { const [ra, dec] = toRaDec(sx, sy, 0); out.sun = { ra, dec, ...ephAltAz(ra, dec, d) }; }
  // moon with the main perturbations, then topocentric parallax
  { const el = EPH_EL.moon(d), m = ephOrbit(el), Ms = rev(EPH_EL.sun(d)[5]), Mm = rev(el[5]), Ls = rev(Ms + EPH_EL.sun(d)[2]), Lm = rev(Mm + el[2] + el[0]), D = Lm - Ls, F = Lm - el[0];
    let lon = m.lon - 1.274 * sind(Mm - 2 * D) + 0.658 * sind(2 * D) - 0.186 * sind(Ms) - 0.059 * sind(2 * Mm - 2 * D) - 0.057 * sind(Mm - 2 * D + Ms) + 0.053 * sind(Mm + 2 * D)
      + 0.046 * sind(2 * D - Ms) + 0.041 * sind(Mm - Ms) - 0.035 * sind(D) - 0.031 * sind(Mm + Ms) - 0.015 * sind(2 * F - 2 * D) + 0.011 * sind(Mm - 4 * D);
    const lat = m.lat - 0.173 * sind(F - 2 * D) - 0.055 * sind(Mm - F - 2 * D) - 0.046 * sind(Mm + F - 2 * D) + 0.033 * sind(F + 2 * D) + 0.017 * sind(2 * Mm + F);
    const r = m.r - 0.58 * cosd(Mm - 2 * D) - 0.46 * cosd(2 * D);
    const [ra, dec] = toRaDec(cosd(lon) * cosd(lat), sind(lon) * cosd(lat), sind(lat));
    const h = ephAltAz(ra, dec, d); h.alt -= Math.asin(1 / r) / rad * cosd(h.alt);
    const elong = Math.acos(cosd(slon - lon) * cosd(lat)) / rad, fv = 180 - elong;
    out.moon = { ra, dec, ...h, illum: (1 + cosd(fv)) / 2, waxing: rev(lon - slon) < 180, phaseAngle: fv };
  }
  const MAG = { Mercury: 0, Venus: -4.2, Mars: 0.8, Jupiter: -2.4, Saturn: 0.8 };
  for (const p of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
    const o = ephOrbit(EPH_EL[p](d)); const [ra, dec] = toRaDec(o.x + sx, o.y + sy, o.z);
    const dist = Math.hypot(o.x + sx, o.y + sy, o.z), elong = Math.acos(((o.x + sx) * sx + (o.y + sy) * sy) / (dist * S.r)) / rad;
    let mag = MAG[p];
    if (p === 'Mars') mag = -1.52 + 5 * Math.log10(o.r * dist) + 0.016 * Math.acos((o.r * o.r + dist * dist - S.r * S.r) / (2 * o.r * dist)) / rad;
    if (p === 'Jupiter') mag = -9.25 + 5 * Math.log10(o.r * dist);
    if (p === 'Saturn') mag = -8.88 + 5 * Math.log10(o.r * dist) + 0.4;
    out[p] = { ra, dec, mag, elong, ...ephAltAz(ra, dec, d) };
  }
  out.d = d; return out;
}
const STAR_DATA = [5,-60,437,163,9,-173,455,-5,21,291,207,-4,23,591,228,38,24,-457,388,101,33,152,283,-19,37,-189,444,164,46,368,451,5,49,-88,356,121,50,-649,423,58,64,-773,282,62,66,-437,393,18,66,-423,240,108,79,-630,436,-6,79,-630,453,15,82,629,417,13,92,337,434,-12,92,539,369,-20,96,293,434,87,98,309,327,127,101,565,224,117,103,-461,459,95,108,-575,436,2,109,-180,204,102,112,483,448,-7,118,243,408,110,122,76,444,150,123,578,346,59,125,411,453,-14,142,607,215,-5,142,385,386,13,143,234,440,94,147,-294,430,-15,157,79,427,95,165,-467,332,88,171,-552,394,-12,171,-102,346,116,172,863,424,121,174,472,426,1,174,356,207,158,178,551,434,17,179,301,451,109,189,-689,425,48,210,-82,360,106,215,602,266,16,221,-433,341,154,228,-491,393,97,229,153,362,97,242,414,410,54,244,-572,45,-16,245,486,359,127,254,55,445,135,259,507,401,-10,260,-159,349,73,263,92,426,94,279,-103,374,114,283,296,342,49,284,193,388,-5,284,-463,439,160,286,637,335,-15,287,208,264,16,290,-516,369,84,297,-616,286,29,300,-211,399,155,305,709,449,16,305,28,382,2,309,724,395,0,310,423,210,137,318,235,201,115,324,350,300,14,332,88,436,88,341,-515,356,-12,343,338,403,2,354,-687,408,3,367,-477,424,-14,370,85,430,-5,373,674,446,15,380,893,197,64,399,3,408,-21,399,-683,412,-6,402,-399,411,101,408,32,347,9,410,-139,424,-12,410,492,410,51,412,101,427,31,413,-186,447,48,420,292,452,111,423,-324,445,98,425,273,361,-10,426,383,422,34,427,559,377,169,429,351,456,155,436,528,393,76,441,-89,389,109,446,-403,288,13,456,41,254,163,456,-236,408,16,462,535,291,72,463,388,332,153,470,410,209,0,473,496,405,60,474,449,379,98,479,197,435,103,480,-290,380,54,499,-218,370,161,500,-431,426,71,501,290,447,156,511,499,179,48,512,90,361,89,518,97,373,-8,523,599,421,42,525,589,455,49,526,480,436,137,527,129,414,111,532,-95,372,88,534,-216,426,-11,541,482,432,-6,542,4,429,57,543,-403,457,102,557,-373,459,119,557,478,301,-12,558,-98,352,92,560,-648,384,113,561,323,384,2,562,241,372,-10,563,426,377,42,563,245,430,-11,565,244,387,-6,565,-121,443,160,566,239,414,-5,567,-232,422,43,568,-742,326,159,569,241,285,-9,571,-376,430,-4,573,241,362,-7,574,-362,417,93,574,655,439,187,576,713,459,6,585,319,284,27,586,-30,446,67,595,400,290,-20,595,-135,297,159,597,-614,456,159,597,358,398,2,602,125,341,-10,602,-622,448,150,608,60,391,3,612,221,436,106,616,504,425,-1,622,477,396,-2,630,-68,404,33,635,-423,385,108,636,-625,333,92,637,484,412,94,638,-77,443,82,639,89,427,-5,640,-515,426,31,641,-593,444,108,645,-338,355,-11,646,503,460,4,649,156,365,98,657,175,377,98,660,-340,397,147,663,223,421,14,664,179,430,5,666,228,428,26,666,156,448,26,671,160,384,95,672,192,353,101,672,159,340,18,684,-298,449,97,685,-550,330,-8,689,-306,381,96,689,102,425,18,690,165,87,154,691,-34,393,-21,692,413,425,117,695,125,427,12,695,-143,386,108,701,-197,432,160,701,-419,444,34,706,230,427,-11,714,-33,401,-15,725,70,319,48,727,89,435,1,728,56,368,-16,732,-55,436,26,735,663,426,-1,736,24,371,-18,741,135,406,116,742,332,269,149,743,538,443,-2,746,17,447,137,755,438,303,54,756,411,369,115,759,604,403,92,761,-355,455,118,764,-224,319,146,766,412,318,-15,770,-51,278,16,773,-88,425,-19,781,-119,445,-10,782,-162,329,-11,783,-129,436,-9,783,29,446,117,786,-82,18,-3,792,460,8,80,794,-68,359,-12,795,334,454,125,799,-132,429,-24,810,-78,413,94,811,-24,335,-24,813,63,164,-22,816,286,165,-13,817,31,459,-20,821,-208,281,81,827,59,420,-14,828,-355,386,113,830,-3,225,-18,831,186,432,206,832,-178,258,21,834,-625,376,64,837,95,439,-16,838,99,339,-16,838,-48,458,-18,839,-59,275,-21,841,-12,169,-18,842,93,409,95,844,211,297,-15,847,-26,377,-19,848,41,450,-10,849,-341,265,-12,852,-19,174,-20,861,-224,359,48,862,-657,434,22,867,-148,355,10,868,-511,385,17,869,-97,207,-17,873,392,451,95,875,-562,450,108,877,-358,312,115,878,-209,376,98,879,391,397,113,883,276,456,-1,886,203,439,59,888,74,45,150,891,-142,371,34,894,-353,436,-16,898,-428,396,115,899,543,372,101,899,449,190,8,899,372,265,-8,900,459,430,170,900,-31,453,120,906,96,412,17,910,233,416,84,919,148,442,-16,930,142,445,-18,937,-63,399,132,937,225,331,160,938,295,432,102,941,-351,437,98,949,590,444,3,951,-301,302,-16,955,-334,385,86,957,-180,198,-24,957,225,287,162,959,46,439,22,960,-527,-62,16,970,-326,447,-17,972,-70,376,-11,972,202,413,-12,980,-234,434,-24,982,73,447,2,987,-530,435,-2,988,-230,454,-4,992,-193,395,104,994,164,193,0,994,-432,317,-10,995,-182,442,114,1010,251,306,138,1010,132,449,117,1013,-167,-144,1,1013,129,335,44,1020,24,448,110,1020,-619,324,22,1025,-325,350,-12,1025,-536,441,90,1025,-506,294,121,1032,340,360,10,1035,-242,389,174,1035,-120,408,142,1040,-171,436,-6,1043,584,435,85,1047,-290,150,-21,1050,770,455,136,1054,-279,349,173,1058,-238,302,-8,1059,-156,411,-11,1060,206,401,90,1071,-264,183,67,1072,-705,378,101,1078,302,441,126,1080,-5,415,0,1081,-468,449,32,1084,-446,442,133,1086,-264,442,-17,1087,-268,401,-15,1092,-680,397,76,1093,-371,271,162,1095,165,358,11,1097,-250,437,-13,1100,220,350,37,1110,-293,245,-8,1114,278,378,102,1118,83,289,-10,1120,89,433,142,1123,318,416,32,1123,-433,325,151,1124,120,455,128,1135,-223,444,52,1136,319,158,3,1140,269,406,154,1143,-350,453,-8,1147,-268,380,-16,1148,52,40,43,1153,-96,394,102,1155,-726,393,103,1158,289,423,112,1160,-290,394,16,1161,244,357,93,1163,-380,362,171,1163,280,116,99,1170,-259,440,-7,1173,-464,410,-16,1173,-249,334,122,1181,-406,371,101,1182,-389,449,-19,1183,-481,422,-13,1192,-530,346,-18,1192,-229,420,72,1196,-492,447,-18,1206,23,439,125,1209,-400,221,-27,1219,-243,283,46,1220,-686,435,-11,1221,-30,436,97,1223,-192,440,-16,1224,-473,175,-14,1228,-396,444,159,1235,-403,442,117,1241,92,353,148,1246,-769,405,41,1246,-367,444,22,1252,-775,434,116,1256,-595,186,120,1257,432,425,155,1264,-39,391,-1,1264,-661,377,113,1276,607,335,86,1294,-430,411,11,1294,57,414,0,1297,33,445,122,1300,-353,397,94,1301,643,459,118,1301,-529,360,-17,1302,-598,431,-12,1302,-466,377,67,1308,34,430,-19,1309,-332,368,-18,1311,-426,405,87,1312,182,394,108,1312,-547,193,4,1315,-460,387,2,1316,-135,432,90,1317,288,403,101,1317,-568,450,-17,1317,64,338,68,1321,58,435,-4,1326,-277,402,127,1338,-606,384,-10,1338,59,311,98,1346,119,426,14,1348,480,312,22,1350,-413,445,65,1352,418,396,46,1356,-664,400,14,1359,472,357,1,1360,-471,375,117,1363,-726,447,61,1366,385,456,104,1370,-434,223,166,1372,516,446,29,1377,-590,343,-19,1378,-623,396,-18,1383,-697,167,7,1386,23,389,-6,1391,-575,434,160,1393,-593,221,19,1397,368,382,7,1403,344,314,155,1405,-550,247,-14,1412,262,447,122,1419,-87,199,144,1423,-28,459,41,1423,-360,451,141,1427,-405,360,37,1428,-570,316,154,1429,631,365,36,1429,230,432,154,1430,-12,454,11,1432,517,317,48,1436,364,454,91,1436,-592,408,-1,1436,698,454,78,1437,521,447,3,1442,-494,434,17,1443,813,428,149,1448,-613,451,-7,1450,-11,390,131,1453,99,352,52,1463,-625,369,101,1465,238,297,81,1468,-651,292,27,1477,590,378,29,1479,-148,411,92,1479,-465,458,117,1480,541,455,4,1482,260,388,122,1492,-546,352,-7,1513,-131,460,-9,1518,168,348,-3,1519,352,449,19,1520,100,439,145,1520,-4,448,-3,1521,120,136,-9,1526,-124,361,101,1534,-700,329,-7,1537,-421,385,5,1542,234,343,31,1543,-613,339,154,1543,429,345,3,1549,-550,459,160,1550,198,201,113,1552,-560,450,-10,1556,415,306,160,1561,-740,399,37,1565,-168,383,146,1568,-311,428,143,1570,-587,381,32,1570,367,420,91,1580,-617,330,-9,1582,93,384,-15,1589,-786,411,158,1589,-576,445,160,1593,-482,384,30,1598,-556,429,102,1607,-644,274,-22,1609,-606,458,170,1614,-805,445,-19,1617,-494,269,90,1624,-162,311,123,1633,342,379,104,1634,-589,378,94,1639,247,430,2,1642,-371,460,101,1649,-183,408,108,1650,-422,437,12,1655,564,234,3,1656,202,442,5,1659,618,181,106,1671,-590,393,123,1674,445,300,114,1679,-228,446,2,1682,-603,459,54,1685,205,256,13,1686,154,333,0,1688,231,456,166,1692,-37,445,21,1695,315,379,61,1696,331,349,140,1698,-148,356,111,1703,-545,390,-16,1703,60,405,-6,1710,105,400,42,1712,-177,406,22,1729,693,382,161,1733,-319,354,95,1739,-630,311,-4,1742,-8,430,98,1764,-667,363,16,1765,65,404,150,1765,478,369,118,1766,-612,411,90,1770,202,450,55,1773,146,214,9,1774,-638,430,-15,1777,18,359,52,1778,-452,447,128,1782,-339,429,-10,1785,537,241,4,1808,-633,432,28,1813,87,412,97,1817,-646,414,35,1820,-507,446,-16,1821,-507,258,-13,1821,-247,402,33,1825,-226,302,133,1829,-524,397,-16,1838,-587,279,-19,1839,570,332,8,1840,-175,258,-11,1844,-680,406,160,1846,-793,424,-12,1846,-640,406,-17,1850,-7,389,3,1853,-604,359,139,1866,-631,77,-24,1867,283,435,113,1870,-502,391,-19,1875,-165,294,-1,1878,-571,159,160,1880,-162,430,39,1881,-721,384,-16,1884,698,385,-12,1884,414,424,59,1886,-234,265,89,1893,-691,269,-18,1894,-485,385,5,1904,-490,220,-2,1904,-14,274,37,1916,-681,304,-18,1919,-597,125,-24,1933,-489,433,134,1934,-402,425,22,1935,560,176,-2,1936,-572,403,-18,1939,34,339,157,1940,383,289,-12,1955,110,285,93,1956,-715,361,119,1967,-499,427,-18,1975,-55,438,-1,1975,175,432,46,1980,279,423,57,1981,-599,458,-7,1997,-232,299,92,2001,-367,275,7,2007,-610,452,-14,2010,549,223,6,2010,-645,452,82,2013,-112,98,-24,2013,550,399,17,2028,-394,390,119,2037,-6,338,11,2050,-535,229,-17,2064,-330,423,39,2068,175,450,51,2069,493,185,-10,2074,-345,419,152,2074,158,405,152,2074,-417,341,-22,2074,-425,347,-17,2079,647,458,157,2080,-330,432,-15,2087,184,268,58,2089,-473,255,-18,2096,-421,383,-22,2097,-448,387,-21,2104,15,423,12,2104,-456,434,60,2110,-604,61,-23,2111,644,367,-5,2115,-412,436,-20,2116,-267,325,109,2117,-364,206,101,2132,-103,418,132,2134,518,453,23,2139,192,-5,124,2140,-60,407,51,2141,461,418,9,2148,-134,452,13,2149,-461,355,-18,2151,-564,430,8,2151,-379,405,-3,2158,-395,441,-18,2163,519,404,50,2165,-452,456,-15,2165,-454,433,43,2167,-837,431,130,2169,757,425,143,2180,304,357,130,2180,383,304,19,2182,-505,444,-18,2187,297,447,36,2189,-422,233,-16,2195,-494,405,-15,2199,-608,135,90,2199,-608,-1,71,2202,164,449,0,2203,137,378,4,2205,-474,230,-15,2205,-378,401,-16,2206,-650,318,26,2208,-57,387,38,2209,-352,406,136,2212,271,235,97,2213,170,460,97,2216,19,373,0,2220,-790,383,143,2226,-280,442,137,2227,742,207,146,2227,-160,275,15,2228,191,454,72,2229,-436,432,-15,2243,-43,447,32,2246,-431,268,-18,2248,-421,313,-21,2255,404,349,96,2257,21,439,103,2260,-253,325,167,2261,269,452,124,2263,-471,391,-14,2272,-453,407,-16,2280,-487,388,-3,2281,-198,454,-7,2281,-521,341,92,2289,333,346,96,2293,-94,261,-7,2294,-588,407,9,2295,-301,435,110,2296,-479,427,-9,2297,-687,287,1,2302,718,300,6,2303,-406,322,-23,2305,-363,357,153,2307,-447,337,-19,2308,-369,454,-16,2308,-593,448,17,2311,374,431,31,2312,590,329,117,2313,-387,460,0,2320,291,366,32,2332,314,414,-13,2337,267,222,3,2337,105,380,27,2338,-412,280,-22,2339,-148,391,101,2340,-450,455,-18,2342,-663,411,116,2343,-281,360,136,2345,-426,434,141,2347,-298,366,-18,2354,197,451,6,2357,263,381,2,2360,778,429,4,2361,64,263,117,2365,154,365,7,2366,74,442,60,2372,181,409,162,2374,261,459,79,2374,-34,354,-4,2377,45,371,15,2377,-336,397,-4,2382,425,460,56,2384,-253,459,-7,2385,-167,413,100,2388,-634,283,32,2391,157,385,48,2392,-292,387,-20,2394,269,414,123,2397,-261,289,-18,2400,-384,342,-21,2401,-226,229,-12,2405,586,401,53,2411,-114,416,46,2414,-198,256,-6,2416,-368,422,-18,2417,-207,393,-5,2419,-209,431,83,2422,449,423,-4,2430,-195,400,8,2431,-279,458,-17,2436,-37,273,158,2439,-637,386,110,2446,-47,323,97,2449,463,391,-15,2450,-502,401,108,2452,-242,455,76,2453,-256,290,30,2455,192,374,30,2460,615,273,91,2460,-200,448,100,2464,140,457,0,2464,-234,457,23,2468,-185,422,22,2468,-476,446,-7,2474,-264,106,186,2476,215,278,95,2477,20,382,2,2478,-166,429,92,2478,-347,424,-17,2480,-215,445,13,2484,-789,386,92,2485,424,420,-1,2490,-282,282,-21,2491,-353,418,154,2493,-106,254,4,2503,316,281,65,2507,389,348,92,2508,-775,423,106,2515,820,421,90,2522,-690,191,145,2524,-590,377,156,2525,-343,229,114,2530,-380,300,-20,2531,-380,356,-21,2535,102,439,-9,2536,-424,362,139,2544,94,319,116,2547,-560,312,155,2549,-532,406,145,2551,309,392,-2,2572,657,317,-12,2576,-157,243,6,2580,-432,332,44,2587,144,278,116,2588,248,312,8,2588,368,316,144,2588,-266,433,86,2602,-128,432,4,2603,-211,439,39,2605,-250,327,-19,2609,371,415,-1,2613,-555,284,148,2613,-564,331,-15,2616,-242,416,28,2616,41,434,148,2617,-51,453,38,2618,-299,428,40,2626,523,279,95,2627,261,441,143,2627,-373,270,-18,2628,-607,360,-10,2630,-499,284,-14,2631,866,435,2,2634,-371,162,-23,2637,126,208,16,2639,-465,456,-2,2641,-386,426,108,2643,-430,186,41,2644,-154,354,26,2645,-81,458,13,2649,460,382,-18,2654,-129,424,9,2655,721,457,43,2656,-390,239,-17,2659,46,276,117,2664,-647,361,116,2666,277,342,75,2669,-278,453,60,2669,-401,299,51,2670,27,375,4,2675,-370,319,119,2684,569,373,118,2691,373,386,135,2692,515,224,152,2694,292,370,94,2696,302,441,38,2698,-98,332,99,2702,29,393,3,2704,216,426,41,2704,13,442,5,2714,25,403,86,2715,-304,298,98,2717,-501,365,-10,2718,96,371,16,2719,288,384,-2,2720,-285,455,94,2721,-637,433,23,2722,208,437,-16,2728,-460,452,101,2734,-211,384,20,2744,-368,310,158,2750,361,433,116,2752,713,422,-9,2752,-298,272,138,2753,727,355,49,2753,-29,323,94,2758,-615,435,146,2759,218,385,117,2760,-344,179,-3,2767,-460,349,-18,2770,-254,282,102,2772,-491,410,100,2788,-82,385,132,2792,388,3,0,2808,-714,401,113,2811,396,459,18,2812,376,434,19,2814,-270,317,-11,2814,205,419,48,2818,182,434,15,2818,-47,422,109,2825,334,352,0,2831,-622,422,-15,2836,369,422,158,2837,226,457,78,2838,-263,205,-13,2838,439,408,140,2842,-672,440,53,2844,-211,352,115,2847,327,325,-5,2849,151,402,108,2854,-57,402,108,2857,-299,260,6,2862,-217,376,101,2864,139,299,1,2866,-49,343,-10,2866,-371,423,52,2867,-277,332,117,2871,-405,457,107,2874,-379,411,4,2874,-210,288,38,2875,-393,410,116,2881,677,307,99,2884,391,443,-15,2889,734,445,126,2891,381,435,126,2893,534,380,95,2902,657,460,3,2904,-178,392,23,2904,-160,452,8,2907,-445,396,-8,2908,-448,427,35,2910,-406,396,-10,2914,31,336,32,2922,247,444,150,2924,517,376,15,2927,280,305,109,2935,74,445,118,2941,502,449,40,2942,-249,459,-8,2942,-13,436,-8,2950,180,439,78,2953,175,439,104,2962,451,286,0,2966,106,272,151,2968,185,368,131,2970,703,384,89,2977,89,76,22,2981,10,387,63,2984,241,457,-5,2988,-419,412,106,2988,64,371,86,2991,351,389,102,2992,-272,454,146,2997,195,351,157,2999,-353,437,-15,3001,-729,397,-3,3007,-277,443,164,3007,679,451,131,3022,-662,355,75,3022,777,438,-5,3028,-8,324,-7,3033,566,428,11,3034,467,380,127,3039,477,396,145,3039,278,450,126,3044,-125,430,93,3045,-125,358,88,3053,-148,305,79,3056,403,223,67,3060,322,443,133,3064,-567,194,-12,3073,304,401,40,3074,630,421,20,3083,113,403,-12,3094,146,364,42,3094,-473,311,100,3096,-11,431,95,3099,159,377,-6,3104,453,125,9,3109,151,443,30,3110,-519,451,28,3112,-662,342,16,3113,618,341,91,3113,576,452,54,3114,307,422,105,3115,-253,413,43,3116,340,248,102,3117,161,427,104,3119,365,453,-8,3119,-95,378,0,3119,-50,443,164,3130,-269,412,163,3130,271,456,84,3137,-585,367,125,3143,412,394,3,3162,439,372,161,3165,-172,408,-1,3167,476,456,157,3168,-250,449,160,3174,-114,450,93,3182,302,321,99,3186,100,447,53,3187,380,374,39,3190,52,392,55,3194,394,422,10,3195,349,441,-10,3196,626,245,26,3200,-534,439,19,3205,198,408,111,3206,-168,428,89,3216,-654,421,49,3217,-224,377,100,3222,706,323,-20,3222,-218,450,89,3225,236,452,162,3229,-56,290,83,3235,456,398,88,3243,-195,451,-18,3250,-167,369,32,3254,-774,373,101,3255,713,455,111,3259,588,423,224,3260,287,449,51,3260,99,238,152,3261,174,434,116,3262,256,414,42,3262,-330,435,-5,3264,611,425,47,3267,493,423,-12,3268,-161,285,18,3285,-374,300,-8,3295,-550,440,30,3309,646,426,38,3314,-3,295,97,3315,-395,447,135,3316,-139,429,-8,3318,253,377,44,3321,-470,173,-7,3321,-330,450,5,3325,332,428,47,3325,62,352,9,3327,582,339,156,3335,397,450,138,3338,570,418,28,3340,377,414,145,3342,-78,417,98,3346,-603,287,139,3353,465,455,-10,3354,-14,386,-6,3359,522,442,101,3361,495,455,9,3368,-650,451,-3,3372,0,365,41,3373,584,407,78,3373,-435,397,102,3374,477,434,168,3374,-437,412,157,3376,431,452,-9,3378,503,376,3,3379,-323,429,1,3388,-1,404,-8,3401,443,450,132,3402,-270,418,-10,3404,108,341,-9,3407,-469,207,161,3408,302,293,85,3415,-814,413,21,3416,236,397,107,3417,122,420,50,3421,-513,349,8,3424,-136,405,157,3424,662,350,105,3425,246,351,93,3431,-329,446,-4,3432,-76,373,163,3437,-158,327,7,3440,-325,420,95,3444,-296,117,14,3452,-528,411,96,3455,423,362,-10,3459,281,244,166,3460,38,448,-12,3462,152,249,0,3467,-237,448,89,3467,-435,428,42,3468,94,454,156,3470,754,441,80,3474,-212,368,120,3476,-452,388,100,3481,494,453,30,3486,-60,422,154,3490,-91,424,111,3493,33,370,92,3494,-582,399,41,3495,-92,441,-14,3497,-325,441,111,3502,237,458,18,3507,-201,396,108,3513,234,442,62,3515,-206,438,146,3520,64,427,106,3523,128,454,94,3532,-378,438,-10,3544,465,381,98,3545,433,429,-8,3548,776,321,103,3550,56,413,51,3551,443,415,-7,3555,18,449,20,3557,-145,449,-3,3572,-281,459,0,3586,575,451,119,3598,69,403,42,3600,-656,449,-8];
const skyNow = { date: null, moonUp: true, moonIllum: 0.5, planets: [], sig: '' };
const PLANET_LOOK = { Mercury: '#d8cbb8', Venus: '#fff6dc', Mars: '#ffb08a', Jupiter: '#fff0d8', Saturn: '#f5dcab' };
function altAzVec(alt, az, out = new THREE.Vector3()) {          // same convention as sunDir: azimuth from north, plan turned by PLAN_TURN
  const A = (az + PLAN_TURN) * D2R, E = alt * D2R;
  return out.set(-Math.cos(A) * Math.cos(E), Math.sin(E), -Math.sin(A) * Math.cos(E)).normalize();
}
function bvRGB(bv) {                                               // B−V colour index → a gentle star tint
  const t = THREE.MathUtils.clamp((bv + 0.3) / 2.0, 0, 1);
  return new THREE.Color().setRGB(0.72 + 0.28 * Math.min(1, t * 1.6), 0.8 + 0.2 * (1 - Math.abs(t - 0.35) * 1.3), 1.0 - 0.45 * t);
}
const NSTAR = STAR_DATA.length / 4, NPLAN = 5;
const stars = (() => {
  const n = NSTAR + NPLAN, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), bri = new Float32Array(n);
  for (let i = 0; i < NSTAR; i++) {
    const m = STAR_DATA[i * 4 + 2] / 100; bvRGB(STAR_DATA[i * 4 + 3] / 100).toArray(col, i * 3);
    size[i] = THREE.MathUtils.clamp(1.4 + (4.6 - m) * 0.66, 1.4, 5.0); bri[i] = THREE.MathUtils.clamp(0.32 + (4.6 - m) * 0.2, 0.32, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aBri', new THREE.BufferAttribute(bri, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uOp: { value: 0 }, uPR: { value: 1 }, uT: { value: 0 } },
    vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aBri; uniform float uPR; uniform float uT; varying vec3 vCol; varying float vB;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        float alt = normalize(position).y; float ext = smoothstep(-0.01, 0.2, alt);          // haze and city glow near the horizon
        float tw = 0.88 + 0.12 * sin(uT * (2.0 + fract(position.x * 0.013) * 3.0) + position.z);
        vB = aBri * ext * tw; vCol = aCol; gl_PointSize = aSize * uPR * (0.7 + 0.3 * ext); }`,
    fragmentShader: `uniform float uOp; varying vec3 vCol; varying float vB;
      void main() { vec2 q = gl_PointCoord - 0.5; float d = length(q); float a = smoothstep(0.5, 0.05, d);
        if (a <= 0.0 || vB <= 0.0) discard; gl_FragColor = vec4(vCol * vB * a * uOp, 1.0); }` });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; p.visible = false; p.renderOrder = -2; scene.add(p); return p;
})();
function cphUTC(h) {                                              // today's date in Copenhagen, at clock time h there → a UTC Date
  const now = new Date(), f = (tz) => new Date(now.toLocaleString('en-US', { timeZone: tz }));
  let off = 2; try { off = Math.round((f('Europe/Copenhagen') - f('UTC')) / 3.6e6); } catch (_) { /* fallback CEST */ }
  let Y, M, D; try { [Y, M, D] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number); }
  catch (_) { Y = now.getFullYear(); M = now.getMonth() + 1; D = now.getDate(); }
  return new Date(Date.UTC(Y, M - 1, D) + (h - off) * 3.6e6);
}
const MOON = new THREE.Vector3(0, 1, 0), SUN_REAL = new THREE.Vector3();
function updateSky(h) {
  const date = cphUTC(h), sig = date.toISOString().slice(0, 16); if (sig === skyNow.sig) return; skyNow.sig = sig; skyNow.date = date;
  const E = ephSky(date), d = E.d, P = stars.geometry.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < NSTAR; i++) { const h2 = ephAltAz(STAR_DATA[i * 4] / 10, STAR_DATA[i * 4 + 1] / 10, d); altAzVec(h2.alt, h2.az, v).multiplyScalar(1500); P.setXYZ(i, v.x, v.y, v.z); }
  const S = stars.geometry.attributes.aSize, B = stars.geometry.attributes.aBri, C = stars.geometry.attributes.aCol;
  skyNow.planets = [];
  ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach((nm, k) => {
    const o = E[nm], i = NSTAR + k; altAzVec(o.alt, o.az, v).multiplyScalar(1500); P.setXYZ(i, v.x, v.y, v.z);
    const vis = o.alt > 0 && (nm !== 'Mercury' || o.elong > 18);
    S.setX(i, THREE.MathUtils.clamp(2.4 + (1.5 - o.mag) * 0.75, 2.4, 6.2)); B.setX(i, vis ? 1 : 0); new THREE.Color(PLANET_LOOK[nm]).toArray(C.array, i * 3);
    if (vis) skyNow.planets.push(nm);
  });
  P.needsUpdate = S.needsUpdate = B.needsUpdate = C.needsUpdate = true;
  skyNow.moonUp = E.moon.alt > -0.5; skyNow.moonIllum = E.moon.illum; skyNow.moonAlt = E.moon.alt;
  if (skyNow.moonUp) altAzVec(E.moon.alt, E.moon.az, MOON); else MOON.set(0.25, 1, 0.1).normalize();   // moon down: only the city's sky glow
  altAzVec(E.sun.alt, E.sun.az, SUN_REAL);
  if (typeof setMoonPhase === 'function') setMoonPhase(E.moon.illum, E.moon.phaseAngle);
}
let dayLevel = 1;
function updateSun(h, rebuildEnv) {
  clockHour = h;
  shadowDirty = true;
  const { v, el } = sunDir(h);
  const lift = THREE.MathUtils.clamp(el / 12, 0, 1);            // full daylight above ~12°
  const dusk = THREE.MathUtils.clamp((el + 8) / 10, 0, 1);      // 0 = deep night, 1 = day
  dayLevel = dusk;
  if (el > -1) {
    sun.position.copy(CENTER).addScaledVector(v, 40);
    sun.intensity = 3.8 * lift;                                 // clear-sky, Mediterranean sun: strong and warm, crisp shadows
    sun.color.setHSL(0.1, 0.95, 0.58 + 0.24 * lift);
  } else {                                                       // moonlight: dim and blue
    updateSky(h);
    sun.position.copy(CENTER).addScaledVector(MOON, 40);
    sun.intensity = 0.38 * (1 - dusk) * (skyNow.moonUp ? (0.35 + 0.65 * skyNow.moonIllum) * THREE.MathUtils.clamp(0.4 + skyNow.moonAlt / 25, 0.4, 1) : 0.3);   // real moon: brighter when full and high; down = city glow
    sun.color.set(0x9db6ff);
  }
  hemi.intensity = 0.06 + 0.42 * dusk * (0.55 + 0.45 * lift); hemi.userData.base = hemi.intensity; hemi.userData.dirty = true;
  hemi.color.set(dusk < 0.5 ? 0x5a6a90 : 0xa9c9f2); hemi.groundColor.set(dusk < 0.5 ? 0x3a3028 : 0xc29a6c);   // blue sky above, warm bounce below
  sky.visible = el > -10;
  scene.background = sky.visible ? null : new THREE.Color(0x05070f);
  renderer.toneMappingExposure = 0.8 + 0.9 * (1 - dusk);
  updateSky(h);
  stars.material.uniforms.uOp.value = THREE.MathUtils.clamp(1 - dusk * 1.6, 0, 1);
  stars.visible = stars.material.uniforms.uOp.value > 0.01;
  if (window.__clouds) window.__clouds.material.color.setScalar(0.12 + 0.88 * dusk);
  try { updateFairy(); updateNight(); } catch (_) { /* not built yet */ }
  try { autoLightTick(h, dusk); } catch (_) { /* lights not defined yet */ }
  { const dt = skyNow.date ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', day: 'numeric', month: 'short' }).format(skyNow.date) : '';
    const moonTxt = skyNow.moonUp ? `Moon ${Math.round(skyNow.moonIllum * 100)} % lit` : 'Moon below the horizon';
    $('sunlabel').textContent = el > -1 ? 'Sun' : dusk > 0.1 ? 'Dusk' : `${moonTxt}${skyNow.planets.length ? ' · ' + skyNow.planets.join(', ') + ' up' : ''} · Copenhagen sky, ${dt}`; }
  sky.material.uniforms.sunPosition.value.copy(v);
  skyForEnv.material.uniforms.sunPosition.value.copy(v);
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  $('sunout').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('qTimeOut').textContent = $('sunout').textContent;
  if (rebuildEnv) {
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(skyScene);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.05 + 0.45 * dayLevel; scene.userData.envBase = scene.environmentIntensity; hemi.userData.dirty = true;
  }
}
$('sunrange').addEventListener('input', (e) => updateSun(+e.target.value, false));
$('sunrange').addEventListener('change', (e) => updateSun(+e.target.value, true));

// ------------------------------------------------------------ post-processing (desktop)
let composer = null, gtao = null;
if (!lite) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, 2, 2);
  gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.2, thickness: 1.2, scale: 1.1, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  // overlays (render pins, labels, tape) must not go into the ambient-occlusion depth/normal pass,
  // otherwise each sprite shows up as a dark square around the icon
  const gtaoRender = gtao.render.bind(gtao);
  gtao.render = (...args) => {
    const groups = [window.__overlays || []].flat();
    const was = groups.map((g) => g.visible);
    groups.forEach((g) => { g.visible = false; });
    gtaoRender(...args);
    groups.forEach((g, i) => { g.visible = was[i]; });
  };
  composer.addPass(new OutputPass());
}

