import { MAX_CLASS, MIN_CLASS, STARTING_MEMBERS, attrScore, contributions, ranks, roleOf, roleSlots, termNo, testScore, totalPower, validRoles, validUnlock } from './calc';
import { CARDS, CARD_MAP, toIcons } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import {
  ALL_EVENT_CARDS,
  CONTEST_POINTS,
  EVENT_MAP,
  FIXED_BY_MONTH,
  FIXED_MAP,
  PERSON_CARDS_PER_TERM,
  TEST_YANKEE_PENALTY,
  cardEra,
  cardRule,
  fixedRule,
  type ContestCard,
  type FixedEvent,
  type GoodsCard,
  type NormalCard,
  type RaidCard,
  type SwingCard,
} from './data/events';
import { ARCHETYPE_MAP, GIVEN_NAMES, MODERN_POOL, STARTER_POOL, SURNAMES, archetypeOf, isModernCard, type Archetype } from './data/modern';
import { ROLES } from './data/roles';
import {
  type Action,
  type EraId,
  type EventResult,
  type GameState,
  type Player,
  type ResultCtx,
  type ResultRow,
  type Student,
} from './types';
import { ATTR_ICON } from './types';

/** 転校生がやってくる歴史上の時代（現代以外） */
export const HISTORY_ERAS = ERAS.map((_, i) => i).filter((i) => i !== PRESENT_INDEX);
/** 手番のある月（8月の夏休みは飛ばす） */
export const MONTHS = [4, 5, 6, 7, 9, 10, 11, 12, 1, 2, 3];
export const PLAYER_COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#da77f2'];

export function termOfMonth(m: number): number {
  if (m >= 4 && m <= 7) return 1;
  if (m === 8) return 0;
  if (m >= 9) return 2;
  return 3;
}

/** 今の学期に使える係の数 */
export function slotsNow(s: GameState): number {
  return roleSlots(termNo(s.year, termOfMonth(MONTHS[Math.min(s.monthIdx, MONTHS.length - 1)])));
}

export function calendarLabel(s: GameState): string {
  const m = MONTHS[Math.min(s.monthIdx, MONTHS.length - 1)];
  const t = termOfMonth(m);
  return `${s.year}年生 ${m}月${t === 0 ? '（夏休み）' : `（${t}学期）`}`;
}

export function className(pi: number, year: number): string {
  return `${year}年${'ABCDE'[pi]}組`;
}

// ---------- 乱数（シード付き。状態に保存してセーブ/ロードでも再現可能） ----------

