import * as THREE from 'three';

function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 엽전(둥근 동전 + 사각 구멍) 텍스처
export function makeCoinTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const r = size / 2;
  const g = x.createRadialGradient(r * 0.8, r * 0.7, r * 0.1, r, r, r);
  g.addColorStop(0, '#fff6c2');
  g.addColorStop(0.45, '#ffd23f');
  g.addColorStop(0.8, '#f0a500');
  g.addColorStop(1, '#b86e00');
  x.fillStyle = g;
  x.beginPath(); x.arc(r, r, r - 4, 0, Math.PI * 2); x.fill();
  x.lineWidth = 5; x.strokeStyle = '#8a5200';
  x.beginPath(); x.arc(r, r, r - 4, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 3; x.strokeStyle = 'rgba(255,240,150,0.8)';
  x.beginPath(); x.arc(r, r, r - 14, 0, Math.PI * 2); x.stroke();
  // 사각 구멍
  const h = size * 0.24;
  x.fillStyle = '#9a5e00';
  x.fillRect(r - h / 2, r - h / 2, h, h);
  x.fillStyle = '#c47e08';
  x.fillRect(r - h / 2 + 3, r - h / 2 + 3, h - 6, h - 6);
  // 하이라이트
  x.fillStyle = 'rgba(255,255,240,0.5)';
  x.beginPath(); x.ellipse(r * 0.72, r * 0.55, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2); x.fill();
  return tex(c);
}

// 부드러운 원형 글로우 (additive)
export function makeGlowTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const r = size / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,240,180,1)');
  g.addColorStop(0.25, 'rgba(255,210,90,0.85)');
  g.addColorStop(0.6, 'rgba(255,160,40,0.25)');
  g.addColorStop(1, 'rgba(255,160,40,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return tex(c);
}

// 반짝이 별 (additive)
export function makeSparkTexture(size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const r = size / 2;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 2;
  x.beginPath();
  x.moveTo(r, 8); x.lineTo(r, size - 8);
  x.moveTo(8, r); x.lineTo(size - 8, r);
  x.stroke();
  return tex(c);
}

// 윷가락 평평한 면(밝은 나무 + 붉은 X 표식)
export function makeYutFlatTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, '#f7e3b8'); g.addColorStop(0.5, '#f3d59a'); g.addColorStop(1, '#e6c07a');
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  // 나뭇결
  x.strokeStyle = 'rgba(180,140,80,0.35)'; x.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    x.beginPath(); x.moveTo(8 + i * 12, 0);
    x.bezierCurveTo(8 + i * 12 + 6, 80, 8 + i * 12 - 6, 170, 8 + i * 12, 256);
    x.stroke();
  }
  // 붉은 X (대표 윷가락 표식은 별도)
  x.strokeStyle = '#c0392b'; x.lineWidth = 6; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(20, 110); x.lineTo(44, 146);
  x.moveTo(44, 110); x.lineTo(20, 146);
  x.stroke();
  return tex(c);
}
