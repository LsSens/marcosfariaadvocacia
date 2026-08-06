(function () {
  "use strict";

  var INSTAGRAM_URL = "https://www.instagram.com/marcosdonizetifaria.advocacia";

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

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fetchNews(full) {
    var url = full ? "/api/noticias?full=1" : "/api/noticias";
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Resposta " + res.status);
      return res.json();
    });
  }

  function renderHeroNewsFallback(list, message) {
    list.innerHTML =
      '<li class="hero-news-status is-error">' +
      escapeHtml(message) +
      "</li>";
  }

  function newsImageSrc(item, preferLarge) {
    if (preferLarge) {
      return (
        item.imageLarge ||
        item.image ||
        item.imageThumb ||
        item.imageFallback ||
        ""
      );
    }
    return (
      item.imageThumb ||
      item.imageLarge ||
      item.image ||
      item.imageFallback ||
      ""
    );
  }

  function heroNewsItemHtml(item) {
    var src = newsImageSrc(item, false);
    var fallback = item.imageFallback || "";
    var thumb = src
      ? '<span class="hero-news-thumb">' +
        '<img src="' +
        escapeHtml(src) +
        '" alt="" loading="lazy" width="120" height="68" ' +
        (fallback && fallback !== src
          ? 'data-fallback="' +
            escapeHtml(fallback) +
            '" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.removeAttribute(\'data-fallback\');}" '
          : "") +
        "/>" +
        "</span>"
      : "";

    return (
      '<li class="hero-news-item">' +
      '<a href="/noticias">' +
      thumb +
      '<span class="hero-news-copy">' +
      (item.dateLabel
        ? '<span class="hero-news-date">' +
          escapeHtml(item.dateLabel) +
          "</span>"
        : "") +
      '<span class="hero-news-title">' +
      escapeHtml(item.title) +
      "</span>" +
      "</span>" +
      "</a></li>"
    );
  }

  function initHeroNews() {
    var list = document.getElementById("hero-news-list");
    if (!list) return;

    list.setAttribute("aria-busy", "true");

    fetchNews(true)
      .then(function (data) {
        var items = ((data && data.items) || []).filter(function (item) {
          return (
            item.source === "INSS" &&
            (item.image || item.imageThumb || item.imageLarge || item.imageFallback)
          );
        });
        list.setAttribute("aria-busy", "false");
        if (!items.length) {
          renderHeroNewsFallback(
            list,
            "Não foi possível carregar as notícias agora."
          );
          return;
        }

        list.innerHTML = items.slice(0, 5).map(heroNewsItemHtml).join("");
      })
      .catch(function () {
        list.setAttribute("aria-busy", "false");
        renderHeroNewsFallback(list, "Notícias indisponíveis no momento.");
      });
  }

  function newsMediaHtml(item) {
    var src = newsImageSrc(item, true);
    var fallback = item.imageThumb || item.imageFallback || "";
    if (src) {
      return (
        '<figure class="news-article-media">' +
        '<img src="' +
        escapeHtml(src) +
        '" alt="' +
        escapeHtml(item.imageAlt || item.title || "") +
        '" loading="lazy" width="400" height="225" ' +
        (fallback && fallback !== src
          ? 'data-fallback="' +
            escapeHtml(fallback) +
            '" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.removeAttribute(\'data-fallback\');}else{this.closest(\'.news-article-media\').classList.add(\'is-fallback\');this.remove();}" '
          : "") +
        "/>" +
        "</figure>"
      );
    }

    return (
      '<figure class="news-article-media news-article-media--' +
      escapeHtml(String(item.source || "").toLowerCase()) +
      '" aria-hidden="true">' +
      '<span class="news-article-mark">' +
      escapeHtml(item.sourceLabel || item.source) +
      "</span>" +
      "</figure>"
    );
  }

  function newsArticleHtml(item) {
    return (
      '<article class="news-article" data-source="' +
      escapeHtml(item.source) +
      '">' +
      newsMediaHtml(item) +
      '<div class="news-article-body">' +
      '<div class="news-article-top">' +
      '<p class="news-article-meta">' +
      '<span class="news-article-badge news-article-badge--' +
      escapeHtml(String(item.source || "").toLowerCase()) +
      '">' +
      escapeHtml(item.sourceLabel || item.source) +
      "</span>" +
      (item.category
        ? '<span class="news-article-category">' +
          escapeHtml(item.category) +
          "</span>"
        : "") +
      (item.dateLabel
        ? '<span class="news-article-date">' +
          escapeHtml(item.dateLabel) +
          "</span>"
        : "") +
      "</p>" +
      "<h3 class=\"news-article-title\">" +
      escapeHtml(item.title) +
      "</h3>" +
      (item.summary
        ? '<p class="news-article-summary">' +
          escapeHtml(item.summary) +
          "</p>"
        : "") +
      '<a class="news-article-link" href="' +
      escapeHtml(item.url) +
      '" target="_blank" rel="noopener noreferrer">Ler na fonte oficial</a>' +
      "</div>" +
      '<footer class="news-article-source">' +
      "<span>Fonte</span>" +
      "<strong>" +
      escapeHtml(item.sourceName || item.sourceLabel || item.source) +
      "</strong>" +
      "<em>" +
      escapeHtml(item.sourceLabel || item.source) +
      "</em>" +
      "</footer>" +
      "</div>" +
      "</article>"
    );
  }

  function initNewsPage() {
    var board = document.getElementById("news-board");
    if (!board) return;

    var updated = document.getElementById("news-updated");
    var filters = document.querySelectorAll("[data-news-filter]");
    var allItems = [];
    var currentFilter = "all";

    board.setAttribute("aria-busy", "true");

    function renderBoard() {
      var items =
        currentFilter === "all"
          ? allItems
          : allItems.filter(function (item) {
              return item.source === currentFilter;
            });

      board.setAttribute("aria-busy", "false");

      if (!items.length) {
        board.innerHTML =
          '<p class="news-board-status">Nenhuma publicação encontrada para este filtro.</p>';
        return;
      }

      board.innerHTML = items.map(newsArticleHtml).join("");
    }

    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentFilter = btn.getAttribute("data-news-filter") || "all";
        filters.forEach(function (el) {
          var active = el === btn;
          el.classList.toggle("is-active", active);
          el.setAttribute("aria-selected", active ? "true" : "false");
        });
        renderBoard();
      });
    });

    fetchNews(true)
      .then(function (data) {
        allItems = (data && data.items) || [];
        if (!allItems.length) {
          board.setAttribute("aria-busy", "false");
          board.innerHTML =
            '<p class="news-board-status is-error">Não foi possível carregar as publicações agora. Tente novamente em instantes.</p>';
          return;
        }

        if (updated && data.updatedAt) {
          var when = new Date(data.updatedAt);
          if (!Number.isNaN(when.getTime())) {
            updated.hidden = false;
            updated.textContent =
              "Atualizado em " +
              when.toLocaleDateString("pt-BR") +
              " às " +
              when.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
          }
        }

        renderBoard();
      })
      .catch(function () {
        board.setAttribute("aria-busy", "false");
        board.innerHTML =
          '<p class="news-board-status is-error">As atualizações estão indisponíveis no momento. Volte mais tarde ou consulte as fontes oficiais do INSS e do STJ.</p>';
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyConfig();
    initNav();
    initFaq();
    initReveal();
    initHeaderScroll();
    initHeroNews();
    initNewsPage();
  });
})();
