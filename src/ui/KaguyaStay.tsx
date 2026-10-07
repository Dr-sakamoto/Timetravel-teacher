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

/** かぐや姫が滞在中なら、カードと各クラスに頼んでいる宝を出す（差し出したクラスは ✓） */
export function KaguyaStay({ state }: { state: GameState }) {
  const asks = state.kaguya;
  if (!asks) return null;
  const lines = state.players.map((p, i) => {
    const id = asks[i];
    const g = id ? EVENT_MAP[id] : null;
    return { p, text: g ? g.name : '差し出した', icon: g ? g.icon : '✓' };
  });
  return (
    <div className="mcard person kaguya-stay" title={`かぐや姫が滞在中（学期の終わりに月へ帰る）\n${lines.map((x) => `${x.p.name}：${x.text}`).join('\n')}`}>
      <TcgCard student={KAGUYA} size="mini" />
      <div className="kaguya-asks">
        {lines.map((x, i) => (
          <span key={i} className={`kaguya-ask ${x.icon === '✓' ? 'done' : ''}`} style={{ borderColor: x.p.color }}>
            {x.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
