// A few of the rainforest creatures, visiting the mushroom path: glider shrimps looping between the caps, a canopy mantis-shrimp
// watching from a stepping stone, a shell walker and a spore grazer at the feet of the fungi, frond hoppers in the grass.
// Models and skin shaders are the reef-forest look-around's; shown at 2 to 3 times life size so a phone can read them.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
uniform float uTime, uPhase, uFlap, uSway, uCalm;
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
  const u = { uTime: TIME, uPhase: { value: 0 }, uFlap: { value: 0.25 }, uSway: { value: 1 }, uCalm: { value: 0 },
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


// where each one lives: x east, z south (metres from where you stand), y up
const CAST = [
  { n: 'CanopyMantis', at: [1.75, 0.02, -1.55], s: 2.4, role: 'watcher' },
  { n: 'ShellWalker', at: [-1.9, 0, 0.9], s: 1.8, role: 'shy' },
  { n: 'SporeGrazer', at: [2.6, 0, 0.75], s: 2.6, role: 'grazer' },
  { n: 'FrondHopper', at: [-1.5, 0, -2.4], s: 3.0, role: 'hopper' },
  { n: 'FrondHopper', at: [0.3, 0, 2.6], s: 2.7, role: 'hopper' },
  { n: 'FrondHopper', at: [3.4, 0, -3.6], s: 2.8, role: 'hopper' },
  { n: 'GliderShrimp', at: [0.5, 2.7, -1.0], s: 2.3, role: 'glider', r: 3.2 },
  { n: 'GliderShrimp', at: [-1.0, 3.6, 0.5], s: 2.0, role: 'glider', r: 4.6 },
];
export async function createBugs({ scene, bin, camera }) {
  const loader = new GLTFLoader(), lib = {};
  await Promise.all([...new Set(CAST.map(c => c.n))].map(async n => { lib[n] = (await loader.parseAsync((await bin(n + '_glb.txt')).buffer, '')).scene; }));
  const list = CAST.map((c, i) => {
    const g = lib[c.n].clone(true), mats = [];
    g.traverse(o => { if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = true;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      const nm = arr.map(m => { const [pre, part] = (m.name || 'CM_Shell').split('_'); const mm = partMaterial(pre, part); mats.push(mm); return mm; });
      o.material = Array.isArray(o.material) ? nm : nm[0]; o.renderOrder = arr.some(m => /Memb|Lattice/.test(m.name)) ? 2 : 1; });
    const root = new THREE.Group(); root.add(g); root.scale.setScalar(0.001); root.visible = false; scene.add(root);
    const home = new THREE.Vector3(...c.at), phase = i * 1.7 + 0.3;
    for (const m of mats) { m.userData.u.uPhase.value = phase; m.userData.u.uFlap.value = c.role === 'glider' ? 0.9 : c.n === 'CanopyMantis' ? 0.35 : 0.25; }
    return { ...c, root, mats, home, pos: home.clone(), phase, yaw: Math.atan2(-home.x, -home.z), yawNow: Math.atan2(-home.x, -home.z), look: 0, t: Math.random() * 10, state: 'idle', timer: 2 + Math.random() * 3, target: home.clone(), from: home.clone(), grow: 0, arrive: 6 + i * 5 };
  });
  const camDir = new THREE.Vector3(), d = new THREE.Vector3(), toCam = new THREE.Vector3();
  return {
    reset() { for (const b of list) { b.grow = 0; b.root.visible = false; b.pos.copy(b.home); b.state = 'idle'; } },
    update(dt, time) {
      TIME.value = time; camera.getWorldDirection(camDir);
      for (const b of list) {
        if (time < b.arrive) { b.root.visible = false; continue; }
        b.root.visible = true; b.grow = Math.min(1, b.grow + dt / 2.5); b.t += dt;
        d.subVectors(b.pos, camera.position).normalize(); const gz = clamp((d.dot(camDir) - 0.94) / 0.05, 0, 1); b.look += (gz - b.look) * (1 - Math.exp(-dt * 3));
        toCam.subVectors(camera.position, b.pos); const yawTo = Math.atan2(toCam.x, toCam.z); let want = b.yawNow, calm = 0, bank = 0;
        const R = b.role;
        if (R === 'watcher') { let dy = yawTo - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); want = b.yaw + dy * (0.25 + 0.6 * smooth(0.1, 0.8, b.look)); calm = b.look; }
        else if (R === 'shy') { d.set(b.home.x, 0, b.home.z).normalize().multiplyScalar(0.8 * smooth(0.3, 0.9, b.look)); b.target.copy(b.home).add(d);
          b.pos.lerp(b.target, 1 - Math.exp(-dt * (b.look > 0.3 ? 1.5 : 0.25))); want = yawTo + (b.look > 0.3 ? Math.PI : 0.6 * Math.sin(b.t * 0.2)); }
        else if (R === 'grazer') { want = b.yaw + 1.2 + 0.45 * Math.sin(b.t * 0.4); b.pos.y = b.home.y + 0.004 * Math.abs(Math.sin(b.t * 2.2)); }
        else if (R === 'hopper') { b.timer -= dt;
          if (b.state === 'idle' && b.timer < 0) { b.state = 'hop'; b.hopT = 0; b.from.copy(b.pos); const a = Math.random() * 6.28, r = 0.3 + Math.random() * 0.5; b.target.set(b.home.x + Math.cos(a) * r, 0, b.home.z + Math.sin(a) * r); b.yawNow = Math.atan2(b.target.x - b.pos.x, b.target.z - b.pos.z); }
          if (b.state === 'hop') { b.hopT += dt / 0.55; const k = clamp(b.hopT, 0, 1); b.pos.lerpVectors(b.from, b.target, k); b.pos.y = Math.sin(Math.PI * k) * 0.3; if (k >= 1) { b.state = 'idle'; b.timer = 1.5 + Math.random() * 4; } }
          want = b.yawNow; }
        else if (R === 'glider') { const a = b.t * 0.22 + b.phase, rr = b.r * (1 + 0.18 * Math.sin(b.t * 0.07));
          b.pos.set(b.home.x + Math.cos(a) * rr, b.home.y + 0.5 * Math.sin(b.t * 0.31), b.home.z + Math.sin(a) * rr); want = Math.atan2(-Math.sin(a), Math.cos(a)); bank = 0.3; }
        d.subVectors(b.pos, camera.position); if (d.length() < 1.0) b.pos.copy(camera.position).addScaledVector(d.normalize(), 1.0);      // never inside arm's length
        let dy = want - b.yawNow; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); if (R !== 'hopper') b.yawNow += dy * (1 - Math.exp(-dt * 2.5));
        b.root.position.copy(b.pos); b.root.rotation.set(0, b.yawNow, bank, 'YXZ'); b.root.scale.setScalar(b.s * smooth(0, 1, b.grow));
        for (const m of b.mats) m.userData.u.uCalm.value = calm;
      }
    },
  };
}