function rand(s: GameState): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(s: GameState, n: number): number {
  return Math.floor(rand(s) * n);
}
function pick<T>(s: GameState, arr: T[]): T {
  return arr[randInt(s, arr.length)];
}
function shuffle<T>(s: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- 初期化 ----------

export interface SetupPlayer {
  name: string;
  isCpu: boolean;
}

export function newGame(setup: SetupPlayer[], years: number, seed = Date.now()): GameState {
  const pools = Object.fromEntries(ERAS.map((e) => [e.id, [] as string[]])) as Record<EraId, string[]>;
  for (const c of CARDS) pools[c.era].push(c.id);
  pools.present = [...MODERN_POOL];
  const s: GameState = {
    version: 16,
    yearEras: [],
    eraDeck: [],
    rng: seed | 0,
    players: setup.map((p, i) => ({
      id: i,
      name: p.name,
      isCpu: p.isCpu,
      color: PLAYER_COLORS[i],
      students: [],
      unlocked: [],
      roles: [],
      points: 0,
    })),
    years,
    year: 1,
    monthIdx: 0,
    rotation: 0,
    queue: setup.map((_, i) => i),
    queueIdx: 0,
    phase: { kind: 'memberDraw', player: 0, last: null },
    eventDeck: [],
    discard: [],
    starters: [...STARTER_POOL],
    pools,
    uidCounter: 0,
    logCounter: 0,
    log: [],
  };
  drawYearEras(s, true);
  s.eventDeck = buildDeck(s);
  log(s, `時空最強クラス決定戦、開幕！ ${years}年間の勝負です。`);
  return s;
}

function log(s: GameState, text: string, player?: number) {
  s.log.push({ id: s.logCounter++, when: calendarLabel(s), text, player });
  if (s.log.length > 300) s.log.splice(0, s.log.length - 300);
}

// ---------- 生徒カード ----------

function joinedLabel(s: GameState): string {
  return `${s.year}年${MONTHS[Math.min(s.monthIdx, MONTHS.length - 1)]}月`;
}

function fromArchetype(s: GameState, cardId: string, a: Archetype, joined: string): Student {
  return {
    uid: `u${s.uidCounter++}`,
    cardId,
    name: `${pick(s, SURNAMES)} ${pick(s, GIVEN_NAMES)}`,
    title: a.title,
    era: 'present',
    rarity: a.rarity,
    icon: a.icon,
    art: a.id,
    attrs: toIcons(a.attrs, a.rarity, a.power),
    flavor: a.flavor,
    joined,
    mvp: 0,
  };
}

function fromCard(s: GameState, cardId: string, joined: string): Student {
  const c = CARD_MAP[cardId];
  return {
    uid: `u${s.uidCounter++}`,
    cardId,
    name: c.name,
    title: c.title,
    era: c.era,
    rarity: c.rarity,
    icon: c.icon,
    art: cardId,
    attrs: [...c.attrs],
    flavor: c.flavor,
    joined,
    mvp: 0,
  };
}

/** カードプールのID（偉人のカードID、または現代の生徒の 'm:<アーキタイプ>#<番号>'）から生徒を作る */
function fromPoolId(s: GameState, id: string, joined: string): Student {
  return isModernCard(id) ? fromArchetype(s, id, ARCHETYPE_MAP[archetypeOf(id)], joined) : fromCard(s, id, joined);
}

/** カードプールのIDがどの時代のものか */
function eraOfId(id: string): EraId {
  return isModernCard(id) ? 'present' : CARD_MAP[id].era;
}

function addStudent(s: GameState, p: Player, st: Student) {
  p.students.push(st);
  if (st.cardId) {
    const pool = s.pools[st.era];
    const i = pool.indexOf(st.cardId);
    if (i >= 0) pool.splice(i, 1);
  }
}

function removeStudent(s: GameState, p: Player, uid: string, returnToPool: boolean): Student | null {
  const i = p.students.findIndex((x) => x.uid === uid);
  if (i < 0) return null;
  const [st] = p.students.splice(i, 1);
  p.roles = p.roles.filter((r) => r.uid !== uid);
  if (returnToPool && st.cardId && !s.pools[st.era].includes(st.cardId)) s.pools[st.era].push(st.cardId);
  return st;
}

// ---------- 初期メンバー ----------

/** 初期メンバー用の山（現代の普通の生徒）から1枚引く（完全ランダム） */
function drawMember(s: GameState, pi: number): Student {
  const i = randInt(s, s.starters.length);
  const [id] = s.starters.splice(i, 1);
  const st = fromPoolId(s, id, '初期メンバー');
  s.players[pi].students.push(st);
  return st;
}

/** 次に初期メンバーを引くプレイヤー（人数の少ない順・同数なら席順）。全員揃ったら null */
function nextMemberDrawer(s: GameState): number | null {
  let best: number | null = null;
  for (const p of s.players) {
    if (p.students.length >= STARTING_MEMBERS) continue;
    if (best === null || p.students.length < s.players[best].students.length) best = p.id;
  }
  return best;
}

function afterMemberDraw(s: GameState, last: { player: number; student: Student } | null) {
  const next = nextMemberDrawer(s);
  if (next === null) {
    log(s, '全クラスの初期メンバーがそろった！');
    startTerm(s);
  } else {
    s.phase = { kind: 'memberDraw', player: next, last };
  }
}

// ---------- 時代と山札 ----------

/** その年の3学期ぶんの時代をランダムに決める（ゲーム中はなるべく被らない）。1年目の1学期は現代で固定 */
function drawYearEras(s: GameState, first = false) {
  s.yearEras = first ? [PRESENT_INDEX] : [];
  while (s.yearEras.length < 3) {
    if (s.eraDeck.length === 0) s.eraDeck = shuffle(s, [...HISTORY_ERAS]);
    const e = s.eraDeck.pop()!;
    if (!s.yearEras.includes(e)) s.yearEras.push(e);
  }
}

/** 今の学期の時代 */
export function currentEra(s: GameState): number {
  const t = termOfMonth(MONTHS[Math.min(s.monthIdx, MONTHS.length - 1)]);
  return s.yearEras[Math.max(1, t) - 1];
}

/** 山札：全時代共通のカード＋今学期の時代カード＋人物カード（その時代のカードプールから。プールが尽きていれば入らない） */
function buildDeck(s: GameState): string[] {
  const era = ERAS[currentEra(s)].id;
  const deck: string[] = [];
  for (const e of ALL_EVENT_CARDS) {
    const only = cardEra(e);
    if (only && only !== era) continue;
    for (let i = 0; i < e.count; i++) deck.push(e.id);
  }
  const figures = shuffle(s, [...s.pools[era]]).slice(0, PERSON_CARDS_PER_TERM);
  for (const id of figures) deck.push(`person:${id}`);
  return shuffle(s, deck);
}

// ---------- 進行 ----------

function order(s: GameState): number[] {
  const n = s.players.length;
  return Array.from({ length: n }, (_, i) => (i + s.rotation) % n);
}

function startTerm(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  const t = termOfMonth(MONTHS[s.monthIdx]);
  const era = ERAS[currentEra(s)];
  log(s, `${t}学期スタート！今学期の時代は${era.icon}${era.name}。`);
  s.eventDeck = buildDeck(s);
  s.discard = [];
  s.phase = { kind: 'roles', player: s.queue[0] };
}

function startTurns(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  s.phase = { kind: 'draw', player: s.queue[0] };
}

function endTurn(s: GameState) {
  s.queueIdx++;
  if (s.queueIdx < s.queue.length) s.phase = { kind: 'draw', player: s.queue[s.queueIdx] };
  else monthEnd(s);
}

function monthEnd(s: GameState) {
  const fixed = FIXED_BY_MONTH[MONTHS[s.monthIdx]];
  if (fixed) s.phase = { kind: 'result', player: null, result: resolveFixed(s, FIXED_MAP[fixed]), ctx: 'monthEnd' };
  else advanceMonth(s);
}

function advanceMonth(s: GameState) {
  s.rotation++;
  s.monthIdx++;
  if (s.monthIdx >= MONTHS.length) {
    yearEnd(s);
    return;
  }
  const m = MONTHS[s.monthIdx];
  if (m === 9 || m === 1) startTerm(s);
  else startTurns(s);
}

function yearEnd(s: GameState) {
  s.monthIdx = MONTHS.length - 1;
  if (s.year < s.years) {
    log(s, `${s.year}年生が終わった。進級！`);
    s.phase = {
      kind: 'result',
      player: null,
      ctx: 'yearEnd',
      result: { title: `進級！ ${s.year + 1}年生へ`, icon: '🌸', tone: 'fixed', desc: '新しい1年。時代も入れ替わる。', rows: [] },
    };
  } else {
    s.phase = { kind: 'result', player: null, result: resolveFixed(s, FIXED_MAP.graduation), ctx: 'final' };
  }
}

function newYear(s: GameState) {
  s.year++;
  drawYearEras(s);
  s.monthIdx = 0;
  s.rotation++;
  startTerm(s);
}

// ---------- イベント解決 ----------

/** 値の順位で順位点を配る */
function awardRanks(s: GameState, values: number[], mult: number): ResultRow[] {
  const table = CONTEST_POINTS[s.players.length] ?? CONTEST_POINTS[5];
  const rk = ranks(values);
  return s.players.map((p, i) => {
    const delta = Math.round((table[rk[i]] ?? 0) * mult);
    p.points += delta;
    return { player: i, count: values[i], rank: rk[i], delta };
  });
}

function sortRows(rows: ResultRow[]): ResultRow[] {
  return rows.sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || b.delta - a.delta);
}

