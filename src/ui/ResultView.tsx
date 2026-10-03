import { attrIcon } from '../game/data/events';
import { ATTR_LABEL, type EventResult, type GameState } from '../game/types';
import { StudentCard } from './StudentCard';

export function ResultView({ result, state }: { result: EventResult; state: GameState }) {
  const rankLabel = (r?: number) => (r === undefined ? '' : `${r + 1}位`);
  return (
    <div className={`result ${result.school ? 'school' : 'personal'} tone-${result.tone ?? 'special'}`}>
      <div className="event-card flip-in">
        <div className="event-icon">
          {result.icon}
          {result.attr && (
            <span className="event-attr" title={result.attr === 'all' ? '全属性' : ATTR_LABEL[result.attr]}>
              {attrIcon(result.attr)}
            </span>
          )}
        </div>
        <div className="event-body">
          <div className="event-kind">
            {result.school ? '学校行事（全クラス参加）' : result.tone === 'blue' ? '青マス' : result.tone === 'red' ? '赤マス' : 'イベント'}
          </div>
          <h2 className="event-title">{result.title}</h2>
          <p className="event-desc">{result.desc}</p>
          {result.scoring && <p className="event-scoring">{result.scoring}</p>}
          {result.effects && result.effects.length > 0 && (
            <div className="event-effects">
              {result.effects.map((e) => (
                <span key={e} className="effect">
                  ✦ {e}
                </span>
              ))}
            </div>
          )}
          {result.threat !== undefined && (
            <p className="threat">
              🏍️ 襲来した不良軍団の戦力：<b>{result.threat}</b>
            </p>
          )}
        </div>
      </div>
      {result.school && (
        <table className="result-table">
          <thead>
            <tr>
              <th />
              <th>クラス</th>
              <th>戦力</th>
              <th>活躍した生徒</th>
              <th>獲得</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => {
              const p = state.players[r.player];
              return (
                <tr key={r.player}>
                  <td className="rank">{r.note ?? rankLabel(r.rank)}</td>
                  <td>
                    <span className="dot" style={{ background: p.color }} /> {p.name}
                  </td>
                  <td className="num">{r.power}</td>
                  <td className="top-names">{r.top?.join('、')}</td>
                  <td className={`num delta ${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}`}>
                    {r.delta > 0 ? '+' : ''}
                    {r.delta}pt
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!result.school && result.rows.length > 0 && result.rows[0].delta !== 0 && (
        <div className={`big-delta ${result.rows[0].delta > 0 ? 'up' : 'down'}`}>
          {state.players[result.rows[0].player].name} {result.rows[0].delta > 0 ? '+' : ''}
          {result.rows[0].delta}pt
        </div>
      )}
      {result.lines && result.lines.length > 0 && (
        <ul className="result-lines">
          {result.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
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
