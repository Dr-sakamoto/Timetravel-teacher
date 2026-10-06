import { MAX_PER_ROLE, MAX_ROLE_SEATS, ROLES } from './data/roles';
import { ATTRS, type Attr, type EraId, type Player, type RoleId, type RoleSeat, type Student } from './types';

/** 教室の席の数（クラスの定員） */
export const MAX_CLASS = 9;
/** 転校・交換で手放してもこれより少なくはならない */
export const MIN_CLASS = 4;
export const STARTING_MEMBERS = 6;

/** ゲーム開始からの通算学期（1年1学期＝1、1年2学期＝2、…）。夏休みは直前の1学期として数える */
export function termNo(year: number, term: number): number {
  return (year - 1) * 3 + Math.max(term, 1);
}

/** 係の数：1年1学期は1種で、学期が進むごとに1種ずつ解放される（最大4種） */
export function roleSlots(no: number): number {
  return Math.max(1, Math.min(MAX_ROLE_SEATS, no));
}

/** 新しく解放する係の選び方が決まりを守っているか（今学期の数ちょうどまで・まだ解放していない種類） */
export function validUnlock(p: Player, unlock: RoleId[], slots: number): boolean {
  if (p.unlocked.length + unlock.length !== Math.max(p.unlocked.length, slots)) return false;
  if (new Set(unlock).size !== unlock.length) return false;
  return unlock.every((r) => ROLES[r] && !p.unlocked.includes(r));
}

/** 係の編成が決まりを守っているか（解放した係だけ・1人1つ・1つの係に1人まで） */
export function validRoles(p: Player, roles: RoleSeat[], kinds: RoleId[]): boolean {
  if (roles.some((r) => !kinds.includes(r.role))) return false;
  const uids = roles.map((r) => r.uid);
  if (new Set(uids).size !== uids.length || uids.some((u) => !p.students.some((s) => s.uid === u))) return false;
  return [...new Set(roles.map((r) => r.role))].every((k) => roles.filter((r) => r.role === k).length <= MAX_PER_ROLE);
}

/** uid の子を係 r の場に置く。そこにいた子は、動かした子が元いた係の場へ（係に就いていなかったなら座席へ）戻る */
export function moveToRole(roles: RoleSeat[], uid: string, r: RoleId): RoleSeat[] {
  const from = roles.find((x) => x.uid === uid)?.role;
  const occupant = roles.find((x) => x.role === r)?.uid;
  const out = roles.filter((x) => x.uid !== uid && x.role !== r);
  out.push({ role: r, uid });
  if (occupant && occupant !== uid && from) out.push({ role: from, uid: occupant });
  return out;
}

/** i番目（0始まり）の係の席が解放される学期の名前（例：「1年2学期」）。最初の1席は最初から */
export function slotUnlockLabel(i: number): string {
  const no = i + 1;
  return `${Math.ceil(no / 3)}年${((no - 1) % 3) + 1}学期`;
}

/** 係は1人につき1つまで（係に就いていない生徒はnull） */
export function roleOf(p: Player, uid: string): RoleId | null {
  return p.roles.find((r) => r.uid === uid)?.role ?? null;
}

/** 点に数えるアイコン（ペストにかかった子の🏃は数えない） */
export function counted(s: Student): Attr[] {
  return s.plague ? s.attrs.filter((a) => a !== 'sports') : s.attrs;
}

/** 係ボーナスが付いているか（その生徒が、アイコンaの係に就いていて、aを持っている） */
export function hasRoleBonus(p: Player, s: Student, a: Attr): boolean {
  // 三顧の礼の軍師は、係に就いていなくても係ボーナスが付く
  if (s.gunshi === a && counted(s).includes(a)) return true;
  const r = roleOf(p, s.uid);
  return r !== null && ROLES[r].attr === a && counted(s).includes(a);
}

/** その生徒が持つアイコンaの数 */
export function iconsOf(s: Student, a: Attr): number {
  return counted(s).filter((x) => x === a).length;
}

export interface AttrScore {
  /** アイコンの合計数 */
  sum: number;
  /** 係ボーナス（係に就いた子のアイコン数ぶん） */
  bonus: number;
  total: number;
  holders: Student[];
}

/** クラス全員のアイコンaの合計数＋係ボーナス。doubleEra の生徒のアイコンは2倍。'all' は全種類の合計 */
export function attrScore(p: Player, a: Attr | 'all', doubleEra?: EraId): AttrScore {
  if (a === 'all') {
    const parts = ATTRS.map((x) => attrScore(p, x, doubleEra));
    const sum = parts.reduce((t, x) => t + x.sum, 0);
    const bonus = parts.reduce((t, x) => t + x.bonus, 0);
    return { sum, bonus, total: sum + bonus, holders: p.students.filter((s) => counted(s).length > 0) };
  }
  let sum = 0;
  let bonus = 0;
  const holders: Student[] = [];
  for (const s of p.students) {
    if (!counted(s).includes(a)) continue;
    holders.push(s);
    const n = s.era === doubleEra ? iconsOf(s, a) * 2 : iconsOf(s, a);
    sum += n;
    if (hasRoleBonus(p, s, a)) bonus += n;
  }
  return { sum, bonus, total: sum + bonus, holders };
}


export function countAttr(p: Player, a: Attr): number {
  return p.students.filter((s) => counted(s).includes(a)).length;
}

/** 定期テストの点：📚の合計数−👊を持つ生徒1人につきpenalty */
export function testScore(p: Player, penalty: number): number {
  return attrScore(p, 'study').total - countAttr(p, 'fight') * penalty;
}

/** 卒業式の点：クラス全員のアイコンの総数 */
/** カードに印刷されたアイコンの数（グッズの＋1は数えない）。クラス替えはこの数が同じ子どうしでしかできない */
export function baseIcons(s: Student): number {
  return s.attrs.length - (s.goods ? 1 : 0);
}

export function totalPower(p: Player): number {
  return p.students.reduce((a, s) => a + counted(s).length, 0);
}

/** 順位（同点は同じ順位） */
export function ranks(values: number[]): number[] {
  return values.map((v) => values.filter((o) => o > v).length);
}

/** 1枚ごとの得点の内訳（どのカードから何点入ったかを見せる演出用） */
export interface Contribution {
  student: Student;
  /** カードに描かれたそのアイコンの数 */
  icons: number;
  /** 時代イベントでその時代出身（×2） */
  era: boolean;
  /** 係ボーナス（×2） */
  role: boolean;
  pts: number;
}

/** アイコンaの点を1枚ずつに分けたもの（合計は attrScore と同じ）。doubleEra の生徒は×2。'all' は全種類の合計 */
export function contributions(p: Player, a: Attr | 'all', doubleEra?: EraId): Contribution[] {
  if (a === 'all') {
    return p.students
      .filter((s) => counted(s).length > 0)
      .map((s) => {
        const parts = ATTRS.filter((x) => counted(s).includes(x)).map((x) => contributions({ ...p, students: [s] }, x, doubleEra)[0]);
        return { student: s, icons: counted(s).length, era: s.era === doubleEra, role: parts.some((x) => x.role), pts: parts.reduce((t, x) => t + x.pts, 0) };
      });
  }
  return p.students
    .filter((s) => counted(s).includes(a))
    .map((s) => {
      const era = s.era === doubleEra;
      const role = hasRoleBonus(p, s, a);
      const icons = iconsOf(s, a);
      return { student: s, icons, era, role, pts: icons * (era ? 2 : 1) * (role ? 2 : 1) };
    });
}
