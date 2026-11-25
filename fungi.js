// Stop 2 fungal ecosystem for the web look-around: the four species (Blender: ArtSource/Creatures/fungi_lib.py, exported by
// ArtSource/MushroomPath/species/export_species.py) plus the puffballs.
//   * every surface colour is the Cycles surface baked into the vertex colours (mottling, lichen, grime, cracks)
//   * growth runs in the vertex shader: the stem rises, the cap is carried up clenched shut, then unfurls and spreads
//   * thin caps and gills let light through when you look toward the sun; nothing is a uniform colour
//   * spores: tiny, soft, mostly dim motes let go from the gills, carried on one air current; they catch the light, they do not twinkle
//   * behaviour: each sways on its own, now and then one slowly bends its cap toward you; walk close and it shivers and sheds spores
//   * puffballs swell, colour rising under the stretched skin, tear at the top and let out a soft coloured billow; neighbours follow
import * as THREE from 'three';

const CAP_PARTS = ['cap', 'under', 'gill', 'veil', 'lace', 'pores', 'wart'];
const ROUGH = { stem: 0.82, cap: 0.76, under: 0.85, gill: 0.85, veil: 0.75, trunk: 0.9, pores: 0.9, wart: 0.85, soil: 0.97, moss: 0.92, lace: 0.8, glow: 0.45, ink: 0.14 };      // 24 Nov 2026 (Damian: "less plastic")
const THIN = { cap: 0.35, under: 0.45, gill: 0.8, veil: 0.6, lace: 0.5, stem: 0.12, moss: 0.3 };       // how much light passes through
const NOISE = `
  float fh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float fn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }`;