function logRows(s: GameState, title: string, rows: ResultRow[]) {
  log(s, `【${title}】 ` + rows.map((r) => `${s.players[r.player].name} ${r.delta >= 0 ? '+' : ''}${r.delta}`).join(' / '));
}

/** 通常カード（○○の時間）：めくった人だけ、クラス全員のそのアイコンの合計数（＋係ボーナス） */
function resolveNormal(s: GameState, c: NormalCard, pi: number): EventResult {
  const p = s.players[pi];
  const sc = attrScore(p, c.attr);
  p.points += sc.total;
  sc.holders.forEach((h) => h.mvp++);
  const rows: ResultRow[] = [{ player: pi, count: sc.total, delta: sc.total, uids: sc.holders.map((h) => h.uid) }];
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: c.attr, tone: 'normal', desc: '', rule: cardRule(c), rows };
}

/** 共通イベント（全クラス）：プラスのアイコン − マイナスのアイコン（または人数）。状況でプラスにもマイナスにもなる */
function resolveSwing(s: GameState, c: SwingCard): EventResult {
  const rows = s.players.map((p, i): ResultRow => {
    const plus = attrScore(p, c.plus);
    const minus = !c.minus ? { total: 0, holders: [] as Student[] } : c.minus === 'heads' ? { total: p.students.length, holders: [] as Student[] } : attrScore(p, c.minus);
    // 打ち消すだけのカード（ケンカ騒ぎ）は0が上限
    const delta = c.offsetOnly ? Math.min(0, plus.total - minus.total) : plus.total - minus.total;
    p.points += delta;
    if (delta > 0 || c.offsetOnly) plus.holders.forEach((h) => h.mvp++);
    const note = c.minus ? `${ATTR_ICON[c.plus]}${plus.total}−${c.minus === 'heads' ? '👥' : ATTR_ICON[c.minus]}${minus.total}` : undefined;
    return { player: i, count: c.minus ? undefined : plus.total, delta, note, uids: [...plus.holders, ...minus.holders].map((h) => h.uid) };
  });
  sortRows(rows);
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: c.plus, minus: c.minus, tone: 'contest', desc: c.desc, rule: cardRule(c), rows };
}

