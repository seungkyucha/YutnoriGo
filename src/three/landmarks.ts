import * as THREE from 'three';
import type { LandmarkKind } from '../game/config';

// ===== 재질 헬퍼 =====
const M = (color: number, rough = 0.7, metal = 0, emissive = 0) =>
  new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal,
    emissive: new THREE.Color(emissive), emissiveIntensity: emissive ? 0.8 : 0,
  });

const COL = {
  stone: 0xcfc6b0, stoneDark: 0x9a8f78, wood: 0xb5703a, woodDark: 0x7d4a22,
  roof: 0x3c4a63, roofTrim: 0x1f6fb0, dancheong: 0x2a8fc0, red: 0xc94b4b,
  green: 0x4caf6e, water: 0x2aa9e0, white: 0xf3efe3, gold: 0xffc94d,
  sand: 0xf0d9a0, brick: 0xb5573f, dark: 0x33405a,
};

function box(w: number, h: number, d: number, mat: THREE.Material, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = y + h / 2; m.castShadow = true; m.receiveShadow = true; return m;
}
function cyl(rt: number, rb: number, h: number, mat: THREE.Material, seg = 16, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.y = y + h / 2; m.castShadow = true; m.receiveShadow = true; return m;
}
function cone(r: number, h: number, mat: THREE.Material, seg = 16, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
  m.position.y = y + h / 2; m.castShadow = true; m.receiveShadow = true; return m;
}

// 한옥 기와지붕 (살짝 들린 처마) — 시그니처 요소
function hanokRoof(w: number, d: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const mat = M(COL.roof, 0.55);
  // 본체: 위가 좁은 사다리꼴(피라미드형) 지붕
  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) { pos.setX(i, pos.getX(i) * 0.32); pos.setZ(i, pos.getZ(i) * 0.55); }
  }
  geo.computeVertexNormals();
  const roof = new THREE.Mesh(geo, mat);
  roof.position.y = h / 2; roof.castShadow = true; roof.receiveShadow = true;
  g.add(roof);
  // 처마 끝 단청 띠
  const trim = box(w * 1.06, h * 0.16, d * 1.06, M(COL.roofTrim, 0.5), -h * 0.02);
  trim.position.y = h * 0.06;
  g.add(trim);
  // 용마루
  const ridge = box(w * 0.34, h * 0.12, d * 0.04, M(COL.stoneDark, 0.6), h * 0.9);
  g.add(ridge);
  return g;
}

function flag(color: number): THREE.Group {
  const g = new THREE.Group();
  g.add(cyl(0.02, 0.02, 0.7, M(0xeeeeee, 0.4), 6));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), M(color, 0.5, 0, color));
  f.position.set(0.16, 0.6, 0); f.material.side = THREE.DoubleSide;
  g.add(f);
  return g;
}

// 건설 중 스캐폴드 (레벨 0)
function scaffold(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(1.4, 0.12, 1.4, M(COL.stoneDark, 0.9)));
  const pm = M(0xc98a3a, 0.8);
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [0.55, 0.55], [-0.55, 0.55]]) {
    const p = cyl(0.05, 0.05, 0.9, pm, 6); p.position.set(x, 0.45, z); g.add(p);
  }
  const bar = box(1.2, 0.06, 0.06, pm, 0.8); g.add(bar);
  // 가림막
  const tarp = box(1.0, 0.5, 0.02, M(0x2a8fc0, 0.8), 0.2);
  tarp.position.z = 0.55; g.add(tarp);
  return g;
}

// kind별 빌더: level(현재) / max / accent색
type Builder = (g: THREE.Group, lv: number, max: number, accent: number) => void;

