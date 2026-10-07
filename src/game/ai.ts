import { attrScore, countAttr, hasRoleBonus, iconsOf, totalPower } from './calc';
import { ALL_EVENT_CARDS, CYBORG_ATTRS, EVENT_MAP, GIFT_MAP, SWING_CARDS, TEST_YANKEE_PENALTY, type GoodsCard } from './data/events';
import { MAX_PER_ROLE, ROLES, ROLE_ORDER } from './data/roles';
import { MONTHS, canBuild, canTake, pyramidCard, pyramidReward, cyborgable, kaguyaGift, kaguyaWants, droppable, equippable, exchangePairs, kachikomiTargets, marketCost, oathTargets, previewStudent, slotsNow, voteTargets } from './engine';
import { ATTRS, ATTR_ICON, type Action, type Attr, type GameState, type Player, type RoleId, type RoleSeat, type Student } from './types';

/** 山札でその属性が使われる枚数（通常カード＋時代イベントは半分の重み） */
const ATTR_WEIGHT = Object.fromEntries(
  ATTRS.map((a) => [
    a,
    ALL_EVENT_CARDS.reduce((x, c) => x + (c.kind === 'normal' && c.attr === a ? c.count : c.kind === 'contest' && c.attr === a ? c.count / 11 : 0), 0),
  ]),
) as Record<Attr, number>;
// 👊はカチコミ（場から取る・3枚・×3）と襲来の分
ATTR_WEIGHT.fight += 9;

