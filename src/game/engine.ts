import { MAX_CLASS, MIN_CLASS, STARTING_MEMBERS, attrScore, baseIcons, contributions, counted, iconsOf, ranks, roleOf, roleSlots, termNo, testScore, totalPower, validRoles, validUnlock, type AttrScore } from './calc';
import { CARDS, CARD_MAP, EGG_DINOS, KONGMING, toIcons } from './data/cards';
import { ERAS } from './data/eras';
import { BENKEI } from './data/cards';
import { KAGUYA_TREASURES } from './data/events';
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
  GIFT_MAP,
  NEW_WORLD_GOODS,
  TEPPO_GOODS,
  PERSON_CARDS_PER_TERM,
  TEST_YANKEE_PENALTY,
  cardEra,
  personCost,
  cardRule,
  eventCost,
  eventScale,
  fixedRule,
  isGuerrilla,
  kachikomiDrain,
  kachikomiHit,
  cardGlyph,
  fixedGlyph,
  fixedShort,
  scaleCard,
  shortRule,
  type ContestCard,
  type EraEffect,
  type EventCard,
  type FixedEvent,
  type GoodsCard,
  type NormalCard,
  type SwingCard,
} from './data/events';
import { ARCHETYPE_MAP, BOY_NAMES, GIRL_NAMES, MODERN_POOL, STARTER_POOL, SURNAMES, archetypeOf, isModernCard, type Archetype } from './data/modern';
import { ROLES } from './data/roles';
import { SAVE_VERSION } from './saveVersion';
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

/** 学期に巡ってくる時代（現代もほかの時代と並列に扱う） */
export const ALL_ERAS = ERAS.map((_, i) => i);
/** 手番のある月（8月の夏休みは飛ばす） */
export const MONTHS = [4, 5, 6, 7, 9, 10, 11, 12, 1, 2, 3];
export const PLAYER_COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#da77f2'];

export function termOfMonth(m: number): number {
  if (m >= 4 && m <= 7) return 1;
  if (m === 8) return 0;
  if (m >= 9) return 2;
  return 3;
}

/** 今の学期の、時代イベントの数字の倍率 */
export function eventScaleNow(s: GameState): number {
  return eventScale(termNo(s.year, termOfMonth(MONTHS[Math.min(s.monthIdx, MONTHS.length - 1)])));
}

/** 今の学期の倍率をかけたカード（時代イベントだけ数字が変わる） */
export function eventCard(s: GameState, id: string): EventCard {
  return scaleCard(EVENT_MAP[id], eventScaleNow(s));
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
    version: SAVE_VERSION,
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
  drawYearEras(s);
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
    startTerm(s, true);
  } else {
    s.phase = { kind: 'memberDraw', player: next, last };
  }
}

// ---------- 時代と山札 ----------

/** その年の3学期ぶんの時代をランダムに決める（ゲーム中はなるべく被らない） */
function drawYearEras(s: GameState) {
  s.yearEras = [];
  while (s.yearEras.length < 3) {
    if (s.eraDeck.length === 0) s.eraDeck = shuffle(s, [...ALL_ERAS]);
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
    // ピラミッドは山札に入らず、場の横に残る（setupPyramid）
    if (isPyramidCard(e)) continue;
    for (let i = 0; i < e.count; i++) deck.push(e.id);
  }
  const figures = shuffle(s, [...s.pools[era]]).slice(0, PERSON_CARDS_PER_TERM);
  for (const id of figures) deck.push(`person:${id}`);
  return shuffle(s, deck);
}

// ---------- 進行 ----------

/** 手番の順：学期の間は固定。ゲームの最初はランダム、以降は学期ごとに得点の低い順（最下位から。同点はランダム） */
function termOrder(s: GameState, first: boolean): number[] {
  const ids = shuffle(s, s.players.map((_, i) => i));
  return first ? ids : ids.sort((a, b) => s.players[a].points - s.players[b].points);
}

/** 今の学期の手番の順（学期の間は変わらない） */
function order(s: GameState): number[] {
  return s.queue;
}

function startTerm(s: GameState, first = false) {
  kaguyaLeaves(s);
  patentExpires(s);
  s.queue = termOrder(s, first);
  s.queueIdx = 0;
  const t = termOfMonth(MONTHS[s.monthIdx]);
  const era = ERAS[currentEra(s)];
  log(s, `${t}学期スタート！今学期の時代は${era.name} —「${era.motto}」`);
  log(s, `今学期の手番順（${first ? 'ランダム' : '最下位から'}）：${s.queue.map((i) => s.players[i].name).join(' → ')}`);
  s.eventDeck = buildDeck(s);
  s.discard = [];
  s.market = [];
  fillMarket(s);
  placeEraEvents(s);
  setupPyramid(s);
  s.phase = { kind: 'roles', player: null, ready: s.players.map(() => false) };
}

/** 時代イベントを入れる深さ：学期の手番の数のこの倍まで（1より大きいほど、めくられないカードが出やすい） */
export const ERA_EVENT_SPREAD = 1.8;

/**
 * 時代イベント（4種×1枚）は山札の上のほうに、学期を等分した区間に1枚ずつ散らして入れる。
 * 手番1回で山札は1枚以上めくられるので、1枚目は必ず、残りもたいていめくられる
 * （古代エジプトはピラミッドを積む手番で山札がめくられないので、半分の深さまでにする）
 */
function placeEraEvents(s: GameState) {
  const isEra = (id: string) => !isPerson(id) && EVENT_MAP[id].kind === 'contest';
  const cards = shuffle(s, s.eventDeck.filter(isEra));
  if (!cards.length) return;
  s.eventDeck = s.eventDeck.filter((id) => !isEra(id));
  const term = termOfMonth(MONTHS[s.monthIdx]);
  const months = MONTHS.slice(s.monthIdx).filter((m) => termOfMonth(m) === term).length;
  const turns = Math.max(cards.length, Math.floor((s.players.length * months) / (pyramidCard(s) ? 2 : 1)));
  const slice = (turns * ERA_EVENT_SPREAD) / cards.length;
  // 深さ（0 なら次にめくるカード）。i枚目は i 番目の区間に。浅いカードが上に i 枚入るので、その分を引いておく
  const depths = cards.map((_, i) => {
    const lo = Math.max(0, Math.floor(slice * i) - i);
    const hi = Math.max(lo, Math.floor(slice * (i + 1)) - i - 1);
    return Math.min(s.eventDeck.length, lo + randInt(s, hi - lo + 1));
  });
  // 深いほうから入れて、浅いほうの位置がずれないようにする
  for (let i = cards.length - 1; i >= 0; i--) s.eventDeck.splice(s.eventDeck.length - depths[i], 0, cards[i]);
}

// ---------- ピラミッド（古代エジプトの学期だけ、場の横に残る） ----------

/** 場の横に残るピラミッドのカード（ギザの大ピラミッド建設） */
export function isPyramidCard(c: EventCard): c is ContestCard & { effect: Extract<EraEffect, { type: 'pyramid' }> } {
  return c.kind === 'contest' && c.effect.type === 'pyramid';
}

/** 今学期の時代のピラミッドのカード（なければ undefined） */
export function pyramidCard(s: GameState): (ContestCard & { effect: Extract<EraEffect, { type: 'pyramid' }> }) | undefined {
  const era = ERAS[currentEra(s)].id;
  const c = ALL_EVENT_CARDS.filter(isPyramidCard).find((x) => x.era === era);
  return c && scaleCard(c, eventScaleNow(s));
}

/** 学期の頭：前の学期のピラミッドは（完成していなくても）なくなり、ピラミッドのある時代なら新しく建て始める */
function setupPyramid(s: GameState) {
  const old = s.pyramid;
  if (old && !old.done && old.stones.some((x) => x > 0)) log(s, `ピラミッドは完成しないまま学期が終わった。積んだ石はむだになった。`);
  delete s.pyramid;
  const c = pyramidCard(s);
  if (c) s.pyramid = { stones: s.players.map(() => 0), need: c.effect.need * s.players.length, done: false };
}

/** 今ピラミッドに石を積めるか（手番で、完成前で、🏃を持つ子がいる） */
export function canBuild(s: GameState, pi: number): boolean {
  return s.phase.kind === 'draw' && s.phase.player === pi && !!s.pyramid && !s.pyramid.done && attrScore(s.players[pi], 'sports').total > 0;
}

