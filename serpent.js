// The water serpent, for the mushroom path: it rises from behind the boardwalk across the pond (so where it meets the water is
// hidden), arches over the bridge, comes low over the pond toward you, turns and goes back down behind the bridge.
// Model, skin, jaw, teeth and spine posing are the lake scene's (Lake Serpent Real); only the path is new.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export async function createSerpent({ scene, bin, EYE = 1.55, length = 15 }) {
const tex2 = {}, mats = {}, clips = {}, chain = []; let serpent, mixer, headBone, restQ = [], cum = [], headDist = 0, scaleMul = 1, time = 0;
const TEXS = ['tex_Scales_A.jpg', 'tex_Scales_N.jpg', 'tex_Scales_M.jpg', 'tex_Membrane_A.jpg', 'tex_Membrane_N.jpg'];
const TL = new THREE.TextureLoader();
const [glbBytes] = await Promise.all([bin('serpent_v3_glb.txt'), ...TEXS.map(f => TL.loadAsync(f).then(t => { tex2[f] = t; }))]);
const gltf = await new GLTFLoader().parseAsync(glbBytes.buffer, '');
// water-made look: fresnel rim glow, flowing light veins, and a fade/tint below the surface
function waterise(m, rim, veins, silk = 0) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uRim = { value: rim }; sh.uniforms.uVeins = { value: veins }; sh.uniforms.uTime = { value: 0 }; sh.uniforms.uGlow = { value: 1 }; sh.uniforms.uVeinMap = { value: tex2['tex_Membrane_A.jpg'] }; sh.uniforms.uSilk = { value: silk }; sh.uniforms.uVeinCol = { value: new THREE.Color(m.userData.veinCol || 0xd8ff70) };
    m.userData.sh = sh;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec2 vUv2; uniform float uTime, uSilk;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (uSilk > 0.0) {
          float fid = floor(uv.x), fa = fract(uv.x), fr = uv.y;
          float fl = fr * fr * (1.4 - 0.4 * fr);
          float ph = fid * 1.73;
          // a slow swell from root to tip, a second wave running across the rays, and a gentle sway
          float w1 = sin(fr * 3.2 - uTime * 1.25 + ph);
          float w2 = sin(fr * 5.5 + fa * 3.0 - uTime * 1.9 + ph * 0.7);
          transformed += objectNormal * (w1 * 0.34 + w2 * 0.12) * fl * uSilk;
          transformed.y += (0.10 * sin(uTime * 0.8 + ph) + 0.16) * fl * uSilk;      // tips trail back
        }`)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vUv2 = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec2 vUv2; uniform float uRim, uVeins, uTime, uGlow, uSilk; uniform vec3 uVeinCol; uniform sampler2D uVeinMap; float h3r(vec3 p){ p = fract(p * 0.3183099 + 0.1) * 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); } float n3r(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h3r(i), h3r(i + vec3(1,0,0)), f.x), mix(h3r(i + vec3(0,1,0)), h3r(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3r(i + vec3(0,0,1)), h3r(i + vec3(1,0,1)), f.x), mix(h3r(i + vec3(0,1,1)), h3r(i + vec3(1,1,1)), f.x), f.y), f.z); } float veinNet(vec2 p){ float a = sin(p.x * 5.0 + sin(p.y * 1.7) * 2.2 + sin(p.y * 0.6) * 3.0); float b = sin(p.y * 3.1 + sin(p.x * 2.0) * 2.0 + 1.7); float l1 = 1.0 - smoothstep(0.0, 0.09, abs(a)); float l2 = 1.0 - smoothstep(0.0, 0.06, abs(b + a * 0.5)); return max(l1 * 0.9, l2 * 0.6); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        // REAL ANIMAL PASS. Body: countershaded like anything that lives in open water (dark olive-slate back, pale pearl
        // belly), broken by irregular blotches and saddles that never repeat, old scars, and algae-green staining low on the
        // flanks. Fins: thin skin stretched over bony rays, amber-grey, darker and frayed toward the trailing edge.
        vec3 wn = normalize((vec4(normalize(vNormal), 0.0) * viewMatrix).xyz);       // world-space normal
        float bl1 = n3r(vec3(vUv2.x * 5.0, vUv2.y * 46.0, 1.7)), bl2 = n3r(vec3(vUv2.x * 13.0, vUv2.y * 130.0, 4.1)), bl3 = n3r(vec3(vUv2.x * 2.0, vUv2.y * 11.0, 9.3));
        if (uSilk <= 0.0 && uVeins >= 0.0) {
          float back = smoothstep(-0.35, 0.55, wn.y + 0.25 * (bl3 - 0.5));
          vec3 belly = vec3(0.62, 0.60, 0.50), flank = vec3(0.20, 0.25, 0.17), dorsal = vec3(0.045, 0.065, 0.06);
          vec3 c = mix(belly, flank, smoothstep(0.0, 0.55, back)); c = mix(c, dorsal, smoothstep(0.5, 1.0, back));
          float saddle = smoothstep(0.52, 0.70, bl1 + 0.25 * bl3) * smoothstep(0.15, 0.7, back);
          c = mix(c, dorsal * 0.6, saddle * 0.75);                                    // dark saddles and blotches over the back
          c = mix(c, vec3(0.30, 0.33, 0.14), smoothstep(0.62, 0.8, bl2) * (1.0 - back) * 0.45);   // algae staining on the lower flanks
          c = mix(c, vec3(0.50, 0.44, 0.38), smoothstep(0.80, 0.84, n3r(vec3(vUv2.x * 3.0 + 4.0, vUv2.y * 23.0, 2.2))) * 0.5);   // healed scars
          diffuseColor.rgb = c * (0.55 + 0.9 * diffuseColor.rgb);                     // the scale texture rides on top
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fr = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 3.5);
        float under = smoothstep(0.15, -1.2, vWP.y);
        // a faint cold light along the lateral line at dusk only (uGlow > 1), like a deep-water fish
        float lat = (1.0 - smoothstep(0.0, 0.035, abs(fract(vUv2.x) - 0.25))) * step(0.5, fract(vUv2.y * 60.0 + bl2));
        totalEmissiveRadiance += vec3(0.25, 0.85, 0.75) * lat * max(0.0, uGlow - 1.0) * 0.5 * step(uSilk, 0.0) * (1.0 - 0.7 * under);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.8, 0.75), under);
        diffuseColor.a *= 1.0 - 0.75 * under;
        if (uSilk > 0.0) {
          float fa = fract(vUv2.x), frr = vUv2.y, fid = floor(vUv2.x);
          float rayd = abs(fract(fa * 3.0 + 0.5) - 0.5);                         // 4 bony rays at fa = 0, 1/3, 2/3, 1
          float ray = (1.0 - smoothstep(0.0, 0.05, rayd)) * (1.0 - 0.45 * frr);
          float fine = pow(abs(sin(fa * 3.14159 * (26.0 + 9.0 * n3r(vec3(fid, 1.0, 2.0))) + bl1)), 10.0) * 0.5;      // soft secondary rays, uneven per fin
          float fray = smoothstep(0.62, 1.0, frr + 0.35 * (n3r(vec3(fa * 9.0 + fid * 3.1, frr * 3.0, fid)) - 0.5) + 0.25 * step(0.82, n3r(vec3(fid, 3.0, 5.0))));   // torn, worn trailing edges; some fins worse than others
          vec3 skin = mix(vec3(0.30, 0.30, 0.20), vec3(0.52, 0.40, 0.22), n3r(vec3(fid * 1.7, fa * 2.0, frr * 2.0)));     // amber-grey membrane, each fin its own shade
          skin = mix(skin, vec3(0.20, 0.10, 0.07), smoothstep(0.55, 1.0, frr) * 0.6);                                     // darker, reddish margin
          skin = mix(skin, vec3(0.07, 0.08, 0.06), max(ray, fine * 0.6));                                                 // the rays themselves are dark horn
          diffuseColor.rgb = skin * (1.0 - 0.3 * smoothstep(0.6, 0.75, bl1));                                             // blotches
          float a = 0.42 + 0.50 * ray + 0.22 * fine + 0.15 * fr;
          a *= 1.0 - fray * (0.75 + 0.25 * step(0.5, n3r(vec3(fa * 31.0, frr * 17.0, fid))));
          diffuseColor.a = clamp(a, 0.0, 0.96) * (1.0 - 0.75 * under);
          float through = clamp(dot(-normalize(vNormal), normalize(vec3(-0.3, 0.8, 0.5))) * 0.6 + 0.4, 0.0, 1.0);        // daylight through the membrane
          totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.8, 0.5) * through * 0.35 * (1.0 - ray) * min(uGlow, 1.0);
        }`);
  };
  m.customProgramCacheKey = () => 'water' + rim + veins + '_' + silk;
}
const T = (f, rx, ry, srgb) => { const t = tex2[f].clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
tex2['tex_Membrane_A.jpg'].wrapS = tex2['tex_Membrane_A.jpg'].wrapT = THREE.RepeatWrapping; tex2['tex_Membrane_A.jpg'].needsUpdate = true;
mats.body = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: T('tex_Scales_A.jpg', 3, 26, true), normalMap: T('tex_Scales_N.jpg', 3, 22), normalScale: new THREE.Vector2(1.3, 1.3),
  roughness: 0.42, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.22, iridescence: 0.3, iridescenceIOR: 1.3, iridescenceThicknessRange: [250, 500], envMapIntensity: 0.55, side: THREE.DoubleSide, name: 'WS_Body' });
