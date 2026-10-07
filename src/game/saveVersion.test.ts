import { describe, expect, it } from 'vitest';
import { CARDS } from './data/cards';
import { newGame } from './engine';
import { SAVE_SCHEMA, SAVE_VERSION, fingerprint } from './saveVersion';

describe('save version', () => {
  it('is the schema number plus a fingerprint of the game data, and new games carry it', () => {
    expect(SAVE_VERSION.startsWith(`${SAVE_SCHEMA}-`)).toBe(true);
    expect(newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 1).version).toBe(SAVE_VERSION);
  });

  it('changes when a card\'s id, icons or effect change, but not when only its text changes', () => {
    const base = fingerprint(CARDS);
    const edit = (f: (c: (typeof CARDS)[number]) => void) => {
      const copy = structuredClone(CARDS);
      f(copy[0]);
      return fingerprint(copy);
    };
    expect(edit((c) => (c.flavor += '！'))).toBe(base);
    expect(edit((c) => (c.title += '！'))).toBe(base);
    expect(edit((c) => (c.id += 'x'))).not.toBe(base);
    expect(edit((c) => c.attrs.push('study'))).not.toBe(base);
    expect(edit((c) => (c.rarity = c.rarity === 'N' ? 'R' : 'N'))).not.toBe(base);
  });
});