/** 積んだ石の数に応じたほうび（届いた一番上の段。足切りに届かなければ0） */
export function pyramidReward(steps: [number, number][], stones: number): number {
  return steps.reduce((best, [n, w]) => (stones >= n ? Math.max(best, w) : best), 0);
}

/** ピラミッドに石を積む。届いたら完成して、積んだクラスにほうび */
function build(s: GameState, pi: number) {
  const c = pyramidCard(s)!;
  const py = s.pyramid!;
  const p = s.players[pi];
  const sc = attrScore(p, c.attr);
  py.stones[pi] += sc.total;
  sc.holders.forEach((h) => h.mvp++);
  const sum = py.stones.reduce((a, x) => a + x, 0);
  log(s, `${p.name}のクラスがピラミッドに石を${sc.total}個積んだ。（${sum}／${py.need}）`, pi);
  const base = { title: c.name, icon: c.icon, art: c.id, attr: c.attr, tone: 'era' as const, era: c.era, desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c) };
  if (sum < py.need) {
    setResult(s, pi, { ...base, say: `石を${sc.total}個積んだ。完成まであと${py.need - sum}個。`, rows: [{ player: pi, count: sc.total, delta: 0, note: `石${sc.total}個`, uids: sc.holders.map((h) => h.uid) }] }, 'turn');
    return;
  }
  // 完成：積んだ石が届いた一番上の段のほうび（足切りに届かないクラスは0）
  py.done = true;
  const rows: ResultRow[] = s.players.map((q, i) => {
    const n = py.stones[i];
    const delta = pyramidReward(c.effect.steps, n);
    q.points += delta;
    return { player: i, count: n, delta, note: n === 0 ? '積まず' : delta ? `石${n}個` : `石${n}個 足りず`, uids: i === pi ? sc.holders.map((h) => h.uid) : [] };
  });
  const say = `ピラミッド完成！ 最後の石を積んだのは${p.name}のクラス。`;
  log(s, say, pi);
  setResult(s, pi, { ...eraResult(s, c, rows), ...base, say }, 'turn');
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
  const desc = eggs.map((x) => x.name).join('・');
  log(s, `${p.name}のクラスで卵が孵った！ ${desc}`, pi);
  setResult(s, pi, { title: '卵が孵った！', icon: '🥚', tone: 'personal', desc: eggs.length > 1 ? `恐竜が${eggs.length}匹生まれた！` : '恐竜が生まれた！', rows: [{ player: pi, delta: 0, note: '孵化', uids: eggs.map((x) => x.uid) }], students: eggs }, 'hatch');
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
  // 桃園の誓い：学期の区切りの前に山分けを見せる（次へで、もう一度ここに来て先へ進む）
  if (s.oath && termBreakNext(s)) {
    settleOath(s);
    return;
  }
  // ゴッホのひまわり：学期の区切りの前に、飾った絵の値打ちを見せる（次へで、もう一度ここに来て先へ進む）
  if (s.sunflower && termBreakNext(s)) {
    settleSunflower(s);
    return;
  }
  s.monthIdx++;
  if (s.monthIdx >= MONTHS.length) {
    yearEnd(s);
    return;
  }
  const m = MONTHS[s.monthIdx];
  if (m === 9 || m === 1) {
    curePlague(s);
    startTerm(s);
  } else startTurns(s);
}

// ---------- 近代：電球の特許とゴッホのひまわり ----------

/** 電球の特許：特許をとったクラス以外が授業カードを取ったら、特許料を払う（結果に1行足す） */
function payPatent(s: GameState, pi: number, r: EventResult): EventResult {
  const holder = s.patent;
  if (holder === undefined || holder === pi) return r;
  const c = eventCard(s, 'patent') as ContestCard;
  // 払える分だけ払う（点は0未満にならない）
  const fee = -addPoints(s.players[pi], c.effect.type === 'patent' ? -c.effect.fee : 0);
  s.players[holder].points += fee;
  const say = `特許料：${s.players[pi].name}のクラスから${s.players[holder].name}のクラスへ${fee}点。`;
  log(s, say, pi);
  const rows = r.rows.map((x) => (x.player === pi ? { ...x, delta: x.delta - fee, note: `特許料−${fee}` } : x));
  return { ...r, say: `${r.say ?? ''} ${say}`.trim(), rows: [...rows, { player: holder, delta: fee, note: `特許料+${fee}` }] };
}

/** 学期の頭：前の学期の特許は切れる */
function patentExpires(s: GameState) {
  if (s.patent === undefined) return;
  log(s, `${s.players[s.patent].name}のクラスの電球の特許が切れた。`);
  delete s.patent;
}

/** ゴッホのひまわり：学期の区切りに、飾った絵の値打ちが出る（描いた子がまだクラスにいれば、描いたときの点×per） */
function settleSunflower(s: GameState) {
  const paintings = s.sunflower!;
  delete s.sunflower;
  const c = EVENT_MAP.sunflower as ContestCard;
  const per = c.effect.type === 'sunflower' ? c.effect.per : 0;
  const shown: Student[] = [];
  const rows: ResultRow[] = paintings.map(({ player, uid, pts }) => {
    const p = s.players[player];
    const st = p.students.find((x) => x.uid === uid);
    if (!st) return { player, count: pts, delta: 0, note: '描いた子が転校して、絵も行方知れず' };
    const delta = pts * per;
    p.points += delta;
    st.mvp++;
    shown.push(st);
    return { player, count: pts, delta, note: '絵が値上がり', uids: [uid] };
  });
  sortRows(rows);
  logRows(s, `${c.name}の値打ち`, rows);
  const say = '学期が終わり、飾っていたひまわりの絵に値打ちが出た！';
  log(s, say);
  setResult(s, null, { title: `${c.name}の値打ち`, icon: c.icon, art: c.id, tone: 'era', era: c.era, desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c), say, rows, students: shown }, 'sunflower');
}

/** 次の月から新しい学期（または次の学年）になるか */
function termBreakNext(s: GameState): boolean {
  const i = s.monthIdx + 1;
  return i >= MONTHS.length || MONTHS[i] === 9 || MONTHS[i] === 1;
}

/** 桃園の誓いの山分け：誓ってから義兄弟のクラスが得た点・失った点を合わせて、同じだけ分ける（割り切れない分はポイントの少ないクラスから1点ずつ） */
function settleOath(s: GameState) {
  const oath = s.oath!;
  delete s.oath;
  const ps = s.players;
  const gains = oath.players.map((pi, k) => ps[pi].points - oath.base[k]);
  const total = gains.reduce((a, g) => a + g, 0);
  const share = Math.floor(total / oath.players.length);
  let rest = total - share * oath.players.length;
  const extra = new Set<number>();
  for (const pi of [...oath.players].sort((x, y) => ps[x].points - ps[y].points || x - y)) {
    if (rest-- <= 0) break;
    extra.add(pi);
  }
  const rows: ResultRow[] = oath.players.map((pi, k) => {
    const after = Math.max(0, oath.base[k] + share + (extra.has(pi) ? 1 : 0));
    const delta = after - ps[pi].points;
    ps[pi].points = after;
    return { player: pi, count: gains[k], delta, note: `稼ぎ${gains[k] >= 0 ? '+' : ''}${gains[k]} → 山分け` };
  });
  const c = EVENT_MAP.taoyuan as ContestCard;
  sortRows(rows);
  logRows(s, `${c.name}の山分け`, rows);
  const say = `義兄弟の稼ぎは合わせて${total >= 0 ? '+' : ''}${total}点。${oath.players.map((pi) => ps[pi].name).join('・')}のクラスで山分けした。`;
  log(s, say);
  setResult(s, null, { title: `${c.name}の山分け`, icon: c.icon, art: c.id, tone: 'era', era: c.era, desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c), say, rows }, 'oath');
}

/** 学期の区切り：ペストにかかっていた子が治る */
function curePlague(s: GameState) {
  const sick = s.players.flatMap((p) => p.students.filter((x) => x.plague));
  if (!sick.length) return;
  for (const x of sick) delete x.plague;
  log(s, `ペストが治まった。${sick.map((x) => x.name).join('・')}が元気になった。`);
}

