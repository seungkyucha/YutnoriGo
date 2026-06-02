// ===== 윳놀이GO 게임 데이터 =====

export type YutKey = 'baekdo' | 'do' | 'gae' | 'geol' | 'yut' | 'mo';

export interface YutResult {
  key: YutKey;
  name: string;
  steps: number; // 이동 칸 수 (백도 = -1)
  bonus: boolean; // 한 번 더 굴리기
  flats: number; // 평평한(뒤집힌) 윷가락 수 — 3D 연출용
}

// 윷가락 배(둥근면)=0, 평(평평면)=1 로 본다. 평의 개수로 결과 결정.
// 도=평1, 개=평2, 걸=평3, 윷=평4, 모=평0. 백도는 도 중 특수 윷가락이 평일 때.
export const YUT_TABLE: Record<YutKey, YutResult> = {
  baekdo: { key: 'baekdo', name: '백도', steps: -1, bonus: false, flats: 1 },
  do: { key: 'do', name: '도', steps: 1, bonus: false, flats: 1 },
  gae: { key: 'gae', name: '개', steps: 2, bonus: false, flats: 2 },
  geol: { key: 'geol', name: '걸', steps: 3, bonus: false, flats: 3 },
  yut: { key: 'yut', name: '윷', steps: 4, bonus: true, flats: 4 },
  mo: { key: 'mo', name: '모', steps: 5, bonus: true, flats: 0 },
};

export type TileType =
  | 'start'
  | 'coin'
  | 'subsidy' // 지원금(특별 배수 코인)
  | 'build'
  | 'bonus'
  | 'tax'
  | 'jackpot'
  | 'event'; // 룰렛 이벤트

export interface TileDef {
  type: TileType;
  mult?: number; // 코인/지원금 칸 배수
  label: string;
  icon: string; // 이모지/심볼 (3D 보드 라벨)
}

// 둘레형 20칸 보드 (모노폴리GO 구조)
export const BOARD: TileDef[] = [
  { type: 'start', label: '출발', icon: '🚩' },
  { type: 'coin', mult: 2, label: '엽전 ×2', icon: '🪙' },
  { type: 'subsidy', mult: 2, label: '연말정산', icon: '🧾' },
  { type: 'build', label: '건설', icon: '🏗️' },
  { type: 'bonus', label: '윷 보너스', icon: '🎲' },
  { type: 'coin', mult: 3, label: '엽전 ×3', icon: '🪙' },
  { type: 'subsidy', mult: 3, label: '상생지원금', icon: '🤝' },
  { type: 'event', label: '이벤트', icon: '🎰' },
  { type: 'build', label: '건설', icon: '🏗️' },
  { type: 'coin', mult: 4, label: '엽전 ×4', icon: '🪙' },
  { type: 'subsidy', mult: 5, label: '고유가지원금', icon: '⛽' },
  { type: 'jackpot', label: '대박', icon: '💰' },
  { type: 'event', label: '이벤트', icon: '🎰' },
  { type: 'build', label: '건설', icon: '🏗️' },
  { type: 'coin', mult: 3, label: '엽전 ×3', icon: '🪙' },
  { type: 'tax', label: '세금', icon: '💸' },
  { type: 'event', label: '이벤트', icon: '🎰' },
  { type: 'coin', mult: 6, label: '엽전 ×6', icon: '🪙' },
  { type: 'build', label: '건설', icon: '🏗️' },
  { type: 'event', label: '이벤트', icon: '🎰' },
];

// 룰렛 상품 (이벤트 칸) — 모두 엽전 10배
export const ROULETTE_PRIZES = [
  { name: '하이닉스 500만원 달성', emoji: '💾', short: '하이닉스', color: '#2aa9e0' },
  { name: '삼성전자 100만원 달성', emoji: '📱', short: '삼성전자', color: '#1f4fd6' },
  { name: '코스피 10000 달성', emoji: '📈', short: '코스피', color: '#ff5b7f' },
];
export const ROULETTE_MULT = 10;

export const BOARD_SIZE = BOARD.length;

export type LandmarkKind =
  | 'palace' | 'gate' | 'tower' | 'river' | 'market'
  | 'bridge' | 'beach' | 'village' | 'observatory' | 'temple'
  | 'pond' | 'cathedral' | 'hanok' | 'peak' | 'statue' | 'rock';

