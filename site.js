/* ==========================================================================
   ANUNNAKI — site behaviour
   Progressive enhancement only. Every page is fully readable with this file
   absent: nav is a plain list, tabs render as stacked sections, the spec
   table shows metric with imperial already in the markup.
   ========================================================================== */

(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     Header: transparent over hero, solid on scroll.
     Threshold is deliberately small — the swap should happen before the
     nav labels start colliding with pale areas of the render.
     ------------------------------------------------------------------------ */

  var header = document.querySelector("[data-header]");

  if (header) {
    var overHero = header.getAttribute("data-over-hero") === "true";
    var threshold = overHero ? 64 : 8;
    var lastState = null;

    var syncHeader = function () {
      var scrolled = window.scrollY > threshold;
      if (scrolled === lastState) return;
      lastState = scrolled;
      header.classList.toggle("is-scrolled", scrolled);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
  }

  /* ------------------------------------------------------------------------
     Mobile drawer
     ------------------------------------------------------------------------ */

  var toggle = document.querySelector("[data-nav-toggle]");
  var drawer = document.querySelector("[data-drawer]");

  if (toggle && drawer) {
    var setDrawer = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      drawer.setAttribute("data-open", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };

    toggle.addEventListener("click", function () {
      setDrawer(toggle.getAttribute("aria-expanded") !== "true");
    });

    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) setDrawer(false);
    });

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setDrawer(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1000) setDrawer(false);
    });
  }

  /* ------------------------------------------------------------------------
     Reveal on scroll — 12px rise plus opacity, nothing more.
     Under reduced motion the class is applied immediately so nothing
     depends on an animation that will not run.
     ------------------------------------------------------------------------ */

  var reveals = document.querySelectorAll(".reveal");

  if (reveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

      reveals.forEach(function (el, index) {
        /* Stagger within a row, capped — a long list should not take
           two seconds to finish arriving. */
        el.style.transitionDelay = Math.min(index % 4, 3) * 60 + "ms";
        observer.observe(el);
      });
    }
  }

  /* ------------------------------------------------------------------------
     Unit toggle on spec tables.
     Both values live in the markup; this only chooses which is primary.
     ------------------------------------------------------------------------ */

  document.querySelectorAll("[data-unit-toggle]").forEach(function (group) {
    var scope = group.closest("[data-spec-scope]") || document;

    var apply = function (unit) {
      group.querySelectorAll("[data-unit]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", String(btn.getAttribute("data-unit") === unit));
      });

      scope.querySelectorAll("[data-metric]").forEach(function (cell) {
        var metric = cell.getAttribute("data-metric");
        var imperial = cell.getAttribute("data-imperial");
        if (!metric || !imperial) return;

        var primary = cell.querySelector("[data-primary]");
        var secondary = cell.querySelector("[data-secondary]");
        if (!primary || !secondary) return;

        primary.textContent = unit === "metric" ? metric : imperial;
        secondary.textContent = unit === "metric" ? imperial : metric;
      });
    };

    group.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-unit]");
      if (!btn) return;
      apply(btn.getAttribute("data-unit"));
    });
  });

  /* ------------------------------------------------------------------------
     Tabs — vessel switcher over a shared spec view.
     Roving tabindex, arrow keys, Home/End.
     ------------------------------------------------------------------------ */

  document.querySelectorAll("[data-tabs]").forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;

        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    };

    /* Only take over once JS confirms it can manage panel visibility. */
    select(tabs.find(function (t) { return t.getAttribute("aria-selected") === "true"; }) || tabs[0], false);

    root.addEventListener("click", function (event) {
      var tab = event.target.closest('[role="tab"]');
      if (tab) select(tab, false);
    });

    root.addEventListener("keydown", function (event) {
      var index = tabs.indexOf(document.activeElement);
      if (index === -1) return;

      var next = null;
      if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];

      if (next) {
        event.preventDefault();
        select(next, true);
      }
    });
  });

  /* ------------------------------------------------------------------------
     Technical drawings: zoom, not lightbox glamour.
     ------------------------------------------------------------------------ */

  document.querySelectorAll(".drawing--zoom").forEach(function (drawing) {
    var canvas = drawing.querySelector(".drawing__canvas");
    if (!canvas) return;

    canvas.setAttribute("tabindex", "0");
    canvas.setAttribute("role", "button");
    canvas.setAttribute("aria-label", "Toggle enlarged view of this drawing");

    var toggleZoom = function () {
      var zoomed = drawing.classList.toggle("is-zoomed");
      canvas.setAttribute("aria-pressed", String(zoomed));
    };

    canvas.addEventListener("click", toggleZoom);
    canvas.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleZoom();
      }
    });
  });

  /* ------------------------------------------------------------------------
     Gallery lightbox
     ------------------------------------------------------------------------ */

  var lightbox = document.querySelector("[data-lightbox]");

  if (lightbox) {
    var frame = lightbox.querySelector("[data-lightbox-frame]");
    var lastFocused = null;

    var closeLightbox = function () {
      lightbox.setAttribute("data-open", "false");
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    };

    document.querySelectorAll("[data-lightbox-open]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var sourceId = trigger.getAttribute("data-lightbox-open");
        var source = document.getElementById(sourceId);
        if (!source || !frame) return;

        lastFocused = trigger;
        frame.innerHTML = source.innerHTML;
        lightbox.setAttribute("data-open", "true");
        document.body.style.overflow = "hidden";

        var close = lightbox.querySelector("[data-lightbox-close]");
        if (close) close.focus();
      });
    });

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox || event.target.closest("[data-lightbox-close]")) {
        closeLightbox();
      }
    });

    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && lightbox.getAttribute("data-open") === "true") {
        closeLightbox();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Inquiry form: branch fields by buyer type.
     A port authority and a private owner need entirely different follow-ups,
     so the branch swaps the fieldset rather than adding optional inputs.
     ------------------------------------------------------------------------ */

  var inquiry = document.querySelector("[data-inquiry]");

  if (inquiry) {
    var branches = inquiry.querySelectorAll("[data-branch]");

    var showBranch = function (value) {
      branches.forEach(function (branch) {
        var match = branch.getAttribute("data-branch") === value;
        branch.hidden = !match;
        /* Hidden branches must not submit or block validation. */
        branch.querySelectorAll("input, select, textarea").forEach(function (input) {
          input.disabled = !match;
        });
      });
    };

    inquiry.querySelectorAll('[name="buyer-type"]').forEach(function (radio) {
      radio.addEventListener("change", function () { showBranch(radio.value); });
      if (radio.checked) showBranch(radio.value);
    });

    inquiry.addEventListener("submit", function (event) {
      event.preventDefault();
      var status = inquiry.querySelector("[data-form-status]");
      if (!status) return;

      status.hidden = false;
      status.textContent =
        "This prototype has no submission endpoint wired. In production this posts to the " +
        "inquiry handler and routes by buyer type. Reference: ANU-WEB-PROTO.";
      status.focus();
    });
  }

  /* ------------------------------------------------------------------------
     Copy a spec sheet as TSV.
     Procurement pastes these into a spreadsheet; giving them a clean copy
     path is cheaper than fielding the email asking for one.
     ------------------------------------------------------------------------ */

  document.querySelectorAll("[data-copy-table]").forEach(function (button) {
    button.addEventListener("click", function () {
      var table = document.getElementById(button.getAttribute("data-copy-table"));
      if (!table || !navigator.clipboard) return;

      var rows = Array.prototype.slice.call(table.querySelectorAll("tr"));
      var tsv = rows.map(function (row) {
        return Array.prototype.slice.call(row.querySelectorAll("th, td"))
          .map(function (cell) {
            return cell.textContent.replace(/\s+/g, " ").trim();
          })
          .join("\t");
      }).join("\n");

      navigator.clipboard.writeText(tsv).then(function () {
        var original = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(function () { button.textContent = original; }, 1800);
      });
    });
  });

  /* ------------------------------------------------------------------------
     Stamp the build year in footers so nothing goes stale by hand.
     ------------------------------------------------------------------------ */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