function yearEnd(s: GameState) {
  curePlague(s);
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
    const delta = addPoints(p, Math.round((table[rk[i]] ?? 0) * mult));
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
    const delta = addPoints(p, c.per ? plus.holders.length * c.per : plus.total - minus.total);
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
    case 'ostracism':
      // 陶片追放は投票の場面を挟むので fireGuerrilla で始める（ここには来ない）
      throw new Error('ostracism starts a vote');
    case 'newworld':
    case 'teppo':
      // 品を選ぶ番が順に回るので、ゲリラの側で始める（fireGuerrilla → startGift）
      throw new Error(`${e.type} is started by startGift`);
    case 'oath':
      // 義兄弟を選ぶ場面を挟むので、ゲリラの側で始める（fireGuerrilla → startOath）
      throw new Error('oath is started by startOath');
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
  const has = (x: Student) => (c.attr === 'all' ? counted(x).length > 0 : counted(x).includes(c.attr) || (!!c.also && counted(x).includes(c.also)));
  const scores = s.players.map((p) => eraScore(p, c));
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
        delta = values[i] >= e.need ? e.win : e.lose ? -e.lose : 0;
        note = values[i] >= e.need ? '成功' : '失敗';
        break;
      case 'battle': {
        // 順位：自分より多いクラスの数＋1（同点は同じ順位）。1位と最下位が先、2位はその次
        const rank = values.filter((v) => v > values[i]).length + 1;
        const p = best === worst ? 0 : rank === 1 ? 1 : values[i] === worst ? -1 : rank === 2 ? 2 : 3;
        delta = p === 1 ? e.win : p === 2 ? e.second : p === -1 && e.lose ? -e.lose : 0;
        note = best === worst ? '引き分け' : p === -1 ? '最下位' : `${rank}位`;
        if (best !== worst) place = rank - 1;
        break;
      }
    }
    delta = addPoints(p, delta);
    if (delta > 0) holders.filter(has).forEach((h) => h.mvp++);
    return { player: i, count, rank: place, delta, note, uids: holders.map((h) => h.uid) };
  });
  // 2つのアイコンを合わせて数えるカードは、1つのアイコンの得点演出が合わないので出さない
  const perHead = e.type === 'heads' || e.type === 'disaster' ? e.per : undefined;
  return eraResult(s, c, rows, { attr: c.also ? undefined : c.attr, perHead });
}

