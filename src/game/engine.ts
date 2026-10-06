import { MAX_CLASS, MIN_CLASS, STARTING_MEMBERS, attrScore, baseIcons, contributions, iconsOf, ranks, roleOf, roleSlots, termNo, testScore, totalPower, validRoles, validUnlock } from './calc';
import { CARDS, CARD_MAP, EGG_DINOS, toIcons } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import {
  ALL_EVENT_CARDS,
  KACHIKOMI_CARDS,
  CONTEST_POINTS,
  CYBORG_ATTRS,
  EVENT_MAP,
  FIXED_BY_MONTH,
  FIXED_MAP,
  MARKET_SIZE,
  MACHINE_GOODS,
  MAX_ICONS,
  PERSON_CARDS_PER_TERM,
  TEST_YANKEE_PENALTY,
  cardEra,
  personCost,
  cardRule,
  eventCost,
  fixedRule,
  isGuerrilla,
  cardGlyph,
  fixedGlyph,
  fixedShort,
  shortRule,
  type ContestCard,
  type EraEffect,
  type FixedEvent,
  type GoodsCard,
  type NormalCard,
  type RaidCard,
  type SwingCard,
} from './data/events';
import { ARCHETYPE_MAP, BOY_NAMES, GIRL_NAMES, MODERN_POOL, STARTER_POOL, SURNAMES, archetypeOf, isModernCard, type Archetype } from './data/modern';
import { ROLES } from './data/roles';
import {
  type Action,
  type Attr,
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
    version: 22,
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
    queue: setup.map((_, i) => i),
    queueIdx: 0,
    phase: { kind: 'memberDraw', player: 0, last: null },
    eventDeck: [],
    market: [],
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
    name: a.fixedName ?? `${pick(s, SURNAMES)} ${pick(s, a.female ? GIRL_NAMES : BOY_NAMES)}`,
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
  if (returnToPool && st.cardId && CARDS.some((c) => c.id === st.cardId) && !s.pools[st.era].includes(st.cardId)) s.pools[st.era].push(st.cardId);
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
    if ('odds' in e && e.odds !== undefined && rand(s) >= e.odds) continue;
    for (let i = 0; i < e.count; i++) deck.push(e.id);
  }
  const figures = shuffle(s, [...s.pools[era]]).slice(0, PERSON_CARDS_PER_TERM);
  for (const id of figures) deck.push(`person:${id}`);
  return shuffle(s, deck);
}

// ---------- 進行 ----------

/** 手番の順：いつも席順（月や学年が変わっても、同じ人が2回続けて手番をしないように） */
function order(s: GameState): number[] {
  return s.players.map((_, i) => i);
}

function startTerm(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  const t = termOfMonth(MONTHS[s.monthIdx]);
  const era = ERAS[currentEra(s)];
  log(s, `${t}学期スタート！今学期の時代は${era.icon}${era.name} —「${era.motto}」`);
  s.eventDeck = buildDeck(s);
  s.discard = [];
  s.market = [];
  fillMarket(s);
  s.phase = { kind: 'roles', player: s.queue[0] };
}

function startTurns(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  beginTurn(s, s.queue[0]);
}

function endTurn(s: GameState) {
  s.queueIdx++;
  if (s.queueIdx < s.queue.length) beginTurn(s, s.queue[s.queueIdx]);
  else monthEnd(s);
}

/** 手番の始め：卵を持っていれば先に孵して見せる（次へで手番に進む） */
function beginTurn(s: GameState, pi: number) {
  const p = s.players[pi];
  const eggs = p.students.filter(isEgg);
  if (!eggs.length) {
    s.phase = { kind: 'draw', player: pi };
    return;
  }
  for (const egg of eggs) hatch(s, egg);
  const desc = eggs.map((x) => `${x.icon}${x.name}`).join('・');
  log(s, `${p.name}のクラスで卵が孵った！ ${desc}`, pi);
  setResult(s, pi, { title: '卵が孵った！', icon: '🥚', tone: 'personal', desc: `${desc}が生まれた！`, rows: [{ player: pi, delta: 0, note: '孵化', uids: eggs.map((x) => x.uid) }], students: eggs }, 'hatch');
}

/** 恐竜の卵（オヴィラプトルの卵泥棒で来る。アイコンはなく、席を1つ使う） */
function makeEgg(s: GameState): Student {
  return { uid: `u${s.uidCounter++}`, name: '恐竜の卵', title: '何が孵るかな', era: 'cretaceous', rarity: 'N', icon: '🥚', art: 'egg', attrs: [], flavor: 'ときどき中から音がする。', joined: joinedLabel(s), mvp: 0 };
}

export function isEgg(x: Student): boolean {
  return x.art === 'egg';
}

/** 卵を恐竜に変える（uid はそのまま。係に就いていればそのまま）。アイコン1個:2個:3個 = 5:4:1 */
function hatch(s: GameState, egg: Student) {
  const total = EGG_DINOS.reduce((a, d) => a + d.weight, 0);
  let r = rand(s) * total;
  const d = EGG_DINOS.find((x) => (r -= x.weight) < 0) ?? EGG_DINOS[0];
  Object.assign(egg, { cardId: d.id, name: d.name, title: d.title, rarity: d.rarity, icon: d.icon, art: d.id, attrs: [...d.attrs], flavor: d.flavor });
}

function monthEnd(s: GameState) {
  const fixed = FIXED_BY_MONTH[MONTHS[s.monthIdx]];
  if (fixed) s.phase = { kind: 'result', player: null, result: resolveFixed(s, FIXED_MAP[fixed]), ctx: 'monthEnd' };
  else advanceMonth(s);
}

