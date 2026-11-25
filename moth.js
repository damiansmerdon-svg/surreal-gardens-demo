// The Silk Spire Moth from the grubs' stop, passing through (Damian, 25 Nov 2026: it "could fly across from one forest stop and
// look at the viewer and then fly off... could randomise the flights it does"). Each visit it comes in over the trees from a new
// side, in one of its four colourings, hovers in front of you wherever you are looking, finds you with its head, blinks, and goes
// off over the tree tops another way. Every flight is tested clear of the fungi before it starts (world.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { basisQuat } from './world.js';
const VARIANTS = ['jade', 'ember', 'dusk', 'moss'], WINGS = ['ForeR', 'ForeL', 'HindR', 'HindL'], SIZE = 1.15, Y = new THREE.Vector3(0, 1, 0);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export async function createMoth({ scene, bin, camera, world: W, EYE }) {
  const TL = new THREE.TextureLoader(), tex = async (f, srgb) => { const x = await TL.loadAsync(f); x.flipY = false; if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 4; return x; };
  const [gltf, fur, eye] = await Promise.all([bin('moth_glb.txt').then(b => new GLTFLoader().parseAsync(b.buffer, '')), tex('fur_atlas.webp', false), tex('moth_eye.jpeg', true)]);
  const root = new THREE.Group(), model = SkeletonUtils.clone(gltf.scene); root.add(model); root.visible = false; root.scale.setScalar(SIZE); scene.add(root);
  const M = {
    SS_Body: new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xffffff, roughness: 0.72, side: THREE.DoubleSide, envMapIntensity: 0.5 }),
    SS_Fur: new THREE.MeshStandardMaterial({ vertexColors: true, map: fur, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: 0.6, color: 0xfff6e6 }),
    SS_Eye: new THREE.MeshPhysicalMaterial({ map: eye, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide, envMapIntensity: 0.9, emissiveMap: eye, emissive: 0xffffff, emissiveIntensity: 0.18 }),
    SS_Cornea: new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0, clearcoat: 1, clearcoatRoughness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 1.3 }),
  };
  M.SS_Fur.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, sqrt(diffuseColor.rgb), 0.25) * 1.2;'); };
  for (const w of WINGS) M['SS_Wing_' + w] = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, depthWrite: false, roughness: 0.55, envMapIntensity: 0.6, emissive: 0xffffff, emissiveIntensity: 0.12 });
  const lids = [], bones = {};
  model.traverse(o => { if (o.isBone) bones[o.name] = o; if (o.isMesh) { o.material = M[o.material.name] || M.SS_Body; o.frustumCulled = false; o.castShadow = o.material === M.SS_Body || o.material === M.SS_Fur; if (o.material.transparent) o.renderOrder = 4; if (o.morphTargetDictionary) lids.push(o); } });
  const mixer = new THREE.AnimationMixer(model), actions = {}; for (const c of gltf.animations) { actions[c.name] = mixer.clipAction(c); }
  let cur = null, curName = '';
  function play(name, fade = 0.5) { const a = actions[name]; if (!a || curName === name) return; a.reset().setLoop(THREE.LoopRepeat, Infinity); if (cur) { a.fadeIn(fade).play(); cur.fadeOut(fade); } else a.play(); cur = a; curName = name; }
  const wingSets = {};
  async function dress(v) { if (!wingSets[v]) wingSets[v] = await Promise.all(WINGS.map(w => tex('wing_' + v + '_' + w + '.webp', true))); WINGS.forEach((w, i) => { const m = M['SS_Wing_' + w]; m.map = m.emissiveMap = wingSets[v][i]; m.needsUpdate = true; }); }
  let mode = 'away', next = 46, curve = null, u = 0, t = 0, hoverP = new THREE.Vector3(), blink = 0, bt = -1, lookW = 0, lookY = 0, lookP = 0, busy = false, visits = 0, lvl = 1.02, lvlWant = 1.02;
  const X = new THREE.Vector3(1, 0, 0), qx = new THREE.Quaternion(), q = new THREE.Quaternion(), qWant = new THREE.Quaternion(), fwd = new THREE.Vector3(), v = new THREE.Vector3(), camDir = new THREE.Vector3(), headRest = bones.Head ? null : null;
  const sky = () => { const a = Math.random() * 6.283; return new THREE.Vector3(Math.sin(a) * 42, 13 + Math.random() * 7, Math.cos(a) * 42); };
  async function plan() { busy = true;
    try { await dress(VARIANTS[(visits + Math.floor(Math.random() * 2)) % 4]);
      camera.getWorldDirection(camDir); const base = Math.atan2(camDir.x, camDir.z);
      for (let k = 0; k < 40; k++) { const a = base + (Math.random() - 0.5) * (0.6 + k * 0.15), r = 2.7 + Math.random() * 1.4; hoverP.set(Math.sin(a) * r, EYE + 0.15 + Math.random() * 0.75, Math.cos(a) * r);
        if (W.hit(hoverP, 1.1) >= 0) continue; const c = W.flight(sky(), hoverP, { r: 0.9, cam: 2.2, far: true, midAt: 0.8, lifts: [1.5, 3, 5, 8], sides: [0, 2.5, -2.5, 5, -5] }); if (!c) continue;
        curve = c; u = 0; mode = 'in'; curve.getPointAt(0, root.position); curve.getTangentAt(0, fwd); fwd.y = 0; basisQuat(fwd, Y, q); lvl = 1.02; root.visible = true; visits++; play('Moth_Fly', 0); break; }
      if (mode !== 'in') next += 8; } finally { busy = false; } }
  function leave() { for (let k = 0; k < 30; k++) { const c = W.flight(hoverP, sky(), { r: 0.9, cam: 2.2, midAt: 0.25, lifts: [1.5, 3, 5, 8], sides: [0, 2.5, -2.5, 5, -5] }); if (c) { curve = c; u = 0; mode = 'out'; play('Moth_Fly', 0.8); return; } } t = 2; }
  return {
    get visible() { return root.visible; }, root,
    visit(time) { next = time; },
    reset() { mode = 'away'; root.visible = false; next = 46; },
    clash() { return root.visible ? W.hit(root.position, 0.6) : -1; },
    update(dt, time) {
      if (mode === 'away') { if (time > next && !busy) plan(); return; }
      mixer.update(dt);
      if (mode === 'in' || mode === 'out') { const L = curve.len, done = u * L, left = (1 - u) * L, sp = mode === 'in' ? 1.0 + 6.5 * smooth(0, 7, left) : 1.0 + 7.5 * smooth(0, 6, done);
        u = Math.min(1, u + sp * dt / L); curve.getPointAt(u, root.position); curve.getTangentAt(u, fwd); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, 1); lvlWant = mode === 'in' ? 1.02 * smooth(1.5, 6, left) : 1.02 * smooth(0.3, 3, done);
        basisQuat(fwd, Y, qWant); lookW += ((mode === 'in' && left < 9 ? 1 : 0) - lookW) * (1 - Math.exp(-dt * 2));
        if (u >= 1) { if (mode === 'in') { mode = 'hover'; t = 6.5 + Math.random() * 4; play('Moth_Hover', 0.6); bt = -1; } else { mode = 'away'; root.visible = false; next = time + 40 + Math.random() * 45; } } }
      else if (mode === 'hover') { const t0 = t; t -= dt; lookW += (1 - lookW) * (1 - Math.exp(-dt * 3));
        root.position.copy(hoverP).add(v.set(0.05 * Math.sin(time * 0.9), 0.04 * Math.sin(time * 0.7 + 1), 0.05 * Math.sin(time * 1.3 + 2)));
        basisQuat(v.subVectors(camera.position, root.position).setY(0), Y, qWant); lvlWant = 0;
        if ((t0 > 4.6 && t <= 4.6) || (t0 > 2.2 && t <= 2.2)) bt = 0;
        if (t <= 0) leave(); }
      // Flying, the body lies level along its heading with its back to the sky, however the path climbs or dives, and the head is
      // held up to look ahead (as in the grubs' scene); hovering, it hangs upright facing you.
      lvl += (lvlWant - lvl) * (1 - Math.exp(-dt * 2.5)); q.slerp(qWant, 1 - Math.exp(-dt * 2.2)); root.quaternion.copy(q).multiply(qx.setFromAxisAngle(X, lvl));
      if (bt >= 0) { bt += dt; const k = bt / 0.28; blink = k < 0.32 ? smooth(0, 0.32, k) : k < 0.45 ? 1 : 1 - smooth(0.45, 1, k); if (k >= 1) { bt = -1; blink = 0; } }
      const x = (0.13 + 0.87 * blink) * 3; for (const o of lids) for (const side of ['R', 'L']) for (let k = 0; k < 3; k++) { const i = o.morphTargetDictionary['Blink_' + side + '_' + (k + 1)]; if (i !== undefined) o.morphTargetInfluences[i] = clamp(1 - Math.abs(x - (k + 1)), 0, 1); }
      const H = bones.Head; if (!H) return;                 // the head finds you, on top of whatever the body is doing (turn, then tip: never any roll)
      { const U = H.userData; if (U.qOut && H.quaternion.equals(U.qOut)) H.quaternion.copy(U.qIn); else (U.qIn || (U.qIn = new THREE.Quaternion())).copy(H.quaternion); }
      root.updateMatrixWorld(true);
      const rq = root.quaternion, to = v.subVectors(camera.position, H.getWorldPosition(new THREE.Vector3())).normalize().applyQuaternion(rq.clone().invert());
      const wy = clamp(Math.atan2(to.x, to.z), -0.75, 0.75) * lookW, wp = clamp(Math.atan2(to.y, Math.hypot(to.x, to.z)), -0.45, 0.45) * lookW, k = 1 - Math.exp(-dt * 3.5);
      lookY += (wy - lookY) * k; lookP += (wp - lookP) * k;
      const look = new THREE.Quaternion().setFromEuler(new THREE.Euler(-lookP - 0.76 * lvl, lookY, 0, 'YXZ')), wl = rq.clone().multiply(look).multiply(rq.clone().invert()), pq = H.parent.getWorldQuaternion(new THREE.Quaternion());
      H.quaternion.premultiply(pq.clone().invert().multiply(wl).multiply(pq)); (H.userData.qOut || (H.userData.qOut = new THREE.Quaternion())).copy(H.quaternion);
    },
  };
}
