import * as THREE from 'three';

/**
 * タイムスリップの渦（明るい緑のうずまき）。時代と時代のあいだ（初期メンバー決め・係決め）に流し、
 * 全員の準備ができたら真ん中の光へ突っ込んで（plunge）次の時代へ抜ける。
 * 画面いっぱいの板1枚にシェーダーで描くので、カメラも風景も使わない。
 */
const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uZoom;
uniform float uFlash;
uniform vec2 uRes;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// 渦の模様：渦巻きの腕にそって回りながら、真ん中へ吸い込まれていく雲（2枚を交互に重ねて、いつまでも途切れない）
float cloud(float ang, float L, float ph, vec2 off) {
  vec2 d = vec2(cos(ang), sin(ang));
  float rho = (2.2 - L - ph * 1.4) * 1.7;
  return fbm(d * rho + off);
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  uv /= uZoom;
  float r = max(length(uv), 1e-4);
  float A = atan(uv.y, uv.x);
  float L = log(r);
  float t = uTime;

  // 腕の巻き具合と回る速さ（内側ほど速く見える）
  float ang = A + 2.6 * L - t * 0.62;
  float ph1 = fract(t * 0.16);
  float ph2 = fract(t * 0.16 + 0.5);
  float w1 = 1.0 - abs(2.0 * ph1 - 1.0);
  float n = cloud(ang, L, ph1, vec2(0.0)) * w1 + cloud(ang, L, ph2, vec2(5.3, 2.1)) * (1.0 - w1);
  float arms = pow(0.5 + 0.5 * cos(3.0 * ang), 2.2);
  // 腕の中のもやもやした塊（銀河の塵のように、細かくちぎれて見せる）
  vec2 d2 = vec2(cos(ang), sin(ang));
  float clump = fbm(d2 * (7.0 - L * 5.0) + vec2(t * 0.05, 0.0));
  float dens = smoothstep(0.3, 0.95, n * (0.5 + arms * 0.9) * (0.55 + clump * 0.9));
  // 細かい星くず（腕にそってきらきら）
  float grain = pow(fbm(vec2(cos(ang * 2.0), sin(ang * 2.0)) * (14.0 - L * 9.0) + t * 0.2), 5.0) * 4.0;
  vec2 sp = d2 * (30.0 - L * 22.0);
  float star = step(0.985, hash(floor(sp))) * (1.0 - smoothstep(0.0, 0.45, length(fract(sp) - 0.5)));

  vec3 bg = vec3(0.01, 0.07, 0.04);
  vec3 arm = vec3(0.16, 0.85, 0.42);
  vec3 lime = vec3(0.72, 1.0, 0.38);
  vec3 col = bg + arm * dens * 1.1 + lime * pow(dens, 3.0) * 0.9 + lime * grain * dens + vec3(0.85, 1.0, 0.8) * star * (0.4 + dens);
  // 外へ向かって少し暗く、真ん中は白く光る
  col *= smoothstep(1.6, 0.15, r) * 0.85 + 0.25;
  float core = exp(-r * 6.0) * 0.9 + 0.03 / (r + 0.05);
  col += vec3(0.75, 1.0, 0.72) * core;

  // 外へ飛び散る光の粒（ワープの星）
  float sectors = 150.0;
  float sa = (A + 3.14159265) / 6.2831853 * sectors;
  float id = floor(sa);
  float h = hash(vec2(id, 3.1));
  float pos = fract(h * 7.3 + t * (0.32 + h * 0.5));
  float rr = pos * pos * 1.9;
  float len = 0.01 + rr * 0.09;
  float along = 1.0 - smoothstep(0.0, len, abs(r - rr));
  float across = 1.0 - smoothstep(0.0, 0.18, abs(fract(sa) - 0.5));
  col += vec3(0.75, 1.0, 0.8) * along * across * step(0.45, h) * smoothstep(0.0, 0.3, rr) * 1.4;

  // 突っ込む瞬間：全体が白っぽい緑の光に包まれる
  col = mix(col, vec3(0.9, 1.0, 0.86), uFlash);
  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export class Warp {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.Camera();
  private uniforms = {
    uTime: { value: 0 },
    uZoom: { value: 1 },
    uFlash: { value: 0 },
    uRes: { value: new THREE.Vector2(16, 9) },
  };
  /** 突っ込み中の経過（-1 ならまだ突っ込んでいない） */
  private plungeT = -1;
  private onDone: (() => void) | null = null;
  /** 突っ込むのにかかる秒数 */
  static readonly PLUNGE = 1.3;
  /** 出てくるときに光が引くまでの秒数 */
  static readonly ENTER = 0.5;
  private enterT = 0;

  constructor() {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms, depthTest: false, depthWrite: false }));
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  resize(w: number, h: number) {
    this.uniforms.uRes.value.set(w, h);
  }

  /** 渦に入る（光の中から渦が現れる） */
  enter() {
    this.plungeT = -1;
    this.onDone = null;
    this.enterT = Warp.ENTER;
    this.uniforms.uZoom.value = 1;
  }

  /** 真ん中の光へ突っ込む。突っ込みきったら done（このとき画面は光で真っ白） */
  plunge(done: () => void) {
    if (this.plungeT >= 0) return;
    this.plungeT = 0;
    this.onDone = done;
  }

  tick(dt: number) {
    const u = this.uniforms;
    if (this.plungeT >= 0) {
      this.plungeT += dt;
      const p = Math.min(1, this.plungeT / Warp.PLUNGE);
      // はじめはじわっと、最後にグンッと吸い込まれる。回転も速くなる
      const e = p * p * p;
      u.uZoom.value = 1 + e * 60;
      u.uTime.value += dt * (1 + e * 6);
      u.uFlash.value = Math.max(0, (p - 0.55) / 0.45) ** 1.5;
      if (p >= 1 && this.onDone) {
        const f = this.onDone;
        this.onDone = null;
        f();
      }
      return;
    }
    u.uTime.value += dt;
    this.enterT = Math.max(0, this.enterT - dt);
    u.uFlash.value = this.enterT / Warp.ENTER;
  }

  dispose() {
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
  }
}
