import { ERAS } from '../game/data/eras';
import { useState, type ReactNode } from 'react';
import { canTake, currentEra, inGuerrilla, marketCost, nextTurnPlayer, oathTargets, previewStudent, voteTargets } from '../game/engine';
import { EVENT_MAP, KACHIKOMI_CARDS, MARKET_SIZE, NEW_WORLD_MAP, cardGlyph, shortRule } from '../game/data/events';
import { STARTING_MEMBERS, attrScore } from '../game/calc';
import { DeckInfo } from './DeckInfo';
import { ATTR_ICON, type Action, type GameState, type Student } from '../game/types';
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
  const attr = 'attr' in c && c.attr && c.attr !== 'all' ? ATTR_ICON[c.attr] : null;
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
  const guerrilla = inGuerrilla(state);

  return (
    <div className={`center ph-${ph.kind} ${guerrilla ? 'in-guerrilla' : ''}`}>
      {/* 山札（左）・場のカード（中央）・捨て札（右）を1列に */}
      <div className="board">
        <div className="piles">
          <button className="pile event-pile" disabled title="イベントの山札">
            <span className="pile-back">🃏</span>
            <span className="pile-label">イベント</span>
            <span className="pile-count">{state.eventDeck.length}</span>
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
            {/* ゲリラ中：補充しようとした場所に、山札からめくれたゲリラを示す */}
            {guerrilla &&
              Array.from({ length: MARKET_SIZE - state.market.length }, (_, i) => (
                <div key={`gap-${i}`} className={`mcard gap ${i === 0 ? 'bolt' : ''}`}>
                  {i === 0 ? <span className="mcard-icon">⚡</span> : null}
                  {i === 0 && <span className="mcard-name">イベント</span>}
                </div>
              ))}
          </div>
        )}
        <div className="piles">
          <button className="pile discard" title="山札の内訳を見る" onClick={() => setShowDeck(true)}>
            <span className="pile-back">🗑️</span>
            <span className="pile-label">捨て札・内訳</span>
            <span className="pile-count">{state.discard.length}</span>
          </button>
        </div>
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

/** 手番の人の名前（色つき） */
function Who({ state }: { state: GameState }) {
  const ph = state.phase;
  if (ph.kind === 'gameOver' || ph.player === null) return null;
  const p = state.players[ph.player];
  return <b style={{ color: p.color }}>{p.name}</b>;
}

/** ゲリラの途中で、このあと誰の手番かを出す（ゲリラが誰かの手番に見えないように） */
function NextTurn({ state, inline }: { state: GameState; inline?: boolean }) {
  const next = nextTurnPlayer(state);
  const p = next !== null ? state.players[next] : null;
  return (
    <div className={inline ? 'next-turn' : 'say-sub next-turn'}>
      {p ? (
        <>
          ▶ このあと <b style={{ color: p.color }}>{p.name}</b> の番
        </>
      ) : (
        '▶ このあと月末'
      )}
    </div>
  );
}

/** ゲリラのカットイン（紫の帯で「イベント発生！」。手番と取り違えないように） */
function CutIn() {
  return <div className="cutin">⚡ イベント発生！</div>;
}

/** 場のカードを取るとどうなるかを、絵文字の式で（文章にしない） */
function effectOf(state: GameState, pi: number, id: string): ReactNode {
  const p = state.players[pi];
  if (id.startsWith('person:')) {
    const st = previewStudent(id);
    // 偉人は名前だけ（アイコンはカードを見れば分かる）
    return (
      <div className="effect-name">
        {st.icon} {st.name}
      </div>
    );
  }
  const c = EVENT_MAP[id];
  return (
    <>
      {c.kind === 'normal' ? `${ATTR_ICON[c.attr]} → +${attrScore(p, c.attr).total}` : cardGlyph(c)}
      <div className="effect-say">{shortRule(c)}</div>
    </>
  );
}

