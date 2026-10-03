import { useEffect, useRef, useState } from 'react';
import { cpuAction } from '../game/ai';
import { MONTHS, actingPlayer, cyborgable, droppable, equippable, exchangeTargets, kachikomiTargets, slotsNow, termOfMonth, tradeable } from '../game/engine';
import type { Action, GameState } from '../game/types';
import type { Pick } from './Center';
import { Center } from './Center';
import { GameOver } from './GameOver';
import { OpponentSeat, Playmat } from './Playmat';
import { RoleEditor } from './RoleEditor';
import { EraBar } from './Timeline';
import { useGameFx } from './useGameFx';

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
  const feltRef = useRef<HTMLDivElement>(null);
  // どのカードから何点入ったかの演出（CPUの「速い」設定では早送り）
  const fx = useGameFx(state, feltRef, speed === 'fast' ? 0.35 : 1);
  const fxLength = fx?.length ?? 0;
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
      const t = setTimeout(() => dispatch({ type: 'continue' }), Math.max(2400, fxLength + 700) * mul);
      return () => clearTimeout(t);
    }
    if (!cpuTurn) return;
    const a = cpuAction(state);
    if (!a) return;
    const t = setTimeout(() => dispatch(a), 800 * mul);
    return () => clearTimeout(t);
  }, [state, cpuTurn, allCpu, speed, dispatch, ph, fxLength]);

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
      if (!fx || fx.settled(r.player)) deltas.set(r.player, r.delta);
      r.uids?.forEach((u) => lit.add(u));
    }
    ph.result.students?.forEach((st) => lit.add(st.uid));
  }
  const month = MONTHS[Math.min(state.monthIdx, MONTHS.length - 1)];
  const term = termOfMonth(month);
  const slots = slotsNow(state);

  // 転校・カチコミ・クラス替え・グッズ：手前の教室の生徒と、相手のクラスを選ぶ（転校は自分の生徒だけ）
  const choosing = (ph.kind === 'push' || ph.kind === 'kachikomi' || ph.kind === 'exchange' || ph.kind === 'equip' || ph.kind === 'cyborg') && !cpuTurn && ph.player === focus ? ph.kind : null;
  const targets =
    choosing === 'kachikomi' ? kachikomiTargets(state, focus)
    : choosing === 'exchange' ? exchangeTargets(state, focus)
    : choosing === 'cyborg' ? state.players.filter((p) => p.id !== focus && cyborgable(p).length > 0).map((p) => p.id)
    : [];
  const meNow = state.players[focus];
  const selectable =
    choosing === 'push' ? droppable(meNow)
    : choosing === 'exchange' ? meNow.students
    : choosing === 'equip' ? equippable(meNow)
    : choosing === 'cyborg' ? cyborgable(meNow)
    : [];
  const pickOpponent = (pi: number) => {
    if (!targets.includes(pi)) return setPeek(pi);
    setPick((x) => ({ ...x, target: pi, theirUid: x.target === pi ? x.theirUid : null }));
    // クラス替え・サイボーグ化は相手の教室を開いて、生徒を選ぶ
    if (choosing === 'exchange' || choosing === 'cyborg') setPeek(pi);
  };
  const peekPicking = (choosing === 'exchange' || choosing === 'cyborg') && peek !== null && peek === pick.target;
  /** 相手の教室で選べる生徒 */
  const peekable = (pi: number) => (choosing === 'cyborg' ? cyborgable(state.players[pi]) : tradeable(state.players[pi]));
  // 手番の人が相手なら、その人の教室を卓の中央に出す
  const stage = actor !== null && actor !== focus ? actor : null;
  // 演出中は、まだ届いていない点を名札から引いて見せる
  const shown = (i: number) => (fx ? { ...state.players[i], points: fx.points(i) } : state.players[i]);
  const matLit = (i: number) => fx?.lit(i) ?? lit;
  const fxDim = (i: number) => (fx?.dims(i) ? (u: string) => fx.dims(i)!.has(u) : undefined);
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

      <div className="felt" ref={feltRef}>
        <div className="opponents">
          {others.map((pi) => (
            <OpponentSeat
              key={pi}
              player={shown(pi)}
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
              player={shown(stage)}
              year={state.year}
              slots={slots}
              variant="stage"
              acting
              delta={deltas.get(stage)}
              lit={matLit(stage)}
              dimUid={fxDim(stage)}
            />
          )}
          <Center state={state} dispatch={dispatch} cpuBusy={cpuTurn} pick={pick} side={fx?.side} />
        </div>
        <div className="near-seat">
          {editingRoles ? (
            <RoleEditor
              key={`${state.year}-${state.monthIdx}-${focus}`}
              player={me}
              year={state.year}
              slots={slots}
              onConfirm={(roles, unlock) => dispatch({ type: 'setRoles', roles, unlock })}
            />
          ) : (
            <Playmat
              player={shown(focus)}
              year={state.year}
              slots={slots}
              variant="near"
              acting={actor === focus}
              delta={deltas.get(focus)}
              lit={matLit(focus)}
              onSeatClick={
                selectable.length
                  ? (uid) =>
                      selectable.some((x) => x.uid === uid) &&
                      // サイボーグ化は自分か相手のどちらか1人なので、自分の子を選んだら相手の選択は外す
                      setPick((x) => (choosing === 'cyborg' ? { uid, target: null, theirUid: null } : { ...x, uid }))
                  : undefined
              }
              selectedUid={choosing ? pick.uid : null}
              dimUid={selectable.length ? (uid) => !selectable.some((x) => x.uid === uid) : fxDim(focus)}
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
            {peekPicking && (
              <div className="peek-hint">
                {choosing === 'cyborg' ? '🦾 サイボーグにする生徒をタップ' : '🔁 こちらのクラスに来てもらう生徒をタップ（係の子は選べない）'}
              </div>
            )}
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
                      if (!peekable(peek).some((x) => x.uid === uid)) return;
                      setPick((x) => (choosing === 'cyborg' ? { uid: null, target: x.target, theirUid: uid } : { ...x, theirUid: uid }));
                      setPeek(null);
                    }
                  : undefined
              }
              selectedUid={peekPicking ? pick.theirUid : null}
              dimUid={peekPicking ? (uid) => !peekable(peek).some((x) => x.uid === uid) : undefined}
            />
          </div>
        </div>
      )}

      {fx && <div className="fx-layer">{fx.overlay}</div>}

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
