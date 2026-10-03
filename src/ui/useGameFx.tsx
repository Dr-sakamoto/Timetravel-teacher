import { useMemo, type ReactNode, type RefObject } from 'react';
import { contributions, type Contribution } from '../game/calc';
import type { Attr, GameState } from '../game/types';
import {
  measure,
  mid,
  NO_RECTS,
  popBatch,
  popLength,
  top,
  useFxClock,
  variantFor,
  why,
  type FxCtx,
  type FxRects,
  type PopSrc,
  type Variant,
} from './scoreFx';

/** めくったカードが配られてから演出を始めるまで */
const START = 450;

export interface GameFx {
  /** 演出の長さ（ms、早送り前） */
  length: number;
  /** 光らせるカード（null なら今まで通り、関わった子を全部） */
  lit: Set<string> | null;
  dim: Set<string>;
  /** 名札に出す点（まだ届いていない分を引いたもの） */
  points: (pid: number) => number;
  /** 点が入り終わった人（名札の「+点」を出してよい） */
  settled: (pid: number) => boolean;
  overlay: ReactNode[];
  /** めくったカードの横に出すもの（カチコミの明細） */
  side?: ReactNode;
}

type Plan =
  /** 通常カード：全員の一番の子から同時に「+点」が名札へ飛ぶ */
  | { kind: 'batch'; attr: Attr; rows: { pid: number; pts: number; c?: Contribution }[] }
  /** イベント・時代イベント・カチコミ：引いた人の教室で1枚ずつ */
  | { kind: 'single'; pid: number; variant: Variant; base: Omit<FxCtx, 't' | 'rects'> };

function planOf(s: GameState): Plan | null {
  if (s.phase.kind !== 'result') return null;
  const r = s.phase.result;
  const a = r.attr;
  if (!a || a === 'all' || r.tone === 'fixed' || r.rows.length === 0) return null;
  if (r.tone === 'normal') {
    return {
      kind: 'batch',
      attr: a,
      rows: r.rows.filter((x) => x.delta > 0).map((x) => ({ pid: x.player, pts: x.delta, c: contributions(s.players[x.player], a, 'best')[0] })),
    };
  }
  const row = r.rows[0];
  const p = s.players[row.player];
  const card = { attr: a, era: r.era, threat: r.threat };
  const list = contributions(p, a, 'sum', r.era);
  const total = list.reduce((x, c) => x + c.pts, 0);
  return { kind: 'single', pid: row.player, variant: variantFor(card), base: { start: START, list, card, delta: row.delta, total, all: p.students.map((x) => x.uid) } };
}

interface BatchRects {
  /** 教室が見えていればそのカード、畳まれていれば相手の席 */
  from?: DOMRect;
  onCard: boolean;
  to?: DOMRect;
}
interface Measured {
  single: FxRects;
  batch: Record<number, BatchRects>;
}
const EMPTY: Measured = { single: NO_RECTS, batch: {} };

function measureGame(root: HTMLElement | null, plan: Plan | null): Measured {
  if (!root || !plan) return EMPTY;
  if (plan.kind === 'single') return { single: measure(root, plan.base.card.attr, `.playmat[data-pid="${plan.pid}"]`, '.reveal .ecard'), batch: {} };
  const batch: Record<number, BatchRects> = {};
  for (const x of plan.rows) {
    const mat = root.querySelector(`.playmat[data-pid="${x.pid}"]`);
    const card = mat && x.c ? mat.querySelector(`[data-uid="${x.c.student.uid}"]`) : null;
    const seat = root.querySelector(`.opp[data-pid="${x.pid}"]`);
    batch[x.pid] = {
      from: (card ?? seat)?.getBoundingClientRect(),
      onCard: !!card,
      to: (mat?.querySelector('.plate-pts') ?? seat?.querySelector('.opp-pts'))?.getBoundingClientRect(),
    };
  }
  return { single: NO_RECTS, batch };
}

/** 今めくられたカードの得点演出。演出のないカード（学校行事・転入など）なら null */
export function useGameFx(state: GameState, root: RefObject<HTMLElement>, scale: number): GameFx | null {
  const result = state.phase.kind === 'result' ? state.phase.result : null;
  // 結果が変わったときだけ計画し直す（演出中は毎フレーム描き直すので）
  const plan = useMemo(() => planOf(state), [result]);
  const length = !plan ? 0 : plan.kind === 'batch' ? popLength(START, plan.rows.length) : plan.variant.length(plan.base);
  const { t, rects } = useFxClock<Measured>(result, length, () => measureGame(root.current, plan), EMPTY, scale);
  if (!plan) return null;
  const over = t >= length;
  const players = state.players;

  if (plan.kind === 'batch') {
    const overlay: ReactNode[] = [];
    const srcs: PopSrc[] = [];
    for (const x of plan.rows) {
      const m = rects.batch[x.pid];
      if (!m?.from || !m.to) continue;
      srcs.push({
        key: String(x.pid),
        from: m.onCard ? top(m.from) : mid(m.from),
        to: mid(m.to),
        label: `+${x.pts}`,
        why: m.onCard && x.c ? why(x.c, { attr: plan.attr }) : undefined,
      });
    }
    const arrived = popBatch(t, START, srcs, overlay);
    const pending = (pid: number) => !over && plan.rows.some((x) => x.pid === pid) && !arrived.has(String(pid));
    const delta = (pid: number) => plan.rows.find((x) => x.pid === pid)?.pts ?? 0;
    return {
      length,
      lit: null,
      dim: new Set(),
      points: (pid) => players[pid].points - (pending(pid) ? delta(pid) : 0),
      settled: (pid) => !pending(pid),
      overlay,
    };
  }

  const f = plan.variant.run({ ...plan.base, t, rects: rects.single });
  const done = f.done || over;
  return {
    length,
    lit: f.lit,
    dim: f.dim,
    points: (pid) => (pid === plan.pid && !done ? players[pid].points - plan.base.delta + f.gained : players[pid].points),
    settled: (pid) => pid !== plan.pid || done,
    overlay: f.overlay,
    side: f.side,
  };
}
