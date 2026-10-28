/* ==========================================================================
   The hero, in 3D: a mountain lake at golden hour, or under the stars,
   rendered live with WebGL through three.js. Nothing is downloaded but
   three.js itself: the land, the trees, the castle, the boat, the water and
   the sky are all generated here. The mountains are carved by eroded noise
   and carry light baked into the ground (open sky and soft shadows); the
   spruces are built from branch cards whose needles are drawn on a canvas.
   The lake mirrors the world through a second camera set below the
   waterline; sky, clouds, sun, moon and Milky Way are one shader on a dome
   around the camera. A houseboat on the lake keeps the professional work:
   scrolling takes the camera aboard, where each project hangs on the wall
   of its cabin.

   window.SCENE: setNight(on, instant, seconds), setSink(0..1), setVoyage(0..1),
   voyageAt(picture), hit(x, y), boatAt(x, y), pick(x, y), hover(x, y)
   Without WebGL 2, or if anything here fails, scene2d.js paints instead.
   ========================================================================== */
window.__scene3d = "loading";
const T0 = performance.now();
const logBox = document.getElementById("scene-log");
const showLog = !!logBox && !matchMedia("(max-width: 760px)").matches && firstVisit();
let logged = 0;

function firstVisit() {
  try { if (sessionStorage.getItem("scene-log")) return false; sessionStorage.setItem("scene-log", "1"); } catch (e) { /* storage off: show it */ }
  return true;
}
// a short log of the real build steps, bottom right, on the first visit of a session
function log(what, text) {
  if (!showLog) return;
  const at = ((performance.now() - T0) / 1000).toFixed(2) + "s", n = logged++;
  setTimeout(() => {
    logBox.classList.add("on");
    const li = document.createElement("li");
    li.innerHTML = "<time>" + at + "</time><b>" + what + "</b><span>" + text + "</span>";
    logBox.firstElementChild.appendChild(li);
  }, n * 170);
}

try {
  await start();
} catch (err) {
  console.warn("[scene] 3D unavailable, painting in 2D instead:", err);
  window.__scene3d = "failed";
  // no boat to board without it: the page shows the work as a shelf instead (app.js)
  window.dispatchEvent(new Event("scene:2d"));
  if (logBox) logBox.remove();
  // a canvas that held a WebGL context cannot give a 2D one: hand the painting a fresh one
  const old = document.getElementById("scene");
  if (old) old.replaceWith(Object.assign(old.cloneNode(false), { className: "" }));
  const s = document.createElement("script");
  s.src = new URL("scene2d.js", import.meta.url).href;
  document.body.appendChild(s);
}

