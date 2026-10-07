import type { CSSProperties } from 'react';
import { MAX_CLASS, slotUnlockLabel } from '../game/calc';
import { ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import { ERAS } from '../game/data/eras';
import { className } from '../game/engine';
import type { Player, RoleId, RoleSeat } from '../game/types';
import { TcgCard } from './TcgCard';
import { useCardDrag } from './useCardDrag';

/** 係決めでカードを置ける場所：係の場（'role:<係>'）・座席（'seats'）・座席のカード（'card:<uid>'） */
export type DropTo = { kind: 'role'; role: RoleId } | { kind: 'seats' } | { kind: 'card'; uid: string };

/** 係決め：カードを係の場と座席のあいだで動かす */
export interface Arrange {
  /** タップで持ち上げているカード */
  held: string | null;
  /** 今学期に新しく解放した係 */
  fresh: RoleId[];
  /** まだ解放していないが、今タップすれば解放できる係 */
  canUnlock: (r: RoleId) => boolean;
  /** カードをタップした */
  onTap: (uid: string) => void;
  /** カードをどこかに置いた（タップで持ち上げたカードを置き場をタップ、またはドラッグして離した） */
  onPlace: (uid: string | null, to: DropTo) => void;
}

interface Props {
  player: Player;
  year: number;
  /** 今の学期に使える係の席の数 */
  slots: number;
  /** near＝手前の自分の教室／stage＝手番の人の教室（卓の中央）／peek＝タップで開いた教室 */
  variant: 'near' | 'stage' | 'peek';
  acting?: boolean;
  /** ゲリラ（転校）で出ていく子を選んでいる（手番ではない） */
  picking?: boolean;
  /** ゲリラのあと次に手番をする */
  upNext?: boolean;
  /** 直前のイベントでの得点 */
  delta?: number;
  /** 直前のイベントでの順位（0が1位） */
  rank?: number;
  onSeatClick?: (uid: string) => void;
  selectedUid?: string | null;
  dimUid?: (uid: string) => boolean;
  /** 係決めの下書き */
  roles?: RoleSeat[];
  /** 係決めの下書き（解放した係） */
  unlocked?: RoleId[];
  /** 係決め中（カードを係の場へ動かせる） */
  arrange?: Arrange;
  /** 今のイベントに関わった生徒（光らせる） */
  lit?: Set<string>;
  /** 桃園の誓いで義兄弟になっている */
  sworn?: boolean;
  /** 名札に出す時代の印（近代の電球の特許・ゴッホのひまわりなど） */
  marks?: EraMark[];
}

/** 名札に出す印 */
export interface EraMark {
  icon: string;
  title: string;
}

function parseDrop(v: string): DropTo {
  if (v.startsWith('role:')) return { kind: 'role', role: v.slice(5) as RoleId };
  if (v.startsWith('card:')) return { kind: 'card', uid: v.slice(5) };
  return { kind: 'seats' };
}

/** 教室プレイマット：名札・係の場（そこに置いたカードがその係）・座席 */
export function Playmat(props: Props) {
  const { player, year, variant, acting, picking, upNext, delta, arrange } = props;
  const view: Player = { ...player, roles: props.roles ?? player.roles, unlocked: props.unlocked ?? player.unlocked };
  const { drag, grab, wasDrag } = useCardDrag((uid, to) => arrange?.onPlace(uid, parseDrop(to)));
  const held = drag?.uid ?? arrange?.held ?? null;
  const heldSt = held ? view.students.find((s) => s.uid === held) : undefined;
  const holderOf = (r: RoleId) => {
    const seat = view.roles.find((x) => x.role === r);
    return seat ? view.students.find((s) => s.uid === seat.uid) : undefined;
  };
  const inRole = new Set(ROLE_ORDER.map((r) => holderOf(r)?.uid).filter(Boolean));
  const free = view.students.filter((s) => !inRole.has(s.uid));
  const desks = Math.max(0, MAX_CLASS - view.students.length);
  // 係の場（4つ）＋係に就いていない子の席＋空いている席
  const cells = ROLE_ORDER.length + free.length + desks;
  const over = drag?.over ?? null;
  const tap = (fn: () => void) => () => {
    if (!wasDrag()) fn();
  };

  const card = (uid: string, inZone: boolean) => {
    const st = view.students.find((s) => s.uid === uid)!;
    return (
      <TcgCard
        student={st}
        owner={view}
        lit={props.lit?.has(st.uid)}
        selected={arrange ? held === st.uid : props.selectedUid === st.uid}
        dim={arrange ? drag?.uid === st.uid : props.dimUid?.(st.uid)}
        onClick={arrange ? tap(() => arrange.onTap(st.uid)) : props.onSeatClick ? () => props.onSeatClick!(st.uid) : undefined}
        onPointerDown={arrange ? grab(st.uid) : undefined}
        drop={arrange && !inZone ? `card:${st.uid}` : undefined}
      />
    );
  };

  return (
    <div
      data-pid={player.id}
      data-drop={arrange ? 'seats' : undefined}
      className={`playmat near pm-${variant} ${acting ? 'acting' : ''} ${picking ? 'picking' : ''} ${upNext ? 'up-next' : ''} ${arrange ? 'arranging' : ''} ${held ? 'holding' : ''}`}
      style={
        {
          '--pc': player.color,
          '--cells': cells,
          '--half': Math.ceil(cells / 2),
          // 空いている机を省いたときのマスの数と、2段に収めたときの列数
          '--filled': ROLE_ORDER.length + free.length,
          '--fhalf': Math.ceil((ROLE_ORDER.length + free.length) / 2),
        } as CSSProperties
      }
      onClick={arrange ? tap(() => arrange.held && arrange.onPlace(null, { kind: 'seats' })) : undefined}
    >
      <div className="plate">
        <span className="plate-name">
          {player.name}
          {player.isCpu && <small>🤖</small>}
          {props.sworn && <small title="桃園の誓い：義兄弟（学期の区切りで点を山分け）">🍑</small>}
          {player.freeGoods && <small title="楽市楽座：次に取るグッズ1つがタダ">🪙</small>}
          {props.marks?.map((m) => (
            <small key={m.icon} title={m.title}>
              {m.icon}
            </small>
          ))}
        </span>
        <span className="plate-class">
          {className(player.id, year)} 👥{view.students.length}/{MAX_CLASS}
        </span>
        <span className="plate-pts">{player.points}</span>
        <DeltaBadge delta={delta} rank={props.rank} points={player.points} />
      </div>
      <div className="floor">
        {ROLE_ORDER.map((r, i) => {
          const def = ROLES[r];
          const st = holderOf(r);
          const open = view.unlocked.includes(r);
          const unlockable = !open && !!arrange?.canUnlock(r);
          // 係の場で置けない所は、次にいつ解放できるかを出す
          const lockNote = view.unlocked.length < props.slots ? '選べる' : slotUnlockLabel(view.unlocked.length).replace('年', '-');
          const droppable = !!arrange && (open || unlockable);
          const fit = !!heldSt && droppable && heldSt.attrs.includes(def.attr) && st?.uid !== heldSt.uid;
          return (
            <div
              key={r}
              data-drop={droppable ? `role:${r}` : undefined}
              className={`role-zone ${open ? 'open' : unlockable ? 'unlockable' : 'locked'} ${arrange?.fresh.includes(r) ? 'fresh' : ''} ${fit ? 'fit' : ''} ${over === `role:${r}` ? 'over' : ''} ${i === ROLE_ORDER.length - 1 ? 'last' : ''}`}
              title={`${def.name}：ここに置いた子は${roleDesc(r)}${open ? '' : unlockable ? '（タップで解放）' : '（まだ解放していない）'}`}
              onClick={
                droppable
                  ? (e) => {
                      e.stopPropagation();
                      if (!wasDrag()) arrange!.onPlace(arrange!.held, { kind: 'role', role: r });
                    }
                  : undefined
              }
            >
              {st ? (
                card(st.uid, true)
              ) : (
                <span className="zone-empty">
                  <span className="zone-badge">{def.name}</span>
                  <span className="zone-icon">{open ? def.icon : unlockable ? '🆕' : '🔒'}</span>
                  <span className="zone-desc">{roleDesc(r)}</span>
                  {!open && <span className="zone-note">{unlockable ? '👆' : lockNote}</span>}
                </span>
              )}
            </div>
          );
        })}
        {free.map((st) => (
          <div key={st.uid} className="seat">
            {card(st.uid, false)}
          </div>
        ))}
        {Array.from({ length: desks }, (_, i) => (
          <div key={`e${i}`} className="seat empty">
            <span className="desk" />
          </div>
        ))}
      </div>
      {drag && heldSt && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}>
          <TcgCard student={heldSt} owner={view} selected />
        </div>
      )}
    </div>
  );
}

