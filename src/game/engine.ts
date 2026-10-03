import { MAX_CLASS, MIN_CLASS, STARTING_MEMBERS, attrScore, bestScore, ranks, roleSlots, testScore, totalPower } from './calc';
import { CARDS, CARD_MAP, toIcons } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import {
  ALL_EVENT_CARDS,
  CONTEST_POINTS,
  EVENT_MULT,
  ERA_NORMAL_NAMES,
  ERA_RAIDERS,
  EVENT_MAP,
  FIXED_BY_MONTH,
  FIXED_MAP,
  PERSON_CARDS_PER_TERM,
  TEST_YANKEE_PENALTY,
  cardRule,
  fixedRule,
  type ContestCard,
  type FixedEvent,
  type NormalCard,
  type RaidCard,
} from './data/events';
import { ARCHETYPES, GIVEN_NAMES, STARTER_ARCHETYPES, SURNAMES, type Archetype } from './data/modern';
import { ROLES, ROLE_ORDER } from './data/roles';
import {
  type Action,
  type EraId,
  type EventResult,
  type GameState,
  type Player,
  type Rarity,
  type ResultCtx,
  type ResultRow,
  type Student,
} from './types';

/** 転校生がやってくる歴史上の時代（現代以外） */
export const HISTORY_ERAS = ERAS.map((_, i) => i).filter((i) => i !== PRESENT_INDEX);
export const MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
export const PLAYER_COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#da77f2'];
/** 現代の生徒の山札に入れる各カードの枚数 */
const MODERN_COPIES = 2;

export function termOfMonth(m: number): number {
  if (m >= 4 && m <= 7) return 1;
  if (m === 8) return 0;
  if (m >= 9) return 2;
  return 3;
}

