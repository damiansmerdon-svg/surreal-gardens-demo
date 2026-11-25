// What is solid in the scene, measured from the real shapes of the fungi, so that nothing walks or flies through one.
// Every fungus is turned into 20 cm blocks; walkers find their way round the blocks at ground level, fliers have every
// metre of a flight tested against them before they set off.
import * as THREE from 'three';
const V = 0.2, GN = 170, G0 = -17, fl = Math.floor;
const AX = [0.819, -0.574], BX = [0.574, 0.819];      // along the stepping stones (bearing 55), and to their right
export const ab = (a, b, y = 0) => new THREE.Vector3(a * AX[0] + b * BX[0], y, a * AX[1] + b * BX[1]);
export function basisQuat(fwd, up, q) {
  const z = _z.copy(fwd).normalize(), x = _x.crossVectors(up, z); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); const y = _y.crossVectors(z, x);
  return q.setFromRotationMatrix(_m.makeBasis(x, y, z));
}
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
export function createWorld(fungi, eye = 1.55) {
  let topY = 0; const vox = new Map(), low = [], v = new THREE.Vector3(), K = (ix, iy, iz) => ((ix + 512) * 1024 + iy + 16) * 1024 + iz + 512;
  fungi.forEach((f, i) => { f.root.updateMatrixWorld(true); f.root.traverse(o => { if (!o.isMesh || !o.visible) return; const P = o.geometry.attributes.position;
    for (let j = 0; j < P.count; j++) { v.fromBufferAttribute(P, j).applyMatrix4(o.matrixWorld); if (v.y < 0.05) continue; if (v.y > topY) topY = v.y; const k = K(fl(v.x / V), fl(v.y / V), fl(v.z / V)); if (!vox.has(k)) { vox.set(k, i); if (v.y < 0.9) low.push(v.x, v.z); } } }); });
  /** index of a fungus within r of p (other than `ignore`), or -1 */
  function hit(p, r, ignore = -1) { if (p.y - r > topY + V || p.y + r < 0) return -1; const n = Math.ceil(r / V), ix = fl(p.x / V), iy = fl(p.y / V), iz = fl(p.z / V);
    for (let dx = -n; dx <= n; dx++) for (let dy = -n; dy <= n; dy++) for (let dz = -n; dz <= n; dz++) { if (dx * dx + dy * dy + dz * dz > n * n) continue; const h = vox.get(K(ix + dx, iy + dy, iz + dz)); if (h !== undefined && h !== ignore) return h; }
    return -1; }
  const grids = {};
  function grid(r) { if (grids[r]) return grids[r]; const g = new Uint8Array(GN * GN), n = Math.ceil(r / V);
    for (let i = 0; i < low.length; i += 2) { const cx = fl((low[i] - G0) / V), cz = fl((low[i + 1] - G0) / V);
      for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) { if (dx * dx + dz * dz > n * n) continue; const x = cx + dx, z = cz + dz; if (x >= 0 && z >= 0 && x < GN && z < GN) g[z * GN + x] = 1; } }
    for (let z = 0; z < GN; z++) for (let x = 0; x < GN; x++) { const wx = G0 + (x + 0.5) * V, wz = G0 + (z + 0.5) * V; if (wx * wx + wz * wz < 1.25 * 1.25 || wx * BX[0] + wz * BX[1] < -4.4) g[z * GN + x] = 1; }      // not under your feet, not out on the water
    return grids[r] = g; }
  const cell = p => [Math.min(GN - 1, Math.max(0, fl((p.x - G0) / V))), Math.min(GN - 1, Math.max(0, fl((p.z - G0) / V)))];
  const free = (p, r) => { const [x, z] = cell(p); return !grid(r)[z * GN + x]; };
  function los(a, b, r) { const g = grid(r), d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.08) || 1; for (let i = 0; i <= n; i++) { const t = i / n, x = fl((a.x + (b.x - a.x) * t - G0) / V), z = fl((a.z + (b.z - a.z) * t - G0) / V); if (x < 0 || z < 0 || x >= GN || z >= GN || g[z * GN + x]) return false; } return true; }
  /** a way along the ground from A to B for something of half-width r: a list of points, or null */
  function findPath(A, B, r) { const g = grid(r);
    const near = ([x, z]) => { if (!g[z * GN + x]) return [x, z]; for (let d = 1; d < 30; d++) for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue; const X = x + dx, Z = z + dz; if (X >= 0 && Z >= 0 && X < GN && Z < GN && !g[Z * GN + X]) return [X, Z]; } return null; };
    const s = near(cell(A)), e = near(cell(B)); if (!s || !e) return null;
    const N = GN * GN, cost = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N), heap = [], start = s[1] * GN + s[0], goal = e[1] * GN + e[0];
    const push = (f, c) => { heap.push([f, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    cost[start] = 0; push(0, start); let found = false;
    while (heap.length) { const c = pop()[1]; if (done[c]) continue; done[c] = 1; if (c === goal) { found = true; break; } const x = c % GN, z = (c / GN) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dz) continue; const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= GN || Z >= GN) continue; const n = Z * GN + X; if (g[n] || done[n]) continue;
        if (dx && dz && (g[z * GN + X] || g[Z * GN + x])) continue; const nc = cost[c] + (dx && dz ? 1.414 : 1); if (nc < cost[n]) { cost[n] = nc; from[n] = c; push(nc + Math.hypot(X - e[0], Z - e[1]), n); } } }
    if (!found) return null;
    let pts = []; for (let c = goal; c !== -1; c = from[c]) pts.push(new THREE.Vector3(G0 + (c % GN + 0.5) * V, 0, G0 + (((c / GN) | 0) + 0.5) * V)); pts.reverse();
    if (free(A, r)) pts[0] = new THREE.Vector3(A.x, 0, A.z); if (free(B, r)) pts[pts.length - 1] = new THREE.Vector3(B.x, 0, B.z);
    const out = [pts[0]]; let i = 0; while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !los(pts[i], pts[j], r)) j--; out.push(pts[j]); i = j; }
    return out; }
  const camP = new THREE.Vector3(0, eye, 0);
  /** a flight from A to B tested clear of every fungus (the ones it leaves and lands on excepted, close to those ends), of the ground and of you; or null */
  function flight(A, B, o = {}) { const r = o.r ?? 0.5, ends = o.ends ?? 1.0, cam = o.cam ?? 1.5, side = new THREE.Vector3(B.z - A.z, 0, A.x - B.x).normalize();
    for (const h of o.lifts ?? [0.7, 1.4, 2.4, 3.6, 5, 7]) for (const s of o.sides ?? [0, 1.5, -1.5, 3.5, -3.5]) {
      const pts = [A.clone()]; if (o.upA) pts.push(A.clone().addScaledVector(o.upA, 0.6));
      const m = A.clone().lerp(B, o.midAt ?? 0.5).addScaledVector(side, s); m.y = Math.max(o.far ? 0 : A.y, B.y) + h; pts.push(m);
      if (o.upB) pts.push(B.clone().addScaledVector(o.upB, 0.7)); pts.push(B.clone());
      const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), L = c.getLength(), n = Math.ceil(L / 0.15); let ok = true;
      for (let i = 0; i <= n && ok; i++) { c.getPointAt(i / n, v); const dA = v.distanceTo(A), dB = v.distanceTo(B);
        if (v.distanceTo(camP) < cam || (v.y < 0.3 && dA > ends && dB > ends) || hit(v, r, dA < ends ? (o.hostA ?? -1) : dB < ends ? (o.hostB ?? -1) : -1) >= 0) ok = false; }
      if (ok) { c.len = L; return c; } }
    return null; }
  /** the smooth curve through pts if it is clear of every fungus (hostA / hostB excepted close to its two ends), the ground and you; or null */
  function route(pts, o = {}) { const r = o.r ?? 0.5, ends = o.ends ?? 1.0, cam = o.cam ?? 1.5, A = pts[0], B = pts[pts.length - 1];
    const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal'), L = c.getLength(), n = Math.ceil(L / 0.15);
    for (let i = 0; i <= n; i++) { c.getPointAt(i / n, v); const dA = v.distanceTo(A), dB = v.distanceTo(B);
      if (v.distanceTo(camP) < cam || (v.y < 0.3 && dA > ends && dB > ends) || hit(v, r, dA < ends ? (o.hostA ?? -1) : dB < ends ? (o.hostB ?? -1) : -1) >= 0) return null; }
    c.len = L; return c; }
  return { hit, free, los, findPath, flight, route, voxels: vox.size };
}