/** One material per part per plant. Shared uniforms drive growth and behaviour for the whole plant. */
function partMaterial(part, U, sunV, species = '') {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: ROUGH[part] ?? 0.8, metalness: 0, specularIntensity: part === 'ink' ? 1.0 : 0.22, side: CAP_PARTS.includes(part) || part === 'moss' || part === 'glow' ? THREE.DoubleSide : THREE.FrontSide, envMapIntensity: part === 'ink' ? 0.8 : 0.3 });
  const isCap = CAP_PARTS.includes(part), thin = THIN[part] ?? 0.0, isGrass = part === 'moss' || part === 'soil';
  const flesh = !isGrass && part !== 'glow' && part !== 'ink' && part !== 'trunk';      // living tissue: gets age, soak and rim light (24 Nov 2026)
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U, { uSunV: sunV });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uGrow, uOpen, uTime, uPhase, uH, uR, uShiver, uSwell, uUniform, uSplit;
      uniform vec3 uSeat; uniform vec2 uLook;
      attribute vec3 _growf; attribute vec3 _growq; attribute vec3 _growa; attribute vec3 _growm;
      varying vec2 vMask; varying vec3 vRest; varying float vThin; varying float vGlow;
      vec3 toY(vec3 b) { return vec3(b.x, b.z, -b.y); }                       // the growth data is in Blender's axes (z up)
      float ez(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }` + NOISE)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vMask = vec2(0.0); vRest = position; vThin = ${thin.toFixed(2)}; vGlow = 1.0 - uv.y;                                             // (glTF stores v upside down)
        ${isGrass ? 'transformed *= 0.0;' : `
        // Growth as fungi do it (Damian, 24 Nov 2026; research notes in ArtSource/Creatures/fungi3/growdata.py). The whole body is
        // there in miniature in the button and then EXPANDS: each stalk in its own turn stretches up out of its foot, carrying its
        // cap or bell as a small closed knob; only when the stalk is nearly up does the cap spread; skirts of lace are let down
        // after that; coils and lattices come out of their column from the bottom up, turning as they come.
        float G = clamp(uGrow * 0.72 + uOpen * 0.28, 0.0, 1.0);
        vec3 gF = toY(_growf), gQ = toY(_growq);
        float k1 = clamp((G - _growa.x) / max(_growm.x, 0.001), 0.0, 1.0), k2 = clamp((G - _growa.y) / max(_growm.y, 0.001), 0.0, 1.0);
        float e1 = ez(k1), e2 = ez(k2), mode = floor(_growm.z + 0.01), twist = fract(_growm.z + 0.01) * 4.0, gR = max(_growa.z, 0.02);
        vec3 p = transformed;
        if (mode > 0.5) {
          vec3 d = p - gQ;
          if (mode < 1.5) {                                // a cap, bell or shelf
            float knob = mix(0.36, 1.0, pow(e1, 0.85));    // preformed, growing as its stalk lifts it; never so small that the stem end shows through it (Damian, 25 Nov 2026)
            float r = length(d.xz) / gR;
            d.xz *= mix(0.42, 1.0, e2);                    // closed round the stalk until the end, then it spreads
            d.y = d.y * mix(1.18, 1.0, e2) - (1.0 - e2) * r * r * gR * 0.7;
            d *= knob * step(0.0005, k1);
            { // a closed cap wraps the STEM, and the giants' stems lean: follow the line from the foot to the cap's seat, or the
              // stem comes out through the side of its own cap (Damian, 25 Nov 2026, the ink cap)
              vec3 ax = gQ - gF; float lean = (1.0 - e2) * min(d.y, 0.0) / max(ax.y, 0.2);
              d.xz += ax.xz * lean; }
            d.y += (1.0 - e2) * (0.10 * gR * knob + 0.05);   // a closed cap rides a little high, hooding the stem's end
          } else if (mode < 2.5) {                         // a lace skirt: let down from where it hangs
            d.y *= e2; d.xz *= mix(0.25, 1.0, e2); d *= step(0.0005, k2);
          } else {                                         // winding out of the column
            float a = twist * (1.0 - e2), c = cos(a), sn = sin(a);
            d.xz = mat2(c, -sn, sn, c) * d.xz; d *= e2;
          }
          p = gQ + d;
        }
        { // the stalk: thick and squat first, then it stretches; early growth is slow, the last of it quick
          vec3 ds = p - gF; float sy = pow(e1, 1.25), sr = pow(k1, 0.5);
          float sxz = mix(sy, sr, 0.3);
          p = gF + vec3(ds.x * sxz, ds.y * sy, ds.z * sxz) * step(0.0005, k1);
          if (mode < 0.5) { float neck = smoothstep(0.80, 1.0, position.y / max(uH, 0.1)) * (1.0 - clamp(uOpen, 0.0, 1.0)); p.y -= neck * 0.06 * uH * sy; }      // the very top of a stem stays tucked down inside its closed cap
        }
        transformed = p;
        float g = clamp(uGrow, 0.0, 1.0);
        float hk = clamp(transformed.y / max(uH, 0.1), 0.0, 1.2);
        // its own slow sway, a lean toward you when it takes an interest, a shiver when you come close
        vec2 sway = vec2(sin(uTime * 0.31 + uPhase), cos(uTime * 0.23 + uPhase * 1.7)) * 0.025 * uH;
        sway += vec2(sin(uTime * 11.0 + uPhase), cos(uTime * 13.0)) * 0.012 * uH * uShiver;
        transformed.xz += (sway + uLook * uH) * hk * hk;
        // breathing: a slow, slight swell that comes and goes with the glow
        transformed += normal * (0.004 * uH) * sin(uTime * 0.55 + uPhase) * hk * g;
        // puffballs: pressure builds and the skin stretches outward
        transformed += normal * uSwell * 0.05 * uR * g;`}`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform vec3 uSunV, uGlow; uniform float uTime, uSwell, uPhase, uGrow, uPulse, uOpen; varying vec2 vMask; varying vec3 vRest; varying float vThin; varying float vGlow;` + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${part === 'veil' ? 'if (dot(diffuseColor.rgb, vec3(0.33)) < 0.09) discard;     // the lace: its holes were baked black' : ''}
        ${species === 'Inkweeper' && (part === 'cap' || part === 'gill') ? `
        { // the ink comes with age (Damian, 25 Nov 2026: "the drips and black should come on as it grows... like the video"): a young
          // one is pale all the way down; as it opens the rim flushes grey-pink and then goes black, working upward
          float lum = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15));
          float inkHere = smoothstep(0.34, 0.10, lum);                              // how inky this spot is when fully grown
          float come = smoothstep(0.0, 0.5, uOpen * 1.5 - lum * 2.2 - 0.12 * fn(vRest * 5.0));
          vec3 young = vec3(0.80, 0.75, 0.64) * (0.86 + 0.28 * fn(vRest * 9.0));
          vec3 flush = vec3(0.50, 0.34, 0.36);
          vec3 was = mix(young, flush, smoothstep(0.0, 0.6, come));
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(was, diffuseColor.rgb, smoothstep(0.5, 1.0, come)), inkHere);
        }` : ''}
        float fine = 0.88 + 0.24 * fn(vRest * 22.0) * fn(vRest * 61.0 + 7.0);  // detail finer than the vertices can hold
        diffuseColor.rgb *= fine;
        float soak = 0.0;
        ${part === 'moss' ? 'diffuseColor.rgb *= vec3(0.50, 0.56, 0.42) * (0.75 + 0.5 * fn(vRest * 40.0));      // moss in shade is dark and uneven, never lawn green' : ''}
        ${flesh ? `
        // what the vertices cannot hold, and what makes each copy of a plant its own (Damian, 24 Nov 2026: "real living fungal
        // matter", "grown, not repeated"): whole regions older and tanned or younger and cooler, a soft mottling under the skin,
        // water-soaked patches that are darker and glassier, fine fibres. All of it shifted by the plant's own phase.
        vec3 pv = vRest + vec3(uPhase * 5.3, uPhase * 2.1, uPhase * 3.7);
        float age = fn(pv * 0.45) + 0.25 * (fract(uPhase * 1.618) - 0.5);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.74, 0.60, 0.46), smoothstep(0.50, 0.80, age) * 0.55);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.92, 0.97, 1.08), smoothstep(0.45, 0.20, age) * 0.5);
        float mot = fn(pv * 6.5 + 3.0 * fn(pv * 2.3));
        diffuseColor.rgb *= 1.0 - 0.34 * smoothstep(0.55, 0.25, mot);
        { float lum = dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)); diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, 0.78) * mix(0.82, 1.08, fn(pv * 0.9 + 4.0)); }      // real flesh is duller than paint, and uneven
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.42, 0.34, 0.26), smoothstep(0.62, 0.80, fn(pv * 3.1 + 11.0)) * 0.6);      // bruises and stains
        soak = smoothstep(0.50, 0.63, 0.6 * fn(pv * 1.9) + 0.4 * fn(pv * 4.7));
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.66, 0.60, 0.52), soak * 0.5);
        float fib = fn(vec3(pv.x * 90.0, pv.y * 4.0, pv.z * 90.0));
        diffuseColor.rgb *= 0.84 + 0.32 * fib;` : ''}
        ${part === 'glow' ? 'diffuseColor.rgb *= 0.35 + 0.5 * fn(vRest * 7.0);' : ''}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (fn(vRest * 9.0) - 0.5) * 0.3 - soak * 0.32, 0.10, 1.0);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // light through the thin flesh: strongest when looking toward the sun through a cap or gill
        vec3 vd = normalize(vViewPosition);
        float through = pow(max(dot(vd, uSunV), 0.0), 3.0) * vThin * (1.0 + 0.6 * soak);
        totalEmissiveRadiance += diffuseColor.rgb * through * vec3(1.15, 1.0, 0.85) * 0.9;
        // thin edges catch the light: a rim that is brightest where the surface turns away from you on the sunward side
        float rim = pow(1.0 - abs(dot(normalize(vNormal), vd)), 3.0) * (0.35 + 0.65 * max(dot(vd, uSunV), 0.0));
        totalEmissiveRadiance += diffuseColor.rgb * rim * vThin * vec3(1.1, 1.0, 0.9) * 0.55;
        // light from inside: pooled in the gills, veins, nectar and beads; it breathes, and it wanders
        float breath = 0.72 + 0.28 * sin(uTime * 0.55 + uPhase) + 0.12 * (fn(vRest * 1.3 + uTime * 0.07) - 0.5) + 1.6 * uPulse;
        ${part === 'glow' ? 'float core = (0.25 + 0.9 * fn(vRest * 3.0 + uTime * 0.05) * fn(vRest * 9.0 + 3.0)) * (0.35 + 0.65 * abs(dot(normalize(vNormal), vd)));' : 'float core = 1.0;'}      // embers, not a light box: uneven, dimmer toward the edges
        totalEmissiveRadiance += uGlow * vGlow * breath * core * clamp(uGrow, 0.0, 1.0) * ${part === 'glow' ? '1.5' : '1.2'};`);
  };
  m.customProgramCacheKey = () => 'fungus_' + part + (species === 'Inkweeper' ? '_ink' : '');
  return m;
}

