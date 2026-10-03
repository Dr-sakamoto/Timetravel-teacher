import { CLASS_CARDS } from '../game/data/classes';
import { ERAS } from '../game/data/eras';
import { ERA_EVENTS, FIXED_EVENTS, ICON_EVENTS, PERSONAL_EVENTS, SCHOOL_EVENTS, aggText, effectText } from '../game/data/events';
import { ROLES, roleDesc } from '../game/data/roles';
import { ATTRS, ATTR_ICON, ATTR_LABEL, type RoleId } from '../game/types';

const ATTR_NOTE: Record<string, string> = {
  study: 'ヤンキー以外はほぼ全員が持つ。定期テストは全員の平均なので、持っていない子は0点。',
  sports: '体育祭・球技大会など。',
  art: '文化祭・合唱コンクールなど。',
  charm: '生徒会選挙など。まとめ役。',
  fight: 'ヤンキー専用。カチコミ（他校の殴り込み）は👊持ちしか戦えない。',
};

export function Rules({ onClose }: { onClose: () => void }) {
  const deck = [...ICON_EVENTS, ...SCHOOL_EVENTS, ...PERSONAL_EVENTS];
  const total = deck.reduce((a, e) => a + e.count, 0);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
        <h2>遊び方</h2>
        <p>
          あなたは担任の先生。タイムトラベルで歴史上の偉人や恐竜を転校させ、教室の12席を埋めて<b>「時空最強のクラス」</b>を作ろう。
          1〜3年間で一番ポイントを稼いだ先生の勝ち！
        </p>

        <h3>生徒カード：数値と属性</h3>
        <p>
          生徒は<b>数値（1〜10）</b>と<b>属性アイコン</b>を持つ。数値が高い一点特化型か、属性の幅が広い万能型か。
        </p>
        <ul className="rule-list">
          {ATTRS.map((a) => (
            <li key={a}>
              <b>
                {ATTR_ICON[a]} {ATTR_LABEL[a]}
              </b>
              ：{ATTR_NOTE[a]}
            </li>
          ))}
        </ul>

        <h3>はじめ方</h3>
        <ol className="rule-list">
          <li>クラスカードを1枚引く（係の顔ぶれと、出やすい生徒の傾向が決まる）。</li>
          <li>全員で順番に生徒カードを1枚ずつ引き、最初の6人をそろえる。</li>
          <li>係は最初3つ。転入で人数が増えると 8人→4つ、10人→5つ、12人→6つ と解放される。係は学期の頭に決め直せる。</li>
        </ol>
        <ul className="rule-list">
          {CLASS_CARDS.map((c) => (
            <li key={c.id}>
              {c.icon} <b>{c.nick}</b>：{c.desc}
            </li>
          ))}
        </ul>

        <h3>毎ターン：山札から1枚</h3>
        <p>山札は全時代共通の{total}枚＋今学期の時代の固有カード（2種×2枚）。学期が変わると時代カードも入れ替わる。</p>
        <ul className="rule-list">
          <li>
            <b>アイコンカード（通常）</b>：{ICON_EVENTS.map((e) => `${e.icon}×${e.count}`).join(' ')}。全クラスで、その属性を持つ生徒1人につき+1pt（係で強化中の子は+2pt）。
          </li>
          {PERSONAL_EVENTS.map((e) => (
            <li key={e.id}>
              {e.icon} <b>{e.name}</b>（×{e.count}）：{e.desc}
            </li>
          ))}
          {SCHOOL_EVENTS.map((e) => (
            <li key={e.id}>
              {e.icon} <b>{e.name}</b>（×{e.count}）：{aggText(e)}
              {e.threshold && `　撃退+${e.threshold.win}pt／突破${e.threshold.lose}pt`}
              {e.effects.length > 0 && <span className="effect-inline"> ✦ {e.effects.map(effectText).join('、')}</span>}
            </li>
          ))}
        </ul>

        <h3>時代カード</h3>
        <ul className="rule-list">
          {ERAS.filter((era) => era.id !== 'present').map((era) => (
            <li key={era.id}>
              {era.icon} <b>{era.name}</b>：
              {ERA_EVENTS.filter((e) => e.era === era.id)
                .map((e) => `${e.icon}${e.name}（${aggText(e)}${e.effects.length ? '・' + e.effects.map(effectText).join('・') : ''}）`)
                .join('　')}
            </li>
          ))}
        </ul>

        <h3>固定イベント</h3>
        <ul className="rule-list">
          {FIXED_EVENTS.map((e) => (
            <li key={e.id}>
              {e.icon} <b>{e.name}</b>：{aggText(e)}（得点×{e.mult}）
            </li>
          ))}
          <li>🌻 8月：夏休み合宿。その年の3つの時代から1つ選んで転校生を1人スカウト。</li>
          <li>🌸 年度末：進級。全員の数値+1。時代は1年ごとに3つ、1学期に1つずつ巡る。</li>
        </ul>

        <h3>係</h3>
        <ul className="rule-list">
          {(Object.keys(ROLES) as RoleId[]).map((r) => (
            <li key={r}>
              {ROLES[r].icon} <b>{ROLES[r].name}</b>：{roleDesc(r)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
