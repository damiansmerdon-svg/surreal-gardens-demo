// A few of the rainforest creatures, visiting the mushroom path (Damian, 25 Nov 2026: they "walk or fly into the scene", "crawl
// using their legs", some "up the mushroom stems", and "the flying ones could land on the tops of mushrooms"; "make sure nothing
// goes through a mushroom"). Walkers find their way round the fungi on the ground (world.js), climb a stem by feeling its real
// surface, and come down again; gliders fly in from the trees and go from cap to cap on flights tested clear before they leave.
// Models and skin shaders are the reef-forest look-around's; shown at 2 to 3 times life size so a phone can read them.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ab, basisQuat } from './world.js';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TIME = { value: 0 };
const C = (r, g, b) => [r, g, b];
const PAL = {
  CM: { shell: [[0, C(.98,.42,.05)], [.35, C(.95,.30,.08)], [.65, C(.92,.20,.25)], [.9, C(.55,.10,.55)], [1, C(.20,.20,.70)]], edge: C(.05,.55,.75), spot: 1,
        memb: [[0, C(.98,.50,.08)], [.3, C(.98,.35,.40)], [.55, C(.70,.25,.90)], [.8, C(.15,.55,.95)], [1, C(.10,.85,.80)]], limb: [C(.80,.22,.10), C(.90,.45,.40)], whip: [C(.95,.38,.05), C(.98,.62,.25)] },
  GS: { shell: [[0, C(.98,.42,.05)], [.4, C(.95,.30,.10)], [.75, C(.90,.20,.30)], [1, C(.70,.10,.50)]], edge: C(.05,.55,.70), spot: 1,
        memb: [[0, C(.98,.55,.10)], [.3, C(.95,.35,.45)], [.6, C(.55,.25,.90)], [.85, C(.10,.55,.90)], [1, C(.10,.80,.80)]], limb: [C(.95,.45,.15), C(.95,.30,.45)], whip: [C(.98,.45,.08), C(.98,.70,.35)] },
  SJ: { shell: [[0, C(.98,.70,.40)], [1, C(.95,.45,.60)]], edge: C(1,.8,.7), glass: 1,
        memb: [[0, C(.98,.50,.15)], [.3, C(.95,.20,.50)], [.65, C(.65,.12,.90)], [1, C(.35,.25,1.0)]], limb: [C(.95,.6,.8), C(.98,.8,.55)], whip: [C(.98,.70,.45), C(.60,.40,.98)], glow: C(1.0,.45,.08) },
  SW: { shell: [[0, C(.01,.12,.14)], [.4, C(.06,.04,.18)], [.75, C(.14,.03,.16)], [1, C(.55,.36,.08)]], edge: C(.80,.55,.15), spot: 1,
        memb: [[0, C(.95,.30,.40)], [1, C(.98,.70,.60)]], limb: [C(.04,.16,.18), C(.30,.08,.30)], whip: [C(.70,.30,.55), C(.95,.80,.55)] },
  FP: { shell: [[0, C(.15,.55,.25)], [.3, C(.55,.70,.30)], [.6, C(.85,.30,.45)], [1, C(.70,.10,.45)]], edge: C(.86,.18,.28),
        memb: [[0, C(.10,.45,.12)], [.45, C(.35,.65,.15)], [.8, C(.85,.15,.45)], [1, C(.70,.05,.45)]], limb: [C(.92,.42,.36), C(.98,.80,.60)], whip: [C(.95,.38,.22), C(.95,.85,.70)] },
  SG: { shell: [[0, C(.98,.45,.25)], [.4, C(.95,.30,.35)], [.75, C(.85,.18,.45)], [1, C(.60,.15,.60)]], edge: C(.98,.75,.55), spot: 1,
        memb: [[0, C(.95,.30,.40)], [.6, C(.98,.55,.50)], [1, C(.98,.85,.80)]], membSolid: 1, limb: [C(.95,.40,.30), C(.95,.55,.55)], whip: [C(.98,.50,.30), C(.98,.75,.55)] },
  RW: { shell: [[0, C(.98,.42,.05)], [.4, C(.95,.30,.10)], [.75, C(.90,.22,.32)], [1, C(.55,.15,.60)]], edge: C(.10,.60,.75),
        memb: [[0, C(.98,.80,.70)], [.5, C(.85,.75,.98)], [1, C(.60,.85,.98)]], limb: [C(.95,.50,.30), C(.95,.70,.60)], whip: [C(.98,.50,.20), C(.98,.75,.45)] },
  LB: { shell: [[0, C(.98,.42,.05)], [.4, C(.95,.30,.10)], [.75, C(.90,.22,.32)], [1, C(.55,.15,.60)]], edge: C(.98,.75,.40),
        memb: [[0, C(.95,.6,.2)], [1, C(1,.8,.3)]], limb: [C(.90,.45,.15), C(.95,.65,.40)], whip: [C(.95,.55,.20), C(.98,.75,.45)] },
  NL: { shell: [[0, C(.98,.42,.05)], [.4, C(.95,.30,.10)], [.75, C(.90,.22,.32)], [1, C(.55,.15,.60)]], edge: C(.10,.55,.80), spot: 1,
        memb: [[0, C(.98,.50,.10)], [.4, C(.95,.30,.50)], [.75, C(.50,.30,.95)], [1, C(.10,.75,.85)]], limb: [C(.95,.45,.20), C(.95,.35,.50)], whip: [C(.98,.45,.10), C(.98,.70,.35)],
        flower: C(1.0,.40,.70), glow: C(1.0,.55,.80) },
};
const ramp = stops => { const s = stops.slice(0, 5); while (s.length < 5) s.push(s[s.length - 1]); return s; };