export class Fungus {
  /** gltf: loaded species; meta: fungi_meta.json entry; item: layout entry */
  constructor(gltf, meta, item, sunV, scene) {
    this.species = item.species; this.item = item; this.meta = meta;
    this.root = new THREE.Group(); this.root.visible = false;
    this.U = { uGrow: { value: 0 }, uOpen: { value: 0 }, uTime: { value: 0 }, uPhase: { value: Math.random() * 6.28 }, uH: { value: meta.height }, uR: { value: meta.radius || 1 },
      uSeat: { value: new THREE.Vector3() }, uLook: { value: new THREE.Vector2() }, uShiver: { value: 0 }, uSwell: { value: 0 }, uUniform: { value: meta.seat ? 0 : 1 }, uSplit: { value: 0 }, uPulse: { value: 0 }, uGlow: { value: new THREE.Vector3(...(meta.glow || [0, 0, 0])) } };
    if (meta.seat) this.U.uSeat.value.set(meta.seat[0], meta.seat[2], -meta.seat[1]);      // Blender z-up -> glTF y-up
    const mats = {};
    this.model = gltf.scene.clone(true);
    let mi = 0;
    this.model.traverse(o => {
      if (!o.isMesh) return;
      const sw = gltf.userData.swollen ? gltf.userData.swollen[mi] : null; mi++;
      const name = (o.material.name || '').split('_').pop();
      if (name === 'soil' || name === 'moss') { o.visible = false; return; }      // Damian, 24 Nov 2026: "don't put the extra bits at the bases.... just the fungus" (no soil mound, moss, litter or companions)
      o.material = mats[name] || (mats[name] = partMaterial(name, this.U, sunV, this.species));
      o.castShadow = name !== 'moss'; o.receiveShadow = true; o.frustumCulled = false;
      if (sw && o.geometry.attributes.position.count === sw.count) {                    // puffball swell: the swollen build as a morph
        o.geometry = o.geometry.clone();
        const base = o.geometry.attributes.position, delta = new Float32Array(base.count * 3);
        for (let i = 0; i < base.count * 3; i++) delta[i] = sw.array[i] - base.array[i];
        o.geometry.morphAttributes.position = [new THREE.BufferAttribute(delta, 3)]; o.geometry.morphTargetsRelative = true; o.updateMorphTargets();
        (this.swellMeshes = this.swellMeshes || []).push(o); this.swellMesh = o;
      }
    });
    this.root.add(this.model);
    this.root.scale.setScalar(item.scale); this.root.rotation.y = THREE.MathUtils.degToRad(item.yaw);
    this.height0 = meta.height; this.capRadius = meta.radius || 1;
    this.state = 'hidden'; this.t = 0; this.startAt = item.start;
    this.growFor = meta.height * item.scale < 3 ? 12 + 4 * Math.random() : 17 + 6 * Math.random();      // long enough to see the stalks come one by one and the caps spread last
    this.splitAt = 5 + Math.random() * 14;                 // seconds after it has fully opened before an old cap tears
    this.openFor = 5.0 + Math.random() * 2.0;
    this.interest = 0; this.nextLook = 8 + Math.random() * 20; this.lookT = -1; this.sporeEvery = 6 + Math.random() * 8;
    // Damian, 24 Nov 2026: "There needs to be things happening all the time... not just a static forest of fungus."
    // Every plant has a life: it stands for a while, flexing its cap now and then, then closes, sinks back into the ground and
    // comes up again. Lifetimes are spread out, so at any moment something is rising, something is opening, something is going.
    const giant = meta.height * item.scale > 4.5;
    this.lifeFor = (giant ? 110 : 45) + Math.random() * (giant ? 120 : 75);
    this.nextFlex = 6 + Math.random() * 14; this.flexT = -1; this.restFor = 0;
    scene.add(this.root);
  }
  get position() { return this.root.position; }
  /** a wave passing along the path reaches this plant: its light swells, it shivers and lets spores go */
  pulse(spores) { if (this.state !== 'grown') return; this.pulseT = 0; if (spores) spores.shed(this, 45); }
  hide() { this.state = 'hidden'; this.root.visible = false; this.t = 0; this.pulseT = -1; this.flexT = -1; this.U.uPulse.value = 0; this.U.uGrow.value = 0; this.U.uOpen.value = 0; this.U.uSwell.value = 0; this.U.uSplit.value = 0; for (const o of this.swellMeshes || []) o.morphTargetInfluences[0] = 0; this.burst = false; this.armed = false; }
  begin(full = false) {
    if (this.state !== 'hidden') return;
    this.root.visible = true; this.state = full ? 'grown' : 'grow'; this.t = 0;
    if (full) { this.U.uGrow.value = 1; this.U.uOpen.value = 1; this.t = 99; }
  }
  /** world point under the middle of the cap, where the gills are */
  gillPoint(out) {
    if (!this.meta.seat) return out.copy(this.root.position).setY(this.root.position.y + this.height0 * this.root.scale.x * 0.85 * this.U.uGrow.value);
    const s = this.U.uSeat.value; out.set(s.x, s.y * this.U.uGrow.value - 0.15, s.z); return this.root.localToWorld(out);
  }
  update(dt, time, viewer, spores) {
    const U = this.U; U.uTime.value = time;
    if (this.state === 'hidden') return;
    this.t += dt;
    const ease = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    if (this.state === 'grow') {
      // the stem rises in surges, as if pushed from below
      const k = this.t / this.growFor; U.uGrow.value = Math.min(1, Math.max(0, k + 0.012 * Math.sin(this.t * 2.3) * (1 - k)));      // steady, with small surges, as if pushed from below
      if (k >= 1) { this.state = 'open'; this.t = 0; U.uGrow.value = 1; }
    } else if (this.state === 'open') {
      const k = this.t / this.openFor; U.uOpen.value = Math.min(1, k);
      if (k > 0.55 && !this.firstShed) { this.firstShed = true; if (spores) spores.shed(this, 140); }      // as the gills open, the first spores go
      if (k >= 1) { this.state = 'grown'; this.t = 0; U.uOpen.value = 1; }
    }
    if (this.pulseT >= 0) { this.pulseT += dt; const k = this.pulseT / 3.2; U.uPulse.value = k >= 1 ? 0 : Math.sin(k * Math.PI) ** 2; if (k >= 1) this.pulseT = -1; }
    if (this.state === 'wilt') {                       // the cap closes and folds down, then the whole plant sinks back into the ground
      const k = this.t / 9; U.uSplit.value *= Math.max(0, 1 - dt * 0.8);
      U.uOpen.value = 1 - ease(k * 2.2); U.uGrow.value = 1 - ease((k - 0.35) / 0.65);
      if (k >= 1) { this.state = 'rest'; this.t = 0; this.restFor = 3 + Math.random() * 9; U.uGrow.value = 0; U.uOpen.value = 0; U.uSplit.value = 0; this.root.visible = false; }
    } else if (this.state === 'rest') {
      if (this.t >= this.restFor) { this.state = 'grow'; this.t = 0; this.root.visible = true; this.firstShed = false; this.splitAt = 5 + Math.random() * 14; this.lifeFor = 45 + Math.random() * 120; }      // it comes back in the same place and at the same angle, so nothing ever grows into its neighbour
    }
    if (this.state === 'grown') {
      if (!this.isPuff && !this.keep && this.t > this.lifeFor) { this.state = 'wilt'; this.t = 0; this.flexT = -1; if (spores) spores.shed(this, 120); return; }
      // now and then the cap draws itself half shut and opens again, like a slow breath
      this.nextFlex -= dt;
      if (this.nextFlex <= 0 && this.flexT < 0 && !this.keep) { this.flexT = 0; this.nextFlex = 9 + Math.random() * 16; }
      if (this.flexT >= 0) { this.flexT += dt; const k = this.flexT / 5.5, dip = Math.sin(Math.min(1, k) * Math.PI) ** 2;
        if (this.meta.seat) U.uOpen.value = 1 - 0.3 * dip; else U.uGrow.value = 1 - 0.07 * dip;
        if (k > 0.5 && !this.flexShed) { this.flexShed = true; if (spores) spores.shed(this, 35); }
        if (k >= 1) { this.flexT = -1; this.flexShed = false; U.uOpen.value = 1; U.uGrow.value = 1; } }
      if (this.species === 'Inkweeper' && spores) {                    // the ink never stops running: drops fall from the melting rim
        this.drip = (this.drip || 0) + dt * 3;
        while (this.drip >= 1) { this.drip -= 1; const a = Math.random() * 6.28, s = this.root.scale.x, p = new THREE.Vector3(1.6 + Math.cos(a) * 2.0, 5.0 - Math.random() * 0.8, 0.12 + Math.sin(a) * 2.0);
          this.root.localToWorld(p); spores.emit(p, { x: 0, y: -0.4, z: 0 }, 2.6, [0.10, 0.06, 0.16], 6); }
      }
      if (this.meta.split) U.uSplit.value = ease((this.t - this.splitAt) / 7);      // whole until it has grown; then the cap slowly tears
      const d = Math.hypot(viewer.x - this.root.position.x, viewer.z - this.root.position.z);
      // now and then it slowly bends its cap toward you (never more than a lean), and back
      this.nextLook -= dt;
      if (this.nextLook <= 0 && d < 14 && this.lookT < 0) { this.lookT = 0; this.nextLook = 18 + Math.random() * 30; }
      let want = 0;
      if (this.lookT >= 0) { this.lookT += dt; want = Math.sin(Math.min(1, this.lookT / 9) * Math.PI) * 0.06; if (this.lookT > 9) this.lookT = -1; }
      const tv = new THREE.Vector3(viewer.x - this.root.position.x, 0, viewer.z - this.root.position.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.root.rotation.y);
      U.uLook.value.lerp(new THREE.Vector2(tv.x * want, tv.z * want), 1 - Math.exp(-dt * 0.8));
      // walk close: a shiver and a sigh of spores
      const close = d < 2.6 * this.root.scale.x + 0.6;
      U.uShiver.value += ((close && !this.shivered ? 1 : 0) - U.uShiver.value) * (1 - Math.exp(-dt * 3));
      if (close && !this.shivered) { this.shivered = true; if (spores) spores.shed(this, 90); setTimeout(() => { this.shivered = false; }, 9000); }
      const lantern = this.species.startsWith('Lanternveil');                          // the lantern veils shed all the time, a few motes at a go
      this.sporeEvery -= dt; if (this.sporeEvery <= 0 && spores) { spores.shed(this, lantern ? 22 : 40); this.sporeEvery = lantern ? 2.5 + Math.random() * 3 : 12 + Math.random() * 18; }
    }
  }
}