function advanceMonth(s: GameState) {
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
  return { title: c.name, icon: c.icon, attr: c.attr, tone: 'normal', desc: '', rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows };
}

/** 共通イベント（全クラス）：プラスのアイコンの数だけ得点（マイナスのアイコンがあれば、その数だけ減点）。per があれば持っている子1人につき +per */
function resolveSwing(s: GameState, c: SwingCard): EventResult {
  const rows = s.players.map((p, i): ResultRow => {
    const plus = attrScore(p, c.plus);
    const minus = c.minus ? attrScore(p, c.minus) : { total: 0, holders: [] as Student[] };
    // 人数で数えるカード（持久走大会・合唱コンクール）は、持っている子1人につき +per
    const delta = c.per ? plus.holders.length * c.per : plus.total - minus.total;
    p.points += delta;
    if (delta > 0) plus.holders.forEach((h) => h.mvp++);
    const note = c.minus ? `${ATTR_ICON[c.plus]}${plus.total}−${ATTR_ICON[c.minus]}${minus.total}` : undefined;
    return { player: i, count: c.minus ? undefined : c.per ? plus.holders.length : plus.total, delta, note: c.per ? `${plus.holders.length}人` : note, uids: [...plus.holders, ...minus.holders].map((h) => h.uid) };
  });
  sortRows(rows);
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: c.plus, minus: c.minus, tone: 'contest', desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows };
}

/** 時代イベント（全クラス）：カードごとの効果 */
function resolveContest(s: GameState, c: ContestCard): EventResult {
  const e = c.effect;
  switch (e.type) {
    case 'alien':
      return resolveInvasion(s, c);
    case 'heads':
    case 'tiers':
    case 'disaster':
    case 'threshold':
    case 'battle':
      return resolveEraScore(s, c, e);
    default:
      return resolveEraSpecial(s, c, e);
  }
}

/** 点を数える時代イベント（○人につき・段階・災害・目標・勝負） */
function resolveEraScore(s: GameState, c: ContestCard, e: Extract<EraEffect, { type: 'heads' | 'tiers' | 'disaster' | 'threshold' | 'battle' }>): EventResult {
  /** その子が競うアイコンを持っているか */
  const has = (x: Student) => (c.attr === 'all' ? x.attrs.length > 0 : x.attrs.includes(c.attr));
  const scores = s.players.map((p) => attrScore(p, c.attr));
  const values = scores.map((x) => x.total);
  const best = Math.max(...values);
  const worst = Math.min(...values);
  const rows = s.players.map((p, i): ResultRow => {
    const holders = scores[i].holders;
    let delta = 0;
    let count: number | undefined = values[i];
    let note: string | undefined;
    /** 勝負の順位（名札にメダルを出す） */
    let place: number | undefined;
    switch (e.type) {
      case 'heads': {
        const n = p.students.filter(has).length;
        count = n;
        delta = n * e.per;
        note = `${n}人`;
        break;
      }
      case 'disaster': {
        // 全クラスが同じだけ失い、持っている子1人につき取り返す
        const n = p.students.filter(has).length;
        count = n;
        delta = n * e.per - e.lose;
        note = `${n}人`;
        break;
      }
      case 'tiers': {
        // 届いた段のうち一番上の点だけ（順位はつけない）
        const step = [...e.steps].reverse().find(([need]) => values[i] >= need);
        delta = step ? step[1] : 0;
        note = step ? `${step[0]}以上` : `${e.steps[0][0]}に届かず`;
        break;
      }
      case 'threshold':
        delta = values[i] >= e.need ? e.win : -e.lose;
        note = values[i] >= e.need ? '成功' : '失敗';
        break;
      case 'battle': {
        // 順位：自分より多いクラスの数＋1（同点は同じ順位）。1位と最下位が先、2位はその次
        const rank = values.filter((v) => v > values[i]).length + 1;
        const p = best === worst ? 0 : rank === 1 ? 1 : values[i] === worst ? -1 : rank === 2 ? 2 : 3;
        delta = p === 1 ? e.win : p === 2 ? e.second : p === -1 ? -e.lose : 0;
        note = best === worst ? '引き分け' : p === -1 ? '最下位' : `${rank}位`;
        if (best !== worst) place = rank - 1;
        break;
      }
    }
    p.points += delta;
    if (delta > 0) holders.filter(has).forEach((h) => h.mvp++);
    return { player: i, count, rank: place, delta, note, uids: holders.map((h) => h.uid) };
  });
  return eraResult(s, c, rows, { attr: c.attr });
}

/** 時代イベントの結果をまとめる（点の順に並べてログに残す） */
function eraResult(s: GameState, c: ContestCard, rows: ResultRow[], extra: Partial<EventResult> = {}): EventResult {
  sortRows(rows);
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, art: c.id, tone: 'era', era: c.era, desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows, ...extra };
}

/** その子1人の、アイコンaの点（係ボーナスも乗る）。'all' はアイコンの総数 */
function studentPts(p: Player, x: Student, a: Attr | 'all'): number {
  return contributions({ ...p, students: [x] }, a)[0]?.pts ?? 0;
}

/** 候補の中で、アイコンaの点が一番多い子（同点なら先に並んでいる子）。だれも持っていなければ null */
function bestOf(p: Player, cands: Student[], a: Attr | 'all'): { student: Student; pts: number } | null {
  let out: { student: Student; pts: number } | null = null;
  for (const x of cands) {
    const pts = studentPts(p, x, a);
    if (pts > 0 && (!out || pts > out.pts)) out = { student: x, pts };
  }
  return out;
}

