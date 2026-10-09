import { previewStudent } from '../game/engine';
import { EVENT_MAP, GIFT_MAP } from '../game/data/events';
import { ROLES } from '../game/data/roles';
import type { Action, GameState } from '../game/types';
import { teamPartner, type Proposal, type Seat } from '../net/protocol';

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

/** 合体したクラスで、相方が場のカードを選んでいたら、そのカードに付ける印（位置 → 名前。ピラミッドは -1） */
export function mateMarks(props: Proposal[] | undefined, mySeat: number): Record<number, string> | undefined {
  const mate = props?.find((x) => x.seat === teamPartner(mySeat));
  if (!mate) return undefined;
  if (mate.action.type === 'take') return { [mate.action.slot]: mate.name };
  if (mate.action.type === 'build') return { [-1]: mate.name };
  return undefined;
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
        🤝 合体クラス：{alone ? `${mateSeat.name}は${mateSeat.kind === 'cpu' ? 'CPU' : '通信切れ'}なので1人で決める` : `${mateSeat.name}と同じ操作をしたら決まる`}
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
