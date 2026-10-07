import { MAX_CLASS, STARTING_MEMBERS } from '../game/calc';
import { CARDS } from '../game/data/cards';
import { ERAS } from '../game/data/eras';
import {
  CYBORG_CARDS,
  ERA_CARDS,
  FIXED_EVENTS,
  GOODS_COST,
  GOODS_CARDS,
  KACHIKOMI_CARDS,
  MARKET_SIZE,
  MOVE_CARDS,
  NORMAL_CARDS,
  PERSON_CARDS_PER_TERM,
  PERSON_COST_BY_ICONS,
  RAID_CARDS,
  SWING_CARDS,
  cardRule,
  eraEffectRule,
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
          書いてあるのは<b>アイコン</b>だけ。同じアイコンが並ぶほど得意（1枚に最大5個。N 1〜2個／R 2〜3個／SR 3〜4個／SSR 4〜5個。イベントで6個まで増えることがある）。
          {ATTRS.map((a) => `${ATTR_ICON[a]}${ATTR_LABEL[a]}`).join('・')}。
          👊はヤンキーと恐竜だけが持ち、ヤンキーの約半分は👊のみ。<b>恐竜は👊が中心</b>（強い恐竜ほど👊が多い。空を飛ぶ・素早い恐竜は🏃も持つ）。グッズを装備するとアイコンが1つ増える（1人1つまで）。
        </p>

        <h3>準備</h3>
        <ol className="rule-list">
          <li>
            現代の普通の生徒（N）の山から、全員で順番に1枚ずつ引いて{STARTING_MEMBERS}人そろえる。スタート以降に現代から来るのは、現代の学期の転校生（R以上）だけ。
          </li>
          <li>
            <b>係</b>：1年1学期は1種だけ。学期の頭に、まだ解放していない係から好きなものを1種ずつ選んで解放し、最大{MAX_ROLE_SEATS}種。解放した係はずっと使える。1つの係に{MAX_PER_ROLE}人まで。
            係に就いた子は、その係のアイコンが<b>2倍</b>に数えられる。学期の頭に<b>全クラスが一斉に</b>決め直し、全員が「準備OK」になったら手番が始まる。
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
          <li>手番の順は学期の間は変わらない。最初の学期はランダム、次の学期からは<b>得点の低いクラスから順</b>（最下位が先頭。同点はランダム）。</li>
        </ol>

        <h3>手番：場のカードを1枚取る</h3>
        <p>
          卓の中央に<b>カードが{MARKET_SIZE}枚、表向きで並んでいる</b>（場）。手番の人はこの中から<b>1枚選んで取る</b>。取りたいものがなければ、1枚を<b>捨てて見送って</b>もいい（他の人に取らせたくないカードを流すのにも使える）。
        </p>
        <ul className="rule-list">
          <li>
            <b>無料</b>：授業（その場で点が入る）・カチコミ（👊を持つ子がいるときだけ）・クラス替え
          </li>
          <li>
            <b>クラスポイントを払う</b>：人物（カードに印刷されたアイコンの数で決まる：{PERSON_COST_BY_ICONS.slice(1).map((c, i) => `${i + 1}個 ${c}点`).join('／')}）・グッズとサイボーグ化（{GOODS_COST}点）。
            持ち点が足りないと取れない。<b>今すぐ点を取るか、点を払って将来の戦力を買うか</b>が悩みどころ。アイコンの少ない子はすぐ元が取れ、多い子は長い試合でないと元が取れない。
          </li>
        </ul>
        <p>
          取ったら山札から場を補充する。このとき<b>ゲリラ</b>（時代イベント・襲来・転校）をめくったら、<b>その場で起こる</b>（誰も避けられない。補充はそのあと続ける）。
          ゲリラは全クラスに効く、誰の手番でもない学校全体のできごと。転校では全クラスが順番に出ていく子を選ぶが、これも手番ではない（終わったら次の人の番）。ゲリラの間は卓が紫に縁どられ、選んでいる人には「📦 選んでいる」、次に手番をする人には「▶ 次の番」が出る。
        </p>
        <p>
          山札は学期ごとに作り直す。<b>授業・カチコミ・転校・クラス替え・グッズは全時代共通</b>で、そこに
          <b>その時代の固有イベント・襲来・グッズ</b>と、<b>その時代のカードプールから人物カード最大{PERSON_CARDS_PER_TERM}枚</b>が混ざる。
          中央の「捨て札・内訳」をタップすると今の山札と場の内訳が見られる。
        </p>
        <ul className="rule-list">
          <li>
            <b>授業</b>（無料・取った人だけ。{NORMAL_CARDS.map((c) => `${c.icon}${c.name}×${c.count}`).join('・')}）：クラス全員の<b>そのアイコンの合計数</b>（＋係ボーナス）が入る。
          </li>
          <li>
            <b>
              {kachikomi.icon}
              {kachikomi.name}
            </b>
            （場から取る・無料・×{kachikomi.count}）：{cardRule(kachikomi)}。👊の子はテストでいつも足を引っぱるが、カチコミと襲来では頼りになる。
          </li>
          {SWING_CARDS.some((c) => c.count > 0) && (
            <li>
              <b>共通イベント</b>（ゲリラ・全クラス・各1枚）：クラスの状況で<b>プラスにもマイナスにもなる</b>。
              <ul>
                {SWING_CARDS.map((c) => (
                  <li key={c.id}>
                    {c.icon}
                    {c.name}：{cardRule(c)}
                  </li>
                ))}
              </ul>
            </li>
          )}
          {MOVE_CARDS.map((c) => (
            <li key={c.id}>
              <b>
                {c.icon}
                {c.name}
              </b>
              （{c.kind === 'push' ? 'ゲリラ' : '無料'}・{c.odds !== undefined ? `学期の3回に2回、×${c.count}` : `×${c.count}`}）：{c.desc}
            </li>
          ))}
          <li>
            <b>グッズ</b>（{GOODS_COST}点。共通：{GOODS_CARDS.filter((g) => !g.era).map((g) => `${g.icon}${g.name}${ATTR_ICON[g.attr]}`).join('・')}＋時代ごとに2種。平安だけは竹取物語の5つの宝）：生徒1人に装備して、そのアイコンを＋1。
          </li>
          <li>
            <b>時代イベント</b>（ゲリラ・全クラス・4枚。現代・白亜紀・古代エジプト・ギリシャ・ローマ・三国志・平安・中世・戦国・近代・未来は4種×1枚、ほかの時代は2種×2枚。<b>山札の上のほうに散らして入れるので、1学期にたいてい3枚前後めくられる</b>）：<b>時代ごとにものを言う力が違う</b>。何が有利かは、学期の頭に読み上げられる<b>時代の空気</b>（「強い者と、すばしこく逃げ回れる者だけが生き残る時代」など）から読み取ろう。どの時代にも、点の数え方ではなく<b>起こることそのものが違う、その時代だけのイベント</b>がある（白亜紀はオヴィラプトルの卵泥棒で恐竜の卵が手に入る、ギリシャ・ローマは陶片追放の秘密投票で票が一番集まったクラスが1人転校させる、三国志は桃園の誓いで義兄弟になったクラスどうしが学期の区切りに点を山分けする、平安は五条大橋で弁慶を倒したクラスに弁慶が家来として来る、中世はペストにかかった子が学期の区切りまで走れなくなり、新大陸の品は早い者勝ち、戦国は鉄砲が全クラスに届き、楽市楽座で人望のあるクラスのグッズがタダに、近代は電球の特許で授業のたびに特許料が入り、ゴッホのひまわりは学期の区切りに値打ちが出る、江戸は富くじで総取り、など。中身は下の時代の一覧で）。1年の3つの時代は年の初めに決まって上に出ているので、次の学期に向けてクラスを作っておこう。
          </li>
          <li>
            <b>襲来</b>（ゲリラ・全クラス・時代ごとに1枚）：クラスの👊の数 − 敵の強さ。撃退すれば大きくプラス、守れなければ大きくマイナス。
          </li>
          <li>
            <b>人物カード</b>（アイコンの数に応じてポイントを払う）：取るとその子が転入。満席なら、係に就いていない子を1人転校させて入れ替わりに迎える。
          </li>
        </ul>

        <h3>時代ごとのカード</h3>
        <ul className="rule-list">
          {ERAS.map((era) => {
            const raid = RAID_CARDS.find((c) => c.era === era.id)!;
            return (
              <li key={era.id}>
                {era.icon} <b>{era.name}</b>「{era.motto}」：
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
                  .map((c) => `${c.icon}${c.name}（${eraEffectRule(c)}）`)
                  .join('・')}
                ／襲来 {raid.icon}
                {raid.name.replace('襲来！', '')}（強さ{raid.threat}）／グッズ{' '}
                {[
                  ...GOODS_CARDS.filter((g) => g.era === era.id).map((g) => `${g.icon}${g.name}${ATTR_ICON[g.attr]}`),
                  ...CYBORG_CARDS.filter((g) => g.era === era.id).map((g) => `${g.icon}${g.name}（${cardRule(g)}）`),
                ].join('・')}
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
