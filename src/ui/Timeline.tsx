import type { CSSProperties } from 'react';
import { ERAS } from '../game/data/eras';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  selectable?: (i: number) => boolean;
  onSelect?: (i: number) => void;
  focusPlayer?: number | null;
}

export function Timeline({ state, selectable, onSelect, focusPlayer }: Props) {
  return (
    <div className="timeline">
      <div className="timeline-rail" />
      {ERAS.map((era, i) => {
        const can = selectable?.(i) ?? false;
        const here = state.players.filter((p) => p.era === i);
        const left = era.id === 'present' ? '∞' : state.pools[era.id].length;
        const isFocus = focusPlayer !== null && focusPlayer !== undefined && state.players[focusPlayer].era === i;
        return (
          <button
            key={era.id}
            className={`era ${can ? 'can' : ''} ${isFocus ? 'focus' : ''}`}
            style={{ '--era': era.color } as CSSProperties}
            disabled={!can}
            onClick={() => can && onSelect?.(i)}
            title={`${era.name}（${era.when}）残り${left}人`}
          >
            <span className="era-icon">{era.icon}</span>
            <span className="era-name">{era.name}</span>
            <span className="era-when">{era.when}</span>
            <span className="era-left">残{left}</span>
            <span className="era-tokens">
              {here.map((p) => (
                <span key={p.id} className="token" style={{ background: p.color }} title={p.name}>
                  {p.name.slice(0, 1)}
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
