import { CLASS_MAP } from './data/classes';
import type { SchoolEventDef } from './data/events';
import { ANIMAL_MULT, ROLES } from './data/roles';
import { ATTRS, type Attr, type Player, type RoleId, type Student } from './types';

/** 教室の席の数（クラスの定員） */
export const MAX_CLASS = 12;
/** 転校で押しつけてもこれより少なくはならない */
export const MIN_CLASS = 4;
export const POWER_CAP = 12;

/** 使える係の数：6人で3つ、8人で4つ、10人で5つ、12人で6つ */
export function roleSlots(p: Player): number {
  const max = p.classCardId ? CLASS_MAP[p.classCardId].roles.length : 0;
  return Math.max(3, Math.min(max, 3 + Math.floor((p.students.length - 6) / 2)));
}

/** 次の係が解放される人数（全部解放済みなら null） */
export function nextSlotAt(p: Player): number | null {
  const max = p.classCardId ? CLASS_MAP[p.classCardId].roles.length : 0;
  const k = roleSlots(p);
  return k >= max ? null : 6 + (k - 2) * 2;
}

export function roleOf(p: Player, uid: string): RoleId | null {
  if (!p.classCardId) return null;
  const idx = p.roles.indexOf(uid);
  return idx >= 0 && idx < roleSlots(p) ? CLASS_MAP[p.classCardId].roles[idx] : null;
}

export type AttrValues = Partial<Record<Attr, number>>;

/** クラス全体のオーラ合計（本人の分は attrValues で差し引く） */
export function auraTotals(p: Player): AttrValues {
  const t: AttrValues = {};
  for (const s of p.students) if (s.ability?.kind === 'aura') t[s.ability.attr] = (t[s.ability.attr] ?? 0) + s.ability.amount;
  return t;
}

export function isAnimal(s: Student): boolean {
  return s.tags.includes('恐竜') || s.tags.includes('動物');
}

/** 生徒が持つ各属性の実効値（数値＋オーラ、係の倍率込み）。持っていない属性は含まれない */
export function attrValues(p: Player, s: Student, auras: AttrValues = auraTotals(p)): AttrValues {
  const role = roleOf(p, s.uid);
  const def = role ? ROLES[role] : null;
  const out: AttrValues = {};
  for (const a of s.attrs) {
    const own = s.ability?.kind === 'aura' && s.ability.attr === a ? s.ability.amount : 0;
    let v = s.power + (auras[a] ?? 0) - own;
    if (def) {
      if (def.animal && isAnimal(s)) v *= ANIMAL_MULT;
      else {
        let m = def.mult[a];
        if (m !== undefined) {
          if (s.ability?.kind === 'roleBonus' && s.ability.role === role) m = Math.max(m, s.ability.mult);
          v *= m;
        }
      }
    }
    out[a] = Math.round(v * 10) / 10;
  }
  return out;
}

/** イベントでの生徒の値。属性を持たなければ null（参加できない） */
export function eventValue(s: Student, vals: AttrValues, ev: SchoolEventDef): number | null {
  let v: number;
  if (ev.attr === 'all') {
    v = ATTRS.reduce((a, k) => a + (vals[k] ?? 0), 0);
  } else {
    const base = vals[ev.attr];
    if (base === undefined) return null;
    v = base;
    if (s.ability?.kind === 'boost' && s.ability.attr === ev.attr) v += s.ability.amount;
  }
  for (const e of ev.effects) {
    if (e.kind === 'tag' && s.tags.includes(e.tag)) v += e.amount;
    if (e.kind === 'combo' && s.attrs.includes(e.attr)) v += e.amount;
  }
  return v;
}

export interface PowerResult {
  power: number;
  contributors: Student[];
}

export function classPower(p: Player, ev: SchoolEventDef): PowerResult {
  if (p.students.length === 0) return { power: 0, contributors: [] };
  const auras = auraTotals(p);
  const lacking = ev.effects.find((e) => e.kind === 'lacking');
  const vals = p.students
    .map((s) => ({ s, v: eventValue(s, attrValues(p, s, auras), ev) }))
    .filter((x): x is { s: Student; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);
  let power = 0;
  let contributors: Student[] = [];
  if (ev.agg.type === 'top') {
    const top = vals.slice(0, ev.agg.n);
    power = top.reduce((a, x) => a + x.v, 0);
    contributors = top.map((x) => x.s);
  } else if (ev.agg.type === 'avg') {
    const missing = p.students.length - vals.length;
    const extra = lacking?.kind === 'lacking' ? lacking.amount * missing : 0;
    power = (vals.reduce((a, x) => a + x.v, 0) + extra) / p.students.length;
    contributors = vals.slice(0, 3).map((x) => x.s);
  } else if (vals.length) {
    power = vals[0].v;
    contributors = [vals[0].s];
  }
  for (const e of ev.effects) {
    if (e.kind === 'perHolder') power += e.amount * p.students.filter((s) => s.attrs.includes(e.attr)).length;
  }
  return { power: Math.max(0, Math.round(power * 10) / 10), contributors };
}

/** 失点軽減率（保健委員・ガード能力の合計、上限60%） */
export function classGuard(p: Player): number {
  let g = 0;
  for (const s of p.students) if (s.ability?.kind === 'guard') g += s.ability.ratio;
  if (p.classCardId) {
    CLASS_MAP[p.classCardId].roles.forEach((r, i) => {
      if (i < roleSlots(p) && p.roles[i] && ROLES[r].guard) g += ROLES[r].guard!;
    });
  }
  return Math.min(0.6, g);
}

/** ポイントを加算。マイナスは軽減を適用して実際の増減を返す */
export function applyDelta(p: Player, delta: number): number {
  let d = delta;
  if (d < 0) d = -Math.round(-d * (1 - classGuard(p)));
  p.points += d;
  return d;
}

/** 順位点テーブル（人数別） */
export const RANK_POINTS: Record<number, number[]> = {
  2: [8, 3],
  3: [10, 5, 1],
  4: [10, 6, 3, 0],
  5: [10, 6, 3, 1, 0],
};

/** 生徒の総合的な強さの目安：数値×属性の数 */
export function studentTotal(s: Student): number {
  return s.power * s.attrs.length;
}

export function countAttr(p: Player, a: Attr): number {
  return p.students.filter((s) => s.attrs.includes(a)).length;
}

/** 通常イベント（アイコン）の得点：持っている生徒1人につき1pt、係で強化されていればさらに+1 */
export function iconPoints(p: Player, a: Attr): { count: number; points: number } {
  let count = 0;
  let points = 0;
  for (const s of p.students) {
    if (!s.attrs.includes(a)) continue;
    count++;
    points += 1;
    const r = roleOf(p, s.uid);
    if (r && ((ROLES[r].animal && isAnimal(s)) || ROLES[r].mult[a] !== undefined)) points += 1;
  }
  return { count, points };
}
