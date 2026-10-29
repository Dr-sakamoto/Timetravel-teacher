import * as THREE from 'three';
import type { EraId } from '../../game/types';
import { Bursts, type Cue, type EraView } from './kit';
import { cretaceous } from './eras/cretaceous';
import { egypt } from './eras/egypt';
import { greece } from './eras/greece';
import { china } from './eras/china';
import { heian } from './eras/heian';
import { europe } from './eras/europe';
import { sengoku } from './eras/sengoku';
import { edo } from './eras/edo';
import { modern } from './eras/modern';
import { present } from './eras/present';
import { future } from './eras/future';
import { celebrate } from './eras/common';
import { Warp } from './warp';

const BUILDERS: Record<EraId, () => EraView> = { cretaceous, egypt, greece, china, heian, europe, sengoku, edo, modern, present, future };

/** 1秒あたりの描画回数の上限（背景はゆっくり動くだけなので、電池を食わないように抑える） */
const FPS = 30;
/** 時代が変わるときに暗転する時間（ms） */
const FADE = 700;

/** 卓の後ろの3Dの風景。時代ごとに作り替え、ゲームの様子（Cue）とめくられたイベントに合わせて動かす */
export class Backdrop {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(42, 2, 0.5, 600);
  private view: EraView | null = null;
  /** どの時代にもある演出（紙吹雪・きらきら）の粒 */
  private common: Bursts | null = null;
  private era: EraId | null = null;
  private cue: Cue | null = null;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private t = 0;
  private swapTimer = 0;
  /** 暗転のあとに作り替える予約が入っている */
  private swapping = false;
  /** 描画の仕組み（WebGL）が端末の都合で落ちている（アプリを裏に回したときなど） */
  private lost = false;
  private shake = 0;
  private sizer = new ResizeObserver(() => this.resize());
  /** タイムスリップの渦（時代と時代のあいだだけ） */
  private warp: Warp | null = null;
  /** 'era'=時代の風景 'warp'=渦の中 'plunge'=渦の真ん中へ突っ込んでいる */
  private mode: 'era' | 'warp' | 'plunge' = 'era';
  /** 渦を抜けた直後に、風景の上にかぶせて引いていく光 */
  private glare = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: '#f2fff2', transparent: true, opacity: 0, depthTest: false }));
  private glareScene = new THREE.Scene();
  private glareCam = new THREE.Camera();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.glare.frustumCulled = false;
    this.glareScene.add(this.glare);
    // キャンバスの大きさ（卓の大きさ）が変わったら描き直す
    this.sizer.observe(canvas);
    // スマホでアプリを裏に回すなどして描画の仕組みが落ちたら、戻ったときに今の風景（または渦）を作り直す
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
  };
  private onRestored = () => {
    this.lost = false;
    if (this.mode === 'era') this.build();
    else {
      this.warp?.dispose();
      this.warp = null;
      this.mode = 'era';
      if (this.cue?.warp) this.startWarp();
      else this.build();
    }
  };

  /** 暗転してから fn を呼ぶ予約（予約のあいだは swapping） */
  private later(fn: () => void) {
    clearTimeout(this.swapTimer);
    this.swapping = true;
    this.swapTimer = window.setTimeout(() => {
      this.swapping = false;
      fn();
    }, FADE);
  }
  private cancelLater() {
    clearTimeout(this.swapTimer);
    this.swapping = false;
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // 縦長の画面では横が切れすぎないように少し引く
    this.camera.fov = this.camera.aspect < 1 ? 60 : 42;
    this.camera.updateProjectionMatrix();
    this.warp?.resize(w, h);
  };

  /** ゲームの様子を伝える（時代が変わっていれば、暗転して風景を作り替える） */
  update(cue: Cue) {
    this.cue = cue;
    if (cue.warp) {
      this.era = cue.era;
      if (this.mode !== 'warp') this.startWarp();
      return;
    }
    if (this.mode === 'warp') {
      // 渦に入る暗転の途中で全員そろった（渦がまだできていない）：突っ込まずに、そのまま次の時代の風景を出す
      if (!this.warp) {
        this.cancelLater();
        this.mode = 'era';
        this.era = cue.era;
        this.build();
        return;
      }
      // 全員そろった：渦の真ん中へグンッと突っ込み、光の中から次の時代へ
      this.mode = 'plunge';
      this.warp?.plunge(() => {
        this.mode = 'era';
        this.era = this.cue?.era ?? cue.era;
        this.build();
        this.warp?.dispose();
        this.warp = null;
        this.glare.material.opacity = 1;
      });
      return;
    }
    if (this.mode === 'plunge') return;
    if (cue.era !== this.era) {
      const first = this.era === null;
      this.era = cue.era;
      this.cancelLater();
      if (first) this.build();
      else {
        this.canvas.style.opacity = '0';
        this.later(() => this.build());
      }
      return;
    }
    this.view?.apply?.(cue);
  }

  /** めくられたイベントの演出（その時代に演出がなければ、ごほうびの紙吹雪などの共通の演出） */
  fire(key: string) {
    if (!this.view) return;
    if (this.view.fire?.(key)) {
      if (key === 'meteor' || key === 'trex_hunt' || key === 'taika' || key === 'sekigahara') this.shake = 1;
      return;
    }
    if (this.common) celebrate(this.common, key);
  }

  /** 渦に入る（風景を出していたら、いったん暗転してから） */
  private startWarp() {
    this.cancelLater();
    const begin = () => {
      this.disposeView();
      this.warp?.dispose();
      this.warp = new Warp();
      this.warp.enter();
      this.mode = 'warp';
      this.resize();
      this.canvas.style.opacity = '1';
    };
    if (!this.view && !this.warp) return begin();
    this.mode = 'warp';
    this.canvas.style.opacity = '0';
    this.later(begin);
  }

  private build() {
    if (!this.era) return;
    this.disposeView();
    try {
      this.view = BUILDERS[this.era]();
    } catch (e) {
      // 風景が作れなかった時代は、現代の風景で代わりに（真っ暗にしない）
      console.error('風景を作れなかった', this.era, e);
      this.view = BUILDERS.present();
    }
    this.common = new Bursts(this.view.scene, 500, 0.8, false);
    const c = this.view.camera ?? { pos: [0, 5, 22], look: [0, 9, -40] };
    this.camera.position.set(...c.pos);
    this.camera.lookAt(new THREE.Vector3(...c.look));
    this.base.copy(this.camera.position);
    if (c.fov) this.camera.fov = c.fov;
    this.resize();
    if (this.cue) this.view.apply?.(this.cue);
    this.canvas.style.opacity = '1';
  }

  private base = new THREE.Vector3();

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now;
    this.acc += dt;
    if (this.acc < 1 / FPS - 0.002) return;
    const step = Math.min(0.1, this.acc);
    this.acc = 0;
    if (this.lost) return;
    // 念のための自己回復：風景も渦もないまま止まっていたら（作り替えの予約もない）、今の時代の風景を作り直す
    if (!this.swapping && !this.view && !this.warp && this.era) {
      this.mode = 'era';
      this.build();
    }
    if (this.warp && this.mode !== 'era') {
      const w = this.warp;
      w.tick(step);
      // 突っ込みきったら tick の中で次の時代の風景に替わる（渦はもう描かない）
      if (this.warp === w) {
        this.renderer.render(w.scene, w.camera);
        return;
      }
    }
    if (!this.view) return;
    this.t += step;
    this.view.tick(this.t, step);
    this.common?.tick(step, -2.5);
    // 隕石や合戦で画面がゆれる
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - step * 0.8);
      const a = this.shake * 0.5;
      this.camera.position.set(this.base.x + (Math.random() - 0.5) * a, this.base.y + (Math.random() - 0.5) * a, this.base.z);
    } else this.camera.position.copy(this.base);
    this.renderer.render(this.view.scene, this.camera);
    // 渦から抜けた直後は、光が少しずつ引いて風景が見えてくる
    if (this.glare.material.opacity > 0) {
      this.glare.material.opacity = Math.max(0, this.glare.material.opacity - step * 1.4);
      this.renderer.autoClear = false;
      this.renderer.render(this.glareScene, this.glareCam);
      this.renderer.autoClear = true;
    }
  };

  private disposeView() {
    if (!this.view) return;
    (this.view.scene.background as THREE.Texture | null)?.dispose();
    this.view.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
    this.view = null;
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.swapTimer);
    this.sizer.disconnect();
    this.disposeView();
    this.warp?.dispose();
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.renderer.dispose();
    // 描画の仕組みをすぐ手放す（ゲーム画面を開き直すたびに増えて、スマホの上限で古いものが落ちないように）
    this.renderer.forceContextLoss();
  }
}
