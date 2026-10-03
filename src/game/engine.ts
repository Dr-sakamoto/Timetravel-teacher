import { MAX_CLASS, MIN_CLASS, POWER_CAP, RANK_POINTS, applyDelta, classPower, iconPoints, roleSlots } from './calc';
import { CARDS, CARD_MAP, parseAttrs } from './data/cards';
import { CLASS_CARDS, CLASS_MAP, className } from './data/classes';
import { ERAS, PRESENT_INDEX } from './data/eras';

/** 転校生がやってくる歴史上の時代（現代以外） */
export const HISTORY_ERAS = ERAS.map((_, i) => i).filter((i) => i !== PRESENT_INDEX);
import {
  ERA_EVENTS,
  EVENT_MAP,
  FIXED_BY_MONTH,
  ICON_EVENTS,
  PERSONAL_EVENTS,
  SCHOOL_EVENTS,
  aggText,
  effectText,
  type IconEventDef,
  type PersonalEventDef,
  type SchoolEventDef,
} from './data/events';
import { ARCHETYPES, GIVEN_NAMES, STARTER_ARCHETYPES, SURNAMES, type Archetype } from './data/modern';
import { ROLES } from './data/roles';
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

export const MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
export const PLAYER_COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#ffd43b', '#da77f2'];

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

/** 山札：全時代共通のカード＋今学期の時代の固有カード */
function buildDeck(s: GameState): string[] {
  const era = ERAS[currentEra(s)].id;
  const deck: string[] = [];
  const cards = [...ICON_EVENTS, ...SCHOOL_EVENTS, ...PERSONAL_EVENTS, ...ERA_EVENTS.filter((e) => e.era === era)];
  for (const e of cards) for (let i = 0; i < e.count; i++) deck.push(e.id);
  return shuffle(s, deck);
}

