import {
  MAX_CLASS,
  RANK_POINTS,
  applyDelta,
  auraTotals,
  classPower,
  effStats,
  isAnimal,
  roleOf,
} from './calc';
import { CARDS, CARD_MAP } from './data/cards';
import { CLASS_CARDS, CLASS_MAP, className } from './data/classes';
import { ERAS, PRESENT_INDEX } from './data/eras';
import {
  EVENT_MAP,
  FIXED_BY_MONTH,
  PERSONAL_EVENTS,
  SCHOOL_EVENTS,
  describeScoring,
  type PersonalEventDef,
  type SchoolEventDef,
} from './data/events';
import { ARCHETYPES, GIVEN_NAMES, STARTER_ARCHETYPES, SURNAMES, type Archetype } from './data/modern';
import { ROLES } from './data/roles';
import {
  STAT_KEYS,
  STAT_LABEL,
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
export const STAT_CAP = 30;

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

function buildDeck(s: GameState): string[] {
  const deck: string[] = [];
  for (const e of [...SCHOOL_EVENTS, ...PERSONAL_EVENTS]) for (let i = 0; i < e.count; i++) deck.push(e.id);
  return shuffle(s, deck);
}

export function newGame(setup: SetupPlayer[], years: number, seed = Date.now()): GameState {
  const pools = Object.fromEntries(ERAS.map((e) => [e.id, [] as string[]])) as Record<EraId, string[]>;
  for (const c of CARDS) pools[c.era].push(c.id);
  const s: GameState = {
    version: 1,
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
      era: PRESENT_INDEX,
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
  const [pe, study, fight, art, charm] = a.stats;
  const base = { pe, study, fight, art, charm };
  for (const k of STAT_KEYS) base[k] = Math.max(0, base[k] + randInt(s, 3) - 1);
  return {
    uid: `u${s.uidCounter++}`,
    name: `${pick(s, SURNAMES)} ${pick(s, GIVEN_NAMES)}`,
    title: a.title,
    era: 'present',
    rarity: a.rarity,
    icon: a.icon,
    base,
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
    base: { ...c.stats },
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
  const joined = '初期メンバー';
  const members: Student[] = card.guaranteed.map((id) => fromArchetype(s, ARCHETYPES.find((a) => a.id === id)!, joined));
  while (members.length < 12) {
    const w = STARTER_ARCHETYPES.map((a) => card.bias[a.group] ?? 0.3);
    members.push(fromArchetype(s, STARTER_ARCHETYPES[weightedIndex(s, w)], joined));
  }
  p.students = shuffle(s, members);
  log(s, `${p.name}は「${card.nick}」（${className(card.id, s.year)}）を引いた！`, pi);
}

function startTerm(s: GameState) {
  s.queue = order(s);
  s.queueIdx = 0;
  const t = termOfMonth(MONTHS[s.monthIdx]);
  log(s, `${t}学期が始まった。係を編成しよう！`);
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
  s.phase = { kind: 'travel', player: pi, dice: null };
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
    const lines: string[] = [];
    for (const p of s.players) {
      for (const st of p.students) {
        const k = pick(s, STAT_KEYS);
        st.base[k] = Math.min(STAT_CAP, st.base[k] + 1);
      }
      lines.push(`${p.name}のクラス：全員の能力がどれか1つ+1`);
    }
    log(s, `${s.year}年生が終わった。進級！みんな少し成長した。`);
    s.phase = {
      kind: 'result',
      player: null,
      ctx: 'yearEnd',
      result: {
        title: `進級！ ${s.year + 1}年生へ`,
        icon: '🌸',
        desc: '春休みを経てクラスのみんなが少しずつ成長した。',
        rows: [],
        lines,
      },
    };
  } else {
    const res = resolveSchool(s, EVENT_MAP.graduation as SchoolEventDef, null);
    s.phase = { kind: 'result', player: null, result: res, ctx: 'final' };
  }
}

function newYear(s: GameState) {
  s.year++;
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
        r.note = '撃退！';
        for (const c of powers[r.player].contributors) c.mvp++;
      } else {
        r.delta = applyDelta(p, ev.threshold.lose);
        r.note = '突破された…';
      }
    }
  } else {
    const table = RANK_POINTS[n] ?? RANK_POINTS[5];
    for (const r of rows) {
      r.rank = rows.filter((o) => o.power! > r.power!).length;
      const pts = Math.round((table[r.rank] ?? 0) * ev.mult);
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
    desc: ev.desc,
    scoring: describeScoring(ev) + (ev.threshold ? ` ／ 撃退で${ev.threshold.win}pt・突破されると${ev.threshold.lose}pt` : ` ／ 順位点×${ev.mult}`),
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
  return { title: ev.name, icon: ev.icon, desc: ev.desc, rows: [{ player: pi, delta: d }], lines };
}

function setResult(s: GameState, pi: number | null, result: EventResult, ctx: ResultCtx) {
  s.phase = { kind: 'result', player: pi, result, ctx };
}

function startTransfer(
  s: GameState,
  pi: number,
  count: number,
  picks: number,
  title: string,
  reason: string,
  ctx: ResultCtx,
) {
  const options = drawOptions(s, s.players[pi].era, count);
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

function maxEffCharm(p: Player): number {
  const auras = auraTotals(p);
  return Math.max(0, ...p.students.map((st) => effStats(p, st, auras).charm));
}

function resolveDraw(s: GameState, pi: number) {
  if (s.eventDeck.length === 0) {
    s.eventDeck = buildDeck(s);
    log(s, 'イベントの山札をシャッフルし直した。');
  }
  const id = s.eventDeck.pop()!;
  const ev = EVENT_MAP[id];
  const p = s.players[pi];
  const era = ERAS[p.era];
  if (ev.kind === 'school') {
    setResult(s, pi, resolveSchool(s, ev, pi), 'turn');
    return;
  }
  switch (ev.kind) {
    case 'transfer':
      startTransfer(s, pi, 3, 1, ev.name, `${era.icon} ${era.name}から転校生候補が3人。1人を選んで迎え入れよう。`, 'turn');
      return;
    case 'rush':
      startTransfer(s, pi, 4, 2, ev.name, `${era.icon} ${era.name}から候補が4人！2人まで迎え入れられる。`, 'turn');
      return;
    case 'storm': {
      let to = p.era;
      while (to === p.era) to = randInt(s, ERAS.length);
      p.era = to;
      log(s, `${p.name}のタイムマシンが時空嵐で${ERAS[to].name}へ飛ばされた！`, pi);
      startTransfer(s, pi, 2, 1, ev.name, `${ERAS[to].icon} ${ERAS[to].name}に不時着。2人の候補から1人連れて帰れる。`, 'turn');
      return;
    }
    case 'warp':
      s.phase = { kind: 'warp', player: pi };
      return;
    case 'train':
      s.phase = { kind: 'train', player: pi };
      return;
    case 'poach': {
      if (p.students.length >= MAX_CLASS || poachable(s, pi).length === 0) {
        setResult(s, pi, personalResult(s, pi, ev, 0, ['引き抜ける生徒がいなかった…。']), 'turn');
      } else {
        s.phase = { kind: 'poach', player: pi };
      }
      return;
    }
    case 'bonus':
      setResult(s, pi, personalResult(s, pi, ev, 4, []), 'turn');
      return;
    case 'inspection': {
      const y = p.students.filter((st) => st.tags.includes('ヤンキー')).length;
      const delta = y === 0 ? 2 : -2 * y;
      setResult(
        s,
        pi,
        personalResult(s, pi, ev, delta, [y === 0 ? 'ヤンキーはいなかった。模範的なクラス！' : `ヤンキーが${y}人…色々出てきた。`]),
        'turn',
      );
      return;
    }
    case 'crisis': {
      const c = maxEffCharm(p);
      const ok = c >= 15;
      setResult(
        s,
        pi,
        personalResult(s, pi, ev, ok ? 5 : -5, [
          `クラスで一番の人望：${Math.round(c * 10) / 10}`,
          ok ? 'カリスマがクラスをまとめ上げた！' : 'まとめ役がいない…クラスがバラバラに。',
        ]),
        'turn',
      );
      return;
    }
    case 'zoo': {
      const animals = p.students.filter(isAnimal);
      if (animals.length === 0) {
        setResult(s, pi, personalResult(s, pi, ev, 1, ['動物はいないけど小屋はピカピカ。+1pt']), 'turn');
        return;
      }
      const card = CLASS_MAP[p.classCardId!];
      const hasKeeper = card.roles.some((r, i) => ROLES[r].animal && p.roles[i]);
      const delta = hasKeeper ? 3 * animals.length : -2 * animals.length;
      setResult(
        s,
        pi,
        personalResult(s, pi, ev, delta, [
          `恐竜・動物：${animals.map((a) => a.name).join('、')}`,
          hasKeeper ? '飼育係がしっかりお世話していた！' : '飼育係がいない！小屋が大惨事に…。',
        ]),
        'turn',
      );
      return;
    }
    case 'parents': {
      const auras = auraTotals(p);
      const avg = p.students.reduce((a, st) => a + effStats(p, st, auras).charm, 0) / Math.max(1, p.students.length);
      const delta = Math.round(avg / 2);
      setResult(s, pi, personalResult(s, pi, ev, delta, [`クラスの平均人望：${Math.round(avg * 10) / 10}`]), 'turn');
      return;
    }
  }
}

export function poachable(s: GameState, pi: number): { player: number; student: Student }[] {
  const out: { player: number; student: Student }[] = [];
  s.players.forEach((p, i) => {
    if (i === pi) return;
    for (const st of p.students) if (!p.roles.includes(st.uid) && p.students.length > 6) out.push({ player: i, student: st });
  });
  return out;
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
    case 'continue': {
      if (ph.kind === 'classDraw' && ph.drawn) {
        if (ph.player + 1 < s.players.length) s.phase = { kind: 'classDraw', player: ph.player + 1, drawn: false };
        else startTerm(s);
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
      p.roles = [...a.roles];
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
    case 'rollDice': {
      if (ph.kind !== 'travel' || ph.dice !== null) return prev;
      ph.dice = randInt(s, 6) + 1;
      return s;
    }
    case 'travel': {
      if (a.era < 0 || a.era >= ERAS.length) return prev;
      if (ph.kind === 'travel') {
        if (ph.dice === null) return prev;
        const p = s.players[ph.player];
        if (Math.abs(a.era - p.era) > ph.dice) return prev;
        if (a.era !== p.era) log(s, `${p.name}のタイムマシンが${ERAS[a.era].name}へ移動（出目${ph.dice}）`, ph.player);
        p.era = a.era;
        s.phase = { kind: 'draw', player: ph.player };
        return s;
      }
      if (ph.kind === 'warp') {
        const p = s.players[ph.player];
        p.era = a.era;
        const ev = EVENT_MAP.warp as PersonalEventDef;
        setResult(s, ph.player, personalResult(s, ph.player, ev, 0, [`${ERAS[a.era].icon} ${ERAS[a.era].name}へワープした！`]), 'turn');
        return s;
      }
      if (ph.kind === 'summerTravel') {
        const p = s.players[ph.player];
        p.era = a.era;
        log(s, `${p.name}は夏休みに${ERAS[a.era].name}へタイムトラベル！`, ph.player);
        startTransfer(
          s,
          ph.player,
          3,
          1,
          '夏休みタイムトラベル合宿',
          `${ERAS[a.era].icon} ${ERAS[a.era].name}で3人と仲良くなった。1人をスカウトしよう。`,
          'summer',
        );
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
    case 'train': {
      if (ph.kind !== 'train') return prev;
      const p = s.players[ph.player];
      const st = p.students.find((x) => x.uid === a.uid);
      if (!st) return prev;
      st.base[a.stat] = Math.min(STAT_CAP, st.base[a.stat] + 2);
      const ev = EVENT_MAP.train as PersonalEventDef;
      setResult(s, ph.player, personalResult(s, ph.player, ev, 0, [`${st.name}の${STAT_LABEL[a.stat]}が+2！（${st.base[a.stat]}）`]), 'turn');
      return s;
    }
    case 'poach': {
      if (ph.kind !== 'poach') return prev;
      const ev = EVENT_MAP.poach as PersonalEventDef;
      if (a.uid === null) {
        setResult(s, ph.player, personalResult(s, ph.player, ev, 0, ['引き抜きはやめておいた。']), 'turn');
        return s;
      }
      const target = poachable(s, ph.player).find((x) => x.student.uid === a.uid);
      if (!target) return prev;
      const victim = s.players[target.player];
      const st = removeStudent(s, victim, a.uid, false)!;
      s.players[ph.player].students.push(st);
      victim.points += 3;
      setResult(
        s,
        ph.player,
        personalResult(s, ph.player, ev, 0, [`${victim.name}のクラスから${st.name}を引き抜いた！`, `${victim.name}には移籍金+3pt`]),
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

export function playerRole(p: Player, uid: string) {
  return roleOf(p, uid);
}
