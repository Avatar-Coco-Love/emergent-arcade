// Small DOM and storage helpers shared by the gallery and the cabinet.
window.ArcadeUI = (function () {
  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    for (const child of children || []) {
      if (child != null && child !== false) node.append(child);
    }
    return node;
  }

  // Inline SVG icon from a path string (24×24 box, stroked in currentColor).
  function icon(paths) {
    const span = el("span", { className: "icon-svg", ariaHidden: "true" });
    span.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    return span;
  }

  // localStorage can throw (private windows, blocked site data): every access
  // goes through these and the page works without it.
  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (_) {}
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (_) {}
    },
    keys() {
      try { return Object.keys(localStorage); } catch (_) { return []; }
    },
    json(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
    },
  };

  // "2026-09-27" -> "Sep 27" (with the year when it isn't this year).
  function shortDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const opts = { month: "short", day: "numeric" };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
    return d.toLocaleDateString("en-US", opts);
  }

  // Stacking toasts: each message gets its own element and timer, so a
  // second unlock never overwrites the first. `actions` makes it a callout
  // that stays until a button is pressed (or `ms` runs out, if given).
  function toaster(container, max) {
    return function toast(text, opts) {
      opts = opts || {};
      const item = el("div", { className: `toast${opts.kind ? " toast-" + opts.kind : ""}` });
      item.append(el("span", { className: "toast-text", textContent: text }));
      let timer = null;
      const close = () => {
        clearTimeout(timer);
        item.remove();
      };
      if (opts.actions) {
        item.classList.add("callout");
        const row = el("div", { className: "toast-actions" });
        for (const a of opts.actions) {
          const btn = el("button", { type: "button", className: a.primary ? "primary small" : "secondary small", textContent: a.label });
          btn.addEventListener("click", () => {
            close();
            if (a.onClick) a.onClick();
          });
          row.append(btn);
        }
        item.append(row);
      }
      container.append(item);
      while (container.children.length > (max || 3)) container.firstChild.remove();
      const ms = opts.ms !== undefined ? opts.ms : opts.actions ? 0 : 3500;
      if (ms) timer = setTimeout(close, ms);
      return close;
    };
  }

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  function focusables(root) {
    return [...root.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
  }

  // Keeps Tab inside `root` while it is open. Returns a function that removes the trap.
  function trapFocus(root) {
    function onKey(evt) {
      if (evt.key !== "Tab") return;
      const list = focusables(root);
      if (!list.length) {
        evt.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (evt.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        evt.preventDefault();
        last.focus();
      } else if (!evt.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        evt.preventDefault();
        first.focus();
      }
    }
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }

  // Saves text as a file through a Blob (works without a server round trip).
  function saveFile(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    const a = el("a", { href: url, download: name });
    a.style.display = "none";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function typing(evt) {
    const t = evt.target;
    return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
  }

  const reducedMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const touch = () => !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);

  return { el, icon, store, shortDate, toaster, trapFocus, focusables, saveFile, typing, reducedMotion, touch };
})();
