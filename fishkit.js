// Flying fish for scenes away from the lake (the lake scene carries its own school, with reflections and the hunt).
// Same fish as the lake: scaled body, glassy veined butterfly wings, a veil of a tail.
import * as THREE from 'three';

function finGeo(L, C, nu = 12, nv = 5, scallop = 5, sweep = 0.25) {
  const g = new THREE.BufferGeometry(), v = [], idx = [], uv = [];
  for (let i = 0; i <= nu; i++) { const u = i / nu, c = C * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(0.97, 0.06 + 0.94 * u), 0.75)), 0.6) * (1 - 0.25 * u);
    for (let j = 0; j <= nv; j++) { const t = j / nv, edge = t === 1 ? (1 - 0.16 * Math.abs(Math.sin(u * Math.PI * scallop))) : 1;
      v.push(L * u, 0.05 * L * Math.sin(u * 2.6) * (0.4 + t), sweep * L * u * u - c * t * edge); uv.push(u, t); } }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function finMat(U, kind, seed) {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const u = { uTime: U.uTime, uSeed: { value: seed }, uKind: { value: kind } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFu; uniform float uTime, uSeed, uKind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vFu = uv; float wv = sin(uv.x * 5.0 - uTime * (uKind > 0.5 ? 7.0 : 0.0) + uSeed) * uv.x * uv.x; transformed.y += wv * (uKind > 0.5 ? 0.16 : 0.0);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vFu; uniform float uTime, uSeed, uKind;')
      .replace('#include <color_fragment>', `
        float u = vFu.x, t = vFu.y;
        vec3 wing = mix(vec3(1.0, 0.45, 0.72), vec3(0.30, 0.92, 0.86), smoothstep(0.15, 0.6, u + 0.25 * sin(t * 5.0 + uSeed)));
        wing = mix(wing, vec3(0.62, 0.38, 0.98), smoothstep(0.55, 1.0, u) * 0.8);
        vec3 veil = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.32, 0.62), smoothstep(0.1, 0.7, u)); veil = mix(veil, vec3(0.62, 0.40, 0.95), smoothstep(0.7, 1.0, u) * 0.6);
        vec3 c = mix(wing, veil, uKind);
        float fan = abs(sin((t * 6.0 + u * 1.2 * sin(t * 3.0 + uSeed)) * 3.14159));
        float cell = abs(sin(u * 19.0 + 2.0 * sin(t * 7.0 + uSeed)));
        float vein = max(1.0 - smoothstep(0.0, 0.16, fan), (1.0 - smoothstep(0.0, 0.14, cell)) * smoothstep(0.25, 0.8, u) * 0.9);
        float rim = max(smoothstep(0.86, 1.0, t), 1.0 - smoothstep(0.0, 0.06, t));
        c = mix(c, vec3(1.0, 0.74, 0.22), max(vein, rim * 0.9));
        float shimmer = 0.75 + 0.25 * sin(u * 30.0 + t * 12.0 + uTime * 3.0 + uSeed);
        diffuseColor.rgb = c * shimmer * 0.92;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.333))) * vec3(0.82, 0.95, 1.08), 0.32);
        diffuseColor.a = clamp(0.44 + 0.5 * vein + 0.4 * rim, 0.0, 0.96) * (1.0 - smoothstep(0.93, 1.0, u) * 0.5);`);
  };
  m.customProgramCacheKey = () => 'fishfin2';
  return m;
}

