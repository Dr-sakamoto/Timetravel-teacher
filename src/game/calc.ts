import { MAX_PER_ROLE, MAX_ROLE_SEATS, ROLES } from './data/roles';
import type { Attr, EraId, Player, RoleId, RoleSeat, Student } from './types';

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

/** i番目（0始まり）の係の席が解放される学期の名前（例：「1年2学期」）。最初の1席は最初から */
export function slotUnlockLabel(i: number): string {
  const no = i + 1;
  return `${Math.ceil(no / 3)}年${((no - 1) % 3) + 1}学期`;
}

/** 係は1人につき1つまで（係に就いていない生徒はnull） */
export function roleOf(p: Player, uid: string): RoleId | null {
  return p.roles.find((r) => r.uid === uid)?.role ?? null;
}

/** 係ボーナスが付いているか（その生徒が、アイコンaの係に就いていて、aを持っている） */
export function hasRoleBonus(p: Player, s: Student, a: Attr): boolean {
  const r = roleOf(p, s.uid);
  return r !== null && ROLES[r].attr === a && s.attrs.includes(a);
}

/** その生徒が持つアイコンaの数 */
export function iconsOf(s: Student, a: Attr): number {
  return s.attrs.filter((x) => x === a).length;
}

export interface AttrScore {
  /** アイコンの合計数 */
  sum: number;
  /** 係ボーナス（係に就いた子のアイコン数ぶん） */
  bonus: number;
  total: number;
  holders: Student[];
}

/** クラス全員のアイコンaの合計数＋係ボーナス。doubleEra の生徒のアイコンは2倍 */
export function attrScore(p: Player, a: Attr, doubleEra?: EraId): AttrScore {
  let sum = 0;
  let bonus = 0;
  const holders: Student[] = [];
  for (const s of p.students) {
    if (!s.attrs.includes(a)) continue;
    holders.push(s);
    const n = s.era === doubleEra ? iconsOf(s, a) * 2 : iconsOf(s, a);
    sum += n;
    if (hasRoleBonus(p, s, a)) bonus += n;
  }
  return { sum, bonus, total: sum + bonus, holders };
}


export function countAttr(p: Player, a: Attr): number {
  return p.students.filter((s) => s.attrs.includes(a)).length;
}

/** 定期テストの点：📚の合計数−👊を持つ生徒1人につきpenalty */
export function testScore(p: Player, penalty: number): number {
  return attrScore(p, 'study').total - countAttr(p, 'fight') * penalty;
}

/** 卒業式の点：クラス全員のアイコンの総数 */
export function totalPower(p: Player): number {
  return p.students.reduce((a, s) => a + s.attrs.length, 0);
}

/** 順位（同点は同じ順位） */
export function ranks(values: number[]): number[] {
  return values.map((v) => values.filter((o) => o > v).length);
}
