import { MAX_CLASS, MIN_CLASS, STARTING_MEMBERS, attrScore, iconCount, ranks, roleSlots, testScore, totalPower } from './calc';
import { CARDS, CARD_MAP, parseAttrs, toValue } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import {
  ALL_EVENT_CARDS,
  CONTEST_POINTS,
  EVENT_MAP,
  FIXED_BY_MONTH,
  FIXED_MAP,
  RAID_LOSE,
  RAID_WIN,
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
  ATTR_ICON,
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
    version: 6,
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
    power: toValue(a.power),
    attrs: parseAttrs(a.attrs),
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
    power: c.power,
    attrs: [...c.attrs],
    flavor: c.flavor,
    joined,
    mvp: 0,
  };
}

const HISTORY_RARITY_WEIGHT: Record<Rarity, number> = { N: 60, R: 55, SR: 32, SSR: 13 };
const PRESENT_RARITY_WEIGHT: Record<Rarity, number> = { N: 70, R: 24, SR: 6, SSR: 0 };

/** 時代の山札から転校生候補をk人めくる（選ばれなければ山札に戻る） */
export function drawOptions(s: GameState, eraIdx: number, k: number): Student[] {
  const era = ERAS[eraIdx].id;
  const joined = joinedLabel(s);
  if (era === 'present') {
    return Array.from({ length: k }, () =>
      fromArchetype(s, ARCHETYPES[weightedIndex(s, ARCHETYPES.map((a) => PRESENT_RARITY_WEIGHT[a.rarity]))], joined),
    );
  }
  const pool = [...s.pools[era]];
  const out: Student[] = [];
  while (out.length < k && pool.length > 0) {
    const idx = weightedIndex(s, pool.map((id) => HISTORY_RARITY_WEIGHT[CARD_MAP[id].rarity]));
    out.push(fromCard(s, pool[idx], joined));
    pool.splice(idx, 1);
  }
  return out;
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

/** その年の3学期ぶんの時代をランダムに決める（ゲーム中はなるべく被らない） */
function drawYearEras(s: GameState) {
  s.yearEras = [];
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

/** 山札：全時代共通のカード＋今学期の時代カード */
function buildDeck(s: GameState): string[] {
  const era = ERAS[currentEra(s)].id;
  const deck: string[] = [];
  for (const e of ALL_EVENT_CARDS) {
    if ((e.kind === 'contest' || e.kind === 'normal') && e.era && e.era !== era) continue;
    for (let i = 0; i < e.count; i++) deck.push(e.id);
  }
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

function startSummer(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  log(s, '夏休み！今年の時代から1つ選んで、転校生を1人スカウトできる。');
  s.phase = { kind: 'summerTravel', player: s.queue[0] };
}

function nextSummer(s: GameState) {
  s.queueIdx++;
  if (s.queueIdx < s.queue.length) s.phase = { kind: 'summerTravel', player: s.queue[s.queueIdx] };
  else advanceMonth(s);
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

/** 通常カード：アイコンを持つ生徒1人につき+1（係ボーナスでさらに+1）を全クラスに加点 */
function resolveNormal(s: GameState, c: NormalCard): EventResult {
  const rows = s.players.map((p, i) => {
    const sc = iconCount(p, c.attr);
    p.points += sc.total;
    for (const h of sc.holders) h.mvp++;
    return { player: i, count: sc.total, delta: sc.total };
  });
  sortRows(rows);
  logRows(s, c.name, rows);
  return { title: c.name, icon: ATTR_ICON[c.attr], attr: c.attr, tone: 'normal', desc: '', rule: cardRule(c), rows };
}

/** イベントカード（引いた人だけ）：そのアイコンを持つ子の数値の合計＋係ボーナスが入る。時代カードはその時代の生徒が2倍 */
function resolveContest(s: GameState, c: ContestCard, pi: number): EventResult {
  const p = s.players[pi];
  const sc = attrScore(p, c.attr, c.era);
  p.points += sc.total;
  sc.holders.forEach((h) => h.mvp++);
  const rows: ResultRow[] = [{ player: pi, count: sc.total, delta: sc.total }];
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: c.attr, tone: c.era ? 'era' : 'contest', desc: c.desc, rule: cardRule(c), rows };
}

/** カチコミ（引いた人だけ）：👊の数値の合計が敵の強さ以上なら撃退 */
function resolveRaid(s: GameState, c: RaidCard, pi: number): EventResult {
  const p = s.players[pi];
  const sc = attrScore(p, 'fight');
  const win = sc.total >= c.threat;
  const delta = win ? RAID_WIN : RAID_LOSE;
  p.points += delta;
  if (win) sc.holders.forEach((h) => h.mvp++);
  const rows: ResultRow[] = [{ player: pi, count: sc.total, delta, note: win ? '撃退' : sc.total ? '突破' : '無防備' }];
  logRows(s, c.name, rows);
  return { title: c.name, icon: c.icon, attr: 'fight', tone: 'contest', desc: `敵の強さ ${c.threat}`, rule: cardRule(c), rows };
}

function resolveFixed(s: GameState, f: FixedEvent): EventResult {
  const values = s.players.map((p) => (f.rule === 'test' ? testScore(p, TEST_YANKEE_PENALTY) : totalPower(p)));
  const rows = sortRows(awardRanks(s, values, f.mult));
  logRows(s, f.name, rows);
  return { title: f.name, icon: f.icon, attr: f.rule === 'test' ? 'study' : 'all', tone: 'fixed', desc: '', rule: fixedRule(f), rows };
}

function setResult(s: GameState, pi: number | null, result: EventResult, ctx: ResultCtx) {
  s.phase = { kind: 'result', player: pi, result, ctx };
}

function startTransfer(s: GameState, pi: number, eraIdx: number, title: string, ctx: ResultCtx) {
  // その時代の偉人が残っていなければ、現代の生徒が転入してくる
  if (s.pools[ERAS[eraIdx].id].length === 0) eraIdx = PRESENT_INDEX;
  const era = ERAS[eraIdx];
  const options = drawOptions(s, eraIdx, 3);
  s.phase = { kind: 'transfer', player: pi, options, picks: 1, added: [], title, reason: `${era.icon} ${era.name}から`, ctx };
}

/** 転校で押しつけられる相手（定員に空きがあるクラス） */
export function pushTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi && p.students.length < MAX_CLASS).map((p) => p.id);
}

function resolveDraw(s: GameState, pi: number) {
  if (s.eventDeck.length === 0) {
    s.eventDeck = shuffle(s, s.discard);
    s.discard = [];
    log(s, '捨て札をシャッフルして山札に戻した。');
  }
  const id = s.eventDeck.pop()!;
  s.discard.push(id);
  const c = EVENT_MAP[id];
  const p = s.players[pi];
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
    case 'transfer':
      startTransfer(s, pi, currentEra(s), c.name, 'turn');
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

function finishTransfer(s: GameState) {
  const ph = s.phase;
  if (ph.kind !== 'transfer') return;
  const p = s.players[ph.player];
  if (ph.added.length) log(s, `${p.name}のクラスに${ph.added.map((a) => a.name).join('、')}が転入！`, ph.player);
  else log(s, `${p.name}は転入を見送った。`, ph.player);
  setResult(
    s,
    ph.player,
    {
      title: ph.title,
      icon: ph.added.length ? '🚪' : '🙅',
      tone: 'personal',
      desc: ph.added.length ? `${ph.added.map((a) => a.name).join('と')}が転入してきた！` : '今回は見送った。',
      rows: [],
      students: ph.added,
    },
    ph.ctx,
  );
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
          nextSummer(s);
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
    case 'travel': {
      if (ph.kind !== 'summerTravel' || !s.yearEras.includes(a.era)) return prev;
      log(s, `${s.players[ph.player].name}は夏休みに${ERAS[a.era].name}へ！`, ph.player);
      startTransfer(s, ph.player, a.era, '夏休み合宿', 'summer');
      return s;
    }
    case 'drawEvent': {
      if (ph.kind !== 'draw') return prev;
      resolveDraw(s, ph.player);
      return s;
    }
    case 'pickTransfer': {
      if (ph.kind !== 'transfer') return prev;
      if (a.index === null) {
        finishTransfer(s);
        return s;
      }
      const opt = ph.options[a.index];
      if (!opt) return prev;
      const p = s.players[ph.player];
      if (p.students.length >= MAX_CLASS) {
        if (!a.releaseUid) return prev;
        const gone = removeStudent(s, p, a.releaseUid, true);
        if (!gone) return prev;
        log(s, `${gone.name}は元の時代へ帰っていった…`, ph.player);
      }
      addStudent(s, p, opt);
      ph.options.splice(a.index, 1);
      ph.added.push(opt);
      ph.picks--;
      if (ph.picks <= 0 || ph.options.length === 0) finishTransfer(s);
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