/** A puffball clump: grows, then swells as pressure builds, colour rising under the stretched skin; it pulses; the top tears
 *  and a soft coloured billow goes up and drifts away. Nearby clumps may follow a moment later. */
export class Puffball extends Fungus {
  constructor(...args) { super(...args); this.isPuff = true; this.U.uUniform.value = 1; this.burstAt = 14 + Math.random() * 10; this.growFor = 10; }
  trigger(delay = 0) { if (this.state === 'grown' && !this.burst && !this.armed) { this.armed = true; this.burstAt = this.t + delay; } }
  update(dt, time, viewer, spores, cloud, all) {
    super.update(dt, time, viewer, null);
    if (this.state !== 'grown') return;
    const d = Math.hypot(viewer.x - this.root.position.x, viewer.z - this.root.position.z);
    if (d < 4.5 && !this.armed) this.trigger(2.5);                                   // you come near: pressure starts to build
    // Damian, 24 Nov 2026: "The puff balls could be puffing dust regularly." Every few seconds a small puff of dust leaves the top,
    // with a little squeeze of the ball; the big breath still comes on top of that.
    this.puffIn = (this.puffIn ?? 2 + Math.random() * 3) - dt;
    if (this.puffIn <= 0) { this.puffIn = 3.5 + Math.random() * 3.5; this.puffT = 0;
      const top = this.root.position.clone(); top.y += this.height0 * this.root.scale.x * 1.05; if (cloud) cloud.billow(top, this.root.scale.x * 0.45, 46); }
    if (this.puffT >= 0) { this.puffT += dt; if (this.puffT > 1.2) this.puffT = -1; }
    const squeeze = this.puffT >= 0 ? 0.12 * Math.sin(Math.min(1, this.puffT / 1.2) * Math.PI) : 0;
    if (this.burst) { const k = Math.max(0, 1 - (this.t - this.burstT) / 6); this.U.uSwell.value = 0.6 * k; for (const o of this.swellMeshes || []) o.morphTargetInfluences[0] = 0.55 * k + 0.25;
      if (this.t - this.burstT > 8) { this.burst = false; this.armed = true; this.burstAt = this.t + 16 + Math.random() * 22; }      // it fills again and breathes out again, for as long as you stay
      return; }
    const lead = Math.max(0, Math.min(1, 1 - (this.burstAt - this.t) / 9));         // nine seconds of swelling before it goes
    const pulse = lead > 0 ? 0.06 * Math.sin(this.t * (2.2 + 3 * lead)) * lead : 0;
    for (const o of this.swellMeshes || []) o.morphTargetInfluences[0] = Math.max(0, Math.min(1, lead * lead + pulse + 0.14 - squeeze));
    this.U.uSwell.value = lead;
    if (this.t >= this.burstAt) {
      this.burst = true; this.burstT = this.t;
      const top = this.root.position.clone(); top.y += this.height0 * this.root.scale.x * 1.15;
      if (cloud) cloud.billow(top, this.root.scale.x);
      for (const o of all || []) if (o !== this && o.trigger && o.root.position.distanceTo(this.root.position) < 9) o.trigger(1.5 + Math.random() * 2.5);      // a small chain
    }
  }
}

