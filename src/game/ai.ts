import { MAX_CLASS, MIN_CLASS, attrScore, countAttr, hasRoleBonus, iconsOf } from './calc';
import { ALL_EVENT_CARDS, EVENT_MAP, SWING_CARDS, TEST_YANKEE_PENALTY, type GoodsCard } from './data/events';
import { MAX_PER_ROLE, ROLES, ROLE_ORDER } from './data/roles';
import { equippable, exchangeTargets, kachikomiTargets, pushTargets, slotsNow, tradeable } from './engine';
import { ATTRS, ATTR_ICON, type Action, type Attr, type GameState, type Player, type RoleId, type RoleSeat, type Student } from './types';

/** 山札でその属性が使われる枚数（通常カード＋時代イベントは半分の重み） */
const ATTR_WEIGHT = Object.fromEntries(
  ATTRS.map((a) => [
    a,
    ALL_EVENT_CARDS.reduce((x, c) => x + (c.kind === 'normal' && c.attr === a ? c.count : c.kind === 'contest' && c.attr === a ? c.count / 11 : 0), 0),
  ]),
) as Record<Attr, number>;
// 👊はカチコミ（3枚）と襲来の分
ATTR_WEIGHT.fight += 3;

/** クラスの強さの目安（CPUの判断用） */
export function classScore(p: Player): number {
  let v = 0;
  for (const a of ATTRS) v += attrScore(p, a).total * ATTR_WEIGHT[a];
  for (const c of SWING_CARDS) v += attrScore(p, c.plus).total - (c.minus === 'heads' ? p.students.length : attrScore(p, c.minus).total);
  v += (attrScore(p, 'study').total - countAttr(p, 'fight') * TEST_YANKEE_PENALTY) * 2;
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

/** その係に一番向いている子の値打ち（係の解放先を選ぶ目安） */
function roleValue(p: Player, role: RoleId): number {
  const a = ROLES[role].attr;
  return Math.max(0, ...p.students.map((s) => iconsOf(s, a) * ATTR_WEIGHT[a]));
}

/** 係のおまかせ解放：まだ解放していない係のうち、向いている子がいるものから選ぶ */
export function autoUnlock(p: Player, slots: number): RoleId[] {
  const n = Math.max(0, slots - p.unlocked.length);
  return ROLE_ORDER.filter((r) => !p.unlocked.includes(r))
    .sort((x, y) => roleValue(p, y) - roleValue(p, x))
    .slice(0, n);
}

/** 係のおまかせ編成：アイコンをたくさん持つ子から順に、解放した係に就ける */
export function autoRoles(p: Player, kinds: RoleId[]): RoleSeat[] {
  const pairs = p.students
    .flatMap((s) => kinds.map((role) => ({ uid: s.uid, role, v: iconsOf(s, ROLES[role].attr) * ATTR_WEIGHT[ROLES[role].attr] })))
    .filter((x) => x.v > 0)
    .sort((x, y) => y.v - x.v);
  const out: RoleSeat[] = [];
  for (const x of pairs) {
    if (out.some((r) => r.uid === x.uid)) continue;
    if (out.filter((r) => r.role === x.role).length >= MAX_PER_ROLE) continue;
    out.push({ role: x.role, uid: x.uid });
  }
  return out;
}

function withStudents(p: Player, students: Student[]): Player {
  return { ...p, students, roles: p.roles.filter((r) => students.some((s) => s.uid === r.uid)) };
}

/** その生徒がいることでクラスの強さがどれだけ上がっているか */
function worth(p: Player, uid: string): number {
  return classScore(p) - classScore(withStudents(p, p.students.filter((x) => x.uid !== uid)));
}

/** 一番点の高い相手 */
function leader(s: GameState, candidates: number[]): number {
  return [...candidates].sort((x, y) => s.players[y].points - s.players[x].points)[0];
}

export function cpuAction(s: GameState): Action | null {
  const ph = s.phase;
  switch (ph.kind) {
    case 'memberDraw':
      return { type: 'drawMember' };
    case 'roles': {
      const p = s.players[ph.player];
      const unlock = autoUnlock(p, slotsNow(s));
      return { type: 'setRoles', unlock, roles: autoRoles(p, [...p.unlocked, ...unlock]) };
    }
    case 'draw':
      return { type: 'drawEvent' };
    case 'push': {
      const p = s.players[ph.player];
      const targets = pushTargets(s, ph.player);
      if (!targets.length || p.students.length <= MIN_CLASS) return { type: 'push', uid: null };
      let best: { uid: string; loss: number } | null = null;
      for (const st of p.students) {
        const loss = worth(p, st.uid);
        if (!best || loss < best.loss) best = { uid: st.uid, loss };
      }
      // 席が埋まってきた時か、ほぼ損しない時だけ押しつける。相手はトップのクラス
      if (!best || (best.loss > 2 && p.students.length < MAX_CLASS - 1)) return { type: 'push', uid: null };
      return { type: 'push', uid: best.uid, target: leader(s, targets) };
    }
    case 'kachikomi':
      return { type: 'kachikomi', target: leader(s, kachikomiTargets(s, ph.player)) };
    case 'exchange': {
      const p = s.players[ph.player];
      const mine = tradeable(p).sort((x, y) => worth(p, x.uid) - worth(p, y.uid))[0];
      let best: { target: number; uid: string; gain: number } | null = null;
      for (const t of exchangeTargets(s, ph.player)) {
        for (const st of tradeable(s.players[t])) {
          const after = withStudents(p, [...p.students.filter((x) => x.uid !== mine.uid), st]);
          const gain = classScore(after) - classScore(p);
          if (!best || gain > best.gain) best = { target: t, uid: st.uid, gain };
        }
      }
      if (!best || best.gain <= 0) return { type: 'exchange', uid: null };
      return { type: 'exchange', uid: mine.uid, target: best.target, theirUid: best.uid };
    }
    case 'equip': {
      const p = s.players[ph.player];
      const c = EVENT_MAP[ph.card] as GoodsCard;
      // 係ボーナスが乗る子＞そのアイコンをたくさん持つ子
      const score = (st: Student) => (hasRoleBonus(p, st, c.attr) ? 10 : 0) + iconsOf(st, c.attr);
      const st = equippable(p).sort((x, y) => score(y) - score(x))[0];
      return { type: 'equip', uid: st?.uid ?? null };
    }
    case 'result':
      return { type: 'continue' };
    case 'gameOver':
      return null;
  }
}
