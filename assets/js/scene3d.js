/* ==========================================================================
   The hero, in 3D: a mountain lake at golden hour, or under the stars,
   rendered live with WebGL through three.js. Nothing is downloaded but
   three.js itself: the terrain, the pines, the water and the sky are all
   generated here. The lake mirrors the world through a second camera set
   below the waterline; sky, clouds, sun, moon and Milky Way are one shader on
   a dome around the camera.

   window.SCENE: setNight(on, instant), setSink(0..1), hit(clientX, clientY)
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
  function rng(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- the land: one height function, sampled for the terrain and to stand each tree on ---------- */
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
  const nA = noise2(11), nB = noise2(29), nC = noise2(53);
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
      // across the lake: foothills, then mountains rising with distance; a saddle where the sun sets (azimuth 0),
      // a massif just right of it and another off to the left
      const a = Math.atan2(x, -z);
      const env = (1 - .74 * bump(a, 0, .075) * smooth(120, 520, dFar)) * (1 + .75 * bump(a, .2, .09) + .55 * bump(a, -.48, .11));
      const hills = 2 + 34 * smooth(0, 170, dFar) * fbm(nA, x * .011, z * .011, 4);
      // the ranges sample warped coordinates, so ridges bend and branch instead of lining up
      const wx = x + 190 * (fbm(nC, x * .0016, z * .0016, 3) - .5), wz = z + 190 * (fbm(nC, x * .0016 + 9.1, z * .0016 + 4.7, 3) - .5);
      const mtn = (36 * smooth(70, 320, dFar) + 150 * smooth(280, 820, dFar) + 210 * smooth(780, 1500, dFar)) * ridged(nB, wx * .0025, wz * .0025, 6);
      h = Math.max(h, (hills + mtn) * env);
    }
    const s = smooth(0, 3, land);
    return h * s + bed * (1 - s);
  }

  // the terrain is a polar grid around the camera: fine near, coarse far, so its detail is even on screen
  async function terrainGeometry(NA, NR) {
    const A = 1.45, R0 = 16, R1 = 2700, pos = new Float32Array((NA + 1) * (NR + 1) * 3), idx = new Uint32Array(NA * NR * 6);
    for (let j = 0, k = 0; j <= NR; j++) {
      const r = R0 * Math.pow(R1 / R0, j / NR);
      for (let i = 0; i <= NA; i++, k += 3) {
        const a = -A + 2 * A * i / NA, x = r * Math.sin(a), z = -r * Math.cos(a);
        pos[k] = x; pos[k + 1] = height(x, z); pos[k + 2] = z;
      }
      await breathe();
    }
    for (let j = 0, k = 0; j < NR; j++) for (let i = 0; i < NA; i++, k += 6) {
      const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1;
      idx[k] = a; idx[k + 1] = b; idx[k + 2] = c; idx[k + 3] = b; idx[k + 4] = d; idx[k + 5] = c;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    return g;
  }

  // a pine of unit height: a thin trunk under stacked open cones
  function merge(geos) {
    const parts = geos.map(g => g.index ? g.toNonIndexed() : g);
    let n = 0;
    for (const g of parts) n += g.attributes.position.array.length;
    const P = new Float32Array(n), N = new Float32Array(n);
    let o = 0;
    for (const g of parts) { P.set(g.attributes.position.array, o); N.set(g.attributes.normal.array, o); o += g.attributes.position.array.length; }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(P, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    return out;
  }
  function pine(tiers, seg, trunk) {
    const g = trunk ? [new THREE.CylinderGeometry(.022, .036, .3, 5).translate(0, .15, 0)] : [];
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1), r = .24 * (1 - f * .8) + .025, h = .3 * (1 - f * .25), y = .14 + f * .62;
      g.push(new THREE.ConeGeometry(r, h, seg, 1, true).translate(0, y + h / 2, 0));
    }
    return merge(g);
  }
  async function plant(farCount) {
    const r = rng(77), near = [], far = [];
    // the right spit: tall pines crowding the water's edge, a few close enough to slide past as the camera comes in
    for (let i = 0; i < 4000 && near.length < 84; i++) {
      const z = lerp(-330, 24, r()), x = rightEdge(z) + 2.5 + Math.pow(r(), 1.5) * 120, y = height(x, z);
      if (y > .6) near.push([x, y, z, lerp(15, 34, Math.pow(r(), .7))]);
    }
    for (let i = 0; i < 4000 && near.length < 128; i++) {
      const z = lerp(-300, 24, r()), x = leftEdge(z) - 2.5 - Math.pow(r(), 1.5) * 120, y = height(x, z);
      if (y > .6) near.push([x, y, z, lerp(13, 30, Math.pow(r(), .7))]);
    }
    // the far shore and the foothills: an unbroken treeline at the water's edge, then forest in patches up the slopes
    // (the cheap patch test goes first, the full height only for the spots that pass it)
    for (let i = 0; i < 40000 && far.length < farCount; i++) {
      const x = lerp(-1300, 1300, r()), d = 3 + Math.pow(r(), 1.8) * 300, z = shoreZ(x) - d, s = lerp(6, 16, Math.pow(r(), 1.3));
      if (d > 45 && fbm(nA, x * .008, z * .008, 3) < .47 + d / 1400) continue;
      const y = height(x, z);
      if (y > .5 && y < 80) far.push([x, y, z, s]);
      if (!(i & 255)) await breathe();
    }
    return { near, far };
  }

  /* ---------- palettes: dusk and night, blended every frame by `night` ---------- */
  const DUSK = {
    sky: ["#E39A78", "#C47A66", "#93606F", "#57436D", "#272C58", "#0B1132"],
    glow: "#FFAE6B", cloudDark: "#433651", cloudLit: "#F6A47C", light: "#FFA56A", ambient: "#53426A", water: "#171327",
    forest: "#2F3B35", rock: "#5A5163", snow: "#DCD3E6", tree: "#1A231E", bird: "#1B1424"
  };
  const NIGHT = {
    sky: ["#2F2C58", "#272856", "#1B2049", "#10183E", "#070E2A", "#02040B"],
    glow: "#000000", cloudDark: "#0B1028", cloudLit: "#25305B", light: "#7083B8", ambient: "#121A3A", water: "#03060E",
    forest: "#18221E", rock: "#343444", snow: "#A5B0D2", tree: "#0A100D", bird: "#05060B"
  };
  const prep = p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v.map(hex) : hex(v)]));
  const PAL = { dusk: prep(DUSK), night: prep(NIGHT) };
  const U = {
    uTime: { value: 0 }, uNight: { value: 0 }, uFogD: { value: 1 / 1300 }, uClip: { value: 0 }, uPS: { value: 1 }, uPR: { value: 1 },
    uSunDir: { value: V3() }, uMoonDir: { value: V3() }, uLightDir: { value: V3() }, uLightCol: { value: V3() }, uAmbient: { value: V3() },
    uGlow: { value: V3() }, uSky: { value: [V3(), V3(), V3(), V3(), V3(), V3()] }, uCloudDark: { value: V3() }, uCloudLit: { value: V3() },
    uWater: { value: V3() }, uForest: { value: V3() }, uRock: { value: V3() }, uSnow: { value: V3() }, uTree: { value: V3() }, uBird: { value: V3() },
    uShootA: { value: V3() }, uShootB: { value: V3() }, uShootT: { value: -1 }, uBirdA: { value: 1 }
  };
  const BLEND = { glow: "uGlow", cloudDark: "uCloudDark", cloudLit: "uCloudLit", ambient: "uAmbient", water: "uWater", forest: "uForest", rock: "uRock", snow: "uSnow", tree: "uTree", bird: "uBird" };
  let night = document.documentElement.dataset.theme === "night" ? 1 : 0, from = night, target = night, t0 = 0;
  const DUR = 3.2, SUN_AZ = 0, MOON_AZ = 4.5 * D2R;
  const dirFrom = (az, el, out) => out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
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
  }

  /* ---------- shaders: one sky function, shared, so the haze on every hill is the sky behind it ---------- */
  const COMMON = `
    uniform float uTime, uNight, uFogD, uClip, uPS, uPR;
    uniform vec3 uSunDir, uMoonDir, uLightDir, uLightCol, uAmbient, uGlow;
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
      float f = (1. - exp(-dist * uFogD * k)) * (1. - .5 * smoothstep(80., 420., w.y));
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
          float n = fbm(p * vec2(.5, 1.5) + vec2(uTime * .0045, uTime * .001));
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
    vertexShader: `varying vec3 vW, vN;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + `
      uniform vec3 uForest, uRock, uSnow;
      varying vec3 vW, vN;
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.);
        float slope = 1. - n.y, hN = vW.y + (vnoise(vW.xz * .015) - .5) * 50.;
        vec3 alb = mix(uForest, uRock, clamp(smoothstep(40., 140., hN) + smoothstep(.3, .62, slope) * .6, 0., 1.));
        alb = mix(alb, uSnow, smoothstep(190., 250., hN) * (1. - smoothstep(.42, .68, slope)));
        vec3 v = normalize(cameraPosition - vW);
        float lam = max(dot(n, uLightDir), 0.);
        float rim = pow(1. - max(dot(n, v), 0.), 4.) * pow(max(dot(-v, uLightDir), 0.), 2.);
        // sky light from above: open slopes take more of it than steep faces, which gives the ranges their shape
        vec3 col = alb * (uAmbient * (.55 + .6 * max(n.y, 0.)) + uLightCol * lam) + uLightCol * rim * .3 * (.4 + alb);
        gl_FragColor = vec4(fogged(col, vW, 1.), 1.);
      }`
  };
  const TREES = {
    vertexShader: `uniform float uTime, uSway; varying vec3 vW, vN; varying float vY;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
        // the tops lean in a slow breeze, each tree in its own time
        w.xz += vec2(.8, .35) * sin(uTime * .9 + instanceMatrix[3].x * .05 + instanceMatrix[3].z * .07) * position.y * position.y * uSway;
        vW = w.xyz; vY = position.y;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: COMMON + `
      uniform vec3 uTree; varying vec3 vW, vN; varying float vY;
      void main() {
        if (uClip > .5 && vW.y < 0.) discard;
        vec3 n = normalize(vN) * (gl_FrontFacing ? 1. : -1.), v = normalize(cameraPosition - vW);
        float lam = max(dot(n, uLightDir), 0.);
        float rim = pow(1. - abs(dot(n, v)), 3.) * pow(max(dot(-v, uLightDir), 0.), 3.);
        vec3 col = uTree * (.75 + .5 * vY) * (uAmbient * .9 + uLightCol * lam * .8) + uLightCol * rim * .38;
        gl_FragColor = vec4(fogged(col, vW, 1.), 1.);
      }`
  };
  const WATER = {
    vertexShader: `uniform mat4 uTexMat; varying vec3 vW; varying vec4 vR;
      void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vR = uTexMat * w; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: COMMON + `
      uniform sampler2D tRefl; uniform vec3 uWater; varying vec3 vW; varying vec4 vR;
      float wave(vec2 p) {
        return vnoise(p * .09 + uTime * vec2(.03, .012)) * .55 + vnoise(p * .25 - uTime * vec2(.02, .05)) * .3 + vnoise(p * .7 + uTime * vec2(.07, -.04)) * .15;
      }
      void main() {
        vec3 toCam = cameraPosition - vW; float dist = length(toCam); vec3 v = toCam / dist;
        // ripples: the surface normal from a few drifting layers of noise, calmer with distance
        float k = 1.6 / (1. + dist * .012), e = .2;
        vec2 p = vW.xz;
        float gx = (wave(p + vec2(e, 0.)) - wave(p - vec2(e, 0.))) / (2. * e), gz = (wave(p + vec2(0., e)) - wave(p - vec2(0., e))) / (2. * e);
        vec3 n = normalize(vec3(-gx * 1.2 * k, 1., -gz * 1.2 * k));
        vec3 refl = texture2D(tRefl, vR.xy / vR.w + n.xz * .05 * k).rgb;
        float fres = .04 + .96 * pow(1. - max(dot(n, v), 0.), 5.);
        vec3 col = mix(uWater, refl * .86, clamp(.45 + fres, 0., 1.));
        // glitter where the ripples catch the low light
        float sp = max(dot(reflect(-v, n), uLightDir), 0.);
        col += uLightCol * (pow(sp, 900.) * 9. + pow(sp, 90.) * .35) * smoothstep(-.02, .04, uLightDir.y);
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
  const rt = new THREE.WebGLRenderTarget(2, 2);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), material(SKY, {}, { side: THREE.BackSide, depthWrite: false, depthTest: false }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  const tGeo = await terrainGeometry(small ? 300 : 400, small ? 130 : 170);
  scene.add(new THREE.Mesh(tGeo, material(TERRAIN, {}, { side: THREE.DoubleSide })));
  log("terrain", tGeo.attributes.position.count.toLocaleString("en") + " vertices, raised");

  const forest = await plant(small ? 2200 : 3800), dummy = new THREE.Object3D(), tr = rng(5);
  function grove(list, geo, sway) {
    const m = new THREE.InstancedMesh(geo, material(TREES, { uSway: { value: sway } }, { side: THREE.DoubleSide }), list.length);
    list.forEach(([x, y, z, s], i) => {
      const w = .75 + tr() * .4;
      // a little lean and a turn each, so no two stand alike
      dummy.position.set(x, y - .4, z); dummy.rotation.set((tr() - .5) * .07, tr() * 6.283, (tr() - .5) * .07); dummy.scale.set(s * w, s, s * w); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.computeBoundingSphere();
    scene.add(m);
  }
  grove(forest.near, pine(7, 10, true), .012);
  grove(forest.far, pine(3, 5, false), 0);
  log("forest", (forest.near.length + forest.far.length).toLocaleString("en") + " pines, planted");

  const texMat = new THREE.Matrix4();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), material(WATER, { tRefl: { value: rt.texture }, uTexMat: { value: texMat } }));
  water.rotation.x = -Math.PI / 2; scene.add(water);
  log("lake", "mirror pass ready");

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
    const stars = new THREE.Points(g, material(STARS, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    stars.frustumCulled = false; scene.add(stars);
    const lp = [];
    for (let i = 0; i < DIPL.length; i++) { dirFrom(DIP[DIPL[i]][0] * D2R, DIP[DIPL[i]][1] * D2R, d).multiplyScalar(3790); lp.push(d.x, d.y, d.z); }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    const lines = new THREE.LineSegments(lg, material(LINES, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    lines.frustumCulled = false; scene.add(lines);
  }

  // birds: a loose V that crosses the dusk sky now and then, wings beating in the vertex shader
  const NB = 9, bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute("position", new THREE.Float32BufferAttribute([.5, 0, 0, -.35, 0, .07, -.35, 0, -.07, .14, 0, 0, -.08, 0, -1, -.2, 0, 0, .14, 0, 0, -.2, 0, 0, -.08, 0, 1], 3));
  bGeo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(Float32Array.from({ length: NB }, () => Math.random()), 1));
  const birds = new THREE.InstancedMesh(bGeo, material(BIRDS, {}, { side: THREE.DoubleSide, transparent: true }), NB);
  birds.frustumCulled = false; birds.count = 0; scene.add(birds);

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
    const flies = new THREE.Points(g, material(FLIES, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flies.frustumCulled = false; scene.add(flies);
  }
  log("sky", "stars, clouds and the Milky Way");

  /* ---------- the camera: frames the sun right of the copy, comes in on load, drifts, and leans toward the pointer ---------- */
  let W = 0, H = 0, baseYaw = 0, basePitch = 0, sink = parseFloat(document.documentElement.style.getPropertyValue("--sink")) || 0;
  let clock = 0, last = 0, lastDraw = -1, visible = true, slow = 0, pr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
  const running = !reduce, par = { x: 0, y: 0, tx: 0, ty: 0 };
  function frameCamera() {
    const aspect = W / H, need = 2 * Math.atan(Math.tan(28 * D2R) / aspect) / D2R; // keep at least 56° across
    camera.fov = Math.min(68, Math.max(40, need)); camera.aspect = aspect; camera.updateProjectionMatrix();
    const tv = Math.tan(camera.fov * D2R / 2), tall = aspect < .9;
    baseYaw = Math.atan((tall ? .2 : .32) * tv * aspect); // look a little left of the sun, so it sets right of the copy
    basePitch = Math.atan((tall ? .2 : .28) * tv);         // and above the waterline, so the sky takes most of the frame
  }
  function placeCamera() {
    const t = reduce ? 0 : clock, k = reduce ? 1 : Math.min(1, clock / 7.5), intro = 1 - Math.pow(1 - k, 3);
    camera.position.set(Math.sin(t * .045) * 3 + par.x * 2.4, 4 + (1 - intro) * 3.5 + Math.sin(t * .13) * .2 + sink * 6, (1 - intro) * 36 - 4 + Math.sin(t * .031) * 3);
    camera.rotation.set(basePitch - (1 - intro) * .03 - par.y * .018 + sink * .17, baseYaw + Math.sin(t * .05) * .015 - par.x * .032, 0);
    camera.updateMatrixWorld();
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
      const k = Math.min(1, (clock - t0) / DUR), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      night = k >= 1 ? target : from + (target - from) * e;
    }
    const ease = 1 - Math.exp(-dt * 2);
    par.x += (par.tx - par.x) * ease; par.y += (par.ty - par.y) * ease;
    U.uTime.value = clock;
    applyLight(); placeCamera(); updateBirds(dt); updateShoot(dt);
    mirror();
    water.visible = false; U.uClip.value = 1; U.uPS.value = .5;
    renderer.setRenderTarget(rt); renderer.render(scene, mirrorCam);
    renderer.setRenderTarget(null);
    water.visible = true; U.uClip.value = 0; U.uPS.value = 1;
    renderer.render(scene, camera);
    placeFx();
  }
  function resize(force) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (!force && w === W && h === H)) return;
    W = w; H = h;
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    rt.setSize(Math.max(2, Math.round(W * pr * .5)), Math.max(2, Math.round(H * pr * .5)));
    U.uPR.value = pr;
    frameCamera(); fxX = -1;
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
    setNight(on, instant) {
      const t = on ? 1 : 0;
      if (instant || reduce) { night = from = target = t; draw(0); return; }
      if (t === target) return;
      from = night; target = t; t0 = clock;
    },
    setSink(s) { sink = s; if (!running) draw(0); },
    // is the point on the sun (or the moon)? clicking it switches the theme
    hit(cx, cy) {
      const r = canvas.getBoundingClientRect(), s = onScreen(night < .5 ? U.uSunDir.value : U.uMoonDir.value), dx = cx - r.left - s[0], dy = cy - r.top - s[1];
      return s[2] && dx * dx + dy * dy < 46 * 46;
    }
  };
  window.__scene3d = "ready";
  if (running) requestAnimationFrame(loop);
}
