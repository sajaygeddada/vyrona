import { qs, qsa, clear } from "./ui.js";

const routes = {};
let currentRoute = "dashboard";

export function registerRoute(name, renderFn) {
  routes[name] = renderFn;
}

export function navigate(name) {
  if (!routes[name]) name = "dashboard";
  currentRoute = name;
  window.location.hash = `#/${name}`;
  render();
  qsa(".nav-item").forEach((btn) => btn.classList.toggle("active", btn.dataset.route === name));
  const root = qs("#view-root");
  if (root) root.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

export function getCurrentRoute() {
  return currentRoute;
}

export function render() {
  const root = qs("#view-root");
  if (!root) return;
  clear(root);
  const fn = routes[currentRoute] || routes.dashboard;
  try {
    fn(root);
  } catch (e) {
    console.error("[vyrona] render error", e);
    root.appendChild(document.createTextNode("Something went wrong rendering this view."));
  }
}

export function initRouter() {
  qsa(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });
  const fromHash = (window.location.hash || "").replace("#/", "");
  navigate(fromHash && routes[fromHash] ? fromHash : "dashboard");
}
