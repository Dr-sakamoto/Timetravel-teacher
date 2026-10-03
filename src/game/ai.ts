import { MAX_CLASS, MIN_CLASS, attrScore, countAttr, iconsOf } from './calc';
import { ALL_EVENT_CARDS, TEST_YANKEE_PENALTY } from './data/events';
import { ROLES, ROLE_ORDER } from './data/roles';
import { pushTargets, slotsNow } from './engine';
import { ATTRS, ATTR_ICON, type Action, type Attr, type GameState, type Player, type Student } from './types';

/** 山札でその属性が使われる枚数（通常カード／勝負カード） */
const weight = (kind: 'normal' | 'contest') =>
  Object.fromEntries(
    ATTRS.map((a) => [a, ALL_EVENT_CARDS.filter((c) => c.kind === kind && c.attr === a).reduce((x, c) => x + c.count, 0)]),
  ) as Record<Attr, number>;
const NORMAL_WEIGHT = weight('normal');
const CONTEST_WEIGHT = weight('contest');

/** クラスの強さの目安（CPUの判断用） */
export function classScore(p: Player): number {
  let v = 0;
  for (const a of ATTRS) v += attrScore(p, a).total * (NORMAL_WEIGHT[a] + CONTEST_WEIGHT[a] * 0.6);
  // カチコミ（3枚）と定期テスト
  v += Math.min(attrScore(p, 'fight').total, 7) * 3;
  v += (attrScore(p, 'study').total - countAttr(p, 'fight') * TEST_YANKEE_PENALTY) * 4;
  return v;
}

export interface CategorySummary {
  attr: Attr;
  icon: string;
  value: number;
}

/** UI用：アイコンごとの合計（係ボーナス込み） */
export function classSummary(p: Player): CategorySummary[] {
  return ATTRS.map((a) => ({ attr: a, icon: ATTR_ICON[a], value: attrScore(p, a).total }));
}

/** 係のおまかせ編成：係のアイコンを一番多く持つ子を順に */
export function autoRoles(p: Player, k: number): (string | null)[] {
  const used = new Set<string>();
  return ROLE_ORDER.map((r, i) => {
    if (i >= k) return null;
    const cand = p.students
      .filter((s) => !used.has(s.uid) && s.attrs.includes(ROLES[r].attr))
      .sort((x, y) => iconsOf(y, ROLES[r].attr) - iconsOf(x, ROLES[r].attr))[0];
    if (!cand) return null;
    used.add(cand.uid);
    return cand.uid;
  });
}

function withStudents(p: Player, students: Student[]): Player {
  return { ...p, students, roles: p.roles.map((r) => (r && students.some((s) => s.uid === r) ? r : null)) };
}

export function cpuAction(s: GameState): Action | null {
  const ph = s.phase;
  switch (ph.kind) {
    case 'memberDraw':
      return { type: 'drawMember' };
    case 'roles':
      return { type: 'setRoles', roles: autoRoles(s.players[ph.player], slotsNow(s)) };
    case 'draw':
      return { type: 'drawEvent' };
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
      if (!best || (best.loss > 6 && p.students.length < MAX_CLASS - 2)) return { type: 'push', uid: null };
      const target = [...targets].sort((x, y) => s.players[y].points - s.players[x].points)[0];
      return { type: 'push', uid: best.uid, target };
    }
    case 'result':
      return { type: 'continue' };
    case 'gameOver':
      return null;
  }
}
