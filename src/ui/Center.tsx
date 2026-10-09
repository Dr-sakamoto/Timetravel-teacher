import { ERAS } from '../game/data/eras';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { canBuild, canTake, currentEra, kaguyaGift, pyramidCard, inGuerrilla, marketCost, nextTurnPlayer, oathTargets, previewStudent, voteTargets } from '../game/engine';
import { EVENT_MAP, GIFT_MAP, KACHIKOMI_CARDS, MARKET_SIZE, cardGlyph, shortRule } from '../game/data/events';
import { STARTING_MEMBERS, attrScore } from '../game/calc';
import { DeckInfo } from './DeckInfo';
import { ATTR_ICON, type Action, type EventResult, type GameState, type Player, type Student } from '../game/types';
import { EventCardView } from './EventCardView';
import { TcgCard } from './TcgCard';
import { KaguyaStay } from './KaguyaStay';

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

/** かぐや姫に宝を差し出したときの点 */
function kaguyaWinPts(): number {
  const c = EVENT_MAP.kaguya;
  return c.kind === 'contest' && c.effect.type === 'kaguya' ? c.effect.win : 0;
}

/** 場のカード1枚の見た目 */
function MarketCard({ id, selected, dim, onClick, buyer }: { id: string; selected: boolean; dim: boolean; onClick?: () => void; buyer?: Player | null }) {
  const cost = marketCost(id, buyer ?? undefined);
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

/** 場の横に残るピラミッド（選ぶと🏃の数だけ石を積む）。積んだ石をクラスの色で積み上げて見せる */
function PyramidCard({ state, selected, dim, onClick }: { state: GameState; selected: boolean; dim: boolean; onClick?: () => void }) {
  const py = state.pyramid!;
  const c = pyramidCard(state)!;
  const sum = py.stones.reduce((a, x) => a + x, 0);
  return (
    <button
      className={`mcard pyramid ${py.done ? 'done' : ''} ${selected ? 'selected' : ''} ${dim ? 'dim' : ''}`}
      onClick={onClick}
      disabled={!onClick}
      title={`${c.name}：${state.players.map((p, i) => `${p.name} ${py.stones[i]}`).join('・')}`}
    >
      <span className="mcard-icon">{c.icon}</span>
      <span className="mcard-name">{py.done ? '完成！' : 'ピラミッド'}</span>
      <span className="pyramid-bar">
        {state.players.map((p, i) => (
          <span key={i} style={{ width: `${(Math.min(py.stones[i], py.need) / py.need) * 100}%`, background: p.color }} />
        ))}
      </span>
      <span className="mcard-name">
        石{Math.min(sum, py.need)}/{py.need}
      </span>
    </button>
  );
}

/** ピラミッドを選んでいるときの sel の値（場のカードの位置と重ならない） */
const PYRAMID_SEL = -1;

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
      {/* 場に並ぶ枚数（ピラミッドがあれば1枚多い）。カードの大きさを決めるのに使う */}
      <div className="board" style={{ '--mk': MARKET_SIZE + (state.pyramid ? 1 : 0) } as CSSProperties}>
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
          ) : state.kaguya ? (
            // かぐや姫が滞在している間は、時代の偉人の山の場所に座る（卓の幅を変えない）
            <KaguyaStay state={state} />
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
                buyer={actor}
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
            {state.pyramid && (
              <PyramidCard
                state={state}
                selected={selected === PYRAMID_SEL}
                dim={!!canPick && ph.kind === 'draw' && !canBuild(state, ph.player)}
                onClick={canPick ? () => setSel(PYRAMID_SEL) : undefined}
              />
            )}
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
  return <div className="cutin">イベント発生！</div>;
}