const builders: Record<LandmarkKind, Builder> = {
  gate: (g, lv) => {
    g.add(box(1.5, 0.3, 1.0, M(COL.stone))); // 석축 기단
    const arch = box(0.35, 0.6, 1.02, M(0x2a2a30, 0.9), 0.3);
    g.add(arch);
    g.add(box(1.5, 0.4, 1.0, M(COL.stone, 0.7), 0.3));
    const r = hanokRoof(1.7, 1.2, 0.5); r.position.y = 0.7; g.add(r);
    if (lv >= 3) { const r2 = hanokRoof(1.3, 0.9, 0.38); r2.position.y = 1.15; g.add(r2); }
  },
  palace: (g, lv) => {
    g.add(box(1.7, 0.28, 1.3, M(COL.stone))); // 월대
    g.add(box(1.45, 0.5, 1.05, M(COL.red, 0.6), 0.28)); // 기둥부
    for (let i = -2; i <= 2; i++) { const c = cyl(0.06, 0.06, 0.5, M(COL.woodDark), 8); c.position.set(i * 0.32, 0.53, 0.5); g.add(c); }
    const r = hanokRoof(1.9, 1.4, 0.55); r.position.y = 0.78; g.add(r);
    if (lv >= 3) { const r2 = hanokRoof(1.5, 1.1, 0.42); r2.position.y = 1.25; g.add(r2); }
    if (lv >= 5) { const f = flag(COL.gold); f.position.y = 1.6; g.add(f); }
  },
  tower: (g, lv, max) => {
    g.add(cyl(0.5, 0.7, 0.3, M(COL.green))); // 남산
    const h = 1.6 + lv * 0.18;
    g.add(cyl(0.12, 0.22, h, M(0xd8dce6, 0.4, 0.3), 12, 0.3)); // 타워 샤프트
    const deck = cyl(0.4, 0.4, 0.28, M(0xeef2f8, 0.3, 0.2), 16, 0.3 + h - 0.1);
    g.add(deck);
    g.add(cyl(0.05, 0.05, 0.6, M(0xff5b7f, 0.3, 0, 0xff3b6f), 8, 0.3 + h + 0.18));
    if (lv >= max) { const tip = cone(0.12, 0.2, M(COL.gold, 0.3, 0.5, 0xffaa00), 10, 0.3 + h + 0.78); g.add(tip); }
  },
  river: (g, lv) => {
    const w = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), M(COL.water, 0.2, 0.3, 0x10405a));
    w.rotation.x = -Math.PI / 2; w.position.y = 0.02; g.add(w);
    // 다리
    g.add(box(2.0, 0.1, 0.22, M(COL.stone, 0.6), 0.45));
    for (const x of [-0.7, 0, 0.7]) { const p = box(0.12, 0.45, 0.12, M(COL.stoneDark), 0); p.position.x = x; g.add(p); }
    if (lv >= 2) { for (let i = -1; i <= 1; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 16, Math.PI), M(0xff5b7f, 0.4, 0, 0xff3b6f)); a.position.set(i * 0.7, 0.5, 0); g.add(a); } }
  },
  market: (g, lv) => {
    g.add(box(1.5, 0.1, 1.5, M(COL.stoneDark)));
    const colors = [0xe85d5d, 0x4caf6e, 0x4d9be0, 0xffc94d, 0xb05de8];
    const n = Math.min(2 + lv, 6);
    for (let i = 0; i < n; i++) {
      const x = (i % 3 - 1) * 0.5, z = (i < 3 ? -0.4 : 0.4);
      g.add(box(0.42, 0.3, 0.42, M(0xe8e0cc, 0.8), 0.1).translateX(x).translateZ(z));
      const tent = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.22, 4), M(colors[i % colors.length], 0.6));
      tent.position.set(x, 0.52, z); tent.rotation.y = Math.PI / 4; tent.castShadow = true; g.add(tent);
    }
  },
  bridge: (g, lv) => {
    g.add(box(2.2, 0.08, 0.3, M(COL.stone, 0.5), 0.55)); // 상판
    for (const x of [-0.7, 0.7]) {
      g.add(box(0.14, 1.0, 0.34, M(COL.white, 0.5)).translateX(x));
    }
    // 케이블
    const cm = M(0xffd23f, 0.3, 0.6, 0x886600);
    for (const dir of [-1, 1]) {
      const cable = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.018, 6, 24, Math.PI), cm);
      cable.position.set(0, 0.6, dir * 0.16); g.add(cable);
    }
    if (lv >= 3) for (let i = -3; i <= 3; i++) { const L = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), M(0xfff2a0, 0.2, 0, 0xffd23f)); L.position.set(i * 0.3, 0.62, 0); g.add(L); }
  },
  beach: (g, lv) => {
    const s = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32, 0, Math.PI), M(COL.sand, 0.9));
    s.rotation.x = -Math.PI / 2; s.position.set(0, 0.02, 0.2); g.add(s);
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32, Math.PI, Math.PI), M(COL.water, 0.2, 0.3, 0x10506a));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.03, 0.2); g.add(sea);
    const n = Math.min(1 + lv, 4);
    for (let i = 0; i < n; i++) {
      const x = (i - n / 2) * 0.5;
      g.add(cyl(0.01, 0.01, 0.4, M(COL.woodDark), 6).translateX(x).translateZ(0.5));
      const u = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.16, 12), M([0xe85d5d, 0x4d9be0, 0xffc94d, 0x4caf6e][i % 4], 0.6));
      u.position.set(x, 0.46, 0.5); g.add(u);
    }
  },
  village: (g, lv) => {
    const colors = [0x6db5e0, 0xe8a05d, 0x7bd88f, 0xe85d8a, 0xf0d060, 0xb08ce8];
    const n = Math.min(3 + lv * 2, 11);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 4), col = i % 4;
      const x = (col - 1.5) * 0.34, z = (row - 1) * 0.34, y = row * 0.12;
      const h = box(0.3, 0.3 + Math.random() * 0.1, 0.3, M(colors[i % colors.length], 0.75), y);
      h.position.x = x; h.position.z = z; g.add(h);
    }
  },
  observatory: (g, lv) => {
    // 첨성대: 병 모양 (아래 넓고 위 좁은 곡선) — 원통 적층
    g.add(box(0.9, 0.12, 0.9, M(COL.stone)));
    const N = 9;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const r = 0.42 - 0.18 * Math.sin(t * Math.PI * 0.5) - t * 0.05;
      g.add(cyl(r, r + 0.02, 0.16, M(i === Math.floor(N / 2) ? COL.stoneDark : COL.stone, 0.85), 16, 0.12 + i * 0.16));
    }
    g.add(box(0.42, 0.04, 0.42, M(COL.stoneDark), 0.12 + N * 0.16));
    if (lv >= 4) g.add(box(0.16, 0.16, 0.16, M(COL.dark, 0.7), 0.12 + N * 0.16 + 0.04));
  },
  temple: (g, lv) => {
    g.add(box(1.6, 0.3, 1.2, M(COL.stone))); // 석축
    // 석탑 (다층)
    const tiers = Math.min(2 + lv, 5);
    for (let i = 0; i < tiers; i++) {
      const s = 0.5 - i * 0.07;
      g.add(box(s, 0.1, s, M(COL.stone, 0.85), 0.3 + i * 0.22).translateX(-0.45));
      g.add(box(s * 1.3, 0.05, s * 1.3, M(COL.stoneDark, 0.7), 0.3 + i * 0.22 + 0.1).translateX(-0.45));
    }
    // 본전
    g.add(box(0.9, 0.4, 0.7, M(COL.red, 0.6), 0.3).translateX(0.4));
    const r = hanokRoof(1.1, 0.85, 0.4); r.position.set(0.4, 0.7, 0); g.add(r);
  },
  pond: (g, lv) => {
    const w = new THREE.Mesh(new THREE.CircleGeometry(1.35, 32), M(COL.water, 0.2, 0.3, 0x10405a));
    w.rotation.x = -Math.PI / 2; w.position.y = 0.02; g.add(w);
    // 정자 (누각)
    g.add(box(0.7, 0.1, 0.7, M(COL.stone, 0.6), 0.1).translateX(0.3));
    for (const [x, z] of [[0.05, -0.25], [0.55, -0.25], [0.55, 0.25], [0.05, 0.25]]) {
      g.add(cyl(0.04, 0.04, 0.4, M(COL.woodDark), 8, 0.2).translateX(x).translateZ(z));
    }
    const r = hanokRoof(0.95, 0.95, 0.36); r.position.set(0.3, 0.6, 0); g.add(r);
    if (lv >= 3) { const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), M(0xff8fb3, 0.5)); lotus.position.set(-0.6, 0.08, 0.3); g.add(lotus); }
  },
  cathedral: (g, lv) => {
    g.add(box(0.9, 0.9, 0.7, M(COL.brick, 0.8), 0)); // 본당
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(0x6a8a6a, 0.5, 0.2));
    dome.position.set(0, 0.9, 0); g.add(dome);
    for (const x of [-0.55, 0.55]) {
      g.add(box(0.34, 1.2 + (x > 0 ? lv * 0.05 : 0), 0.34, M(COL.brick, 0.8)).translateX(x));
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x6a8a6a, 0.5, 0.2));
      sp.position.set(x, 1.2 + (x > 0 ? lv * 0.05 : 0), 0); g.add(sp);
      g.add(cyl(0.015, 0.015, 0.18, M(COL.gold, 0.3, 0.6), 6, 1.4 + (x > 0 ? lv * 0.05 : 0)).translateX(x));
    }
  },
  hanok: (g, lv) => {
    const n = Math.min(2 + lv, 6);
    for (let i = 0; i < n; i++) {
      const x = (i % 3 - 1) * 0.55, z = (i < 3 ? -0.4 : 0.45);
      const sub = new THREE.Group();
      sub.add(box(0.48, 0.3, 0.42, M(COL.white, 0.7)));
      const r = hanokRoof(0.62, 0.56, 0.26); r.position.y = 0.42; sub.add(r);
      sub.position.set(x, 0, z); g.add(sub);
    }
  },
  peak: (g, lv) => {
    // 화산 분화구 봉우리
    const h = 1.1 + lv * 0.12;
    g.add(cyl(0.45, 1.0, h, M(0x6a8b4a, 0.9), 24)); // 본체
    const crater = cyl(0.4, 0.45, 0.16, M(0x4a6030, 0.95), 24, h - 0.08);
    g.add(crater);
    const hole = cyl(0.28, 0.28, 0.18, M(0x2a3a18, 1), 20, h - 0.04); g.add(hole);
    // 들쭉날쭉 능선
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sp = cone(0.1, 0.22, M(0x5a7a3a, 0.9), 6, h - 0.05);
      sp.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42); g.add(sp);
    }
    if (lv >= 4) { const sun = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), M(0xffb347, 0.2, 0, 0xff9a00)); sun.position.set(0, h + 0.3, -0.2); g.add(sun); }
  },
  statue: (g, lv) => {
    // 돌하르방
    g.add(cyl(0.4, 0.5, 0.16, M(COL.stoneDark, 0.95), 16)); // 받침
    g.add(cyl(0.34, 0.4, 0.6, M(0x8a8576, 0.95), 16, 0.16)); // 몸통
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), M(0x9a9484, 0.95));
    head.position.y = 1.0; head.scale.y = 1.1; head.castShadow = true; g.add(head);
    g.add(cyl(0.3, 0.36, 0.18, M(0x8a8576, 0.95), 16, 1.18)); // 벙거지
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), M(0x9a9484, 0.95));
    nose.position.set(0, 0.98, 0.3); nose.scale.z = 1.6; g.add(nose);
    for (const x of [-0.13, 0.13]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), M(0x6a6456)); eye.position.set(x, 1.08, 0.28); g.add(eye); }
    if (lv >= 3) { const s2 = builders.statue; void s2; const small = cyl(0.2, 0.26, 0.4, M(0x8a8576, 0.95), 12, 0); small.position.set(0.6, 0, 0.2); small.scale.setScalar(0.6); g.add(small); }
  },
  rock: (g, lv) => {
    // 주상절리 육각 기둥
    const n = Math.min(6 + lv * 3, 18);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rad = Math.random() * 0.7;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const h = 0.5 + Math.random() * (0.7 + lv * 0.1);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, h, 6), M(0x3a3f4a, 0.85));
      col.position.set(x, h / 2, z); col.castShadow = true; g.add(col);
    }
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), M(COL.water, 0.2, 0.3, 0x10405a));
    sea.rotation.x = -Math.PI / 2; sea.position.y = 0.01; g.add(sea);
  },
};

export function buildLandmark(kind: LandmarkKind, level: number, maxLevel: number, accent: number): THREE.Group {
  const g = new THREE.Group();
  if (level <= 0) { g.add(scaffold()); return g; }
  builders[kind](g, level, maxLevel, accent);
  // 완성 시 글로우 링
  if (level >= maxLevel) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.03, 8, 40),
      M(accent, 0.3, 0, accent)
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
    g.add(ring);
  }
  // 레벨에 따라 약간 커지는 느낌
  const s = 0.85 + (level / maxLevel) * 0.25;
  g.scale.setScalar(s);
  return g;
}
