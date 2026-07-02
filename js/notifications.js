// Lightweight wrapper around the Notification API for habit reminders.
// Falls back gracefully (no-op) where Notifications aren't supported/granted.

const scheduled = new Map();

export function notificationsSupported() {
  return typeof Notification !== "undefined";
}

export async function requestPermission() {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function fireNotification(title, body) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "icons/icon-192.svg", badge: "icons/icon.svg" });
  } catch {
    /* some browsers require a service worker registration; fail silently */
  }
}

/** Schedules a daily reminder at HH:MM for a given habit (client-side only, resets on reload). */
export function scheduleHabitReminder(habit) {
  clearHabitReminder(habit.id);
  if (!habit.reminder || Notification.permission !== "granted") return;

  const [h, m] = habit.reminder.split(":").map(Number);
  function msUntilNext() {
    const now = new Date();
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  }
  function tick() {
    fireNotification("Vyrona reminder", habit.title);
    scheduled.set(habit.id, setTimeout(tick, 24 * 60 * 60 * 1000));
  }
  scheduled.set(habit.id, setTimeout(tick, msUntilNext()));
}

export function clearHabitReminder(habitId) {
  if (scheduled.has(habitId)) {
    clearTimeout(scheduled.get(habitId));
    scheduled.delete(habitId);
  }
}

export function rescheduleAll(habits) {
  scheduled.forEach((t) => clearTimeout(t));
  scheduled.clear();
  habits.filter((h) => h.reminder && !h.archived).forEach(scheduleHabitReminder);
}
