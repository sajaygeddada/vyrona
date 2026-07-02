# 🎮 Vyrona — Life RPG PWA

A gamified habit & goal tracker. Habits, goals, XP, levels, streaks, journal,
weekly reviews, achievements — built as an installable Progressive Web App
with optional Supabase cloud sync. Works **100% offline as a Guest** out of
the box, no build step, no framework, no dependencies to install.

---

## ✨ Features

- **Habit Tracker** — checkbox, counter, timer, duration, number, distance,
  and money habit types, each with streaks, categories, reminders and XP.
- **Goals** — RPG-style quests with star difficulty, milestones, and big XP
  payouts on completion.
- **XP / Levels / Titles** — Rookie → Explorer → Warrior → Master → Legend.
- **Journal** — daily gratitude, wins, setbacks, mood tracking.
- **Weekly Review** — 7-day habit score chart + auto-generated summary.
- **Achievements** — 13 unlockable badges across common/rare/epic/legendary
  rarities.
- **Deep theming** — light & dark mode, 6 visual "worlds" (Nebula, Mountains,
  Beaches, Paper Sketch, Cars, Cities), and a 32-color accent palette.
- **Installable PWA** — works offline, add-to-homescreen on mobile & desktop.
- **Supabase sync** — optional. Sign in and your data syncs across devices;
  otherwise everything stays local in the browser (Guest mode).
- **No secrets in the login screen** — Supabase credentials live in `.env`,
  never hard-coded in HTML/JS you'd ship to users.

---

## 🚀 Quick start (Guest mode, zero setup)

You don't need Supabase, Node, or a build step to try Vyrona.

```bash
cd vyrona
python3 -m http.server 8080
# open http://localhost:8080
```

Click **Continue offline (Guest)** and you're in. Everything is saved to
`localStorage` on your device.

> Opening `index.html` directly via `file://` will NOT work, because the app
> uses ES modules, which browsers block from `file://` for security. Always
> serve it over `http://localhost` (any static server works: `python3 -m
> http.server`, `npx serve`, VS Code "Live Server", nginx, Vercel, Netlify, etc.)

---

## ☁️ Enabling Supabase cloud sync

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, open **SQL Editor** and run the contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates the `profiles`,
   `habits`, `habit_logs`, `goals`, and `journal_entries` tables with Row
   Level Security so users can only ever see their own data.
3. Go to **Project Settings → API** and copy your **Project URL** and
   **anon public key**.
4. Copy the env template and fill it in:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

5. Generate `js/config.js` from your `.env` (plain Node, no dependencies):

   ```bash
   node build-config.js
   ```

   This is what keeps your credentials out of `index.html` / the login
   screen — the rest of the app imports `CONFIG` from the generated
   `js/config.js`, never from a hard-coded string. Re-run this script any
   time you change `.env`.

6. Serve the app again. The login screen will now offer real email/password
   sign-up and sign-in, and your data will sync to Supabase in the
   background as you use the app (debounced ~1s after each change).

**Note:** the anon key is designed to be public (it's protected by the RLS
policies in `schema.sql`) — it's still good practice to keep `.env` out of
git, which `.gitignore` already does for you.

---

## 📱 Installing as an app

- **Android / desktop Chrome/Edge:** open the site, then use the browser's
  "Install app" / "Add to Home screen" prompt (or the ⊕ icon in the address
  bar).
- **iOS Safari:** Share → **Add to Home Screen**.

Once installed, Vyrona runs in its own window/icon and works offline thanks
to `sw.js` (the service worker), which caches the app shell.

---

## 🎨 Customization

Open **Settings** inside the app to change:

- **Mode:** Light / Dark
- **Theme World:** Nebula, Mountains, Beaches, Paper Sketch, Cars, Cities
- **Accent + secondary accent:** 32 curated colors (used for buttons,
  progress bars, and gradients)
- **Reminders, streak penalties, reduce motion**
- **Export / Import** a full JSON backup of your data
- **Reset all data** on this device

All color tokens live in `css/variables.css` if you want to add your own
palette colors or theme worlds — each skin is just a `--skin-bg-image` CSS
variable, no images required.

---

## 🗂 Project structure

```
vyrona/
├── index.html              # app shell + auth screen
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # service worker (offline caching)
├── build-config.js         # reads .env -> generates js/config.js
├── .env.example             # copy to .env and fill in Supabase creds
├── css/
│   ├── variables.css       # design tokens, color palette, theme skins
│   └── styles.css          # components & layout
├── js/
│   ├── app.js               # entry point / auth wiring / boot
│   ├── config.js            # AUTO-GENERATED — do not edit by hand
│   ├── state.js              # local store, XP/level math, streaks
│   ├── db.js                  # Supabase auth + background sync
│   ├── supabaseClient.js      # lazy-loaded Supabase SDK wrapper
│   ├── router.js              # hash router / nav
│   ├── ui.js                   # toast, modal, DOM helpers
│   ├── dashboard.js | habits.js | goals.js | journal.js
│   │   review.js | achievements.js | settings.js   # views
│   ├── xp.js                    # achievement defs, categories, XP tables
│   ├── themes.js                 # palette + skin application
│   ├── notifications.js           # habit reminder scheduling
│   └── app-events.js               # tiny pub/sub between views
├── icons/                    # SVG app icons (no binary assets needed)
└── supabase/schema.sql        # DB schema + RLS policies
```

---

## 🧠 How XP & levels work

- Every habit has a **difficulty** (Easy/Medium/Hard/Epic) → XP reward
  (10/20/35/60 XP).
- Every goal has a **1–5 star difficulty** → XP reward (1000 XP per star).
- Level requirement grows each level (`100 × level^1.32`, rounded), so
  climbing from Level 9 → 10 takes noticeably more XP than Level 1 → 2.
- Titles: **Rookie (Lv.1) → Explorer (Lv.5) → Warrior (Lv.10) → Master
  (Lv.18) → Legend (Lv.28)**.

---

## 🛣 Roadmap ideas (not yet built)

This first build focuses on the core loop — habits, goals, XP, journal,
review, achievements, and deep theming — done well and error-free. Natural
next modules, following the original vision doc: Finance tracker, Fitness/
workout logging, Learning/courses tracker, Career/job tracker, Vision Board,
Bucket List, Skill Tree, and an AI Coach panel. Happy to build any of these
next — just ask.