/** その時代だけの仕組みのイベント（点の数え方ではなく、起こることそのものが違う） */
function resolveEraSpecial(s: GameState, c: ContestCard, e: Exclude<EraEffect, { type: 'heads' | 'tiers' | 'disaster' | 'threshold' | 'battle' | 'alien' }>): EventResult {
  const ps = s.players;
  const n = ps.length;
  const rows: ResultRow[] = ps.map((_, i) => ({ player: i, delta: 0 }));
  const add = (i: number, d: number) => {
    ps[i].points += d;
    rows[i].delta += d;
  };
  const scores = ps.map((p) => attrScore(p, c.attr));
  const values = scores.map((x) => x.total);
  const best = Math.max(...values);
  const worst = Math.min(...values);
  /** 結果に並べる子 */
  const moved: Student[] = [];
  const name = (x: Student) => `${x.icon}${x.name}`;
  /** 起きたこと（ログに残し、めくったカードの横に一言で出す） */
  const said: string[] = [];
  const tell = (text: string, pi?: number) => {
    log(s, text, pi);
    said.push(text);
  };

  switch (e.type) {
    // 白亜紀：一番強いクラス（1クラスだけ）が、一番弱いクラスから点を奪う
    case 'plunder': {
      rows.forEach((r, i) => {
        r.count = values[i];
        r.uids = scores[i].holders.map((h) => h.uid);
      });
      const tops = values.flatMap((v, i) => (v === best ? [i] : []));
      if (best === worst || tops.length > 1) {
        rows.forEach((r) => (r.note = '互角'));
        break;
      }
      const win = tops[0];
      // 一番弱いクラスが複数なら、ポイントの多いほうが狙われる
      const lose = values.flatMap((v, i) => (v === worst ? [i] : [])).sort((x, y) => ps[y].points - ps[x].points)[0];
      add(win, e.amount);
      add(lose, -e.amount);
      scores[win].holders.forEach((h) => h.mvp++);
      rows[win].note = '奪った';
      rows[lose].note = '奪われた';
      tell(`${ps[win].name}のクラスが${ps[lose].name}のクラスから${e.amount}点奪った！`, win);
      break;
    }
    // 白亜紀：一番すばしこいクラス（1クラスだけ）の空いた席に卵が置かれる。孵るのはそのクラスの次の手番の始め
    case 'egg': {
      rows.forEach((r, i) => {
        r.count = values[i];
        r.uids = scores[i].holders.map((h) => h.uid);
      });
      const tops = values.flatMap((v, i) => (v === best ? [i] : []));
      if (best === worst || tops.length > 1) {
        rows.forEach((r) => (r.note = '互角'));
        break;
      }
      const win = tops[0];
      if (ps[win].students.length >= MAX_CLASS) {
        rows[win].note = '満席';
        break;
      }
      const egg = makeEgg(s);
      ps[win].students.push(egg);
      scores[win].holders.forEach((h) => h.mvp++);
      moved.push(egg);
      rows[win].note = '🥚ゲット';
      rows[win].uids = [egg.uid];
      tell(`${ps[win].name}のクラスが恐竜の卵を持ち帰った！次の手番で孵る。`, win);
      break;
    }
    // エジプト：全クラスの合計で1つのピラミッド。完成なら全員にほうび、一番少ないクラスはサボりで0
    case 'together': {
      const sum = values.reduce((a, v) => a + v, 0);
      const need = e.need * n;
      const done = sum >= need;
      tell(done ? `完成！（全クラスで${ATTR_ICON[c.attr as Attr] ?? ''}${sum}／${need}）` : `未完成…（全クラスで${ATTR_ICON[c.attr as Attr] ?? ''}${sum}／${need}）`);
      rows.forEach((r, i) => {
        r.count = values[i];
        r.uids = scores[i].holders.map((h) => h.uid);
        if (!done) {
          add(i, -e.lose);
          r.note = `未完成 ${sum}/${need}`;
        } else if (values[i] === worst && best !== worst) {
          r.note = 'サボり';
        } else {
          add(i, e.win);
          r.note = `完成 ${sum}/${need}`;
          scores[i].holders.forEach((h) => h.mvp++);
        }
      });
      break;
    }
    // ギリシャ：全校でアイコンが一番多い子のクラスが減点（同点ならポイントの多いクラスの子）
    case 'ostracism': {
      let pick: { pi: number; st: Student } | null = null;
      ps.forEach((p, pi) => {
        for (const st of p.students) {
          const better = !pick || st.attrs.length > pick.st.attrs.length || (st.attrs.length === pick.st.attrs.length && p.points > ps[pick.pi].points);
          if (better) pick = { pi, st };
        }
      });
      if (!pick) break;
      const { pi, st } = pick as { pi: number; st: Student };
      add(pi, -e.lose);
      moved.push(st);
      rows[pi].count = st.attrs.length;
      rows[pi].note = '追放の票';
      rows[pi].uids = [st.uid];
      tell(`${ps[pi].name}のクラスの${name(st)}に陶片の票が集まった。（−${e.lose}）`, pi);
      break;
    }
    // 中国：各クラスの一番の子が受験。合格した子はアイコンが1つ増える（MAX_ICONS まで）
    case 'upgrade': {
      if (c.attr === 'all') break;
      const a = c.attr;
      ps.forEach((p, i) => {
        const top = bestOf(p, p.students.filter((x) => baseIcons(x) < MAX_ICONS), a);
        if (!top) {
          rows[i].note = '受験者なし';
          return;
        }
        rows[i].count = top.pts;
        rows[i].uids = [top.student.uid];
        if (top.pts < e.need) {
          rows[i].note = '不合格';
          return;
        }
        top.student.attrs = [...top.student.attrs, a];
        top.student.mvp++;
        moved.push(top.student);
        rows[i].note = `合格 ${ATTR_ICON[a]}＋1`;
        tell(`${p.name}のクラスの${name(top.student)}が合格！${ATTR_ICON[a]}が1つ増えた。`, i);
      });
      break;
    }
    // 平安：一番のクラスへ、ほかの全クラスから贈り物（一番が複数なら、それぞれに贈る）
    case 'tribute': {
      rows.forEach((r, i) => {
        r.count = values[i];
        r.uids = scores[i].holders.map((h) => h.uid);
      });
      if (best === worst) {
        rows.forEach((r) => (r.note = '引き分け'));
        break;
      }
      const tops = values.flatMap((v, i) => (v === best ? [i] : []));
      ps.forEach((_, i) => {
        if (tops.includes(i)) return;
        for (const t of tops) {
          add(i, -e.per);
          add(t, e.per);
        }
        rows[i].note = '贈った';
      });
      tell(`${tops.map((t) => ps[t].name).join('・')}のクラスに贈り物が集まった。`);
      tops.forEach((t) => {
        rows[t].note = '招かれた';
        scores[t].holders.forEach((h) => h.mvp++);
      });
      break;
    }
    // 中世：各クラスの代表1人どうしの一騎打ち。1位は+win、最下位は−lose（その子がいないクラスは出ない）
    case 'duel': {
      const champs = ps.map((p) => bestOf(p, p.students, c.attr));
      const vs = champs.flatMap((x) => (x ? [x.pts] : []));
      champs.forEach((x, i) => {
        rows[i].count = x?.pts;
        rows[i].uids = x ? [x.student.uid] : [];
        if (!x) rows[i].note = '不参加';
      });
      if (vs.length < 2 || Math.max(...vs) === Math.min(...vs)) {
        champs.forEach((x, i) => x && (rows[i].note = '引き分け'));
        break;
      }
      const hi = Math.max(...vs);
      const lo = Math.min(...vs);
      champs.forEach((x, i) => {
        if (!x) return;
        if (x.pts === hi) {
          add(i, e.win);
          x.student.mvp++;
          rows[i].note = '勝利';
          moved.push(x.student);
          tell(`${ps[i].name}のクラスの${name(x.student)}が勝った！`, i);
        } else if (x.pts === lo) {
          add(i, -e.lose);
          rows[i].note = '落馬';
        }
      });
      break;
    }
    // 戦国：一番人望のあるクラス（1クラスだけ）が、ポイントが一番多いクラスから点を奪う（自分が一番なら何も起こらない）
    case 'gekokujo': {
      rows.forEach((r, i) => {
        r.count = values[i];
        r.uids = scores[i].holders.map((h) => h.uid);
      });
      const tops = values.flatMap((v, i) => (v === best ? [i] : []));
      if (best === worst || tops.length > 1) {
        rows.forEach((r) => (r.note = '互角'));
        break;
      }
      const win = tops[0];
      const lord = ps.map((_, i) => i).sort((x, y) => ps[y].points - ps[x].points)[0];
      if (lord === win || ps[lord].points === ps[win].points) {
        rows[win].note = '天下安泰';
        tell(`${ps[win].name}のクラスの天下はゆるがない。`, win);
        break;
      }
      add(win, e.amount);
      add(lord, -e.amount);
      scores[win].holders.forEach((h) => h.mvp++);
      rows[win].note = '下剋上';
      rows[lord].note = '引きずり下ろされた';
      tell(`${ps[win].name}のクラスが${ps[lord].name}のクラスから${e.amount}点奪った！`, win);
      break;
    }
    // 現代：全校でアイコンが一番多い子（同点なら全員）が当選し、そのアイコンが1つ増える（MAX_ICONS まで）
    case 'elect': {
      if (c.attr === 'all') break;
      const a = c.attr;
      const hi = Math.max(0, ...ps.flatMap((p) => p.students.map((x) => iconsOf(x, a))));
      if (hi === 0) break;
      ps.forEach((p, i) => {
        const won = p.students.filter((x) => iconsOf(x, a) === hi);
        if (!won.length) return;
        rows[i].count = hi;
        rows[i].uids = won.map((x) => x.uid);
        rows[i].note = '当選';
        for (const x of won) {
          x.mvp++;
          moved.push(x);
          if (baseIcons(x) < MAX_ICONS) x.attrs = [...x.attrs, a];
          tell(`${p.name}のクラスの${name(x)}が当選！${ATTR_ICON[a]}が1つ増えた。`, i);
        }
      });
      break;
    }
    // 未来：機械の子はアイコンが1つ増える（MAX_ICONS まで）
    case 'machine': {
      if (c.attr === 'all') break;
      const a = c.attr;
      ps.forEach((p, i) => {
        const bots = p.students.filter(isMachine);
        rows[i].count = bots.length;
        rows[i].uids = bots.map((x) => x.uid);
        if (!bots.length) {
          rows[i].note = '機械なし';
          return;
        }
        let n = 0;
        for (const x of bots) {
          if (baseIcons(x) >= MAX_ICONS) continue;
          x.attrs = [...x.attrs, a];
          x.mvp++;
          moved.push(x);
          n++;
        }
        rows[i].note = `${n}人 ${ATTR_ICON[a]}＋1`;
        if (n) tell(`${p.name}のクラスの機械の子${n}人の${ATTR_ICON[a]}が1つ増えた。`, i);
      });
      break;
    }
    // 未来：ポイントが一番少ないクラス（同点なら全部）に、まだ誰のクラスにもいない人物が1人ずつ無料で転入（満席なら来ない）
    case 'timemachine': {
      const lo = Math.min(...ps.map((p) => p.points));
      ps.forEach((p, i) => {
        if (p.points !== lo) return;
        if (p.students.length >= MAX_CLASS) {
          rows[i].note = '満席';
          return;
        }
        const cands = Object.values(s.pools).flat();
        if (!cands.length) return;
        const st = fromPoolId(s, pick(s, cands), joinedLabel(s));
        addStudent(s, p, st);
        moved.push(st);
        rows[i].note = '転入';
        rows[i].uids = [st.uid];
        tell(`${p.name}のクラスに、タイムマシンで${name(st)}がやってきた！`, i);
      });
      break;
    }
    // 江戸：全クラスが出し合い、くじで1クラスが総取り
    case 'lottery': {
      const win = randInt(s, n);
      ps.forEach((_, i) => add(i, -e.fee));
      add(win, e.fee * n);
      rows.forEach((r, i) => (r.note = i === win ? '🎫当たり！' : 'はずれ'));
      tell(`${ps[win].name}のクラスが当たり！（+${e.fee * n}）`, win);
      break;
    }
    // 近代：全校で一番の子（同点なら全員）が受賞。その子のクラスに+win（1クラス1回まで）
    case 'prize': {
      const champs = ps.map((p) => bestOf(p, p.students, c.attr));
      const hi = Math.max(0, ...champs.map((x) => x?.pts ?? 0));
      champs.forEach((x, i) => {
        rows[i].count = x?.pts ?? 0;
        if (!x || x.pts !== hi) return;
        add(i, e.win);
        x.student.mvp++;
        moved.push(x.student);
        rows[i].note = '受賞';
        tell(`${ps[i].name}のクラスの${name(x.student)}が受賞！`, i);
        rows[i].uids = [x.student.uid];
      });
      break;
    }
  }
  const result = eraResult(s, c, rows, { students: moved });
  // 何も起きなかったときはカードの効果を出す
  return said.length ? { ...result, say: said.join(' ') } : result;
}

