import { Store } from "./state.js";
import { applyTheme } from "./themes.js";
import { registerRoute, navigate, initRouter, render, getCurrentRoute } from "./router.js";
import { renderDashboard } from "./dashboard.js";
import { renderHabits } from "./habits.js";
import { renderGoals } from "./goals.js";
import { renderJournal } from "./journal.js";
import { renderReview } from "./review.js";
import { renderAchievements } from "./achievements.js";
import { renderSettings } from "./settings.js";
import { qs, toast } from "./ui.js";
import { rescheduleAll } from "./notifications.js";
import * as DB from "./db.js";

// ---------- Route registration ----------
registerRoute("dashboard", renderDashboard);
registerRoute("habits", renderHabits);
registerRoute("goals", renderGoals);
registerRoute("journal", renderJournal);
registerRoute("review", renderReview);
registerRoute("achievements", renderAchievements);
registerRoute("settings", renderSettings);

// ---------- Boot sequence ----------
async function boot() {
  applyTheme();
  DB.attachSyncHook();

  Store.subscribe(() => {
    applyTheme();
    const avatar = qs("#topbar-avatar");
    if (avatar) avatar.textContent = (Store.getData().profile.name || "V").slice(0, 1).toUpperCase();
  });

  window.addEventListener("vyrona:rerender", () => render());
  window.addEventListener("vyrona:navigate", (e) => navigate(e.detail));
  window.addEventListener("vyrona:signout", handleAuthAction);

  await tryRestoreSession();
  registerServiceWorker();
}

async function tryRestoreSession() {
  if (!DB.isConfigured()) {
    showAuth();
    return;
  }
  try {
    const session = await DB.initAuth();
    if (session) {
      await DB.pullRemote();
      showApp();
    } else {
      showAuth();
    }
  } catch (e) {
    console.error("[vyrona] session restore failed", e);
    showAuth();
  }
}

function showApp() {
  qs("#auth-screen").hidden = true;
  qs("#app").hidden = false;
  initRouter();
  rescheduleAll(Store.getData().habits);
  const avatar = qs("#topbar-avatar");
  if (avatar) avatar.textContent = (Store.getData().profile.name || "V").slice(0, 1).toUpperCase();
}

function showAuth() {
  qs("#app").hidden = true;
  qs("#auth-screen").hidden = false;
  const note = qs("#auth-config-note");
  if (note) {
    note.textContent = DB.isConfigured()
      ? "Your data syncs securely via Supabase."
      : "Cloud sync isn't configured yet — you can still use Vyrona offline as a Guest.";
  }
}

// ---------- Auth screen wiring ----------
let authMode = "signin"; // 'signin' | 'signup'

function setAuthStatus(message, type = "error") {
  const box = qs("#auth-status");
  if (!box) return;
  if (!message) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.className = `auth-status ${type === "info" ? "info" : ""}`;
  box.textContent = message;
}

function wireAuthScreen() {
  const form = qs("#auth-form");
  const toggleBtn = qs("#auth-toggle");
  const toggleText = qs("#auth-toggle-text");
  const submitBtn = qs("#auth-submit");
  const guestBtn = qs("#auth-guest");

  toggleBtn?.addEventListener("click", () => {
    authMode = authMode === "signin" ? "signup" : "signin";
    submitBtn.textContent = authMode === "signin" ? "Sign in" : "Create account";
    toggleBtn.textContent = authMode === "signin" ? "Create an account" : "Sign in instead";
    toggleText.textContent = authMode === "signin" ? "New here?" : "Already have an account?";
    setAuthStatus("");
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!DB.isConfigured()) {
      setAuthStatus("Cloud sync isn't configured. Use Guest mode, or add Supabase credentials — see README.md.", "info");
      return;
    }
    const email = qs("#auth-email").value.trim();
    const password = qs("#auth-password").value;
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait…";
    try {
      if (authMode === "signin") {
        await DB.signIn(email, password);
      } else {
        await DB.signUp(email, password);
        setAuthStatus("Account created. Signing you in…", "info");
      }
      await DB.pullRemote();
      setAuthStatus("");
      showApp();
      toast("Welcome to Vyrona", { icon: "🎮", type: "success" });
    } catch (err) {
      setAuthStatus(err?.message || "Something went wrong. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = authMode === "signin" ? "Sign in" : "Create account";
    }
  });

  guestBtn?.addEventListener("click", () => {
    showApp();
    toast("Playing as Guest — data stays on this device", { icon: "👤" });
  });
}

async function handleAuthAction() {
  const session = DB.getSession();
  if (session) {
    await DB.signOut();
    toast("Signed out", { icon: "👋" });
    showAuth();
  } else {
    showAuth();
  }
}

// ---------- Service worker ----------
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("[vyrona] SW registration failed", e));
  }
}

wireAuthScreen();
boot();