/** 時代イベントで数えるアイコンの点（also があれば attr と合わせて数える） */
function eraScore(p: Player, c: ContestCard): AttrScore {
  const a = attrScore(p, c.attr);
  if (!c.also) return a;
  const b = attrScore(p, c.also);
  return { sum: a.sum + b.sum, bonus: a.bonus + b.bonus, total: a.total + b.total, holders: p.students.filter((x) => a.holders.includes(x) || b.holders.includes(x)) };
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
function resolveEraSpecial(s: GameState, c: ContestCard, e: Exclude<EraEffect, { type: 'heads' | 'tiers' | 'disaster' | 'threshold' | 'battle' | 'alien' | 'ostracism' | 'newworld' | 'teppo' }>): EventResult {
  const ps = s.players;
  const n = ps.length;
  const rows: ResultRow[] = ps.map((_, i) => ({ player: i, delta: 0 }));
  /** 点を動かして結果に足す。実際に動いた点を返す（0未満にはならない） */
  const add = (i: number, d: number): number => {
    const moved = addPoints(ps[i], d);
    rows[i].delta += moved;
    return moved;
  };
  const scores = ps.map((p) => eraScore(p, c));
  const values = scores.map((x) => x.total);
  const best = Math.max(...values);
  const worst = Math.min(...values);
  /** 結果に並べる子 */
  const moved: Student[] = [];
  /** moved のうち、よそから転入してきた子（ほかはそのクラスにいたまま光るだけ） */
  const joined: string[] = [];
  const name = (x: Student) => x.name;
  /**
   * 起きたこと：ログには text（だれが・どの子が）を残し、めくったカードの横には short（一言）を出す。
   * 子の名前はカードに書いてあり、クラスごとの結果は明細に出るので、一言には名前を入れない（同じ一言は1回だけ）
   */
  const said: string[] = [];
  const tell = (text: string, pi?: number, short = text) => {
    log(s, text, pi);
    if (!said.includes(short)) said.push(short);
  };

  switch (e.type) {
    // 白亜紀：一番強いクラス（1クラスだけ）が、ポイントが一番多いクラスから点を奪う（自分がポイント1位なら何もしない）
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
      // 狙われるのは、ほかのクラスで一番ポイントが多いクラス（並んだら弱いほう）。狩る側がポイント1位なら、もう満腹で何もしない
      const lose = ps
        .map((_, i) => i)
        .filter((i) => i !== win)
        .sort((x, y) => ps[y].points - ps[x].points || values[x] - values[y])[0];
      if (ps[win].points >= ps[lose].points) {
        rows[win].note = '満腹';
        tell(`${ps[win].name}のクラスはもう満腹で、狩りをしなかった。`, win);
        break;
      }
      add(win, -add(lose, -e.amount));
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
      rows[win].note = '卵ゲット';
      rows[win].uids = [egg.uid];
      tell(`${ps[win].name}のクラスが恐竜の卵を持ち帰った！次の手番で孵る。`, win);
      break;
    }
    // エジプト：Xと also を両方持つ子（書記）1人につき +per
    case 'scribe': {
      const a = c.attr;
      const scribes = ps.map((p) => p.students.filter((x) => a !== 'all' && counted(x).includes(a) && counted(x).includes(e.also)));
      scribes.forEach((f, i) => {
        add(i, f.length * e.per);
        rows[i].count = f.length;
        rows[i].uids = f.map((x) => x.uid);
        rows[i].note = f.length ? `書記${f.length}人` : '書記なし';
        f.forEach((x) => x.mvp++);
      });
      const most = Math.max(...scribes.map((f) => f.length));
      if (most > 0) {
        const i = scribes.findIndex((f) => f.length === most);
        moved.push(...scribes[i]);
        tell(`${ps[i].name}のクラスの書記${most}人が、ヒエログリフを書き残した。`, i, '書記がヒエログリフを書き残した！');
      }
      break;
    }
    // エジプト：Xを持っていて、グッズを装備している子1人につき +per（副葬品）
    case 'burial': {
      const a = c.attr;
      const rich = ps.map((p) => p.students.filter((x) => x.goods && (a === 'all' || counted(x).includes(a))));
      rich.forEach((f, i) => {
        add(i, f.length * e.per);
        rows[i].count = f.length;
        rows[i].uids = f.map((x) => x.uid);
        rows[i].note = f.length ? `副葬品${f.length}つ` : '副葬品なし';
        f.forEach((x) => x.mvp++);
      });
      const most = Math.max(...rich.map((f) => f.length));
      if (most > 0) {
        const i = rich.findIndex((f) => f.length === most);
        moved.push(...rich[i]);
        tell(`${ps[i].name}のクラスのお墓に、${rich[i].map((x) => x.goods!.name).join('・')}が納められた。`, i, 'お墓に副葬品が納められた。');
      }
      break;
    }
    // ギリシャ：各クラスの、Xと also の合計が一番多い子が闘技場へ。1位（同点なら全員）は+win、負けたクラスと出せる子がいないクラスは−lose
    case 'arena': {
      const power = (p: Player, x: Student) => studentPts(p, x, c.attr) + studentPts(p, x, e.also);
      const champs = ps.map((p) => {
        let out: { student: Student; pts: number } | null = null;
        for (const x of p.students) {
          const pts = power(p, x);
          if (pts > 0 && (!out || pts > out.pts)) out = { student: x, pts };
        }
        return out;
      });
      const vs = champs.map((x) => x?.pts ?? 0);
      const hi = Math.max(...vs);
      champs.forEach((x, i) => {
        rows[i].count = vs[i];
        rows[i].uids = x ? [x.student.uid] : [];
      });
      // 全員同じ（だれも出せない場合も）なら引き分け
      if (hi === Math.min(...vs)) {
        rows.forEach((r) => (r.note = '引き分け'));
        break;
      }
      champs.forEach((x, i) => {
        if (x && x.pts === hi) {
          add(i, e.win);
          x.student.mvp++;
          moved.push(x.student);
          rows[i].note = '勝利';
          tell(`${ps[i].name}のクラスの${name(x.student)}が闘技場を制した！`, i, '闘技場を制した！');
        } else {
          add(i, -e.lose);
          rows[i].note = x ? '敗北' : '不戦敗';
        }
      });
      break;
    }
    // ギリシャ：各クラスのXが一番多い子が代表でソクラテスと対話。need 以上なら+win、届かない（代表がいない）と論破されて−lose
    case 'dialogue': {
      ps.forEach((p, i) => {
        const rep = bestOf(p, p.students, c.attr);
        rows[i].count = rep?.pts ?? 0;
        rows[i].uids = rep ? [rep.student.uid] : [];
        if (rep && rep.pts >= e.need) {
          add(i, e.win);
          rep.student.mvp++;
          moved.push(rep.student);
          rows[i].note = '対話成立';
          tell(`${p.name}のクラスの${name(rep.student)}が、ソクラテスと語り合った！`, i, 'ソクラテスと語り合った！');
        } else {
          add(i, -e.lose);
          rows[i].note = rep ? '論破された' : '代表なし';
        }
      });
      break;
    }
    // 三国志：Xが一番多いクラス（1クラスだけ。大船団）と、それ以外で📚が一番多いクラス（軍師。同じならポイントが少ないクラス）の勝負。軍師の📚が上回れば火攻め成功
    case 'fireattack': {
      const wits = ps.map((p) => attrScore(p, 'study').total);
      rows.forEach((r, i) => {
        r.count = values[i];
        r.uids = scores[i].holders.map((h) => h.uid);
      });
      const tops = values.flatMap((v, i) => (v === best ? [i] : []));
      if (best === 0 || tops.length > 1) {
        rows.forEach((r) => (r.note = 'にらみ合い'));
        tell('大船団が決まらず、にらみ合いに終わった。');
        break;
      }
      const fleet = tops[0];
      const sage = ps
        .map((_, i) => i)
        .filter((i) => i !== fleet)
        .sort((x, y) => wits[y] - wits[x] || ps[x].points - ps[y].points || x - y)[0];
      rows[sage].count = wits[sage];
      rows[sage].uids = attrScore(ps[sage], 'study').holders.map((h) => h.uid);
      if (wits[sage] > best) {
        add(fleet, -e.lose);
        add(sage, e.win);
        attrScore(ps[sage], 'study').holders.forEach((h) => h.mvp++);
        rows[fleet].note = '火攻めで敗北';
        rows[sage].note = '火攻め成功';
        tell(`${ps[sage].name}のクラスの知恵（📚${wits[sage]}）が、${ps[fleet].name}のクラスの大船団（${ATTR_ICON.fight}${best}）を火攻めで破った！`, sage);
      } else {
        add(fleet, e.win);
        add(sage, -e.fail);
        scores[fleet].holders.forEach((h) => h.mvp++);
        rows[fleet].note = '大船団の勝利';
        rows[sage].note = '火攻め失敗';
        tell(`${ps[fleet].name}のクラスの大船団（${ATTR_ICON.fight}${best}）が、${ps[sage].name}のクラスの火攻め（📚${wits[sage]}）をはね返した！`, fleet);
      }
      break;
    }
    // 三国志：ポイントが一番多いクラス（1クラスだけ）が追いかける。ほかの各クラスはXが一番多い子1人が橋に立ち、need 以上なら追いかけるクラスから take 点奪う。足りなければ −lose（追いかけるクラスは得をしない）
    case 'bridge': {
      if (c.attr === 'all') break;
      const a = c.attr;
      const hi = Math.max(...ps.map((p) => p.points));
      const chasers = ps.flatMap((p, i) => (p.points === hi ? [i] : []));
      if (chasers.length > 1) {
        rows.forEach((r) => (r.note = 'にらみ合い'));
        tell('追いかけるクラスが決まらず、にらみ合いに終わった。');
        break;
      }
      const chaser = chasers[0];
      rows[chaser].note = '追撃';
      ps.forEach((p, i) => {
        if (i === chaser) return;
        const guard = bestOf(p, p.students, a);
        rows[i].count = guard?.pts ?? 0;
        rows[i].uids = guard ? [guard.student.uid] : [];
        if (guard && guard.pts >= e.need) {
          add(i, -add(chaser, -e.take));
          guard.student.mvp++;
          moved.push(guard.student);
          rows[i].note = '一喝で追い返した';
          tell(`${p.name}のクラスの${name(guard.student)}が橋の上で一喝！${ps[chaser].name}のクラスの追っ手が逃げ出した。`, i, '橋の上で一喝！追っ手が逃げ出した。');
        } else {
          add(i, -e.lose);
          rows[i].note = guard ? '突破された' : '守る子なし';
        }
      });
      break;
    }
    // 三国志：👑からXを引いた差が一番大きいクラス（満席は除く。同じならポイントが少ないクラス）に、諸葛亮孔明が無料で転入する。孔明は1人だけ
    case 'kongming': {
      if (c.attr === 'all') break;
      const gaps = ps.map((p, i) => attrScore(p, 'charm').total - values[i]);
      rows.forEach((r, i) => (r.count = gaps[i]));
      // 孔明は1人だけ（捨て札を混ぜ直して同じ学期にもう一度めくられたときだけ、ここに来る）
      if (ps.some((p) => p.students.some((x) => x.cardId === KONGMING.id))) {
        tell('孔明はもう、どこかのクラスで軍師をしている。');
        break;
      }
      const to = ps
        .map((_, i) => i)
        .filter((i) => ps[i].students.length < MAX_CLASS)
        .sort((x, y) => gaps[y] - gaps[x] || ps[x].points - ps[y].points || x - y)[0];
      if (to === undefined) {
        tell('どのクラスも満席で、孔明を迎えられなかった。');
        break;
      }
      const st = fromPoolId(s, KONGMING.id, joinedLabel(s));
      addStudent(s, ps[to], st);
      moved.push(st);
      joined.push(st.uid);
      rows[to].uids = [st.uid];
      rows[to].note = '孔明が転入';
      tell(`${ps[to].name}のクラスに、軍師の${name(st)}がやってきた！`, to, '軍師がやってきた！');
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
      tell(`${tops.map((t) => ps[t].name).join('・')}のクラスが道長の宴に招かれた。`);
      tops.forEach((t) => {
        add(t, e.win);
        rows[t].note = '招かれた';
        scores[t].holders.forEach((h) => h.mvp++);
      });
      break;
    }
    // 平安：全校で一番の書き手（同点なら全員）が作者。作者のクラスで also を持つ子（物語を読む貴族）1人につき +per
    case 'genji': {
      const authors = ps.map((p) => bestOf(p, p.students, c.attr));
      const hi = Math.max(0, ...authors.map((x) => x?.pts ?? 0));
      if (hi === 0) break;
      authors.forEach((x, i) => {
        if (!x || x.pts !== hi) return;
        const readers = ps[i].students.filter((y) => counted(y).includes(e.also));
        add(i, readers.length * e.per);
        x.student.mvp++;
        moved.push(x.student);
        rows[i].count = readers.length;
        rows[i].uids = [x.student.uid, ...readers.filter((y) => y !== x.student).map((y) => y.uid)];
        rows[i].note = `作者・読者${readers.length}人`;
        tell(`${ps[i].name}のクラスの${name(x.student)}が物語を書いた！${ATTR_ICON[e.also]}の読者${readers.length}人（+${readers.length * e.per}）`, i, `物語を書いた！${ATTR_ICON[e.also]}の読者1人につき+${e.per}`);
      });
      break;
    }
    // 平安：かぐや姫が学期の区切りまで滞在し、5つの宝（平安のグッズ）を頼む。どのクラスが差し出してもよく、差し出すかどうかは手番で選ぶ（各宝1回きり。+win）
    case 'kaguya': {
      s.kaguya = KAGUYA_TREASURES.map((g) => ({ id: g.id, by: null }));
      ps.forEach((p, i) => {
        const has = p.students.filter((x) => KAGUYA_TREASURES.some((g) => g.id === x.goods?.id));
        if (!has.length) return;
        rows[i].note = has.map((x) => x.goods!.name).join('・');
        rows[i].uids = has.map((x) => x.uid);
        moved.push(...has);
        tell(`${p.name}のクラスの${has.map(name).join('・')}が宝を持っている！手番で差し出せば+${e.win}。`, i, `宝を持っている！手番で差し出せば+${e.win}。`);
      });
      tell(`かぐや姫は5つの宝を待っている。宝を装備した子がいれば、次の手番から差し出せる（+${e.win}、手番は使わない）。`);
      break;
    }
    // 平安：Xの合計が need 以上のクラスが弁慶を倒す。一番多いクラス（同点ならポイントが少ないクラス。満席なら次のクラス）に弁慶が家来として転入。届かないクラスは刀を取られて −lose
    case 'benkei': {
      if (ps.some((p) => p.students.some(isBenkei))) {
        tell('弁慶はもう義経の家来になって、橋にはだれもいない。');
        break;
      }
      rows.forEach((r, i) => {
        r.count = values[i];
        r.uids = scores[i].holders.map((h) => h.uid);
      });
      const wins = ps.map((_, i) => i).filter((i) => values[i] >= e.need);
      ps.forEach((_, i) => {
        if (wins.includes(i)) {
          rows[i].note = '弁慶に勝った';
          scores[i].holders.forEach((h) => h.mvp++);
        } else {
          add(i, -e.lose);
          rows[i].note = '刀を取られた';
        }
      });
      if (!wins.length) {
        tell('どのクラスも弁慶にかなわず、刀を取られた。');
        break;
      }
      wins.sort((x, y) => values[y] - values[x] || ps[x].points - ps[y].points);
      const to = wins.find((i) => ps[i].students.length < MAX_CLASS);
      if (to === undefined) {
        tell('弁慶を倒したが、どのクラスも満席で家来にできなかった。');
        break;
      }
      const st = fromCard(s, BENKEI.id, joinedLabel(s));
      ps[to].students.push(st);
      moved.push(st);
      joined.push(st.uid);
      rows[to].note = '弁慶が家来に';
      rows[to].uids = [...(rows[to].uids ?? []), st.uid];
      tell(`${ps[to].name}のクラスが弁慶を倒した！${name(st)}が家来になって転入した。`, to, '弁慶を倒して家来にした！');
      break;
    }
    // 中世：各クラスの一番の描き手1人が描く。その子の点（係ボーナス込み）× per
    case 'masterpiece': {
      ps.forEach((p, i) => {
        const top = bestOf(p, p.students, c.attr);
        if (!top) {
          rows[i].note = '描き手なし';
          return;
        }
        add(i, top.pts * e.per);
        top.student.mvp++;
        rows[i].count = top.pts;
        rows[i].uids = [top.student.uid];
        rows[i].note = '描いた';
      });
      const hi = Math.max(...rows.map((r) => r.delta));
      if (hi > 0) {
        const i = rows.findIndex((r) => r.delta === hi);
        const st = ps[i].students.find((x) => x.uid === rows[i].uids![0])!;
        moved.push(st);
        tell(`一番の名画は${ps[i].name}のクラスの${name(st)}！（+${hi}）`, i, `一番の名画が生まれた！（+${hi}）`);
      }
      break;
    }
    // 中世：本が安く刷られ、そのアイコンを持っていない子全員のアイコンが1つ増える（全員持っていれば何も起こらない）
    case 'printing': {
      if (c.attr === 'all') break;
      const a = c.attr;
      ps.forEach((p, i) => {
        const readers = p.students.filter((x) => !x.attrs.includes(a) && baseIcons(x) < MAX_ICONS);
        rows[i].count = readers.length;
        if (!readers.length) {
          rows[i].note = `全員${ATTR_ICON[a]}あり`;
          return;
        }
        for (const x of readers) {
          x.attrs = [...x.attrs, a];
          x.mvp++;
          moved.push(x);
        }
        rows[i].uids = readers.map((x) => x.uid);
        rows[i].note = `${readers.length}人 ${ATTR_ICON[a]}＋1`;
        tell(`${p.name}のクラスの${readers.length}人が本を読んで、${ATTR_ICON[a]}が1つ増えた。`, i, `本を読んで、${ATTR_ICON[a]}が1つ増えた！`);
      });
      break;
    }
    // 中世：各クラスの係に就いていない子1人（ランダム）がペストにかかる。学期の区切りまでそのアイコンを数えない
    case 'plague': {
      ps.forEach((p, i) => {
        const cands = p.students.filter((x) => roleOf(p, x.uid) === null && !x.plague);
        if (!cands.length) {
          rows[i].note = '無事';
          return;
        }
        const st = pick(s, cands);
        st.plague = true;
        moved.push(st);
        rows[i].count = c.attr === 'all' ? undefined : iconsOf({ ...st, plague: false }, c.attr);
        rows[i].uids = [st.uid];
        rows[i].note = '1人が感染';
        tell(`${p.name}のクラスの${name(st)}がペストにかかった。`, i, 'ペストにかかった……（学期の区切りまで🏃を数えない）');
      });
      break;
    }
    // 戦国（桶狭間の戦い）：👑＋👊が一番多いクラス（1クラスだけ）が、ポイントが一番多いクラスから点を奪う（自分が一番なら何も起こらない）
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
      add(win, -add(lord, -e.amount));
      scores[win].holders.forEach((h) => h.mvp++);
      rows[win].note = '奇襲成功';
      rows[lord].note = '本陣を討たれた';
      tell(`${ps[win].name}のクラスが${ps[lord].name}のクラスから${e.amount}点奪った！`, win);
      break;
    }
    // 戦国：👑が一番多いクラス（1クラスだけ）は、次に取るグッズ1つがタダ（もう持っていれば増えない）
    case 'rakuichi': {
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
      ps[win].freeGoods = true;
      scores[win].holders.forEach((h) => h.mvp++);
      rows[win].note = 'グッズ1つタダ';
      tell(`${ps[win].name}のクラスに商人が集まった！次に取るグッズ1つがタダ。`, win);
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
          tell(`${p.name}のクラスの${name(x)}が当選！${ATTR_ICON[a]}が1つ増えた。`, i, `当選！${ATTR_ICON[a]}が1つ増えた。`);
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
        if (n) tell(`${p.name}のクラスの機械の子${n}人の${ATTR_ICON[a]}が1つ増えた。`, i, `機械の子の${ATTR_ICON[a]}が1つ増えた！`);
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
        joined.push(st.uid);
        rows[i].note = '転入';
        rows[i].uids = [st.uid];
        tell(`${p.name}のクラスに、タイムマシンで${name(st)}がやってきた！`, i, 'タイムマシンで転校生がやってきた！');
      });
      break;
    }
    // 江戸：全クラスが出し合い、くじで1クラスが総取り
    case 'lottery': {
      const win = randInt(s, n);
      const pot = -ps.reduce((sum, _, i) => sum + add(i, -e.fee), 0);
      add(win, pot);
      rows.forEach((r, i) => (r.note = i === win ? '当たり！' : 'はずれ'));
      tell(`${ps[win].name}のクラスが当たり！（+${pot}）`, win);
      break;
    }
    // 江戸：くじで決まったクラスから火が出て、席順にとなりへ燃え移る。Xが need 以上のクラスが消し止める（そこで止まる）
    case 'fire': {
      const origin = randInt(s, n);
      tell(`${ps[origin].name}のクラスから火が出た！`, origin);
      for (let k = 0; k < n; k++) {
        const i = (origin + k) % n;
        rows[i].count = values[i];
        if (values[i] >= e.need) {
          add(i, e.win);
          scores[i].holders.forEach((h) => h.mvp++);
          rows[i].uids = scores[i].holders.map((h) => h.uid);
          rows[i].note = '消し止めた';
          tell(`${ps[i].name}のクラスの町火消しが火を消し止めた！（+${e.win}）`, i);
          break;
        }
        add(i, -e.lose);
        rows[i].note = '燃えた';
      }
      break;
    }
    // 江戸：Xを持つ子1人につき、ほかの全クラスから1点ずつもらう（ほかのクラスのXの子には1点ずつ払う）
    case 'ukiyoe': {
      if (c.attr === 'all') break;
      const a = c.attr;
      const sellers = ps.map((p) => p.students.filter((x) => iconsOf(x, a) > 0));
      const total = sellers.reduce((t, x) => t + x.length, 0);
      sellers.forEach((list, i) => {
        add(i, n * list.length - total);
        list.forEach((x) => x.mvp++);
        rows[i].count = list.length;
        rows[i].uids = list.map((x) => x.uid);
        rows[i].note = `${list.length}人の絵が売れた`;
      });
      const hi = Math.max(...rows.map((r) => r.delta));
      if (hi > 0) {
        const i = rows.findIndex((r) => r.delta === hi);
        tell(`${ps[i].name}のクラスの浮世絵が一番売れた！（+${hi}）`, i);
      }
      break;
    }
    // 江戸：日本の時代の子1人につき +plus、外国の時代の子1人につき −minus（どちらでもない時代の子は数えない）
    case 'sakoku': {
      ps.forEach((p, i) => {
        const home = p.students.filter((x) => e.home.includes(x.era));
        const foreign = p.students.filter((x) => e.foreign.includes(x.era));
        add(i, home.length * e.plus - foreign.length * e.minus);
        rows[i].count = home.length;
        rows[i].uids = home.map((x) => x.uid);
        rows[i].note = `日本${home.length}人・外国${foreign.length}人`;
      });
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
        tell(`${ps[i].name}のクラスの${name(x.student)}が受賞！`, i, '受賞！');
        rows[i].uids = [x.student.uid];
      });
      break;
    }
    // 近代：一番のクラス（1クラスだけ）が特許をとる。学期の区切りまで、ほかのクラスが授業カードを取るたびに特許料が入る（payPatent）
    case 'patent': {
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
      s.patent = win;
      scores[win].holders.forEach((h) => h.mvp++);
      rows[win].note = '特許';
      tell(`${ps[win].name}のクラスが電球の特許をとった！学期の区切りまで、ほかのクラスが授業をするたびに特許料${e.fee}点が入る。`, win);
      break;
    }
    // 近代：クラスにあるアイコンの種類の数で、届いた一番上の段の点
    case 'expo': {
      ps.forEach((p, i) => {
        const kinds = new Set(p.students.flatMap((x) => counted(x))).size;
        const step = [...e.steps].sort((x, y) => y[0] - x[0]).find(([k]) => kinds >= k);
        rows[i].count = kinds;
        rows[i].uids = p.students.filter((x) => counted(x).length > 0).map((x) => x.uid);
        rows[i].note = `${kinds}種類`;
        if (step) add(i, step[1]);
      });
      const hi = Math.max(...rows.map((r) => r.delta));
      if (hi > 0) tell(`${rows.filter((r) => r.delta === hi).map((r) => ps[r.player].name).join('・')}のクラスの展示が大にぎわい！（+${hi}）`);
      break;
    }
    // 近代：各クラスの一番の描き手が絵を飾る。点は学期の区切り（settleSunflower）に、その子がまだいれば入る
    case 'sunflower': {
      const paintings = (s.sunflower ?? []).slice();
      ps.forEach((p, i) => {
        const top = bestOf(p, p.students, c.attr);
        if (!top) {
          rows[i].note = '描き手なし';
          return;
        }
        // 同じ学期にもう一度めくられたら、そのクラスの絵は描き直し
        const k = paintings.findIndex((x) => x.player === i);
        if (k >= 0) paintings.splice(k, 1);
        paintings.push({ player: i, uid: top.student.uid, pts: top.pts });
        top.student.mvp++;
        moved.push(top.student);
        rows[i].count = top.pts;
        rows[i].uids = [top.student.uid];
        rows[i].note = `学期末に+${top.pts * e.per}`;
        tell(`${p.name}のクラスの${name(top.student)}がひまわりの絵を飾った。`, i, 'ひまわりの絵を飾った。学期の区切りに値打ちが出る。');
      });
      if (paintings.length) s.sunflower = paintings;
      break;
    }
  }
  const result = eraResult(s, c, rows, { students: moved, inUids: joined });
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
    return { player: i, delta: 0, note: '火星人が転入', uids: [st.uid] };
  });
  log(s, `【${c.name}】 空席のあるクラスにエイリアンが転入した。`);
  return { title: c.name, icon: c.icon, art: c.id, tone: 'era', era: c.era, desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows, students: aliens.slice(0, 1), inUids: aliens.slice(0, 1).map((x) => x.uid) };
}

