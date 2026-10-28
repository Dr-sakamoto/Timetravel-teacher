import * as THREE from 'three';
import { Anims, Bursts, ball, baseScene, clouds, cyl, drift, ease, flash, glow, ground, group, halo, mat, mesh, orb, palm, pine, rng, type EraView } from '../kit';

interface Dino {
  g: THREE.Group;
  legs: THREE.Object3D[];
}

/** 四つ足の首長竜（ブラキオサウルス）：胴・長い首・小さな頭・しっぽ・4本の脚 */
function longneck(color: string, s = 1): Dino {
  const g = new THREE.Group();
  const body = ball(2.4 * s, color, 0, 4.2 * s, 0, 1);
  body.scale.set(1.6, 1, 1);
  const neck = cyl(0.5 * s, 0.9 * s, 7 * s, color, 0, 0, 0);
  neck.position.set(2.6 * s, 4.6 * s, 0);
  neck.rotation.z = -0.5;
  const head = ball(0.8 * s, color, 6.4 * s, 10.6 * s, 0, 1);
  head.scale.set(1.5, 0.8, 0.8);
  const tail = mesh(new THREE.ConeGeometry(1 * s, 7 * s, 6), mat(color), -6 * s, 3.6 * s, 0);
  tail.rotation.z = Math.PI / 2 + 0.2;
  g.add(body, neck, head, tail);
  const legs = [-1.8, 1.8].flatMap((x) => [-1, 1].map((z) => cyl(0.5 * s, 0.6 * s, 3.4 * s, color, x * s, 0, z * 1.1 * s)));
  g.add(...legs);
  return { g, legs };
}

/** 二本足の恐竜（ティラノサウルス・パラサウロロフス・小さな泥棒） */
function biped(color: string, s = 1, crest?: string): Dino {
  const g = new THREE.Group();
  const body = ball(1.6 * s, color, 0, 3.4 * s, 0, 1);
  body.scale.set(1.7, 0.9, 0.9);
  body.rotation.z = 0.2;
  const head = ball(1 * s, color, 2.6 * s, 4.8 * s, 0, 0);
  head.scale.set(1.6, 0.9, 0.9);
  const tail = mesh(new THREE.ConeGeometry(0.9 * s, 5 * s, 6), mat(color), -3.6 * s, 3.4 * s, 0);
  tail.rotation.z = Math.PI / 2 + 0.15;
  g.add(body, head, tail);
  if (crest) {
    const c = mesh(new THREE.ConeGeometry(0.3 * s, 2.6 * s, 4), mat(crest), 1.6 * s, 5.9 * s, 0);
    c.rotation.z = 1.1;
    g.add(c);
  }
  const legs = [-0.6, 0.6].map((z) => cyl(0.35 * s, 0.55 * s, 2.4 * s, color, 0, 0, z * s));
  g.add(...legs);
  return { g, legs };
}

function walk(d: Dino, t: number, speed: number) {
  d.legs.forEach((l, i) => (l.rotation.z = Math.sin(t * speed + i * Math.PI) * 0.35));
}

/** 翼竜：胴と三角の翼をぱたぱた */
function ptero(color: string): { g: THREE.Group; wings: THREE.Mesh[] } {
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 3.4, 1.4, 0, 0.2], 3));
  wingGeo.computeVertexNormals();
  const m = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, flatShading: true });
  const w1 = new THREE.Mesh(wingGeo, m);
  const w2 = new THREE.Mesh(wingGeo, m);
  w2.scale.z = -1;
  const body = ball(0.5, color);
  body.scale.set(2.4, 0.6, 0.6);
  return { g: group(body, w1, w2), wings: [w1, w2] };
}