/** 火星人の侵略：空席のあるクラス全部に、アイコンのないエイリアンが1人ずつ転入する */
function resolveInvasion(s: GameState, c: ContestCard): EventResult {
  const aliens: Student[] = [];
  const rows = s.players.map((p, i): ResultRow => {
    if (p.students.length >= MAX_CLASS) return { player: i, delta: 0, note: '満席' };
    const st: Student = {
      uid: `u${s.uidCounter++}`,
      name: '火星人',
      title: 'エイリアン',
      era: 'future',
      rarity: 'N',
      icon: '👽',
      art: 'martian',
      attrs: [],
      flavor: '何もできない。ただ席に座っている。',
      joined: joinedLabel(s),
      mvp: 0,
    };
    p.students.push(st);
    aliens.push(st);
    return { player: i, delta: 0, note: '👽転入', uids: [st.uid] };
  });
  log(s, `【${c.name}】 空席のあるクラスにエイリアンが転入した。`);
  return { title: c.name, icon: c.icon, art: c.id, tone: 'era', era: c.era, desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows, students: aliens.slice(0, 1) };
}

/** 機械の子：機械の人物・サイボーグ・機械のグッズ（スマホ・タブレット・電脳チップ）を装備した子 */
export function isMachine(x: Student): boolean {
  return x.art === 'cyborg' || (x.goods !== undefined && MACHINE_GOODS.includes(x.goods.id)) || (x.cardId !== undefined && CARD_MAP[x.cardId]?.tags.includes('機械') === true);
}

