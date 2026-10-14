import { CARD_MAP } from '../game/data/cards';
import type { Student } from '../game/types';
import { TcgCard } from './TcgCard';

/*
 * SNSのリンクのカード（OGP画像・1200×630）の構図（#ogp で開く）。
 * これを撮影したものが public/ogp.png。カードの顔ぶれや文言を変えたら撮り直す。
 */

const FACES = ['trex', 'nobunaga', 'murasaki', 'zhuge', 'einstein', 'cleopatra'];

function student(id: string, i: number): Student {
  const c = CARD_MAP[id];
  return { uid: `ogp${i}`, cardId: id, name: c.name, title: c.title, era: c.era, rarity: c.rarity, icon: c.icon, art: id, attrs: [...c.attrs], flavor: c.flavor, joined: '', mvp: 0 };
}

export function OgpCard() {
  return (
    <div className="ogp">
      <div className="ogp-text">
        <div className="title-sub">タイムトラベル・ティーチャー</div>
        <h1 className="title-logo">
          時空最強クラス
          <br />
          決定戦
        </h1>
        <p className="ogp-lead">
          偉人が転校してくる。
          <br />
          恐竜も、武将も、天才も。
          <br />
          最強のクラスを作れ！
        </p>
        <p className="ogp-foot">スマホで2〜10人 ・ CPU対戦も ・ 無料</p>
      </div>
      <div className="ogp-cards">
        {FACES.map((id, i) => (
          <div key={id} className="ogp-card">
            <TcgCard student={student(id, i)} />
          </div>
        ))}
      </div>
    </div>
  );
}