/** かぐや姫がまだ待っている宝か */
export function kaguyaWants(s: GameState, id: string): boolean {
  return !!s.kaguya?.some((x) => x.id === id && x.by === null);
}

/** かぐや姫が待っている宝を装備した子（いなければ null）。手番でこの子の宝を差し出せる */
export function kaguyaGift(s: GameState, pi: number): Student | null {
  return s.players[pi].students.find((x) => x.goods && kaguyaWants(s, x.goods.id)) || null;
}

/** かぐや姫に宝を受け取ってもらう（+win） */
function kaguyaReceive(s: GameState, pi: number, id: string, win: number) {
  s.kaguya!.find((x) => x.id === id)!.by = pi;
  s.players[pi].points += win;
}

/** かぐや姫が待っている宝を装備した子がいれば差し出す（宝は消えて +win）。差し出した子を返す */
function presentKaguya(s: GameState, pi: number, win = kaguyaWin(s)): Student | null {
  const p = s.players[pi];
  const st = kaguyaGift(s, pi);
  if (!st) return null;
  const g = st.goods!;
  const k = st.attrs.lastIndexOf(g.attr);
  st.attrs = st.attrs.filter((_, i) => i !== k);
  delete st.goods;
  st.mvp++;
  kaguyaReceive(s, pi, g.id, win);
  log(s, `${p.name}のクラスの${st.name}が、かぐや姫に${g.name}を差し出した！（+${win}）`, pi);
  return st;
}

