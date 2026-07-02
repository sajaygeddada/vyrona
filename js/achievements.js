import { Store } from "./state.js";
import { el } from "./ui.js";
import { ACHIEVEMENTS } from "./xp.js";

const RARITY_COLOR = {
  common: "var(--rarity-common)",
  rare: "var(--rarity-rare)",
  epic: "var(--rarity-epic)",
  legendary: "var(--rarity-legendary)",
};

export function renderAchievements(root) {
  const unlocked = Store.getData().achievementsUnlocked;
  const lvl = Store.levelInfo();

  root.append(
    el("div", { class: "section-head" }, [el("h2", {}, "🏆 Achievements")]),
    el("div", { class: "card mb-0" }, [
      el("div", { class: "row-between" }, [
        el("div", {}, [
          el("strong", {}, `${unlocked.length} / ${ACHIEVEMENTS.length} unlocked`),
          el("div", { class: "muted", style: "font-size:.8rem" }, `Rank: ${lvl.title} · Level ${lvl.level}`),
        ]),
        el("div", { class: "text-center" }, [el("div", { style: "font-size:1.8rem" }, "🏅")]),
      ]),
    ]),
    el("div", { class: "badge-grid mt-4" }, ACHIEVEMENTS.map((a) => badgeCard(a, unlocked.includes(a.id)))),
    el("div", { style: "height:40px" })
  );
}

function badgeCard(a, isUnlocked) {
  return el("div", { class: `card badge-card ${isUnlocked ? "" : "locked"}` }, [
    el("div", { class: "badge-rarity", style: `background:${RARITY_COLOR[a.rarity]}` }),
    el("div", { class: "badge-icon" }, isUnlocked ? a.icon : "🔒"),
    el("div", { class: "badge-name" }, a.name),
    el("div", { class: "badge-desc" }, a.desc),
  ]);
}
