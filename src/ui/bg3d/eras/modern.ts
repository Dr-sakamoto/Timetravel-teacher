import * as THREE from 'three';
import { Anims, Bursts, approach, baseScene, box, clouds, cyl, drift, ground, group, halo, mesh, rng, type Cue, type EraView } from '../kit';

/** エッフェル塔（すぼまっていく4本脚を重ねる） */
function eiffel(): THREE.Group {
  const g = new THREE.Group();
  const iron = '#6a5a4a';
  const leg = (h: number, r0: number, r1: number, y: number) => {
    const m = mesh(new THREE.CylinderGeometry(r1, r0, h, 4, 1, true), new THREE.MeshLambertMaterial({ color: iron, wireframe: true }), 0, y + h / 2, 0);
    m.rotation.y = Math.PI / 4;
    const solid = mesh(new THREE.CylinderGeometry(r1 * 0.55, r0 * 0.55, h, 4), new THREE.MeshLambertMaterial({ color: iron, flatShading: true }), 0, y + h / 2, 0);
    solid.rotation.y = Math.PI / 4;
    g.add(m, solid);
  };
  leg(10, 9, 5, 0);
  g.add(box(12, 0.8, 12, iron, 0, 10));
  leg(12, 5, 2.4, 10.8);
  g.add(box(6, 0.6, 6, iron, 0, 22.8));
  leg(18, 2.4, 0.5, 23.4);
  g.add(cyl(0.2, 0.2, 4, iron, 0, 41.4));
  // てっぺんの灯り
  const light = halo('#fff2b0', 8, 0.7);
  light.position.y = 45;
  g.add(light);
  return g;
}

/** ひまわり（茎と黄色い花） */
function sunflower(): THREE.Group {
  const head = group(mesh(new THREE.CylinderGeometry(1, 1, 0.3, 12), new THREE.MeshLambertMaterial({ color: '#f6c21a', flatShading: true })), mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 10), new THREE.MeshLambertMaterial({ color: '#5a3a1a' })));
  head.rotation.x = Math.PI / 2.4;
  head.position.y = 4;
  return group(cyl(0.12, 0.15, 4, '#4a7a2a'), head);
}

