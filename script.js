/* ============================================================
   VK AI Labs — showcase deck controller
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Slide navigation ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".dot"));
  var nextBtn = document.getElementById("next-btn");
  var nextLabel = document.getElementById("next-btn-label");
  var TOTAL = slides.length;
  var current = 0;

  // Label + aria for the Next button, per slide it will advance TO.
  var NEXT_LABELS = ["Architecture", "AI Orchestration", "System Flow", null];

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

  /* ---------- Keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    if (lightboxOpen) return; // lightbox handles its own keys
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
})();
