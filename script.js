/* ============================================================
   VK AI Labs — showcase deck controller
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Keyboard-only focus ring ----------
     `:focus-visible` is unreliable for the programmatic `.focus()` we call after
     slide navigation (Chrome can render the ring on mouse-driven nav). Track real
     Tab usage explicitly: add `user-is-tabbing` to <body> on Tab keydown, remove
     it on any mouse/touch press. The CSS only shows outlines while that class is
     present, so mouse/programmatic focus never draws a ring. */
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key === "Tab") {
        document.body.classList.add("user-is-tabbing");
      }
    },
    true
  );
  function clearTabbing() {
    document.body.classList.remove("user-is-tabbing");
  }
  document.addEventListener("mousedown", clearTabbing, true);
  document.addEventListener("touchstart", clearTabbing, true);

  /* ---------- Slide navigation ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".dot"));
  var nextBtn = document.getElementById("next-btn");
  var nextLabel = document.getElementById("next-btn-label");
  var TOTAL = slides.length;
  var current = 0;

  // Label + aria for the Next button, per slide it will advance TO.
  var NEXT_LABELS = ["The Platform", "RAG Demo", "Knowledge Graph", null];

  function updateChrome() {
    dots.forEach(function (dot, i) {
      var active = i === current;
      dot.classList.toggle("is-active", active);
      if (active) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    var label = NEXT_LABELS[current];
    if (label === null || current === TOTAL - 1) {
      nextBtn.classList.add("is-hidden");
      nextBtn.setAttribute("tabindex", "-1");
      nextBtn.setAttribute("aria-hidden", "true");
    } else {
      nextBtn.classList.remove("is-hidden");
      nextBtn.removeAttribute("tabindex");
      nextBtn.removeAttribute("aria-hidden");
      nextLabel.textContent = label;
      nextBtn.setAttribute("aria-label", "Go to " + label + " slide");
    }
  }

  function goTo(index) {
    index = Math.max(0, Math.min(TOTAL - 1, index));
    if (index === current) return;

    var incoming = slides[index];
    var outgoing = slides[current];

    // Make incoming visible to the a11y tree + layout before animating.
    incoming.hidden = false;

    // force reflow so the transition runs from the hidden state
    void incoming.offsetWidth;

    outgoing.classList.remove("is-active");
    incoming.classList.add("is-active");

    var prev = current;
    current = index;
    updateChrome();

    // Hide the outgoing slide from AT after the transition completes.
    window.setTimeout(
      function () {
        if (current !== prev) {
          slides[prev].hidden = true;
        }
      },
      prefersReduced ? 130 : 420
    );

    // Move focus to the new slide heading region for keyboard/AT users.
    var focusTarget = incoming.querySelector(".slide-inner");
    if (focusTarget) {
      focusTarget.setAttribute("tabindex", "-1");
      // Avoid scrolling; slides are fixed.
      focusTarget.focus({ preventScroll: true });
    }
  }

  function next() {
    if (current < TOTAL - 1) goTo(current + 1);
  }
  function prev() {
    if (current > 0) goTo(current - 1);
  }

  nextBtn.addEventListener("click", next);
  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      goTo(parseInt(dot.getAttribute("data-goto"), 10));
    });
  });

  // Internal "jump to slide" buttons (e.g. the "Live RAG Demo" card on
  // slide 5, styled like the external portal links but navigating within
  // the deck instead of opening a new tab).
  Array.prototype.slice
    .call(document.querySelectorAll("[data-goto-slide]"))
    .forEach(function (btn) {
      btn.addEventListener("click", function () {
        goTo(parseInt(btn.getAttribute("data-goto-slide"), 10));
      });
    });

  /* ---------- Keyboard ---------- */
  // Deck shortcuts (arrows, Page Up/Down, Home/End) should not fire while
  // the person is actually typing somewhere — e.g. the RAG demo's question
  // input. Without this, ArrowLeft/ArrowRight inside that field navigated
  // slides instead of moving the text cursor.
  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable
    );
  }

  document.addEventListener("keydown", function (e) {
    if (lightboxOpen) return; // lightbox handles its own keys
    if (isTypingTarget(document.activeElement)) return; // let the field handle its own keys
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      prev();
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(TOTAL - 1);
    }
  });

  /* ---------- Touch swipe (deck) ---------- */
  var touchStartX = 0;
  var touchStartY = 0;
  var touchActive = false;

  document.addEventListener(
    "touchstart",
    function (e) {
      if (lightboxOpen) return;
      if (e.touches.length !== 1) return;
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    function (e) {
      if (!touchActive || lightboxOpen) return;
      touchActive = false;
      var dx = e.changedTouches[0].clientX - touchStartX;
      var dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        if (dx < 0) next();
        else prev();
      }
    },
    { passive: true }
  );

  updateChrome();

  /* ============================================================
     Lightbox — zoom + pan for dense diagrams
     ============================================================ */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxStage = document.getElementById("lightbox-stage");
  var lightboxClose = document.getElementById("lightbox-close");
  var lightboxOpen = false;
  var lastFocused = null;

  var scale = 1;
  var tx = 0;
  var ty = 0;
  var MIN_SCALE = 1;
  var MAX_SCALE = 6;

  function applyTransform() {
    lightboxImg.style.transform =
      "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
  }
  function resetTransform() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function openLightbox(img) {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
    lastFocused = document.activeElement;
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt || "";
    resetTransform();
    lightbox.hidden = false;
    // reflow then fade in
    void lightbox.offsetWidth;
    lightbox.classList.add("is-open");
    lightboxOpen = true;
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  var hideTimer = null;
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightboxOpen = false;
    document.body.style.overflow = "";
    // Hide after the fade finishes. A timeout is used rather than `transitionend`
    // because that event can be missed (interrupted transition, no repaint), which
    // would leave the overlay at display:flex and re-trap clicks.
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(
      function () {
        lightbox.hidden = true;
        lightboxImg.src = "";
      },
      prefersReduced ? 0 : 300
    );
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  // Bind zoomable figures
  Array.prototype.slice
    .call(document.querySelectorAll("[data-zoomable]"))
    .forEach(function (fig) {
      var img = fig.querySelector("img");
      if (!img) return;
      fig.setAttribute("role", "button");
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("aria-label", "Zoom diagram: " + (img.alt || "diagram"));
      fig.addEventListener("click", function () {
        openLightbox(img);
      });
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(img);
        }
      });
    });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) {
    // click on backdrop (not the image) closes
    if (e.target === lightbox || e.target === lightboxStage) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (!lightboxOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === "+" || e.key === "=") {
      zoomAt(0.5, window.innerWidth / 2, window.innerHeight / 2);
    } else if (e.key === "-") {
      zoomAt(-0.5, window.innerWidth / 2, window.innerHeight / 2);
    } else if (e.key === "0") {
      resetTransform();
    }
  });

  /* ---- wheel / trackpad zoom ---- */
  function zoomAt(delta, cx, cy) {
    var prevScale = scale;
    var newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    if (newScale === prevScale) return;
    // zoom toward cursor point
    var rect = lightboxImg.getBoundingClientRect();
    var originX = cx - rect.left - rect.width / 2;
    var originY = cy - rect.top - rect.height / 2;
    var ratio = newScale / prevScale;
    tx -= originX * (ratio - 1);
    ty -= originY * (ratio - 1);
    scale = newScale;
    if (scale === MIN_SCALE) {
      tx = 0;
      ty = 0;
    }
    applyTransform();
  }

  lightboxStage.addEventListener(
    "wheel",
    function (e) {
      if (!lightboxOpen) return;
      e.preventDefault();
      var delta = -e.deltaY * 0.0025 * (scale + 0.4);
      zoomAt(delta, e.clientX, e.clientY);
    },
    { passive: false }
  );

  /* ---- pointer pan ---- */
  var panning = false;
  var panStartX = 0;
  var panStartY = 0;
  var panOrigTx = 0;
  var panOrigTy = 0;

  lightboxStage.addEventListener("pointerdown", function (e) {
    if (!lightboxOpen) return;
    panning = true;
    lightboxStage.classList.add("is-panning");
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOrigTx = tx;
    panOrigTy = ty;
    lightboxStage.setPointerCapture(e.pointerId);
  });
  lightboxStage.addEventListener("pointermove", function (e) {
    if (!panning) return;
    tx = panOrigTx + (e.clientX - panStartX);
    ty = panOrigTy + (e.clientY - panStartY);
    applyTransform();
  });
  function endPan(e) {
    if (!panning) return;
    panning = false;
    lightboxStage.classList.remove("is-panning");
    try {
      lightboxStage.releasePointerCapture(e.pointerId);
    } catch (err) {}
  }
  lightboxStage.addEventListener("pointerup", endPan);
  lightboxStage.addEventListener("pointercancel", endPan);

  /* ---- touch pinch-zoom + double-tap ---- */
  var pinchStartDist = 0;
  var pinchStartScale = 1;
  var lastTap = 0;

  function dist(t1, t2) {
    var dx = t1.clientX - t2.clientX;
    var dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  lightboxStage.addEventListener(
    "touchstart",
    function (e) {
      if (!lightboxOpen) return;
      if (e.touches.length === 2) {
        pinchStartDist = dist(e.touches[0], e.touches[1]);
        pinchStartScale = scale;
      } else if (e.touches.length === 1) {
        var now = Date.now();
        if (now - lastTap < 300) {
          // double-tap toggles zoom
          if (scale > 1.2) resetTransform();
          else
            zoomAt(
              1.4,
              e.touches[0].clientX,
              e.touches[0].clientY
            );
        }
        lastTap = now;
      }
    },
    { passive: true }
  );

  lightboxStage.addEventListener(
    "touchmove",
    function (e) {
      if (!lightboxOpen) return;
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        var d = dist(e.touches[0], e.touches[1]);
        var target = pinchStartScale * (d / pinchStartDist);
        var delta = target - scale;
        var midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        var midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomAt(delta, midX, midY);
      }
    },
    { passive: false }
  );

  lightboxStage.addEventListener("touchend", function (e) {
    if (e.touches.length < 2) pinchStartDist = 0;
  });

  /* ============================================================
     Slide 1 — orchestration network motif (canvas)
     ============================================================ */
  if (!prefersReduced) {
    initCanvas();
  }

  function initCanvas() {
    var canvas = document.getElementById("orchestration-canvas");
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0;
    var h = 0;
    var nodes = [];
    var running = false;
    var rafId = null;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function build() {
      var count = Math.max(14, Math.min(30, Math.round((w * h) / 60000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 1
        });
      }
    }

    var LINK_DIST = 170;

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }

      // links
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var na = nodes[a];
          var nb = nodes[b];
          var dx = na.x - nb.x;
          var dy = na.y - nb.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            var alpha = (1 - d / LINK_DIST) * 0.16;
            ctx.strokeStyle = "rgba(20, 184, 166," + alpha + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (var k = 0; k < nodes.length; k++) {
        var nn = nodes[k];
        ctx.beginPath();
        ctx.arc(nn.x, nn.y, nn.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(20, 184, 166, 0.5)";
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      canvas.classList.add("is-visible");
      tick();
    }
    function stop() {
      running = false;
      canvas.classList.remove("is-visible");
      if (rafId) window.cancelAnimationFrame(rafId);
    }

    resize();
    build();

    window.addEventListener("resize", function () {
      resize();
      build();
    });

    // Pause when tab hidden, and when not on slide 1.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (current === 0) start();
    });

    // Only animate while slide 1 is active — observe its class.
    var mo = new MutationObserver(function () {
      if (slides[0].classList.contains("is-active") && !document.hidden) {
        start();
      } else {
        stop();
      }
    });
    mo.observe(slides[0], { attributes: true, attributeFilter: ["class"] });

    start();
  }

  /* ============================================================
     Slide 6 — RAG live demo
     ============================================================ */
  var ragForm = document.getElementById("rag-form");
  if (ragForm) {
    var ragInput = document.getElementById("rag-question");
    var ragSubmit = document.getElementById("rag-submit");
    var ragSubmitLabel = document.getElementById("rag-submit-label");
    var ragResult = document.getElementById("rag-result");
    var ragAnswer = document.getElementById("rag-answer");
    var ragError = document.getElementById("rag-error");
    var ragBusy = false;

    function setLoading(loading) {
      ragBusy = loading;
      ragSubmit.disabled = loading;
      ragSubmit.classList.toggle("is-loading", loading);
      ragSubmitLabel.textContent = loading ? "Thinking…" : "Ask";
    }

    function renderResult(data) {
      ragAnswer.textContent = data.answer || "";
      ragResult.hidden = false;
    }

    function renderError(message) {
      ragError.textContent = message;
      ragError.hidden = false;
    }

    ragForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (ragBusy) return;

      var question = ragInput.value.trim();
      if (!question) return;

      ragError.hidden = true;
      ragResult.hidden = true;
      setLoading(true);

      fetch("/api/rag-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question })
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed (" + res.status + ")");
          return res.json();
        })
        .then(function (data) {
          setLoading(false);
          if (data.error) {
            renderError(data.error);
          } else {
            renderResult(data);
          }
        })
        .catch(function (err) {
          setLoading(false);
          renderError(
            "Couldn't reach the RAG demo right now. Please try again in a moment."
          );
        });
    });
  }

  /* ============================================================
     Slide 4 — Knowledge Graph
     ============================================================ */
  var kgCanvas = document.getElementById("kg-canvas");
  if (kgCanvas) {
    initKnowledgeGraph();
  }

  function initKnowledgeGraph() {
    var TYPE_COLORS = {
      Agent: "#4C72B0",
      Story: "#55A868",
      Scenario: "#8172B2",
      TestCase: "#64B5CD",
      Customer: "#C44E52",
      Policy: "#DD8452",
      Premium: "#E8A87C",
      Claim: "#CD6155"
    };
    var TYPE_ORDER = [
      "Agent", "Story", "Scenario", "TestCase",
      "Customer", "Policy", "Premium", "Claim"
    ];

    var ctx = kgCanvas.getContext("2d");
    var wrap = kgCanvas.parentElement;
    var legendEl = document.getElementById("kg-legend");
    var tooltipEl = document.getElementById("kg-tooltip");

    var queryTypeSel = document.getElementById("kg-query-type");
    var queryTargetSel = document.getElementById("kg-query-target");
    var runBtn = document.getElementById("kg-run");
    var resultBox = document.getElementById("kg-result");
    var answerEl = document.getElementById("kg-answer");

    var graph = null;      // { nodes: [...], edges: [...] }
    var byId = {};         // id -> node (with x, y, vx, vy added)
    var adjacency = {};    // id -> [{ to, relation, dir }]
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var hoveredId = null;
    var highlightedIds = null; // Set of node ids to emphasize, or null for "show all"

    function resizeCanvas() {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      kgCanvas.width = W * dpr;
      kgCanvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildAdjacency() {
      adjacency = {};
      graph.nodes.forEach(function (n) {
        adjacency[n.id] = [];
      });
      graph.edges.forEach(function (e) {
        adjacency[e.source].push({ to: e.target, relation: e.relation, dir: "out" });
        adjacency[e.target].push({ to: e.source, relation: e.relation, dir: "in" });
      });
    }

    /* ---------- simple force-directed layout (no library) ----------
       Repulsion between all node pairs + spring attraction along edges,
       run for a fixed number of iterations on load. Small graph (40
       nodes / 46 edges), so a naive O(n^2) simulation is plenty fast.

       REPULSION/SPRING_LEN scale with the canvas's actual W/H (standard
       Fruchterman-Reingold "ideal distance" technique: k = sqrt(area/n))
       rather than being fixed numbers. Fixed constants were tuned for the
       old, shorter canvas — once the canvas got taller, the simulation
       reached equilibrium well before using the full height, leaving nodes
       clustered in the middle with empty space top and bottom. Deriving
       the constants from W/H means the layout always spreads to fill
       whatever box it's actually given. */
    function layout() {
      var nodes = graph.nodes;
      var n = nodes.length;

      // Ideal inter-node spacing for this box + node count.
      var k = Math.sqrt((W * H) / n);

      nodes.forEach(function (node, i) {
        var angle = (i / n) * Math.PI * 2;
        // Elliptical start (scaled by W and H separately, not a circle
        // bounded by the smaller dimension) so the initial spread already
        // reflects a tall box's aspect ratio rather than being width-bound.
        node.x = W / 2 + Math.cos(angle) * W * 0.36;
        node.y = H / 2 + Math.sin(angle) * H * 0.36;
        node.vx = 0;
        node.vy = 0;
      });

      var REPULSION = k * k * 0.42;
      var SPRING_LEN = k * 0.85;
      var SPRING_K = 0.02;
      var DAMPING = 0.82;
      var iterations = 220;

      for (var iter = 0; iter < iterations; iter++) {
        // repulsion
        for (var a = 0; a < n; a++) {
          for (var b = a + 1; b < n; b++) {
            var na = nodes[a], nb = nodes[b];
            var dx = na.x - nb.x, dy = na.y - nb.y;
            var distSq = dx * dx + dy * dy || 0.01;
            var dist = Math.sqrt(distSq);
            var force = REPULSION / distSq;
            var fx = (dx / dist) * force;
            var fy = (dy / dist) * force;
            na.vx += fx; na.vy += fy;
            nb.vx -= fx; nb.vy -= fy;
          }
        }
        // spring attraction along edges
        graph.edges.forEach(function (e) {
          var na = byId[e.source], nb = byId[e.target];
          var dx = nb.x - na.x, dy = nb.y - na.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var force = (dist - SPRING_LEN) * SPRING_K;
          var fx = (dx / dist) * force;
          var fy = (dy / dist) * force;
          na.vx += fx; na.vy += fy;
          nb.vx -= fx; nb.vy -= fy;
        });
        // integrate, damp, and pull gently toward center
        nodes.forEach(function (node) {
          node.vx *= DAMPING;
          node.vy *= DAMPING;
          node.vx += (W / 2 - node.x) * 0.0015;
          node.vy += (H / 2 - node.y) * 0.0015;
          node.x += node.vx;
          node.y += node.vy;
        });
      }

      // settle inside the canvas with padding
      var pad = 34;
      nodes.forEach(function (node) {
        node.x = Math.max(pad, Math.min(W - pad, node.x));
        node.y = Math.max(pad, Math.min(H - pad, node.y));
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // edges
      graph.edges.forEach(function (e) {
        var na = byId[e.source], nb = byId[e.target];
        var touchesHover = e.source === hoveredId || e.target === hoveredId;
        var inHighlight = highlightedIds && highlightedIds.has(e.source) && highlightedIds.has(e.target);
        var dim = highlightedIds ? !inHighlight && !touchesHover : (hoveredId && !touchesHover);
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        if (e.relation === "COVERS") {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = dim ? "rgba(153,153,153,0.12)" : "rgba(153,153,153,0.55)";
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = dim ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.16)";
        }
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // nodes
      graph.nodes.forEach(function (node) {
        // A node stays fully bright if it's part of the active query
        // highlight OR if it's the one currently hovered — hovering must
        // always give visual feedback, even while a query highlight is
        // dimming everything else. Previously hover was skipped whenever
        // a highlight was active, which looked like "hover stopped working".
        var isHighlighted = highlightedIds && highlightedIds.has(node.id);
        var isHovered = node.id === hoveredId;
        var dim = highlightedIds && !isHighlighted && !isHovered;
        var color = TYPE_COLORS[node.type] || "#999999";
        var r = isHovered || isHighlighted ? 7 : 5.5;

        ctx.globalAlpha = dim ? 0.22 : 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = isHovered ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)";
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }

    function nodeAt(px, py) {
      // Hit-test in draw order and prefer the LAST match (drawn on top),
      // not just the nearest center. In dense areas several node centers
      // can be close together; picking pure nearest-distance can return a
      // node that's visually behind another one under the cursor, which
      // looks like "hover randomly doesn't work" in crowded parts of the
      // graph. Preferring draw-order matches what the eye actually sees.
      var HIT_RADIUS = 12; // CSS px
      var found = null;
      graph.nodes.forEach(function (node) {
        var dx = node.x - px, dy = node.y - py;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < HIT_RADIUS) {
          found = node; // later matches overwrite earlier ones on purpose
        }
      });
      return found;
    }

    function buildLegend() {
      legendEl.innerHTML = "";
      TYPE_ORDER.forEach(function (type) {
        var item = document.createElement("span");
        item.className = "kg-legend-item";
        var swatch = document.createElement("span");
        swatch.className = "kg-legend-swatch";
        swatch.style.background = TYPE_COLORS[type];
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(type));
        legendEl.appendChild(item);
      });
    }

    /* ---------- hover highlight (mousemove, no click handling) ---------- */
    kgCanvas.addEventListener("mousemove", function (e) {
      var rect = kgCanvas.getBoundingClientRect();
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;
      var node = nodeAt(px, py);
      var newId = node ? node.id : null;
      if (newId !== hoveredId) {
        hoveredId = newId;
        draw();
      }
      if (node) {
        tooltipEl.hidden = false;
        tooltipEl.textContent = node.type + " — " + node.label;
        // position:fixed now, so use viewport coordinates directly rather
        // than the canvas-relative px/py used for hit-testing above.
        tooltipEl.style.left = e.clientX + "px";
        tooltipEl.style.top = e.clientY + "px";
      } else {
        tooltipEl.hidden = true;
      }
    });
    kgCanvas.addEventListener("mouseleave", function () {
      hoveredId = null;
      tooltipEl.hidden = true;
      draw();
    });

    /* ---------- query panel ---------- */
    var STORY_KEYS = [];
    var POLICY_IDS = [];
    var CUSTOMER_IDS = [];

    var TARGETS_BY_QUERY = {
      "test-cases-for-story": function () { return STORY_KEYS; },
      "claims-for-policy": function () { return POLICY_IDS; },
      "agents-for-story": function () { return STORY_KEYS; },
      "policies-for-customer": function () { return CUSTOMER_IDS; }
    };

    function populateTargets() {
      var type = queryTypeSel.value;
      var options = (TARGETS_BY_QUERY[type] || function () { return []; })();
      queryTargetSel.innerHTML = "";
      options.forEach(function (id) {
        var opt = document.createElement("option");
        opt.value = id;
        opt.textContent = id;
        queryTargetSel.appendChild(opt);
      });
      // Switching what's being queried invalidates any previous highlight/answer
      // on screen — clear both so nothing stale is left showing a result that
      // no longer matches the new target list.
      highlightedIds = null;
      resultBox.hidden = true;
      draw();
    }

    function outEdgesByRelation(id, relation) {
      return (adjacency[id] || [])
        .filter(function (e) { return e.dir === "out" && e.relation === relation; })
        .map(function (e) { return e.to; });
    }

    function inEdgesByRelation(id, relation) {
      return (adjacency[id] || [])
        .filter(function (e) { return e.dir === "in" && e.relation === relation; })
        .map(function (e) { return e.to; });
    }

    function testCasesForStory(storyKey) {
      var direct = outEdgesByRelation(storyKey, "RELATES_TO");
      var viaScenarios = [];
      outEdgesByRelation(storyKey, "HAS_SCENARIO").forEach(function (scenarioId) {
        viaScenarios = viaScenarios.concat(outEdgesByRelation(scenarioId, "VERIFIED_BY"));
      });
      var all = direct.concat(viaScenarios);
      return Array.prototype.filter.call(all, function (id, i) {
        return all.indexOf(id) === i;
      });
    }

    function claimsForPolicy(policyId) {
      return outEdgesByRelation(policyId, "HAS_CLAIM");
    }

    function agentsForStory(storyKey) {
      // Some agents connect directly to the Story (IMPLEMENTED/CLOSED); others
      // — agent-vkai-automation, agent-vkai-jira-update — work at the Test
      // Case level in the real orchestration workflow, not the Story node
      // itself. A direct-edges-only traversal under-reports who actually
      // worked the story, so this also walks through its Test Cases.
      var direct = inEdgesByRelation(storyKey, "IMPLEMENTED")
        .concat(inEdgesByRelation(storyKey, "CLOSED"));
      var viaTestCases = [];
      testCasesForStory(storyKey).forEach(function (tc) {
        viaTestCases = viaTestCases
          .concat(inEdgesByRelation(tc, "AUTHORED"))
          .concat(inEdgesByRelation(tc, "CLOSED"));
      });
      var all = direct.concat(viaTestCases);
      return Array.prototype.filter.call(all, function (id, i) {
        return all.indexOf(id) === i;
      });
    }

    function policiesForCustomer(customerId) {
      return outEdgesByRelation(customerId, "OWNS");
    }

    function runQuery() {
      var type = queryTypeSel.value;
      var target = queryTargetSel.value;
      if (!target) return;

      var resultIds, label, pathIds;

      if (type === "test-cases-for-story") {
        resultIds = testCasesForStory(target);
        label = "Test cases related to " + target;
        pathIds = [target].concat(
          outEdgesByRelation(target, "HAS_SCENARIO")
        ).concat(resultIds);
      } else if (type === "claims-for-policy") {
        resultIds = claimsForPolicy(target);
        label = "Claims related to " + target;
        pathIds = [target].concat(resultIds);
      } else if (type === "agents-for-story") {
        resultIds = agentsForStory(target);
        label = "Agents that worked " + target;
        var scenarios = outEdgesByRelation(target, "HAS_SCENARIO");
        var testCases = testCasesForStory(target);
        pathIds = [target].concat(scenarios).concat(testCases).concat(resultIds);
      } else {
        resultIds = policiesForCustomer(target);
        label = "Policies owned by " + target;
        pathIds = [target].concat(resultIds);
      }

      highlightedIds = new Set(pathIds);
      draw();

      if (resultIds.length === 0) {
        answerEl.textContent = label + ": none found.";
      } else {
        var described = resultIds.map(function (id) {
          var n = byId[id];
          var extra = n && (n.title || n.status) ? " (" + (n.title || n.status) + ")" : "";
          return id + extra;
        });
        answerEl.textContent = label + " \u2192 " + described.join(", ");
      }
      resultBox.hidden = false;
    }

    queryTypeSel.addEventListener("change", populateTargets);
    runBtn.addEventListener("click", runQuery);

    /* ---------- load data, then build ---------- */
    var kgSlide = document.getElementById("slide-4");
    var laidOut = false;

    function sizeAndDraw() {
      if (!graph) return;
      resizeCanvas();
      layout();
      draw();
      laidOut = true;
    }

    fetch("assets/kg-graph.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load graph data (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        graph = data;
        graph.nodes.forEach(function (n) { byId[n.id] = n; });
        buildAdjacency();
        buildLegend();

        STORY_KEYS = graph.nodes.filter(function (n) { return n.type === "Story"; })
          .map(function (n) { return n.id; });
        POLICY_IDS = graph.nodes.filter(function (n) { return n.type === "Policy"; })
          .map(function (n) { return n.id; });
        CUSTOMER_IDS = graph.nodes.filter(function (n) { return n.type === "Customer"; })
          .map(function (n) { return n.id; });
        populateTargets();

        // The canvas may still be `hidden` right now (only Slide 1 is visible
        // on load) — a hidden element has clientWidth/clientHeight of 0, so
        // sizing/laying out immediately would collapse every node to a point.
        // If the slide happens to already be active, size now; either way,
        // also watch for it becoming active and (re)size then.
        if (kgSlide.classList.contains("is-active")) {
          sizeAndDraw();
        }
      })
      .catch(function (err) {
        var wrapEl = document.querySelector(".kg-canvas-wrap");
        if (wrapEl) {
          wrapEl.innerHTML =
            '<p style="padding:20px;color:var(--text-dim);font-family:var(--mono);font-size:13px;">' +
            "Couldn't load the knowledge graph data right now." +
            "</p>";
        }
      });

    // Re-run sizing/layout whenever the canvas wrapper's actual rendered
    // size changes — this covers "slide just became visible" (its size
    // goes from 0 to real), ordinary window resizes, AND the case that was
    // actually breaking hover: sizing being measured a frame before the
    // slide's layout had fully settled, which left hit-testing coordinates
    // very slightly out of sync with what was drawn. A MutationObserver on
    // the "is-active" class (used below too, for the initial slide-1-style
    // canvas) fires the instant the class changes, not when layout is
    // actually final — ResizeObserver fires on the real settled size, which
    // is what hit-testing needs to line up correctly.
    var kgResizeObserver = new ResizeObserver(function () {
      if (kgSlide.classList.contains("is-active") && graph) {
        sizeAndDraw();
      }
    });
    kgResizeObserver.observe(wrap);

    // Re-run sizing/layout every time Slide 4 becomes the active slide —
    // covers both "first time it's ever shown" and "window was resized
    // while a different slide was active". Same MutationObserver pattern
    // used for the Slide 1 orchestration canvas above.
    var kgObserver = new MutationObserver(function () {
      if (kgSlide.classList.contains("is-active")) {
        sizeAndDraw();
      }
    });
    kgObserver.observe(kgSlide, { attributes: true, attributeFilter: ["class"] });
  }
})();
