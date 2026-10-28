/* ==========================================================================
   The hero's words as particles. The name, the role line and the bio are
   drawn as points sampled from the text where the page sets it: round dots
   for the name, single pixels for the smaller lines, so at rest they read as
   print. On load they gather out of a drift of dust; the pointer pushes them
   aside, the fast ones catching the light, and they spring back. The real
   text stays in the page, unpainted, for screen readers, selection, search
   and translation.
   ========================================================================== */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement, copy = doc.querySelector(".hero-copy");
  if (!copy || !window.Uint32Array || !window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var els = ["#name", "#alt", "#bio"].map(function (s) { return doc.querySelector(s); }).filter(Boolean);
  var cv = doc.createElement("canvas"), ctx = cv.getContext("2d"), off = doc.createElement("canvas"), octx = off.getContext("2d", { willReadFrequently: true });
  if (!els.length || !ctx || !octx) return;
  cv.className = "particles"; cv.setAttribute("aria-hidden", "true");

  var PAD = 70, RAD = 74, PUSH = 1.5, GOLD = [235, 192, 111];
  var BEGIN = [0, .55, .8];               // when each line starts to gather, the name first (seconds)
  var dpr = 1, W = 0, H = 0, img = null, out = null, rest = null, DOT = [];
  var n = 0, hx, hy, x, y, vx, vy, k, col, dot, grp, on, act, actN = 0;
  var cell = 24, gw = 0, gh = 0, first, list;  // home positions by grid cell, to find the particles under the pointer
  var ptr = { x: 0, y: 0, vx: 0, vy: 0, in: false }, raf = 0, last = 0, born = 0, entering = false, ready = false, seen = true, size = "";

  function sm(a, b, t) { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); }

  // every word of an element, where the page put it, in the face and colour it is set in
  function collect(el, g, words) {
    var walk = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = doc.createRange(), re = /\S+/g, node, host, cs, font, m, rs, i, r;
    while ((node = walk.nextNode())) {
      host = node.parentElement;
      if (!host || host.closest(".sr-only,svg")) continue;
      cs = getComputedStyle(host);
      font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      re.lastIndex = 0;
      while ((m = re.exec(node.nodeValue))) {
        range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
        rs = range.getClientRects();
        if (rs.length === 1) { words.push({ s: m[0], r: rs[0], font: font, color: cs.color, g: g }); continue; }
        // a word broken over two lines: letter by letter
        for (i = 0; i < m[0].length; i++) {
          range.setStart(node, m.index + i); range.setEnd(node, m.index + i + 1);
          r = range.getBoundingClientRect();
          if (r.width) words.push({ s: m[0][i], r: r, font: font, color: cs.color, g: g });
        }
      }
    }
  }

  // set the words on a hidden canvas, line by line, and take a particle wherever there is ink
  function build(enter) {
    // the text has to stand where it will stay: .particles-on takes the entrance transforms off (and the paint)
    root.classList.add("particles-on");
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var base = copy.getBoundingClientRect(), words = [], x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, parts = [], g, i, j;
    els.forEach(function (el, g) { collect(el, g, words); });
    if (!words.length) return false;
    words.forEach(function (w) { x0 = Math.min(x0, w.r.left); y0 = Math.min(y0, w.r.top); x1 = Math.max(x1, w.r.right); y1 = Math.max(y1, w.r.bottom); });
    // room around the words for the particles to fly into, but never past the edges of the screen: a canvas that
    // overhangs it would widen the page on a phone
    x0 = Math.min(x0, Math.max(x0 - PAD, 0)); y0 -= PAD; x1 = Math.max(x1, Math.min(x1 + PAD, doc.documentElement.clientWidth)); y1 += PAD;
    W = Math.ceil((x1 - x0) * dpr); H = Math.ceil((y1 - y0) * dpr);
    cv.width = off.width = W; cv.height = off.height = H;
    cv.style.left = (x0 - base.left) + "px"; cv.style.top = (y0 - base.top) + "px";
    cv.style.width = W / dpr + "px"; cv.style.height = H / dpr + "px";
    // the name is big enough to show its grain: dots on a grid; the small lines keep every pixel
    var step = Math.max(3, Math.round(2.5 * dpr)), ds = Math.max(2, Math.round(1.5 * dpr));
    DOT = [];
    for (j = 0; j < ds; j++) for (i = 0; i < ds; i++) DOT.push(i - (ds >> 1), j - (ds >> 1), ds > 2 && (i === 0 || i === ds - 1) && (j === 0 || j === ds - 1) ? .45 : 1);
    for (g = 0; g < els.length; g++) {
      var ws = words.filter(function (w) { return w.g === g; }), bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      if (!ws.length) continue;
      octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
      octx.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
      octx.textBaseline = "alphabetic";
      ws.forEach(function (w) {
        octx.font = w.font; octx.fillStyle = w.color;
        // the range's box runs from the font's ascent to its descent: the baseline sits that far down it
        var mt = octx.measureText(w.s), a = mt.fontBoundingBoxAscent || 0, d = mt.fontBoundingBoxDescent || 0;
        octx.fillText(w.s, w.r.left, a + d > 0 ? w.r.top + (w.r.height - a - d) / 2 + a : w.r.top + w.r.height * .8);
        bx0 = Math.min(bx0, w.r.left); by0 = Math.min(by0, w.r.top); bx1 = Math.max(bx1, w.r.right); by1 = Math.max(by1, w.r.bottom);
      });
      // read back only the box these words fill
      var sx = Math.max(0, Math.floor((bx0 - x0 - 6) * dpr)), sy = Math.max(0, Math.floor((by0 - y0 - 6) * dpr));
      var sw = Math.min(W, Math.ceil((bx1 - x0 + 6) * dpr)) - sx, sh = Math.min(H, Math.ceil((by1 - y0 + 6) * dpr)) - sy;
      if (sw <= 0 || sh <= 0) continue;
      var data = new Uint32Array(octx.getImageData(sx, sy, sw, sh).data.buffer), big = g === 0, s = big ? step : 1, min = big ? 90 : 14;
      for (j = 0; j < sh; j += s) for (i = 0; i < sw; i += s) {
        var c = data[j * sw + i];
        if ((c >>> 24) >= min) parts.push(sx + i, sy + j, c, big ? 1 : 0, g);
      }
    }
    n = parts.length / 5;
    hx = new Float32Array(n); hy = new Float32Array(n); x = new Float32Array(n); y = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n); k = new Float32Array(n);
    col = new Uint32Array(n); dot = new Uint8Array(n); grp = new Uint8Array(n); on = new Uint8Array(n); act = new Int32Array(n);
    for (i = 0; i < n; i++) {
      var c2 = parts[i * 5 + 2];
      hx[i] = parts[i * 5]; hy[i] = parts[i * 5 + 1]; dot[i] = parts[i * 5 + 3]; grp[i] = parts[i * 5 + 4];
      k[i] = .035 + Math.random() * .03;
      // dots carry a little more ink than the pixel under them, each a shade different, like grain
      if (dot[i]) c2 = (Math.min(255, (c2 >>> 24) * 1.25 * (.82 + Math.random() * .3)) << 24 | (c2 & 0xFFFFFF)) >>> 0;
      col[i] = c2;
    }
    // home positions by cell
    cell = Math.round(24 * dpr); gw = Math.ceil(W / cell); gh = Math.ceil(H / cell);
    first = new Int32Array(gw * gh + 1); list = new Int32Array(n);
    var at = function (i) { return Math.min(gh - 1, (hy[i] / cell) | 0) * gw + Math.min(gw - 1, (hx[i] / cell) | 0); };
    for (i = 0; i < n; i++) first[at(i) + 1]++;
    for (i = 0; i < gw * gh; i++) first[i + 1] += first[i];
    var fill = first.slice();
    for (i = 0; i < n; i++) list[fill[at(i)]++] = i;

    img = ctx.createImageData(W, H); out = new Uint32Array(img.data.buffer); rest = new Uint32Array(W * H);
    actN = 0; entering = !!enter;
    for (i = 0; i < n; i++) {
      vx[i] = vy[i] = 0;
      if (entering) {
        // a loose drift of dust, mostly below and around each place
        var ang = Math.random() * 6.2832, rr = (26 + Math.random() * 120) * dpr * (grp[i] ? .7 : 1);
        x[i] = hx[i] + Math.cos(ang) * rr; y[i] = hy[i] + Math.sin(ang) * rr * .6 + 28 * dpr;
        on[i] = 1; act[actN++] = i;
      } else { x[i] = hx[i]; y[i] = hy[i]; on[i] = 0; plot(rest, i, hx[i], hy[i], col[i]); }
    }
    born = performance.now();
    if (!cv.parentNode) copy.appendChild(cv);
    paint(0);
    return true;
  }

  // a particle into a buffer: one pixel, or a dot with soft corners; colour 0 lifts it out
  function plot(buf, i, px, py, c) {
    var X = Math.round(px), Y = Math.round(py), j, xx, yy;
    if (!dot[i]) { if (X >= 0 && Y >= 0 && X < W && Y < H) buf[Y * W + X] = c; return; }
    var a = c >>> 24, rgb = c & 0xFFFFFF;
    for (j = 0; j < DOT.length; j += 3) {
      xx = X + DOT[j]; yy = Y + DOT[j + 1];
      if (xx >= 0 && yy >= 0 && xx < W && yy < H) buf[yy * W + xx] = c ? ((a * DOT[j + 2]) << 24 | rgb) >>> 0 : 0;
    }
  }
  function tint(c, f) {
    var r = c & 255, g = c >>> 8 & 255, b = c >>> 16 & 255;
    r += (GOLD[0] - r) * f; g += (GOLD[1] - g) * f; b += (GOLD[2] - b) * f;
    return ((c >>> 24) << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255)) >>> 0;
  }

  // the particles near the pointer come out of the print and start to move
  function wake() {
    var R = (RAD + 6) * dpr, cx0 = Math.max(0, Math.floor((ptr.x - R) / cell)), cx1 = Math.min(gw - 1, Math.floor((ptr.x + R) / cell));
    var cy0 = Math.max(0, Math.floor((ptr.y - R) / cell)), cy1 = Math.min(gh - 1, Math.floor((ptr.y + R) / cell)), cx, cy, s, i, dx, dy;
    for (cy = cy0; cy <= cy1; cy++) for (cx = cx0; cx <= cx1; cx++) {
      for (s = first[cy * gw + cx]; s < first[cy * gw + cx + 1]; s++) {
        i = list[s];
        if (on[i]) continue;
        dx = hx[i] - ptr.x; dy = hy[i] - ptr.y;
        if (dx * dx + dy * dy < R * R) { on[i] = 1; act[actN++] = i; plot(rest, i, hx[i], hy[i], 0); }
      }
    }
  }
  // one tick at 60 Hz: pushed away from the pointer, pulled home on a spring; still and home again, back into the print
  function step(t) {
    var R = RAD * dpr, R2 = R * R, F = PUSH * dpr, live = ptr.in && seen, j = 0, a, i, dx, dy, d2, d, f, near, kk;
    for (a = 0; a < actN; a++) {
      i = act[a];
      if (entering && t < BEGIN[grp[i]]) { act[j++] = i; continue; }
      dx = x[i] - ptr.x; dy = y[i] - ptr.y; d2 = dx * dx + dy * dy; near = live && d2 < R2;
      if (near) {
        d = Math.sqrt(d2) || 1; f = 1 - d / R; f *= f * F;
        vx[i] += dx / d * f + ptr.vx * f * .08; vy[i] += dy / d * f + ptr.vy * f * .08;
      }
      kk = entering ? k[i] * .45 : k[i];
      vx[i] = (vx[i] + (hx[i] - x[i]) * kk) * .86; vy[i] = (vy[i] + (hy[i] - y[i]) * kk) * .86;
      x[i] += vx[i]; y[i] += vy[i];
      if (!near && !(entering && t < BEGIN[grp[i]] + .9) && Math.abs(x[i] - hx[i]) + Math.abs(y[i] - hy[i]) < .35 && Math.abs(vx[i]) + Math.abs(vy[i]) < .08) {
        x[i] = hx[i]; y[i] = hy[i]; vx[i] = vy[i] = 0; on[i] = 0; plot(rest, i, hx[i], hy[i], col[i]);
      } else act[j++] = i;
    }
    actN = j;
  }
  function paint(t) {
    out.set(rest);
    var a, i, c, f, sp, slow = 1.2 * dpr;
    for (a = 0; a < actN; a++) {
      i = act[a]; c = col[i];
      if (entering) {
        f = sm(BEGIN[grp[i]], BEGIN[grp[i]] + .9, t);
        if (f <= 0) continue;
        if (f < 1) c = (((c >>> 24) * f) << 24 | (c & 0xFFFFFF)) >>> 0;
      } else {
        // the fast ones catch the light as they fly
        sp = Math.abs(vx[i]) + Math.abs(vy[i]);
        if (sp > slow) c = tint(c, Math.min(.85, (sp - slow) / (5 * dpr)));
      }
      plot(out, i, x[i], y[i], c);
    }
    ctx.putImageData(img, 0, 0);
  }
  function frame(now) {
    raf = 0;
    var t = (now - born) / 1000, dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60, s;
    last = now;
    if (ptr.in && seen) wake();
    for (s = Math.max(1, Math.min(3, Math.round(dt * 60))); s > 0; s--) step(t);
    ptr.vx *= .7; ptr.vy *= .7;
    if (entering && (!actN || t > 6)) entering = false;
    paint(t);
    if (actN || entering) raf = requestAnimationFrame(frame); else last = 0;
  }
  function kick() { if (ready && !raf) raf = requestAnimationFrame(frame); }

  /* ---------- the pointer: hovering pushes; on touch, a tap bursts them apart for a moment ---------- */
  var tap = 0;
  function move(e) {
    if (!ready) return;
    var r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * dpr, py = (e.clientY - r.top) * dpr, m = RAD * dpr;
    if (px > -m && py > -m && px < W + m && py < H + m) {
      if (ptr.in) { ptr.vx = Math.max(-40, Math.min(40, px - ptr.x)); ptr.vy = Math.max(-40, Math.min(40, py - ptr.y)); }
      ptr.x = px; ptr.y = py; ptr.in = true; kick();
    } else if (ptr.in) { ptr.in = false; kick(); }
  }
  function leave() { if (ptr.in) { ptr.in = false; kick(); } }
  addEventListener("pointermove", move, { passive: true });
  addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    move(e);
    clearTimeout(tap); tap = setTimeout(leave, 450);
  }, { passive: true });
  addEventListener("pointercancel", leave);
  doc.documentElement.addEventListener("pointerleave", leave);
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (!seen) leave(); }).observe(copy);

  /* ---------- start once the faces are in, so the particles take the letters' real shapes; again when the layout
     changes. A failure leaves the plain text, as it was ---------- */
  function start() {
    try {
      // the dust gathers only on a fresh load; a late start (slow fonts) swaps the text for its particles quietly
      ready = build(performance.now() < 2500);
      size = copy.offsetWidth + "x" + copy.offsetHeight;
      if (ready) kick(); else drop();
    } catch (err) { drop(); }
  }
  function drop() { ready = false; root.classList.remove("particles-on"); if (cv.parentNode) cv.remove(); }
  function again() {
    if (!ready) return;
    try { if (!build(false)) drop(); } catch (err) { drop(); }
  }
  var fonts = doc.fonts && doc.fonts.load
    ? Promise.all([doc.fonts.load("100px 'Instrument Serif'"), doc.fonts.load("500 15px Geist"), doc.fonts.load("16px Geist"), doc.fonts.load("600 16px Geist")]).catch(function () {})
    : Promise.resolve();
  Promise.race([fonts, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () { requestAnimationFrame(start); });
  var later = 0;
  if (window.ResizeObserver) new ResizeObserver(function () {
    var s = copy.offsetWidth + "x" + copy.offsetHeight;
    if (!ready || s === size) return;
    size = s; clearTimeout(later); later = setTimeout(again, 120);
  }).observe(copy);
  if (doc.fonts && doc.fonts.addEventListener) doc.fonts.addEventListener("loadingdone", function () { clearTimeout(later); later = setTimeout(again, 120); });
  // zooming changes the pixel ratio without always changing the layout
  addEventListener("resize", function () { if (ready && Math.min(2, window.devicePixelRatio || 1) !== dpr) { clearTimeout(later); later = setTimeout(again, 120); } });
})();
