import { CLASS_CARDS } from '../game/data/classes';
import { ERAS } from '../game/data/eras';
import { ROLES, roleDesc } from '../game/data/roles';
import type { RoleId } from '../game/types';

export function Rules({ onClose }: { onClose: () => void }) {
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

        <h3>1. クラスカードを引く</h3>
        <p>
          最初にクラスカードを1枚引き、クラスの<b>係の構成</b>と<b>初期メンバー12人</b>（全員現代の普通の生徒）が決まる。
        </p>
        <ul className="rule-list">
          {CLASS_CARDS.map((c) => (
            <li key={c.id}>
              {c.icon} <b>{c.nick}</b>：{c.desc}
            </li>
          ))}
        </ul>

        <h3>2. 係を決める（毎学期の最初）</h3>
        <p>係についた生徒は能力にバフがかかる。1年は3学期あり、学期の頭にだけ係を再編成できる。</p>
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
            <b>タイムマシン移動</b>：サイコロを振り、出目の数までタイムラインを前後に移動（留まってもOK）。
          </li>
          <li>
            <b>イベントカードを引く</b>：
            <ul>
              <li>
                <b>学校行事</b>（体育祭・文化祭・抜き打ちテスト…）は全クラスが参加。イベントに合った能力で戦力を比べ、順位に応じてポイントが入る（カタンのサイコロのように、自分の番でなくても稼げる）。
              </li>
              <li>
                <b>他校のヤンキー襲来</b>：喧嘩上位3人で迎え撃つ。ヤンキー・武将・恐竜にボーナス。撃退できれば+6pt、突破されると-6pt。
              </li>
              <li>
                <b>転校生</b>：タイムマシンがいる時代から候補が現れ、1人を選んで迎え入れる。歴史上の人物は1人しかいないので早い者勝ち！
              </li>
              <li>特訓・時空嵐・引き抜き・持ち物検査などのハプニングも。</li>
            </ul>
          </li>
        </ol>

        <h3>4. 固定イベント</h3>
        <ul className="rule-list">
          <li>📚 7月・12月・3月の月末：定期テスト（クラス全員の平均学力。ヤンキー・恐竜は減点）。順位点×2。</li>
          <li>🌻 8月：夏休みタイムトラベル合宿。好きな時代へ行き、転校生を1人スカウトできる。</li>
          <li>🌸 年度末：進級。全員の能力がどれか1つ+1。</li>
          <li>🎓 最終年度の最後：卒業式。クラス上位10人の総合力で最終審査（順位点×3）。</li>
        </ul>

        <h3>5. 時代（タイムライン）</h3>
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
