import * as THREE from 'three';
import type { EraId } from '../../game/types';

/** 背景に伝えるゲームの様子（毎回まるごと渡す。変わったところだけ反映する） */
export interface Cue {
  era: EraId;
  /** 建設中のピラミッド（古代エジプト）：積んだ石の割合 0〜1 と、完成したか */
  pyramid: { progress: number; done: boolean } | null;
  /** 滞在中のかぐや姫：差し出された宝の数／頼んでいる宝の数 */
  kaguya: { offered: number; total: number } | null;
  /** 電球の特許をとったクラスがある（近代） */
  patent: boolean;
  /** ゴッホのひまわりを飾っているクラスの数（近代） */
  sunflower: number;
  /** 桃園の誓いを立てている（三国志） */
  oath: boolean;
  /** ペストにかかっている子がいる（中世） */
  plague: boolean;
}

/** 1つの時代の風景 */
export interface EraView {
  scene: THREE.Scene;
  camera?: { pos: [number, number, number]; look: [number, number, number]; fov?: number };
  /** 毎フレーム（t は経過秒、dt は前のフレームからの秒） */
  tick(t: number, dt: number): void;
  /** ゲームの様子を反映する（ピラミッドの石、かぐや姫の滞在など） */
  apply?(cue: Cue): void;
  /** めくられたイベント（時代イベントのカードID）に合わせた一度きりの演出。演出があれば true */
  fire?(key: string): boolean;
}

// ---------- 乱数 ----------

/** 毎回同じ並びになる乱数（風景が読み込みのたびに変わらないように） */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// ---------- 材質 ----------

const mats = new Map<string, THREE.Material>();
/** 面ごとにべた塗りの材質（ローポリの見た目）。同じ色は使い回す */
export function mat(color: string, emissive?: string): THREE.MeshLambertMaterial {
  const k = `${color}|${emissive ?? ''}`;
  let m = mats.get(k) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: emissive ?? '#000000' });
    mats.set(k, m);
  }
  return m;
}
/** 光に左右されない色（太陽・月・窓あかりなど） */
export function glow(color: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });
}

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  return o;
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  children.forEach((c) => g.add(c));
  return g;
}

// ---------- 空・地面・光 ----------

/** 上から下へのグラデーションの空（stops は 0=天頂〜1=地平線） */
export function sky(stops: [number, string][]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([at, col]) => grad.addColorStop(at, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface SceneOpts {
  sky: [number, string][];
  fog: string;
  fogNear?: number;
  fogFar?: number;
  /** 空からの光・地面からの照り返し・その強さ */
  hemi?: [string, string, number];
  /** 太陽の光の色・強さ・向き */
  sun?: [string, number, [number, number, number]];
}

export function baseScene(o: SceneOpts): THREE.Scene {
  const s = new THREE.Scene();
  s.background = sky(o.sky);
  s.fog = new THREE.Fog(o.fog, o.fogNear ?? 40, o.fogFar ?? 190);
  const [hs, hg, hi] = o.hemi ?? ['#ffffff', '#555555', 1.6];
  s.add(new THREE.HemisphereLight(hs, hg, hi));
  const [sc, si, sp] = o.sun ?? ['#ffffff', 1.8, [30, 50, 20]];
  const d = new THREE.DirectionalLight(sc, si);
  d.position.set(...sp);
  s.add(d);
  return s;
}

/** でこぼこの地面（手前は平ら、奥ほど起伏が大きい） */
export function ground(color: string, bump = 1.2, seed = 1, size: [number, number] = [420, 260]): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size[0], size[1], 48, 30);
  geo.rotateX(-Math.PI / 2);
  const r = rng(seed);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const far = THREE.MathUtils.clamp((-z + 10) / 120, 0, 1);
    pos.setY(i, (r() - 0.5) * bump * (0.3 + far * 2));
  }
  geo.computeVertexNormals();
  const m = mesh(geo, mat(color));
  m.position.z = -size[1] / 2 + 30;
  return m;
}

/** 水面（川・海・湖） */
export function water(color: string, w: number, d: number, x = 0, z = -60, y = 0.15): THREE.Mesh {
  const m = mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 }), x, y, z);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** 遠くの山並み（とがった低いポリゴンの山を横に並べる） */
export function ridge(color: string, z: number, count: number, h: [number, number], seed: number, spread = 220, snow?: string): THREE.Group {
  const g = new THREE.Group();
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const height = h[0] + r() * (h[1] - h[0]);
    const rad = height * (0.9 + r() * 0.7);
    const geo = new THREE.ConeGeometry(rad, height, 5 + Math.floor(r() * 3), 1);
    const x = -spread / 2 + (spread * (i + r() * 0.6)) / count;
    const m = mesh(geo, mat(color), x, height / 2 - 1, z - r() * 12);
    m.rotation.y = r() * Math.PI;
    g.add(m);
    if (snow) {
      const cap = mesh(new THREE.ConeGeometry(rad * 0.32, height * 0.32, geo.parameters.radialSegments, 1), mat(snow), x, height - 1 - height * 0.16 + 0.05, m.position.z);
      cap.rotation.y = m.rotation.y;
      g.add(cap);
    }
  }
  return g;
}