/** Reads the v2 fish binary (GFM1: counts, then positions, normals, uvs as floats, then 16-bit indices; Unity space, head +Z). */
export function parseGFM(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), nv = dv.getInt32(4, true), ni = dv.getInt32(8, true);
  const f = new Float32Array(bytes.buffer.slice(bytes.byteOffset + 12, bytes.byteOffset + 12 + nv * 32)), ix = new Uint16Array(bytes.buffer.slice(bytes.byteOffset + 12 + nv * 32, bytes.byteOffset + 12 + nv * 32 + ni * 2));
  // whichever way the file winds its triangles, make them face the way their normals point
  { let agree = 0; const P = f, N = f.subarray(nv * 3, nv * 6);
    for (let i = 0; i < ni; i += 3) { const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      agree += Math.sign((uy * vz - uz * vy) * (N[a] + N[b] + N[c]) + (uz * vx - ux * vz) * (N[a + 1] + N[b + 1] + N[c + 1]) + (ux * vy - uy * vx) * (N[a + 2] + N[b + 2] + N[c + 2])); }
    if (agree < 0) for (let i = 0; i < ni; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(f.subarray(0, nv * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(f.subarray(nv * 3, nv * 6), 3)); g.setAttribute('uv', new THREE.BufferAttribute(f.subarray(nv * 6, nv * 8), 2));
  g.setIndex(new THREE.BufferAttribute(ix, 1)); return g;
}

/** v2: { body, eyes: BufferGeometry, albedo, iris: Texture } is the modelled fish with a real face (25 Nov 2026); without it, the first fish. */
export function createFishKit(v2 = null) {
  const U = { uTime: { value: 0 } };
  const bodyG = new THREE.SphereGeometry(0.11, 18, 12); bodyG.scale(0.8, 1.05, 4.0);
  { const pos = bodyG.attributes.position, col = []; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 0.115, z = pos.getZ(i) / 0.44;
      pos.setX(i, pos.getX(i) * (1 - 0.6 * Math.max(0, -z) ** 1.4)); pos.setY(i, pos.getY(i) * (1 - 0.62 * Math.max(0, -z) ** 1.4));
      const k = THREE.MathUtils.smoothstep(y, -0.35, 0.7), head = THREE.MathUtils.smoothstep(z, 0.45, 1.0), line = Math.exp(-Math.pow((y - 0.12) / 0.07, 2));
      let r = 0.92 - 0.84 * k, g = 0.93 - 0.66 * k, b = 0.95 - 0.48 * k; r -= 0.25 * line; g -= 0.18 * line; b -= 0.10 * line;
      r = r * (1 - 0.45 * head) + 0.95 * 0.45 * head; g = g * (1 - 0.45 * head) + 0.70 * 0.45 * head; b = b * (1 - 0.45 * head) + 0.62 * 0.45 * head;
      col.push(r, g, b); }
    bodyG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); bodyG.computeVertexNormals(); }
  const wingG = finGeo(0.78, 0.46, 12, 5, 5, 0.22), hindG = finGeo(0.46, 0.30, 9, 4, 4, 0.45), veilG = finGeo(0.75, 0.30, 12, 4, 6, 0.0), dorsG = finGeo(0.20, 0.22, 6, 3, 3, 0.6);
  const eyeG = new THREE.SphereGeometry(0.03, 10, 8), pupG = new THREE.SphereGeometry(0.017, 8, 6);
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; { const c = sc.getContext('2d'); c.fillStyle = '#b9b9b9'; c.fillRect(0, 0, 128, 128);
    for (let row = -1; row < 9; row++) for (let q = -1; q < 9; q++) { const x = q * 16 + (row % 2 ? 8 : 0), y = row * 16; const g = c.createRadialGradient(x + 8, y + 4, 1, x + 8, y + 6, 11); g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, '#c8c8c8'); g.addColorStop(1, '#5a5a5a');
      c.fillStyle = g; c.beginPath(); c.ellipse(x + 8, y + 8, 9, 10, 0, 0, Math.PI * 2); c.fill(); } }
  const scaleMap = new THREE.CanvasTexture(sc); scaleMap.wrapS = scaleMap.wrapT = THREE.RepeatWrapping; scaleMap.repeat.set(7, 2.5); scaleMap.colorSpace = THREE.SRGBColorSpace; scaleMap.anisotropy = 4;
  const iris = new THREE.MeshPhysicalMaterial({ color: 0xe9a224, roughness: 0.2, clearcoat: 1, emissive: 0x3a2400 }), pup = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.05, clearcoat: 1 });
  const bm = new THREE.MeshPhysicalMaterial({ vertexColors: true, map: scaleMap, bumpMap: scaleMap, bumpScale: 1.2, metalness: 0.6, roughness: 0.3, clearcoat: 0.6, iridescence: 0.45, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 600], envMapIntensity: 1.2 });

  let bm2 = null, em2 = null;
  if (v2) { for (const t of [v2.albedo, v2.iris]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }
    bm2 = new THREE.MeshPhysicalMaterial({ map: v2.albedo, metalness: 0.25, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, iridescence: 0.3, iridescenceIOR: 1.35, iridescenceThicknessRange: [200, 500], envMapIntensity: 1.0, side: THREE.DoubleSide });
    em2 = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, map: v2.iris, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3 }); }

  function spawn() {
    const seed = Math.random() * 20, wm = finMat(U, 0, seed), vm = finMat(U, 1, seed + 3);
    const f = new THREE.Group(), body = v2 ? new THREE.Mesh(v2.body, bm2) : new THREE.Mesh(bodyG, bm);
    const mk = (g, side, z, y, mat) => { const piv = new THREE.Group(); piv.position.set(side * 0.06, y, z); const m = new THREE.Mesh(g, mat); m.scale.x = side; piv.add(m); f.add(piv); return piv; };
    const wL = mk(wingG, 1, 0.16, 0.04, wm), wR = mk(wingG, -1, 0.16, 0.04, wm), pL = mk(hindG, 1, -0.06, 0.0, wm), pR = mk(hindG, -1, -0.06, 0.0, wm);
    const tail = new THREE.Group(); tail.position.z = -0.40;
    for (const [rz, s] of [[1.25, 1.0], [1.9, 0.8], [0.75, 0.75], [-1.15, 0.85]]) { const t = new THREE.Mesh(veilG, vm); t.rotation.set(0, Math.PI / 2, 0); t.rotateX(rz); t.scale.setScalar(s); tail.add(t); }
    const dors = new THREE.Mesh(dorsG, vm); dors.rotation.set(0, Math.PI / 2, 0); dors.rotateX(Math.PI / 2); dors.position.set(0, 0.09, 0.10);
    if (v2) f.add(new THREE.Mesh(v2.eyes, em2)); else for (const sx of [1, -1]) { const e = new THREE.Mesh(eyeG, iris); e.position.set(sx * 0.062, 0.025, 0.31); e.scale.set(0.6, 1, 1); const pu = new THREE.Mesh(pupG, pup); pu.position.set(sx * 0.074, 0.025, 0.315); pu.scale.set(0.6, 1, 1); f.add(e, pu); }
    f.add(body, tail, dors); f.traverse(o => { o.frustumCulled = false; });
    f.userData = { wL, wR, pL, pR, tail, ph: Math.random() * 6.28, size: 0.62 + 0.3 * Math.random() };
    f.scale.setScalar(f.userData.size);
    return f;
  }
  // wings flap from the shoulder; glide 0..1 holds them out
  function flap(f, time, glide = 0, rate = 26) {
    const ud = f.userData, beat = Math.sin(time * rate + ud.ph) * (1 - 0.75 * glide * glide), fl = 0.22 + 0.7 * beat;
    ud.wL.rotation.set(0, 0, fl); ud.wR.rotation.set(0, 0, -fl); ud.pL.rotation.set(0, -0.5, fl * 0.7 - 0.2); ud.pR.rotation.set(0, 0.5, -fl * 0.7 + 0.2);
    ud.tail.rotation.y = Math.sin(time * 9 + ud.ph) * 0.3;
  }
  return { spawn, flap, tick(time) { U.uTime.value = time; } };
}
