import { useEffect, useRef, useState } from 'react';
import { classSummary, cpuAction } from '../game/ai';
import { MAX_CLASS, classGuard, roleOf } from '../game/calc';
import { CLASS_MAP, className } from '../game/data/classes';
import { actingPlayer, MONTHS, termOfMonth } from '../game/engine';
import { ATTR_ICON, type Action, type Attr, type GameState } from '../game/types';
import { GameOver } from './GameOver';
import { PhasePanel } from './PhasePanel';
import { StudentCard } from './StudentCard';
import { EraBar } from './Timeline';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  onQuit: () => void;
  onRules: () => void;
}

type SortKey = 'role' | 'new' | 'power' | Attr;

export function GameView({ state, dispatch, onQuit, onRules }: Props) {
  const ph = state.phase;
  const actor = actingPlayer(state);
  const allCpu = state.players.every((p) => p.isCpu);
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');
  const [viewPlayer, setViewPlayer] = useState<number>(actor ?? 0);
  const [sortKey, setSortKey] = useState<SortKey>('role');
  const [showLog, setShowLog] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const cpuTurn = actor !== null && state.players[actor].isCpu && ph.kind !== 'result';

  // 手番が変わったら表示するクラスも切り替える
  useEffect(() => {
    if (actor !== null) setViewPlayer(actor);
  }, [actor]);

  // CPUの自動進行
  useEffect(() => {
    if (ph.kind === 'gameOver') return;
    const mul = speed === 'fast' ? 0.35 : 1;
    if (ph.kind === 'result') {
      const auto = (ph.player !== null && state.players[ph.player].isCpu) || allCpu;
      if (!auto) return;
      const t = setTimeout(() => dispatch({ type: 'continue' }), 2600 * mul);
      return () => clearTimeout(t);
    }
    if (!cpuTurn) return;
    const a = cpuAction(state);
    if (!a) return;
    const t = setTimeout(() => dispatch(a), 900 * mul);
    return () => clearTimeout(t);
  }, [state, cpuTurn, allCpu, speed, dispatch, ph]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.log.length, showLog]);

  if (ph.kind === 'gameOver') {
    return <GameOver state={state} onQuit={onQuit} />;
  }

  const ranking = [...state.players].sort((a, b) => b.points - a.points);
  const vp = state.players[viewPlayer];
  const card = vp.classCardId ? CLASS_MAP[vp.classCardId] : null;
  const sorted = [...vp.students].sort((a, b) => {
    if (sortKey === 'role') {
      const ra = roleOf(vp, a.uid) ? 0 : 1;
      const rb = roleOf(vp, b.uid) ? 0 : 1;
      return ra - rb;
    }
    if (sortKey === 'new') return b.uid.localeCompare(a.uid, undefined, { numeric: true });
    if (sortKey === 'power') return b.power - a.power;
    return Number(b.attrs.includes(sortKey)) - Number(a.attrs.includes(sortKey)) || b.power - a.power;
  });
  const month = MONTHS[Math.min(state.monthIdx, 11)];
  const term = termOfMonth(month);

  return (
    <div className="game">
      <header className="topbar">
        <div className="calendar">
          <b>{state.year}年生 {month}月</b>
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

      <div className="layout">
        <aside className="scoreboard">
          {ranking.map((p) => (
            <button
              key={p.id}
              className={`score-row ${actor === p.id ? 'acting' : ''} ${viewPlayer === p.id ? 'viewing' : ''}`}
              style={{ borderColor: p.color }}
              onClick={() => setViewPlayer(p.id)}
              title={p.classCardId ? CLASS_MAP[p.classCardId].nick : ''}
            >
              <span className="score-icon">{p.classCardId ? CLASS_MAP[p.classCardId].icon : '❔'}</span>
              <span className="score-name">
                {p.name}
                {p.isCpu && <small>🤖</small>}
              </span>
              <span className="score-size">👥{p.students.length}</span>
              <span className="score-pts">{p.points}</span>
            </button>
          ))}
        </aside>

        <main className="main">
          <PhasePanel state={state} dispatch={dispatch} cpuBusy={cpuTurn} />
        </main>
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

      {card && (
        <section className="roster">
          <div className="roster-head">
            <div className="roster-tabs">
              {state.players.map((p) => (
                <button
                  key={p.id}
                  className={`tab ${viewPlayer === p.id ? 'active' : ''}`}
                  style={{ borderColor: p.color }}
                  onClick={() => setViewPlayer(p.id)}
                >
                  {p.classCardId && CLASS_MAP[p.classCardId].icon} {p.name}
                </button>
              ))}
            </div>
            <div className="summary-row small">
              <div className="summary" title={`${className(card.id, state.year)}「${card.nick}」`}>
                👥<b>{vp.students.length}</b>/{MAX_CLASS}
              </div>
              {classSummary(vp).map((c) => (
                <div key={c.label} className="summary" title={c.hint}>
                  {c.icon}
                  <b>{Math.round(c.value * 10) / 10}</b>
                </div>
              ))}
              {classGuard(vp) > 0 && (
                <div className="summary" title="失点軽減">
                  🛡️<b>-{Math.round(classGuard(vp) * 100)}%</b>
                </div>
              )}
            </div>
            <div className="sort">
              {(
                [
                  ['role', '🎖️'],
                  ['new', '🆕'],
                  ['power', '🔢'],
                  ['study', ATTR_ICON.study],
                  ['sports', ATTR_ICON.sports],
                  ['art', ATTR_ICON.art],
                  ['charm', ATTR_ICON.charm],
                  ['fight', ATTR_ICON.fight],
                ] as [SortKey, string][]
              ).map(([k, l]) => (
                <button key={k} className={`btn small ${sortKey === k ? 'primary' : 'ghost'}`} onClick={() => setSortKey(k)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="card-grid">
            {sorted.map((s) => (
              <StudentCard key={s.uid} student={s} owner={vp} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
