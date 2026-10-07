import { EVENT_MAP } from '../game/data/events';
import type { GameState, Student } from '../game/types';
import { TcgCard } from './TcgCard';

/** 場に滞在しているかぐや姫（人物カードの見た目。クラスには入らない） */
const KAGUYA: Student = {
  uid: 'kaguya',
  name: 'かぐや姫',
  title: '竹取物語',
  era: 'heian',
  rarity: 'SSR',
  icon: '🌙',
  art: 'kaguya',
  attrs: [],
  flavor: '竹から生まれた月の姫。宝を持ってこられなければ、学期の終わりに月へ帰る。',
  joined: '',
  mvp: 0,
};

/** かぐや姫が滞在中なら、カードと待っている5つの宝を出す（差し出された宝は、差し出したクラスの色の枠） */
export function KaguyaStay({ state }: { state: GameState }) {
  const asks = state.kaguya;
  if (!asks) return null;
  const lines = asks.map((x) => {
    const g = EVENT_MAP[x.id];
    const p = x.by !== null ? state.players[x.by] : null;
    return { g, p };
  });
  return (
    <div className="mcard person kaguya-stay" title={`かぐや姫が滞在中（学期の終わりに月へ帰る）\n${lines.map((x) => `${x.g.icon}${x.g.name}：${x.p ? `${x.p.name}が差し出した` : 'まだ'}`).join('\n')}`}>
      <TcgCard student={KAGUYA} size="mini" />
      <div className="kaguya-asks">
        {lines.map((x, i) => (
          <span key={i} className={`kaguya-ask ${x.p ? 'done' : ''}`} style={{ borderColor: x.p ? x.p.color : '#d8c98a' }}>
            {x.g.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
