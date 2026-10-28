import * as THREE from 'three';
import { Anims, Bursts, baseScene, box, clouds, cone, drift, ease, figure, flag, flash, ground, group, halo, mat, mesh, ridge, rng, roof, water, wave, type EraView } from '../kit';

const CLANS = ['#c0392b', '#2c3e8f', '#f4efe0', '#1f1f24', '#d4a017'];

/** 天守閣：石垣の上に白壁と黒瓦を重ねる。てっぺんに金のしゃちほこ */
function castle(): THREE.Group {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(10, 14, 7, 4), mat('#8a8478'), 0, 3.5, 0);
  base.rotation.y = Math.PI / 4;
  g.add(base);
  let y = 7;
  for (let i = 0; i < 4; i++) {
    const w = 14 - i * 3;
    g.add(box(w, 3.4, w * 0.8, '#f2efe6', 0, y, 0), roof(w + 4, 2.2, w * 0.8 + 4, '#2f3440', y + 3));
    y += 4.6;
  }
  for (const x of [-1.2, 1.2]) g.add(cone(0.4, 1.4, '#e8b923', x, y, 0, 5));
  return g;
}

/** 戦国：夕焼けの山城と田んぼ、風にはためくのぼり旗。関ヶ原では軍勢が押し寄せる */
export function sengoku(): EraView {
  const scene = baseScene({
    sky: [[0, '#33416a'], [0.5, '#a8687a'], [0.85, '#ef9a5a'], [1, '#f8c87a']],
    fog: '#c98a6a',
    fogNear: 50,
    fogFar: 200,
    hemi: ['#ffd8b0', '#3a3a30', 1.5],
    sun: ['#ffb070', 2, [-40, 20, -30]],
  });
  scene.add(ground('#6a7a3a', 1.4, 71));
  scene.add(ridge('#4a4466', -150, 9, [20, 34], 3, 320), ridge('#6a5a6a', -120, 8, [12, 20], 8, 280));
  // 田んぼ（水を張った四角）
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) scene.add(water(j ? '#7a9a5a' : '#8fb0b8', 16, 8, -50 + i * 18, -30 - j * 10, 0.4));

  const c = castle();
  c.position.set(-24, 0, -66);
  c.scale.setScalar(1.3);
  scene.add(c);
  const sunDisc = group(mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: '#ffd08a', fog: false })), halo('#ff9a4a', 60, 0.5));
  sunDisc.position.set(36, 20, -170);
  scene.add(sunDisc);

  // のぼり旗（縦長）
  const r = rng(9);
  const banners = Array.from({ length: 14 }, (_, i) => {
    const f = flag(CLANS[i % CLANS.length], 1.4, 4, '#3a2a1a', 7);
    f.obj.position.set(-70 + i * 11 + r() * 4, 0, -48 - r() * 18);
    scene.add(f.obj);
    return { ...f, ph: r() * 6 };
  });

  const cloudTick = clouds(scene, { n: 6, color: '#f0c8b0', y: [32, 42], speed: 1, seed: 71 });
  const embers = drift(scene, { n: 80, color: '#ffb070', size: 0.4, box: [0, 8, -40, 110, 14, 40], vel: [1.2, 0.4, 0], sway: 0.6, additive: true, opacity: 0.6 });
  const fx = new Bursts(scene, 700, 1.6, false);
  const sparks = new Bursts(scene, 300, 1.0, true);
  const anims = new Anims();
  const armies: { g: THREE.Group; flags: THREE.Mesh[] }[] = [];
  let rain: ReturnType<typeof drift> | null = null;

  const army = (side: number, color: string) => {
    const g = new THREE.Group();
    const flags: THREE.Mesh[] = [];
    for (let i = 0; i < 18; i++) {
      const s = group(figure(color, '#d9a77a', 0.8));
      s.position.set((i % 6) * 2.4, 0, Math.floor(i / 6) * 2.6);
      g.add(s);
      if (i % 3 === 0) {
        const f = flag(color, 0.9, 2.6, '#3a2a1a', 4.6);
        f.obj.position.copy(s.position).add(new THREE.Vector3(0.6, 0, 0));
        g.add(f.obj);
        flags.push(f.cloth);
      }
    }
    g.position.set(side * 70, 0, -42);
    scene.add(g);
    const item = { g, flags };
    armies.push(item);
    anims.add(5, (p) => {
      g.position.x = side * (70 - ease.out(p) * 52);
      if (Math.random() < 0.4) fx.emit(g.position.clone().add(new THREE.Vector3(6, 0.5, 2)), 3, { spread: 3, up: 1.5, life: 1.4, colors: ['#b8a07a', '#a08a6a'], box: 10 });
    }, () => setTimeout(() => anims.add(1.5, (p) => g.scale.setScalar(Math.max(0.01, 1 - p)), () => {
      scene.remove(g);
      armies.splice(armies.indexOf(item), 1);
    }), 4000));
  };

  return {
    scene,
    tick(t, dt) {
      cloudTick(dt);
      embers.tick(t, dt);
      rain?.tick(t, dt);
      fx.tick(dt, -0.6);
      sparks.tick(dt, -2);
      anims.tick(dt);
      banners.forEach((b) => wave(b.cloth, t, 0.3, b.ph));
      armies.forEach((a) => a.flags.forEach((f, i) => wave(f, t, 0.25, i)));
    },
    fire(key) {
      if (key === 'sekigahara') {
        army(-1, '#c0392b');
        army(1, '#2c3e8f');
        return true;
      }
      if (key === 'okehazama') {
        if (rain) return true;
        rain = drift(scene, { n: 500, color: '#c8d4e8', size: 0.3, box: [0, 18, -40, 120, 40, 60], vel: [-3, -38, 0], opacity: 0.7, seed: 3 });
        flash(scene, anims, '#e8eeff', 0.4, 4);
        setTimeout(() => flash(scene, anims, '#e8eeff', 0.3, 3), 1600);
        setTimeout(() => {
          if (rain) scene.remove(rain.points);
          rain = null;
        }, 9000);
        return true;
      }
      if (key === 'teppo') {
        for (let i = 0; i < 8; i++)
          setTimeout(() => {
            const at = new THREE.Vector3(-30 + i * 8, 2, -36);
            sparks.emit(at, 14, { spread: 4, up: 1, life: 0.4, colors: ['#ffe08a', '#ffffff'] });
            fx.emit(at, 30, { spread: 3, up: 2, life: 2.4, colors: ['#e8e4dc', '#c8c4bc'] });
          }, i * 220);
        return true;
      }
      if (key === 'rakuichi') {
        sparks.emit(new THREE.Vector3(-24, 26, -66), 160, { spread: 12, up: 6, life: 2.4, colors: ['#ffd34a', '#e8b923', '#fff2a0'] });
        return true;
      }
      return false;
    },
  };
}
