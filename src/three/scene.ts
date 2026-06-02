import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type Updater = (dt: number, t: number) => void;

export class SceneManager {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;

  // 화면좌표(px) 오버레이 — 코인 비행 등
  overlayScene: THREE.Scene;
  overlayCamera: THREE.OrthographicCamera;

  private updaters: Set<Updater> = new Set();
  private clock = new THREE.Clock();
  private skyTex?: THREE.Texture;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  constructor(canvas?: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(46, this.aspect(), 0.1, 200);
    this.camera.position.set(0, 8.2, 9.2);
    this.camera.lookAt(0, 0.2, 0.2);

    this.setupLights();

    // postprocessing
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.62, 0.55, 0.78
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // overlay (pixel space, origin = center)
    this.overlayScene = new THREE.Scene();
    this.overlayCamera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    this.resizeOverlay();

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  private aspect() { return window.innerWidth / window.innerHeight; }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x404060, 0.85);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.65);
    key.position.set(5, 11, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    const d = 11;
    key.shadow.camera.left = -d; key.shadow.camera.right = d;
    key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 4;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xffd9a0, 0.7);
    rim.position.set(-6, 5, -7);
    this.scene.add(rim);

    const fill = new THREE.PointLight(0x88aaff, 0.5, 40);
    fill.position.set(-4, 6, 5);
    this.scene.add(fill);
  }

  // 도시별 하늘/배경 그라데이션
  setSky(top: string, bottom: string) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    if (this.skyTex) this.skyTex.dispose();
    this.skyTex = new THREE.CanvasTexture(c);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.skyTex;
    this.scene.fog = new THREE.Fog(new THREE.Color(bottom), 18, 34);
  }

  addUpdater(u: Updater) { this.updaters.add(u); }
  removeUpdater(u: Updater) { this.updaters.delete(u); }

  // 월드좌표 → 화면 px (origin 중심)
  worldToOverlay(world: THREE.Vector3): THREE.Vector2 {
    const v = world.clone().project(this.camera);
    return new THREE.Vector2(v.x * window.innerWidth / 2, v.y * window.innerHeight / 2);
  }
  // DOM clientX/Y → overlay px (origin 중심)
  domToOverlay(clientX: number, clientY: number): THREE.Vector2 {
    return new THREE.Vector2(clientX - window.innerWidth / 2, window.innerHeight / 2 - clientY);
  }

  private resizeOverlay() {
    const w = window.innerWidth, h = window.innerHeight;
    this.overlayCamera.left = -w / 2; this.overlayCamera.right = w / 2;
    this.overlayCamera.top = h / 2; this.overlayCamera.bottom = -h / 2;
    this.overlayCamera.updateProjectionMatrix();
  }

  private onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w, h);
    this.resizeOverlay();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.updaters.forEach((u) => u(dt, t));

    this.renderer.clear();
    this.composer.render();
    // 오버레이는 블룸 후 위에 그린다 (코인은 자체 글로우 스프라이트 사용)
    this.renderer.clearDepth();
    this.renderer.render(this.overlayScene, this.overlayCamera);
  };
}