/** 場のカードを取るとどうなるかを、絵文字の式で（文章にしない） */
function effectOf(state: GameState, pi: number, id: string): ReactNode {
  const p = state.players[pi];
  if (id.startsWith('person:')) {
    const st = previewStudent(id);
    // 偉人は名前だけ（アイコンはカードを見れば分かる）
    return (
      <div className="effect-name">
        {st.name}
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
          陶片追放 — <span style={{ color: me.color }}>{me.name}</span> の投票
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
          投票する
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
          桃園の誓い — <span style={{ color: me.color }}>{me.name}</span> が劉備役
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
          誓う
        </button>
      </div>
    </div>
  );
}

/** 結果のカードの横に並べる生徒の最大数 */
const DEAL_MAX = 4;

/** 結果の明細：クラスごとに「何があって何点か」を1行ずつ（点も出来事もないクラスは省く） */
function ResultTable({ state, result }: { state: GameState; result: EventResult }) {
  const attr = result.attr && result.attr !== 'all' ? ATTR_ICON[result.attr] : '';
  const rows = result.rows.filter((r) => r.delta !== 0 || r.note);
  if (!rows.length) return null;
  return (
    <div className="tally">
      {rows.map((r, i) => {
        const p = state.players[r.player];
        // 数えたアイコンの数が書いていなければ、頭に足す（「1位」→「🏃11 1位」）
        const count = attr && r.count !== undefined && r.count >= 0 && !(r.note ?? '').includes(String(r.count)) ? `${attr}${r.count}` : '';
        return (
          <div key={i} className="tally-row" style={{ borderColor: p.color }}>
            <b className="tally-name" style={{ color: p.color }}>
              {p.name}
            </b>
            <span className="tally-count">{[count, r.note].filter(Boolean).join(' ')}</span>
            <span className={`tally-delta ${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}`}>{r.delta > 0 ? `+${r.delta}` : r.delta < 0 ? `−${-r.delta}` : '±0'}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 選んだ生徒（未選択なら「？」） */
const chosen = (st?: Student) => <span className="pick-chip">{st ? st.name : '？'}</span>;

function Action({ state, dispatch, cpuBusy, canContinue = true, pick, sel }: Props & { sel: number | null }) {
  const ph = state.phase;
  if (ph.kind === 'gameOver') return null;
  const actor = ph.player !== null ? state.players[ph.player] : null;
  const who = <Who state={state} />;

  // 転校はゲリラ：選んでいる人の手番ではないので、手番の「〇〇 を待っています」とは違う見せ方にする
  if (ph.kind === 'push') {
    const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
    const done = ph.gone.length;
    return (
      <div className="say guerrilla-say">
        <CutIn />
        <div className="say-sub">
          {ph.votes ? (
            <>
              陶片追放：{who} のクラスに票が集まった。アテネを去る子を{cpuBusy ? '選んでいます…' : <>タップ {chosen(st)}</>}
            </>
          ) : (
            <>
              全クラス転校：{who} のクラスが出ていく子を{cpuBusy ? '選んでいます…' : <>タップ {chosen(st)}</>}
            </>
          )}
          {done > 0 && <small>（{done}人 転校ずみ）</small>}
        </div>
        <div className="say-sub">
          {!cpuBusy && (
            <button className="btn primary" disabled={!pick.uid} onClick={() => pick.uid && dispatch({ type: 'push', uid: pick.uid })}>
              転校
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
          陶片追放：{who} が{cpuBusy ? '陶片に名前を書いています…' : '投票中'}
          {voted > 0 && <small>（{voted}人 投票ずみ）</small>}
        </div>
        <div className="say-sub">
          <NextTurn state={state} inline />
        </div>
        {!cpuBusy && <VotePopup key={ph.player} state={state} voter={ph.player} onVote={(target) => dispatch({ type: 'vote', target })} />}
      </div>
    );
  }

  // 品を配るのもゲリラ（新大陸の品・鉄砲）：装備させる子をタップしてから品を選ぶ
  if (ph.kind === 'gift') {
    const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
    const card = EVENT_MAP[ph.card];
    return (
      <div className="say guerrilla-say">
        <CutIn />
        <div className="say-sub">
          {card.icon} {card.name}：{who} のクラスが{cpuBusy ? '選んでいます…' : <>装備させる子をタップ {chosen(st)} → 品を選ぶ</>}
          {ph.got.length > 0 && <small>（{ph.got.map((g) => GIFT_MAP[g.item].icon).join('')} 受け取りずみ）</small>}
        </div>
        <div className="say-sub">
          {!cpuBusy &&
            ph.items.map((id) => {
              const g = GIFT_MAP[id];
              return (
                <button key={id} className="btn primary" disabled={!pick.uid} onClick={() => pick.uid && dispatch({ type: 'gift', item: id, uid: pick.uid })} title={`${g.name}（${ATTR_ICON[g.attr]}＋1）`}>
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
        <div className="say-sub">桃園の誓い：{who} が{cpuBusy ? '義兄弟を選んでいます…' : '義兄弟を選ぶ'}</div>
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
        {who}{actor?.isCpu ? ' が考えています…' : ' を待っています'}
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
          {who} 初期メンバーを引く {p.students.length}/{STARTING_MEMBERS}
          <div className="say-sub">
            <button className="btn small ghost" onClick={() => dispatch({ type: 'drawAllMembers' })}>
              まとめて
            </button>
          </div>
        </div>
      );
    }
    case 'roles':
      // 係決めは一斉：だれが準備OKかを並べる
      return (
        <div className="say">
          係決め
          <div className="say-sub roles-ready">
            {state.players.map((p, i) => (
              <span key={i} className={`pick-chip ${ph.ready[i] ? 'ready' : ''}`} style={{ borderColor: p.color }}>
                <b style={{ color: p.color }}>{p.name}</b> {ph.ready[i] ? '準備OK' : '考え中…'}
              </span>
            ))}
          </div>
        </div>
      );
    case 'draw': {
      // かぐや姫が待っている宝を持っていれば、手番の中でいつでも差し出せる（手番は終わらない）
      const gift = kaguyaGift(state, ph.player);
      const present = gift?.goods && (
        <button className="btn small" onClick={() => dispatch({ type: 'present' })} title="宝はなくなるが、手番は続く">
          {gift.goods.name}を差し出す +{kaguyaWinPts()}
        </button>
      );
      if (sel === null)
        return (
          <div className="say">
            {who} 1枚えらぶ
            {present && <div className="say-sub">{present}</div>}
          </div>
        );
      if (sel === PYRAMID_SEL) {
        const c = pyramidCard(state);
        const ok = canBuild(state, ph.player);
        const n = attrScore(state.players[ph.player], 'sports').total;
        return (
          <div className="say">
            <div className="effect">
              {c && cardGlyph(c)}
              <div className="effect-say">{c && shortRule(c)}</div>
            </div>
            <div className="say-sub">
              <button className="btn primary" disabled={!ok} onClick={() => dispatch({ type: 'build' })}>
                {ok ? `石を${n}個積む` : state.pyramid?.done ? '完成ずみ' : '🏃がいない'}
              </button>
            </div>
          </div>
        );
      }
      const id = state.market[sel];
      const p = state.players[ph.player];
      const cost = marketCost(id, p);
      const ok = canTake(state, ph.player, sel);
      const card = id.startsWith('person:') ? null : EVENT_MAP[id];
      const gainNow = card?.kind === 'normal' ? attrScore(p, card.attr).total : null;
      const label = ok
        ? `取る ${cost > 0 ? `−${cost}` : gainNow !== null ? `+${gainNow}` : ''}`
        : cost > 0 && p.points < cost
          ? 'ポイントがたりない'
          : '使えない';
      return (
        <div className="say">
          <div className="effect">{effectOf(state, ph.player, id)}</div>
          <div className="say-sub">
            <button className="btn ghost" onClick={() => dispatch({ type: 'pass' })} title="何も取らずに手番を終える（カードは場に残る）">
              パス
            </button>
            <button className="btn primary" disabled={!ok} onClick={() => dispatch({ type: 'take', slot: sel })}>
              {label}
            </button>
            {present}
          </div>
        </div>
      );
    }
    case 'makeRoom': {
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      const newcomer = previewStudent(state.market[ph.slot]);
      return (
        <div className="say">
          満席 — 出ていく子をタップ
          <div className="say-sub">
            {chosen(st)} と {newcomer.name} を入れ替え
          </div>
          {pair(() => dispatch({ type: 'makeRoom', uid: null }), `入れ替え −${marketCost(state.market[ph.slot])}`, !!pick.uid, () => pick.uid && dispatch({ type: 'makeRoom', uid: pick.uid }))}
        </div>
      );
    }
    case 'kachikomi': {
      const fight = attrScore(state.players[ph.player], 'fight').total;
      const power = fight * KACHIKOMI_CARDS[0].mult;
      const drain = fight * KACHIKOMI_CARDS[0].drain;
      const target = pick.target !== null ? state.players[pick.target] : null;
      return (
        <div className="say">
          殴りこむ相手の名札をタップ（相手 −{power}、自分 +{drain}）
          <div className="say-sub">
            <span className="pick-chip">{target ? target.name : '？'}</span>
          </div>
          {pair(() => dispatch({ type: 'kachikomi', target: null }), 'カチコむ（無料）', pick.target !== null, () => dispatch({ type: 'kachikomi', target: pick.target }))}
        </div>
      );
    }
    case 'exchange': {
      const mine = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      const target = pick.target !== null ? state.players[pick.target] : null;
      const theirs = target?.students.find((x) => x.uid === pick.theirUid);
      return (
        <div className="say">
          自分の子 → 相手の名札 → 相手の子
          <div className="say-sub">
            {chosen(mine)} と {chosen(theirs)} を入れ替え
          </div>
          {pair(
            () => dispatch({ type: 'exchange', uid: null }),
            '入れ替える',
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
          改造する子をタップ
          <div className="say-sub">{chosen(st)}</div>
          {pair(() => dispatch({ type: 'cyborg', uid: null }), `改造 −${marketCost('cyborg')}`, !!pick.uid, () => dispatch({ type: 'cyborg', uid: pick.uid }))}
        </div>
      );
    }
    case 'equip': {
      const c = EVENT_MAP[ph.card];
      const st = state.players[ph.player].students.find((x) => x.uid === pick.uid);
      const attr = 'attr' in c && c.attr && c.attr !== 'all' ? ATTR_ICON[c.attr] : '';
      return (
        <div className="say">
          {c.name}を装備する子をタップ（{attr}＋1）
          <div className="say-sub">{chosen(st)}</div>
          {pair(() => dispatch({ type: 'equip', uid: null }), `装備 −${marketCost(ph.card, state.players[ph.player])}`, !!pick.uid, () => dispatch({ type: 'equip', uid: pick.uid }))}
        </div>
      );
    }
    case 'result': {
      const r = ph.result;
      const out = new Set(r.outUids ?? []);
      const joined = new Set(r.inUids ?? []);
      return (
        <div className="reveal">
          <div className="reveal-card">
            {inGuerrilla(state) && <CutIn />}
            <EventCardView result={r} />
          </div>
          <div className="reveal-side">
            {/* 一言・明細・生徒は狭い画面では中でスクロールし、下の「次へ」は必ず見えるようにする */}
            <div className="reveal-body">
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
              <ResultTable state={state} result={r} />
              {r.students && r.students.length > 0 && (
                <div className="deal">
                  {/* 何人いても卓からはみ出さないように、見せるのは4人まで */}
                  {r.students.slice(0, DEAL_MAX).map((s) => (
                    <div key={s.uid} className={`deal-card ${out.has(s.uid) ? 'out' : joined.has(s.uid) ? 'in' : ''}`}>
                      <TcgCard student={s} size="mini" />
                      {/* 札は転入・転校した子だけ（イベントで光っただけの子には付けない） */}
                      {(out.has(s.uid) || joined.has(s.uid)) && <span className="deal-mark">{out.has(s.uid) ? '転校' : '転入'}</span>}
                    </div>
                  ))}
                  {r.students.length > DEAL_MAX && <span className="deal-more">ほか{r.students.length - DEAL_MAX}人</span>}
                </div>
              )}
            </div>
            <div className="reveal-foot">
              {ph.ctx === 'turn' && ph.player === null && <NextTurn state={state} inline />}
              {canContinue ? (
                <button className="btn primary" onClick={() => dispatch({ type: 'continue' })}>
                  {/* 手番の終わりに場を補充する（ここでゲリラがめくれることがある）と分かるように */}
                  {ph.ctx === 'turn' && state.market.length < MARKET_SIZE ? '場を補充 ▶' : '次へ ▶'}
                </button>
              ) : (
                <span>{who} を待っています</span>
              )}
            </div>
          </div>
        </div>
      );
    }
  }
}
