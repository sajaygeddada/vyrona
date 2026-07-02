import { Store } from "./state.js";

export const DIFFICULTY_XP = { easy: 10, medium: 20, hard: 35, epic: 60 };

export const HABIT_CATEGORIES = [
  { id: "morning", label: "Morning", icon: "🌅" },
  { id: "fitness", label: "Fitness", icon: "💪" },
  { id: "health", label: "Health", icon: "🍎" },
  { id: "learning", label: "Learning", icon: "📚" },
  { id: "career", label: "Career", icon: "💼" },
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "home", label: "Home", icon: "🧹" },
  { id: "mindfulness", label: "Mindfulness", icon: "🧘" },
  { id: "hobby", label: "Hobby", icon: "🎮" },
  { id: "relationships", label: "Relationships", icon: "❤️" },
];

export const GOAL_CATEGORIES = [
  { id: "finance", label: "Finance", icon: "💰" },
  { id: "career", label: "Career", icon: "💼" },
  { id: "learning", label: "Learning", icon: "📚" },
  { id: "health", label: "Health", icon: "❤️" },
  { id: "family", label: "Family", icon: "🏠" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "hobby", label: "Hobby", icon: "🎮" },
  { id: "reading", label: "Reading", icon: "📖" },
  { id: "mental", label: "Mental", icon: "🧘" },
];

export const HABIT_TYPES = [
  { id: "checkbox", label: "Checkbox", desc: "Simple yes/no" },
  { id: "counter", label: "Counter", desc: "e.g. Drink water (litres)" },
  { id: "timer", label: "Timer", desc: "e.g. Meditate (minutes)" },
  { id: "duration", label: "Duration", desc: "e.g. Workout (minutes)" },
  { id: "number", label: "Number", desc: "e.g. Read pages" },
  { id: "distance", label: "Distance", desc: "e.g. Run (km)" },
  { id: "money", label: "Money", desc: "e.g. Save (₹)" },
];

export const ACHIEVEMENTS = [
  { id: "first_habit", name: "First Habit", desc: "Create your very first habit", icon: "🏆", rarity: "common", check: (d) => d.habits.length >= 1 },
  { id: "streak_7", name: "Week Warrior", desc: "Hit a 7 day streak on any habit", icon: "🔥", rarity: "rare", check: (d) => d.habits.some((h) => Store.habitStreak(h.id).current >= 7) },
  { id: "streak_30", name: "30 Day Streak", desc: "A full month of consistency", icon: "🔥", rarity: "epic", check: (d) => d.habits.some((h) => Store.habitStreak(h.id).current >= 30) },
  { id: "first_goal", name: "First Goal", desc: "Create your first goal", icon: "🎯", rarity: "common", check: (d) => d.goals.length >= 1 },
  { id: "goal_complete", name: "Goal Crusher", desc: "Complete a goal", icon: "🏅", rarity: "rare", check: (d) => d.goals.some((g) => g.completed) },
  { id: "level_5", name: "Explorer", desc: "Reach Level 5", icon: "⭐", rarity: "rare", check: () => Store.levelInfo().level >= 5 },
  { id: "level_10", name: "Warrior Rank", desc: "Reach Level 10", icon: "⚔️", rarity: "epic", check: () => Store.levelInfo().level >= 10 },
  { id: "level_20", name: "Legend", desc: "Reach Level 20", icon: "👑", rarity: "legendary", check: () => Store.levelInfo().level >= 20 },
  { id: "journal_7", name: "Reflective Mind", desc: "Journal 7 days total", icon: "📓", rarity: "rare", check: (d) => d.journal.length >= 7 },
  { id: "xp_1000", name: "Grinder", desc: "Earn 1,000 total XP", icon: "💎", rarity: "rare", check: (d) => d.profile.xp >= 1000 },
  { id: "xp_5000", name: "Dragon Slayer", desc: "Earn 5,000 total XP", icon: "🐉", rarity: "legendary", check: (d) => d.profile.xp >= 5000 },
  { id: "habits_5", name: "Habit Builder", desc: "Track 5 habits at once", icon: "🧱", rarity: "common", check: (d) => d.habits.filter((h) => !h.archived).length >= 5 },
  { id: "discipline_master", name: "Discipline Master", desc: "100% habit day, 3 days running", icon: "⚔️", rarity: "epic", check: () => Store.todayScore() === 100 },
];

/** Checks all achievements against current data, unlocks new ones, returns newly unlocked list. */
export function evaluateAchievements() {
  const d = Store.getData();
  const newly = [];
  ACHIEVEMENTS.forEach((a) => {
    if (d.achievementsUnlocked.includes(a.id)) return;
    try {
      if (a.check(d)) {
        d.achievementsUnlocked.push(a.id);
        newly.push(a);
      }
    } catch {
      /* ignore faulty check */
    }
  });
  return newly;
}
