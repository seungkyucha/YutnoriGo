import './styles/main.css';
import * as THREE from 'three';

// 런타임 에러를 화면에 노출 (모바일 디버깅 / 블랭크 화면 방지)
function showFatal(msg: string) {
  let b = document.getElementById('fatal-err');
  if (!b) {
    b = document.createElement('div');
    b.id = 'fatal-err';
    b.style.cssText =
      'position:fixed;inset:auto 0 0 0;z-index:999;background:#b00020;color:#fff;' +
      'font:13px/1.4 monospace;padding:10px 14px;max-height:40vh;overflow:auto;white-space:pre-wrap';
    document.body.appendChild(b);
  }
  b.textContent = '⚠ 오류: ' + msg;
}
window.addEventListener('error', (e) => showFatal(e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(String((e as PromiseRejectionEvent).reason)));
import { SceneManager } from './three/scene';
import { BoardView } from './three/board';
import { YutThrow } from './three/yutThrow';
import { CoinFX } from './three/coinBurst';
import { GameState } from './game/state';
import { throwYut } from './game/yut';
import { resolveTile, applyEvent } from './game/events';
import { CITIES, ROLL_CAP, BOARD, ROULETTE_PRIZES, ROULETTE_MULT } from './game/config';
import { Hud } from './ui/hud';
import { Roulette } from './ui/roulette';
import { SFX, unlockAudio } from './ui/sound';
import { wait } from './three/anim';

// ===== 부트스트랩 =====
// #app = 세로형 무대(stage). 모바일은 화면 전체, 넓은 화면은 세로 칼럼.
const stage = document.getElementById('app') as HTMLElement;
const canvas = document.createElement('canvas');
canvas.id = 'gl';
stage.insertBefore(canvas, stage.firstChild);

const sm = new SceneManager(canvas, stage);
const state = new GameState();
const board = new BoardView(sm);
const yut = new YutThrow(sm);
const coinFX = new CoinFX(sm);
const roulette = new Roulette();

let isThrowing = false;

const hud = new Hud(state, {
  onThrow: () => doThrow(),
  onOpenBuild: () => hud.openBuild(),
  onBuild: (i) => doBuild(i),
  onCityNext: () => nextCity(),
});

function applyCityVisuals() {
  const c = state.city;
  sm.setSky(c.sky[0], c.sky[1]);
  board.renderCity(state);
  board.snapToken(state.data.pos);
}

applyCityVisuals();
hud.setCoinsImmediate(state.data.coins);
hud.refreshStats();

// 로딩 화면 페이드아웃
{
  const fill = document.querySelector('.loading-fill') as HTMLElement | null;
  if (fill) fill.style.width = '100%';
  const loading = document.getElementById('loading');
  setTimeout(() => {
    if (loading) { loading.style.opacity = '0'; setTimeout(() => loading.remove(), 500); }
  }, 600);
}

// 첫 입력에 오디오 언락
const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); };
window.addEventListener('pointerdown', unlock);

// ===== 윷 회복 루프 =====
setInterval(() => {
  const now = Date.now();
  const gained = state.tickRegen(now);
  if (gained > 0) { hud.setRolls(state.data.rolls); state.save(); updateThrowState(); }
  hud.setRollTimer(state.msToNextRoll(now), state.data.rolls >= ROLL_CAP);
}, 1000);

function updateThrowState() {
  hud.setThrowEnabled(!isThrowing && state.data.rolls > 0);
}
updateThrowState();

// 코인 화면 좌표(overlay) 헬퍼
function coinTargetOverlay(): THREE.Vector2 {
  const t = hud.coinTargetScreen();
  return sm.domToOverlay(t.x, t.y);
}

// 코인 폭발 연출 + 카운터 증가
function coinBurstTo(worldOrigin: THREE.Vector3, finalCoins: number, magnitude: number, big: boolean) {
  const origin = sm.worldToOverlay(worldOrigin);
  const count = Math.max(8, Math.min(48, Math.round(magnitude)));
  // 카운터는 즉시 빠르게 차오르기 시작 (연출과 독립 → 더 빠른 도파민)
  hud.bumpCoinsTo(finalCoins);
  let lastTick = 0;
  coinFX.onArrive = (i) => {
    // 도착마다 짤랑 (너무 잦으면 솎아냄)
    if (i - lastTick >= 1) { SFX.coinTick(); lastTick = i; }
    hud.punchCoins();
  };
  coinFX.setTarget(coinTargetOverlay());
  coinFX.burst(origin, coinTargetOverlay(), count, big);
}

// ===== 한 턴 =====
async function doThrow() {
  if (isThrowing) return;
  if (state.data.rolls <= 0) { hud.showEvent('윷 부족', '윷이 모이면 다시 던질 수 있어요'); return; }
  if (hud.isBuildOpen()) hud.closeBuild();

  isThrowing = true;
  updateThrowState();
  unlockAudio();

  // 윷 1개 소모
  state.data.rolls -= 1;
  hud.setRolls(state.data.rolls);

  SFX.throw();
  const outcome = throwYut();
  await yut.throw(outcome.sticks);
  SFX.land();
  hud.flashYut(outcome.result);
  await wait(700);

  // 말 이동
  const { to, passedStart } = await board.moveSteps(state.data.pos, outcome.result.steps);
  state.data.pos = to;

  // 출발선 통과 보너스 (도착이 출발칸이 아닐 때)
  if (passedStart && to !== 0) {
    const passCoins = Math.round(state.city.coinBase * state.bet);
    state.addCoins(passCoins);
    state.addRolls(1); hud.setRolls(state.data.rolls);
    SFX.coin();
    coinBurstTo(board.tokenWorldTop(), state.data.coins, 8, false);
    hud.showEvent('출발선 통과', `보너스 ${passCoins.toLocaleString()} 엽전 + 윷 1`);
    await wait(600);
  }

  // 칸 이벤트
  if (BOARD[to].type === 'event') {
    await eventRoulette();
  } else {
    const ev = resolveTile(state, to);
    await resolveEvent(ev);
  }

  state.save();
  hud.refreshStats();

  // 도시 완성 체크
  if (state.cityComplete()) {
    await wait(400);
    await cityClear();
    isThrowing = false;
    updateThrowState();
    return;
  }

  // 보너스(윷/모): 한 번 더
  if (outcome.result.bonus) {
    state.addRolls(1);
    hud.setRolls(state.data.rolls);
    hud.showEvent('한 번 더!', `${outcome.result.name}! 윷을 한 번 더 던지세요`);
  }

  isThrowing = false;
  updateThrowState();
}

