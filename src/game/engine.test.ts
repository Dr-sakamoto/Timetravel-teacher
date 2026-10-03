import { describe, expect, it } from 'vitest';
import { cpuAction } from './ai';
import { MAX_CLASS, STARTING_MEMBERS, attrScore, contributions, roleSlots, termNo, testScore, validRoles, validUnlock } from './calc';
import { CARDS, parseAttrs, toIcons } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import { ERA_CARDS, PERSON_CARDS_PER_TERM } from './data/events';
import { ARCHETYPES, MODERN_POOL } from './data/modern';
import { currentEra, deckBreakdown, droppable, newGame, step } from './engine';
import type { Attr, GameState, Player, RoleSeat, Student } from './types';

function playOut(players: number, years: number, seed: number): GameState {
  let s = newGame(
    Array.from({ length: players }, (_, i) => ({ name: `P${i + 1}`, isCpu: true })),
    years,
    seed,
  );
  let steps = 0;
  while (s.phase.kind !== 'gameOver') {
    const a = cpuAction(s);
    if (!a) throw new Error('no action');
    const next = step(s, a);
    if (next === s) throw new Error(`action rejected: ${JSON.stringify(a)} in ${s.phase.kind}`);
    s = next;
    if (++steps > 20000) throw new Error('did not finish');
  }
  return s;
}

const mk = (uid: string, attrs: Attr[], era: Student['era'] = 'present'): Student => ({
  uid, name: uid, title: '', era, rarity: 'N', icon: '', attrs, flavor: '', joined: '', mvp: 0,
});
const player = (students: Student[], roles: RoleSeat[] = []): Player => ({
  id: 0, name: 'A', isCpu: false, color: '', students, unlocked: [...new Set(roles.map((r) => r.role))], roles, points: 0,
});

