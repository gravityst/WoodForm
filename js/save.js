import { CONFIG, xpForLevel } from './config.js?v=8';
import { WOODS } from './woods.js?v=8';
import { TOOLS } from './tools.js?v=8';

const KEY = 'woodform.save.v1';

const DEFAULT = () => ({
  coins: 120,
  xp: 0,
  level: 1,
  audio: true,
  unlockedWoods: ['pine'],
  unlockedTools: ['chisel', 'scraper', 'sandblock'],
  best: {},     // orderId -> best stars
  toolLevel: {}, // toolId -> upgrade level (1..3)
});

export class Save {
  constructor() { this.load(); }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? Object.assign(DEFAULT(), JSON.parse(raw)) : DEFAULT();
    } catch (e) { this.data = DEFAULT(); }
    // make sure level-gated freebies are present
    this._grantByLevel();
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
  }

  reset() { this.data = DEFAULT(); this.save(); }

  // ---- progression ----------------------------------------------------------
  get level() { return this.data.level; }
  get coins() { return this.data.coins; }
  get xp() { return this.data.xp; }

  xpToNext() { return xpForLevel(this.data.level); }

  addReward(coins, xp) {
    this.data.coins += coins;
    this.data.xp += xp;
    const levelsGained = [];
    while (this.data.xp >= xpForLevel(this.data.level)) {
      this.data.xp -= xpForLevel(this.data.level);
      this.data.level++;
      levelsGained.push(this.data.level);
    }
    this._grantByLevel();
    this.save();
    return levelsGained;
  }

  recordResult(orderId, stars) {
    const prev = this.data.best[orderId] || 0;
    if (stars > prev) { this.data.best[orderId] = stars; this.save(); }
  }

  // unlock anything whose unlockLevel has been reached, for free
  _grantByLevel() {
    for (const w of WOODS) {
      if (w.cost === 0 && w.unlockLevel <= this.data.level &&
          !this.data.unlockedWoods.includes(w.id)) this.data.unlockedWoods.push(w.id);
    }
    for (const t of TOOLS) {
      if (t.cost === 0 && t.unlockLevel <= this.data.level &&
          !this.data.unlockedTools.includes(t.id)) this.data.unlockedTools.push(t.id);
    }
  }

  // ---- shop -----------------------------------------------------------------
  canBuy(cost) { return this.data.coins >= cost; }

  buyWood(id) {
    const w = WOODS.find(x => x.id === id);
    if (!w || this.data.unlockedWoods.includes(id)) return false;
    if (this.data.level < w.unlockLevel || this.data.coins < w.cost) return false;
    this.data.coins -= w.cost;
    this.data.unlockedWoods.push(id);
    this.save();
    return true;
  }

  buyTool(id) {
    const t = TOOLS.find(x => x.id === id);
    if (!t || this.data.unlockedTools.includes(id)) return false;
    if (this.data.level < t.unlockLevel || this.data.coins < t.cost) return false;
    this.data.coins -= t.cost;
    this.data.unlockedTools.push(id);
    this.save();
    return true;
  }

  hasWood(id) { return this.data.unlockedWoods.includes(id); }
  hasTool(id) { return this.data.unlockedTools.includes(id); }
  setAudio(on) { this.data.audio = !!on; this.save(); }
}
