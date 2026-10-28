import * as THREE from 'three';
import { Anims, Bursts, approach, baseScene, box, clouds, cone, cyl, ease, gable, ground, group, halo, mat, mesh, rng, tree, water, type Cue, type EraView } from '../kit';

/** 丸い塔（とんがり屋根つき） */
function tower(r: number, h: number, roofColor: string, wall = '#b9b2a4'): THREE.Group {
  return group(cyl(r, r * 1.05, h, wall, 0, 0, 0, 10), cone(r * 1.3, r * 2.4, roofColor, 0, h, 0, 10));
}

/** 帆船（コロンブスのサンタ・マリア号） */
function caravel(): THREE.Group {
  const g = group(box(9, 2, 3, '#6a4026'), box(3, 1.4, 3, '#6a4026', -3.2, 2, 0));
  for (const [x, h] of [[2, 8], [-1, 9]] as const) {
    g.add(cyl(0.15, 0.15, h, '#4a2a18', x, 1.8, 0));
    const s = mesh(new THREE.PlaneGeometry(3.6, 3.8), new THREE.MeshLambertMaterial({ color: '#f2ead6', side: THREE.DoubleSide }), x, 1.8 + h * 0.6, 0.1);
    s.rotation.y = Math.PI / 2;
    g.add(s);
    const cross = box(0.9, 0.9, 0.05, '#c0392b', x, 1.8 + h * 0.55, 1.95);
    cross.rotation.y = Math.PI / 2;
    g.add(cross);
  }
  return g;
}

/** 中世・ルネサンス：丘の上のお城、大聖堂、風車の村。ペストのあいだは空がどんよりする */
export function europe(): EraView {
  const scene = baseScene({
    sky: [[0, '#3a6fb0'], [0.6, '#9ac0e0'], [1, '#e8eef0']],
    fog: '#c9d8de',
    fogNear: 50,
    fogFar: 210,
    hemi: ['#ffffff', '#4a6a3a', 1.6],
    sun: ['#fff6e0', 2.1, [30, 50, 20]],
  });
  const fog = scene.fog as THREE.Fog;
  const clear = { fog: new THREE.Color('#c9d8de'), sky: scene.background };
  const gloomSky = new THREE.Color('#6a7068');
  scene.add(ground('#6f9a4a', 3.2, 61));
  scene.add(water('#3f78a8', 120, 200, -150, -120, 0.8));

  // 丘の上のお城
  const hill = mesh(new THREE.CylinderGeometry(20, 32, 10, 9), mat('#5f8a40'), 30, 5, -95);
  const castle = new THREE.Group();
  castle.add(box(26, 7, 18, '#b9b2a4'));
  for (let i = 0; i < 9; i++) castle.add(box(1.6, 1.4, 1, '#b9b2a4', -12 + i * 3, 7, 9));
  const corners: [number, number][] = [[-13, -9], [13, -9], [-13, 9], [13, 9]];
  corners.forEach(([x, z]) => castle.add(tower(2.4, 11, '#3a5aa8').translateX(x).translateZ(z)));
  castle.add(box(8, 16, 8, '#c6bfb0'), cone(6, 8, '#b8402f', 0, 16, 0, 4), tower(1.6, 20, '#b8402f').translateX(5));
  castle.position.set(30, 10, -95);
  scene.add(hill, castle);

  // 大聖堂
  const church = group(box(10, 9, 22, '#d8cfbd'), gable(10, 5, 22, '#7a4a3a', 9), tower(2.6, 20, '#5a5a6a', '#d8cfbd').translateZ(11), tower(2.6, 20, '#5a5a6a', '#d8cfbd').translateZ(11).translateX(-5));
  church.position.set(-30, 0, -78);
  church.rotation.y = 0.5;
  scene.add(church);

  // 風車（羽根が回る）
  const mill = group(cyl(2, 3, 10, '#e8dcc0'), cone(3, 3.4, '#7a4a3a', 0, 10, 0, 8));
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const holder = new THREE.Group();
    holder.add(box(1.4, 8, 0.2, '#f2ead6'));
    holder.rotation.z = (i / 4) * Math.PI * 2;
    blades.add(holder);
  }
  blades.position.set(0, 9, 3.2);
  mill.add(blades);
  mill.position.set(-8, 0, -58);
  scene.add(mill);

  // 村の家
  const r = rng(4);
  for (let i = 0; i < 9; i++) {
    const h = group(box(5, 3.6, 4, ['#e9dcc0', '#d9c7a4', '#f0e6d0'][i % 3]), gable(5.6, 2.6, 4.4, ['#8a3a2a', '#6a4a3a'][i % 2], 3.6));
    h.position.set(-60 + i * 10 + r() * 4, 0, -44 - r() * 14);
    h.rotation.y = (r() - 0.5) * 0.8;
    scene.add(h);
  }
  for (let i = 0; i < 12; i++) scene.add(tree('#4f7f3a', -80 + r() * 160, -34 - r() * 50, 0.8 + r() * 0.6));

  const cloudTick = clouds(scene, { n: 8, y: [32, 44], speed: 1.2, seed: 61 });
  const fx = new Bursts(scene, 500, 1.1, true);
  const paper = new Bursts(scene, 300, 1.2, false);
  const anims = new Anims();
  let gloom = 0;
  let gloomTarget = 0;

  return {
    scene,
    tick(t, dt) {
      cloudTick(dt);
      fx.tick(dt, -1);
      paper.tick(dt, -1.2);
      anims.tick(dt);
      blades.rotation.z = t * 0.6;
      gloom = approach(gloom, gloomTarget, dt, 0.8);
      fog.color.copy(clear.fog).lerp(gloomSky, gloom);
      fog.far = 210 - gloom * 90;
      scene.background = gloom > 0.5 ? fog.color : clear.sky;
    },
    apply(cue: Cue) {
      gloomTarget = cue.plague ? 1 : 0;
    },
    fire(key) {
      if (key === 'columbus') {
        const ship = caravel();
        scene.add(ship);
        anims.add(16, (p) => {
          ship.position.set(-40 - p * 60, 0.8 + Math.sin(p * 40) * 0.2, -70 - p * 40);
          ship.rotation.y = Math.PI + 0.5;
        }, () => scene.remove(ship));
        return true;
      }
      if (key === 'printing') {
        paper.emit(new THREE.Vector3(-30, 16, -70), 160, { spread: 10, up: 6, life: 4, colors: ['#ffffff', '#f2ead6'] });
        return true;
      }
      if (key === 'monalisa') {
        const h = halo('#ffe6a0', 40, 0);
        h.position.set(-30, 12, -78);
        scene.add(h);
        anims.add(4, (p) => (h.material.opacity = ease.bump(p) * 0.8), () => scene.remove(h));
        fx.emit(new THREE.Vector3(-30, 14, -78), 100, { spread: 8, up: 3, life: 2, colors: ['#ffd34a', '#ffffff'] });
        return true;
      }
      if (key === 'plague') {
        gloomTarget = 1;
        return true;
      }
      return false;
    },
  };
}
