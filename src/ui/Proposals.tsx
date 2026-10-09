import { previewStudent } from '../game/engine';
import { EVENT_MAP, GIFT_MAP } from '../game/data/events';
import { ROLES } from '../game/data/roles';
import type { Action, GameState } from '../game/types';
import type { CSSProperties } from 'react';
import { teamPartner, type Cursor, type Proposal, type Seat, type SeatCursor } from '../net/protocol';

/** 場のカードの名前 */
function cardName(id: string | undefined): string {
  if (!id) return '？';
  if (id.startsWith('person:')) return previewStudent(id).name;
  return EVENT_MAP[id]?.name ?? id;
}

/** 案の中身を一言で（合体したクラスで、相方の画面に出す） */
export function describeAction(s: GameState, a: Action): string {
  const student = (uid: string | null | undefined) => s.players.flatMap((p) => p.students).find((x) => x.uid === uid)?.name ?? '？';
  const cls = (pi: number | null | undefined) => (pi === null || pi === undefined ? '？' : `${s.players[pi]?.name ?? '？'}のクラス`);
  switch (a.type) {
    case 'drawMember':
      return '生徒を1枚引く';
    case 'drawAllMembers':
      return '生徒をまとめて引く';
    case 'continue':
      return '次へ';
    case 'setRoles': {
      const roles = a.roles.map((r) => `${ROLES[r.role].icon}${student(r.uid)}`).join(' ') || '係なし';
      const unlock = a.unlock?.length ? `（${a.unlock.map((r) => ROLES[r].name).join('・')}を解放）` : '';
      return `係：${roles}${unlock}`;
    }
    case 'take':
      return `「${cardName(s.market[a.slot])}」を取る`;
    case 'pass':
      return '見送る';
    case 'build':
      return 'ピラミッドに石を積む';
    case 'makeRoom':
      return a.uid ? `${student(a.uid)}を転校させて迎える` : 'やめる';
    case 'push':
      return `${student(a.uid)}を手放す`;
    case 'vote':
      return `${cls(a.target)}に投票`;
    case 'kachikomi':
      return a.target === null ? 'やめる' : `${cls(a.target)}にカチコミ`;
    case 'exchange':
      return a.uid ? `${student(a.uid)}と${student(a.theirUid)}を入れ替え` : 'やめる';
    case 'equip':
      return a.uid ? `${student(a.uid)}に装備` : 'やめる';
    case 'gift':
      return `${student(a.uid)}に${GIFT_MAP[a.item]?.name ?? a.item}`;
    case 'cyborg':
      return a.uid ? `${student(a.uid)}をサイボーグ化` : 'やめる';
    case 'present':
      return 'かぐや姫に宝を差し出す';
    case 'oath':
      return `${a.targets.map((t) => s.players[t]?.name).join('・')}と義兄弟になる`;
  }
}

/** 選択カーソルの枠1つ（だれの・何色の・確定したか） */
export interface CursorMark {
  name: string;
  color: string;
  done: boolean;
}

/** 卓のどこに、どの枠を出すか */
export interface CursorMarks {
  slot: Record<number, CursorMark[]>;
  uid: Record<string, CursorMark[]>;
  target: Record<number, CursorMark[]>;
}

/** 部屋A・Bの人の枠の色 */
export const CURSOR_COLORS = ['#4dabf7', '#ff922b'];

/** 確定した案が、卓のどこを指しているか */
export function actionCursor(a: Action): Cursor {
  switch (a.type) {
    case 'take':
      return { slot: a.slot };
    case 'build':
      return { slot: -1 };
    case 'makeRoom':
    case 'equip':
    case 'cyborg':
      return { uid: a.uid };
    case 'push':
    case 'gift':
      return { uid: a.uid };
    case 'kachikomi':
    case 'vote':
      return { target: a.target };
    case 'exchange':
      return { uid: a.uid, target: a.target };
    default:
      return {};
  }
}

/** 合体したクラスの2人（自分と相方）の枠：確定した案があればそこに実線、なければ選んでいるところに点線 */
export function cursorMarks(seats: Seat[], mySeat: number, props: Proposal[] | undefined, cursors: SeatCursor[] | undefined): CursorMarks {
  const out: CursorMarks = { slot: {}, uid: {}, target: {} };
  const put = <K extends string | number>(m: Record<K, CursorMark[]>, k: K | null | undefined, mark: CursorMark) => {
    if (k === null || k === undefined) return;
    (m[k] ??= []).push(mark);
  };
  for (const seat of [mySeat, teamPartner(mySeat)]) {
    if (!seats[seat]) continue;
    const prop = props?.find((x) => x.seat === seat);
    const cur = prop ? actionCursor(prop.action) : cursors?.find((x) => x.seat === seat)?.cur;
    if (!cur) continue;
    const mark = { name: seat === mySeat ? 'あなた' : seats[seat].name, color: CURSOR_COLORS[seat % 2], done: !!prop };
    put(out.slot, cur.slot, mark);
    put(out.uid, cur.uid, mark);
    put(out.target, cur.target, mark);
  }
  return out;
}

/** 選択カーソルの枠（カードに重ねる）。確定前は点線、確定したら実線で「確定」 */
export function CursorFrames({ marks }: { marks?: CursorMark[] }) {
  if (!marks?.length) return null;
  return (
    <>
      {marks.map((m, i) => (
        <span key={i} className={`cur-frame ${m.done ? 'done' : ''}`} style={{ '--cc': m.color, '--ci': i } as CSSProperties}>
          <span className="cur-tag">
            {m.name}
            {m.done ? ' ✓確定' : ''}
          </span>
        </span>
      ))}
    </>
  );
}

/** 合体したクラス（チーム戦の3学期）：2人の案と、相方の案に合わせるボタン */
export function ProposalBar({ state, seats, mySeat, props, onAgree }: { state: GameState; seats: Seat[]; mySeat: number; props: Proposal[]; onAgree: (a: Action) => void }) {
  const mateSeat = seats[teamPartner(mySeat)];
  if (!mateSeat) return null;
  const mine = props.find((x) => x.seat === mySeat);
  const mate = props.find((x) => x.seat === teamPartner(mySeat));
  const alone = mateSeat.kind === 'cpu' || (mateSeat.kind === 'guest' && !mateSeat.online);
  return (
    <>
      <span className="net-code" title="3学期はチームの2クラスが合体。2人が同じ操作をしたら決まる">
        🤝 合体クラス：{alone ? `${mateSeat.name}は${mateSeat.kind === 'cpu' ? 'CPU' : '通信切れ'}なので1人で決める` : `選んだところに2人の枠が出る。2人とも同じものを確定したら決まる`}
      </span>
      {mate && (
        <span className="net-mate">
          👉 {mate.name}の案：{describeAction(state, mate.action)}
          <button className="btn small primary" onClick={() => onAgree(mate.action)}>
            👍 この案で決める
          </button>
        </span>
      )}
      {mine && (
        <span className="net-code">
          ✋ あなたの案：{describeAction(state, mine.action)}（{mateSeat.name}を待っています）
        </span>
      )}
    </>
  );
}
