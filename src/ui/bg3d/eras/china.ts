import * as THREE from 'three';
import { Anims, Bursts, approach, ball, baseScene, box, clouds, cyl, drift, ease, flame, flash, flicker, ground, group, halo, mat, mesh, rng, roof, tree, water, type Cue, type EraView } from '../kit';

/** 水墨画のような切り立った岩山（桂林の山） */
function karst(h: number, color: string, seed: number): THREE.Group {
  const r = rng(seed);
  const rad = h * (0.22 + r() * 0.1);
  const body = mesh(new THREE.CylinderGeometry(rad * 0.75, rad, h, 7, 2), mat(color), 0, h / 2, 0);
  const top = ball(rad * 0.78, color, 0, h, 0, 0);
  top.scale.y = 0.7;
  const g = group(body, top);
  // てっぺんの木
  if (r() < 0.7) g.add(ball(rad * 0.4, '#3f6a48', rad * 0.2, h + rad * 0.5, 0));
  g.rotation.y = r() * 3;
  return g;
}

/** 帆の赤い船（赤壁で燃える） */
function junk(): { g: THREE.Group; fire: THREE.Group } {
  const hull = box(7, 1.4, 2.4, '#5a3a24');
  const sail = mesh(new THREE.PlaneGeometry(3.4, 4.6, 1, 4), new THREE.MeshLambertMaterial({ color: '#c0392b', side: THREE.DoubleSide }), 0, 4.2, 0);
  const mast = cyl(0.12, 0.12, 6.4, '#4a2a18', 0, 1.2, -0.05);
  const fire = flame(1.6);
  fire.position.set(0, 2.2, 0);
  fire.visible = false;
  return { g: group(hull, mast, sail, fire), fire };
}

