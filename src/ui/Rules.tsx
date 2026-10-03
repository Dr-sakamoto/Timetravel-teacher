import { CARDS } from '../game/data/cards';
import { ARCHETYPES, MODERN_POOL } from '../game/data/modern';
import { ERAS } from '../game/data/eras';
import {
  CONTEST_CARDS,
  ERA_CARDS,
  ERA_NORMAL_NAMES,
  ERA_RAIDERS,
  FIXED_EVENTS,
  NORMAL_CARDS,
  PERSON_CARDS_PER_TERM,
  PUSH_CARDS,
  RAID_CARDS,
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
          点は盤の外周のスコアトラック（0〜100）でコマを進めて数える想定（1年でだいたい1周）。
        </p>

        <h3>生徒カード</h3>
        <p>
          書いてあるのは<b>アイコン</b>だけ。同じアイコンが並ぶほど得意（1枚に最大5個。N 1〜2個／R 2〜3個／SR 3〜4個／SSR 4〜5個）。
          {ATTRS.map((a) => `${ATTR_ICON[a]}${ATTR_LABEL[a]}`).join('・')}。
          👊はヤンキーだけが持ち、ヤンキーの約半分は👊のみ（たまに🏃や📚も持つ）。
        </p>

        <h3>準備</h3>
        <ol className="rule-list">
          <li>現代のカードプール（N）から、全員で順番に1枚ずつ引いて6人そろえる。</li>
          <li>
            係は全員共通。最初の学期は3つで、学期が進むごとに1つずつ増える（2年生の1学期で6つ全部）。1人が就ける係は1つまで。係に就いた子は、その係のアイコンが<b>2倍</b>に数えられる（📚の係なら、その子の📚が2倍）。アイコンをたくさん持つ子を就けるほど得。
            <div className="rule-roles">
              {ROLE_ORDER.map((r) => (
                <span key={r} className="chip">
                  {ROLES[r].icon}
                  {ROLES[r].name} {roleDesc(r)}
                </span>
              ))}
            </div>
          </li>
          <li>時代は1年に3つ。1年目の1学期は現代、あとはランダム。1学期に1つずつ巡る。</li>
        </ol>

        <h3>手番：1人1枚ずつ山札をめくる</h3>
        <p>
          山札は学期ごとに作り直す。中身は下のカード＋<b>その時代のカードプールから人物カード最大{PERSON_CARDS_PER_TERM}枚</b>。
          生徒はどの時代も有限（現代もほかの時代と同じ1つのカードプール）。中央の「捨て札・内訳」をタップすると今の山札の内訳が見られる。
        </p>
        <ul className="rule-list">
          <li>
            <b>通常カード（全員）</b>（{NORMAL_CARDS.map((c) => `${ATTR_ICON[c.attr]}×${c.count}`).join(' ')}）：
            そのアイコンを<b>一番たくさん持つ子1人の個数</b>（＋係ボーナス）が入る。名前と絵柄は時代で変わるだけ。
          </li>
          <li>
            <b>イベントカード（めくった人だけ）</b>（{CONTEST_CARDS.map((c) => c.icon + c.name).join('・')}＋時代の固有イベント）：
            クラス全員の<b>そのアイコンの合計個数</b>（＋係ボーナス）が入る。時代の固有イベントはその時代出身の子のアイコンが2倍。
          </li>
          <li>
            <b>カチコミ（めくった人だけ）</b>（敵の強さ {RAID_CARDS.map((c) => c.threat).join('・')}）：クラスの👊の合計個数が敵の強さに<b>足りない分だけマイナス</b>。プラスはなし。
          </li>
          <li>
            <b>人物カード</b>（学期ごとに最大{PERSON_CARDS_PER_TERM}枚）：めくったらその子が<b>そのまま転入</b>。その時代のカードプールに残っている子しか入らない。満席なら捨て札にしてもう1枚めくる。
          </li>
          {PUSH_CARDS.map((c) => (
            <li key={c.id}>
              <b>
                {c.icon}
                {c.name}（めくった人）
              </b>
              ：{c.desc}
            </li>
          ))}
        </ul>

        <h3>時代ごとのカード</h3>
        <ul className="rule-list">
          {ERAS.map((era) => (
            <li key={era.id}>
              {era.icon} <b>{era.name}</b>：
              {era.id === 'present' && <>現代の生徒 {MODERN_POOL.length}枚（{ARCHETYPES.length}種）／</>}
              {era.id !== 'present' && (
                <>
                  偉人{' '}
                  {CARDS.filter((c) => c.era === era.id)
                    .map((c) => c.icon + c.name)
                    .join('・')}
                  ／
                </>
              )}
              イベント{' '}
              {ERA_CARDS.filter((c) => c.era === era.id)
                .map((c) => `${c.icon}${c.name}（${ATTR_ICON[c.attr]}）`)
                .join('・')}
              ／カチコミ {ERA_RAIDERS[era.id][1]}
              {ERA_RAIDERS[era.id][0]}／通常{' '}
              {ATTRS.map((a) => ERA_NORMAL_NAMES[era.id][a][0]).join('・')}
            </li>
          ))}
        </ul>

        <h3>決まったイベント</h3>
        <ul className="rule-list">
          {FIXED_EVENTS.map((f) => (
            <li key={f.id}>
              {f.icon} <b>{f.name}</b>（全員）：{fixedRule(f)}。順位点は5／3／2／1点×倍率。
            </li>
          ))}
          <li>🌻 8月 夏休み合宿（全員）：2学期の時代から1人ずつランダムに転入。</li>
        </ul>
      </div>
    </div>
  );
}
