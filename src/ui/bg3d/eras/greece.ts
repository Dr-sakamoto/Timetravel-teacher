import * as THREE from 'three';
import { Anims, Bursts, approach, baseScene, box, clouds, cone, cyl, ease, flame, flicker, gable, ground, group, halo, mat, mesh, orb, rng, tree, water, type EraView } from '../kit';

/** 柱の並ぶ神殿（パルテノン） */
function temple(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(24, 1.2, 12, '#e9e2d0'), box(22, 0.8, 10.4, '#f2ecdc', 0, 1.2, 0));
  for (let i = 0; i < 8; i++) for (const z of [-4.4, 4.4]) g.add(cyl(0.55, 0.65, 7, '#f6f1e4', -9.6 + i * 2.74, 2, z, 10));
  g.add(box(22.6, 1.4, 10.6, '#ece5d4', 0, 9, 0));
  // 正面に三角の破風
  g.add(gable(23, 3, 11, '#e6dcc6', 10.4));
  return g;
}

/** 三段の櫂の船（ゆらゆら浮かぶ） */
function ship(sail: string): THREE.Group {
  const hull = box(8, 1.4, 2, '#7a4a2a');
  const prow = cone(1, 2.4, '#7a4a2a', 4.6, 0.2, 0, 4);
  prow.rotation.z = -Math.PI / 2;
  const mast = cyl(0.12, 0.12, 6, '#5a3a20', 0, 1.4, 0);
  const s = mesh(new THREE.PlaneGeometry(4, 3.4), new THREE.MeshLambertMaterial({ color: sail, side: THREE.DoubleSide }), 0, 5, 0.1);
  return group(hull, prow, mast, s);
}

