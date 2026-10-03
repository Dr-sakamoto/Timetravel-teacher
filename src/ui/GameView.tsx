import { useEffect, useRef, useState } from 'react';
import { cpuAction } from '../game/ai';
import { MIN_CLASS } from '../game/calc';
import { MONTHS, actingPlayer, pushTargets, termOfMonth } from '../game/engine';
import type { Action, GameState } from '../game/types';
import { Center } from './Center';
import { GameOver } from './GameOver';
import { OpponentSeat, Playmat } from './Playmat';
import { RoleEditor } from './RoleEditor';
import { EraBar } from './Timeline';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  onQuit: () => void;
  onRules: () => void;
}

export function GameView({ state, dispatch, onQuit, onRules }: Props) {
  const ph = state.phase;
  const actor = actingPlayer(state);
  const allCpu = state.players.every((p) => p.isCpu);
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [showLog, setShowLog] = useState(false);
  const [portraitOk, setPortraitOk] = useState(false);
  /** タップして中身を見ている相手 */
  const [peek, setPeek] = useState<number | null>(null);
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
  const deltas = new Map<number, number>();
  // 今のイベントに関わったカード（光らせる。相手の席には絵柄を出す）
  const lit = new Set<string>();
  if (ph.kind === 'result') {
    for (const r of ph.result.rows) {
      deltas.set(r.player, r.delta);
      r.uids?.forEach((u) => lit.add(u));
    }
    ph.result.students?.forEach((st) => lit.add(st.uid));
  }
  const month = MONTHS[Math.min(state.monthIdx, 11)];
  const term = termOfMonth(month);

  const pushing = ph.kind === 'push' && !cpuTurn && ph.player === focus;
  const targets = pushing ? pushTargets(state, ph.player) : [];
  // 手番の人が相手なら、その人の教室を卓の中央に出す
  const stage = actor !== null && actor !== focus ? actor : null;
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

      <div className="felt">
        <div className="opponents">
          {others.map((pi) => (
            <OpponentSeat
              key={pi}
              player={state.players[pi]}
              year={state.year}
              acting={actor === pi}
              delta={deltas.get(pi)}
              litIcons={state.players[pi].students.filter((st) => lit.has(st.uid)).map((st) => st.icon)}
              targetable={targets.includes(pi)}
              targeted={push.target === pi}
              onClick={() => (targets.includes(pi) ? setPush((x) => ({ ...x, target: pi })) : setPeek(pi))}
            />
          ))}
        </div>
        <div className={`stage ${stage !== null ? 'with-mat' : ''}`}>
          {stage !== null && (
            <Playmat
              key={stage}
              player={state.players[stage]}
              year={state.year}
              variant="stage"
              acting
              delta={deltas.get(stage)}
              lit={lit}
            />
          )}
          <Center state={state} dispatch={dispatch} cpuBusy={cpuTurn} push={push} />
        </div>
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
              variant="near"
              acting={actor === focus}
              delta={deltas.get(focus)}
              lit={lit}
              onSeatClick={pushing && me.students.length > MIN_CLASS ? (uid) => setPush((x) => ({ ...x, uid })) : undefined}
              selectedUid={pushing ? push.uid : null}
            />
          )}
        </div>
      </div>

      {peek !== null && (
        <div className="modal-back" onClick={() => setPeek(null)}>
          <div className="peek" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPeek(null)} aria-label="閉じる">
              ✕
            </button>
            <Playmat player={state.players[peek]} year={state.year} variant="peek" delta={deltas.get(peek)} lit={lit} />
          </div>
        </div>
      )}

      {!portraitOk && (
        <div className="rotate-hint">
          <div className="rotate-hint-icon">📱</div>
          <b>スマホを横向きにしてね</b>
          <button className="btn small ghost" onClick={() => setPortraitOk(true)}>
            このまま遊ぶ
          </button>
        </div>
      )}

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
