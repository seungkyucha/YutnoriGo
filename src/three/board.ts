import * as THREE from 'three';
import { BOARD, BOARD_SIZE, type TileDef, type CityDef } from '../game/config';
import { GameState } from '../game/state';
import { buildLandmark } from './landmarks';
import { tween, Ease } from './anim';
import { SceneManager } from './scene';

const TILE_COLORS: Record<string, number> = {
  start: 0xffc94d, coin: 0xffe08a, build: 0x6fd89a, bonus: 0x6fb6ff,
  tax: 0xff8a6f, shield: 0x6fe0e0, jackpot: 0xff7be0, attack: 0xff5b6f, event: 0xc88aff,
};

function tileLabelTexture(tile: TileDef): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, 128, 128);
  x.font = '64px serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(tile.icon, 64, 56);
  x.font = 'bold 22px sans-serif';
  x.fillStyle = '#3a2a1a';
  x.fillText(tile.label, 64, 104);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export class BoardView {
  group = new THREE.Group();
  private tiles: THREE.Group[] = [];
  private positions: THREE.Vector3[] = [];
  private token!: THREE.Group;
  private centerGroup = new THREE.Group();
  private landmarkSlots: THREE.Group[] = [];
  private sm: SceneManager;
  private tileTop = 0.36;
  private idleT = 0;

  constructor(sm: SceneManager) {
    this.sm = sm;
    this.buildRing();
    this.buildToken();
    this.group.add(this.centerGroup);
    sm.scene.add(this.group);
    sm.addUpdater((dt) => this.idle(dt));
  }

  private ringPosition(i: number): THREE.Vector3 {
    const per = 6, half = 3.35, step = (2 * half) / (per - 1);
    let x = 0, z = 0;
    if (i < 5) { x = -half + i * step; z = -half; }
    else if (i < 10) { x = half; z = -half + (i - 5) * step; }
    else if (i < 15) { x = half - (i - 10) * step; z = half; }
    else { x = -half; z = half - (i - 15) * step; }
    return new THREE.Vector3(x, 0, z);
  }

  private buildRing() {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const tile = BOARD[i];
      const p = this.ringPosition(i);
      this.positions.push(p);
      const g = new THREE.Group();
      g.position.copy(p);

      const isCorner = i % 5 === 0;
      const w = isCorner ? 1.25 : 1.05;
      // 타일 본체
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(w, this.tileTop, w),
        new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.6 })
      );
      base.position.y = this.tileTop / 2; base.castShadow = true; base.receiveShadow = true;
      g.add(base);
      // 상단 컬러 패드
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.86, 0.06, w * 0.86),
        new THREE.MeshStandardMaterial({
          color: TILE_COLORS[tile.type], roughness: 0.5,
          emissive: new THREE.Color(TILE_COLORS[tile.type]).multiplyScalar(0.15),
        })
      );
      pad.position.y = this.tileTop + 0.03; g.add(pad);
      // 아이콘 라벨
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.8, w * 0.8),
        new THREE.MeshBasicMaterial({ map: tileLabelTexture(tile), transparent: true })
      );
      label.rotation.x = -Math.PI / 2; label.position.y = this.tileTop + 0.07; g.add(label);

      this.group.add(g);
      this.tiles.push(g);
    }
  }

  private buildToken() {
    this.token = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xff5b7f, roughness: 0.35, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.42, 20), mat);
    body.position.y = 0.21; body.castShadow = true; this.token.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), mat);
    head.position.y = 0.56; head.castShadow = true; this.token.add(head);
    // 갓 (전통 모자)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.6 }));
    brim.position.y = 0.68; this.token.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.6 }));
    top.position.y = 0.77; this.token.add(top);
    // 태극 점
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dot.position.set(0, 0.56, 0.221); this.token.add(dot);

    this.group.add(this.token);
    this.placeTokenAt(0);
  }

  private placeTokenAt(i: number) {
    const p = this.positions[i];
    this.token.position.set(p.x, this.tileTop, p.z);
  }

  snapToken(i: number) { this.placeTokenAt(i); }

  tileWorldPosition(i: number): THREE.Vector3 {
    const p = this.positions[i].clone();
    p.y = this.tileTop + 0.9;
    return this.group.localToWorld(p);
  }

  tokenWorldTop(): THREE.Vector3 {
    return this.token.localToWorld(new THREE.Vector3(0, 0.9, 0));
  }

  centerWorld(): THREE.Vector3 {
    return this.group.localToWorld(new THREE.Vector3(0, 1.2, 0));
  }

  // 말 이동 — 한 칸씩 깡총. steps>0 전진, <0 후진(백도). passedStart 반환.
  async moveSteps(from: number, steps: number): Promise<{ to: number; passedStart: boolean }> {
    let cur = from;
    let passedStart = false;
    const dir = steps >= 0 ? 1 : -1;
    const n = Math.abs(steps);
    for (let s = 0; s < n; s++) {
      const next = (cur + dir + BOARD_SIZE) % BOARD_SIZE;
      if (dir > 0 && next === 0) passedStart = true;
      await this.hop(cur, next);
      cur = next;
    }
    return { to: cur, passedStart };
  }

  private async hop(from: number, to: number) {
    const a = this.positions[from], b = this.positions[to];
    const hopH = 0.85;
    await tween(280, (p) => {
      const x = a.x + (b.x - a.x) * p;
      const z = a.z + (b.z - a.z) * p;
      const y = this.tileTop + Math.sin(p * Math.PI) * hopH;
      this.token.position.set(x, y, z);
      this.token.rotation.z = Math.sin(p * Math.PI) * 0.3 * (b.x - a.x >= 0 ? -1 : 1);
    }, Ease.inOutCubic);
    this.token.rotation.z = 0;
    // 착지 스쿼시
    await tween(120, (p) => {
      const sq = 1 - Math.sin(p * Math.PI) * 0.18;
      this.token.scale.set(1 / sq, sq, 1 / sq);
    });
    this.token.scale.set(1, 1, 1);
  }

  private idle(dt: number) {
    this.idleT += dt;
    // 랜드마크 살짝 둥실
    this.landmarkSlots.forEach((s, i) => {
      s.position.y = 0.02 + Math.sin(this.idleT * 1.5 + i) * 0.03;
      s.rotation.y += dt * 0.15;
    });
  }

  // 중앙에 현재 도시 랜드마크 배치/갱신
  renderCity(state: GameState) {
    // 기존 제거
    while (this.centerGroup.children.length) {
      const c = this.centerGroup.children[0];
      this.centerGroup.remove(c);
      c.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); } });
    }
    this.landmarkSlots = [];

    const city: CityDef = state.city;
    const accent = parseInt(city.accent.replace('#', ''), 16);

    // 도시 바닥 플랫폼
    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.7, 0.2, 48),
      new THREE.MeshStandardMaterial({ color: parseInt(city.ground.replace('#', ''), 16), roughness: 0.85 })
    );
    plat.position.y = -0.1; plat.receiveShadow = true; this.centerGroup.add(plat);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.62, 0.06, 8, 64),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, emissive: new THREE.Color(accent).multiplyScalar(0.2) })
    );
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02; this.centerGroup.add(rim);

    // 랜드마크 원형 배치
    const lms = city.landmarks;
    const radius = lms.length <= 1 ? 0 : 1.5;
    lms.forEach((lm, i) => {
      const ang = (i / lms.length) * Math.PI * 2 - Math.PI / 2;
      const slot = new THREE.Group();
      const x = Math.cos(ang) * radius, z = Math.sin(ang) * radius;
      slot.position.set(x, 0, z);
      const lvl = state.landmarkLevels[i];
      const model = buildLandmark(lm.kind, lvl, lm.levels, accent);
      model.scale.multiplyScalar(0.72);
      slot.add(model);
      this.centerGroup.add(slot);
      this.landmarkSlots.push(slot);
    });
  }

  // 특정 랜드마크의 월드 좌표 (건설 이펙트 타깃)
  landmarkWorld(i: number): THREE.Vector3 {
    const slot = this.landmarkSlots[i];
    if (!slot) return this.centerWorld();
    return this.group.localToWorld(slot.position.clone().setY(1));
  }

  // 건설 연출: 해당 랜드마크 모델 교체 + 팝
  async upgradeLandmark(state: GameState, i: number) {
    const slot = this.landmarkSlots[i];
    if (!slot) return;
    const lm = state.city.landmarks[i];
    const accent = parseInt(state.city.accent.replace('#', ''), 16);
    // 기존 제거
    while (slot.children.length) {
      const c = slot.children[0]; slot.remove(c);
      c.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    }
    const model = buildLandmark(lm.kind, state.landmarkLevels[i], lm.levels, accent);
    model.scale.multiplyScalar(0.72);
    slot.add(model);
    // 팝 연출
    const target = 0.72;
    await tween(520, (p) => {
      const s = (0.2 + p * 1.0) * target;
      model.scale.setScalar(Math.min(s, target * (1 + 0.15 * Math.sin(p * Math.PI))));
    }, Ease.outBack);
    model.scale.setScalar(target);
  }
}
