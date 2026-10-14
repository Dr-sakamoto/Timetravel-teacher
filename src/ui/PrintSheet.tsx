import { isPyramidCard, previewStudent } from '../game/engine';
import { BENKEI, CARDS, EGG_DINOS, KONGMING } from '../game/data/cards';
import { ERAS } from '../game/data/eras';
import { ALL_EVENT_CARDS, cardEra, cardRule, eventCost, isGuerrilla, personCost, type EventCard } from '../game/data/events';
import { MODERN_POOL, STARTER_POOL } from '../game/data/modern';
import { ATTR_ICON } from '../game/types';
import { TcgCard } from './TcgCard';

/*
 * 紙の試作品の印刷用シート（#print で開く）。
 * 全カードを、ポーカーサイズ（63×88mm）で A4 に9枚ずつ並べる。ブラウザの「印刷」→「PDFに保存」でPDFにもできる。
 * 印刷するときは「倍率100%（実際のサイズ）」「余白なし」「背景のグラフィック」をオンにする。
 */

type Item = { key: string; kind: 'person'; id: string; tag: string } | { key: string; kind: 'event'; card: EventCard; tag: string };

const KIND_LABEL: Record<EventCard['kind'], string> = {
  normal: '授業',
  kachikomi: 'カチコミ',
  swing: '共通イベント',
  contest: '時代イベント',
  goods: 'グッズ',
  cyborg: 'サイボーグ化',
  push: '転校',
  exchange: 'クラス替え',
};

function items(): Item[] {
  const out: Item[] = [];
  const person = (id: string, tag: string) => out.push({ key: `${tag}:${id}:${out.length}`, kind: 'person', id: `person:${id}`, tag });
  const event = (card: EventCard, tag: string) => out.push({ key: `${tag}:${card.id}:${out.length}`, kind: 'event', card, tag });
  // 最初の生徒（現代の普通の生徒）と、現代の転校生
  for (const id of STARTER_POOL) person(id, '最初の生徒');
  for (const id of MODERN_POOL) person(id, '現代の転校生');
  // 時代ごとの人物
  for (const era of ERAS) for (const c of CARDS.filter((x) => x.era === era.id)) person(c.id, `${era.icon}${era.name}の人物`);
  // イベントでだけ仲間になる子
  for (const c of [...EGG_DINOS, KONGMING, BENKEI]) person(c.id, 'イベントで来る子');
  // 全時代で使うカード（休止中の共通イベントは入れない）
  for (const c of ALL_EVENT_CARDS.filter((x) => !cardEra(x))) for (let i = 0; i < c.count; i++) event(c, '全時代のカード');
  // 時代のカード
  for (const era of ERAS) for (const c of ALL_EVENT_CARDS.filter((x) => cardEra(x) === era.id)) for (let i = 0; i < Math.max(1, c.count); i++) event(c, `${era.icon}${era.name}のカード`);
  return out;
}

function PersonCard({ id }: { id: string }) {
  const st = previewStudent(id);
  // 部活の普通の生徒は肩書きがない（アプリでは引いたときに名前が付く）ので、紙では空けずに「生徒」と書く
  if (!st.name) st.name = '現代の生徒';
  const icons = st.attrs.length;
  return (
    <div className="pcard-person">
      <div className="pcard-scale">
        <TcgCard student={st} />
      </div>
      <div className="pcard-cost">{personCost(icons)}点</div>
    </div>
  );
}

function EventFace({ card }: { card: EventCard }) {
  const era = ERAS.find((e) => e.id === cardEra(card));
  const cost = eventCost(card);
  const attr = 'attr' in card && card.attr && card.attr !== 'all' ? ATTR_ICON[card.attr] : null;
  return (
    <div className={`pcard-event k-${card.kind}`} style={{ borderColor: era?.color ?? '#7a6a4f' }}>
      <div className="pe-head" style={{ background: era?.color ?? '#7a6a4f' }}>
        <span>{era ? `${era.icon} ${era.name}` : '全時代'}</span>
        <span>{KIND_LABEL[card.kind]}</span>
      </div>
      {isGuerrilla(card) && !isPyramidCard(card) && <div className="pe-guerrilla">⚡ゲリラ：めくったらすぐ起こる</div>}
      <div className="pe-icon">{card.icon}</div>
      <div className="pe-name">
        {card.name}
        {attr && <span className="pe-attr">{attr}</span>}
      </div>
      <div className="pe-rule">{cardRule(card)}</div>
      {'desc' in card && card.desc && <div className="pe-desc">{card.desc}</div>}
      {isPyramidCard(card) ? (
        <div className="pe-cost free">山札に入れず、学期のあいだ場の横に置く</div>
      ) : isGuerrilla(card) ? null : (
        <div className={`pe-cost ${cost ? '' : 'free'}`}>{cost ? `${cost}点で取る` : '無料で取る'}</div>
      )}
    </div>
  );
}

export function PrintSheet() {
  const all = items();
  const pages: Item[][] = [];
  for (let i = 0; i < all.length; i += 9) pages.push(all.slice(i, i + 9));
  const tags = [...new Set(all.map((x) => x.tag))];
  return (
    <div className="print-root">
      <div className="print-bar no-print">
        <b>紙の試作品の印刷用シート</b>
        <span>
          全{all.length}枚・A4 {pages.length}枚（ポーカーサイズ 63×88mm を9枚ずつ）
        </span>
        <button className="btn primary" onClick={() => window.print()}>
          🖨️ 印刷する（PDFに保存も）
        </button>
        <small>印刷の設定で「倍率100%（実際のサイズ）」「余白なし」「背景のグラフィック」をオンにしてください。</small>
        <small>{tags.map((t) => `${t} ${all.filter((x) => x.tag === t).length}`).join(' ／ ')}</small>
      </div>
      {pages.map((page, pi) => (
        <section key={pi} className="print-page">
          {page.map((it) => (
            <div key={it.key} className="pcard">
              {it.kind === 'person' ? <PersonCard id={it.id} /> : <EventFace card={it.card} />}
              <span className="pcard-tag">{it.tag}</span>
            </div>
          ))}
          <div className="print-pageno">
            {pi + 1}/{pages.length}
          </div>
        </section>
      ))}
    </div>
  );
}