const NOISE = `
float h3(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.55 * vn(p) + 0.28 * vn(p * 2.03) + 0.17 * vn(p * 4.1); }
vec2 worley(vec3 p){ vec3 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(x, y, z); vec3 o = vec3(h3(i + g), h3(i + g + 11.7), h3(i + g + 23.1)) * 0.8 + 0.1;
    float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(d1, d2); }
vec3 ramp5(float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, float p1, float p2, float p3){
  t = clamp(t, 0.0, 1.0);
  if (t < p1) return mix(c0, c1, t / p1); if (t < p2) return mix(c1, c2, (t - p1) / (p2 - p1));
  if (t < p3) return mix(c2, c3, (t - p2) / (p3 - p2)); return mix(c3, c4, (t - p3) / (1.0 - p3)); }`;

// vertex motion by part kind (MaskF.b): whips sway, membranes flutter, limbs tremble, everything breathes
const VERT = `
attribute vec4 color;
uniform float uTime, uPhase, uFlap, uSway, uCalm, uGait, uWalk;
varying vec4 vMask; varying vec3 vObj;`;
const VERT_MOVE = `
  vMask = color; vObj = position;
  float kind = color.b, along = color.r, t = uTime + uPhase;
  float isWhip = step(0.38, kind) * step(kind, 0.52), isMemb = step(0.68, kind) * step(kind, 0.82), isLimb = step(0.22, kind) * step(kind, 0.37);
  float sway = uSway * (1.0 - 0.7 * uCalm);
  transformed.x += isWhip * along * along * 0.025 * sway * sin(t * 1.7 + along * 5.0 + position.z * 20.0);
  transformed.y += isWhip * along * along * 0.020 * sway * sin(t * 2.3 + along * 4.0);
  transformed.z += isWhip * along * along * 0.015 * sway * cos(t * 1.3 + along * 3.0);
  float flap = uFlap * sin(t * (1.6 + 4.0 * step(0.5, uFlap)) + color.g * 1.5);
  transformed.y += isMemb * along * along * 0.035 * flap * sign(position.x + 1e-4) * (0.4 + 0.6 * abs(position.x) * 6.0);
  transformed += normal * isMemb * along * 0.002 * sin(t * 5.0 + color.g * 9.0);
  transformed += normal * isLimb * along * 0.0012 * sin(t * 7.0 + color.a * 20.0) * (1.0 - uCalm);
  // walking: each pair of legs swings forward and back and lifts on the way forward, left and right in turn, pair after pair
  float gph = uGait + floor(color.a * 50.0) * 2.1 + step(0.0, position.x) * 3.14159, reach = abs(position.x);
  transformed.z += isLimb * uWalk * along * reach * 0.55 * sin(gph);
  transformed.y += isLimb * uWalk * along * reach * 0.30 * max(0.0, cos(gph));
  transformed *= 1.0 + 0.008 * sin(t * 1.4) * (1.0 - isWhip);`;

function v3(c) { return new THREE.Vector3(...c); }