export function calendarLabel(s: GameState): string {
  const m = MONTHS[Math.min(s.monthIdx, 11)];
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
function weightedIndex(s: GameState, weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(s) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

// ---------- 初期化 ----------

export interface SetupPlayer {
  name: string;
  isCpu: boolean;
}

export function newGame(setup: SetupPlayer[], years: number, seed = Date.now()): GameState {
  const pools = Object.fromEntries(ERAS.map((e) => [e.id, [] as string[]])) as Record<EraId, string[]>;
  for (const c of CARDS) pools[c.era].push(c.id);
  const s: GameState = {
    version: 9,
    yearEras: [],
    eraDeck: [],
    rng: seed | 0,
    players: setup.map((p, i) => ({
      id: i,
      name: p.name,
      isCpu: p.isCpu,
      color: PLAYER_COLORS[i],
      students: [],
      roles: ROLE_ORDER.map(() => null),
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
    modernDeck: [],
    pools,
    uidCounter: 0,
    logCounter: 0,
    log: [],
  };
  s.modernDeck = shuffle(
    s,
    STARTER_ARCHETYPES.flatMap((a) => Array.from({ length: MODERN_COPIES }, () => a.id)),
  );
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
  return `${s.year}年${MONTHS[Math.min(s.monthIdx, 11)]}月`;
}

function fromArchetype(s: GameState, a: Archetype, joined: string): Student {
  return {
    uid: `u${s.uidCounter++}`,
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

const HISTORY_RARITY_WEIGHT: Record<Rarity, number> = { N: 60, R: 55, SR: 32, SSR: 13 };
const PRESENT_RARITY_WEIGHT: Record<Rarity, number> = { N: 70, R: 24, SR: 6, SSR: 0 };

/** 現代の生徒を1人ランダムに引く（たまにレアな転校生） */
function randomModern(s: GameState): Student {
  const a = ARCHETYPES[weightedIndex(s, ARCHETYPES.map((x) => PRESENT_RARITY_WEIGHT[x.rarity]))];
  return fromArchetype(s, a, joinedLabel(s));
}

/** その時代の偉人を1人ランダムに引く。残っていなければ現代の生徒 */
function randomPerson(s: GameState, eraIdx: number): Student {
  const pool = s.pools[ERAS[eraIdx].id];
  if (pool.length === 0) return randomModern(s);
  const id = pool[weightedIndex(s, pool.map((x) => HISTORY_RARITY_WEIGHT[CARD_MAP[x].rarity]))];
  return fromCard(s, id, joinedLabel(s));
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
  p.roles = p.roles.map((r) => (r === uid ? null : r));
  if (returnToPool && st.cardId && !s.pools[st.era].includes(st.cardId)) s.pools[st.era].push(st.cardId);
  return st;
}

// ---------- 初期メンバー ----------

/** 現代の生徒の山札から1枚引く（完全ランダム） */
function drawMember(s: GameState, pi: number): Student {
  if (s.modernDeck.length === 0) s.modernDeck = shuffle(s, STARTER_ARCHETYPES.map((a) => a.id));
  const id = s.modernDeck.pop()!;
  const st = fromArchetype(s, ARCHETYPES.find((a) => a.id === id)!, '初期メンバー');
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

/** 今の学期の時代（夏休み中は2学期の時代） */
export function currentEra(s: GameState): number {
  const t = termOfMonth(MONTHS[Math.min(s.monthIdx, 11)]);
  return s.yearEras[Math.max(1, t) - 1];
}

/** 山札：全時代共通のカード＋今学期の時代カード＋人物カード（その時代の偉人、足りなければ現代の生徒） */
function buildDeck(s: GameState): string[] {
  const era = ERAS[currentEra(s)].id;
  const deck: string[] = [];
  for (const e of ALL_EVENT_CARDS) {
    if (e.kind === 'contest' && e.era && e.era !== era) continue;
    for (let i = 0; i < e.count; i++) deck.push(e.id);
  }
  const figures = shuffle(s, [...s.pools[era]]).slice(0, PERSON_CARDS_PER_TERM);
  for (const id of figures) deck.push(`person:${id}`);
  for (let i = figures.length; i < PERSON_CARDS_PER_TERM; i++) deck.push('modern');
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
  if (m === 8) startSummer(s);
  else if (m === 9 || m === 1) startTerm(s);
  else startTurns(s);
}

/** 夏休み合宿：全員が2学期の時代から1人ずつランダムに迎える */
function startSummer(s: GameState) {
  const era = ERAS[s.yearEras[1]];
  const lines: string[] = [];
  const students: Student[] = [];
  for (const pi of order(s)) {
    const p = s.players[pi];
    if (p.students.length >= MAX_CLASS) {
      lines.push(`${p.name}：満席なので見送り`);
      continue;
    }
    const st = randomPerson(s, s.yearEras[1]);
    addStudent(s, p, st);
    students.push(st);
    lines.push(`${p.name} ← ${st.icon}${st.name}`);
  }
  log(s, `夏休み合宿（${era.name}）：` + lines.join(' / '));
  s.phase = {
    kind: 'result',
    player: null,
    ctx: 'summer',
    result: { title: '夏休み合宿', icon: '🌻', tone: 'fixed', desc: `${era.icon}${era.name}から全員に1人ずつ転入`, rows: [], lines, students },
  };
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

/** 通常カード：そのアイコンを一番多く持つ子1人の個数（＋係ボーナス）を全クラスに加点。名前と絵柄は時代で変わる */
function resolveNormal(s: GameState, c: NormalCard): EventResult {
  const [name, icon] = ERA_NORMAL_NAMES[ERAS[currentEra(s)].id][c.attr];
  const rows = s.players.map((p, i) => {
    const sc = bestScore(p, c.attr);
    p.points += sc.total;
    for (const h of sc.holders) h.mvp++;
    return { player: i, count: sc.total, delta: sc.total, uids: sc.holders.map((h) => h.uid) };
  });
  sortRows(rows);
  logRows(s, name, rows);
  return { title: name, icon, attr: c.attr, tone: 'normal', desc: '', rule: cardRule(c), rows };
}

/** イベントカード（引いた人だけ）：クラスのそのアイコンの合計個数（＋係ボーナス）×EVENT_MULT。時代カードはその時代の生徒のアイコンが2倍 */
function resolveContest(s: GameState, c: ContestCard, pi: number): EventResult {
  const p = s.players[pi];
  const sc = attrScore(p, c.attr, c.era);
  const delta = sc.total * EVENT_MULT;
  p.points += delta;
  sc.holders.forEach((h) => h.mvp++);
  const rows: ResultRow[] = [{ player: pi, count: sc.total, delta, uids: sc.holders.map((h) => h.uid) }];
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: c.attr, tone: c.era ? 'era' : 'contest', desc: c.desc, rule: cardRule(c), rows };
}

/** カチコミ（引いた人だけ）：👊の合計が敵の強さに足りなければ、その差がそのままマイナス */
function resolveRaid(s: GameState, c: RaidCard, pi: number): EventResult {
  const p = s.players[pi];
  const [name, icon] = ERA_RAIDERS[ERAS[currentEra(s)].id];
  const sc = attrScore(p, 'fight');
  const delta = Math.min(0, sc.total - c.threat);
  p.points += delta;
  if (delta === 0) sc.holders.forEach((h) => h.mvp++);
  const rows: ResultRow[] = [{ player: pi, count: sc.total, delta, note: delta === 0 ? '撃退' : sc.total ? '突破' : '無防備', uids: sc.holders.map((h) => h.uid) }];
  logRows(s, `カチコミ（${name}）`, rows);
  return { title: `カチコミ！${name}`, icon, attr: 'fight', tone: 'contest', desc: `敵の強さ ${c.threat}`, rule: cardRule(c), rows };
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

/** 転校で押しつけられる相手（定員に空きがあるクラス） */
export function pushTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi && p.students.length < MAX_CLASS).map((p) => p.id);
}

function popCard(s: GameState): string {
  if (s.eventDeck.length === 0) {
    s.eventDeck = shuffle(s, s.discard);
    s.discard = [];
    log(s, '捨て札をシャッフルして山札に戻した。');
  }
  return s.eventDeck.pop()!;
}

const isPerson = (id: string) => id === 'modern' || id.startsWith('person:');

function resolveDraw(s: GameState, pi: number) {
  const p = s.players[pi];
  let id = popCard(s);
  // 満席なら人物カードは捨てて、もう1枚めくる
  for (let guard = 0; isPerson(id) && p.students.length >= MAX_CLASS && guard < 50; guard++) {
    s.discard.push(id);
    log(s, `${p.name}のクラスは満席。人物カードを捨ててもう1枚めくる。`, pi);
    id = popCard(s);
  }
  // 人物カード：引いたらそのまま転入
  if (isPerson(id) && p.students.length < MAX_CLASS) {
    const cardId = id.slice('person:'.length);
    const st = id !== 'modern' && s.pools[CARD_MAP[cardId].era].includes(cardId) ? fromCard(s, cardId, joinedLabel(s)) : randomModern(s);
    welcome(s, pi, st, 'turn');
    return;
  }
  s.discard.push(id);
  const c = EVENT_MAP[id];
  switch (c.kind) {
    case 'normal':
      setResult(s, pi, resolveNormal(s, c), 'turn');
      return;
    case 'contest':
      setResult(s, pi, resolveContest(s, c, pi), 'turn');
      return;
    case 'raid':
      setResult(s, pi, resolveRaid(s, c, pi), 'turn');
      return;
    case 'push':
      if (pushTargets(s, pi).length === 0 || p.students.length <= MIN_CLASS) {
        setResult(s, pi, { title: c.name, icon: c.icon, tone: 'personal', desc: '押しつけられる相手がいなかった。', rows: [] }, 'turn');
      } else {
        s.phase = { kind: 'push', player: pi };
      }
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
        case 'summer':
          advanceMonth(s);
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
      if (a.roles.length !== ROLE_ORDER.length) return prev;
      const ids = new Set(p.students.map((x) => x.uid));
      const used = a.roles.filter((r): r is string => r !== null);
      if (used.some((u) => !ids.has(u)) || new Set(used).size !== used.length) return prev;
      const k = roleSlots(p);
      p.roles = a.roles.map((r, i) => (i < k ? r : null));
      const desc = ROLE_ORDER.slice(0, k)
        .map((r, i) => `${ROLES[r].name}:${p.students.find((x) => x.uid === p.roles[i])?.name ?? 'なし'}`)
        .join(' ');
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
      if (a.uid === null) {
        setResult(s, ph.player, { title: '転校', icon: '📦', tone: 'personal', desc: 'やっぱりやめた。', rows: [] }, 'turn');
        return s;
      }
      if (a.target === undefined || !pushTargets(s, ph.player).includes(a.target)) return prev;
      if (!p.students.some((x) => x.uid === a.uid) || p.students.length <= MIN_CLASS) return prev;
      const st = removeStudent(s, p, a.uid, false)!;
      const to = s.players[a.target];
      to.students.push(st);
      log(s, `${p.name}が${st.name}を${to.name}のクラスへ押しつけた！`, ph.player);
      setResult(
        s,
        ph.player,
        { title: '転校', icon: '📦', tone: 'personal', desc: `${st.icon}${st.name} を ${to.name} のクラスへ押しつけた！`, rows: [], students: [st] },
        'turn',
      );
      return s;
    }
  }
  return prev;
}

export function finalRanking(s: GameState): Player[] {
  return [...s.players].sort((a, b) => b.points - a.points);
}
