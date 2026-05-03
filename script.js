(() => {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("main-nav");
  const navToggle = document.getElementById("nav-toggle");
  const headerCta = document.getElementById("header-cta");
  const popup = document.getElementById("scroll-popup");
  const popupClose = document.getElementById("popup-close");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setHeader = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 20);
  };

  const syncHeaderActions = () => {
    if (!navToggle || !headerCta) return;
    const burgerVisible = getComputedStyle(navToggle).display !== "none";
    headerCta.style.display = burgerVisible ? "none" : "inline-flex";
  };

  setHeader();
  window.addEventListener("scroll", setHeader, { passive: true });

  if (header && nav && navToggle) {
    navToggle.addEventListener("click", () => {
      const open = header.classList.toggle("menu-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
    });

    nav.querySelectorAll("a").forEach((anchor) => {
      anchor.addEventListener("click", () => {
        header.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Buka menu");
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 700) {
        header.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Buka menu");
      }
      syncHeaderActions();
    });

    syncHeaderActions();
  }

  const faqItems = [...document.querySelectorAll("[data-faq-item]")];
  faqItems.forEach((item) => {
    const trigger = item.querySelector("[data-faq-trigger]");
    const panel = item.querySelector("[data-faq-panel]");
    if (!trigger || !panel) return;

    panel.style.maxHeight = "0px";
    trigger.addEventListener("click", () => {
      const open = item.classList.contains("active");

      faqItems.forEach((it) => {
        it.classList.remove("active");
        const t = it.querySelector("[data-faq-trigger]");
        const p = it.querySelector("[data-faq-panel]");
        if (t) t.setAttribute("aria-expanded", "false");
        if (p) p.style.maxHeight = "0px";
      });

      if (!open) {
        item.classList.add("active");
        trigger.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    });
  });

  if (popup && !sessionStorage.getItem("popupDismissed")) {
    const onScroll = () => {
      if (window.scrollY > 720) {
        popup.classList.add("show");
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (popup && popupClose) {
    popupClose.addEventListener("click", () => {
      popup.classList.remove("show");
      sessionStorage.setItem("popupDismissed", "1");
    });
  }

  const setupDeckPreview = () => {
    const frame = document.getElementById("deck-frame");
    const fallback = document.getElementById("deck-fallback");
    const openLink = document.getElementById("deck-open");
    const downloadLink = document.getElementById("deck-download");
    if (!frame || !fallback) return;

    const deckPath = "assets/present/Qalifa%20Presentation_20250601_205728_0000.pdf";
    const deckAbsoluteUrl = new URL(deckPath, window.location.href).href;

    if (openLink) openLink.setAttribute("href", deckAbsoluteUrl);
    if (downloadLink) downloadLink.setAttribute("href", deckAbsoluteUrl);

    let loaded = false;
    frame.addEventListener("load", () => {
      loaded = true;
      fallback.hidden = true;
    });

    window.setTimeout(() => {
      if (!loaded) fallback.hidden = false;
    }, 5500);

    frame.src = `${deckAbsoluteUrl}#zoom=page-width&view=FitH`;
  };

  setupDeckPreview();

  if (!reduceMotion && "IntersectionObserver" in window) {
    const sections = document.querySelectorAll(".section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12 }
    );

    sections.forEach((section) => {
      section.classList.add("reveal");
      observer.observe(section);
    });
  }
})();