waterise(mats.body, 0.0, 0.0);
mats.fin = new THREE.MeshPhysicalMaterial({ color: 0x5a5236, map: T('tex_Membrane_A.jpg', 1, 2, true), normalMap: T('tex_Membrane_N.jpg', 1, 2), normalScale: new THREE.Vector2(0.8, 0.8),
  roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.4, name: 'WS_Fin' });
waterise(mats.fin, 0.0, -1.0);
mats.veil = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, transparent: true, opacity: 1.0, depthWrite: false, clearcoat: 0.4, clearcoatRoughness: 0.3, side: THREE.DoubleSide, envMapIntensity: 0.5, name: 'WS_Veil' });
waterise(mats.veil, 0.0, 0.0, 1.0);
mats.glow = new THREE.MeshPhysicalMaterial({ color: 0x0c0a06, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, sheen: 1, sheenColor: new THREE.Color(0xb07a1a), sheenRoughness: 0.35, name: 'WS_Glow' });
serpent = gltf.scene;
serpent.traverse(o => { if (o.isMesh) { o.frustumCulled = false; const ms = Array.isArray(o.material) ? o.material : [o.material]; const nm = ms.map(m => m.name === 'WS_Veil' ? mats.veil : m.name === 'WS_Fin' ? mats.fin : m.name === 'WS_Glow' ? mats.glow : mats.body); o.material = Array.isArray(o.material) ? nm : nm[0]; } });
scene.add(serpent);
mixer = new THREE.AnimationMixer(serpent);
gltf.animations.forEach(c => { clips[c.name] = c; });
if (clips['Serpent_SwimLoop']) mixer.clipAction(clips['Serpent_SwimLoop']).play();
for (let i = 1; i <= 22; i++) { const b = serpent.getObjectByName('Spine_' + String(i).padStart(2, '0')); if (b) chain.push(b); }
headBone = serpent.getObjectByName('Head');
serpent.updateMatrixWorld(true);
{ const wp = chain.map(b => b.getWorldPosition(new THREE.Vector3())); cum = [0]; for (let i = 1; i < chain.length; i++) cum[i] = cum[i - 1] + wp[i].distanceTo(wp[i - 1]); }
restQ = chain.map(b => b.getWorldQuaternion(new THREE.Quaternion()));
restQ.head = headBone.getWorldQuaternion(new THREE.Quaternion());
scaleMul = length / cum[cum.length - 1];
// --- bone posing helpers
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), pp = new THREE.Vector3(), pq = new THREE.Quaternion(), ps = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function setBoneWorld(bone, pos, quat) {
  const parent = bone.parent; parent.matrixWorld.decompose(pp, pq, ps);
  tmpQ2.copy(pq).invert();
  bone.position.copy(pos).sub(pp).applyQuaternion(tmpQ2).divide(ps);
  bone.quaternion.copy(tmpQ2).multiply(quat);
  bone.updateMatrix(); bone.matrixWorld.multiplyMatrices(parent.matrixWorld, bone.matrix);
}
const bx = new THREE.Vector3(), by = new THREE.Vector3();
const frameQ = (t, up, out) => { bx.crossVectors(up, t).normalize(); by.crossVectors(t, bx).normalize(); tmpM.makeBasis(bx, by, t); return out.setFromRotationMatrix(tmpM); };
const bonePos = [], boneTan = [], boneUp = [];
const lastHeadUp = new THREE.Vector3(0, 1, 0);
// --- the mouth. The jaw is driven directly, not by a canned clip: it hangs a little open as the serpent swims, gapes
// wider and wider as it closes on a fish, slams shut, and chews what it has caught.
const jaw = { bone: null, rest: new THREE.Quaternion(), axis: new THREE.Vector3(1, 0, 0), max: 0.6, a: 0.06, seq: -1, chew: 0, gape: 0.06 };
function setupJaw() {
  jaw.bone = serpent.getObjectByName('Jaw'); if (!jaw.bone) return;
  jaw.rest.copy(jaw.bone.quaternion);
  const clip = clips['Serpent_Snap'], tr = clip && clip.tracks.find(t => /Jaw\.quaternion/.test(t.name));
  if (tr) { const q0 = new THREE.Quaternion().fromArray(tr.values, 0); let best = 0; const q = new THREE.Quaternion(), rel = new THREE.Quaternion();
    for (let i = 0; i < tr.values.length; i += 4) { q.fromArray(tr.values, i); rel.copy(q0).invert().multiply(q); const ang = 2 * Math.acos(Math.min(1, Math.abs(rel.w)));
      if (ang > best) { best = ang; jaw.axis.set(rel.x, rel.y, rel.z).normalize().multiplyScalar(rel.w < 0 ? -1 : 1); } }
    jaw.rest.copy(q0); jaw.max = THREE.MathUtils.clamp(best * 1.3, 0.5, 0.95); }                      // the real hinge, opened wider than the old clip dared
}
function snapJaw() { if (jaw.seq < 0 || jaw.seq > 0.2) jaw.seq = 0; }
function jawStep(dt) {
  if (!jaw.bone) return;
  let want = jaw.gape;
  if (jaw.seq >= 0) { jaw.seq += dt; want = jaw.seq < 0.12 ? 1.0 : jaw.seq < 0.20 ? 0.0 : jaw.seq < 0.36 ? 0.16 : jaw.gape; if (jaw.seq > 0.36) jaw.seq = -1; }
  else if (jaw.chew > 0) { jaw.chew -= dt; want = 0.10 + 0.42 * Math.max(0, Math.sin(jaw.chew * 15.0)); }
  jaw.a += (want - jaw.a) * (1 - Math.exp(-dt * (want < jaw.a ? 60 : 26)));         // shuts faster than it opens
  tmpQ.setFromAxisAngle(jaw.axis, jaw.a * jaw.max);
  jaw.bone.quaternion.copy(jaw.rest).multiply(tmpQ); jaw.bone.updateMatrix(); jaw.bone.updateMatrixWorld(true);
}
// --- teeth. Built from the model itself: the rims of the lower jaw and of the upper lip are found from the skinned mesh,
// and rows of teeth are set along them. No two are the same length; a few are broken or missing; two long fangs sit near
// the front of each jaw. They ride the Head and Jaw bones, so they open and close with the mouth.
function buildTeeth() {
  const headB = serpent.getObjectByName('Head'), jawB = jaw.bone; if (!headB || !jawB) { window.__teeth = 'nobone'; return; }
  serpent.updateMatrixWorld(true);
  { const info = []; serpent.traverse(o => { if (!o.isSkinnedMesh) return; const sk = o.skeleton, ji = sk.bones.indexOf(jawB), hi = sk.bones.indexOf(headB), si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight; let nj = 0, nh = 0, mj = 0;
      for (let i = 0; i < si.count; i++) { let wj = 0, wh = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (b === ji) wj += w; if (b === hi) wh += w; } if (wj > 0.3) nj++; if (wh > 0.3) nh++; mj = Math.max(mj, wj); }
      info.push([o.name, o.material.name, si.count, nj, nh, +mj.toFixed(2)]); }); window.__meshes = info; }
  let mesh = null, bestJ = 0; serpent.traverse(o => { if (!o.isSkinnedMesh) return; const r = window.__meshes.find(m => m[0] === o.name); if (r && r[3] > bestJ) { bestJ = r[3]; mesh = o; } });
  if (!mesh) { window.__teeth = 'nomesh'; return; }
  const sk = mesh.skeleton, ji = sk.bones.indexOf(jawB), hi = sk.bones.indexOf(headB), g = mesh.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const inv = sk.boneInverses[ji], J = [], H = [], v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { let wj = 0, wh = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k), w = sw.getComponent(i, k); if (b === ji) wj += w; if (b === hi) wh += w; }
    if (wj < 0.6 && wh < 0.6) continue; v.fromBufferAttribute(pos, i).applyMatrix4(mesh.bindMatrix).applyMatrix4(inv); (wj >= 0.6 ? J : H).push(v.clone()); }
  window.__teeth = { J: J.length, H: H.length, ji, hi, bones: sk.bones.length }; if (J.length < 12 || H.length < 12) return;
  const bb = new THREE.Box3().setFromPoints(J), ext = bb.getSize(new THREE.Vector3()), ax = ['x', 'y', 'z'];
  const fA = ax.reduce((a, b) => ext[a] > ext[b] ? a : b);                                           // the jaw's long axis
  const fS = Math.abs(bb.max[fA]) > Math.abs(bb.min[fA]) ? 1 : -1, f0 = fS > 0 ? 0 : bb.min[fA], Lj = Math.max(Math.abs(bb.max[fA]), Math.abs(bb.min[fA]));
  const cj = J.reduce((a, q) => a.add(q), new THREE.Vector3()).divideScalar(J.length);
  const Hn = H.filter(q => q[fA] * fS > 0.1 * Lj && q[fA] * fS < 1.15 * Lj), ch = Hn.reduce((a, q) => a.add(q), new THREE.Vector3()).divideScalar(Math.max(1, Hn.length));
  const rest = ax.filter(a => a !== fA), uA = Math.abs(ch[rest[0]] - cj[rest[0]]) > Math.abs(ch[rest[1]] - cj[rest[1]]) ? rest[0] : rest[1], uS = ch[uA] > cj[uA] ? 1 : -1, wA = rest.find(a => a !== uA);
  const V = (f, u, w) => { const q = new THREE.Vector3(); q[fA] = f * fS; q[uA] = u * uS; q[wA] = w; return q; };       // (along jaw, toward the other jaw, sideways)
  const rims = [], lower = [], upper = [], NS = 17, yAxis = new THREE.Vector3(0, 1, 0);
  const tooth = (base, dir, len, list) => { const c = new THREE.ConeGeometry(len * 0.19, len, 7, 3); c.translate(0, len / 2, 0); { const cp = c.attributes.position, col = []; for (let i = 0; i < cp.count; i++) { const k = Math.min(1, cp.getY(i) / len), bend = k * k * len * 0.16; cp.setX(i, cp.getX(i) + bend); col.push(0.62 + 0.38 * k, 0.50 + 0.46 * k, 0.30 + 0.56 * k); } c.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); c.computeVertexNormals(); }
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize())); c.translate(base.x, base.y, base.z); list.push(c); };
  for (let sl = 0; sl < NS; sl++) {
    const t0 = (0.14 + 0.84 * sl / NS) * Lj, t1 = (0.14 + 0.84 * (sl + 1) / NS) * Lj, front = sl / (NS - 1);
    for (const sgn of [1, -1]) {
      const inJ = J.filter(q => q[fA] * fS >= t0 && q[fA] * fS < t1 && q[wA] * sgn > 0), inH = Hn.filter(q => q[fA] * fS >= t0 && q[fA] * fS < t1 && q[wA] * sgn > 0);
      if (!inJ.length || !inH.length) continue;
      const jr = inJ.reduce((a, q) => (q[uA] * uS + 0.5 * Math.abs(q[wA]) > a[uA] * uS + 0.5 * Math.abs(a[wA]) ? q : a));        // top outer edge of the lower jaw
      const hr = inH.reduce((a, q) => (-q[uA] * uS + 0.5 * Math.abs(q[wA]) > -a[uA] * uS + 0.5 * Math.abs(a[wA]) ? q : a));      // bottom outer edge of the upper lip
      (rims[sl] || (rims[sl] = {}))[sgn] = [jr, hr];
      for (const [edge, list, sign] of [[jr, lower, 1], [hr, upper, -1]]) {
        if (Math.random() < 0.10) continue;                                                                                    // a gap where one has been lost
        const fang = (sl === NS - 3 || sl === NS - 4) && Math.random() < 0.8;
        let len = Lj * (0.045 + 0.05 * Math.random()) * (0.75 + 0.5 * Math.sin(Math.PI * front)); if (fang) len = Lj * (0.13 + 0.05 * Math.random()); if (Math.random() < 0.08) len *= 0.45;   // the odd broken stump
        const base = edge.clone(); base[wA] *= 0.86; base[uA] -= sign * uS * len * 0.12; base[fA] += fS * (Math.random() - 0.5) * 0.25 * (t1 - t0);
        tooth(base, V(-0.28 - 0.2 * Math.random(), sign, -sgn * (0.10 + 0.15 * Math.random())), len, list);                    // raked back and leaning in a little
      }
    }
  }
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xf0e8d2, vertexColors: true, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.7 });
  const gum = new THREE.MeshPhysicalMaterial({ color: 0x4a1218, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide });
  if (lower.length) { const m = new THREE.Mesh(mergeGeometries(lower), mat); m.frustumCulled = false; jawB.add(m);
    // a dark wet tongue lying in the floor of the mouth
    const tg = new THREE.SphereGeometry(1, 10, 8); tg.scale(Lj * 0.085, Lj * 0.022, Lj * 0.25); const tm = new THREE.Mesh(tg, gum); const tp = V(Lj * 0.42, 0, 0); { const rr = rims.filter(r => r && r[1]); tp[uA] = rr.reduce((a, r) => a + r[1][0][uA], 0) / Math.max(1, rr.length) + uS * Lj * 0.03; } tm.position.copy(tp);
    if (fA !== 'z') tm.rotation[fA === 'x' ? 'y' : 'x'] = Math.PI / 2; jawB.add(tm); }
  // the inside of the mouth: wet flesh slung between the tooth rows, floor and roof, pink at the lips and going to black down the throat
  const lining = (which, sign) => { const v = [], c = [], idx = [], NA = 8; let rows = 0;
    for (let sl = 0; sl < NS; sl++) { const r = rims[sl]; if (!r || !r[1] || !r[-1]) continue; const a = r[1][which], b = r[-1][which], half = Math.abs(a[wA] - b[wA]) * 0.5, k = sl / (NS - 1);
      for (let j = 0; j <= NA; j++) { const t = j / NA, q = new THREE.Vector3().lerpVectors(a, b, t); q[wA] *= 0.97; q[uA] += sign * uS * (0.004 * Lj + Math.min(half * 0.10, 0.02 * Lj) * Math.sin(Math.PI * t));
        q[uA] += sign * uS * 0.006 * Lj * (0.5 + 0.5 * Math.sin(k * 40.0)) * Math.sin(Math.PI * t);                       // ridges across the palate
        v.push(q.x, q.y, q.z); const dark = Math.pow(1 - k, 1.6), mid = Math.sin(Math.PI * t); c.push(0.05 + 0.50 * (1 - dark) * (0.6 + 0.4 * mid), 0.008 + 0.13 * (1 - dark) * (0.5 + 0.5 * mid), 0.012 + 0.15 * (1 - dark) * (0.5 + 0.5 * mid)); }
      if (rows > 0) for (let j = 0; j < NA; j++) { const o = (rows - 1) * (NA + 1) + j, n = o + NA + 1; idx.push(o, n, o + 1, o + 1, n, n + 1); }
      rows++; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const flesh = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide, envMapIntensity: 0.9 });
  { const lo = new THREE.Mesh(lining(0, 1), flesh); lo.frustumCulled = false; jawB.add(lo);
    const ug = lining(1, -1); ug.applyMatrix4(new THREE.Matrix4().copy(sk.boneInverses[hi]).multiply(new THREE.Matrix4().copy(sk.boneInverses[ji]).invert())); const up = new THREE.Mesh(ug, flesh); up.frustumCulled = false; headB.add(up); }
  if (upper.length) { const geo = mergeGeometries(upper); geo.applyMatrix4(new THREE.Matrix4().copy(sk.boneInverses[hi]).multiply(new THREE.Matrix4().copy(sk.boneInverses[ji]).invert())); const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; headB.add(m); }
  window.__teeth = { lower: lower.length, upper: upper.length, Lj: +Lj.toFixed(3), axes: fA + uA + wA };
}
function resetStory() {
  eaten = 0; story = 'intro'; endT = 0; headDist = 0; curve = null; finStart = LEN = 1e9; for (const k in MARK) MARK[k] = 1e9;
  hd.p.copy(P(10, -19, -3.0)); hd.dir.copy(startDir); hd.speed = 3; trail.length = 0; introT = 0; preyNow = null; misses = 0;
  scatter = 0;
  fish.forEach(f => { const u = f.userData; u.eatenT = -1; u.chaseT = 0; u.jink = 0; f.visible = true; school(0, f.position).add(u.off); });
}
let scatter = 0;
setupJaw(); try { buildTeeth(); } catch (e) {}

