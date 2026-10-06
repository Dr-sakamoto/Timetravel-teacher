import { useCallback, useEffect, useState } from 'react';
import { cpuAction } from '../game/ai';
import { currentEra, droppable, equippable, newGame, step } from '../game/engine';
import { ERAS } from '../game/data/eras';
import type { Action, GameState } from '../game/types';
import { GameView } from './GameView';

/*
 * カードの動きの見本（#motion-demo で開く）：
 * 本物の卓で、山札から配る・見送って捨てる・人物の転入・グッズの装備・転校を、ボタン1つずつで見られる。
 * そのまま続けて遊ぶこともできる（CPU2人）。
 */

/** 自分（席0）の手番の「1枚えらぶ」まで進める */
function toMyTurn(s: GameState): GameState {
  for (let guard = 0; guard < 400; guard++) {
    const ph = s.phase;
    if (ph.kind === 'draw' && ph.player === 0) return s;
    if (ph.kind === 'gameOver') return s;
    const a: Action | null = ph.kind === 'result' ? { type: 'continue' } : cpuAction(s);
    if (!a) return s;
    s = step(s, a);
  }
  return s;
}

function fresh(): GameState {
  const s = newGame(
    [
      { name: 'あなた', isCpu: false },
      { name: '青山先生', isCpu: true },
      { name: '緑川先生', isCpu: true },
    ],
    1,
    20261006,
  );
  return toMyTurn(s);
}

/** 場の左端のカードを差し替え、次にめくれるカードを決めておく（見本を毎回同じにする） */
function rig(s: GameState, first: string, next = 'n_study'): GameState {
  const t = structuredClone(s);
  t.market[0] = first;
  t.eventDeck.push(next);
  t.players[0].points = Math.max(t.players[0].points, 40);
  return t;
}

type Scene = 'pass' | 'person' | 'goods' | 'push';

const SCENES: { id: Scene; label: string; note: string }[] = [
  { id: 'pass', label: '🗑️ 見送る', note: '左端のカードが捨て札へ飛び、残りが詰めて、山札から1枚配られる' },
  { id: 'person', label: '🧑 人物を取る', note: '場の人物カードが教室の空いた席へ飛んで転入する' },
  { id: 'goods', label: '🎒 グッズを装備', note: 'グッズが場から子の左上へ飛んで付き、カードが跳ねる' },
  { id: 'push', label: '📦 転校', note: '山札から転校がめくれて、出ていく子がふわっと消える' },
];

export function MotionDemo() {
  const [state, setState] = useState<GameState>(fresh);
  const [auto, setAuto] = useState<Scene | null>(null);
  const dispatch = useCallback((a: Action) => setState((s) => step(s, a)), []);
  const ph = state.phase;
  const ready = ph.kind === 'draw' && ph.player === 0;

  // 見本では、選ぶところ（装備する子・転校する子）を自動で選ぶ
  useEffect(() => {
    if (!auto) return;
    const me = state.players[0];
    let a: Action | null = null;
    if (auto === 'goods' && ph.kind === 'equip') a = { type: 'equip', uid: equippable(me)[0]?.uid ?? null };
    if (auto === 'push' && ph.kind === 'push' && ph.player === 0) a = { type: 'push', uid: droppable(me).at(-1)!.uid };
    if (!a) return;
    const go = a;
    const t = setTimeout(() => dispatch(go), 450);
    return () => clearTimeout(t);
  }, [auto, state, ph, dispatch]);

  const run = (scene: Scene) => {
    setAuto(scene);
    const era = ERAS[currentEra(state)].id;
    if (scene === 'pass') return dispatch({ type: 'pass', slot: 0 });
    if (scene === 'person') {
      const pid = state.pools[era][0];
      setState(rig(state, `person:${pid}`));
      return setTimeout(() => dispatch({ type: 'take', slot: 0 }), 350);
    }
    if (scene === 'goods') {
      setState(rig(state, 'g_book'));
      return setTimeout(() => dispatch({ type: 'take', slot: 0 }), 350);
    }
    setState(rig(state, 'n_art', 'push'));
    setTimeout(() => dispatch({ type: 'pass', slot: 0 }), 350);
  };

  return (
    <div className="motion-demo">
      <div className="motion-demo-bar">
        <b>カードの動きの見本</b>
        {SCENES.map((x) => (
          <button key={x.id} className="btn small" disabled={!ready} title={x.note} onClick={() => run(x.id)}>
            {x.label}
          </button>
        ))}
        <button className="btn small ghost" onClick={() => setState(toMyTurn(state))} disabled={ready}>
          ⏭ 自分の番まで
        </button>
        <button className="btn small ghost" onClick={() => setState(fresh())}>
          ↺ 最初から
        </button>
      </div>
      <GameView state={state} dispatch={dispatch} onQuit={() => (location.hash = '')} onRules={() => {}} />
    </div>
  );
}
