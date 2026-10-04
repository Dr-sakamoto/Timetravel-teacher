import type { CSSProperties } from 'react';
import { ERAS } from '../game/data/eras';
import { MONTHS, termOfMonth } from '../game/engine';
import type { GameState } from '../game/types';

/** その年の3学期の時代。今の学期を強調する */
export function EraBar({ state }: { state: GameState }) {
  const term = termOfMonth(MONTHS[Math.min(state.monthIdx, MONTHS.length - 1)]);
  return (
    <div className="erabar">
      {state.yearEras.map((ei, i) => {
        const era = ERAS[ei];
        const t = i + 1;
        const status = t === term ? 'now' : t < term ? 'past' : 'next';
        return (
          <div key={i} className={`era-chip ${status}`} style={{ '--era': era.color } as CSSProperties} title={`${era.when}／「${era.motto}」`}>
            <span className="era-term">{t}学期</span>
            <span className="era-icon">{era.icon}</span>
            <span className="era-name">{era.name}</span>
            <span className="era-left">残{state.pools[era.id].length}</span>
          </div>
        );
      })}
    </div>
  );
}
