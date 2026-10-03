import { CARDS } from '../game/data/cards';
import { ERAS } from '../game/data/eras';
import {
  CONTEST_CARDS,
  CONTEST_POINTS,
  ERA_CARDS,
  ERA_NORMAL_CARDS,
  FIXED_EVENTS,
  NORMAL_CARDS,
  PERSONAL_CARDS,
  RAID_CARDS,
  RAID_LOSE,
  RAID_WIN,
  fixedRule,
} from '../game/data/events';
import { ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import { ATTRS, ATTR_ICON, ATTR_LABEL } from '../game/types';

export function Rules({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
        <h2>遊び方</h2>
        <p>
          あなたは担任の先生。歴史上の偉人や恐竜を転入させて教室の12席を埋め、<b>クラスポイント</b>を一番集めた先生の勝ち！
        </p>

        <h3>生徒カード</h3>
        <p>
          左上の<b>数値（1〜5）</b>と、下の<b>属性アイコン</b>だけ。
          {ATTRS.map((a) => `${ATTR_ICON[a]}${ATTR_LABEL[a]}`).join('・')}。
          👊はヤンキーだけが持ち、ヤンキーは📚を持たない。
        </p>

        <h3>準備</h3>
        <ol className="rule-list">
          <li>現代の生徒の山札から、全員で順番に1枚ずつ引いて6人そろえる。</li>
          <li>
            係は全員共通。6人で3つ、8人で4つ、10人で5つ、12人で6つ使える。係のアイコンを持つ子を就けると、そのアイコンで点が入るたび<b>+1</b>。
            <div className="rule-roles">
              {ROLE_ORDER.map((r) => (
                <span key={r} className="chip">
                  {ROLES[r].icon}
                  {ROLES[r].name} {roleDesc(r)}
                </span>
              ))}
            </div>
          </li>
          <li>時代は1年に3つランダム。1学期に1つずつ巡り、その学期の時代の偉人と、時代の固有カード（イベント・通常）を使う。</li>
        </ol>

        <h3>手番：1人1枚ずつイベントの山札をめくる</h3>
        <p>
          <b>通常カードは全員</b>に、<b>イベントカードはめくった人だけ</b>に効果がある。
        </p>
        <ul className="rule-list">
          <li>
            <b>通常カード（全員）</b>（{NORMAL_CARDS.length}枚・{NORMAL_CARDS.map((c) => c.name).slice(0, 4).join('・')}…）：
            そのアイコンを持つ子1人につき<b>+1</b>。全クラスが数える。
          </li>
          <li>
            <b>イベントカード（めくった人だけ）</b>（{CONTEST_CARDS.map((c) => c.icon + c.name).join('・')}）：
            そのアイコンを持つ子の<b>数値の合計</b>（＋係ボーナス）がそのまま入る。
          </li>
          <li>
            <b>カチコミ（めくった人だけ）</b>（{RAID_CARDS.length}枚）：👊の数値の合計がカードの敵の強さ（{RAID_CARDS.map((c) => c.threat).join('・')}）以上なら+{RAID_WIN}、足りなければ{RAID_LOSE}。
          </li>
          {PERSONAL_CARDS.map((c) => (
            <li key={c.id}>
              <b>
                {c.icon}
                {c.name}
              </b>
              （{c.count}枚）：{c.desc}
            </li>
          ))}
          <li>
            <b>時代カード（めくった人だけ）</b>：イベントカードと同じ。ただしその時代出身の生徒は数値2倍。
          </li>
        </ul>

        <h3>時代ごとのカード</h3>
        <p>各時代に、固有の偉人（転入で来る）・固有イベントカード2種・固有通常カード2枚がある。</p>
        <ul className="rule-list">
          {ERAS.filter((e) => e.id !== 'present').map((era) => (
            <li key={era.id}>
              {era.icon} <b>{era.name}</b>：偉人{' '}
              {CARDS.filter((c) => c.era === era.id)
                .map((c) => c.icon + c.name)
                .join('・')}
              ／イベント{' '}
              {ERA_CARDS.filter((c) => c.era === era.id)
                .map((c) => `${c.icon}${c.name}（${ATTR_ICON[c.attr]}）`)
                .join('・')}
              ／通常{' '}
              {ERA_NORMAL_CARDS.filter((c) => c.era === era.id)
                .map((c) => `${c.name}（${ATTR_ICON[c.attr]}）`)
                .join('・')}
            </li>
          ))}
        </ul>

        <h3>決まったイベント</h3>
        <ul className="rule-list">
          {FIXED_EVENTS.map((f) => (
            <li key={f.id}>
              {f.icon} <b>{f.name}</b>（全員）：{fixedRule(f)}。順位点は{(CONTEST_POINTS[4] ?? []).join('／')}点×倍率。
            </li>
          ))}
          <li>🌻 8月 夏休み合宿：今年の3つの時代から1つ選んで転入（3枚から1人）。</li>
        </ul>
      </div>
    </div>
  );
}
