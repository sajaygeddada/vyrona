import { Store, todayISO } from "./state.js";
import { el, toast, fmtDate } from "./ui.js";
import { evaluateAchievements } from "./xp.js";
import { rerender } from "./app-events.js";

const MOODS = [
  { id: "great", icon: "😄" },
  { id: "good", icon: "😊" },
  { id: "okay", icon: "😐" },
  { id: "low", icon: "😔" },
  { id: "bad", icon: "😢" },
];

export function renderJournal(root) {
  const entry = Store.journalForToday() || {};

  root.appendChild(el("div", { class: "section-head" }, [el("h2", {}, "📓 Today's Journal")]));

  const moodRow = el(
    "div",
    { class: "mood-row" },
    MOODS.map((m) =>
      el("button", {
        class: `mood-btn ${entry.mood === m.id ? "active" : ""}`,
        onclick: (e) => {
          Store.upsertJournalToday({ mood: m.id });
          const newly = evaluateAchievements();
          newly.forEach((a) => toast(`Achievement unlocked: ${a.name}`, { icon: a.icon, type: "success" }));
          rerender();
        },
      }, m.icon)
    )
  );

  const fields = [
    ["gratitude", "🙏 Gratitude", "What are you grateful for today?"],
    ["win", "🏆 Today's Win", "What went well?"],
    ["fail", "📉 Today's Setback", "What didn't go as planned?"],
    ["learned", "💡 Today I Learned", "Any new insight?"],
    ["felt", "❤️ Today I Felt", "How are you feeling, really?"],
    ["tomorrow", "🗓️ Tomorrow's Plan", "What's the plan for tomorrow?"],
  ];

  const form = el("div", { class: "card mt-3" }, [
    el("div", { class: "field" }, [el("span", {}, "Mood"), moodRow]),
    ...fields.map(([key, label, placeholder]) => {
      const textarea = el("textarea", { placeholder, rows: "2" }, entry[key] || "");
      let debounce;
      textarea.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          Store.upsertJournalToday({ [key]: textarea.value });
        }, 400);
      });
      return el("label", { class: "field" }, [el("span", {}, label), textarea]);
    }),
    el("button", {
      class: "btn btn-primary btn-block mt-2",
      onclick: () => {
        toast("Journal saved", { icon: "📓", type: "success" });
        const newly = evaluateAchievements();
        newly.forEach((a) => toast(`Achievement unlocked: ${a.name}`, { icon: a.icon, type: "success" }));
        rerender();
      },
    }, "Save Entry"),
  ]);

  root.appendChild(form);

  const history = Store.getData().journal.filter((j) => j.date !== todayISO());
  if (history.length) {
    root.appendChild(el("div", { class: "section-head mt-5" }, [el("h2", {}, "History")]));
    root.appendChild(
      el(
        "div",
        { class: "item-list" },
        history.slice(0, 20).map((j) =>
          el("div", { class: "card journal-entry" }, [
            el("div", { class: "row-between" }, [
              el("span", { class: "journal-date" }, fmtDate(j.date)),
              el("span", {}, MOODS.find((m) => m.id === j.mood)?.icon || ""),
            ]),
            j.win ? el("p", { class: "mb-0" }, [el("strong", {}, "Win: "), j.win]) : null,
            j.gratitude ? el("p", { class: "mb-0" }, [el("strong", {}, "Grateful for: "), j.gratitude]) : null,
          ])
        )
      )
    );
  }
}
