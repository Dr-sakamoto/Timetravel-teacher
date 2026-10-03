import { CLASS_MAP } from './data/classes';
import type { SchoolEventDef } from './data/events';
import { ANIMAL_MULT, ROLES } from './data/roles';
import { STAT_KEYS, type Player, type RoleId, type Stats, type Student } from './types';

export const MAX_CLASS = 30;

export function roleOf(p: Player, uid: string): RoleId | null {
  if (!p.classCardId) return null;
  const idx = p.roles.indexOf(uid);
  return idx >= 0 ? CLASS_MAP[p.classCardId].roles[idx] : null;
}

/** クラス全体のオーラ合計（本人の分は effStats で差し引く） */
export function auraTotals(p: Player): Stats {
  const t: Stats = { pe: 0, study: 0, fight: 0, art: 0, charm: 0 };
  for (const s of p.students) if (s.ability?.kind === 'aura') t[s.ability.stat] += s.ability.amount;
  return t;
}

export function isAnimal(s: Student): boolean {
  return s.tags.includes('恐竜') || s.tags.includes('動物');
}

/** オーラと係の補正を反映した実効能力値 */
export function effStats(p: Player, s: Student, auras: Stats = auraTotals(p)): Stats {
  const out = { ...s.base };
  for (const k of STAT_KEYS) {
    const own = s.ability?.kind === 'aura' && s.ability.stat === k ? s.ability.amount : 0;
    out[k] += auras[k] - own;
  }
  const role = roleOf(p, s.uid);
  if (role) {
    const def = ROLES[role];
    if (def.animal && isAnimal(s)) {
      for (const k of STAT_KEYS) out[k] *= ANIMAL_MULT;
    } else {
      for (const k of STAT_KEYS) {
        let m = def.mult[k];
        if (m === undefined) continue;
        if (s.ability?.kind === 'roleBonus' && s.ability.role === role) m = Math.max(m, s.ability.mult);
        out[k] *= m;
      }
    }
  }
  return out;
}

export function eventValue(s: Student, eff: Stats, ev: SchoolEventDef): number {
  let v = 0;
  for (const k of STAT_KEYS) v += (ev.weights[k] ?? 0) * eff[k];
  if (ev.tagBonus) for (const t of s.tags) v += ev.tagBonus[t] ?? 0;
  if (s.ability?.kind === 'boost' && s.ability.category === ev.category) v += s.ability.amount;
  return v;
}

export interface PowerResult {
  power: number;
  contributors: Student[];
}

export function classPower(p: Player, ev: SchoolEventDef): PowerResult {
  if (p.students.length === 0) return { power: 0, contributors: [] };
  const auras = auraTotals(p);
  const vals = p.students
    .map((s) => ({ s, v: eventValue(s, effStats(p, s, auras), ev) }))
    .sort((a, b) => b.v - a.v);
  let power: number;
  let contributors: Student[];
  if (ev.agg.type === 'top') {
    const top = vals.slice(0, ev.agg.n);
    power = top.reduce((a, x) => a + x.v, 0);
    contributors = top.map((x) => x.s);
  } else if (ev.agg.type === 'avg') {
    power = vals.reduce((a, x) => a + x.v, 0) / vals.length;
    contributors = vals.slice(0, 3).map((x) => x.s);
  } else {
    power = vals[0].v;
    contributors = [vals[0].s];
  }
  return { power: Math.round(power * 10) / 10, contributors };
}

/** 失点軽減率（保健委員・ガード能力の合計、上限60%） */
export function classGuard(p: Player): number {
  let g = 0;
  for (const s of p.students) if (s.ability?.kind === 'guard') g += s.ability.ratio;
  if (p.classCardId) {
    CLASS_MAP[p.classCardId].roles.forEach((r, i) => {
      if (p.roles[i] && ROLES[r].guard) g += ROLES[r].guard!;
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

export function studentTotal(s: Student): number {
  return STAT_KEYS.reduce((a, k) => a + s.base[k], 0);
}