/** サイボーグ化の対象（自分のクラスの子。もうサイボーグの子は除く） */
export function cyborgable(p: Player): Student[] {
  return p.students.filter((x) => x.art !== 'cyborg');
}

/** 襲来（時代イベント・全クラス）：👊の合計 − 敵の強さ */
function resolveRaid(s: GameState, c: RaidCard): EventResult {
  const rows = s.players.map((p, i): ResultRow => {
    const sc = attrScore(p, 'fight');
    const delta = sc.total - c.threat;
    p.points += delta;
    if (delta >= 0) sc.holders.forEach((h) => h.mvp++);
    return { player: i, count: sc.total, delta, note: delta >= 0 ? '撃退' : sc.total ? '突破' : '無防備', uids: sc.holders.map((h) => h.uid) };
  });
  sortRows(rows);
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, art: c.id, attr: 'fight', tone: 'era', era: c.era, threat: c.threat, desc: `敵の強さ ${c.threat}`, rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows };
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
  return { title: f.name, icon: f.icon, attr: f.rule === 'test' ? 'study' : 'all', tone: 'fixed', desc: '', rule: fixedRule(f), glyph: fixedGlyph(f), say: fixedShort(f), rows };
}

function setResult(s: GameState, pi: number | null, result: EventResult, ctx: ResultCtx) {
  s.phase = { kind: 'result', player: pi, result, ctx };
}

/** 転校で外せる生徒（係に就いていない子。定員の下限まで減っていたら外せない） */
export function droppable(p: Player): Student[] {
  return p.students.length <= MIN_CLASS ? [] : p.students.filter((x) => roleOf(p, x.uid) === null);
}

