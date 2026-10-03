import { describe, expect, it } from 'vitest';
import { cpuAction } from './ai';
import { attrScore, bestScore, roleSlots, termNo, testScore } from './calc';
import { CARDS, parseAttrs } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import { ERA_CARDS, PERSON_CARDS_PER_TERM } from './data/events';
import { ARCHETYPES, MODERN_POOL } from './data/modern';
import { currentEra, deckBreakdown, newGame, step } from './engine';
import type { Attr, GameState, Player, Student } from './types';

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
const player = (students: Student[], roles: (string | null)[] = []): Player => ({
  id: 0, name: 'A', isCpu: false, color: '', students, roles: [...roles, ...Array(6 - roles.length).fill(null)], points: 0,
});

describe('engine', () => {
  for (const players of [2, 3, 4, 5]) {
    for (const years of [1, 2, 3]) {
      it(`completes a ${players}-player ${years}-year CPU game`, () => {
        const s = playOut(players, years, players * 100 + years);
        expect(s.year).toBe(years);
        for (const p of s.players) {
          expect(Number.isFinite(p.points)).toBe(true);
          expect(p.students.length).toBeGreaterThanOrEqual(4);
          expect(p.students.length).toBeLessThanOrEqual(12);
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

  it('normal cards score the best holder, and a role holder counts double', () => {
    const p = player([mk('a', ['study']), mk('b', ['study', 'study', 'study', 'art']), mk('c', ['sports', 'sports'])], ['a']);
    // 係の子は1個×2=2 < 3個の子 → 3
    expect(bestScore(p, 'study')).toMatchObject({ sum: 3, bonus: 0, total: 3 });
    const q = player([mk('a', ['study', 'study']), mk('b', ['study', 'study', 'study'])], ['a']);
    // 係の子は2個×2=4 > 3個の子
    expect(bestScore(q, 'study')).toMatchObject({ sum: 2, bonus: 2, total: 4 });
    // 係の子がアイコンを1つも持っていなければ効果なし
    expect(bestScore(player([mk('a', ['sports']), mk('b', ['study'])], ['a']), 'study').total).toBe(1);
    expect(bestScore(p, 'fight').total).toBe(0);
  });

  it('event cards sum all holders, and a role holder counts double', () => {
    const p = player([mk('a', ['study', 'study', 'study']), mk('b', ['study', 'study', 'art']), mk('c', ['sports'])], ['a']);
    expect(attrScore(p, 'study')).toMatchObject({ sum: 5, bonus: 3, total: 8 });
    expect(attrScore(p, 'fight').total).toBe(0);
    // 係のアイコンを持っていない子が就いても +1 は付かない
    const q = player([mk('c', ['sports'])], ['c']);
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

  it('unlocks one role slot per term, starting with 3 (1年1学期→3 … 2年1学期→6)', () => {
    const slots = (year: number, term: number) => roleSlots(termNo(year, term));
    expect([[1, 1], [1, 0], [1, 2], [1, 3], [2, 1], [2, 2], [3, 3]].map(([y, t]) => slots(y, t))).toEqual([3, 3, 4, 5, 6, 6, 6]);
  });

  it('regular modern students have 1 icon about 70% of the time and 2 icons otherwise', () => {
    const regular = ARCHETYPES.filter((a) => a.rarity === 'N');
    const ones = regular.filter((a) => parseAttrs(a.attrs).length === 1).length;
    expect(regular.every((a) => parseAttrs(a.attrs).length <= 2)).toBe(true);
    expect(ones / regular.length).toBeGreaterThanOrEqual(0.65);
    expect(ones / regular.length).toBeLessThanOrEqual(0.75);
  });

  it('a student can hold only one role, and locked roles stay empty', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 5);
    while (s.phase.kind !== 'roles') s = step(s, cpuAction(s)!);
    const [a, b] = s.players[0].students;
    expect(step(s, { type: 'setRoles', roles: [a.uid, a.uid, null, null, null, null] })).toBe(s);
    const next = step(s, { type: 'setRoles', roles: [a.uid, b.uid, null, null, null, b.uid === a.uid ? null : s.players[0].students[2].uid] });
    expect(next.players[0].roles.slice(3)).toEqual([null, null, null]);
  });

  it('fight icons belong only to yankees, and about half of them are fight-only', () => {
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
    expect(fightOnly.length / yankees.length).toBeGreaterThanOrEqual(0.45);
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
    while (f.players[pi].students.length < 12) f.players[pi].students.push({ ...f.players[pi].students[0], uid: `f${f.players[pi].students.length}` });
    f.eventDeck.push('n_study', m);
    const full = step(f, { type: 'drawEvent' });
    expect(full.players[pi].students).toHaveLength(12);
    expect(full.discard.slice(-2)).toEqual([m, 'n_study']);
    expect(full.phase.kind).toBe('result');
  });

  it('modern students are a finite pool: drawn students leave it and never duplicate', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 9);
    const before = s.pools.present.length;
    expect(before).toBe(MODERN_POOL.length);
    while (s.phase.kind === 'memberDraw') s = step(s, cpuAction(s)!);
    expect(s.pools.present).toHaveLength(before - 18);
    const ids = s.players.flatMap((p) => p.students.map((x) => x.cardId));
    expect(ids.every((id) => id && !s.pools.present.includes(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deck breakdown counts every card in the deck and discard pile', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 4);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    for (let i = 0; i < 6; i++) s = step(step(s, cpuAction(s)!), { type: 'continue' });
    const rows = deckBreakdown(s);
    const sum = (k: 'left' | 'used') => rows.reduce((a, r) => a + r[k], 0);
    expect(sum('left')).toBe(s.eventDeck.length);
    expect(sum('used')).toBe(s.discard.length);
    expect(rows.filter((r) => r.group === '通常').reduce((a, r) => a + r.left + r.used, 0)).toBe(21);
  });

  it('cards carry 1-5 icons, more for rarer students', () => {
    for (const c of CARDS) {
      expect(c.attrs.length).toBeGreaterThanOrEqual(2);
      expect(c.attrs.length).toBeLessThanOrEqual(5);
      if (c.rarity === 'SSR') expect(c.attrs.length, c.name).toBeGreaterThanOrEqual(4);
    }
    expect(CARDS.find((c) => c.id === 'einstein')!.attrs).toEqual(['study', 'study', 'study', 'art', 'art']);
  });

  it('raids only take away the shortfall', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const t = structuredClone(s);
    t.players[pi].students = [mk('y', ['fight', 'fight'])];
    t.players[pi].roles = Array(6).fill(null);
    t.eventDeck.push('raid_7');
    expect(step(t, { type: 'drawEvent' }).players[pi].points - t.players[pi].points).toBe(-5);
    const u = structuredClone(t);
    u.players[pi].students = [mk('y', ['fight', 'fight', 'fight']), mk('z', ['fight', 'fight', 'fight']), mk('w', ['fight'])];
    expect(step(u, { type: 'drawEvent' }).players[pi].points).toBe(u.players[pi].points);
  });

  it('drawn event cards go to the discard pile', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 3);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    s.eventDeck.push('n_study');
    s = step(s, { type: 'drawEvent' });
    expect(s.discard[s.discard.length - 1]).toBe('n_study');
  });

  it('push moves an unwanted student to another class', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 11);
    while (s.phase.kind !== 'roles') s = step(s, cpuAction(s)!);
    s.phase = { kind: 'push', player: 0 };
    const uid = s.players[0].students[0].uid;
    const next = step(s, { type: 'push', uid, target: 1 });
    expect(next.players[0].students).toHaveLength(5);
    expect(next.players[1].students.map((x) => x.uid)).toContain(uid);
  });

  it('normal cards score for everyone, event cards only for the drawer', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 21);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const drawer = s.phase.player;
    const run = (id: string) => {
      const t = structuredClone(s);
      t.eventDeck.push(id);
      const before = t.players.map((p) => p.points);
      const after = step(t, { type: 'drawEvent' }).players.map((p) => p.points);
      return after.map((v, i) => v - before[i]);
    };
    const normal = run('n_study');
    expect(normal.filter((d) => d > 0).length).toBeGreaterThan(1);
    const contest = run('sportsday');
    contest.forEach((d, i) => i !== drawer && expect(d).toBe(0));
    const raid = run('raid_7');
    raid.forEach((d, i) => i !== drawer && expect(d).toBe(0));
    expect(raid[drawer]).toBeLessThanOrEqual(0);
  });
});