describe('engine', () => {
  for (const players of [2, 3, 4, 5]) {
    for (const years of [1, 2, 3]) {
      it(`completes a ${players}-player ${years}-year CPU game`, () => {
        const s = playOut(players, years, players * 100 + years);
        expect(s.year).toBe(years);
        for (const p of s.players) {
          expect(Number.isFinite(p.points)).toBe(true);
          expect(p.students.length).toBeGreaterThanOrEqual(2);
          expect(p.students.length).toBeLessThanOrEqual(MAX_CLASS);
          expect(new Set(p.students.map((x) => x.uid)).size).toBe(p.students.length);
        }
        const cards = s.players.flatMap((p) => p.students.map((x) => x.cardId).filter(Boolean));
        expect(new Set(cards).size).toBe(cards.length);
      });
    }
  }

  it('deals 6 random modern students one card at a time, alternating', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 1);
    const order: number[] = [];
    while (s.phase.kind === 'memberDraw') {
      order.push(s.phase.player);
      s = step(s, { type: 'drawMember' });
    }
    expect(order.slice(0, 4)).toEqual([0, 1, 0, 1]);
    expect(order).toHaveLength(12);
    expect(s.phase.kind).toBe('roles');
    for (const p of s.players) {
      expect(p.students).toHaveLength(6);
      expect(p.students.every((x) => x.era === 'present' && x.attrs.length >= 1 && x.attrs.length <= 3)).toBe(true);
    }
  });

  it('cards sum all holders, and a role holder counts double', () => {
    const p = player([mk('a', ['study', 'study', 'study']), mk('b', ['study', 'study', 'art']), mk('c', ['sports'])], [{ role: 'study', uid: 'a' }]);
    expect(attrScore(p, 'study')).toMatchObject({ sum: 5, bonus: 3, total: 8 });
    expect(attrScore(p, 'fight').total).toBe(0);
    // 係のアイコンを持っていない子が就いても +1 は付かない
    const q = player([mk('c', ['sports'])], [{ role: 'study', uid: 'c' }]);
    expect(attrScore(q, 'study').total).toBe(0);
  });

  it('era cards double students from that era', () => {
    const p = player([mk('a', ['sports', 'sports'], 'sengoku'), mk('b', ['sports', 'sports'])]);
    expect(attrScore(p, 'sports', 'sengoku').total).toBe(6);
  });

  it('yankees defend against raids but hurt tests', () => {
    const y = player([mk('a', ['sports', 'fight']), mk('b', ['fight', 'fight'])]);
    const n = player([mk('a', ['study']), mk('b', ['study', 'study'])]);
    expect(attrScore(y, 'fight').total).toBeGreaterThan(attrScore(n, 'fight').total);
    expect(testScore(n, 1)).toBeGreaterThan(testScore(y, 1));
    expect(testScore(y, 1)).toBeLessThan(0);
  });

  it('unlocks one role kind per term, starting with 1 (1年1学期→1 … 2年1学期→4)', () => {
    const slots = (year: number, term: number) => roleSlots(termNo(year, term));
    expect([[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [3, 3]].map(([y, t]) => slots(y, t))).toEqual([1, 2, 3, 4, 4, 4]);
  });

  it('regular modern students have 1-2 icons, each with a different set', () => {
    const regular = ARCHETYPES.filter((a) => a.rarity === 'N');
    const keys = regular.map((a) => [...parseAttrs(a.attrs)].sort().join(','));
    expect(regular.every((a) => parseAttrs(a.attrs).length <= 2)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('roles: one per student, one per role, within the unlocked kinds', () => {
    const p = player(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((u) => mk(u, ['study'])));
    const r = (role: RoleSeat['role'], uid: string): RoleSeat => ({ role, uid });
    const all: RoleSeat['role'][] = ['study', 'pe', 'culture', 'leader'];
    expect(validRoles(p, [r('study', 'a'), r('pe', 'b'), r('culture', 'c'), r('leader', 'd')], all)).toBe(true);
    expect(validRoles(p, [r('study', 'a'), r('study', 'b')], all)).toBe(false);
    expect(validRoles(p, [r('study', 'a'), r('pe', 'a')], all)).toBe(false);
    expect(validRoles(p, [r('study', 'a'), r('pe', 'b')], ['study'])).toBe(false);
    expect(validRoles(p, [r('study', 'zz')], all)).toBe(false);
  });

  it('unlock: pick exactly the new kinds for this term, never one already unlocked', () => {
    const p = { ...player([mk('a', ['study'])]), unlocked: ['study' as const] };
    expect(validUnlock(p, ['pe'], 2)).toBe(true);
    expect(validUnlock(p, [], 2)).toBe(false);
    expect(validUnlock(p, ['study'], 2)).toBe(false);
    expect(validUnlock(p, ['pe', 'culture'], 2)).toBe(false);
    expect(validUnlock(p, [], 1)).toBe(true);
  });

  it('fight icons belong only to yankees, and a good share of them are fight-only', () => {
    const all = [
      ...CARDS.map((c) => ({ name: c.name, attrs: c.attrs, tags: c.tags })),
      ...ARCHETYPES.map((a) => ({ name: a.title, attrs: parseAttrs(a.attrs), tags: a.tags })),
    ];
    for (const x of all) {
      if (x.attrs.includes('fight')) expect(x.tags, x.name).toContain('ヤンキー');
      else expect(x.tags, x.name).not.toContain('ヤンキー');
    }
    const yankees = all.filter((x) => x.tags.includes('ヤンキー'));
    const fightOnly = yankees.filter((x) => x.attrs.every((a) => a === 'fight'));
    // アイコン構成を被らせないので、👊だけの子は👊1〜5個の5種類が上限
    expect(fightOnly.length / yankees.length).toBeGreaterThanOrEqual(0.35);
    expect(fightOnly.length / yankees.length).toBeLessThanOrEqual(0.6);
  });

  it('picks 3 eras a year and person cards come from the current term era', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 2, 42);
    while (s.phase.kind !== 'gameOver') {
      expect(new Set(s.yearEras).size).toBe(3);
      if (s.year > 1) expect(s.yearEras).not.toContain(PRESENT_INDEX);
      const ph = s.phase;
      if (ph.kind === 'result' && ph.result.title === '転入' && ph.result.students?.length && ph.ctx === 'turn') {
        for (const o of ph.result.students) expect([ERAS[currentEra(s)].id, 'present']).toContain(o.era);
      }
      s = step(s, cpuAction(s)!);
    }
  });

  it('year 1 term 1 is the present era; era cards and person cards fill the deck', () => {
    const s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 2, 77);
    expect(s.yearEras[0]).toBe(PRESENT_INDEX);
    const era = ERAS[currentEra(s)].id;
    expect(s.eventDeck.some((id) => ERA_CARDS.some((e) => e.id === id && e.era === era))).toBe(true);
    expect(s.eventDeck.some((id) => ERA_CARDS.some((e) => e.id === id && e.era !== era))).toBe(false);
    const persons = s.eventDeck.filter((id) => id.startsWith('person:'));
    expect(persons).toHaveLength(PERSON_CARDS_PER_TERM);
    expect(persons.every((id) => id.startsWith('person:m:'))).toBe(true);
  });

  it('every era has 3-6 figures and 2 era events', () => {
    for (const era of ERAS.filter((e) => e.id !== 'present')) {
      const figures = CARDS.filter((c) => c.era === era.id).length;
      expect(figures, era.name).toBeGreaterThanOrEqual(3);
      expect(figures, era.name).toBeLessThanOrEqual(6);
      expect(ERA_CARDS.filter((c) => c.era === era.id)).toHaveLength(2);
    }
  });

  it('drawing a person card makes them join directly; a full class discards it and draws again', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 5);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const t = structuredClone(s);
    const m = `person:${t.pools.present[0]}`;
    t.eventDeck.push(m);
    const n = t.players[pi].students.length;
    expect(step(t, { type: 'drawEvent' }).players[pi].students).toHaveLength(n + 1);
    const f = structuredClone(s);
    while (f.players[pi].students.length < MAX_CLASS) f.players[pi].students.push({ ...f.players[pi].students[0], uid: `f${f.players[pi].students.length}` });
    f.eventDeck.push('n_study', m);
    const full = step(f, { type: 'drawEvent' });
    expect(full.players[pi].students).toHaveLength(MAX_CLASS);
    expect(full.discard.slice(-2)).toEqual([m, 'n_study']);
    expect(full.phase.kind).toBe('result');
  });

  it('starting members come from the regular modern students; later only the rare transfer students come from the present', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 9);
    expect(s.pools.present).toEqual(MODERN_POOL);
    expect(s.eventDeck.filter((id) => id.startsWith('person:')).every((id) => MODERN_POOL.includes(id.slice(7)))).toBe(true);
    const before = s.starters.length;
    while (s.phase.kind === 'memberDraw') s = step(s, cpuAction(s)!);
    expect(s.starters).toHaveLength(before - 3 * STARTING_MEMBERS);
    const ids = s.players.flatMap((p) => p.students.map((x) => x.cardId));
    expect(ids.every((id) => id && !s.starters.includes(id) && !MODERN_POOL.includes(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every figure and transfer student has a different set of icons', () => {
    const key = (attrs: Attr[]) => [...attrs].sort().join(',');
    const all = [
      ...CARDS.map((c) => ({ name: c.name, k: key(c.attrs) })),
      ...ARCHETYPES.filter((a) => a.rarity !== 'N').map((a) => ({ name: a.title, k: key(toIcons(a.attrs, a.rarity, a.power)) })),
    ];
    for (const x of all) expect(all.filter((y) => y.k === x.k).map((y) => y.name), x.name).toEqual([x.name]);
  });

  it('deck breakdown counts every card in the deck and discard pile', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 4);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    for (let i = 0; i < 6; i++) s = step(step(s, cpuAction(s)!), { type: 'continue' });
    const rows = deckBreakdown(s);
    const sum = (k: 'left' | 'used') => rows.reduce((a, r) => a + r[k], 0);
    expect(sum('left')).toBe(s.eventDeck.length);
    expect(sum('used')).toBe(s.discard.length);
    expect(rows.filter((r) => r.group === '通常').reduce((a, r) => a + r.left + r.used, 0)).toBe(19);
  });

  it('cards carry 1-5 icons, more for rarer students', () => {
    for (const c of CARDS) {
      expect(c.attrs.length).toBeGreaterThanOrEqual(2);
      expect(c.attrs.length).toBeLessThanOrEqual(5);
      if (c.rarity === 'SSR') expect(c.attrs.length, c.name).toBeGreaterThanOrEqual(4);
    }
    expect(CARDS.find((c) => c.id === 'einstein')!.attrs).toEqual(['study', 'study', 'study', 'art', 'art']);
  });

  it('era raids add or take away the difference between 👊 and the threat', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const t = structuredClone(s);
    t.players[pi].students = [mk('y', ['fight', 'fight'])];
    t.players[pi].roles = [];
    t.eventDeck.push('raid_present');
    expect(step(t, { type: 'drawEvent' }).players[pi].points - t.players[pi].points).toBe(2 * 2 - 4);
    const u = structuredClone(t);
    u.players[pi].students = [mk('y', ['fight', 'fight', 'fight'], 'sengoku')];
    expect(step(u, { type: 'drawEvent' }).players[pi].points - u.players[pi].points).toBe(3 - 4);
  });

  it('kachikomi takes the drawer\'s 👊 count from the chosen school', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const target = (pi + 1) % 3;
    const t = structuredClone(s);
    t.players[pi].students = [mk('y', ['fight', 'fight']), mk('z', ['fight', 'study'])];
    t.players[pi].roles = [];
    t.eventDeck.push('kachikomi');
    const k = step(t, { type: 'drawEvent' });
    expect(k.phase.kind).toBe('kachikomi');
    const done = step(k, { type: 'kachikomi', target });
    expect(done.players[target].points - t.players[target].points).toBe(-3);
    expect(done.players[pi].points).toBe(t.players[pi].points);
    // 👊がいなければカチコミに行けない
    const u = structuredClone(t);
    u.players[pi].students = [mk('a', ['study'])];
    expect(step(u, { type: 'drawEvent' }).phase.kind).toBe('result');
  });

  it('swing events can go negative', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const t = structuredClone(s);
    t.players[pi].students = [mk('y', ['fight', 'fight']), mk('z', ['study'])];
    t.players[pi].roles = [];
    // 抜き打ちテストは📚の数だけ（👊では引かれない）
    t.eventDeck.push('poptest');
    expect(step(t, { type: 'drawEvent' }).players[pi].points - t.players[pi].points).toBe(1);
    const u = structuredClone(t);
    u.eventDeck.push('marathon');
    expect(step(u, { type: 'drawEvent' }).players[pi].points - u.players[pi].points).toBe(0 - 2);
  });

  it('brawl takes 👊 away, offset by 👑 but never above zero', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const run = (students: Student[]) => {
      const t = structuredClone(s);
      t.players[pi].students = students;
      t.players[pi].roles = [];
      t.eventDeck.push('brawl');
      return step(t, { type: 'drawEvent' }).players[pi].points - t.players[pi].points;
    };
    expect(run([mk('y', ['fight', 'fight', 'fight']), mk('c', ['charm'])])).toBe(-2);
    expect(run([mk('y', ['fight']), mk('c', ['charm', 'charm', 'charm'])])).toBe(0);
  });

  it('era events compete on the era\'s favored icons (none → all icons)', () => {
    for (const era of ERAS) {
      const used = new Set(ERA_CARDS.filter((c) => c.era === era.id && c.effect.type !== 'alien').map((c) => c.attr));
      expect([...used].sort(), era.id).toEqual(era.favor.length ? [...era.favor].sort() : ['all']);
    }
    expect(ERAS.find((e) => e.id === 'future')!.favor).toEqual(['study']);
    expect(ERAS.find((e) => e.id === 'cretaceous')!.favor).toEqual(['fight']);
    expect(ERAS.find((e) => e.id === 'present')!.favor).toEqual([]);
  });

  it('martian invasion seats an iconless alien in every class with a free seat', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const full = 1 - s.phase.player;
    while (s.players[full].students.length < MAX_CLASS) s.players[full].students.push(mk(`f${s.players[full].students.length}`, ['study']));
    const sizes = s.players.map((p) => p.students.length);
    const points = s.players.map((p) => p.points);
    s.eventDeck.push('martian');
    const next = step(s, { type: 'drawEvent' });
    next.players.forEach((p, i) => {
      expect(p.points).toBe(points[i]);
      expect(p.students.length).toBe(i === full ? MAX_CLASS : sizes[i] + 1);
    });
    const alien = next.players[s.phase.kind === 'draw' ? s.phase.player : 0].students.at(-1)!;
    expect(alien.attrs).toEqual([]);
  });

  it('cyborg covers one of the drawer\'s own students with a 📚🏃 card', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    s.eventDeck.push('cyborg');
    s = step(s, { type: 'drawEvent' });
    expect(s.phase.kind).toBe('cyborg');
    // 相手のクラスの子は選べない
    expect(step(s, { type: 'cyborg', uid: s.players[1 - pi].students[0].uid })).toBe(s);
    const mine = s.players[pi].students[0];
    const n = s.players[pi].students.length;
    const next = step(s, { type: 'cyborg', uid: mine.uid });
    const st = next.players[pi].students.find((x) => x.uid === mine.uid)!;
    expect(next.players[pi].students).toHaveLength(n);
    expect(st.attrs).toEqual(['study', 'sports']);
    expect(st.name).toBe('サイボーグ');
    expect(st.cardId).toBeUndefined();
    // もうサイボーグの子はもう一度サイボーグにできない
    const again = structuredClone(next);
    again.phase = { kind: 'cyborg', player: pi };
    expect(step(again, { type: 'cyborg', uid: mine.uid })).toBe(again);
  });

  it('era events each have their own effect', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const run = (id: string, classes: Student[][]) => {
      const t = structuredClone(s);
      classes.forEach((st, i) => {
        t.players[i].students = st;
        t.players[i].roles = [];
      });
      t.eventDeck.push(id);
      const after = step(t, { type: 'drawEvent' });
      return after.players.map((p, i) => p.points - t.players[i].points);
    };
    const A = [mk('a1', ['sports', 'sports', 'sports']), mk('a2', ['sports'])];
    const B = [mk('b1', ['sports', 'sports'])];
    const C = [mk('c1', ['study'])];
    // 恐竜と力くらべ：代表1人の👊×2
    expect(run('dino_sumo', [[mk('y', ['fight', 'fight', 'fight']), mk('z', ['fight'])], [mk('w', ['fight', 'fight'])], C])).toEqual([6, 4, 0]);
    // 古代オリンピック：順位点×2
    expect(run('olympia', [A, B, C])).toEqual([10, 6, 2]);
    // ピラミッド建設：🏃8以上で+8、足りなければ−3（白亜紀ではないのでそのまま）
    expect(run('pyramid', [[...A, mk('a3', ['sports', 'sports', 'sports', 'sports'])], B, C])).toEqual([8, -3, -3]);
    // 天下分け目の合戦：1位+10、最下位−5
    expect(run('kassen', [[mk('y', ['fight', 'fight'])], [mk('z', ['fight'])], C])).toEqual([10, 0, -5]);
    // 縄張り争い：一番のクラスだけ👊×2
    expect(run('nawabari', [[mk('y', ['fight', 'fight'])], [mk('z', ['fight'])], C])).toEqual([4, 0, 0]);
    // 部活動紹介：そろっているアイコンの種類×2
    expect(run('bukatsu', [[mk('c', ['charm', 'art']), mk('d', ['study', 'charm'])], B, C])).toEqual([6, 2, 2]);
    // 文化祭：全アイコンの合計で順位点×2（現代の子は2倍）
    expect(run('festival', [A, B, C])).toEqual([10, 6, 2]);
    // 舞踏会：👑を持つ子1人につき+2（近代の子は2人分）
    expect(run('ball', [[mk('c', ['charm']), mk('d', ['charm', 'charm'], 'modern')], B, C])).toEqual([6, 0, 0]);
    // 交響楽団の演奏会：🎨 − 🎨を持たない子の人数
    expect(run('orchestra', [[mk('a', ['art', 'art']), mk('b', ['study'])], B, C])).toEqual([1, -1, -1]);
  });

  it('goods add an icon to one student, one item each', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    s.eventDeck.push('g_book');
    s = step(s, { type: 'drawEvent' });
    expect(s.phase.kind).toBe('equip');
    const uid = s.players[pi].students[0].uid;
    const before = s.players[pi].students[0].attrs.length;
    const next = step(s, { type: 'equip', uid });
    const st = next.players[pi].students.find((x) => x.uid === uid)!;
    expect(st.attrs).toHaveLength(before + 1);
    expect(st.goods?.attr).toBe('study');
    // もう装備している子にはつけられない
    const again = structuredClone(next);
    again.phase = { kind: 'equip', player: pi, card: 'g_shoes' };
    expect(step(again, { type: 'equip', uid })).toBe(again);
  });

  it('setRoles requires choosing the newly unlocked kind, and unlocked kinds stay', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 11);
    while (s.phase.kind !== 'roles') s = step(s, cpuAction(s)!);
    const uid = s.players[0].students[0].uid;
    expect(step(s, { type: 'setRoles', roles: [] })).toBe(s);
    expect(step(s, { type: 'setRoles', roles: [{ role: 'pe', uid }], unlock: ['study'] })).toBe(s);
    const next = step(s, { type: 'setRoles', roles: [{ role: 'study', uid }], unlock: ['study'] });
    expect(next.players[0].unlocked).toEqual(['study']);
    expect(next.players[0].roles).toEqual([{ role: 'study', uid }]);
  });

  it('exchange takes a student without a role from another class', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 11);
    while (s.phase.kind !== 'roles') s = step(s, cpuAction(s)!);
    const [a0, a1] = s.players[0].students;
    const b0 = s.players[1].students[0];
    s.players[1].roles = [{ role: 'study', uid: b0.uid }];
    s.phase = { kind: 'exchange', player: 0 };
    // 相手の係の子はもらえない
    expect(step(s, { type: 'exchange', uid: a0.uid, target: 1, theirUid: b0.uid })).toBe(s);
    const b1 = s.players[1].students[1];
    // 自分の側は係の子でも出せる
    s.players[0].roles = [{ role: 'study', uid: a1.uid }];
    const next = step(s, { type: 'exchange', uid: a1.uid, target: 1, theirUid: b1.uid });
    expect(next.players[0].students.map((x) => x.uid)).toContain(b1.uid);
    expect(next.players[1].students.map((x) => x.uid)).toContain(a1.uid);
    expect(next.players[0].roles).toEqual([]);
  });

  it('drawn event cards go to the discard pile', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 3);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    s.eventDeck.push('n_study');
    s = step(s, { type: 'drawEvent' });
    expect(s.discard[s.discard.length - 1]).toBe('n_study');
  });

  it('push makes every class drop one student without a role', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 11);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const drawer = s.phase.player;
    const other = 1 - drawer;
    const sitter = s.players[drawer].students[0];
    s.players[drawer].roles = [{ role: 'study', uid: sitter.uid }];
    s.eventDeck.push('push');
    s = step(s, { type: 'drawEvent' });
    expect(s.phase).toMatchObject({ kind: 'push', player: drawer });
    // 係の子は外せない
    expect(step(s, { type: 'push', uid: sitter.uid })).toBe(s);
    const mine = s.players[drawer].students[1].uid;
    s = step(s, { type: 'push', uid: mine });
    expect(s.phase).toMatchObject({ kind: 'push', player: other });
    const theirs = droppable(s.players[other])[0].uid;
    s = step(s, { type: 'push', uid: theirs });
    expect(s.phase.kind).toBe('result');
    expect(s.players[drawer].students.map((x) => x.uid)).not.toContain(mine);
    expect(s.players[other].students.map((x) => x.uid)).not.toContain(theirs);
    expect(s.players.map((p) => p.students.length)).toEqual([STARTING_MEMBERS - 1, STARTING_MEMBERS - 1]);
  });

  it('normal cards score only for the drawer; era and common events score for every class', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 21);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const drawer = s.phase.player;
    const run = (id: string) => {
      const t = structuredClone(s);
      t.eventDeck.push(id);
      const before = t.players.map((p) => p.points);
      const after = step(t, { type: 'drawEvent' });
      return { rows: after.phase.kind === 'result' ? after.phase.result.rows.length : 0, d: after.players.map((p, i) => p.points - before[i]) };
    };
    for (const id of ['n_study', 'n_sports']) {
      const r = run(id);
      expect(r.rows, id).toBe(1);
      r.d.forEach((d, i) => i !== drawer && expect(d, id).toBe(0));
    }
    for (const id of ['poptest', 'marathon', 'festival', 'raid_present']) expect(run(id).rows, id).toBe(3);
  });
});

describe('1枚ごとの得点の内訳', () => {
  it('合計がクラスのアイコンの点（attrScore）と一致する', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = playOut(3, 1, seed);
      for (const p of s.players) {
        for (const a of ['study', 'sports', 'art', 'charm', 'fight'] as Attr[]) {
          for (const era of [undefined, ...ERAS.map((e) => e.id)]) {
            const sum = contributions(p, a, era).reduce((x, c) => x + c.pts, 0);
            expect(sum).toBe(attrScore(p, a, era).total);
          }
        }
      }
    }
  });
});
