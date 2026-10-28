import * as THREE from 'three';

/**
 * タイムスリップの渦（ミントの雲のトンネルに、ホログラムのような淡い虹色）。時代と時代のあいだ（初期メンバー決め・係決め）に流し、
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

const vec3 MINT = vec3(0.5, 0.92, 0.66);
const vec3 DEEP = vec3(0.15, 0.56, 0.37);

void main() {
  vec2 uv = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  uv /= uZoom;
  float r = max(length(uv), 1e-4);
  float A = atan(uv.y, uv.x);
  float t = uTime;

  // 奥へ流れながらねじれる雲の壁（トンネル）
  float depth = 0.35 / r + t * 1.2;
  float tw = A + depth * 0.35 + t * 0.45;
  vec2 d = vec2(cos(tw), sin(tw));
  float w = fbm(d * 2.2 + vec2(depth * 0.9, -depth * 0.4)) * 0.8 + fbm(d * 5.0 + vec2(-depth * 1.6, depth * 0.8)) * 0.35;
  float dens = smoothstep(0.3, 0.9, w);

  // ミントの地に、ホログラムのような淡い虹色（ミント・ラベンダー・ピンク・水色）が場所と奥行きで移ろう
  vec3 holo = vec3(0.72) + vec3(0.28) * cos(6.2831853 * (depth * 0.1 + A * 0.16 + w * 1.2 + t * 0.06 + vec3(0.0, 0.33, 0.67)));
  vec3 col = mix(DEEP, MINT, dens);
  col = mix(col, holo, 0.5 * (0.35 + dens));
  col += vec3(1.0) * pow(dens, 4.0) * 0.15;

  // 真ん中は白く光る
  col += vec3(0.85, 1.0, 0.9) * (exp(-r * 9.0) * 0.8 + 0.018 / (r + 0.06));

  // 突っ込む瞬間：全体が白っぽい光に包まれる
  col = mix(col, vec3(0.95, 1.0, 0.95), uFlash);
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
