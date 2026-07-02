import { Store } from "./state.js";
import { el, toast } from "./ui.js";
import { THEMES, CATEGORIES, getTheme, themePreview, applyTheme } from "./themes.js";
import { requestPermission } from "./notifications.js";
import { isConfigured, getSession } from "./db.js";
import { rerender } from "./app-events.js";

export function renderSettings(root) {
  const settings = Store.getSettings();
  const data = Store.getData();
  const session = getSession();
  root.append(
    el("header", { class: "settings-title" }, [el("div", {}, [el("span", { class: "eyebrow" }, "Personalize Vyrona"), el("h1", {}, "Settings"), el("p", {}, "Make your workspace feel unmistakably yours.")])]),
    renderThemeBrowser(settings),
    el("div", { class: "settings-panels" }, [renderProfile(data, session), renderPreferences(settings), renderDataPanel()]),
    el("div", { style: "height:40px" })
  );
}

function renderProfile(data, session) {
  const input = el("input", { type: "text", value: data.profile.name, maxlength: "40", "aria-label": "Display name" });
  input.addEventListener("change", () => Store.updateProfile({ name: input.value.trim() || "Adventurer" }));
  const account = session ? `Signed in as ${session.user.email}` : isConfigured() ? "Guest mode — sign in to sync across devices" : "Guest mode · Local data only";
  return settingsPanel("Profile", "Identity and account", "◉", [
    el("label", { class: "field" }, [el("span", {}, "Display name"), input]),
    settingRow("Account", account, session
      ? el("button", { class: "btn btn-ghost btn-sm", onclick: () => window.dispatchEvent(new CustomEvent("vyrona:signout")) }, "Sign out")
      : isConfigured() ? el("button", { class: "btn btn-primary btn-sm", onclick: () => window.dispatchEvent(new CustomEvent("vyrona:signout")) }, "Sign in") : null)
  ]);
}

function renderPreferences(settings) {
  return settingsPanel("Behavior", "Motion, reminders and challenge", "◇", [
    toggleRow("Reminders & notifications", "Habit reminders at the times you choose", settings.notifications, async on => { if (on) await requestPermission(); setSetting({ notifications: on }); }),
    toggleRow("Streak penalties", "Lose XP when a streak breaks", settings.penaltyEnabled, on => setSetting({ penaltyEnabled: on })),
    toggleRow("Reduce motion", "Minimize interface animations", settings.reduceMotion, on => setSetting({ reduceMotion: on }))
  ]);
}

function renderDataPanel() {
  return settingsPanel("Your data", "Portable, local-first, under your control", "⇄", [
    el("div", { class: "data-actions" }, [
      el("button", { class: "btn btn-ghost", onclick: exportData }, "Export backup"),
      el("label", { class: "btn btn-ghost", style: "cursor:pointer" }, ["Import backup", el("input", { type: "file", accept: "application/json", style: "display:none", onchange: importData })]),
      el("button", { class: "btn btn-danger", onclick: resetData }, "Reset all data")
    ])
  ]);
}

function settingsPanel(title, description, icon, children) {
  return el("section", { class: "settings-panel" }, [
    el("div", { class: "settings-panel-head" }, [el("span", { class: "settings-panel-icon" }, icon), el("div", {}, [el("h2", {}, title), el("p", {}, description)])]),
    el("div", { class: "settings-panel-body" }, children)
  ]);
}

