import type { CSSProperties } from 'react';
import { MAX_CLASS, roleSlots, slotUnlockAt } from '../game/calc';
import { ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import { className } from '../game/engine';
import type { Player } from '../game/types';
import { TcgCard } from './TcgCard';

interface Props {
  player: Player;
  year: number;
  /** 手前（大きく表示）か、向かい側（コンパクト） */
  near: boolean;
  acting?: boolean;
  /** 直前のイベントでの得点 */
  delta?: number;
  /** 転校の押しつけ先として選べる */
  targetable?: boolean;
  targeted?: boolean;
  onTarget?: () => void;
  activeSlot?: number;
  onSlotClick?: (i: number) => void;
  onSeatClick?: (uid: string) => void;
  selectedUid?: string | null;
  dimUid?: (uid: string) => boolean;
  /** 係決めの下書き */
  roles?: (string | null)[];
  /** 今のイベントに関わった生徒。相手の教室ではこのカードだけ表に返る */
  lit?: Set<string>;
}

/** 教室プレイマット：名札・係ボード・12の座席。相手の教室は裏向きで、イベントに関わったカードだけ表に返る */
export function Playmat(props: Props) {
  const { player, year, near, acting, delta, targetable, targeted, onTarget } = props;
  const view: Player = props.roles ? { ...player, roles: props.roles } : player;
  const k = roleSlots(view);
  const seats = Array.from({ length: MAX_CLASS }, (_, i) => view.students[i] ?? null);
  return (
    <div
      className={`playmat ${near ? 'near' : 'far'} ${acting ? 'acting' : ''} ${targetable ? 'targetable' : ''} ${targeted ? 'targeted' : ''}`}
      style={{ '--pc': player.color } as CSSProperties}
      onClick={targetable ? onTarget : undefined}
    >
      <div className="plate">
        <span className="plate-name">
          {player.name}
          {player.isCpu && <small>🤖</small>}
        </span>
        <span className="plate-class">
          {className(player.id, year)} 👥{view.students.length}/{MAX_CLASS}
        </span>
        <span className="plate-pts">{player.points}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`plate-delta ${delta > 0 ? 'up' : 'down'}`} key={`${delta}-${player.points}`}>
            {delta > 0 ? '+' : ''}
            {delta}
          </span>
        )}
      </div>
      {near && (
        <div className="roleboard">
          {ROLE_ORDER.map((r, i) => {
            const locked = i >= k;
            const st = view.students.find((s) => s.uid === view.roles[i]);
            return (
              <button
                key={r}
                className={`role-slot ${locked ? 'locked' : ''} ${props.activeSlot === i ? 'active' : ''}`}
                disabled={locked || !props.onSlotClick}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onSlotClick?.(i);
                }}
                title={locked ? `${slotUnlockAt(i)}人で解放` : `${ROLES[r].name}：${roleDesc(r)}`}
              >
                <span>{locked ? '🔒' : ROLES[r].icon}</span>
                {near && <span className="role-name">{locked ? `${slotUnlockAt(i)}人` : roleDesc(r)}</span>}
                {!locked && <span className="role-who">{st ? st.icon : '·'}</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="seats">
        {seats.map((st, i) => (
          <div key={st?.uid ?? `e${i}`} className={`seat ${st ? '' : 'empty'}`}>
            {st && !near && !props.lit?.has(st.uid) ? (
              <span className="card-back" />
            ) : st ? (
              <TcgCard
                student={st}
                owner={view}
                size={near ? 'full' : 'mini'}
                lit={props.lit?.has(st.uid)}
                selected={props.selectedUid === st.uid}
                dim={props.dimUid?.(st.uid)}
                onClick={props.onSeatClick ? () => props.onSeatClick!(st.uid) : undefined}
              />
            ) : (
              <span className="desk" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