// ---------- 光るもの ----------

const dotTex = new Map<string, THREE.Texture>();
/** ふんわりした丸（粒・光の輪に使う） */
export function softDot(hard = 0.0): THREE.Texture {
  const k = String(hard);
  let t = dotTex.get(k);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(Math.max(0.01, hard), 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    t = new THREE.CanvasTexture(c);
    dotTex.set(k, t);
  }
  return t;
}

/** 光の輪（太陽・月・窓あかり・松明の照り） */
export function halo(color: string, size: number, opacity = 0.8): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}

export function orb(color: string, r: number, haloColor = color, haloSize = r * 6): THREE.Group {
  return group(mesh(new THREE.SphereGeometry(r, 16, 12), glow(color)), halo(haloColor, haloSize, 0.6));
}

// ---------- 雲 ----------

/** もこもこの雲（つぶれた多面体を寄せ集める） */
export function cloud(seed: number, color = '#ffffff', scale = 1): THREE.Group {
  const r = rng(seed);
  const g = new THREE.Group();
  const n = 3 + Math.floor(r() * 3);
  // 影の側も明るめにして、岩ではなく雲に見えるように
  const m0 = mat(color, `#${new THREE.Color(color).multiplyScalar(0.5).getHexString()}`);
  for (let i = 0; i < n; i++) {
    const rad = (1.6 + r() * 1.8) * scale;
    const m = mesh(new THREE.IcosahedronGeometry(rad, 1), m0, (i - n / 2) * 2.2 * scale + r(), r() * 1.2 * scale, r() * 2);
    m.scale.y = 0.6;
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(m);
  }
  return g;
}

/** 空をゆっくり流れる雲の群れ（右へ流れて、端まで行ったら左から出てくる） */
export function clouds(scene: THREE.Scene, opts: { n: number; color?: string; y?: [number, number]; z?: [number, number]; speed?: number; scale?: number; seed?: number }) {
  const r = rng(opts.seed ?? 7);
  const [y0, y1] = opts.y ?? [20, 34];
  const [z0, z1] = opts.z ?? [-70, -130];
  const W = 200;
  const list = Array.from({ length: opts.n }, (_, i) => {
    const c = cloud(i * 31 + (opts.seed ?? 7), opts.color, (opts.scale ?? 1) * (0.7 + r() * 0.8));
    c.position.set(-W / 2 + r() * W, y0 + r() * (y1 - y0), z0 + r() * (z1 - z0));
    scene.add(c);
    return { c, v: (opts.speed ?? 1) * (0.5 + r() * 0.7) };
  });
  return (dt: number) => {
    for (const x of list) {
      x.c.position.x += x.v * dt;
      if (x.c.position.x > W / 2) x.c.position.x -= W;
    }
  };
}

// ---------- 粒（砂ぼこり・花びら・雪・火の粉） ----------

export interface DriftOpts {
  n: number;
  color: string;
  size: number;
  /** 粒の舞う範囲（中心と大きさ） */
  box: [cx: number, cy: number, cz: number, w: number, h: number, d: number];
  /** 流れる向き（毎秒） */
  vel: [number, number, number];
  /** ゆらゆらの幅 */
  sway?: number;
  additive?: boolean;
  opacity?: number;
  seed?: number;
}

