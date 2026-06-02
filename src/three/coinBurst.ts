import * as THREE from 'three';
import { SceneManager } from './scene';
import { makeCoinTexture, makeGlowTexture, makeSparkTexture } from './textures';

interface Coin {
  group: THREE.Group;
  coin: THREE.Sprite;
  glow: THREE.Sprite;
  pos: THREE.Vector2;
  vel: THREE.Vector2;
  state: 'explode' | 'seek' | 'arrive';
  timer: number;
  explodeDur: number;
  size: number;
  spin: number;
  spinV: number;
  delay: number;
  arrived: boolean;
}

export class CoinFX {
  private sm: SceneManager;
  private coinTex: THREE.CanvasTexture;
  private glowTex: THREE.CanvasTexture;
  private sparkTex: THREE.CanvasTexture;
  private coins: Coin[] = [];
  private sparks: { s: THREE.Sprite; t: number; life: number; size: number }[] = [];

  onArrive?: (index: number, total: number) => void;

  constructor(sm: SceneManager) {
    this.sm = sm;
    this.coinTex = makeCoinTexture();
    this.glowTex = makeGlowTexture();
    this.sparkTex = makeSparkTexture();
    sm.addUpdater((dt) => this.update(dt));
  }

  // originPx, targetPx: overlay 좌표(중심 원점)
  burst(originPx: THREE.Vector2, targetPx: THREE.Vector2, count: number, big = false) {
    const total = count;
    for (let i = 0; i < count; i++) {
      const coinMat = new THREE.SpriteMaterial({ map: this.coinTex, transparent: true, depthTest: false, depthWrite: false });
      const glowMat = new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
      const coin = new THREE.Sprite(coinMat);
      const glow = new THREE.Sprite(glowMat);
      const group = new THREE.Group();
      glow.position.z = -1;
      group.add(glow); group.add(coin);

      const size = (big ? 46 : 38) * (0.8 + Math.random() * 0.5);
      coin.scale.set(size, size, 1);
      glow.scale.set(size * 2.2, size * 2.2, 1);
      group.position.set(originPx.x, originPx.y, 0);

      // 폭발 초기 속도 (위쪽으로 분출)
      const ang = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.1;
      const spd = (big ? 760 : 560) * (0.55 + Math.random() * 0.7);
      const vel = new THREE.Vector2(Math.cos(ang) * spd, Math.sin(ang) * spd + 220);

      this.sm.overlayScene.add(group);
      this.coins.push({
        group, coin, glow,
        pos: originPx.clone(),
        vel,
        state: 'explode',
        timer: 0,
        explodeDur: 0.28 + Math.random() * 0.32,
        size,
        spin: Math.random() * Math.PI,
        spinV: (Math.random() - 0.5) * 12,
        delay: i * 0.012,
        arrived: false,
      });
    }
    // target은 update에서 매번 참조하도록 저장
    this.target.copy(targetPx);
    this.pendingTotal = total;
    this.arrivedCount = 0;
  }

  private target = new THREE.Vector2();
  private pendingTotal = 0;
  private arrivedCount = 0;

  setTarget(p: THREE.Vector2) { this.target.copy(p); }

  private update(dt: number) {
    const GRAV = -1500;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.delay > 0) { c.delay -= dt; continue; }
      c.timer += dt;
      c.spin += c.spinV * dt;
      // 동전 회전(가짜 3D 플립) — x스케일을 코사인으로
      const flip = Math.abs(Math.cos(c.spin));
      c.coin.scale.set(c.size * (0.25 + 0.75 * flip), c.size, 1);

      if (c.state === 'explode') {
        c.vel.y += GRAV * dt;
        c.pos.x += c.vel.x * dt;
        c.pos.y += c.vel.y * dt;
        if (c.timer >= c.explodeDur) { c.state = 'seek'; c.timer = 0; }
      } else if (c.state === 'seek') {
        // 타깃으로 가속 호밍
        const to = this.target.clone().sub(c.pos);
        const dist = to.length();
        to.normalize();
        const accel = 5400;
        c.vel.x += to.x * accel * dt;
        c.vel.y += to.y * accel * dt;
        c.vel.multiplyScalar(0.86); // damping
        c.pos.x += c.vel.x * dt;
        c.pos.y += c.vel.y * dt;
        // 접근할수록 작아짐
        const s = Math.max(0.4, Math.min(1, dist / 260));
        c.glow.scale.set(c.size * 2.2 * s, c.size * 2.2 * s, 1);
        if (dist < 34) {
          this.arrive(c, i);
          continue;
        }
      }
      c.group.position.set(c.pos.x, c.pos.y, 0);
    }
    // sparks
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
      const sc = sp.size * (1 + k * 1.8);
      sp.s.scale.set(sc, sc, 1);
      (sp.s.material as THREE.SpriteMaterial).opacity = 1 - k;
      sp.s.material.rotation += dt * 6;
    }
  }

  private arrive(c: Coin, i: number) {
    this.sm.overlayScene.remove(c.group);
    (c.coin.material as THREE.SpriteMaterial).dispose();
    (c.glow.material as THREE.SpriteMaterial).dispose();
    this.coins.splice(i, 1);
    // 도착 스파크
    const m = new THREE.SpriteMaterial({ map: this.sparkTex, transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
    const s = new THREE.Sprite(m);
    s.position.set(this.target.x, this.target.y, 1);
    s.scale.set(30, 30, 1);
    this.sm.overlayScene.add(s);
    this.sparks.push({ s, t: 0, life: 0.35, size: 30 });
    this.arrivedCount++;
    this.onArrive?.(this.arrivedCount, this.pendingTotal);
  }

  get active() { return this.coins.length > 0; }
}
