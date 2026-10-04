import { ERAS } from '../game/data/eras';
import { useState, type ReactNode } from 'react';
import { canTake, currentEra, marketCost, previewStudent } from '../game/engine';
import { EVENT_MAP, KACHIKOMI_CARDS, cardRule } from '../game/data/events';
import { MAX_CLASS, STARTING_MEMBERS, attrScore } from '../game/calc';
import { DeckInfo } from './DeckInfo';
import { ATTR_ICON, type Action, type GameState } from '../game/types';
import { EventCardView } from './EventCardView';
import { TcgCard } from './TcgCard';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  /** ほかの人（CPU・通信対戦の相手）の番で、この端末からは操作しない */
  cpuBusy: boolean;
  /** 結果の「次へ」を押せるか（通信対戦では手番の人だけ） */
  canContinue?: boolean;
  /** 転校・カチコミ・クラス替え・グッズで選んだもの */
  pick: Pick;
  /** 得点演出の明細（襲来）。点数表の上に出す */
  side?: ReactNode;
}

/** 手前のマットで選んだ自分の生徒・相手のクラス・相手の生徒 */
export interface Pick {
  uid: string | null;
  target: number | null;
  theirUid: string | null;
}

/** 場のカード1枚の見た目 */
function MarketCard({ id, selected, dim, onClick }: { id: string; selected: boolean; dim: boolean; onClick?: () => void }) {
  const cost = marketCost(id);
  const costLabel = cost > 0 ? `${cost}点` : '無料';
  if (id.startsWith('person:')) {
    return (
      <button className={`mcard person ${selected ? 'selected' : ''} ${dim ? 'dim' : ''}`} onClick={onClick} disabled={!onClick}>
        <TcgCard student={previewStudent(id)} size="mini" />
        <span className={`mcard-cost ${cost > 0 ? '' : 'free'}`}>{costLabel}</span>
      </button>
    );
  }
  const c = EVENT_MAP[id];
  const attr = 'attr' in c && c.attr ? (c.attr === 'all' ? '🌈' : ATTR_ICON[c.attr]) : null;
  const tone = c.kind === 'normal' ? 'normal' : 'personal';
  return (
    <button className={`mcard tone-${tone} ${selected ? 'selected' : ''} ${dim ? 'dim' : ''}`} onClick={onClick} disabled={!onClick}>
      <span className="mcard-icon">{c.icon}</span>
      <span className="mcard-name">{c.name}</span>
      {attr && <span className="mcard-attr">{attr}</span>}
      <span className={`mcard-cost ${cost > 0 ? '' : 'free'}`}>{costLabel}</span>
    </button>
  );
}

/** 卓の中央：山札・場のカード・捨て札・めくったカードと手番の操作 */
export function Center({ state, dispatch, cpuBusy, canContinue = true, pick, side }: Props) {
  const ph = state.phase;
  const era = ERAS[currentEra(state)];
  const actor = ph.kind !== 'gameOver' && ph.player !== null ? state.players[ph.player] : null;
  const human = actor && !actor.isCpu && !cpuBusy;
  const canPick = human && ph.kind === 'draw';
  const canMember = human && ph.kind === 'memberDraw';
  const [showDeck, setShowDeck] = useState(false);
  /** 手番の人が選んでいる場のカード */
  const [sel, setSel] = useState<number | null>(null);
  const selected = canPick && sel !== null && sel < state.market.length ? sel : null;

  return (
    <div className="center">
      {ph.kind !== 'memberDraw' && state.market.length > 0 && (
        <div className={`market ${canPick ? 'glow' : ''}`}>
          {state.market.map((id, i) => (
            <MarketCard
              key={`${i}-${id}`}
              id={id}
              selected={selected === i}
              dim={!!canPick && ph.kind === 'draw' && !canTake(state, ph.player, i)}
              onClick={canPick ? () => setSel(i) : undefined}
            />
          ))}
        </div>
      )}
      <div className="piles">
        <button className="pile event-pile" disabled title="イベントの山札">
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
          dispatch={(a) => {
            setSel(null);
            dispatch(a);
          }}
          cpuBusy={cpuBusy}
          canContinue={canContinue}
          pick={pick}
          side={side}
          sel={selected}
        />
      </div>
    </div>
  );
}

