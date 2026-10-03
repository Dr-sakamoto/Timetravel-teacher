import { describe, expect, it } from 'vitest';
import { cpuAction } from './ai';
import { attrValues, classPower } from './calc';
import { CARDS, parseAttrs } from './data/cards';
import { ARCHETYPES } from './data/modern';
import { EVENT_MAP, type SchoolEventDef } from './data/events';
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
          expect(p.students.length).toBeGreaterThanOrEqual(6);
          expect(p.students.length).toBeLessThanOrEqual(30);
          expect(new Set(p.students.map((x) => x.uid)).size).toBe(p.students.length);
        }
        // 歴史カードは同時に2人存在しない
        const cards = s.players.flatMap((p) => p.students.map((x) => x.cardId).filter(Boolean));
        expect(new Set(cards).size).toBe(cards.length);
      });
    }
  }

  it('starts each class with 12 modern students', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 1);
    s = step(s, { type: 'drawClass' });
    s = step(s, { type: 'continue' });
    s = step(s, { type: 'drawClass' });
    for (const p of s.players) {
      expect(p.students).toHaveLength(12);
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
      if (ph.kind === 'transfer' && ph.title === '転校生がやってくる！') {
        const era = ERAS[currentEra(s)].id;
        for (const o of ph.options) expect(o.era).toBe(era);
      }
      s = step(s, cpuAction(s)!);
    }
    expect(seen.length).toBe(2);
  });
});
