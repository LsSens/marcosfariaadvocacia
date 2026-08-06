(function () {
  "use strict";

  /** Troque quando o Instagram estiver criado */
  var INSTAGRAM_URL = "";

  var WA_BASE = "https://wa.me/5513997497278";
  var MAPS_URL =
    "https://www.google.com/maps/search/?api=1&query=Santos+SP";

  function waUrl(message) {
    var text = message || "Olá, gostaria de agendar uma consulta.";
    return WA_BASE + "?text=" + encodeURIComponent(text);
  }

  function applyConfig() {
    document.querySelectorAll("[data-wa]").forEach(function (el) {
      var msg = el.getAttribute("data-wa-msg") || "";
      el.setAttribute("href", waUrl(msg));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });

    document.querySelectorAll("[data-instagram]").forEach(function (el) {
      if (INSTAGRAM_URL) {
        el.setAttribute("href", INSTAGRAM_URL);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
        el.removeAttribute("aria-disabled");
        el.classList.remove("is-disabled");
        var action = el.querySelector(".card-action");
        if (action) {
          var t = action.textContent.trim();
          if (t === "Em breve" || t === "Instagram") {
            action.textContent = "Seguir no Instagram";
          }
        }
      } else {
        el.setAttribute("href", "#");
        el.setAttribute("aria-disabled", "true");
        el.classList.add("is-disabled");
        el.addEventListener("click", function (e) {
          e.preventDefault();
        });
      }
    });

    document.querySelectorAll("[data-maps]").forEach(function (el) {
      el.setAttribute("href", MAPS_URL);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });
  }

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav-panel") || document.querySelector(".nav-links");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      document.body.classList.toggle("nav-open", open);
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
        document.body.classList.remove("nav-open");
      });
    });
  }

  function initFaq() {
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var btn = item.querySelector(".faq-question");
      var panel = item.querySelector(".faq-answer");
      if (!btn || !panel) return;

      btn.addEventListener("click", function () {
        var wasOpen = item.classList.contains("is-open");
        document.querySelectorAll(".faq-item.is-open").forEach(function (openItem) {
          openItem.classList.remove("is-open");
          var q = openItem.querySelector(".faq-question");
          var a = openItem.querySelector(".faq-answer");
          if (q) q.setAttribute("aria-expanded", "false");
          if (a) a.hidden = true;
        });
        if (!wasOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          panel.hidden = false;
        }
      });
    });
  }

  function initReveal() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var els = document.querySelectorAll(".reveal");
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  function initHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 20);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyConfig();
    initNav();
    initFaq();
    initReveal();
    initHeaderScroll();
  });
})();
