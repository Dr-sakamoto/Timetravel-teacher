import { ERAS } from '../game/data/eras';
import { useState } from 'react';
import { currentEra } from '../game/engine';
import { EVENT_MAP, cardRule } from '../game/data/events';
import { STARTING_MEMBERS, attrScore } from '../game/calc';
import { DeckInfo } from './DeckInfo';
import type { Action, GameState } from '../game/types';
import { EventCardView } from './EventCardView';
import { TcgCard } from './TcgCard';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  cpuBusy: boolean;
  /** 転校・カチコミ・クラス替え・グッズで選んだもの */
  pick: Pick;
}

/** 手前のマットで選んだ自分の生徒・相手のクラス・相手の生徒 */
export interface Pick {
  uid: string | null;
  target: number | null;
  theirUid: string | null;
}

/** 卓の中央：山札・捨て札・めくったカードと手番の操作 */
export function Center({ state, dispatch, cpuBusy, pick }: Props) {
  const ph = state.phase;
  const era = ERAS[currentEra(state)];
  const actor = ph.kind !== 'gameOver' && ph.player !== null ? state.players[ph.player] : null;
  const human = actor && !actor.isCpu && !cpuBusy;
  const canDraw = human && ph.kind === 'draw';
  const canMember = human && ph.kind === 'memberDraw';
  const [showDeck, setShowDeck] = useState(false);

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
        <button className="pile discard" title="山札の内訳を見る" onClick={() => setShowDeck(true)}>
          <span className="pile-back">🗑️</span>
          <span className="pile-label">捨て札・内訳</span>
          <span className="pile-count">{state.discard.length}</span>
        </button>
        {ph.kind === 'memberDraw' ? (
          <button className={`pile modern-pile ${canMember ? 'glow' : ''}`} disabled={!canMember} onClick={() => dispatch({ type: 'drawMember' })}>
            <span className="pile-back">🏫</span>
            <span className="pile-label">現代の生徒</span>
            <span className="pile-count">{state.starters.length}</span>
          </button>
        ) : (
          <div className="pile era-pile" style={{ borderColor: era.color }} title={`まだ転入していない${era.name}の生徒`}>
            <span className="pile-back">{era.icon}</span>
            <span className="pile-label">{era.id === 'present' ? '現代の生徒' : `${era.name}の偉人`}</span>
            <span className="pile-count">{state.pools[era.id].length}</span>
          </div>
        )}
      </div>
      {showDeck && <DeckInfo state={state} onClose={() => setShowDeck(false)} />}
      <div className="action">
        <Action
          key={ph.kind}
          state={state}
          dispatch={dispatch}
          cpuBusy={cpuBusy}
          pick={pick}
        />
      </div>
    </div>
  );
}

function Action({ state, dispatch, cpuBusy, pick }: Props) {
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
          {who} が生徒を引く（{p.students.length}/{STARTING_MEMBERS}）
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
      const target = pick.target !== null ? state.players[pick.target] : null;
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      return (
        <div className="say">
          📦 {who} の転校 — 手前の教室から生徒を選び、押しつける相手の名札をタップ
          <div className="say-sub">
            {st ? `${st.icon}${st.name}` : '生徒：未選択'} → {target ? target.name : '相手：未選択'}
          </div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'push', uid: null })}>
              やめる
            </button>
            <button
              className="btn primary"
              disabled={!pick.uid || pick.target === null}
              onClick={() => pick.uid && pick.target !== null && dispatch({ type: 'push', uid: pick.uid, target: pick.target })}
            >
              押しつける
            </button>
          </div>
        </div>
      );
    }
    case 'kachikomi': {
      const power = attrScore(state.players[ph.player], 'fight').total;
      const target = pick.target !== null ? state.players[pick.target] : null;
      return (
        <div className="say">
          👊 {who} のカチコミ — 殴りこむ相手の名札をタップ（相手は−{power}）
          <div className="say-sub">→ {target ? target.name : '相手：未選択'}</div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'kachikomi', target: null })}>
              やめる
            </button>
            <button className="btn primary" disabled={pick.target === null} onClick={() => dispatch({ type: 'kachikomi', target: pick.target })}>
              カチコむ
            </button>
          </div>
        </div>
      );
    }
    case 'exchange': {
      const mine = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      const target = pick.target !== null ? state.players[pick.target] : null;
      const theirs = target?.students.find((x) => x.uid === pick.theirUid);
      return (
        <div className="say">
          🔁 {who} のクラス替え — 手前の教室から出す生徒を選び、相手の名札をタップして入れ替える相手を選ぶ（係の子は出せない）
          <div className="say-sub">
            {mine ? `${mine.icon}${mine.name}` : '自分の生徒：未選択'} ⇄ {theirs ? `${theirs.icon}${theirs.name}（${target!.name}）` : target ? `${target.name}の生徒：未選択` : '相手：未選択'}
          </div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'exchange', uid: null })}>
              やめる
            </button>
            <button
              className="btn primary"
              disabled={!pick.uid || pick.target === null || !pick.theirUid}
              onClick={() =>
                pick.uid && pick.target !== null && pick.theirUid && dispatch({ type: 'exchange', uid: pick.uid, target: pick.target, theirUid: pick.theirUid })
              }
            >
              入れ替える
            </button>
          </div>
        </div>
      );
    }
    case 'equip': {
      const c = EVENT_MAP[ph.card];
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      return (
        <div className="say">
          {c.icon} {who} がグッズ「{c.name}」をゲット — {cardRule(c)}。手前の教室から装備する生徒をタップ
          <div className="say-sub">{st ? `${st.icon}${st.name}` : '生徒：未選択'}</div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'equip', uid: null })}>
              装備しない
            </button>
            <button className="btn primary" disabled={!pick.uid} onClick={() => dispatch({ type: 'equip', uid: pick.uid })}>
              装備する
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