/** クラス替えでもらえる生徒（係に就いていない子） */
export function tradeable(p: Player): Student[] {
  return p.students.filter((x) => roleOf(p, x.uid) === null);
}

/** クラス替えできる組み合わせ：自分の生徒と、他のクラスの係に就いていない生徒で、印刷されたアイコンの数が同じ子どうし */
export function exchangePairs(s: GameState, pi: number): { uid: string; target: number; theirUid: string }[] {
  const me = s.players[pi];
  return s.players
    .filter((p) => p.id !== pi)
    .flatMap((p) => tradeable(p).flatMap((x) => me.students.filter((m) => baseIcons(m) === baseIcons(x)).map((m) => ({ uid: m.uid, target: p.id, theirUid: x.uid }))));
}

/** クラス替えの相手（交換できる組み合わせがあるクラス） */
export function exchangeTargets(s: GameState, pi: number): number[] {
  return [...new Set(exchangePairs(s, pi).map((x) => x.target))];
}

/** グッズを装備できる生徒（まだ何も装備していない子） */
export function equippable(p: Player): Student[] {
  return p.students.filter((x) => !x.goods);
}

/** カチコミの相手 */
export function kachikomiTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi).map((p) => p.id);
}

/** 次に手番をする人（この月の手番がもう残っていなければ null） */
export function nextTurnPlayer(s: GameState): number | null {
  return s.queueIdx + 1 < s.queue.length ? s.queue[s.queueIdx + 1] : null;
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
  // ゲリラの結果は誰の手番のものでもない
  setResult(
    s,
    null,
    {
      title: '転校',
      icon: '📦',
      tone: 'personal',
      desc: gone.length ? `${gone.map((x) => x.icon + x.name).join('・')} が転校していった。` : 'どのクラスも転校させられる子がいなかった。',
      rule: cardRule(EVENT_MAP.push), glyph: cardGlyph(EVENT_MAP.push), say: shortRule(EVENT_MAP.push),
      rows: [],
      students: gone,
      outUids: gone.map((x) => x.uid),
    },
    'turn',
  );
}

function popCard(s: GameState): string | undefined {
  if (s.eventDeck.length === 0) {
    if (s.discard.length === 0) return undefined;
    s.eventDeck = shuffle(s, s.discard);
    s.discard = [];
    log(s, '捨て札をシャッフルして山札に戻した。');
  }
  return s.eventDeck.pop();
}

const isPerson = (id: string) => id.startsWith('person:');
const personId = (id: string) => id.slice('person:'.length);
/** 人物カードの子がまだ誰のクラスにもいないか */
const available = (s: GameState, id: string) => s.pools[eraOfId(personId(id))].includes(personId(id));
/** 場に並べるとその場で起こるカードか */
const guerrilla = (id: string) => !isPerson(id) && isGuerrilla(EVENT_MAP[id]);

/** 人物カードの子を見せる用に作る（クラスには入れない。現代の生徒は名前の代わりに肩書きを出す） */
export function previewStudent(id: string): Student {
  const pid = personId(id);
  if (isModernCard(pid)) {
    const a = ARCHETYPE_MAP[archetypeOf(pid)];
    return { uid: `preview:${pid}`, cardId: pid, name: a.title, title: a.title, era: 'present', rarity: a.rarity, icon: a.icon, art: a.id, attrs: toIcons(a.attrs, a.rarity, a.power), flavor: a.flavor, joined: '', mvp: 0 };
  }
  const c = CARD_MAP[pid];
  return { uid: `preview:${pid}`, cardId: pid, name: c.name, title: c.title, era: c.era, rarity: c.rarity, icon: c.icon, art: pid, attrs: [...c.attrs], flavor: c.flavor, joined: '', mvp: 0 };
}

/** 場のカードを取るのに払うクラスポイント */
export function marketCost(id: string): number {
  return isPerson(id) ? personCost(baseIcons(previewStudent(id))) : eventCost(EVENT_MAP[id]);
}

/** 学期の頭に場を並べる（この時はゲリラは起こさず、山札の一番下に戻す） */
function fillMarket(s: GameState) {
  for (let guard = s.eventDeck.length; s.market.length < MARKET_SIZE && guard > 0; guard--) {
    const id = s.eventDeck.pop();
    if (!id) break;
    if (guerrilla(id)) s.eventDeck.unshift(id);
    else s.market.push(id);
  }
}

/** 手番の終わりに場を補充する。ゲリラをめくったらその場で起こし、結果を見せてから続きを補充する */
function refill(s: GameState) {
  const pi = s.queue[s.queueIdx];
  while (s.market.length < MARKET_SIZE) {
    const id = popCard(s);
    if (!id) break;
    if (isPerson(id) && !available(s, id)) {
      s.discard.push(id);
      continue;
    }
    if (guerrilla(id)) {
      s.discard.push(id);
      fireGuerrilla(s, pi, id);
      return;
    }
    s.market.push(id);
  }
  endTurn(s);
}

/** ゲリラ（共通イベント・時代イベント・襲来・転校） */
function fireGuerrilla(s: GameState, pi: number, id: string) {
  const c = EVENT_MAP[id];
  log(s, `ゲリラ発生！ ${c.icon}${c.name}`);
  switch (c.kind) {
    // ゲリラは誰の手番でもない学校全体のできごと（めくった人のものとして見せない）
    case 'swing':
      setResult(s, null, resolveSwing(s, c), 'turn');
      return;
    case 'contest':
      setResult(s, null, resolveContest(s, c), 'turn');
      return;
    case 'raid':
      setResult(s, null, resolveRaid(s, c), 'turn');
      return;
    case 'push':
      startDrop(s, pi);
      return;
  }
}