async function start() {
  const canvas = document.getElementById("scene");
  if (!canvas) return;
  if (!document.createElement("canvas").getContext("webgl2")) throw new Error("WebGL 2 is not available");
  const THREE = await import("../vendor/three.module.min.js");
  log("three.js", "r" + THREE.REVISION + " loaded");
  // colours here are authored as display values, like the CSS, and written out unconverted
  THREE.ColorManagement.enabled = false;

  const D2R = Math.PI / 180;
  const mq = q => !!(window.matchMedia && matchMedia(q).matches);
  const reduce = mq("(prefers-reduced-motion: reduce)"), fine = mq("(hover: hover) and (pointer: fine)");
  // phones get a lighter world: fewer vertices and trees, fewer pixels
  const small = mq("(max-width: 760px)") || Math.min(screen.width, screen.height) < 600;
  // the world is built in slices that hand the main thread back, so the page keeps painting while it grows
  const idle = () => new Promise(r => setTimeout(r, 0));
  let slice = performance.now();
  const breathe = async () => { if (performance.now() - slice > 12) { await idle(); slice = performance.now(); } };
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const bump = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const hex = h => { const n = parseInt(h.slice(1), 16); return V3((n >> 16) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
  const dirFrom = (az, el, out) => out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  function rng(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- the land: one height function, sampled into the terrain grid ---------- */
  function noise2(seed) {
    const r = rng(seed), P = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) P[i] = r();
    return (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const i0 = xi & 255, i1 = (xi + 1) & 255, j0 = (yi & 255) << 8, j1 = ((yi + 1) & 255) << 8;
      const a = P[i0 + j0], b = P[i1 + j0], c = P[i0 + j1], d = P[i1 + j1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  // the same noise in -1..1, with its gradient (written into out[1], out[2])
  function noised2(seed) {
    const r = rng(seed), P = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) P[i] = r() * 2 - 1;
    return (x, y, out) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), du = 6 * fx * (1 - fx), dv = 6 * fy * (1 - fy);
      const i0 = xi & 255, i1 = (xi + 1) & 255, j0 = (yi & 255) << 8, j1 = ((yi + 1) & 255) << 8;
      const a = P[i0 + j0], b = P[i1 + j0], c = P[i0 + j1], d = P[i1 + j1], k = a - b - c + d;
      out[0] = a + (b - a) * u + (c - a) * v + k * u * v;
      out[1] = du * (b - a + k * v);
      out[2] = dv * (c - a + k * u);
    };
  }
  const nA = noise2(11), nB = noise2(29), nC = noise2(53), nE = noised2(71), ND = new Float32Array(3);
  function fbm(n, x, y, oct) {
    let s = 0, a = .5, f = 1, m = 0;
    for (let o = 0; o < oct; o++) { s += a * n(x * f + o * 19.1, y * f + o * 7.3); m += a; a *= .5; f *= 2.02; }
    return s / m;
  }
  // ridged multifractal: sharp crests, and detail that gathers on them
  function ridged(n, x, y, oct) {
    let s = 0, a = .5, f = 1, w = 1, m = 0;
    for (let o = 0; o < oct; o++) {
      let v = 1 - Math.abs(2 * n(x * f + o * 13.7, y * f + o * 3.1) - 1); v *= v;
      s += v * a * w; w = Math.min(1, v * 1.7); m += a; a *= .5; f *= 2.03;
    }
    return s / m;
  }
  // eroded fbm, after Inigo Quilez: each octave is damped where the slopes beneath it are already steep, so the
  // valleys stay smooth and the detail gathers on spurs and ridges, the way water and ice leave real mountains
  function erosion(x, z, oct) {
    let a = 0, b = 1, dx = 0, dz = 0, px = x, pz = z, m = 0;
    for (let o = 0; o < oct; o++) {
      nE(px, pz, ND);
      dx += ND[1]; dz += ND[2];
      a += b * ND[0] / (1 + dx * dx + dz * dz); m += b;
      b *= .5;
      const nx = 1.6 * px - 1.2 * pz; pz = 1.2 * px + 1.6 * pz; px = nx;
    }
    return a / m;
  }
  // shorelines: the far one curves in at the sides; a wooded spit runs out on the right, a bank on the left
  const shoreZ = x => -300 + .00011 * x * x + 24 * (fbm(nC, x * .004, 3.7, 3) - .5);
  const rightEdge = z => 10 - .2 * Math.min(z, 0) + 6 * (fbm(nC, 1.3, z * .02, 3) - .5);
  const leftEdge = z => -(14 - .6 * Math.min(z, 0)) - 8 * (fbm(nC, 7.9, z * .02, 3) - .5);
  function height(x, z) {
    const dFar = shoreZ(x) - z, dR = x - rightEdge(z), dL = leftEdge(z) - x, land = Math.max(dFar, dR, dL);
    const bed = Math.max(-9, -1.5 + land * .08); // the lake bed, falling away from the shore
    if (land < 0) return bed;
    let h = 0;
    const bank = Math.max(dR, dL);
    if (bank > 0) h = 1 + 11 * smooth(0, 80, bank) * (.45 + fbm(nA, x * .02, z * .02, 4));
    if (dFar > 0) {
      // across the lake: foothills, then ranges rising with distance
      const hills = 2 + 34 * smooth(0, 170, dFar) * fbm(nA, x * .011, z * .011, 4);
      // the ranges sample warped coordinates, so ridges bend and branch instead of lining up
      const wx = x + 190 * (fbm(nC, x * .0016, z * .0016, 3) - .5), wz = z + 190 * (fbm(nC, x * .0016 + 9.1, z * .0016 + 4.7, 3) - .5);
      const amp = 40 * smooth(70, 320, dFar) + 140 * smooth(280, 820, dFar) + 200 * smooth(780, 1500, dFar);
      // eroded noise carves broad faces, spurs and gullies; ridged noise lifts the crests
      const carved = Math.max(0, .55 + .9 * erosion(wx * .0019, wz * .0019, 8)), crest = ridged(nB, wx * .0026, wz * .0026, 5);
      // two massifs anchor the composition, one just right of the sun and one off to the left; the same erosion
      // and crests break them up, so they read as mountains rather than mounds
      const massif = 330 * Math.exp(-((x - 255) ** 2 + (z + 1326) ** 2) / 145800) + 200 * Math.exp(-((x + 653) ** 2 + (z + 1066) ** 2) / 180000);
      let m = hills + amp * (.62 * carved + .5 * crest) + massif * (.55 + .45 * carved) * (.65 + .5 * crest);
      // a rougher texture of ribs and gullies a couple of hundred metres across, a little proud of the slopes
      m *= 1 + .12 * (ridged(nC, wx * .0062, wz * .0062, 4) - .4);
      // a col where the sun sets (azimuth 0): the range is lowered along a wavering line behind the sun, so its
      // walls slope like a pass and stay as broken as the rest of the range
      const az = Math.atan2(x, -z) + .05 * (fbm(nB, x * .004, z * .004, 3) - .5);
      m *= 1 - .72 * bump(az, 0, .1) * smooth(150, 500, dFar);
      h = Math.max(h, m);
    }
    const s = smooth(0, 3, land);
    return h * s + bed * (1 - s);
  }

  // key lights for the land and trees: the low sun cheated round to the left (and the moon likewise), so the faces you
  // can see take raking light, alpenglow on one flank and blue shadow on the other, instead of sitting flat in
  // silhouette. Sky, water and rim light keep the real sun.
  const KEY_DUSK = dirFrom(-70 * D2R, 11 * D2R, V3()), KEY_NIGHT = dirFrom(-40 * D2R, 28 * D2R, V3());

  // the terrain is a polar grid around the camera, fine near and coarse far, so its detail is even on screen;
  // light is then baked into it: how open each point is to the sky, and the soft shadow of each key light
  async function terrain(NA, NR) {
    const A = 1.45, R0 = 16, R1 = 2700, lnR = Math.log(R1 / R0), V = (NA + 1) * (NR + 1), pos = new Float32Array(V * 3);
    for (let j = 0, k = 0; j <= NR; j++) {
      const r = R0 * Math.exp(lnR * j / NR);
      for (let i = 0; i <= NA; i++, k += 3) {
        const a = -A + 2 * A * i / NA, x = r * Math.sin(a), z = -r * Math.cos(a);
        pos[k] = x; pos[k + 1] = height(x, z); pos[k + 2] = z;
      }
      await breathe();
    }
    // the grid read back as a field: bilinear values of a per-vertex channel at a world position (NaN off the grid)
    const field = (arr, off) => (x, z) => {
      const r = Math.sqrt(x * x + z * z), a = Math.atan2(x, -z);
      if (r < R0 || r >= R1 || a <= -A || a >= A) return NaN;
      const fj = Math.log(r / R0) / lnR * NR, fi = (a + A) / (2 * A) * NA, j = fj | 0, i = fi | 0, tj = fj - j, ti = fi - i;
      const k = (j * (NA + 1) + i) * 3 + off, k2 = k + (NA + 1) * 3;
      return (arr[k] + (arr[k + 3] - arr[k]) * ti) * (1 - tj) + (arr[k2] + (arr[k2 + 3] - arr[k2]) * ti) * tj;
    };
    const ground = field(pos, 1);
    // soft shadow, marched over the grid toward the light (after Inigo Quilez's penumbra estimate)
    function shadow(x, y, z, L) {
      let res = 1;
      for (let t = 2; t < 2400; t *= 1.28) {
        const h = ground(x + L.x * t, z + L.z * t);
        if (h !== h) break;
        res = Math.min(res, 9 * (y + L.y * t - h) / t);
        if (res <= 0) return 0;
      }
      return res;
    }
    // baked on every other vertex, then filled in between
    const S = 2, CA = NA / S + 1, CR = NR / S + 1, coarse = new Float32Array(CA * CR * 3);
    const DIRS = Array.from({ length: 6 }, (_, d) => [Math.cos(d * 1.0472 + .26), Math.sin(d * 1.0472 + .26)]);
    for (let cj = 0; cj < CR; cj++) {
      for (let ci = 0; ci < CA; ci++) {
        const k = (cj * S * (NA + 1) + ci * S) * 3, x = pos[k], y = Math.max(pos[k + 1], 0), z = pos[k + 2], o = (cj * CA + ci) * 3;
        // open sky: the highest horizon in six directions
        let open = 0;
        for (const [dx, dz] of DIRS) {
          let top = 0;
          for (let t = 5; t < 420; t *= 1.9) { const h = ground(x + dx * t, z + dz * t); if (h === h) top = Math.max(top, (h - y) / t); }
          open += 1 - top / Math.sqrt(1 + top * top);
        }
        coarse[o] = open / DIRS.length;
        coarse[o + 1] = shadow(x, y + .5, z, KEY_DUSK);
        coarse[o + 2] = shadow(x, y + .5, z, KEY_NIGHT);
      }
      await breathe();
    }
    const lit = new Float32Array(V * 3);
    for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
      const cj = Math.min(CR - 2, (j / S) | 0), ci = Math.min(CA - 2, (i / S) | 0), tj = j / S - cj, ti = i / S - ci, o = (j * (NA + 1) + i) * 3;
      for (let c = 0; c < 3; c++) {
        const k0 = (cj * CA + ci) * 3 + c, k1 = k0 + CA * 3;
        lit[o + c] = (coarse[k0] + (coarse[k0 + 3] - coarse[k0]) * ti) * (1 - tj) + (coarse[k1] + (coarse[k1 + 3] - coarse[k1]) * ti) * tj;
      }
    }
    const idx = new Uint32Array(NA * NR * 6);
    for (let j = 0, k = 0; j < NR; j++) for (let i = 0; i < NA; i++, k += 6) {
      const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1;
      idx[k] = a; idx[k + 1] = b; idx[k + 2] = c; idx[k + 3] = b; idx[k + 4] = d; idx[k + 5] = c;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aLight", new THREE.BufferAttribute(lit, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    const L0 = field(lit, 0), L1 = field(lit, 1), L2 = field(lit, 2);
    return { geometry: g, ground, light: (x, z) => [L0(x, z), L1(x, z), L2(x, z)] };
  }

  /* ---------- the trees: needles drawn on canvas, spruces built from branch cards along the near shores ---------- */
  const NEEDLE = ["#25352B", "#2C3F31", "#334838", "#1E2C24", "#3A5240", "#2F4434"];
  // needles: short strokes fanning forward off a twig on both sides, shorter toward its tip
  function needles(x, r, x0, y0, x1, y1, len, per) {
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, n = Math.round(L * per);
    for (let i = 0; i < n; i++) {
      const t = r(), px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, ang = (r() < .5 ? -1 : 1) * (.75 + r() * .6), l = len * (.55 + r() * .6) * (1 - t * .4);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      x.strokeStyle = NEEDLE[(r() * NEEDLE.length) | 0]; x.lineWidth = .8 + r() * .9;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + (ux * ca - uy * sa) * l, py + (ux * sa + uy * ca) * l); x.stroke();
    }
  }
  function drawn(w, h, paint) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.lineCap = "round";
    paint(x);
    return new THREE.CanvasTexture(c);
  }
  // one branch, trunk end on the left: a sagging twig, thick where it leaves the trunk and tapering out,
  // alternate side shoots, all of it needled
  const branchTex = drawn(256, 128, x => {
    const r = rng(91), twig = t => [t * 250, 64 + t * t * 10];
    x.strokeStyle = "#3B3026";
    for (let t = 0; t < 1; t += .05) {
      const a = twig(t), b = twig(t + .05);
      x.lineWidth = 5 - 3.6 * t; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
    }
    for (let t = .06, s = 1; t < .95; t += .055 + r() * .03, s = -s) {
      const p = twig(t), len = (52 - 38 * t) * (.75 + r() * .4), ang = s * (.6 + r() * .35), ex = p[0] + Math.cos(ang) * len, ey = p[1] + Math.sin(ang) * len;
      x.strokeStyle = "#3B3026"; x.lineWidth = 1.4; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(ex, ey); x.stroke();
      needles(x, r, p[0], p[1], ex, ey, 11 - 4 * t, 1.1);
    }
    const tip = twig(1);
    needles(x, r, 8, 64, tip[0], tip[1], 12, 1.4);
  });
  // a spruce of unit height: whorls of drooping branches growing out of the trunk, longest at the bottom. Each branch is
  // two cards sharing one twig, one lying along it and one standing on it, so it reads from any side; normals point
  // out from the trunk, so it shades like a cone
  function spruce(seed) {
    const r = rng(seed), P = [], UV = [], N = [], SD = [];
    // each branch carries a phase of its own (aSeed), shared by both of its cards, so the pair bows and sways as one
    let phase = 0;
    function card(oy, ax, ay, az, bx, by, bz, len, w, nx, nz) {
      const c = [[-bx * w, oy - by * w, -bz * w], [ax * len - bx * w, oy + ay * len - by * w, az * len - bz * w],
        [ax * len + bx * w, oy + ay * len + by * w, az * len + bz * w], [bx * w, oy + by * w, bz * w]];
      const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (const k of [0, 1, 2, 0, 2, 3]) { P.push(c[k][0], c[k][1], c[k][2]); UV.push(uv[k][0], uv[k][1]); N.push(nx, .45, nz); SD.push(phase); }
    }
    const levels = 18;
    for (let i = 0; i < levels; i++) {
      const f = i / (levels - 1), y = .05 + f * .88, len = .04 + .34 * Math.pow(1 - f, .9) * (.85 + r() * .3), k = Math.max(3, Math.round(7 - 3 * f)), base = r() * 6.283;
      for (let b = 0; b < k; b++) {
        phase = (i * 2.399 + b * 1.618 + seed * .7) % 6.283;
        const az = base + b * 6.283 / k + (r() - .5) * .6, droop = .15 + .5 * (1 - f) + (r() - .5) * .2;
        const ca = Math.cos(az), sa = Math.sin(az), cd = Math.cos(droop), sd = Math.sin(droop);
        const ax = ca * cd, ay = -sd, azz = sa * cd, sx = -sa, sz = ca;          // along the branch, and level across it
        const ux = ay * sz, uy = azz * sx - ax * sz, uz = -ay * sx, ul = Math.hypot(ux, uy, uz) || 1, w = len * .26; // upright across it
        card(y, ax, ay, azz, sx, 0, sz, len, w, ca, sa);
        card(y, ax, ay, azz, ux / ul, uy / ul, uz / ul, len, w, ca, sa);
      }
    }
    phase = 0;
    for (let b = 0; b < 2; b++) card(.92, 0, 1, 0, Math.cos(b * 1.571), 0, Math.sin(b * 1.571), .09, .028, 0, 0); // the leader
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(SD, 1));
    return g;
  }
  // the trees stand on the two near shores only; across the water there is the castle instead
  function plant(ground, count) {
    const r = rng(77), near = [];
    const at = (x, z) => { const g = ground(x, z); return g === g ? g : height(x, z); };
    // the right spit: tall spruces crowding the water's edge, a few close enough to slide past as the camera comes in
    for (let i = 0; i < 6000 && near.length < count * .65; i++) {
      const z = lerp(-330, 24, r()), x = rightEdge(z) + 2.5 + Math.pow(r(), 1.5) * 110, y = at(x, z);
      if (y > .6) near.push([x, y, z, lerp(14, 34, Math.pow(r(), .7))]);
    }
    for (let i = 0; i < 6000 && near.length < count; i++) {
      const z = lerp(-300, 24, r()), x = leftEdge(z) - 2.5 - Math.pow(r(), 1.5) * 110, y = at(x, z);
      if (y > .6) near.push([x, y, z, lerp(13, 30, Math.pow(r(), .7))]);
    }
    return near;
  }

  /* ---------- built things: flat faces gathered into one geometry, each with a colour, a kind (which the shader
     reads as a material) and, for walls with windows, the height of its top ---------- */
  function builder(cell = 0) {
    const P = [], N = [], UV = [], C = [], K = [], T = [];
    const e1 = V3(), e2 = V3(), nn = V3();
    let col = [1, 1, 1], kind = 0, top = 0;
    const api = {
      paint(c, k, t = 0) { const v = hex(c); col = [v.x, v.y, v.z]; kind = k; top = t; return api; },
      // a face from its three or four corners in order round the edge, turned to face `out`. Upright faces get uv in
      // metres (along, up); level ones take x and z. With a `cell` size, the cells along an upright face are centred
      // on it, so a row of windows never runs round a corner
      face(pts, out, uvs, ns) {
        e1.subVectors(pts[1], pts[0]); e2.subVectors(pts[pts.length - 1], pts[0]); nn.crossVectors(e1, e2);
        if (nn.lengthSq() < 1e-12) return api;
        nn.normalize();
        if (out && nn.dot(out) < 0) { pts = pts.slice().reverse(); if (uvs) uvs = uvs.slice().reverse(); if (ns) ns = ns.slice().reverse(); nn.negate(); }
        let along = null, u0 = 0;
        if (!uvs && Math.abs(nn.y) < .7) {
          along = V3(-nn.z, 0, nn.x).normalize();
          const us = pts.map(p => p.x * along.x + p.z * along.z), lo = Math.min(...us), wide = Math.max(...us) - lo;
          u0 = cell ? lo + (wide % cell) / 2 : 0;
        }
        for (const j of pts.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]) {
          const p = pts[j], n = ns ? ns[j] : nn;
          P.push(p.x, p.y, p.z); N.push(n.x, n.y, n.z);
          if (uvs) UV.push(uvs[j][0], uvs[j][1]); else if (along) UV.push(p.x * along.x + p.z * along.z - u0, p.y); else UV.push(p.x, p.z);
          C.push(col[0], col[1], col[2]); K.push(kind); T.push(top);
        }
        return api;
      },
      box(x0, y0, z0, x1, y1, z1, skip = "") {
        const v = V3;
        if (!skip.includes("x")) api.face([v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0)], v(-1, 0, 0));
        if (!skip.includes("X")) api.face([v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), v(x1, y0, z1)], v(1, 0, 0));
        if (!skip.includes("y")) api.face([v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1)], v(0, -1, 0));
        if (!skip.includes("Y")) api.face([v(x0, y1, z0), v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0)], v(0, 1, 0));
        if (!skip.includes("z")) api.face([v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0), v(x1, y0, z0)], v(0, 0, -1));
        if (!skip.includes("Z")) api.face([v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], v(0, 0, 1));
        return api;
      },
      // an upright round wall, shaded smooth, its uv running round the girth in metres
      tube(cx, cz, r, y0, y1, seg) {
        for (let i = 0; i < seg; i++) {
          const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
          api.face([V3(cx + s0 * r, y0, cz + c0 * r), V3(cx + s1 * r, y0, cz + c1 * r), V3(cx + s1 * r, y1, cz + c1 * r), V3(cx + s0 * r, y1, cz + c0 * r)],
            V3(s0 + s1, 0, c0 + c1), [[a0 * r, y0], [a1 * r, y0], [a1 * r, y1], [a0 * r, y1]], [V3(s0, 0, c0), V3(s1, 0, c1), V3(s1, 0, c1), V3(s0, 0, c0)]);
        }
        return api;
      },
      // a cone roof, and the flat of its eaves underneath
      cone(cx, cz, r, y0, y1, seg) {
        const h = y1 - y0, sl = Math.hypot(r, h), n = a => V3(Math.sin(a) * h / sl, r / sl, Math.cos(a) * h / sl);
        for (let i = 0; i < seg; i++) {
          const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, am = (a0 + a1) / 2, apex = V3(cx, y1, cz);
          const b0 = V3(cx + Math.sin(a0) * r, y0, cz + Math.cos(a0) * r), b1 = V3(cx + Math.sin(a1) * r, y0, cz + Math.cos(a1) * r);
          api.face([b0, b1, apex], n(am), [[a0 * r, 0], [a1 * r, 0], [am * r, sl]], [n(a0), n(a1), n(am)]);
          api.face([b0, V3(cx, y0, cz), b1], V3(0, -1, 0));
        }
        return api;
      },
      // a pitched roof over [x0, x1] by [z0, z1], its ridge along x or z, the gable ends in `wall` colour
      gable(x0, x1, z0, z1, y0, y1, ridgeX, wall) {
        const v = (a, y, b) => ridgeX ? V3(a, y, b) : V3(b, y, a);
        const [a0, a1, b0, b1] = ridgeX ? [x0, x1, z0, z1] : [z0, z1, x0, x1], bm = (b0 + b1) / 2;
        api.face([v(a0, y0, b0), v(a1, y0, b0), v(a1, y1, bm), v(a0, y1, bm)], v(0, 1, -1));
        api.face([v(a0, y0, b1), v(a0, y1, bm), v(a1, y1, bm), v(a1, y0, b1)], v(0, 1, 1));
        api.face([v(a0, y0, b0), v(a0, y0, b1), v(a1, y0, b1), v(a1, y0, b0)], V3(0, -1, 0));
        api.paint(wall, 0, 0);
        api.face([v(a0, y0, b0), v(a0, y0, b1), v(a0, y1, bm)], v(-1, 0, 0));
        api.face([v(a1, y0, b0), v(a1, y1, bm), v(a1, y0, b1)], v(1, 0, 0));
        return api;
      },
      pyramid(cx, cz, s, y0, y1) {
        const c = [V3(cx - s, y0, cz - s), V3(cx + s, y0, cz - s), V3(cx + s, y0, cz + s), V3(cx - s, y0, cz + s)], apex = V3(cx, y1, cz);
        for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; api.face([a, b, apex], V3((a.x + b.x) / 2 - cx, s * .5, (a.z + b.z) / 2 - cz)); }
        api.face(c, V3(0, -1, 0));
        return api;
      },
      geometry() {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
        g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
        g.setAttribute("aCol", new THREE.Float32BufferAttribute(C, 3));
        g.setAttribute("aKind", new THREE.Float32BufferAttribute(K, 1));
        g.setAttribute("aTop", new THREE.Float32BufferAttribute(T, 1));
        g.computeBoundingSphere();
        return g;
      }
    };
    return api;
  }

  /* ---------- palettes: dusk and night, blended every frame by `night` ---------- */
  const DUSK = {
    sky: ["#E39A78", "#C47A66", "#93606F", "#57436D", "#272C58", "#0B1132"],
    glow: "#FFAE6B", cloudDark: "#433651", cloudLit: "#F6A47C", light: "#FFA56A", ambient: "#53426A", water: "#171327",
    forest: "#26302A", rock: "#5A5163", snow: "#DCD3E6", tree: "#5C6B5F", bird: "#1B1424", stone: "#9A8D80", slate: "#454A5C"
  };
  const NIGHT = {
    sky: ["#2F2C58", "#272856", "#1B2049", "#10183E", "#070E2A", "#02040B"],
    glow: "#000000", cloudDark: "#0B1028", cloudLit: "#25305B", light: "#7083B8", ambient: "#121A3A", water: "#03060E",
    forest: "#141B18", rock: "#30303C", snow: "#A5B0D2", tree: "#2C3631", bird: "#05060B", stone: "#4A4B5A", slate: "#22263A"
  };
  const prep = p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v.map(hex) : hex(v)]));
  const PAL = { dusk: prep(DUSK), night: prep(NIGHT) };
  const U = {
    uTime: { value: 0 }, uNight: { value: 0 }, uFogD: { value: 1 / 1300 }, uClip: { value: 0 }, uPS: { value: 1 }, uPR: { value: 1 },
    uSunDir: { value: V3() }, uMoonDir: { value: V3() }, uLightDir: { value: V3() }, uKeyDir: { value: V3() }, uLightCol: { value: V3() }, uAmbient: { value: V3() },
    uGlow: { value: V3() }, uSky: { value: [V3(), V3(), V3(), V3(), V3(), V3()] }, uCloudDark: { value: V3() }, uCloudLit: { value: V3() },
    uWater: { value: V3() }, uForest: { value: V3() }, uRock: { value: V3() }, uSnow: { value: V3() }, uTree: { value: V3() }, uBird: { value: V3() },
    uStone: { value: V3() }, uSlate: { value: V3() }, uPx: { value: 1 },
    uShootA: { value: V3() }, uShootB: { value: V3() }, uShootT: { value: -1 }, uBirdA: { value: 1 }
  };
  const BLEND = { glow: "uGlow", cloudDark: "uCloudDark", cloudLit: "uCloudLit", ambient: "uAmbient", water: "uWater", forest: "uForest", rock: "uRock", snow: "uSnow", tree: "uTree", bird: "uBird", stone: "uStone", slate: "uSlate" };
  let night = document.documentElement.dataset.theme === "night" ? 1 : 0, from = night, target = night, t0 = 0;
  const SUN_AZ = 0, MOON_AZ = 4.5 * D2R;
  function applyLight() {
    const a = PAL.dusk, b = PAL.night, n = night;
    for (let i = 0; i < 6; i++) U.uSky.value[i].lerpVectors(a.sky[i], b.sky[i], n);
    for (const k in BLEND) U[BLEND[k]].value.lerpVectors(a[k], b[k], n);
    U.uLightCol.value.lerpVectors(a.light, b.light, n).multiplyScalar(lerp(1.6, .5, n));
    U.uNight.value = n;
    // the sun sinks behind the range as the moon climbs over the massif
    dirFrom(SUN_AZ, lerp(5.6, -11, smooth(0, .8, n)) * D2R, U.uSunDir.value);
    dirFrom(MOON_AZ, lerp(-10, 15, smooth(.15, 1, n)) * D2R, U.uMoonDir.value);
    U.uLightDir.value.copy(U.uSunDir.value).lerp(U.uMoonDir.value, smooth(.3, .7, n)).normalize();
    U.uKeyDir.value.copy(KEY_DUSK).lerp(KEY_NIGHT, smooth(.3, .7, n)).normalize();
  }

  /* ---------- shaders: one sky function, shared, so the haze on every hill is the sky behind it ---------- */
  const COMMON = `
    uniform float uTime, uNight, uFogD, uClip, uPS, uPR;
    uniform vec3 uSunDir, uMoonDir, uLightDir, uKeyDir, uLightCol, uAmbient, uGlow;
    uniform vec3 uSky[6];
    float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
      return mix(mix(hash12(i), hash12(i + vec2(1., 0.)), u.x), mix(hash12(i + vec2(0., 1.)), hash12(i + vec2(1., 1.)), u.x), u.y);
    }
    float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; } return s; }
    vec3 skyGrad(float e) {
      const float E[6] = float[6](0., .03, .08, .16, .32, .65);
      vec3 c = uSky[0];
      for (int i = 1; i < 6; i++) c = mix(c, uSky[i], smoothstep(E[i - 1], E[i], e));
      return c;
    }
    vec3 skyColor(vec3 d) {
      float e = max(d.y, 0.), day = 1. - uNight;
      vec3 c = skyGrad(e);
      float s = max(dot(d, uSunDir), 0.);
      float az = max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz + 1e-5)), 0.);
      c += uGlow * (pow(s, 5.) * .34 + pow(s, 60.) * .42) * day;
      c += uGlow * pow(az, 5.) * exp(-e * 11.) * .55 * day;
      float m = max(dot(d, uMoonDir), 0.);
      c += vec3(.5, .58, .82) * (pow(m, 10.) * .07 + pow(m, 300.) * .3) * uNight;
      return c;
    }
    vec3 fogged(vec3 col, vec3 w, float k) {
      vec3 d = w - cameraPosition; float dist = length(d); d /= dist;
      vec3 hz = skyColor(normalize(vec3(d.x, max(d.y, 0.) * .3 + .015, d.z)));
      float f = (1. - exp(-dist * uFogD * k)) * (1. - .62 * smoothstep(80., 420., w.y));
      f += (1. - smoothstep(0., 30., w.y)) * smoothstep(250., 1100., dist) * .3;
      return mix(col, hz, clamp(f, 0., 1.));
    }
  `;
  const SKY = {
    vertexShader: `varying vec3 vDir;
      void main() { vDir = position; gl_Position = (projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.)).xyww; }`,
    fragmentShader: COMMON + `
      uniform vec3 uCloudDark, uCloudLit, uShootA, uShootB;
      uniform float uShootT;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float day = 1. - uNight;
        vec3 c = skyColor(d);
        // the Milky Way: a band of faint light across the night
        if (uNight > .01) {
          float band = exp(-pow(dot(d, normalize(vec3(.42, .55, .72))) / .17, 2.));
          c += vec3(.55, .6, .88) * band * (.25 + .75 * fbm(d.xz / (d.y + .35) * 3.2)) * .2 * uNight * smoothstep(.02, .3, d.y);
        }
        // clouds: long streaks on a high deck, lit from below while the sun is low
        if (d.y > 0.) {
          vec2 p = d.xz / (d.y + .12);
          float n = fbm(p * vec2(.5, 1.5) + vec2(uTime * .013, uTime * .003));
          float dens = smoothstep(.52, .8, n) * smoothstep(0., .09, d.y) * (1. - smoothstep(.4, .8, d.y)) * (1. - .45 * uNight);
          float toward = pow(max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz + 1e-5)), 0.), 3.);
          vec3 cc = mix(uCloudDark, uCloudLit, (.2 + .8 * toward) * smoothstep(.55, 0., d.y));
          cc += uGlow * pow(max(dot(d, uSunDir), 0.), 8.) * .6 * day;
          c = mix(c, cc, dens * .82);
        }
        // the sun's disc, with a tight bloom so it reads against its own glow; the moon's, softly shaded
        float sd = dot(d, uSunDir);
        c += vec3(1., .78, .52) * pow(max(sd, 0.), 2400.) * .5 * day;
        c = mix(c, vec3(1., .97, .9), smoothstep(.99978, .99986, sd) * day);
        float md = dot(d, uMoonDir), disc = smoothstep(.99990, .99993, md) * uNight;
        if (disc > 0.) {
          vec2 q = (d.xy - uMoonDir.xy) * 320.;
          float maria = vnoise(q) * .6 + vnoise(q * 2.3 + 4.1) * .4;
          c = mix(c, vec3(.97, .95, .9) * (.8 + .2 * smoothstep(.25, .75, maria)) * (.9 + .1 * smoothstep(.9999, .99999, md)), disc);
        }
        // a falling star, now and then
        if (uShootT >= 0.) {
          vec3 head = normalize(mix(uShootA, uShootB, uShootT)), tail = normalize(mix(uShootA, uShootB, max(uShootT - .3, 0.)));
          vec3 ab = head - tail; float h = clamp(dot(d - tail, ab) / max(dot(ab, ab), 1e-7), 0., 1.);
          c += vec3(1.) * smoothstep(.0016, 0., length(d - tail - ab * h)) * h * sin(uShootT * 3.1416) * uNight;
        }
        gl_FragColor = vec4(c, 1.);
      }`
  };
  const TERRAIN = {
    vertexShader: `attribute vec3 aLight; varying vec3 vW, vN, vL;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vL = aLight; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + `
      uniform vec3 uForest, uRock, uSnow;
      varying vec3 vW, vN, vL;
      // value noise with its gradient
      vec3 noised(vec2 p) {
        vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f), du = 6. * f * (1. - f);
        float a = hash12(i), b = hash12(i + vec2(1., 0.)), c = hash12(i + vec2(0., 1.)), d = hash12(i + vec2(1., 1.)), k = a - b - c + d;
        return vec3(a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y, du * vec2(b - a + k * u.y, c - a + k * u.x));
      }
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        float dist = length(vW - cameraPosition);
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.);
        // relief the mesh is too coarse to carry: crags and gullies as a bumped normal, strongest on steep rock, gone far off
        vec2 g = vec2(0.), p = vW.xz * .045; float amp = 1.;
        for (int i = 0; i < 4; i++) { g += noised(p).yz * amp; p = mat2(1.6, 1.2, -1.2, 1.6) * p; amp *= .5; }
        float rough = (1. - smoothstep(500., 2600., dist)) * (.35 + .65 * smoothstep(.12, .5, 1. - n.y)) * smoothstep(6., 50., vW.y);
        vec3 nd = normalize(n + vec3(-g.x, 0., -g.y) * .8 * rough);
        float slope = 1. - nd.y, hN = vW.y + (vnoise(vW.xz * .012) - .5) * 60.;
        // rock in layered strata, darker in its cracks
        float strata = vnoise(vec2(vW.y * .09 + vnoise(vW.xz * .01) * 3., (vW.x + vW.z) * .002));
        vec3 rock = uRock * (.72 + .5 * strata) * (.82 + .32 * vnoise(vW.xz * .08));
        // forest floor below the tree line, rock above it and on cliffs, snow wherever the slope lets it lie
        float forest = (1. - smoothstep(110., 170., hN)) * (1. - smoothstep(.35, .6, slope));
        vec3 alb = mix(rock, uForest * (.75 + .5 * vnoise(vW.xz * .15)), forest);
        float snowLine = 185. + (vnoise(vW.xz * .005) - .5) * 80.;
        float snow = smoothstep(snowLine - 20., snowLine + 30., vW.y) * (1. - smoothstep(.2, .42, slope));
        alb = mix(alb, uSnow * (.92 + .08 * vnoise(vW.xz * .3)), snow);
        vec3 v = normalize(cameraPosition - vW);
        float sh = smoothstep(0., 1., mix(vL.y, vL.z, smoothstep(.3, .7, uNight)));
        float lam = max(dot(nd, uKeyDir), 0.) * sh;
        float rim = pow(1. - max(dot(nd, v), 0.), 4.) * pow(max(dot(-v, uLightDir), 0.), 2.);
        float sky = (.5 + .5 * nd.y) * (.3 + .7 * vL.x);   // light from the open sky, less of it in hollows
        vec3 col = alb * (uAmbient * sky * 1.05 + uLightCol * lam * 1.3) + uLightCol * rim * .3 * (.4 + alb) * (.3 + .7 * sh);
        col += snow * (1. - lam) * uAmbient * .22;           // snow in shade takes the sky's blue
        gl_FragColor = vec4(fogged(col, vW, 1.), 1.);
      }`
  };
  const FOLIAGE = {
    vertexShader: `uniform float uTime, uSway; attribute vec3 aShade; attribute float aSeed; varying vec3 vW, vN, vS; varying vec2 vUv; varying float vY, vTint;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
        float s = length(instanceMatrix[1].xyz), ph = instanceMatrix[3].x * .05 + instanceMatrix[3].z * .07;
        // the whole tree leans in a gusting breeze, and its trunk bends with it (TRUNK, the same lean). On top of that
        // every branch bows up and down and sways on a beat of its own: most at its tip, not at all where it leaves
        // the trunk, so it moves with the tree and never comes away from it
        float gust = .8 + .2 * sin(uTime * .27 + ph * 2.), k = uv.x * uv.x, bp = ph * 3. + aSeed;
        w.xz += (vec2(.8, .35) * sin(uTime * .9 + ph) * position.y * position.y * gust + vec2(1.1, .7) * sin(uTime * 1.9 + bp) * k * .4) * s * uSway;
        w.y += sin(uTime * 1.5 + bp + 1.3) * k * .7 * s * uSway;
        vW = w.xyz; vY = position.y; vUv = uv; vS = aShade;
        vN = mat3(modelMatrix * instanceMatrix) * normal;
        vTint = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: COMMON + `
      uniform sampler2D tMap; uniform vec3 uTree; uniform float uTexSize, uBoost;
      varying vec3 vW, vN, vS; varying vec2 vUv; varying float vY, vTint;
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        vec4 tex = texture2D(tMap, vUv);
        // mipmaps thin the alpha with distance; push it back up so far crowns keep their silhouette, then turn
        // it into smooth coverage for the antialiased edge
        vec2 dd = max(abs(dFdx(vUv)), abs(dFdy(vUv))) * uTexSize;
        float a = tex.a * (1. + max(log2(max(dd.x, dd.y)), 0.) * uBoost);
        float cov = clamp((a - .5) / max(fwidth(a), 1e-4) + .5, 0., 1.);
        if (cov < .02) discard;
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
        float sh = smoothstep(0., 1., mix(vS.y, vS.z, smoothstep(.3, .7, uNight)));
        float lam = max(dot(n, uKeyDir), 0.) * sh;
        // against the low light the needles glow at the edges of the crown
        float back = pow(max(dot(-v, uLightDir), 0.), 3.), rim = pow(1. - abs(dot(n, v)), 2.) * back;
        vec3 alb = tex.rgb * uTree * mix(vec3(.84, .96, .88), vec3(1.14, 1.04, .9), vTint) * (.72 + .4 * vY);
        vec3 col = alb * (uAmbient * (.45 + .6 * vS.x) + uLightCol * lam * .5) + uLightCol * (rim * .3 + back * .05) * (.4 + tex.g * 1.5) * (.4 + .6 * sh);
        gl_FragColor = vec4(fogged(col, vW, 1.), cov);
      }`
  };
  const TRUNK = {
    vertexShader: `uniform float uTime, uSway; attribute vec3 aShade; varying vec3 vW, vN, vS;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
        float s = length(instanceMatrix[1].xyz), ph = instanceMatrix[3].x * .05 + instanceMatrix[3].z * .07;
        // the trunk leans in the breeze exactly as the crown does (FOLIAGE), ring by ring up its height, so every
        // branch stays on it
        float gust = .8 + .2 * sin(uTime * .27 + ph * 2.);
        w.xz += vec2(.8, .35) * sin(uTime * .9 + ph) * position.y * position.y * gust * s * uSway;
        vW = w.xyz; vS = aShade; vN = mat3(modelMatrix * instanceMatrix) * normal; gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: COMMON + `varying vec3 vW, vN, vS;
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        float sh = mix(vS.y, vS.z, smoothstep(.3, .7, uNight));
        vec3 col = vec3(.2, .15, .12) * (uAmbient * .8 + uLightCol * max(dot(normalize(vN), uKeyDir), 0.) * sh * .7);
        gl_FragColor = vec4(fogged(col, vW, 1.), 1.);
      }`
  };
  const WATER = {
    vertexShader: `uniform mat4 uTexMat; varying vec3 vW; varying vec4 vR;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vR = uTexMat * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + `
      uniform sampler2D tRefl; uniform vec3 uWater; varying vec3 vW; varying vec4 vR;
      float hash13(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      float vnoise3(vec3 p) {
        vec3 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
        return mix(mix(mix(hash13(i), hash13(i + vec3(1., 0., 0.)), u.x), mix(hash13(i + vec3(0., 1., 0.)), hash13(i + vec3(1., 1., 0.)), u.x), u.y),
                   mix(mix(hash13(i + vec3(0., 0., 1.)), hash13(i + vec3(1., 0., 1.)), u.x), mix(hash13(i + vec3(0., 1., 1.)), hash13(i + vec3(1., 1., 1.)), u.x), u.y), u.z);
      }
      // the current: out of the mountains toward the near shore, slanting left. Seen in perspective, motion straight at
      // the camera barely moves on screen; the slant is what makes the flow read
      const vec2 FLOW = vec2(-.5, .866);
      // the surface: three layers carried downstream, each at its own speed, each changing shape as it goes
      float wave(vec2 p) {
        float t = uTime;
        return vnoise3(vec3((p - FLOW * t * 2.) * .07, t * .12)) * .55
             + vnoise3(vec3((p - FLOW * t * 3.) * .21, t * .35)) * .3
             + vnoise3(vec3((p - FLOW * t * 4.2) * .62, t * .8)) * .15;
      }
      void main() {
        vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
        // ripples: the surface normal from the flowing layers, calmer with distance
        float k = 1.6 / (1. + dist * .012), e = .25;
        vec2 p = vW.xz;
        float gx = (wave(p + vec2(e, 0.)) - wave(p - vec2(e, 0.))) / (2. * e), gz = (wave(p + vec2(0., e)) - wave(p - vec2(0., e))) / (2. * e);
        vec3 n = normalize(vec3(-gx * 1.5 * k, 1., -gz * 1.5 * k));
        vec3 refl = texture2D(tRefl, vR.xy / vR.w + n.xz * .075 * k).rgb;
        float fres = .04 + .96 * pow(1. - max(dot(n, v), 0.), 5.);
        vec3 col = mix(uWater, refl * .86, clamp(.45 + fres, 0., 1.));
        // long lines of sheen riding the current, the way a river shows its speed
        vec2 q = vec2(dot(p, vec2(FLOW.y, -FLOW.x)), dot(p, FLOW));
        float lines = vnoise(vec2(q.x * .6, (q.y - uTime * 3.6) * .03)) * .7 + vnoise(vec2(q.x * 1.6, (q.y - uTime * 4.4) * .07)) * .3;
        col += (refl * .3 + uLightCol * .05) * smoothstep(.6, .9, lines) * k * .55;
        // glitter where the ripples catch the low light
        float sp = max(dot(reflect(-v, n), uLightDir), 0.);
        col += uLightCol * (pow(sp, 900.) * 7. + pow(sp, 90.) * .24) * smoothstep(-.02, .04, uLightDir.y);
        gl_FragColor = vec4(fogged(col, vW, .55), 1.);
      }`
  };
  const STARS = {
    vertexShader: `uniform float uTime, uNight, uPR, uPS; attribute float aSize, aPhase; varying float vA;
      void main() {
        vec3 d = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.);
        gl_PointSize = max(1.6, aSize * uPR * uPS);
        vA = uNight * (.55 + .45 * sin(uTime * (.7 + aPhase * 2.3) + aPhase * 40.)) * smoothstep(.01, .14, d.y) * (.5 + .7 * aPhase);
      }`,
    fragmentShader: `varying float vA;
      void main() { float a = smoothstep(.5, .12, length(gl_PointCoord - .5)) * vA; gl_FragColor = vec4(vec3(.92, .94, 1.) * a, a); }`
  };
  const LINES = {
    vertexShader: `void main() { gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.); }`,
    fragmentShader: `uniform float uNight; void main() { gl_FragColor = vec4(vec3(.72, .78, 1.) * .14 * uNight, 1.); }`
  };
  const BIRDS = {
    vertexShader: `uniform float uTime; attribute float aPhase; varying vec3 vW;
      void main() {
        vec3 p = position;
        float f = sin(uTime * 9. + aPhase * 6.2832);
        p.y += f * abs(p.z) * .6; p.x -= abs(p.z) * (.5 + .5 * f) * .12;
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.);
        vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: COMMON + `uniform vec3 uBird; uniform float uBirdA; varying vec3 vW;
      void main() { if (uBirdA < .01) discard; gl_FragColor = vec4(fogged(uBird, vW, .6), uBirdA); }`
  };
  const FLIES = {
    vertexShader: `uniform float uTime, uNight, uPR, uPS; attribute float aPhase; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * .35 + aPhase * 7.) * 2.2, sin(uTime * .5 + aPhase * 11.) * .9, cos(uTime * .3 + aPhase * 5.) * 2.2);
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPR * uPS * 90. / -mv.z, 1.5, 12.);
        float b = max(sin(uTime * (1.1 + aPhase) + aPhase * 20.), 0.);
        vA = uNight * b * b;
      }`,
    fragmentShader: `varying float vA;
      void main() { float a = smoothstep(.5, 0., length(gl_PointCoord - .5)) * vA; if (a < .01) discard; gl_FragColor = vec4(vec3(1., .93, .55) * a, a); }`
  };
  // the castle: dressed stone in courses under slate, and rows of windows, most of them lit
  const CASTLE = {
    vertexShader: `attribute vec3 aCol; attribute float aKind, aTop; varying vec3 vW, vN, vCol; varying vec2 vUv; varying float vKind, vTop;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vCol = aCol; vUv = uv; vKind = aKind; vTop = aTop; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + `
      uniform vec3 uStone, uSlate;
      varying vec3 vW, vN, vCol; varying vec2 vUv; varying float vKind, vTop;
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), v = normalize(cameraPosition - vW), alb;
        if (vKind > 1.5) alb = vec3(.035, .03, .03);                                   // the gate's dark mouth
        else if (vKind > .5) alb = uSlate * vCol * (.8 + .35 * hash12(floor(vUv * vec2(1.6, 3.2))));
        else {
          // stone laid in courses, every block its own shade, grimier toward the ground
          float row = floor(vUv.y / .75);
          alb = uStone * vCol * (.8 + .32 * hash12(vec2(floor(vUv.x / 1.7 + row * .5), row))) * (.86 + .28 * vnoise(vUv * .35));
          alb *= .7 + .3 * smoothstep(-4., 8., vUv.y);
        }
        float lam = max(dot(n, uKeyDir), 0.);
        float rim = pow(1. - max(dot(n, v), 0.), 4.) * pow(max(dot(-v, uLightDir), 0.), 2.);
        vec3 col = alb * (uAmbient * (.55 + .45 * n.y) * 1.15 + uLightCol * lam * 1.25) + uLightCol * rim * .3 * (.4 + alb);
        // windows: rows every 5 m, one every 4.2 m along a wall, clear of the ground and the wall head; about two in three lit
        if (vKind < .5 && vTop > 9.) {
          vec2 c = vUv / vec2(4.2, 5.), f = fract(c), id = floor(c), w = fwidth(c) * .75;
          vec2 a = smoothstep(vec2(.37, .22) - w, vec2(.37, .22) + w, f) * (1. - smoothstep(vec2(.63, .64) - w, vec2(.63, .64) + w, f));
          float win = a.x * a.y * step(4., id.y * 5.) * step(id.y * 5. + 8., vTop);
          vec3 lamp = vec3(1., .63, .32) * mix(.75, 1.3, uNight) * (.75 + .5 * hash12(id + 7.3));
          col = mix(col, hash12(id + vCol.xy * 97.) > .34 ? lamp : vec3(.025, .03, .045) + uAmbient * .12, win);
        }
        gl_FragColor = vec4(fogged(col, vW, 1.), 1.);
      }`
  };
  // light inside the cabin, in the boat's own space: a warm fill, pendants down the middle, and a picture light
  // over each frame washing down the wall (the one under the pointer burns brighter)
  const ROOM = count => `
    uniform vec3 uLamps[${Math.max(1, count)}], uPend[4]; uniform float uHover, uHot;
    vec3 room(vec3 p, vec3 n) {
      vec3 e = vec3(.125, .098, .08);
      for (int i = 0; i < 4; i++) {
        vec3 L = uPend[i] - p; float d2 = dot(L, L);
        e += vec3(1., .74, .5) * (.3 + .7 * max(dot(n, L) * inversesqrt(d2), 0.)) * .55 / (1. + d2 * .45);
      }
      for (int i = 0; i < ${Math.max(1, count)}; i++) {
        vec3 L = uLamps[i] - p; float d2 = dot(L, L); vec3 l = L * inversesqrt(d2);
        float spot = smoothstep(.2, .8, dot(-l, normalize(vec3(0., -.85, -.53))));
        float hot = 1. + uHot * (1. - step(.5, abs(float(i) - uHover)));
        e += vec3(1., .84, .64) * max(dot(n, l), 0.) * spot * hot * .55 / (.3 + d2 * 1.2);
      }
      return e;
    }`;
  // the houseboat, outside and in. Kinds below 10 are outdoors (lit by the sky and the low sun), 10 and up are in the
  // cabin (lit by its lamps): 0 paint, 1 deck, 2 siding, 3 roof, 4 trim; 10 wall, 11 panelling, 12 floor, 13 ceiling,
  // 14 runner, 15 dark wood, 16 brass
  const BOAT = count => ({
    vertexShader: `attribute vec3 aCol; attribute float aKind; varying vec3 vW, vN, vP, vM, vCol; varying vec2 vUv; varying float vKind;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vP = position; vM = normal; vN = normalize(mat3(modelMatrix) * normal); vCol = aCol; vUv = uv; vKind = aKind; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + ROOM(count) + `
      uniform vec2 uDoor, uRug;
      varying vec3 vW, vN, vP, vM, vCol; varying vec2 vUv; varying float vKind;
      bool is(float k) { return abs(vKind - k) < .5; }
      // boards w wide, in lengths of len, laid along p.x: each its own shade, dark seams between them
      float boards(vec2 p, float w, float len) {
        float row = floor(p.y / w), x = p.x + hash12(vec2(row, 3.1)) * len, piece = floor(x / len);
        vec2 f = vec2(fract(x / len) * len, fract(p.y / w) * w), aa = max(fwidth(p), vec2(.002));
        float seam = smoothstep(0., aa.y * 1.5, min(f.y, w - f.y) - .003) * smoothstep(0., aa.x * 1.5, min(f.x, len - f.x) - .004);
        return (.8 + .34 * hash12(vec2(row, piece))) * (.9 + .1 * vnoise(vec2(p.x * 7., p.y * 60.))) * mix(.5, 1., seam);
      }
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        float face = gl_FrontFacing ? 1. : -1.;
        vec3 n = normalize(vN) * face, m = normalize(vM) * face, alb = vCol;
        vec2 p = vUv;
        if (is(1.) || is(12.)) alb *= boards(p, .14, 2.3);
        else if (is(13.)) alb *= boards(p, .11, 3.1) * .4 + .6;
        else if (is(2.)) alb *= .8 + .2 * smoothstep(0., .13, fract(p.y / .15) * .15);
        else if (is(11.)) { float g = min(fract(p.x / .32), 1. - fract(p.x / .32)) * .32; alb *= mix(.55, 1., smoothstep(0., .008, g - .004)) * (.9 + .1 * vnoise(p * vec2(4., 40.))); }
        else if (is(14.)) {
          // the runner: a gold border, and lozenges down its red field
          vec2 q = abs(vP.xz) - uRug + .12;
          float lz = abs(fract(vP.x / .6) - .5) + abs(fract(vP.z / .6 + .5) - .5);
          alb = max(q.x, q.y) > 0. ? vec3(.6, .44, .24) : mix(vec3(.36, .1, .1), vec3(.56, .33, .18), step(lz, .22) * step(.13, lz));
        }
        vec3 col;
        if (vKind > 9.5) col = alb * room(vP, m);
        else {
          vec3 v = normalize(cameraPosition - vW);
          float lam = max(dot(n, uKeyDir), 0.);
          float rim = pow(1. - max(dot(n, v), 0.), 4.) * pow(max(dot(-v, uLightDir), 0.), 2.);
          col = alb * (uAmbient * (.55 + .45 * n.y) * 1.15 + uLightCol * lam * 1.1) + uLightCol * rim * .3 * (.4 + alb);
          // lamplight falling out of the cabin door onto the deck
          if (is(1.)) { vec2 d = vP.xz - uDoor; col += alb * vec3(1., .7, .42) * .9 * exp(-dot(d, d) * 1.4); }
        }
        gl_FragColor = vec4(fogged(col, vW, 1.), 1.);
      }`
  });
  // a picture: the project's cover (covers.js) in a cream mat, lit by the lamps of the room; also the brass plaques
  const PIC = count => ({
    vertexShader: `varying vec3 vW, vP; varying vec2 vUv;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vP = position; vUv = uv; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + ROOM(count) + `
      uniform sampler2D tMap; uniform vec2 uInset; uniform float uSel;
      varying vec3 vW, vP; varying vec2 vUv;
      void main() {
        vec3 alb;
        if (uInset.x > 0.) {
          // the mat, shadowed along the bevel of its cut
          vec2 a = (vUv - uInset) / (1. - 2. * uInset), e = min(a, 1. - a);
          float edge = min(e.x, e.y), w = max(fwidth(edge), 1e-5);
          vec3 mat = vec3(.88, .84, .76) * (1. - .4 * smoothstep(-.025, 0., edge));
          alb = mix(mat, texture2D(tMap, clamp(a, 0., 1.)).rgb, smoothstep(-.5 * w, .5 * w, edge));
        } else alb = texture2D(tMap, vUv).rgb;
        vec3 col = alb * room(vP, vec3(0., 0., 1.)) * (1. + .3 * uSel) + alb * (.05 + .06 * uSel);
        gl_FragColor = vec4(col, 1.);
      }`
  });
  // the boat's windows, seen from outside: lamplight through drawn curtains, a cross of glazing bars
  const GLASS = {
    vertexShader: `varying vec3 vW; varying vec2 vUv; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vUv = uv; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + `varying vec3 vW; varying vec2 vUv;
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        vec2 q = vUv, aa = fwidth(q);
        float glow = (.6 + .4 * sin(q.y * 3.1416)) * (.8 + .2 * sin(q.x * 37.) * sin(q.x * 11. + 1.));
        float bars = max(1. - smoothstep(.02, .02 + aa.x * 1.5, abs(q.x - .5)), 1. - smoothstep(.03, .03 + aa.y * 1.5, abs(q.y - .52)));
        vec3 c = mix(vec3(1., .64, .34) * glow * mix(.9, 1.15, uNight), vec3(.08, .06, .05), bars * .85);
        gl_FragColor = vec4(fogged(c, vW, 1.), 1.);
      }`
  };
  // lamps that shine: bulbs, the lantern, the strips under the picture lights
  const LAMP = {
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uClip; uniform vec3 uCol; varying vec3 vW; void main() { if (uClip > .5 && vW.y < 0.) discard; gl_FragColor = vec4(uCol, 1.); }`
  };
  // and the soft light round them, as points sized in metres
  const GLOW = {
    vertexShader: `uniform float uPx, uPS; attribute float aSize; attribute vec3 aTint; varying vec3 vT;
      void main() { vec4 mv = viewMatrix * modelMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uPx * uPS / -mv.z, 2., 240.); vT = aTint; }`,
    fragmentShader: `varying vec3 vT; void main() { float d = length(gl_PointCoord - .5) * 2., a = exp(-d * d * 4.5) * (1. - d); if (a < .004) discard; gl_FragColor = vec4(vT * a, a); }`
  };
  const material = (src, extra = {}, opts = {}) => new THREE.ShaderMaterial(Object.assign({ uniforms: Object.assign({}, U, extra), vertexShader: src.vertexShader, fragmentShader: src.fragmentShader }, opts));

  /* ---------- the world ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 1);
  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    console.error("[scene] shader error", gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(program));
    throw new Error("a shader failed to compile");
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .5, 9000), mirrorCam = new THREE.PerspectiveCamera();
  camera.rotation.order = "YXZ";
  const rt = new THREE.WebGLRenderTarget(2, 2), aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  branchTex.anisotropy = aniso;
  // everything outside the boat, hidden while the camera stands in its cabin (nothing of it can be seen there)
  const outdoors = [], outside = o => { outdoors.push(o); scene.add(o); return o; };

  const sky = outside(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), material(SKY, {}, { side: THREE.BackSide, depthWrite: false, depthTest: false })));
  sky.renderOrder = -10; sky.frustumCulled = false;

  const land = await terrain(small ? 320 : 480, small ? 160 : 240);
  outside(new THREE.Mesh(land.geometry, material(TERRAIN, {}, { side: THREE.DoubleSide })));
  log("terrain", land.geometry.attributes.position.count.toLocaleString("en") + " vertices, carved and lit");

  const forest = plant(land.ground, small ? 90 : 150), dummy = new THREE.Object3D(), tr = rng(5);
  // each tree: its matrix, and the light baked into the ground it stands on
  const place = list => list.map(([x, y, z, s]) => {
    const w = .8 + tr() * .35, l = land.light(x, z);
    dummy.position.set(x, y - .3, z); dummy.rotation.set((tr() - .5) * .06, tr() * 6.283, (tr() - .5) * .06); dummy.scale.set(s * w, s, s * w); dummy.updateMatrix();
    return { m: dummy.matrix.clone(), l: l[0] === l[0] ? l : [1, 1, 1] };
  });
  function grove(geo, mat, items) {
    const m = new THREE.InstancedMesh(geo, mat, items.length), shade = new Float32Array(items.length * 3);
    items.forEach((it, i) => { m.setMatrixAt(i, it.m); shade.set(it.l, i * 3); });
    geo.setAttribute("aShade", new THREE.InstancedBufferAttribute(shade, 3));
    m.computeBoundingSphere();
    outside(m);
  }
  const SWAY = .02, foliage = tex => material(FOLIAGE, { tMap: { value: tex }, uTexSize: { value: 256 }, uSway: { value: SWAY }, uBoost: { value: .45 } }, { side: THREE.DoubleSide, alphaToCoverage: true });
  const trees = place(forest);
  grove(spruce(11), foliage(branchTex), trees.filter((_, i) => i % 2 === 0));
  grove(spruce(23), foliage(branchTex), trees.filter((_, i) => i % 2 === 1));
  // the trunk runs the full height, tapering to the leader, so every whorl grows out of it. It bends in the same breeze
  // as the branches, so it is made in rings up its height to follow the same curve
  grove(new THREE.CylinderGeometry(.004, .026, .97, 7, 16, true).translate(0, .485, 0), material(TRUNK, { uSway: { value: SWAY } }), trees);
  log("trees", trees.length.toLocaleString("en") + " spruces on the near shores");

  const texMat = new THREE.Matrix4();
  const water = outside(new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), material(WATER, { tRefl: { value: rt.texture }, uTexMat: { value: texMat } })));
  water.rotation.x = -Math.PI / 2;
  log("lake", "mirror pass ready");

  /* ---------- the castle, across the water left of the sun: a curtain wall with round towers at its corners, a
     gatehouse, a great hall, a chapel and a tall keep, in stone under slate. It stands on the shore as the land lies,
     on a battered plinth deep enough to meet the ground wherever it falls away ---------- */
  {
    const b = builder(4.2), pale = "#FFFFFF", warm = "#F3EADF", cool = "#E2DEDA";
    const merlons = (x0, x1, z0, z1, y) => {
      const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0, n = Math.floor(len / 2.4), m0 = (len - n * 2.4) / 2 + .6;
      for (let k = 0; k < n; k++) {
        const a = (alongX ? x0 : z0) + m0 + k * 2.4;
        if (alongX) b.box(a, y, z0, a + 1.2, y + 1.5, z1, "y"); else b.box(x0, y, a, x1, y + 1.5, a + 1.2, "y");
      }
    };
    const top = [V3(-33, 0, -23), V3(33, 0, -23), V3(33, 0, 16), V3(-33, 0, 16)], foot = [V3(-36, -10, -26), V3(36, -10, -26), V3(36, -10, 19), V3(-36, -10, 19)];
    b.paint(cool, 0, 0);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; b.face([foot[i], foot[j], top[j], top[i]], V3((top[i].x + top[j].x) / 2, 0, (top[i].z + top[j].z) / 2)); }
    b.face(top, V3(0, 1, 0));
    // the curtain walls, crenellated
    b.paint(pale, 0, 12);
    b.box(-30, -1, 11, 30, 12, 13.5, "y").box(-30, -1, -20, -27.5, 12, 11, "y").box(27.5, -1, -20, 30, 12, 11, "y").box(-27.5, -1, -20, 27.5, 12, -17.5, "y");
    b.paint(cool, 0, 0);
    merlons(-30, 30, 12.6, 13.5, 12); merlons(-30, -29.1, -20, 11, 12); merlons(29.1, 30, -20, 11, 12);
    // round towers at the corners, under slate cones
    for (const [x, z, r, h] of [[-30, 12.3, 5.6, 22], [30, 12.3, 5.6, 22], [-30, -19, 4.8, 19], [30, -19, 4.8, 19]]) {
      b.paint(warm, 0, h).tube(x, z, r, -1, h, 20);
      b.paint(pale, 1).cone(x, z, r + .8, h, h + r * 2.4, 20);
    }
    // the gatehouse, a turret either side of its gate
    b.paint(pale, 0, 17).box(-6.5, -1, 8.5, 6.5, 17, 15.5, "y");
    b.paint(cool, 0, 0); merlons(-6.5, 6.5, 14.6, 15.5, 17);
    b.paint(pale, 2).face([V3(-2.2, 0, 15.53), V3(2.2, 0, 15.53), V3(2.2, 6.5, 15.53), V3(-2.2, 6.5, 15.53)], V3(0, 0, 1));
    for (const x of [-6.5, 6.5]) { b.paint(warm, 0, 0).tube(x, 15.5, 1.7, 5, 20, 12); b.paint(pale, 1).cone(x, 15.5, 2.2, 20, 26, 12); }
    // the great hall under a steep roof, and the chapel across its end
    b.paint(cool, 0, 19).box(-22, -1, -12, 8, 19, 3, "y");
    b.paint(pale, 1).gable(-22.6, 8.6, -12.7, 3.7, 19, 29.5, true, cool);
    b.paint(warm, 0, 15).box(-27, -1, -16, -20, 15, -3, "y");
    b.paint(pale, 1).gable(-27.5, -19.5, -16.5, -2.5, 15, 22, false, warm);
    // a slender round tower behind the hall
    b.paint(pale, 0, 34).tube(-13, -15, 3.6, -1, 34, 18);
    b.paint(pale, 1).cone(-13, -15, 4.3, 34, 47, 18);
    // the keep, the tallest thing on the lake, a turret at each corner of its head
    b.paint(warm, 0, 40).box(10, -1, -10, 21, 40, 1, "y");
    b.paint(pale, 1).pyramid(15.5, -4.5, 6.2, 40, 57);
    for (const [x, z] of [[10, -10], [21, -10], [10, 1], [21, 1]]) { b.paint(cool, 0, 0).tube(x, z, 1.25, 33, 43, 10); b.paint(pale, 1).cone(x, z, 1.65, 43, 48.5, 10); }
    const castle = outside(new THREE.Mesh(b.geometry(), material(CASTLE, {}, { side: THREE.DoubleSide })));
    // thirty-odd metres back from the water, its front turned to the lake and a little to the left
    const cx = -55, cz = shoreZ(cx) - 34, gy = land.ground(cx, cz);
    castle.position.set(cx, gy === gy ? gy : height(cx, cz), cz);
    castle.rotation.y = .45; castle.scale.setScalar(.95);
    log("castle", "walls, towers and a keep across the water");
  }

  /* ---------- the houseboat, moored right of the sun. Its cabin is a gallery: the professional work (the shelf that
     content.js marks `gallery`) hangs on the far wall, a picture light over each frame ---------- */
  const SITE = window.SITE || {}, GALLERY = new Set((SITE.sections || []).filter(s => s.gallery).map(s => s.id));
  const WORK = (SITE.projects || []).filter(p => GALLERY.has(p.section)), NP = WORK.length;
  // in metres, in the boat's own space: x runs from stern to bow, z across it (+z faces the shore the camera starts
  // from), y up from the water
  const GAP = 1.2, HALF = Math.max(6.6, (NP - 1) * GAP / 2 + 1.2), CW = 2.2, WALL = .08, X0 = -(NP - 1) * GAP / 2;
  const DECK = .55, FLOOR = .56, WAIN = 1.46, CEIL = 2.85, ROOF = 2.95, EYE = 2.15, PIC_Y = 2.1, FW = .5, FH = .39, LY = PIC_Y + FH + .05;
  const STERN = -HALF - 2, BOW = HALF + 2.2, BEAM = 2.6, XO = HALF + WALL, ZO = CW + WALL;
  const boat = new THREE.Group();
  boat.position.set(9.4, 0, -63.3); boat.rotation.order = "YXZ"; boat.rotation.y = 25 * D2R;
  boat.updateMatrixWorld();
  const BM = boat.matrixWorld.clone(); // where it lies at rest: the voyage is planned against this
  const lamps = [], pend = [-.66, -.22, .22, .66].map(f => V3(f * HALF, 2.42, 0)), pics = [], picks = [];
  const ROOMU = { uLamps: { value: [] }, uPend: { value: pend }, uHover: { value: -1 }, uHot: { value: 0 } };
  {
    const b = builder();
    // the hull, lofted through sections from a square stern to a fine bow that lifts a little
    const B0 = HALF - 1.6, xs = [STERN, -HALF, B0];
    for (let k = 1; k <= 10; k++) xs.push(B0 + (BOW - B0) * k / 10);
    const st = xs.map(x => {
      const f = Math.max(0, (x - B0) / (BOW - B0)), w = BEAM * Math.sqrt(Math.max(0, 1 - f * f)), top = DECK + .24 * f * f, bot = -.3 + .5 * Math.pow(f, 1.6);
      // from the gunwale down: the rubbing strake, the topsides, a dark boot top at the waterline, the bilge, the flat
      return [[top, w], [top - .13, w], [.04, w * .985], [-.1, w * .96], [bot, w * .88], [bot, 0]].map(([y, z]) => [x, y, z]);
    });
    const BAND = ["#D9CDB6", "#5A2A26", "#1A1B20", "#1A1B20", "#1A1B20"];
    for (let i = 0; i < st.length - 1; i++) {
      const a = st[i], c = st[i + 1];
      for (let j = 0; j < 5; j++) {
        b.paint(BAND[j], 0);
        for (const s of [1, -1]) b.face([V3(a[j][0], a[j][1], s * a[j][2]), V3(c[j][0], c[j][1], s * c[j][2]), V3(c[j + 1][0], c[j + 1][1], s * c[j + 1][2]), V3(a[j + 1][0], a[j + 1][1], s * a[j + 1][2])], j === 4 ? V3(0, -1, 0) : V3(0, 0, s));
      }
      b.paint("#7C5B3E", 1).face([V3(a[0][0], a[0][1], -a[0][2]), V3(c[0][0], c[0][1], -c[0][2]), V3(c[0][0], c[0][1], c[0][2]), V3(a[0][0], a[0][1], a[0][2])], V3(0, 1, 0));
    }
    for (let j = 0, t = st[0]; j < 4; j++) b.paint(BAND[j], 0).face([V3(STERN, t[j][1], t[j][2]), V3(STERN, t[j][1], -t[j][2]), V3(STERN, t[j + 1][1], -t[j + 1][2]), V3(STERN, t[j + 1][1], t[j + 1][2])], V3(-1, 0, 0));

    // the cabin: lapped boards outside, windows down the near side, a door and two small windows at the stern end
    const wins = [], nw = Math.max(3, Math.floor((2 * HALF - .8) / 2.4));
    for (let k = 0; k < nw; k++) wins.push((k - (nw - 1) / 2) * 2.4);
    const WY1 = 2.36, DOOR = .48, DTOP = 2.55, SZ = 1.75, SW = .26, SY0 = 1.5, SY1 = 2.25;
    const nearHoles = wins.map(x => [x - .55, x + .55, WAIN, WY1]), sternHoles = [[-SZ - SW, -SZ + SW, SY0, SY1], [-DOOR, DOOR, DECK - .01, DTOP], [SZ - SW, SZ + SW, SY0, SY1]];
    // a wall with holes in it, as rectangles round them (holes in order along it); at(u, y) places a point on the wall
    function wall(at, out, u0, u1, y0, y1, holes) {
      const rect = (ua, ub, ya, yb) => { if (ub - ua > 1e-3 && yb - ya > 1e-3) b.face([at(ua, ya), at(ub, ya), at(ub, yb), at(ua, yb)], out); };
      let u = u0;
      for (const [ha, hb, hy0, hy1] of holes) {
        const lo = Math.max(hy0, y0), hi = Math.min(hy1, y1);
        if (hi <= lo) continue;
        rect(u, ha, y0, y1); rect(ha, hb, y0, lo); rect(ha, hb, hi, y1); u = hb;
      }
      rect(u, u1, y0, y1);
    }
    const nearOut = (u, y) => V3(u, y, ZO), farOut = (u, y) => V3(u, y, -ZO), sternOut = (u, y) => V3(-XO, y, u), bowOut = (u, y) => V3(XO, y, u);
    b.paint("#CDBFA6", 2);
    wall(nearOut, V3(0, 0, 1), -XO, XO, DECK, ROOF, nearHoles); wall(farOut, V3(0, 0, -1), -XO, XO, DECK, ROOF, []);
    wall(sternOut, V3(-1, 0, 0), -ZO, ZO, DECK, ROOF, sternHoles); wall(bowOut, V3(1, 0, 0), -ZO, ZO, DECK, ROOF, []);
    // inside: panelling to the sill, a deep green above, where the pictures hang
    for (const [y0, y1, k, c] of [[FLOOR, WAIN, 11, "#5E3D29"], [WAIN, CEIL, 10, "#34493F"]]) {
      b.paint(c, k);
      wall((u, y) => V3(u, y, CW), V3(0, 0, -1), -HALF, HALF, y0, y1, nearHoles); wall((u, y) => V3(u, y, -CW), V3(0, 0, 1), -HALF, HALF, y0, y1, []);
      wall((u, y) => V3(-HALF, y, u), V3(1, 0, 0), -CW, CW, y0, y1, sternHoles); wall((u, y) => V3(HALF, y, u), V3(-1, 0, 0), -CW, CW, y0, y1, []);
    }
    // the thickness of the wall round each opening
    b.paint("#3A2A20", 15);
    for (const [ha, hb, y0, y1] of nearHoles) {
      b.face([V3(ha, y0, CW), V3(hb, y0, CW), V3(hb, y0, ZO), V3(ha, y0, ZO)], V3(0, 1, 0)).face([V3(ha, y1, CW), V3(hb, y1, CW), V3(hb, y1, ZO), V3(ha, y1, ZO)], V3(0, -1, 0));
      b.face([V3(ha, y0, CW), V3(ha, y1, CW), V3(ha, y1, ZO), V3(ha, y0, ZO)], V3(1, 0, 0)).face([V3(hb, y0, CW), V3(hb, y1, CW), V3(hb, y1, ZO), V3(hb, y0, ZO)], V3(-1, 0, 0));
    }
    for (const [ha, hb, y0, y1] of sternHoles) {
      const lo = Math.max(y0, DECK);
      if (y0 > DECK) b.face([V3(-HALF, y0, ha), V3(-HALF, y0, hb), V3(-XO, y0, hb), V3(-XO, y0, ha)], V3(0, 1, 0));
      b.face([V3(-HALF, y1, ha), V3(-HALF, y1, hb), V3(-XO, y1, hb), V3(-XO, y1, ha)], V3(0, -1, 0));
      b.face([V3(-HALF, lo, ha), V3(-HALF, y1, ha), V3(-XO, y1, ha), V3(-XO, lo, ha)], V3(0, 0, 1)).face([V3(-HALF, lo, hb), V3(-HALF, y1, hb), V3(-XO, y1, hb), V3(-XO, lo, hb)], V3(0, 0, -1));
    }
    // floor, runner, ceiling and its beams; a rail at the top of the panelling and a skirting board
    b.paint("#73503A", 12).face([V3(-HALF, FLOOR, -CW), V3(HALF, FLOOR, -CW), V3(HALF, FLOOR, CW), V3(-HALF, FLOOR, CW)], V3(0, 1, 0));
    b.paint("#FFFFFF", 14).face([V3(-HALF + .6, FLOOR + .006, -.62), V3(HALF - .6, FLOOR + .006, -.62), V3(HALF - .6, FLOOR + .006, .62), V3(-HALF + .6, FLOOR + .006, .62)], V3(0, 1, 0));
    b.paint("#D3C5AB", 13).face([V3(-HALF, CEIL, -CW), V3(HALF, CEIL, -CW), V3(HALF, CEIL, CW), V3(-HALF, CEIL, CW)], V3(0, -1, 0));
    b.paint("#4A3424", 15);
    for (let i = 0; i <= NP; i++) { const x = X0 + (i - .5) * GAP; if (Math.abs(x) < HALF - .1) b.box(x - .05, CEIL - .13, -CW, x + .05, CEIL, CW, "YzZ"); }
    for (const [y0, y1, d] of [[WAIN - .02, WAIN + .025, .025], [FLOOR, FLOOR + .1, .015]]) {
      b.box(-HALF, y0, -CW, HALF, y1, -CW + d).box(-HALF, y0, CW - d, HALF, y1, CW).box(HALF - d, y0, -CW, HALF, y1, CW);
      b.box(-HALF, y0, -CW, -HALF + d, y1, -DOOR).box(-HALF, y0, DOOR, -HALF + d, y1, CW);
    }
    // the frames, each with a brass picture light on an arm above it
    for (let i = 0; i < NP; i++) {
      const x = X0 + i * GAP, z = -CW;
      b.paint("#2B1D16", 15);
      b.box(x - FW, PIC_Y + FH - .05, z, x + FW, PIC_Y + FH, z + .045).box(x - FW, PIC_Y - FH, z, x + FW, PIC_Y - FH + .05, z + .045);
      b.box(x - FW, PIC_Y - FH + .05, z, x - FW + .05, PIC_Y + FH - .05, z + .045).box(x + FW - .05, PIC_Y - FH + .05, z, x + FW, PIC_Y + FH - .05, z + .045);
      b.paint("#B48A4A", 16);
      b.box(x - .04, LY, z, x + .04, LY + .08, z + .012).box(x - .012, LY + .025, z, x + .012, LY + .04, z + .17).box(x - .17, LY + .01, z + .15, x + .17, LY + .045, z + .2);
      lamps.push(V3(x, LY, z + .19));
    }
    // pendants down the middle, on cords
    b.paint("#2B1D16", 15);
    for (const p of pend) b.box(p.x - .006, p.y + .08, -.006, p.x + .006, CEIL, .006);
    b.paint("#B48A4A", 16);
    for (const p of pend) b.box(p.x - .05, p.y + .06, -.05, p.x + .05, p.y + .1, .05);

    // outside: the roof, a stovepipe, corner posts, the door standing open, window boxes
    b.paint("#3B3640", 3).box(-XO - .3, ROOF, -ZO - .25, XO + .3, ROOF + .12, ZO + .25);
    b.paint("#26252A", 0).box(HALF - 1.4, ROOF + .12, -1.27, HALF - 1.26, ROOF + .8, -1.13);
    b.paint("#3A2A20", 4);
    for (const [x, z] of [[-XO, -ZO], [-XO, ZO], [XO, -ZO], [XO, ZO]]) b.box(x - .07, DECK, z - .07, x + .07, ROOF, z + .07);
    b.paint("#2F4A40", 0).box(-XO - .05, DECK + .02, DOOR + .03, -XO - .01, DTOP - .03, DOOR + .93);
    for (const x of wins) {
      b.paint("#3A2A20", 4).box(x - .5, WAIN - .24, ZO, x + .5, WAIN - .06, ZO + .2);
      b.paint("#2F4A2E", 0).box(x - .47, WAIN - .06, ZO + .02, x + .47, WAIN + .05, ZO + .18);
    }
    // a rail round the after deck, open in the middle where you step aboard, and a lantern on a post at its corner
    const RX = STERN + .12, RY = DECK + .9, LANT = V3(RX, DECK + 1.52, 2.42);
    b.paint("#D9CDB6", 0);
    for (const z of [-2.42, -1.6, -.72, .72, 1.6, 2.42]) b.box(RX - .025, DECK, z - .025, RX + .025, RY, z + .025);
    for (const z of [-2.42, 2.42]) b.box((RX - XO) / 2 - .025, DECK, z - .025, (RX - XO) / 2 + .025, RY, z + .025).box(RX, RY - .04, z - .03, -XO, RY, z + .03);
    b.box(RX - .03, RY - .04, .72, RX + .03, RY, 2.45).box(RX - .03, RY - .04, -2.45, RX + .03, RY, -.72);
    b.paint("#26252A", 0).box(RX - .02, RY, 2.4, RX + .02, LANT.y - .08, 2.44).box(RX - .08, LANT.y + .08, 2.34, RX + .08, LANT.y + .12, 2.5);
    ROOMU.uLamps.value = lamps.length ? lamps : [V3(0, -99, 0)];
    boat.add(new THREE.Mesh(b.geometry(), material(BOAT(NP), Object.assign({ uDoor: { value: new THREE.Vector2(-XO - .7, 0) }, uRug: { value: new THREE.Vector2(HALF - .6, .62) } }, ROOMU), { side: THREE.DoubleSide })));

    // the windows' glass, lit from within
    const g = builder(), UV4 = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const x of wins) g.face([V3(x - .55, WAIN, ZO - .012), V3(x + .55, WAIN, ZO - .012), V3(x + .55, WY1, ZO - .012), V3(x - .55, WY1, ZO - .012)], V3(0, 0, 1), UV4);
    for (const z of [-SZ, SZ]) g.face([V3(-XO + .012, SY0, z + SW), V3(-XO + .012, SY0, z - SW), V3(-XO + .012, SY1, z - SW), V3(-XO + .012, SY1, z + SW)], V3(-1, 0, 0), UV4);
    boat.add(new THREE.Mesh(g.geometry(), material(GLASS)));
    // what shines: the pendants' globes, the strips under the picture lights, the lantern; and the light round them
    const bulb = material(LAMP, { uCol: { value: V3(1, .88, .68) } }), globe = new THREE.SphereGeometry(.085, 14, 10);
    for (const p of pend) { const m = new THREE.Mesh(globe, bulb); m.position.copy(p); boat.add(m); }
    const l = builder();
    for (const p of lamps) l.box(p.x - .15, LY + .005, p.z - .02, p.x + .15, LY + .01, p.z + .02);
    l.box(LANT.x - .055, LANT.y - .08, LANT.z - .055, LANT.x + .055, LANT.y + .08, LANT.z + .055);
    boat.add(new THREE.Mesh(l.geometry(), material(LAMP, { uCol: { value: V3(1, .83, .56) } })));
    const halo = [[LANT, .9, [1, .7, .4]], ...pend.map(p => [p, .32, [.5, .38, .25]])], hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.Float32BufferAttribute(halo.flatMap(h => [h[0].x, h[0].y, h[0].z]), 3));
    hg.setAttribute("aSize", new THREE.Float32BufferAttribute(halo.map(h => h[1]), 1));
    hg.setAttribute("aTint", new THREE.Float32BufferAttribute(halo.flatMap(h => h[2]), 3));
    const halos = new THREE.Points(hg, material(GLOW, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halos.frustumCulled = false; boat.add(halos);

    // the pictures, each in a cream mat, with a brass plaque under it; the covers come from covers.js
    const AW = small ? 768 : 1024, AH = Math.round(AW * .54 / .76), PW = small ? 640 : 768, pic = PIC(NP);
    for (let i = 0; i < NP; i++) {
      const x = X0 + i * GAP, art = document.createElement("canvas"), plate = document.createElement("canvas");
      art.width = AW; art.height = AH; plate.width = PW; plate.height = PW / 4;
      const ta = new THREE.CanvasTexture(art), tp = new THREE.CanvasTexture(plate), sel = { value: 0 };
      ta.anisotropy = tp.anisotropy = aniso;
      const a = new THREE.Mesh(new THREE.PlaneGeometry(.9, .68).translate(x, PIC_Y, -CW + .024), material(pic, Object.assign({ tMap: { value: ta }, uInset: { value: new THREE.Vector2(.07 / .9, .07 / .68) }, uSel: sel }, ROOMU)));
      const q = new THREE.Mesh(new THREE.PlaneGeometry(.68, .17).translate(x, PIC_Y - FH - .125, -CW + .006), material(pic, Object.assign({ tMap: { value: tp }, uInset: { value: new THREE.Vector2(0, 0) }, uSel: sel }, ROOMU)));
      a.userData.i = q.userData.i = i;
      boat.add(a, q); picks.push(a, q);
      pics.push({ art, ta, plate, tp, sel });
    }
  }
  scene.add(boat);
  // a cover drawn by covers.js at time t; the one in front of the camera keeps playing
  function paintArt(i, t) {
    const p = WORK[i], c = pics[i].art, x = c.getContext("2d"), fn = window.COVERS && window.COVERS[p.art];
    try {
      if (fn) fn(x, c.width, c.height, t, 1.35);
      else { x.fillStyle = "#0D0F18"; x.fillRect(0, 0, c.width, c.height); }
    } catch (e) { /* a broken drawing keeps its last frame */ }
    pics[i].ta.needsUpdate = true;
  }
  // the plaque: the name engraved in brass, the years under it
  function paintPlate(i) {
    const p = WORK[i], c = pics[i].plate, x = c.getContext("2d"), w = c.width, h = c.height, g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#E3C68C"); g.addColorStop(.45, "#C29C5A"); g.addColorStop(1, "#8E6B37");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(70,48,18,.5)"; x.lineWidth = h * .035; x.strokeRect(h * .08, h * .08, w - h * .16, h - h * .16);
    x.fillStyle = "#2B1E0F"; x.textAlign = "center"; x.textBaseline = "alphabetic";
    let s = h * .32;
    do { x.font = "600 " + s.toFixed(1) + "px Geist, 'Segoe UI', sans-serif"; s *= .94; } while (x.measureText(p.name).width > w * .86 && s > h * .15);
    x.fillText(p.name, w / 2, h * .52);
    x.font = "500 " + (h * .19).toFixed(1) + "px 'Geist Mono', Consolas, monospace"; x.fillStyle = "rgba(43,30,15,.8)";
    x.fillText(String(p.when || "").toUpperCase(), w / 2, h * .8);
    pics[i].tp.needsUpdate = true;
  }
  const paintPictures = () => WORK.forEach((p, i) => { paintArt(i, p.t || 0); paintPlate(i); });
  paintPictures();
  // drawn again once the site's fonts are in, so the labels are set in the right face
  if (document.fonts) document.fonts.ready.then(paintPictures);
  log("boat", NP + " pictures hung in its cabin");

  // stars: a dome of points that sits on the camera, plus the Big Dipper, drawn in faint lines
  const DIP = [[-16.5, 21.4], [-16.2, 18.3], [-12.4, 17.6], [-12.2, 20.2], [-9.6, 20.9], [-7.2, 20.6], [-4.6, 18.6]], DIPL = [0, 1, 1, 2, 2, 3, 3, 0, 3, 4, 4, 5, 5, 6];
  {
    const r = rng(5), N = 2400, M = N + DIP.length, pos = new Float32Array(M * 3), size = new Float32Array(M), ph = new Float32Array(M), d = V3();
    for (let i = 0; i < N; i++) {
      const y = .02 + .98 * r(), a = r() * 6.2832, s = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * s * 3800, y * 3800, Math.sin(a) * s * 3800], i * 3);
      size[i] = 1.3 + Math.pow(r(), 5) * 2.6; ph[i] = r();
    }
    DIP.forEach(([az, el], i) => { dirFrom(az * D2R, el * D2R, d).multiplyScalar(3800); pos.set([d.x, d.y, d.z], (N + i) * 3); size[N + i] = 2.8; ph[N + i] = 1; });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    const stars = outside(new THREE.Points(g, material(STARS, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    stars.frustumCulled = false;
    const lp = [];
    for (let i = 0; i < DIPL.length; i++) { dirFrom(DIP[DIPL[i]][0] * D2R, DIP[DIPL[i]][1] * D2R, d).multiplyScalar(3790); lp.push(d.x, d.y, d.z); }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    const lines = outside(new THREE.LineSegments(lg, material(LINES, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    lines.frustumCulled = false;
  }

  // birds: a loose V that crosses the dusk sky now and then, wings beating in the vertex shader
  const NB = 9, bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute("position", new THREE.Float32BufferAttribute([.5, 0, 0, -.35, 0, .07, -.35, 0, -.07, .14, 0, 0, -.08, 0, -1, -.2, 0, 0, .14, 0, 0, -.2, 0, 0, -.08, 0, 1], 3));
  bGeo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(Float32Array.from({ length: NB }, () => Math.random()), 1));
  const birds = outside(new THREE.InstancedMesh(bGeo, material(BIRDS, {}, { side: THREE.DoubleSide, transparent: true }), NB));
  birds.frustumCulled = false; birds.count = 0;

  // fireflies over the banks, at night
  {
    const r = rng(33), N = 64, pos = new Float32Array(N * 3), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const right = i < 44, z = lerp(-140, -12, r()), x = right ? rightEdge(z) + 1 + r() * 30 : leftEdge(z) - 1 - r() * 30;
      pos.set([x, Math.max(0, height(x, z)) + 1 + r() * 3.5, z], i * 3); ph[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    const flies = outside(new THREE.Points(g, material(FLIES, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    flies.frustumCulled = false;
  }
  log("sky", "stars, clouds and the Milky Way");

  /* ---------- the camera: frames the sun right of the copy, comes in on load, drifts, and leans toward the pointer ---------- */
  let W = 0, H = 0, baseYaw = 0, basePitch = 0, sink = parseFloat(document.documentElement.style.getPropertyValue("--sink")) || 0;
  // pr: pixels drawn per CSS pixel out of doors, where the world is heavy; prNow: what is applied. In the cabin, which
  // is light to draw and all about fine print on the pictures and plaques, the scene is drawn at the screen's full density
  let clock = 0, last = 0, lastDraw = -1, visible = true, slow = 0, pr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5), prNow = pr;
  const running = !reduce, par = { x: 0, y: 0, tx: 0, ty: 0 };
  // the voyage (app.js drives it from the scroll): progress eased into vNow; the approach and boarding end at G0, where
  // the gallery begins, and the last picture is reached at G1. `inside` runs 0..1 as the camera goes through the door
  const G0 = .4, G1 = .97;
  let voyaging = false, vTarget = 0, vNow = 0, inside = 0, cNow = -1, zc = 0, hoverI = -1, artAt = 0, hidden = false, dur = 3.2;
  // the path in, as [progress, camera, what it looks at]: the hero shot (filled in every frame), out on the water with
  // the boat ahead, off the stern facing the door, in the doorway, and at the first picture
  const KEYS = [[0, V3(), V3()], [.2, V3(-26, 3.1, 9), V3(-6.6, 1.5, 0)], [.3, V3(-11.6, EYE, .5), V3(-6.6, 2, 0)],
    [.36, V3(-HALF - .7, EYE, .15), V3(1.5, 2, -.7)], [G0, V3(X0, EYE, 0), V3(X0, PIC_Y - .02, -CW)]];
  for (const k of KEYS.slice(1)) { k[1].applyMatrix4(BM); k[2].applyMatrix4(BM); }
  function frameCamera() {
    const aspect = W / H, need = 2 * Math.atan(Math.tan(28 * D2R) / aspect) / D2R; // keep at least 56° across
    camera.fov = Math.min(68, Math.max(40, need)); camera.aspect = aspect; camera.updateProjectionMatrix();
    const tv = Math.tan(camera.fov * D2R / 2), tall = aspect < .9;
    baseYaw = Math.atan((tall ? .2 : .32) * tv * aspect); // look a little left of the sun, so it sets right of the copy
    basePitch = Math.atan((tall ? .2 : .28) * tv);         // and above the waterline, so the sky takes most of the frame
    // in the cabin, stand back from the wall far enough to take in a picture and its plaque
    zc = -CW + Math.min(2.4, Math.max(1.5, Math.max(.66 / (tv * aspect), .7 / tv) * 1.1));
    KEYS[4][1].set(X0, EYE, zc).applyMatrix4(BM);
    U.uPx.value = H * prNow / (2 * tv);
  }
  // the drawing buffers, at the density now wanted
  function size() {
    renderer.setPixelRatio(prNow); renderer.setSize(W, H, false);
    rt.setSize(Math.max(2, Math.round(W * prNow * .5)), Math.max(2, Math.round(H * prNow * .5)));
    U.uPR.value = prNow; U.uPx.value = H * prNow / (2 * Math.tan(camera.fov * D2R / 2));
  }
  // between the keys: Hermite curves whose tangents run through the neighbouring keys (Catmull-Rom), timed by
  // progress, at rest at both ends
  const cp = V3(), cl = V3(), ta = V3(), tb = V3();
  function track(p, w, out) {
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
    const k0 = KEYS[i], k1 = KEYS[i + 1], dp = k1[0] - k0[0], t = Math.min(1, Math.max(0, (p - k0[0]) / dp)), t2 = t * t, t3 = t2 * t;
    const tan = (j, o) => j <= 0 || j >= KEYS.length - 1 ? o.set(0, 0, 0) : o.subVectors(KEYS[j + 1][w], KEYS[j - 1][w]).multiplyScalar(dp / (KEYS[j + 1][0] - KEYS[j - 1][0]));
    tan(i, ta); tan(i + 1, tb);
    return out.copy(k0[w]).multiplyScalar(2 * t3 - 3 * t2 + 1).addScaledVector(ta, t3 - 2 * t2 + t).addScaledVector(k1[w], 3 * t2 - 2 * t3).addScaledVector(tb, t3 - t2);
  }
  function placeCamera() {
    const t = reduce ? 0 : clock, k = reduce ? 1 : Math.min(1, clock / 7.5), intro = 1 - Math.pow(1 - k, 3), tilt = voyaging ? 0 : sink;
    camera.position.set(Math.sin(t * .045) * 3 + par.x * 2.4, 4 + (1 - intro) * 3.5 + Math.sin(t * .13) * .2 + tilt * 6, (1 - intro) * 36 - 4 + Math.sin(t * .031) * 3);
    camera.rotation.set(basePitch - (1 - intro) * .03 - par.y * .018 + tilt * .17, baseYaw + Math.sin(t * .05) * .015 - par.x * .032, 0);
    cNow = -1;
    if (voyaging && vNow > 1e-4) {
      if (vNow < G0) {
        KEYS[0][1].copy(camera.position);
        KEYS[0][2].set(0, 0, -60).applyQuaternion(camera.quaternion).add(camera.position);
        track(vNow, 1, cp); track(vNow, 2, cl);
      } else {
        // along the gallery: a stop at each picture, gliding between them, the pointer turning the head a little
        const v = lerp(-.4, NP - .6, (vNow - G0) / (G1 - G0)), f = Math.floor(v);
        cNow = Math.min(NP - 1, Math.max(0, f + smooth(.25, .75, v - f)));
        cp.set(X0 + cNow * GAP + par.x * .05, EYE + Math.sin(clock * .7) * .006 - par.y * .03, zc).applyMatrix4(BM);
        cl.set(X0 + cNow * GAP, PIC_Y - .02, -CW).applyMatrix4(BM);
      }
      camera.position.copy(cp); camera.lookAt(cl);
    }
    camera.updateMatrixWorld();
  }
  // the boat rides the water until you are aboard; the near plane closes in as the camera reaches the door; the picture
  // under the pointer brightens, and the one in front of the camera plays
  function updateBoat(dt) {
    const bob = 1 - inside, near = lerp(.5, .06, voyaging ? smooth(.3, .35, vNow) : 0), e = Math.min(1, dt * 8);
    boat.position.y = Math.sin(clock * .8) * .045 * bob;
    boat.rotation.x = Math.sin(clock * .52) * .012 * bob;
    boat.rotation.z = Math.sin(clock * .63 + 1) * .006 * bob;
    if (Math.abs(camera.near - near) > 1e-3) { camera.near = near; camera.updateProjectionMatrix(); }
    ROOMU.uHot.value += ((hoverI >= 0 ? 1 : 0) - ROOMU.uHot.value) * e;
    pics.forEach((p, i) => { p.sel.value += ((i === hoverI ? 1 : 0) - p.sel.value) * e; });
    if (cNow >= 0 && !reduce && clock - artAt > 1 / 30) { const i = Math.round(cNow); paintArt(i, (WORK[i].t || 0) + clock); artAt = clock; }
  }
  // tell the page where the voyage stands (aboard? which picture?) when that changes
  let told = "";
  function report() {
    const board = voyaging && vNow > G0 - .01, i = board ? Math.round(Math.max(0, cNow)) : -1, s = board + "|" + i + "|" + inside.toFixed(2);
    if (s === told) return;
    told = s;
    document.documentElement.style.setProperty("--inside", inside.toFixed(2));
    dispatchEvent(new CustomEvent("scene:voyage", { detail: { board, index: i, inside } }));
  }
  // is this point on the boat, seen from the water? (the ray, taken into the boat's own space, against a box round it)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hull = new THREE.Box3(V3(STERN - .3, -.5, -BEAM - .2), V3(BOW + .3, ROOF + 1.4, BEAM + .2));
  const inv = new THREE.Matrix4(), local = new THREE.Ray();
  function boatAt(cx, cy) {
    if (voyaging && vNow > .3) return false;
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, (r.top - cy) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    local.copy(ray.ray).applyMatrix4(inv.copy(boat.matrixWorld).invert());
    return local.intersectsBox(hull);
  }
  // which picture is at this point on the screen, if the camera is aboard
  function pickAt(cx, cy) {
    if (!(voyaging && vNow > G0 - .01) || !picks.length) return -1;
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, (r.top - cy) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(picks, false)[0];
    return hit ? hit.object.userData.i : -1;
  }
  // the lake's mirror: the same view from below the waterline, its image mapped back onto the water
  const BIAS = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1), va = V3(), vb = V3();
  function mirror() {
    const p = camera.position;
    mirrorCam.position.set(p.x, -p.y, p.z);
    va.set(0, 0, -1).applyQuaternion(camera.quaternion).add(p); va.y = -va.y;
    vb.set(0, 1, 0).applyQuaternion(camera.quaternion); vb.y = -vb.y;
    mirrorCam.up.copy(vb); mirrorCam.lookAt(va);
    mirrorCam.projectionMatrix.copy(camera.projectionMatrix); mirrorCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    mirrorCam.updateMatrixWorld();
    texMat.copy(BIAS).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
  }

  /* ---------- life: birds at dusk, falling stars at night ---------- */
  let flock = null, nextFlock = 3, shoot = null, nextShoot = 4;
  function updateBirds(dt) {
    U.uBirdA.value = 1 - smooth(.15, .45, night);
    if (!flock) {
      if (reduce || night > .4 || clock < nextFlock) { birds.count = 0; return; }
      flock = { t: 0, dur: 24 + Math.random() * 10, dir: Math.random() < .5 ? -1 : 1, dist: 170 + Math.random() * 90, alt: 34 + Math.random() * 24, n: 5 + (Math.random() * 5 | 0) };
    }
    flock.t += dt;
    const k = flock.t / flock.dur;
    if (k > 1) { flock = null; nextFlock = clock + 12 + Math.random() * 20; birds.count = 0; return; }
    // an arc across the view at the flock's distance, from one side to the other
    const look = -baseYaw, az = look + (flock.dir > 0 ? lerp(-.9, .9, k) : lerp(.9, -.9, k)), hx = Math.cos(az) * flock.dir, hz = Math.sin(az) * flock.dir;
    const lx = flock.dist * Math.sin(az), lz = -flock.dist * Math.cos(az), ly = flock.alt + Math.sin(flock.t * .4) * 3;
    birds.count = flock.n;
    for (let i = 0; i < flock.n; i++) {
      const rank = Math.ceil(i / 2), side = i % 2 ? -1 : 1, back = rank * 4.6, lat = side * rank * 3.3;
      dummy.position.set(lx - hx * back - hz * lat, ly - rank * .5 + Math.sin(clock * 1.3 + i) * .4, lz - hz * back + hx * lat);
      dummy.rotation.set(0, Math.atan2(-hz, hx), 0); dummy.scale.setScalar(1.7); dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    }
    birds.instanceMatrix.needsUpdate = true;
  }
  function updateShoot(dt) {
    if (!shoot) {
      if (reduce || night < .7 || clock < nextShoot) { U.uShootT.value = -1; return; }
      const az = (-34 + Math.random() * 50) * D2R, el = (12 + Math.random() * 14) * D2R, len = (8 + Math.random() * 8) * D2R;
      dirFrom(az, el, U.uShootA.value); dirFrom(az - len, el - len * .45, U.uShootB.value);
      shoot = { t: 0, dur: .8 + Math.random() * .5 };
    }
    shoot.t += dt;
    if (shoot.t >= shoot.dur) { shoot = null; nextShoot = clock + 5 + Math.random() * 9; U.uShootT.value = -1; return; }
    U.uShootT.value = shoot.t / shoot.dur;
  }

  /* ---------- the light on the page: CSS rays and flare follow the sun (or moon) on screen ---------- */
  const rays = document.getElementById("rays"), flare = document.getElementById("flare"), lp = V3();
  let fxX = -1, fxY = -1;
  function onScreen(dir) { lp.copy(dir).multiplyScalar(3000).add(camera.position).project(camera); return [(lp.x * .5 + .5) * W, (-lp.y * .5 + .5) * H, lp.z < 1]; }
  function placeFx() {
    const s = onScreen(va.copy(U.uSunDir.value).lerp(U.uMoonDir.value, smooth(.2, .8, night)).normalize());
    if (Math.abs(s[0] - fxX) + Math.abs(s[1] - fxY) < .4) return;
    fxX = s[0]; fxY = s[1];
    const t = "translate3d(" + fxX.toFixed(1) + "px," + fxY.toFixed(1) + "px,0)";
    if (rays) rays.style.transform = t;
    if (flare) flare.style.transform = t;
  }

  /* ---------- a frame ---------- */
  function draw(dt) {
    if (night !== target) {
      const k = Math.min(1, (clock - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      night = k >= 1 ? target : from + (target - from) * e;
    }
    const ease = 1 - Math.exp(-dt * 2);
    par.x += (par.tx - par.x) * ease; par.y += (par.ty - par.y) * ease;
    // the voyage follows the scroll with a little weight
    if (vNow !== vTarget) { vNow += (vTarget - vNow) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(vTarget - vNow) < 2e-4) vNow = vTarget; }
    inside = voyaging ? smooth(.34, .38, vNow) : 0;
    U.uTime.value = clock;
    applyLight(); placeCamera(); updateBirds(dt); updateShoot(dt); updateBoat(dt);
    // in the gallery, facing its wall, nothing outdoors can be seen: leave it out
    const walled = voyaging && vNow > G0 - .002;
    if (walled !== hidden) { hidden = walled; for (const o of outdoors) o.visible = !walled; }
    const dense = walled ? Math.max(pr, Math.min(window.devicePixelRatio || 1, 2)) : pr;
    if (dense !== prNow && W) { prNow = dense; size(); }
    // the lake's mirror, unless the camera is aboard, where the water can't be seen
    if (inside < .5) {
      mirror();
      water.visible = false; U.uClip.value = 1; U.uPS.value = .5;
      renderer.setRenderTarget(rt); renderer.render(scene, mirrorCam);
      renderer.setRenderTarget(null);
      water.visible = !walled; U.uClip.value = 0; U.uPS.value = 1;
    }
    renderer.render(scene, camera);
    placeFx(); report();
  }
  function resize(force) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (!force && w === W && h === H)) return;
    W = w; H = h; prNow = hidden ? Math.max(pr, Math.min(window.devicePixelRatio || 1, 2)) : pr;
    frameCamera(); size(); fxX = -1;
    if (!running || lastDraw >= 0) draw(0);
  }
  function loop(now) {
    requestAnimationFrame(loop);
    const t = now / 1000, dt = last ? Math.min(.1, t - last) : 0;
    last = t;
    if (!visible) return;
    clock += dt;
    // fully veiled: a few frames a second keep the water and sky alive behind the blur
    if (sink > .985 && night === target && clock - lastDraw < .125) return;
    draw(Math.min(.25, clock - lastDraw)); lastDraw = clock;
    // too slow for this machine? draw fewer pixels
    if (sink < .985) { if (dt > .04) slow++; else if (slow > 0) slow--; }
    if (slow > 40 && pr > .6) { pr = Math.max(.6, pr * .8); slow = 0; resize(true); }
  }

  // the theme or the scroll may have changed while the world was being built
  night = from = target = document.documentElement.dataset.theme === "night" ? 1 : 0;
  sink = parseFloat(document.documentElement.style.getPropertyValue("--sink")) || 0;
  resize(true);
  applyLight(); placeCamera();
  // compile the shaders off the main thread where the browser can; then the first frame,
  // where a shader that failed throws, and the 2D painting takes over
  if (renderer.compileAsync && renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
  draw(0);
  lastDraw = 0;
  canvas.classList.add("on");
  log("frame", "rendered live in WebGL");
  if (showLog) setTimeout(() => logBox.classList.add("out"), logged * 170 + 2800);

  let rt2 = 0;
  const onResize = () => { clearTimeout(rt2); rt2 = setTimeout(() => resize(false), 100); };
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas); else addEventListener("resize", onResize);
  if (fine && !reduce) addEventListener("pointermove", e => { par.tx = e.clientX / innerWidth * 2 - 1; par.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  // on phones the scene scrolls away with the page; stop drawing it then
  if (window.IntersectionObserver) new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(canvas);

  window.SCENE = {
    // dusk or night; the change takes `seconds` (3.2 when the visitor asks, longer when it comes round by itself)
    setNight(on, instant, seconds) {
      const t = on ? 1 : 0;
      if (instant || reduce) { night = from = target = t; draw(0); return; }
      if (t === target) return;
      from = night; target = t; t0 = clock; dur = seconds || 3.2;
    },
    setSink(s) { sink = s; if (!running) draw(0); },
    // how far through the voyage the scroll is (0..1); the first call jumps there, later ones glide
    setVoyage(p) {
      vTarget = Math.min(1, Math.max(0, p));
      if (!voyaging || !running) { voyaging = true; vNow = vTarget; draw(0); }
    },
    // the progress at which the camera stands in front of picture i
    voyageAt(i) { return G0 + (G1 - G0) * (i + .4) / Math.max(1, NP - .2); },
    // is the point on the boat, before the camera is aboard? clicking it goes aboard
    boatAt,
    // is the point on the sun (or the moon)? clicking it switches the theme
    hit(cx, cy) {
      if (inside > .5) return false;
      const r = canvas.getBoundingClientRect(), s = onScreen(night < .5 ? U.uSunDir.value : U.uMoonDir.value), dx = cx - r.left - s[0], dy = cy - r.top - s[1];
      return s[2] && dx * dx + dy * dy < 46 * 46;
    },
    // the picture at this point, or -1; hover also lights it
    pick: pickAt,
    hover(cx, cy) {
      hoverI = pickAt(cx, cy);
      if (hoverI >= 0) ROOMU.uHover.value = hoverI;
      return hoverI;
    }
  };
  window.__scene3d = "ready";
  dispatchEvent(new Event("scene:ready"));
  if (running) requestAnimationFrame(loop);
}