function renderThemeBrowser(settings) {
  const selected = getTheme(settings.themeId);
  const favorites = settings.favoriteThemes || [];
  const grid = el("div", { class: "theme-grid" });
  const search = el("input", { class: "theme-search", type: "search", placeholder: "Search themes...", "aria-label": "Search themes" });
  let category = "All";
  function paint() {
    const query = search.value.trim().toLowerCase();
    const visible = THEMES.filter(t => (category === "All" || (category === "Favorites" ? favorites.includes(t.id) : t.category === category)) && `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(query));
    grid.replaceChildren(...visible.map(t => themeCard(t, settings, favorites)));
    if (!visible.length) grid.append(el("div", { class: "theme-empty" }, category === "Favorites" ? "Your favorite themes will gather here." : "No themes match that search."));
  }
  const tabs = el("div", { class: "theme-tabs" }, CATEGORIES.map(name => el("button", { class: `theme-tab ${name === "All" ? "active" : ""}`, onclick: event => { category = name; tabs.querySelectorAll(".theme-tab").forEach(node => node.classList.toggle("active", node === event.currentTarget)); paint(); } }, name)));
  search.addEventListener("input", paint);
  paint();
  return el("section", { class: "theme-studio" }, [
    el("div", { class: "theme-studio-head" }, [el("div", {}, [el("div", { class: "eyebrow" }, "Appearance"), el("h2", {}, "Theme Studio"), el("p", {}, "Every theme reshapes surfaces, controls, charts, glow, and atmosphere.")]), el("span", { class: "theme-count" }, `${THEMES.length} themes`)]),
    el("div", { class: "current-theme", style: themePreview(selected) }, [el("div", { class: "current-theme-art" }, [el("i"), el("i"), el("i")]), el("div", { class: "current-theme-copy" }, [el("span", { class: "theme-category" }, `${selected.category} · ${selected.mode}`), el("h3", {}, selected.name), el("p", {}, selected.description), el("div", { class: "theme-colors" }, [selected.accent, selected.accent2, selected.card].map(color => el("i", { style: `background:${color}` })))]), el("div", { class: "current-badge" }, "Active")]),
    el("div", { class: "theme-toolbar" }, [search, tabs]), grid
  ]);
}

function themeCard(theme, settings, favorites) {
  const active = settings.themeId === theme.id;
  const favorite = favorites.includes(theme.id);
  const card = el("article", { class: `theme-card ${active ? "active" : ""}`, style: themePreview(theme), tabindex: "0" }, [
    el("div", { class: "theme-preview" }, [el("div", { class: "preview-sidebar" }), el("div", { class: "preview-main" }, [el("i"), el("i"), el("b")]), el("button", { class: `theme-favorite ${favorite ? "active" : ""}`, title: favorite ? "Remove favorite" : "Add favorite", "aria-label": favorite ? "Remove favorite" : "Add favorite", onclick: event => { event.stopPropagation(); toggleFavorite(theme.id, favorites); } }, favorite ? "★" : "☆")]),
    el("div", { class: "theme-card-body" }, [el("div", {}, [el("h3", {}, theme.name), el("span", {}, `${theme.category} · ${theme.mode}`)]), el("button", { class: `btn btn-sm ${active ? "btn-ghost" : "btn-primary"}`, disabled: active, onclick: () => setSetting({ themeId: theme.id }) }, active ? "Applied" : "Use theme")])
  ]);
  const preview = () => { if (!active) applyTheme(theme.id); };
  const restore = () => { if (!active) applyTheme(Store.getSettings().themeId); };
  card.addEventListener("mouseenter", preview);
  card.addEventListener("mouseleave", restore);
  card.addEventListener("focusin", preview);
  card.addEventListener("focusout", restore);
  return card;
}

function settingRow(label, description, control) {
  return el("div", { class: "settings-row" }, [el("div", {}, [el("div", { class: "settings-row-label" }, label), el("div", { class: "settings-row-desc" }, description)]), control]);
}

function toggleRow(label, description, on, onToggle) {
  return settingRow(label, description, el("button", { class: `switch ${on ? "on" : ""}`, role: "switch", "aria-checked": String(on), "aria-label": label, onclick: event => { const next = !on; onToggle(next); event.currentTarget.classList.toggle("on", next); event.currentTarget.setAttribute("aria-checked", String(next)); } }));
}

function toggleFavorite(id, favorites) {
  setSetting({ favoriteThemes: favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id] });
}

function setSetting(patch) {
  Store.updateSettings(patch);
  applyTheme();
  rerender();
}

function exportData() {
  const payload = { data: Store.getData(), settings: Store.getSettings(), exportedAt: new Date().toISOString() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `vyrona-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast("Backup downloaded", { icon: "↓", type: "success" });
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { try { const parsed = JSON.parse(reader.result); if (parsed.data) Store.replaceData(parsed.data); if (parsed.settings) Store.updateSettings(parsed.settings); applyTheme(); toast("Backup restored", { icon: "✓", type: "success" }); rerender(); } catch { toast("Invalid backup file", { icon: "!" }); } };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("This will permanently erase all local Vyrona data on this device. Continue?")) return;
  localStorage.removeItem("vyrona:v1:data");
  location.reload();
}
