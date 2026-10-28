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
  private shake = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    window.addEventListener('resize', this.resize);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // 縦長の画面では横が切れすぎないように少し引く
    this.camera.fov = this.camera.aspect < 1 ? 60 : 42;
    this.camera.updateProjectionMatrix();
  };

  /** ゲームの様子を伝える（時代が変わっていれば、暗転して風景を作り替える） */
  update(cue: Cue) {
    this.cue = cue;
    if (cue.era !== this.era) {
      const first = this.era === null;
      this.era = cue.era;
      clearTimeout(this.swapTimer);
      if (first) this.build();
      else {
        this.canvas.style.opacity = '0';
        this.swapTimer = window.setTimeout(() => this.build(), FADE);
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

  private build() {
    if (!this.era) return;
    this.disposeView();
    this.view = BUILDERS[this.era]();
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
    window.removeEventListener('resize', this.resize);
    this.disposeView();
    this.renderer.dispose();
  }
}