function Action({ state, dispatch, cpuBusy, canContinue = true, pick, side, sel }: Props & { sel: number | null }) {
  const ph = state.phase;
  if (ph.kind === 'gameOver') return null;
  const actor = ph.player !== null ? state.players[ph.player] : null;
  const who = actor ? <b style={{ color: actor.color }}>{actor.name}</b> : null;

  if (cpuBusy && ph.kind !== 'result')
    return (
      <div className="say cpu">
        {actor?.isCpu ? '🤖' : '⏳'} {who} の番…
      </div>
    );

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
    case 'roles': {
      const era = ERAS[currentEra(state)];
      return (
        <div className="say">
          {who} の係決め — 生徒のカードを係の場に置こう（ドラッグ／タップ）
          <div className="say-sub era-motto">
            {era.icon}
            {era.name}「{era.motto}」
          </div>
        </div>
      );
    }
    case 'draw': {
      if (sel === null)
        return (
          <div className="say">
            {who} の番 — 場のカードを1枚選ぼう（持ち点 {state.players[ph.player].points}）
          </div>
        );
      const id = state.market[sel];
      const cost = marketCost(id);
      const p = state.players[ph.player];
      const person = id.startsWith('person:') ? previewStudent(id) : null;
      const ok = canTake(state, ph.player, sel);
      const card = person ? null : EVENT_MAP[id];
      /** 授業カードなら、取ったら今すぐ入る点 */
      const gainNow = card?.kind === 'normal' ? attrScore(p, card.attr).total : null;
      const why = ok
        ? null
        : cost > 0 && p.points < cost
          ? `ポイントが足りない（持ち点 ${p.points}）`
          : person
            ? '満席で、代わりに転校させられる子がいない'
            : '使える生徒・相手がいない';
      const text = person
        ? `${person.icon}${person.name}（${person.rarity}・${person.attrs.map((a) => ATTR_ICON[a]).join('')}）が転入${p.students.length >= MAX_CLASS ? '。満席なので代わりに1人転校させる' : ''}`
        : cardRule(EVENT_MAP[id]);
      return (
        <div className="say">
          {who}：{text}
          {why && <div className="say-sub warn">{why}</div>}
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'pass', slot: sel })} title="このカードを捨て札にして、何もせずに手番を終える">
              捨てて見送る
            </button>
            <button className="btn primary" disabled={!ok} onClick={() => dispatch({ type: 'take', slot: sel })}>
              取る{cost > 0 ? `（−${cost}点）` : gainNow !== null ? `（+${gainNow}点）` : ''}
            </button>
          </div>
        </div>
      );
    }
    case 'makeRoom': {
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      const newcomer = previewStudent(state.market[ph.slot]);
      return (
        <div className="say">
          🚪 {who} のクラスは満席 — {newcomer.icon}
          {newcomer.name}を迎える代わりに、係に就いていない生徒を1人転校させる
          <div className="say-sub">{st ? `${st.icon}${st.name}` : '生徒：未選択'}</div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'makeRoom', uid: null })}>
              やめる
            </button>
            <button className="btn primary" disabled={!pick.uid} onClick={() => pick.uid && dispatch({ type: 'makeRoom', uid: pick.uid })}>
              転校させて迎える（−{marketCost(state.market[ph.slot])}点）
            </button>
          </div>
        </div>
      );
    }
    case 'push': {
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      return (
        <div className="say">
          📦 転校（ゲリラ）— {who} は係に就いていない生徒を1人選んで転校させる（必ず1人）
          <div className="say-sub">{st ? `${st.icon}${st.name}` : '生徒：未選択'}</div>
          <div className="say-sub">
            <button className="btn primary" disabled={!pick.uid} onClick={() => pick.uid && dispatch({ type: 'push', uid: pick.uid })}>
              転校させる
            </button>
          </div>
        </div>
      );
    }
    case 'kachikomi': {
      const power = attrScore(state.players[ph.player], 'fight').total * KACHIKOMI_CARDS[0].mult;
      const target = pick.target !== null ? state.players[pick.target] : null;
      return (
        <div className="say">
          👊 ゲリラ発生！ {who} のクラスのヤンキーがカチコミに行く — 殴りこむ相手の名札をタップ（相手は−{power}）
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
          🔁 {who} のクラス替え — 手前の教室から出す生徒を選び、相手の名札をタップして連れてくる生徒を選ぶ（アイコンの数が同じ子どうしだけ。グッズの＋1は数えない。相手の係の子は選べない）
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
    case 'cyborg': {
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      return (
        <div className="say">
          🦾 {who} のサイボーグ化 — {cardRule(EVENT_MAP.cyborg)}。手前の教室から生徒をタップ
          <div className="say-sub">{st ? `${st.icon}${st.name}` : '生徒：未選択'}</div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'cyborg', uid: null })}>
              やめる
            </button>
            <button className="btn primary" disabled={!pick.uid} onClick={() => dispatch({ type: 'cyborg', uid: pick.uid })}>
              サイボーグにする（−{marketCost('cyborg')}点）
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
          {c.icon} {who} がグッズ「{c.name}」を買う — {cardRule(c)}。手前の教室から装備する生徒をタップ
          <div className="say-sub">{st ? `${st.icon}${st.name}` : '生徒：未選択'}</div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'equip', uid: null })}>
              やめる
            </button>
            <button className="btn primary" disabled={!pick.uid} onClick={() => dispatch({ type: 'equip', uid: pick.uid })}>
              装備する（−{marketCost(ph.card)}点）
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
            {side}
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
            {canContinue ? (
              <button className="btn primary" onClick={() => dispatch({ type: 'continue' })}>
                次へ
              </button>
            ) : (
              <div className="say-sub">⏳ {who ?? '誰か'} が「次へ」を押すのを待っています</div>
            )}
          </div>
        </div>
      );
    }
  }
}