async function resolveEvent(ev: ReturnType<typeof resolveTile>) {
  applyEvent(state, ev);

  // 토스트
  if (ev.kind !== 'build-tile') hud.showEvent(ev.title, ev.detail);

  // 사운드 + 비주얼
  switch (ev.kind) {
    case 'jackpot': SFX.jackpot(); break;
    case 'subsidy': SFX.bonus(); break;
    case 'bonus': case 'event-rolls': SFX.bonus(); hud.setRolls(state.data.rolls); break;
    case 'tax': SFX.tax(); break;
    default: if (ev.coins > 0) SFX.coin();
  }

  if (ev.coins > 0) {
    const mag = ev.big ? 42 : 20;
    coinBurstTo(board.tokenWorldTop(), state.data.coins, mag, ev.big);
    await wait(ev.big ? 680 : 540);
  } else if (ev.coins < 0) {
    hud.bumpCoinsTo(state.data.coins);
    await wait(600);
  } else {
    hud.setRolls(state.data.rolls);
    await wait(280);
  }

  // 건설 칸: 가장 저렴한 랜드마크를 무료로 건설
  if (ev.kind === 'build-tile') {
    const idx = state.nextBuildableIndex();
    if (idx >= 0) {
      await doBuildFree(idx);
    } else {
      hud.showEvent('건설 완료', '이 도시의 모든 랜드마크를 완성했습니다!');
    }
  }
}

// ===== 룰렛 이벤트 (엽전 10배) =====
async function eventRoulette() {
  const prize = await roulette.spin();
  const reward = Math.round(state.city.coinBase * ROULETTE_MULT * state.bet);
  state.addCoins(reward);
  SFX.jackpot();
  coinBurstTo(board.tokenWorldTop(), state.data.coins, 46, true);
  hud.showEvent(`🎰 ${ROULETTE_PRIZES[prize].short}`, `엽전 10배! +${reward.toLocaleString()}`);
  await wait(700);
}

// ===== 건설 =====
async function doBuild(index: number, auto = false) {
  if (!state.canBuild(index)) return;
  const res = state.build(index);
  if (!res) return;
  SFX.build();
  hud.bumpCoinsTo(state.data.coins);
  await board.upgradeLandmark(state, index);
  hud.refreshStats();
  if (hud.isBuildOpen()) hud.renderBuild();
  state.save();

  if (state.cityComplete()) {
    if (hud.isBuildOpen()) hud.closeBuild();
    await wait(300);
    await cityClear();
  } else if (!auto) {
    // 시트 유지
  }
}

// 건설 칸 보상: 가장 저렴한 랜드마크 무료 건설
async function doBuildFree(index: number) {
  const res = state.buildFree(index);
  if (!res) return;
  const lm = state.city.landmarks[index];
  SFX.build();
  hud.showEvent('🏗️ 무료 건설!', `${lm.name} Lv.${res.newLevel} 완성`);
  await board.upgradeLandmark(state, index);
  hud.refreshStats();
  if (hud.isBuildOpen()) hud.renderBuild();
  state.save();

  if (state.cityComplete()) {
    await wait(300);
    await cityClear();
  }
}

// ===== 도시 완성 / 다음 도시 =====
async function cityClear() {
  const c = state.city;
  const reward = Math.round(c.coinBase * 40);
  state.addCoins(reward);
  state.addRolls(20);
  hud.setCoinsImmediate(state.data.coins);
  hud.refreshStats();
  state.save();
  SFX.cityClear();
  const isLast = state.data.cityIndex >= CITIES.length - 1;
  const nextName = isLast ? null : CITIES[state.data.cityIndex + 1].name;
  hud.showCityClear(c.name, nextName, reward);
}

function nextCity() {
  if (state.advanceCity()) {
    applyCityVisuals();
    hud.setCoinsImmediate(state.data.coins);
    hud.refreshStats();
    state.save();
    isThrowing = false;
    updateThrowState();
  } else {
    // 마지막 도시: 계속 즐기기
    isThrowing = false;
    updateThrowState();
  }
}

// 디버그용 전역
(window as any).YG = {
  state, board, sm,
  reset: () => { state.reset(); location.reload(); },
  testBurst: (amount = 50000, big = true) => {
    state.addCoins(amount);
    coinBurstTo(board.tokenWorldTop(), state.data.coins, big ? 40 : 18, big);
  },
  testRoulette: () => eventRoulette(),
  testBuildAll: async () => {
    for (let i = 0; i < state.city.landmarks.length; i++) {
      while (state.buildFree(i)) { /* max */ }
    }
    board.renderCity(state); hud.refreshStats();
  },
};
