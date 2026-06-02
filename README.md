# 윳놀이GO 🎲🪙

> **윷을 던져 한국 방방곡곡을 건설하는 한국형 코인 루터(Coin Looter)**
> 모노폴리GO × 코인마스터 벤치마킹 · 세로형 모바일 최적화 3D 웹앱

[![play](https://img.shields.io/badge/▶-PLAY-ffd23f?style=for-the-badge)](#)

---

## 🎮 게임 소개

윷을 던져(도·개·걸·윷·모·백도) 모노폴리GO식 둘레형 보드를 돌고, 칸마다 **엽전·대박·습격·방패·보너스** 이벤트가 터집니다.
모은 엽전으로 **서울 → 부산 → 경주 → 전주 → 제주** 의 랜드마크를 건설하고, 도시를 완성하면 다음 도시로 진격!

### 핵심 연출 (Hero Moments)
- 🎲 **3D 윷 던지기** — 윷가락 4개가 공중에서 구르고 멍석 위로 떨어지는 물리 연출
- 🪙 **코인 폭발 → 상단 흡수** — 엽전이 사방으로 터진 뒤 상단 카운터로 빨려 들어가는 파티클
- ✨ 블룸(Bloom) 포스트프로세싱으로 살린 스타일리쉬 3D 카툰 그래픽

## 🕹️ 즐기는 법
1. **윷 던지기** 버튼을 눌러 윷을 던집니다.
2. 결과만큼 말이 이동하고, 도착한 칸의 이벤트가 발동합니다.
3. **건설** 버튼(또는 건설 칸)에서 엽전으로 랜드마크를 올립니다.
4. 도시의 모든 랜드마크를 완성하면 다음 도시 잠금 해제!
5. 윷은 시간이 지나면 자동으로 회복됩니다.

## 🛠️ 기술 스택
- **Vite + TypeScript**
- **Three.js** (+ UnrealBloom 포스트프로세싱) — 3D 보드 / 윷 / 랜드마크 / 파티클
- **WebAudio** 합성 효과음 (에셋 파일 0)
- **자체 제작 SVG 스프라이트** UI 에셋
- **LocalStorage** 세이브

## 🚀 개발
```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 미리보기
```

## 📁 구조
```
src/
  game/    # 코어 로직 (config·state·yut·events)
  three/   # 3D (scene·board·yutThrow·coinBurst·landmarks·textures)
  ui/      # HUD·사운드
  main.ts  # 오케스트레이터
public/assets/  # SVG 스프라이트
docs/GAME_DESIGN.md  # 장르 분석 & 기획서
```

자세한 기획/장르 분석은 [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) 참고.

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