// ---- the path. World: x east, y up, z south. The boardwalk is about 30 m north across the pond.
// Damian, 25 Nov: "fly over the other side of the path and go around a bit too... we don't see it much": after it reaches you it
// crosses the stones, circles right round you above the caps, makes a second low pass over the pond in front, then goes home.
const pts = [[-5, -9, -37], [-5, -2, -36.5], [-4.6, 5, -35.5], [-3.5, 9.5, -32], [-2.2, 9.0, -26], [-1.2, 5.6, -19], [-0.6, 3.8, -12], [0.8, 4.3, -7.5],
  [5.0, 8.0, -4.5], [9.5, 9.6, 2], [8.5, 8.6, 9.5], [2.5, 7.8, 12.5], [-4.5, 6.8, 10.5], [-9.5, 5.6, 5], [-10.5, 4.4, -2], [-7, 3.6, -7.5], [-1.5, 3.3, -8.5], [3.5, 4.2, -11],
  [5, 6.5, -17], [0.5, 8.5, -23], [-6, 9.2, -27], [-10.5, 8.6, -31], [-10.5, 5.5, -35.5], [-10, -1, -37.5], [-10, -12, -38]].map(p => new THREE.Vector3(...p));
const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5), LEN = curve.getLength();
const d0 = curve.getTangentAt(0), d1 = curve.getTangentAt(1);
function atDist(d, out) {
  if (d <= 0) return out.copy(pts[0]).addScaledVector(d0, d);
  if (d >= LEN) return out.copy(pts[pts.length - 1]).addScaledVector(d1, d - LEN);
  return curve.getPointAt(d / LEN, out);
}
function poseSerpent() {
  const s = scaleMul, n = chain.length;
  // positions along the path, head end first, with a travelling lateral wave that grows toward the tail
  for (let i = 0; i < n; i++) {
    const d = headDist - cum[i] * s;
    const p = bonePos[i] || (bonePos[i] = new THREE.Vector3()); atDist(d, p);
    const t = boneTan[i] || (boneTan[i] = new THREE.Vector3()); atDist(d + 0.3, t).sub(p).normalize();
    const side = tmpV.crossVectors(t, UP).normalize();
    const k = cum[i] / cum[n - 1];
    const amp = (0.05 + 0.34 * k * k) * s, w = Math.sin(cum[i] * 0.75 - time * 1.9) * amp;
    p.addScaledVector(side, w).y += Math.sin(cum[i] * 0.55 - time * 1.4) * 0.10 * s * k;
  }
  // orientation: forward = toward the head; the up vector is carried along the body so loops do not twist
  atDist(headDist + 0.5 * s, tmpV3).sub(bonePos[0]).normalize();
  tmpV.copy(UP).addScaledVector(tmpV3, -UP.dot(tmpV3)); if (tmpV.lengthSq() > 1e-4) lastHeadUp.lerp(tmpV.normalize(), 0.08).normalize();
  let up = lastHeadUp;
  for (let i = 0; i < n; i++) {
    const t = boneTan[i];
    if (i > 0) t.subVectors(bonePos[i - 1], bonePos[i]).normalize(); else t.copy(tmpV3);
    const bu = boneUp[i] || (boneUp[i] = new THREE.Vector3());
    bu.copy(up).addScaledVector(t, -up.dot(t)); if (bu.lengthSq() < 1e-4) bu.copy(UP).addScaledVector(t, -UP.dot(t)); bu.normalize();
    up = bu;
    frameQ(t, bu, tmpQ).multiply(restQ[i]);
    setBoneWorld(chain[i], bonePos[i], tmpQ);
  }
  // head: looks a little further along the path than the neck does
  atDist(headDist + 1.2 * s, tmpV).sub(bonePos[0]).normalize();
  frameQ(tmpV, boneUp[0], tmpQ).multiply(restQ.head);
  setBoneWorld(headBone, bonePos[0], tmpQ);
}