function partMaterial(prefix, part) {
  const P = PAL[prefix] || PAL.CM;
  let m;
  const isMemb = part === 'Memb' && !P.membSolid, isGlow = part === 'Glow', isLattice = part === 'Lattice', isFlower = part === 'Flower';
  if (isMemb || isLattice || (part === 'Shell' && P.glass) || part === 'Whip' && prefix === 'RW') {
    m = new THREE.MeshPhysicalMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08,
      iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [250, 800] });
  } else {
    m = new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: part === 'Soft' ? 0.4 : 1, clearcoatRoughness: 0.06, sheen: part === 'Soft' ? 0.4 : 0,
      iridescence: part === 'Shell' || part === 'Plate' || part === 'Eye' ? 0.85 : 0.3, iridescenceIOR: 1.4, iridescenceThicknessRange: [250, 900] });
    if (part === 'Memb' && P.membSolid) m.side = THREE.DoubleSide;
  }
  const shellStops = ramp(P.shell), membStops = ramp(P.memb);
  const u = { uTime: TIME, uPhase: { value: 0 }, uFlap: { value: 0.25 }, uSway: { value: 1 }, uCalm: { value: 0 }, uGait: { value: 0 }, uWalk: { value: 0 },
    c0: { value: v3(shellStops[0][1]) }, c1: { value: v3(shellStops[1][1]) }, c2: { value: v3(shellStops[2][1]) }, c3: { value: v3(shellStops[3][1]) }, c4: { value: v3(shellStops[4][1]) },
    p: { value: new THREE.Vector3(shellStops[1][0] || .3, shellStops[2][0] || .6, shellStops[3][0] || .9) },
    m0: { value: v3(membStops[0][1]) }, m1: { value: v3(membStops[1][1]) }, m2: { value: v3(membStops[2][1]) }, m3: { value: v3(membStops[3][1]) }, m4: { value: v3(membStops[4][1]) },
    mp: { value: new THREE.Vector3(membStops[1][0] || .3, membStops[2][0] || .6, membStops[3][0] || .9) },
    edge: { value: v3(P.edge || [1, 1, 1]) }, la: { value: v3(P.limb[0]) }, lb: { value: v3(P.limb[1]) }, wa: { value: v3(P.whip[0]) }, wb: { value: v3(P.whip[1]) },
    glowC: { value: v3(P.glow || [1, .5, .1]) }, flowerC: { value: v3(P.flower || [1, .4, .7]) }, uSpot: { value: P.spot ? 1 : 0 } };
  m.userData.u = u;
  m.defines = Object.assign(m.defines || {}, { USE_UV: '' });
  const PART = { Shell: 0, Plate: 0, Soft: 1, Limb: 2, Whip: 3, Eye: 4, Memb: 5, Glow: 6, Lattice: 7, Flower: 8 }[part] ?? 0;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_MOVE);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec4 vMask; varying vec3 vObj; uniform vec3 c0,c1,c2,c3,c4,p,m0,m1,m2,m3,m4,mp,edge,la,lb,wa,wb,glowC,flowerC; uniform float uSpot, uTime;
      ${NOISE}`)
      .replace('#include <color_fragment>', `
        float along = vMask.r, across = vMask.g; vec3 P = vObj * 30.0; vec3 col; float a = 1.0; vec3 emit = vec3(0.0);
        #if ${PART} == 0
          col = ramp5(along + (fbm(P * 0.5) - 0.5) * 0.35, c0, c1, c2, c3, c4, p.x, p.y, p.z);
          col = mix(col, edge, smoothstep(0.62, 1.0, across + (vn(P * 2.0) - 0.5) * 0.3) * 0.45);
          col *= 0.75 + 0.35 * fbm(P * 1.7);
          if (uSpot > 0.5) { vec2 w = worley(P * 0.9 + fbm(P) * 1.5); float sz = 0.22 + 0.14 * vn(P * 0.4);
            col = mix(col, col * 0.08, (1.0 - smoothstep(sz * 0.8, sz, w.x)) * smoothstep(0.45, 0.6, vn(P * 0.6 + 3.0)) * 0.9); }
          emit = col * 0.10;
        #elif ${PART} == 1
          col = mix(vec3(.95,.72,.62), vec3(.80,.42,.48), fbm(P)); emit = col * 0.05;
        #elif ${PART} == 2
          col = mix(la, lb, along); col = mix(col, col * 0.45, smoothstep(0.35, 0.9, sin(vUv.y * 9.0 + fbm(P) * 4.0)) * 0.35); col = mix(col, vec3(1.,.88,.75), smoothstep(0.75, 1.0, along) * 0.4);
        #elif ${PART} == 3
          col = mix(wa, wb, along); col *= 0.82 + 0.18 * sin(vUv.y * 40.0);
          #ifdef USE_TRANSMISSION
          #endif
        #elif ${PART} == 4
          col = vec3(0.01, 0.012, 0.016) + 0.05 * step(0.9, fract(worley(vObj * 900.0).x * 2.0));
        #elif ${PART} == 5
          col = ramp5(along + (fbm(P * 0.6) - 0.5) * 0.3, m0, m1, m2, m3, m4, mp.x, mp.y, mp.z);
          float vein = smoothstep(0.92, 1.0, abs(sin(vUv.x * 14.0 + fbm(P) * 2.5)));
          vec2 cell = worley(P * 2.2); float net = 1.0 - smoothstep(0.0, 0.05, cell.y - cell.x);
          col = mix(col, vec3(.95,.70,.25), max(vein, net * 0.5) * 0.7);
          if (uSpot > 0.5) col = mix(col, col * 0.15, (1.0 - smoothstep(0.18, 0.24, worley(P * 0.8).x)) * step(0.5, vn(P * 0.4)) * 0.8);
          a = clamp(0.22 + vein * 0.5 + net * 0.25 + smoothstep(0.85, 1.0, along) * 0.25, 0.0, 1.0); emit = col * 0.30;
        #elif ${PART} == 6
          col = glowC; emit = glowC * (2.2 + 0.6 * sin(uTime * 2.0 + vObj.x * 40.0));
        #elif ${PART} == 7
          vec2 w = worley(vObj * 120.0 + fbm(vObj * 60.0)); float wall = 1.0 - smoothstep(0.03, 0.08, w.y - w.x);
          col = mix(mix(vec3(.30,.65,.85), vec3(.80,.40,.75), along), vec3(1.0,.72,.25), wall); a = 0.10 + 0.9 * wall; emit = vec3(1.0,.7,.25) * wall * 0.25;
        #else
          col = flowerC * (0.7 + 0.3 * along); emit = flowerC * 0.9;
        #endif
        diffuseColor.rgb = col; diffuseColor.a *= a;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += emit;');
  };
  m.customProgramCacheKey = () => prefix + part;
  return m;
}



