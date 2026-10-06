import { describe, expect, it } from 'vitest';
import { cpuAction } from './ai';
import { MAX_CLASS, STARTING_MEMBERS, attrScore, contributions, moveToRole, roleSlots, termNo, testScore, validRoles, validUnlock } from './calc';
import { CARDS, EGG_DINOS, parseAttrs, toIcons } from './data/cards';
import { ERAS, PRESENT_INDEX } from './data/eras';
import { ERA_CARDS, MAX_ICONS, PERSON_CARDS_PER_TERM } from './data/events';
import { ARCHETYPES, MODERN_POOL } from './data/modern';
import { MONTHS, canTake, currentEra, deckBreakdown, droppable, equippable, exchangePairs, marketCost, newGame, step, termOfMonth } from './engine';
import type { Action, Attr, GameState, Player, RoleSeat, Student } from './types';

function playOut(players: number, years: number, seed: number): GameState {
  let s = newGame(
    Array.from({ length: players }, (_, i) => ({ name: `P${i + 1}`, isCpu: true })),
    years,
    seed,
  );
  let steps = 0;
  while (s.phase.kind !== 'gameOver') {
    const a = cpuAction(s);
    if (!a) throw new Error('no action');
    const next = step(s, a);
    if (next === s) throw new Error(`action rejected: ${JSON.stringify(a)} in ${s.phase.kind}`);
    s = next;
    if (++steps > 20000) throw new Error('did not finish');
  }
  return s;
}

/** 山札の一番上に積んだカードを、場の補充でめくらせる（場の1枚を見送ると補充が起こる。ゲリラはその場で起こる） */
const pass: Action = { type: 'pass', slot: 0 };
/** 場の先頭にカードを置いて、それを取る */
function take(s: GameState, id: string): GameState {
  s.market[0] = id;
  return step(s, { type: 'take', slot: 0 });
}

const mk = (uid: string, attrs: Attr[], era: Student['era'] = 'present'): Student => ({
  uid, name: uid, title: '', era, rarity: 'N', icon: '', attrs, flavor: '', joined: '', mvp: 0,
});
const player = (students: Student[], roles: RoleSeat[] = []): Player => ({
  id: 0, name: 'A', isCpu: false, color: '', students, unlocked: [...new Set(roles.map((r) => r.role))], roles, points: 0,
});

