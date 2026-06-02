import * as THREE from 'three';
import { SceneManager } from './scene';
import { tween, Ease, wait } from './anim';
import { makeYutFlatTexture } from './textures';

const L = 1.4;        // 윷가락 길이
const R = 0.16;       // 둥근 면 반지름
// 던진 윷이 안착하는 중심 — 보드 한가운데(화면 정중앙), 도시 광장 위
const LAND = new THREE.Vector3(0, 0.22, 0.4);
const SLOT_X = [-0.82, -0.27, 0.27, 0.82];

export class YutThrow {
  private sm: SceneManager;
  private root = new THREE.Group();
  private sticks: THREE.Group[] = [];
  private mat: THREE.Mesh;
  private flatTex: THREE.CanvasTexture;

  constructor(sm: SceneManager) {
    this.sm = sm;
    this.flatTex = makeYutFlatTexture();

    // 멍석 (straw mat)
    const matCanvas = this.makeMatTexture();
    this.mat = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 48),
      new THREE.MeshStandardMaterial({ map: matCanvas, roughness: 0.95, transparent: true, opacity: 0 })
    );
    this.mat.rotation.x = -Math.PI / 2;
    this.mat.position.set(LAND.x, 0.07, LAND.z);
    this.mat.receiveShadow = true;
    this.root.add(this.mat);

    for (let i = 0; i < 4; i++) {
      const s = this.makeStick(i === 0);
      s.visible = false;
      this.sticks.push(s);
      this.root.add(s);
    }
    sm.scene.add(this.root);
  }

  private makeMatTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    x.fillStyle = '#d8b878'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(150,110,60,0.5)'; x.lineWidth = 3;
    for (let i = 0; i < 256; i += 12) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke();
    }
    x.strokeStyle = 'rgba(120,90,50,0.35)';
    for (let i = 0; i < 256; i += 12) {
      x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke();
    }
    x.strokeStyle = '#b08a4a'; x.lineWidth = 10;
    x.strokeRect(6, 6, 244, 244);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // 윷가락 1개: 둥근 면(배, 어두운 나무)은 +Y, 평평한 면(평, 밝은 나무+X)은 -Y.
  // 그룹을 X축 기준 0/π 회전시켜 배/평을 전환한다.
  private makeStick(special: boolean): THREE.Group {
    const g = new THREE.Group();
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x7d4a22, roughness: 0.55 });

    // 둥근 면(배): 전체 원통을 X축으로 눕힘 — 위쪽 절반이 둥글게 보인다
    const round = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 22), domeMat);
    round.rotation.z = Math.PI / 2; // 축을 X로
    round.position.y = 0.05;
    round.castShadow = true; round.receiveShadow = true;
    g.add(round);

    // 평평한 면(평): 아래쪽 슬랩 — 바깥(-Y) 면에 밝은 나무 + 붉은 X
    const flatMat = new THREE.MeshStandardMaterial({ map: this.flatTex, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xe9cf9a, roughness: 0.7 });
    // BoxGeometry material 순서: [+x,-x,+y,-y,+z,-z] → index 3 = -Y(바깥면)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(L, 0.07, R * 1.9), [
      woodMat, woodMat, woodMat, flatMat, woodMat, woodMat,
    ]);
    slab.position.y = -0.07;
    slab.castShadow = true; slab.receiveShadow = true;
    g.add(slab);

    // 백도 표식 (특수 윷가락) — 평면 중앙에 점
    if (special) {
      const mark = new THREE.Mesh(
        new THREE.CircleGeometry(0.045, 16),
        new THREE.MeshBasicMaterial({ color: 0x1a1a2a })
      );
      mark.position.set(0, -0.106, 0); mark.rotation.x = Math.PI / 2;
      g.add(mark);
    }
    return g;
  }

  // 던지기: sticks[i] true=평(앞면). Promise는 안착 후 resolve.
  async throw(faces: boolean[]): Promise<void> {
    // 멍석 등장
    this.mat.visible = true;
    tween(220, (p) => { (this.mat.material as THREE.MeshStandardMaterial).opacity = p * 0.92; });

    const starts: THREE.Vector3[] = [];
    const lands: THREE.Vector3[] = [];
    const apexY: number[] = [];
    const spins: { x: number; y: number; z: number }[] = [];
    const finalRotX: number[] = [];

    for (let i = 0; i < 4; i++) {
      const s = this.sticks[i];
      s.visible = true;
      // 시작: 화면 아래(카메라 앞)에서 손으로 던지듯
      starts.push(new THREE.Vector3(-0.3 + Math.random() * 0.6, -0.6, 5.6));
      lands.push(new THREE.Vector3(LAND.x + SLOT_X[i] + (Math.random() - 0.5) * 0.18, LAND.y, LAND.z + (Math.random() - 0.5) * 0.5));
      apexY.push(3.0 + Math.random() * 0.7);
      // 평이면 최종 rotationX = π (밝은 면 위), 배면 0
      const targetFlat = faces[i] ? Math.PI : 0;
      finalRotX.push(targetFlat);
      const turns = 3 + Math.floor(Math.random() * 3); // 회전 수
      spins.push({
        x: turns * Math.PI * 2,
        y: (Math.random() - 0.5) * Math.PI * 3,
        z: (Math.random() - 0.5) * Math.PI * 2,
      });
      s.position.copy(starts[i]);
      s.rotation.set(0, 0, 0);
      s.scale.set(1, 1, 1);
    }

    // 토스 + 낙하 (포물선)
    await tween(900, (p) => {
      for (let i = 0; i < 4; i++) {
        const s = this.sticks[i];
        const a = starts[i], b = lands[i];
        s.position.x = a.x + (b.x - a.x) * p;
        s.position.z = a.z + (b.z - a.z) * p;
        // 포물선 y
        const yArc = a.y + (b.y - a.y) * p + Math.sin(p * Math.PI) * (apexY[i] - a.y) * 1.0;
        s.position.y = yArc;
        // 회전: 후반부에 최종각으로 수렴
        const spinEase = p < 0.78 ? p / 0.78 : 1;
        const settle = p < 0.78 ? 0 : (p - 0.78) / 0.22;
        const baseX = spins[i].x * spinEase;
        s.rotation.x = baseX * (1 - settle) + finalRotX[i] * settle + (1 - settle) * 0;
        // 안착각으로 부드럽게
        if (p >= 0.78) {
          const k = Ease.outCubic(settle);
          // 정규화: 가장 가까운 finalRotX 등가각으로
          s.rotation.x = THREE.MathUtils.lerp(baseX % (Math.PI * 2), finalRotX[i], k);
        }
        s.rotation.y = spins[i].y * spinEase * (1 - settle);
        s.rotation.z = spins[i].z * spinEase * (1 - settle);
      }
    }, (t) => t);

    // 최종각 확정 + 착지 바운스
    await tween(260, (p) => {
      const b = Ease.outBounce(p);
      for (let i = 0; i < 4; i++) {
        const s = this.sticks[i];
        s.rotation.x = finalRotX[i];
        s.rotation.y = 0; s.rotation.z = 0;
        s.position.y = lands[i].y + (1 - b) * 0.5;
        const sq = 1 - Math.sin(p * Math.PI) * 0.12;
        s.scale.set(1, sq, 1);
      }
    });
    for (let i = 0; i < 4; i++) {
      this.sticks[i].position.y = lands[i].y;
      this.sticks[i].scale.set(1, 1, 1);
    }

    await wait(650); // 결과 음미

    // 정리 (페이드/축소)
    await tween(300, (p) => {
      const s = 1 - p;
      for (const st of this.sticks) st.scale.setScalar(Math.max(0.001, s));
      (this.mat.material as THREE.MeshStandardMaterial).opacity = 0.92 * (1 - p);
    }, Ease.inCubic);
    for (const st of this.sticks) { st.visible = false; st.scale.set(1, 1, 1); }
    this.mat.visible = false;
  }
}
