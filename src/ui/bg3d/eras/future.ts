import * as THREE from 'three';
import { Anims, Bursts, approach, ball, baseScene, box, cyl, drift, ease, flash, glow, group, halo, mesh, rng, type EraView } from '../kit';

const NEON = ['#4dd0e1', '#ff4fd8', '#7c5cff', '#5cffb0'];

/** 未来：夜のネオン都市と環のある惑星。空飛ぶ車が行き交う。火星人の留学ではUFOが降りてくる */
export function future(): EraView {
  const scene = baseScene({
    sky: [[0, '#05061a'], [0.5, '#1a1450'], [0.85, '#4a2a7a'], [1, '#8a4a9a']],
    fog: '#2a1a4a',
    fogNear: 50,
    fogFar: 220,
    hemi: ['#8a7aff', '#1a1a2a', 1.3],
    sun: ['#9ad8ff', 1.2, [20, 40, 30]],
  });
  // 光る格子の地面
  const floor = mesh(new THREE.PlaneGeometry(420, 260), new THREE.MeshLambertMaterial({ color: '#141430' }), 0, 0, -100);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(400, 80, '#4dd0e1', '#2a3a7a');
  grid.position.set(0, 0.05, -100);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.35;
  scene.add(grid);

  const stars = drift(scene, { n: 220, color: '#ffffff', size: 0.6, box: [0, 70, -170, 400, 60, 10], vel: [0, 0, 0], additive: true, opacity: 0.8, seed: 2 });

  // 環のある惑星
  const planet = group(ball(14, '#c86a9a', 0, 0, 0, 2), halo('#ff9ad0', 60, 0.25));
  const ring = mesh(new THREE.RingGeometry(18, 25, 48), new THREE.MeshBasicMaterial({ color: '#f2c8e0', side: THREE.DoubleSide, transparent: true, opacity: 0.6, fog: false }));
  ring.rotation.x = Math.PI / 2.6;
  planet.add(ring);
  planet.position.set(-60, 58, -200);
  scene.add(planet);

  // ネオンのタワー（光の帯が脈打つ）
  const r = rng(11);
  const bands: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < 16; i++) {
    const h = 14 + r() * 40;
    const w = 4 + r() * 4;
    const x = -100 + i * 13 + r() * 4;
    const z = -80 - r() * 50;
    const t = group(box(w, h, w, '#1e1e40'));
    for (let k = 1; k < h / 6; k++) {
      const m = glow(NEON[(i + k) % NEON.length], 0.85);
      bands.push(m);
      t.add(mesh(new THREE.BoxGeometry(w + 0.2, 0.4, w + 0.2), m, 0, k * 6, 0));
    }
    t.add(cyl(0.1, 0.1, 5, '#8a8aaa', 0, h), halo(NEON[i % 4], 4, 0.8).translateY(h + 5));
    t.position.set(x, 0, z);
    scene.add(t);
  }
  // 浮かぶリング
  const hoop = mesh(new THREE.TorusGeometry(9, 0.4, 8, 48), glow('#4dd0e1', 0.9), 22, 26, -70);
  scene.add(hoop);

  // 空飛ぶ車（光の尾を引いて行き交う）
  const cars = Array.from({ length: 10 }, (_, i) => {
    const c = group(box(2, 0.7, 1, '#d8e0f0'), halo(NEON[i % 4], 3, 0.8));
    c.position.set(-100 + r() * 200, 14 + (i % 4) * 6, -50 - (i % 3) * 14);
    scene.add(c);
    return { c, v: (i % 2 ? 1 : -1) * (8 + r() * 6) };
  });

  const fx = new Bursts(scene, 700, 1.2, true);
  const anims = new Anims();
  let pulse = 0;
  let robot: THREE.Group | null = null;

  return {
    scene,
    tick(t, dt) {
      stars.points.material.opacity = 0.6 + Math.sin(t * 0.7) * 0.2;
      fx.tick(dt, -1);
      anims.tick(dt);
      planet.rotation.y = t * 0.03;
      hoop.rotation.y = t * 0.4;
      hoop.rotation.x = Math.sin(t * 0.3) * 0.4;
      pulse = approach(pulse, 0, dt, 0.6);
      bands.forEach((m, i) => (m.opacity = 0.5 + Math.sin(t * 2 + i * 0.7) * 0.25 + pulse * 0.5));
      cars.forEach((x) => {
        x.c.position.x += x.v * dt;
        if (x.c.position.x > 110) x.c.position.x = -110;
        if (x.c.position.x < -110) x.c.position.x = 110;
      });
      if (robot) robot.rotation.y = Math.sin(t) * 0.3;
    },
    fire(key) {
      if (key === 'martian') {
        // UFOが降りてきて光を当て、また飛び去る
        const ufo = group(
          mesh(new THREE.SphereGeometry(4, 16, 6), new THREE.MeshLambertMaterial({ color: '#b8c0d0', flatShading: true })),
          mesh(new THREE.SphereGeometry(1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glow('#7cffb0', 0.85), 0, 0.6, 0),
        );
        (ufo.children[0] as THREE.Mesh).scale.y = 0.3;
        const beam = mesh(new THREE.ConeGeometry(5, 18, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#7cffb0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 0, -9, 0);
        ufo.add(beam);
        scene.add(ufo);
        anims.add(9, (p) => {
          const down = p < 0.3 ? ease.out(p / 0.3) : p > 0.75 ? 1 - ease.inOut((p - 0.75) / 0.25) : 1;
          ufo.position.set(-10 + (p > 0.75 ? (p - 0.75) * 300 : 0), 60 - down * 38, -55);
          ufo.rotation.y = p * 20;
          (beam.material as THREE.MeshBasicMaterial).opacity = p > 0.32 && p < 0.72 ? 0.3 + Math.sin(p * 60) * 0.08 : 0;
        }, () => scene.remove(ufo));
        return true;
      }
      if (key === 'robocon') {
        if (robot) return true;
        const bot = group(box(4, 5, 3, '#c8d0e0'), box(3, 2.4, 2.6, '#c8d0e0', 0, 5.2), ball(0.5, '#ff4fd8', -0.7, 6.6, 1.4), ball(0.5, '#ff4fd8', 0.7, 6.6, 1.4), box(1, 4, 1, '#8a90a0', -2.6, 0.6), box(1, 4, 1, '#8a90a0', 2.6, 0.6));
        bot.scale.setScalar(2.2);
        bot.position.set(-30, -20, -60);
        robot = bot;
        scene.add(bot);
        anims.add(2.5, (p) => (bot.position.y = -20 + ease.out(p) * 20), () =>
          setTimeout(() => anims.add(2, (p) => (bot.position.y = -p * 22), () => {
            scene.remove(bot);
            robot = null;
          }), 6000),
        );
        fx.emit(new THREE.Vector3(-30, 2, -60), 120, { spread: 10, up: 6, life: 1.6, colors: ['#4dd0e1', '#ffffff'] });
        return true;
      }
      if (key === 'singularity') {
        pulse = 1.5;
        flash(scene, anims, '#7c5cff', 1.2, 2);
        return true;
      }
      if (key === 'timemachine') {
        const portal = group(mesh(new THREE.TorusGeometry(6, 0.6, 8, 40), glow('#ffd34a')), halo('#ffe680', 30, 0.7));
        portal.position.set(0, 18, -60);
        scene.add(portal);
        anims.add(5, (p) => {
          portal.scale.setScalar(Math.max(0.01, ease.bump(p) * 1.4));
          portal.rotation.z = p * 12;
          if (Math.random() < 0.5) fx.emit(portal.position, 4, { spread: 6, up: 0, life: 1, colors: ['#ffd34a', '#ffffff', '#4dd0e1'] });
        }, () => scene.remove(portal));
        flash(scene, anims, '#ffe6a0', 1, 1.5);
        return true;
      }
      return false;
    },
  };
}
