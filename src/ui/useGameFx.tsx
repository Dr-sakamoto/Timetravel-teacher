import { useMemo, type ReactNode, type RefObject } from 'react';
import { contributions } from '../game/calc';
import type { GameState } from '../game/types';
import { measure, minusList, NO_RECTS, useFxClock, variantFor, type FxCtx, type FxRects, type Variant } from './scoreFx';

/** めくったカードが配られてから演出を始めるまで */
const START = 450;

export interface GameFx {
  /** 演出の長さ（ms、早送り前） */
  length: number;
  /** その人の教室で光らせるカード（null なら今まで通り、関わった子を全部） */
  lit: (pid: number) => Set<string> | null;
  /** その人の教室で暗くするカード */
  dims: (pid: number) => Set<string> | null;
  /** 名札に出す点（まだ届いていない分を引いたもの） */
  points: (pid: number) => number;
  /** 点が入り終わった人（名札の「+点」を出してよい） */
  settled: (pid: number) => boolean;
  overlay: ReactNode[];
  /** めくったカードの横に出すもの（襲来の明細） */
  side?: ReactNode;
}

interface Plan {
  /** めくった人：この人の教室で1枚ずつ見せる */
  pid: number;
  variant: Variant;
  base: Omit<FxCtx, 't' | 'rects'>;
  /** 全クラスに効くカードで、ほかの人に入る点（めくった人の演出の終わりぎわにまとめて入る） */
  others: Map<number, number>;
  othersAt: number;
  length: number;
}

/**
 * 演出は手前（me）の教室でだけ見せる（相手の教室は卓に出していないので）。
 * 全クラスに効くカードなら自分の分を、取った人だけのカードなら自分が取ったときだけ。
 */
function planOf(s: GameState, me: number): Plan | null {
  if (s.phase.kind !== 'result') return null;
  const r = s.phase.result;
  const a = r.attr;
  if (!a || a === 'all' || r.tone === 'fixed' || r.tone === 'personal') return null;
  if (r.tone === 'normal' && s.phase.player !== me) return null;
  const pid = me;
  const row = r.rows.find((x) => x.player === pid);
  if (!row) return null;
  const p = s.players[pid];
  const card = { attr: a, era: r.era, threat: r.threat, minus: r.minus, perHead: r.perHead };
  // 時代イベントの代表戦などは、点に関わった子（row.uids）だけを見せる。「1人につき」なら1人ずつ同じ点
  const list = contributions(p, a)
    .filter((x) => r.tone !== 'era' || !row.uids || row.uids.includes(x.student.uid))
    .map((x) => (r.perHead ? { ...x, pts: r.perHead, era: false, role: false } : x));
  const minus = r.minus ? minusList(p.students, r.minus === 'heads' ? null : contributions(p, r.minus)) : [];
  const variant = variantFor(card, r.tone === 'normal');
  const base = { start: START, list, minusList: minus, card, delta: row.delta, total: list.reduce((x, c) => x + c.pts, 0), all: p.students.map((x) => x.uid) };
  const own = variant.length(base);
  const others = new Map(r.rows.filter((x) => x.player !== pid && x.delta !== 0).map((x) => [x.player, x.delta]));
  const othersAt = Math.max(START, own - 600);
  return { pid, variant, base, others, othersAt, length: others.size ? Math.max(own, othersAt + 400) : own };
}

/** 今めくられたカードの得点演出。演出のないカード（学校行事・転入・カチコミなど）なら null */
export function useGameFx(state: GameState, root: RefObject<HTMLElement>, scale: number, me: number): GameFx | null {
  const result = state.phase.kind === 'result' ? state.phase.result : null;
  // 結果が変わったときだけ計画し直す（演出中は毎フレーム描き直すので）
  const plan = useMemo(() => planOf(state, me), [result, me]);
  const length = plan?.length ?? 0;
  const { t, rects } = useFxClock<FxRects>(
    result,
    length,
    () => (root.current && plan ? measure(root.current, `.playmat[data-pid="${plan.pid}"]`, '.reveal .ecard') : NO_RECTS),
    NO_RECTS,
    scale,
  );
  if (!plan) return null;
  const over = t >= length;
  const players = state.players;
  const f = plan.variant.run({ ...plan.base, t, rects });
  const done = f.done || over;
  const othersIn = t >= plan.othersAt || over;
  return {
    length,
    lit: (pid) => (pid === plan.pid ? f.lit : null),
    dims: (pid) => (pid === plan.pid ? f.dim : null),
    points: (pid) => {
      if (pid === plan.pid) return done ? players[pid].points : players[pid].points - plan.base.delta + f.gained;
      return othersIn ? players[pid].points : players[pid].points - (plan.others.get(pid) ?? 0);
    },
    settled: (pid) => (pid === plan.pid ? done : othersIn),
    overlay: f.overlay,
    side: f.side,
  };
}
