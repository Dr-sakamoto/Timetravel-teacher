import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { contributions, type Contribution } from '../game/calc';
import { CARD_MAP } from '../game/data/cards';
import { ERAS } from '../game/data/eras';
import { ARCHETYPE_MAP } from '../game/data/modern';
import { ROLE_ORDER } from '../game/data/roles';
import { ATTR_ICON, type Attr, type EraId, type EventResult, type Player, type RoleId, type Student } from '../game/types';
import { EventCardView } from './EventCardView';
import { Playmat } from './Playmat';

/*
 * 得点演出のデモ（#score-demo で開く）：
 * 「どのカードから何点入ったか」を見せるアニメーション案を、本物のカードと教室で見比べる。
 */

// ---------- サンプルのクラス ----------

let uid = 0;
function hist(id: string): Student {
  const c = CARD_MAP[id];
  return { uid: `d${uid++}`, cardId: id, name: c.name, title: c.title, era: c.era, rarity: c.rarity, icon: c.icon, art: id, attrs: [...c.attrs], flavor: c.flavor, joined: '', mvp: 0 };
}
function modern(id: string, name: string, attrs: Attr[]): Student {
  const a = ARCHETYPE_MAP[id];
  return { uid: `d${uid++}`, cardId: `m:${id}#1`, name, title: a.title, era: 'present', rarity: a.rarity, icon: a.icon, art: id, attrs, flavor: a.flavor, joined: '', mvp: 0 };
}

const STUDENTS: Student[] = [
  modern('track', '佐藤 陸', ['sports', 'sports']),
  modern('baseball', '鈴木 翔', ['study', 'sports']),
  modern('nerd', '高橋 学', ['study', 'study']),
  modern('gyaru', '田中 ゆな', ['charm']),
  modern('brass', '伊藤 奏', ['art']),
  modern('yankee', '渡辺 拳', ['fight']),
  modern('banchou', '山本 剛', ['fight', 'fight', 'fight']),
  modern('olympian', '中村 隼', ['sports', 'sports', 'sports', 'study']),
  hist('yukimura'),
  hist('keiji'),
  hist('nobunaga'),
];
const byArt = (art: string) => STUDENTS.find((s) => s.art === art)!.uid;
const ROLE_PICK: Partial<Record<RoleId, string>> = {
  study: byArt('nerd'),
  pe: byArt('yukimura'),
  culture: byArt('brass'),
  leader: byArt('nobunaga'),
};
const BASE_POINTS = 42;
const PLAYER: Player = {
  id: 0,
  name: '赤井先生',
  isCpu: false,
  color: '#e85d5d',
  students: STUDENTS,
  roles: ROLE_ORDER.map((r) => ROLE_PICK[r] ?? null),
  points: BASE_POINTS,
};

// ---------- シナリオ（めくったカード） ----------

interface Scenario {
  id: string;
  label: string;
  card: EventResult;
  attr: Attr;
  mode: 'sum' | 'best';
  era?: EraId;
  threat?: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'contest',
    label: '🏃 体育祭（合計）',
    attr: 'sports',
    mode: 'sum',
    card: { title: '体育祭', icon: '🏃', attr: 'sports', tone: 'contest', desc: 'リレーに綱引き！', rule: '引いた人：クラス全員の🏃の数を加点', rows: [] },
  },
  {
    id: 'era',
    label: '⚔️ 合戦（時代×2）',
    attr: 'fight',
    mode: 'sum',
    era: 'sengoku',
    card: { title: '天下分け目の合戦', icon: '⚔️', attr: 'fight', tone: 'era', desc: '関ヶ原で全軍激突！', rule: '引いた人：クラス全員の👊の数を加点（この時代の生徒は2倍）', rows: [] },
  },
  {
    id: 'normal',
    label: '📚 授業（一番の子）',
    attr: 'study',
    mode: 'best',
    card: { title: '授業', icon: '📚', attr: 'study', tone: 'normal', desc: '', rule: '全員：📚を一番多く持つ子の個数を加点', rows: [] },
  },
  {
    id: 'raid',
    label: '👊 カチコミ（マイナス）',
    attr: 'fight',
    mode: 'sum',
    threat: 7,
    card: { title: 'カチコミ！他校のヤンキー', icon: '😠', attr: 'fight', tone: 'contest', desc: '敵の強さ 7', rule: '引いた人：クラスの👊の数が7に足りない分だけマイナス', rows: [] },
  },
];

