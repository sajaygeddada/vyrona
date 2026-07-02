import { Store, todayISO } from "./state.js";
import { el } from "./ui.js";

const QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements lead to staggering long-term results.",
  "You do not rise to the level of your goals. You fall to the level of your systems.",
  "Motivation gets you started. Habit keeps you going.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Progress, not perfection.",
  "Every level starts as a grind. Keep going.",
];

function quoteOfDay() {
  const day = new Date().getDate();
  return QUOTES[day % QUOTES.length];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function renderDashboard(root) {
  const d = Store.getData();
  const lvl = Store.levelInfo();
  const score = Store.todayScore();
  const habitsLeft = Store.todayHabits().filter((h) => {
    const log = Store.logForHabitToday(h.id);
    const target = Number(h.target) || 1;
    return !log || log.value < target;
  }).length;

  let longestStreak = 0;
  d.habits.forEach((h) => {
    longestStreak = Math.max(longestStreak, Store.habitStreak(h.id).current);
  });

  const hero = el("section", { class: "hero-card" }, [
    el("div", { class: "hero-greeting" }, `${greeting()}, ${d.profile.name.split(" ")[0]} 👋`),
    el("div", { class: "hero-sub" }, quoteOfDay()),
    el("div", { class: "hero-score" }, [
      el("span", { class: "num" }, String(score)),
      el("span", { class: "max" }, "/100 Today Score"),
    ]),
    el("div", { class: "hero-meta" }, [
      metaItem("🔥", `${longestStreak} Day Streak`),
      metaItem("⚡", `${lvl.totalXp} XP`),
      metaItem("🏆", `Lv.${lvl.level} ${lvl.title}`),
      metaItem("🎯", `${habitsLeft} Tasks Left`),
    ]),
    el("div", { class: "level-bar-wrap" }, [
      el("div", { class: "level-bar-labels" }, [
        el("span", {}, `Level ${lvl.level}`),
        el("span", {}, `${lvl.xpIntoLevel} / ${lvl.xpForLevel} XP`),
      ]),
      el("div", { class: "level-bar" }, [el("div", { class: "level-bar-fill", style: `width:${lvl.pct}%` })]),
    ]),
    el("img", {
      class: "hero-art",
      src: "assets/images/dashboard-journey.png",
      alt: "",
      "aria-hidden": "true",
      loading: "eager",
      decoding: "async",
    }),
  ]);

  const stats = el("section", { class: "section" }, [
    sectionHead("Today's Snapshot"),
    el("div", { class: "stat-grid" }, [
      statCard("🔥", longestStreak, "Best Streak"),
      statCard("⚡", lvl.totalXp, "Total XP"),
      statCard("🏆", `Lv.${lvl.level}`, "Level"),
      statCard("🎯", `${d.goals.filter((g) => g.completed).length}/${d.goals.length}`, "Goals Done"),
      statCard("📓", d.journal.length, "Journal Entries"),
      statCard("✅", `${d.habits.filter((h) => !h.archived).length}`, "Active Habits"),
      statCard("😊", d.journal[0]?.mood || "—", "Last Mood"),
      statCard("🏅", d.achievementsUnlocked.length, "Achievements"),
    ]),
  ]);

  const brief = buildBrief(d);

  const quickHabits = el("section", { class: "section" }, [
    sectionHead("Quick Check-in", () => window.dispatchEvent(new CustomEvent("vyrona:navigate", { detail: "habits" }))),
    buildQuickHabitList(),
  ]);

  root.append(hero, brief, stats, quickHabits);
}

function metaItem(icon, text) {
  return el("div", { class: "hero-meta-item" }, [icon + " ", text]);
}

function statCard(icon, val, label) {
  return el("div", { class: "card stat-card" }, [
    el("div", { class: "stat-icon" }, icon),
    el("div", { class: "stat-val" }, String(val)),
    el("div", { class: "stat-label" }, label),
  ]);
}

function sectionHead(title, onSeeAll) {
  const head = el("div", { class: "section-head" }, [el("h2", {}, title)]);
  if (onSeeAll) head.appendChild(el("button", { class: "see-all", onclick: onSeeAll }, "See all →"));
  return head;
}

function buildBrief(d) {
  const habits = Store.todayHabits();
  const completed = habits.filter((h) => {
    const log = Store.logForHabitToday(h.id);
    return log && log.value >= (Number(h.target) || 1);
  }).length;

  const suggestions = [];
  habits
    .filter((h) => {
      const log = Store.logForHabitToday(h.id);
      return !log || log.value < (Number(h.target) || 1);
    })
    .slice(0, 4)
    .forEach((h) => suggestions.push(`Finish "${h.title}"`));
  if (!suggestions.length) suggestions.push("You're all caught up — consider adding a new habit or goal 🎉");

  const nearGoal = d.goals.find((g) => !g.completed && g.progress >= 60);
  if (nearGoal) suggestions.push(`Push "${nearGoal.title}" to the finish line (${nearGoal.progress}%)`);

  return el("section", { class: "section" }, [
    sectionHead("AI Daily Brief"),
    el("div", { class: "card brief-card" }, [
      el("div", { class: "row-between" }, [
        el("strong", {}, `${completed}/${habits.length} habits done today`),
        el("span", { class: "tag" }, todayISO()),
      ]),
      el("ul", { class: "brief-list" }, suggestions.map((s) => el("li", {}, ["• ", s]))),
    ]),
  ]);
}

function buildQuickHabitList() {
  const habits = Store.todayHabits().slice(0, 5);
  if (!habits.length) {
    return el("div", { class: "card empty-state" }, [
      el("div", { class: "empty-icon" }, "🌱"),
      el("h3", {}, "No habits yet"),
      el("p", {}, "Head to the Habits tab to create your first one."),
    ]);
  }
  return el(
    "div",
    { class: "item-list" },
    habits.map((h) => {
      const log = Store.logForHabitToday(h.id);
      const target = Number(h.target) || 1;
      const done = log && log.value >= target;
      const row = el("div", { class: `habit-row ${done ? "done" : ""}` }, [
        el("button", {
          class: `habit-check ${done ? "checked" : ""}`,
          "aria-label": "Toggle habit",
          onclick: (e) => {
            Store.toggleHabitDone(h.id);
            window.dispatchEvent(new CustomEvent("vyrona:rerender"));
          },
        }, done ? "✓" : ""),
        el("div", { class: "habit-info" }, [
          el("div", { class: "habit-title" }, h.title),
          el("div", { class: "habit-meta" }, [`🔥 ${Store.habitStreak(h.id).current}d streak`]),
        ]),
        el("div", { class: "habit-xp" }, `+${h.xpReward} XP`),
      ]);
      return row;
    })
  );
}
