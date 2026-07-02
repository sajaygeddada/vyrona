// Auth + sync layer. Talks to Supabase when configured & the user is signed
// in; otherwise the app just runs on localStorage (guest mode).
import { getSupabase, isSupabaseConfigured } from "./supabaseClient.js";
import { Store } from "./state.js";

let currentSession = null;
let syncQueueTimer = null;

export function isConfigured() {
  return isSupabaseConfigured();
}

export function getSession() {
  return currentSession;
}

export async function initAuth() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await getSupabase();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  currentSession = data?.session || null;

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
  });

  return currentSession;
}

export async function signUp(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  currentSession = data.session;
  return data;
}

export async function signIn(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentSession = data.session;
  return data;
}

export async function signOut() {
  const supabase = await getSupabase();
  if (supabase) await supabase.auth.signOut();
  currentSession = null;
}

/**
 * Pulls the user's data down from Supabase and merges it into local state.
 * Simple strategy: remote is source of truth on first pull after sign-in;
 * from then on, local mutations are pushed up incrementally.
 */
export async function pullRemote() {
  const supabase = await getSupabase();
  if (!supabase || !currentSession) return false;
  const userId = currentSession.user.id;

  const [{ data: profile }, { data: habits }, { data: habitLogs }, { data: goals }, { data: journal }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("habits").select("*").eq("user_id", userId),
      supabase.from("habit_logs").select("*").eq("user_id", userId),
      supabase.from("goals").select("*").eq("user_id", userId),
      supabase.from("journal_entries").select("*").eq("user_id", userId),
    ]);

  const local = Store.getData();

  const next = {
    ...local,
    profile: profile
      ? {
          id: userId,
          name: profile.name || local.profile.name,
          email: currentSession.user.email,
          xp: profile.xp ?? local.profile.xp,
          level: profile.level ?? local.profile.level,
          createdAt: profile.created_at || local.profile.createdAt,
        }
      : { ...local.profile, id: userId, email: currentSession.user.email },
    habits: (habits && habits.length ? habits.map(fromRemoteHabit) : local.habits),
    habitLogs: (habitLogs && habitLogs.length ? habitLogs.map(fromRemoteLog) : local.habitLogs),
    goals: (goals && goals.length ? goals.map(fromRemoteGoal) : local.goals),
    journal: (journal && journal.length ? journal.map(fromRemoteJournal) : local.journal),
  };

  Store.replaceData(next, { skipSync: true });

  // Ensure a profile row exists remotely.
  if (!profile) {
    await supabase.from("profiles").upsert({
      id: userId,
      name: next.profile.name,
      xp: next.profile.xp,
      level: next.profile.level,
    });
  }

  return true;
}

function fromRemoteHabit(r) {
  return {
    id: r.id, title: r.title, category: r.category, type: r.type, target: r.target,
    unit: r.unit, difficulty: r.difficulty, xpReward: r.xp_reward, penalty: r.penalty,
    frequency: r.frequency, reminder: r.reminder, archived: r.archived, createdAt: r.created_at,
  };
}
function fromRemoteLog(r) {
  return { id: r.id, habitId: r.habit_id, date: r.date, value: r.value, xpAwarded: r.xp_awarded };
}
function fromRemoteGoal(r) {
  return {
    id: r.id, title: r.title, category: r.category, priority: r.priority, difficulty: r.difficulty,
    xpReward: r.xp_reward, dueDate: r.due_date, progress: r.progress, notes: r.notes,
    milestones: r.milestones || [], completed: r.completed, createdAt: r.created_at,
  };
}
function fromRemoteJournal(r) {
  return {
    id: r.id, date: r.date, gratitude: r.gratitude, win: r.win, fail: r.fail,
    learned: r.learned, felt: r.felt, tomorrow: r.tomorrow, mood: r.mood,
  };
}

/** Wires Store mutations to push to Supabase in the background (debounced). */
export function attachSyncHook() {
  Store.setSyncHook((change) => {
    if (change.skipSync || !currentSession || !isSupabaseConfigured()) return;
    clearTimeout(syncQueueTimer);
    syncQueueTimer = setTimeout(() => pushAll().catch((e) => console.warn("[vyrona] sync failed", e)), 900);
  });
}

async function pushAll() {
  const supabase = await getSupabase();
  if (!supabase || !currentSession) return;
  const userId = currentSession.user.id;
  const d = Store.getData();

  await supabase.from("profiles").upsert({
    id: userId, name: d.profile.name, xp: d.profile.xp, level: Store.levelInfo().level,
  });

  if (d.habits.length) {
    await supabase.from("habits").upsert(
      d.habits.map((h) => ({
        id: h.id, user_id: userId, title: h.title, category: h.category, type: h.type,
        target: h.target, unit: h.unit, difficulty: h.difficulty, xp_reward: h.xpReward,
        penalty: h.penalty, frequency: h.frequency, reminder: h.reminder, archived: h.archived,
        created_at: h.createdAt,
      }))
    );
  }
  if (d.habitLogs.length) {
    await supabase.from("habit_logs").upsert(
      d.habitLogs.slice(0, 500).map((l) => ({
        id: l.id, user_id: userId, habit_id: l.habitId, date: l.date, value: l.value, xp_awarded: l.xpAwarded,
      }))
    );
  }
  if (d.goals.length) {
    await supabase.from("goals").upsert(
      d.goals.map((g) => ({
        id: g.id, user_id: userId, title: g.title, category: g.category, priority: g.priority,
        difficulty: g.difficulty, xp_reward: g.xpReward, due_date: g.dueDate, progress: g.progress,
        notes: g.notes, milestones: g.milestones, completed: g.completed, created_at: g.createdAt,
      }))
    );
  }
  if (d.journal.length) {
    await supabase.from("journal_entries").upsert(
      d.journal.slice(0, 200).map((j) => ({
        id: j.id, user_id: userId, date: j.date, gratitude: j.gratitude, win: j.win, fail: j.fail,
        learned: j.learned, felt: j.felt, tomorrow: j.tomorrow, mood: j.mood,
      }))
    );
  }
}
