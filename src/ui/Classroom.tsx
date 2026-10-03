import { MAX_CLASS, nextSlotAt, roleSlots } from '../game/calc';
import { CLASS_MAP, className } from '../game/data/classes';
import { ROLES, roleDesc } from '../game/data/roles';
import type { Player } from '../game/types';
import { StudentCard } from './StudentCard';

interface Props {
  player: Player;
  year: number;
  /** 係決め中：選択中の係スロット */
  activeSlot?: number;
  onSlotClick?: (i: number) => void;
  onSeatClick?: (uid: string) => void;
  selectedUid?: string | null;
  dimUid?: (uid: string) => boolean;
}

/** 教室プレイマット：黒板（クラス名・係）と12の座席 */
export function Classroom({ player, year, activeSlot, onSlotClick, onSeatClick, selectedUid, dimUid }: Props) {
  if (!player.classCardId) return null;
  const card = CLASS_MAP[player.classCardId];
  const k = roleSlots(player);
  const unlockAt = nextSlotAt(player);
  const seats = Array.from({ length: MAX_CLASS }, (_, i) => player.students[i] ?? null);
  return (
    <div className="classroom" style={{ borderColor: player.color }}>
      <div className="blackboard">
        <div className="bb-title" title={card.desc}>
          {card.icon} {className(card.id, year)}「{card.nick}」
          <span className="bb-count">
            👥{player.students.length}/{MAX_CLASS}
          </span>
        </div>
        <div className="bb-roles">
          {card.roles.map((r, i) => {
            const locked = i >= k;
            const st = player.students.find((s) => s.uid === player.roles[i]);
            return (
              <button
                key={i}
                className={`bb-role ${locked ? 'locked' : ''} ${activeSlot === i ? 'active' : ''}`}
                disabled={locked || !onSlotClick}
                onClick={() => onSlotClick?.(i)}
                title={locked ? `${6 + (i - 2) * 2}人で解放` : roleDesc(r)}
              >
                <span className="bb-role-icon">{locked ? '🔒' : ROLES[r].icon}</span>
                <span className="bb-role-name">{locked ? `${6 + (i - 2) * 2}人` : ROLES[r].name}</span>
                {!locked && <span className="bb-role-who">{st ? st.icon : '—'}</span>}
              </button>
            );
          })}
        </div>
        {unlockAt && <div className="bb-hint">次の係は{unlockAt}人で解放</div>}
      </div>
      <div className="seats">
        {seats.map((st, i) => (
          <div key={st?.uid ?? `empty-${i}`} className={`seat ${st ? '' : 'empty'}`}>
            {st ? (
              <StudentCard
                student={st}
                owner={player}
                selected={selectedUid === st.uid}
                dim={dimUid?.(st.uid)}
                onClick={onSeatClick ? () => onSeatClick(st.uid) : undefined}
              />
            ) : (
              <span className="desk">空席</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
