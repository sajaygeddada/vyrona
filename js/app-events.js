export function rerender() {
  window.dispatchEvent(new CustomEvent("vyrona:rerender"));
}

export function goTo(routeName) {
  window.dispatchEvent(new CustomEvent("vyrona:navigate", { detail: routeName }));
}