// ---- what hides it: an unseen wall along the boardwalk and the reeds either side, measured off the 360 photo (bearing, elevation of the top edge)
{ const R = 30, top = [[-75, 4], [-45, 3.2], [-31, 2.4], [-29, 1.0], [-10, 1.2], [5, 1.5], [17, 1.9], [19, 3.2], [40, 4], [60, 5]];
  const v = [], idx = []; top.forEach(([az, el], i) => { const a = THREE.MathUtils.degToRad(az), x = R * Math.sin(a), z = -R * Math.cos(a); v.push(x, EYE + R * Math.tan(THREE.MathUtils.degToRad(el)), z, x, -14, z); if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx);
  const occ = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })); occ.renderOrder = -5; occ.frustumCulled = false; scene.add(occ); }

const SPEED = 5.6, TOTAL = LEN + length + 4; let active = false;
serpent.visible = false; serpent.scale.setScalar(scaleMul);
const head = new THREE.Vector3();
return {
  get active() { return active; }, head, length: LEN, curve, bodyRadius: 0.45 * scaleMul,
  start(at = 0) { active = true; headDist = at; serpent.visible = true; },
  stop() { active = false; serpent.visible = false; },
  update(dt, t, viewer) {
    if (!active) return;
    time = t; headDist += dt * SPEED * (0.85 + 0.25 * Math.sin(t * 0.7));
    if (headDist > TOTAL) { active = false; serpent.visible = false; return; }
    serpent.updateMatrixWorld(true);
    for (const k in mats) { const sh = mats[k].userData.sh; if (sh) { sh.uniforms.uTime.value = t; sh.uniforms.uGlow.value = k === 'body' ? 0.4 : 0.6; } }
    mixer.update(dt); poseSerpent();
    head.copy(bonePos[0]);
    const near = head.distanceTo(viewer);                       // the mouth opens as it comes at you
    jaw.gape = 0.06 + 0.7 * Math.max(0, 1 - near / 16); jawStep(dt);
  },
};
}
