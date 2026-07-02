// Central state store for Vyrona.
// Local-first: everything lives in localStorage immediately. If the user is
// signed in to Supabase, mutations are also queued for background sync
// (see db.js). The app works fully offline as a guest.

const STORAGE_KEY = "vyrona:v1:data";
const SETTINGS_KEY = "vyrona:v1:settings";

const XP_TITLES = [
  { min: 1, title: "Rookie" },
  { min: 5, title: "Explorer" },
  { min: 10, title: "Warrior" },
  { min: 18, title: "Master" },
  { min: 28, title: "Legend" },
];

function titleForLevel(level) {
  let t = XP_TITLES[0].title;
  for (const step of XP_TITLES) if (level >= step.min) t = step.title;
  return t;
}

function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function defaultData() {
  return {
    profile: {
      id: null,
      name: "Sajay",
      email: null,
      xp: 0,
      level: 1,
      createdAt: new Date().toISOString(),
    },
    habits: [],
    habitLogs: [], // { id, habitId, date (YYYY-MM-DD), value, xpAwarded }
    goals: [],
    journal: [], // { id, date, gratitude, win, fail, learned, felt, tomorrow, mood }
    achievementsUnlocked: [], // achievement ids
    xpEvents: [], // { id, date, amount, reason }
  };
}

function defaultSettings() {
  return {
    themeId: "midnight-focus",
    favoriteThemes: [],
    themeMode: "dark", // 'dark' | 'light'
    themeSkin: "nebula", // nebula | mountains | beaches | paper | cars | cities
    accent: "violet",
    accent2: "cyan",
    notifications: true,
    penaltyEnabled: false,
    reduceMotion: false,
  };
}

let data = load(STORAGE_KEY, defaultData());
let settings = load(SETTINGS_KEY, defaultSettings());
let syncHook = null; // set by db.js via setSyncHook()
const listeners = new Set();

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("[vyrona] persist failed", e);
  }
}

function notify(change) {
  persist();
  listeners.forEach((fn) => {
    try {
      fn(change, data, settings);
    } catch (e) {
      console.error("[vyrona] listener error", e);
    }
  });
  if (syncHook) {
    try {
      syncHook(change, data);
    } catch (e) {
      console.error("[vyrona] sync hook error", e);
    }
  }
}

