import { Store } from "./state.js";
import { el, openModal, modalHeader, toast, xpFloat, celebrateLevelUp } from "./ui.js";
import { HABIT_CATEGORIES, HABIT_TYPES, DIFFICULTY_XP } from "./xp.js";
import { evaluateAchievements } from "./xp.js";
import { requestPermission, scheduleHabitReminder } from "./notifications.js";
import { rerender } from "./app-events.js";

export function renderHabits(root) {
  const habits = Store.getData().habits.filter((h) => !h.archived);

  root.append(
    el("div", { class: "section-head" }, [
      el("h2", {}, "🔥 Habit Tracker"),
      el("button", { class: "btn btn-primary btn-sm", onclick: () => openHabitEditor() }, "+ New Habit"),
    ])
  );

  if (!habits.length) {
    root.appendChild(
      el("div", { class: "card empty-state" }, [
        el("div", { class: "empty-icon" }, "🌱"),
        el("h3", {}, "Build your first habit"),
        el("p", {}, "Checkboxes, counters, timers, distance, money — track it your way."),
        el("button", { class: "btn btn-primary mt-3", onclick: () => openHabitEditor() }, "Create a Habit"),
      ])
    );
    return;
  }

  const grouped = {};
  habits.forEach((h) => {
    grouped[h.category] = grouped[h.category] || [];
    grouped[h.category].push(h);
  });

  Object.entries(grouped).forEach(([catId, list]) => {
    const cat = HABIT_CATEGORIES.find((c) => c.id === catId) || { label: catId, icon: "📌" };
    root.appendChild(el("div", { class: "section-head mt-4" }, [el("h2", {}, `${cat.icon} ${cat.label}`)]));
    root.appendChild(el("div", { class: "item-list" }, list.map(habitRow)));
  });

  root.appendChild(el("div", { style: "height:40px" }));
}

function habitRow(h) {
  const log = Store.logForHabitToday(h.id);
  const target = Number(h.target) || 1;
  const val = log ? log.value : 0;
  const done = val >= target;
  const streak = Store.habitStreak(h.id);

  const isCheckbox = h.type === "checkbox";

  const row = el("div", { class: `habit-row card-hover ${done ? "done" : ""}` }, [
    isCheckbox
      ? el("button", {
          class: `habit-check ${done ? "checked" : ""}`,
          "aria-label": "Toggle habit",
          onclick: (e) => {
            const r = Store.toggleHabitDone(h.id);
            handleXpFeedback(h, r, e.currentTarget);
            rerender();
          },
        }, done ? "✓" : "")
      : el("button", {
          class: `habit-check ${done ? "checked" : ""}`,
          "aria-label": "Log progress",
          onclick: (e) => openProgressPrompt(h, e.currentTarget),
        }, done ? "✓" : "+"),
    
    el("div", { class: "habit-info", onclick: () => openHabitEditor(h) }, [
      el("div", { class: "habit-title" }, h.title),
      el("div", { class: "habit-meta" }, [
        `🔥 ${streak.current}d streak`,
        ` · ⏱ Longest ${streak.longest}d`,
        h.reminder ? ` · ⏰ ${h.reminder}` : "",
      ]),
      !isCheckbox
        ? el("div", { class: "habit-progress-mini" }, [
            el("div", { style: `width:${Math.min(100, (val / target) * 100)}%` }),
          ])
        : null,
      !isCheckbox ? el("div", { class: "muted", style: "font-size:.72rem;margin-top:2px" }, `${val} / ${target} ${h.unit || ""}`) : null,
    ]),
    el("div", { class: "habit-xp" }, `+${h.xpReward} XP`),
  ]);
  return row;
}

function handleXpFeedback(habit, result, originEl) {
  if (!result) return;
  if (result.xpResult) {
    const amount = result.log.xpAwarded ? habit.xpReward : -habit.xpReward;
    xpFloat(amount, originEl);
  }
  const newly = evaluateAchievements();
  if (result.xpResult?.leveledUp) {
    celebrateLevelUp(result.xpResult.newLevel, Store.levelInfo().title);
  }
  newly.forEach((a) => toast(`Achievement unlocked: ${a.name}`, { icon: a.icon, type: "success" }));
}

function openProgressPrompt(habit, originEl) {
  const log = Store.logForHabitToday(habit.id);
  const current = log ? log.value : 0;
  const content = el("div", {}, []);
  let closeFn;
  const input = el("input", { type: "number", min: "0", step: habit.type === "money" ? "10" : "0.1", value: String(current) });

  content.append(
    modalHeader(`Log: ${habit.title}`, () => closeFn()),
    el("div", { class: "field" }, [
      el("span", {}, `Progress (${habit.unit || "units"}) — target ${habit.target}`),
      input,
    ]),
    el("div", { class: "row", style: "gap:8px" }, [
      el("button", { class: "btn btn-ghost", onclick: () => { input.value = Math.max(0, Number(input.value || 0) - 1); } }, "−1"),
      el("button", { class: "btn btn-ghost", onclick: () => { input.value = Number(input.value || 0) + 1; } }, "+1"),
      el("button", { class: "btn btn-ghost", onclick: () => { input.value = habit.target; } }, "Mark complete"),
    ]),
    el("button", {
      class: "btn btn-primary btn-block mt-4",
      onclick: (e) => {
        const result = Store.setHabitProgress(habit.id, Number(input.value || 0));
        handleXpFeedback(habit, result, originEl);
        closeFn();
        rerender();
      },
    }, "Save")
  );
  closeFn = openModal(content);
}

