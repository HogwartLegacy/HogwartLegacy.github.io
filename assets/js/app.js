/* ==========================================================================
   Page behaviour. Renders content.js into the page (hero, résumé, filters,
   shelves of work, notes, footer) and wires the theme, the résumé sheet, the
   filters and the scroll veil. No framework and no build step.
   ========================================================================== */
(function () {
  "use strict";
  var S = window.SITE;
  if (!S) return;
  var doc = document, root = doc.documentElement, L = S.links || {}, N = S.notes && S.notes.cards && S.notes.cards.length ? S.notes : null;
  function mq(q) { return !!(window.matchMedia && matchMedia(q).matches); }
  var reduce = mq("(prefers-reduced-motion: reduce)"), canHover = mq("(hover: hover)") && !reduce;

  function $(sel, el) { return (el || doc).querySelector(sel); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function icon(id) { return '<svg class="i" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function link(u) { return ' href="' + esc(u) + '"' + (/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ""); }
  function bvp(p) { return Math.exp(-Math.pow((p - .2) / .07, 2)) + .36 * Math.exp(-Math.pow((p - .45) / .09, 2)); }
  function path(f, x0, x1) { for (var d = "", x = x0; x <= x1; x += 2) d += (x > x0 ? "L" : "M") + x + " " + f(x).toFixed(1); return d; }

  /* ---------- hero ---------- */
  doc.title = S.name + (S.role ? " · " + S.role : "");
  $("#brand-name").textContent = S.name;
  var n = 0;
  // letters are inline-blocks so they can resolve one by one; each word stays whole so the name only breaks at a space
  $("#name").innerHTML = '<span class="sr-only">' + esc(S.name) + '</span><span aria-hidden="true">' + S.name.split(/\s+/).map(function (w) {
    return '<span class="word">' + Array.from(w).map(function (ch) { return '<span class="ltr" style="--i:' + (n++) + '">' + esc(ch) + "</span>"; }).join("") + "</span>";
  }).join(" ") + "</span>";
  var trace = path(function (x) { return 14 - 11 * bvp((x / 30) % 1); }, 0, 60);
  if (S.role || S.focus) $("#alt").innerHTML = '<svg class="pulse" viewBox="0 0 60 18" aria-hidden="true"><path class="base" d="' + trace + '"/><path class="run" pathLength="100" d="' + trace + '"/></svg>' +
    (S.role ? '<span class="role">' + esc(S.role) + "</span>" : "") + (S.role && S.focus ? '<span class="sep" aria-hidden="true"></span>' : "") + (S.focus ? '<span class="focus">' + esc(S.focus) + "</span>" : "");
  else $("#alt").remove();
  $("#bio").innerHTML = S.bio || "";

  var pills = [];
  [["github", "i-gh", "GitHub"], ["linkedin", "i-in", "LinkedIn"], ["scholar", "i-cap", "Google Scholar"], ["x", "i-xlogo", "X"]].forEach(function (p) {
    if (L[p[0]]) pills.push('<a class="pill"' + link(L[p[0]]) + ">" + icon(p[1]) + p[2] + "</a>");
  });
  pills.push('<button class="pill" id="resume-toggle" type="button" aria-controls="resume" aria-expanded="false">' + icon("i-doc") + "Résumé</button>");
  if (S.email) pills.push('<a class="pill" href="mailto:' + esc(S.email) + '" title="' + esc(S.email) + '">' + icon("i-mail") + "Contact</a>");
  if (L.book) pills.push('<a class="pill"' + link(L.book) + ">" + icon("i-cal") + "Book a call</a>");
  $("#pills").innerHTML = pills.join("");

  var top = ['<a href="#work">Work</a>'];
  if (N) top.push('<a href="#' + esc(N.id || "notes") + '">' + esc(N.title) + "</a>");
  top.push('<a href="#resume" data-open-resume>Résumé</a>');
  if (S.email) top.push('<a href="mailto:' + esc(S.email) + '">Contact</a>');
  $("#nav-links").innerHTML = top.join("");

  /* ---------- résumé ---------- */
  var R = S.resume || {}, k = 0, left = "", right = "";
  // entries rise in a short cascade when the sheet opens (--i)
  function cs(cls) { return ' class="' + (cls ? cls + " " : "") + 'cascade" style="--i:' + (k++) + '"'; }
  if ((R.experience || []).length) left = "<h3" + cs("sheet-head") + ">" + icon("i-brief") + 'Experience</h3><ol class="posts">' + R.experience.map(function (e, i) {
    var pts = e.points || [], id = "cv-" + i, open = i === 0,
      head = '<span class="top"><span class="org">' + esc(e.org) + '</span><span class="when">' + esc(e.when) +
        (pts.length ? '<svg class="i caret" aria-hidden="true"><use href="#i-chev"/></svg>' : "") + "</span></span>" + (e.role ? '<span class="role">' + esc(e.role) + "</span>" : "");
    return "<li" + cs("post") + ">" + (pts.length
      ? '<button class="post-head" type="button" aria-expanded="' + open + '" aria-controls="' + id + '">' + head + "</button>" +
        '<div class="post-body' + (open ? " open" : "") + '" id="' + id + '"' + (open ? "" : " inert") + "><div><ul>" + pts.map(function (p) { return "<li>" + p + "</li>"; }).join("") + "</ul></div></div>"
      : '<div class="post-head plain">' + head + "</div>") + "</li>";
  }).join("") + "</ol>";
  if ((R.education || []).length) right += "<h3" + cs("sheet-head") + ">" + icon("i-cap") + 'Education</h3><ul class="sheet-list">' + R.education.map(function (e) {
    return "<li" + cs("") + '><span class="top"><strong>' + esc(e.degree) + '</strong><span class="when">' + esc(e.when) + "</span></span>" + esc(e.school) + "</li>";
  }).join("") + "</ul>";
  if ((R.skills || []).length) right += "<h3" + cs("sheet-head") + ">" + icon("i-spark") + 'Skills</h3><ul class="skills">' + R.skills.map(function (g) {
    return "<li" + cs("") + "><h4>" + icon("s-" + (g.icon || "chip")) + esc(g.name) + "</h4><p>" + (g.items || []).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</p></li>";
  }).join("") + "</ul>";
  $("#cv-left").innerHTML = left || right;
  $("#cv-right").innerHTML = left ? right : "";
  if (L.resumePdf) $("#sheet-tools").innerHTML = '<a class="pill" href="' + esc(L.resumePdf) + '" download>' + icon("i-down") + "Download PDF</a>";

  var resume = $("#resume"), toggle = $("#resume-toggle");
  function isOpen() { return resume.classList.contains("open"); }
  function setResume(open, focus) {
    if (open !== isOpen()) {
      resume.classList.toggle("open", open); root.classList.toggle("resume-open", open);
      if (open) resume.removeAttribute("inert"); else resume.setAttribute("inert", "");
      toggle.setAttribute("aria-expanded", String(open));
    }
    if (!focus) return;
    if (!open) { toggle.focus({ preventScroll: true }); return; }
    // bring the sheet up when it opened low on the screen, or above it (from the footer)
    setTimeout(function () {
      var r = resume.getBoundingClientRect();
      if (r.top < 0 || r.top > innerHeight * .55) window.scrollTo({ top: scrollY + r.top - 20, behavior: reduce ? "auto" : "smooth" });
      $("#resume-title").focus({ preventScroll: true });
    }, 80);
  }
  toggle.addEventListener("click", function () { setResume(!isOpen(), true); });
  $(".sheet-close").addEventListener("click", function () { setResume(false, true); });
  resume.addEventListener("keydown", function (e) { if (e.key === "Escape") setResume(false, true); });
  resume.addEventListener("click", function (e) {
    var b = e.target.closest(".post-head:not(.plain)");
    if (!b) return;
    var body = doc.getElementById(b.getAttribute("aria-controls")), open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open)); body.classList.toggle("open", open);
    if (open) body.removeAttribute("inert"); else body.setAttribute("inert", "");
  });
  doc.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-open-resume]")) { e.preventDefault(); setResume(true, true); }
  });
  if (location.hash === "#resume") setResume(true, false);
  window.addEventListener("hashchange", function () { if (location.hash === "#resume") setResume(true, true); });

  /* ---------- shelves of work ---------- */
  var FIL = S.filters || [], LABEL = {}, shelves = $("#shelves"), bar = $("#filters"), shown = [], paints = [];
  FIL.forEach(function (f) { LABEL[f[0]] = f[1]; });
  // line weight per layout: thumbnails are small, so their lines are drawn bolder
  var BOLD = { cards: 1.2, compact: 1.9 }, DPR = Math.min(window.devicePixelRatio || 1, 2), painters = new Map();
  // each drawn cover is sized to the box it shows in (and redrawn when that changes), so nothing is cropped or stretched
  function fit(cv) {
    var w = Math.round(cv.clientWidth * DPR), h = Math.round(cv.clientHeight * DPR);
    if (!w || !h || (w === cv.width && h === cv.height)) return false;
    cv.width = w; cv.height = h;
    return true;
  }
  var sizer = window.ResizeObserver ? new ResizeObserver(function (es) {
    es.forEach(function (e) { if (fit(e.target)) painters.get(e.target)(); });
  }) : null;
  function tagIcon(t) { return doc.getElementById("t-" + t) ? "t-" + t : "t-dot"; }
  function tagList(p) {
    return p.tags && p.tags.length ? '<div class="tags">' + p.tags.map(function (t) {
      var l = esc(LABEL[t] || t);
      return '<span class="tag" title="' + l + '">' + icon(tagIcon(t)) + '<span class="tag-label">' + l + "</span></span>";
    }).join("") + "</div>" : "";
  }
  function cardLinks(p) {
    return (p.repo ? "<a" + link(p.repo) + ' aria-label="' + esc(p.name) + ' source on GitHub">' + icon("i-gh") + "</a>" : "") +
      (p.url ? "<a" + link(p.url) + ' aria-label="Open ' + esc(p.name) + '">' + icon("i-out") + "</a>" : "");
  }
  function art(p, layout) {
    var m = "", href = p.url || p.repo, cls = layout === "compact" ? "thumb" : "cover";
    if (p.cover) m = '<img src="' + esc(p.cover) + '" alt="" loading="lazy" decoding="async"' + (p.focus ? ' style="object-position:' + esc(p.focus) + '"' : "") + ">";
    else if (window.COVERS && COVERS[p.art]) m = '<canvas width="960" height="540"></canvas>';
    if (!m) return "";
    if (p.video) m += '<video muted loop playsinline preload="none" aria-hidden="true"></video>';
    // the art repeats the card's own link, so it stays out of the tab order
    return href ? '<a class="' + cls + '"' + link(href) + ' tabindex="-1" aria-hidden="true">' + m + "</a>" : '<div class="' + cls + '">' + m + "</div>";
  }
  function card(p, layout) {
    return art(p, layout) + '<div class="card-body"><div class="card-head"><h3>' + esc(p.name) + '</h3><div class="card-links">' + cardLinks(p) + "</div></div>" +
      (p.meta ? '<p class="meta">' + esc(p.meta) + "</p>" : "") + "<p>" + (p.text || "") + "</p>" + tagList(p) + "</div>";
  }
  // a drawn cover sits still at its own moment (`t`) and plays on hover, picking up where it stopped
  function wire(el, p, layout) {
    var cv = $("canvas", el), v = $("video", el), bold = BOLD[layout];
    if (cv) {
      var fn = COVERS[p.art], c = cv.getContext("2d"), t0 = p.t || 0, age = 0, raf = 0, start = 0;
      var paint = function () { try { fn(c, cv.width, cv.height, t0 + age, bold); } catch (err) { /* a broken drawing must not take the page down */ } };
      var tick = function (now) { age = (now - start) / 1000; paint(); raf = requestAnimationFrame(tick); };
      paints.push(paint); painters.set(cv, paint);
      if (sizer) sizer.observe(cv);
      if (canHover && !v) {
        el.addEventListener("mouseenter", function () { if (!raf) { start = performance.now() - age * 1000; raf = requestAnimationFrame(tick); } });
        el.addEventListener("mouseleave", function () { cancelAnimationFrame(raf); raf = 0; });
      }
    }
    // a `video` is a short loop of the real thing: the still shows until hover, then the loop loads, starts and fades in
    if (v && canHover) {
      var out = 0;
      el.addEventListener("mouseenter", function () { clearTimeout(out); if (!v.src) v.src = p.video; v.play().then(function () { v.classList.add("on"); }).catch(function () {}); });
      el.addEventListener("mouseleave", function () { v.classList.remove("on"); out = setTimeout(function () { v.pause(); v.currentTime = 0; }, 320); });
    }
  }
  (S.sections || []).forEach(function (s) {
    var items = (S.projects || []).filter(function (p) { return p.section === s.id; });
    if (!items.length) return;
    var layout = s.layout === "compact" ? "compact" : "cards", sec = doc.createElement("section"), cards = [];
    sec.className = "shelf shelf-" + layout; sec.id = s.id; sec.setAttribute("aria-labelledby", s.id + "-title");
    sec.innerHTML = '<div class="shelf-head"><h2 id="' + esc(s.id) + '-title">' + esc(s.title) + '</h2><span class="count"></span>' + (s.note ? "<p>" + s.note + "</p>" : "") + '</div><div class="grid"></div>';
    items.forEach(function (p, i) {
      var el = doc.createElement("article");
      el.className = "card glass l-" + layout; el.style.setProperty("--d", i); el.innerHTML = card(p, layout);
      $(".grid", sec).appendChild(el); wire(el, p, layout);
      cards.push({ el: el, tags: p.tags || [] });
    });
    shelves.appendChild(sec);
    shown.push({ sec: sec, cards: cards, unit: s.unit || "projects", count: $(".count", sec) });
  });

  /* ---------- filters: hide the cards without the tag, and any shelf left empty; each head counts what is left ---------- */
  var used = {}, total = 0, note = doc.createElement("p");
  shown.forEach(function (x) { x.cards.forEach(function (c) { total++; c.tags.forEach(function (t) { used[t] = 1; }); }); });
  note.className = "filter-note"; note.setAttribute("aria-live", "polite");
  function unit(x, c) { return c === 1 ? x.unit.replace(/s$/, "") : x.unit; }
  function apply(f) {
    var seen = 0;
    shown.forEach(function (x) {
      var c = 0;
      x.cards.forEach(function (card) {
        var on = f === "all" || card.tags.indexOf(f) > -1;
        if (on && card.el.hidden) { card.el.classList.remove("pop"); void card.el.offsetWidth; card.el.classList.add("pop"); }
        card.el.hidden = !on; if (on) c++;
      });
      x.sec.hidden = !c; seen += c;
      x.count.textContent = f === "all" ? c + " " + unit(x, c) : c + " of " + x.cards.length;
    });
    note.textContent = seen + " of " + total + " shown";
    [].forEach.call(bar.querySelectorAll(".chip"), function (b) { b.setAttribute("aria-pressed", b.dataset.filter === f ? "true" : "false"); });
  }
  var chips = FIL.filter(function (f) { return f[0] === "all" || used[f[0]]; });
  if (chips.length > 2) { // "All" and at least two kinds, or there is nothing to choose between
    chips.forEach(function (f) {
      var b = doc.createElement("button");
      b.type = "button"; b.className = "chip"; b.dataset.filter = f[0]; b.innerHTML = icon(tagIcon(f[0])) + esc(f[1]);
      b.addEventListener("click", function () { apply(f[0]); });
      bar.appendChild(b);
    });
    bar.appendChild(note);
  }
  if (shown.length) apply("all");

  /* ---------- notes: line drawings of each subject ---------- */
  var ART = {
    // a pulse as the oximeter saw it (dashed) and as the camera read it (lit)
    waves: function () {
      var ref = path(function (x) { return 100 - 60 * bvp(((x - 20) / 93) % 1); }, 20, 300),
        est = path(function (x) { return 100 - 60 * bvp((((x - 23) / 93) % 1 + 1) % 1) * (.95 + .05 * Math.sin(x * .3)) + 1.3 * Math.sin(x * .9); }, 20, 300);
      return '<svg viewBox="0 0 320 140" aria-hidden="true"><path class="ln" d="M20 112H300"/><path class="ref" d="' + ref + '"/><path class="lit" d="' + est + '"/>' +
        '<text x="20" y="130">reference</text><text x="300" y="130" text-anchor="end">camera</text></svg>';
    },
    // a device with its chip, and the cloud it never needs
    device: function () {
      return '<svg viewBox="0 0 320 140" aria-hidden="true"><rect class="lit" x="60" y="16" width="66" height="108" rx="12"/><path class="ln" d="M84 25h18"/>' +
        '<rect class="node" x="79" y="56" width="28" height="28" rx="4"/><rect class="gold" x="88" y="65" width="10" height="10" rx="1.5"/>' +
        '<path class="ln" d="M85 51v5M93 51v5M101 51v5M85 84v5M93 84v5M101 84v5M74 62h5M74 70h5M74 78h5M107 62h5M107 70h5M107 78h5"/>' +
        '<path class="dash" d="M136 70H208"/><path class="lit" d="M165 63l14 14M179 63l-14 14"/>' +
        '<path class="frame" d="M222 92h52a16 16 0 0 0 1-32 24 24 0 0 0-45-5 18 18 0 0 0-8 37z"/></svg>';
    },
    // many thin dependencies on the left, a few strong ones on the right
    stack: function () {
      var s = '<svg viewBox="0 0 320 140" aria-hidden="true">', i, a = [62, 40, 78, 52, 30, 70, 46, 84, 36, 58, 44, 72, 28, 54], b = [56, 40, 64, 34, 48, 60, 42];
      for (i = 0; i < a.length; i++) s += '<path class="ln" d="M28 ' + (18 + i * 7) + "h" + a[i] + '"/>';
      s += '<path class="ln" d="M142 66h30M164 59l8 7-8 7"/>';
      for (i = 0; i < b.length; i++) s += '<path class="bar" d="M202 ' + (24 + i * 14) + "h" + b[i] + '"/>';
      return s + '<text x="28" y="130">6.3 MB</text><text x="202" y="130">7 deps</text></svg>';
    }
  };
  if (N) {
    var ns = doc.createElement("section"), id = N.id || "notes";
    ns.className = "shelf shelf-notes"; ns.id = id; ns.setAttribute("aria-labelledby", id + "-title");
    ns.innerHTML = '<div class="shelf-head"><h2 id="' + esc(id) + '-title">' + esc(N.title) + "</h2>" + (N.intro ? "<p>" + N.intro + "</p>" : "") + '</div><div class="grid">' +
      N.cards.map(function (c, i) {
        return '<article class="card glass l-notes" style="--d:' + i + '">' + (ART[c.art] ? '<div class="note-art">' + ART[c.art]() + "</div>" : "") +
          '<div class="card-body"><span class="kicker">' + icon("k-" + (c.icon || "gem")) + esc(c.kicker) + "</span><h3>" + esc(c.title) + "</h3><p>" + c.text + "</p>" +
          (c.links && c.links.length ? '<ul class="note-links">' + c.links.map(function (l) {
            return "<li><a" + link(l.url) + ">" + (l.label ? '<span class="lbl">' + esc(l.label) + "</span>" : "") + esc(l.text) + icon("i-out") + "</a></li>";
          }).join("") + "</ul>" : "") + "</div></article>";
      }).join("") + "</div>";
    shelves.appendChild(ns);
  }

  /* ---------- footer: a plain index of everything on the site ---------- */
  var map = shown.map(function (x) { return '<a href="#' + esc(x.sec.id) + '">' + esc($("h2", x.sec).textContent) + "</a>"; });
  if (N) map.push('<a href="#' + esc(N.id || "notes") + '">' + esc(N.title) + "</a>");
  map.push('<a href="#resume" data-open-resume>Résumé</a>');
  if (L.github) map.push("<a" + link(L.github) + ">GitHub</a>");
  if (L.linkedin) map.push("<a" + link(L.linkedin) + ">LinkedIn</a>");
  if (S.email) map.push('<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a>");
  if (L.book) map.push("<a" + link(L.book) + ">Book a call</a>");
  $("#sitemap").innerHTML = map.join("");
  $("#copy").textContent = "© " + new Date().getFullYear() + " " + S.name;

  /* ---------- theme: dusk or night; the scene sets or sinks the sun ---------- */
  var themeBtn = $("#theme"), meta = $('meta[name="theme-color"]'), sys = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function saved() { try { return localStorage.getItem("theme"); } catch (e) { return null; } }
  function setTheme(t, animate) {
    root.dataset.theme = t;
    themeBtn.setAttribute("aria-label", t === "night" ? "Switch to dusk" : "Switch to night");
    themeBtn.title = t === "night" ? "Switch to dusk" : "Switch to night";
    if (meta) meta.content = t === "night" ? "#02040B" : "#0B1132";
    if (window.SCENE) SCENE.setNight(t === "night", !animate);
  }
  function flip() {
    var t = root.dataset.theme === "night" ? "dusk" : "night";
    try { localStorage.setItem("theme", t); } catch (e) { /* private mode: the choice lasts for this visit */ }
    setTheme(t, true);
  }
  themeBtn.addEventListener("click", flip);
  setTheme(root.dataset.theme === "night" ? "night" : "dusk", false);
  // follow the system until the visitor chooses
  if (sys && sys.addEventListener) sys.addEventListener("change", function (e) { if (!saved()) setTheme(e.matches ? "night" : "dusk", true); });

  /* ---------- scroll: the veil deepens over the scene as the work comes up ---------- */
  var sink = -1, ticking = false;
  function measure() {
    ticking = false;
    var vh = innerHeight, s = Math.min(1, Math.max(0, (scrollY - vh * .12) / (vh * .55)));
    if (Math.abs(s - sink) < .002) return;
    sink = s; root.style.setProperty("--sink", s.toFixed(3)); root.classList.toggle("sunk", s > .001);
    if (window.SCENE) SCENE.setSink(s);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(measure); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  measure();

  // the sun (or moon) is a switch too: click it to change the light
  var BUSY = "a,button,input,select,textarea,label,.card,.sheet,.chip";
  function onLight(e) { return window.SCENE && sink < .5 && !(e.target.closest && e.target.closest(BUSY)) && SCENE.hit(e.clientX, e.clientY); }
  doc.addEventListener("click", function (e) { if (onLight(e)) flip(); });
  if (canHover) doc.addEventListener("pointermove", function (e) {
    root.classList.toggle("scene-hot", !!onLight(e));
    var c = e.target.closest && e.target.closest(".card");
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ---------- shelves rise into view as they reach the screen ---------- */
  if (window.IntersectionObserver && !reduce) {
    root.classList.add("reveal");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -6% 0px" });
    [].forEach.call(doc.querySelectorAll(".shelf"), function (el) { io.observe(el); });
  }

  /* ---------- covers and the entrance wait for the fonts, so nothing redraws in a different face ---------- */
  function paintAll() { paints.forEach(function (p) { p(); }); }
  paintAll();
  var fonts = doc.fonts && doc.fonts.load
    ? Promise.all([doc.fonts.load("500 24px 'Geist Mono'"), doc.fonts.load("100px 'Instrument Serif'"), doc.fonts.load("16px Geist")]).catch(function () {})
    : Promise.resolve();
  fonts.then(paintAll);
  function ready() { if (!root.classList.contains("ready")) requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add("ready"); }); }); }
  if (reduce) root.classList.add("ready");
  else { fonts.then(ready); setTimeout(ready, 1200); }

  /* ---------- the 3D scene is a module; where modules cannot run (a page opened from disk, an old browser)
     it never starts, and the 2D painting stands in. scene3d.js marks itself as soon as it runs. ---------- */
  setTimeout(function () {
    if (window.SCENE || window.__scene3d) return;
    var s = doc.createElement("script");
    s.src = "assets/js/scene2d.js";
    doc.body.appendChild(s);
  }, 2500);
})();
