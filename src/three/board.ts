import * as THREE from 'three';
import { BOARD, BOARD_SIZE, type TileDef, type CityDef } from '../game/config';
import { GameState } from '../game/state';
import { buildLandmark } from './landmarks';
import { tween, Ease } from './anim';
import { SceneManager } from './scene';

const TILE_COLORS: Record<string, number> = {
  start: 0xffc94d, coin: 0xffe08a, subsidy: 0x8ee6a6, build: 0x6fd89a,
  bonus: 0x6fb6ff, tax: 0xff8a6f, jackpot: 0xff7be0, event: 0xc88aff,
};

// 레이아웃: 말판은 원점(하단), 도시는 말판 뒤(화면 상단)
const CITY_Z = -5.7;
const CITY_HALF = 3.0;
export const MAT_R = 2.45; // 중앙 멍석 반지름

function tileLabelTexture(tile: TileDef): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, 128, 128);
  x.font = '60px serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(tile.icon, 64, 52);
  const fs = tile.label.length > 4 ? 17 : 22;
  x.font = `bold ${fs}px sans-serif`;
  x.fillStyle = '#3a2a1a';
  x.fillText(tile.label, 64, 104);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function strawMatTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#d8b878'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(150,110,60,0.5)'; x.lineWidth = 3;
  for (let i = 0; i < 256; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
  x.strokeStyle = 'rgba(120,90,50,0.35)';
  for (let i = 0; i < 256; i += 12) { x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  x.strokeStyle = '#b08a4a'; x.lineWidth = 12; x.strokeRect(8, 8, 240, 240);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

interface LmLabel { el: HTMLDivElement; slot: THREE.Group; topY: number; }

export class BoardView {
  group = new THREE.Group();
  private tiles: THREE.Group[] = [];
  private positions: THREE.Vector3[] = [];
  private token!: THREE.Group;
  private cityGroup = new THREE.Group();
  private landmarkSlots: THREE.Group[] = [];
  private sm: SceneManager;
  private tileTop = 0.36;
  private idleT = 0;

  // DOM 라벨 (시인성)
  private labelHost!: HTMLElement;
  private labels: LmLabel[] = [];
  private tmp = new THREE.Vector3();

  constructor(sm: SceneManager) {
    this.sm = sm;
    this.buildRing();
    this.buildCenterMat();
    this.buildToken();
    this.cityGroup.position.set(0, 0, CITY_Z);
    this.group.add(this.cityGroup);
    sm.scene.add(this.group);
    this.buildLabelHost();
    sm.addUpdater((dt) => this.idle(dt));
  }

  private buildLabelHost() {
    const host = document.getElementById('app') || document.body;
    this.labelHost = document.createElement('div');
    this.labelHost.id = 'lm-labels';
    host.appendChild(this.labelHost);
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
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(w, this.tileTop, w),
        new THREE.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.6 })
      );
      base.position.y = this.tileTop / 2; base.castShadow = true; base.receiveShadow = true;
      g.add(base);
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.86, 0.06, w * 0.86),
        new THREE.MeshStandardMaterial({
          color: TILE_COLORS[tile.type], roughness: 0.5,
          emissive: new THREE.Color(TILE_COLORS[tile.type]).multiplyScalar(0.15),
        })
      );
      pad.position.y = this.tileTop + 0.03; g.add(pad);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.8, w * 0.8),
        new THREE.MeshBasicMaterial({ map: tileLabelTexture(tile), transparent: true })
      );
      label.rotation.x = -Math.PI / 2; label.position.y = this.tileTop + 0.07; g.add(label);

      this.group.add(g);
      this.tiles.push(g);
    }
  }

  // 말판 중앙 멍석 (윷 던지는 공간)
  private buildCenterMat() {
    const mat = new THREE.Mesh(
      new THREE.CircleGeometry(MAT_R, 56),
      new THREE.MeshStandardMaterial({ map: strawMatTexture(), roughness: 0.95 })
    );
    mat.rotation.x = -Math.PI / 2;
    mat.position.y = 0.04;
    mat.receiveShadow = true;
    this.group.add(mat);
  }

  private buildToken() {
    this.token = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xff5b7f, roughness: 0.35, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.42, 20), mat);
    body.position.y = 0.21; body.castShadow = true; this.token.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), mat);
    head.position.y = 0.56; head.castShadow = true; this.token.add(head);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.6 }));
    brim.position.y = 0.68; this.token.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.6 }));
    top.position.y = 0.77; this.token.add(top);
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
    const p = this.positions[i].clone(); p.y = this.tileTop + 0.9;
    return this.group.localToWorld(p);
  }
  tokenWorldTop(): THREE.Vector3 { return this.token.localToWorld(new THREE.Vector3(0, 0.9, 0)); }
  centerWorld(): THREE.Vector3 { return this.group.localToWorld(new THREE.Vector3(0, 1.0, 0)); }

  async moveSteps(from: number, steps: number): Promise<{ to: number; passedStart: boolean }> {
    let cur = from; let passedStart = false;
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
    await tween(120, (p) => {
      const sq = 1 - Math.sin(p * Math.PI) * 0.18;
      this.token.scale.set(1 / sq, sq, 1 / sq);
    });
    this.token.scale.set(1, 1, 1);
  }

  private idle(dt: number) {
    this.idleT += dt;
    // 건물은 고정 (움직이면 바닥에 묻히는 문제) — 라벨 위치만 갱신
    this.updateLabels();
  }

  // DOM 라벨 위치 갱신 (3D → 화면 px)
  private updateLabels() {
    for (const lb of this.labels) {
      lb.slot.getWorldPosition(this.tmp);
      this.tmp.y += lb.topY;
      const p = this.sm.worldToStagePx(this.tmp);
      if (p.visible) {
        lb.el.style.display = '';
        lb.el.style.transform = `translate(-50%,-100%) translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      } else {
        lb.el.style.display = 'none';
      }
    }
  }

  private clearLabels() {
    for (const lb of this.labels) lb.el.remove();
    this.labels = [];
  }

  private makeLabelEl(name: string, lvl: number, max: number): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'lm-label' + (lvl >= max ? ' done' : '');
    el.innerHTML =
      `<span class="lm-n">${name}</span>` +
      `<span class="lm-l">${lvl >= max ? `★ MAX` : `Lv.${lvl} / ${max}`}</span>`;
    this.labelHost.appendChild(el);
    return el;
  }

  // 도시(건물)를 말판 뒤에 한 줄로 배치
  renderCity(state: GameState) {
    while (this.cityGroup.children.length) {
      const c = this.cityGroup.children[0];
      this.cityGroup.remove(c);
      c.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    }
    this.landmarkSlots = [];
    this.clearLabels();

    const city: CityDef = state.city;
    const accent = parseInt(city.accent.replace('#', ''), 16);
    const lms = city.landmarks;
    const n = lms.length;

    // 도시 지대(테라스) — 한 줄 너비
    const wide = 2 * CITY_HALF + 1.8;
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(wide, 0.4, 2.4),
      new THREE.MeshStandardMaterial({ color: parseInt(city.ground.replace('#', ''), 16), roughness: 0.85 })
    );
    plat.position.y = -0.2; plat.receiveShadow = true; this.cityGroup.add(plat);
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(wide + 0.18, 0.1, 2.58),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, emissive: new THREE.Color(accent).multiplyScalar(0.25) })
    );
    rim.position.y = 0.01; this.cityGroup.add(rim);

    lms.forEach((lm, i) => {
      const x = n === 1 ? 0 : -CITY_HALF + (2 * CITY_HALF) * (i / (n - 1));
      const slot = new THREE.Group();
      slot.position.set(x, 0, 0);
      const lvl = state.landmarkLevels[i];
      const model = buildLandmark(lm.kind, lvl, lm.levels, accent);
      model.scale.multiplyScalar(0.7);
      slot.add(model);
      this.cityGroup.add(slot);
      this.landmarkSlots.push(slot);

      const box = new THREE.Box3().setFromObject(model);
      const topY = isFinite(box.max.y) ? box.max.y : 1.2;
      const el = this.makeLabelEl(lm.name, lvl, lm.levels);
      this.labels.push({ el, slot, topY: topY + 0.35 });
    });
    this.updateLabels();
  }

  private refreshLabel(state: GameState, i: number, model: THREE.Object3D) {
    const lb = this.labels[i];
    if (!lb) return;
    const lm = state.city.landmarks[i];
    const lvl = state.landmarkLevels[i];
    const box = new THREE.Box3().setFromObject(model);
    lb.topY = (isFinite(box.max.y) ? box.max.y : 1.2) + 0.35;
    lb.el.className = 'lm-label' + (lvl >= lm.levels ? ' done' : '');
    lb.el.innerHTML =
      `<span class="lm-n">${lm.name}</span>` +
      `<span class="lm-l">${lvl >= lm.levels ? `★ MAX` : `Lv.${lvl} / ${lm.levels}`}</span>`;
  }

  landmarkWorld(i: number): THREE.Vector3 {
    const slot = this.landmarkSlots[i];
    if (!slot) return this.centerWorld();
    return slot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0));
  }

  async upgradeLandmark(state: GameState, i: number) {
    const slot = this.landmarkSlots[i];
    if (!slot) return;
    const lm = state.city.landmarks[i];
    const accent = parseInt(state.city.accent.replace('#', ''), 16);
    while (slot.children.length) {
      const c = slot.children[0]; slot.remove(c);
      c.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    }
    const model = buildLandmark(lm.kind, state.landmarkLevels[i], lm.levels, accent);
    model.scale.multiplyScalar(0.7);
    slot.add(model);
    this.refreshLabel(state, i, model);
    const target = 0.7;
    await tween(520, (p) => {
      const s = (0.2 + p * 1.0) * target;
      model.scale.setScalar(Math.min(s, target * (1 + 0.15 * Math.sin(p * Math.PI))));
    }, Ease.outBack);
    model.scale.setScalar(target);
  }
}