/** 時代イベント（全クラス）：カードごとの効果。その時代の生徒のアイコンが2倍 */
function resolveContest(s: GameState, c: ContestCard): EventResult {
  const e = c.effect;
  const table = CONTEST_POINTS[s.players.length] ?? CONTEST_POINTS[5];
  const scores = s.players.map((p) => attrScore(p, c.attr, c.era));
  // 代表：クラスで一番そのアイコンの点が多い1人
  const aces = s.players.map((p) => contributions(p, c.attr, c.era).sort((x, y) => y.pts - x.pts)[0]);
  const values = s.players.map((_, i) => (e.type === 'ace' || e.type === 'duel' ? aces[i]?.pts ?? 0 : scores[i].total));
  const rk = ranks(values);
  const best = Math.max(...values);
  const worst = Math.min(...values);
  const rows = s.players.map((p, i): ResultRow => {
    const sc = scores[i];
    let holders = sc.holders;
    let delta = 0;
    let count: number | undefined = values[i];
    let rank: number | undefined;
    let note: string | undefined;
    switch (e.type) {
      case 'sum':
        delta = values[i] * e.mult;
        break;
      case 'rank':
      case 'duel':
        rank = rk[i];
        delta = (table[rk[i]] ?? 0) * e.mult;
        break;
      case 'top':
        delta = values[i] > 0 && values[i] === best ? values[i] * e.mult : 0;
        note = delta > 0 ? '総取り' : undefined;
        break;
      case 'ace':
        delta = values[i] * e.mult;
        break;
      case 'heads': {
        const n = p.students.filter((x) => x.attrs.includes(c.attr)).reduce((a, x) => a + (x.era === c.era ? 2 : 1), 0);
        count = n;
        delta = n * e.per;
        note = `${n}人`;
        break;
      }
      case 'threshold':
        delta = values[i] >= e.need ? e.win : -e.lose;
        note = values[i] >= e.need ? '成功' : '失敗';
        break;
      case 'battle':
        delta = best === worst ? 0 : values[i] === best ? e.win : values[i] === worst ? -e.lose : 0;
        note = best === worst ? '引き分け' : values[i] === best ? '勝利' : values[i] === worst ? '敗北' : undefined;
        break;
      case 'minus': {
        const m = e.minus === 'without' ? p.students.filter((x) => !x.attrs.includes(c.attr)) : attrScore(p, e.minus).holders;
        const lost = e.minus === 'without' ? m.length : attrScore(p, e.minus).total;
        delta = values[i] - lost;
        note = `${ATTR_ICON[c.attr]}${values[i]}−${e.minus === 'without' ? '🙅' : ATTR_ICON[e.minus]}${lost}`;
        count = undefined;
        holders = [...holders, ...m];
        break;
      }
    }
    if (e.type === 'ace' || e.type === 'duel') holders = aces[i] ? [aces[i].student] : [];
    p.points += delta;
    if (delta > 0) holders.filter((h) => h.attrs.includes(c.attr)).forEach((h) => h.mvp++);
    return { player: i, count, rank, delta, note, uids: holders.map((h) => h.uid) };
  });
  sortRows(rows);
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: c.attr, tone: 'era', era: c.era, desc: c.desc, rule: cardRule(c), rows };
}

