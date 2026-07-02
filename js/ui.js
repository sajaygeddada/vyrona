// Small, dependency-free DOM helpers shared across views.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}
export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function toast(message, { type = "default", icon = "✨" } = {}) {
  const layer = document.getElementById("toast-layer");
  if (!layer) return;
  const node = el("div", { class: `toast ${type}` }, [`${icon} ${message}`]);
  layer.appendChild(node);
  setTimeout(() => {
    node.style.transition = "opacity 220ms ease, transform 220ms ease";
    node.style.opacity = "0";
    node.style.transform = "translateY(-6px)";
    setTimeout(() => node.remove(), 240);
  }, 2600);
}

export function xpFloat(amount, originEl) {
  const layer = document.getElementById("xp-fx-layer");
  if (!layer) return;
  const rect = originEl?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top : window.innerHeight / 2;
  const node = el("div", { class: "xp-fx" }, [amount >= 0 ? `+${amount} XP` : `${amount} XP`]);
  node.style.left = `${x - 24}px`;
  node.style.top = `${y}px`;
  if (amount < 0) node.style.color = "var(--danger)";
  layer.appendChild(node);
  setTimeout(() => node.remove(), 1150);
}

export function openModal(contentEl, { onClose } = {}) {
  const root = document.getElementById("modal-root");
  const backdrop = el("div", {
    class: "modal-backdrop",
    onclick: (e) => {
      if (e.target === backdrop) close();
    },
  });
  const sheet = el("div", { class: "modal-sheet" }, [contentEl]);
  backdrop.appendChild(sheet);
  root.appendChild(backdrop);
  function close() {
    backdrop.remove();
    onClose?.();
  }
  const escHandler = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
  return close;
}

export function modalHeader(title, closeFn) {
  return el("div", { class: "modal-head" }, [
    el("h3", {}, title),
    el("button", { class: "modal-close", "aria-label": "Close", onclick: () => closeFn() }, "✕"),
  ]);
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function fmtDate(iso, opts) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, opts || { weekday: "long", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function celebrateLevelUp(level, title) {
  const content = el("div", { class: "level-up-modal" }, [
    el("div", { class: "lvl-icon" }, "🎉"),
    el("h2", {}, `Level ${level}!`),
    el("p", {}, `You've reached the rank of ${title}. Keep the momentum going.`),
    el("button", { class: "btn btn-primary btn-block mt-4", onclick: () => close() }, "Let's go"),
  ]);
  const close = openModal(content);
}
