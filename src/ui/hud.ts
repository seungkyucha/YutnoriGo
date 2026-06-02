import { GameState } from '../game/state';
import { landmarkCost, type YutResult, BET_LEVELS } from '../game/config';
import { SFX, setMuted, isMuted } from './sound';

const KIND_EMOJI: Record<string, string> = {
  palace: '🏯', gate: '⛩️', tower: '🗼', river: '🌉', market: '🏪',
  bridge: '🌉', beach: '🏖️', village: '🏘️', observatory: '🔭', temple: '🛕',
  pond: '⛲', cathedral: '⛪', hanok: '🏠', peak: '⛰️', statue: '🗿', rock: '🪨',
};

export interface HudHandlers {
  onThrow: () => void;
  onBet: () => void;
  onOpenBuild: () => void;
  onBuild: (index: number) => void;
  onCityNext: () => void;
}

const A = './assets';

export class Hud {
  private h: HudHandlers;
  private state: GameState;
  private shownCoins = 0;

  throwBtn!: HTMLButtonElement;
  private coinStat!: HTMLElement;
  private coinVal!: HTMLElement;
  private rollVal!: HTMLElement;
  private rollTimer!: HTMLElement;
  private shieldVal!: HTMLElement;
  private betBtn!: HTMLButtonElement;
  private cityName!: HTMLElement;
  private cityProg!: HTMLElement;
  private yutResult!: HTMLElement;
  private eventToast!: HTMLElement;
  private buildBadge!: HTMLElement;

  // build sheet
  private sheet!: HTMLElement;
  private sheetBody!: HTMLElement;
  private sheetBackdrop!: HTMLElement;
  // city clear
  private cityClear!: HTMLElement;

  constructor(state: GameState, handlers: HudHandlers) {
    this.state = state;
    this.h = handlers;
    this.shownCoins = state.data.coins;
    this.build();
  }

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  private build() {
    // ===== 상단 HUD =====
    const top = this.el('div'); top.id = 'hud-top';

    const row = this.el('div', 'stat-row');
    this.coinStat = this.el('div', 'stat coins');
    this.coinStat.innerHTML = `<img src="${A}/icon-coin.svg" alt="엽전"><span class="val">0</span>`;
    this.coinVal = this.coinStat.querySelector('.val')!;

    const rollStat = this.el('div', 'stat rolls');
    rollStat.innerHTML = `<img src="${A}/icon-roll.svg" alt="윷"><span class="val">0</span><span class="sub"></span>`;
    this.rollVal = rollStat.querySelector('.val')!;
    this.rollTimer = rollStat.querySelector('.sub')!;

    const shieldStat = this.el('div', 'stat shields');
    shieldStat.innerHTML = `<img src="${A}/icon-shield.svg" alt="방패"><span class="val">0</span>`;
    this.shieldVal = shieldStat.querySelector('.val')!;

    this.betBtn = this.el('button'); this.betBtn.id = 'bet-btn'; this.betBtn.textContent = '×1';
    this.betBtn.onclick = () => { SFX.click(); this.h.onBet(); };

    row.append(this.coinStat, rollStat, shieldStat, this.betBtn);

    const cityBar = this.el('div'); cityBar.id = 'city-bar';
    this.cityName = this.el('div', 'cname');
    const prog = this.el('div', 'progress');
    this.cityProg = this.el('div');
    prog.appendChild(this.cityProg);
    cityBar.append(this.cityName, prog);

    top.append(row, cityBar);

    // ===== 하단 컨트롤 =====
    const bottom = this.el('div'); bottom.id = 'hud-bottom';
    const brow = this.el('div', 'bottom-row');

    const buildBtn = this.el('button', 'mini-btn');
    buildBtn.innerHTML = `🏗️ 건설 <span class="badge" style="display:none">!</span>`;
    this.buildBadge = buildBtn.querySelector('.badge')!;
    buildBtn.onclick = () => { SFX.click(); this.h.onOpenBuild(); };

    this.throwBtn = this.el('button'); this.throwBtn.id = 'throw-btn';
    this.throwBtn.innerHTML = `<img src="${A}/icon-roll.svg" alt="">윷 던지기`;
    this.throwBtn.onclick = () => this.h.onThrow();

    const menuBtn = this.el('button', 'mini-btn');
    menuBtn.innerHTML = isMuted() ? '🔇' : '🔊';
    menuBtn.onclick = () => { setMuted(!isMuted()); menuBtn.innerHTML = isMuted() ? '🔇' : '🔊'; SFX.click(); };

    brow.append(buildBtn, this.throwBtn, menuBtn);
    bottom.append(brow);

    // ===== 윷 결과 토스트 =====
    this.yutResult = this.el('div'); this.yutResult.id = 'yut-result';
    this.yutResult.innerHTML = `<div class="big"></div><div class="steps"></div>`;

    // ===== 이벤트 토스트 =====
    this.eventToast = this.el('div'); this.eventToast.id = 'event-toast';
    this.eventToast.innerHTML = `<div class="et"></div><div class="ed"></div>`;

    // ===== 건설 시트 =====
    this.sheetBackdrop = this.el('div', 'sheet-backdrop');
    this.sheetBackdrop.onclick = () => this.closeBuild();
    this.sheet = this.el('div', 'sheet');
    const sh = this.el('h2'); sh.textContent = '랜드마크 건설';
    const ssub = this.el('div', 'sub'); ssub.id = 'sheet-sub';
    this.sheetBody = this.el('div');
    const close = this.el('button', 'sheet-close'); close.textContent = '닫기';
    close.onclick = () => this.closeBuild();
    this.sheet.append(sh, ssub, this.sheetBody, close);

    // ===== 도시 완성 =====
    this.cityClear = this.el('div'); this.cityClear.id = 'city-clear';

    const host = document.getElementById('app') || document.body;
    host.append(top, bottom, this.yutResult, this.eventToast, this.sheetBackdrop, this.sheet, this.cityClear);

    this.refreshStats();
  }

