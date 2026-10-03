import { MAX_CLASS, STARTING_MEMBERS } from '../game/calc';
import { CARDS } from '../game/data/cards';
import { ERAS } from '../game/data/eras';
import {
  ERA_CARDS,
  FIXED_EVENTS,
  GOODS_CARDS,
  KACHIKOMI_CARDS,
  MOVE_CARDS,
  NORMAL_CARDS,
  PERSON_CARDS_PER_TERM,
  RAID_CARDS,
  SWING_CARDS,
  cardRule,
  fixedRule,
} from '../game/data/events';
import { ARCHETYPES } from '../game/data/modern';
import { MAX_PER_ROLE, MAX_ROLE_SEATS, ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import { ATTRS, ATTR_ICON, ATTR_LABEL } from '../game/types';

export function Rules({ onClose }: { onClose: () => void }) {
  const kachikomi = KACHIKOMI_CARDS[0];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
        <h2>遊び方</h2>
        <p>
          あなたは担任の先生。プレイヤーはみんな<b>同じ学校の別のクラス</b>の担任。歴史上の偉人や恐竜を転入させて教室の{MAX_CLASS}席を埋め、<b>クラスポイント</b>を一番集めた先生の勝ち！
        </p>

        <h3>生徒カード</h3>
        <p>
          書いてあるのは<b>アイコン</b>だけ。同じアイコンが並ぶほど得意（1枚に最大5個。N 1〜2個／R 2〜3個／SR 3〜4個／SSR 4〜5個）。
          {ATTRS.map((a) => `${ATTR_ICON[a]}${ATTR_LABEL[a]}`).join('・')}。
          👊はヤンキーだけが持ち、ヤンキーの約半分は👊のみ。グッズを装備するとアイコンが1つ増える（1人1つまで）。
        </p>

        <h3>準備</h3>
        <ol className="rule-list">
          <li>
            現代の普通の生徒（N）の山から、全員で順番に1枚ずつ引いて{STARTING_MEMBERS}人そろえる。スタート以降に現代から来るのは、現代の学期の転校生（R以上）だけ。
          </li>
          <li>
            <b>係</b>：1年1学期は1種だけ。学期が進むごとに1種ずつ解放され、最大{MAX_ROLE_SEATS}種。1つの係に{MAX_PER_ROLE}人まで。
            係に就いた子は、その係のアイコンが<b>2倍</b>に数えられる。学期の頭に決め直せる。
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
          <b>通常カード・カチコミ・転校・クラス替え・グッズ・人物カードはめくった人だけ</b>。<b>共通イベントと時代イベントは学校行事なので全クラスに</b>効果がある。
        </p>
        <p>
          山札は学期ごとに作り直す。<b>通常カード・カチコミ・共通イベント・転校・グッズは全時代共通</b>で、そこに
          <b>その時代の固有イベント・襲来・グッズ</b>と、<b>その時代のカードプールから人物カード最大{PERSON_CARDS_PER_TERM}枚</b>が混ざる。
          中央の「捨て札・内訳」をタップすると今の山札の内訳が見られる。
        </p>
        <ul className="rule-list">
          <li>
            <b>通常カード</b>（めくった人だけ。{NORMAL_CARDS.map((c) => `${c.icon}${c.name}×${c.count}`).join('・')}）：クラス全員の<b>そのアイコンの合計数</b>（＋係ボーナス）が入る。
          </li>
          <li>
            <b>
              {kachikomi.icon}
              {kachikomi.name}
            </b>
            （×{kachikomi.count}）：{cardRule(kachikomi)}。
          </li>
          <li>
            <b>共通イベント</b>（全クラス・各1枚）：クラスの状況で<b>プラスにもマイナスにもなる</b>。
            <ul>
              {SWING_CARDS.map((c) => (
                <li key={c.id}>
                  {c.icon}
                  {c.name}：{cardRule(c)}
                </li>
              ))}
            </ul>
          </li>
          {MOVE_CARDS.map((c) => (
            <li key={c.id}>
              <b>
                {c.icon}
                {c.name}
              </b>
              （×{c.count}）：{c.desc}
            </li>
          ))}
          <li>
            <b>グッズ</b>（共通：{GOODS_CARDS.filter((g) => !g.era).map((g) => `${g.icon}${g.name}${ATTR_ICON[g.attr]}`).join('・')}＋時代ごとに2種）：生徒1人に装備して、そのアイコンを＋1。
          </li>
          <li>
            <b>時代イベント</b>（全クラス・2種×2枚）：クラス全員のそのアイコンの合計数。<b>その時代出身の子は2倍</b>。時代によって得をする能力が変わる。
          </li>
          <li>
            <b>襲来</b>（全クラス・時代ごとに1枚）：クラスの👊の数 − 敵の強さ（その時代出身の子は2倍）。撃退すれば大きくプラス、守れなければ大きくマイナス。
          </li>
          <li>
            <b>人物カード</b>：めくったらその子が<b>そのまま転入</b>。満席なら捨て札にしてもう1枚めくる。
          </li>
        </ul>

        <h3>時代ごとのカード</h3>
        <ul className="rule-list">
          {ERAS.map((era) => {
            const raid = RAID_CARDS.find((c) => c.era === era.id)!;
            return (
              <li key={era.id}>
                {era.icon} <b>{era.name}</b>：
                {era.id === 'present' ? (
                  <>
                    転校生{' '}
                    {ARCHETYPES.filter((a) => a.rarity !== 'N')
                      .map((a) => a.icon + a.title)
                      .join('・')}
                  </>
                ) : (
                  <>
                    偉人{' '}
                    {CARDS.filter((c) => c.era === era.id)
                      .map((c) => c.icon + c.name)
                      .join('・')}
                  </>
                )}
                ／イベント{' '}
                {ERA_CARDS.filter((c) => c.era === era.id)
                  .map((c) => `${c.icon}${c.name}（${ATTR_ICON[c.attr]}）`)
                  .join('・')}
                ／襲来 {raid.icon}
                {raid.name.replace('襲来！', '')}（強さ{raid.threat}）／グッズ{' '}
                {GOODS_CARDS.filter((g) => g.era === era.id)
                  .map((g) => `${g.icon}${g.name}${ATTR_ICON[g.attr]}`)
                  .join('・')}
              </li>
            );
          })}
        </ul>

        <h3>決まったイベント（全員）</h3>
        <ul className="rule-list">
          {FIXED_EVENTS.map((f) => (
            <li key={f.id}>
              {f.icon} <b>{f.name}</b>：{fixedRule(f)}。順位点は5／3／2／1点×倍率。
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
