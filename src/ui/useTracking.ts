import { useEffect } from 'react';
import { track, trackGameFinish } from '../analytics';
import { MONTHS, termOfMonth } from '../game/engine';
import type { GameState } from '../game/types';

const seen = new Set<string>();
const once = (key: string, f: () => void) => {
  if (seen.has(key)) return;
  seen.add(key);
  f();
};

/** 自分の卓のゲームの進み具合を数える（1学期を終えた・最後まで遊んだ）。観戦している部屋の卓には使わない */
export function useTracking(state: GameState | null | undefined, mode: string) {
  const key = state ? `${state.players.map((p) => p.name).join('|')}/${state.years}/${state.team?.room ?? ''}` : '';
  const over = state?.phase.kind === 'gameOver';
  const term1Done = !!state && (state.year > 1 || termOfMonth(MONTHS[Math.min(state.monthIdx, MONTHS.length - 1)]) !== 1 || over);
  useEffect(() => {
    if (!state) return;
    const props = { mode, players: state.players.length, years: state.years, trial: !!state.trial };
    // 1学期を終えた：この画面で1学期を遊んでいたゲームだけ数える（2学期以降のセーブから再開した時は数えない）
    if (!term1Done) seen.add(`${key}/inTerm1`);
    else if (seen.has(`${key}/inTerm1`)) once(`${key}/term1`, () => track('term1_done', props));
    if (over) trackGameFinish(key, props);
  }, [key, term1Done, over]);
}
