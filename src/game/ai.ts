import { MAX_CLASS, classPower, roleOf, studentTotal } from './calc';
import { CARD_MAP } from './data/cards';
import { CLASS_MAP } from './data/classes';
import { ERAS } from './data/eras';
import { EVENT_MAP, type SchoolEventDef } from './data/events';
import { poachable } from './engine';
import { STAT_KEYS, type Action, type GameState, type Player, type StatKey, type Student } from './types';

/** クラスの強さを測る代表イベント（scaleで正規化、wは重要度） */
const REPRESENTATIVE: { id: string; scale: number; w: number }[] = [
  { id: 'test1', scale: 6, w: 2 },
  { id: 'sportsday', scale: 60, w: 1.2 },
  { id: 'festival', scale: 70, w: 1.2 },
  { id: 'yankee', scale: 35, w: 0.7 },
  { id: 'election', scale: 18, w: 0.6 },
  { id: 'quiz', scale: 40, w: 0.5 },
  { id: 'marathon', scale: 6, w: 0.5 },
  { id: 'chorus', scale: 7, w: 0.5 },
  { id: 'eating', scale: 15, w: 0.3 },
  { id: 'graduation', scale: 450, w: 1 },
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
    { label: '運動', icon: '🏃', value: f('sportsday'), hint: '体育祭（運動上位6人）' },
    { label: '学力', icon: '📚', value: f('test1'), hint: '定期テスト（全員の平均）' },
    { label: '芸術', icon: '🎪', value: f('festival'), hint: '文化祭（芸術上位6人）' },
    { label: '喧嘩', icon: '🏍️', value: f('yankee'), hint: 'ヤンキー襲来（喧嘩上位3人）' },
    { label: '人望', icon: '🗳️', value: f('election'), hint: '生徒会選挙（一番の1人）' },
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
  const sum = STAT_KEYS.reduce((a, k) => a + c.stats[k], 0);
  return sum + (c.ability ? 6 : 0);
}

function eraValue(s: GameState, idx: number): number {
  const era = ERAS[idx].id;
  if (era === 'present') return 30;
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
        if (strongest && strongest.t >= 40 && p.students.length < MAX_CLASS) bestIdx = strongest.i;
      }
      return { type: 'pickTransfer', index: bestIdx, releaseUid: best.release };
    }
    case 'train': {
      const p = s.players[ph.player];
      const base = classScore(p);
      let best = { uid: p.students[0].uid, stat: 'study' as StatKey, gain: -Infinity };
      for (const st of p.students) {
        for (const k of STAT_KEYS) {
          const students = p.students.map((x) => (x.uid === st.uid ? { ...x, base: { ...x.base, [k]: x.base[k] + 2 } } : x));
          const g = classScore({ ...p, students }) - base;
          if (g > best.gain) best = { uid: st.uid, stat: k, gain: g };
        }
      }
      return { type: 'train', uid: best.uid, stat: best.stat };
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
