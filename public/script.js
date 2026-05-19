(() => {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("main-nav");
  const navToggle = document.getElementById("nav-toggle");
  const headerCta = document.getElementById("header-cta");
  const popup = document.getElementById("scroll-popup");
  const popupClose = document.getElementById("popup-close");
  const packageGrid = document.getElementById("package-grid");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const normalizeHeader = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const getCellText = (cell) => {
    if (!cell) return "";
    if (typeof cell.v === "string") return cell.v.trim();
    if (cell.f) return String(cell.f).trim();
    if (cell.v === null || cell.v === undefined) return "";
    return String(cell.v).trim();
  };

  const findColumnIndex = (headers, aliases) =>
    headers.findIndex((header) => aliases.includes(header));

  const getHeaderIndexes = (headers) => {
    const nameIdx = findColumnIndex(headers, ["namapakej", "pakej", "package"]);
    const bulletIdx = findColumnIndex(headers, ["bulletpointpakej", "bulletpoint", "bullet"]);
    const priceIdx = findColumnIndex(headers, ["hargapakej", "harga", "price"]);
    const ctaIdx = findColumnIndex(headers, ["ctawassap", "ctawhatsapp", "cta", "mesejwhatsapp"]);
    const imageIdx = findColumnIndex(headers, ["gambar", "image", "imageurl", "poster", "img"]);

    return { nameIdx, bulletIdx, priceIdx, ctaIdx, imageIdx };
  };

  const hasRequiredHeaders = (indexes) =>
    [indexes.nameIdx, indexes.bulletIdx, indexes.priceIdx, indexes.ctaIdx].every((idx) => idx >= 0);

  const splitBulletPoints = (value) =>
    {
      const raw = String(value || "").replace(/\r/g, "\n").trim();
      if (!raw) return [];

      let parts = raw.split(/\n|•|\|/g);
      if (parts.length === 1 && raw.includes(", ")) {
        parts = raw.split(/\s*,\s*/g);
      }

      return parts
        .map((item) => item.replace(/^[\s\-*•]+/, "").trim())
        .filter(Boolean);
    };

  const buildWhatsappLink = (waNumber, message) => {
    const digits = String(waNumber || "").replace(/[^\d]/g, "");
    const baseUrl = digits ? `https://wa.me/${digits}` : "https://wa.me/";
    const text = encodeURIComponent(message || "Saya nak tahu lanjut tentang pakej ini.");
    return `${baseUrl}?text=${text}`;
  };

  const toDirectImageUrl = (url) => {
    const value = String(url || "").trim();
    if (!value) return "";

    const fileIdMatch =
      value.match(/drive\.google\.com\/file\/d\/([^/?]+)/i) ||
      value.match(/[?&]id=([^&]+)/i) ||
      value.match(/lh3\.googleusercontent\.com\/d\/([^=?/]+)/i);
    if (fileIdMatch?.[1]) {
      const fileId = fileIdMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
    }

    return value;
  };

  const loadSheetJsonp = (sheetId, sheetGid) =>
    new Promise((resolve, reject) => {
      const callbackName = `__sheetCb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const tqx = `out:json;responseHandler:${callbackName}`;
      const script = document.createElement("script");
      let timeoutId;

      const cleanup = () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
      };

      window[callbackName] = (payload) => {
        cleanup();
        resolve(payload);
      };

      script.async = true;
      script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=${encodeURIComponent(
        tqx
      )}&gid=${encodeURIComponent(sheetGid)}`;
      script.onerror = () => {
        cleanup();
        reject(new Error("Gagal ambil data Google Sheet."));
      };

      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("Masa memuat data Google Sheet tamat."));
      }, 12000);

      document.head.appendChild(script);
    });

  const renderPackageCard = (pkg, waNumber) => {
    const card = document.createElement("article");
    card.className = "package-card";

    if (pkg.imageUrl) {
      const figure = document.createElement("figure");
      figure.className = "package-media";

      const img = document.createElement("img");
      img.src = pkg.imageUrl;
      img.alt = `Poster ${pkg.name}`;
      img.loading = "lazy";
      figure.appendChild(img);
      card.appendChild(figure);
    }

    const tag = document.createElement("p");
    tag.className = "package-tag";
    tag.textContent = pkg.name;
    card.appendChild(tag);

    const list = document.createElement("ul");
    list.className = "package-list";
    if (pkg.bulletPoints.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Butiran pakej akan dikemaskini.";
      list.appendChild(li);
    } else {
      pkg.bulletPoints.forEach((point) => {
        const li = document.createElement("li");
        li.textContent = point;
        list.appendChild(li);
      });
    }
    card.appendChild(list);

    const price = document.createElement("p");
    price.className = "package-price";
    price.textContent = pkg.price || "Harga akan dikemaskini.";
    card.appendChild(price);

    const cta = document.createElement("a");
    cta.className = "btn btn-sm";
    cta.target = "_blank";
    cta.rel = "noopener noreferrer";
    cta.href = buildWhatsappLink(waNumber, pkg.ctaMessage || `Saya nak pakej ${pkg.name}`);
    cta.textContent = "WhatsApp Pakej Ini";
    card.appendChild(cta);

    return card;
  };

  const loadPackagesFromSheet = async () => {
    if (!packageGrid) return;

    const sheetId = packageGrid.dataset.sheetId;
    const sheetGid = packageGrid.dataset.sheetGid || "0";
    const waNumber = packageGrid.dataset.waNumber || "60193177117";

    if (!sheetId) {
      packageGrid.innerHTML =
        '<p class="package-state package-state-error">Pakej belum tersedia buat masa ini. Sila hubungi kami melalui WhatsApp untuk maklumat terkini.</p>';
      return;
    }

    try {
      const parsed = await loadSheetJsonp(sheetId, sheetGid);
      const columns = parsed.table?.cols || [];
      const sourceRows = parsed.table?.rows || [];
      const columnHeaders = columns.map((column) => normalizeHeader(column.label || ""));
      let indexes = getHeaderIndexes(columnHeaders);
      let rows = sourceRows;

      if (!hasRequiredHeaders(indexes) && sourceRows.length > 0) {
        const headerFromFirstRow = (sourceRows[0].c || []).map((cell) =>
          normalizeHeader(getCellText(cell))
        );
        const fallbackIndexes = getHeaderIndexes(headerFromFirstRow);
        if (hasRequiredHeaders(fallbackIndexes)) {
          indexes = fallbackIndexes;
          rows = sourceRows.slice(1);
        }
      }

      if (!hasRequiredHeaders(indexes)) {
        throw new Error(
          "Header wajib: Nama Pakej, Bullet Point pakej, Harga Pakej, Cta Wassap."
        );
      }

      const packages = rows
        .map((row) => {
          const cells = row.c || [];
          const name = getCellText(cells[indexes.nameIdx]);
          if (!name) return null;

          return {
            name,
            bulletPoints: splitBulletPoints(getCellText(cells[indexes.bulletIdx])),
            price: getCellText(cells[indexes.priceIdx]),
            ctaMessage: getCellText(cells[indexes.ctaIdx]),
            imageUrl:
              indexes.imageIdx >= 0 ? toDirectImageUrl(getCellText(cells[indexes.imageIdx])) : "",
          };
        })
        .filter(Boolean);

      if (packages.length === 0) {
        throw new Error("Tiada data pakej dijumpai dalam Google Sheet.");
      }

      packageGrid.innerHTML = "";
      packages.forEach((pkg) => {
        packageGrid.appendChild(renderPackageCard(pkg, waNumber));
      });
    } catch (error) {
      packageGrid.innerHTML =
        '<p class="package-state package-state-error">Pakej belum tersedia buat masa ini. Sila hubungi kami melalui WhatsApp untuk maklumat terkini.</p>';
      console.error(error);
    }
  };

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

  loadPackagesFromSheet();

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