/** 三国志：霧にかすむ岩山と大河、城壁の都。赤壁では船が燃え、桃園の誓いのあいだ桃の木が花をつける */
export function china(): EraView {
  const scene = baseScene({
    sky: [[0, '#6f8aa0'], [0.55, '#bfcdcb'], [1, '#ece6d2']],
    fog: '#d4d8cc',
    fogNear: 40,
    fogFar: 190,
    hemi: ['#f6f2e6', '#5a6a5a', 1.6],
    sun: ['#fff1d6', 1.6, [-30, 40, 20]],
  });
  scene.add(ground('#6d8a5a', 1.2, 41));
  scene.add(water('#6f98a8', 420, 22, 0, -62, 0.5));

  // 岩山を奥へ何列も
  const r = rng(12);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 9; i++) {
      const h = 18 + r() * 26 - row * 2;
      const k = karst(h, ['#4a6a52', '#5f7a68', '#7a8c84'][row], row * 40 + i);
      k.position.set(-120 + i * 30 + r() * 12, 0, -95 - row * 28 - r() * 10);
      scene.add(k);
    }
  }

  // 城壁と門楼
  const wall = new THREE.Group();
  wall.add(box(60, 6, 4, '#8a7a66'));
  for (let i = 0; i < 12; i++) wall.add(box(2.4, 1.4, 4.2, '#8a7a66', -27.5 + i * 5, 6, 0));
  wall.add(box(12, 6, 6, '#a0392f', 0, 6, 0), roof(18, 3.5, 10, '#2f3a3a', 12), box(9, 3.6, 5, '#a0392f', 0, 15.4, 0), roof(14, 3, 8, '#2f3a3a', 19));
  wall.position.set(28, 0, -48);
  wall.rotation.y = -0.2;
  scene.add(wall);
  // 草ぶきの庵（三顧の礼で光る）
  const hut = group(box(6, 3, 5, '#c4a77a'), roof(9, 3.4, 8, '#8a7a4a', 3));
  hut.position.set(-36, 0, -40);
  scene.add(hut);
  // 桃の木（桃園の誓いのあいだ、花が咲く）
  const peach = [tree('#5f8a4a', -20, -32, 1.5), tree('#5f8a4a', -27, -36, 1.2), tree('#5f8a4a', -14, -38, 1.1)];
  scene.add(...peach);
  const crowns = peach.map((p) => p.children[1] as THREE.Mesh);
  crowns.forEach((c) => (c.material = new THREE.MeshLambertMaterial({ color: '#5f8a4a', flatShading: true })));

  const boats = [0, 1, 2, 3].map((i) => {
    const b = junk();
    b.g.position.set(-70 + i * 34, 0.6, -60 + (i % 2) * 4);
    scene.add(b.g);
    return b;
  });

  const mist = drift(scene, { n: 70, color: '#ffffff', size: 16, box: [0, 6, -80, 260, 10, 60], vel: [1.2, 0, 0], sway: 0.4, opacity: 0.18, seed: 5 });
  const cloudTick = clouds(scene, { n: 5, color: '#f2f2ec', y: [34, 44], speed: 0.7, seed: 31 });
  const petals = drift(scene, { n: 120, color: '#ffb3c8', size: 0.6, box: [-20, 8, -34, 40, 14, 20], vel: [1, -0.8, 0], sway: 1.2, opacity: 0, seed: 6 });
  const fx = new Bursts(scene, 600, 1.2, true);
  const anims = new Anims();
  let bloom = 0;
  let bloomTarget = 0;
  let burning = 0;

  return {
    scene,
    tick(t, dt) {
      mist.tick(t, dt);
      cloudTick(dt);
      petals.tick(t, dt);
      fx.tick(dt, -0.8);
      anims.tick(dt);
      boats.forEach((b, i) => {
        b.g.position.x += dt * (0.9 + i * 0.1);
        if (b.g.position.x > 100) b.g.position.x = -100;
        b.g.position.y = 0.6 + Math.sin(t + i * 1.7) * 0.2;
        b.fire.visible = burning > 0;
        if (burning > 0) {
          flicker(b.fire.children[0], t, i);
          if (Math.random() < dt * 8) fx.emit(b.g.position.clone().add(new THREE.Vector3(0, 4, 0)), 1, { spread: 2, up: 4, life: 1.4, colors: ['#ff8a2a', '#ffd34a'] });
        }
      });
      burning = Math.max(0, burning - dt);
      bloom = approach(bloom, bloomTarget, dt, 1);
      crowns.forEach((c) => (c.material as THREE.MeshLambertMaterial).color.set('#5f8a4a').lerp(new THREE.Color('#f7a8c4'), bloom));
      petals.points.material.opacity = bloom * 0.9;
    },
    apply(cue: Cue) {
      bloomTarget = cue.oath ? 1 : 0;
    },
    fire(key) {
      if (key === 'chibi') {
        burning = 10;
        flash(scene, anims, '#ff7a3a', 1.6, 2);
        boats.forEach((b) => fx.emit(b.g.position.clone().add(new THREE.Vector3(0, 3, 0)), 60, { spread: 8, up: 6, life: 2, colors: ['#ff8a2a', '#ffd34a', '#ff4a1a'] }));
        return true;
      }
      if (key === 'changban') {
        // 一喝の衝撃波
        const ring = mesh(new THREE.TorusGeometry(1, 0.25, 6, 40), new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: 0.9, fog: false }), 0, 10, -45);
        scene.add(ring);
        anims.add(1.6, (p) => {
          ring.scale.setScalar(1 + ease.out(p) * 40);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p);
        }, () => scene.remove(ring));
        return true;
      }
      if (key === 'sangu') {
        const h = halo('#fff4c2', 30, 0);
        h.position.set(-36, 4, -40);
        scene.add(h);
        anims.add(5, (p) => (h.material.opacity = ease.bump(p) * 0.9), () => scene.remove(h));
        return true;
      }
      if (key === 'taoyuan') {
        fx.emit(new THREE.Vector3(-20, 8, -34), 140, { spread: 8, up: 3, life: 2.4, colors: ['#ffb3c8', '#ffffff', '#ff8ab0'] });
        return true;
      }
      return false;
    },
  };
}
