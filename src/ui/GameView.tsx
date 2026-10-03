import { useEffect, useRef, useState } from 'react';
import { cpuAction } from '../game/ai';
import { MIN_CLASS } from '../game/calc';
import { MONTHS, actingPlayer, equippable, exchangeTargets, kachikomiTargets, pushTargets, slotsNow, termOfMonth, tradeable } from '../game/engine';
import type { Action, GameState } from '../game/types';
import type { Pick } from './Center';
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
  const [pick, setPick] = useState<Pick>({ uid: null, target: null, theirUid: null });
  const logRef = useRef<HTMLDivElement>(null);
  const cpuTurn = actor !== null && state.players[actor].isCpu && ph.kind !== 'result';

  // 人間の手番になったら、その人を手前に座らせる（ホットシート）
  useEffect(() => {
    if (actor !== null && !state.players[actor].isCpu) setFocus(actor);
  }, [actor, state.players]);

  useEffect(() => {
    setPick({ uid: null, target: null, theirUid: null });
  }, [ph.kind]);

  // CPUの自動進行
  useEffect(() => {
    if (ph.kind === 'gameOver') return;
    const mul = speed === 'fast' ? 0.35 : 1;
    if (ph.kind === 'result') {
      const auto = (ph.player !== null && state.players[ph.player].isCpu) || allCpu;
      if (!auto) return;
      const t = setTimeout(() => dispatch({ type: 'continue' }), 2400 * mul);
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
  const month = MONTHS[Math.min(state.monthIdx, MONTHS.length - 1)];
  const term = termOfMonth(month);
  const slots = slotsNow(state);

  // 転校・カチコミ・交換留学・グッズ：手前の教室の生徒と、相手のクラスを選ぶ
  const choosing = (ph.kind === 'push' || ph.kind === 'kachikomi' || ph.kind === 'exchange' || ph.kind === 'equip') && !cpuTurn && ph.player === focus ? ph.kind : null;
  const targets =
    choosing === 'push' ? pushTargets(state, focus)
    : choosing === 'kachikomi' ? kachikomiTargets(state, focus)
    : choosing === 'exchange' ? exchangeTargets(state, focus)
    : [];
  const meNow = state.players[focus];
  const selectable =
    choosing === 'push' ? (meNow.students.length > MIN_CLASS ? meNow.students : [])
    : choosing === 'exchange' ? tradeable(meNow)
    : choosing === 'equip' ? equippable(meNow)
    : [];
  const pickOpponent = (pi: number) => {
    if (!targets.includes(pi)) return setPeek(pi);
    setPick((x) => ({ ...x, target: pi, theirUid: x.target === pi ? x.theirUid : null }));
    // 交換留学は相手の教室を開いて、交換する生徒を選ぶ
    if (choosing === 'exchange') setPeek(pi);
  };
  const peekPicking = choosing === 'exchange' && peek !== null && peek === pick.target;
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
              targeted={pick.target === pi}
              onClick={() => pickOpponent(pi)}
            />
          ))}
        </div>
        <div className={`stage ${stage !== null ? 'with-mat' : ''}`}>
          {stage !== null && (
            <Playmat
              key={stage}
              player={state.players[stage]}
              year={state.year}
              slots={slots}
              variant="stage"
              acting
              delta={deltas.get(stage)}
              lit={lit}
            />
          )}
          <Center state={state} dispatch={dispatch} cpuBusy={cpuTurn} pick={pick} />
        </div>
        <div className="near-seat">
          {editingRoles ? (
            <RoleEditor
              key={`${state.year}-${state.monthIdx}-${focus}`}
              player={me}
              year={state.year}
              slots={slots}
              onConfirm={(roles) => dispatch({ type: 'setRoles', roles })}
            />
          ) : (
            <Playmat
              player={me}
              year={state.year}
              slots={slots}
              variant="near"
              acting={actor === focus}
              delta={deltas.get(focus)}
              lit={lit}
              onSeatClick={selectable.length ? (uid) => selectable.some((x) => x.uid === uid) && setPick((x) => ({ ...x, uid })) : undefined}
              selectedUid={choosing ? pick.uid : null}
              dimUid={selectable.length ? (uid) => !selectable.some((x) => x.uid === uid) : undefined}
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
            {peekPicking && <div className="peek-hint">🔁 交換してもらう生徒をタップ（係の子は選べない）</div>}
            <Playmat
              player={state.players[peek]}
              year={state.year}
              slots={slots}
              variant="peek"
              delta={deltas.get(peek)}
              lit={lit}
              onSeatClick={
                peekPicking
                  ? (uid) => {
                      if (!tradeable(state.players[peek]).some((x) => x.uid === uid)) return;
                      setPick((x) => ({ ...x, theirUid: uid }));
                      setPeek(null);
                    }
                  : undefined
              }
              selectedUid={peekPicking ? pick.theirUid : null}
              dimUid={peekPicking ? (uid) => !tradeable(state.players[peek]).some((x) => x.uid === uid) : undefined}
            />
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
