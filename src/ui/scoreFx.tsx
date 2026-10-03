import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Contribution } from '../game/calc';
import { ERAS } from '../game/data/eras';
import { ATTR_ICON, type Attr, type EraId } from '../game/types';

/*
 * 得点演出：「どのカードから何点入ったか」を見せるアニメーション。
 * 時刻 t（ms）から1コマを組み立てる純粋な関数なので、再生も早送りも t を進めるだけ。
 *   通常カード     → popBatch（A：全員のカードから同時に「+点」が名札へ飛ぶ）
 *   イベントカード → absorb（D：アイコンが1個ずつめくったカードに吸い込まれる）
 *   時代イベント   → stamp（B：カードにスタンプが押されて残る）
 *   カチコミ       → receipt（C：明細が1行ずつ出て、敵の強さとの差が分かる）
 */

export interface Pt {
  x: number;
  y: number;
}

/** めくったカードのうち、演出に要る部分 */
export interface FxCard {
  attr: Attr;
  /** 時代イベント：この時代の生徒は×2 */
  era?: EraId;
  /** カチコミ：敵の強さ */
  threat?: number;
}

export interface FxRects {
  cards: Record<string, DOMRect>;
  icons: Record<string, DOMRect[]>;
  plate?: DOMRect;
  ecard?: DOMRect;
  rows: Record<string, DOMRect>;
  total?: DOMRect;
}
export const NO_RECTS: FxRects = { cards: {}, icons: {}, rows: {} };

export interface FxCtx {
  t: number;
  /** 演出を始める時刻（めくったカードが配られるのを待つ） */
  start: number;
  list: Contribution[];
  card: FxCard;
  rects: FxRects;
  /** 最後に入る点 */
  delta: number;
  /** 合計アイコン数（係・時代ボーナス込み） */
  total: number;
  /** 教室の全員（点に関わらない子を暗くする） */
  all: string[];
}

export interface Frame {
  lit: Set<string>;
  dim: Set<string>;
  /** 名札の点に、もう入った分 */
  gained: number;
  done: boolean;
  overlay: ReactNode[];
  /** めくったカードの横に出すもの（レシート） */
  side?: ReactNode;
}

export interface Variant {
  id: string;
  name: string;
  desc: string;
  /** 演出の長さ（ms） */
  length: (c: Omit<FxCtx, 't' | 'rects'>) => number;
  run: (c: FxCtx) => Frame;
}

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
export const mid = (r?: DOMRect): Pt => (r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 });
export const top = (r?: DOMRect): Pt => (r ? { x: r.left + r.width / 2, y: r.top } : { x: 0, y: 0 });
function fly(a: Pt, b: Pt, p: number, arc = 70): Pt {
  const e = ease(p);
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - Math.sin(Math.PI * e) * arc };
}
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const isRaid = (card: FxCard) => card.threat !== undefined;
const sum = (list: Contribution[]) => list.reduce((a, x) => a + x.pts, 0);
const newFrame = (): Frame => ({ lit: new Set(), dim: new Set(), gained: 0, done: false, overlay: [] });
function dimOthers(c: FxCtx, f: Frame) {
  if (c.t < c.start - 200) return;
  for (const u of c.all) if (!c.list.some((x) => x.student.uid === u)) f.dim.add(u);
}

/** 内訳のラベル：🏃×3 ⚔️時代×2 係×2 */
export function why(c: Contribution, card: FxCard): ReactNode {
  const era = card.era ? ERAS.find((e) => e.id === card.era)! : null;
  return (
    <>
      <span>
        {ATTR_ICON[card.attr]}×{c.icons}
      </span>
      {c.era && era && <span className="fx-mul era">{era.icon}時代×2</span>}
      {c.role && <span className="fx-mul role">係×2</span>}
    </>
  );
}

/** めくったカードの下に出すカウンター */
function counter(c: FxCtx, body: ReactNode, cls = '', key?: number): ReactNode {
  const at = c.rects.ecard;
  if (!at) return null;
  return (
    <div key={`counter${key ?? ''}`} className={`fx-counter ${cls}`} style={{ left: at.left + at.width / 2, top: at.bottom }}>
      {body}
    </div>
  );
}

const FINALE_FLY = 550;
const finaleLength = (card: FxCard) => (isRaid(card) ? 900 : 250) + FINALE_FLY;