export interface LandmarkDef {
  name: string;
  kind: LandmarkKind;
  levels: number; // 업그레이드 단계 수
  baseCost: number; // 1단계 건설비
}

export interface CityDef {
  name: string;
  subtitle: string;
  // 도시 테마 컬러 (3D 배경/타일)
  sky: [string, string];
  ground: string;
  accent: string;
  coinBase: number; // 코인 칸 기본 획득량
  landmarks: LandmarkDef[];
}

export const CITIES: CityDef[] = [
  {
    name: '서울',
    subtitle: '대한민국의 심장',
    sky: ['#3a2a7a', '#7b5cd6'],
    ground: '#2c8c5a',
    accent: '#ff5b7f',
    coinBase: 9000,
    landmarks: [
      { name: '광화문', kind: 'gate', levels: 4, baseCost: 6000 },
      { name: '경복궁', kind: 'palace', levels: 5, baseCost: 12000 },
      { name: 'N서울타워', kind: 'tower', levels: 4, baseCost: 20000 },
      { name: '한강', kind: 'river', levels: 3, baseCost: 9000 },
      { name: '동대문', kind: 'gate', levels: 4, baseCost: 15000 },
    ],
  },
  {
    name: '부산',
    subtitle: '바다의 도시',
    sky: ['#0e4d8c', '#22a0d8'],
    ground: '#1f9b8e',
    accent: '#ffd23f',
    coinBase: 16000,
    landmarks: [
      { name: '광안대교', kind: 'bridge', levels: 4, baseCost: 28000 },
      { name: '해운대', kind: 'beach', levels: 3, baseCost: 22000 },
      { name: '감천문화마을', kind: 'village', levels: 5, baseCost: 30000 },
      { name: '자갈치시장', kind: 'market', levels: 4, baseCost: 25000 },
    ],
  },
  {
    name: '경주',
    subtitle: '천년의 고도',
    sky: ['#7a3b1f', '#e0913f'],
    ground: '#7aa83c',
    accent: '#ffb347',
    coinBase: 28000,
    landmarks: [
      { name: '첨성대', kind: 'observatory', levels: 4, baseCost: 42000 },
      { name: '불국사', kind: 'temple', levels: 5, baseCost: 55000 },
      { name: '석굴암', kind: 'temple', levels: 4, baseCost: 48000 },
      { name: '안압지', kind: 'pond', levels: 3, baseCost: 38000 },
    ],
  },
  {
    name: '전주',
    subtitle: '맛과 멋의 고장',
    sky: ['#5a2a6a', '#b85cc0'],
    ground: '#3c9c5c',
    accent: '#ff8fb3',
    coinBase: 45000,
    landmarks: [
      { name: '한옥마을', kind: 'hanok', levels: 5, baseCost: 70000 },
      { name: '전동성당', kind: 'cathedral', levels: 4, baseCost: 62000 },
      { name: '경기전', kind: 'palace', levels: 4, baseCost: 66000 },
    ],
  },
  {
    name: '제주',
    subtitle: '신비의 섬',
    sky: ['#0e6e8c', '#3fc8d8'],
    ground: '#2fae6e',
    accent: '#ffd23f',
    coinBase: 70000,
    landmarks: [
      { name: '성산일출봉', kind: 'peak', levels: 5, baseCost: 95000 },
      { name: '한라산', kind: 'peak', levels: 5, baseCost: 120000 },
      { name: '돌하르방', kind: 'statue', levels: 3, baseCost: 80000 },
      { name: '주상절리', kind: 'rock', levels: 4, baseCost: 100000 },
    ],
  },
];

// 단계별 비용: baseCost * COST_GROWTH^level
export const COST_GROWTH = 1.85;
export function landmarkCost(def: LandmarkDef, level: number): number {
  return Math.round((def.baseCost * Math.pow(COST_GROWTH, level)) / 100) * 100;
}

export const START_BONUS = 1; // 출발 통과 시 윷 보너스
export const ROLL_REGEN_MS = 25_000; // 윷 1개 회복 시간
export const ROLL_CAP = 60;
export const SHIELD_CAP = 3;
export const BET_LEVELS = [1, 2, 5, 10];

export interface SaveData {
  coins: number;
  rolls: number;
  shields: number;
  betIndex: number;
  pos: number; // 보드 위치
  cityIndex: number;
  // cityIndex 별 랜드마크 레벨 배열
  progress: number[][];
  lastRegen: number;
  totalRolls: number;
}
