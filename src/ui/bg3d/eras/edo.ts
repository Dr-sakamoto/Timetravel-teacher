import * as THREE from 'three';
import { Anims, Bursts, baseScene, box, clouds, cyl, flame, flash, flicker, gable, ground, group, halo, mat, mesh, rng, water, type EraView } from '../kit';

/** 江戸：浮世絵のような富士山と、瓦屋根の町並み、火の見やぐら。大火では町に火が燃え広がる */
export function edo(): EraView {
  const scene = baseScene({
    sky: [[0, '#24507f'], [0.6, '#8fb8d6'], [0.9, '#f1e2c2'], [1, '#f6e8cc']],
    fog: '#dfe4dc',
    fogNear: 50,
    fogFar: 220,
    hemi: ['#ffffff', '#5a5a4a', 1.6],
    sun: ['#fff4dc', 2, [30, 50, 30]],
  });
  scene.add(ground('#7a8a5a', 1, 81));
  scene.add(water('#2f6aa0', 160, 60, 80, -60, 0.6));

  // 富士山
  const fuji = mesh(new THREE.ConeGeometry(70, 46, 9, 1, true), mat('#4f6a9a'), -20, 23, -170);
  const snow = mesh(new THREE.ConeGeometry(23.5, 15.4, 9, 1), mat('#f6f6f2'), -20, 46 - 7.7, -170);
  scene.add(fuji, snow);

  // 町並み（瓦屋根の長屋）
  const r = rng(5);
  const roofs: THREE.Vector3[] = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 11; i++) {
      const x = -70 + i * 11 + r() * 3;
      const z = -40 - row * 12 - r() * 3;
      const h = group(box(9, 3.4, 6, ['#d9c9a8', '#c9b48a', '#e2d4b6'][(i + row) % 3]), gable(10, 2.6, 7, '#3d4250', 3.4));
      h.position.set(x, 0, z);
      scene.add(h);
      roofs.push(new THREE.Vector3(x, 5, z));
    }
  // 火の見やぐら
  const tower = group(cyl(0.3, 0.3, 18, '#5a3d26', -1.5, 0, 0, 4), cyl(0.3, 0.3, 18, '#5a3d26', 1.5, 0, 0, 4), box(4.4, 0.4, 4.4, '#5a3d26', 0, 18), box(4, 2.6, 0.2, '#5a3d26', 0, 18.4, 0));
  tower.add(cyl(0.6, 0.6, 1.2, '#b08a3a', 0, 19, 0));
  tower.position.set(22, 0, -52);
  scene.add(tower);
  // 赤い提灯（ぼんやり光る）
  const lanterns = Array.from({ length: 8 }, (_, i) => {
    const l = group(mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a3a' })), halo('#ff8a4a', 4, 0.5));
    l.position.set(-60 + i * 15, 4.4, -34);
    scene.add(l);
    return l;
  });
  // 帆かけ舟
  const boats = Array.from({ length: 3 }, (_, i) => {
    const b = group(box(5, 0.9, 1.6, '#6a4a2a'), cyl(0.1, 0.1, 5, '#4a2a18', 0, 0.8), mesh(new THREE.PlaneGeometry(2.4, 3), new THREE.MeshLambertMaterial({ color: '#f2ead6', side: THREE.DoubleSide }), 0, 4, 0.1));
    b.position.set(50 + i * 18, 0.6, -50 - i * 14);
    scene.add(b);
    return b;
  });

  const cloudTick = clouds(scene, { n: 6, y: [30, 40], speed: 1, seed: 81, scale: 1.2 });
  const fx = new Bursts(scene, 600, 1.4, true);
  const smoke = new Bursts(scene, 500, 4, false);
  const anims = new Anims();
  const fires: { f: THREE.Group; at: THREE.Vector3 }[] = [];

  /** 夜空の花火（富くじ・浮世絵） */
  const hanabi = (n: number) => {
    for (let i = 0; i < n; i++)
      setTimeout(() => {
        const at = new THREE.Vector3(-40 + Math.random() * 80, 28 + Math.random() * 10, -80);
        const cols = [['#ff6b6b', '#ffd34a'], ['#6bcbff', '#ffffff'], ['#c79bf2', '#ff8ab0'], ['#7be38f', '#ffd34a']][i % 4];
        fx.emit(at, 120, { spread: 16, up: 0, life: 1.8, colors: cols });
      }, i * 600);
  };

  return {
    scene,
    tick(t, dt) {
      cloudTick(dt);
      fx.tick(dt, -1.6);
      smoke.tick(dt, 1.2);
      anims.tick(dt);
      lanterns.forEach((l, i) => (l.rotation.z = Math.sin(t * 1.4 + i) * 0.1));
      boats.forEach((b, i) => {
        b.position.x -= dt * (0.8 + i * 0.2);
        if (b.position.x < 20) b.position.x = 100;
        b.position.y = 0.6 + Math.sin(t * 1.3 + i) * 0.2;
      });
      fires.forEach((x, i) => {
        flicker(x.f.children[0], t, i);
        flicker(x.f.children[1], t, i + 1);
        if (Math.random() < dt * 3) smoke.emit(x.at.clone().add(new THREE.Vector3(0, 3, 0)), 1, { spread: 1.5, up: 2, life: 3, colors: ['#5a5050', '#6a6060'] });
      });
    },
    fire(key) {
      if (key === 'taika') {
        // となりの家へ順に燃え移り、しばらくして消し止められる
        const start = Math.floor(Math.random() * 8);
        for (let i = 0; i < 8; i++)
          setTimeout(() => {
            const at = roofs[(start + i) % roofs.length];
            const f = flame(2.4);
            f.position.copy(at);
            scene.add(f);
            const item = { f, at };
            fires.push(item);
            setTimeout(() => {
              anims.add(1.5, (p) => f.scale.setScalar(Math.max(0.01, 1 - p)), () => {
                scene.remove(f);
                fires.splice(fires.indexOf(item), 1);
              });
            }, 7000 - i * 400);
          }, i * 450);
        flash(scene, anims, '#ff7a3a', 1, 1.5);
        return true;
      }
      if (key === 'tomikuji' || key === 'ukiyoe') {
        hanabi(key === 'tomikuji' ? 6 : 3);
        return true;
      }
      if (key === 'sakoku') {
        // 南蛮船が来て、引き返していく
        const ship = group(box(10, 2.4, 3, '#3a2a1a'), cyl(0.15, 0.15, 10, '#2a1a10', 0, 2), mesh(new THREE.PlaneGeometry(4, 5), new THREE.MeshLambertMaterial({ color: '#f2ead6', side: THREE.DoubleSide }), 0, 7, 0.1));
        scene.add(ship);
        anims.add(10, (p) => {
          const k = Math.sin(p * Math.PI);
          ship.position.set(130 - k * 60, 0.8, -70);
          ship.rotation.y = p < 0.5 ? 0 : Math.PI;
        }, () => scene.remove(ship));
        return true;
      }
      return false;
    },
  };
}