/** ギリシャ・ローマ：青い海と白い神殿、オリーブの丘 */
export function greece(): EraView {
  const scene = baseScene({
    sky: [[0, '#1f63b8'], [0.6, '#76b4e6'], [1, '#e6f2f6']],
    fog: '#cfe3ee',
    fogNear: 60,
    fogFar: 230,
    hemi: ['#ffffff', '#8a7a5a', 1.7],
    sun: ['#fff8e6', 2.3, [20, 60, 30]],
  });
  scene.add(ground('#b7a868', 1.4, 31));
  const sea = water('#2b7cc0', 420, 120, 0, -150, 0.6);
  scene.add(sea);

  // アクロポリスの丘と神殿
  const hill = mesh(new THREE.CylinderGeometry(22, 34, 12, 9), mat('#cbb98a'), -16, 6, -92);
  scene.add(hill);
  const t = temple();
  t.position.set(-16, 12, -92);
  t.rotation.y = 0.15;
  scene.add(t);

  // 円形闘技場（コロッセオ）
  const arena = new THREE.Group();
  const ring = mesh(new THREE.CylinderGeometry(11, 12, 7, 20, 1, true), new THREE.MeshLambertMaterial({ color: '#d8b98a', side: THREE.DoubleSide, flatShading: true }), 0, 3.5, 0);
  arena.add(ring);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const arch = box(1, 2.4, 0.3, '#8a6a4a', Math.cos(a) * 12.05, 1.6, Math.sin(a) * 12.05);
    arch.rotation.y = -a + Math.PI / 2;
    arena.add(arch);
  }
  arena.position.set(38, 0, -80);
  scene.add(arena);

  // 聖火台（オリンピックで火がともる）
  const pillar = cyl(1, 1.3, 10, '#efe8d8', 18, 0, -48);
  const bowl = cyl(2, 0.8, 1.4, '#b08a4a', 18, 10, -48);
  const torch = flame(2.2);
  torch.position.set(18, 11.4, -48);
  torch.scale.setScalar(0.01);
  scene.add(pillar, bowl, torch);

  // オリーブと糸杉
  const r = rng(8);
  for (let i = 0; i < 16; i++) {
    const x = -80 + r() * 160;
    const z = -36 - r() * 40;
    if (Math.abs(x - 18) < 6) continue;
    scene.add(r() < 0.6 ? tree('#8a9a5b', x, z, 0.9 + r() * 0.4) : group(cyl(0.2, 0.2, 1, '#5a3d26'), cone(1, 8, '#2f4f2f', 0, 0.6, 0, 6)).translateX(x).translateZ(z));
  }

  const ships = ['#f4efe0', '#c94a3a', '#f4efe0'].map((c, i) => {
    const s = ship(c);
    s.position.set(-60 + i * 50, 0.6, -130 - i * 10);
    scene.add(s);
    return s;
  });

  // かもめ（V字の線）
  const gulls = Array.from({ length: 5 }, (_, i) => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 3, 8, Math.PI), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    w.position.set(-40 + i * 18, 28 + (i % 2) * 5, -70);
    scene.add(w);
    return w;
  });

  const sun = orb('#fffbe6', 3.6, '#fff4cc', 30);
  sun.position.set(60, 52, -170);
  scene.add(sun);
  const cloudTick = clouds(scene, { n: 7, y: [34, 46], speed: 1.4, seed: 17 });
  const fx = new Bursts(scene, 600, 1.1, true);
  const dust = new Bursts(scene, 400, 1.8, false);
  const anims = new Anims();
  let fireOn = 0;
  let fireTarget = 0;

  return {
    scene,
    tick(t, dt) {
      cloudTick(dt);
      fx.tick(dt, -1.5);
      dust.tick(dt, -0.5);
      anims.tick(dt);
      ships.forEach((s, i) => {
        s.position.x += dt * 0.8;
        if (s.position.x > 110) s.position.x = -110;
        s.position.y = 0.6 + Math.sin(t * 1.2 + i) * 0.25;
        s.rotation.z = Math.sin(t + i) * 0.04;
      });
      gulls.forEach((g, i) => {
        g.position.x += dt * 3;
        if (g.position.x > 70) g.position.x = -70;
        g.position.y += Math.sin(t * 2 + i) * 0.02;
        g.scale.y = 0.6 + Math.sin(t * 5 + i) * 0.3;
      });
      fireOn = approach(fireOn, fireTarget, dt, 1.5);
      torch.scale.setScalar(Math.max(0.01, fireOn));
      if (fireOn > 0.1) {
        flicker(torch.children[0], t);
        flicker(torch.children[1], t, 2);
        if (Math.random() < dt * 10 * fireOn) fx.emit(torch.position.clone().add(new THREE.Vector3(0, 2, 0)), 1, { spread: 1.5, up: 3, life: 1.2, colors: ['#ffb04a', '#ffd34a'] });
      }
    },
    fire(key) {
      if (key === 'olympia') {
        fireTarget = 1;
        fx.emit(torch.position, 120, { spread: 8, up: 6, life: 1.8, colors: ['#ffb04a', '#ffd34a', '#ffffff'] });
        setTimeout(() => (fireTarget = 0), 12000);
        return true;
      }
      if (key === 'colosseum') {
        dust.emit(new THREE.Vector3(38, 4, -80), 160, { spread: 10, up: 5, life: 2.4, colors: ['#e2c89a', '#cdb07a'], box: 16 });
        fx.emit(new THREE.Vector3(38, 8, -80), 80, { spread: 10, up: 6, life: 1.6, colors: ['#ffffff', '#ffd34a'] });
        return true;
      }
      if (key === 'socratic') {
        const h = halo('#fff4c2', 60, 0);
        h.position.set(-16, 20, -92);
        scene.add(h);
        anims.add(4, (p) => (h.material.opacity = ease.bump(p) * 0.8), () => scene.remove(h));
        return true;
      }
      if (key === 'ostracism') {
        dust.emit(new THREE.Vector3(0, 20, -50), 140, { spread: 14, up: 4, life: 3, colors: ['#b8603a', '#d07a4a', '#8a4a2a'] });
        return true;
      }
      return false;
    },
  };
}
