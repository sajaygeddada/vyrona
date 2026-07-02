import { Store } from "./state.js";

// id, name, category, description, mode, accent, accent2, background, elevated, card, border
const RAW = [
  ["midnight-focus","Midnight Focus","Productivity","Deep navy for distraction-free work","dark","#7c6cff","#36d6c7","#080b18","#11162a","#171d35","#293252"],
  ["studio-dark","Studio Dark","Productivity","Neutral charcoal for creative work","dark","#ff7a59","#62b8ff","#101112","#191b1d","#202326","#34383d"],
  ["minimal-white","Minimal White","Productivity","Quiet, editorial and spacious","light","#2563eb","#7c3aed","#f7f7f5","#ffffff","#ffffff","#deded9"],
  ["nordic","Nordic","Productivity","Scandinavian daylight and calm","light","#39788f","#d7896c","#edf3f3","#f9fbfb","#ffffff","#cad9d9"],
  ["slate-pro","Slate Pro","Productivity","Focused slate with crisp cyan","dark","#38bdf8","#818cf8","#0f172a","#172033","#1e293b","#334155"],
  ["carbon","Carbon","Productivity","Technical graphite with a lime edge","dark","#a3e635","#22d3ee","#090a0a","#141616","#1b1e1e","#303535"],
  ["forest-calm","Forest Calm","Nature","Mossy depth and botanical glow","dark","#63d471","#d6b36a","#07120d","#102019","#162a20","#294537"],
  ["ocean-breeze","Ocean Breeze","Nature","Airy blues and coastal clarity","light","#0284c7","#14b8a6","#eaf7fb","#f7fcfd","#ffffff","#bddde7"],
  ["desert-sand","Desert Sand","Nature","Warm minerals and sunlit paper","light","#c26a3d","#d7a93e","#f5ead8","#fff9ef","#fffaf3","#ddc8a9"],
  ["sakura","Sakura","Nature","Spring pink balanced by soft plum","light","#db5f86","#8b5e83","#fff2f5","#fff9fa","#ffffff","#edcbd5"],
  ["rainy-day","Rainy Day","Nature","Muted storm glass for thoughtful days","dark","#70a7c7","#a7c4d3","#0d151b","#17232b","#1d2c35","#344854"],
  ["emerald","Emerald","Nature","Jewel-green depth and light","dark","#10b981","#6ee7b7","#04130e","#092219","#0e2d21","#18503a"],
  ["cyberpunk","Cyberpunk","Gaming","Electric magenta after midnight","dark","#ff2bd6","#00e5ff","#090312","#160923","#21102f","#4a1955"],
  ["neon-tokyo","Neon Tokyo","Gaming","Rainy neon in violet and red","dark","#ff3b6b","#8b5cf6","#080713","#151128","#1e1736","#3b2b59"],
  ["matrix","Matrix","Gaming","Terminal green over digital black","dark","#39ff88","#b7ff3c","#020704","#06110a","#09180e","#174527"],
  ["hacker","Hacker","Gaming","Amber terminal energy","dark","#facc15","#22c55e","#090b08","#121610","#191e16","#343b2b"],
  ["galaxy","Galaxy","Gaming","Violet cosmos and cool starlight","dark","#9b7cff","#40c9ff","#070615","#11102a","#19163a","#332c62"],
  ["space-odyssey","Space Odyssey","Gaming","Cinematic space and solar flare","dark","#ff6b35","#4cc9f0","#05070d","#0e1420","#141d2c","#293b55"],
  ["titanium","Titanium","Premium","Machined silver and blue steel","light","#526d82","#8a6f4d","#e8ecef","#f4f6f7","#ffffff","#c3ccd2"],
  ["obsidian","Obsidian","Premium","Polished black glass and violet","dark","#a78bfa","#64748b","#050506","#0d0d10","#141419","#292932"],
  ["royal-purple","Royal Purple","Premium","Regal plum and restrained gold","dark","#a855f7","#e6bd55","#100718","#1b0d29","#28133b","#4b2865"],
  ["crimson-night","Crimson Night","Premium","Velvet red over black lacquer","dark","#ef445f","#f59e62","#100508","#1d0b10","#291016","#521f2a"],
  ["golden-hour","Golden Hour","Premium","Champagne light and warmth","light","#c38220","#df6b45","#fff5df","#fffaf0","#ffffff","#ead4aa"],
  ["fire-and-ice","Fire & Ice","Premium","A collision of ember and glacier","dark","#ff6433","#38bdf8","#07101a","#101d29","#172839","#31516b"],
  ["rose-petal","Rose Petal","Cute","Powdered rose and warm berry","light","#e45b83","#f09a83","#fff1f4","#fff8f9","#ffffff","#efcbd4"],
  ["lavender-dream","Lavender Dream","Cute","Cloudy lilac and periwinkle","light","#8b6dd8","#d06fb3","#f5f0ff","#fbf9ff","#ffffff","#dcd0f1"],
  ["cherry-blossom","Cherry Blossom","Cute","Blossom pink and spring green","light","#f06d9b","#77a96b","#fff4f7","#fffafb","#ffffff","#f1d0da"],
  ["cotton-candy","Cotton Candy","Cute","Playful blue and pink","light","#f05bb5","#4dbce9","#f5f5ff","#fcfbff","#ffffff","#dcdaf1"],
  ["mint-fresh","Mint Fresh","Cute","Mint cream and juicy green","light","#16a889","#55a7d9","#eafff8","#f7fffc","#ffffff","#c3e8dc"],
  ["amoled-black","AMOLED Black","AMOLED","True black with vivid blue","dark","#3b82f6","#22d3ee","#000000","#050505","#090909","#222222"],
  ["eclipse","Eclipse","AMOLED","Blackout with a solar orange ring","dark","#ff7a1a","#facc15","#000000","#070503","#0c0906","#2a1c10"],
  ["deep-space","Deep Space","AMOLED","True black and distant indigo","dark","#6366f1","#06b6d4","#000000","#04050b","#080a14","#1f2340"],
  ["void","Void","AMOLED","Darkness with ultraviolet pulse","dark","#c026d3","#7c3aed","#000000","#060306","#0c070d","#2b172e"],
  ["vintage-paper","Vintage Paper","Retro","Aged paper and faded ink","light","#9a5b3c","#697a4d","#efe2c4","#f8efd9","#fbf3df","#d4c19b"],
  ["coffee-house","Coffee House","Retro","Roasted browns and cafe cream","light","#8b5a35","#b77a3d","#efe2d1","#f8f0e5","#fff9f1","#d7c1aa"],
  ["retro-wave","Retro Wave","Retro","Hot sunset over electric night","dark","#ff4fb3","#ff9f43","#110727","#1d0e38","#29154b","#543076"],
  ["synthwave","Synthwave","Retro","Arcade violet and laser blue","dark","#b026ff","#00d9ff","#09051a","#150b2b","#20103d","#48226e"]
];