/** かぐや姫に宝を差し出したときの点（カードの効果から） */
export function kaguyaWin(s: GameState): number {
  const e = (eventCard(s, 'kaguya') as ContestCard).effect;
  return e.type === 'kaguya' ? e.win : 0;
}

/** 学期の区切り：滞在していたかぐや姫が月へ帰る */
function kaguyaLeaves(s: GameState) {
  if (!s.kaguya) return;
  log(s, s.kaguya.some((x) => x.by === null) ? '宝がそろわないまま、かぐや姫は月へ帰っていった。' : 'かぐや姫は月へ帰っていった。');
  delete s.kaguya;
}

/** 五条大橋の弁慶で来た弁慶（1人しかいない） */
export function isBenkei(x: Student): boolean {
  return x.cardId === BENKEI.id;
}

/** 機械の子：機械の人物・サイボーグ・機械のグッズ（スマホ・タブレット・電脳チップ）を装備した子 */
export function isMachine(x: Student): boolean {
  return x.art === 'cyborg' || (x.goods !== undefined && MACHINE_GOODS.includes(x.goods.id)) || (x.cardId !== undefined && CARD_MAP[x.cardId]?.tags.includes('機械') === true);
}

/** サイボーグ化の対象（自分のクラスの子。もうサイボーグの子は除く） */
export function cyborgable(p: Player): Student[] {
  return p.students.filter((x) => x.art !== 'cyborg');
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

/** 点を動かす。点は0未満にならない（持っている点より多くは減らない）。実際に動いた点を返す */
function addPoints(p: Player, d: number): number {
  const before = p.points;
  p.points = Math.max(0, before + d);
  return p.points - before;
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

/** いまゲリラの最中か（転校で出ていく子を選んでいる間と、ゲリラの結果を見せている間）。誰の手番でもない */
export function inGuerrilla(s: GameState): boolean {
  const ph = s.phase;
  return ph.kind === 'push' || ph.kind === 'vote' || ph.kind === 'gift' || ph.kind === 'oath' || (ph.kind === 'result' && ph.ctx === 'turn' && ph.player === null);
}

/** 転校：めくった人から席順に、全クラスが1人ずつ外す */
function startDrop(s: GameState, drawer: number) {
  const n = s.players.length;
  nextDrop(s, drawer, Array.from({ length: n }, (_, i) => (drawer + i) % n), []);
}

/** 転校の次の人へ（left はまだ外していないクラス。外せる子がいないクラスは飛ばす）。全員終わったら結果を出す。votes があれば陶片追放の転校 */
function nextDrop(s: GameState, drawer: number, left: number[], gone: Student[], votes?: number[]) {
  for (let i = 0; i < left.length; i++) {
    const pi = left[i];
    if (droppable(s.players[pi]).length > 0) {
      s.phase = { kind: 'push', player: pi, drawer, left: left.slice(i + 1), gone, votes };
      return;
    }
    log(s, `${s.players[pi].name}のクラスは転校させられる子がいなかった。`, pi);
  }
  if (votes) {
    setResult(s, null, ostracismResult(s, drawer, votes, gone), 'turn');
    return;
  }
  // ゲリラの結果は誰の手番のものでもない
  setResult(
    s,
    null,
    {
      title: '転校',
      icon: '📦',
      tone: 'personal',
      desc: gone.length ? `${gone.length}人が転校していった。` : 'どのクラスも転校させられる子がいなかった。',
      rule: cardRule(EVENT_MAP.push), glyph: cardGlyph(EVENT_MAP.push), say: shortRule(EVENT_MAP.push),
      rows: [],
      students: gone,
      outUids: gone.map((x) => x.uid),
    },
    'turn',
  );
}

/** 陶片追放で投票できる相手（自分以外のクラス） */
export function voteTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi).map((p) => p.id);
}

