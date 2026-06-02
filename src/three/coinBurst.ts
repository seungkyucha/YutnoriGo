import * as THREE from 'three';
import { SceneManager } from './scene';
import { makeCoinTexture, makeGlowTexture, makeSparkTexture } from './textures';

interface Coin {
  group: THREE.Group;
  coin: THREE.Sprite;
  glow: THREE.Sprite;
  pos: THREE.Vector2;
  prev: THREE.Vector2;
  vel: THREE.Vector2;
  state: 'explode' | 'seek';
  timer: number;
  seekT: number;
  explodeDur: number;
  size: number;
  spin: number;
  spinV: number;
  delay: number;
}

interface Spark {
  s: THREE.Sprite;
  t: number;
  life: number;
  size: number;
  grow: number;
  spin: number;
}

export class CoinFX {
  private sm: SceneManager;
  private coinTex: THREE.CanvasTexture;
  private glowTex: THREE.CanvasTexture;
  private sparkTex: THREE.CanvasTexture;
  private coins: Coin[] = [];
  private sparks: Spark[] = [];

  onArrive?: (index: number, total: number) => void;

  private target = new THREE.Vector2();
  private pendingTotal = 0;
  private arrivedCount = 0;

  constructor(sm: SceneManager) {
    this.sm = sm;
    this.coinTex = makeCoinTexture();
    this.glowTex = makeGlowTexture();
    this.sparkTex = makeSparkTexture();
    sm.addUpdater((dt) => this.update(dt));
  }

  setTarget(p: THREE.Vector2) { this.target.copy(p); }

  private spawnSpark(pos: THREE.Vector2, size: number, life: number, grow: number, tex: THREE.Texture, color = 0xffffff) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, color });
    const s = new THREE.Sprite(m);
    s.position.set(pos.x, pos.y, 2);
    s.scale.set(size, size, 1);
    this.sm.overlayScene.add(s);
    this.sparks.push({ s, t: 0, life, size, grow, spin: (Math.random() - 0.5) * 8 });
  }

  // originPx, targetPx: overlay 좌표(중심 원점)
  burst(originPx: THREE.Vector2, targetPx: THREE.Vector2, count: number, big = false) {
    this.target.copy(targetPx);
    this.pendingTotal += count;

    // 터지는 순간 — 강한 플래시 팝 (도파민 임팩트)
    this.spawnSpark(originPx, big ? 240 : 160, 0.22, 2.4, this.glowTex, 0xffe9a0);
    this.spawnSpark(originPx, big ? 150 : 100, 0.32, 3.0, this.sparkTex, 0xffffff);
    if (big) this.spawnSpark(originPx, 90, 0.4, 4.0, this.sparkTex, 0xfff2c0);

    for (let i = 0; i < count; i++) {
      const coinMat = new THREE.SpriteMaterial({ map: this.coinTex, transparent: true, depthTest: false, depthWrite: false });
      const glowMat = new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 });
      const coin = new THREE.Sprite(coinMat);
      const glow = new THREE.Sprite(glowMat);
      const group = new THREE.Group();
      glow.position.z = -1;
      group.add(glow); group.add(coin);

      const size = (big ? 48 : 40) * (0.78 + Math.random() * 0.5);
      coin.scale.set(size, size, 1);
      glow.scale.set(size * 2.0, size * 2.0, 1);
      group.position.set(originPx.x, originPx.y, 0);

      // 폭발: 360° 전방향으로 강하게 터짐
      const ang = Math.random() * Math.PI * 2;
      const spd = (big ? 1500 : 1150) * (0.45 + Math.random() * 0.75);
      const vel = new THREE.Vector2(Math.cos(ang) * spd, Math.sin(ang) * spd + 120);

      this.sm.overlayScene.add(group);
      this.coins.push({
        group, coin, glow,
        pos: originPx.clone(),
        prev: originPx.clone(),
        vel,
        state: 'explode',
        timer: 0,
        seekT: 0,
        explodeDur: 0.06 + Math.random() * 0.10,
        size,
        spin: Math.random() * Math.PI,
        spinV: (Math.random() - 0.5) * 24,
        delay: i * 0.011,
      });
    }
  }

  private update(dt: number) {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.delay > 0) { c.delay -= dt; continue; }
      c.timer += dt;
      c.prev.copy(c.pos);

      // 동전 플립 회전 (가짜 3D)
      c.spin += c.spinV * dt;
      const flip = Math.abs(Math.cos(c.spin));

      if (c.state === 'explode') {
        c.vel.multiplyScalar(0.9);     // 빠르게 감속하며 정점
        c.pos.x += c.vel.x * dt;
        c.pos.y += c.vel.y * dt;
        if (c.timer >= c.explodeDur) { c.state = 'seek'; c.seekT = 0; }
      } else {
        // 자석 흡입 — 시간이 갈수록 급가속 (쫀득하게 쫙 빨려들어감)
        c.seekT += dt;
        const pull = Math.min(1, c.seekT / 0.26);
        const k = 0.16 + pull * pull * 0.78;
        const kEff = 1 - Math.pow(1 - k, dt * 60);
        c.pos.x += (this.target.x - c.pos.x) * kEff;
        c.pos.y += (this.target.y - c.pos.y) * kEff;
        const dist = Math.hypot(this.target.x - c.pos.x, this.target.y - c.pos.y);
        if (dist < 30) { this.arrive(c, i); continue; }
      }

      // 이동 스트릭(잔상) — 속도 방향으로 글로우 늘이기
      const mvx = c.pos.x - c.prev.x, mvy = c.pos.y - c.prev.y;
      const moved = Math.hypot(mvx, mvy);
      const streak = Math.min(c.size * 4.0, c.size * 1.8 + moved * 1.4);
      const ang = Math.atan2(mvy, mvx);
      c.glow.material.rotation = ang;
      c.glow.scale.set(streak, c.size * 1.4, 1);
      (c.glow.material as THREE.SpriteMaterial).opacity = 0.5 + Math.min(0.45, moved / 60);

      c.coin.material.rotation = 0;
      c.coin.scale.set(c.size * (0.28 + 0.72 * flip), c.size, 1);
      c.group.position.set(c.pos.x, c.pos.y, 0);
    }

    // sparks / flashes
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.t += dt;
      const k = sp.t / sp.life;
      if (k >= 1) {
        this.sm.overlayScene.remove(sp.s);
        sp.s.material.dispose();
        this.sparks.splice(i, 1);
        continue;
      }
      const e = 1 - Math.pow(1 - k, 2);
      const sc = sp.size * (1 + e * sp.grow);
      sp.s.scale.set(sc, sc, 1);
      (sp.s.material as THREE.SpriteMaterial).opacity = Math.pow(1 - k, 1.4);
      sp.s.material.rotation += sp.spin * dt;
    }
  }

  private arrive(c: Coin, i: number) {
    this.sm.overlayScene.remove(c.group);
    (c.coin.material as THREE.SpriteMaterial).dispose();
    (c.glow.material as THREE.SpriteMaterial).dispose();
    this.coins.splice(i, 1);
    // 카운터에 꽂히는 임팩트
    this.spawnSpark(this.target, 40, 0.3, 1.6, this.sparkTex, 0xfff0b0);
    this.spawnSpark(this.target, 26, 0.22, 1.2, this.glowTex, 0xffd23f);
    this.arrivedCount++;
    this.onArrive?.(this.arrivedCount, this.pendingTotal);
    if (this.coins.length === 0) { this.pendingTotal = 0; this.arrivedCount = 0; }
  }

  get active() { return this.coins.length > 0; }
}