// ---------- 演出の案 ----------

interface Variant {
  id: string;
  name: string;
  desc: string;
  run: (c: Ctx) => Frame;
}

interface Pt {
  x: number;
  y: number;
}
interface Rects {
  cards: Record<string, DOMRect>;
  icons: Record<string, DOMRect[]>;
  plate?: DOMRect;
  ecard?: DOMRect;
  rows: Record<string, DOMRect>;
  total?: DOMRect;
}
interface Ctx {
  t: number;
  list: Contribution[];
  sc: Scenario;
  rects: Rects;
  /** 最後に入る点 */
  delta: number;
  /** 合計アイコン数（係・時代ボーナス込み） */
  total: number;
}
interface Frame {
  lit: Set<string>;
  dim: Set<string>;
  /** 名札の点に、もう入った分 */
  gained: number;
  done: boolean;
  overlay: ReactNode[];
  /** めくったカードの上に出すカウンター */
  counter?: ReactNode;
  side?: ReactNode;
}

const START = 700;
const clamp = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => {
  x = clamp(x);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
};
const back = (x: number) => {
  x = clamp(x);
  const c = 1.7;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};
const mid = (r?: DOMRect): Pt => (r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 });
const top = (r?: DOMRect): Pt => (r ? { x: r.left + r.width / 2, y: r.top } : { x: 0, y: 0 });
function fly(a: Pt, b: Pt, p: number, arc = 70): Pt {
  const e = ease(p);
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - Math.sin(Math.PI * e) * arc };
}
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const isRaid = (sc: Scenario) => sc.threat !== undefined;

/** 内訳のラベル：🏃×3 ⚔️×2 係×2 */
function why(c: Contribution, sc: Scenario): ReactNode {
  const era = sc.era ? ERAS.find((e) => e.id === sc.era)! : null;
  return (
    <>
      <span>
        {ATTR_ICON[sc.attr]}×{c.icons}
      </span>
      {c.era && era && <span className="fx-mul era">{era.icon}時代×2</span>}
      {c.role && <span className="fx-mul role">係×2</span>}
    </>
  );
}

/** 最後に合計点が名札へ飛ぶ（カチコミは敵の強さとの差を出してから） */
function finale(c: Ctx, from: Pt, t0: number, f: Frame) {
  const { t, delta, total, sc, rects } = c;
  if (t < t0) return;
  const raid = isRaid(sc);
  const hold = raid ? 900 : 250;
  if (raid) {
    const q = back((t - t0) / 300);
    f.overlay.push(
      <div key="raid-eq" className="fx-raid-eq" style={{ left: (rects.ecard?.right ?? 0) + 16, top: from.y, transform: `translate(0,-50%) scale(${q})` }}>
        敵 {sc.threat} − 👊{total} ＝ <b className={delta < 0 ? 'down' : 'up'}>{delta < 0 ? delta : '撃退！'}</b>
      </div>,
    );
  }
  const p = (t - t0 - hold) / 550;
  if (p < 0) return;
  if (p < 1 && delta !== 0) {
    const at = fly(from, mid(rects.plate), p, 90);
    f.overlay.push(
      <div key="fin" className={`fx-total ${delta < 0 ? 'down' : ''}`} style={{ left: at.x, top: at.y, transform: `translate(-50%,-50%) scale(${1.4 - 0.5 * ease(p)})` }}>
        {sign(delta)}
      </div>,
    );
  } else {
    f.gained = delta;
    f.done = true;
  }
}