/** 陶片追放：めくった人から席順に、全クラスが秘密で1票ずつ入れる */
function startVote(s: GameState, drawer: number) {
  const n = s.players.length;
  const order = Array.from({ length: n }, (_, i) => (drawer + i) % n);
  s.phase = { kind: 'vote', player: order[0], drawer, left: order.slice(1), ballots: [] };
}

/** 票を数えて追放するクラスを決める（同票ならポイントが多いクラス、それも同じならめくった人から席順で先のクラス） */
export function ostracized(s: GameState, drawer: number, votes: number[]): number {
  const n = s.players.length;
  const seat = (i: number) => (i - drawer + n) % n;
  return votes
    .map((_, i) => i)
    .sort((x, y) => votes[y] - votes[x] || s.players[y].points - s.players[x].points || seat(x) - seat(y))[0];
}

/** 全員が投票したら開票。追放されたクラスは、係に就いていない子を1人転校させる（させられる子がいなければそのまま） */
function tallyVotes(s: GameState, drawer: number, ballots: number[]) {
  const votes = s.players.map((_, i) => ballots.filter((b) => b === i).length);
  const out = ostracized(s, drawer, votes);
  log(s, `陶片追放の開票：${s.players.map((p, i) => `${p.name} ${votes[i]}票`).join(' / ')}`);
  if (droppable(s.players[out]).length > 0) s.phase = { kind: 'push', player: out, drawer, left: [], gone: [], votes };
  else {
    log(s, `${s.players[out].name}のクラスは転校させられる子がいなかった。`, out);
    setResult(s, null, ostracismResult(s, drawer, votes, []), 'turn');
  }
}

/** 陶片追放の結果（票の数と、アテネを去った子） */
function ostracismResult(s: GameState, drawer: number, votes: number[], gone: Student[]): EventResult {
  const c = EVENT_MAP.ostracism as ContestCard;
  const out = ostracized(s, drawer, votes);
  const rows: ResultRow[] = s.players.map((_, i) => ({ player: i, count: votes[i], delta: 0, note: `${votes[i]}票` }));
  rows[out].note = gone.length ? `${votes[out]}票 追放` : `${votes[out]}票（転校できる子なし）`;
  rows[out].uids = gone.map((x) => x.uid);
  const who = s.players[out].name;
  // 去った子の名前はログにだけ残す（画面ではカードに書いてある）
  const say = gone.length ? `${who}のクラスに陶片の票が集まり、${gone.length}人がアテネを去った。` : `${who}のクラスに陶片の票が集まったが、去れる子がいなかった。`;
  log(s, gone.length ? `${who}のクラスに陶片の票が集まり、${gone.map((x) => x.name).join('・')}がアテネを去った。` : say, out);
  return { ...eraResult(s, c, rows, { students: gone, outUids: gone.map((x) => x.uid) }), say };
}

/**
 * 品を配るゲリラを始める。
 * コロンブスの新大陸到達：アイコンの多いクラスから順に（同点ならポイントの少ないクラスが先）、品と装備させる子（グッズを持っていない子）を選ぶ。品がなくなったら終わり
 * 鉄砲伝来：めくった人から席順に、全クラスが鉄砲を1丁ずつ受け取り、装備させる子を選ぶ
 */
function startGift(s: GameState, c: ContestCard, drawer: number) {
  const n = s.players.length;
  if (c.effect.type === 'teppo') {
    nextGift(s, c.id, Array.from({ length: n }, (_, i) => (drawer + i) % n), [TEPPO_GOODS.id], []);
    return;
  }
  const values = s.players.map((p) => attrScore(p, c.attr).total);
  const order = s.players.map((_, i) => i).sort((x, y) => values[y] - values[x] || s.players[x].points - s.players[y].points || x - y);
  nextGift(s, c.id, order, NEW_WORLD_GOODS.map((g) => g.id), []);
}

/** 品を配る次のクラスへ。全員選び終わったら（品がなくなったら）結果を出す */
function nextGift(s: GameState, card: string, left: number[], items: string[], got: { player: number; uid: string; item: string }[]) {
  for (let i = 0; i < left.length && items.length; i++) {
    const pi = left[i];
    if (equippable(s.players[pi]).length > 0) {
      s.phase = { kind: 'gift', card, player: pi, left: left.slice(i + 1), items, got };
      return;
    }
    log(s, `${s.players[pi].name}のクラスには品を受け取れる子がいなかった。`, pi);
  }
  const c = eventCard(s, card) as ContestCard;
  const students = got.map((g) => s.players[g.player].students.find((x) => x.uid === g.uid)!);
  const rows: ResultRow[] = s.players.map((_, i) => {
    const g = got.find((x) => x.player === i);
    if (!g) return { player: i, delta: 0, note: '届かず' };
    const item = GIFT_MAP[g.item];
    return { player: i, delta: 0, note: item.name, uids: [g.uid] };
  });
  logRows(s, c.name, rows);
  setResult(
    s,
    null,
    {
      title: c.name, icon: c.icon, art: c.id, tone: 'era', era: c.era, desc: c.desc, rule: cardRule(c), glyph: cardGlyph(c),
      say: got.length ? `${[...new Set(got.map((g) => GIFT_MAP[g.item].name))].join('・')}をもらった！` : '品を受け取れるクラスがなかった。',
      rows, students,
    },
    'turn',
  );
}

/** 桃園の誓い：ポイントが一番少ないクラス（同点なら席順で先のクラス）が劉備役になり、義兄弟になるクラスを選ぶ。もう誓いが結ばれていれば何も起こらない */
function startOath(s: GameState, c: ContestCard, max: number) {
  const n = s.players.length;
  if (s.oath || n < 2) {
    const say = s.oath ? 'もう義兄弟の誓いが結ばれている。' : '誓いを結ぶ相手がいない。';
    log(s, say);
    setResult(s, null, { ...eraResult(s, c, s.players.map((_, i) => ({ player: i, delta: 0 }))), say }, 'turn');
    return;
  }
  const leader = s.players.map((_, i) => i).sort((x, y) => s.players[x].points - s.players[y].points || x - y)[0];
  s.phase = { kind: 'oath', player: leader, max: Math.min(max, n - 1) };
}

/** 桃園の誓いで選べる相手（自分以外のクラス） */
export function oathTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi).map((p) => p.id);
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

