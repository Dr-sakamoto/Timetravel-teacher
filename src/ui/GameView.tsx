import { useEffect, useRef, useState } from 'react';
import { cpuAction } from '../game/ai';
import { MIN_CLASS } from '../game/calc';
import { MONTHS, actingPlayer, pushTargets, termOfMonth } from '../game/engine';
import type { Action, GameState } from '../game/types';
import { Center } from './Center';
import { GameOver } from './GameOver';
import { Playmat } from './Playmat';
import { RoleEditor } from './RoleEditor';
import { EraBar } from './Timeline';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  onQuit: () => void;
  onRules: () => void;
}

/** 卓の配置：手前以外のプレイヤーを左・奥・右に座らせる */
function seating(others: number[]): { left: number[]; top: number[]; right: number[] } {
  switch (others.length) {
    case 1:
      return { left: [], top: others, right: [] };
    case 2:
      return { left: [others[0]], top: [], right: [others[1]] };
    case 3:
      return { left: [others[0]], top: [others[1]], right: [others[2]] };
    default:
      return { left: [others[0]], top: others.slice(1, -1), right: [others[others.length - 1]] };
  }
}

export function GameView({ state, dispatch, onQuit, onRules }: Props) {
  const ph = state.phase;
  const actor = actingPlayer(state);
  const allCpu = state.players.every((p) => p.isCpu);
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [showLog, setShowLog] = useState(false);
  const [focus, setFocus] = useState(() => state.players.find((p) => !p.isCpu)?.id ?? 0);
  const [push, setPush] = useState<{ uid: string | null; target: number | null }>({ uid: null, target: null });
  const logRef = useRef<HTMLDivElement>(null);
  const cpuTurn = actor !== null && state.players[actor].isCpu && ph.kind !== 'result';

  // 人間の手番になったら、その人を手前に座らせる（ホットシート）
  useEffect(() => {
    if (actor !== null && !state.players[actor].isCpu) setFocus(actor);
  }, [actor, state.players]);

  useEffect(() => {
    if (ph.kind !== 'push') setPush({ uid: null, target: null });
  }, [ph.kind]);

  // CPUの自動進行（通常カードの結果は人間の番でも自動で流す）
  useEffect(() => {
    if (ph.kind === 'gameOver') return;
    const mul = speed === 'fast' ? 0.35 : 1;
    if (ph.kind === 'result') {
      const normal = ph.result.tone === 'normal';
      const auto = (ph.player !== null && state.players[ph.player].isCpu) || allCpu || normal;
      if (!auto) return;
      const t = setTimeout(() => dispatch({ type: 'continue' }), (normal ? 1800 : 2600) * mul);
      return () => clearTimeout(t);
    }
    if (!cpuTurn) return;
    const a = cpuAction(state);
    if (!a) return;
    const t = setTimeout(() => dispatch(a), 800 * mul);
    return () => clearTimeout(t);
  }, [state, cpuTurn, allCpu, speed, dispatch, ph]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.log.length, showLog]);

  if (ph.kind === 'gameOver') return <GameOver state={state} onQuit={onQuit} />;

  const n = state.players.length;
  const others = Array.from({ length: n - 1 }, (_, i) => (focus + 1 + i) % n);
  const seat = seating(others);
  const deltas = new Map<number, number>();
  if (ph.kind === 'result') for (const r of ph.result.rows) deltas.set(r.player, r.delta);
  const month = MONTHS[Math.min(state.monthIdx, 11)];
  const term = termOfMonth(month);

  const pushing = ph.kind === 'push' && !cpuTurn && ph.player === focus;
  const releasing = ph.kind === 'release' && !cpuTurn && ph.player === focus;
  const targets = pushing ? pushTargets(state, ph.player) : [];
  const far = (pi: number) => (
    <Playmat
      key={pi}
      player={state.players[pi]}
      year={state.year}
      near={false}
      acting={actor === pi}
      delta={deltas.get(pi)}
      targetable={targets.includes(pi)}
      targeted={push.target === pi}
      onTarget={() => setPush((x) => ({ ...x, target: pi }))}
    />
  );
  const me = state.players[focus];
  const editingRoles = ph.kind === 'roles' && ph.player === focus && !me.isCpu;

  return (
    <div className="table-wrap">
      <header className="topbar">
        <div className="calendar">
          <b>
            {state.year}年生 {month}月
          </b>
          <span>{term === 0 ? '夏休み' : `${term}学期`}</span>
          <small>
            {state.year}/{state.years}年
          </small>
        </div>
        <EraBar state={state} />
        <div className="top-actions">
          {state.players.some((p) => p.isCpu) && (
            <button className="btn small ghost" title="CPUの速さ" onClick={() => setSpeed((s) => (s === 'fast' ? 'normal' : 'fast'))}>
              {speed === 'fast' ? '⏩' : '▶'}
            </button>
          )}
          <button className="btn small ghost" title="ログ" onClick={() => setShowLog((v) => !v)}>
            📜
          </button>
          <button className="btn small ghost" title="遊び方" onClick={onRules}>
            ❓
          </button>
          <button className="btn small ghost" title="タイトルへ" onClick={onQuit}>
            ⏏
          </button>
        </div>
      </header>

      <div className={`felt seats-${n}`}>
        <div className="side left">{seat.left.map(far)}</div>
        <div className="side top">{seat.top.map(far)}</div>
        <div className="side right">{seat.right.map(far)}</div>
        <Center state={state} dispatch={dispatch} cpuBusy={cpuTurn} push={push} />
        <div className="near-seat">
          {editingRoles ? (
            <RoleEditor
              key={`${state.year}-${state.monthIdx}-${focus}`}
              player={me}
              year={state.year}
              onConfirm={(roles) => dispatch({ type: 'setRoles', roles })}
            />
          ) : (
            <Playmat
              player={me}
              year={state.year}
              near
              acting={actor === focus}
              delta={deltas.get(focus)}
              onSeatClick={
                releasing
                  ? (uid) => dispatch({ type: 'release', uid })
                  : pushing && me.students.length > MIN_CLASS
                    ? (uid) => setPush((x) => ({ ...x, uid }))
                    : undefined
              }
              selectedUid={pushing ? push.uid : null}
            />
          )}
        </div>
      </div>

      {showLog && (
        <div className="log" ref={logRef}>
          {state.log.map((l) => (
            <div key={l.id} className="log-line">
              <span className="log-when">{l.when}</span>
              {l.player !== undefined && <span className="dot" style={{ background: state.players[l.player].color }} />}
              {l.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
