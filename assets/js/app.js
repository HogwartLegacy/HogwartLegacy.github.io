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

  var top = ['<a href="#work" data-work>Work</a>'];
  if (N) top.push('<a href="#' + esc(N.id || "notes") + '">' + esc(N.title) + "</a>");
  top.push('<a href="#resume" data-open-resume>Résumé</a>');
  if (S.email) top.push('<a href="mailto:' + esc(S.email) + '">Contact</a>');
  $("#nav-links").innerHTML = top.join("");

  /* ---------- the voyage: where the 3D scene runs (the head script decides, scene3d.js confirms), the professional
     work hangs in the boat on the lake and the scroll past the hero takes the camera aboard. Everywhere else that
     work is a shelf like the others. ---------- */
  var voyage = $("#voyage"), GSEC = (S.sections || []).filter(function (s) { return s.gallery; })[0];
  var GAL = GSEC ? (S.projects || []).filter(function (p) { return p.section === GSEC.id; }) : [];
  var VOY = !!(voyage && GAL.length && root.classList.contains("has-voyage"));
  if (!VOY) root.classList.remove("has-voyage");
  // links to the work lead into the voyage while there is one, and the cue under the hero says how
  function links() {
    [].forEach.call(doc.querySelectorAll("a[data-work]"), function (a) { a.setAttribute("href", VOY ? "#voyage" : "#work"); });
    $(".cue span").textContent = VOY ? "Step aboard" : "Selected work";
  }
  links();
  if (GSEC) {
    var WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
    $("#voyage-title").textContent = GSEC.title;
    $(".voyage-intro p").textContent = (WORDS[GAL.length] || GAL.length) + (GAL.length === 1 ? " project hangs" : " projects hang") + " in the cabin of the boat on the lake. Scroll to go aboard.";
  }

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
    var ic = /^[stk]-/.test(g.icon || "") ? g.icon : "s-" + (g.icon || "chip");
    return "<li" + cs("") + "><h4>" + icon(ic) + esc(g.name) + "</h4><p>" + (g.items || []).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</p></li>";
  }).join("") + "</ul>";
  $("#cv-left").innerHTML = left || right;
  $("#cv-right").innerHTML = left ? right : "";
  if (L.resumePdf) $("#sheet-tools").innerHTML = '<a class="pill" href="' + esc(L.resumePdf) + '" download>' + icon("i-down") + "Download PDF</a>";
  if (S.location) $("#resume-title").insertAdjacentHTML("afterend", '<span class="sheet-where">' + esc(S.location) + "</span>");

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
    if (s.gallery) sec.setAttribute("data-gallery", "");
    sec.innerHTML = '<div class="shelf-head"><h2 id="' + esc(s.id) + '-title">' + esc(s.title) + '</h2><span class="count"></span>' + (s.note ? "<p>" + s.note + "</p>" : "") + '</div><div class="grid"></div>';
    items.forEach(function (p, i) {
      var el = doc.createElement("article");
      el.className = "card glass l-" + layout; el.style.setProperty("--d", i); el.innerHTML = card(p, layout);
      $(".grid", sec).appendChild(el); wire(el, p, layout);
      cards.push({ el: el, tags: p.tags || [] });
    });
    shelves.appendChild(sec);
    shown.push({ sec: sec, cards: cards, unit: s.unit || "projects", count: $(".count", sec), gallery: !!s.gallery });
  });

  /* ---------- filters: hide the cards without the tag, and any shelf left empty; each head counts what is left ---------- */
  var note = doc.createElement("p"), cur = "all";
  note.className = "filter-note"; note.setAttribute("aria-live", "polite");
  // the shelves on the page: the gallery's hangs in the boat while the voyage runs
  function live() { return shown.filter(function (x) { return !(VOY && x.gallery); }); }
  function unit(x, c) { return c === 1 ? x.unit.replace(/s$/, "") : x.unit; }
  function apply(f) {
    var seen = 0, total = 0;
    cur = f;
    live().forEach(function (x) {
      var c = 0;
      x.cards.forEach(function (card) {
        var on = f === "all" || card.tags.indexOf(f) > -1;
        if (on && card.el.hidden) { card.el.classList.remove("pop"); void card.el.offsetWidth; card.el.classList.add("pop"); }
        card.el.hidden = !on; if (on) c++;
      });
      x.sec.hidden = !c; seen += c; total += x.cards.length;
      x.count.textContent = f === "all" ? c + " " + unit(x, c) : c + " of " + x.cards.length;
    });
    note.textContent = seen + " of " + total + " shown";
    [].forEach.call(bar.querySelectorAll(".chip"), function (b) { b.setAttribute("aria-pressed", b.dataset.filter === f ? "true" : "false"); });
  }
  function chips() {
    var used = {}, list;
    live().forEach(function (x) { x.cards.forEach(function (c) { c.tags.forEach(function (t) { used[t] = 1; }); }); });
    list = FIL.filter(function (f) { return f[0] === "all" || used[f[0]]; });
    bar.innerHTML = "";
    if (list.length > 2) { // "All" and at least two kinds, or there is nothing to choose between
      list.forEach(function (f) {
        var b = doc.createElement("button");
        b.type = "button"; b.className = "chip"; b.dataset.filter = f[0]; b.innerHTML = icon(tagIcon(f[0])) + esc(f[1]);
        b.addEventListener("click", function () { apply(f[0]); });
        bar.appendChild(b);
      });
      bar.appendChild(note);
    }
    if (shown.length) apply(used[cur] ? cur : "all");
  }
  chips();

  /* ---------- notes: line drawings of each subject ---------- */
  var ART = {
    // a pulse as the oximeter saw it (dashed) and as the camera read it (lit)
    waves: function () {
      var ref = path(function (x) { return 100 - 60 * bvp(((x - 20) / 93) % 1); }, 20, 300),
        est = path(function (x) { return 100 - 60 * bvp((((x - 23) / 93) % 1 + 1) % 1) * (.95 + .05 * Math.sin(x * .3)) + 1.3 * Math.sin(x * .9); }, 20, 300);
      return '<svg viewBox="0 0 320 140" aria-hidden="true"><path class="ln" d="M20 112H300"/><path class="ref" d="' + ref + '"/><path class="lit" d="' + est + '"/>' +
        '<text x="20" y="130">reference</text><text x="300" y="130" text-anchor="end">camera</text></svg>';
    },
    // the key kept in a small module of its own; the apps around it call in and never hold it
    keys: function () {
      return '<svg viewBox="0 0 320 140" aria-hidden="true"><rect class="frame" x="118" y="32" width="84" height="76" rx="12"/>' +
        '<circle class="lit" cx="146" cy="70" r="11"/><path class="lit" d="M157 70h30M179 70v9M186 70v6"/>' +
        '<rect class="lit" x="22" y="20" width="56" height="34" rx="7"/><rect class="lit" x="22" y="86" width="56" height="34" rx="7"/><rect class="lit" x="242" y="53" width="56" height="34" rx="7"/>' +
        '<path class="ln" d="M34 32h24M34 41h16M34 98h28M34 107h18M254 65h26M254 74h14"/>' +
        '<path class="dash" d="M78 37 118 56M78 103l40-19M242 70h-40"/>' +
        '<circle class="gold" cx="118" cy="56" r="3"/><circle class="gold" cx="118" cy="84" r="3"/><circle class="gold" cx="202" cy="70" r="3"/>' +
        '<text x="160" y="130" text-anchor="middle">calls in, keys stay in</text></svg>';
    },
    // inputs thrown at a parser: most come out clean, and the bad ones are caught before release
    fuzz: function () {
      var s = '<svg viewBox="0 0 320 140" aria-hidden="true">', i, l;
      for (i = 0; i < 9; i++) { l = 18 + ((i * 37) % 9) * 7; s += '<path class="ln" d="M' + (104 - l) + " " + (24 + i * 10) + "h" + l + '"/>'; }
      s += '<rect class="lit" x="112" y="16" width="80" height="92" rx="10"/><path class="ln" d="M124 34h56M124 46h40M124 58h48M124 70h30M124 82h44M124 94h24"/>';
      s += '<path class="lit" d="M212 30l6 6 10-11M212 56l6 6 10-11M212 82l6 6 10-11"/>';
      s += '<ellipse class="gold" cx="268" cy="62" rx="10" ry="13"/><path class="lit" d="M268 49v-6M258 56l-8-5M278 56l8-5M257 64h-9M279 64h9M258 72l-8 5M278 72l8 5"/>';
      return s + '<text x="160" y="130" text-anchor="middle">20+ bugs caught before release</text></svg>';
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
  function sitemap() {
    var map = live().map(function (x) { return '<a href="#' + esc(x.sec.id) + '">' + esc($("h2", x.sec).textContent) + "</a>"; });
    if (VOY) map.unshift('<a href="#voyage" data-work>' + esc(GSEC.title) + "</a>");
    if (N) map.push('<a href="#' + esc(N.id || "notes") + '">' + esc(N.title) + "</a>");
    map.push('<a href="#resume" data-open-resume>Résumé</a>');
    if (L.github) map.push("<a" + link(L.github) + ">GitHub</a>");
    if (L.linkedin) map.push("<a" + link(L.linkedin) + ">LinkedIn</a>");
    if (S.email) map.push('<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a>");
    if (L.book) map.push("<a" + link(L.book) + ">Book a call</a>");
    $("#sitemap").innerHTML = map.join("");
  }
  sitemap();
  $("#copy").textContent = "© " + new Date().getFullYear() + " " + S.name;

  /* ---------- theme: dusk or night; the scene sets or sinks the sun ---------- */
  var themeBtn = $("#theme"), meta = $('meta[name="theme-color"]'), sys = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function saved() { try { return localStorage.getItem("theme"); } catch (e) { return null; } }
  var want = root.dataset.theme === "night" ? "night" : "dusk", flipping = 0;
  // `seconds`: how long the scene takes to change. The page's own colours then turn at about the middle of it, not before
  function setTheme(t, animate, seconds) {
    want = t;
    clearTimeout(flipping);
    var apply = function () {
      root.dataset.theme = t;
      themeBtn.setAttribute("aria-label", t === "night" ? "Switch to dusk" : "Switch to night");
      themeBtn.title = t === "night" ? "Switch to dusk" : "Switch to night";
      if (meta) meta.content = t === "night" ? "#02040B" : "#0B1132";
    };
    if (window.SCENE) SCENE.setNight(t === "night", !animate, seconds);
    if (seconds && animate && root.dataset.theme !== t) flipping = setTimeout(apply, seconds * 420); else apply();
  }
  function flip() {
    var t = want === "night" ? "dusk" : "night";
    try { localStorage.setItem("theme", t); } catch (e) { /* private mode: the choice lasts for this visit */ }
    setTheme(t, true);
    turn();
  }
  themeBtn.addEventListener("click", flip);
  setTheme(want, false);
  // follow the system until the visitor chooses
  if (sys && sys.addEventListener) sys.addEventListener("change", function (e) { if (!saved()) setTheme(e.matches ? "night" : "dusk", true); });
  // and the light turns by itself: dusk falls into night and the night lifts back into dusk, slowly, about every
  // half minute (counted again from any change the visitor makes). Not while the tab is hidden, or a story is open
  var turning = 0;
  function turn() {
    clearTimeout(turning);
    if (reduce) return;
    turning = setTimeout(function () {
      if (!doc.hidden && !(dlg && dlg.open)) setTheme(want === "night" ? "dusk" : "night", true, 9);
      turn();
    }, 26000);
  }
  turn();

  /* ---------- scroll: the voyage plays as its track passes; the veil deepens over the scene as the work comes up ---------- */
  var sink = -1, vp = -1, ticking = false, work = $("#work"), pinned = false, onboard = false;
  // aboard means the camera is in the cabin and the screen is still pinned to it (clicks pick pictures only then)
  function syncBoard() { root.classList.toggle("on-board", VOY && onboard && pinned); }
  function clamp(x) { return Math.min(1, Math.max(0, x)); }
  function sm(a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function measure(force) {
    ticking = false;
    var vh = innerHeight, s;
    if (VOY) {
      // progress runs from the hero at rest (0) to the end of the track's sticky screen (1)
      var r = voyage.getBoundingClientRect(), p = clamp((vh - r.top) / r.height);
      // its controls show while the screen is pinned: not before it has come up, nor once the work below has taken over
      pinned = r.top < vh * .6 && r.bottom > vh * .98;
      root.classList.toggle("voyage-live", pinned);
      syncBoard();
      if (force === true || Math.abs(p - vp) > 1e-4) {
        vp = p;
        var vi = sm(.09, .15, p) * (1 - sm(.24, .3, p));
        root.style.setProperty("--vi", vi.toFixed(3));
        root.classList.toggle("intro-on", vi > .35);
        if (window.SCENE && SCENE.setVoyage) SCENE.setVoyage(p);
      }
      // the veil waits for the work below the voyage, then comes in as it does under the hero
      s = clamp((vh * .88 - work.getBoundingClientRect().top) / (vh * .55));
    } else s = clamp((scrollY - vh * .12) / (vh * .55));
    if (force !== true && Math.abs(s - sink) < .002) return;
    sink = s; root.style.setProperty("--sink", s.toFixed(3)); root.classList.toggle("sunk", s > .001);
    if (window.SCENE) SCENE.setSink(s);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(measure); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  measure();
  // the scene builds itself after the page: hand it the state it missed
  window.addEventListener("scene:ready", function () { measure(true); });

  // flying aboard: the page scrolls itself, slowly, to the first picture, and the scene follows it across the water,
  // up to the door and in. Any touch of the wheel, keys or screen takes the scroll back
  var flight = 0;
  function stopFlight() { if (!flight) return; cancelAnimationFrame(flight); flight = 0; root.style.scrollBehavior = ""; }
  function flyTo(p) {
    var y1 = Math.round(voyage.offsetTop - innerHeight + p * voyage.offsetHeight), y0 = scrollY, d = y1 - y0, t0 = 0;
    stopFlight();
    if (reduce || Math.abs(d) < 4) { window.scrollTo(0, y1); return; }
    var dur = Math.min(6500, 2600 + Math.abs(d) / innerHeight * 380);
    root.style.scrollBehavior = "auto";
    flight = requestAnimationFrame(function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, y0 + d * (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2));
      if (k < 1) flight = requestAnimationFrame(step); else stopFlight();
    });
  }
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (t) { window.addEventListener(t, stopFlight, { passive: true }); });
  // the cue, the nav's Work, the footer's link and the button in the voyage all go aboard
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-work]");
    if (!a || !VOY || !window.SCENE || !SCENE.voyageAt) return;
    e.preventDefault(); flyTo(SCENE.voyageAt(0));
  });

  // the sun (or moon) is a switch too: click it to change the light. Before the camera is aboard the boat is one too:
  // click it to go in. Aboard, a picture opens its story
  var BUSY = "a,button,input,select,textarea,label,.card,.sheet,.chip,dialog";
  function onLight(e) { return window.SCENE && sink < .5 && !(e.target.closest && e.target.closest(BUSY)) && SCENE.hit(e.clientX, e.clientY); }
  function onBoat(e) { return VOY && window.SCENE && SCENE.boatAt && vp < .3 && !(e.target.closest && e.target.closest(BUSY + ",.hero-copy,.resume")) && SCENE.boatAt(e.clientX, e.clientY); }
  function aboard(e) { return VOY && root.classList.contains("on-board") && window.SCENE && SCENE.pick && !(e.target.closest && e.target.closest(BUSY)); }
  doc.addEventListener("click", function (e) {
    if (onLight(e)) { flip(); return; }
    if (onBoat(e)) { flyTo(SCENE.voyageAt(0)); return; }
    var i = aboard(e) ? SCENE.pick(e.clientX, e.clientY) : -1;
    if (i >= 0) openDetail(i);
  });
  if (canHover) doc.addEventListener("pointermove", function (e) {
    root.classList.toggle("scene-hot", !!(onLight(e) || onBoat(e)));
    root.classList.toggle("scene-pick", !!aboard(e) && SCENE.hover(e.clientX, e.clientY) >= 0);
    var c = e.target.closest && e.target.closest(".card");
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ---------- aboard: which picture is in front, its story when it is clicked, and the same pictures as buttons for
     keyboards and screen readers ---------- */
  var dlg = $("#detail"), dArt = $(".detail-art canvas"), dRaf = 0, here = -1;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function openDetail(i) {
    var p = GAL[i];
    if (!p || !dlg) return;
    $("#detail-kicker").textContent = [p.meta, p.when].filter(Boolean).join(" · ");
    $("#detail-title").textContent = p.name;
    $("#detail-text").innerHTML = p.text || "";
    $("#detail-points").innerHTML = (p.details || []).map(function (d) { return "<li>" + d + "</li>"; }).join("");
    $("#detail-stack").innerHTML = (p.stack || []).map(function (s) { return "<span>" + esc(s) + "</span>"; }).join("");
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    root.classList.add("detail-open");
    // the picture plays while its story is open
    var fn = window.COVERS && COVERS[p.art], c = dArt.getContext("2d"), t0 = performance.now();
    cancelAnimationFrame(dRaf);
    (function tick(now) {
      fit(dArt);
      try { if (fn) fn(c, dArt.width, dArt.height, (p.t || 0) + (reduce ? 0 : (now - t0) / 1000), 1.2); } catch (err) { /* keep the last frame */ }
      if (!reduce) dRaf = requestAnimationFrame(tick);
    })(t0);
  }
  if (dlg) {
    dlg.addEventListener("close", function () { cancelAnimationFrame(dRaf); root.classList.remove("detail-open"); });
    $("#detail-close").addEventListener("click", function () { dlg.close(); });
    // a click on the dimmed page around it closes it too
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }
  if (VOY) {
    // skipping the tour is one jump: scrolling there smoothly would play all of it through on the way
    [].forEach.call(doc.querySelectorAll(".voyage-skip,.skip"), function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        root.style.scrollBehavior = "auto"; window.scrollTo(0, Math.round(work.getBoundingClientRect().top + scrollY - 24)); root.style.scrollBehavior = "";
      });
    });
    $("#voyage-list").innerHTML = GAL.map(function (p, i) { return '<li><button type="button" data-pic="' + i + '">' + esc(p.name) + "</button></li>"; }).join("");
    // a button reached from the keyboard brings the camera to its picture; pressed, it opens the story
    $("#voyage-list").addEventListener("focusin", function (e) {
      var b = e.target.closest("[data-pic]");
      if (b && window.SCENE && SCENE.voyageAt) window.scrollTo({ top: Math.round(voyage.offsetTop - innerHeight + SCENE.voyageAt(+b.dataset.pic) * voyage.offsetHeight), behavior: reduce ? "auto" : "smooth" });
    });
    $("#voyage-list").addEventListener("click", function (e) { var b = e.target.closest("[data-pic]"); if (b) openDetail(+b.dataset.pic); });
    $("#voyage-open").addEventListener("click", function () { if (here >= 0) openDetail(here); });
  }
  window.addEventListener("scene:voyage", function (e) {
    var d = e.detail || {};
    onboard = !!d.board; syncBoard();
    if (d.index < 0 || d.index === here || !GAL[d.index]) return;
    here = d.index;
    $(".voyage-count").textContent = pad(here + 1) + " / " + pad(GAL.length);
    $("#voyage-open").innerHTML = esc(GAL[here].name) + icon("i-out");
  });
  // the 3D scene could not run after all: the work goes back on its shelf
  function voyageOff() {
    if (!VOY) return;
    VOY = false;
    root.classList.remove("has-voyage", "on-board", "voyage-live", "scene-pick");
    try { sessionStorage.setItem("no-voyage", "1"); } catch (e) { /* storage off: decided again on the next visit */ }
    links(); chips(); sitemap(); measure(true);
  }
  window.addEventListener("scene:2d", voyageOff);

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
    voyageOff();
    var s = doc.createElement("script");
    s.src = "assets/js/scene2d.js";
    doc.body.appendChild(s);
  }, 2500);
})();
