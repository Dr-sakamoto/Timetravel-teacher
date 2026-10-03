import { MAX_CLASS, POWER_CAP, classPower, roleOf, studentTotal } from './calc';
import { CARD_MAP } from './data/cards';
import { CLASS_MAP } from './data/classes';
import { ERAS } from './data/eras';
import { EVENT_MAP, type SchoolEventDef } from './data/events';
import { canLearn, poachable } from './engine';
import { ATTRS, ATTR_ICON, type Action, type Attr, type GameState, type Player, type Student } from './types';

/** クラスの強さを測る代表イベント（scaleで正規化、wは重要度） */
const REPRESENTATIVE: { id: string; scale: number; w: number }[] = [
  { id: 'test1', scale: 3, w: 2 },
  { id: 'sportsday', scale: 30, w: 1.2 },
  { id: 'festival', scale: 30, w: 1.2 },
  { id: 'yankee', scale: 14, w: 0.8 },
  { id: 'election', scale: 8, w: 0.6 },
  { id: 'quiz', scale: 20, w: 0.5 },
  { id: 'marathon', scale: 2, w: 0.4 },
  { id: 'chorus', scale: 2, w: 0.4 },
  { id: 'eating', scale: 8, w: 0.3 },
  { id: 'graduation', scale: 120, w: 1 },
];

export function classScore(p: Player): number {
  let total = 0;
  for (const r of REPRESENTATIVE) total += (classPower(p, EVENT_MAP[r.id] as SchoolEventDef).power / r.scale) * r.w;
  return total;
}

export interface CategorySummary {
  label: string;
  icon: string;
  value: number;
  hint: string;
}

/** UI用：クラスの得意不得意の目安 */
export function classSummary(p: Player): CategorySummary[] {
  const f = (id: string) => classPower(p, EVENT_MAP[id] as SchoolEventDef).power;
  return [
    { label: '勉強', icon: ATTR_ICON.study, value: f('test1'), hint: '定期テスト（📚の全員平均）' },
    { label: '運動', icon: ATTR_ICON.sports, value: f('sportsday'), hint: '体育祭（🏃上位6人）' },
    { label: '芸術', icon: ATTR_ICON.art, value: f('festival'), hint: '文化祭（🎨上位6人）' },
    { label: '人望', icon: ATTR_ICON.charm, value: f('election'), hint: '生徒会選挙（👑一番の1人）' },
    { label: '喧嘩', icon: ATTR_ICON.fight, value: f('yankee'), hint: 'ヤンキー襲来（👊上位3人）' },
  ];
}

/** 係のおまかせ編成（貪欲法を2周） */
export function autoRoles(p: Player): (string | null)[] {
  if (!p.classCardId) return [];
  const n = CLASS_MAP[p.classCardId].roles.length;
  const work: Player = { ...p, roles: Array(n).fill(null) };
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      let best: string | null = work.roles[i];
      let bestScore = -Infinity;
      for (const st of p.students) {
        if (work.roles.some((r, j) => j !== i && r === st.uid)) continue;
        const roles = [...work.roles];
        roles[i] = st.uid;
        const sc = classScore({ ...work, roles });
        if (sc > bestScore) {
          bestScore = sc;
          best = st.uid;
        }
      }
      work.roles[i] = best;
    }
  }
  return work.roles;
}

function withStudents(p: Player, students: Student[]): Player {
  return { ...p, students, roles: p.roles.map((r) => (r && students.some((s) => s.uid === r) ? r : null)) };
}

/** 転校生を迎えた場合のスコア変化と、定員オーバー時に外す生徒 */
export function evaluateTransfer(p: Player, cand: Student): { gain: number; release?: string } {
  const base = classScore(p);
  if (p.students.length < MAX_CLASS) {
    return { gain: classScore(withStudents(p, [...p.students, cand])) - base };
  }
  let best: { gain: number; release?: string } = { gain: -Infinity };
  for (const out of p.students) {
    if (roleOf(p, out.uid)) continue;
    const g = classScore(withStudents(p, [...p.students.filter((s) => s.uid !== out.uid), cand])) - base;
    if (g > best.gain) best = { gain: g, release: out.uid };
  }
  return best;
}

