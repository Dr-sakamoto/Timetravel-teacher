import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cpuAction } from '../game/ai';
import { MONTHS, actingPlayer, cyborgable, inGuerrilla, nextTurnPlayer, droppable, equippable, exchangePairs, exchangeTargets, kachikomiTargets, slotsNow, termOfMonth } from '../game/engine';
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
  /** 通信対戦：この端末で操作する席（なければ1台を回すホットシート） */
  me?: number;
  /** CPUを動かし、CPUの結果を自動で進める端末か（通信対戦では部屋を作った人だけ） */
  driver?: boolean;
  /** 通信対戦：席ごとにつながっているか（つながっていない人は名札に出す） */
  offline?: (pi: number) => boolean;
  /** 通信対戦：画面の上に出す通信の状態など */
  banner?: ReactNode;
}

export function GameView({ state, dispatch, onQuit, onRules, me: mySeat, driver = true, offline, banner }: Props) {
  const online = mySeat !== undefined;
  const ph = state.phase;
  const actor = actingPlayer(state);
  const allCpu = state.players.every((p) => p.isCpu);
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [showLog, setShowLog] = useState(false);
  /** タップして中身を見ている相手 */
  const [peek, setPeek] = useState<number | null>(null);
  const [focus, setFocus] = useState(() => mySeat ?? state.players.find((p) => !p.isCpu)?.id ?? 0);
  const [pick, setPick] = useState<Pick>({ uid: null, target: null, theirUid: null });
  const logRef = useRef<HTMLDivElement>(null);
  const feltRef = useRef<HTMLDivElement>(null);
  // どのカードから何点入ったかの演出（CPUの「速い」設定では早送り）
  const fx = useGameFx(state, feltRef, speed === 'fast' ? 0.35 : 1, focus);
  const fxLength = fx?.length ?? 0;
  /** ゲリラの最中（誰の手番でもない。転校で選んでいる人も手番の光り方にしない） */
  const guerrilla = inGuerrilla(state);
  const upNext = guerrilla ? nextTurnPlayer(state) : null;
  const cpuTurn = actor !== null && state.players[actor].isCpu && ph.kind !== 'result';
  /** 通信対戦で、ほかの人の番（自分は見ているだけ） */
  const othersTurn = online && actor !== mySeat && ph.kind !== 'result';
  // 結果の「次へ」：手番の人が人間ならその人、CPUや全員向けの結果なら誰でも
  const resultOwner = ph.kind === 'result' && ph.player !== null && !state.players[ph.player].isCpu ? ph.player : null;
  const canContinue = !online || (mySeat !== undefined && !state.players[mySeat].isCpu && (resultOwner === null || resultOwner === mySeat));

  // 人間の手番になったら、その人を手前に座らせる（ホットシート）。通信対戦では自分の席のまま
  useEffect(() => {
    if (online) return;
    if (actor !== null && !state.players[actor].isCpu) setFocus(actor);
  }, [actor, state.players, online]);

  useEffect(() => {
    setPick({ uid: null, target: null, theirUid: null });
  }, [ph.kind]);

  // CPUの自動進行
  useEffect(() => {
    if (ph.kind === 'gameOver' || !driver) return;
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
  }, [state, cpuTurn, allCpu, speed, dispatch, ph, fxLength, driver]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.log.length, showLog]);

  if (ph.kind === 'gameOver') return <GameOver state={state} onQuit={onQuit} />;

  const n = state.players.length;
  const others = Array.from({ length: n - 1 }, (_, i) => (focus + 1 + i) % n);
  const deltas = new Map<number, number>();
  /** 順位のあるイベントの順位（名札にメダルを出す） */
  const ranks = new Map<number, number>();
  // 今のイベントに関わったカード（光らせる。相手の席には絵柄を出す）
  const lit = new Set<string>();
  if (ph.kind === 'result') {
    for (const r of ph.result.rows) {
      if (!fx || fx.settled(r.player)) deltas.set(r.player, r.delta);
      if (r.rank !== undefined) ranks.set(r.player, r.rank);
      r.uids?.forEach((u) => lit.add(u));
    }
    ph.result.students?.forEach((st) => lit.add(st.uid));
  }
  const month = MONTHS[Math.min(state.monthIdx, MONTHS.length - 1)];
  const term = termOfMonth(month);
  const slots = slotsNow(state);

  // 転校・カチコミ・クラス替え・グッズ：手前の教室の生徒と、相手のクラスを選ぶ（転校は自分の生徒だけ）
  const choosing =
    (ph.kind === 'push' || ph.kind === 'makeRoom' || ph.kind === 'kachikomi' || ph.kind === 'exchange' || ph.kind === 'equip' || ph.kind === 'cyborg' || ph.kind === 'newWorld') && !cpuTurn && !othersTurn && ph.player === focus
      ? ph.kind
      : null;
  // クラス替え：アイコンの数が同じ子どうしの組み合わせ（自分の子を選んでいたらその子の相手だけ）
  const pairs = choosing === 'exchange' ? exchangePairs(state, focus) : [];
  const targets =
    choosing === 'kachikomi' ? kachikomiTargets(state, focus)
    : choosing === 'exchange' ? exchangeTargets(state, focus)
    : [];
  const meNow = state.players[focus];
  const selectable =
    choosing === 'push' || choosing === 'makeRoom' ? droppable(meNow)
    : choosing === 'exchange' ? meNow.students.filter((x) => pairs.some((y) => y.uid === x.uid))
    : choosing === 'equip' || choosing === 'newWorld' ? equippable(meNow)
    : choosing === 'cyborg' ? cyborgable(meNow)
    : [];
  const pickOpponent = (pi: number) => {
    if (!targets.includes(pi)) return setPeek(pi);
    setPick((x) => ({ ...x, target: pi, theirUid: x.target === pi ? x.theirUid : null }));
    // クラス替えは相手の教室を開いて、交換する生徒を選ぶ
    if (choosing === 'exchange') setPeek(pi);
  };
  const peekPicking = choosing === 'exchange' && peek !== null && peek === pick.target;
  /** 相手の教室で選べる生徒 */
  const peekable = (pi: number) =>
    state.players[pi].students.filter((x) => pairs.some((y) => y.target === pi && y.theirUid === x.uid && (!pick.uid || y.uid === pick.uid)));
  // 演出中は、まだ届いていない点を名札から引いて見せる
  const shown = (i: number) => (fx ? { ...state.players[i], points: fx.points(i) } : state.players[i]);
  const matLit = (i: number) => fx?.lit(i) ?? lit;
  const fxDim = (i: number) => (fx?.dims(i) ? (u: string) => fx.dims(i)!.has(u) : undefined);
  const me = state.players[focus];
  const editingRoles = ph.kind === 'roles' && ph.player === focus && !me.isCpu && !othersTurn;

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
          {driver && state.players.some((p) => p.isCpu) && (
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

      {banner}

      <div className={`felt ${guerrilla ? 'in-guerrilla' : ''} ${ph.kind === 'newWorld' ? 'new-world' : ''}`} ref={feltRef}>
        <div className="opponents">
          {others.map((pi) => (
            <OpponentSeat
              key={pi}
              player={shown(pi)}
              year={state.year}
              acting={!guerrilla && actor === pi}
              picking={guerrilla && actor === pi}
              upNext={upNext === pi}
              offline={offline?.(pi)}
              delta={deltas.get(pi)}
              rank={ranks.get(pi)}
              litIcons={state.players[pi].students.filter((st) => lit.has(st.uid)).map((st) => st.icon)}
              targetable={targets.includes(pi)}
              targeted={pick.target === pi}
              onClick={() => pickOpponent(pi)}
            />
          ))}
        </div>
        {/* 相手の教室は卓に出さない（名札をタップしたときだけ開く） */}
        <div className="stage">
          <Center state={state} dispatch={dispatch} cpuBusy={cpuTurn || othersTurn} canContinue={canContinue} pick={pick} side={fx?.side} />
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
              acting={!guerrilla && actor === focus}
              picking={guerrilla && actor === focus}
              upNext={upNext === focus}
              delta={deltas.get(focus)}
              rank={ranks.get(focus)}
              lit={matLit(focus)}
              onSeatClick={
                selectable.length
                  ? (uid) =>
                      selectable.some((x) => x.uid === uid) &&
                      setPick((x) => ({ ...x, uid, theirUid: x.uid === uid ? x.theirUid : null }))
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
            {peekPicking && <div className="peek-hint">🔁 こちらのクラスに来てもらう生徒をタップ（アイコンの数が同じ子だけ。係の子は選べない）</div>}
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
                      setPick((x) => ({ ...x, theirUid: uid }));
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
