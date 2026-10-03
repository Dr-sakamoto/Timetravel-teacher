import { describe, expect, it } from 'vitest';
import { cpuAction } from './ai';
import { classPower, effStats } from './calc';
import { EVENT_MAP, type SchoolEventDef } from './data/events';
import { newGame, step } from './engine';
import type { GameState } from './types';

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

  it('role assignment buffs the assigned stat', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 7);
    s = step(s, { type: 'drawClass' });
    const p = s.players[0];
    const st = p.students[0];
    const before = effStats(p, st).charm;
    const card = p.classCardId!;
    const idx = ['normal', 'elite', 'arts', 'council', 'sports'].includes(card) ? 0 : -1;
    if (idx === 0) {
      p.roles[0] = st.uid; // 学級委員長 → 人望×1.5
      expect(effStats(p, st).charm).toBeCloseTo(before * 1.5);
    }
  });

  it('yankees defend against rival yankees but hurt tests', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 3);
    s = step(s, { type: 'drawClass' });
    const p = s.players[0];
    const yankee = { ...p.students[0], uid: 'y', tags: ['現代', 'ヤンキー'] as const, base: { pe: 5, study: 1, fight: 8, art: 2, charm: 3 } };
    const nerd = { ...p.students[0], uid: 'n', tags: ['現代'] as const, base: { pe: 2, study: 8, fight: 1, art: 3, charm: 3 } };
    const yClass = { ...p, roles: [], students: [yankee, yankee, yankee].map((x, i) => ({ ...x, uid: `y${i}`, tags: [...x.tags] })) };
    const nClass = { ...p, roles: [], students: [nerd, nerd, nerd].map((x, i) => ({ ...x, uid: `n${i}`, tags: [...x.tags] })) };
    const raid = EVENT_MAP.yankee as SchoolEventDef;
    const test = EVENT_MAP.test1 as SchoolEventDef;
    expect(classPower(yClass, raid).power).toBeGreaterThan(classPower(nClass, raid).power);
    expect(classPower(nClass, test).power).toBeGreaterThan(classPower(yClass, test).power);
  });
});