export function newGame(setup: SetupPlayer[], years: number, seed = Date.now()): GameState {
  const pools = Object.fromEntries(ERAS.map((e) => [e.id, [] as string[]])) as Record<EraId, string[]>;
  for (const c of CARDS) pools[c.era].push(c.id);
  const s: GameState = {
    version: 5,
    yearEras: [],
    eraDeck: [],
    rng: seed | 0,
    players: setup.map((p, i) => ({
      id: i,
      name: p.name,
      isCpu: p.isCpu,
      color: PLAYER_COLORS[i],
      classCardId: null,
      students: [],
      roles: [],
      points: 0,
    })),
    years,
    year: 1,
    monthIdx: 0,
    rotation: 0,
    queue: setup.map((_, i) => i),
    queueIdx: 0,
    phase: { kind: 'classDraw', player: 0, drawn: false },
    eventDeck: [],
    pools,
    usedClassCards: [],
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

// ---------- 生徒生成 ----------

function joinedLabel(s: GameState): string {
  return `${s.year}年${MONTHS[Math.min(s.monthIdx, 11)]}月`;
}

function fromArchetype(s: GameState, a: Archetype, joined: string): Student {
  // 同じ部活でも少し個人差がある
  const roll = rand(s);
  const power = Math.max(1, a.power + (roll < 0.2 ? -1 : roll > 0.8 ? 1 : 0));
  return {
    uid: `u${s.uidCounter++}`,
    name: `${pick(s, SURNAMES)} ${pick(s, GIVEN_NAMES)}`,
    title: a.title,
    era: 'present',
    rarity: a.rarity,
    icon: a.icon,
    power,
    attrs: parseAttrs(a.attrs),
    tags: [...a.tags],
    ability: a.ability,
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
    tags: [...c.tags],
    ability: c.ability,
    flavor: c.flavor,
    joined,
    mvp: 0,
  };
}

const HISTORY_RARITY_WEIGHT: Record<Rarity, number> = { N: 60, R: 55, SR: 32, SSR: 13 };
const PRESENT_RARITY_WEIGHT: Record<Rarity, number> = { N: 70, R: 24, SR: 6, SSR: 0 };

/** 時代から転校生候補をk人引く（歴史カードは引いただけではプールから消えない） */
export function drawOptions(s: GameState, eraIdx: number, k: number): Student[] {
  const era = ERAS[eraIdx].id;
  const joined = joinedLabel(s);
  if (era === 'present') {
    const out: Student[] = [];
    for (let i = 0; i < k; i++) {
      const idx = weightedIndex(s, ARCHETYPES.map((a) => PRESENT_RARITY_WEIGHT[a.rarity]));
      out.push(fromArchetype(s, ARCHETYPES[idx], joined));
    }
    return out;
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

// ---------- 進行 ----------

function order(s: GameState): number[] {
  const n = s.players.length;
  return Array.from({ length: n }, (_, i) => (i + s.rotation) % n);
}

function drawClass(s: GameState, pi: number) {
  const p = s.players[pi];
  const avail = CLASS_CARDS.filter((c) => !s.usedClassCards.includes(c.id));
  const card = pick(s, avail);
  s.usedClassCards.push(card.id);
  p.classCardId = card.id;
  p.roles = card.roles.map(() => null);
  p.students = [];
  log(s, `${p.name}は「${card.nick}」（${className(card.id, s.year)}）を引いた！`, pi);
}

export const STARTING_MEMBERS = 6;

/** 初期メンバーを1人引く（クラスカードの傾向で出やすい生徒が変わる） */
function drawMember(s: GameState, pi: number): Student {
  const p = s.players[pi];
  const card = CLASS_MAP[p.classCardId!];
  const w = STARTER_ARCHETYPES.map((a) => card.bias[a.group] ?? 0.3);
  const st = fromArchetype(s, STARTER_ARCHETYPES[weightedIndex(s, w)], '初期メンバー');
  p.students.push(st);
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

function startTerm(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  const t = termOfMonth(MONTHS[s.monthIdx]);
  const era = ERAS[currentEra(s)];
  log(s, `${t}学期スタート！今学期の時代は${era.icon}${era.name}。`);
  s.eventDeck = buildDeck(s);
  s.phase = { kind: 'roles', player: s.queue[0] };
}

function startTurns(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  startTurn(s);
}

function startTurn(s: GameState) {
  const pi = s.queue[s.queueIdx];
  const p = s.players[pi];
  let inc = 0;
  for (const st of p.students) if (st.ability?.kind === 'income') inc += st.ability.amount;
  if (inc > 0) {
    p.points += inc;
    log(s, `${p.name}のクラスにお小遣い収入 +${inc}pt`, pi);
  }
  s.phase = { kind: 'draw', player: pi };
}

function endTurn(s: GameState) {
  s.queueIdx++;
  if (s.queueIdx < s.queue.length) startTurn(s);
  else monthEnd(s);
}

function monthEnd(s: GameState) {
  const m = MONTHS[s.monthIdx];
  const fixed = FIXED_BY_MONTH[m];
  if (fixed) {
    const res = resolveSchool(s, EVENT_MAP[fixed] as SchoolEventDef, null);
    s.phase = { kind: 'result', player: null, result: res, ctx: 'monthEnd' };
  } else {
    advanceMonth(s);
  }
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
  log(s, '夏休み！タイムトラベル合宿で好きな時代へ行き、転校生を1人スカウトできる。');
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
    for (const p of s.players) {
      for (const st of p.students) st.power = Math.min(POWER_CAP, st.power + 1);
    }
    log(s, `${s.year}年生が終わった。進級！みんな少し成長した。`);
    s.phase = {
      kind: 'result',
      player: null,
      ctx: 'yearEnd',
      result: {
        title: `進級！ ${s.year + 1}年生へ`,
        icon: '🌸',
        desc: '全員の数値+1',
        rows: [],
        lines: [],
      },
    };
  } else {
    const res = resolveSchool(s, EVENT_MAP.graduation as SchoolEventDef, null);
    s.phase = { kind: 'result', player: null, result: res, ctx: 'final' };
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

export function resolveSchool(s: GameState, ev: SchoolEventDef, drawer: number | null): EventResult {
  const n = s.players.length;
  const powers = s.players.map((p) => classPower(p, ev));
  const rows: ResultRow[] = s.players.map((_, i) => ({
    player: i,
    power: powers[i].power,
    delta: 0,
    top: powers[i].contributors.map((c) => c.name),
  }));
  let threat: number | undefined;
  if (ev.threshold) {
    threat = pick(s, ev.threshold.threats);
    for (const r of rows) {
      const p = s.players[r.player];
      if (r.power! >= threat) {
        r.delta = applyDelta(p, ev.threshold.win);
        r.note = '撃退';
        for (const c of powers[r.player].contributors) c.mvp++;
      } else {
        r.delta = applyDelta(p, ev.threshold.lose);
        r.note = r.power ? '突破' : '無防備';
      }
    }
  } else {
    const table = RANK_POINTS[n] ?? RANK_POINTS[5];
    const minPower = Math.min(...rows.map((r) => r.power!));
    for (const r of rows) {
      r.rank = rows.filter((o) => o.power! > r.power!).length;
      let pts = Math.round((table[r.rank] ?? 0) * ev.mult);
      for (const e of ev.effects) {
        if (e.kind === 'firstBonus' && r.rank === 0) pts += e.amount;
        if (e.kind === 'everyone') pts += e.amount;
        if (e.kind === 'lastPenalty' && r.power === minPower && rows.some((o) => o.power! > minPower)) pts -= e.amount;
      }
      r.delta = applyDelta(s.players[r.player], pts);
      if (r.delta > 0) for (const c of powers[r.player].contributors) c.mvp++;
    }
  }
  rows.sort((a, b) => b.power! - a.power!);
  const top = rows[0];
  const who = drawer !== null ? `（${s.players[drawer].name}が引いた）` : '';
  log(
    s,
    `【${ev.name}】${who} ` +
      rows.map((r) => `${s.players[r.player].name} ${r.delta >= 0 ? '+' : ''}${r.delta}`).join(' / ') +
      (ev.threshold ? '' : ` — 1位は${s.players[top.player].name}`),
  );
  return {
    title: ev.name,
    icon: ev.icon,
    attr: ev.attr,
    tone: 'special',
    desc: ev.desc,
    scoring: aggText(ev) + (ev.threshold ? `　撃退+${ev.threshold.win} / 突破${ev.threshold.lose}` : ev.mult !== 1 ? `　得点×${ev.mult}` : ''),
    effects: ev.effects.map(effectText),
    rows,
    threat,
    school: true,
  };
}

function personalResult(
  s: GameState,
  pi: number,
  ev: PersonalEventDef,
  delta: number,
  lines: string[],
): EventResult {
  const p = s.players[pi];
  const d = delta === 0 ? 0 : applyDelta(p, delta);
  log(s, `${p.name}：${ev.name}${d !== 0 ? ` ${d > 0 ? '+' : ''}${d}pt` : ''}`, pi);
  return { title: ev.name, icon: ev.icon, tone: 'special', desc: ev.desc, rows: [{ player: pi, delta: d }], lines };
}

function setResult(s: GameState, pi: number | null, result: EventResult, ctx: ResultCtx) {
  s.phase = { kind: 'result', player: pi, result, ctx };
}

function startTransfer(
  s: GameState,
  pi: number,
  eraIdx: number,
  count: number,
  picks: number,
  title: string,
  reason: string,
  ctx: ResultCtx,
) {
  const options = drawOptions(s, eraIdx, count);
  if (options.length === 0) {
    setResult(
      s,
      pi,
      { title, icon: '🕳️', desc: 'この時代にはもう転校してくれる人が残っていなかった…。', rows: [{ player: pi, delta: 0 }] },
      ctx,
    );
    return;
  }
  s.phase = { kind: 'transfer', player: pi, options, picks, added: [], title, reason, ctx };
}

function resolveDraw(s: GameState, pi: number) {
  if (s.eventDeck.length === 0) {
    s.eventDeck = buildDeck(s);
    log(s, 'イベントの山札をシャッフルし直した。');
  }
  const id = s.eventDeck.pop()!;
  const ev = EVENT_MAP[id];
  const p = s.players[pi];
  const eraIdx = currentEra(s);
  const era = ERAS[eraIdx];
  if (ev.kind === 'school') {
    setResult(s, pi, resolveSchool(s, ev, pi), 'turn');
    return;
  }
  if (ev.kind === 'icon') {
    setResult(s, pi, resolveIcon(s, ev, pi), 'turn');
    return;
  }
  if (ev.kind === 'transfer') {
    startTransfer(s, pi, eraIdx, 3, 1, ev.name, `${era.icon} ${era.name}から`, 'turn');
    return;
  }
  // 転校：押しつけられる生徒と相手がいなければ不発
  if (pushTargets(s, pi).length === 0 || p.students.length <= MIN_CLASS) {
    setResult(s, pi, { title: ev.name, icon: ev.icon, desc: '押しつけられる相手がいなかった。', rows: [{ player: pi, delta: 0 }] }, 'turn');
    return;
  }
  s.phase = { kind: 'push', player: pi };
}

/** 通常イベント：その属性を持つ生徒1人につき1pt（係で強化していれば+1） */
function resolveIcon(s: GameState, ev: IconEventDef, drawer: number): EventResult {
  const rows: ResultRow[] = s.players.map((p, i) => {
    const h = iconPoints(p, ev.attr);
    return { player: i, delta: applyDelta(p, h.points), note: `${h.count}人` };
  });
  rows.sort((x, y) => y.delta - x.delta);
  log(s, `${ev.icon}${ev.name}（${s.players[drawer].name}） ` + rows.map((r) => `${s.players[r.player].name} +${r.delta}`).join(' / '));
  return { title: ev.name, icon: ev.icon, attr: ev.attr, tone: 'blue', desc: ev.desc, scoring: `${ATTR_ICON[ev.attr]} 1人+1pt（係で強化中は+2）`, rows, school: true };
}

/** 転校で押しつけられる相手（定員に空きがあるクラス） */
export function pushTargets(s: GameState, pi: number): number[] {
  return s.players.filter((p) => p.id !== pi && p.students.length < MAX_CLASS).map((p) => p.id);
}

function finishTransfer(s: GameState) {
  const ph = s.phase;
  if (ph.kind !== 'transfer') return;
  const p = s.players[ph.player];
  const res: EventResult = {
    title: ph.title,
    icon: ph.added.length ? '🚪' : '🙅',
    desc: ph.added.length ? `${ph.added.map((a) => a.name).join('と')}が転校してきた！` : '今回は誰も迎え入れなかった。',
    rows: [{ player: ph.player, delta: 0 }],
    students: ph.added,
  };
  if (ph.added.length) log(s, `${p.name}のクラスに${ph.added.map((a) => `${a.name}（${a.rarity}）`).join('、')}が転校してきた！`, ph.player);
  else log(s, `${p.name}は転校生を見送った。`, ph.player);
  setResult(s, ph.player, res, ph.ctx);
}

// ---------- メイン：アクション適用 ----------

/** 現在操作すべきプレイヤー（結果表示中で誰でも進められる場合はnull） */
export function actingPlayer(s: GameState): number | null {
  const ph = s.phase;
  if (ph.kind === 'gameOver') return null;
  if (ph.kind === 'result') return ph.player;
  return ph.player;
}

export function step(prev: GameState, a: Action): GameState {
  const s: GameState = structuredClone(prev);
  const ph = s.phase;
  switch (a.type) {
    case 'drawClass': {
      if (ph.kind !== 'classDraw' || ph.drawn) return prev;
      drawClass(s, ph.player);
      ph.drawn = true;
      return s;
    }
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
      if (ph.kind === 'classDraw' && ph.drawn) {
        if (ph.player + 1 < s.players.length) s.phase = { kind: 'classDraw', player: ph.player + 1, drawn: false };
        else afterMemberDraw(s, null);
        return s;
      }
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
      if (a.roles.length !== p.roles.length) return prev;
      const ids = new Set(p.students.map((x) => x.uid));
      const used = a.roles.filter((r): r is string => r !== null);
      if (used.some((u) => !ids.has(u)) || new Set(used).size !== used.length) return prev;
      const k = roleSlots(p);
      p.roles = a.roles.map((r, i) => (i < k ? r : null));
      const card = CLASS_MAP[p.classCardId!];
      const desc = card.roles
        .map((r, i) => `${ROLES[r].name}:${p.students.find((x) => x.uid === p.roles[i])?.name ?? 'なし'}`)
        .join(' ');
      log(s, `${p.name}の係編成 — ${desc}`, ph.player);
      s.queueIdx++;
      if (s.queueIdx < s.queue.length) s.phase = { kind: 'roles', player: s.queue[s.queueIdx] };
      else startTurns(s);
      return s;
    }
    case 'travel': {
      if (a.era < 0 || a.era >= ERAS.length) return prev;
      if (a.era === PRESENT_INDEX) return prev;
      if (ph.kind === 'summerTravel') {
        if (!s.yearEras.includes(a.era)) return prev;
        const p = s.players[ph.player];
        log(s, `${p.name}は夏休みに${ERAS[a.era].name}へタイムトラベル！`, ph.player);
        startTransfer(s, ph.player, a.era, 3, 1, '夏休み合宿', `${ERAS[a.era].icon} ${ERAS[a.era].name}から`, 'summer');
        return s;
      }
      return prev;
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
        log(s, `${gone.name}は${ERAS.find((e) => e.id === gone.era)!.name}へ帰っていった…`, ph.player);
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
      const ev = EVENT_MAP.push as PersonalEventDef;
      if (a.uid === null) {
        setResult(s, ph.player, personalResult(s, ph.player, ev, 0, ['やっぱりやめた。']), 'turn');
        return s;
      }
      if (a.target === undefined || !pushTargets(s, ph.player).includes(a.target)) return prev;
      if (!p.students.some((x) => x.uid === a.uid) || p.students.length <= MIN_CLASS) return prev;
      const st = removeStudent(s, p, a.uid, false)!;
      const to = s.players[a.target];
      to.students.push(st);
      setResult(s, ph.player, personalResult(s, ph.player, ev, 0, [`${st.icon}${st.name} を ${to.name} のクラスへ押しつけた！`]), 'turn');
      return s;
    }
  }
  return prev;
}

export function finalRanking(s: GameState): Player[] {
  return [...s.players].sort((a, b) => b.points - a.points);
}

