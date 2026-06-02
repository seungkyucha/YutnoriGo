import * as THREE from 'three';
import { SceneManager } from './scene';
import { tween, Ease, wait } from './anim';
import { makeYutFlatTexture } from './textures';

const L = 1.7;        // 윷가락 길이
const R = 0.2;        // 둥근 면 반지름
// 말판 중앙 멍석 위로 던져 안착
const LAND = new THREE.Vector3(0, 0.26, 0.2);

export class YutThrow {
  private sm: SceneManager;
  private root = new THREE.Group();
  private sticks: THREE.Group[] = [];
  private flatTex: THREE.CanvasTexture;

  constructor(sm: SceneManager) {
    this.sm = sm;
    this.flatTex = makeYutFlatTexture();
    for (let i = 0; i < 4; i++) {
      const s = this.makeStick(i === 0);
      s.visible = false;
      this.sticks.push(s);
      this.root.add(s);
    }
    sm.scene.add(this.root);
  }

  // 윷가락 1개: 둥근 면(배)은 +Y, 평평한 면(평, 밝은 나무+X)은 -Y. X축 0/π로 배/평 전환.
  private makeStick(special: boolean): THREE.Group {
    const g = new THREE.Group();
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x7d4a22, roughness: 0.55 });

    const round = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 22), domeMat);
    round.rotation.z = Math.PI / 2;
    round.position.y = 0.05;
    round.castShadow = true;
    g.add(round);

    const flatMat = new THREE.MeshStandardMaterial({ map: this.flatTex, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xe9cf9a, roughness: 0.7 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(L, 0.07, R * 1.9), [
      woodMat, woodMat, woodMat, flatMat, woodMat, woodMat,
    ]);
    slab.position.y = -0.07;
    slab.castShadow = true;
    g.add(slab);

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

  // 던지기: faces[i] true=평. Promise는 안착 후 resolve.
  async throw(faces: boolean[]): Promise<void> {
    const starts: THREE.Vector3[] = [];
    const lands: THREE.Vector3[] = [];
    const apexY: number[] = [];
    const spins: { x: number; y: number; z: number }[] = [];
    const finalRotX: number[] = [];
    const finalRotY: number[] = [];

    for (let i = 0; i < 4; i++) {
      const s = this.sticks[i];
      s.visible = true;
      // 시작: 화면 아래(카메라 앞)에서 던지듯
      starts.push(new THREE.Vector3(-0.3 + Math.random() * 0.6, 0.3, 4.9));
      // 안착: 멍석 위에 부채꼴로 잘 퍼지게 산포
      const a = (-0.5 + i * 0.33) * Math.PI + (Math.random() - 0.5) * 0.5;
      const rad = 0.55 + Math.random() * 0.95;
      lands.push(new THREE.Vector3(
        LAND.x + Math.cos(a) * rad,
        LAND.y,
        LAND.z + Math.sin(a) * rad * 0.72
      ));
      apexY.push(2.9 + Math.random() * 0.7);
      finalRotX.push(faces[i] ? Math.PI : 0);
      finalRotY.push((Math.random() - 0.5) * Math.PI * 1.4);
      const turns = 3 + Math.floor(Math.random() * 3);
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
        const yArc = a.y + (b.y - a.y) * p + Math.sin(p * Math.PI) * (apexY[i] - a.y) * 1.0;
        s.position.y = yArc;
        const spinEase = p < 0.78 ? p / 0.78 : 1;
        const settle = p < 0.78 ? 0 : (p - 0.78) / 0.22;
        const baseX = spins[i].x * spinEase;
        if (p < 0.78) {
          s.rotation.x = baseX;
          s.rotation.y = spins[i].y * spinEase;
          s.rotation.z = spins[i].z * spinEase;
        } else {
          const k = Ease.outCubic(settle);
          s.rotation.x = THREE.MathUtils.lerp(baseX % (Math.PI * 2), finalRotX[i], k);
          s.rotation.y = THREE.MathUtils.lerp(s.rotation.y, finalRotY[i], k);
          s.rotation.z = THREE.MathUtils.lerp(s.rotation.z, 0, k);
        }
      }
    }, (t) => t);

    // 착지 바운스 + 최종각 확정
    await tween(260, (p) => {
      const b = Ease.outBounce(p);
      for (let i = 0; i < 4; i++) {
        const s = this.sticks[i];
        s.rotation.x = finalRotX[i]; s.rotation.y = finalRotY[i]; s.rotation.z = 0;
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

    await tween(300, (p) => {
      const s = 1 - p;
      for (const st of this.sticks) st.scale.setScalar(Math.max(0.001, s));
    }, Ease.inCubic);
    for (const st of this.sticks) { st.visible = false; st.scale.set(1, 1, 1); }
  }
}