/** ずっと舞っている粒（範囲の外に出たら反対側から戻る） */
export function drift(scene: THREE.Scene, o: DriftOpts) {
  const r = rng(o.seed ?? 3);
  const [cx, cy, cz, w, h, d] = o.box;
  const pos = new Float32Array(o.n * 3);
  const phase = new Float32Array(o.n);
  for (let i = 0; i < o.n; i++) {
    pos[i * 3] = cx + (r() - 0.5) * w;
    pos[i * 3 + 1] = cy + (r() - 0.5) * h;
    pos[i * 3 + 2] = cz + (r() - 0.5) * d;
    phase[i] = r() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    color: o.color,
    size: o.size,
    map: softDot(0.35),
    transparent: true,
    opacity: o.opacity ?? 0.85,
    depthWrite: false,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, m);
  scene.add(pts);
  const wrap = (v: number, c: number, s: number) => (v < c - s / 2 ? v + s : v > c + s / 2 ? v - s : v);
  return {
    points: pts,
    tick(t: number, dt: number) {
      const sw = o.sway ?? 0;
      for (let i = 0; i < o.n; i++) {
        const k = i * 3;
        pos[k] = wrap(pos[k] + (o.vel[0] + Math.sin(t * 0.9 + phase[i]) * sw) * dt, cx, w);
        pos[k + 1] = wrap(pos[k + 1] + o.vel[1] * dt, cy, h);
        pos[k + 2] = wrap(pos[k + 2] + (o.vel[2] + Math.cos(t * 0.7 + phase[i]) * sw * 0.5) * dt, cz, d);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/** 一度きりの粒（火の粉・紙吹雪・土けむり）。寿命が来たら消える */
export class Bursts {
  private pos: Float32Array;
  private vel: Float32Array;
  private col: Float32Array;
  private base: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private geo = new THREE.BufferGeometry();
  private next = 0;
  readonly points: THREE.Points;
  constructor(scene: THREE.Scene, private n = 600, size = 0.9, additive = true) {
    this.pos = new Float32Array(n * 3).fill(-9999);
    this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.base = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n).fill(1);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(
      this.geo,
      new THREE.PointsMaterial({ size, map: softDot(0.3), vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  /** at から count 個。spread は速さのばらつき、up は上向きの初速、colors から色を選ぶ */
  emit(at: THREE.Vector3Like, count: number, o: { spread: number; up?: number; life?: number; colors: string[]; box?: number }) {
    const c = new THREE.Color();
    for (let j = 0; j < count; j++) {
      const i = this.next;
      this.next = (this.next + 1) % this.n;
      const k = i * 3;
      const b = o.box ?? 0;
      this.pos[k] = at.x + (Math.random() - 0.5) * b;
      this.pos[k + 1] = at.y + (Math.random() - 0.5) * b * 0.3;
      this.pos[k + 2] = at.z + (Math.random() - 0.5) * b * 0.4;
      this.vel[k] = (Math.random() - 0.5) * o.spread;
      this.vel[k + 1] = (o.up ?? 0) + (Math.random() - 0.3) * o.spread;
      this.vel[k + 2] = (Math.random() - 0.5) * o.spread * 0.5;
      c.set(o.colors[Math.floor(Math.random() * o.colors.length)]);
      this.base[k] = c.r;
      this.base[k + 1] = c.g;
      this.base[k + 2] = c.b;
      this.max[i] = this.life[i] = (o.life ?? 1.6) * (0.6 + Math.random() * 0.6);
    }
  }
  tick(dt: number, gravity = -3) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      const k = i * 3;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[k + 1] = -9999;
        continue;
      }
      this.vel[k + 1] += gravity * dt;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const a = Math.min(1, (this.life[i] / this.max[i]) * 2);
      this.col[k] = this.base[k] * a;
      this.col[k + 1] = this.base[k + 1] * a;
      this.col[k + 2] = this.base[k + 2] * a;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

// ---------- 時間で動かす ----------

/** 決まった時間だけ動く演出の一覧（p は 0→1） */
export class Anims {
  private list: { t: number; dur: number; fn: (p: number) => void; done?: () => void }[] = [];
  add(dur: number, fn: (p: number) => void, done?: () => void) {
    this.list.push({ t: 0, dur, fn, done });
  }
  get busy() {
    return this.list.length > 0;
  }
  tick(dt: number) {
    this.list = this.list.filter((a) => {
      a.t += dt;
      const p = Math.min(1, a.t / a.dur);
      a.fn(p);
      if (p >= 1) a.done?.();
      return p < 1;
    });
  }
}

export const ease = {
  out: (p: number) => 1 - (1 - p) ** 3,
  inOut: (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2),
  /** 0→1→0（行って帰る） */
  bump: (p: number) => Math.sin(p * Math.PI),
};

/** 今の値を目標へなめらかに近づける */
export function approach(cur: number, target: number, dt: number, rate = 2): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

// ---------- よく使う形 ----------

export function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0): THREE.Mesh {
  return mesh(new THREE.BoxGeometry(w, h, d), mat(color), x, y + h / 2, z);
}
export function cyl(rt: number, rb: number, h: number, color: string, x = 0, y = 0, z = 0, seg = 8): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color), x, y + h / 2, z);
}
export function cone(r: number, h: number, color: string, x = 0, y = 0, z = 0, seg = 6): THREE.Mesh {
  return mesh(new THREE.ConeGeometry(r, h, seg), mat(color), x, y + h / 2, z);
}
export function ball(r: number, color: string, x = 0, y = 0, z = 0, detail = 0): THREE.Mesh {
  return mesh(new THREE.IcosahedronGeometry(r, detail), mat(color), x, y, z);
}

/** 四角錐の屋根（寺・城・家） */
export function roof(w: number, h: number, d: number, color: string, y: number, x = 0, z = 0): THREE.Mesh {
  const m = mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1), mat(color), x, y + h / 2, z);
  m.rotation.y = Math.PI / 4;
  m.scale.set(w, h, d);
  return m;
}

/** 切妻の屋根（三角の棒） */
export function gable(w: number, h: number, d: number, color: string, y: number, x = 0, z = 0): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return mesh(geo, mat(color), x, y, z);
}

