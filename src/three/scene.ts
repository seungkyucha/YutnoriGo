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

  // 세로형 무대(stage) — 모바일은 화면 전체, 넓은 화면은 세로 칼럼으로 레터박스
  private stage: HTMLElement;
  private vw = 0; // 무대 픽셀 폭
  private vh = 0; // 무대 픽셀 높이
  // 기준 카메라(가로세로비 0.462에서 최적) — 비율에 따라 거리 스케일
  private camTarget = new THREE.Vector3(0, 0.2, 0.2);
  private camDir = new THREE.Vector3(0, 8.0, 9.0).normalize();
  private camBaseDist = Math.hypot(8.0, 9.0); // ≈ 12.04
  private readonly REF_ASPECT = 0.462;
  private readonly MAX_ASPECT = 0.62; // 이보다 넓으면 세로 칼럼으로 제한

  constructor(canvas: HTMLCanvasElement, stage: HTMLElement) {
    this.stage = stage;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
    });
    this.layoutStage();

    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.vw, this.vh, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(46, this.vw / this.vh, 0.1, 200);
    this.applyCameraFraming();

    this.setupLights();

    // postprocessing
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(this.vw, this.vh);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this.vw, this.vh), 0.62, 0.55, 0.78);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // overlay (pixel space, origin = center)
    this.overlayScene = new THREE.Scene();
    this.overlayCamera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    this.resizeOverlay();

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 120));
    this.animate();
  }

  // 무대 크기 결정 + DOM에 적용
  private layoutStage() {
    const availW = Math.max(1, window.innerWidth);
    const availH = Math.max(1, window.innerHeight);
    let w: number, h: number;
    if (availW / availH > this.MAX_ASPECT) {
      // 넓은 화면(데스크톱/태블릿 가로) → 세로 칼럼
      h = availH;
      w = Math.round(h * 0.52);
      if (w > availW) { w = availW; h = Math.round(w / 0.52); }
    } else {
      w = availW; h = availH;
    }
    this.vw = w; this.vh = h;
    this.stage.style.width = w + 'px';
    this.stage.style.height = h + 'px';
  }

  // 가로세로비에 맞춰 카메라 거리 조정 (보드가 항상 들어오도록)
  private applyCameraFraming() {
    const aspect = this.vw / this.vh;
    const scale = Math.min(1.7, Math.max(0.92, this.REF_ASPECT / aspect));
    const dist = this.camBaseDist * scale;
    this.camera.position.copy(this.camDir).multiplyScalar(dist).add(this.camTarget);
    this.camera.lookAt(this.camTarget);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

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

  // 월드좌표 → 오버레이 px (무대 중심 원점)
  worldToOverlay(world: THREE.Vector3): THREE.Vector2 {
    const v = world.clone().project(this.camera);
    return new THREE.Vector2((v.x * this.vw) / 2, (v.y * this.vh) / 2);
  }
  // DOM clientX/Y → 오버레이 px (무대 중심 원점)
  domToOverlay(clientX: number, clientY: number): THREE.Vector2 {
    const r = this.stage.getBoundingClientRect();
    return new THREE.Vector2(clientX - (r.left + this.vw / 2), (r.top + this.vh / 2) - clientY);
  }

  private resizeOverlay() {
    this.overlayCamera.left = -this.vw / 2; this.overlayCamera.right = this.vw / 2;
    this.overlayCamera.top = this.vh / 2; this.overlayCamera.bottom = -this.vh / 2;
    this.overlayCamera.updateProjectionMatrix();
  }

  private onResize() {
    this.layoutStage();
    this.applyCameraFraming();
    this.renderer.setSize(this.vw, this.vh, false);
    this.composer.setSize(this.vw, this.vh);
    this.bloom.resolution.set(this.vw, this.vh);
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