/** その場のカードを今取れるか（ポイントが足りる・装備できる子や交換できる相手がいる） */
export function canTake(s: GameState, pi: number, slot: number): boolean {
  const id = s.market[slot];
  if (!id) return false;
  const p = s.players[pi];
  const cost = marketCost(id);
  if (cost > 0 && p.points < cost) return false;
  if (isPerson(id)) return p.students.length < MAX_CLASS || droppable(p).length > 0;
  const c = EVENT_MAP[id];
  switch (c.kind) {
    case 'normal':
      return true;
    case 'goods':
      return equippable(p).length > 0;
    case 'cyborg':
      return cyborgable(p).length > 0;
    case 'exchange':
      return exchangePairs(s, pi).length > 0;
    case 'kachikomi':
      return attrScore(p, 'fight').total > 0;
    default:
      return false;
  }
}

/** 場からカードを抜く（取ったカードは捨て札へ。グッズは装備するので捨て札には行かない） */
function takeFromMarket(s: GameState, slot: number, discard = true): string {
  const [id] = s.market.splice(slot, 1);
  if (discard && !isPerson(id)) s.discard.push(id);
  return id;
}

/** 人物カードを買う：ポイントを払って転入 */
function buyPerson(s: GameState, pi: number, slot: number, gone?: Student) {
  const p = s.players[pi];
  const id = takeFromMarket(s, slot);
  const cost = marketCost(id);
  p.points -= cost;
  const st = fromPoolId(s, personId(id), joinedLabel(s));
  addStudent(s, p, st);
  log(s, `${p.name}のクラスに${st.name}が転入！（−${cost}点）`, pi);
  const desc = `${st.icon}${st.name}がやってきた！（−${cost}点）${gone ? ` 入れ替わりに${gone.icon}${gone.name}が転校していった。` : ''}`;
  setResult(s, pi, { title: '転入', icon: '🚪', tone: 'personal', desc, rows: [{ player: pi, delta: -cost, note: 'スカウト' }], students: gone ? [st, gone] : [st], outUids: gone ? [gone.uid] : undefined }, 'turn');
}