/** 襲来（時代イベント・全クラス）：👊の合計（この時代の生徒は2倍）− 敵の強さ */
function resolveRaid(s: GameState, c: RaidCard): EventResult {
  const rows = s.players.map((p, i): ResultRow => {
    const sc = attrScore(p, 'fight', c.era);
    const delta = sc.total - c.threat;
    p.points += delta;
    if (delta >= 0) sc.holders.forEach((h) => h.mvp++);
    return { player: i, count: sc.total, delta, note: delta >= 0 ? '撃退' : sc.total ? '突破' : '無防備', uids: sc.holders.map((h) => h.uid) };
  });
  sortRows(rows);
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: 'fight', tone: 'era', era: c.era, threat: c.threat, desc: `敵の強さ ${c.threat}`, rule: cardRule(c), rows };
}

function resolveFixed(s: GameState, f: FixedEvent): EventResult {
  const values = s.players.map((p) => (f.rule === 'test' ? testScore(p, TEST_YANKEE_PENALTY) : totalPower(p)));
  const rows = awardRanks(s, values, f.mult);
  for (const r of rows) {
    const st = s.players[r.player].students;
    r.uids = (f.rule === 'test' ? st.filter((x) => x.attrs.includes('study') || x.attrs.includes('fight')) : st).map((x) => x.uid);
  }
  sortRows(rows);
  logRows(s, f.name, rows);
  return { title: f.name, icon: f.icon, attr: f.rule === 'test' ? 'study' : 'all', tone: 'fixed', desc: '', rule: fixedRule(f), rows };
}

function setResult(s: GameState, pi: number | null, result: EventResult, ctx: ResultCtx) {
  s.phase = { kind: 'result', player: pi, result, ctx };
}

/** 人物カードを引いた：そのまま転入 */
function welcome(s: GameState, pi: number, st: Student, ctx: ResultCtx) {
  const p = s.players[pi];
  addStudent(s, p, st);
  log(s, `${p.name}のクラスに${st.name}が転入！`, pi);
  setResult(s, pi, { title: '転入', icon: '🚪', tone: 'personal', desc: `${st.icon}${st.name}がやってきた！`, rows: [], students: [st] }, ctx);
}

/** 転校で外せる生徒（係に就いていない子。定員の下限まで減っていたら外せない） */
export function droppable(p: Player): Student[] {
  return p.students.length <= MIN_CLASS ? [] : p.students.filter((x) => roleOf(p, x.uid) === null);
}

/** クラス替えでもらえる生徒（係に就いていない子） */
export function tradeable(p: Player): Student[] {
  return p.students.filter((x) => roleOf(p, x.uid) === null);
}

/** クラス替えの相手（係に就いていない生徒がいるクラス） */
export function exchangeTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi && tradeable(p).length > 0).map((p) => p.id);
}

/** グッズを装備できる生徒（まだ何も装備していない子） */
export function equippable(p: Player): Student[] {
  return p.students.filter((x) => !x.goods);
}

/** カチコミの相手 */
export function kachikomiTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi).map((p) => p.id);
}

/** 転校：めくった人から席順に、全クラスが1人ずつ外す */
function startDrop(s: GameState, drawer: number) {
  const n = s.players.length;
  nextDrop(s, drawer, Array.from({ length: n }, (_, i) => (drawer + i) % n), []);
}

