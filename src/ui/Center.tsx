import { ERAS } from '../game/data/eras';
import { currentEra, pushTargets } from '../game/engine';
import type { Action, GameState } from '../game/types';
import { EventCardView } from './EventCardView';
import { TcgCard } from './TcgCard';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  cpuBusy: boolean;
  /** 転校：手前のマットで選んだ生徒と、押しつけ先 */
  push: { uid: string | null; target: number | null };
}

/** 卓の中央：山札・捨て札・めくったカードと手番の操作 */
export function Center({ state, dispatch, cpuBusy, push }: Props) {
  const ph = state.phase;
  const era = ERAS[currentEra(state)];
  const actor = ph.kind !== 'gameOver' && ph.player !== null ? state.players[ph.player] : null;
  const human = actor && !actor.isCpu && !cpuBusy;
  const canDraw = human && ph.kind === 'draw';
  const canMember = human && ph.kind === 'memberDraw';

  return (
    <div className="center">
      <div className="piles">
        <button
          className={`pile event-pile ${canDraw ? 'glow' : ''}`}
          disabled={!canDraw}
          onClick={() => dispatch({ type: 'drawEvent' })}
          title="イベントの山札"
        >
          <span className="pile-back">🃏</span>
          <span className="pile-label">イベント</span>
          <span className="pile-count">{state.eventDeck.length}</span>
        </button>
        <div className="pile discard" title="捨て札">
          <span className="pile-back">🗑️</span>
          <span className="pile-label">捨て札</span>
          <span className="pile-count">{state.discard.length}</span>
        </div>
        {ph.kind === 'memberDraw' ? (
          <button className={`pile modern-pile ${canMember ? 'glow' : ''}`} disabled={!canMember} onClick={() => dispatch({ type: 'drawMember' })}>
            <span className="pile-back">🏫</span>
            <span className="pile-label">現代の生徒</span>
            <span className="pile-count">{state.modernDeck.length}</span>
          </button>
        ) : (
          <div className="pile era-pile" style={{ borderColor: era.color }} title={era.id === 'present' ? '現代の生徒' : `まだ転入していない${era.name}の偉人`}>
            <span className="pile-back">{era.icon}</span>
            <span className="pile-label">{era.id === 'present' ? '現代の生徒' : `${era.name}の偉人`}</span>
            <span className="pile-count">{era.id === 'present' ? '∞' : state.pools[era.id].length}</span>
          </div>
        )}
      </div>
      <div className="action">
        <Action
          key={ph.kind}
          state={state}
          dispatch={dispatch}
          cpuBusy={cpuBusy}
          push={push}
        />
      </div>
    </div>
  );
}

function Action({ state, dispatch, cpuBusy, push }: Props) {
  const ph = state.phase;
  if (ph.kind === 'gameOver') return null;
  const actor = ph.player !== null ? state.players[ph.player] : null;
  const who = actor ? <b style={{ color: actor.color }}>{actor.name}</b> : null;

  if (cpuBusy && ph.kind !== 'result') return <div className="say cpu">🤖 {who} の番…</div>;

  switch (ph.kind) {
    case 'memberDraw': {
      const p = state.players[ph.player];
      return (
        <div className="say">
          {who} が生徒を引く（{p.students.length}/6）
          <div className="say-sub">
            <button className="btn small ghost" onClick={() => dispatch({ type: 'drawAllMembers' })}>
              まとめて引く
            </button>
          </div>
        </div>
      );
    }
    case 'roles':
      return <div className="say">{who} の係決め — 手前の教室で係を選び、生徒をタップ</div>;
    case 'draw':
      return <div className="say">{who} の番 — イベントの山札をめくろう</div>;
    case 'push': {
      const targets = pushTargets(state, ph.player);
      return (
        <div className="say">
          📦 {who} の転校 — 手前の教室から生徒を選び、押しつける相手のマットをタップ
          <div className="say-sub">
            {targets.map((t) => (
              <span key={t} className={`chip ${push.target === t ? 'on' : ''}`} style={{ borderColor: state.players[t].color }}>
                → {state.players[t].name}
              </span>
            ))}
          </div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'push', uid: null })}>
              やめる
            </button>
            <button
              className="btn primary"
              disabled={!push.uid || push.target === null}
              onClick={() => push.uid && push.target !== null && dispatch({ type: 'push', uid: push.uid, target: push.target })}
            >
              押しつける
            </button>
          </div>
        </div>
      );
    }
    case 'result': {
      const r = ph.result;
      return (
        <div className="reveal">
          <EventCardView result={r} />
          <div className="reveal-side">
            {r.rows.length > 0 && (
              <div className="tally">
                {r.rows.map((row) => {
                  const p = state.players[row.player];
                  return (
                    <div key={row.player} className="tally-row" style={{ borderColor: p.color }}>
                      <span className="tally-rank">{row.note ?? (row.rank !== undefined ? `${row.rank + 1}位` : '')}</span>
                      <span className="tally-name">{p.name}</span>
                      {row.count !== undefined && <span className="tally-count">{row.count}</span>}
                      <span className={`tally-delta ${row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : ''}`}>
                        {row.delta > 0 ? '+' : ''}
                        {row.delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {r.students && r.students.length > 0 && (
              <div className="deal">
                {r.students.map((s) => (
                  <TcgCard key={s.uid} student={s} />
                ))}
              </div>
            )}
            <button className="btn primary" onClick={() => dispatch({ type: 'continue' })}>
              次へ
            </button>
          </div>
        </div>
      );
    }
  }
}
