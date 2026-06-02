import { ROULETTE_PRIZES } from '../game/config';
import { SFX } from './sound';

// 파칭코식 화려한 룰렛 — spin()은 당첨 상품 인덱스(0..2)를 반환
export class Roulette {
  private backdrop!: HTMLElement;
  private wheel!: HTMLElement;
  private resultEl!: HTMLElement;
  private tickTimer = 0;
  private spinning = false;

  constructor() { this.build(); }

  private el(tag: string, cls?: string, html?: string): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  private build() {
    const host = document.getElementById('app') || document.body;
    this.backdrop = this.el('div', 'rl-backdrop');
    const stage = this.el('div', 'rl-stage');
    const title = this.el('div', 'rl-title', '🎰 행운의 룰렛 🎰');
    const sub = this.el('div', 'rl-sub', '당첨 시 <b>엽전 10배</b> 지급!');

    const wrap = this.el('div', 'rl-wheel-wrap');

    // 러닝 라이트 링 (파칭코)
    const lights = this.el('div', 'rl-lights');
    const N = 24;
    for (let i = 0; i < N; i++) {
      const d = this.el('i');
      const ang = (i / N) * 360;
      d.style.setProperty('--a', `${ang}deg`);
      d.style.animationDelay = `${(i % 6) * 0.1}s`;
      lights.appendChild(d);
    }

    // 휠
    this.wheel = this.el('div', 'rl-wheel');
    const stops: string[] = [];
    for (let i = 0; i < 6; i++) {
      const col = ROULETTE_PRIZES[i % 3].color;
      stops.push(`${col} ${i * 60}deg ${(i + 1) * 60}deg`);
    }
    this.wheel.style.background = `conic-gradient(from 0deg, ${stops.join(',')})`;
    // 세그먼트 라벨
    for (let i = 0; i < 6; i++) {
      const p = ROULETTE_PRIZES[i % 3];
      const ang = ((i * 60 + 30) * Math.PI) / 180;
      const lab = this.el('div', 'rl-seg', `<span class="e">${p.emoji}</span><b>${p.short}</b><span class="x">10배</span>`);
      lab.style.left = `${50 + 33 * Math.sin(ang)}%`;
      lab.style.top = `${50 - 33 * Math.cos(ang)}%`;
      this.wheel.appendChild(lab);
    }

    const hub = this.el('div', 'rl-hub', '🎲');
    const pointer = this.el('div', 'rl-pointer');
    wrap.append(lights, this.wheel, hub, pointer);

    this.resultEl = this.el('div', 'rl-result');

    stage.append(title, sub, wrap, this.resultEl);
    this.backdrop.appendChild(stage);
    host.appendChild(this.backdrop);
  }

  private startTicks() {
    const t0 = performance.now();
    const tick = () => {
      SFX.spinTick();
      const elapsed = performance.now() - t0;
      const gap = 55 + (elapsed / 3500) * 260; // 점점 느려지는 틱
      if (elapsed < 3550) this.tickTimer = window.setTimeout(tick, gap);
    };
    this.tickTimer = window.setTimeout(tick, 60);
  }
  private stopTicks() { clearTimeout(this.tickTimer); }

  spin(): Promise<number> {
    return new Promise((resolve) => {
      if (this.spinning) { resolve(0); return; }
      this.spinning = true;
      this.backdrop.classList.add('open');
      this.resultEl.classList.remove('show');
      this.resultEl.innerHTML = '';

      const seg = Math.floor(Math.random() * 6);
      const prize = seg % 3;
      const spins = 6;
      const jitter = (Math.random() - 0.5) * 36; // 세그먼트 내 랜덤 착지
      const target = 360 * spins - (seg * 60 + 30) + jitter;

      // 초기화 후 회전
      this.wheel.style.transition = 'none';
      this.wheel.style.transform = 'rotate(0deg)';
      void this.wheel.offsetWidth;
      this.wheel.style.transition = 'transform 3.6s cubic-bezier(0.1,0.62,0.12,1)';
      this.wheel.style.transform = `rotate(${target}deg)`;

      SFX.spin();
      this.startTicks();

      setTimeout(() => {
        this.stopTicks();
        const p = ROULETTE_PRIZES[prize];
        this.resultEl.innerHTML =
          `<div class="rl-win-emoji">${p.emoji}</div>` +
          `<div class="rl-win-name">${p.name}</div>` +
          `<div class="rl-win-reward">🪙 엽전 <b>10배</b> 당첨!</div>`;
        this.resultEl.classList.add('show');
        SFX.cityClear();
        this.backdrop.classList.add('won');
        setTimeout(() => {
          this.backdrop.classList.remove('open');
          this.backdrop.classList.remove('won');
          this.spinning = false;
          resolve(prize);
        }, 1700);
      }, 3680);
    });
  }
}