function cardValue(id: string): number {
  const c = CARD_MAP[id];
  return c.power * c.attrs.length + (c.ability ? 3 : 0);
}

function eraValue(s: GameState, idx: number): number {
  const era = ERAS[idx].id;
  if (era === 'present') return 9;
  const vals = s.pools[era].map(cardValue).sort((a, b) => b - a);
  if (vals.length === 0) return 0;
  const top = vals.slice(0, 3);
  return top.reduce((a, b) => a + b, 0) / top.length;
}

function bestEra(s: GameState, from: number, range: number): number {
  let best = from;
  let bestV = eraValue(s, from) + 0.5;
  for (let i = 0; i < ERAS.length; i++) {
    if (Math.abs(i - from) > range) continue;
    const v = eraValue(s, i);
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  }
  return best;
}

export function cpuAction(s: GameState): Action | null {
  const ph = s.phase;
  switch (ph.kind) {
    case 'classDraw':
      return ph.drawn ? { type: 'continue' } : { type: 'drawClass' };
    case 'roles':
      return { type: 'setRoles', roles: autoRoles(s.players[ph.player]) };
    case 'travel': {
      if (ph.dice === null) return { type: 'rollDice' };
      const p = s.players[ph.player];
      return { type: 'travel', era: bestEra(s, p.era, ph.dice) };
    }
    case 'draw':
      return { type: 'drawEvent' };
    case 'transfer': {
      const p = s.players[ph.player];
      let bestIdx: number | null = null;
      let best: { gain: number; release?: string } = { gain: 0 };
      ph.options.forEach((o, i) => {
        const e = evaluateTransfer(p, o);
        if (e.gain > best.gain) {
          best = e;
          bestIdx = i;
        }
      });
      // 少しでも足しになるなら迎える（歴史上の人物は基本的に歓迎）
      if (bestIdx === null) {
        const strongest = ph.options.map((o, i) => ({ i, t: studentTotal(o) })).sort((a, b) => b.t - a.t)[0];
        if (strongest && strongest.t >= 14 && p.students.length < MAX_CLASS) bestIdx = strongest.i;
      }
      return { type: 'pickTransfer', index: bestIdx, releaseUid: best.release };
    }
    case 'train': {
      const p = s.players[ph.player];
      const base = classScore(p);
      let best: { action: Action; gain: number } = { action: { type: 'train', uid: p.students[0].uid, mode: 'power' }, gain: -Infinity };
      const tryStudent = (uid: string, mod: (x: Student) => Student, action: Action) => {
        const students = p.students.map((x) => (x.uid === uid ? mod(x) : x));
        const g = classScore({ ...p, students }) - base;
        if (g > best.gain) best = { action, gain: g };
      };
      for (const st of p.students) {
        if (st.power < POWER_CAP) tryStudent(st.uid, (x) => ({ ...x, power: x.power + 1 }), { type: 'train', uid: st.uid, mode: 'power' });
        for (const a of ATTRS as Attr[]) {
          if (!canLearn(st, a)) continue;
          tryStudent(st.uid, (x) => ({ ...x, attrs: [...x.attrs, a] }), { type: 'train', uid: st.uid, mode: 'attr', attr: a });
        }
      }
      return best.action;
    }
    case 'poach': {
      const p = s.players[ph.player];
      let best: { uid: string | null; gain: number } = { uid: null, gain: 0 };
      for (const { student } of poachable(s, ph.player)) {
        const g = evaluateTransfer(p, student).gain;
        if (g > best.gain) best = { uid: student.uid, gain: g };
      }
      return { type: 'poach', uid: best.uid };
    }
    case 'warp':
    case 'summerTravel': {
      const p = s.players[ph.player];
      return { type: 'travel', era: bestEra(s, p.era, ERAS.length) };
    }
    case 'result':
      return { type: 'continue' };
    case 'gameOver':
      return null;
  }
}
