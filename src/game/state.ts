import {
  CITIES, BET_LEVELS, ROLL_CAP, ROLL_REGEN_MS, SHIELD_CAP,
  landmarkCost, type SaveData,
} from './config';

const SAVE_KEY = 'yutnori-go-save-v1';

function freshProgress(): number[][] {
  return CITIES.map((c) => c.landmarks.map(() => 0));
}

function defaultSave(): SaveData {
  return {
    coins: 30000,
    rolls: 50,
    shields: 1,
    betIndex: 0,
    pos: 0,
    cityIndex: 0,
    progress: freshProgress(),
    lastRegen: 0, // 0 = uninitialized, set on first tick
    totalRolls: 0,
  };
}

export class GameState {
  data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as SaveData;
      const base = defaultSave();
      const merged = { ...base, ...parsed };
      // progress 배열 형태 보정
      if (!Array.isArray(merged.progress) || merged.progress.length !== CITIES.length) {
        merged.progress = freshProgress();
      } else {
        merged.progress = CITIES.map((c, i) =>
          c.landmarks.map((_, j) => merged.progress[i]?.[j] ?? 0)
        );
      }
      return merged;
    } catch {
      return defaultSave();
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch { /* ignore quota */ }
  }

  reset() {
    this.data = defaultSave();
    this.save();
  }

  // ===== 파생 값 =====
  get bet(): number { return BET_LEVELS[this.data.betIndex]; }
  get city() { return CITIES[this.data.cityIndex]; }
  get landmarkLevels(): number[] { return this.data.progress[this.data.cityIndex]; }

  cityComplete(cityIndex = this.data.cityIndex): boolean {
    const c = CITIES[cityIndex];
    return c.landmarks.every((lm, i) => this.data.progress[cityIndex][i] >= lm.levels);
  }

  cityProgressRatio(cityIndex = this.data.cityIndex): number {
    const c = CITIES[cityIndex];
    let cur = 0, max = 0;
    c.landmarks.forEach((lm, i) => { cur += this.data.progress[cityIndex][i]; max += lm.levels; });
    return max ? cur / max : 0;
  }

  // ===== 자원 조작 =====
  addCoins(n: number) { this.data.coins = Math.max(0, Math.round(this.data.coins + n)); }
  addShield(n = 1) { this.data.shields = Math.min(SHIELD_CAP, this.data.shields + n); }
  useShield(): boolean {
    if (this.data.shields > 0) { this.data.shields--; return true; }
    return false;
  }
  addRolls(n: number) { this.data.rolls = Math.min(ROLL_CAP, this.data.rolls + n); }

  cycleBet() {
    this.data.betIndex = (this.data.betIndex + 1) % BET_LEVELS.length;
  }

  // ===== 윷 회복 (시간 기반) =====
  // returns number of rolls just regenerated
  tickRegen(now: number): number {
    if (this.data.lastRegen === 0) { this.data.lastRegen = now; return 0; }
    if (this.data.rolls >= ROLL_CAP) { this.data.lastRegen = now; return 0; }
    const elapsed = now - this.data.lastRegen;
    const gained = Math.floor(elapsed / ROLL_REGEN_MS);
    if (gained > 0) {
      const before = this.data.rolls;
      this.addRolls(gained);
      this.data.lastRegen += gained * ROLL_REGEN_MS;
      return this.data.rolls - before;
    }
    return 0;
  }

  msToNextRoll(now: number): number {
    if (this.data.rolls >= ROLL_CAP) return 0;
    if (this.data.lastRegen === 0) return ROLL_REGEN_MS;
    const elapsed = now - this.data.lastRegen;
    return Math.max(0, ROLL_REGEN_MS - (elapsed % ROLL_REGEN_MS));
  }

  // ===== 건설 =====
  // 현재 도시에서 건설 가능한(가장 저렴한 다음 단계) 랜드마크 인덱스 반환
  nextBuildableIndex(): number {
    const c = this.city;
    let best = -1, bestCost = Infinity;
    c.landmarks.forEach((lm, i) => {
      const lvl = this.landmarkLevels[i];
      if (lvl < lm.levels) {
        const cost = landmarkCost(lm, lvl);
        if (cost < bestCost) { bestCost = cost; best = i; }
      }
    });
    return best;
  }

  canBuild(index: number): boolean {
    const c = this.city;
    const lm = c.landmarks[index];
    if (!lm) return false;
    const lvl = this.landmarkLevels[index];
    if (lvl >= lm.levels) return false;
    return this.data.coins >= landmarkCost(lm, lvl);
  }

  build(index: number): { cost: number; newLevel: number } | null {
    const c = this.city;
    const lm = c.landmarks[index];
    if (!lm) return null;
    const lvl = this.landmarkLevels[index];
    if (lvl >= lm.levels) return null;
    const cost = landmarkCost(lm, lvl);
    if (this.data.coins < cost) return null;
    this.addCoins(-cost);
    this.data.progress[this.data.cityIndex][index] = lvl + 1;
    return { cost, newLevel: lvl + 1 };
  }

  // 무료 건설 (건설 칸 보상)
  buildFree(index: number): { newLevel: number } | null {
    const lm = this.city.landmarks[index];
    if (!lm) return null;
    const lvl = this.landmarkLevels[index];
    if (lvl >= lm.levels) return null;
    this.data.progress[this.data.cityIndex][index] = lvl + 1;
    return { newLevel: lvl + 1 };
  }

  advanceCity(): boolean {
    if (this.data.cityIndex < CITIES.length - 1) {
      this.data.cityIndex++;
      this.data.pos = 0;
      return true;
    }
    return false;
  }
}
