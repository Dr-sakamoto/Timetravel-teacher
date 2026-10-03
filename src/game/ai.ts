import { MAX_CLASS, MIN_CLASS, classPower, iconPoints, roleOf, roleSlots, studentTotal } from './calc';
import { CARD_MAP } from './data/cards';
import { CLASS_MAP } from './data/classes';
import { ERAS } from './data/eras';
import { EVENT_MAP, ICON_EVENTS, type SchoolEventDef } from './data/events';
import { pushTargets } from './engine';
import { ATTR_ICON, type Action, type GameState, type Player, type Student } from './types';

/** クラスの強さを測る代表イベント（scaleで正規化、wは重要度） */
const REPRESENTATIVE: { id: string; scale: number; w: number }[] = [
  { id: 'test1', scale: 3, w: 1.5 },
  { id: 'sportsday', scale: 20, w: 1 },
  { id: 'festival', scale: 20, w: 1 },
  { id: 'yankee', scale: 10, w: 0.8 },
  { id: 'election', scale: 7, w: 0.5 },
  { id: 'chorus', scale: 2, w: 0.3 },
  { id: 'graduation', scale: 100, w: 1 },
];
const ICON_TOTAL = ICON_EVENTS.reduce((a, e) => a + e.count, 0);

export function classScore(p: Player): number {
  let total = 0;
  for (const r of REPRESENTATIVE) total += (classPower(p, EVENT_MAP[r.id] as SchoolEventDef).power / r.scale) * r.w;
  // 通常イベント（アイコン）の期待点：持っている生徒が多いほど稼げる
  let icon = 0;
  for (const e of ICON_EVENTS) icon += (iconPoints(p, e.attr).points * e.count) / ICON_TOTAL;
  return total + (icon / 3) * 2;
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
  const k = roleSlots(p);
  const work: Player = { ...p, roles: Array(n).fill(null) };
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < k; i++) {
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

function bestEra(s: GameState, candidates: number[]): number {
  let best = candidates[0];
  for (const i of candidates) if (eraValue(s, i) > eraValue(s, best)) best = i;
  return best;
}

export function cpuAction(s: GameState): Action | null {
  const ph = s.phase;
  switch (ph.kind) {
    case 'classDraw':
      return ph.drawn ? { type: 'continue' } : { type: 'drawClass' };
    case 'memberDraw':
      return { type: 'drawMember' };
    case 'roles':
      return { type: 'setRoles', roles: autoRoles(s.players[ph.player]) };
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
    case 'push': {
      const p = s.players[ph.player];
      const targets = pushTargets(s, ph.player);
      if (!targets.length || p.students.length <= MIN_CLASS) return { type: 'push', uid: null };
      const base = classScore(p);
      let best: { uid: string; loss: number } | null = null;
      for (const st of p.students) {
        const loss = base - classScore(withStudents(p, p.students.filter((x) => x.uid !== st.uid)));
        if (!best || loss < best.loss) best = { uid: st.uid, loss };
      }
      // 席が埋まってきた時か、ほぼ損しない時だけ押しつける。相手はトップのクラス
      if (!best || (best.loss > 0.05 && p.students.length < MAX_CLASS - 2)) return { type: 'push', uid: null };
      const target = [...targets].sort((x, y) => s.players[y].points - s.players[x].points)[0];
      return { type: 'push', uid: best.uid, target };
    }
    case 'summerTravel':
      return { type: 'travel', era: bestEra(s, s.yearEras) };
    case 'result':
      return { type: 'continue' };
    case 'gameOver':
      return null;
  }
}
