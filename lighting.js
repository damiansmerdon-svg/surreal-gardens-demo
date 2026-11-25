// Lighting matched to the real place, for the live camera view. A web port of the core of the Unity system (LIGHTING.md,
// Assets/GardenAR/Runtime/Lighting): the real sun direction from the time and the site's coordinates (NOAA equations), and
// brightness, colour and the split between hard sun and soft fill read from the camera picture itself. The phone's browser
// does not report shutter time, so "sun or shade" is judged from the picture's contrast instead. In the 360 photo the light
// stays as it was when the photo was taken (midday, 25 Nov 2026).
import * as THREE from 'three';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), rad = Math.PI / 180;
/** sun azimuth (degrees clockwise from north) and elevation (degrees) for a Date at a latitude and longitude (east positive) */
export function solar(date, lat, lon) {
  const jd = date.getTime() / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T), e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
  const lam = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * rad);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60, eps = eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * T) * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lam * rad)), y = Math.tan(eps * rad / 2) ** 2;
  const eqT = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - 0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
  const mins = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60, tst = (mins + eqT + 4 * lon + 1440) % 1440, ha = (tst / 4 - 180) * rad;
  const cz = Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(ha), el = 90 - Math.acos(clamp(cz, -1, 1)) / rad;
  const az = (Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat * rad) - Math.tan(decl) * Math.cos(lat * rad)) / rad + 180 + 360) % 360;
  return { az, el };
}
export function createLighting({ scene, sun, hemi, shadow, sunDir, video, lat, lon }) {
  const base = { dir: sunDir.clone(), sunI: sun.intensity, sunC: sun.color.clone(), hemiI: hemi.intensity, sky: hemi.color.clone(), ground: hemi.groundColor.clone(), env: 0.75, shadow: shadow.opacity };
  const cv = document.createElement('canvas'); cv.width = cv.height = 24; const cx = cv.getContext('2d', { willReadFrequently: true });
  const want = { dir: base.dir.clone(), sunI: base.sunI, sunC: base.sunC.clone(), hemiI: base.hemiI, sky: base.sky.clone(), ground: base.ground.clone(), env: base.env, shadow: base.shadow };
  const state = { az: 0, el: 0, bright: 1, direct: 1, live: false }; let since = 9;
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }, warm = new THREE.Color(1.0, 0.56, 0.26), white = new THREE.Color(1, 1, 1), tint = new THREE.Color();
  function solve(camMode) {
    if (!camMode) { want.dir.copy(base.dir); want.sunI = base.sunI; want.sunC.copy(base.sunC); want.hemiI = base.hemiI; want.sky.copy(base.sky); want.ground.copy(base.ground); want.env = base.env; want.shadow = base.shadow; state.live = false; return; }
    const s = solar(new Date(), lat, lon); state.az = s.az; state.el = s.el; state.live = true;
    const el = Math.max(s.el, 12) * rad, az = s.az * rad;                    // a very low or set sun still lights from its side of the sky, softly
    want.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    let bright = 1, direct = 0.8, r = 1, g = 1, b = 1;
    if (video && video.readyState >= 2 && video.videoWidth) { try { cx.drawImage(video, 0, 0, 24, 24); const d = cx.getImageData(0, 0, 24, 24).data, L = []; r = g = b = 0;
        for (let i = 0; i < d.length; i += 4) { const R = lin(d[i]), G = lin(d[i + 1]), B = lin(d[i + 2]); r += R; g += G; b += B; L.push(0.2126 * R + 0.7152 * G + 0.0722 * B); }
        const n = L.length; r /= n; g /= n; b /= n; L.sort((p, q) => p - q); const mean = 0.2126 * r + 0.7152 * g + 0.0722 * b, lo = L[Math.floor(n * 0.08)], hi = L[Math.floor(n * 0.95)];
        bright = clamp(mean / 0.20, 0.12, 1.35);                              // a daylight picture averages about 0.2 linear; a dim room far less
        direct = clamp((hi - lo - 0.18) / 0.45, 0, 1);                        // hard sun gives bright lights and deep shadows in one picture; overcast and shade are flat
        const m = Math.max(r, g, b, 1e-4); r /= m; g /= m; b /= m; } catch (e) {} }
    const day = clamp((s.el + 4) / 10, 0, 1), low = 1 - clamp(s.el / 28, 0, 1); direct *= day; state.bright = bright; state.direct = direct;
    tint.setRGB(r, g, b).lerp(white, 0.45);
    want.sunI = 2.3 * bright * direct; want.sunC.copy(base.sunC).lerp(warm, low * 0.75).multiply(tint);
    want.hemiI = bright * (1.25 - 0.6 * direct); want.sky.copy(base.sky).multiply(tint); want.ground.copy(base.ground).multiply(tint);
    want.env = clamp(0.8 * bright, 0.08, 1.0); want.shadow = 0.12 + 0.26 * direct;
  }
  return {
    state,
    /** dt in real seconds; camMode: the live camera is behind the scene */
    update(dt, camMode) {
      since += dt; if (since > (camMode ? 0.4 : 2)) { since = 0; solve(camMode); }
      const k = 1 - Math.exp(-dt / 1.4);                                     // the same 1.4 s ease as the Unity build
      sunDir.lerp(want.dir, k).normalize(); sun.position.copy(sunDir).multiplyScalar(60);
      sun.intensity += (want.sunI - sun.intensity) * k; sun.color.lerp(want.sunC, k); hemi.intensity += (want.hemiI - hemi.intensity) * k; hemi.color.lerp(want.sky, k); hemi.groundColor.lerp(want.ground, k);
      scene.environmentIntensity += (want.env - scene.environmentIntensity) * k; shadow.opacity += (want.shadow - shadow.opacity) * k; sun.castShadow = sun.intensity > 0.05;
    },
  };
}
