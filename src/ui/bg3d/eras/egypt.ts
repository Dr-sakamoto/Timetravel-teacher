import * as THREE from 'three';
import { Anims, Bursts, approach, baseScene, box, clouds, drift, ease, figure, ground, group, halo, mat, mesh, orb, palm, water, type Cue, type EraView } from '../kit';

/** 大ピラミッドの段の数（石を積んだ割合に合わせて下から1段ずつ現れる） */
const LAYERS = 10;

/** 古代エジプト：砂漠とナイル川。真ん中の大ピラミッドは、ゲームで積んだ石の分だけ下から組み上がっていく */
export function egypt(): EraView {
  const scene = baseScene({
    sky: [[0, '#2f6fb3'], [0.55, '#8fc0e0'], [0.85, '#f3dca6'], [1, '#f7e3b5']],
    fog: '#f1dcaa',
    fogNear: 60,
    fogFar: 220,
    hemi: ['#fff4d8', '#b38a4a', 1.7],
    sun: ['#fff1cc', 2.2, [-40, 60, 10]],
  });
  scene.add(ground('#e0bd78', 3.2, 11));
  // ナイル川と岸の緑
  const nile = water('#3f8fbf', 420, 9, 0, -38, 0.4);
  nile.rotation.z = 0.06;
  scene.add(nile);
  const banks = [water('#7da94a', 420, 5, 0, -45, 0.3), water('#7da94a', 420, 5, 0, -31, 0.3)];
  for (const b of banks) {
    (b.material as THREE.MeshLambertMaterial).opacity = 1;
    b.rotation.z = 0.06;
    scene.add(b);
  }
  for (let i = 0; i < 9; i++) scene.add(palm(-70 + i * 17 + (i % 2) * 5, -29 - (i % 3), 1.1, '#4b9a3e', i + 2));
  for (let i = 0; i < 7; i++) scene.add(palm(-60 + i * 21, -48 - (i % 2) * 2, 1.2, '#3f8f3a', i + 20));

  // 遠くの完成したピラミッド（ギザの3つのうち2つ）
  const far = (x: number, z: number, s: number) => {
    const m = mesh(new THREE.ConeGeometry(s * 0.72, s, 4), mat('#d9b46c'), x, s / 2, z);
    m.rotation.y = Math.PI / 4 + 0.2;
    scene.add(m);
  };
  far(-62, -125, 18);
  far(-40, -135, 14);

  // スフィンクス
  const sph = new THREE.Group();
  sph.add(box(9, 2.6, 3.4, '#c9a25e', 0, 0, 0), box(3, 3.2, 3, '#c9a25e', -4.2, 1.6, 0), box(3.6, 1.2, 3.6, '#3d63a8', -4.2, 3.6, 0));
  sph.position.set(-30, 0, -62);
  sph.rotation.y = 0.5;
  scene.add(sph);

  // オベリスク（ヒエログリフで光る）
  const obelisk = mesh(new THREE.CylinderGeometry(0.6, 1.1, 14, 4), mat('#d6b06a', '#000000'), 44, 7, -58);
  const tip = mesh(new THREE.ConeGeometry(0.85, 1.6, 4), mat('#f3c94c'), 44, 14.8, -58);
  scene.add(obelisk, tip);
  obelisk.position.x = tip.position.x = 58;

  // 太陽
  const sun = orb('#fff6d0', 4, '#ffe6a0', 34);
  sun.position.set(-48, 46, -150);
  scene.add(sun);

  // ---------- 大ピラミッド ----------
  const site = new THREE.Group();
  site.position.set(30, 0, -76);
  scene.add(site);
  const W = 34;
  const H = 23;
  const layerH = H / LAYERS;
  // 土台（まだ石がなくても、どこに建つかが分かる）
  site.add(box(W + 2, 0.4, W + 2, '#b8955a'));
  const layers: THREE.Mesh[] = [];
  for (let i = 0; i < LAYERS; i++) {
    const w = W * (1 - i / LAYERS);
    const m = box(w, layerH, w, i % 2 ? '#d8b56d' : '#cfaa63', 0, 0.4 + i * layerH, 0);
    m.visible = false;
    site.add(m);
    layers.push(m);
  }
  // 頂上の金のキャップストーン（完成したら光る）
  const cap = mesh(new THREE.ConeGeometry(W / LAYERS / 1.4, layerH * 1.6, 4), mat('#ffd34a', '#7a5a00'), 0, 0.4 + H + layerH * 0.6, 0);
  cap.rotation.y = Math.PI / 4;
  cap.visible = false;
  const capGlow = halo('#ffe680', 16, 0);
  capGlow.position.copy(cap.position);
  site.add(cap, capGlow);
  // 石を運ぶ坂道と、石を引く人たち（建設中だけ）
  const ramp = box(5, 0.8, 30, '#a88650', 0, 0, 0);
  ramp.geometry.translate(0, 0, -15);
  ramp.position.set(-W / 2 - 6, 0, 18);
  site.add(ramp);
  const crew: { g: THREE.Group; ph: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const g = group(figure('#f4ecd8', '#a8703f', 1.1), box(1.6, 1.2, 1.6, '#cfaa63', 1.6, 0, 0));
    g.position.set(-W / 2 - 14 - i * 3, 0, 12 - i * 4);
    site.add(g);
    crew.push({ g, ph: i * 1.3 });
  }
  const stones = [box(1.8, 1.2, 1.8, '#cfaa63', -W / 2 - 4, 0, 8), box(1.8, 1.2, 1.8, '#d8b56d', -W / 2 - 2, 0, 11), box(1.8, 1.2, 1.8, '#cfaa63', -W / 2 - 5, 1.2, 9)];
  site.add(...stones);

  const sand = drift(scene, { n: 260, color: '#f6e2b4', size: 0.45, box: [0, 6, -30, 120, 12, 60], vel: [3.2, 0.1, 0], sway: 1.2, opacity: 0.7 });
  const cloudTick = clouds(scene, { n: 5, y: [32, 44], speed: 1.2, seed: 5 });
  const fx = new Bursts(scene, 500, 1.2, false);
  const sparks = new Bursts(scene, 300, 0.9, true);
  const anims = new Anims();

  let shown = 0;
  let building = false;
  let done = false;
  let flood = 0;
  let floodTarget = 0;
  let carve = 0;

  const showLayers = (n: number) => {
    for (let i = shown; i < n; i++) {
      const m = layers[i];
      const y = m.position.y;
      m.visible = true;
      // 上から降りてきて、どすんと置かれる
      anims.add(0.7, (p) => (m.position.y = y + (1 - ease.out(p)) * 6), () => fx.emit(site.localToWorld(new THREE.Vector3(0, y, W / 2 - i)), 30, { spread: 6, up: 2, life: 1.4, colors: ['#e9d1a0', '#d8b880'], box: W - i * 3 }));
    }
    for (let i = n; i < shown; i++) layers[i].visible = false;
    shown = n;
  };

  return {
    scene,
    tick(t, dt) {
      sand.tick(t, dt);
      cloudTick(dt);
      fx.tick(dt, -2);
      sparks.tick(dt, -1);
      anims.tick(dt);
      crew.forEach((c, i) => {
        c.g.visible = building;
        // 坂道のほうへ行ったり来たり
        const k = (Math.sin(t * 0.35 + c.ph) + 1) / 2;
        c.g.position.x = -W / 2 - 14 - i * 3 + k * 8;
        c.g.position.y = Math.abs(Math.sin(t * 6 + c.ph)) * 0.2;
      });
      ramp.visible = building;
      stones.forEach((s) => (s.visible = building || shown === 0));
      flood = approach(flood, floodTarget, dt, 0.8);
      nile.scale.y = 1 + flood * 1.6;
      banks.forEach((b, i) => {
        b.position.z = (i ? -31 : -45) + (i ? 1 : -1) * flood * 6;
        b.scale.y = 1 + flood;
      });
      carve = approach(carve, 0, dt, 0.5);
      (obelisk.material as THREE.MeshLambertMaterial).emissive.setRGB(carve * 0.9, carve * 0.6, 0);
      if (done) {
        capGlow.material.opacity = 0.55 + Math.sin(t * 2) * 0.2;
        if (Math.random() < dt * 4) sparks.emit(site.localToWorld(cap.position.clone()), 2, { spread: 4, up: 1, life: 1.2, colors: ['#fff2a0', '#ffd34a'] });
      }
    },
    apply(cue: Cue) {
      const py = cue.pyramid;
      building = !!py && !py.done;
      const want = py ? (py.done ? LAYERS : Math.min(LAYERS - 1, Math.floor(py.progress * LAYERS))) : 0;
      if (want !== shown) showLayers(want);
      const nowDone = !!py?.done;
      if (nowDone && !done) {
        cap.visible = true;
        const y = cap.position.y;
        anims.add(1.2, (p) => (cap.position.y = y + (1 - ease.out(p)) * 10));
        anims.add(2.4, (p) => (capGlow.material.opacity = ease.bump(p) * 1.2));
        sparks.emit(site.localToWorld(new THREE.Vector3(0, H, 0)), 160, { spread: 14, up: 5, life: 2.2, colors: ['#fff2a0', '#ffd34a', '#ffffff'] });
      }
      if (!nowDone) {
        cap.visible = false;
        capGlow.material.opacity = 0;
      }
      done = nowDone;
    },
    fire(key) {
      if (key === 'nile') {
        floodTarget = 1;
        setTimeout(() => (floodTarget = 0), 6000);
        return true;
      }
      if (key === 'hieroglyph') {
        carve = 1.4;
        sparks.emit(new THREE.Vector3(58, 10, -58), 80, { spread: 5, up: 3, life: 1.8, colors: ['#ffe680', '#ffffff'] });
        return true;
      }
      if (key === 'mummy') {
        sparks.emit(new THREE.Vector3(-62, 12, -125), 120, { spread: 8, up: 4, life: 2.2, colors: ['#ffd34a', '#7fd6ff'] });
        sparks.emit(new THREE.Vector3(-40, 9, -135), 90, { spread: 7, up: 4, life: 2.2, colors: ['#ffd34a', '#7fd6ff'] });
        return true;
      }
      if (key === 'giza') {
        fx.emit(site.localToWorld(new THREE.Vector3(0, 1, W / 2)), 120, { spread: 10, up: 3, life: 2, colors: ['#e9d1a0', '#d8b880'], box: W });
        return true;
      }
      return false;
    },
  };
}

