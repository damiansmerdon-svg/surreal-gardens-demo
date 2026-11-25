// The mushroom path on the real wetland stepping stones, Adelaide Botanic Garden (photos 25 Nov 2026, 12:35).
// World frame: x east, y up, z south, metres; origin on the ground where the 36 photos were taken. The stones run NE (bearing 55)
// ahead and SW behind; the pond is on the left (NW).
// Two backdrops: the stitched 360 photo of this spot, or the phone's own camera (AR on the spot: phone motion + compass turn the view).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Fungus, Puffball, Spores, SporeCloud } from './fungi.js';
import { createFishKit, parseGFM } from './fishkit.js';
import { createSerpent } from './serpent.js';
import { createBugs } from './bugs.js';
import { createWorld } from './world.js';
import { createMoth } from './moth.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth01 = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const QS = new URLSearchParams(location.search);
const EYE = 1.55;
const groundY = () => 0;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function start() {
  const loadMsg = $('loadMsg'), loadBar = $('loadBar'), loadErr = $('loadErr');
  const fail = (msg, e) => { loadMsg.textContent = msg; loadErr.hidden = false; loadErr.textContent = String(e && e.message || e || ''); };
  { const t = document.createElement('canvas'); if (!(t.getContext('webgl2') || t.getContext('webgl'))) { fail('This viewer cannot draw 3D graphics.', 'Open this page in Safari or Chrome on your phone.'); return null; } }

  const canvas = $('view'), video = $('cam');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 1500);
  camera.position.set(0, EYE, 0);

  // light: midday, 25 Nov: high sun a little east of north, thin high cloud
  const hemi = new THREE.HemisphereLight(0xdfe8f2, 0x5a6038, 0.65); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4e2, 1.9);
  const SUN_DIR = new THREE.Vector3(0.12, 0.93, -0.34).normalize();
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 120 }); sun.shadow.radius = 6;
  sun.target.position.set(0, 0, 0); sun.position.copy(SUN_DIR).multiplyScalar(60); scene.add(sun, sun.target);
  { const geo = new THREE.PlaneGeometry(60, 60); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.ShadowMaterial({ opacity: 0.32, color: 0x0b1404, depthWrite: false })); m.position.y = 0.03; m.receiveShadow = true; m.renderOrder = 1; scene.add(m); }

  // ---------- load ----------
  const files = []; let done = 0; const tick = () => { done++; loadBar.style.width = Math.round(100 * done / files.length) + '%'; };
  const bin = async name => {      // models ship as base64 text (the artifact host serves text only)
    let t = await fetch(name).then(r => { if (!r.ok) throw new Error(name + ' ' + r.status); return r.text(); });
    const out = new Uint8Array(Math.floor(t.length * 3 / 4) - (t.endsWith('==') ? 2 : t.endsWith('=') ? 1 : 0)); let o = 0;
    for (let i = 0; i < t.length; i += 1 << 20) { const s = atob(t.slice(i, i + (1 << 20))); for (let k = 0; k < s.length; k++) out[o++] = s.charCodeAt(k); }
    t = null; return out;
  };
  let lay, meta, panoSmall;
  try {
    [lay, meta, panoSmall] = await Promise.all([fetch('fungi_layout.json').then(r => r.json()), fetch('fungi_meta.json').then(r => r.json()), new THREE.TextureLoader().loadAsync('adelaide360_small.jpg')]);
  } catch (e) { fail('The scene could not load.', e); return null; }
  const names = [...new Set(lay.items.map(q => q.species))];
  const loader = new GLTFLoader(), gltfs = {};
  const want = names.map(n => [n, `Fungus_${n}_LOD0_glb.txt`]); if (names.includes('Puffballs')) want.push(['swollen', 'Fungus_Puffballs_Swollen_LOD0_glb.txt']);
  files.push(...want);
  loadMsg.textContent = `Loading the fungi (${want.length} kinds, about 30 MB the first time)…`;
  try {
    // a few at a time, to keep a phone's memory low
    const q = want.slice(); const workers = Array.from({ length: 3 }, async () => { while (q.length) { const [n, f] = q.shift(); const b = await bin(f); gltfs[n] = await loader.parseAsync(b.buffer, ''); tick(); } });
    await Promise.all(workers);
  } catch (e) { fail('The fungi could not load.', e); return null; }
  if (gltfs.Puffballs && gltfs.swollen) { const sw = []; gltfs.swollen.scene.traverse(o => { if (o.isMesh) sw.push(o.geometry.attributes.position); }); gltfs.Puffballs.userData.swollen = sw; }

  // the 360 photo: background, and the light the fungi reflect
  const setPano = tex => {
    tex.colorSpace = THREE.SRGBColorSpace; tex.mapping = THREE.EquirectangularReflectionMapping;
    panoTex = tex; if (mode === 'pano') scene.background = tex;
    const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(tex).texture; pm.dispose();
    if (scene.environment) scene.environment.dispose(); scene.environment = env; scene.environmentIntensity = 0.75;
  };
  let panoTex = null, mode = 'pano';
  setPano(panoSmall);
  new THREE.TextureLoader().loadAsync('adelaide360.jpg').then(t => { const old = panoTex; setPano(t); if (old && old !== t) old.dispose(); }).catch(() => {});

  // ---------- the cast ----------
  const SUNV = { value: new THREE.Vector3() }, WIND = new THREE.Vector3(0.3, 0, -0.12);
  const spores = new Spores(scene, SUNV, WIND), cloud = new SporeCloud(scene, SUNV);
  const fungi = []; let userScale = 1;
  for (const q of lay.items) {
    if (!gltfs[q.species] || !meta[q.species]) continue;
    const Cls = q.species === 'Puffballs' ? Puffball : Fungus;
    const f = new Cls(gltfs[q.species], meta[q.species], q, SUNV, scene);
    f.root.position.set(q.x, -0.3 * q.scale, q.z);           // the foot sits a little into the ground so its cut end never shows
    f.root.rotation.set(0.03 * Math.cos(q.yaw), THREE.MathUtils.degToRad(q.yaw), 0.04 * Math.sin(q.yaw * 1.3), 'YXZ');
    fungi.push(f);
  }
  // flying fish from the pond on the left
  let fishV2 = null;
  try { const TL = new THREE.TextureLoader(); const [b, e, albedo, iris] = await Promise.all([bin('fish_v2_body.txt'), bin('fish_v2_eyes.txt'), TL.loadAsync('fish_v2_albedo.jpg'), TL.loadAsync('fish_v2_iris.jpg')]);
    fishV2 = { body: parseGFM(b), eyes: parseGFM(e), albedo, iris }; } catch (e) { fishV2 = null; }      // falls back to the first fish
  const kit = createFishKit(fishV2), fish = [];
  for (let i = 0; i < 5; i++) { const f = kit.spawn(); f.visible = false; f.scale.multiplyScalar(1.4); scene.add(f); fish.push({ f }); }
  // Damian, 25 Nov: the fish come from the far side of the boardwalk and go back over it, so nothing has to meet the water in view
  const WATER_Y = -2.5;
  // Where the fish turn in front of you was searched against the real shapes of the fungi (clash.js), so no fish passes through one:
  // FISHP is the bearing (degrees from north), distance and height of that turn.
  const FISHP = { az: -10, r: 4, y: 3.25 };
  function planFish(t0, P = FISHP) {
    const pol = (az, r, y) => { const a = THREE.MathUtils.degToRad(az); return new THREE.Vector3(r * Math.sin(a), y, -r * Math.cos(a)); };
    fish.forEach((o, i) => {
      const j = (i % 3) - 1, k = i - 2, off = (v) => { v.x += 0.45 * j; v.y += 0.3 * k * 0.5; v.z += 0.4 * k; return v; };
      const pts = [
        new THREE.Vector3(3 + 0.8 * j, -4, -36 - 0.5 * i), new THREE.Vector3(2.6 + 0.7 * j, 2.6 + 0.3 * j, -34), new THREE.Vector3(1.8 + 0.5 * j, 4.4 + 0.3 * (i % 3), -27),
        off(pol(P.az + 14, P.r + 11, P.y + 1.0)), off(pol(P.az + 16, P.r + 4.5, P.y + 0.35)), off(pol(P.az, P.r, P.y)), off(pol(P.az - 24, P.r + 1.5, P.y + 0.3)), off(pol(P.az - 30, P.r + 7, P.y + 0.9)),
        new THREE.Vector3(-8.5 + 0.5 * j, 3.6, -19), new THREE.Vector3(-8 + 0.6 * j, 4.4 + 0.3 * (i % 3), -27), new THREE.Vector3(-7.5 + 0.6 * j, 2.4, -34), new THREE.Vector3(-7.5 + 0.6 * j, -4, -36.5),
      ];
      o.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); o.t0 = t0 + i * 0.7; o.dur = 22 + (i % 2) * 1.0; o.wet = 0;
    });
  }
  function splash(p) { for (let k = 0; k < 50; k++) { const a = Math.random() * 6.28, q = Math.random() * 0.5; spores.emit({ x: p.x + Math.cos(a) * q, y: WATER_Y + 0.05 + Math.random() * 0.2, z: p.z + Math.sin(a) * q }, { x: Math.cos(a) * (0.6 + Math.random()), y: 1.5 + Math.random() * 2, z: Math.sin(a) * (0.6 + Math.random()) }, 1.6, [0.85, 0.95, 1.0], 5); } }

  // the serpent: up from behind the boardwalk, over the pond to you, and back (it loads after the fungi, so the scene never waits for it)
  let serpent = null, nextSerpent = 75;
  createSerpent({ scene, bin, EYE }).then(s => { serpent = s; if (QS.get('serpent')) { s.start(+QS.get('serpent')); } }).catch(e => { console.warn('serpent', e); });
  const world = createWorld(fungi, EYE);
  let bugs = null; createBugs({ scene, bin, camera, fungi, world }).then(b => { bugs = b; }).catch(e => { console.warn('bugs', e); });
  let moth = null; createMoth({ scene, bin, camera, world, EYE }).then(m => { moth = m; if (QS.get('moth')) m.visit(0); }).catch(e => { console.warn('moth', e); });
  let time = 0, paused = false, nextFish = 12, nextWave = 34;
  function restart() { time = 0; fungi.forEach(s => s.hide()); fish.forEach(o => { o.f.visible = false; }); spores.clear(); cloud.clear(); nextFish = 12; nextWave = 34; nextSerpent = 75; if (serpent) serpent.stop(); if (bugs) bugs.reset(); if (moth) moth.reset(); }
  restart();

  // ---------- looking around ----------
  // drag: yaw/pitch. Phone motion: the device's orientation, turned so north in the world is north in the photo (compass).
  let yaw = THREE.MathUtils.degToRad(-55), pitch = -0.12;   // facing along the stones (bearing 55), a little down
  let headingNudge = 0;                                       // drag left/right while using phone motion to line things up by hand
  const ori = { on: false, a: 0, b: 0, g: 0, abs: false, compass: null, offset: null, screen: 0 };
  const onOri = e => {
    if (e.alpha == null) return;
    ori.a = e.alpha; ori.b = e.beta; ori.g = e.gamma; ori.on = true;
    if (e.type === 'deviceorientationabsolute' || (e.absolute && !('webkitCompassHeading' in e))) ori.abs = true;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) ori.compass = e.webkitCompassHeading;
  };
  window.__motion?.then(ok => {
    if (!ok) return;
    if ('ondeviceorientationabsolute' in window) addEventListener('deviceorientationabsolute', onOri); else addEventListener('deviceorientation', onOri);
  });
  const updScreen = () => { ori.screen = THREE.MathUtils.degToRad((screen.orientation && screen.orientation.angle) || window.orientation || 0); };
  updScreen(); addEventListener('orientationchange', updScreen); screen.orientation?.addEventListener?.('change', updScreen);
  const zee = new THREE.Vector3(0, 0, 1), euler = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), qN = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  function deviceQuat(out) {
    // alpha: 0 = phone top toward north when it is absolute; three's -z is north here, so no extra turn is needed
    let a = ori.a;
    if (!ori.abs && ori.compass !== null) {                     // iOS: alpha starts anywhere, so steer it by the compass, slowly
      const want = (360 - ori.compass) % 360, d = ((want - a - (ori.offset ?? 0)) % 360 + 540) % 360 - 180;
      ori.offset = ori.offset === null ? want - a : ori.offset + d * 0.03;
      a += ori.offset;
    }
    euler.set(THREE.MathUtils.degToRad(ori.b), THREE.MathUtils.degToRad(a), -THREE.MathUtils.degToRad(ori.g), 'YXZ');
    out.setFromEuler(euler); out.multiply(q1); out.multiply(q0.setFromAxisAngle(zee, -ori.screen));
    qN.setFromAxisAngle(Y, headingNudge); out.premultiply(qN);
    return out;
  }
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const k = 0.0032 * camera.fov / 70, dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (ori.on) headingNudge += dx * k; else { yaw += dx * k; pitch = clamp(pitch + dy * k, -1.3, 1.3); } });
  const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  // ---------- camera backdrop ----------
  let stream = null;
  async function startCamera() {
    if (stream) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = stream; video.hidden = false; await video.play().catch(() => {});
      return true;
    } catch (e) { stream = null; return false; }
  }
  function stopCamera() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } video.hidden = true; video.srcObject = null; }
  function note(text) { $('noteText').textContent = text; $('note').hidden = false; }
  $('noteOk').onclick = () => { $('note').hidden = true; };

  const HINT = {
    pano: () => ori.on ? 'You are on the stepping stones in the wetland. Turn your phone to look around.' : 'You are on the stepping stones in the wetland. Drag to look around.',
    cam: () => ori.on ? 'Hold your phone up and turn to look. If the fungi sit off the path, drag sideways to line them up.' : 'Phone motion is off, so drag to look around.',
  };
  async function setMode(m) {
    paused = false;
    if (m === 'cam') {
      const ok = await startCamera();
      if (!ok) { note('The camera is not available here. In the Claude app the camera is blocked, so open the GitHub link in Safari for the live camera. Showing the 360 photo instead.'); m = 'pano'; }
    }
    if (m === 'pano') stopCamera();
    mode = m;
    scene.background = m === 'pano' ? panoTex : null;
    $('mPano').classList.toggle('on', m === 'pano'); $('mCam').classList.toggle('on', m === 'cam');
    $('hint').textContent = HINT[m]();
    if (m === 'cam' && !ori.on) setTimeout(() => { if (!ori.on && mode === 'cam') { $('hint').textContent = HINT.cam(); note('Phone motion is not available, so the fungi will not follow your phone. Drag to look around.'); } }, 1500);
  }
  $('mPano').onclick = () => setMode('pano'); $('mCam').onclick = () => setMode('cam');
  $('bAgain').onclick = () => restart();
  $('bSpore').onclick = () => { for (const s of fungi) { if (s.trigger) s.trigger(0.5); else if (s.state === 'grown') spores.shed(s, 160); } };
  $('bSerpent').onclick = () => { if (serpent && !serpent.active) { serpent.start(); nextSerpent = time + 120; } };
  $('bMoth').onclick = () => { if (moth && !moth.visible) moth.visit(time); };
  $('bFish').onclick = () => { planFish(time + 0.3); nextFish = time + 60; };
  $('scale').oninput = e => { userScale = +e.target.value; fungi.forEach(s => s.root.scale.setScalar(s.item.scale * userScale)); };

  function beat() {
    if (serpent && serpent.active && serpent.head.y > 1) return serpent.head.distanceTo(viewer) < 16 ? 'the serpent is circling you' : 'something is rising behind the boardwalk';
    if (fish.some(o => o.f.visible)) return 'flying fish, over the boardwalk';
    const up = fungi.filter(s => s.state !== 'hidden' && s.state !== 'rest'), growing = up.filter(s => s.state === 'grow').length, opening = up.filter(s => s.state === 'open').length;
    if (fungi.some(s => s.burst && s.t - s.burstT < 4)) return 'a puffball breathes out its spores';
    if (fungi.some(s => s.armed && !s.burst)) return 'a puffball is swelling';
    if (opening) return opening > 1 ? 'caps are opening over the stones' : 'a cap is opening over you';
    if (up.some(s => s.pulseT >= 0)) return 'a wave of light passes along the path';
    if (up.some(s => s.state === 'wilt')) return 'one is sinking back into the ground';
    if (growing) return growing > 1 ? `${growing} are pushing up` : 'something is pushing up';
    if (!up.length) return 'watch the ground beside the stones';
    return up.length < 9 ? 'small fungi beside the stones' : `${up.length} of them, a forest`;
  }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 68 : 52; camera.updateProjectionMatrix(); }
  }
  const clock = new THREE.Clock(), tmp = new THREE.Vector3(); let FIXED = null;
  const viewer = new THREE.Vector3(0, EYE, 0);
  function frame() {
    if (screens_hidden()) return;
    resize();
    const raw = FIXED !== null ? FIXED : Math.min(clock.getDelta(), 0.05), dt = paused ? 0 : raw * (reduceMotion ? 0.6 : 1);
    if (ori.on) deviceQuat(camera.quaternion); else camera.rotation.set(pitch, yaw, 0, 'YXZ');
    if (dt > 0) {
      time += dt; kit.tick(time);
      if (time > nextFish) { planFish(time); nextFish = time + 45 + Math.random() * 20; }
      for (const o of fish) { const k = o.curve ? (time - o.t0) / o.dur : -1; if (!(k >= 0 && k <= 1)) { o.f.visible = false; continue; }
        const u = k * k * (3 - 2 * k) * 0.35 + k * 0.65; o.curve.getPoint(u, o.f.position); const air = smooth01((o.f.position.y - WATER_Y) / 1.2);
        o.f.position.y += 0.16 * air * Math.sin(k * 44 + o.t0); o.curve.getPoint(Math.min(1, u + 0.012), tmp); tmp.y += 0.16 * air * Math.sin((k + 0.012) * 44 + o.t0);
        const above = o.f.position.y > WATER_Y, was = o.wet; o.wet = above ? 1 : -1; o.f.visible = above;
        o.f.lookAt(tmp); o.f.rotateZ(0.3 * air * Math.sin(k * 11 + o.t0)); kit.flap(o.f, time, 0.45 + 0.45 * Math.sin(k * 16 + o.t0 + 1.5), 30); }
      if (serpent) { if (!serpent.active && time > nextSerpent) { serpent.start(); nextSerpent = time + 100 + Math.random() * 40; } serpent.update(dt, time, viewer); }
      if (bugs) bugs.update(dt, time);
      if (moth) moth.update(dt, time);
      SUNV.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
      for (const s of fungi) { if (time > s.startAt) s.begin(); if (s instanceof Puffball) s.update(dt, time, viewer, spores, cloud, fungi); else s.update(dt, time, viewer, spores); }
      if (time > nextWave) { nextWave = time + 16 + Math.random() * 12; const a0 = Math.random() < 0.5 ? -14 : 16;
        for (const s of fungi) s.waveAt = time + Math.abs((s.item.a ?? 0) - a0) / 5 + Math.random() * 0.5; }
      for (const s of fungi) if (s.waveAt && time >= s.waveAt) { s.waveAt = 0; s.pulse(spores); }
      spores.ambient(dt, viewer, groundY); spores.step(dt, time, groundY, camera, renderer); cloud.step(dt, time, WIND, renderer);
    }
    $('beat').textContent = beat();
    if (!window.__norender) renderer.render(scene, camera);
  }
  const screens_hidden = () => document.getElementById('scene').hidden;
  $('load').hidden = true;
  if (QS.get('t')) { const T = +QS.get('t'); for (let k = 0; k < T * 20; k++) { time += 0.05; for (const s of fungi) { if (time > s.startAt) s.begin(); s.update(0.05, time, viewer, null, null, null); } } }
  if (QS.get('fish')) { planFish(time - +QS.get('fish')); nextFish = time + 99; }
  if (QS.get('rec')) { window.__frame = dt => { FIXED = dt; frame(); }; window.__look = (y, p) => { yaw = y; pitch = p; }; frame(); }
  else renderer.setAnimationLoop(frame);
  window.__dbg = { fungi, fish, planFish, THREE }; window.__serpent = () => serpent; window.__bugs = () => bugs; window.__moth = () => moth; window.__world = world; window.ready = true;
  return {
    setMode, pause(v) { paused = v; if (v) stopCamera(); },
  };
}