/** 近代：夕暮れのパリ。エッフェル塔、煙を吐く工場、走る蒸気機関車。特許のあいだは街に電灯がともる */
export function modern(): EraView {
  const scene = baseScene({
    sky: [[0, '#2f3a5a'], [0.55, '#8a7a8a'], [0.85, '#e0a882'], [1, '#f2c89a']],
    fog: '#b8a092',
    fogNear: 45,
    fogFar: 200,
    hemi: ['#ffe0c0', '#3a3a3a', 1.5],
    sun: ['#ffc890', 1.8, [-30, 20, -20]],
  });
  scene.add(ground('#6a6a52', 0.8, 91));

  const tower = eiffel();
  tower.position.set(30, 0, -92);
  scene.add(tower);

  // 工場と煙突
  const factory = group(box(22, 8, 10, '#7a4a3a'), box(22, 2, 10, '#5a3a2e', 0, 8));
  const stacks = [-6, 0, 6].map((x) => {
    factory.add(cyl(1, 1.4, 14, '#6a3a2e', x, 10, 0));
    return new THREE.Vector3(x, 24, 0);
  });
  factory.position.set(-40, 0, -80);
  scene.add(factory);
  const smoke = stacks.map((s, i) => drift(scene, { n: 40, color: '#5a5454', size: 6, box: [s.x - 40 + 6, 34, -80, 14, 22, 6], vel: [1.4, 2, 0], sway: 0.6, opacity: 0.35, seed: i + 7 }));

  // 街並み（窓が並ぶビル。特許のあいだは窓に電灯がともる）
  const r = rng(3);
  const windows: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const w = 6 + r() * 4;
    const h = 6 + r() * 8;
    const x = -70 + i * 10.5;
    const z = -56 - r() * 10;
    scene.add(group(box(w, h, 6, ['#c9b49a', '#b8a088', '#d4c2a8'][i % 3]), box(w + 0.6, 1, 6.6, '#4a4a5a', 0, h)).translateX(x).translateZ(z));
    for (let k = 0; k < 3; k++) {
      const s = halo('#ffd27a', 2.4, 0);
      s.position.set(x - w / 3 + k * (w / 3), 2 + r() * (h - 3), z + 3.2);
      scene.add(s);
      windows.push(s);
    }
  }
  // ガス灯
  const lamps = Array.from({ length: 7 }, (_, i) => {
    const l = group(cyl(0.12, 0.15, 5, '#2a2a2a'), halo('#ffd27a', 3, 0.7).translateY(5.3));
    l.position.set(-48 + i * 16, 0, -30);
    scene.add(l);
    return l;
  });

  // 蒸気機関車（右から左へ走り、煙を吐く）
  const train = new THREE.Group();
  train.add(box(7, 3, 2.6, '#2a2a30'), cyl(1.2, 1.2, 5, '#2a2a30', 1, 1.6, 0).rotateZ(Math.PI / 2), cyl(0.4, 0.5, 2, '#1a1a1a', 2.6, 3));
  for (let i = 1; i <= 3; i++) train.add(box(6, 3, 2.4, ['#7a2a2a', '#2a4a6a', '#5a4a2a'][i - 1], -i * 7, 0, 0));
  train.position.set(80, 0.4, -40);
  scene.add(train, box(400, 0.2, 1.4, '#4a3a2e', 0, 0.2, -40));
  const steam = new Bursts(scene, 200, 3, false);

  // ひまわり畑（飾っている絵の数だけ咲く）
  const flowers = Array.from({ length: 30 }, (_, i) => {
    const f = sunflower();
    f.position.set(-60 + (i % 10) * 4 + r() * 2, 0, -18 - Math.floor(i / 10) * 3);
    f.scale.setScalar(0.01);
    scene.add(f);
    return f;
  });

  const cloudTick = clouds(scene, { n: 5, color: '#d8b8a8', y: [32, 42], speed: 0.9, seed: 91 });
  const fx = new Bursts(scene, 700, 1.3, true);
  const anims = new Anims();
  let lit = 0;
  let litTarget = 0;
  let bloom = 0;
  let bloomTarget = 0;

  return {
    scene,
    tick(t, dt) {
      cloudTick(dt);
      smoke.forEach((s) => s.tick(t, dt));
      fx.tick(dt, -1.4);
      steam.tick(dt, 1);
      anims.tick(dt);
      train.position.x -= dt * 6;
      if (train.position.x < -110) train.position.x = 110;
      if (Math.random() < dt * 6) steam.emit(train.position.clone().add(new THREE.Vector3(2.6, 5, 0)), 1, { spread: 1, up: 2, life: 2.2, colors: ['#e8e4dc', '#cfcac2'] });
      lit = approach(lit, litTarget, dt, 1.2);
      windows.forEach((w, i) => (w.material.opacity = lit * (0.55 + Math.sin(t * 2 + i) * 0.08)));
      lamps.forEach((l, i) => ((l.children[1] as THREE.Sprite).material.opacity = 0.5 + Math.sin(t * 3 + i) * 0.1));
      bloom = approach(bloom, bloomTarget, dt, 1);
      flowers.forEach((f, i) => {
        const on = Math.min(1, Math.max(0, bloom * flowers.length - i));
        f.scale.setScalar(Math.max(0.01, on));
        f.rotation.z = Math.sin(t + i) * 0.05;
      });
    },
    apply(cue: Cue) {
      litTarget = cue.patent ? 1 : 0;
      // 飾った絵が1枚でもあれば畑の半分、2枚以上で一面に
      bloomTarget = Math.min(1, cue.sunflower * 0.5);
    },
    fire(key) {
      if (key === 'expo' || key === 'nobel') {
        const at = key === 'expo' ? new THREE.Vector3(30, 40, -92) : new THREE.Vector3(0, 30, -70);
        for (let i = 0; i < (key === 'expo' ? 5 : 2); i++)
          setTimeout(() => fx.emit(at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 30, Math.random() * 8, 0)), 120, { spread: 16, up: 0, life: 1.8, colors: key === 'nobel' ? ['#ffd34a', '#fff2a0'] : [['#ff6b6b', '#ffffff'], ['#6bcbff', '#ffd34a'], ['#c79bf2', '#7be38f']][i % 3] }), i * 500);
        return true;
      }
      if (key === 'patent') {
        litTarget = 1;
        fx.emit(new THREE.Vector3(0, 12, -56), 80, { spread: 12, up: 3, life: 1.4, colors: ['#ffd27a', '#ffffff'] });
        return true;
      }
      if (key === 'sunflower') {
        bloomTarget = Math.max(bloomTarget, 0.5);
        return true;
      }
      return false;
    },
  };
}