/** 転校の次の人へ（left はまだ外していないクラス。外せる子がいないクラスは飛ばす）。全員終わったら結果を出す */
function nextDrop(s: GameState, drawer: number, left: number[], gone: Student[]) {
  for (let i = 0; i < left.length; i++) {
    const pi = left[i];
    if (droppable(s.players[pi]).length > 0) {
      s.phase = { kind: 'push', player: pi, drawer, left: left.slice(i + 1), gone };
      return;
    }
    log(s, `${s.players[pi].name}のクラスは転校させられる子がいなかった。`, pi);
  }
  setResult(
    s,
    drawer,
    {
      title: '転校',
      icon: '📦',
      tone: 'personal',
      desc: gone.length ? `${gone.map((x) => x.icon + x.name).join('・')} が転校していった。` : 'どのクラスも転校させられる子がいなかった。',
      rule: cardRule(EVENT_MAP.push),
      rows: [],
      students: gone,
    },
    'turn',
  );
}

function popCard(s: GameState): string {
  if (s.eventDeck.length === 0) {
    s.eventDeck = shuffle(s, s.discard);
    s.discard = [];
    log(s, '捨て札をシャッフルして山札に戻した。');
  }
  return s.eventDeck.pop()!;
}

const isPerson = (id: string) => id.startsWith('person:');
const personId = (id: string) => id.slice('person:'.length);
/** 人物カードの子がまだ誰のクラスにもいないか */
const available = (s: GameState, id: string) => s.pools[eraOfId(personId(id))].includes(personId(id));

function resolveDraw(s: GameState, pi: number) {
  const p = s.players[pi];
  let id = popCard(s);
  // 満席なら人物カードは捨てて、もう1枚めくる（もう転入済みの子のカードも同様）
  for (let guard = 0; isPerson(id) && (p.students.length >= MAX_CLASS || !available(s, id)); guard++) {
    s.discard.push(id);
    if (guard >= 50) {
      setResult(s, pi, { title: '満席', icon: '🪑', tone: 'personal', desc: '人物カードしか残っていなかった。', rows: [] }, 'turn');
      return;
    }
    log(s, `${p.name}のクラスは満席。人物カードを捨ててもう1枚めくる。`, pi);
    id = popCard(s);
  }
  // 人物カード：引いたらそのまま転入
  if (isPerson(id)) {
    welcome(s, pi, fromPoolId(s, personId(id), joinedLabel(s)), 'turn');
    return;
  }
  const c = EVENT_MAP[id];
  // グッズは装備したら場に残るので、捨て札に行くのは装備しなかった時だけ
  if (c.kind !== 'goods') s.discard.push(id);
  const personal = (desc: string) => setResult(s, pi, { title: c.name, icon: c.icon, tone: 'personal', desc, rule: cardRule(c), rows: [] }, 'turn');
  switch (c.kind) {
    case 'normal':
      setResult(s, pi, resolveNormal(s, c, pi), 'turn');
      return;
    case 'swing':
      setResult(s, pi, resolveSwing(s, c), 'turn');
      return;
    case 'contest':
      setResult(s, pi, resolveContest(s, c), 'turn');
      return;
    case 'raid':
      setResult(s, pi, resolveRaid(s, c), 'turn');
      return;
    case 'kachikomi':
      if (attrScore(p, 'fight').total === 0) personal('👊を持つ子がいないので、カチコミに行けなかった。');
      else s.phase = { kind: 'kachikomi', player: pi };
      return;
    case 'goods':
      if (equippable(p).length === 0) {
        s.discard.push(id);
        personal('装備できる生徒がいなかった。');
      } else s.phase = { kind: 'equip', player: pi, card: id };
      return;
    case 'push':
      startDrop(s, pi);
      return;
    case 'exchange':
      if (p.students.length === 0 || exchangeTargets(s, pi).length === 0) personal('交換できる生徒がいなかった。');
      else s.phase = { kind: 'exchange', player: pi };
      return;
  }
}

// ---------- メイン：アクション適用 ----------

/** 現在操作すべきプレイヤー（全員で見る結果表示は null） */
export function actingPlayer(s: GameState): number | null {
  const ph = s.phase;
  if (ph.kind === 'gameOver') return null;
  return ph.player;
}