/** 広葉樹（幹＋丸い葉） */
export function tree(color: string, x: number, z: number, s = 1, trunk = '#6b4a2f'): THREE.Group {
  const g = group(cyl(0.25 * s, 0.35 * s, 2 * s, trunk), ball(1.6 * s, color, 0, 2.6 * s, 0));
  g.position.set(x, 0, z);
  return g;
}
/** 針葉樹 */
export function pine(color: string, x: number, z: number, s = 1): THREE.Group {
  const g = group(cyl(0.2 * s, 0.3 * s, 1 * s, '#5a3d26'), cone(1.4 * s, 2.4 * s, color, 0, 0.8 * s), cone(1.0 * s, 2 * s, color, 0, 2 * s));
  g.position.set(x, 0, z);
  return g;
}
/** ヤシ（エジプト・白亜紀） */
export function palm(x: number, z: number, s = 1, leaf = '#3f8f3a', seed = 1): THREE.Group {
  const r = rng(seed);
  const g = new THREE.Group();
  const lean = (r() - 0.5) * 0.3;
  const trunk = cyl(0.18 * s, 0.3 * s, 5 * s, '#8a6a3f');
  trunk.rotation.z = lean;
  g.add(trunk);
  const top = new THREE.Group();
  top.position.set(-Math.sin(lean) * 5 * s, 5 * s, 0);
  for (let i = 0; i < 6; i++) {
    const l = mesh(new THREE.ConeGeometry(0.45 * s, 3.2 * s, 3), mat(leaf));
    l.geometry.translate(0, 1.6 * s, 0);
    l.rotation.set(1.9, (i / 6) * Math.PI * 2, 0, 'YXZ');
    top.add(l);
  }
  g.add(top);
  g.position.set(x, 0, z);
  return g;
}

/** 人の形（円すいの胴と丸い頭）。顔はなく、色だけで見分ける */
export function figure(body: string, head = '#f1c9a0', s = 1, hair?: string): THREE.Group {
  const g = group(cone(0.7 * s, 2 * s, body, 0, 0, 0, 8), ball(0.45 * s, head, 0, 2.25 * s, 0, 1));
  if (hair) g.add(mesh(new THREE.SphereGeometry(0.48 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(hair), 0, 2.32 * s, -0.05 * s));
  return g;
}

/** 旗・のぼり（風でゆれる板） */
export function flag(color: string, w: number, h: number, pole = '#4a3a2a', poleH = h + 2): { obj: THREE.Group; cloth: THREE.Mesh } {
  const geo = new THREE.PlaneGeometry(w, h, 6, 1);
  geo.translate(w / 2, 0, 0);
  const cloth = mesh(geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }), 0, poleH - h / 2, 0);
  const obj = group(cyl(0.08, 0.08, poleH, pole, 0, 0, 0, 5), cloth);
  return { obj, cloth };
}
/** 旗をはためかせる */
export function wave(cloth: THREE.Mesh, t: number, amp = 0.35, seed = 0) {
  const pos = (cloth.geometry as THREE.BufferGeometry).attributes.position;
  const w = (cloth.geometry as THREE.PlaneGeometry).parameters.width;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, Math.sin(t * 4 + x * 1.6 + seed) * amp * (x / w));
  }
  pos.needsUpdate = true;
}

/** 揺れて見える炎（中心が黄色、外が赤の重なった円すい） */
export function flame(s = 1): THREE.Group {
  const g = group(
    mesh(new THREE.ConeGeometry(0.6 * s, 1.8 * s, 6), glow('#ff6a1a', 0.85), 0, 0.9 * s, 0),
    mesh(new THREE.ConeGeometry(0.35 * s, 1.2 * s, 6), glow('#ffd34a', 0.95), 0, 0.6 * s, 0),
    halo('#ff8a2a', 5 * s, 0.55),
  );
  return g;
}
export function flicker(f: THREE.Object3D, t: number, seed = 0) {
  const k = 1 + Math.sin(t * 13 + seed) * 0.12 + Math.sin(t * 7.3 + seed * 2) * 0.08;
  f.scale.set(1 / k, k, 1 / k);
}

/** 一度きりの光（稲光・隕石の閃光など）。0→1→0 で出して消す */
export function flash(scene: THREE.Scene, anims: Anims, color: string, dur = 0.6, peak = 2.5) {
  const l = new THREE.AmbientLight(color, 0);
  scene.add(l);
  anims.add(dur, (p) => (l.intensity = ease.bump(p) * peak), () => scene.remove(l));
}
