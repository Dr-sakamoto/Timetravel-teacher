import { CLASS_CARDS } from '../game/data/classes';
import { ERAS } from '../game/data/eras';
import { FIXED_EVENTS, PERSONAL_EVENTS, SCHOOL_EVENTS, aggText, attrIcon, effectText } from '../game/data/events';
import { ROLES, roleDesc } from '../game/data/roles';
import { ATTRS, ATTR_ICON, ATTR_LABEL, type RoleId } from '../game/types';

const ATTR_NOTE: Record<string, string> = {
  study: 'ヤンキー以外はほぼ全員が持つ標準装備。定期テストはクラス全員の平均なので、持っていない子は0点で足を引っ張る。',
  sports: '体育祭・球技大会・マラソンなど。',
  art: '文化祭・合唱コンクール・写生大会など。',
  charm: '生徒会選挙・弁論大会・修学旅行など。まとめ役。',
  fight: 'ヤンキー専用の属性。普段は持ち物検査や校長の視察でマイナスだが、他校のヤンキー襲来では👊持ちしか戦えない。',
};

export function Rules({ onClose }: { onClose: () => void }) {
  const total = PERSONAL_EVENTS.reduce((a, e) => a + e.count, 0) + SCHOOL_EVENTS.reduce((a, e) => a + e.count, 0);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
        <h2>遊び方</h2>
        <p>
          あなたは担任の先生。タイムマシンで時代を駆け巡り、歴史上の偉人や恐竜を自分のクラスに転校させて
          <b>「時空最強のクラス」</b>を作り上げよう。1〜3年間の学校生活で一番ポイントを稼いだ先生の勝ち！
        </p>

        <h3>生徒の「数値」と「属性」</h3>
        <p>
          生徒はそれぞれ<b>数値（1〜10）</b>を1つと、<b>属性アイコン</b>をいくつか持っている。
          イベントはどれか1つの属性で勝負し、その属性を持つ生徒の数値が戦力になる。
          数値が高い一点特化型か、数値はそこそこでも属性の幅が広い万能型か——パワプロの特殊能力のように属性の数で個性が決まる。
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

        <h3>1. クラスカードを引く</h3>
        <p>
          最初にクラスカードを1枚引き、<b>係の構成</b>と<b>初期メンバー12人</b>（全員現代の普通の生徒）が決まる。
        </p>
        <ul className="rule-list">
          {CLASS_CARDS.map((c) => (
            <li key={c.id}>
              {c.icon} <b>{c.nick}</b>：{c.desc}
            </li>
          ))}
        </ul>

        <h3>2. 係を決める（毎学期の最初）</h3>
        <p>係についた生徒は、持っている属性の数値に倍率がかかる（持っていない属性は増えない）。1年は3学期あり、学期の頭にだけ再編成できる。</p>
        <ul className="rule-list">
          {(Object.keys(ROLES) as RoleId[]).map((r) => (
            <li key={r}>
              {ROLES[r].icon} <b>{ROLES[r].name}</b>：{roleDesc(r)}
            </li>
          ))}
        </ul>

        <h3>3. 毎ターンの流れ</h3>
        <ol className="rule-list">
          <li>
            <b>時代</b>：1年ごとに3つの時代がランダムに決まり、1学期に1つずつ巡る。転校生はその学期の時代からやってくる（偉人は早い者勝ち）。
          </li>
          <li>
            <b>イベントカードを引く</b>（山札{total}枚）。学校行事は全クラスが参加して順位でポイント（自分の番でなくても稼げる）。
            青マス・赤マスは引いたクラスだけのちょっとした増減。
          </li>
        </ol>

        <h3>学校行事（全クラス参加）</h3>
        <ul className="rule-list">
          {SCHOOL_EVENTS.map((e) => (
            <li key={e.id}>
              {e.icon} <b>{e.name}</b> {attrIcon(e.attr)}（×{e.count}）：{aggText(e)}
              {e.threshold && ` ／ ボーダー判定：撃退+${e.threshold.win}pt・突破${e.threshold.lose}pt`}
              {e.effects.length > 0 && <span className="effect-inline"> ✦ {e.effects.map(effectText).join('、')}</span>}
            </li>
          ))}
        </ul>

        <h3>個人イベント</h3>
        <ul className="rule-list">
          {PERSONAL_EVENTS.map((e) => (
            <li key={e.id}>
              <span className={`tone-dot ${e.tone}`} /> {e.icon} <b>{e.name}</b>（×{e.count}）：{e.desc}
            </li>
          ))}
        </ul>

        <h3>固定イベント</h3>
        <ul className="rule-list">
          {FIXED_EVENTS.map((e) => (
            <li key={e.id}>
              {e.icon} <b>{e.name}</b> {attrIcon(e.attr)}：{aggText(e)}（順位点×{e.mult}）
            </li>
          ))}
          <li>🌻 8月：夏休み合宿。その年の3つの時代から1つ選んで、転校生を1人スカウトできる。</li>
          <li>🌸 年度末：進級。全員の数値+1。</li>
        </ul>

        <h3>時代（タイムライン）</h3>
        <ul className="rule-list cols">
          {ERAS.map((e) => (
            <li key={e.id}>
              {e.icon} {e.name}（{e.when}）
            </li>
          ))}
        </ul>
        <p className="hint">クラスの定員は30人。満員のときは誰かに元の時代へ帰ってもらう必要がある。</p>
      </div>
    </div>
  );
}