export function step(prev: GameState, a: Action): GameState {
  const s: GameState = structuredClone(prev);
  const ph = s.phase;
  switch (a.type) {
    case 'drawMember': {
      if (ph.kind !== 'memberDraw') return prev;
      const st = drawMember(s, ph.player);
      afterMemberDraw(s, { player: ph.player, student: st });
      return s;
    }
    case 'drawAllMembers': {
      if (ph.kind !== 'memberDraw') return prev;
      let last: { player: number; student: Student } | null = null;
      while (s.players[ph.player].students.length < STARTING_MEMBERS) last = { player: ph.player, student: drawMember(s, ph.player) };
      afterMemberDraw(s, last);
      return s;
    }
    case 'continue': {
      if (ph.kind !== 'result') return prev;
      switch (ph.ctx) {
        case 'turn':
          endTurn(s);
          break;
        case 'monthEnd':
          advanceMonth(s);
          break;
        case 'yearEnd':
          newYear(s);
          break;
        case 'final':
          s.phase = { kind: 'gameOver' };
          log(s, 'ゲーム終了！');
          break;
      }
      return s;
    }
    case 'setRoles': {
      if (ph.kind !== 'roles') return prev;
      const p = s.players[ph.player];
      const unlock = a.unlock ?? [];
      if (!validUnlock(p, unlock, slotsNow(s))) return prev;
      const kinds = [...p.unlocked, ...unlock];
      if (!validRoles(p, a.roles, kinds)) return prev;
      p.unlocked = kinds;
      p.roles = a.roles.map((r) => ({ ...r }));
      if (unlock.length) log(s, `${p.name}が${unlock.map((r) => ROLES[r].icon + ROLES[r].name).join('・')}を解放`, ph.player);
      const desc = p.roles.map((r) => `${ROLES[r.role].name}:${p.students.find((x) => x.uid === r.uid)?.name}`).join(' ') || 'なし';
      log(s, `${p.name}の係 — ${desc}`, ph.player);
      s.queueIdx++;
      if (s.queueIdx < s.queue.length) s.phase = { kind: 'roles', player: s.queue[s.queueIdx] };
      else startTurns(s);
      return s;
    }
    case 'drawEvent': {
      if (ph.kind !== 'draw') return prev;
      resolveDraw(s, ph.player);
      return s;
    }
    case 'push': {
      if (ph.kind !== 'push') return prev;
      const p = s.players[ph.player];
      if (!droppable(p).some((x) => x.uid === a.uid)) return prev;
      const st = removeStudent(s, p, a.uid, false)!;
      log(s, `${p.name}のクラスの${st.name}が転校していった。`, ph.player);
      nextDrop(s, ph.drawer, ph.left, [...ph.gone, st]);
      return s;
    }
    case 'kachikomi': {
      if (ph.kind !== 'kachikomi') return prev;
      const p = s.players[ph.player];
      if (a.target === null) {
        setResult(s, ph.player, { title: 'カチコミ', icon: '👊', tone: 'personal', desc: 'やっぱりやめた。', rows: [] }, 'turn');
        return s;
      }
      if (!kachikomiTargets(s, ph.player).includes(a.target)) return prev;
      const sc = attrScore(p, 'fight');
      const to = s.players[a.target];
      to.points -= sc.total;
      sc.holders.forEach((h) => h.mvp++);
      const rows: ResultRow[] = [
        { player: ph.player, count: sc.total, delta: 0, note: 'カチコミ', uids: sc.holders.map((h) => h.uid) },
        { player: a.target, delta: -sc.total, note: '被害' },
      ];
      logRows(s, `カチコミ（${p.name}→${to.name}）`, rows);
      setResult(
        s,
        ph.player,
        { title: 'カチコミ', icon: '👊', attr: 'fight', tone: 'personal', desc: `${p.name}のクラスが${to.name}のクラスに殴りこんだ！`, rule: EVENT_RULE.kachikomi, rows },
        'turn',
      );
      return s;
    }
    case 'exchange': {
      if (ph.kind !== 'exchange') return prev;
      const p = s.players[ph.player];
      if (a.uid === null) {
        setResult(s, ph.player, { title: 'クラス替え', icon: '🔁', tone: 'personal', desc: 'やっぱりやめた。', rows: [] }, 'turn');
        return s;
      }
      if (a.target === undefined || !exchangeTargets(s, ph.player).includes(a.target)) return prev;
      const to = s.players[a.target];
      if (!p.students.some((x) => x.uid === a.uid) || !tradeable(to).some((x) => x.uid === a.theirUid)) return prev;
      const mine = removeStudent(s, p, a.uid, false)!;
      const theirs = removeStudent(s, to, a.theirUid!, false)!;
      p.students.push(theirs);
      to.students.push(mine);
      log(s, `${p.name}の${mine.name}と${to.name}の${theirs.name}がクラス替え！`, ph.player);
      setResult(
        s,
        ph.player,
        { title: 'クラス替え', icon: '🔁', tone: 'personal', desc: `${mine.icon}${mine.name} ⇄ ${theirs.icon}${theirs.name}（${to.name}）`, rows: [], students: [theirs, mine] },
        'turn',
      );
      return s;
    }
    case 'equip': {
      if (ph.kind !== 'equip') return prev;
      const p = s.players[ph.player];
      const c = EVENT_MAP[ph.card] as GoodsCard;
      if (a.uid === null) {
        s.discard.push(ph.card);
        setResult(s, ph.player, { title: c.name, icon: c.icon, tone: 'personal', desc: '装備しなかった。', rows: [] }, 'turn');
        return s;
      }
      const st = equippable(p).find((x) => x.uid === a.uid);
      if (!st) return prev;
      st.goods = { id: c.id, name: c.name, icon: c.icon, attr: c.attr };
      st.attrs = [...st.attrs, c.attr];
      log(s, `${p.name}のクラスの${st.name}が${c.icon}${c.name}を装備した。`, ph.player);
      setResult(
        s,
        ph.player,
        { title: c.name, icon: c.icon, attr: c.attr, tone: 'personal', desc: `${st.icon}${st.name}が装備した！`, rule: cardRule(c), rows: [], students: [st] },
        'turn',
      );
      return s;
    }
  }
  return prev;
}