/** 陶片追放の投票用紙（投票する人だけが見る。ほかの人の票は出さない） */
function VotePopup({ state, voter, onVote }: { state: GameState; voter: number; onVote: (target: number) => void }) {
  const [target, setTarget] = useState<number | null>(null);
  const me = state.players[voter];
  return (
    <div className="modal-back">
      <div className="modal vote-modal">
        <h2>
          🏺 陶片追放 — <span style={{ color: me.color }}>{me.name}</span> の投票
        </h2>
        <p>陶片に、アテネから追い出したいクラスを書こう。だれがどこに入れたかは、ほかの人には見えない。票が一番多いクラス（同票ならポイントが多いクラス）が、係に就いていない子を1人転校させる。</p>
        <div className="vote-options">
          {voteTargets(state, voter).map((pi) => {
            const p = state.players[pi];
            return (
              <button key={pi} className={`btn vote-option ${target === pi ? 'selected' : ''}`} style={{ borderColor: p.color }} onClick={() => setTarget(pi)}>
                <b style={{ color: p.color }}>{p.name}</b>
                <small>{p.points}点</small>
              </button>
            );
          })}
        </div>
        <button className="btn primary" disabled={target === null} onClick={() => target !== null && onVote(target)}>
          🗳️ 投票する
        </button>
      </div>
    </div>
  );
}

/** 桃園の誓い：劉備役のクラスが、義兄弟になるクラスを選ぶ */
function OathPopup({ state, chooser, max, onSwear }: { state: GameState; chooser: number; max: number; onSwear: (targets: number[]) => void }) {
  const [targets, setTargets] = useState<number[]>([]);
  const me = state.players[chooser];
  const toggle = (pi: number) => setTargets((t) => (t.includes(pi) ? t.filter((x) => x !== pi) : t.length < max ? [...t, pi] : t));
  return (
    <div className="modal-back">
      <div className="modal vote-modal">
        <h2>
          🍑 桃園の誓い — <span style={{ color: me.color }}>{me.name}</span> が劉備役
        </h2>
        <p>義兄弟になるクラスを{max}つまで選ぼう。学期の区切りまでに義兄弟のクラスが得た点・失った点は、合わせて山分けになる。これから稼ぎそうなクラスと組むと得をする。</p>
        <div className="vote-options">
          {oathTargets(state, chooser).map((pi) => {
            const p = state.players[pi];
            return (
              <button key={pi} className={`btn vote-option ${targets.includes(pi) ? 'selected' : ''}`} style={{ borderColor: p.color }} onClick={() => toggle(pi)}>
                <b style={{ color: p.color }}>{p.name}</b>
                <small>{p.points}点</small>
              </button>
            );
          })}
        </div>
        <button className="btn primary" disabled={targets.length === 0} onClick={() => targets.length && onSwear(targets)}>
          🍑 誓う
        </button>
      </div>
    </div>
  );
}

/** 選んだ生徒（未選択なら「？」） */
const chosen = (st?: Student) => <span className="pick-chip">{st ? `${st.icon}${st.name}` : '？'}</span>;

