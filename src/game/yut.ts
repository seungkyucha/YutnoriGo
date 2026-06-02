import { YUT_TABLE, type YutResult } from './config';

// 윷가락 4개를 던진다. 각 윷가락은 평(1)/배(0).
// 전통 윷: 평이 나올 확률이 배보다 약간 높음(평평한 면이 무거워 잘 뒤집힘) — 여기선 균형감 위해 평 0.55.
const FLAT_P = 0.6;

export interface ThrowOutcome {
  sticks: boolean[]; // true = 평(앞면)
  result: YutResult;
  isBackdo: boolean;
}

export function throwYut(): ThrowOutcome {
  const sticks: boolean[] = [];
  for (let i = 0; i < 4; i++) sticks.push(Math.random() < FLAT_P);
  const flats = sticks.filter(Boolean).length;

  let key: keyof typeof YUT_TABLE;
  switch (flats) {
    case 0: key = 'mo'; break;
    case 1: key = 'do'; break;
    case 2: key = 'gae'; break;
    case 3: key = 'geol'; break;
    default: key = 'yut'; break;
  }

  // 백도: 도(평1)일 때 특수 윷가락(index 0)이 평이면 일정 확률로 백도
  let isBackdo = false;
  if (key === 'do' && sticks[0] && Math.random() < 0.5) {
    key = 'baekdo';
    isBackdo = true;
  }

  return { sticks, result: YUT_TABLE[key], isBackdo };
}
