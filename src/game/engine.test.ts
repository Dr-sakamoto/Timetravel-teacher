import { describe, expect, it } from 'vitest';
import { cpuAction } from './ai';
import { attrScore, iconCount, roleSlots, testScore } from './calc';
import { CARDS, parseAttrs } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import { ERA_CARDS } from './data/events';
import { ARCHETYPES } from './data/modern';
import { currentEra, newGame, step } from './engine';
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

const mk = (uid: string, power: number, attrs: Attr[], era: Student['era'] = 'present'): Student => ({
  uid, name: uid, title: '', era, rarity: 'N', icon: '', power, attrs, flavor: '', joined: '', mvp: 0,
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
      expect(p.students.every((x) => x.era === 'present' && x.power >= 1 && x.power <= 5)).toBe(true);
    }
  });

  it('normal cards count holders of the icon, +1 per matching role', () => {
    const p = player([mk('a', 3, ['study']), mk('b', 2, ['study', 'art']), mk('c', 4, ['sports'])], ['a']);
    expect(iconCount(p, 'study')).toMatchObject({ sum: 2, bonus: 1, total: 3 });
  });

  it('contests sum the values of students with the icon, +1 per matching role', () => {
    const p = player([mk('a', 3, ['study']), mk('b', 2, ['study', 'art']), mk('c', 4, ['sports'])], ['a']);
    expect(attrScore(p, 'study')).toMatchObject({ sum: 5, bonus: 1, total: 6 });
    expect(attrScore(p, 'fight').total).toBe(0);
    // 係のアイコンを持っていない子が就いても +1 は付かない
    const q = player([mk('c', 4, ['sports'])], ['c']);
    expect(attrScore(q, 'study').total).toBe(0);
  });

  it('era cards double students from that era', () => {
    const p = player([mk('a', 2, ['sports'], 'sengoku'), mk('b', 2, ['sports'])]);
    expect(attrScore(p, 'sports', 'sengoku').total).toBe(6);
  });

  it('yankees defend against raids but hurt tests', () => {
    const y = player([mk('a', 3, ['sports', 'fight']), mk('b', 3, ['fight'])]);
    const n = player([mk('a', 3, ['study']), mk('b', 3, ['study'])]);
    expect(attrScore(y, 'fight').total).toBeGreaterThan(attrScore(n, 'fight').total);
    expect(testScore(n, 2)).toBeGreaterThan(testScore(y, 2));
    expect(testScore(y, 2)).toBeLessThan(0);
  });

  it('unlocks role slots as the class grows (6→3, 8→4, 10→5, 12→6)', () => {
    const sized = (n: number) => player(Array.from({ length: n }, (_, i) => mk(`x${i}`, 1, ['study'])));
    expect([6, 7, 8, 10, 12].map((n) => roleSlots(sized(n)))).toEqual([3, 3, 4, 5, 6]);
  });

  it('fight icons belong only to yankees, who never study', () => {
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
  });

  it('picks 3 eras a year and transfers come from the current term era', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 2, 42);
    while (s.phase.kind !== 'gameOver') {
      expect(new Set(s.yearEras).size).toBe(3);
      expect(s.yearEras).not.toContain(PRESENT_INDEX);
      const ph = s.phase;
      if (ph.kind === 'transfer' && ph.title === '転入') {
        for (const o of ph.options) expect(o.era).toBe(ERAS[currentEra(s)].id);
      }
      s = step(s, cpuAction(s)!);
    }
  });

  it('era cards are only in the deck during their own term', () => {
    const s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 77);
    const era = ERAS[currentEra(s)].id;
    expect(s.eventDeck.some((id) => ERA_CARDS.some((e) => e.id === id && e.era === era))).toBe(true);
    expect(s.eventDeck.some((id) => ERA_CARDS.some((e) => e.id === id && e.era !== era))).toBe(false);
  });

  it('drawn event cards go to the discard pile', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 3);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const top = s.eventDeck[s.eventDeck.length - 1];
    s = step(s, { type: 'drawEvent' });
    expect(s.discard[s.discard.length - 1]).toBe(top);
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