function Action({ state, dispatch, cpuBusy, canContinue = true, pick, sel }: Props & { sel: number | null }) {
  const ph = state.phase;
  if (ph.kind === 'gameOver') return null;
  const actor = ph.player !== null ? state.players[ph.player] : null;
  const who = <Who state={state} />;

  // 転校はゲリラ：選んでいる人の手番ではないので、手番の「⏳ 〇〇」とは違う見せ方にする
  if (ph.kind === 'push') {
    const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
    const done = ph.gone.length;
    return (
      <div className="say guerrilla-say">
        <CutIn />
        <div className="say-sub">
          {ph.votes ? (
            <>
              🏺 陶片追放：{who} のクラスに票が集まった。アテネを去る子を{cpuBusy ? '選んでいます…' : <>タップ {chosen(st)}</>}
            </>
          ) : (
            <>
              📦 全クラス転校：{who} のクラスが出ていく子を{cpuBusy ? '選んでいます…' : <>タップ {chosen(st)}</>}
            </>
          )}
          {done > 0 && <small>（{done}人 転校ずみ）</small>}
        </div>
        <div className="say-sub">
          {!cpuBusy && (
            <button className="btn primary" disabled={!pick.uid} onClick={() => pick.uid && dispatch({ type: 'push', uid: pick.uid })}>
              👋 転校
            </button>
          )}
          <NextTurn state={state} inline />
        </div>
      </div>
    );
  }

  // 陶片追放は秘密投票：投票する人にだけポップアップを出す（入った票はだれにも見せない）
  if (ph.kind === 'vote') {
    const voted = ph.ballots.length;
    return (
      <div className="say guerrilla-say">
        <CutIn />
        <div className="say-sub">
          🏺 陶片追放：{who} が{cpuBusy ? '陶片に名前を書いています…' : '投票中'}
          {voted > 0 && <small>（{voted}人 投票ずみ）</small>}
        </div>
        <div className="say-sub">
          <NextTurn state={state} inline />
        </div>
        {!cpuBusy && <VotePopup key={ph.player} state={state} voter={ph.player} onVote={(target) => dispatch({ type: 'vote', target })} />}
      </div>
    );
  }

  // 新大陸の品もゲリラ：装備させる子をタップしてから品を選ぶ
  if (ph.kind === 'newWorld') {
    const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
    return (
      <div className="say guerrilla-say">
        <CutIn />
        <div className="say-sub">
          🌎 新大陸の品：{who} のクラスが{cpuBusy ? '選んでいます…' : <>装備させる子をタップ {chosen(st)} → 品を選ぶ</>}
          {ph.got.length > 0 && <small>（{ph.got.map((g) => NEW_WORLD_MAP[g.item].icon).join('')} 受け取りずみ）</small>}
        </div>
        <div className="say-sub">
          {!cpuBusy &&
            ph.items.map((id) => {
              const g = NEW_WORLD_MAP[id];
              return (
                <button key={id} className="btn primary" disabled={!pick.uid} onClick={() => pick.uid && dispatch({ type: 'newWorld', item: id, uid: pick.uid })} title={`${g.name}（${ATTR_ICON[g.attr]}＋1）`}>
                  {g.icon} {g.name} {ATTR_ICON[g.attr]}＋1
                </button>
              );
            })}
          <NextTurn state={state} inline />
        </div>
      </div>
    );
  }

  // 桃園の誓いもゲリラ：劉備役のクラスにだけ、義兄弟を選ぶポップアップを出す
  if (ph.kind === 'oath') {
    return (
      <div className="say guerrilla-say">
        <CutIn />
        <div className="say-sub">🍑 桃園の誓い：{who} が{cpuBusy ? '義兄弟を選んでいます…' : '義兄弟を選ぶ'}</div>
        <div className="say-sub">
          <NextTurn state={state} inline />
        </div>
        {!cpuBusy && <OathPopup key={ph.player} state={state} chooser={ph.player} max={ph.max} onSwear={(targets) => dispatch({ type: 'oath', targets })} />}
      </div>
    );
  }

  if (cpuBusy && ph.kind !== 'result')
    return (
      <div className="say cpu">
        {actor?.isCpu ? '🤖' : '⏳'} {who}
      </div>
    );

  /** やめる・決めるの2つのボタン */
  const pair = (cancel: (() => void) | null, label: ReactNode, ok: boolean, go: () => void) => (
    <div className="say-sub">
      {cancel && (
        <button className="btn ghost" onClick={cancel}>
          やめる
        </button>
      )}
      <button className="btn primary" disabled={!ok} onClick={go}>
        {label}
      </button>
    </div>
  );

  switch (ph.kind) {
    case 'memberDraw': {
      const p = state.players[ph.player];
      return (
        <div className="say">
          {who} 👆🏫 {p.students.length}/{STARTING_MEMBERS}
          <div className="say-sub">
            <button className="btn small ghost" onClick={() => dispatch({ type: 'drawAllMembers' })}>
              ⏩ まとめて
            </button>
          </div>
        </div>
      );
    }
    case 'roles':
      return <div className="say">{who} 🏷️ 係決め</div>;
    case 'draw': {
      if (sel === null) return <div className="say">{who} 👆 1枚えらぶ</div>;
      const id = state.market[sel];
      const cost = marketCost(id);
      const p = state.players[ph.player];
      const ok = canTake(state, ph.player, sel);
      const card = id.startsWith('person:') ? null : EVENT_MAP[id];
      const gainNow = card?.kind === 'normal' ? attrScore(p, card.attr).total : null;
      const label = ok
        ? `取る ${cost > 0 ? `−${cost}` : gainNow !== null ? `+${gainNow}` : ''}`
        : cost > 0 && p.points < cost
          ? '💰 たりない'
          : '🙅 使えない';
      return (
        <div className="say">
          <div className="effect">{effectOf(state, ph.player, id)}</div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'pass', slot: sel })} title="このカードを捨てて、手番を終える">
              🗑️ 見送る
            </button>
            <button className="btn primary" disabled={!ok} onClick={() => dispatch({ type: 'take', slot: sel })}>
              {label}
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
          🚪 満席 — 👋 出ていく子をタップ
          <div className="say-sub">
            {chosen(st)} ⇄ {newcomer.icon}
            {newcomer.name}
          </div>
          {pair(() => dispatch({ type: 'makeRoom', uid: null }), `⇄ 入れ替え −${marketCost(state.market[ph.slot])}`, !!pick.uid, () => pick.uid && dispatch({ type: 'makeRoom', uid: pick.uid }))}
        </div>
      );
    }
    case 'kachikomi': {
      const power = attrScore(state.players[ph.player], 'fight').total * KACHIKOMI_CARDS[0].mult;
      const target = pick.target !== null ? state.players[pick.target] : null;
      return (
        <div className="say">
          👊 殴りこむ相手の名札をタップ（相手 −{power}）
          <div className="say-sub">
            <span className="pick-chip">{target ? target.name : '？'}</span>
          </div>
          {pair(() => dispatch({ type: 'kachikomi', target: null }), '👊 カチコむ（無料）', pick.target !== null, () => dispatch({ type: 'kachikomi', target: pick.target }))}
        </div>
      );
    }
    case 'exchange': {
      const mine = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      const target = pick.target !== null ? state.players[pick.target] : null;
      const theirs = target?.students.find((x) => x.uid === pick.theirUid);
      return (
        <div className="say">
          🔁 自分の子 → 相手の名札 → 相手の子
          <div className="say-sub">
            {chosen(mine)} ⇄ {chosen(theirs)}
          </div>
          {pair(
            () => dispatch({ type: 'exchange', uid: null }),
            '🔁 入れ替える',
            !!pick.uid && pick.target !== null && !!pick.theirUid,
            () => pick.uid && pick.target !== null && pick.theirUid && dispatch({ type: 'exchange', uid: pick.uid, target: pick.target, theirUid: pick.theirUid }),
          )}
        </div>
      );
    }
    case 'cyborg': {
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      return (
        <div className="say">
          🦾 改造する子をタップ
          <div className="say-sub">{chosen(st)}</div>
          {pair(() => dispatch({ type: 'cyborg', uid: null }), `🦾 改造 −${marketCost('cyborg')}`, !!pick.uid, () => dispatch({ type: 'cyborg', uid: pick.uid }))}
        </div>
      );
    }
    case 'equip': {
      const c = EVENT_MAP[ph.card];
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      const attr = 'attr' in c && c.attr && c.attr !== 'all' ? ATTR_ICON[c.attr] : '';
      return (
        <div className="say">
          {c.icon} 装備する子をタップ（{attr}＋1）
          <div className="say-sub">{chosen(st)}</div>
          {pair(() => dispatch({ type: 'equip', uid: null }), `${c.icon} 装備 −${marketCost(ph.card)}`, !!pick.uid, () => dispatch({ type: 'equip', uid: pick.uid }))}
        </div>
      );
    }
    case 'result': {
      const r = ph.result;
      const out = new Set(r.outUids ?? []);
      return (
        <div className="reveal">
          <div className="reveal-card">
            {inGuerrilla(state) && <CutIn />}
            <EventCardView result={r} />
          </div>
          <div className="reveal-side">
            {/* 何が起きたかを一言で（取った人だけのカードは結果、全員のイベントは効果） */}
            {r.tone === 'personal' && r.desc ? (
              <div className="reveal-say">
                {ph.player !== null && (
                  <>
                    <Who state={state} />：
                  </>
                )}
                {r.desc}
              </div>
            ) : (
              <div className="reveal-say">{r.say ?? r.rule ?? r.desc}</div>
            )}
            {r.students && r.students.length > 0 && (
              <div className="deal">
                {r.students.map((s) => (
                  <div key={s.uid} className={`deal-card ${out.has(s.uid) ? 'out' : 'in'}`}>
                    <TcgCard student={s} size="mini" />
                    <span className="deal-mark">{out.has(s.uid) ? '👋' : '✨'}</span>
                  </div>
                ))}
              </div>
            )}
            {ph.ctx === 'turn' && ph.player === null && <NextTurn state={state} />}
            {canContinue ? (
              <button className="btn primary" onClick={() => dispatch({ type: 'continue' })}>
                {/* 手番の終わりに場を補充する（ここでゲリラがめくれることがある）と分かるように */}
                {ph.ctx === 'turn' && ph.player !== null ? '🃏 場を補充 ▶' : '次へ ▶'}
              </button>
            ) : (
              <div className="say-sub">⏳ {who}</div>
            )}
          </div>
        </div>
      );
    }
  }
}