  // ===== 갱신 =====
  refreshStats() {
    this.coinVal.textContent = Math.round(this.shownCoins).toLocaleString();
    this.rollVal.textContent = String(this.state.data.rolls);
    this.shieldVal.textContent = String(this.state.data.shields);
    this.betBtn.textContent = '×' + this.state.bet;
    const c = this.state.city;
    this.cityName.innerHTML = `<b>${c.name}</b> · ${c.subtitle}`;
    this.cityProg.style.width = Math.round(this.state.cityProgressRatio() * 100) + '%';
    this.updateBuildBadge();
  }

  updateBuildBadge() {
    const idx = this.state.nextBuildableIndex();
    const can = idx >= 0 && this.state.canBuild(idx);
    this.buildBadge.style.display = can ? '' : 'none';
  }

  setRolls(n: number) { this.rollVal.textContent = String(n); }
  setShields(n: number) { this.shieldVal.textContent = String(n); this.flashStat(this.shieldVal.parentElement!); }
  setBet(x: number) { this.betBtn.textContent = '×' + x; }

  setRollTimer(msLeft: number, full: boolean) {
    if (full) { this.rollTimer.textContent = 'MAX'; return; }
    const s = Math.ceil(msLeft / 1000);
    this.rollTimer.textContent = `+1 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  private flashStat(e: HTMLElement) {
    e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  }

  // 코인 카운터를 목표값까지 애니메이션 (코인 도착 시 호출)
  bumpCoinsTo(target: number) {
    this.flashStat(this.coinStat);
    const gaining = target > this.shownCoins;
    if (gaining) {
      this.coinStat.classList.add('gain');
      clearTimeout((this as any)._gain);
      (this as any)._gain = setTimeout(() => this.coinStat.classList.remove('gain'), 700);
    }
    const start = this.shownCoins;
    const startT = performance.now();
    const dur = gaining ? 420 : 360;
    const step = (now: number) => {
      const p = Math.min(1, (now - startT) / dur);
      this.shownCoins = start + (target - start) * (1 - Math.pow(1 - p, 4));
      this.coinVal.textContent = Math.round(this.shownCoins).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else { this.shownCoins = target; this.coinVal.textContent = Math.round(target).toLocaleString(); }
    };
    requestAnimationFrame(step);
  }

  // 코인이 카운터에 꽂힐 때마다 짧은 펀치
  punchCoins() {
    this.coinVal.classList.remove('punch'); void this.coinVal.offsetWidth;
    this.coinVal.classList.add('punch');
  }

  setCoinsImmediate(n: number) { this.shownCoins = n; this.coinVal.textContent = Math.round(n).toLocaleString(); }

  coinTargetScreen(): { x: number; y: number } {
    const r = this.coinStat.getBoundingClientRect();
    return { x: r.left + r.width * 0.18, y: r.top + r.height / 2 };
  }

  setThrowEnabled(on: boolean) {
    this.throwBtn.disabled = !on;
    this.throwBtn.classList.toggle('charge', on);
  }

  flashYut(res: YutResult) {
    const big = this.yutResult.querySelector('.big')! as HTMLElement;
    const steps = this.yutResult.querySelector('.steps')! as HTMLElement;
    big.textContent = res.name;
    const dir = res.steps < 0 ? '뒤로 ' : '';
    steps.textContent = `${dir}${Math.abs(res.steps)}칸${res.bonus ? ' · 한 번 더!' : ''}`;
    this.yutResult.classList.remove('show'); void this.yutResult.offsetWidth;
    this.yutResult.classList.add('show');
  }

  showEvent(title: string, detail: string) {
    (this.eventToast.querySelector('.et') as HTMLElement).textContent = title;
    (this.eventToast.querySelector('.ed') as HTMLElement).textContent = detail;
    this.eventToast.classList.add('show');
    clearTimeout((this as any)._evt);
    (this as any)._evt = setTimeout(() => this.eventToast.classList.remove('show'), 1700);
  }

  // ===== 건설 시트 =====
  openBuild() { this.renderBuild(); this.sheetBackdrop.classList.add('open'); this.sheet.classList.add('open'); }
  closeBuild() { this.sheetBackdrop.classList.remove('open'); this.sheet.classList.remove('open'); }
  isBuildOpen() { return this.sheet.classList.contains('open'); }

  renderBuild() {
    const sub = document.getElementById('sheet-sub')!;
    sub.textContent = `${this.state.city.name} · 모든 랜드마크를 완성하면 다음 도시로!`;
    this.sheetBody.innerHTML = '';
    this.state.city.landmarks.forEach((lm, i) => {
      const lvl = this.state.landmarkLevels[i];
      const done = lvl >= lm.levels;
      const cost = done ? 0 : landmarkCost(lm, lvl);
      const card = this.el('div', 'lm-card');
      const dots = Array.from({ length: lm.levels }, (_, k) =>
        `<i class="${k < lvl ? 'on' : ''}"></i>`).join('');
      card.innerHTML = `
        <div class="lm-emoji">${KIND_EMOJI[lm.kind] || '🏛️'}</div>
        <div class="lm-info">
          <div class="lm-name">${lm.name}</div>
          <div class="lm-lv">Lv.${lvl} / ${lm.levels}</div>
          <div class="lm-dots">${dots}</div>
        </div>`;
      const btn = this.el('button', 'lm-build');
      if (done) {
        btn.classList.add('done'); btn.innerHTML = '완성<small>✓</small>'; btn.disabled = true;
      } else {
        const afford = this.state.data.coins >= cost;
        btn.disabled = !afford;
        btn.innerHTML = `건설<small><img class="coin-mini" src="${A}/icon-coin.svg">${cost.toLocaleString()}</small>`;
        btn.onclick = () => this.h.onBuild(i);
      }
      card.appendChild(btn);
      this.sheetBody.appendChild(card);
    });
  }

  // ===== 도시 완성 =====
  showCityClear(cityName: string, nextName: string | null, reward: number) {
    this.cityClear.innerHTML = `
      <div class="ribbon">🎉 도시 완성 🎉</div>
      <div class="title">${cityName}</div>
      <div class="reward">+${reward.toLocaleString()} 엽전 · 윷 +20</div>
      ${nextName
        ? `<div class="ribbon" style="font-size:5cqw">다음 도시: <b style="color:var(--gold)">${nextName}</b></div>`
        : `<div class="ribbon" style="font-size:5cqw">🏆 전국 통일 달성!</div>`}
      <button id="city-next">${nextName ? `${nextName}(으)로!` : '계속 즐기기'}</button>`;
    this.cityClear.classList.add('show');
    const btn = this.cityClear.querySelector('#city-next') as HTMLButtonElement;
    btn.onclick = () => { SFX.click(); this.cityClear.classList.remove('show'); this.h.onCityNext(); };
  }
}
