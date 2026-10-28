/* ==========================================================================
   The fallback hero, painted in 2D: used only where the WebGL scene
   (scene3d.js) cannot run. Ridgelines over a still lake at golden hour, or
   under the stars, drawn live on one canvas, far to near. Everything above the
   waterline goes into an offscreen canvas first, so the lake can reflect it
   slice by slice with a slow ripple. Two palettes, dusk and night, are
   blended by `night` (0..1): switching theme is a sunset, not a cut.

   window.SCENE: setNight(on, instant), setSink(0..1), hit(clientX, clientY)
   ========================================================================== */
(function () {
  "use strict";
  var cv = document.getElementById("scene");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d", { alpha: false });
  var up = document.createElement("canvas"), uc = up.getContext("2d");
  if (!ctx || !uc) return;
  var rays = document.getElementById("rays"), flare = document.getElementById("flare");
  function mq(q) { return !!(window.matchMedia && matchMedia(q).matches); }
  var reduce = mq("(prefers-reduced-motion: reduce)"), fine = mq("(hover: hover) and (pointer: fine)");
  var TAU = Math.PI * 2;

  /* ---------- palettes ---------- */
  var SKY_AT = [0, .34, .6, .8, .93, 1];
  var DUSK = {
    sky: ["#0B1132", "#262C59", "#5D446F", "#B3695F", "#EC9B67", "#F7C27F"],
    ranges: ["#8A5C7A", "#5C4366", "#3A2B4C", "#221A31"],
    haze: "#D98A70", water: "#1A1529", ground: "#0C0911",
    cloudTop: "#5B4468", cloudLit: "#F1A27B", bird: "#1B1424",
    light: [255, 214, 162]
  };
  var NIGHT = {
    sky: ["#02040B", "#060D28", "#101943", "#1B2350", "#272A59", "#363264"],
    ranges: ["#27305E", "#1A2146", "#111632", "#0A0D1F"],
    haze: "#394075", water: "#04070F", ground: "#04050A",
    cloudTop: "#0D132D", cloudLit: "#29325F", bird: "#06070E",
    light: [196, 210, 255]
  };
  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function prep(p) {
    var o = {}, k;
    for (k in p) o[k] = typeof p[k] === "string" ? hex(p[k]) : typeof p[k][0] === "string" ? p[k].map(hex) : p[k];
    return o;
  }
  var A = prep(DUSK), B = prep(NIGHT);
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, a) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")"; }
  function col(key, i) { return i == null ? mix(A[key], B[key], night) : mix(A[key][i], B[key][i], night); }

  /* ---------- randomness: seeded, so every visit draws the same land ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function noise(seed) {
    var r = rng(seed), v = new Float32Array(512), i;
    for (i = 0; i < 512; i++) v[i] = r();
    return function (x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return v[i & 511] + (v[(i + 1) & 511] - v[i & 511]) * u; };
  }
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function bump(x, c, w) { var d = (x - c) / w; return Math.exp(-d * d); }

  /* ---------- state ---------- */
  var W = 0, H = 0, dpr = 1, horizon = 0, portrait = false, PAD = 48;
  var SUNX = .67, MOONX = .84, sunR = 20, moonR = 16;
  var night = document.documentElement.dataset.theme === "night" ? 1 : 0, from = night, to = night, t0 = 0, DUR = 2.6;
  var sink = 0, visible = true, clock = 0, last = 0, lastDraw = 0;
  var par = { x: 0, y: 0, tx: 0, ty: 0 }, sun = { x: 0, y: 0 }, moon = { x: 0, y: 0 }, fxAt = { x: -1, y: -1 };
  var stars = [], clouds = [], glints = [], flies = [], shore = [], trees = null, flySprite = null;
  var flock = null, nextFlock = 3, shoot = null, nextShoot = 5;

  // parallax: how far a layer at `depth` (0 = sky, 1 = foreground) slides with the pointer
  function ox(d) { return -par.x * d * 22; }
  function oy(d) { return -par.y * d * 8; }

  /* ---------- the ranges, far to near: heights in viewport heights above the waterline ---------- */
  var RANGES = [
    { seed: 7, k: 1.7, oct: 5, h0: .05, amp: .25, depth: .12, haze: .62,
      env: function (u) { return (.42 + .58 * smooth(.08, .8, u) + .35 * bump(u, .9, .08)) * (1 - .62 * bump(u, SUNX, .06)); } },
    { seed: 21, k: 2.6, oct: 5, h0: .035, amp: .15, depth: .25, haze: .5,
      env: function (u) { return (.55 + .45 * smooth(0, .7, u)) * (1 - .45 * bump(u, SUNX, .05)); } },
    { seed: 43, k: 4.2, oct: 4, h0: .02, amp: .085, depth: .42, haze: .36,
      env: function (u) { return .7 + .3 * Math.sin(u * 5.1 + 1); } },
    { seed: 77, k: 7.5, oct: 3, h0: .012, amp: .03, depth: .6, haze: .2, trees: true,
      env: function () { return 1; } }
  ];
  // ridged fractal noise: sharp crests, soft valleys
  function heightAt(R, n, x) {
    var xn = x / H * R.k, s = 0, a = .5, f = 1, norm = 0, o, v;
    for (o = 0; o < R.oct; o++) { v = 1 - Math.abs(2 * n(xn * f + o * 31.7) - 1); s += a * v * v; norm += a; a *= .5; f *= 2.07; }
    return H * (R.h0 + R.amp * (s / norm) * R.env(x / W));
  }
  function buildRange(R) {
    var n = noise(R.seed), pts = [], x, y, top = horizon;
    if (R.trees) { // the near shore's treeline: a zigzag of pine tips riding the ridge
      var r = rng(R.seed * 13), k = Math.min(1.4, H / 800);
      for (x = -PAD; x <= W + PAD;) {
        var w = 3 + r() * 5;
        y = horizon - heightAt(R, n, x); pts.push(x, y);
        y -= (4 + r() * 10) * k; pts.push(x + w * .5, y);
        x += w;
      }
    } else for (x = -PAD; x <= W + PAD + 3; x += 3) pts.push(x, horizon - heightAt(R, n, x));
    for (x = 1; x < pts.length; x += 2) if (pts[x] < top) top = pts[x];
    R.pts = pts; R.top = top;
  }
  function drawRange(c, R, i) {
    var p = R.pts, dx = ox(R.depth), dy = oy(R.depth), base = col("ranges", i), j;
    var g = c.createLinearGradient(0, R.top + dy, 0, horizon);
    g.addColorStop(0, rgb(base)); g.addColorStop(1, rgb(mix(base, col("haze"), R.haze)));
    c.fillStyle = g; c.beginPath(); c.moveTo(p[0] + dx, horizon + 2);
    for (j = 0; j < p.length; j += 2) c.lineTo(p[j] + dx, p[j + 1] + dy);
    c.lineTo(p[p.length - 2] + dx, horizon + 2); c.closePath(); c.fill();
    if (i > 1) return;
    // rim light along the crest, brightest where it faces the light
    var L = lightPos(), lc = col("light"), a = (i ? .22 : .5) * (1 - night * .55);
    var rg = c.createLinearGradient(L.x - W * .32, 0, L.x + W * .32, 0);
    rg.addColorStop(0, rgb(lc, 0)); rg.addColorStop(.5, rgb(lc, a)); rg.addColorStop(1, rgb(lc, 0));
    c.strokeStyle = rg; c.lineWidth = 1.2; c.beginPath();
    for (j = 0; j < p.length; j += 2) c.lineTo(p[j] + dx, p[j + 1] + dy + .5);
    c.stroke();
  }

  /* ---------- sky ---------- */
  function drawSky(c) {
    var g = c.createLinearGradient(0, 0, 0, horizon), i;
    for (i = 0; i < SKY_AT.length; i++) g.addColorStop(SKY_AT[i], rgb(col("sky", i)));
    c.fillStyle = g; c.fillRect(0, 0, W, horizon);
  }
  function buildStars() {
    var r = rng(5), n = Math.round(W * horizon / 2400), i, y, x, u;
    stars = [];
    for (i = 0; i < n; i++) {
      y = Math.pow(r(), 1.5) * horizon * .9;
      stars.push({ x: r() * W, y: y, s: r() < .07 ? 1.5 + r() : .6 + r() * .8, a: .3 + r() * .7, w: .5 + r() * 2.4, p: r() * TAU });
    }
    // the Milky Way: a band of faint stars across the sky, falling to the right
    for (i = 0; i < n * .6; i++) {
      u = r(); x = W * (.08 + u * .95); y = horizon * (.02 + u * .62) + (r() + r() + r() - 1.5) * H * .07;
      if (y > 0 && y < horizon * .85) stars.push({ x: x, y: y, s: .5 + r() * .6, a: .2 + r() * .45, w: .5 + r() * 2, p: r() * TAU });
    }
  }
  function drawStars(c, t) {
    if (night < .02) return;
    var dx = ox(.03), dy = oy(.03), i, s, a;
    // the Milky Way's glow under its stars
    c.save(); c.translate(W * .55 + dx, horizon * .32 + dy); c.rotate(Math.atan2(horizon * .62, W * .95)); c.scale(1, .13);
    var g = c.createRadialGradient(0, 0, 0, 0, 0, W * .62);
    g.addColorStop(0, "rgba(170,180,255," + .085 * night + ")"); g.addColorStop(1, "rgba(170,180,255,0)");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, W * .62, 0, TAU); c.fill(); c.restore();
    c.fillStyle = "#EEF1FF";
    for (i = 0; i < stars.length; i++) {
      s = stars[i];
      a = night * s.a * (1 - smooth(horizon * .55, horizon * .97, s.y)) * (reduce ? .85 : .7 + .3 * Math.sin(t * s.w + s.p));
      if (a < .02) continue;
      c.globalAlpha = a;
      if (s.s > 1.4) { c.beginPath(); c.arc(s.x + dx, s.y + dy, s.s * .7, 0, TAU); c.fill(); }
      else c.fillRect(s.x + dx, s.y + dy, s.s, s.s);
    }
    c.globalAlpha = 1;
  }
  // the Big Dipper, joined by faint lines
  var DIP = [[0, 0], [.04, .43], [.34, .52], [.35, .18], [.53, .11], [.7, .15], [.9, .38]], DIPL = [0, 1, 1, 2, 2, 3, 3, 0, 3, 4, 4, 5, 5, 6];
  function drawDipper(c, t) {
    if (night < .05) return;
    var bw = Math.min(W * (portrait ? .42 : .22), H * .42), x0 = W * (portrait ? .1 : .5) + ox(.03), y0 = H * (portrait ? .07 : .08) + oy(.03), i, p;
    function at(k) { return [x0 + DIP[k][0] * bw, y0 + DIP[k][1] * bw * .6]; }
    c.strokeStyle = "rgba(200,212,255," + .14 * night + ")"; c.lineWidth = 1; c.beginPath();
    for (i = 0; i < DIPL.length; i += 2) { p = at(DIPL[i]); c.moveTo(p[0], p[1]); p = at(DIPL[i + 1]); c.lineTo(p[0], p[1]); }
    c.stroke();
    c.fillStyle = "#F2F4FF";
    for (i = 0; i < DIP.length; i++) {
      p = at(i); c.globalAlpha = night * (reduce ? .9 : .78 + .22 * Math.sin(t * 1.3 + i * 2.1));
      c.beginPath(); c.arc(p[0], p[1], 1.7, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  }
  function drawShoot(c) {
    if (!shoot) return;
    var k = shoot.life / shoot.max, x = shoot.x + shoot.vx * shoot.life, y = shoot.y + shoot.vy * shoot.life,
      m = Math.sqrt(shoot.vx * shoot.vx + shoot.vy * shoot.vy), tx = x - shoot.vx / m * 130, ty = y - shoot.vy / m * 130,
      a = Math.sin(k * Math.PI) * night, g = c.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, "rgba(255,255,255," + a + ")"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.strokeStyle = g; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.stroke();
  }

  /* ---------- sun, moon and the evening star ---------- */
  function place() {
    sun.x = W * SUNX + ox(.06); sun.y = horizon - H * (portrait ? .1 : .13) + night * H * .2 + oy(.06);
    moon.x = W * MOONX + ox(.06); moon.y = H * (portrait ? .15 : .18) + (1 - night) * H * .3 + oy(.06);
  }
  // where the light comes from: the sun, gliding to the moon as night falls
  function lightPos() {
    var k = smooth(.2, .8, night);
    return { x: sun.x + (moon.x - sun.x) * k, y: sun.y + (moon.y - sun.y) * k };
  }
  function drawSun(c) {
    var a = 1 - night;
    if (a < .01) return;
    var x = sun.x, y = sun.y, r = sunR, g = c.createRadialGradient(x, y, 0, x, y, H * .62);
    g.addColorStop(0, "rgba(255,210,150," + .6 * a + ")"); g.addColorStop(.16, "rgba(255,172,112," + .25 * a + ")"); g.addColorStop(1, "rgba(255,150,90,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, horizon);
    var h = c.createRadialGradient(x, y, r * .7, x, y, r * 3.4);
    h.addColorStop(0, "rgba(255,240,206," + .75 * a + ")"); h.addColorStop(1, "rgba(255,224,176,0)");
    c.fillStyle = h; c.beginPath(); c.arc(x, y, r * 3.4, 0, TAU); c.fill();
    c.globalAlpha = a; c.fillStyle = "#FFF4DA"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  var MARIA = [[-.3, -.12, .3], [.22, .24, .22], [.26, -.3, .17], [-.08, .36, .13]];
  function drawMoon(c) {
    var a = night;
    if (a < .01) return;
    var x = moon.x, y = moon.y, r = moonR, i, g = c.createRadialGradient(x, y, r, x, y, r * 10);
    g.addColorStop(0, "rgba(200,212,255," + .22 * a + ")"); g.addColorStop(1, "rgba(200,212,255,0)");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 10, 0, TAU); c.fill();
    var d = c.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    d.addColorStop(0, "rgba(255,252,242," + a + ")"); d.addColorStop(1, "rgba(212,206,194," + a + ")");
    c.fillStyle = d; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = "rgba(140,136,132," + .2 * a + ")";
    for (i = 0; i < MARIA.length; i++) { c.beginPath(); c.arc(x + MARIA[i][0] * r, y + MARIA[i][1] * r, MARIA[i][2] * r, 0, TAU); c.fill(); }
  }
  function drawVenus(c, t) {
    var a = (1 - night) * (reduce ? .8 : .7 + .3 * Math.sin(t * 2.3));
    if (a < .03) return;
    var x = W * (SUNX - (portrait ? .3 : .15)) + ox(.04), y = horizon - H * (portrait ? .34 : .42) + oy(.04), g = c.createRadialGradient(x, y, 0, x, y, 7);
    g.addColorStop(0, "rgba(255,248,230," + a + ")"); g.addColorStop(.3, "rgba(255,236,200," + .35 * a + ")"); g.addColorStop(1, "rgba(255,236,200,0)");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill();
  }

  /* ---------- clouds: long soft streaks, lit from below at dusk ---------- */
  function cloudSprite(w, h, seed, top, lit) {
    var c = document.createElement("canvas"), x, r = rng(seed), i, u, cx, cy, rr, env, g;
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    x = c.getContext("2d"); x.scale(dpr, dpr);
    for (i = 0; i < 46; i++) {
      u = r(); env = Math.sin(Math.PI * u);
      cx = w * (.05 + .9 * u); cy = h * (.64 - .28 * env * r()); rr = h * (.16 + .3 * env * (.5 + .5 * r()));
      x.save(); x.translate(cx, cy); x.scale(1.8 + r() * 1.6, 1);
      g = x.createRadialGradient(0, 0, 0, 0, 0, rr);
      g.addColorStop(0, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, rr, 0, TAU); x.fill(); x.restore();
    }
    x.globalCompositeOperation = "source-in";
    g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgb(top, .92)); g.addColorStop(1, rgb(lit));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    return c;
  }
  function buildClouds() {
    var r = rng(9), n = portrait ? 4 : 6, i, w, h, y, lift;
    clouds = [];
    for (i = 0; i < n; i++) {
      w = W * (.28 + r() * .34); h = H * (.035 + r() * .045); y = horizon * (.16 + r() * .56);
      lift = .3 + .7 * (y / horizon); // low clouds catch more of the light
      clouds.push({ x: r() * (W + w) - w, y: y, w: w, h: h, v: 3 + r() * 6, a: .42 + r() * .4, d: .05 + r() * .1,
        dusk: cloudSprite(w, h, 100 + i, A.cloudTop, mix(A.cloudTop, A.cloudLit, lift)),
        night: cloudSprite(w, h, 100 + i, B.cloudTop, mix(B.cloudTop, B.cloudLit, lift)) });
    }
  }
  function drawClouds(c) {
    for (var i = 0, k, x, y; i < clouds.length; i++) {
      k = clouds[i]; x = k.x + ox(k.d); y = k.y + oy(k.d);
      if (night < .99) { c.globalAlpha = k.a * (1 - night); c.drawImage(k.dusk, x, y, k.w, k.h); }
      if (night > .01) { c.globalAlpha = k.a * night * .75; c.drawImage(k.night, x, y, k.w, k.h); }
    }
    c.globalAlpha = 1;
  }
  function drawMist(c) {
    var hz = col("haze"), top = horizon - H * .08, g = c.createLinearGradient(0, top, 0, horizon);
    g.addColorStop(0, rgb(hz, 0)); g.addColorStop(1, rgb(hz, .3 * (1 - night * .4)));
    c.fillStyle = g; c.fillRect(0, top, W, horizon - top);
  }

  /* ---------- the lake ---------- */
  function buildGlints() {
    var r = rng(23), i;
    glints = [];
    for (i = 0; i < 160; i++) glints.push({ d: Math.pow(r(), 1.5), u: (r() + r() + r()) / 1.5 - 1, w: 4 + r() * 14, s: .6 + r() * 1.6, p: r() * TAU, a: .5 + r() * .5 });
  }
  // the reflection: rows copied from above the waterline in reverse order, each nudged sideways by ripples
  // that travel down the frame, toward the viewer, as the current carries them
  function drawLake(t) {
    var hd = up.height, wd = cv.width, n = cv.height - hd, st = Math.max(2, Math.round(2 * dpr)), pad = 12 * dpr, y, sy, d, o;
    ctx.fillStyle = rgb(col("water")); ctx.fillRect(0, hd, wd, n);
    for (y = 0; y < n; y += st) {
      sy = hd - y - st;
      if (sy < 0) break;
      d = y / n;
      o = reduce ? 0 : (Math.sin(y / dpr * .23 - t * 3.6) * (.6 + d * 4.2) + Math.sin(y / dpr * .061 - t * 1.8) * d * 6) * dpr;
      ctx.drawImage(up, 0, sy, wd, st, o - pad, hd + y, wd + pad * 2, st);
    }
  }
  function drawWater(t) {
    var w = col("water"), lc = col("light"), lh = H - horizon, g = ctx.createLinearGradient(0, horizon, 0, H), i;
    g.addColorStop(0, rgb(w, .2)); g.addColorStop(.4, rgb(w, .48)); g.addColorStop(1, rgb(w, .78));
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, lh);
    lightPath(sun.x, 1 - night, lc); lightPath(moon.x, night * .7, lc);
    ctx.fillStyle = rgb(lc, .1 + .08 * (1 - night)); ctx.fillRect(0, horizon, W, 1);
    for (i = 0; i < 6; i++) { // faint lines on the current, drifting toward the viewer and spreading as they come
      var f = reduce ? .1 + i * .14 : (i / 6 + t * .025) % 1;
      ctx.fillStyle = rgb(lc, (.022 + .018 * (reduce ? 0 : Math.sin(t * .4 + i * 1.7))) * (1 - night * .5) * Math.sin(f * Math.PI));
      ctx.fillRect(0, horizon + lh * Math.pow(f, 1.6), W, 1);
    }
    glitter(sun.x, 1 - night, lc, t, sunR); glitter(moon.x, night * .65, lc, t, moonR);
  }
  function lightPath(x, a, lc) {
    if (a < .02) return;
    var lh = H - horizon;
    ctx.save(); ctx.translate(x, horizon + lh * .3); ctx.scale(1, 2.6);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, lh * .3);
    g.addColorStop(0, rgb(lc, .16 * a)); g.addColorStop(1, rgb(lc, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, lh * .3, 0, TAU); ctx.fill(); ctx.restore();
  }
  function glitter(x0, a, lc, t, r0) {
    if (a < .02) return;
    var lh = H - horizon, i, g, d, y, x, tw, al, w;
    ctx.fillStyle = rgb(lc);
    for (i = 0; i < glints.length; i++) {
      // each glint rides the current down the frame, faster as it nears, and comes round again from the far water
      g = glints[i]; d = reduce ? g.d : (g.d + t * .03 * (.4 + g.d)) % 1; y = horizon + 2 + d * lh * .95;
      x = x0 + g.u * (r0 * 1.3 + d * W * .1) + (reduce ? 0 : Math.sin(t * g.s + g.p) * 5);
      tw = reduce ? .7 : .5 + .5 * Math.sin(t * g.s * 2.7 + g.p * 2.3);
      al = a * g.a * tw * tw * (1 - d * .7);
      if (al < .03) continue;
      w = g.w * (1 + d * 1.5); ctx.globalAlpha = al; ctx.fillRect(x - w / 2, y, w, 1 + d * 1.4);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- the near shore: a dark bank and pines that frame the view ---------- */
  function pine(p, x, by, h, r) {
    var tiers = Math.max(7, Math.round(h / 22)), hw = h * (.12 + r() * .04), top = by - h, gap = h * .93 / tiers, L = [], R = [], i, f, y, w;
    // each tier: a drooping branch tip, then the notch above it where the next branch starts
    for (i = 1; i <= tiers; i++) {
      f = i / tiers; y = top + f * h * .93; w = hw * (.12 + .88 * Math.pow(f, .9)) * (.8 + r() * .35);
      L.push(x - w, y, x - w * .36, y - gap * (.3 + r() * .25));
      R.push(x + w, y + gap * .1 * r(), x + w * .36, y - gap * (.3 + r() * .25));
    }
    p.moveTo(x, top);
    for (i = 0; i < L.length; i += 4) { p.lineTo(L[i + 2], L[i + 3]); p.lineTo(L[i], L[i + 1]); }
    p.lineTo(x - hw * .07, by + 20); p.lineTo(x + hw * .07, by + 20);
    for (i = R.length - 4; i >= 0; i -= 4) { p.lineTo(R[i], R[i + 1]); p.lineTo(R[i + 2], R[i + 3]); }
    p.closePath();
  }
  function buildShore() {
    var n = noise(91), r = rng(17), x, i, base = H * .905, list;
    shore = [];
    function ground(x) { return base - H * .03 * n(x / H * 3) - H * .05 * smooth(.62, 1.05, x / W) - H * .03 * smooth(.12, 0, x / W); }
    for (x = -PAD; x <= W + PAD + 6; x += 6) shore.push(x, ground(x));
    trees = typeof Path2D === "function" ? new Path2D() : null;
    if (!trees) return;
    list = portrait
      ? [[.84, .2], [.92, .32], [.99, .27], [-.02, .24], [.05, .14]]
      : [[.73, .1], [.775, .17], [.81, .26], [.85, .36], [.895, .47], [.94, .42], [.985, .56], [1.03, .48], [-.015, .46], [.03, .33], [.068, .2], [.1, .11]];
    for (i = 0; i < list.length; i++) { x = W * list[i][0]; pine(trees, x, ground(x) + 4, H * list[i][1], r); }
  }
  function drawGround() {
    var dx = ox(1), dy = oy(1), i;
    ctx.save(); ctx.translate(dx, dy);
    ctx.fillStyle = rgb(col("ground"));
    ctx.beginPath(); ctx.moveTo(shore[0], H + 24);
    for (i = 0; i < shore.length; i += 2) ctx.lineTo(shore[i], shore[i + 1]);
    ctx.lineTo(shore[shore.length - 2], H + 24); ctx.closePath(); ctx.fill();
    if (trees) ctx.fill(trees);
    ctx.restore();
  }

  /* ---------- life: birds at dusk, fireflies and falling stars at night ---------- */
  function spawnFlock() {
    var dir = Math.random() < .5 ? -1 : 1, n = 5 + (Math.random() * 6 | 0), i, rank;
    flock = { x: dir < 0 ? W + 80 : -80, y: H * (.22 + Math.random() * .2), v: dir * W / (24 + Math.random() * 14), b: [] };
    for (i = 0; i < n; i++) {
      rank = Math.ceil(i / 2);
      flock.b.push({ dx: -dir * rank * (18 + Math.random() * 6), dy: (i % 2 ? -1 : 1) * rank * (8 + Math.random() * 4) + (Math.random() - .5) * 4,
        s: 4 + Math.random() * 3, ph: Math.random() * TAU, f: 7 + Math.random() * 3 });
    }
  }
  function drawBirds(t) {
    if (!flock) return;
    var vis = 1 - night, i, b, x, y, f, s;
    if (vis < .03) return;
    ctx.strokeStyle = rgb(col("bird"), .85 * vis); ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath();
    for (i = 0; i < flock.b.length; i++) {
      b = flock.b[i]; s = b.s; f = Math.sin(t * b.f + b.ph);
      x = flock.x + b.dx; y = flock.y + b.dy + Math.sin(t * .7 + b.ph) * 3;
      ctx.moveTo(x - s, y - f * s * .7); ctx.quadraticCurveTo(x - s * .45, y - s * .2 - f * s * .25, x, y);
      ctx.quadraticCurveTo(x + s * .45, y - s * .2 - f * s * .25, x + s, y - f * s * .7);
    }
    ctx.stroke();
  }
  function buildFlies() {
    var r = rng(33), n = portrait ? 12 : 24, i, c, x, g;
    flies = [];
    for (i = 0; i < n; i++) flies.push({ x: W * (.55 + r() * .45), y: H * (.78 + r() * .2), ax: 10 + r() * 34, ay: 6 + r() * 16, s: .1 + r() * .3, p: r() * TAU, b: .5 + r() });
    c = document.createElement("canvas"); c.width = c.height = 36; x = c.getContext("2d");
    g = x.createRadialGradient(18, 18, 0, 18, 18, 18);
    g.addColorStop(0, "rgba(250,255,205,1)"); g.addColorStop(.18, "rgba(232,250,160,.8)"); g.addColorStop(.5, "rgba(200,240,120,.16)"); g.addColorStop(1, "rgba(200,240,120,0)");
    x.fillStyle = g; x.fillRect(0, 0, 36, 36);
    flySprite = c;
  }
  function drawFlies(t) {
    if (night < .05) return;
    var dx = ox(.9), dy = oy(.9), i, f, x, y, b;
    for (i = 0; i < flies.length; i++) {
      f = flies[i];
      x = f.x + dx + (reduce ? 0 : Math.sin(t * f.s + f.p) * f.ax);
      y = f.y + dy + (reduce ? 0 : Math.sin(t * f.s * 1.37 + f.p * 2) * f.ay);
      b = reduce ? .6 : Math.max(0, Math.sin(t * f.b + f.p * 3));
      if (night * b * b < .03) continue;
      ctx.globalAlpha = night * b * b; ctx.drawImage(flySprite, x - 9, y - 9, 18, 18);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- the light outside the canvas: CSS rays and flare follow it ---------- */
  function placeFx() {
    var L = lightPos();
    if (Math.abs(L.x - fxAt.x) + Math.abs(L.y - fxAt.y) < .4) return;
    fxAt = L;
    var tr = "translate3d(" + L.x.toFixed(1) + "px," + L.y.toFixed(1) + "px,0)";
    if (rays) rays.style.transform = tr;
    if (flare) flare.style.transform = tr;
  }

  /* ---------- a frame ---------- */
  function draw() {
    if (!W) return;
    var t = clock, i;
    place();
    uc.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky(uc); drawStars(uc, t); drawDipper(uc, t); drawShoot(uc);
    drawMoon(uc); drawSun(uc); drawVenus(uc, t); drawClouds(uc);
    for (i = 0; i < RANGES.length; i++) drawRange(uc, RANGES[i], i);
    drawMist(uc);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(up, 0, 0);
    drawLake(t);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWater(t); drawGround(); drawFlies(t); drawBirds(t);
    placeFx();
  }
  function step(dt) {
    var k = 1 - Math.exp(-dt * 2.2), i, c;
    par.x += (par.tx - par.x) * k; par.y += (par.ty - par.y) * k;
    if (night !== to) {
      k = Math.min(1, (clock - t0) / DUR); k = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      night = k >= 1 ? to : from + (to - from) * k;
    }
    for (i = 0; i < clouds.length; i++) { c = clouds[i]; c.x -= c.v * dt; if (c.x < -c.w - 40) c.x = W + 40; }
    if (flock) { flock.x += flock.v * dt; if (flock.x < -260 || flock.x > W + 260) { flock = null; nextFlock = clock + 14 + Math.random() * 22; } }
    else if (night < .5 && clock > nextFlock) spawnFlock();
    if (shoot) { shoot.life += dt; if (shoot.life > shoot.max) { shoot = null; nextShoot = clock + 5 + Math.random() * 9; } }
    else if (night > .6 && clock > nextShoot) shoot = { x: W * (.42 + Math.random() * .5), y: H * (.04 + Math.random() * .2), vx: -(520 + Math.random() * 380), vy: 200 + Math.random() * 160, life: 0, max: .7 + Math.random() * .5 };
  }
  function loop(now) {
    requestAnimationFrame(loop);
    var t = now / 1000, dt = last ? Math.min(.1, t - last) : 0;
    last = t; clock += dt;
    if (!visible) return;
    // fully veiled: a few frames a second keep the light alive behind the blur
    if (sink > .985 && night === to && clock - lastDraw < .2) return;
    step(Math.min(.3, clock - lastDraw)); draw(); lastDraw = clock;
  }

  /* ---------- layout ---------- */
  function layout() {
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h; portrait = W / H < .9;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); // a soft, moving backdrop: more pixels buy nothing
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    horizon = Math.round(H * (portrait ? .66 : .7));
    up.width = cv.width; up.height = Math.round(horizon * dpr);
    SUNX = portrait ? .64 : .67; MOONX = portrait ? .8 : .84;
    sunR = Math.max(12, H * .027); moonR = Math.max(10, H * .021);
    for (var i = 0; i < RANGES.length; i++) buildRange(RANGES[i]);
    buildStars(); buildClouds(); buildGlints(); buildShore(); buildFlies();
    fxAt = { x: -1, y: -1 };
    draw(); // resizing clears the canvas; never leave it blank until the next frame
  }
  var rt = 0;
  function onResize() { clearTimeout(rt); rt = setTimeout(layout, 120); }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(cv);
  else window.addEventListener("resize", onResize);
  if (fine && !reduce) window.addEventListener("pointermove", function (e) {
    par.tx = e.clientX / innerWidth * 2 - 1; par.ty = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });
  // on phones the scene scrolls away with the page; stop drawing it then
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);

  layout();
  cv.classList.add("on");
  if (!reduce) requestAnimationFrame(loop);

  window.SCENE = {
    setNight: function (on, instant) {
      var target = on ? 1 : 0;
      if (instant || reduce) { night = from = to = target; draw(); return; }
      if (target === to) return;
      from = night; to = target; t0 = clock;
    },
    setSink: function (s) { sink = s; },
    // is the point on the sun (or the moon)? clicking it switches the theme
    hit: function (cx, cy) {
      var r = cv.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, L = night < .5 ? sun : moon, rad = (night < .5 ? sunR : moonR) * 2.6 + 8;
      return y < horizon && (x - L.x) * (x - L.x) + (y - L.y) * (y - L.y) < rad * rad;
    }
  };
})();
