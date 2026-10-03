import { attrIcon } from '../game/data/events';
import type { EventResult, GameState } from '../game/types';
import { StudentCard } from './StudentCard';

export function ResultView({ result, state }: { result: EventResult; state: GameState }) {
  const single = !result.school && result.rows.length === 1 ? result.rows[0] : null;
  return (
    <div className={`result tone-${result.tone ?? 'special'}`}>
      <div className="event-card flip-in" title={result.desc}>
        <div className="event-icon">
          {result.icon}
          {result.attr && <span className="event-attr">{attrIcon(result.attr)}</span>}
        </div>
        <div className="event-body">
          <h2 className="event-title">{result.title}</h2>
          {result.scoring && <div className="event-scoring">{result.scoring}</div>}
          {!result.school && !result.students?.length && <div className="event-desc">{result.desc}</div>}
          {(result.effects?.length || result.threat !== undefined) && (
            <div className="event-effects">
              {result.threat !== undefined && <span className="effect threat">🏍️ 敵 {result.threat}</span>}
              {result.effects?.map((e) => (
                <span key={e} className="effect">
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
        {single && single.delta !== 0 && (
          <div className={`big-delta ${single.delta > 0 ? 'up' : 'down'}`}>
            {single.delta > 0 ? '+' : ''}
            {single.delta}
          </div>
        )}
      </div>
      {result.school && (
        <div className="ranking">
          {result.rows.map((r) => {
            const p = state.players[r.player];
            return (
              <div key={r.player} className="rank-row" style={{ borderColor: p.color }} title={r.top?.join('、')}>
                <span className="rank-badge">{r.note ?? `${(r.rank ?? 0) + 1}位`}</span>
                <span className="rank-name">{p.name}</span>
                <span className="rank-power">{r.power}</span>
                <span className={`rank-delta ${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}`}>
                  {r.delta > 0 ? '+' : ''}
                  {r.delta}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {result.lines && result.lines.length > 0 && (
        <div className="result-lines">
          {result.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
      {result.students && result.students.length > 0 && (
        <div className="card-grid center">
          {result.students.map((s) => (
            <StudentCard key={s.uid} student={s} owner={state.players[result.rows[0]?.player ?? 0]} />
          ))}
        </div>
      )}
    </div>
  );
}