/** Spores: tiny, soft, slow. Most are dim; they brighten as they turn into the light. One air current carries them all. */
export class Spores {
  constructor(scene, sunV, wind = new THREE.Vector3(0.35, 0, -0.18)) {
    const N = this.N = 6000; this.next = 0; this.wind = wind;
    this.pos = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.seed = new Float32Array(N); this.fade = new Float32Array(N); this.tint = new Float32Array(N * 3); this.grav = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.pos[i * 3 + 1] = -99; this.seed[i] = Math.random(); }
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 1)); g.setAttribute('aFade', new THREE.BufferAttribute(this.fade, 1)); g.setAttribute('aTint', new THREE.BufferAttribute(this.tint, 3));
    this.U = { uTime: { value: 0 }, uPx: { value: 800 }, uSunV: sunV };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.U, transparent: true, depthWrite: false,
      vertexShader: `attribute float aSeed, aFade; attribute vec3 aTint; uniform float uTime, uPx; uniform vec3 uSunV; varying float vA; varying vec3 vC;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float turn = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 40.0);              // a slow tumble, not a twinkle
          float lit = 0.35 + 0.65 * pow(max(dot(normalize(-mv.xyz), uSunV), 0.0), 2.0);          // against the light they glow
          vA = aFade * (0.10 + 0.32 * turn) * lit; vC = aTint * (0.7 + 0.6 * lit);
          gl_PointSize = clamp(uPx * (0.010 + 0.016 * aSeed) / max(0.3, -mv.z), 1.0, 18.0); }`,
      fragmentShader: `varying float vA; varying vec3 vC;
        void main() { vec2 d = gl_PointCoord - 0.5; float a = exp(-dot(d, d) * 14.0) * vA; if (a < 0.004) discard; gl_FragColor = vec4(vC, a); }` }));
    this.points.frustumCulled = false; this.points.renderOrder = 4; scene.add(this.points);
  }
  emit(p, v, life, tint, grav = 0) { const k = this.next; this.next = (this.next + 1) % this.N;
    this.pos.set([p.x, p.y, p.z], k * 3); this.vel.set([v.x, v.y, v.z], k * 3); this.life[k] = life; this.tint.set(tint, k * 3); this.grav[k] = grav; }
  /** let `n` spores go from under a cap, tinted like its gills */
  shed(f, n) {
    const c = f.gillPoint(new THREE.Vector3()), r = f.capRadius * f.root.scale.x * 0.85;
    const T = { EmberDome: [1.0, 0.62, 0.42], VioletFlare: [0.86, 0.72, 1.0], Lanternveil: [0.80, 1.0, 0.95], Lanternveil_Airy: [0.80, 1.0, 0.95], JadeNodders: [0.78, 1.0, 0.86], Drifterbells: [0.78, 0.88, 1.0], Inkweeper: [0.80, 0.72, 1.0] }[f.species] || [1, 0.95, 0.85];
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, q = Math.sqrt(Math.random()) * r;
      this.emit({ x: c.x + Math.cos(a) * q, y: c.y - Math.random() * 0.3, z: c.z + Math.sin(a) * q }, { x: 0, y: -0.06 - Math.random() * 0.08, z: 0 }, 12 + Math.random() * 10, T); }
  }
  step(dt, time, groundY, camera, renderer) {
    const P = this.pos, V = this.vel, W = this.wind;
    for (let i = 0; i < this.N; i++) { if (this.life[i] <= 0) { this.fade[i] = 0; continue; } this.life[i] -= dt;
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      // one air current along the path, gusting, with small eddies; they settle slowly
      const gust = 0.6 + 0.4 * Math.sin(time * 0.21 + x * 0.05);
      const ex = 0.12 * Math.sin(y * 1.3 + time * 0.4 + i), ez = 0.12 * Math.cos(x * 1.1 + time * 0.33 + i * 0.7), ey = 0.05 * Math.sin(z * 0.9 + time * 0.5 + i);
      P[i * 3] += (V[i * 3] + W.x * gust + ex) * dt; P[i * 3 + 1] += (V[i * 3 + 1] + ey) * dt; P[i * 3 + 2] += (V[i * 3 + 2] + W.z * gust + ez) * dt;
      V[i * 3] *= 1 - 0.8 * dt; V[i * 3 + 2] *= 1 - 0.8 * dt; if (this.grav[i] > 0) V[i * 3 + 1] -= this.grav[i] * dt; else V[i * 3 + 1] += (-0.05 - V[i * 3 + 1]) * dt * 0.5;
      this.fade[i] = Math.min(1, this.life[i] / 3, (22 - this.life[i]) / 1.5);
      if (y < groundY(x, z) + 0.02) { this.life[i] = 0; P[i * 3 + 1] = -99; } }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aFade.needsUpdate = true; this.geo.attributes.aTint.needsUpdate = true;
    this.U.uTime.value = time; this.U.uPx.value = renderer.domElement.height * 0.9;
  }
  /** the air of the path: a few spores adrift everywhere round the visitor, so the place is never still */
  ambient(dt, viewer, groundY) {
    this._amb = (this._amb || 0) + dt * 26;
    while (this._amb >= 1) { this._amb -= 1; const a = Math.random() * 6.28, d = 1.5 + Math.random() * 11, x = viewer.x + Math.cos(a) * d, z = viewer.z + Math.sin(a) * d;
      this.emit({ x, y: groundY(x, z) + 0.4 + Math.random() * 5.5, z }, { x: 0, y: 0.04 * (Math.random() - 0.3), z: 0 }, 14 + Math.random() * 8, [1.0, 0.92, 0.74]); }
  }
  clear() { this.life.fill(0); for (let i = 0; i < this.N; i++) this.pos[i * 3 + 1] = -99; }
}

