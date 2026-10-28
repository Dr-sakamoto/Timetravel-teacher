import * as THREE from 'three';
import type { Bursts } from '../kit';

const CONFETTI = ['#ff6b6b', '#ffd34a', '#6bcBff', '#7be38f', '#c79bf2', '#ffffff'];

/**
 * その時代の風景に専用の演出がないイベント：卒業式は紙吹雪、ほかの時代イベントは空にきらきら。
 * 定期テストなど、毎学期あるものは何もしない
 */
export function celebrate(fx: Bursts, key: string) {
  if (key === 'graduation') {
    for (let i = 0; i < 6; i++) fx.emit(new THREE.Vector3(-40 + i * 16, 30, -40), 70, { spread: 9, up: 2, life: 5, colors: CONFETTI, box: 10 });
    return;
  }
  if (key.startsWith('test')) return;
  fx.emit(new THREE.Vector3(0, 24, -50), 90, { spread: 12, up: 4, life: 2.6, colors: ['#fff4c2', '#ffffff', '#ffd34a'] });
}
