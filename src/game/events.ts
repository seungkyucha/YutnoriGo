import { BOARD, type TileDef } from './config';
import { GameState } from './state';

export type EventKind =
  | 'coin' | 'jackpot' | 'tax' | 'shield' | 'bonus'
  | 'attack' | 'attack-blocked' | 'event-coin' | 'event-rolls' | 'start' | 'build-tile';

export interface TileEvent {
  kind: EventKind;
  tile: TileDef;
  coins: number; // 코인 변화량(+/-)
  rolls: number; // 윷 변화량
  shields: number; // 방패 변화량
  title: string;
  detail: string;
  big: boolean; // 대형 연출 여부 (코인 폭발 강도)
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// 한 칸 도착 시 이벤트 계산 (말 이동 후 호출). passedStart: 출발선을 통과했는지.
export function resolveTile(state: GameState, tileIndex: number): TileEvent {
  const tile = BOARD[tileIndex];
  const bet = state.bet;
  const base = state.city.coinBase;

  switch (tile.type) {
    case 'start':
      return {
        kind: 'start', tile, coins: base * 3 * bet, rolls: 2, shields: 0,
        title: '출발!', detail: '보너스 엽전과 윷을 받았습니다', big: true,
      };

    case 'coin': {
      const mult = tile.mult ?? 1;
      const coins = Math.round(base * mult * bet * (0.85 + Math.random() * 0.5));
      return {
        kind: 'coin', tile, coins, rolls: 0, shields: 0,
        title: `엽전 ×${mult}`, detail: `${coins.toLocaleString()} 엽전 획득!`, big: mult >= 4,
      };
    }

    case 'jackpot': {
      const mult = pick([8, 10, 12, 15, 20]);
      const coins = Math.round(base * mult * bet);
      return {
        kind: 'jackpot', tile, coins, rolls: 0, shields: 0,
        title: '💰 대박!', detail: `${coins.toLocaleString()} 엽전 대박 획득!`, big: true,
      };
    }

    case 'tax': {
      const coins = -Math.round(base * 1.5 * bet);
      return {
        kind: 'tax', tile, coins, rolls: 0, shields: 0,
        title: '세금 징수', detail: `${Math.abs(coins).toLocaleString()} 엽전을 납부했습니다`, big: false,
      };
    }

    case 'shield':
      return {
        kind: 'shield', tile, coins: 0, rolls: 0, shields: 1,
        title: '🛡️ 방패 획득', detail: '습격을 막아낼 방패를 얻었습니다', big: false,
      };

    case 'bonus': {
      const rolls = pick([3, 4, 5]);
      return {
        kind: 'bonus', tile, coins: 0, rolls, shields: 0,
        title: '윷 보너스', detail: `윷 ${rolls}개를 받았습니다!`, big: false,
      };
    }

    case 'attack': {
      // 코인마스터식 습격 — 방패 있으면 방어
      if (state.data.shields > 0) {
        return {
          kind: 'attack-blocked', tile, coins: 0, rolls: 0, shields: -1,
          title: '습격 방어!', detail: '방패로 습격을 막아냈습니다', big: false,
        };
      }
      const coins = Math.round(base * 2 * bet);
      return {
        kind: 'attack', tile, coins, rolls: 0, shields: 0,
        title: '⚔️ 습격 성공', detail: `이웃 마을에서 ${coins.toLocaleString()} 엽전 약탈!`, big: true,
      };
    }

    case 'event': {
      // 랜덤 이벤트(룰렛)
      if (Math.random() < 0.5) {
        const coins = Math.round(base * pick([3, 4, 5]) * bet);
        return {
          kind: 'event-coin', tile, coins, rolls: 0, shields: 0,
          title: '🎁 행운 상자', detail: `${coins.toLocaleString()} 엽전이 들어있었습니다!`, big: true,
        };
      } else {
        const rolls = pick([2, 3, 4]);
        return {
          kind: 'event-rolls', tile, coins: 0, rolls, shields: 0,
          title: '🎁 행운 상자', detail: `윷 ${rolls}개를 받았습니다!`, big: false,
        };
      }
    }

    case 'build':
      return {
        kind: 'build-tile', tile, coins: 0, rolls: 0, shields: 0,
        title: '건설 현장', detail: '랜드마크를 건설할 수 있습니다', big: false,
      };
  }
}

// 이벤트를 상태에 적용
export function applyEvent(state: GameState, ev: TileEvent) {
  if (ev.coins) state.addCoins(ev.coins);
  if (ev.rolls) state.addRolls(ev.rolls);
  if (ev.shields > 0) state.addShield(ev.shields);
  if (ev.shields < 0) state.useShield();
}