/** The puffball's billow: soft, powdery, semi-transparent puffs that rise, roll and spread downwind, then thin away. */
export class SporeCloud {
  constructor(scene, sunV) {
    const N = this.N = 1600; this.next = 0;
    this.pos = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.age = new Float32Array(N).fill(99); this.size = new Float32Array(N); this.col = new Float32Array(N * 3); this.alpha = new Float32Array(N);
    for (let i = 0; i < N; i++) this.pos[i * 3 + 1] = -99;
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('aA', new THREE.BufferAttribute(this.alpha, 1));
    this.U = { uPx: { value: 800 }, uSunV: sunV, uTime: { value: 0 } };
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.U, transparent: true, depthWrite: false,
      vertexShader: `attribute float aSize, aA; attribute vec3 aCol; uniform float uPx; uniform vec3 uSunV; varying vec3 vC; varying float vA, vS;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float lit = 0.55 + 0.75 * pow(max(dot(normalize(-mv.xyz), uSunV), 0.0), 3.0);           // backlit, the cloud glows
          vC = aCol * lit; vA = aA; vS = aSize;
          gl_PointSize = clamp(uPx * aSize / max(0.3, -mv.z), 2.0, 420.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vC; varying float vA, vS;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main() { vec2 d = gl_PointCoord - 0.5; float r = length(d);
          float puff = smoothstep(0.5, 0.05, r) * (0.55 + 0.45 * n2(gl_PointCoord * 5.0 + vS * 31.0));      // a soft, uneven puff of powder
          float a = puff * vA; if (a < 0.003) discard; gl_FragColor = vec4(vC, a); }` }));
    this.points.frustumCulled = false; this.points.renderOrder = 6; scene.add(this.points);
  }
  billow(at, scale = 1, count = 260) {
    const PAL = [[0.98, 0.52, 0.44], [1.0, 0.68, 0.52], [0.68, 0.44, 0.90], [0.42, 0.76, 0.82]];
    for (let i = 0; i < count; i++) { const k = this.next; this.next = (this.next + 1) % this.N;
      const a = Math.random() * 6.28, sp = Math.random() * 0.6 * scale, up = (0.8 + Math.random() * 1.6) * scale;
      this.pos.set([at.x + Math.cos(a) * 0.1, at.y, at.z + Math.sin(a) * 0.1], k * 3);
      this.vel.set([Math.cos(a) * sp, up, Math.sin(a) * sp], k * 3);
      this.age[k] = -Math.random() * 0.8; this.size[k] = (0.15 + Math.random() * 0.35) * scale;
      const c = PAL[Math.min(3, Math.floor(Math.random() * 4 * (0.6 + 0.4 * Math.random())))]; this.col.set(c, k * 3); }
  }
  step(dt, time, wind, renderer) {
    for (let i = 0; i < this.N; i++) { this.age[i] += dt; const t = this.age[i];
      if (t < 0 || t > 14) { this.alpha[i] = 0; continue; }
      const k = i * 3, drag = Math.exp(-dt * 1.2);
      this.vel[k] *= drag; this.vel[k + 2] *= drag; this.vel[k + 1] = this.vel[k + 1] * Math.exp(-dt * 0.9) + 0.02 * dt;
      this.pos[k] += (this.vel[k] + wind.x * 0.6 + 0.15 * Math.sin(time * 0.7 + i)) * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += (this.vel[k + 2] + wind.z * 0.6 + 0.15 * Math.cos(time * 0.6 + i)) * dt;
      this.size[i] += dt * 0.12;                                                     // it spreads and thins
      this.alpha[i] = 0.16 * Math.min(1, t / 0.6) * Math.max(0, 1 - t / 14); }
    for (const a of ['position', 'aSize', 'aA', 'aCol']) this.geo.attributes[a].needsUpdate = true;      // (the colours too: without this every puff after the first drew black)
    this.U.uPx.value = renderer.domElement.height * 0.9; this.U.uTime.value = time;
  }
  clear() { this.age.fill(99); this.alpha.fill(0); }
}
