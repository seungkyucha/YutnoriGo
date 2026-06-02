import { BOARD, type TileDef } from './config';
import { GameState } from './state';

export type EventKind =
  | 'coin' | 'subsidy' | 'jackpot' | 'tax' | 'bonus'
  | 'event-rolls' | 'start' | 'build-tile' | 'roulette';

export interface TileEvent {
  kind: EventKind;
  tile: TileDef;
  coins: number; // 코인 변화량(+/-)
  rolls: number; // 윷 변화량
  title: string;
  detail: string;
  big: boolean; // 대형 연출 여부 (코인 폭발 강도)
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// 한 칸 도착 시 이벤트 계산 (말 이동 후 호출). event 칸은 main에서 룰렛으로 별도 처리.
export function resolveTile(state: GameState, tileIndex: number): TileEvent {
  const tile = BOARD[tileIndex];
  const bet = state.bet;
  const base = state.city.coinBase;

  switch (tile.type) {
    case 'start':
      return {
        kind: 'start', tile, coins: base * 3 * bet, rolls: 2,
        title: '출발!', detail: '보너스 엽전과 윷을 받았습니다', big: true,
      };

    case 'coin': {
      const mult = tile.mult ?? 1;
      const coins = Math.round(base * mult * bet * (0.85 + Math.random() * 0.5));
      return {
        kind: 'coin', tile, coins, rolls: 0,
        title: `엽전 ×${mult}`, detail: `${coins.toLocaleString()} 엽전 획득!`, big: mult >= 4,
      };
    }

    case 'subsidy': {
      const mult = tile.mult ?? 2;
      const coins = Math.round(base * mult * bet);
      return {
        kind: 'subsidy', tile, coins, rolls: 0,
        title: `${tile.label} 🎉`, detail: `엽전 ${mult}배! ${coins.toLocaleString()} 지급`, big: mult >= 5,
      };
    }

    case 'jackpot': {
      const mult = pick([8, 10, 12, 15, 20]);
      const coins = Math.round(base * mult * bet);
      return {
        kind: 'jackpot', tile, coins, rolls: 0,
        title: '💰 대박!', detail: `${coins.toLocaleString()} 엽전 대박 획득!`, big: true,
      };
    }

    case 'tax': {
      const coins = -Math.round(base * 1.5 * bet);
      return {
        kind: 'tax', tile, coins, rolls: 0,
        title: '세금 징수', detail: `${Math.abs(coins).toLocaleString()} 엽전을 납부했습니다`, big: false,
      };
    }

    case 'bonus': {
      const rolls = pick([3, 4, 5]);
      return {
        kind: 'bonus', tile, coins: 0, rolls,
        title: '윷 보너스', detail: `윷 ${rolls}개를 받았습니다!`, big: false,
      };
    }

    case 'build':
      return {
        kind: 'build-tile', tile, coins: 0, rolls: 0,
        title: '건설 현장', detail: '랜드마크를 무료로 건설합니다', big: false,
      };

    case 'event':
      // 실제 처리는 main의 룰렛에서. (안전용 기본값)
      return { kind: 'roulette', tile, coins: 0, rolls: 0, title: '🎰 이벤트', detail: '룰렛!', big: true };
  }
}

// 이벤트를 상태에 적용
export function applyEvent(state: GameState, ev: TileEvent) {
  if (ev.coins) state.addCoins(ev.coins);
  if (ev.rolls) state.addRolls(ev.rolls);
}