describe('engine', () => {
  for (const players of [2, 3, 4, 5]) {
    for (const years of [1, 2, 3]) {
      it(`completes a ${players}-player ${years}-year CPU game`, () => {
        const s = playOut(players, years, players * 100 + years);
        expect(s.year).toBe(years);
        for (const p of s.players) {
          expect(Number.isFinite(p.points)).toBe(true);
          expect(p.students.length).toBeGreaterThanOrEqual(2);
          expect(p.students.length).toBeLessThanOrEqual(MAX_CLASS);
          expect(new Set(p.students.map((x) => x.uid)).size).toBe(p.students.length);
        }
        const cards = s.players.flatMap((p) => p.students.map((x) => x.cardId).filter(Boolean));
        expect(new Set(cards).size).toBe(cards.length);
      });
    }
  }

  it('turns go round in seat order, never twice in a row across months, terms or years', () => {
    for (const players of [2, 4]) {
      let s = newGame(Array.from({ length: players }, (_, i) => ({ name: `P${i + 1}`, isCpu: true })), 2, players);
      const turns: number[] = [];
      const seen = new Set<string>();
      while (s.phase.kind !== 'gameOver') {
        s = step(s, cpuAction(s)!);
        // 新しく手番が始まったところだけ数える（同じ手番の選び直しは数えない）
        const key = `${s.year}-${s.monthIdx}-${s.queueIdx}`;
        if (s.phase.kind === 'draw' && !seen.has(key)) {
          seen.add(key);
          turns.push(s.phase.player);
        }
      }
      expect(turns.length).toBeGreaterThan(players * 10);
      turns.forEach((p, i) => expect(p).toBe(i % players));
    }
  });

  it('deals 6 random modern students one card at a time, alternating', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 1);
    const order: number[] = [];
    while (s.phase.kind === 'memberDraw') {
      order.push(s.phase.player);
      s = step(s, { type: 'drawMember' });
    }
    expect(order.slice(0, 4)).toEqual([0, 1, 0, 1]);
    expect(order).toHaveLength(12);
    expect(s.phase.kind).toBe('roles');
    for (const p of s.players) {
      expect(p.students).toHaveLength(6);
      expect(p.students.every((x) => x.era === 'present' && x.attrs.length >= 1 && x.attrs.length <= 3)).toBe(true);
    }
  });

  it('cards sum all holders, and a role holder counts double', () => {
    const p = player([mk('a', ['study', 'study', 'study']), mk('b', ['study', 'study', 'art']), mk('c', ['sports'])], [{ role: 'study', uid: 'a' }]);
    expect(attrScore(p, 'study')).toMatchObject({ sum: 5, bonus: 3, total: 8 });
    expect(attrScore(p, 'fight').total).toBe(0);
    // 係のアイコンを持っていない子が就いても +1 は付かない
    const q = player([mk('c', ['sports'])], [{ role: 'study', uid: 'c' }]);
    expect(attrScore(q, 'study').total).toBe(0);
  });

  it('era cards double students from that era', () => {
    const p = player([mk('a', ['sports', 'sports'], 'sengoku'), mk('b', ['sports', 'sports'])]);
    expect(attrScore(p, 'sports', 'sengoku').total).toBe(6);
  });

  it('yankees defend against raids but hurt tests', () => {
    const y = player([mk('a', ['sports', 'fight']), mk('b', ['fight', 'fight'])]);
    const n = player([mk('a', ['study']), mk('b', ['study', 'study'])]);
    expect(attrScore(y, 'fight').total).toBeGreaterThan(attrScore(n, 'fight').total);
    expect(testScore(n, 1)).toBeGreaterThan(testScore(y, 1));
    expect(testScore(y, 1)).toBeLessThan(0);
  });

  it('unlocks one role kind per term, starting with 1 (1年1学期→1 … 2年1学期→4)', () => {
    const slots = (year: number, term: number) => roleSlots(termNo(year, term));
    expect([[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [3, 3]].map(([y, t]) => slots(y, t))).toEqual([1, 2, 3, 4, 4, 4]);
  });

  it('regular modern students have 1-2 icons, each with a different set', () => {
    const regular = ARCHETYPES.filter((a) => a.rarity === 'N');
    const keys = regular.map((a) => [...parseAttrs(a.attrs)].sort().join(','));
    expect(regular.every((a) => parseAttrs(a.attrs).length <= 2)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('roles: one per student, one per role, within the unlocked kinds', () => {
    const p = player(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((u) => mk(u, ['study'])));
    const r = (role: RoleSeat['role'], uid: string): RoleSeat => ({ role, uid });
    const all: RoleSeat['role'][] = ['study', 'pe', 'culture', 'leader'];
    expect(validRoles(p, [r('study', 'a'), r('pe', 'b'), r('culture', 'c'), r('leader', 'd')], all)).toBe(true);
    expect(validRoles(p, [r('study', 'a'), r('study', 'b')], all)).toBe(false);
    expect(validRoles(p, [r('study', 'a'), r('pe', 'a')], all)).toBe(false);
    expect(validRoles(p, [r('study', 'a'), r('pe', 'b')], ['study'])).toBe(false);
    expect(validRoles(p, [r('study', 'zz')], all)).toBe(false);
  });

  it('unlock: pick exactly the new kinds for this term, never one already unlocked', () => {
    const p = { ...player([mk('a', ['study'])]), unlocked: ['study' as const] };
    expect(validUnlock(p, ['pe'], 2)).toBe(true);
    expect(validUnlock(p, [], 2)).toBe(false);
    expect(validUnlock(p, ['study'], 2)).toBe(false);
    expect(validUnlock(p, ['pe', 'culture'], 2)).toBe(false);
    expect(validUnlock(p, [], 1)).toBe(true);
  });

  it('yankees always have fight icons, and a good share of them are fight-only', () => {
    const all = [
      ...CARDS.map((c) => ({ name: c.name, attrs: c.attrs, tags: c.tags })),
      ...ARCHETYPES.map((a) => ({ name: a.title, attrs: parseAttrs(a.attrs), tags: a.tags })),
    ];
    // ヤンキーは必ず👊を持つ。現代の👊持ちはみなヤンキー（偉人の👊持ちにはまだタグをつけていない）
    for (const x of [...all, ...EGG_DINOS]) {
      if (x.tags.includes('ヤンキー')) expect(x.attrs, x.name).toContain('fight');
    }
    for (const a of ARCHETYPES) if (parseAttrs(a.attrs).includes('fight')) expect(a.tags, a.title).toContain('ヤンキー');
    const yankees = all.filter((x) => x.tags.includes('ヤンキー'));
    const fightOnly = yankees.filter((x) => x.attrs.every((a) => a === 'fight'));
    // アイコン構成を被らせないので、👊だけの子は少なめ（恐竜の一部は🏃も持つ。ブラキオサウルスを外して少し減った）
    expect(fightOnly.length / yankees.length).toBeGreaterThanOrEqual(0.25);
    expect(fightOnly.length / yankees.length).toBeLessThanOrEqual(0.6);
  });

  it('picks 3 eras a year and person cards come from the current term era', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 2, 42);
    while (s.phase.kind !== 'gameOver') {
      expect(new Set(s.yearEras).size).toBe(3);
      if (s.year > 1) expect(s.yearEras).not.toContain(PRESENT_INDEX);
      const ph = s.phase;
      if (ph.kind === 'result' && ph.result.title === '転入' && ph.result.students?.length && ph.ctx === 'turn') {
        for (const o of ph.result.students) expect([ERAS[currentEra(s)].id, 'present']).toContain(o.era);
      }
      s = step(s, cpuAction(s)!);
    }
  });

  it('year 1 term 1 is the present era; era cards and person cards fill the deck', () => {
    const s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 2, 77);
    expect(s.yearEras[0]).toBe(PRESENT_INDEX);
    const era = ERAS[currentEra(s)].id;
    expect(s.eventDeck.some((id) => ERA_CARDS.some((e) => e.id === id && e.era === era))).toBe(true);
    expect(s.eventDeck.some((id) => ERA_CARDS.some((e) => e.id === id && e.era !== era))).toBe(false);
    const persons = s.eventDeck.filter((id) => id.startsWith('person:'));
    expect(persons).toHaveLength(PERSON_CARDS_PER_TERM);
    expect(persons.every((id) => id.startsWith('person:m:'))).toBe(true);
  });

  it('every era has 3-6 figures and 4 era event cards', () => {
    for (const era of ERAS.filter((e) => e.id !== 'present')) {
      const figures = CARDS.filter((c) => c.era === era.id).length;
      expect(figures, era.name).toBeGreaterThanOrEqual(3);
      expect(figures, era.name).toBeLessThanOrEqual(6);
      expect(ERA_CARDS.filter((c) => c.era === era.id).reduce((a, c) => a + c.count, 0), era.name).toBe(4);
    }
  });

  it('taking a person card costs class points; a full class must send someone away first', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 5);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const m = `person:${s.pools.present[0]}`;
    const cost = marketCost(m);
    expect(cost).toBeGreaterThan(0);
    // ポイントが足りなければ取れない
    const poor = structuredClone(s);
    poor.players[pi].points = cost - 1;
    poor.market[0] = m;
    expect(canTake(poor, pi, 0)).toBe(false);
    const t = structuredClone(s);
    t.players[pi].points = cost;
    const n = t.players[pi].students.length;
    const joined = take(t, m);
    expect(joined.players[pi].students).toHaveLength(n + 1);
    expect(joined.players[pi].points).toBe(0);
    expect(joined.pools.present).not.toContain(m.slice(7));
    // 満席なら、代わりに転校させる子を選んでから迎える
    const f = structuredClone(s);
    f.players[pi].points = cost;
    while (f.players[pi].students.length < MAX_CLASS) f.players[pi].students.push({ ...f.players[pi].students[0], uid: `f${f.players[pi].students.length}` });
    const room = take(f, m);
    expect(room.phase.kind).toBe('makeRoom');
    expect(step(room, { type: 'makeRoom', uid: null }).phase.kind).toBe('draw');
    const gone = droppable(room.players[pi])[0].uid;
    const full = step(room, { type: 'makeRoom', uid: gone });
    expect(full.players[pi].students).toHaveLength(MAX_CLASS);
    expect(full.players[pi].students.map((x) => x.uid)).not.toContain(gone);
    expect(full.players[pi].points).toBe(0);
  });

  it('refilling the market sets off guerrilla events on the spot, and only buyable cards stay face up', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 5);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    expect(s.market).toHaveLength(4);
    s.eventDeck.push('n_art', 'poptest');
    const next = step(s, pass);
    expect(next.phase.kind).toBe('result');
    expect(next.phase.kind === 'result' && next.phase.result.title).toBe('抜き打ちテスト');
    const after = step(next, { type: 'continue' });
    expect(after.market).toHaveLength(4);
    expect(after.market.at(-1)).toBe('n_art');
  });

  it('starting members come from the regular modern students; later only the rare transfer students come from the present', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 9);
    expect(s.pools.present).toEqual(MODERN_POOL);
    expect(s.eventDeck.filter((id) => id.startsWith('person:')).every((id) => MODERN_POOL.includes(id.slice(7)))).toBe(true);
    const before = s.starters.length;
    while (s.phase.kind === 'memberDraw') s = step(s, cpuAction(s)!);
    expect(s.starters).toHaveLength(before - 3 * STARTING_MEMBERS);
    const ids = s.players.flatMap((p) => p.students.map((x) => x.cardId));
    expect(ids.every((id) => id && !s.starters.includes(id) && !MODERN_POOL.includes(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every figure and transfer student has a different set of icons', () => {
    const key = (attrs: Attr[]) => [...attrs].sort().join(',');
    // 恐竜は👊（と🏃）の個数だけのキャラなので、ほかの子との重複は許す
    for (const d of CARDS.filter((c) => c.tags.includes('恐竜'))) expect(d.attrs.every((x) => x === 'fight' || x === 'sports'), d.name).toBe(true);
    const all = [
      ...CARDS.filter((c) => !c.tags.includes('恐竜')).map((c) => ({ name: c.name, k: key(c.attrs) })),
      ...ARCHETYPES.filter((a) => a.rarity !== 'N').map((a) => ({ name: a.title, k: key(toIcons(a.attrs, a.rarity, a.power)) })),
    ];
    for (const x of all) expect(all.filter((y) => y.k === x.k).map((y) => y.name), x.name).toEqual([x.name]);
  });

  it('deck breakdown counts every card in the deck and discard pile', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 4);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    for (let i = 0; i < 6; i++) s = step(step(s, cpuAction(s)!), { type: 'continue' });
    const rows = deckBreakdown(s);
    const sum = (k: 'left' | 'open' | 'used') => rows.reduce((a, r) => a + r[k], 0);
    expect(sum('left')).toBe(s.eventDeck.length);
    expect(sum('used')).toBe(s.discard.length);
    expect(sum('open')).toBe(s.market.length);
    expect(rows.filter((r) => r.group === '通常').reduce((a, r) => a + r.left + r.open + r.used, 0)).toBe(19);
  });

  it('cards carry 1-5 icons, more for rarer students', () => {
    for (const c of CARDS) {
      expect(c.attrs.length).toBeGreaterThanOrEqual(2);
      expect(c.attrs.length).toBeLessThanOrEqual(5);
      if (c.rarity === 'SSR') expect(c.attrs.length, c.name).toBeGreaterThanOrEqual(4);
    }
    expect(CARDS.find((c) => c.id === 'einstein')!.attrs).toEqual(['study', 'study', 'study', 'art', 'art']);
  });

  it('era raids add or take away the difference between 👊 and the threat', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const t = structuredClone(s);
    t.players[pi].students = [mk('y', ['fight', 'fight'])];
    t.players[pi].roles = [];
    t.eventDeck.push('raid_present');
    expect(step(t, pass).players[pi].points - t.players[pi].points).toBe(2 - 4);
    const u = structuredClone(t);
    u.players[pi].students = [mk('y', ['fight', 'fight', 'fight'], 'sengoku')];
    expect(step(u, pass).players[pi].points - u.players[pi].points).toBe(3 - 4);
  });

  it('kachikomi is taken from the market for free and takes 3× the taker\'s 👊 count from the chosen school', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const target = (pi + 1) % 3;
    const t = structuredClone(s);
    t.players[pi].students = [mk('y', ['fight', 'fight']), mk('z', ['fight', 'study'])];
    t.players[pi].roles = [];
    t.market = ['kachikomi'];
    expect(marketCost('kachikomi')).toBe(0);
    // 山札からめくっても起こらない（ゲリラではない）
    const g = structuredClone(t);
    g.market = ['n_study'];
    g.eventDeck.push('kachikomi');
    expect(step(step(g, { type: 'take', slot: 0 }), { type: 'continue' }).market).toContain('kachikomi');
    const k = step(t, { type: 'take', slot: 0 });
    expect(k.phase.kind).toBe('kachikomi');
    // やめたら場に残ったまま手番に戻る
    const back = step(k, { type: 'kachikomi', target: null });
    expect(back.phase.kind).toBe('draw');
    expect(back.market).toEqual(['kachikomi']);
    // 自分は殴れない
    expect(step(k, { type: 'kachikomi', target: pi })).toBe(k);
    const done = step(k, { type: 'kachikomi', target });
    expect(done.players[target].points - t.players[target].points).toBe(-9);
    expect(done.players[pi].points).toBe(t.players[pi].points);
    expect(done.market).toEqual([]);
    // 👊がいなければ取れない
    const u = structuredClone(t);
    u.players[pi].students = [mk('a', ['study'])];
    expect(canTake(u, pi, 0)).toBe(false);
  });

  it('swing events add icons and subtract icons (never heads)', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    const t = structuredClone(s);
    t.players[pi].students = [mk('y', ['fight', 'fight']), mk('z', ['study'])];
    t.players[pi].roles = [];
    // 抜き打ちテストは📚の数だけ（👊では引かれない）
    t.eventDeck.push('poptest');
    expect(step(t, pass).players[pi].points - t.players[pi].points).toBe(1);
    // 授業参観は👑で得点、👊で減点（人数では引かない）
    const u = structuredClone(t);
    u.eventDeck.push('visit');
    expect(step(u, pass).players[pi].points - u.players[pi].points).toBe(0 - 2);
    // 持久走大会は🏃の数だけ（人数では引かない）
    const v = structuredClone(t);
    v.eventDeck.push('marathon');
    expect(step(v, pass).players[pi].points - v.players[pi].points).toBe(0);
  });

  it('era events compete on the era\'s favored icons (none → all icons)', () => {
    for (const era of ERAS) {
      // ペストの🏃は競うアイコンではなく、数えなくなるアイコン
      const used = new Set(ERA_CARDS.filter((c) => c.era === era.id && c.effect.type !== 'alien' && c.effect.type !== 'plague').flatMap((c) => (c.also ? [c.attr, c.also] : [c.attr])));
      // 現代は優遇なし：全アイコンで競うカードがある（文化祭だけは出し物なので🎨）
      if (era.favor.length) for (const a of used) expect([...era.favor, 'all'], era.id).toContain(a);
      else expect(used.has('all'), era.id).toBe(true);
    }
    expect(ERAS.find((e) => e.id === 'future')!.favor).toEqual(['study']);
    expect(ERAS.find((e) => e.id === 'cretaceous')!.favor).toEqual(['fight', 'sports']);
    expect(ERAS.find((e) => e.id === 'present')!.favor).toEqual([]);
  });

  it('martian invasion seats an iconless alien in every class with a free seat', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const full = 1 - s.phase.player;
    while (s.players[full].students.length < MAX_CLASS) s.players[full].students.push(mk(`f${s.players[full].students.length}`, ['study']));
    const sizes = s.players.map((p) => p.students.length);
    const points = s.players.map((p) => p.points);
    s.eventDeck.push('martian');
    const next = step(s, pass);
    next.players.forEach((p, i) => {
      expect(p.points).toBe(points[i]);
      expect(p.students.length).toBe(i === full ? MAX_CLASS : sizes[i] + 1);
    });
    const alien = next.players[s.phase.kind === 'draw' ? s.phase.player : 0].students.at(-1)!;
    expect(alien.attrs).toEqual([]);
  });

  it('cyborg covers one of the drawer\'s own students with a 📚🏃 card', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    s.players[pi].points = 10;
    s = take(s, 'cyborg');
    expect(s.phase.kind).toBe('cyborg');
    // 相手のクラスの子は選べない
    expect(step(s, { type: 'cyborg', uid: s.players[1 - pi].students[0].uid })).toBe(s);
    const mine = s.players[pi].students[0];
    const n = s.players[pi].students.length;
    const next = step(s, { type: 'cyborg', uid: mine.uid });
    const st = next.players[pi].students.find((x) => x.uid === mine.uid)!;
    expect(next.players[pi].students).toHaveLength(n);
    expect(st.attrs).toEqual(['study', 'sports']);
    expect(st.name).toBe('サイボーグ');
    expect(st.cardId).toBeUndefined();
    expect(next.players[pi].points).toBe(10 - marketCost('cyborg'));
    // もうサイボーグの子はもう一度サイボーグにできない
    const again = structuredClone(next);
    again.market[0] = 'cyborg';
    again.phase = { kind: 'cyborg', player: pi, slot: 0 };
    expect(step(again, { type: 'cyborg', uid: mine.uid })).toBe(again);
  });

  it('battles pay 1st +15, 2nd +5, 3rd 0, last -10 (ties share a place)', () => {
    let s = newGame(['A', 'B', 'C', 'D'].map((name) => ({ name, isCpu: true })), 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const run = (fights: number[]) => {
      const t = structuredClone(s);
      fights.forEach((n, i) => {
        t.players[i].students = [mk(`y${i}`, n ? Array(n).fill('fight') : ['study'])];
        t.players[i].roles = [];
      });
      t.eventDeck.push('sekigahara');
      const after = step(t, pass);
      return after.players.map((p, i) => p.points - t.players[i].points);
    };
    expect(run([4, 3, 2, 1])).toEqual([15, 5, 0, -10]);
    // 1位が2クラスなら、次のクラスは3位（0点）
    expect(run([3, 3, 2, 1])).toEqual([15, 15, 0, -10]);
    // 全クラス同点なら引き分け
    expect(run([2, 2, 2, 2])).toEqual([0, 0, 0, 0]);
  });

  it('era events each have their own effect', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const run = (id: string, classes: Student[][]) => {
      const t = structuredClone(s);
      classes.forEach((st, i) => {
        t.players[i].students = st;
        t.players[i].roles = [];
      });
      t.eventDeck.push(id);
      const after = step(t, pass);
      return after.players.map((p, i) => p.points - t.players[i].points);
    };
    const A = [mk('a1', ['sports', 'sports', 'sports']), mk('a2', ['sports'])];
    const B = [mk('b1', ['sports', 'sports'])];
    const C = [mk('c1', ['study'])];
    // 大移動：👊6以上で+6、足りなければ−3
    expect(run('migration', [[mk('y', ['fight', 'fight', 'fight']), mk('z', ['fight', 'fight', 'fight'])], [mk('w', ['fight', 'fight'])], C])).toEqual([6, -3, -3]);
    // 古代オリンピック：🏃の数で勝負、1位+15・2位+5・最下位−10
    expect(run('olympia', [A, B, C])).toEqual([15, 5, -10]);
    // 関ヶ原の戦い：👑＋👊の数で勝負、1位+15・2位+5・最下位−10
    expect(run('sekigahara', [[mk('y', ['fight', 'fight'])], [mk('z', ['fight'])], C])).toEqual([15, 5, -10]);
    expect(run('sekigahara', [[mk('y', ['fight']), mk('x', ['charm', 'charm'])], [mk('z', ['charm', 'fight'])], C])).toEqual([15, 5, -10]);
    // 文化祭：🎨を持つ子1人につき+2（その時代の子も同じ）
    expect(run('bunkasai', [[mk('c', ['charm', 'art'], 'present'), mk('d', ['art', 'art'])], B, C])).toEqual([4, 0, 0]);
    // 体育祭：🏃を持つ子1人につき+2
    expect(run('taiikusai', [A, B, C])).toEqual([4, 2, 0]);
    // 修学旅行：アイコンの総数が12以上で+5、18以上で+10、24以上で+15（順位はつけない）
    const many = (u: string, n: number) => Array.from({ length: n }, (_, k) => mk(`${u}${k}`, ['study', 'art', 'charm']));
    expect(run('shugakuryoko', [many('a', 8), many('b', 4), many('c', 3)])).toEqual([15, 5, 0]);
    // 鹿鳴館の舞踏会：👑を持つ子1人につき+2
    expect(run('rokumeikan', [[mk('c', ['charm']), mk('d', ['charm', 'charm'], 'modern')], B, C])).toEqual([4, 0, 0]);
  });

  it('every era has a special event with its own mechanism', () => {
    const plain = ['heads', 'tiers', 'threshold', 'battle'];
    for (const era of ERAS) {
      const special = ERA_CARDS.filter((c) => c.era === era.id && !plain.includes(c.effect.type));
      expect(special.length, era.id).toBeGreaterThanOrEqual(1);
    }
    // 特別な仕組みは時代ごとにみんな違う
    const kinds = ERA_CARDS.filter((c) => !plain.includes(c.effect.type)).map((c) => c.effect.type);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  describe('era special events', () => {
    let base = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 8);
    while (base.phase.kind !== 'draw') base = step(base, cpuAction(base)!);
    /** 3クラスの生徒をそろえてイベントを起こす。生徒は5人ずつ（定員の下限4人より1人多い）になるよう、アイコンなしの子で埋める */
    const run = (id: string, classes: Student[][], points = [10, 10, 10], roles: RoleSeat[][] = [[], [], []]) => {
      const t = structuredClone(base);
      classes.forEach((st, i) => {
        const fill = Array.from({ length: Math.max(0, 5 - st.length) }, (_, k) => mk(`${i}-pad${k}`, []));
        t.players[i].students = [...st, ...fill];
        t.players[i].roles = roles[i];
        t.players[i].points = points[i];
      });
      t.eventDeck.push(id);
      const after = step(t, pass);
      return {
        after,
        delta: after.players.map((p, i) => p.points - t.players[i].points),
        uids: after.players.map((p) => p.students.map((x) => x.uid).filter((u) => !u.includes('pad'))),
      };
    };

    it('trex_hunt: the strongest pack takes points from the weakest', () => {
      const r = run('trex_hunt', [[mk('y', ['fight', 'fight'])], [mk('z', ['fight'])], [mk('c', ['study', 'study', 'art'])]]);
      expect(r.delta).toEqual([8, 0, -8]);
      // 生徒は動かない
      expect(r.uids).toEqual([['y'], ['z'], ['c']]);
      // 一番が並んだら何も起こらない
      const tie = run('trex_hunt', [[mk('y', ['fight'])], [mk('z', ['fight'])], [mk('c', ['study'])]]);
      expect(tie.delta).toEqual([0, 0, 0]);
    });

    it('meteor: everyone loses points, and each runner wins some back', () => {
      expect(run('meteor', [[mk('a', ['sports']), mk('b', ['sports', 'sports']), mk('c', ['sports']), mk('d', ['sports'])], [mk('e', ['sports'])], []]).delta).toEqual([0, -6, -8]);
    });

    it('egg_theft: the fastest class gets an egg that hatches into a dinosaur at the start of its next turn', () => {
      const r = run('egg_theft', [[mk('a', ['sports', 'sports'])], [mk('b', ['sports'])], []]);
      const eggs = (pi: number) => r.after.players[pi].students.filter((x) => x.art === 'egg');
      expect(eggs(0)).toHaveLength(1);
      expect(eggs(1)).toHaveLength(0);
      // 一番が並んだら誰も盗めない
      const tie = run('egg_theft', [[mk('a', ['sports'])], [mk('b', ['sports'])], []]);
      expect(tie.after.players.flatMap((p) => p.students).some((x) => x.art === 'egg')).toBe(false);
      // 手番が来ると孵る（係はそのまま）
      let t = structuredClone(r.after);
      while (!(t.phase.kind === 'result' && t.phase.ctx === 'hatch')) t = step(t, cpuAction(t)!);
      const pi = t.phase.kind === 'result' ? t.phase.player! : -1;
      expect(pi).toBe(0);
      const hatched = t.players[0].students.find((x) => x.uid === eggs(0)[0].uid)!;
      expect(['oviraptor', 'parasaur', 'spino']).toContain(hatched.cardId);
      expect(hatched.attrs.length).toBeGreaterThan(0);
      t = step(t, { type: 'continue' });
      expect(t.phase).toEqual({ kind: 'draw', player: 0 });
    });

    it('giza: everyone builds one pyramid; the laziest class gets nothing', () => {
      const s3 = (u: string) => mk(u, ['sports', 'sports', 'sports']);
      // 合計 9+6+3 = 18 ≥ 6×3 → 完成。一番少ないクラスは0
      expect(run('giza', [[s3('a'), s3('b'), s3('c')], [s3('d'), s3('e')], [s3('f')]]).delta).toEqual([6, 6, 0]);
      // 合計 3+3+0 < 18 → 全クラス−3
      expect(run('giza', [[s3('a')], [s3('b')], []]).delta).toEqual([-3, -3, -3]);
    });

    it('ostracism: the class of the student with the most icons in the whole school loses points', () => {
      const r = run('ostracism', [[mk('a', ['study', 'study'])], [mk('b', ['art', 'art', 'art', 'charm'])], [mk('c', ['sports'])]]);
      expect(r.delta).toEqual([0, -8, 0]);
      // だれもいなくならない
      expect(r.uids).toEqual([['a'], ['b'], ['c']]);
    });

    it('keju: each class\'s best scholar takes the exam and gains a 📚 on passing', () => {
      const r = run('keju', [[mk('a', ['study', 'study', 'study'])], [mk('b', ['study', 'study'])], [mk('c', ['study', 'study'], 'china')]]);
      const attrs = (pi: number, uid: string) => r.after.players[pi].students.find((x) => x.uid === uid)!.attrs;
      expect(attrs(0, 'a')).toEqual(['study', 'study', 'study', 'study']);
      expect(attrs(1, 'b')).toEqual(['study', 'study']);
      // その時代の子も2倍にはならない
      expect(attrs(2, 'c')).toEqual(['study', 'study']);
    });

    it('michinaga: every other class sends gifts to the class with the most 👑', () => {
      expect(run('michinaga', [[mk('a', ['charm', 'charm'])], [mk('b', ['charm'])], []]).delta).toEqual([6, -3, -3]);
      // 一番が2クラスなら、残りのクラスがそれぞれに贈る
      expect(run('michinaga', [[mk('a', ['charm'])], [mk('b', ['charm'])], []]).delta).toEqual([3, 3, -6]);
    });

    it('monalisa: each class scores its best painter\'s 🎨 × 3 (role bonus counts)', () => {
      const r = run('monalisa', [[mk('a', ['art', 'art', 'art']), mk('a2', ['art', 'art'])], [mk('b', ['art'])], [mk('c', ['study'])]]);
      expect(r.delta).toEqual([9, 3, 0]);
      // 文化委員の子は2倍に数える
      const r2 = run('monalisa', [[mk('a', ['art', 'art'])], [mk('b', ['art', 'art', 'art'])], []], [10, 10, 10], [[{ role: 'culture', uid: 'a' }], [], []]);
      expect(r2.delta).toEqual([12, 9, 0]);
    });

    it('printing: every student without 📚 gains one; a class where everyone has 📚 gets nothing', () => {
      const r = run('printing', [[mk('a', ['study', 'study']), mk('x', ['sports', 'sports']), mk('y', ['art'])], [mk('b', ['art'])], [mk('c', ['study'])]]);
      expect(r.delta).toEqual([0, 0, 0]);
      // 📚を持っていなかった子は全員📚が1つ増える（📚を持っていた子はそのまま）
      r.after.players.forEach((p) => expect(p.students.every((x) => x.attrs.includes('study'))).toBe(true));
      const icons = (pi: number, uid: string) => r.after.players[pi].students.find((x) => x.uid === uid)!.attrs;
      expect(icons(0, 'a')).toEqual(['study', 'study']);
      expect(icons(0, 'x')).toEqual(['sports', 'sports', 'study']);
      expect(icons(1, 'b')).toEqual(['art', 'study']);
      // 全員📚を持っていれば何も起こらない
      const full = Array.from({ length: 5 }, (_, k) => mk(`s${k}`, ['study']));
      const r2 = run('printing', [full, [], []]);
      expect(r2.after.players[0].students.map((x) => x.attrs)).toEqual(full.map(() => ['study']));
    });

    it('plague: one random non-role student per class gets sick, and their 🏃 stops counting', () => {
      const runner = mk('a', ['sports', 'sports', 'sports']);
      const r = run('plague', [[runner, mk('a2', ['study']), mk('a3', ['study']), mk('a4', ['study']), mk('a5', ['study'])], [mk('b', ['sports'])], [mk('c', ['sports'])]], [10, 10, 10], [[{ role: 'study', uid: 'a2' }], [], []]);
      expect(r.delta).toEqual([0, 0, 0]);
      r.after.players.forEach((p) => {
        const sick = p.students.filter((x) => x.plague);
        expect(sick).toHaveLength(1);
        // 係に就いている子はかからない
        expect(p.roles.some((x) => x.uid === sick[0].uid)).toBe(false);
      });
      // 🏃を数えない（カードのアイコンはそのまま）
      const t = structuredClone(r.after);
      const st = t.players[0].students.find((x) => x.uid === 'a')!;
      st.plague = true;
      expect(st.attrs).toEqual(['sports', 'sports', 'sports']);
      expect(attrScore(t.players[0], 'sports').total).toBe(0);
      // 📚4つ＋学習係のa2の📚が2倍で5（🏃3つは数えない）
      expect(attrScore(t.players[0], 'all').total).toBe(5);
      // グッズは装備できる（シューズの🏃も数えない）
      expect(equippable(t.players[0]).map((x) => x.uid)).toContain('a');
    });

    it('plague wears off when the term changes', () => {
      let t = structuredClone(base);
      t.players.forEach((p) => p.students.forEach((x) => (x.plague = true)));
      const term = (x: GameState) => termOfMonth(MONTHS[x.monthIdx]);
      const start = term(t);
      while (term(t) === start) t = step(t, cpuAction(t)!);
      expect(t.players.flatMap((p) => p.students).some((x) => x.plague)).toBe(false);
    });

    it('columbus: classes pick a New World good and who wears it, in 📚 order; taken goods are gone for the next class', () => {
      let t = run('columbus', [[mk('a', ['study'])], [mk('b', ['study', 'study', 'study'])], [mk('c', ['study', 'study'])]]).after;
      expect(t.phase).toMatchObject({ kind: 'gift', player: 1 });
      const ph = () => t.phase as Extract<GameState['phase'], { kind: 'gift' }>;
      t = step(t, { type: 'gift', item: 'g_newmap', uid: 'b' });
      expect(t.phase).toMatchObject({ kind: 'gift', player: 2 });
      expect(ph().items).not.toContain('g_newmap');
      // 取られた品は選べない。ほかのクラスの子にもつけられない
      expect(step(t, { type: 'gift', item: 'g_newmap', uid: 'c' })).toBe(t);
      expect(step(t, { type: 'gift', item: 'g_tomato', uid: 'a' })).toBe(t);
      t = step(t, { type: 'gift', item: 'g_tomato', uid: 'c' });
      expect(t.phase).toMatchObject({ kind: 'gift', player: 0 });
      t = step(t, cpuAction(t)!);
      expect(t.phase).toMatchObject({ kind: 'result', player: null });
      const b = t.players[1].students.find((x) => x.uid === 'b')!;
      expect(b.goods?.id).toBe('g_newmap');
      expect(b.attrs).toEqual(['study', 'study', 'study', 'study']);
      // グッズを持っている子にはつけられない（2つ目は装備できない）
      expect(t.players[0].students.filter((x) => x.goods)).toHaveLength(1);
      expect(t.players.map((p) => p.points)).toEqual([10, 10, 10]);
    });

    it('okehazama: the class with the most 👑+👊 takes points from the class with the most points', () => {
      const r = run('okehazama', [[mk('a', ['charm']), mk('a2', ['fight'])], [mk('b', ['charm'])], [mk('c', ['study'])]], [0, 0, 20]);
      expect(r.delta).toEqual([8, 0, -8]);
      expect(r.uids).toEqual([['a', 'a2'], ['b'], ['c']]);
      // 👑と👊を合わせて数える（👊2つは👑1つより多い）
      expect(run('okehazama', [[mk('a', ['charm'])], [mk('b', ['fight', 'fight'])], [mk('c', ['study'])]], [0, 0, 20]).delta).toEqual([0, 8, -8]);
      // 自分がポイントでも一番なら何も起こらない
      expect(run('okehazama', [[mk('a', ['charm', 'charm'])], [mk('b', ['charm'])], []], [20, 0, 0]).delta).toEqual([0, 0, 0]);
    });

    it('teppo: every class gets a matchlock (👊+1) and picks who carries it, from the drawer in seat order', () => {
      let t = run('teppo', [[mk('a', ['study'])], [mk('b', ['charm']), mk('b2', ['sports'])], [mk('c', ['art'])]]).after;
      const ph = () => t.phase as Extract<GameState['phase'], { kind: 'gift' }>;
      expect(t.phase).toMatchObject({ kind: 'gift', card: 'teppo', items: ['g_tanegashima'] });
      const first = ph().player;
      const seen: number[] = [];
      for (let k = 0; k < 3; k++) {
        seen.push(ph().player);
        // 鉄砲はなくならず、次のクラスにも届く
        expect(ph().items).toEqual(['g_tanegashima']);
        t = step(t, { type: 'gift', item: 'g_tanegashima', uid: t.players[ph().player].students[0].uid });
      }
      expect(seen).toEqual([0, 1, 2].map((i) => (first + i) % 3));
      expect(t.phase).toMatchObject({ kind: 'result', player: null });
      expect(t.players.map((p) => p.students[0].goods?.id)).toEqual(['g_tanegashima', 'g_tanegashima', 'g_tanegashima']);
      expect(t.players[1].students[0].attrs).toEqual(['charm', 'fight']);
      expect(t.players.map((p) => p.points)).toEqual([10, 10, 10]);
    });

    it('teppo: a class whose students all carry goods gets none', () => {
      const t = structuredClone(base);
      const geared = (uid: string): Student => ({ ...mk(uid, ['study']), goods: { id: 'g_book', name: '参考書', icon: '📕', attr: 'study' } });
      t.players.forEach((p, i) => {
        p.students = [geared(`g${i}`), ...(i === 1 ? [mk('b', ['charm'])] : [])];
        p.roles = [];
      });
      t.eventDeck.push('teppo');
      const after = step(t, pass);
      expect(after.phase).toMatchObject({ kind: 'gift', player: 1 });
      const done = step(after, { type: 'gift', item: 'g_tanegashima', uid: 'b' });
      expect(done.phase).toMatchObject({ kind: 'result', player: null });
      expect(done.players[1].students[1].goods?.id).toBe('g_tanegashima');
    });

    it('rakuichi: the class with the most 👑 gets its next goods for free, once', () => {
      const r = run('rakuichi', [[mk('a', ['charm', 'charm'])], [mk('b', ['charm'])], [mk('c', ['study'])]]);
      expect(r.delta).toEqual([0, 0, 0]);
      expect(r.after.players.map((p) => !!p.freeGoods)).toEqual([true, false, false]);
      // 同点なら誰ももらえない
      expect(run('rakuichi', [[mk('a', ['charm'])], [mk('b', ['charm'])], []]).after.players.some((p) => p.freeGoods)).toBe(false);
      // グッズを取ると0点で、タダは1回きり
      let t = structuredClone(r.after);
      t.phase = { kind: 'draw', player: 0 };
      t.market = ['g_book', 'g_shoes'];
      expect(marketCost('g_book', t.players[0])).toBe(0);
      expect(marketCost('g_book', t.players[1])).toBe(2);
      t = step(t, { type: 'take', slot: 0 });
      t = step(t, { type: 'equip', uid: 'a' });
      expect(t.players[0].points).toBe(10);
      expect(t.players[0].freeGoods).toBeFalsy();
      expect(marketCost('g_shoes', t.players[0])).toBe(2);
    });

    it('tomikuji: everyone pays in and one class takes the pot', () => {
      const r = run('tomikuji', [[], [], []]);
      expect([...r.delta].sort((x, y) => x - y)).toEqual([-3, -3, 6]);
    });

    it('nobel: the single best 📚 student in the school wins for their class', () => {
      expect(run('nobel', [[mk('a', ['study', 'study', 'study'])], [mk('b', ['study']), mk('b2', ['study', 'study'])], []]).delta).toEqual([12, 0, 0]);
      // 同点なら全員が受賞
      expect(run('nobel', [[mk('a', ['study', 'study'])], [mk('b', ['study', 'study'], 'modern')], []]).delta).toEqual([12, 12, 0]);
    });

    it('seitokai: the student with the most 👑 in the school is elected and gains a 👑', () => {
      const r = run('seitokai', [[mk('a', ['charm', 'charm'])], [mk('b', ['charm', 'charm']), mk('b2', ['charm'])], [mk('c', ['study'])]]);
      const attrs = (pi: number, uid: string) => r.after.players[pi].students.find((x) => x.uid === uid)!.attrs;
      expect(r.delta).toEqual([0, 0, 0]);
      // 同点なら2人とも当選
      expect(attrs(0, 'a')).toEqual(['charm', 'charm', 'charm']);
      expect(attrs(1, 'b')).toEqual(['charm', 'charm', 'charm']);
      expect(attrs(1, 'b2')).toEqual(['charm']);
      // アイコンが上限の子は増えない
      const full = run('seitokai', [[mk('a', Array(MAX_ICONS).fill('charm'))], [], []]);
      expect(full.after.players[0].students.find((x) => x.uid === 'a')!.attrs).toHaveLength(MAX_ICONS);
    });

    it('singularity: machine students (robots, cyborgs, machine goods) gain a 📚', () => {
      const t = structuredClone(base);
      const oracle = { ...mk('o', Array(5).fill('study'), 'future'), cardId: 'oracle' };
      const phone = { ...mk('p', ['art', 'charm']), goods: { id: 'g_phone', name: 'スマホ', icon: '📱', attr: 'charm' as const } };
      const human = mk('h', ['study']);
      t.players[0].students = [oracle, phone, human];
      t.players[1].students = [{ ...mk('c', ['study', 'sports']), art: 'cyborg' }];
      t.players[2].students = [];
      t.players.forEach((p) => (p.roles = []));
      t.eventDeck.push('singularity');
      const after = step(t, pass);
      const attrs = (pi: number, uid: string) => after.players[pi].students.find((x) => x.uid === uid)!.attrs;
      // オラクルも6個まで増える
      expect(attrs(0, 'o')).toHaveLength(6);
      expect(attrs(0, 'p')).toEqual(['art', 'charm', 'study']);
      expect(attrs(0, 'h')).toEqual(['study']);
      expect(attrs(1, 'c')).toEqual(['study', 'sports', 'study']);
    });

    it('timemachine: the class with the fewest points gets a free figure from any era', () => {
      const r = run('timemachine', [[mk('a', [])], [mk('b', [])], [mk('c', [])]], [10, 3, 8]);
      expect(r.delta).toEqual([0, 0, 0]);
      expect(r.uids.map((u) => u.length)).toEqual([1, 2, 1]);
      const st = r.after.players[1].students.find((x) => x.uid !== 'b')!;
      expect(Object.values(r.after.pools).flat()).not.toContain(st.cardId);
    });
  });

  it('goods add an icon to one student, one item each', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 8);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const pi = s.phase.player;
    s.players[pi].points = 10;
    s = take(s, 'g_book');
    expect(s.phase.kind).toBe('equip');
    // やめたら手番の選び直し（ポイントも払わない）
    const back = step(s, { type: 'equip', uid: null });
    expect(back.phase.kind).toBe('draw');
    expect(back.players[pi].points).toBe(10);
    const uid = s.players[pi].students[0].uid;
    const before = s.players[pi].students[0].attrs.length;
    const next = step(s, { type: 'equip', uid });
    const st = next.players[pi].students.find((x) => x.uid === uid)!;
    expect(st.attrs).toHaveLength(before + 1);
    expect(st.goods?.attr).toBe('study');
    expect(next.players[pi].points).toBe(10 - marketCost('g_book'));
    // もう装備している子にはつけられない
    const again = structuredClone(next);
    again.market[0] = 'g_shoes';
    again.phase = { kind: 'equip', player: pi, card: 'g_shoes', slot: 0 };
    expect(step(again, { type: 'equip', uid })).toBe(again);
  });

  it('setRoles requires choosing the newly unlocked kind, and unlocked kinds stay', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 11);
    while (s.phase.kind !== 'roles') s = step(s, cpuAction(s)!);
    const uid = s.players[0].students[0].uid;
    expect(step(s, { type: 'setRoles', roles: [] })).toBe(s);
    expect(step(s, { type: 'setRoles', roles: [{ role: 'pe', uid }], unlock: ['study'] })).toBe(s);
    const next = step(s, { type: 'setRoles', roles: [{ role: 'study', uid }], unlock: ['study'] });
    expect(next.players[0].unlocked).toEqual(['study']);
    expect(next.players[0].roles).toEqual([{ role: 'study', uid }]);
  });

  it('exchange swaps students with the same number of printed icons; the other side must have no role', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 11);
    while (s.phase.kind !== 'roles') s = step(s, cpuAction(s)!);
    const a0 = mk('a0', ['art', 'art', 'art']);
    const a1 = mk('a1', ['study', 'study']);
    const b0 = mk('b0', ['fight', 'fight', 'fight']);
    const b1 = mk('b1', ['sports', 'sports', 'sports']);
    const b2 = mk('b2', ['charm', 'charm']);
    s.players[0].students = [a0, a1];
    s.players[1].students = [b0, b1, b2];
    s.players[0].roles = [{ role: 'study', uid: a0.uid }];
    s.players[1].roles = [{ role: 'study', uid: b0.uid }];
    s.market = ['exchange'];
    s.phase = { kind: 'exchange', player: 0, slot: 0 };
    // 相手の係の子はもらえない
    expect(step(s, { type: 'exchange', uid: a0.uid, target: 1, theirUid: b0.uid })).toBe(s);
    // アイコンの数が違う子どうしは入れ替えられない
    expect(step(s, { type: 'exchange', uid: a1.uid, target: 1, theirUid: b1.uid })).toBe(s);
    // グッズの＋1は数えない
    const g = structuredClone(s);
    g.players[0].students[1] = { ...a1, attrs: ['study', 'study', 'study'], goods: { id: 'g_book', name: '参考書', icon: '📕', attr: 'study' } };
    expect(exchangePairs(g, 0).some((x) => x.uid === a1.uid && x.theirUid === b1.uid)).toBe(false);
    // 自分の側は係の子でも出せる
    const next = step(s, { type: 'exchange', uid: a0.uid, target: 1, theirUid: b1.uid });
    expect(next.players[0].students.map((x) => x.uid)).toContain(b1.uid);
    expect(next.players[1].students.map((x) => x.uid)).toContain(a0.uid);
    expect(next.players[0].roles).toEqual([]);
    expect(next.market).toEqual([]);
  });

  it('drawn event cards go to the discard pile', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }], 1, 3);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    s = take(s, 'n_study');
    expect(s.discard[s.discard.length - 1]).toBe('n_study');
  });

  it('push makes every class drop one student without a role', () => {
    let s = newGame([{ name: 'A', isCpu: false }, { name: 'B', isCpu: false }], 1, 11);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const drawer = s.phase.player;
    const other = 1 - drawer;
    const sitter = s.players[drawer].students[0];
    s.players[drawer].roles = [{ role: 'study', uid: sitter.uid }];
    s.eventDeck.push('push');
    s = step(s, pass);
    expect(s.phase).toMatchObject({ kind: 'push', player: drawer });
    // 係の子は外せない
    expect(step(s, { type: 'push', uid: sitter.uid })).toBe(s);
    const mine = s.players[drawer].students[1].uid;
    s = step(s, { type: 'push', uid: mine });
    expect(s.phase).toMatchObject({ kind: 'push', player: other });
    const theirs = droppable(s.players[other])[0].uid;
    s = step(s, { type: 'push', uid: theirs });
    expect(s.phase.kind).toBe('result');
    expect(s.players[drawer].students.map((x) => x.uid)).not.toContain(mine);
    expect(s.players[other].students.map((x) => x.uid)).not.toContain(theirs);
    expect(s.players.map((p) => p.students.length)).toEqual([STARTING_MEMBERS - 1, STARTING_MEMBERS - 1]);
  });

  it('guerrilla results never belong to the player who flipped them', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let s = newGame(Array.from({ length: 4 }, (_, i) => ({ name: `P${i + 1}`, isCpu: true })), 2, seed);
      let fired = 0;
      while (s.phase.kind !== 'gameOver') {
        const before = s.logCounter;
        s = step(s, cpuAction(s)!);
        if (!s.log.some((l) => l.id >= before && l.text.startsWith('ゲリラ発生'))) continue;
        fired++;
        // ゲリラの直後は、全員向けの結果か、転校で出ていく子を選ぶところ
        if (s.phase.kind === 'result') expect(s.phase.player).toBeNull();
        else expect(['push', 'gift']).toContain(s.phase.kind);
      }
      expect(fired).toBeGreaterThan(0);
    }
  });

  it('normal cards score only for the drawer; era and common events score for every class', () => {
    let s = newGame([{ name: 'A', isCpu: true }, { name: 'B', isCpu: true }, { name: 'C', isCpu: true }], 1, 21);
    while (s.phase.kind !== 'draw') s = step(s, cpuAction(s)!);
    const drawer = s.phase.player;
    const run = (id: string) => {
      const t = structuredClone(s);
      const before = t.players.map((p) => p.points);
      t.eventDeck.push(id);
      const after = id.startsWith('n_') ? take(t, id) : step(t, pass);
      return { rows: after.phase.kind === 'result' ? after.phase.result.rows.length : 0, d: after.players.map((p, i) => p.points - before[i]) };
    };
    for (const id of ['n_study', 'n_sports']) {
      const r = run(id);
      expect(r.rows, id).toBe(1);
      r.d.forEach((d, i) => i !== drawer && expect(d, id).toBe(0));
    }
    for (const id of ['poptest', 'marathon', 'bunkasai', 'raid_present']) expect(run(id).rows, id).toBe(3);
  });
});