interface SeatProps {
  player: Player;
  year: number;
  acting: boolean;
  picking?: boolean;
  upNext?: boolean;
  /** 通信対戦で、この人の通信が切れている */
  offline?: boolean;
  delta?: number;
  rank?: number;
  /** 今のイベントに関わったこの人の生徒 */
  litIcons: string[];
  targetable: boolean;
  targeted: boolean;
  onClick: () => void;
  /** 桃園の誓いで義兄弟になっている */
  sworn?: boolean;
  /** 名札に出す時代の印（近代の電球の特許・ゴッホのひまわりなど） */
  marks?: EraMark[];
}

/** 相手の席：小さく畳んだ教室（名札と12席の埋まり具合）。タップで教室をポップアップ（転校中は押しつけ先に選ぶ） */
export function OpponentSeat({ player, year, acting, picking, upNext, offline, delta, rank, litIcons, targetable, targeted, onClick, sworn, marks }: SeatProps) {
  return (
    <button
      data-pid={player.id}
      className={`opp ${acting ? 'acting' : ''} ${picking ? 'picking' : ''} ${upNext ? 'up-next' : ''} ${targetable ? 'targetable' : ''} ${targeted ? 'targeted' : ''}`}
      style={{ '--pc': player.color } as CSSProperties}
      onClick={onClick}
      title={targetable ? `${player.name}に押しつける` : `${player.name}の教室を見る`}
    >
      <span className="opp-plate">
        <span className="opp-name">
          {player.name}
          {player.isCpu && <small>🤖</small>}
          {offline && <small title="通信が切れています">📵</small>}
          {sworn && <small title="桃園の誓い：義兄弟（学期の区切りで点を山分け）">🍑</small>}
          {player.freeGoods && <small title="楽市楽座：次に取るグッズ1つがタダ">🪙</small>}
          {marks?.map((m) => (
            <small key={m.icon} title={m.title}>
              {m.icon}
            </small>
          ))}
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
      <DeltaBadge delta={delta} rank={rank} points={player.points} />
    </button>
  );
}

/** 名札に浮かぶ「+5」「1位 +6」 */
function DeltaBadge({ delta, rank, points }: { delta?: number; rank?: number; points: number }) {
  if (delta === undefined || (delta === 0 && rank === undefined)) return null;
  return (
    <span className={`plate-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`} key={`${delta}-${points}`}>
      {rank !== undefined && `${rank + 1}位 `}
      {delta > 0 ? '+' : ''}
      {delta !== 0 && delta}
    </span>
  );
}
