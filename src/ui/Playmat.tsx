import type { CSSProperties } from 'react';
import { MAX_CLASS, slotUnlockLabel } from '../game/calc';
import { ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import { ERAS } from '../game/data/eras';
import { className } from '../game/engine';
import type { Player } from '../game/types';
import { TcgCard } from './TcgCard';

interface Props {
  player: Player;
  year: number;
  /** 今の学期に使える係の数 */
  slots: number;
  /** near＝手前の自分の教室／stage＝手番の人の教室（卓の中央）／peek＝タップで開いた教室 */
  variant: 'near' | 'stage' | 'peek';
  acting?: boolean;
  /** 直前のイベントでの得点 */
  delta?: number;
  activeSlot?: number;
  onSlotClick?: (i: number) => void;
  onSeatClick?: (uid: string) => void;
  selectedUid?: string | null;
  dimUid?: (uid: string) => boolean;
  /** 係決めの下書き */
  roles?: (string | null)[];
  /** 今のイベントに関わった生徒（光らせる） */
  lit?: Set<string>;
}

/** 教室プレイマット：名札・係ボード・12の座席 */
export function Playmat(props: Props) {
  const { player, year, variant, acting, delta } = props;
  const view: Player = props.roles ? { ...player, roles: props.roles } : player;
  const k = props.slots;
  const seats = Array.from({ length: MAX_CLASS }, (_, i) => view.students[i] ?? null);
  return (
    <div data-pid={player.id} className={`playmat near pm-${variant} ${acting ? 'acting' : ''}`} style={{ '--pc': player.color } as CSSProperties}>
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
              title={locked ? `${slotUnlockLabel(i)}で解放` : `${ROLES[r].name}：${roleDesc(r)}`}
            >
              <span>{locked ? '🔒' : ROLES[r].icon}</span>
              <span className="role-name">{locked ? slotUnlockLabel(i).replace('年', '-') : roleDesc(r)}</span>
              {!locked && <span className="role-who">{st ? st.icon : '·'}</span>}
            </button>
          );
        })}
      </div>
      <div className="seats">
        {seats.map((st, i) => (
          <div key={st?.uid ?? `e${i}`} className={`seat ${st ? '' : 'empty'}`}>
            {st ? (
              <TcgCard
                student={st}
                owner={view}
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

interface SeatProps {
  player: Player;
  year: number;
  acting: boolean;
  delta?: number;
  /** 今のイベントに関わったこの人の生徒 */
  litIcons: string[];
  targetable: boolean;
  targeted: boolean;
  onClick: () => void;
}

/** 相手の席：小さく畳んだ教室（名札と12席の埋まり具合）。タップで教室をポップアップ（転校中は押しつけ先に選ぶ） */
export function OpponentSeat({ player, year, acting, delta, litIcons, targetable, targeted, onClick }: SeatProps) {
  return (
    <button
      data-pid={player.id}
      className={`opp ${acting ? 'acting' : ''} ${targetable ? 'targetable' : ''} ${targeted ? 'targeted' : ''}`}
      style={{ '--pc': player.color } as CSSProperties}
      onClick={onClick}
      title={targetable ? `${player.name}に押しつける` : `${player.name}の教室を見る`}
    >
      <span className="opp-plate">
        <span className="opp-name">
          {player.name}
          {player.isCpu && <small>🤖</small>}
        </span>
        <span className="opp-class">{className(player.id, year)}</span>
        <span className="opp-pts">{player.points}</span>
      </span>
      <span className="opp-seats">
        {Array.from({ length: MAX_CLASS }, (_, i) => {
          const st = player.students[i];
          return (
            <span
              key={i}
              className={`opp-seat ${st ? 'on' : ''}`}
              style={st ? ({ '--era': ERAS.find((e) => e.id === st.era)!.color } as CSSProperties) : undefined}
            />
          );
        })}
        {litIcons.length > 0 && (
          <span className="opp-lit">
            {litIcons.slice(0, 6).map((ic, i) => (
              <span key={i} style={{ animationDelay: `${i * 60}ms` }}>
                {ic}
              </span>
            ))}
            {litIcons.length > 6 && <small>+{litIcons.length - 6}</small>}
          </span>
        )}
      </span>
      {delta !== undefined && delta !== 0 && (
        <span className={`plate-delta ${delta > 0 ? 'up' : 'down'}`} key={`${delta}-${player.points}`}>
          {delta > 0 ? '+' : ''}
          {delta}
        </span>
      )}
    </button>
  );
}