describe('1枚ごとの得点の内訳', () => {
  it('合計がクラスのアイコンの点（attrScore）と一致する', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = playOut(3, 1, seed);
      for (const p of s.players) {
        for (const a of ['study', 'sports', 'art', 'charm', 'fight'] as Attr[]) {
          for (const era of [undefined, ...ERAS.map((e) => e.id)]) {
            const sum = contributions(p, a, era).reduce((x, c) => x + c.pts, 0);
            expect(sum).toBe(attrScore(p, a, era).total);
          }
        }
      }
    }
  });
});

describe('係の場にカードを置く', () => {
  const base: RoleSeat[] = [
    { role: 'leader', uid: 'a' },
    { role: 'culture', uid: 'b' },
  ];
  const sorted = (rs: RoleSeat[]) => [...rs].sort((x, y) => x.role.localeCompare(y.role));

  it('空いている係の場に置くと、その係になる', () => {
    expect(sorted(moveToRole(base, 'c', 'study'))).toEqual(sorted([...base, { role: 'study', uid: 'c' }]));
  });

  it('座席の子を埋まっている係の場に置くと、前の子は座席に戻る', () => {
    expect(sorted(moveToRole(base, 'c', 'leader'))).toEqual(sorted([{ role: 'leader', uid: 'c' }, { role: 'culture', uid: 'b' }]));
  });

  it('係の子どうしは入れ替わる', () => {
    expect(sorted(moveToRole(base, 'a', 'culture'))).toEqual(sorted([{ role: 'culture', uid: 'a' }, { role: 'leader', uid: 'b' }]));
  });

  it('係の子を空いている係の場へ動かすと、元の係は空く', () => {
    expect(sorted(moveToRole(base, 'a', 'pe'))).toEqual(sorted([{ role: 'pe', uid: 'a' }, { role: 'culture', uid: 'b' }]));
  });
});