const EVENT_RULE = { kachikomi: cardRule(EVENT_MAP.kachikomi) };

export function finalRanking(s: GameState): Player[] {
  return [...s.players].sort((a, b) => b.points - a.points);
}

// ---------- 山札の内訳 ----------

export const DECK_GROUPS = ['通常', 'カチコミ', '共通イベント', '転校・クラス替え', 'グッズ', '時代イベント', '人物'] as const;
export type DeckGroup = (typeof DECK_GROUPS)[number];

export interface DeckRow {
  group: DeckGroup;
  icon: string;
  name: string;
  /** 山札に残っている枚数 */
  left: number;
  /** 捨て札にある枚数 */
  used: number;
}

/** 今学期の山札の内訳（山札の残りと捨て札）。人物カードは1行にまとめる */
export function deckBreakdown(s: GameState): DeckRow[] {
  const era = ERAS[currentEra(s)];
  const rows = new Map<string, DeckRow>();
  const row = (key: string, init: () => Omit<DeckRow, 'left' | 'used'>) => {
    if (!rows.has(key)) rows.set(key, { ...init(), left: 0, used: 0 });
    return rows.get(key)!;
  };
  const define = (id: string) => {
    if (isPerson(id)) return row('person', () => ({ group: '人物', icon: era.icon, name: `${era.name}の生徒（転入）` }));
    const c = EVENT_MAP[id];
    return row(id, (): Omit<DeckRow, 'left' | 'used'> => {
      const base = { icon: c.icon, name: c.name };
      switch (c.kind) {
        case 'normal':
          return { ...base, group: '通常' };
        case 'kachikomi':
          return { ...base, group: 'カチコミ' };
        case 'swing':
          return { ...base, group: '共通イベント' };
        case 'push':
        case 'exchange':
          return { ...base, group: '転校・クラス替え' };
        case 'goods':
          return { ...base, name: `${c.name}（${ATTR_ICON[c.attr]}＋1）`, group: c.era ? '時代イベント' : 'グッズ' };
        case 'contest':
          return { ...base, name: `${c.name}（${ATTR_ICON[c.attr]}）`, group: '時代イベント' };
        case 'raid':
          return { ...base, name: `${c.name}（強さ${c.threat}）`, group: '時代イベント' };
      }
    });
  };
  // 並び順を固定するため、まず今学期に入りうるカードを全部登録しておく
  for (const e of ALL_EVENT_CARDS) if (!cardEra(e) || cardEra(e) === era.id) define(e.id);
  for (const id of s.eventDeck) define(id).left++;
  for (const id of s.discard) define(id).used++;
  return [...rows.values()].filter((r) => r.group !== '人物' || r.left + r.used > 0);
}