/** 手番：場のカードを1枚取る */
function takeCard(s: GameState, pi: number, slot: number) {
  const id = s.market[slot];
  if (isPerson(id)) {
    if (s.players[pi].students.length >= MAX_CLASS) s.phase = { kind: 'makeRoom', player: pi, slot };
    else buyPerson(s, pi, slot);
    return;
  }
  const c = EVENT_MAP[id];
  switch (c.kind) {
    case 'normal':
      takeFromMarket(s, slot);
      setResult(s, pi, resolveNormal(s, c, pi), 'turn');
      return;
    case 'goods':
      s.phase = { kind: 'equip', player: pi, card: id, slot };
      return;
    case 'cyborg':
      s.phase = { kind: 'cyborg', player: pi, slot };
      return;
    case 'exchange':
      s.phase = { kind: 'exchange', player: pi, slot };
      return;
    case 'kachikomi':
      s.phase = { kind: 'kachikomi', player: pi, slot };
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
          refill(s);
          break;
        case 'hatch':
          if (ph.player !== null) s.phase = { kind: 'draw', player: ph.player };
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
    case 'take': {
      if (ph.kind !== 'draw' || !canTake(s, ph.player, a.slot)) return prev;
      takeCard(s, ph.player, a.slot);
      return s;
    }
    case 'pass': {
      if (ph.kind !== 'draw' || !s.market[a.slot]) return prev;
      const id = s.market.splice(a.slot, 1)[0];
      s.discard.push(id);
      log(s, `${s.players[ph.player].name}は${isPerson(id) ? previewStudent(id).name : EVENT_MAP[id].name}のカードを捨てて見送った。`, ph.player);
      refill(s);
      return s;
    }
    case 'makeRoom': {
      if (ph.kind !== 'makeRoom') return prev;
      if (a.uid === null) {
        s.phase = { kind: 'draw', player: ph.player };
        return s;
      }
      const p = s.players[ph.player];
      if (!droppable(p).some((x) => x.uid === a.uid)) return prev;
      const gone = removeStudent(s, p, a.uid, false)!;
      log(s, `${p.name}のクラスの${gone.name}が転校していった。`, ph.player);
      buyPerson(s, ph.player, ph.slot, gone);
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
        s.phase = { kind: 'draw', player: ph.player };
        return s;
      }
      if (!kachikomiTargets(s, ph.player).includes(a.target)) return prev;
      takeFromMarket(s, ph.slot);
      const sc = attrScore(p, 'fight');
      const damage = sc.total * KACHIKOMI_CARDS[0].mult;
      const to = s.players[a.target];
      to.points -= damage;
      sc.holders.forEach((h) => h.mvp++);
      const rows: ResultRow[] = [
        { player: ph.player, count: sc.total, delta: 0, note: 'カチコミ', uids: sc.holders.map((h) => h.uid) },
        { player: a.target, delta: -damage, note: '被害' },
      ];
      logRows(s, `カチコミ（${p.name}→${to.name}）`, rows);
      setResult(
        s,
        ph.player,
        { title: 'カチコミ', icon: '👊', attr: 'fight', tone: 'personal', desc: `${to.name}のクラスに殴りこんだ！`, rule: EVENT_RULE.kachikomi, glyph: cardGlyph(KACHIKOMI_CARDS[0]), say: shortRule(KACHIKOMI_CARDS[0]), rows },
        'turn',
      );
      return s;
    }
    case 'exchange': {
      if (ph.kind !== 'exchange') return prev;
      const p = s.players[ph.player];
      if (a.uid === null) {
        s.phase = { kind: 'draw', player: ph.player };
        return s;
      }
      if (!exchangePairs(s, ph.player).some((x) => x.uid === a.uid && x.target === a.target && x.theirUid === a.theirUid)) return prev;
      const to = s.players[a.target!];
      takeFromMarket(s, ph.slot);
      const mine = removeStudent(s, p, a.uid, false)!;
      const theirs = removeStudent(s, to, a.theirUid!, false)!;
      p.students.push(theirs);
      to.students.push(mine);
      log(s, `${p.name}の${mine.name}と${to.name}の${theirs.name}がクラス替え！`, ph.player);
      setResult(
        s,
        ph.player,
        { title: 'クラス替え', icon: '🔁', tone: 'personal', desc: `${mine.icon}${mine.name} ⇄ ${theirs.icon}${theirs.name}（${to.name}）`, rows: [], students: [theirs, mine], outUids: [mine.uid] },
        'turn',
      );
      return s;
    }
    case 'cyborg': {
      if (ph.kind !== 'cyborg') return prev;
      if (a.uid === null) {
        s.phase = { kind: 'draw', player: ph.player };
        return s;
      }
      const owner = s.players[ph.player];
      const st = cyborgable(owner).find((x) => x.uid === a.uid);
      if (!st) return prev;
      owner.points -= marketCost(takeFromMarket(s, ph.slot));
      const was = `${st.icon}${st.name}`;
      // 元のカードに覆いかぶさる：同じ席（uid・係）のまま中身だけ入れ替わり、元のカードは消える
      Object.assign(st, {
        cardId: undefined,
        name: 'サイボーグ',
        title: '改造人間',
        era: 'future',
        rarity: 'R',
        icon: '🦾',
        art: 'cyborg',
        attrs: [...CYBORG_ATTRS],
        flavor: `もとは${st.name}だった。`,
        goods: undefined,
      } satisfies Partial<Student>);
      log(s, `${owner.name}のクラスの${was}がサイボーグになった！`, ph.player);
      setResult(
        s,
        ph.player,
        { title: 'サイボーグ化', icon: '🦾', art: 'cyborg', tone: 'personal', desc: `${was}がサイボーグになった！`, rule: cardRule(EVENT_MAP.cyborg), glyph: cardGlyph(EVENT_MAP.cyborg), say: shortRule(EVENT_MAP.cyborg), rows: [], students: [st] },
        'turn',
      );
      return s;
    }
    case 'equip': {
      if (ph.kind !== 'equip') return prev;
      const p = s.players[ph.player];
      const c = EVENT_MAP[ph.card] as GoodsCard;
      if (a.uid === null) {
        s.phase = { kind: 'draw', player: ph.player };
        return s;
      }
      const st = equippable(p).find((x) => x.uid === a.uid);
      if (!st) return prev;
      p.points -= marketCost(takeFromMarket(s, ph.slot, false));
      st.goods = { id: c.id, name: c.name, icon: c.icon, attr: c.attr };
      st.attrs = [...st.attrs, c.attr];
      log(s, `${p.name}のクラスの${st.name}が${c.icon}${c.name}を装備した。`, ph.player);
      setResult(
        s,
        ph.player,
        { title: c.name, icon: c.icon, attr: c.attr, tone: 'personal', desc: `${st.icon}${st.name}が装備した！`, rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows: [], students: [st] },
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
  /** 場に表向きで並んでいる枚数 */
  open: number;
  /** 捨て札にある枚数 */
  used: number;
}

/** 今学期の山札の内訳（山札の残り・場・捨て札）。人物カードは1行にまとめる */
export function deckBreakdown(s: GameState): DeckRow[] {
  const era = ERAS[currentEra(s)];
  const rows = new Map<string, DeckRow>();
  const row = (key: string, init: () => Omit<DeckRow, 'left' | 'open' | 'used'>) => {
    if (!rows.has(key)) rows.set(key, { ...init(), left: 0, open: 0, used: 0 });
    return rows.get(key)!;
  };
  const define = (id: string) => {
    if (isPerson(id)) return row('person', () => ({ group: '人物', icon: era.icon, name: `${era.name}の生徒（転入）` }));
    const c = EVENT_MAP[id];
    return row(id, (): Omit<DeckRow, 'left' | 'open' | 'used'> => {
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
        case 'cyborg':
          return { ...base, group: '時代イベント' };
        case 'contest':
          return { ...base, name: c.attr === 'all' ? c.name : `${c.name}（${ATTR_ICON[c.attr]}）`, group: '時代イベント' };
        case 'raid':
          return { ...base, name: `${c.name}（強さ${c.threat}）`, group: '時代イベント' };
      }
    });
  };
  // 並び順を固定するため、まず今学期に入りうるカードを全部登録しておく
  for (const e of ALL_EVENT_CARDS) if (!cardEra(e) || cardEra(e) === era.id) define(e.id);
  for (const id of s.eventDeck) define(id).left++;
  for (const id of s.market) define(id).open++;
  for (const id of s.discard) define(id).used++;
  return [...rows.values()].filter((r) => r.group !== '人物' || r.left + r.open + r.used > 0);
}
