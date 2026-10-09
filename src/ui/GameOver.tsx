import { className, finalRanking } from '../game/engine';
import type { GameState } from '../game/types';
import { TcgCard } from './TcgCard';

export function GameOver({ state, onQuit }: { state: GameState; onQuit: () => void }) {
  const ranking = finalRanking(state);
  const winner = ranking[0];
  const medal = ['🥇', '🥈', '🥉', '4位', '5位'];
  // チーム戦：同じ席番号の2クラス（この部屋のクラスと、もう一方の部屋のチームメイト）の合計点で勝負
  const team = state.team;
  const teams = team
    ? state.players
        .map((p, i) => ({ i, p, mate: team.mates[i], total: p.points + (team.mates[i]?.points ?? 0) }))
        .sort((a, b) => b.total - a.total)
    : [];
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
      {team && (
        <div className="winner" style={{ borderColor: teams[0].p.color }}>
          <div className="winner-label">🤝 優勝チーム</div>
          <div className="winner-name">
            チーム{teams[0].i + 1}：{teams[0].p.name} ＆ {teams[0].mate?.name}
          </div>
          <div className="winner-pts">{teams[0].total}pt</div>
          {teams.map((x, k) => (
            <div key={x.i} className="final-sub">
              {medal[k]} チーム{x.i + 1}（{x.p.name} {x.p.points}pt ＋ {x.mate?.name} {x.mate?.points ?? 0}pt）＝ {x.total}pt
            </div>
          ))}
        </div>
      )}
      <div className="winner" style={{ borderColor: winner.color }}>
        <div className="winner-label">{team ? `部屋${team.room ? 'B' : 'A'}の1位` : '優勝'}</div>
        <div className="winner-name">
          {winner.name}の {className(winner.id, state.year)}
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
                <TcgCard student={mvp} owner={p} />
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