export const THEMES = RAW.map(([id,name,category,description,mode,accent,accent2,bg,elevated,card,border]) => ({id,name,category,description,mode,accent,accent2,bg,elevated,card,border}));
export const CATEGORIES = ["All","Favorites",...new Set(THEMES.map(t => t.category))];
// Compatibility exports for older settings code during the V3 migration.
export const ACCENTS = [];
export const SKINS = [];
export const getTheme = id => THEMES.find(t => t.id === id) || THEMES[0];
export const themePreview = t => `--p-accent:${t.accent};--p-accent2:${t.accent2};--p-bg:${t.bg};--p-card:${t.card};--p-border:${t.border}`;

export function applyTheme(id = Store.getSettings().themeId) {
  const t = getTheme(id), body = document.body;
  body.dataset.theme = t.id;
  body.dataset.themeMode = t.mode;
  const text = t.mode === "dark" ? "#f5f7ff" : "#18202a";
  const dim = t.mode === "dark" ? "#b0b7ca" : "#596573";
  const tokens = {
    "--accent":t.accent,"--accent-2":t.accent2,"--bg":t.bg,"--bg-elevated":t.elevated,
    "--bg-card":t.card,"--bg-card-hover":`color-mix(in srgb,${t.card} 86%,${t.accent})`,
    "--bg-input":t.elevated,"--border":t.border,"--border-strong":`color-mix(in srgb,${t.border} 65%,${t.accent})`,
    "--text":text,"--text-dim":dim,"--text-faint":`color-mix(in srgb,${dim} 72%,transparent)`,
    "--skin-bg-image":`radial-gradient(circle at 12% 0%,color-mix(in srgb,${t.accent} 18%,transparent),transparent 40%),radial-gradient(circle at 100% 15%,color-mix(in srgb,${t.accent2} 12%,transparent),transparent 38%)`,
    "--chart-1":t.accent,"--chart-2":t.accent2,"--chart-3":"#35c987","--chart-4":"#f5b942","--chart-5":"#f0546b",
    "--shadow-glow":`0 0 0 1px color-mix(in srgb,${t.accent} 35%,transparent),0 0 28px color-mix(in srgb,${t.accent} 24%,transparent)`
  };
  Object.entries(tokens).forEach(([key,value]) => body.style.setProperty(key,value));
  body.classList.toggle("reduce-motion", Boolean(Store.getSettings().reduceMotion));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",t.bg);
}
