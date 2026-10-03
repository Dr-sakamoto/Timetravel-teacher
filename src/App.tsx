import { useCallback, useEffect, useState } from 'react';
import { CARDS } from './game/data/cards';
import { newGame, PLAYER_COLORS, step, calendarLabel } from './game/engine';
import type { Action, GameState } from './game/types';
import { GameView } from './ui/GameView';
import { Rules } from './ui/Rules';

const SAVE_KEY = 'timetravel-teacher-save-v4';

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === 4 ? s : null;
  } catch {
    return null;
  }
}

function writeSave(s: GameState | null) {
  try {
    if (s && s.phase.kind !== 'gameOver') localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 保存できない環境では何もしない */
  }
}

const DEFAULT_NAMES = ['赤井先生', '青山先生', '緑川先生', '黄瀬先生', '紫藤先生'];

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(() => loadSave());
  const [screen, setScreen] = useState<'title' | 'setup' | 'game'>('title');
  const [rules, setRules] = useState(false);

  const dispatch = useCallback((a: Action) => setState((s) => (s ? step(s, a) : s)), []);

  useEffect(() => {
    if (state) writeSave(state);
  }, [state]);

  const quit = () => {
    setSaved(loadSave());
    setState(null);
    setScreen('title');
  };

  return (
    <>
      {screen === 'title' && (
        <Title
          saved={saved}
          onNew={() => setScreen('setup')}
          onContinue={() => {
            if (saved) {
              setState(saved);
              setScreen('game');
            }
          }}
          onRules={() => setRules(true)}
        />
      )}
      {screen === 'setup' && (
        <Setup
          onBack={() => setScreen('title')}
          onStart={(players, years) => {
            setState(newGame(players, years));
            setScreen('game');
          }}
        />
      )}
      {screen === 'game' && state && (
        <GameView state={state} dispatch={dispatch} onQuit={quit} onRules={() => setRules(true)} />
      )}
      {rules && <Rules onClose={() => setRules(false)} />}
    </>
  );
}

function Title({
  saved,
  onNew,
  onContinue,
  onRules,
}: {
  saved: GameState | null;
  onNew: () => void;
  onContinue: () => void;
  onRules: () => void;
}) {
  const parade = ['🦖', '👸', '🏛️', '🐉', '🌸', '🎨', '⚔️', '🌅', '🎩', '🏫', '🤖'];
  return (
    <div className="title-screen">
      <div className="title-parade" aria-hidden>
        {parade.map((e, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.25}s` }}>
            {e}
          </span>
        ))}
      </div>
      <div className="title-sub">タイムトラベル・ティーチャー</div>
      <h1 className="title-logo">
        時空最強クラス
        <br />
        決定戦
      </h1>
      <p className="title-lead">
        恐竜も、戦国武将も、天才科学者も。
        <br />
        あらゆる時代から転校生を集めて、最強のクラスを作れ！
      </p>
      <div className="title-buttons">
        <button className="btn primary big" onClick={onNew}>
          新しく始める
        </button>
        {saved && (
          <button className="btn big" onClick={onContinue}>
            続きから（{calendarLabel(saved)}）
          </button>
        )}
        <button className="btn ghost" onClick={onRules}>
          遊び方
        </button>
      </div>
      <p className="title-foot">2〜5人 ・ 1台を回して遊ぶホットシート式 ・ CPUとも対戦可 ・ 偉人/恐竜カード{CARDS.length}種</p>
    </div>
  );
}

function Setup({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (players: { name: string; isCpu: boolean }[], years: number) => void;
}) {
  const [count, setCount] = useState(3);
  const [years, setYears] = useState(1);
  const [players, setPlayers] = useState(
    DEFAULT_NAMES.map((name, i) => ({ name, isCpu: i !== 0 })),
  );
  const active = players.slice(0, count);
  const update = (i: number, patch: Partial<{ name: string; isCpu: boolean }>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <div className="setup">
      <h1>ゲーム設定</h1>
      <section>
        <h3>人数</h3>
        <div className="seg">
          {[2, 3, 4, 5].map((n) => (
            <button key={n} className={`btn ${count === n ? 'primary' : 'ghost'}`} onClick={() => setCount(n)}>
              {n}人
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>プレイヤー（担任の先生）</h3>
        {active.map((p, i) => (
          <div key={i} className="player-row">
            <span className="dot big" style={{ background: PLAYER_COLORS[i] }} />
            <input value={p.name} maxLength={12} onChange={(e) => update(i, { name: e.target.value })} />
            <div className="seg">
              <button className={`btn small ${!p.isCpu ? 'primary' : 'ghost'}`} onClick={() => update(i, { isCpu: false })}>
                👤 人間
              </button>
              <button className={`btn small ${p.isCpu ? 'primary' : 'ghost'}`} onClick={() => update(i, { isCpu: true })}>
                🤖 CPU
              </button>
            </div>
          </div>
        ))}
      </section>
      <section>
        <h3>期間</h3>
        <div className="seg">
          {[
            [1, '1年（短め・約30分〜）'],
            [2, '2年'],
            [3, '3年（じっくり）'],
          ].map(([y, l]) => (
            <button key={y} className={`btn ${years === y ? 'primary' : 'ghost'}`} onClick={() => setYears(y as number)}>
              {l}
            </button>
          ))}
        </div>
      </section>
      <div className="actions">
        <button className="btn ghost" onClick={onBack}>
          戻る
        </button>
        <button
          className="btn primary big"
          disabled={active.some((p) => !p.name.trim())}
          onClick={() => onStart(active.map((p) => ({ name: p.name.trim(), isCpu: p.isCpu })), years)}
        >
          ゲーム開始！
        </button>
      </div>
    </div>
  );
}