function openHabitEditor(existing) {
  const isEdit = !!existing;
  const state = existing
    ? { ...existing }
    : { title: "", category: "morning", type: "checkbox", target: 1, unit: "", difficulty: "easy", frequency: "daily", reminder: "" };

  let closeFn;
  const titleInput = el("input", { type: "text", placeholder: "e.g. Wake up 6AM", value: state.title });
  const typeSelect = el(
    "select",
    { onchange: (e) => { state.type = e.target.value; renderTypeFields(); } },
    HABIT_TYPES.map((t) => el("option", { value: t.id, selected: state.type === t.id || null }, `${t.label} — ${t.desc}`))
  );
  const catSelect = el(
    "select",
    {},
    HABIT_CATEGORIES.map((c) => el("option", { value: c.id, selected: state.category === c.id || null }, `${c.icon} ${c.label}`))
  );
  const diffChips = el(
    "div",
    { class: "chip-group" },
    Object.keys(DIFFICULTY_XP).map((diff) =>
      el("button", {
        type: "button",
        class: `chip ${state.difficulty === diff ? "active" : ""}`,
        onclick: (e) => {
          state.difficulty = diff;
          [...e.target.parentElement.children].forEach((c) => c.classList.remove("active"));
          e.target.classList.add("active");
        },
      }, `${diff[0].toUpperCase() + diff.slice(1)} (+${DIFFICULTY_XP[diff]} XP)`)
    )
  );
  const freqSelect = el("select", {}, [
    el("option", { value: "daily", selected: state.frequency === "daily" || null }, "Daily"),
    el("option", { value: "weekdays", selected: state.frequency === "weekdays" || null }, "Weekdays"),
    el("option", { value: "weekly", selected: state.frequency === "weekly" || null }, "Weekly"),
  ]);
  const reminderInput = el("input", { type: "time", value: state.reminder || "" });

  const typeFieldsWrap = el("div", {});
  function renderTypeFields() {
    typeFieldsWrap.innerHTML = "";
    if (state.type === "checkbox") return;
    const targetInput = el("input", { type: "number", min: "0", step: "0.1", value: state.target || 1, oninput: (e) => (state.target = Number(e.target.value)) });
    const unitInput = el("input", { type: "text", placeholder: "e.g. L, mins, pages, km, ₹", value: state.unit || "", oninput: (e) => (state.unit = e.target.value) });
    typeFieldsWrap.append(
      el("div", { class: "field-row" }, [
        el("label", { class: "field" }, [el("span", {}, "Target"), targetInput]),
        el("label", { class: "field" }, [el("span", {}, "Unit"), unitInput]),
      ])
    );
  }
  renderTypeFields();

  const content = el("div", {}, [
    modalHeader(isEdit ? "Edit Habit" : "New Habit", () => closeFn()),
    el("label", { class: "field" }, [el("span", {}, "Title"), titleInput]),
    el("div", { class: "field-row" }, [
      el("label", { class: "field" }, [el("span", {}, "Category"), catSelect]),
      el("label", { class: "field" }, [el("span", {}, "Type"), typeSelect]),
    ]),
    typeFieldsWrap,
    el("label", { class: "field" }, [el("span", {}, "Difficulty (sets XP reward)"), diffChips]),
    el("div", { class: "field-row" }, [
      el("label", { class: "field" }, [el("span", {}, "Frequency"), freqSelect]),
      el("label", { class: "field" }, [
        el("span", {}, "Reminder"),
        reminderInput,
      ]),
    ]),
    el("div", { class: "row", style: "gap:10px" }, [
      isEdit
        ? el("button", { class: "btn btn-danger", onclick: () => { Store.deleteHabit(existing.id); closeFn(); rerender(); } }, "Delete")
        : null,
      el("button", {
        class: "btn btn-primary btn-block",
        onclick: async () => {
          const title = titleInput.value.trim();
          if (!title) { toast("Give your habit a title", { icon: "⚠️" }); return; }
          const payload = {
            title,
            category: catSelect.value,
            type: typeSelect.value,
            target: state.type === "checkbox" ? 1 : Number(state.target || 1),
            unit: state.unit || "",
            difficulty: state.difficulty,
            xpReward: DIFFICULTY_XP[state.difficulty],
            frequency: freqSelect.value,
            reminder: reminderInput.value || null,
          };
          let habit;
          if (isEdit) {
            Store.updateHabit(existing.id, payload);
            habit = { ...existing, ...payload };
          } else {
            habit = Store.addHabit(payload);
          }
          if (habit.reminder) {
            const perm = await requestPermission();
            if (perm === "granted") scheduleHabitReminder(habit);
          }
          evaluateAchievements();
          closeFn();
          rerender();
        },
      }, isEdit ? "Save Changes" : "Create Habit"),
    ]),
  ]);

  closeFn = openModal(content);
}
