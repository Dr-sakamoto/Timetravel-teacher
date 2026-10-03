import { ROLES, ROLE_ORDER } from './data/roles';
import type { Attr, EraId, Player, RoleId, Student } from './types';

/** 教室の席の数（クラスの定員） */
export const MAX_CLASS = 12;
/** 転校で押しつけてもこれより少なくはならない */
export const MIN_CLASS = 4;
export const STARTING_MEMBERS = 6;

/** 使える係の数：6人で3つ、8人で4つ、10人で5つ、12人で6つ */
export function roleSlots(p: Player): number {
  return Math.max(3, Math.min(ROLE_ORDER.length, 3 + Math.floor((p.students.length - 6) / 2)));
}

/** i番目の係が解放される人数 */
export function slotUnlockAt(i: number): number {
  return i < 3 ? 0 : 6 + (i - 2) * 2;
}

export function roleOf(p: Player, uid: string): RoleId | null {
  const idx = p.roles.indexOf(uid);
  return idx >= 0 && idx < roleSlots(p) ? ROLE_ORDER[idx] : null;
}

/** 係ボーナスが付いているか（係のアイコンを本人が持っている） */
export function hasRoleBonus(p: Player, s: Student, a: Attr): boolean {
  const r = roleOf(p, s.uid);
  return r !== null && ROLES[r].attr === a && s.attrs.includes(a);
}

export interface AttrScore {
  /** アイコンを持つ生徒の数値の合計 */
  sum: number;
  /** 係ボーナス（+1ずつ） */
  bonus: number;
  total: number;
  holders: Student[];
}

/** そのアイコンでの得点：持っている生徒の数値の合計＋係ボーナス。doubleEra の生徒は数値2倍 */
export function attrScore(p: Player, a: Attr, doubleEra?: EraId): AttrScore {
  let sum = 0;
  let bonus = 0;
  const holders: Student[] = [];
  for (const s of p.students) {
    if (!s.attrs.includes(a)) continue;
    holders.push(s);
    sum += s.era === doubleEra ? s.power * 2 : s.power;
    if (hasRoleBonus(p, s, a)) bonus += 1;
  }
  return { sum, bonus, total: sum + bonus, holders };
}

/** 通常カードの点：そのアイコンを持つ子の中で一番高い数値＋（係のアイコンを持つ子が係に就いていれば）+1 */
export function bestScore(p: Player, a: Attr): AttrScore {
  const holders = p.students.filter((s) => s.attrs.includes(a));
  const best = holders.reduce((m, s) => Math.max(m, s.power), 0);
  const bonus = holders.some((s) => hasRoleBonus(p, s, a)) ? 1 : 0;
  const top = holders.filter((s) => s.power === best).slice(0, 1);
  return { sum: best, bonus, total: best + bonus, holders: top };
}

export function countAttr(p: Player, a: Attr): number {
  return p.students.filter((s) => s.attrs.includes(a)).length;
}

/** 定期テストの点：📚の合計−👊を持つ生徒1人につきpenalty */
export function testScore(p: Player, penalty: number): number {
  return attrScore(p, 'study').total - countAttr(p, 'fight') * penalty;
}

/** 卒業式の点：全員の数値の合計 */
export function totalPower(p: Player): number {
  return p.students.reduce((a, s) => a + s.power, 0);
}

/** 順位（同点は同じ順位） */
export function ranks(values: number[]): number[] {
  return values.map((v) => values.filter((o) => o > v).length);
}
