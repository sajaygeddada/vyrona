import { Store } from "./state.js";
import { el, openModal, modalHeader, toast, celebrateLevelUp } from "./ui.js";
import { GOAL_CATEGORIES, evaluateAchievements } from "./xp.js";
import { rerender } from "./app-events.js";

const STARS = "⭐";

export function renderGoals(root) {
  const goals = Store.getData().goals;

  root.append(
    el("div", { class: "section-head" }, [
      el("h2", {}, "🎯 Goals"),
      el("button", { class: "btn btn-primary btn-sm", onclick: () => openGoalEditor() }, "+ New Goal"),
    ])
  );

  if (!goals.length) {
    root.appendChild(
      el("div", { class: "card empty-state" }, [
        el("div", { class: "empty-icon" }, "🎯"),
        el("h3", {}, "No quests yet"),
        el("p", {}, "Add a goal, break it into milestones, and earn big XP when you finish."),
        el("button", { class: "btn btn-primary mt-3", onclick: () => openGoalEditor() }, "Create a Goal"),
      ])
    );
    return;
  }

  const active = goals.filter((g) => !g.completed);
  const done = goals.filter((g) => g.completed);

  root.appendChild(el("div", { class: "item-list" }, active.map(goalCard)));

  if (done.length) {
    root.appendChild(el("div", { class: "section-head mt-4" }, [el("h2", {}, "✅ Completed")]));
    root.appendChild(el("div", { class: "item-list" }, done.map(goalCard)));
  }
  root.appendChild(el("div", { style: "height:40px" }));
}

function goalCard(g) {
  const cat = GOAL_CATEGORIES.find((c) => c.id === g.category) || { label: g.category, icon: "📌" };
  const stars = STARS.repeat(Math.max(1, Math.min(5, g.difficulty)));

  const card = el("div", { class: "card goal-card" }, [
    el("div", { class: "goal-head" }, [
      el("div", {}, [
        el("div", { class: "goal-cat" }, `${cat.icon} ${cat.label}`),
        el("div", { class: "goal-title" }, g.title),
      ]),
      el("div", { class: "text-center" }, [
        el("div", { class: "goal-diff" }, stars),
        el("div", { class: "tag mt-2" }, `+${g.xpReward} XP`),
      ]),
    ]),
    el("div", { class: "progress-track" }, [el("div", { class: "progress-fill", style: `width:${g.progress}%` })]),
    el("div", { class: "row-between" }, [
      el("span", { class: "muted", style: "font-size:.78rem" }, `${g.progress}% complete`),
      g.dueDate ? el("span", { class: "muted", style: "font-size:.78rem" }, `Due ${g.dueDate}`) : null,
    ]),
    g.milestones.length
      ? el(
          "ul",
          { class: "milestone-list" },
          g.milestones.map((m) =>
            el("li", { class: m.done ? "done" : "", onclick: () => { Store.toggleMilestone(g.id, m.id); handleGoalXp(g); rerender(); } }, [
              el("span", { class: "milestone-check" }, m.done ? "✓" : ""),
              m.title,
            ])
          )
        )
      : null,
    el("div", { class: "row mt-3", style: "gap:8px" }, [
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => openGoalEditor(g) }, "Edit"),
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => openMilestonePrompt(g) }, "+ Milestone"),
    ]),
  ]);
  return card;
}

function handleGoalXp(g) {
  const fresh = Store.getData().goals.find((x) => x.id === g.id);
  if (fresh?.completed) {
    toast(`Goal complete: ${fresh.title}! +${fresh.xpReward} XP`, { icon: "🏅", type: "success" });
  }
  const newly = evaluateAchievements();
  newly.forEach((a) => toast(`Achievement unlocked: ${a.name}`, { icon: a.icon, type: "success" }));
}

function openMilestonePrompt(goal) {
  let closeFn;
  const input = el("input", { type: "text", placeholder: "e.g. Pass the exam" });
  const content = el("div", {}, [
    modalHeader(`Add milestone`, () => closeFn()),
    el("label", { class: "field" }, [el("span", {}, "Milestone title"), input]),
    el("button", {
      class: "btn btn-primary btn-block",
      onclick: () => {
        if (!input.value.trim()) return;
        Store.addMilestone(goal.id, input.value.trim());
        closeFn();
        rerender();
      },
    }, "Add"),
  ]);
  closeFn = openModal(content);
}

function openGoalEditor(existing) {
  const isEdit = !!existing;
  const state = existing
    ? { ...existing }
    : { title: "", category: "career", difficulty: 3, xpReward: 3000, dueDate: "", notes: "" };

  let closeFn;
  const titleInput = el("input", { type: "text", placeholder: "e.g. Become AWS Solutions Architect", value: state.title });
  const catSelect = el(
    "select",
    {},
    GOAL_CATEGORIES.map((c) => el("option", { value: c.id, selected: state.category === c.id || null }, `${c.icon} ${c.label}`))
  );
  const diffWrap = el("div", { class: "chip-group" });
  for (let i = 1; i <= 5; i++) {
    diffWrap.appendChild(
      el("button", {
        type: "button",
        class: `chip ${state.difficulty === i ? "active" : ""}`,
        onclick: (e) => {
          state.difficulty = i;
          state.xpReward = i * 1000;
          [...diffWrap.children].forEach((c) => c.classList.remove("active"));
          e.target.classList.add("active");
          xpPreview.textContent = `Reward: +${state.xpReward} XP`;
        },
      }, STARS.repeat(i))
    );
  }
  const xpPreview = el("div", { class: "muted mt-2" }, `Reward: +${state.xpReward} XP`);
  const dueInput = el("input", { type: "date", value: state.dueDate || "" });
  const notesInput = el("textarea", { placeholder: "Notes..." }, state.notes || "");

  const content = el("div", {}, [
    modalHeader(isEdit ? "Edit Goal" : "New Goal", () => closeFn()),
    el("label", { class: "field" }, [el("span", {}, "Title"), titleInput]),
    el("div", { class: "field-row" }, [
      el("label", { class: "field" }, [el("span", {}, "Category"), catSelect]),
      el("label", { class: "field" }, [el("span", {}, "Due Date"), dueInput]),
    ]),
    el("label", { class: "field" }, [el("span", {}, "Difficulty"), diffWrap, xpPreview]),
    el("label", { class: "field" }, [el("span", {}, "Notes"), notesInput]),
    el("div", { class: "row", style: "gap:10px" }, [
      isEdit
        ? el("button", { class: "btn btn-danger", onclick: () => { Store.deleteGoal(existing.id); closeFn(); rerender(); } }, "Delete")
        : null,
      el("button", {
        class: "btn btn-primary btn-block",
        onclick: () => {
          const title = titleInput.value.trim();
          if (!title) { toast("Give your goal a title", { icon: "⚠️" }); return; }
          const payload = {
            title, category: catSelect.value, difficulty: state.difficulty, xpReward: state.xpReward,
            dueDate: dueInput.value || null, notes: notesInput.value,
          };
          if (isEdit) Store.updateGoal(existing.id, payload);
          else Store.addGoal(payload);
          evaluateAchievements();
          closeFn();
          rerender();
        },
      }, isEdit ? "Save Changes" : "Create Goal"),
    ]),
  ]);
  closeFn = openModal(content);
}