/** A：カードの上に「+3」が出て、名札へ飛んでいく */
const popFly: Variant = {
  id: 'A',
  name: 'A. ポップ＆フライ',
  desc: '1枚ずつ順番に、カードの上に「+点数」が出て名札まで飛ぶ。届いた瞬間に点が増える。',
  run(c) {
    const { t, list, sc, rects } = c;
    const raid = isRaid(sc);
    const STEP = 750;
    const f: Frame = { lit: new Set(), dim: new Set(), gained: 0, done: false, overlay: [] };
    if (t >= START - 200) for (const s of PLAYER.students) if (!list.some((x) => x.student.uid === s.uid)) f.dim.add(s.uid);
    let def = 0;
    list.forEach((cb, i) => {
      const t0 = START + i * STEP;
      if (t < t0) return;
      const u = cb.student.uid;
      if (t < t0 + STEP + 200) f.lit.add(u);
      const from = top(rects.cards[u]);
      const to = raid ? mid(rects.ecard) : mid(rects.plate);
      const p = (t - t0 - 380) / 480;
      if (p >= 1) {
        if (raid) def += cb.pts;
        else f.gained += cb.pts;
        return;
      }
      const at = p < 0 ? from : fly(from, to, p);
      const s = p < 0 ? back((t - t0) / 260) : 1 - 0.45 * ease(p);
      f.overlay.push(
        <div key={u} className={`fx-bubble ${raid ? 'shield' : ''}`} style={{ left: at.x, top: at.y, transform: `translate(-50%,-100%) scale(${s})` }}>
          <b>{raid ? `🛡️${cb.pts}` : `+${cb.pts}`}</b>
          {p < 0 && <small>{why(cb, sc)}</small>}
        </div>,
      );
    });
    if (raid && t >= START) f.counter = <div className="fx-counter shield">👊 {def} / {sc.threat}</div>;
    const end = START + list.length * STEP + 150;
    if (raid) finale(c, mid(rects.ecard), end, f);
    else if (t >= end) {
      f.gained = c.delta;
      f.done = true;
    }
    return f;
  },
};

/** B：カードにスタンプが押されて残る */
const stamp: Variant = {
  id: 'B',
  name: 'B. スタンプ',
  desc: '点の入ったカードに「+点数」のスタンプがポンポン押されて、最後まで残る。あとから見返しても内訳が分かる。',
  run(c) {
    const { t, list, sc, rects, total } = c;
    const raid = isRaid(sc);
    const STEP = 520;
    const f: Frame = { lit: new Set(), dim: new Set(), gained: 0, done: false, overlay: [] };
    if (t >= START - 200) for (const s of PLAYER.students) if (!list.some((x) => x.student.uid === s.uid)) f.dim.add(s.uid);
    let sum = 0;
    list.forEach((cb, i) => {
      const t0 = START + i * STEP;
      if (t < t0) return;
      const u = cb.student.uid;
      f.lit.add(u);
      const q = clamp((t - t0) / 260);
      if (q >= 1) sum += cb.pts;
      const at = mid(rects.cards[u]);
      f.overlay.push(
        <div
          key={u}
          className={`fx-stamp ${raid ? 'shield' : ''}`}
          style={{ left: at.x, top: at.y, opacity: q, transform: `translate(-50%,-50%) rotate(${-14 + 6 * (i % 3)}deg) scale(${2.4 - 1.4 * ease(q)})` }}
        >
          <b>{raid ? `🛡️${cb.pts}` : `+${cb.pts}`}</b>
          <small>{why(cb, sc)}</small>
        </div>,
      );
    });
    if (t >= START) f.counter = <div className={`fx-counter ${raid ? 'shield' : ''}`}>{raid ? `👊 ${sum} / ${sc.threat}` : `合計 ${sum}`}</div>;
    const end = START + (list.length - 1) * STEP + 450;
    if (sum === total || list.length === 0) finale(c, mid(rects.ecard), end, f);
    return f;
  },
};

