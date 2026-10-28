/* ==========================================================================
   Card art, drawn rather than shipped: one function per kind of work, in the
   page's greys with one lit cream and a gold accent. Each takes
   (ctx, w, h, t, bold) and draws a whole frame at time t (seconds), so a card
   can sit still or play on hover; `bold` thickens lines for small thumbnails.
   Give a project `cover: "path.webp"` in content.js to use a real image.
   ========================================================================== */
window.COVERS = (function () {
  "use strict";
  var BG = "#0D0F18", HAIR = "rgba(255,236,210,.06)", LINE = "rgba(255,236,210,.17)", DIM = "rgba(255,236,210,.36)",
    MUTED = "#ADA496", CREAM = "#F6EFE3", GOLD = "#EBC06F", TAU = Math.PI * 2;
  var MONO = "'Geist Mono',ui-monospace,Menlo,Consolas,monospace", SERIF = "'Instrument Serif',Georgia,serif";

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function frac(x) { return x - Math.floor(x); }
  function gold(a) { return "rgba(235,192,111," + a + ")"; }
  function cream(a) { return "rgba(246,239,227," + a + ")"; }
  function mono(px, weight) { return (weight || 500) + " " + Math.round(px) + "px " + MONO; }
  function text(c, s, x, y, font, color, align) { c.font = font; c.fillStyle = color; c.textAlign = align || "left"; c.textBaseline = "alphabetic"; c.fillText(s, x, y); }
  function box(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function dot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }

  /* what every cover shares: near-black, a soft light from above, an optional faint grid */
  function base(c, w, h, step) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.shadowBlur = 0; c.setLineDash([]); c.lineCap = "round"; c.lineJoin = "round";
    c.fillStyle = BG; c.fillRect(0, 0, w, h);
    var g = c.createRadialGradient(w * .5, -h * .3, 0, w * .5, -h * .3, h * 1.3);
    g.addColorStop(0, "rgba(84,70,104,.62)"); g.addColorStop(1, "rgba(84,70,104,0)");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (!step) return;
    c.strokeStyle = HAIR; c.lineWidth = 1; c.beginPath();
    for (var x = step; x < w; x += step) { c.moveTo(Math.round(x) + .5, 0); c.lineTo(Math.round(x) + .5, h); }
    for (var y = step; y < h; y += step) { c.moveTo(0, Math.round(y) + .5); c.lineTo(w, Math.round(y) + .5); }
    c.stroke();
  }
  /* the backdrop fills the whole canvas; the drawing keeps its own proportions (aw:ah), centred and scaled to fit,
     so a cover reads the same in a wide card, a tall thumbnail or a phone row */
  function frame(c, w, h, aw, ah, grid) {
    var k = Math.min(w / aw, h / ah);
    base(c, w, h, grid * k);
    c.translate((w - aw * k) / 2, (h - ah * k) / 2);
    return [aw * k, ah * k, k];
  }
  // a window: rounded frame and a title bar
  function win(c, x, y, w, h, bar, s, lw) {
    box(c, x, y, w, h, 16 * s); c.fillStyle = "rgba(13,15,24,.92)"; c.fill();
    c.strokeStyle = LINE; c.lineWidth = 1.6 * lw; c.stroke();
    c.beginPath(); c.moveTo(x, y + bar); c.lineTo(x + w, y + bar); c.stroke();
  }

  /* one beat of a blood-volume pulse: a quick systolic rise, the peak, the dicrotic notch, a slow fall (p in 0..1) */
  function bvp(p) { return Math.exp(-Math.pow((p - .2) / .07, 2)) + .36 * Math.exp(-Math.pow((p - .45) / .09, 2)); }

  /* rPPG Engine: a face mesh whose skin regions flush with each beat, and the pulse they carry */
  function pulse(c, w, h, t, bold) {
    var f = frame(c, w, h, 960, 540, 60), s = f[2], lw = s * (bold || 1), beat = bvp(frac(t * 1.2)), r = rng(4), rows = [], i, j, p, row, v, half, n;
    w = f[0]; h = f[1];
    var fx = w * .25, fy = h * .54, rx = 118 * s, ry = 166 * s;
    for (j = 0; j <= 10; j++) {
      v = -1 + j / 5; half = rx * Math.sqrt(Math.max(0, 1 - v * v)) * (v > .35 ? 1 - (v - .35) * .5 : 1);
      n = Math.max(2, Math.round(half / (24 * s))); row = [];
      for (i = 0; i <= n; i++) row.push([fx + (-1 + 2 * i / n) * half + (r() - .5) * 8 * s, fy + v * ry + (r() - .5) * 8 * s]);
      rows.push(row);
    }
    c.strokeStyle = LINE; c.lineWidth = 1.3 * lw; c.beginPath();
    for (j = 0; j < rows.length; j++) for (i = 0; i < rows[j].length; i++) {
      p = rows[j][i];
      if (i) { c.moveTo(rows[j][i - 1][0], rows[j][i - 1][1]); c.lineTo(p[0], p[1]); }
      if (j < rows.length - 1) { n = rows[j + 1]; v = n[Math.round(i / Math.max(1, rows[j].length - 1) * (n.length - 1))]; c.moveTo(p[0], p[1]); c.lineTo(v[0], v[1]); }
    }
    c.stroke();
    c.fillStyle = DIM;
    for (j = 0; j < rows.length; j++) for (i = 0; i < rows[j].length; i++) { p = rows[j][i]; c.fillRect(p[0] - 1.6 * lw, p[1] - 1.6 * lw, 3.2 * lw, 3.2 * lw); }
    var rois = [[fx, fy - ry * .55, rx * .5, ry * .13], [fx - rx * .5, fy + ry * .1, rx * .24, ry * .15], [fx + rx * .5, fy + ry * .1, rx * .24, ry * .15]];
    c.strokeStyle = GOLD; c.lineWidth = 2.4 * lw; c.fillStyle = gold(.1 + .18 * beat);
    for (i = 0; i < 3; i++) { c.beginPath(); c.ellipse(rois[i][0], rois[i][1], rois[i][2], rois[i][3], 0, 0, TAU); c.fill(); c.stroke(); }
    // three seconds of pulse, newest on the right
    var x0 = w * .52, x1 = w * .92, cy = h * .68, amp = 118 * s, x, y;
    c.setLineDash([3 * lw, 7 * lw]); c.strokeStyle = gold(.45); c.lineWidth = 1.6 * lw;
    c.beginPath(); c.moveTo(rois[2][0] + rois[2][2] + 6 * s, rois[2][1]); c.lineTo(x0 - 16 * s, cy); c.stroke(); c.setLineDash([]);
    c.beginPath();
    for (x = x0; x <= x1 + .5; x += 2) { y = cy + amp * .45 - amp * bvp(frac((t - (x1 - x) / (x1 - x0) * 3) * 1.2)); if (x === x0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.shadowColor = gold(.55); c.shadowBlur = 16 * s; c.strokeStyle = CREAM; c.lineWidth = 3.2 * lw; c.stroke(); c.shadowBlur = 0;
    c.fillStyle = GOLD; dot(c, x1, cy + amp * .45 - amp * beat, 6 * lw);
    text(c, "72", x0, h * .36, Math.round(118 * s) + "px " + SERIF, CREAM);
    text(c, "BPM", x0 + c.measureText("72").width + 12 * s, h * .36, mono(24 * s), MUTED);
  }

  /* ODS for Windows: the backend ladder it probes, and a reply streaming in */
  function runtime(c, w, h, t, bold) {
    var f = frame(c, w, h, 960, 540, 60), s = f[2], lw = s * (bold || 1), i;
    w = f[0]; h = f[1];
    var x = w * .5 - 380 * s, y = h * .5 - 205 * s, ww = 760 * s, wh = 410 * s, bar = 46 * s;
    win(c, x, y, ww, wh, bar, s, lw);
    text(c, "ODS", x + 22 * s, y + 30 * s, mono(19 * s), MUTED);
    var cx = x + ww - 30 * s, cy = y + bar / 2;
    c.strokeStyle = DIM; c.lineWidth = 1.6 * lw; c.beginPath();
    c.moveTo(cx - 6 * s, cy - 6 * s); c.lineTo(cx + 6 * s, cy + 6 * s); c.moveTo(cx + 6 * s, cy - 6 * s); c.lineTo(cx - 6 * s, cy + 6 * s);
    c.rect(cx - 46 * s, cy - 6 * s, 12 * s, 12 * s); c.moveTo(cx - 92 * s, cy); c.lineTo(cx - 80 * s, cy); c.stroke();
    // the first build that qualifies wins; the rest wait as fallbacks
    var names = ["CUDA 13.1", "CUDA 12.4", "Vulkan", "CPU"], lx = x + 28 * s, ly = y + bar + 26 * s, rw = 300 * s, rh = 56 * s, yy, on;
    for (i = 0; i < 4; i++) {
      yy = ly + i * (rh + 16 * s); on = i === 0;
      box(c, lx, yy, rw, rh, 12 * s); c.fillStyle = on ? gold(.1) : "rgba(255,236,210,.025)"; c.fill();
      c.strokeStyle = on ? GOLD : LINE; c.lineWidth = (on ? 2 : 1.4) * lw; c.stroke();
      text(c, names[i], lx + 20 * s, yy + rh / 2 + 7 * s, mono(21 * s), on ? CREAM : MUTED);
      if (on) { c.strokeStyle = GOLD; c.lineWidth = 2.6 * lw; c.beginPath(); c.moveTo(lx + rw - 42 * s, yy + rh / 2); c.lineTo(lx + rw - 33 * s, yy + rh / 2 + 8 * s); c.lineTo(lx + rw - 18 * s, yy + rh / 2 - 9 * s); c.stroke(); }
      else { c.fillStyle = DIM; dot(c, lx + rw - 28 * s, yy + rh / 2, 3 * lw); }
    }
    var mx = x + 360 * s, mw = ww - 388 * s, mh = 50 * s, msgs = [[1, .58], [0, .92], [1, .42], [0, .8]], grow = Math.min(1, frac(t * .22 + .65) * 1.3), user, last, bw, bx, by;
    for (i = 0; i < msgs.length; i++) {
      user = msgs[i][0]; last = i === msgs.length - 1; bw = mw * msgs[i][1] * (last ? Math.max(.12, grow) : 1);
      bx = user ? mx + mw - bw : mx; by = ly + i * (mh + 14 * s);
      box(c, bx, by, bw, mh, 14 * s);
      if (user) { c.fillStyle = "rgba(255,236,210,.1)"; c.fill(); }
      else { c.strokeStyle = last ? cream(.7) : LINE; c.lineWidth = 1.4 * lw; c.stroke(); }
      c.fillStyle = last ? CREAM : DIM; box(c, bx + 18 * s, by + mh / 2 - 3 * s, Math.max(0, bw - (last ? 52 : 36) * s), 6 * s, 3 * s); c.fill();
      if (last && Math.floor(t * 2.4) % 2 === 0) { c.fillStyle = GOLD; c.fillRect(bx + bw - 28 * s, by + 14 * s, 4 * lw, mh - 28 * s); }
    }
    c.fillStyle = GOLD; dot(c, lx + 6 * s, y + wh - 30 * s, 5 * s);
    text(c, "llama-server  ready", lx + 22 * s, y + wh - 24 * s, mono(17 * s), MUTED);
  }

  /* Elements Web: the app shell, its figures and grid, and the command palette opening over it */
  function dashboard(c, w, h, t, bold) {
    var f = frame(c, w, h, 960, 540, 0), s = f[2], lw = s * (bold || 1), r = rng(11), i, k;
    w = f[0]; h = f[1];
    var x = w * .5 - 400 * s, y = h * .5 - 215 * s, ww = 800 * s, wh = 430 * s, sb = 150 * s, tb = 50 * s;
    box(c, x, y, ww, wh, 16 * s); c.fillStyle = "rgba(13,15,24,.92)"; c.fill(); c.strokeStyle = LINE; c.lineWidth = 1.6 * lw; c.stroke();
    c.beginPath(); c.moveTo(x + sb, y); c.lineTo(x + sb, y + wh); c.moveTo(x + sb, y + tb); c.lineTo(x + ww, y + tb); c.stroke();
    for (i = 0; i < 7; i++) {
      var iy = y + 30 * s + i * 40 * s;
      c.fillStyle = i === 1 ? CREAM : DIM; box(c, x + 36 * s, iy, (48 + r() * 50) * s, 8 * s, 4 * s); c.fill();
      if (i === 1) { c.fillStyle = GOLD; dot(c, x + 21 * s, iy + 4 * s, 4 * s); }
    }
    box(c, x + sb + 20 * s, y + 11 * s, 260 * s, 28 * s, 8 * s); c.strokeStyle = LINE; c.stroke();
    text(c, "⌘K", x + sb + 268 * s, y + 31 * s, mono(14 * s), MUTED, "right");
    var mx = x + sb + 20 * s, mw = ww - sb - 40 * s, tw = (mw - 32 * s) / 3, ty = y + tb + 20 * s, th = 86 * s, tx, px, py;
    for (i = 0; i < 3; i++) {
      tx = mx + i * (tw + 16 * s);
      box(c, tx, ty, tw, th, 12 * s); c.strokeStyle = LINE; c.lineWidth = 1.4 * lw; c.stroke();
      c.fillStyle = DIM; box(c, tx + 16 * s, ty + 18 * s, 54 * s, 6 * s, 3 * s); c.fill();
      c.fillStyle = CREAM; box(c, tx + 16 * s, ty + 36 * s, (60 + i * 18) * s, 14 * s, 4 * s); c.fill();
      c.beginPath();
      for (k = 0; k <= 12; k++) { px = tx + tw - 100 * s + k * 7 * s; py = ty + th - 20 * s - (Math.sin(k * .9 + i * 2) * .5 + .5 + k / 24) * 22 * s; if (k) c.lineTo(px, py); else c.moveTo(px, py); }
      c.strokeStyle = GOLD; c.lineWidth = 2 * lw; c.stroke();
    }
    // one grid for every list screen: id, name, a status that is a dot plus a word, an amount
    var gy = ty + th + 18 * s, rh = 36 * s, tones = [CREAM, GOLD, MUTED], ry;
    c.lineWidth = 1 * lw;
    for (i = 0; i < 6; i++) {
      ry = gy + i * rh;
      c.strokeStyle = HAIR; c.beginPath(); c.moveTo(mx, ry + rh); c.lineTo(mx + mw, ry + rh); c.stroke();
      c.fillStyle = i ? DIM : MUTED;
      box(c, mx + 4 * s, ry + rh / 2 - 3 * s, 46 * s, 6 * s, 3 * s); c.fill();
      box(c, mx + 74 * s, ry + rh / 2 - 3 * s, (110 + r() * 120) * s, 6 * s, 3 * s); c.fill();
      if (i) { c.fillStyle = tones[(i * 7) % 3]; dot(c, mx + mw * .66, ry + rh / 2, 4 * s); c.fillStyle = DIM; }
      box(c, mx + mw * .66 + 12 * s, ry + rh / 2 - 3 * s, 44 * s, 6 * s, 3 * s); c.fill();
      box(c, mx + mw - 64 * s, ry + rh / 2 - 3 * s, 60 * s, 6 * s, 3 * s); c.fill();
    }
    var o = Math.max(0, Math.min(1, Math.sin(frac(t * .16 + .3) * Math.PI) * 1.7 - .25));
    if (o <= 0) return;
    c.globalAlpha = o;
    c.fillStyle = "rgba(5,6,10,.55)"; box(c, x, y, ww, wh, 16 * s); c.fill();
    var pw = 380 * s, ph = 214 * s, ppx = x + sb + (ww - sb - pw) / 2, ppy = y + 78 * s - (1 - o) * 10 * s, hl = Math.floor(t * 1.4) % 4;
    box(c, ppx, ppy, pw, ph, 14 * s); c.fillStyle = "#14161F"; c.fill(); c.strokeStyle = DIM; c.lineWidth = 1.4 * lw; c.stroke();
    text(c, "Go to…", ppx + 20 * s, ppy + 34 * s, mono(17 * s), MUTED);
    c.fillStyle = GOLD; c.fillRect(ppx + 92 * s, ppy + 19 * s, 2.5 * lw, 20 * s);
    c.strokeStyle = LINE; c.beginPath(); c.moveTo(ppx, ppy + 52 * s); c.lineTo(ppx + pw, ppy + 52 * s); c.stroke();
    for (i = 0; i < 4; i++) {
      var qy = ppy + 62 * s + i * 36 * s;
      if (i === hl) { c.fillStyle = "rgba(255,236,210,.08)"; box(c, ppx + 8 * s, qy, pw - 16 * s, 30 * s, 8 * s); c.fill(); }
      c.fillStyle = i === hl ? CREAM : DIM; box(c, ppx + 22 * s, qy + 12 * s, (90 + ((i * 53) % 100)) * s, 6 * s, 3 * s); c.fill();
    }
    c.globalAlpha = 1;
  }

  /* STEMY: eight stages as knobs, and the song before (gold) and after (cream), flat at the ceiling */
  function mastering(c, w, h, t, bold) {
    var f = frame(c, w, h, 960, 540, 0), s = f[2], lw = s * (bold || 1), i, kx, v, a0, a1;
    w = f[0]; h = f[1];
    var n = 8, x0 = w * .5 - 380 * s, x1 = w * .5 + 380 * s, ky = h * .27, step = (x1 - x0) / n, kr = 30 * s;
    c.strokeStyle = LINE; c.lineWidth = 1.4 * lw; c.beginPath(); c.moveTo(x0 + step / 2, ky); c.lineTo(x1 - step / 2, ky); c.stroke();
    for (i = 0; i < n; i++) {
      kx = x0 + step * (i + .5); v = .25 + .55 * (.5 + .5 * Math.sin(i * 1.9 + t * (.5 + i * .09)));
      a0 = Math.PI * .75; a1 = a0 + Math.PI * 1.5 * v;
      c.fillStyle = BG; dot(c, kx, ky, kr + 8 * s);
      c.strokeStyle = LINE; c.lineWidth = 3 * lw; c.beginPath(); c.arc(kx, ky, kr, a0, Math.PI * 2.25); c.stroke();
      c.strokeStyle = GOLD; c.beginPath(); c.arc(kx, ky, kr, a0, a1); c.stroke();
      c.strokeStyle = CREAM; c.lineWidth = 2.4 * lw; c.beginPath();
      c.moveTo(kx + Math.cos(a1) * kr * .2, ky + Math.sin(a1) * kr * .2); c.lineTo(kx + Math.cos(a1) * kr * .7, ky + Math.sin(a1) * kr * .7); c.stroke();
    }
    var wy = h * .68, amp = 118 * s, bars = 96, wx0 = w * .5 - 400 * s, wx1 = w * .5 + 400 * s, bw = (wx1 - wx0) / bars, ceil = .8, r = rng(12),
      head = wx0 + frac(t * .07 + .35) * (wx1 - wx0), env, raw, mast, bx, played;
    for (i = 0; i < bars; i++) {
      env = .25 + .75 * Math.pow(r(), .8) * (.55 + .45 * Math.sin(i * .21));
      raw = env * .62; mast = Math.min(ceil, env * 1.05 + .08); bx = wx0 + i * bw; played = bx < head;
      c.fillStyle = played ? CREAM : cream(.42); c.fillRect(bx + bw * .18, wy - mast * amp, bw * .64, mast * amp * 2);
      c.fillStyle = gold(played ? .95 : .55);
      c.fillRect(bx + bw * .18, wy - raw * amp, bw * .64, 2 * lw); c.fillRect(bx + bw * .18, wy + raw * amp - 2 * lw, bw * .64, 2 * lw);
    }
    c.setLineDash([5 * lw, 7 * lw]); c.strokeStyle = gold(.55); c.lineWidth = 1.4 * lw; c.beginPath();
    c.moveTo(wx0, wy - ceil * amp - 4 * s); c.lineTo(wx1, wy - ceil * amp - 4 * s); c.moveTo(wx0, wy + ceil * amp + 4 * s); c.lineTo(wx1, wy + ceil * amp + 4 * s);
    c.stroke(); c.setLineDash([]);
    c.strokeStyle = CREAM; c.lineWidth = 2 * lw; c.beginPath(); c.moveTo(head, wy - amp * 1.06); c.lineTo(head, wy + amp * 1.06); c.stroke();
  }

  /* Robot learning: a biped mid-stride on scrolling ground, and its reward curve climbing */
  function robot(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i, ph = t * 2.4, gx;
    w = f[0]; h = f[1];
    var gy = h * .84, L = 70 * s, hx = w * .34, hy = gy - L * 1.94 + Math.abs(Math.sin(ph)) * -5 * s;
    c.strokeStyle = DIM; c.lineWidth = 2 * lw; c.beginPath(); c.moveTo(w * .06, gy); c.lineTo(w * .94, gy); c.stroke();
    c.strokeStyle = LINE; c.beginPath();
    for (i = 0; i < 16; i++) { gx = w * .06 + frac(i / 16 - t * .1) * w * .88; c.moveTo(gx, gy + 10 * s); c.lineTo(gx - 10 * s, gy + 22 * s); }
    c.stroke();
    function limb(px, py, a1, a2) {
      var kx = px + Math.sin(a1) * L, ky = py + Math.cos(a1) * L, fx = kx + Math.sin(a1 - a2) * L, fy = Math.min(gy, ky + Math.cos(a1 - a2) * L);
      return [px, py, kx, ky, fx, fy];
    }
    function draw(seg, alpha) {
      c.strokeStyle = cream(alpha); c.lineWidth = 7 * lw; c.beginPath(); c.moveTo(seg[0], seg[1]); c.lineTo(seg[2], seg[3]); c.lineTo(seg[4], seg[5]); c.stroke();
      c.fillStyle = BG; c.strokeStyle = alpha < 1 ? DIM : GOLD; c.lineWidth = 2.4 * lw;
      for (var k = 0; k < 6; k += 2) { c.beginPath(); c.arc(seg[k], seg[k + 1], 6 * lw, 0, TAU); c.fill(); c.stroke(); }
    }
    var back = limb(hx, hy, .42 * Math.sin(ph + Math.PI), .6 * Math.max(0, Math.sin(ph + Math.PI + 1.3))),
      front = limb(hx, hy, .42 * Math.sin(ph), .6 * Math.max(0, Math.sin(ph + 1.3))),
      sx = hx + 6 * s, sy = hy - 92 * s, sw = .35 * Math.sin(ph);
    draw(back, .35);
    draw([sx, sy, sx + Math.sin(-sw) * 44 * s, sy + Math.cos(sw) * 44 * s, sx + Math.sin(-sw * 1.4 + .5) * 80 * s, sy + 76 * s], .35);
    c.fillStyle = "rgba(13,15,24,1)"; c.strokeStyle = CREAM; c.lineWidth = 2.6 * lw;
    box(c, hx - 24 * s, hy - 104 * s, 54 * s, 104 * s, 14 * s); c.fill(); c.stroke();
    box(c, hx - 16 * s, hy - 148 * s, 44 * s, 36 * s, 10 * s); c.fill(); c.stroke();
    c.strokeStyle = GOLD; c.beginPath(); c.moveTo(hx - 6 * s, hy - 132 * s); c.lineTo(hx + 18 * s, hy - 132 * s); c.stroke();
    draw(front, 1);
    draw([sx, sy, sx + Math.sin(sw) * 44 * s, sy + Math.cos(sw) * 44 * s, sx + Math.sin(sw * 1.4 + .5) * 80 * s, sy + 76 * s], 1);
    var cx0 = w * .62, cx1 = w * .93, cy0 = h * .14, cy1 = h * .5, rr = rng(3), px, py;
    c.strokeStyle = LINE; c.lineWidth = 1.4 * lw; c.beginPath(); c.moveTo(cx0, cy0); c.lineTo(cx0, cy1); c.lineTo(cx1, cy1); c.stroke();
    c.strokeStyle = GOLD; c.lineWidth = 2.6 * lw; c.beginPath();
    for (i = 0; i <= 40; i++) { px = cx0 + (cx1 - cx0) * i / 40; py = cy1 - (cy1 - cy0) * (1 - Math.exp(-i / 11)) * .92 + (rr() - .5) * 16 * s * (1 - i / 50); if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.stroke();
  }

  /* Real-time media: a camera, a server, three players, and packets flowing between them */
  function stream(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i, k, u, p;
    w = f[0]; h = f[1];
    var src = [w * .17, h * .5], hub = [w * .5, h * .5], outs = [[w * .83, h * .22], [w * .83, h * .5], [w * .83, h * .78]];
    // from the server's right edge to a player's left edge: leaves level, arrives level
    function curve(o, u) {
      var x0 = hub[0] + 50 * s, x3 = o[0] - 44 * s, x1 = x0 + (x3 - x0) * .55, x2 = x3 - (x3 - x0) * .55, v = 1 - u;
      return [v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
              (v * v * v + 3 * v * v * u) * hub[1] + (3 * v * u * u + u * u * u) * o[1]];
    }
    c.strokeStyle = LINE; c.lineWidth = 2 * lw; c.beginPath(); c.moveTo(src[0] + 50 * s, src[1]); c.lineTo(hub[0] - 50 * s, hub[1]);
    for (i = 0; i < 3; i++) { for (k = 0; k <= 24; k++) { p = curve(outs[i], k / 24); if (k) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } }
    c.stroke();
    c.fillStyle = CREAM;
    for (k = 0; k < 4; k++) { u = frac(t * .5 + k / 4); c.globalAlpha = Math.sin(u * Math.PI); c.fillRect(src[0] + 50 * s + u * (hub[0] - src[0] - 100 * s) - 5 * lw, src[1] - 5 * lw, 10 * lw, 10 * lw); }
    c.fillStyle = GOLD;
    for (i = 0; i < 3; i++) for (k = 0; k < 3; k++) { u = frac(t * .5 + k / 3 + i * .17); p = curve(outs[i], u); c.globalAlpha = Math.sin(u * Math.PI); c.fillRect(p[0] - 5 * lw, p[1] - 5 * lw, 10 * lw, 10 * lw); }
    c.globalAlpha = 1;
    c.fillStyle = BG; c.strokeStyle = CREAM; c.lineWidth = 2.6 * lw;
    box(c, src[0] - 50 * s, src[1] - 32 * s, 76 * s, 64 * s, 12 * s); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(src[0] + 26 * s, src[1] - 12 * s); c.lineTo(src[0] + 50 * s, src[1] - 26 * s); c.lineTo(src[0] + 50 * s, src[1] + 26 * s); c.lineTo(src[0] + 26 * s, src[1] + 12 * s); c.stroke();
    c.beginPath(); c.arc(src[0] - 12 * s, src[1], 16 * s, 0, TAU); c.stroke();
    c.strokeStyle = GOLD; box(c, hub[0] - 50 * s, hub[1] - 62 * s, 100 * s, 124 * s, 14 * s); c.fill(); c.stroke();
    c.strokeStyle = DIM; c.beginPath();
    for (i = 0; i < 3; i++) { c.moveTo(hub[0] - 30 * s, hub[1] - 28 * s + i * 28 * s); c.lineTo(hub[0] + 12 * s, hub[1] - 28 * s + i * 28 * s); }
    c.stroke();
    for (i = 0; i < 3; i++) { c.fillStyle = (Math.floor(t * 3) + i) % 3 ? GOLD : DIM; dot(c, hub[0] + 28 * s, hub[1] - 28 * s + i * 28 * s, 4 * lw); }
    for (i = 0; i < 3; i++) {
      p = outs[i]; c.fillStyle = BG; c.strokeStyle = CREAM; c.lineWidth = 2.4 * lw;
      box(c, p[0] - 44 * s, p[1] - 30 * s, 92 * s, 60 * s, 10 * s); c.fill(); c.stroke();
      c.fillStyle = GOLD; c.beginPath(); c.moveTo(p[0] - 6 * s, p[1] - 12 * s); c.lineTo(p[0] + 14 * s, p[1]); c.lineTo(p[0] - 6 * s, p[1] + 12 * s); c.closePath(); c.fill();
    }
  }

  /* Coding agents: a terminal working through plan, edit, test, and the loop it runs */
  function agent(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 0), s = f[2], lw = s * (bold || 1), i;
    w = f[0]; h = f[1];
    var x = w * .07, y = h * .13, ww = w * .86, wh = h * .74;
    win(c, x, y, ww, wh, 40 * s, s, lw);
    c.fillStyle = DIM; for (i = 0; i < 3; i++) dot(c, x + 22 * s + i * 18 * s, y + 20 * s, 5 * s);
    var lines = [["›", "plan", CREAM], ["›", "edit  2 files", CREAM], ["›", "run tests", CREAM], ["✓", "all passing", GOLD]],
      clock = (t * 1.6) % 9, ty, shown, str;
    for (i = 0; i < lines.length; i++) {
      shown = Math.max(0, Math.min(1, clock - i * 1.3)); if (!shown) break;
      ty = y + 90 * s + i * 52 * s; str = lines[i][1].slice(0, Math.ceil(lines[i][1].length * shown));
      text(c, lines[i][0], x + 28 * s, ty, mono(30 * s), i === 3 ? GOLD : MUTED);
      text(c, str, x + 62 * s, ty, mono(30 * s), lines[i][2]);
      if (shown < 1 && Math.floor(t * 3) % 2 === 0) { c.fillStyle = GOLD; c.fillRect(x + 66 * s + c.measureText(str).width, ty - 24 * s, 12 * s, 28 * s); }
    }
    var cx = x + ww - 70 * s, cy = y + wh * .66, rad = 40 * s, a = t * .8;
    c.strokeStyle = GOLD; c.lineWidth = 4 * lw; c.beginPath(); c.arc(cx, cy, rad, a, a + Math.PI * 1.65); c.stroke();
    var ex = cx + Math.cos(a + Math.PI * 1.65) * rad, ey = cy + Math.sin(a + Math.PI * 1.65) * rad, d = a + Math.PI * 1.65 + Math.PI / 2;
    c.fillStyle = GOLD; c.beginPath();
    c.moveTo(ex + Math.cos(d) * 16 * s, ey + Math.sin(d) * 16 * s);
    c.lineTo(ex + Math.cos(d + 2.4) * 12 * s, ey + Math.sin(d + 2.4) * 12 * s);
    c.lineTo(ex + Math.cos(d - 2.4) * 12 * s, ey + Math.sin(d - 2.4) * 12 * s); c.closePath(); c.fill();
  }

  function mix(a, b, u) { return a + (b - a) * u; }

  /* ManyCam and virtual devices: a webcam feeding a live frame with a picture-in-picture inset, and the same feed
     turning up in a call as one more camera */
  function webcam(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i;
    w = f[0]; h = f[1];
    var cx = w * .22, cy = h * .42;
    c.lineWidth = 2.6 * lw; c.strokeStyle = CREAM; c.fillStyle = BG;
    box(c, cx - 50 * s, cy - 40 * s, 100 * s, 80 * s, 28 * s); c.fill(); c.stroke();
    c.beginPath(); c.arc(cx, cy, 22 * s, 0, TAU); c.stroke();
    c.fillStyle = GOLD; dot(c, cx, cy, 8 * s);
    c.beginPath(); c.moveTo(cx, cy + 40 * s); c.lineTo(cx, cy + 86 * s); c.moveTo(cx - 34 * s, cy + 86 * s); c.lineTo(cx + 34 * s, cy + 86 * s); c.stroke();
    var fx = w * .46, fy = h * .12, fw = w * .46, fh = h * .34;
    box(c, fx, fy, fw, fh, 12 * s); c.stroke();
    c.strokeStyle = DIM; c.lineWidth = 2 * lw;
    c.beginPath(); c.arc(fx + fw * .34, fy + fh * .42, 20 * s, 0, TAU); c.stroke();
    c.beginPath(); c.arc(fx + fw * .34, fy + fh + 14 * s, 46 * s, Math.PI * 1.22, Math.PI * 1.78); c.stroke();
    box(c, fx + fw * .6, fy + fh * .54, fw * .32, fh * .34, 6 * s); c.fillStyle = BG; c.fill(); c.strokeStyle = GOLD; c.lineWidth = 2.4 * lw; c.stroke();
    c.fillStyle = Math.floor(t * 2) % 2 ? GOLD : gold(.35); dot(c, fx + 16 * s, fy + 16 * s, 6 * s);
    var gx = w * .46, gy = h * .58, gw = w * .46, gh = h * .3, tw = (gw - 10 * s) / 2, th = (gh - 10 * s) / 2;
    for (i = 0; i < 4; i++) {
      box(c, gx + (i % 2) * (tw + 10 * s), gy + (i >> 1) * (th + 10 * s), tw, th, 8 * s);
      c.strokeStyle = i === 0 ? GOLD : LINE; c.lineWidth = (i === 0 ? 2.4 : 1.6) * lw; c.stroke();
    }
    c.setLineDash([4 * lw, 6 * lw]); c.strokeStyle = gold(.5); c.lineWidth = 1.6 * lw; c.beginPath();
    c.moveTo(cx + 54 * s, cy - 12 * s); c.lineTo(fx - 8 * s, fy + fh * .5);
    c.moveTo(cx + 54 * s, cy + 12 * s); c.lineTo(gx - 8 * s, gy + th * .5);
    c.stroke(); c.setLineDash([]);
  }

  /* Krisp: a microphone, a voice going in buried in noise, and the same voice coming out clean */
  function voice(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i, x, y;
    w = f[0]; h = f[1];
    var mx = w * .15, my = h * .44;
    c.strokeStyle = CREAM; c.lineWidth = 2.6 * lw; c.fillStyle = BG;
    box(c, mx - 18 * s, my - 52 * s, 36 * s, 72 * s, 18 * s); c.fill(); c.stroke();
    c.beginPath(); c.arc(mx, my, 34 * s, .15 * Math.PI, .85 * Math.PI); c.stroke();
    c.beginPath(); c.moveTo(mx, my + 34 * s); c.lineTo(mx, my + 62 * s); c.moveTo(mx - 22 * s, my + 62 * s); c.lineTo(mx + 22 * s, my + 62 * s); c.stroke();
    var x0 = w * .32, x1 = w * .93, r = rng(8 + Math.floor(t * 12));
    // speech: a carrier under a syllable-like envelope, the same in both lines
    var speech = function (x) { var u = (x - x0) / (x1 - x0); return Math.sin((x - x0) / (13 * s) + t * 6) * Math.sin(Math.PI * u) * (.55 + .45 * Math.sin(u * 9 + t * 1.3)); };
    c.beginPath();
    for (x = x0; x <= x1; x += 4 * s) { y = h * .28 + speech(x) * 38 * s + (r() - .5) * 44 * s; if (x === x0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.strokeStyle = DIM; c.lineWidth = 1.6 * lw; c.stroke();
    c.beginPath();
    for (x = x0; x <= x1; x += 2 * s) { y = h * .72 + speech(x) * 40 * s; if (x === x0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.strokeStyle = CREAM; c.lineWidth = 3 * lw; c.stroke();
    box(c, w * .55, h * .455, w * .2, h * .09, 10 * s); c.fillStyle = BG; c.fill(); c.strokeStyle = GOLD; c.lineWidth = 2 * lw; c.stroke();
    c.fillStyle = GOLD; for (i = 0; i < 3; i++) dot(c, w * .6 + i * 16 * s, h * .5, 4 * s);
  }

  /* the traffic controller: a crossroads from above, its camera watching the approach, cars boxed as they are
     detected, and the signal it times */
  function intersection(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 0), s = f[2], lw = s * (bold || 1), i, u, x, y;
    w = f[0]; h = f[1];
    var cx = w * .5, cy = h * .54, rw = 96 * s, a = cx - rw / 2, b = cx + rw / 2, p = cy - rw / 2, q = cy + rw / 2;
    c.fillStyle = "rgba(255,236,210,.05)"; c.fillRect(0, p, w, rw); c.fillRect(a, 0, rw, h);
    c.strokeStyle = LINE; c.lineWidth = 1.8 * lw; c.beginPath();
    c.moveTo(0, p); c.lineTo(a, p); c.lineTo(a, 0); c.moveTo(b, 0); c.lineTo(b, p); c.lineTo(w, p);
    c.moveTo(0, q); c.lineTo(a, q); c.lineTo(a, h); c.moveTo(b, h); c.lineTo(b, q); c.lineTo(w, q); c.stroke();
    c.setLineDash([10 * s, 10 * s]); c.strokeStyle = DIM; c.lineWidth = 1.4 * lw; c.beginPath();
    c.moveTo(0, cy); c.lineTo(a - 6 * s, cy); c.moveTo(b + 6 * s, cy); c.lineTo(w, cy);
    c.moveTo(cx, 0); c.lineTo(cx, p - 6 * s); c.moveTo(cx, q + 6 * s); c.lineTo(cx, h); c.stroke(); c.setLineDash([]);
    // the camera's view: the eastbound approach
    var camx = a - 34 * s, camy = p - 44 * s;
    c.fillStyle = gold(.07); c.beginPath(); c.moveTo(camx, camy); c.lineTo(0, q + 6 * s); c.lineTo(a - 4 * s, q + 6 * s); c.closePath(); c.fill();
    var car = function (x, y, vert) {
      var cw = (vert ? 20 : 38) * s, ch = (vert ? 38 : 20) * s;
      c.fillStyle = cream(.85); box(c, x - cw / 2, y - ch / 2, cw, ch, 5 * s); c.fill();
      return [x - cw / 2, y - ch / 2, cw, ch];
    };
    for (i = 0; i < 3; i++) {
      u = frac(t * .09 + i / 3); x = -40 * s + u * (w + 80 * s); y = cy + rw / 4;
      var bb = car(x, y, false);
      if (x > 12 * s && x < a - 24 * s) { c.setLineDash([4 * lw, 4 * lw]); c.strokeStyle = GOLD; c.lineWidth = 1.6 * lw; c.strokeRect(bb[0] - 6 * s, bb[1] - 6 * s, bb[2] + 12 * s, bb[3] + 12 * s); c.setLineDash([]); }
    }
    u = frac(t * .07 + .5); car(cx - rw / 4, -40 * s + u * (h + 80 * s), true);
    c.fillStyle = BG; c.strokeStyle = CREAM; c.lineWidth = 2.2 * lw;
    box(c, camx - 16 * s, camy - 10 * s, 32 * s, 20 * s, 5 * s); c.fill(); c.stroke();
    c.fillStyle = GOLD; dot(c, camx + 8 * s, camy, 4 * s);
    var sx = b + 22 * s, sy = p - 104 * s, lit = Math.floor(t * .6) % 3;
    box(c, sx, sy, 34 * s, 84 * s, 9 * s); c.fillStyle = BG; c.fill(); c.strokeStyle = CREAM; c.stroke();
    for (i = 0; i < 3; i++) { c.fillStyle = i === lit ? GOLD : "rgba(255,236,210,.14)"; dot(c, sx + 17 * s, sy + 16 * s + i * 26 * s, 9 * s); }
  }

  /* IoT: stores and a solar plant send readings over MQTT to a broker, which feeds the summaries */
  function iot(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i, u;
    w = f[0]; h = f[1];
    var hub = [w * .57, h * .5], sites = [[w * .15, h * .2], [w * .15, h * .43], [w * .15, h * .66], [w * .3, h * .86]];
    c.strokeStyle = LINE; c.lineWidth = 1.8 * lw; c.beginPath();
    sites.forEach(function (p) { c.moveTo(p[0] + 34 * s, p[1]); c.lineTo(hub[0] - 36 * s, hub[1]); });
    c.moveTo(hub[0] + 36 * s, hub[1]); c.lineTo(w * .76, hub[1]); c.stroke();
    sites.forEach(function (p, k) {
      u = frac(t * .45 + k * .27); c.globalAlpha = Math.sin(u * Math.PI); c.fillStyle = GOLD;
      c.fillRect(mix(p[0] + 34 * s, hub[0] - 36 * s, u) - 5 * lw, mix(p[1], hub[1], u) - 5 * lw, 10 * lw, 10 * lw);
    });
    c.globalAlpha = 1;
    c.strokeStyle = CREAM; c.lineWidth = 2.4 * lw; c.fillStyle = BG;
    for (i = 0; i < 3; i++) { // three shopfronts, each with its camera sensor
      var p = sites[i];
      c.beginPath(); c.moveTo(p[0] - 30 * s, p[1] - 4 * s); c.lineTo(p[0], p[1] - 28 * s); c.lineTo(p[0] + 30 * s, p[1] - 4 * s); c.closePath(); c.fill(); c.stroke();
      box(c, p[0] - 24 * s, p[1] - 4 * s, 48 * s, 32 * s, 3 * s); c.fill(); c.stroke();
      c.fillStyle = GOLD; dot(c, p[0] + 12 * s, p[1] + 8 * s, 4 * s); c.fillStyle = BG;
    }
    var sp = sites[3]; // the solar panel
    c.beginPath(); c.moveTo(sp[0] - 34 * s, sp[1] + 14 * s); c.lineTo(sp[0] - 18 * s, sp[1] - 16 * s); c.lineTo(sp[0] + 34 * s, sp[1] - 16 * s); c.lineTo(sp[0] + 18 * s, sp[1] + 14 * s); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = DIM; c.lineWidth = 1.2 * lw; c.beginPath();
    c.moveTo(sp[0] - 26 * s, sp[1] - 1 * s); c.lineTo(sp[0] + 26 * s, sp[1] - 1 * s); c.moveTo(sp[0], sp[1] - 16 * s); c.lineTo(sp[0] - 8 * s, sp[1] + 14 * s); c.stroke();
    c.strokeStyle = GOLD; c.lineWidth = 2.6 * lw; c.beginPath(); c.arc(hub[0], hub[1], 36 * s, 0, TAU); c.fill(); c.stroke();
    c.strokeStyle = DIM; c.lineWidth = 2 * lw; c.beginPath();
    for (i = 0; i < 3; i++) { c.moveTo(hub[0] - 16 * s, hub[1] - 10 * s + i * 10 * s); c.lineTo(hub[0] + (6 + 10 * (i % 2)) * s, hub[1] - 10 * s + i * 10 * s); }
    c.stroke();
    for (i = 0; i < 4; i++) { // the summaries
      var bh = (34 + 30 * (.5 + .5 * Math.sin(t * .8 + i * 1.7))) * s;
      c.fillStyle = i === 3 ? GOLD : CREAM; c.fillRect(w * .79 + i * 18 * s, hub[1] + 40 * s - bh, 11 * s, bh);
    }
  }

  /* the VPN: a laptop and a server joined by a tunnel, a lock over it, packets riding inside */
  function tunnel(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i, u;
    w = f[0]; h = f[1];
    var y = h * .52, x0 = w * .28, x1 = w * .72;
    c.setLineDash([2 * lw, 8 * lw]); c.strokeStyle = LINE; c.lineWidth = 1.6 * lw; c.beginPath(); // the open internet around it
    c.moveTo(x0, y - 40 * s); c.bezierCurveTo(w * .4, y - 170 * s, w * .6, y + 20 * s, x1, y - 40 * s);
    c.moveTo(x0, y + 40 * s); c.bezierCurveTo(w * .42, y + 160 * s, w * .58, y - 10 * s, x1, y + 40 * s); c.stroke(); c.setLineDash([]);
    c.fillStyle = "rgba(255,236,210,.04)"; c.fillRect(x0, y - 22 * s, x1 - x0, 44 * s);
    c.strokeStyle = CREAM; c.lineWidth = 2.6 * lw; c.beginPath();
    c.moveTo(x0, y - 22 * s); c.lineTo(x1, y - 22 * s); c.moveTo(x0, y + 22 * s); c.lineTo(x1, y + 22 * s); c.stroke();
    c.strokeStyle = GOLD; c.lineWidth = 2 * lw;
    c.beginPath(); c.ellipse(x0, y, 8 * s, 22 * s, 0, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(x1, y, 8 * s, 22 * s, 0, 0, TAU); c.stroke();
    for (i = 0; i < 6; i++) { u = frac(t * .35 + i / 6); c.globalAlpha = Math.sin(u * Math.PI); c.fillStyle = GOLD; c.fillRect(mix(x0, x1, u) - 7 * lw, y - 5 * lw, 14 * lw, 10 * lw); }
    c.globalAlpha = 1;
    var lx = w * .5, ly = y - 66 * s; // the lock over the middle
    c.strokeStyle = GOLD; c.lineWidth = 2.6 * lw; c.beginPath(); c.arc(lx, ly - 4 * s, 12 * s, Math.PI, 0); c.stroke();
    box(c, lx - 18 * s, ly - 4 * s, 36 * s, 28 * s, 5 * s); c.fillStyle = BG; c.fill(); c.stroke();
    c.fillStyle = GOLD; dot(c, lx, ly + 9 * s, 3.5 * s);
    c.strokeStyle = CREAM; c.lineWidth = 2.4 * lw; c.fillStyle = BG; // the laptop
    box(c, x0 - 104 * s, y - 36 * s, 76 * s, 50 * s, 6 * s); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x0 - 114 * s, y + 24 * s); c.lineTo(x0 - 18 * s, y + 24 * s); c.lineTo(x0 - 26 * s, y + 14 * s); c.lineTo(x0 - 106 * s, y + 14 * s); c.closePath(); c.stroke();
    box(c, x1 + 26 * s, y - 52 * s, 62 * s, 104 * s, 8 * s); c.fill(); c.stroke(); // the server
    c.strokeStyle = DIM; c.lineWidth = 1.6 * lw; c.beginPath();
    for (i = 0; i < 3; i++) { c.moveTo(x1 + 38 * s, y - 30 * s + i * 30 * s); c.lineTo(x1 + 66 * s, y - 30 * s + i * 30 * s); }
    c.stroke();
    for (i = 0; i < 3; i++) { c.fillStyle = (Math.floor(t * 3) + i) % 3 ? GOLD : DIM; dot(c, x1 + 77 * s, y - 30 * s + i * 30 * s, 3.5 * lw); }
  }

  /* secure file sharing: files cut into chunks, only the changed chunks going on, through the lock, to the partners */
  function vault(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i, u;
    w = f[0]; h = f[1];
    var doc = function (x, y, lit) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 40 * s, y); c.lineTo(x + 54 * s, y + 14 * s); c.lineTo(x + 54 * s, y + 70 * s); c.lineTo(x, y + 70 * s); c.closePath();
      c.fillStyle = BG; c.fill(); c.strokeStyle = lit ? CREAM : DIM; c.lineWidth = 2.2 * lw; c.stroke();
      c.strokeStyle = LINE; c.lineWidth = 1.4 * lw; c.beginPath();
      for (var k = 0; k < 3; k++) { c.moveTo(x + 10 * s, y + 30 * s + k * 12 * s); c.lineTo(x + 44 * s, y + 30 * s + k * 12 * s); }
      c.stroke();
    };
    doc(w * .06, h * .2, false); doc(w * .1, h * .3, false); doc(w * .14, h * .4, true);
    var gx = w * .32, gy = h * .3; // the chunks, a few of them changed
    for (i = 0; i < 12; i++) {
      var ch = i === 2 || i === 7 || i === 9, x = gx + (i % 3) * 22 * s, y = gy + (i / 3 | 0) * 22 * s;
      c.fillStyle = ch ? GOLD : "rgba(255,236,210,.16)"; c.fillRect(x, y, 16 * s, 16 * s);
    }
    var lx = w * .6, ly = h * .52; // the lock
    c.strokeStyle = GOLD; c.lineWidth = 3 * lw; c.beginPath(); c.arc(lx, ly - 18 * s, 22 * s, Math.PI, 0); c.stroke();
    box(c, lx - 32 * s, ly - 18 * s, 64 * s, 52 * s, 8 * s); c.fillStyle = BG; c.fill(); c.stroke();
    c.fillStyle = GOLD; dot(c, lx, ly + 4 * s, 5 * s); c.fillRect(lx - 2 * s, ly + 6 * s, 4 * s, 12 * s);
    for (i = 0; i < 3; i++) { // the changed chunks travelling through it
      u = frac(t * .4 + i / 3); c.globalAlpha = Math.sin(u * Math.PI); c.fillStyle = GOLD;
      c.fillRect(mix(gx + 70 * s, w * .8, u) - 6 * s, mix(gy + 40 * s, h * .52, u) - 6 * s, 12 * s, 12 * s);
    }
    c.globalAlpha = 1;
    c.strokeStyle = CREAM; c.lineWidth = 2.2 * lw; c.fillStyle = BG; // two partners' screens
    for (i = 0; i < 2; i++) {
      var sy = h * .34 + i * h * .26;
      box(c, w * .8, sy, 66 * s, 44 * s, 6 * s); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(w * .8 + 33 * s, sy + 44 * s); c.lineTo(w * .8 + 33 * s, sy + 56 * s); c.moveTo(w * .8 + 18 * s, sy + 56 * s); c.lineTo(w * .8 + 48 * s, sy + 56 * s); c.stroke();
    }
  }

  /* CAM: a plate with a pocket cleared by offset passes, a row of drilled holes, and the cutter working its way round */
  function toolpath(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i;
    w = f[0]; h = f[1];
    box(c, w * .1, h * .14, w * .8, h * .72, 26 * s); c.fillStyle = "rgba(255,236,210,.03)"; c.fill(); c.strokeStyle = CREAM; c.lineWidth = 2.6 * lw; c.stroke();
    var px = w * .2, py = h * .24, pw = w * .6, ph = h * .34;
    for (i = 0; i < 6; i++) { // offset passes, outermost first
      var o = i * 15 * s;
      if (pw - 2 * o < 10 * s || ph - 2 * o < 10 * s) break;
      box(c, px + o, py + o, pw - 2 * o, ph - 2 * o, Math.max(4 * s, 24 * s - o * .6));
      if (i) c.setLineDash([6 * lw, 5 * lw]);
      c.strokeStyle = i ? DIM : GOLD; c.lineWidth = (i ? 1.5 : 2.4) * lw; c.stroke(); c.setLineDash([]);
    }
    for (i = 0; i < 5; i++) { // drilled holes
      var hx = w * .22 + i * w * .14, hy = h * .73;
      c.strokeStyle = CREAM; c.lineWidth = 2 * lw; c.beginPath(); c.arc(hx, hy, 9 * s, 0, TAU); c.stroke();
      c.strokeStyle = DIM; c.lineWidth = 1.2 * lw; c.beginPath(); c.moveTo(hx - 15 * s, hy); c.lineTo(hx + 15 * s, hy); c.moveTo(hx, hy - 15 * s); c.lineTo(hx, hy + 15 * s); c.stroke();
    }
    var per = 2 * (pw + ph), d = frac(t * .07) * per, cx, cy; // the cutter, riding the outer pass
    if (d < pw) { cx = px + d; cy = py; } else if (d < pw + ph) { cx = px + pw; cy = py + d - pw; } else if (d < 2 * pw + ph) { cx = px + pw - (d - pw - ph); cy = py + ph; } else { cx = px; cy = py + ph - (d - 2 * pw - ph); }
    c.fillStyle = BG; c.strokeStyle = GOLD; c.lineWidth = 2.6 * lw; c.beginPath(); c.arc(cx, cy, 11 * s, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = GOLD; dot(c, cx, cy, 3.5 * s);
  }

  /* the lakehouse: events streaming in from the sources, landing raw, refined, and served from the gold layer */
  function lake(c, w, h, t, bold) {
    var f = frame(c, w, h, 480, 480, 48), s = f[2], lw = s * (bold || 1), i, u;
    w = f[0]; h = f[1];
    var srcs = [h * .22, h * .44, h * .66];
    c.strokeStyle = CREAM; c.lineWidth = 2.2 * lw; c.fillStyle = BG;
    srcs.forEach(function (y) { // three sources, as small cylinders
      var x = w * .12;
      c.beginPath(); c.ellipse(x, y - 14 * s, 22 * s, 7 * s, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 22 * s, y - 14 * s); c.lineTo(x - 22 * s, y + 14 * s); c.ellipse(x, y + 14 * s, 22 * s, 7 * s, 0, Math.PI, 0, true); c.lineTo(x + 22 * s, y - 14 * s); c.stroke();
    });
    var lx = w * .42, lw2 = w * .5, layers = [[h * .7, "rgba(255,236,210,.2)"], [h * .5, cream(.55)], [h * .3, GOLD]];
    layers.forEach(function (L, k) {
      box(c, lx, L[0] - 18 * s, lw2, 36 * s, 12 * s); c.fillStyle = k === 2 ? gold(.14) : "rgba(255,236,210,.04)"; c.fill();
      c.strokeStyle = L[1]; c.lineWidth = (k === 2 ? 2.6 : 2) * lw; c.stroke();
    });
    c.strokeStyle = DIM; c.lineWidth = 1.6 * lw; c.beginPath(); // up through the layers
    for (i = 0; i < 2; i++) { var ax = lx + lw2 * (.3 + i * .4); c.moveTo(ax, layers[i][0] - 22 * s); c.lineTo(ax, layers[i + 1][0] + 22 * s); c.moveTo(ax - 6 * s, layers[i + 1][0] + 30 * s); c.lineTo(ax, layers[i + 1][0] + 22 * s); c.lineTo(ax + 6 * s, layers[i + 1][0] + 30 * s); }
    c.stroke();
    for (i = 0; i < 9; i++) { // events landing in the raw layer
      u = frac(t * .5 + i / 9); var y0 = srcs[i % 3];
      c.globalAlpha = Math.sin(u * Math.PI); c.fillStyle = i % 3 ? CREAM : GOLD;
      c.fillRect(mix(w * .12 + 26 * s, lx + 14 * s, u) - 4 * lw, mix(y0, layers[0][0], u) - 4 * lw, 8 * lw, 8 * lw);
    }
    c.globalAlpha = 1;
    for (i = 0; i < 5; i++) { // served
      var bh = (18 + 26 * (.5 + .5 * Math.sin(t * .7 + i * 1.3))) * s;
      c.fillStyle = i === 4 ? GOLD : CREAM; c.fillRect(lx + lw2 * .2 + i * 22 * s, h * .3 - 30 * s - bh, 12 * s, bh);
    }
  }

  return { pulse: pulse, runtime: runtime, dashboard: dashboard, mastering: mastering, robot: robot, stream: stream, agent: agent,
    webcam: webcam, voice: voice, intersection: intersection, iot: iot, tunnel: tunnel, vault: vault, toolpath: toolpath, lake: lake, bvp: bvp };
})();