export const Store = {
  // ---------- subscription ----------
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // ---------- raw access ----------
  getData() {
    return data;
  },
  getSettings() {
    return settings;
  },
  setSyncHook(fn) {
    syncHook = fn;
  },
  replaceData(next, { skipSync = false } = {}) {
    data = { ...defaultData(), ...next };
    notify(skipSync ? { type: "replace", skipSync: true } : { type: "replace" });
  },

  // ---------- profile / XP ----------
  updateProfile(patch) {
    data.profile = { ...data.profile, ...patch };
    notify({ type: "profile" });
  },

  levelInfo() {
    // XP curve: level N requires 100 * N XP cumulative-ish (progressive).
    const xp = data.profile.xp;
    let level = 1;
    let floor = 0;
    let need = 100;
    while (xp >= floor + need) {
      floor += need;
      level += 1;
      need = Math.round(100 * Math.pow(level, 1.32));
    }
    const into = xp - floor;
    const pct = Math.min(100, Math.round((into / need) * 100));
    return { level, xpIntoLevel: into, xpForLevel: need, pct, title: titleForLevel(level), totalXp: xp };
  },

  addXp(amount, reason) {
    const before = Store.levelInfo().level;
    data.profile.xp = Math.max(0, data.profile.xp + amount);
    data.xpEvents.unshift({ id: uid(), date: new Date().toISOString(), amount, reason });
    data.xpEvents = data.xpEvents.slice(0, 300);
    const after = Store.levelInfo().level;
    notify({ type: "xp", amount, reason, leveledUp: after > before, newLevel: after });
    return { leveledUp: after > before, newLevel: after };
  },

  // ---------- habits ----------
  addHabit(habit) {
    const h = {
      id: uid(),
      title: "Untitled Habit",
      category: "morning",
      type: "checkbox", // checkbox | counter | timer | duration | number | distance | money
      target: 1,
      unit: "",
      difficulty: "easy", // easy|medium|hard|epic
      xpReward: 10,
      penalty: 5,
      frequency: "daily", // daily | weekdays | weekly | custom
      reminder: null,
      archived: false,
      createdAt: new Date().toISOString(),
      ...habit,
    };
    data.habits.unshift(h);
    notify({ type: "habit:add", habit: h });
    return h;
  },
  updateHabit(id, patch) {
    data.habits = data.habits.map((h) => (h.id === id ? { ...h, ...patch } : h));
    notify({ type: "habit:update", id });
  },
  deleteHabit(id) {
    data.habits = data.habits.filter((h) => h.id !== id);
    data.habitLogs = data.habitLogs.filter((l) => l.habitId !== id);
    notify({ type: "habit:delete", id });
  },
  logForHabitToday(habitId) {
    const d = todayISO();
    return data.habitLogs.find((l) => l.habitId === habitId && l.date === d);
  },
  setHabitProgress(habitId, value) {
    const habit = data.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const d = todayISO();
    let log = data.habitLogs.find((l) => l.habitId === habitId && l.date === d);
    const target = Number(habit.target) || 1;
    const wasComplete = log ? log.value >= target : false;

    if (!log) {
      log = { id: uid(), habitId, date: d, value: 0, xpAwarded: false };
      data.habitLogs.unshift(log);
    }
    log.value = Math.max(0, value);
    const nowComplete = log.value >= target;

    let xpResult = null;
    if (nowComplete && !log.xpAwarded) {
      log.xpAwarded = true;
      xpResult = Store.addXp(habit.xpReward, `Habit: ${habit.title}`);
    } else if (!nowComplete && log.xpAwarded && wasComplete) {
      log.xpAwarded = false;
      Store.addXp(-habit.xpReward, `Undo: ${habit.title}`);
    }

    notify({ type: "habit:log", habitId, log, xpResult });
    return { log, xpResult };
  },
  toggleHabitDone(habitId) {
    const habit = data.habits.find((h) => h.id === habitId);
    if (!habit) return;
    const log = Store.logForHabitToday(habitId);
    const target = Number(habit.target) || 1;
    const isDone = log && log.value >= target;
    return Store.setHabitProgress(habitId, isDone ? 0 : target);
  },
  habitStreak(habitId) {
    const logs = data.habitLogs
      .filter((l) => l.habitId === habitId && l.xpAwarded)
      .map((l) => l.date)
      .sort()
      .reverse();
    if (!logs.length) return { current: 0, longest: 0 };
    const set = new Set(logs);
    let current = 0;
    let cursor = new Date();
    // if today not done yet, streak counts up to yesterday
    if (!set.has(todayISO())) cursor.setDate(cursor.getDate() - 1);
    for (;;) {
      const iso = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      if (set.has(iso)) {
        current += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    // longest streak (simple scan)
    const sorted = [...set].sort();
    let longest = 0;
    let run = 0;
    let prev = null;
    for (const iso of sorted) {
      if (prev) {
        const diff = (new Date(iso) - new Date(prev)) / 86400000;
        run = diff === 1 ? run + 1 : 1;
      } else run = 1;
      longest = Math.max(longest, run);
      prev = iso;
    }
    return { current, longest: Math.max(longest, current) };
  },

  // ---------- goals ----------
  addGoal(goal) {
    const g = {
      id: uid(),
      title: "New Goal",
      category: "career",
      priority: "medium",
      difficulty: 3,
      xpReward: 500,
      dueDate: null,
      progress: 0,
      notes: "",
      milestones: [],
      completed: false,
      createdAt: new Date().toISOString(),
      ...goal,
    };
    data.goals.unshift(g);
    notify({ type: "goal:add", goal: g });
    return g;
  },
  updateGoal(id, patch) {
    data.goals = data.goals.map((g) => (g.id === id ? { ...g, ...patch } : g));
    notify({ type: "goal:update", id });
  },
  deleteGoal(id) {
    data.goals = data.goals.filter((g) => g.id !== id);
    notify({ type: "goal:delete", id });
  },
  addMilestone(goalId, title) {
    const g = data.goals.find((g) => g.id === goalId);
    if (!g) return;
    g.milestones.push({ id: uid(), title, done: false });
    Store._recalcGoalProgress(g);
    notify({ type: "goal:milestone:add", goalId });
  },
  toggleMilestone(goalId, milestoneId) {
    const g = data.goals.find((g) => g.id === goalId);
    if (!g) return;
    const m = g.milestones.find((m) => m.id === milestoneId);
    if (!m) return;
    m.done = !m.done;
    Store._recalcGoalProgress(g);
    const wasCompleted = g.completed;
    if (g.progress >= 100 && !wasCompleted) {
      g.completed = true;
      Store.addXp(g.xpReward, `Goal complete: ${g.title}`);
    } else if (g.progress < 100 && wasCompleted) {
      g.completed = false;
    }
    notify({ type: "goal:milestone:toggle", goalId, milestoneId });
  },
  _recalcGoalProgress(g) {
    if (!g.milestones.length) return;
    const done = g.milestones.filter((m) => m.done).length;
    g.progress = Math.round((done / g.milestones.length) * 100);
  },

  // ---------- journal ----------
  upsertJournalToday(patch) {
    const d = todayISO();
    let entry = data.journal.find((j) => j.date === d);
    if (!entry) {
      entry = { id: uid(), date: d, gratitude: "", win: "", fail: "", learned: "", felt: "", tomorrow: "", mood: null };
      data.journal.unshift(entry);
    }
    Object.assign(entry, patch);
    notify({ type: "journal:update", date: d });
    return entry;
  },
  journalForToday() {
    return data.journal.find((j) => j.date === todayISO()) || null;
  },

  // ---------- derived ----------
  todayHabits() {
    return data.habits.filter((h) => !h.archived);
  },
  todayScore() {
    const habits = Store.todayHabits();
    if (!habits.length) return 0;
    const d = todayISO();
    let total = 0;
    let got = 0;
    habits.forEach((h) => {
      const log = data.habitLogs.find((l) => l.habitId === h.id && l.date === d);
      const target = Number(h.target) || 1;
      total += target;
      got += Math.min(target, log ? log.value : 0);
    });
    return total ? Math.round((got / total) * 100) : 0;
  },

  // ---------- settings ----------
  updateSettings(patch) {
    settings = { ...settings, ...patch };
    notify({ type: "settings" });
  },
};

export { uid, todayISO, defaultData, defaultSettings };