/** C：レシートに1行ずつ明細が出て、合計が名札へ */
const receipt: Variant = {
  id: 'C',
  name: 'C. レシート（明細）',
  desc: 'めくったカードの横に明細が1行ずつ印字され、その行のカードと線でつながる。最後に合計が名札へ。',
  run(c) {
    const { t, list, sc, rects, delta } = c;
    const raid = isRaid(sc);
    const STEP = 600;
    const f: Frame = { lit: new Set(), dim: new Set(), gained: 0, done: false, overlay: [] };
    const shown = list.filter((_, i) => t >= START + i * STEP);
    const end = START + list.length * STEP;
    list.forEach((cb, i) => {
      const t0 = START + i * STEP;
      const u = cb.student.uid;
      if (t >= t0 && t < t0 + STEP + 150) {
        f.lit.add(u);
        const row = rects.rows[u];
        const card = rects.cards[u];
        if (row && card) {
          const a = { x: row.left, y: row.top + row.height / 2 };
          const b = top(card);
          const o = 1 - clamp((t - t0 - STEP) / 150);
          f.overlay.push(
            <svg key={`l${u}`} className="fx-link" style={{ opacity: o }}>
              <path d={`M${a.x},${a.y} C${a.x - 60},${a.y} ${b.x},${b.y - 80} ${b.x},${b.y}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ease((t - t0) / 300)} />
            </svg>,
          );
        }
      }
    });
    const sum = shown.reduce((a, x) => a + x.pts, 0);
    f.side = (
      <div className="fx-receipt">
        <div className="fx-receipt-head">明細</div>
        {shown.map((cb) => (
          <div key={cb.student.uid} className="fx-row" data-row={cb.student.uid}>
            <span className="fx-row-who">
              {cb.student.icon} {cb.student.name}
            </span>
            <span className="fx-row-why">{why(cb, sc)}</span>
            <span className="fx-row-pts">{raid ? `🛡️${cb.pts}` : `+${cb.pts}`}</span>
          </div>
        ))}
        {list.length === 0 && t >= START && <div className="fx-row empty">該当する子がいない…</div>}
        {raid && t >= end && (
          <div className="fx-row enemy">
            <span className="fx-row-who">😠 敵の強さ</span>
            <span className="fx-row-why" />
            <span className="fx-row-pts">−{sc.threat}</span>
          </div>
        )}
        {t >= end && (
          <div className={`fx-row total ${delta < 0 ? 'down' : ''}`} data-total>
            <span className="fx-row-who">合計</span>
            <span className="fx-row-why" />
            <span className="fx-row-pts">{raid ? (delta < 0 ? delta : '±0') : `+${sum}`}</span>
          </div>
        )}
      </div>
    );
    if (t >= end) {
      const p = (t - end - 400) / 550;
      if (delta === 0) f.done = p >= 0;
      else if (p >= 1) {
        f.gained = delta;
        f.done = true;
      } else if (p >= 0) {
        const at = fly(mid(rects.total), mid(rects.plate), p, 60);
        f.overlay.push(
          <div key="fin" className={`fx-total ${delta < 0 ? 'down' : ''}`} style={{ left: at.x, top: at.y, transform: `translate(-50%,-50%) scale(${1.3 - 0.4 * ease(p)})` }}>
            {sign(delta)}
          </div>,
        );
      }
    }
    return f;
  },
};

/** D：カードのアイコンが1個ずつ吸い込まれて、めくったカードのカウンターが回る */
const absorb: Variant = {
  id: 'D',
  name: 'D. アイコン吸い込み',
  desc: 'カードに描かれたアイコンが1個ずつ飛び出して、めくったカードに吸い込まれる。×2の子は同じアイコンが2個ずつ飛ぶ。',
  run(c) {
    const { t, list, sc, rects } = c;
    const raid = isRaid(sc);
    const GAP = 85;
    const FLY = 520;
    const f: Frame = { lit: new Set(), dim: new Set(), gained: 0, done: false, overlay: [] };
    if (t >= START - 200) for (const s of PLAYER.students) if (!list.some((x) => x.student.uid === s.uid)) f.dim.add(s.uid);
    const target = mid(rects.ecard);
    let got = 0;
    let t0 = START;
    for (const cb of list) {
      const u = cb.student.uid;
      const icons = rects.icons[u] ?? [];
      const mul = cb.pts / Math.max(1, cb.icons);
      const span = cb.pts * GAP + FLY;
      if (t >= t0 && t < t0 + span) f.lit.add(u);
      for (let k = 0; k < cb.pts; k++) {
        const s0 = t0 + k * GAP;
        const p = (t - s0) / FLY;
        if (p < 0) continue;
        if (p >= 1) {
          got++;
          continue;
        }
        const src = mid(icons[Math.floor(k / mul) % Math.max(1, icons.length)] ?? rects.cards[u]);
        const at = fly(src, target, p, 110 + (k % 3) * 25);
        f.overlay.push(
          <div key={`${u}-${k}`} className={`fx-icon ${k % mul === 1 ? 'twin' : ''}`} style={{ left: at.x, top: at.y, transform: `translate(-50%,-50%) scale(${1.6 - 0.8 * ease(p)})` }}>
            {ATTR_ICON[sc.attr]}
          </div>,
        );
      }
      t0 += cb.pts * GAP + 260;
    }
    if (t >= START) {
      f.counter = (
        <div className={`fx-counter big ${raid ? 'shield' : ''}`} key={got}>
          {ATTR_ICON[sc.attr]} {got}
          {raid && <small> / {sc.threat}</small>}
        </div>
      );
    }
    finale(c, target, t0 + FLY, f);
    return f;
  },
};

const VARIANTS: Variant[] = [popFly, stamp, receipt, absorb];

// ---------- 画面 ----------

function measure(root: HTMLElement, attr: Attr): Rects {
  const r: Rects = { cards: {}, icons: {}, rows: {} };
  root.querySelectorAll<HTMLElement>('.demo-mat [data-uid]').forEach((el) => {
    const u = el.dataset.uid!;
    r.cards[u] = el.getBoundingClientRect();
    r.icons[u] = [...el.querySelectorAll(`.tcg-attr.a-${attr}`)].map((x) => x.getBoundingClientRect());
  });
  root.querySelectorAll<HTMLElement>('[data-row]').forEach((el) => (r.rows[el.dataset.row!] = el.getBoundingClientRect()));
  r.total = root.querySelector('[data-total] .fx-row-pts')?.getBoundingClientRect();
  r.plate = root.querySelector('.demo-mat .plate-pts')?.getBoundingClientRect();
  r.ecard = root.querySelector('.demo-ecard .ecard')?.getBoundingClientRect();
  return r;
}

function readHash(): { v: number; s: number } {
  const m = /v=(\d)&s=(\d)/.exec(location.hash);
  return m ? { v: Math.min(+m[1], VARIANTS.length - 1), s: Math.min(+m[2], SCENARIOS.length - 1) } : { v: 0, s: 0 };
}

export function ScoreDemo() {
  const [v, setV] = useState(() => readHash().v);
  const [s, setS] = useState(() => readHash().s);
  const [run, setRun] = useState(0);
  const [clock, setClock] = useState<{ t: number; rects: Rects }>({ t: 0, rects: { cards: {}, icons: {}, rows: {} } });
  const root = useRef<HTMLDivElement>(null);
  const sc = SCENARIOS[s];
  const variant = VARIANTS[v];
  const list = useMemo(() => contributions(PLAYER, sc.attr, sc.mode, sc.era), [sc]);
  const total = list.reduce((a, x) => a + x.pts, 0);
  const delta = isRaid(sc) ? Math.min(0, total - sc.threat!) : total;
  const frame = variant.run({ t: clock.t, list, sc, rects: clock.rects, delta, total });
  const doneRef = useRef(false);
  doneRef.current = frame.done;

  useEffect(() => {
    history.replaceState(null, '', `#score-demo?v=${v}&s=${s}`);
  }, [v, s]);

  useLayoutEffect(() => {
    let raf = 0;
    let stopAt = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      if (root.current) setClock({ t, rects: measure(root.current, sc.attr) });
      if (doneRef.current && !stopAt) stopAt = t + 400;
      if (!stopAt || t < stopAt) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v, s, run, sc.attr]);

  const player: Player = { ...PLAYER, points: BASE_POINTS + frame.gained };

  return (
    <div className="score-demo" ref={root}>
      <header className="demo-head">
        <h2>得点演出のデモ</h2>
        <div className="demo-tabs">
          {VARIANTS.map((x, i) => (
            <button key={x.id} className={`btn small ${i === v ? 'primary' : 'ghost'}`} onClick={() => (setV(i), setRun((r) => r + 1))}>
              {x.name}
            </button>
          ))}
        </div>
        <div className="demo-tabs">
          {SCENARIOS.map((x, i) => (
            <button key={x.id} className={`btn small ${i === s ? 'primary' : 'ghost'}`} onClick={() => (setS(i), setRun((r) => r + 1))}>
              {x.label}
            </button>
          ))}
          <button className="btn small" onClick={() => setRun((r) => r + 1)}>
            ↻ もう一度
          </button>
        </div>
        <p className="demo-desc">{variant.desc}</p>
      </header>
      <div className="demo-board">
        <div className="demo-ecard">
          <EventCardView key={`${s}-${run}`} result={sc.card} />
          {frame.counter}
        </div>
        {frame.side}
      </div>
      <div className="demo-mat">
        <Playmat
          player={player}
          year={1}
          slots={6}
          variant="near"
          acting
          delta={frame.done ? delta : undefined}
          lit={frame.lit}
          dimUid={(u) => frame.dim.has(u)}
        />
      </div>
      <div className="fx-layer">{frame.overlay}</div>
      <p className="demo-legend">係に就いた子（係ボードの下に係アイコン）はそのアイコンが×2。合戦では戦国出身の子が×2。</p>
    </div>
  );
}
