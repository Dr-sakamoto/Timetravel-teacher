import { describe, expect, it } from 'vitest';
import { cpuAction } from '../game/ai';
import { newGame, step } from '../game/engine';
import type { GameState } from '../game/types';
import { canAct, waitingOn } from './protocol';

function game(): GameState {
  return newGame(
    [
      { name: 'A', isCpu: false },
      { name: 'B', isCpu: false },
      { name: 'C', isCpu: true },
    ],
    1,
    42,
  );
}

describe('通信対戦：操作してよい人', () => {
  it('手番の操作は手番の人だけ', () => {
    const s = game();
    expect(s.phase.kind).toBe('memberDraw');
    expect(canAct(s, 0, { type: 'drawMember' })).toBe(true);
    expect(canAct(s, 1, { type: 'drawMember' })).toBe(false);
    expect(canAct(s, 2, { type: 'drawMember' })).toBe(false);
    expect(canAct(s, 0, { type: 'continue' })).toBe(false);
    expect(canAct(s, 9, { type: 'drawMember' })).toBe(false);
  });

  it('人間の手番の結果はその人が、CPUや全員向けの結果は人間なら誰でも進められる', () => {
    let s = game();
    const seen = { own: false, shared: false };
    for (let i = 0; i < 3000 && s.phase.kind !== 'gameOver' && !(seen.own && seen.shared); i++) {
      const ph = s.phase;
      if (ph.kind === 'result') {
        const owner = ph.player !== null && !s.players[ph.player].isCpu ? ph.player : null;
        if (owner !== null) {
          seen.own = true;
          expect(canAct(s, owner, { type: 'continue' })).toBe(true);
          expect(canAct(s, 1 - owner, { type: 'continue' })).toBe(false);
        } else {
          seen.shared = true;
          expect(canAct(s, 0, { type: 'continue' })).toBe(true);
          expect(canAct(s, 1, { type: 'continue' })).toBe(true);
        }
        expect(canAct(s, 2, { type: 'continue' })).toBe(false);
        expect(canAct(s, 0, { type: 'take', slot: 0 })).toBe(false);
      }
      // 人間の席もCPUの手で進める
      const a = cpuAction({ ...s, players: s.players.map((p) => ({ ...p, isCpu: true })) });
      if (!a) break;
      s = step(s, a);
    }
    expect(seen).toEqual({ own: true, shared: true });
  });

  it('待っている人（代わりに1手進められる相手）は、今操作できる人間ただ1人', () => {
    let s = game();
    for (let i = 0; i < 3000 && s.phase.kind !== 'gameOver'; i++) {
      const w = waitingOn(s);
      const ph = s.phase;
      if (w !== null) {
        expect(s.players[w].isCpu).toBe(false);
        expect(ph.player).toBe(w);
      } else {
        // CPUの番か、CPU・全員向けの結果
        expect(ph.player === null || s.players[ph.player].isCpu).toBe(true);
      }
      const a = cpuAction({ ...s, players: s.players.map((p) => ({ ...p, isCpu: true })) });
      if (!a) break;
      s = step(s, a);
    }
  });

  it('状態は通信で送れる大きさに収まる', () => {
    let s = game();
    for (let i = 0; i < 400 && s.phase.kind !== 'gameOver'; i++) {
      const a = cpuAction({ ...s, players: s.players.map((p) => ({ ...p, isCpu: true })) });
      if (!a) break;
      s = step(s, a);
    }
    expect(JSON.stringify(s).length).toBeLessThan(1_000_000);
    console.log('state bytes', JSON.stringify(s).length);
  });
});
