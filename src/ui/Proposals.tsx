import { canBuild, canTake, previewStudent } from '../game/engine';
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
/** 選んでいるところ（カーソル）から、確定したときの操作を作る。この場面ではカーソルから決められないなら null */
export function cursorAction(s: GameState, pi: number, cur: Cursor | null | undefined): Action | null {
  const ph = s.phase;
  if (!cur || ph.kind === 'gameOver' || ph.player !== pi) return null;
  switch (ph.kind) {
    case 'draw':
      if (cur.slot === -1) return canBuild(s, pi) ? { type: 'build' } : null;
      return cur.slot !== null && cur.slot !== undefined && canTake(s, pi, cur.slot) ? { type: 'take', slot: cur.slot } : null;
    case 'makeRoom':
      return cur.uid ? { type: 'makeRoom', uid: cur.uid } : null;
    case 'push':
      return cur.uid ? { type: 'push', uid: cur.uid } : null;
    case 'kachikomi':
      return cur.target !== null && cur.target !== undefined ? { type: 'kachikomi', target: cur.target } : null;
    case 'equip':
      return cur.uid ? { type: 'equip', uid: cur.uid } : null;
    case 'cyborg':
      return cur.uid ? { type: 'cyborg', uid: cur.uid } : null;
    case 'exchange':
      return cur.uid && cur.target !== null && cur.target !== undefined && cur.theirUid ? { type: 'exchange', uid: cur.uid, target: cur.target, theirUid: cur.theirUid } : null;
    default:
      return null;
  }
}

/**
 * 合体したクラス（チーム戦の3学期）：2人の確定のようすと、確定ボタン。
 * 確定ボタンは、自分の選択カーソルを確定（実線）⇔ 取り消し（点線）に切り替える。2人の確定が重なったら決まる
 */
export function ProposalBar({
  state,
  seats,
  mySeat,
  props,
  cursor,
  onConfirm,
  onWithdraw,
}: {
  state: GameState;
  seats: Seat[];
  mySeat: number;
  props: Proposal[];
  /** 自分が今選んでいるところ */
  cursor: Cursor | null;
  onConfirm: (a: Action) => void;
  onWithdraw: () => void;
}) {
  const mateSeat = seats[teamPartner(mySeat)];
  if (!mateSeat) return null;
  const pi = Math.floor(mySeat / 2);
  const mine = props.find((x) => x.seat === mySeat);
  const mate = props.find((x) => x.seat === teamPartner(mySeat));
  const alone = mateSeat.kind === 'cpu' || (mateSeat.kind === 'guest' && !mateSeat.online);
  const next = cursorAction(state, pi, cursor);
  return (
    <>
      <span className="net-code" title="3学期はチームの2クラスが合体。2人の確定が重なったら決まる">
        🤝 合体クラス：{alone ? `${mateSeat.name}は${mateSeat.kind === 'cpu' ? 'CPU' : '通信切れ'}なので1人で決める` : '選んで「確定」。2人の確定が重なったら決まる'}
      </span>
      {mate && (
        <span className="net-mate">
          👉 {mate.name}が確定：{describeAction(state, mate.action)}
        </span>
      )}
      {mine ? (
        <button className="btn small confirm-toggle on" onClick={onWithdraw}>
          ✅ 確定中：{describeAction(state, mine.action)}（タップで取り消し）
        </button>
      ) : (
        <button className="btn small confirm-toggle" disabled={!next} onClick={() => next && onConfirm(next)}>
          {next ? `☐ 確定する：${describeAction(state, next)}` : '☐ 確定（カードや生徒を選んでください）'}
        </button>
      )}
    </>
  );
}