/** 場のカードを取るのに払うクラスポイント（p を渡すと、楽市楽座でグッズがタダのクラスは0） */
export function marketCost(id: string, p?: Player): number {
  return isPerson(id) ? personCost(baseIcons(previewStudent(id))) : eventCost(EVENT_MAP[id], !!p?.freeGoods);
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

/** ゲリラ（共通イベント・時代イベント・転校） */
function fireGuerrilla(s: GameState, pi: number, id: string) {
  const c = eventCard(s, id);
  log(s, `ゲリラ発生！ ${c.name}`);
  switch (c.kind) {
    // ゲリラは誰の手番でもない学校全体のできごと（めくった人のものとして見せない）
    case 'swing':
      setResult(s, null, resolveSwing(s, c), 'turn');
      return;
    case 'contest':
      if (c.effect.type === 'ostracism') startVote(s, pi);
      else if (c.effect.type === 'newworld' || c.effect.type === 'teppo') startGift(s, c, pi);
      else if (c.effect.type === 'oath') startOath(s, c, c.effect.max);
      else setResult(s, null, resolveContest(s, c), 'turn');
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
  const cost = marketCost(id, p);
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
  s.passes = 0;
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
  const desc = `転校生がやってきた！（−${cost}点）${gone ? ' 入れ替わりに1人が転校していった。' : ''}`;
  setResult(s, pi, { title: '転入', icon: '🚪', tone: 'personal', desc, rows: [{ player: pi, delta: -cost, note: 'スカウト' }], students: gone ? [st, gone] : [st], inUids: [st.uid], outUids: gone ? [gone.uid] : undefined }, 'turn');
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
      setResult(s, pi, payPatent(s, pi, resolveNormal(s, c, pi)), 'turn');
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
        case 'kaguya':
          // かぐや姫に宝を差し出したあとは、同じ人の手番に戻る
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
        case 'oath':
        case 'sunflower':
          advanceMonth(s);
          break;
      }
      return s;
    }
    case 'setRoles': {
      if (ph.kind !== 'roles' || ph.ready[a.player] !== false) return prev;
      const p = s.players[a.player];
      const unlock = a.unlock ?? [];
      if (!validUnlock(p, unlock, slotsNow(s))) return prev;
      const kinds = [...p.unlocked, ...unlock];
      if (!validRoles(p, a.roles, kinds)) return prev;
      p.unlocked = kinds;
      p.roles = a.roles.map((r) => ({ ...r }));
      if (unlock.length) log(s, `${p.name}が${unlock.map((r) => ROLES[r].name).join('・')}を解放`, a.player);
      const desc = p.roles.map((r) => `${ROLES[r.role].name}:${p.students.find((x) => x.uid === r.uid)?.name}`).join(' ') || 'なし';
      log(s, `${p.name}の係 — ${desc}（準備OK）`, a.player);
      ph.ready[a.player] = true;
      if (ph.ready.every(Boolean)) startTurns(s);
      return s;
    }
    case 'take': {
      if (ph.kind !== 'draw' || !canTake(s, ph.player, a.slot)) return prev;
      takeCard(s, ph.player, a.slot);
      return s;
    }
    case 'build': {
      if (ph.kind !== 'draw' || !canBuild(s, ph.player)) return prev;
      s.passes = 0;
      build(s, ph.player);
      return s;
    }
    case 'pass': {
      if (ph.kind !== 'draw') return prev;
      log(s, `${s.players[ph.player].name}はパスした。`, ph.player);
      // 全員が続けてパスしたら、場に一番長く残っているカード（左端）が流れて入れ替わる
      s.passes = (s.passes ?? 0) + 1;
      if (s.passes >= s.players.length && s.market.length) {
        s.passes = 0;
        const [id] = s.market.splice(0, 1);
        s.discard.push(id);
        log(s, `全員がパスしたので、${isPerson(id) ? previewStudent(id).name : EVENT_MAP[id].name}のカードが流れた。`);
      }
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
      nextDrop(s, ph.drawer, ph.left, [...ph.gone, st], ph.votes);
      return s;
    }
    case 'vote': {
      if (ph.kind !== 'vote' || !voteTargets(s, ph.player).includes(a.target)) return prev;
      // 誰に入れたかはログにも残さない（秘密投票）
      log(s, `${s.players[ph.player].name}が陶片に名前を書いた。`, ph.player);
      const ballots = [...ph.ballots, a.target];
      if (ph.left.length) s.phase = { kind: 'vote', player: ph.left[0], drawer: ph.drawer, left: ph.left.slice(1), ballots };
      else tallyVotes(s, ph.drawer, ballots);
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
      const to = s.players[a.target];
      // 相手の点より多くは削れない。吸い取るのは実際に削った分の半分
      const damage = -addPoints(to, -kachikomiHit(sc.total).damage);
      const drain = kachikomiDrain(damage);
      p.points += drain;
      if (damage > 0) sc.holders.forEach((h) => h.mvp++);
      const rows: ResultRow[] = [
        { player: ph.player, count: sc.total, delta: drain, note: 'カチコミ（ドレイン）', uids: sc.holders.map((h) => h.uid) },
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
        { title: 'クラス替え', icon: '🔁', tone: 'personal', desc: `${to.name}のクラスと生徒を入れ替えた！`, rows: [], students: [theirs, mine], inUids: [theirs.uid], outUids: [mine.uid] },
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
      const was = st.name;
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
        { title: 'サイボーグ化', icon: '🦾', art: 'cyborg', tone: 'personal', desc: 'サイボーグになった！', rule: cardRule(EVENT_MAP.cyborg), glyph: cardGlyph(EVENT_MAP.cyborg), say: shortRule(EVENT_MAP.cyborg), rows: [], students: [st] },
        'turn',
      );
      return s;
    }
    case 'gift': {
      if (ph.kind !== 'gift' || !ph.items.includes(a.item)) return prev;
      const p = s.players[ph.player];
      const st = equippable(p).find((x) => x.uid === a.uid);
      if (!st) return prev;
      const g = GIFT_MAP[a.item];
      st.goods = { id: g.id, name: g.name, icon: g.icon, attr: g.attr };
      st.attrs = [...st.attrs, g.attr];
      st.mvp++;
      log(s, `${p.name}のクラスの${st.name}に${g.name}が届いた。`, ph.player);
      // 新大陸の品は早い者勝ち。鉄砲はどのクラスにも同じものが届く
      const items = (EVENT_MAP[ph.card] as ContestCard).effect.type === 'teppo' ? ph.items : ph.items.filter((x) => x !== a.item);
      nextGift(s, ph.card, ph.left, items, [...ph.got, { player: ph.player, uid: st.uid, item: g.id }]);
      return s;
    }
    case 'present': {
      if (ph.kind !== 'draw') return prev;
      const st = presentKaguya(s, ph.player);
      if (!st) return prev;
      const win = kaguyaWin(s);
      setResult(
        s,
        ph.player,
        { title: 'かぐや姫に宝を差し出した', icon: '🌙', art: 'kaguya', tone: 'personal', desc: `かぐや姫に宝を差し出した！（+${win}）`, rows: [{ player: ph.player, delta: win, note: '差し出した', uids: [st.uid] }], students: [st] },
        'kaguya',
      );
      return s;
    }
    case 'oath': {
      if (ph.kind !== 'oath') return prev;
      const targets = [...new Set(a.targets)];
      if (!targets.length || targets.length > ph.max || targets.length !== a.targets.length || !targets.every((t) => oathTargets(s, ph.player).includes(t))) return prev;
      const players = [ph.player, ...targets];
      s.oath = { players, base: players.map((pi) => s.players[pi].points) };
      const c = EVENT_MAP.taoyuan as ContestCard;
      const names = players.map((pi) => s.players[pi].name).join('・');
      const rows: ResultRow[] = s.players.map((_, i) => ({ player: i, delta: 0, note: i === ph.player ? '劉備役' : players.includes(i) ? '義兄弟' : undefined }));
      const say = `${names}のクラスが義兄弟になった！学期の区切りまで、もうけも損も山分け。`;
      log(s, say, ph.player);
      setResult(s, null, { ...eraResult(s, c, rows), say }, 'turn');
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
      const free = !!p.freeGoods;
      p.points -= marketCost(takeFromMarket(s, ph.slot, false), p);
      // 楽市楽座のタダは1回きり
      delete p.freeGoods;
      st.goods = { id: c.id, name: c.name, icon: c.icon, attr: c.attr };
      st.attrs = [...st.attrs, c.attr];
      log(s, `${p.name}のクラスの${st.name}が${c.name}を装備した。${free ? '（楽市楽座でタダ）' : ''}`, ph.player);
      setResult(
        s,
        ph.player,
        { title: c.name, icon: c.icon, attr: c.attr, tone: 'personal', desc: `${c.name}を装備した！`, rule: cardRule(c), glyph: cardGlyph(c), say: shortRule(c), rows: [], students: [st] },
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
    const c = eventCard(s, id);
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
      }
    });
  };
  // 並び順を固定するため、まず今学期に入りうるカードを全部登録しておく
  for (const e of ALL_EVENT_CARDS) if ((!cardEra(e) || cardEra(e) === era.id) && !isPyramidCard(e)) define(e.id);
  for (const id of s.eventDeck) define(id).left++;
  for (const id of s.market) define(id).open++;
  for (const id of s.discard) define(id).used++;
  return [...rows.values()].filter((r) => r.group !== '人物' || r.left + r.open + r.used > 0);
}