/** 最後に合計点が名札へ飛ぶ（カチコミは敵の強さとの差を出してから） */
function finale(c: FxCtx, from: Pt, t0: number, f: Frame) {
  const { t, delta, total, card, rects } = c;
  if (t < t0) return;
  const raid = isRaid(card);
  if (raid) {
    const q = back((t - t0) / 300);
    f.overlay.push(
      <div key="raid-eq" className="fx-raid-eq" style={{ left: (rects.ecard?.right ?? 0) + 16, top: from.y, transform: `translate(0,-50%) scale(${q})` }}>
        敵 {card.threat} − 👊{total} ＝ <b className={delta < 0 ? 'down' : 'up'}>{delta < 0 ? delta : '撃退！'}</b>
      </div>,
    );
  }
  const p = (t - t0 - (raid ? 900 : 250)) / FINALE_FLY;
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

// ---------- A：一括ポップ＆フライ ----------

export interface PopSrc {
  key: string;
  from: Pt;
  to: Pt;
  label: string;
  why?: ReactNode;
  shield?: boolean;
}
const POP_IN = 260;
const POP_HOLD = 560;
const POP_FLY = 480;
const POP_STAGGER = 50;
export const popLength = (start: number, n: number) => start + POP_HOLD + POP_FLY + Math.max(0, n - 1) * POP_STAGGER;

/** 全部のカードの上に同時に「+点」が出て、そろって飛んでいく。届いたものの key を返す */
export function popBatch(t: number, start: number, srcs: PopSrc[], overlay: ReactNode[]): Set<string> {
  const arrived = new Set<string>();
  srcs.forEach((s, i) => {
    const t0 = start + i * POP_STAGGER;
    if (t < start) return;
    const p = (t - t0 - POP_HOLD) / POP_FLY;
    if (p >= 1) {
      arrived.add(s.key);
      return;
    }
    const at = p < 0 ? s.from : fly(s.from, s.to, p);
    const sc = p < 0 ? back((t - start) / POP_IN) : 1 - 0.45 * ease(p);
    overlay.push(
      <div key={s.key} className={`fx-bubble ${s.shield ? 'shield' : ''}`} style={{ left: at.x, top: at.y, transform: `translate(-50%,-100%) scale(${sc})` }}>
        <b>{s.label}</b>
        {p < 0 && s.why && <small>{s.why}</small>}
      </div>,
    );
  });
  return arrived;
}

export const popFly: Variant = {
  id: 'A',
  name: 'A. ポップ＆フライ（一括）',
  desc: '通常カード用。点の入ったカード全部の上に同時に「+点数」が出て、そろって名札へ飛ぶ。テンポ重視。',
  length: (c) => popLength(c.start, c.list.length) + (isRaid(c.card) ? finaleLength(c.card) : 0),
  run(c) {
    const { t, list, card, rects, start } = c;
    const raid = isRaid(card);
    const f = newFrame();
    dimOthers(c, f);
    if (t >= start) list.forEach((x) => f.lit.add(x.student.uid));
    const to = raid ? mid(rects.ecard) : mid(rects.plate);
    const srcs = list.map((x) => ({
      key: x.student.uid,
      from: top(rects.cards[x.student.uid]),
      to,
      label: raid ? `🛡️${x.pts}` : `+${x.pts}`,
      why: why(x, card),
      shield: raid,
    }));
    const arrived = popBatch(t, start, srcs, f.overlay);
    const got = sum(list.filter((x) => arrived.has(x.student.uid)));
    const end = popLength(start, list.length);
    if (raid) {
      if (t >= start) f.overlay.push(counter(c, `👊 ${got} / ${card.threat}`, 'shield'));
      finale(c, mid(rects.ecard), end, f);
    } else {
      f.gained = got;
      f.done = t >= end;
    }
    return f;
  },
};

// ---------- B：スタンプ ----------

const stampStep = (n: number) => Math.min(520, 1800 / Math.max(1, n));

export const stamp: Variant = {
  id: 'B',
  name: 'B. スタンプ',
  desc: '時代イベント用。点の入ったカードに「+点数」のスタンプがポンポン押されて残る。×2の理由もスタンプに書いてある。',
  length: (c) => c.start + (c.list.length - 1) * stampStep(c.list.length) + 450 + finaleLength(c.card),
  run(c) {
    const { t, list, card, rects, start } = c;
    const raid = isRaid(card);
    const STEP = stampStep(list.length);
    const f = newFrame();
    dimOthers(c, f);
    let got = 0;
    list.forEach((x, i) => {
      const t0 = start + i * STEP;
      if (t < t0) return;
      const u = x.student.uid;
      f.lit.add(u);
      const q = clamp((t - t0) / 260);
      if (q >= 1) got += x.pts;
      const at = mid(rects.cards[u]);
      f.overlay.push(
        <div
          key={u}
          className={`fx-stamp ${raid ? 'shield' : ''}`}
          style={{ left: at.x, top: at.y, opacity: q, transform: `translate(-50%,-50%) rotate(${-14 + 6 * (i % 3)}deg) scale(${2.4 - 1.4 * ease(q)})` }}
        >
          <b>{raid ? `🛡️${x.pts}` : `+${x.pts}`}</b>
          <small>{why(x, card)}</small>
        </div>,
      );
    });
    if (t >= start) f.overlay.push(counter(c, raid ? `👊 ${got} / ${card.threat}` : `合計 ${got}`, raid ? 'shield' : ''));
    finale(c, mid(rects.ecard), start + (list.length - 1) * STEP + 450, f);
    return f;
  },
};

// ---------- C：レシート ----------

const receiptStep = (n: number) => Math.min(600, 2000 / Math.max(1, n));

export const receipt: Variant = {
  id: 'C',
  name: 'C. レシート（明細）',
  desc: 'カチコミ用。めくったカードの横に明細が1行ずつ印字され、その行のカードと線でつながる。最後に敵の強さを引いて名札へ。',
  length: (c) => c.start + c.list.length * receiptStep(c.list.length) + 400 + 550,
  run(c) {
    const { t, list, card, rects, delta, start } = c;
    const raid = isRaid(card);
    const STEP = receiptStep(list.length);
    const f = newFrame();
    const shown = list.filter((_, i) => t >= start + i * STEP);
    const end = start + list.length * STEP;
    list.forEach((x, i) => {
      const t0 = start + i * STEP;
      const u = x.student.uid;
      if (t < t0 || t >= t0 + STEP + 150) return;
      f.lit.add(u);
      const row = rects.rows[u];
      const cardRect = rects.cards[u];
      if (!row || !cardRect) return;
      const a = { x: row.left, y: row.top + row.height / 2 };
      const b = top(cardRect);
      const o = 1 - clamp((t - t0 - STEP) / 150);
      f.overlay.push(
        <svg key={`l${u}`} className="fx-link" style={{ opacity: o }}>
          <path d={`M${a.x},${a.y} C${a.x - 60},${a.y} ${b.x},${b.y - 80} ${b.x},${b.y}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ease((t - t0) / 300)} />
        </svg>,
      );
    });
    f.side = (
      <div className="fx-receipt">
        <div className="fx-receipt-head">明細</div>
        {shown.map((x) => (
          <div key={x.student.uid} className="fx-row" data-row={x.student.uid}>
            <span className="fx-row-who">
              {x.student.icon} {x.student.name}
            </span>
            <span className="fx-row-why">{why(x, card)}</span>
            <span className="fx-row-pts">{raid ? `🛡️${x.pts}` : `+${x.pts}`}</span>
          </div>
        ))}
        {list.length === 0 && t >= start && <div className="fx-row empty">{ATTR_ICON[card.attr]}を持つ子がいない…</div>}
        {raid && t >= end && (
          <div className="fx-row enemy">
            <span className="fx-row-who">😠 敵の強さ</span>
            <span className="fx-row-why" />
            <span className="fx-row-pts">−{card.threat}</span>
          </div>
        )}
        {t >= end && (
          <div className={`fx-row total ${delta < 0 ? 'down' : ''}`} data-total>
            <span className="fx-row-who">{raid ? (delta < 0 ? '合計' : '撃退！') : '合計'}</span>
            <span className="fx-row-why" />
            <span className="fx-row-pts">{raid ? (delta < 0 ? delta : '±0') : `+${sum(shown)}`}</span>
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

// ---------- D：アイコン吸い込み ----------

const ABSORB_FLY = 520;
/** アイコンが多いときは間隔を詰めて、だいたい2秒に収める */
function absorbTiming(list: Contribution[]) {
  const n = Math.max(1, sum(list));
  return { gap: Math.max(28, Math.min(85, 1500 / n)), pause: list.length > 4 ? 120 : 260 };
}
function absorbEnd(start: number, list: Contribution[]) {
  const { gap, pause } = absorbTiming(list);
  return start + list.reduce((a, x) => a + x.pts * gap + pause, 0) + ABSORB_FLY;
}

export const absorb: Variant = {
  id: 'D',
  name: 'D. アイコン吸い込み',
  desc: 'イベントカード用。カードに描かれたアイコンが1個ずつ飛び出して、めくったカードに吸い込まれる。×2の子は同じアイコンが2個ずつ飛ぶ。',
  length: (c) => absorbEnd(c.start, c.list) + finaleLength(c.card),
  run(c) {
    const { t, list, card, rects, start } = c;
    const raid = isRaid(card);
    const { gap, pause } = absorbTiming(list);
    const f = newFrame();
    dimOthers(c, f);
    const target = mid(rects.ecard);
    let got = 0;
    let t0 = start;
    for (const x of list) {
      const u = x.student.uid;
      const icons = rects.icons[u] ?? [];
      const mul = x.pts / Math.max(1, x.icons);
      if (t >= t0 && t < t0 + x.pts * gap + ABSORB_FLY) f.lit.add(u);
      for (let k = 0; k < x.pts; k++) {
        const p = (t - t0 - k * gap) / ABSORB_FLY;
        if (p < 0) continue;
        if (p >= 1) {
          got++;
          continue;
        }
        const src = mid(icons[Math.floor(k / mul) % Math.max(1, icons.length)] ?? rects.cards[u]);
        const at = fly(src, target, p, 110 + (k % 3) * 25);
        f.overlay.push(
          <div key={`${u}-${k}`} className={`fx-icon ${k % mul === 1 ? 'twin' : ''}`} style={{ left: at.x, top: at.y, transform: `translate(-50%,-50%) scale(${1.6 - 0.8 * ease(p)})` }}>
            {ATTR_ICON[card.attr]}
          </div>,
        );
      }
      t0 += x.pts * gap + pause;
    }
    if (t >= start)
      f.overlay.push(
        counter(
          c,
          <>
            {ATTR_ICON[card.attr]} {got}
            {raid && <small> / {card.threat}</small>}
          </>,
          `big ${raid ? 'shield' : ''}`,
          got,
        ),
      );
    finale(c, target, absorbEnd(start, list), f);
    return f;
  },
};

export const VARIANTS: Variant[] = [popFly, stamp, receipt, absorb];

/** めくったカードの種類ごとの演出 */
export function variantFor(card: FxCard): Variant {
  return isRaid(card) ? receipt : card.era ? stamp : absorb;
}

// ---------- 位置の計測と時計 ----------

/** 教室（mat）の中のカード・アイコン・名札と、めくったカード・レシートの位置 */
export function measure(root: ParentNode, attr: Attr, mat: string, ecard: string): FxRects {
  const r: FxRects = { cards: {}, icons: {}, rows: {} };
  root.querySelectorAll<HTMLElement>(`${mat} [data-uid]`).forEach((el) => {
    const u = el.dataset.uid!;
    r.cards[u] = el.getBoundingClientRect();
    r.icons[u] = [...el.querySelectorAll(`.tcg-attr.a-${attr}`)].map((x) => x.getBoundingClientRect());
  });
  root.querySelectorAll<HTMLElement>('[data-row]').forEach((el) => (r.rows[el.dataset.row!] = el.getBoundingClientRect()));
  r.total = root.querySelector('[data-total] .fx-row-pts')?.getBoundingClientRect();
  r.plate = root.querySelector(`${mat} .plate-pts`)?.getBoundingClientRect();
  r.ecard = root.querySelector(ecard)?.getBoundingClientRect();
  return r;
}

/**
 * 演出の時計：key が変わるたびに0から数え直し、毎フレーム measure() で位置を測る。
 * scale＜1 で早送り（CPUの「速い」設定）。length を過ぎたら止まる。
 */
export function useFxClock<R>(key: unknown, length: number, measureNow: () => R, empty: R, scale = 1): { t: number; rects: R } {
  const [st, setSt] = useState<{ key: unknown; t: number; rects: R }>({ key, t: 0, rects: empty });
  const measureRef = useRef(measureNow);
  measureRef.current = measureNow;
  useLayoutEffect(() => {
    if (!length) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / scale;
      setSt({ key, t, rects: measureRef.current() });
      if (t < length + 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, length, scale]);
  return st.key === key ? st : { t: 0, rects: empty };
}
