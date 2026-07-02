import { Store, todayISO } from "./state.js";
import { el } from "./ui.js";

function lastNDates(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function scoreForDate(d, dateISO) {
  const habits = d.habits.filter((h) => !h.archived && new Date(h.createdAt) <= new Date(dateISO + "T23:59:59"));
  if (!habits.length) return null;
  let total = 0, got = 0;
  habits.forEach((h) => {
    const log = d.habitLogs.find((l) => l.habitId === h.id && l.date === dateISO);
    const target = Number(h.target) || 1;
    total += target;
    got += Math.min(target, log ? log.value : 0);
  });
  return total ? Math.round((got / total) * 100) : null;
}

export function renderReview(root) {
  const d = Store.getData();
  const week = lastNDates(7);
  const scores = week.map((date) => ({ date, score: scoreForDate(d, date) }));
  const validScores = scores.filter((s) => s.score !== null);
  const avg = validScores.length ? Math.round(validScores.reduce((a, s) => a + s.score, 0) / validScores.length) : 0;

  const best = validScores.reduce((a, b) => (b.score > (a?.score ?? -1) ? b : a), null);
  const worst = validScores.reduce((a, b) => (b.score < (a?.score ?? 101) ? b : a), null);

  const goalsCompletedThisWeek = d.goals.filter((g) => g.completed).length;
  const journalCount = d.journal.filter((j) => week.includes(j.date)).length;

  root.append(
    el("div", { class: "section-head" }, [el("h2", {}, "📊 Weekly Review")]),
    el("div", { class: "card" }, [
      el("div", { class: "row-between" }, [
        el("strong", {}, "This Week"),
        el("span", { class: "tag" }, `${avg}% avg habit score`),
      ]),
      el("div", { class: "row mt-3", style: "gap:6px;align-items:flex-end;height:80px" },
        scores.map((s) =>
          el("div", { style: "flex:1;display:flex;flex-direction:column;align-items:center;gap:4px" }, [
            el("div", {
              style: `width:100%;border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--accent),var(--accent-2));height:${Math.max(4, (s.score ?? 0) * 0.6)}px`,
              title: `${s.date}: ${s.score ?? "—"}%`,
            }),
            el("span", { class: "muted", style: "font-size:.65rem" }, s.date.slice(5)),
          ])
        )
      ),
    ]),
    el("div", { class: "stat-grid mt-4" }, [
      statCard("📈", best ? `${best.score}%` : "—", "Best Day"),
      statCard("📉", worst ? `${worst.score}%` : "—", "Toughest Day"),
      statCard("🎯", goalsCompletedThisWeek, "Goals Completed"),
      statCard("📓", journalCount, "Journal Entries"),
    ]),
    el("div", { class: "card brief-card mt-4" }, [
      el("strong", {}, "AI Summary"),
      el("p", { class: "mt-2" }, buildSummary(avg, validScores, journalCount)),
    ])
  );
}

function statCard(icon, val, label) {
  return el("div", { class: "card stat-card" }, [
    el("div", { class: "stat-icon" }, icon),
    el("div", { class: "stat-val" }, String(val)),
    el("div", { class: "stat-label" }, label),
  ]);
}

function buildSummary(avg, validScores, journalCount) {
  if (!validScores.length) return "Log a few habits this week to unlock your personalized summary.";
  const trendUp = validScores.length > 1 && validScores.at(-1).score >= validScores[0].score;
  const parts = [
    `You averaged ${avg}% habit completion this week.`,
    trendUp ? "Your consistency is trending upward — nice work." : "Consistency dipped a bit compared to earlier in the week.",
    journalCount ? `You journaled ${journalCount} time(s), which helps you notice patterns faster.` : "Try journaling a couple of nights this week to spot what's working.",
    avg < 60 ? "Consider trimming your habit list to 3-4 keystone habits to rebuild momentum." : "Keep the current routine — it's working.",
  ];
  return parts.join(" ");
}