/** クラスの強さの目安（CPUの判断用） */
export function classScore(p: Player): number {
  let v = 0;
  for (const a of ATTRS) v += attrScore(p, a).total * ATTR_WEIGHT[a];
  for (const c of SWING_CARDS) {
    const plus = attrScore(p, c.plus).total;
    const minus = c.minus ? attrScore(p, c.minus).total : 0;
    v += (plus - minus) * c.count;
  }
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

/** 残りの手番のある月の数 */
function monthsLeft(s: GameState): number {
  return (s.years - s.year) * MONTHS.length + (MONTHS.length - s.monthIdx);
}

/** クラスが強くなった分を点に換算するときの係数（rate：残り1か月あたり、grad：卒業式のアイコン1個あたり） */
export const AI_TUNING = { rate: 0.05, grad: 1 };

/** クラスを before から after に変えると、この先どれだけ点になりそうか */
function gain(s: GameState, before: Player, after: Player): number {
  return (classScore(after) - classScore(before)) * AI_TUNING.rate * monthsLeft(s) + (totalPower(after) - totalPower(before)) * AI_TUNING.grad;
}

/** いなくなっても一番困らない子（満席の転入・転校で手放す） */
function leastWorth(p: Player): Student | undefined {
  return droppable(p).sort((x, y) => worth(p, x.uid) - worth(p, y.uid))[0];
}

function equipped(st: Student, attr: Attr): Student {
  return { ...st, attrs: [...st.attrs, attr], goods: { id: 'x', name: '', icon: '', attr } };
}

function cyborged(st: Student): Student {
  return { ...st, attrs: [...CYBORG_ATTRS], goods: undefined };
}

/** かぐや姫に宝を差し出したときの点 */
const KAGUYA_GIFT = (() => {
  const c = EVENT_MAP.kaguya;
  return c.kind === 'contest' && c.effect.type === 'kaguya' ? c.effect.win : 0;
})();

/** その場のカードを取る値打ち（払うポイントを差し引いた、この先の得点の目安） */
export function marketValue(s: GameState, pi: number, slot: number): number {
  const p = s.players[pi];
  const id = s.market[slot];
  const cost = marketCost(id, p);
  if (id.startsWith('person:')) {
    const out = p.students.length >= 9 ? leastWorth(p) : undefined;
    const kept = p.students.filter((x) => x.uid !== out?.uid);
    return gain(s, p, withStudents(p, [...kept, previewStudent(id)])) - cost;
  }
  const c = EVENT_MAP[id];
  const swap = (uid: string, st: Student) => withStudents(p, p.students.map((x) => (x.uid === uid ? st : x)));
  switch (c.kind) {
    case 'normal':
      return attrScore(p, c.attr).total;
    case 'goods':
      // かぐや姫が待っている宝なら、そのまま差し出す（宝は消えて点が入り、手番は続く）
      if (kaguyaWants(s, c.id)) return KAGUYA_GIFT - cost;
      return Math.max(...equippable(p).map((st) => gain(s, p, swap(st.uid, equipped(st, c.attr))))) - cost;
    case 'cyborg':
      return Math.max(...cyborgable(p).map((st) => gain(s, p, swap(st.uid, cyborged(st))))) - cost;
    case 'kachikomi':
      // 相手1クラスの減点は相手の数で割って自分の加点と比べる。ドレインの分はそのまま自分の加点
      return attrScore(p, 'fight').total * (c.mult / (s.players.length - 1) + c.drain);
    case 'exchange':
      return Math.max(...exchangePairs(s, pi).map((x) => gain(s, p, swap(x.uid, s.players[x.target].students.find((y) => y.uid === x.theirUid)!))));
    default:
      return -Infinity;
  }
}

/** ピラミッドに石を積む値打ち（完成させれば、積んだ石で届く段のほうび。完成しなければ、学期の残りで完成しそうな分だけ） */
export function buildValue(s: GameState, pi: number): number {
  const c = pyramidCard(s);
  const py = s.pyramid;
  if (!c || !py || !canBuild(s, pi)) return -Infinity;
  const t = attrScore(s.players[pi], c.attr).total;
  const mine = py.stones[pi] + t;
  const sum = py.stones.reduce((a, x) => a + x, 0) + t;
  if (sum >= py.need) return pyramidReward(c.effect.steps, mine);
  // 学期の最後の月（7・12・3月）は完成しないかもしれない。次の段に近づいた分も少し数える
  const odds = [7, 12, 3].includes(MONTHS[s.monthIdx]) ? 0.25 : 0.5;
  const next = c.effect.steps.map(([n]) => n).find((n) => n > py.stones[pi]) ?? Infinity;
  const toward = Math.min(t, Math.max(0, next - py.stones[pi]));
  return (pyramidReward(c.effect.steps, mine) - pyramidReward(c.effect.steps, py.stones[pi]) + toward) * odds;
}

/** 一番点の高い相手 */
function leader(s: GameState, candidates: number[]): number {
  return [...candidates].sort((x, y) => s.players[y].points - s.players[x].points)[0];
}

/** そのクラスの係をおまかせで決めて準備OKにする（CPU・通信が切れた人の代わり） */
export function rolesAction(s: GameState, pi: number): Action {
  const p = s.players[pi];
  const unlock = autoUnlock(p, slotsNow(s));
  return { type: 'setRoles', player: pi, unlock, roles: autoRoles(p, [...p.unlocked, ...unlock]) };
}

export function cpuAction(s: GameState): Action | null {
  const ph = s.phase;
  switch (ph.kind) {
    case 'memberDraw':
      return { type: 'drawMember' };
    case 'roles': {
      // 係決めは一斉：まだ準備OKでないCPUのクラスから決める（CPUがみな決めていれば、まだの人のクラスを代わりに）
      const cpu = s.players.findIndex((p, i) => p.isCpu && !ph.ready[i]);
      const pi = cpu >= 0 ? cpu : ph.ready.indexOf(false);
      return pi < 0 ? null : rolesAction(s, pi);
    }
    case 'draw': {
      // かぐや姫に頼まれた宝を持っていれば、先に差し出す（手番は終わらない）
      if (kaguyaGift(s, ph.player)) return { type: 'present' };
      const slots = s.market.map((_, i) => i);
      const best = slots.filter((i) => canTake(s, ph.player, i)).sort((x, y) => marketValue(s, ph.player, y) - marketValue(s, ph.player, x))[0];
      const bv = buildValue(s, ph.player);
      if (bv > 0 && (best === undefined || bv > marketValue(s, ph.player, best))) return { type: 'build' };
      if (best !== undefined && marketValue(s, ph.player, best) > 0) return { type: 'take', slot: best };
      // 取りたいものがなければ、一番高いカードを捨てて見送る
      return { type: 'pass', slot: slots.sort((x, y) => marketCost(s.market[y]) - marketCost(s.market[x]))[0] };
    }
    case 'makeRoom':
      return { type: 'makeRoom', uid: leastWorth(s.players[ph.player])?.uid ?? null };
    case 'push': {
      // 一番いなくても困らない子を転校させる
      const p = s.players[ph.player];
      const st = droppable(p).sort((x, y) => worth(p, x.uid) - worth(p, y.uid))[0];
      return { type: 'push', uid: st.uid };
    }
    case 'kachikomi':
      return { type: 'kachikomi', target: leader(s, kachikomiTargets(s, ph.player)) };
    case 'vote':
      // 陶片追放：一番点の高い相手に入れる
      return { type: 'vote', target: leader(s, voteTargets(s, ph.player)) };
    case 'exchange': {
      const p = s.players[ph.player];
      let best: { uid: string; target: number; theirUid: string; gain: number } | null = null;
      for (const x of exchangePairs(s, ph.player)) {
        const theirs = s.players[x.target].students.find((y) => y.uid === x.theirUid)!;
        const g = gain(s, p, withStudents(p, p.students.map((y) => (y.uid === x.uid ? theirs : y))));
        if (!best || g > best.gain) best = { ...x, gain: g };
      }
      if (!best) return { type: 'exchange', uid: null };
      return { type: 'exchange', uid: best.uid, target: best.target, theirUid: best.theirUid };
    }
    case 'cyborg': {
      // サイボーグにして一番強くなる子（取ると決めた時点で得になる子がいる）
      const me = s.players[ph.player];
      const after = (uid: string) => withStudents(me, me.students.map((x) => (x.uid === uid ? cyborged(x) : x)));
      const st = cyborgable(me).sort((x, y) => gain(s, me, after(y.uid)) - gain(s, me, after(x.uid)))[0];
      return { type: 'cyborg', uid: st?.uid ?? null };
    }
    case 'equip': {
      // かぐや姫が待っている宝なら、装備せずにそのまま差し出す
      if (kaguyaWants(s, ph.card)) return { type: 'offer' };
      const p = s.players[ph.player];
      const c = EVENT_MAP[ph.card] as GoodsCard;
      // 係ボーナスが乗る子＞そのアイコンをたくさん持つ子
      const score = (st: Student) => (hasRoleBonus(p, st, c.attr) ? 10 : 0) + iconsOf(st, c.attr);
      const st = equippable(p).sort((x, y) => score(y) - score(x))[0];
      return { type: 'equip', uid: st?.uid ?? null };
    }
    case 'gift': {
      // 品と子の組み合わせ：係ボーナスが乗る子＞そのアイコンをたくさん持つ子（鉄砲なら👊の多い子）
      const p = s.players[ph.player];
      let best: { item: string; uid: string; score: number } | null = null;
      for (const item of ph.items) {
        const attr = GIFT_MAP[item].attr;
        for (const st of equippable(p)) {
          const score = (hasRoleBonus(p, st, attr) ? 10 : 0) + iconsOf(st, attr);
          if (!best || score > best.score) best = { item, uid: st.uid, score };
        }
      }
      return { type: 'gift', item: best!.item, uid: best!.uid };
    }
    case 'oath': {
      // 桃園の誓い：自分より強い（これから稼ぎそうな）クラスと義兄弟になる。いなければ一番強い1クラスだけ
      const mine = classScore(s.players[ph.player]);
      const targets = oathTargets(s, ph.player).sort((x, y) => classScore(s.players[y]) - classScore(s.players[x]));
      const stronger = targets.filter((t) => classScore(s.players[t]) >= mine);
      return { type: 'oath', targets: (stronger.length ? stronger : targets).slice(0, stronger.length ? ph.max : 1) };
    }
    case 'result':
      return { type: 'continue' };
    case 'gameOver':
      return null;
  }
}
