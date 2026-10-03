import { CLASS_MAP, className } from '../game/data/classes';
import { finalRanking } from '../game/engine';
import type { GameState } from '../game/types';
import { StudentCard } from './StudentCard';

export function GameOver({ state, onQuit }: { state: GameState; onQuit: () => void }) {
  const ranking = finalRanking(state);
  const winner = ranking[0];
  const medal = ['🥇', '🥈', '🥉', '4位', '5位'];
  return (
    <div className="gameover">
      <div className="confetti" aria-hidden>
        {Array.from({ length: 30 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 10) * 0.3}s` }}>
            {['🎉', '🌸', '⭐', '🎊'][i % 4]}
          </span>
        ))}
      </div>
      <h1>🏆 時空最強クラス決定！</h1>
      <div className="winner" style={{ borderColor: winner.color }}>
        <div className="winner-label">優勝</div>
        <div className="winner-name">
          {winner.name}の {winner.classCardId && CLASS_MAP[winner.classCardId].icon}{' '}
          {className(winner.classCardId, state.year)}「{winner.classCardId && CLASS_MAP[winner.classCardId].nick}」
        </div>
        <div className="winner-pts">{winner.points}pt</div>
      </div>
      {ranking.map((p, i) => {
        const mvp = [...p.students].sort((a, b) => b.mvp - a.mvp)[0];
        const hist = p.students.filter((s) => s.era !== 'present').length;
        return (
          <div key={p.id} className="final-row" style={{ borderColor: p.color }}>
            <div className="final-head">
              <span className="final-rank">{medal[i]}</span>
              <span className="final-name">{p.name}</span>
              <span className="final-pts">{p.points}pt</span>
              <span className="final-sub">
                {p.students.length}人（時空転校生{hist}人）
              </span>
            </div>
            {mvp && (
              <div className="final-mvp">
                <div className="mvp-label">クラスMVP（活躍{mvp.mvp}回）</div>
                <StudentCard student={mvp} owner={p} compact />
              </div>
            )}
          </div>
        );
      })}
      <div className="actions">
        <button className="btn primary big" onClick={onQuit}>
          タイトルへ戻る
        </button>
      </div>
    </div>
  );
}