// who comes, from where (metres along the stepping stones, metres to their right), and when
const CAST = [
  { n: 'FrondHopper', s: 3.0, role: 'hopper', from: [-7, 2.5], home: [-1.4, -1.9], arrive: 2, rad: 0.4 },
  { n: 'ShellWalker', s: 1.8, role: 'crawler', from: [-8, 3], arrive: 4, sp: 0.5, rad: 0.4, len: 0.25, climbs: true, ang: 0.5 },
  { n: 'FrondHopper', s: 2.7, role: 'hopper', from: [3, 9], home: [0.8, 2.6], arrive: 9, rad: 0.4 },
  { n: 'SporeGrazer', s: 2.4, role: 'crawler', from: [10, 5.5], arrive: 12, sp: 0.55, rad: 0.4, len: 0.22, climbs: true, ang: -0.5 },
  { n: 'FrondHopper', s: 2.8, role: 'hopper', from: [9, 5], home: [4.3, 2.6], arrive: 16, rad: 0.4 },
  { n: 'GliderShrimp', s: 1.9, role: 'glider', az: 120, arrive: 20 },
  { n: 'CanopyMantis', s: 2.0, role: 'crawler', from: [11, 0.4], arrive: 24, sp: 0.75, rad: 0.7, len: 0.47, climbs: false, watcher: true },
  { n: 'GliderShrimp', s: 1.6, role: 'glider', az: 205, arrive: 38 },
];
const CLIMB = [11, 9, 10, 12, 15, 14, 5, 26, 27, 16], LAND = [1, 4, 5, 16, 17, 24, 21, 22];      // fungi (by their place in the layout) worth climbing, and with tops to land on
const Y = new THREE.Vector3(0, 1, 0);
export async function createBugs({ scene, bin, camera, fungi, world: W }) {
  const loader = new GLTFLoader(), lib = {};
  await Promise.all([...new Set(CAST.map(c => c.n))].map(async n => { lib[n] = (await loader.parseAsync((await bin(n + '_glb.txt')).buffer, '')).scene; }));
  for (const fi of new Set([...CLIMB, ...LAND])) if (fungi[fi]) fungi[fi].keep = true;      // a fungus with a visitor on it does not sink back into the ground under it
  const grown = fi => fungi[fi] && fungi[fi].state === 'grown';
  const busy = {}, top = {};
  // --- feeling the real shape of a fungus ---
  const spots = {}, v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  function landSpot(fi) { if (fi in spots) return spots[fi]; const f = fungi[fi]; let best = null, hi = -1; f.root.updateMatrixWorld(true);
    f.root.traverse(o => { if (!o.isMesh || !o.visible) return; const P = o.geometry.attributes.position, N = o.geometry.attributes.normal;
      for (let j = 0; j < P.count; j++) { v2.fromBufferAttribute(N, j).transformDirection(o.matrixWorld); if (v2.y < 0.93) continue; v1.fromBufferAttribute(P, j).applyMatrix4(o.matrixWorld); if (v1.y > hi) { hi = v1.y; best = { p: v1.clone(), n: v2.clone() }; } } });
    if (best) best.n.lerp(Y, 0.6).normalize();      // it settles nearly level, whatever the bump it found
    if (best && W.hit(v1.copy(best.p).addScaledVector(best.n, 0.5), 0.2, -1) >= 0) best = null;
    return spots[fi] = best; }
  // Feeling a stem. The triangles of the fungus are sorted once into 10 cm layers by height, so each feel only looks at the
  // few hundred triangles at its own height (a plain search through every triangle stalled a phone for a moment).
  const climbs = {}, layers = {}, e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), pv = new THREE.Vector3(), tv = new THREE.Vector3(), qv = new THREE.Vector3();
  function layersOf(fi) { if (layers[fi]) return layers[fi]; const f = fungi[fi], L = { tri: [], slab: new Map() }; f.root.updateMatrixWorld(true);
    f.root.traverse(o => { if (!o.isMesh || !o.visible) return; const P = o.geometry.attributes.position, I = o.geometry.index, w = new Float32Array(P.count * 3);
      for (let k = 0; k < P.count; k++) { v1.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld); w[k * 3] = v1.x; w[k * 3 + 1] = v1.y; w[k * 3 + 2] = v1.z; }
      const n = I ? I.count : P.count;
      for (let k = 0; k < n; k += 3) { const a = I ? I.getX(k) : k, b = I ? I.getX(k + 1) : k + 1, c2 = I ? I.getX(k + 2) : k + 2, t = L.tri.length;
        L.tri.push(w[a * 3], w[a * 3 + 1], w[a * 3 + 2], w[b * 3], w[b * 3 + 1], w[b * 3 + 2], w[c2 * 3], w[c2 * 3 + 1], w[c2 * 3 + 2]);
        const lo = Math.floor(Math.min(w[a * 3 + 1], w[b * 3 + 1], w[c2 * 3 + 1]) * 10), hi = Math.floor(Math.max(w[a * 3 + 1], w[b * 3 + 1], w[c2 * 3 + 1]) * 10);
        for (let s = lo; s <= hi; s++) { let arr = L.slab.get(s); if (!arr) L.slab.set(s, arr = []); arr.push(t); } } });
    return layers[fi] = L; }
  function feel(L, o, d, far) { let best = far, bt = -1; const T = L.tri, y0 = Math.floor(Math.min(o.y, o.y + d.y * far) * 10), y1 = Math.floor(Math.max(o.y, o.y + d.y * far) * 10);
    for (let s = y0; s <= y1; s++) { const arr = L.slab.get(s); if (!arr) continue;
      for (let k = 0; k < arr.length; k++) { const t = arr[k]; e1.set(T[t + 3] - T[t], T[t + 4] - T[t + 1], T[t + 5] - T[t + 2]); e2.set(T[t + 6] - T[t], T[t + 7] - T[t + 1], T[t + 8] - T[t + 2]);
        pv.crossVectors(d, e2); const det = e1.dot(pv); if (det > -1e-9 && det < 1e-9) continue; const inv = 1 / det; tv.set(o.x - T[t], o.y - T[t + 1], o.z - T[t + 2]);
        const u = tv.dot(pv) * inv; if (u < 0 || u > 1) continue; qv.crossVectors(tv, e1); const w = d.dot(qv) * inv; if (w < 0 || u + w > 1) continue; const dist = e2.dot(qv) * inv; if (dist > 1e-4 && dist < best) { best = dist; bt = t; } } }
    if (bt < 0) return null; e1.set(T[bt + 3] - T[bt], T[bt + 4] - T[bt + 1], T[bt + 5] - T[bt + 2]); e2.set(T[bt + 6] - T[bt], T[bt + 7] - T[bt + 1], T[bt + 8] - T[bt + 2]);
    const n = new THREE.Vector3().crossVectors(e1, e2).normalize(); if (n.dot(d) > 0) n.negate(); return { p: o.clone().addScaledVector(d, best), n }; }
  function climbPath(fi, ang) { const key = fi + ':' + ang; if (key in climbs) return climbs[key];
    const f = fungi[fi], c = f.root.position, toV = new THREE.Vector3(-c.x, 0, -c.z).normalize().applyAxisAngle(Y, ang), lat = new THREE.Vector3(toV.z, 0, -toV.x), neg = toV.clone().negate(), nlat = lat.clone().negate(), L = layersOf(fi);
    const cast = (o, d, far) => feel(L, o, d, far);
    const pts = []; let ax = c.x, az = c.z;
    for (let y = 0.1; y < 9; y += 0.1) {
      let h = null; for (const off of pts.length ? [0] : [0, 0.15, -0.15, 0.35, -0.35, 0.6, -0.6]) { h = cast(new THREE.Vector3(ax + toV.x * 3 + lat.x * off, y, az + toV.z * 3 + lat.z * off), neg, 5); if (h) { ax += lat.x * off; az += lat.z * off; break; } }
      if (!h) break;
      if (pts.length) { const l = pts[pts.length - 1].p; if (Math.hypot(h.p.x - l.x, h.p.z - l.z) > 0.28) break; }
      if (h.n.y < -0.45 || h.n.y > 0.8) break;                                                       // the underside of the cap, or a shelf
      if (cast(h.p.clone().addScaledVector(h.n, 0.1), Y, 0.5)) break;                                 // head room under the cap
      if (W.hit(v1.copy(h.p).addScaledVector(h.n, 0.3), 0.4, fi) >= 0) break;                         // a neighbour in the way
      pts.push(h);
      const inside = h.p.clone().addScaledVector(toV, -0.05), L = cast(inside.clone().addScaledVector(lat, 2), nlat, 2.6), R = cast(inside.clone().addScaledVector(lat, -2), lat, 2.6);
      if (L && R) { const d = ((L.p.x + R.p.x) / 2 - ax) * lat.x + ((L.p.z + R.p.z) / 2 - az) * lat.z; if (Math.abs(d) < 0.2) { ax += lat.x * d; az += lat.z * d; } }
    }
    for (let i = 0; i < pts.length; i++) { const n = new THREE.Vector3(); for (let k = -2; k <= 2; k++) n.add(pts[Math.min(pts.length - 1, Math.max(0, i + k))].n); pts[i].ns = n.normalize(); }
    return climbs[key] = pts.length >= 9 ? pts : null; }
  // the fungus sways and leans; whatever is on it goes with it
  function sway(fi, y, out) { const f = fungi[fi], U = f.U, s = f.root.scale.x, H = U.uH.value, t = U.uTime.value, ph = U.uPhase.value, hk = Math.min(1.2, y / s / H);
    return out.set(Math.sin(t * 0.31 + ph) * 0.025 * H + U.uLook.value.x * H, 0, Math.cos(t * 0.23 + ph * 1.7) * 0.025 * H + U.uLook.value.y * H).multiplyScalar(hk * hk * s).applyAxisAngle(Y, f.root.rotation.y); }

  const list = CAST.map((c, i) => {
    const g = lib[c.n].clone(true), mats = [];
    g.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = true;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      const nm = arr.map(m => { const [pre, part] = (m.name || 'CM_Shell').split('_'); const mm = partMaterial(pre, part); mats.push(mm); return mm; });
      o.material = Array.isArray(o.material) ? nm : nm[0]; o.renderOrder = arr.some(m => /Memb|Lattice/.test(m.name)) ? 2 : 1; });
    const root = new THREE.Group(); root.add(g); root.scale.setScalar(c.s); root.visible = false; scene.add(root);
    for (const m of mats) m.userData.u.uPhase.value = i * 1.7 + 0.3;
    return { ...c, i, root, mats, pos: new THREE.Vector3(), q: new THREE.Quaternion(), qWant: new THREE.Quaternion(), fwd: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0), mode: 'wait', t: 0, gait: 0, walk: 0, flap: 0.25, host: -1 };
  });
  const set = (b, k, x) => { for (const m of b.mats) m.userData.u[k].value = x; };
  const enter = b => b.from ? ab(b.from[0], b.from[1]) : new THREE.Vector3();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), off = new THREE.Vector3();

  // --- walkers ---
  function walkTo(b, P, after) { const path = W.findPath(b.pos, P, b.rad); if (!path || path.length < 2) return false; b.path = path; b.seg = 0; b.mode = 'walk'; b.after = after; return true; }
  function crawlerNext(b) {
    if (b.climbs && Math.random() < 0.75) {
      for (const fi of CLIMB.filter(fi => grown(fi) && !busy[fi] && fi !== b.last).sort(() => Math.random() - 0.5)) { const cp = climbPath(fi, b.ang); if (!cp) continue;
        const base = cp[0].p.clone().addScaledVector(cp[0].ns, 0.3).setY(0); if (!walkTo(b, base, 'up')) continue;
        b.path.push(cp[0].p.clone().setY(0)); busy[fi] = b; b.prev = b.last; b.host = fi; b.last = fi; b.cp = cp; return; } }
    for (let k = 0; k < 30; k++) { const a = Math.random() * 6.283, r = 1.9 + Math.random() * 4.5; tmp.set(Math.cos(a) * r, 0, Math.sin(a) * r); if (W.free(tmp, b.rad + 0.1) && walkTo(b, tmp.clone(), 'pause')) return; }
    b.mode = 'pause'; b.t = 3;
  }
  function crawler(b, dt) {
    let moved = 0; b.up.set(0, 1, 0);
    if (b.mode === 'walk') { let step = b.sp * dt; moved = step;
      while (step > 0 && b.seg < b.path.length - 1) { const to = b.path[b.seg + 1], d = tmp.subVectors(to, b.pos).length(); if (d > 1e-4) b.fwd.copy(tmp).normalize(); if (d <= step) { b.pos.copy(to); step -= d; b.seg++; } else { b.pos.addScaledVector(b.fwd, step); step = 0; } }
      if (b.seg >= b.path.length - 1) { if (b.after === 'up' && grown(b.host)) { b.mode = 'up'; b.ci = 0; } else { if (b.host >= 0) { busy[b.host] = null; b.host = -1; } b.mode = 'pause'; b.t = 4 + Math.random() * 6; } } }
    else if (b.mode === 'pause') { b.t -= dt; if (b.watcher) { tmp.subVectors(camera.position, b.pos).setY(0).normalize(); b.fwd.lerp(tmp, 1 - Math.exp(-dt * 1.2)).normalize(); } if (b.t <= 0) crawlerNext(b); }
    else if (b.mode === 'up' || b.mode === 'down' || b.mode === 'perch') { const cp = b.cp, last = cp.length - 1;
      if (b.mode === 'up') { b.ci += 0.3 * dt / 0.1; moved = 0.3 * dt; if (b.ci >= last) { b.ci = last; b.mode = 'perch'; b.t = 9 + Math.random() * 12; } }
      else if (b.mode === 'perch') { b.t -= dt; if (b.t <= 0) b.mode = 'down'; }
      else { b.ci -= 0.36 * dt / 0.1; moved = 0.36 * dt; }
      if (b.ci <= 0 && b.mode === 'down') { b.pos.copy(cp[0].p).setY(0); b.fwd.copy(cp[0].ns).setY(0).normalize(); busy[b.host] = null; b.host = -1; crawlerNext(b); }
      else { const i = Math.min(last - 1, Math.floor(b.ci)), k = b.ci - i, A = cp[i], B = cp[i + 1];
        b.pos.lerpVectors(A.p, B.p, k).add(sway(b.host, b.pos.y, off)); b.up.lerpVectors(A.ns, B.ns, k).normalize();
        tmp.subVectors(B.p, A.p).normalize(); if (b.mode === 'down') tmp.negate(); b.fwd.copy(tmp); } }
    b.gait += moved / (0.42 * b.len * b.s) * 6.283; b.walk += ((moved > 0 ? 1 : 0) - b.walk) * (1 - Math.exp(-dt * 6));
    basisQuat(b.fwd, b.up, b.qWant);
  }
  // --- hoppers: in along the ground in short hops, then about their own patch of grass ---
  function hopper(b, dt) {
    b.up.set(0, 1, 0);
    if (b.mode === 'sit') { b.t -= dt; if (b.t <= 0) {
        let to = null;
        if (b.path && b.seg < b.path.length - 1) { const nx = b.path[b.seg + 1], d = tmp.subVectors(nx, b.pos).length(); if (d <= 0.6) { to = nx.clone(); b.seg++; } else to = b.pos.clone().addScaledVector(tmp.normalize(), 0.55); }
        else for (let k = 0; k < 12 && !to; k++) { const a = Math.random() * 6.283, r = 0.3 + Math.random() * 0.5; tmp.set(b.homeP.x + Math.cos(a) * r, 0, b.homeP.z + Math.sin(a) * r); if (W.free(tmp, b.rad) && W.los(b.pos, tmp, b.rad)) to = tmp.clone(); }
        if (to) { b.from0 = b.pos.clone(); b.to = to; b.k = 0; b.mode = 'hop'; b.fwd.subVectors(to, b.pos).setY(0).normalize(); } else b.t = 1; } }
    else if (b.mode === 'hop') { b.k = Math.min(1, b.k + dt / 0.5); b.pos.lerpVectors(b.from0, b.to, b.k); b.pos.y = Math.sin(Math.PI * b.k) * 0.28;
      if (b.k >= 1) { b.mode = 'sit'; b.t = b.path && b.seg < b.path.length - 1 ? 0.25 + Math.random() * 0.5 : 1.5 + Math.random() * 4; } }
    basisQuat(b.fwd, b.up, b.qWant);
  }
  // --- gliders: in from the trees; then mostly on the wing, in long easy loops round you between the caps, with short rests on a cap top
  // (Damian, 25 Nov 2026: it "looks great when flying... but does some unrealistic turns and movements... should mostly be flying")
  const flat = new THREE.Vector3(), qb = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
  const openLine = (P, Q) => { const n = Math.ceil(P.distanceTo(Q) / 0.3); for (let i = 1; i < n; i++) { v1.lerpVectors(P, Q, i / n); if (W.hit(v1, 0.8) >= 0 || Math.hypot(v1.x, v1.y - 1.55, v1.z) < 2) return false; } return true; };
  // One try at a flight each frame (planning a whole flight in one go made the picture stick for a moment on a phone).
  function gliderNext(b) {
    const from = b.mode === 'wait' ? null : b.pos;
    if (!b.cand || !b.cand.length) { b.cand = LAND.filter(fi => grown(fi) && !top[fi] && fi !== b.host && landSpot(fi)).sort(() => Math.random() - 0.5); b.k = 0; if (!b.cand.length) return false; }
    const fi = b.cand[0], sp = landSpot(fi), k = b.k++; if (b.k >= 40 || !grown(fi) || top[fi]) { b.cand.shift(); b.k = 0; if (!grown(fi) || top[fi]) return false; }
    const B = sp.p.clone().addScaledVector(sp.n, 0.035 * b.s), pts = [], turn = Math.random() < 0.5 ? 1 : -1; let a, A;
    if (!from) { a = THREE.MathUtils.degToRad(b.az + (Math.random() - 0.5) * 50); A = new THREE.Vector3(Math.sin(a) * 26, 9 + Math.random() * 3, -Math.cos(a) * 26); a = Math.atan2(A.x, -A.z); } else { A = from.clone(); a = Math.atan2(A.x, -A.z); }
    pts.push(A);
    const loops = k > 37 ? 0 : k > 32 ? 1 : k > 24 ? 2 : k > 12 ? 3 + Math.floor(Math.random() * 2) : (from ? 5 : 2) + Math.floor(Math.random() * 3), w = [];
    for (let i = 1; i <= loops; i++) { a += turn * (0.8 + Math.random() * 0.5); for (let q = 0; q < 30; q++) { const a2 = a + (Math.random() - 0.5) * 0.7, r = 3.0 + Math.random() * 6.5; tmp.set(Math.sin(a2) * r, 2.2 + Math.random() * 4.2, -Math.cos(a2) * r); if (W.hit(tmp, 1.1) < 0 && openLine(w[w.length - 1] || (from ? tmp2.copy(A).addScaledVector(Y, 0.9) : tmp), tmp)) { w.push(tmp.clone()); break; } } }
    if (w.length < Math.min(loops, 3)) return false;
    const first = w[0] || B, lastW = w[w.length - 1] || A;
    if (from) pts.push(A.clone().addScaledVector(Y, 0.45).addScaledVector(flat.subVectors(first, A).setY(0).normalize(), 0.7));          // it lifts off forward, not straight up
    pts.push(...w);
    pts.push(B.clone().addScaledVector(Y, 0.5).addScaledVector(flat.subVectors(lastW, B).setY(0).normalize(), 0.9));                     // and comes in on a shallow glide
    pts.push(B);
    const c = W.route(pts, { r: 0.5, hostA: from ? b.host : -1, hostB: fi }); if (!c) return false;
    if (b.host >= 0) top[b.host] = null; b.prev = b.host; top[fi] = b; b.host = fi; b.spot = sp; b.land = B; b.curve = c; b.u = 0; b.bank = 0; b.yaw0 = null; b.mode = 'fly'; b.cand = null; return true; }
  function glider(b, dt) {
    if (b.mode === 'fly') { const L = b.curve.len, left = (1 - b.u) * L, sp = 0.45 + 2.5 * smooth(0, 2.5, left) * (0.3 + 0.7 * smooth(0, 1.5, b.u * L + 0.3));
      b.u = Math.min(1, b.u + sp * dt / L); b.curve.getPointAt(b.u, b.pos); b.curve.getTangentAt(b.u, tmp); b.flap = 0.9;
      // the body keeps nearly level and turns only as fast as the path turns: nose a little up or down with the path, leaning into the turn
      flat.copy(tmp).setY(0); if (flat.lengthSq() < 1e-4) flat.copy(b.fwd).setY(0); flat.normalize();
      const pitch = clamp(Math.asin(clamp(tmp.y, -1, 1)), -0.4, 0.4), yawNow = Math.atan2(flat.x, flat.z); let dy = b.yaw0 === null ? 0 : yawNow - b.yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw0 = yawNow;
      b.bank += (clamp(-dy / Math.max(dt, 1e-3) * 0.35, -0.5, 0.5) * smooth(0, 1.5, left) - b.bank) * (1 - Math.exp(-dt * 3));
      b.fwd.copy(flat).multiplyScalar(Math.cos(pitch)).addScaledVector(Y, Math.sin(pitch)); b.up.lerpVectors(Y, b.spot.n, 1 - smooth(0, 0.6, left)).normalize();
      if (b.u >= 1) { b.mode = 'rest'; b.t = 2.5 + Math.random() * 3; } }
    else if (b.mode === 'rest') { b.t -= dt; b.bank = 0; b.flap += (0.12 - b.flap) * (1 - Math.exp(-dt * 2)); b.up.copy(b.spot.n); b.pos.copy(b.land).add(sway(b.host, b.land.y, off));
      tmp.copy(b.fwd).addScaledVector(b.up, -b.fwd.dot(b.up)).normalize(); b.fwd.copy(tmp);
      if (b.t <= 0) gliderNext(b); }
    set(b, 'uFlap', b.flap); basisQuat(b.fwd, b.up, b.qWant); b.qWant.multiply(qb.setFromAxisAngle(Z, b.bank || 0));
  }
  function start(b) {
    if (b.role === 'glider') { b.root.visible = gliderNext(b); if (b.root.visible) { b.curve.getPointAt(0, b.pos); b.curve.getTangentAt(0, b.fwd); b.fwd.setY(0).normalize(); basisQuat(b.fwd, Y, b.q); } return; }
    b.pos.copy(enter(b)); b.root.visible = true;
    if (b.role === 'hopper') { b.homeP = ab(b.home[0], b.home[1]); b.path = W.findPath(b.pos, b.homeP, b.rad); b.seg = 0; b.mode = 'sit'; b.t = 0; if (b.path) b.pos.copy(b.path[0]); }
    else { b.pos.copy(W.findPath(b.pos, new THREE.Vector3(0, 0, 3), b.rad)?.[0] || b.pos); crawlerNext(b); }
    if (b.path) { b.fwd.subVectors(b.path[1] || b.pos, b.pos).setY(0).normalize(); basisQuat(b.fwd, Y, b.q); }
  }
  const api = {
    list,
    reset() { for (const b of list) { b.mode = 'wait'; b.root.visible = false; b.host = -1; b.path = null; b.walk = 0; } for (const k in busy) busy[k] = null; for (const k in top) top[k] = null; },
    /** anything touching a fungus it is not standing on (for the checks; should always be empty) */
    clashes() { const out = []; for (const b of list) { if (!b.root.visible) continue; tmp2.copy(b.pos).addScaledVector(b.up, 0.3); const h = W.hit(tmp2, 0.2, b.host); if (h >= 0 && h !== b.last && h !== b.prev) out.push([b.n, b.mode, h, fungi[h].species, +b.pos.x.toFixed(2), +b.pos.y.toFixed(2), +b.pos.z.toFixed(2)]); } return out; },
    update(dt, time) {
      TIME.value = time;
      for (const b of list) {
        if (b.mode === 'wait') { if (time < b.arrive) continue; start(b); if (b.mode === 'wait') continue; }
        if (b.host >= 0 && !grown(b.host)) { api.reset(); return; }
        if (b.role === 'crawler') crawler(b, dt); else if (b.role === 'hopper') hopper(b, dt); else glider(b, dt);
        b.q.slerp(b.qWant, 1 - Math.exp(-dt * (b.role === 'glider' ? 3 : 7)));
        b.root.position.copy(b.pos); b.root.quaternion.copy(b.q);
        set(b, 'uGait', b.gait); set(b, 'uWalk', b.walk); set(b, 'uCalm', b.mode === 'pause' || b.mode === 'perch' ? 0.6 : 0);
      }
    },
  };
  return api;
}
