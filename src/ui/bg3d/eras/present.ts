import * as THREE from 'three';
import { Anims, Bursts, ball, baseScene, box, clouds, cyl, drift, figure, ground, group, halo, mesh, rng, tree, type EraView } from '../kit';

const POP = ['#ff6b6b', '#ffd34a', '#6bcbff', '#7be38f', '#c79bf2', '#ff9ad0'];

/** 現代：青空の校舎と校庭、遠くのビル。文化祭は風船、体育祭は万国旗とリレー、修学旅行はバスが走る */
export function present(): EraView {
  const scene = baseScene({
    sky: [[0, '#2e78d0'], [0.6, '#86c0ee'], [1, '#e2f0f8']],
    fog: '#d2e4ee',
    fogNear: 60,
    fogFar: 230,
    hemi: ['#ffffff', '#6a6a5a', 1.8],
    sun: ['#ffffff', 2.2, [30, 60, 30]],
  });
  scene.add(ground('#7aa84a', 0.8, 101));
  // 校庭（土のグラウンド）
  const yard = mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshLambertMaterial({ color: '#c9a876' }), 0, 0.5, -46);
  yard.rotation.x = -Math.PI / 2;
  yard.scale.set(1.6, 0.6, 1);
  scene.add(yard);
  const track = mesh(new THREE.RingGeometry(18, 19, 40), new THREE.MeshBasicMaterial({ color: '#f4f1e8' }), 0, 0.55, -46);
  track.rotation.x = -Math.PI / 2;
  track.scale.set(1.6, 0.6, 1);
  scene.add(track);

  // 校舎（3階建て・時計台つき）
  const school = new THREE.Group();
  school.add(box(60, 13, 10, '#f2efe6'), box(61, 0.8, 11, '#c9c4b8', 0, 13));
  for (let f = 0; f < 3; f++) for (let i = 0; i < 12; i++) school.add(box(3, 2, 0.3, '#7fb0d8', -26 + i * 4.8, 1.6 + f * 4, 5.1));
  school.add(box(8, 20, 10.4, '#f2efe6', 0, 0, 0.2));
  const clock = mesh(new THREE.CircleGeometry(2.2, 20), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, 16.5, 5.5);
  const hand = box(0.2, 1.8, 0.1, '#222222', 0, 0, 0);
  hand.geometry.translate(0, -0.9, 0);
  hand.position.set(0, 16.5, 5.6);
  school.add(clock, hand);
  school.position.set(0, 0, -86);
  scene.add(school);

  // 遠くのビル
  const r = rng(6);
  for (let i = 0; i < 18; i++) {
    const h = 10 + r() * 26;
    scene.add(box(6 + r() * 6, h, 6, ['#9fb0c0', '#b8c4d0', '#8a9aac'][i % 3], -110 + i * 13, 0, -150 - r() * 20));
  }
  for (let i = 0; i < 10; i++) scene.add(tree(['#f7b8cc', '#5f9a3a'][i % 2], -70 + i * 15 + r() * 4, -64 - r() * 6, 1.2));
  // バスケットゴールとサッカーゴール
  scene.add(group(cyl(0.2, 0.2, 7, '#888888'), box(3, 2, 0.2, '#ffffff', 0, 6.4, 0.3)).translateX(-38).translateZ(-50));
  scene.add(group(cyl(0.15, 0.15, 3, '#ffffff', -3), cyl(0.15, 0.15, 3, '#ffffff', 3), box(6.3, 0.3, 0.3, '#ffffff', 0, 3)).translateX(36).translateZ(-46));

  const cloudTick = clouds(scene, { n: 9, y: [32, 46], speed: 1.6, seed: 101 });
  const birds = drift(scene, { n: 8, color: '#333333', size: 0.6, box: [0, 30, -70, 160, 6, 10], vel: [3, 0, 0], sway: 0.5, opacity: 0.6 });
  const fx = new Bursts(scene, 600, 1.1, false);
  const anims = new Anims();
  const movers: { g: THREE.Group; tick: (t: number) => void }[] = [];
  const temp = (g: THREE.Group, dur: number, fn: (p: number) => void) => {
    scene.add(g);
    const m = { g, tick: () => {} };
    movers.push(m);
    anims.add(dur, fn, () => {
      scene.remove(g);
      movers.splice(movers.indexOf(m), 1);
    });
  };

  return {
    scene,
    tick(t, dt) {
      cloudTick(dt);
      birds.tick(t, dt);
      fx.tick(dt, -1.2);
      anims.tick(dt);
      hand.rotation.z = -t * 0.05;
      movers.forEach((m) => m.tick(t));
    },
    fire(key) {
      if (key === 'bunkasai') {
        // 校庭から風船が空へ
        const g = new THREE.Group();
        const list = Array.from({ length: 24 }, (_, i) => {
          const b = group(ball(0.9, POP[i % POP.length], 0, 0, 0, 1), cyl(0.02, 0.02, 2, '#ffffff', 0, -2.6));
          b.position.set((Math.random() - 0.5) * 50, 0, -40 - Math.random() * 20);
          g.add(b);
          return { b, v: 3 + Math.random() * 3, ph: Math.random() * 6 };
        });
        temp(g, 12, (p) => list.forEach((x) => (x.b.position.y = p * 12 * x.v, (x.b.position.x += Math.sin(p * 20 + x.ph) * 0.02))));
        return true;
      }
      if (key === 'taiikusai') {
        // 万国旗とリレーの走者
        const g = new THREE.Group();
        for (let i = 0; i < 20; i++) {
          const f = mesh(new THREE.ConeGeometry(0.6, 1.2, 3), new THREE.MeshBasicMaterial({ color: POP[i % POP.length] }), -38 + i * 4, 16 - Math.sin((i / 19) * Math.PI) * 3, -60);
          f.rotation.x = Math.PI;
          g.add(f);
        }
        const runners = POP.slice(0, 4).map((c, i) => {
          const f = figure(c, '#f1c9a0', 0.9, '#222222');
          g.add(f);
          return { f, ph: i * 0.25 };
        });
        temp(g, 10, (p) =>
          runners.forEach((x) => {
            const a = p * Math.PI * 4 + x.ph;
            x.f.position.set(Math.cos(a) * 29.6, Math.abs(Math.sin(p * 80)) * 0.3, -46 + Math.sin(a) * 11.1);
          }),
        );
        return true;
      }
      if (key === 'seitokai') {
        for (let i = 0; i < 4; i++) fx.emit(new THREE.Vector3(-30 + i * 20, 28, -70), 60, { spread: 8, up: 2, life: 4, colors: POP });
        const h = halo('#fff4c2', 30, 0);
        h.position.set(0, 18, -80);
        scene.add(h);
        anims.add(3, (p) => (h.material.opacity = Math.sin(p * Math.PI) * 0.7), () => scene.remove(h));
        return true;
      }
      if (key === 'shugakuryoko') {
        const bus = group(box(10, 3.6, 3.2, '#f2efe6'), box(10.1, 1, 3.3, '#3a8ad0', 0, 1.2), box(9, 1, 3.3, '#7fb0d8', 0, 2.2));
        for (const x of [-3.4, 3.4]) for (const z of [-1.6, 1.6]) bus.add(cyl(0.7, 0.7, 0.4, '#222222', x, -0.2, z).rotateX(Math.PI / 2));
        temp(bus, 8, (p) => bus.position.set(-90 + p * 180, 0.7 + Math.abs(Math.sin(p * 90)) * 0.1, -26));
        return true;
      }
      return false;
    },
  };
}
