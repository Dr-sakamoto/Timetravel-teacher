import { ROLES, ROLE_ORDER } from './data/roles';
import type { Attr, EraId, Player, RoleId, Student } from './types';

/** 教室の席の数（クラスの定員） */
export const MAX_CLASS = 12;
/** 転校で押しつけてもこれより少なくはならない */
export const MIN_CLASS = 4;
export const STARTING_MEMBERS = 6;

/** ゲーム開始からの通算学期（1年1学期＝1、1年2学期＝2、…）。夏休みは直前の1学期として数える */
export function termNo(year: number, term: number): number {
  return (year - 1) * 3 + Math.max(term, 1);
}

/** 使える係の数：最初の学期は3つで、学期が進むごとに1つずつ増える（最大6つ） */
export function roleSlots(no: number): number {
  return Math.max(3, Math.min(ROLE_ORDER.length, 2 + no));
}

/** i番目の係が解放される学期の名前（例：「1年2学期」） */
export function slotUnlockLabel(i: number): string {
  const no = i - 1;
  return `${Math.ceil(no / 3)}年${((no - 1) % 3) + 1}学期`;
}

/** 係は1人につき1つまで（係に就いていない生徒はnull）。席が解放前の係は決定時にnullへ落としてある */
export function roleOf(p: Player, uid: string): RoleId | null {
  const idx = p.roles.indexOf(uid);
  return idx >= 0 ? ROLE_ORDER[idx] : null;
}

/** 係ボーナスが付いているか（その生徒が、アイコンaの係に就いていて、aを持っている） */
export function hasRoleBonus(p: Player, s: Student, a: Attr): boolean {
  const r = roleOf(p, s.uid);
  return r !== null && ROLES[r].attr === a && s.attrs.includes(a);
}

/** 係に就いた子は、その係のアイコンが2倍に数えられる */
function weighted(p: Player, s: Student, a: Attr): number {
  return hasRoleBonus(p, s, a) ? iconsOf(s, a) * 2 : iconsOf(s, a);
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

/** イベントカードの点：クラス全員のアイコンaの合計数＋係ボーナス。doubleEra の生徒のアイコンは2倍 */
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

/** 通常カードの点：そのアイコンを一番多く持つ子の個数（係に就いた子は2倍で数える） */
export function bestScore(p: Player, a: Attr): AttrScore {
  const holders = p.students.filter((s) => s.attrs.includes(a));
  const total = holders.reduce((m, s) => Math.max(m, weighted(p, s, a)), 0);
  const top = holders.filter((s) => weighted(p, s, a) === total).slice(0, 1);
  const sum = top.length ? iconsOf(top[0], a) : 0;
  return { sum, bonus: total - sum, total, holders: top };
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
