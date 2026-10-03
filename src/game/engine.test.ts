import { describe, expect, it } from 'vitest';
import { cpuAction } from './ai';
import { attrValues, classPower, iconPoints, roleSlots } from './calc';
import { CARDS, parseAttrs } from './data/cards';
import { ARCHETYPES } from './data/modern';
import { ERA_EVENTS, EVENT_MAP, type SchoolEventDef } from './data/events';
import { currentEra, newGame, step } from './engine';
import { ERAS, PRESENT_INDEX } from './data/eras';
import type { Attr, GameState, Student } from './types';

function playOut(players: number, years: number, seed: number): { s: GameState; steps: number } {
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
  return { s, steps };
}

describe('engine', () => {
  for (const players of [2, 3, 4, 5]) {
    for (const years of [1, 2, 3]) {
      it(`completes a ${players}-player ${years}-year CPU game`, () => {
        const { s } = playOut(players, years, players * 100 + years);
        expect(s.year).toBe(years);
        for (const p of s.players) {
          expect(Number.isFinite(p.points)).toBe(true);
          expect(p.students.length).toBeGreaterThanOrEqual(4);
          expect(p.students.length).toBeLessThanOrEqual(12);
          expect(new Set(p.students.map((x) => x.uid)).size).toBe(p.students.length);
        }
        // 歴史カードは同時に2人存在しない
        const cards = s.players.flatMap((p) => p.students.map((x) => x.cardId).filter(Boolean));
        expect(new Set(cards).size).toBe(cards.length);
      });
    }
  }

  it('deals the 6 starting members one card at a time, alternating between players', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 1);
    s = step(s, { type: 'drawClass' });
    s = step(s, { type: 'continue' });
    s = step(s, { type: 'drawClass' });
    s = step(s, { type: 'continue' });
    expect(s.players.every((p) => p.students.length === 0)).toBe(true);
    const order: number[] = [];
    while (s.phase.kind === 'memberDraw') {
      order.push(s.phase.player);
      const before = s.players[s.phase.player].students.length;
      const who = s.phase.player;
      s = step(s, { type: 'drawMember' });
      expect(s.players[who].students.length).toBe(before + 1);
    }
    expect(order.slice(0, 4)).toEqual([0, 1, 0, 1]);
    expect(order).toHaveLength(12);
    expect(s.phase.kind).toBe('roles');
    for (const p of s.players) {
      expect(p.students).toHaveLength(6);
      expect(p.students.every((x) => x.era === 'present')).toBe(true);
    }
    expect(s.players[0].classCardId).not.toBe(s.players[1].classCardId);
  });

  it('role assignment multiplies the attributes the student has', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 7);
    s = step(s, { type: 'drawClass' });
    const p = s.players[0];
    p.classCardId = 'normal'; // 0番目の係は学級委員長（👑×1.5）
    p.roles = [null, null, null, null, null, null];
    const st = { ...p.students[0], uid: 'x', power: 4, attrs: ['study', 'charm'] as Attr[], ability: undefined };
    p.students = [st];
    expect(attrValues(p, st).charm).toBe(4);
    p.roles[0] = 'x';
    expect(attrValues(p, st).charm).toBe(6);
    expect(attrValues(p, st).sports).toBeUndefined();
  });

  it('yankees defend against rival yankees but hurt tests', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 3);
    s = step(s, { type: 'drawClass' });
    const p = s.players[0];
    const mk = (uid: string, attrs: Attr[], tags: Student['tags']): Student => ({ ...p.students[0], uid, power: 5, attrs, tags, ability: undefined });
    const yClass = { ...p, roles: [], students: [0, 1, 2].map((i) => mk(`y${i}`, ['sports', 'fight'], ['現代', 'ヤンキー'])) };
    const nClass = { ...p, roles: [], students: [0, 1, 2].map((i) => mk(`n${i}`, ['study'], ['現代'])) };
    const raid = EVENT_MAP.yankee as SchoolEventDef;
    const test = EVENT_MAP.test1 as SchoolEventDef;
    expect(classPower(yClass, raid).power).toBeGreaterThan(0);
    expect(classPower(nClass, raid).power).toBe(0);
    expect(classPower(nClass, test).power).toBeGreaterThan(classPower(yClass, test).power);
  });

  it('fight attribute belongs only to yankees, who never study', () => {
    const all = [
      ...CARDS.map((c) => ({ name: c.name, attrs: c.attrs, tags: c.tags })),
      ...ARCHETYPES.map((a) => ({ name: a.title, attrs: parseAttrs(a.attrs), tags: a.tags })),
    ];
    for (const x of all) {
      if (x.attrs.includes('fight')) {
        expect(x.tags, x.name).toContain('ヤンキー');
        expect(x.attrs, x.name).not.toContain('study');
      } else {
        expect(x.tags, x.name).not.toContain('ヤンキー');
      }
    }
    const modernNonYankee = ARCHETYPES.filter((a) => !a.attrs.includes('f'));
    const studying = modernNonYankee.filter((a) => a.attrs.includes('s'));
    expect(studying.length / modernNonYankee.length).toBeGreaterThan(0.7);
  });

  it('picks 3 distinct historical eras each year, one per term, and transfers come from the term era', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 2, 42);
    const seen: number[][] = [];
    while (s.phase.kind !== 'gameOver') {
      if (!seen.some((y) => y.join() === s.yearEras.join())) seen.push([...s.yearEras]);
      expect(new Set(s.yearEras).size).toBe(3);
      expect(s.yearEras).not.toContain(PRESENT_INDEX);
      const ph = s.phase;
      if (ph.kind === 'transfer' && ph.title === '転入') {
        const era = ERAS[currentEra(s)].id;
        for (const o of ph.options) expect(o.era).toBe(era);
      }
      s = step(s, cpuAction(s)!);
    }
    expect(seen.length).toBe(2);
  });

  it('unlocks role slots as the class grows (6→3, 8→4, 10→5, 12→6)', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 5);
    s = step(s, { type: 'drawClass' });
    const p = s.players[0];
    const base = { ...p.students[0] };
    const sized = (n: number) => ({ ...p, students: Array.from({ length: n }, (_, i) => ({ ...base, uid: `x${i}` })) });
    expect([6, 7, 8, 10, 12].map((n) => roleSlots(sized(n)))).toEqual([3, 3, 4, 5, 6]);
  });

  it('icon cards give 1pt per holder, +1 when a role boosts that attribute', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 9);
    s = step(s, { type: 'drawClass' });
    const p = s.players[0];
    p.classCardId = 'elite'; // 0番目の係は学習係（📚×1.5）
    const mk = (uid: string, attrs: Attr[]): Student => ({ uid, name: uid, title: '', era: 'present', rarity: 'N', icon: '', power: 3, attrs, tags: ['現代'], flavor: '', joined: '', mvp: 0 });
    p.students = [mk('a', ['study']), mk('b', ['study', 'art']), mk('c', ['sports'])];
    p.roles = ['a', null, null, null, null, null];
    expect(iconPoints(p, 'study')).toEqual({ count: 2, points: 3 });
    expect(iconPoints(p, 'fight')).toEqual({ count: 0, points: 0 });
  });

  it('era-specific event cards only appear in their own term', () => {
    const s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 77);
    const era = ERAS[currentEra(s)].id;
    const eraIds = new Set(ERA_EVENTS.filter((e) => e.era === era).map((e) => e.id));
    const others = new Set(ERA_EVENTS.filter((e) => e.era !== era).map((e) => e.id));
    expect(s.eventDeck.some((id) => eraIds.has(id))).toBe(true);
    expect(s.eventDeck.some((id) => others.has(id))).toBe(false);
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
});