/** 白亜紀：火山と羊歯の森。首長竜がのんびり歩き、翼竜が舞う */
export function cretaceous(): EraView {
  const scene = baseScene({
    sky: [[0, '#3c6d8a'], [0.55, '#9fc4b2'], [0.88, '#efc488'], [1, '#f6d69e']],
    fog: '#cdbf96',
    fogNear: 45,
    fogFar: 200,
    hemi: ['#fff0d0', '#4d5a2a', 1.6],
    sun: ['#ffe2b0', 2, [30, 40, 10]],
  });
  scene.add(ground('#5d7d38', 1.8, 3));
  const r = rng(21);

  // 火山（てっぺんに溶岩の光、煙がもくもく）
  const volcanoes: THREE.Vector3[] = [];
  for (const [x, z, h] of [[-48, -120, 36], [36, -150, 28]] as const) {
    const v = mesh(new THREE.CylinderGeometry(h * 0.12, h * 0.75, h, 7), mat('#4b3b36'), x, h / 2, z);
    scene.add(v);
    const lava = orb('#ff6a1a', h * 0.1, '#ff5a1a', h * 0.9);
    lava.position.set(x, h + 0.5, z);
    scene.add(lava);
    volcanoes.push(new THREE.Vector3(x, h + 1, z));
  }
  const smoke = volcanoes.map((v, i) => drift(scene, { n: 60, color: '#6f6563', size: 7, box: [v.x + 6, v.y + 12, v.z, 16, 26, 8], vel: [1.2, 2.2, 0], sway: 0.8, opacity: 0.35, seed: i + 40 }));

  // 森（ソテツとヤシと針葉樹）
  for (let i = 0; i < 26; i++) {
    const x = -90 + r() * 180;
    const z = -30 - r() * 70;
    if (Math.abs(x) < 10 && z > -50) continue;
    scene.add(r() < 0.55 ? palm(x, z, 0.8 + r() * 0.6, '#3f7a32', i) : pine('#2f5f34', x, z, 1.3 + r()));
  }

  // 首長竜の群れ（ゆっくり右へ歩き、端まで行ったら戻ってくる）
  const necks = [longneck('#7d8c6a', 1.2), longneck('#8a8a70', 0.9), longneck('#6f7f5d', 0.7)];
  necks.forEach((d, i) => {
    d.g.position.set(-60 + i * 22, 0, -78 - i * 8);
    scene.add(d.g);
  });
  const pteros = Array.from({ length: 3 }, (_, i) => {
    const p = ptero('#8a5a3c');
    scene.add(p.g);
    return { ...p, r: 18 + i * 8, h: 26 + i * 4, ph: i * 2.1 };
  });

  const dust = drift(scene, { n: 120, color: '#f2e3b0', size: 0.35, box: [0, 8, -30, 110, 14, 50], vel: [0.6, 0.3, 0], sway: 0.7, additive: true, opacity: 0.6 });
  const cloudTick = clouds(scene, { n: 6, color: '#f6efe0', y: [34, 46], speed: 0.9, seed: 2 });
  const fx = new Bursts(scene, 800, 1.6, false);
  const fire = new Bursts(scene, 400, 1.4, true);
  const anims = new Anims();
  const runners: { d: Dino; speed: number; leg: number }[] = [];

  /** 左から右へ駆け抜ける恐竜（しばらくして消える） */
  const runAcross = (d: Dino, z: number, speed: number, dur: number, leg: number, carry?: THREE.Object3D) => {
    if (carry) d.g.add(carry);
    scene.add(d.g);
    const item = { d, speed, leg };
    runners.push(item);
    anims.add(
      dur,
      (p) => {
        d.g.position.set(-80 + p * 160, Math.abs(Math.sin(p * 60)) * 0.3, z);
        if (Math.random() < 0.3) fx.emit(d.g.position, 2, { spread: 2, up: 1, life: 1.2, colors: ['#cdb88a', '#b9a070'] });
      },
      () => {
        scene.remove(d.g);
        runners.splice(runners.indexOf(item), 1);
      },
    );
  };

  return {
    scene,
    tick(t, dt) {
      smoke.forEach((s) => s.tick(t, dt));
      dust.tick(t, dt);
      cloudTick(dt);
      fx.tick(dt, -1);
      fire.tick(dt, -2);
      anims.tick(dt);
      necks.forEach((d, i) => {
        d.g.position.x += dt * (1.1 - i * 0.2);
        if (d.g.position.x > 90) d.g.position.x = -90;
        walk(d, t, 1.6);
        d.g.children[2].position.y = d.g.children[2].position.y + Math.sin(t * 0.7 + i) * 0.004;
      });
      pteros.forEach((p) => {
        const a = t * 0.25 + p.ph;
        p.g.position.set(Math.cos(a) * p.r, p.h + Math.sin(a * 2) * 2, -60 + Math.sin(a) * 14);
        p.g.rotation.y = -a;
        const f = Math.sin(t * 6 + p.ph) * 0.6;
        p.wings[0].rotation.x = f;
        p.wings[1].rotation.x = -f;
      });
      runners.forEach((x) => walk(x.d, t, x.leg));
    },
    fire(key) {
      if (key === 'meteor') {
        // 空を横切って地平線に落ちる火の玉 → 閃光と土けむり
        const rock = group(mesh(new THREE.IcosahedronGeometry(2.2, 0), glow('#ffcf7a')), halo('#ff7a2a', 22, 0.9));
        scene.add(rock);
        const from = new THREE.Vector3(-90, 80, -120);
        const to = new THREE.Vector3(30, 0, -140);
        anims.add(
          2.2,
          (p) => {
            rock.position.copy(from).lerp(to, ease.inOut(p));
            fire.emit(rock.position, 6, { spread: 3, up: 0, life: 1.2, colors: ['#ff8a2a', '#ffd34a', '#ff4a1a'] });
          },
          () => {
            scene.remove(rock);
            flash(scene, anims, '#ffb070', 1.8, 4);
            fx.emit(to, 260, { spread: 30, up: 14, life: 4, colors: ['#8a7a6a', '#a89070', '#5a4a40'], box: 20 });
            fire.emit(to, 200, { spread: 26, up: 12, life: 2.5, colors: ['#ff8a2a', '#ffd34a'], box: 10 });
          },
        );
        return true;
      }
      if (key === 'trex_hunt') {
        const d = biped('#5a4a3a', 1.6);
        runAcross(d, -34, 1, 4.5, 14);
        return true;
      }
      if (key === 'migration') {
        for (let i = 0; i < 6; i++) setTimeout(() => runAcross(biped('#7a8a5a', 0.9, '#b0603a'), -44 - (i % 3) * 5, 1, 12, 7), i * 700);
        return true;
      }
      if (key === 'egg_theft') {
        const egg = ball(0.6, '#f4ead2', 2.2, 3.4, 0, 1);
        egg.scale.y = 1.3;
        runAcross(biped('#c07a3a', 0.6), -28, 1, 3.5, 18, egg);
        return true;
      }
      return false;
    },
  };
}
