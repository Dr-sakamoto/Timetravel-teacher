import * as THREE from 'three';
import { Anims, Bursts, approach, ball, baseScene, box, cloud, clouds, cyl, drift, ease, figure, flash, glow, ground, group, halo, mat, mesh, orb, ridge, roof, tree, water, type Cue, type EraView } from '../kit';

/** かぐや姫が降り立つところ（月から光の道をたどってここまで降りてくる） */
const LAND = new THREE.Vector3(-17, 8, -38);
const MOON = new THREE.Vector3(34, 34, -110);

/** かぐや姫（十二単の重なった円すい・長い黒髪・後光） */
function kaguya(): { g: THREE.Group; orbs: THREE.Mesh[]; aura: THREE.Sprite } {
  const g = new THREE.Group();
  const s = 1.9;
  // 十二単：外から赤・山吹・白と重ねる
  g.add(mesh(new THREE.ConeGeometry(1.5 * s, 3.2 * s, 10), mat('#c7364a'), 0, 1.6 * s, 0));
  g.add(mesh(new THREE.ConeGeometry(1.15 * s, 3.0 * s, 10), mat('#f0b43c'), 0, 1.75 * s, 0.25 * s));
  g.add(mesh(new THREE.ConeGeometry(0.8 * s, 2.8 * s, 10), mat('#f7f2e8'), 0, 1.95 * s, 0.4 * s));
  g.add(ball(0.55 * s, '#fbe3cf', 0, 3.75 * s, 0.05 * s, 1));
  // 長い黒髪（頭の後ろから足もとまで）
  g.add(mesh(new THREE.SphereGeometry(0.6 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#1c1a22'), 0, 3.8 * s, -0.02 * s));
  g.add(box(1.0 * s, 3.4 * s, 0.25 * s, '#1c1a22', 0, 0.5 * s, -0.55 * s));
  // 羽衣（ふわりと浮かぶ輪）
  const robe = mesh(new THREE.TorusGeometry(1.7 * s, 0.08 * s, 6, 28), glow('#f6e9ff', 0.85), 0, 2.6 * s, 0);
  robe.rotation.x = Math.PI / 2.3;
  robe.name = 'robe';
  g.add(robe);
  const aura = halo('#fff4c2', 14, 0.55);
  aura.position.y = 2.6 * s;
  g.add(aura);
  // 乗ってくる雲
  const c = cloud(77, '#fdf7ff', 0.75);
  c.position.y = -0.4;
  g.add(c);
  // 頼んでいる5つの宝（差し出されたものから金色に光る）
  const orbs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const o = mesh(new THREE.OctahedronGeometry(0.42, 0), glow('#6b6b80'));
    g.add(o);
    orbs.push(o);
  }
  return { g, orbs, aura };
}

/** 平安：夕暮れの都。寝殿造の屋敷、五重塔、桜。かぐや姫の難題では、月からかぐや姫が降りてくる */
export function heian(): EraView {
  const scene = baseScene({
    sky: [[0, '#151a45'], [0.45, '#3b3a78'], [0.8, '#c47b9c'], [1, '#f2b39a']],
    fog: '#8a6a96',
    fogNear: 50,
    fogFar: 200,
    hemi: ['#c9b6ff', '#3a3550', 1.5],
    sun: ['#ffd6b0', 1.2, [40, 30, -20]],
  });
  scene.add(ground('#4f6a4c', 1.4, 23));
  scene.add(ridge('#3e3f72', -150, 9, [18, 30], 4, 300), ridge('#55508a', -120, 8, [10, 18], 9, 260));

  // 星
  const stars = drift(scene, { n: 140, color: '#ffffff', size: 0.7, box: [0, 70, -170, 380, 50, 10], vel: [0, 0, 0], additive: true, opacity: 0.8, seed: 9 });

  // 月
  const moon = orb('#fff6d6', 6, '#fff1b8', 46);
  moon.position.copy(MOON);
  scene.add(moon);
  const moonLight = new THREE.PointLight('#fff1c8', 0, 200);
  moonLight.position.copy(MOON);
  scene.add(moonLight);

  // 池と朱の反り橋（五条大橋）
  scene.add(water('#2c4a74', 70, 16, 4, -40, 0.5));
  const bridge = mesh(new THREE.TorusGeometry(10, 0.7, 6, 20, Math.PI), mat('#c8432f'), 4, -5.5, -40);
  bridge.scale.set(1, 0.85, 4);
  scene.add(bridge);
  for (let i = -1; i <= 1; i += 2) scene.add(cyl(0.2, 0.2, 3, '#c8432f', 4 + i * 8.5, 0, -38), cyl(0.2, 0.2, 3, '#c8432f', 4 + i * 8.5, 0, -42));

  // 寝殿造の屋敷
  const hall = new THREE.Group();
  hall.add(box(26, 1.2, 12, '#7a6650'));
  for (let i = 0; i < 7; i++) hall.add(cyl(0.35, 0.35, 5, '#c8432f', -12 + i * 4, 1.2, 5.4), cyl(0.35, 0.35, 5, '#c8432f', -12 + i * 4, 1.2, -5.4));
  hall.add(box(24, 4.6, 10, '#efe2c4', 0, 1.2, 0));
  hall.add(roof(32, 6, 16, '#3c3a40', 6.2));
  // 窓あかり
  for (let i = 0; i < 5; i++) {
    const w = halo('#ffb84d', 4, 0.6);
    w.position.set(-9 + i * 4.5, 3.6, 5.3);
    hall.add(w);
  }
  hall.position.set(-34, 0, -70);
  hall.rotation.y = 0.25;
  scene.add(hall);

  // 五重塔
  const pagoda = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = 1 - i * 0.12;
    pagoda.add(box(6 * s, 2.4, 6 * s, '#b8452f', 0, i * 3.6, 0), roof(11 * s, 1.6, 11 * s, '#3a3a44', i * 3.6 + 2.2));
  }
  pagoda.add(cyl(0.15, 0.15, 6, '#c9a84a', 0, 19.5, 0));
  pagoda.position.set(36, 0, -82);
  scene.add(pagoda);

  // 桜
  const sakura = ['#f7b8cc', '#f4a6bf', '#fbd0dc'];
  [[-8, -52], [14, -56], [-52, -46], [52, -50], [24, -36], [-22, -30], [62, -66]].forEach(([x, z], i) => scene.add(tree(sakura[i % 3], x, z, 1.4 + (i % 3) * 0.25, '#4d3428')));
  const petals = drift(scene, { n: 220, color: '#ffc6d6', size: 0.55, box: [0, 9, -38, 110, 18, 50], vel: [1.6, -0.9, 0], sway: 1.4, opacity: 0.9, seed: 4 });
  const cloudTick = clouds(scene, { n: 6, color: '#c9a6c9', y: [30, 42], speed: 0.8, seed: 13 });
  const fx = new Bursts(scene, 500, 1.0, true);
  const anims = new Anims();

  // ---------- かぐや姫 ----------
  const k = kaguya();
  k.g.visible = false;
  k.g.scale.setScalar(0.01);
  scene.add(k.g);
  // 月からの光の道
  const beamGeo = new THREE.CylinderGeometry(0.6, 4, 1, 12, 1, true);
  beamGeo.translate(0, 0.5, 0);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  scene.add(beam);
  const aimBeam = () => {
    const from = k.g.position.clone().add(new THREE.Vector3(0, 2, 0));
    const dir = MOON.clone().sub(from);
    beam.position.copy(from);
    beam.scale.set(1, dir.length(), 1);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  };

  /** 'gone'=いない 'down'=降りてくる 'stay'=滞在中 'up'=月へ帰る */
  let state: 'gone' | 'down' | 'stay' | 'up' = 'gone';
  let offered = 0;
  /** 月へ帰っている途中に、また来ることになった */
  let again = false;
  let moonBoost = 0;
  let moonTarget = 0;

  const path = (p: number) => {
    // 月から弧を描いて降りてくる
    const v = MOON.clone().lerp(LAND, p);
    v.y += Math.sin(p * Math.PI) * 8;
    return v;
  };
  const descend = () => {
    state = 'down';
    k.g.visible = true;
    flash(scene, anims, '#fff2c0', 1.4, 1.5);
    anims.add(1.2, (p) => (beam.material.opacity = ease.out(p) * 0.22));
    anims.add(
      6,
      (p) => {
        const e = ease.inOut(p);
        k.g.position.copy(path(e));
        k.g.scale.setScalar(0.15 + e * 0.85);
        aimBeam();
        if (Math.random() < 0.5) fx.emit(k.g.position, 2, { spread: 2, up: -0.5, life: 1.6, colors: ['#fff4c2', '#ffffff', '#ffd6f0'] });
      },
      () => {
        state = 'stay';
        anims.add(2, (p) => (beam.material.opacity = (1 - p) * 0.17 + 0.05));
        fx.emit(LAND, 90, { spread: 6, up: 2, life: 2, colors: ['#fff4c2', '#ffd6f0'] });
      },
    );
  };
  const ascend = () => {
    state = 'up';
    const from = k.g.position.clone();
    anims.add(0.8, (p) => (beam.material.opacity = 0.05 + ease.out(p) * 0.17));
    anims.add(
      6,
      (p) => {
        const e = ease.inOut(p);
        k.g.position.copy(from.clone().lerp(MOON, e));
        k.g.position.y += Math.sin(e * Math.PI) * 6;
        k.g.scale.setScalar(1 - e * 0.9);
        aimBeam();
      },
      () => {
        state = 'gone';
        k.g.visible = false;
        anims.add(1.5, (p) => (beam.material.opacity = (1 - p) * 0.22));
        if (again) {
          again = false;
          descend();
        }
        fx.emit(MOON, 80, { spread: 8, up: 0, life: 2, colors: ['#fff4c2'] });
      },
    );
  };

  return {
    scene,
    tick(t, dt) {
      stars.points.material.opacity = 0.6 + Math.sin(t * 0.8) * 0.2;
      petals.tick(t, dt);
      cloudTick(dt);
      fx.tick(dt, -0.4);
      anims.tick(dt);
      if (state === 'stay') {
        k.g.position.set(LAND.x, LAND.y + Math.sin(t * 0.9) * 0.6, LAND.z);
        aimBeam();
      }
      if (state !== 'gone') {
        const robe = k.g.getObjectByName('robe')!;
        robe.rotation.z = t * 0.4;
        k.orbs.forEach((o, i) => {
          const a = t * 0.6 + (i / 5) * Math.PI * 2;
          o.position.set(Math.cos(a) * 3.6, 3.4 + Math.sin(a * 2) * 0.4, Math.sin(a) * 3.6);
          o.rotation.y = t * 2;
          const lit = i < offered;
          (o.material as THREE.MeshBasicMaterial).color.set(lit ? '#ffd34a' : '#6b6b80');
          o.scale.setScalar(lit ? 1.25 + Math.sin(t * 4 + i) * 0.1 : 0.85);
        });
        k.aura.material.opacity = 0.45 + Math.sin(t * 1.6) * 0.12;
      }
      moonBoost = approach(moonBoost, moonTarget, dt, 1.2);
      moon.scale.setScalar(1 + moonBoost * 0.45);
      moonLight.intensity = moonBoost * 60;
    },
    apply(cue: Cue) {
      const here = !!cue.kaguya;
      if (here && state === 'gone') descend();
      // 帰り始めたら、帰りきってからまた降りてくる
      again = here && state === 'up';
      if (!here && (state === 'stay' || state === 'down')) ascend();
      const n = cue.kaguya?.offered ?? 0;
      if (n > offered && state !== 'gone') fx.emit(k.g.position.clone().add(new THREE.Vector3(0, 4, 0)), 80, { spread: 7, up: 2, life: 1.8, colors: ['#ffd34a', '#fff4c2'] });
      offered = n;
    },
    fire(key) {
      if (key === 'mochizuki') {
        moonTarget = 1;
        setTimeout(() => (moonTarget = 0), 7000);
        fx.emit(MOON, 120, { spread: 10, up: 0, life: 2.5, colors: ['#fff4c2', '#ffe08a'] });
        return true;
      }
      if (key === 'genji') {
        fx.emit(new THREE.Vector3(-34, 8, -66), 140, { spread: 8, up: 3, life: 2.4, colors: ['#ffc6d6', '#ffffff', '#c9a6ff'] });
        return true;
      }
      if (key === 'gojo') {
        // 弁慶が橋の上に仁王立ち
        const benkei = group(figure('#2a2a30', '#d9a77a', 1.6), cyl(0.1, 0.1, 6, '#5a3d26', 1.4, 0, 0));
        benkei.position.set(4, 3, -40);
        benkei.scale.setScalar(0.01);
        scene.add(benkei);
        anims.add(0.8, (p) => benkei.scale.setScalar(Math.max(0.01, ease.out(p))));
        setTimeout(() => anims.add(1, (p) => benkei.scale.setScalar(Math.max(0.01, 1 - p)), () => scene.remove(benkei)), 6000);
        return true;
      }
      if (key === 'kaguya') {
        // かぐや姫の到着そのものは apply が受け持つ（滞在の状態に合わせる）
        if (state === 'stay') fx.emit(k.g.position.clone().add(new THREE.Vector3(0, 4, 0)), 60, { spread: 6, up: 2, life: 1.6, colors: ['#ffd34a', '#fff4c2'] });
        return true;
      }
      return false;
    },
  };
}
