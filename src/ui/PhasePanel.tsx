import { useState } from 'react';
import { classScore, evaluateTransfer } from '../game/ai';
import { MAX_CLASS, roleOf } from '../game/calc';
import { CLASS_MAP, className } from '../game/data/classes';
import { ERAS } from '../game/data/eras';
import { roleDesc, ROLES } from '../game/data/roles';
import { MONTHS, canLearn, poachable, termOfMonth } from '../game/engine';
import { POWER_CAP } from '../game/calc';
import { ATTRS, ATTR_ICON, ATTR_LABEL, type Action, type Attr, type GameState } from '../game/types';
import { ResultView } from './ResultView';
import { RoleEditor } from './RoleEditor';
import { StudentCard } from './StudentCard';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  cpuBusy: boolean;
}

const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function PhasePanel({ state, dispatch, cpuBusy }: Props) {
  const ph = state.phase;
  if (ph.kind === 'gameOver') return null;
  const actor = ph.player !== null ? state.players[ph.player] : null;

  if (cpuBusy && ph.kind !== 'result') {
    return (
      <div className="panel center">
        <div className="cpu-thinking">
          🤖 {actor?.name}が考え中…
        </div>
      </div>
    );
  }

  switch (ph.kind) {
    case 'classDraw': {
      const p = state.players[ph.player];
      if (!ph.drawn) {
        return (
          <div className="panel center">
            <h2>{p.name}、クラスカードを引いてください</h2>
            <p className="hint">クラスカードで「係の構成」と「最初の12人（全員現代の普通の生徒）」が決まります。</p>
            <button className="deck-card" onClick={() => dispatch({ type: 'drawClass' })}>
              <span className="deck-back">🏫</span>
              <span>クラスカードを引く</span>
            </button>
          </div>
        );
      }
      const card = CLASS_MAP[p.classCardId!];
      return (
        <div className="panel">
          <div className="class-card flip-in" style={{ borderColor: card.color }}>
            <div className="class-icon">{card.icon}</div>
            <div>
              <div className="class-name">{className(card.id, state.year)}</div>
              <h2 className="class-nick">「{card.nick}」</h2>
              <p>{card.desc}</p>
              <div className="class-roles">
                {card.roles.map((r, i) => (
                  <span key={i} className="pill" title={roleDesc(r)}>
                    {ROLES[r].icon} {ROLES[r].name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <h3>初期メンバー 12人</h3>
          <div className="card-grid">
            {p.students.map((s) => (
              <StudentCard key={s.uid} student={s} owner={p} compact />
            ))}
          </div>
          <div className="actions">
            <button className="btn primary" onClick={() => dispatch({ type: 'continue' })}>
              次へ
            </button>
          </div>
        </div>
      );
    }
    case 'roles': {
      const p = state.players[ph.player];
      const t = termOfMonth(MONTHS[state.monthIdx]);
      return (
        <div className="panel">
          <RoleEditor
            key={`${p.id}-${state.year}-${state.monthIdx}`}
            player={p}
            termLabel={`${state.year}年生 ${t}学期`}
            onConfirm={(roles) => dispatch({ type: 'setRoles', roles })}
          />
        </div>
      );
    }
    case 'travel': {
      const p = state.players[ph.player];
      const era = ERAS[p.era];
      return (
        <div className="panel center">
          <h2>{p.name}のターン — タイムマシン起動</h2>
          <p>
            現在地：{era.icon} <b>{era.name}</b>（{era.when}）
          </p>
          {ph.dice === null ? (
            <>
              <p className="hint">サイコロを振って、出た目の数だけ前後の時代へ移動できます。転校生はタイムマシンがいる時代からやってきます。</p>
              <button className="btn primary big" onClick={() => dispatch({ type: 'rollDice' })}>
                🎲 サイコロを振る
              </button>
            </>
          ) : (
            <>
              <div className="dice roll-in">{DICE[ph.dice - 1]}</div>
              <p>
                出目 <b>{ph.dice}</b>！ 行き先を選んでください（{ph.dice}つ先まで）。
              </p>
              <div className="era-buttons">
                {ERAS.map((e, i) =>
                  Math.abs(i - p.era) <= ph.dice! ? (
                    <button
                      key={e.id}
                      className={`btn era-btn ${i === p.era ? 'primary' : ''}`}
                      style={{ borderColor: e.color }}
                      onClick={() => dispatch({ type: 'travel', era: i })}
                    >
                      {e.icon} {i === p.era ? `${e.name}に留まる` : e.name}
                      <small>残{e.id === 'present' ? '∞' : state.pools[e.id].length}</small>
                    </button>
                  ) : null,
                )}
              </div>
            </>
          )}
        </div>
      );
    }
    case 'draw': {
      const p = state.players[ph.player];
      return (
        <div className="panel center">
          <h2>{p.name}のターン — イベントカード</h2>
          <p className="hint">
            学校行事は全クラスが参加し、イベントの属性アイコンを持つ生徒の数値で勝負。青マス・赤マスはちょっとした増減、転校生カードなら
            {ERAS[p.era].icon} {ERAS[p.era].name}から転校生がやってくる。
          </p>
          <button className="deck-card" onClick={() => dispatch({ type: 'drawEvent' })}>
            <span className="deck-back">🃏</span>
            <span>イベントカードを引く</span>
            <small>山札 残り{state.eventDeck.length}枚</small>
          </button>
        </div>
      );
    }
    case 'transfer':
      return <TransferPanel state={state} dispatch={dispatch} />;
    case 'train':
      return <TrainPanel state={state} dispatch={dispatch} />;
    case 'poach': {
      const list = poachable(state, ph.player);
      return (
        <div className="panel">
          <h2>🕵️ 引き抜き工作 — {state.players[ph.player].name}</h2>
          <p className="hint">他クラスの係についていない生徒から1人を選んで引き抜けます（相手には移籍金3pt）。</p>
          {state.players
            .filter((p) => p.id !== ph.player)
            .map((p) => {
              const mine = list.filter((x) => x.player === p.id);
              if (mine.length === 0) return null;
              return (
                <div key={p.id}>
                  <h3>
                    <span className="dot" style={{ background: p.color }} /> {p.name}のクラス
                  </h3>
                  <div className="card-grid">
                    {mine.map(({ student }) => (
                      <StudentCard
                        key={student.uid}
                        student={student}
                        owner={p}
                        compact
                        onClick={() => dispatch({ type: 'poach', uid: student.uid })}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          <div className="actions">
            <button className="btn ghost" onClick={() => dispatch({ type: 'poach', uid: null })}>
              やめておく
            </button>
          </div>
        </div>
      );
    }
    case 'warp':
    case 'summerTravel': {
      const p = state.players[ph.player];
      return (
        <div className="panel center">
          <h2>
            {ph.kind === 'warp' ? '✨ 時空ワープ航法' : '🌻 夏休みタイムトラベル合宿'} — {p.name}
          </h2>
          <p>
            {ph.kind === 'warp'
              ? '好きな時代へタイムマシンを移動できます。'
              : '夏休みはどの時代へでも行ける！行った先で転校生を1人スカウトできます。'}
          </p>
          <div className="era-buttons">
            {ERAS.map((e, i) => (
              <button key={e.id} className="btn era-btn" style={{ borderColor: e.color }} onClick={() => dispatch({ type: 'travel', era: i })}>
                {e.icon} {e.name}
                <small>残{e.id === 'present' ? '∞' : state.pools[e.id].length}</small>
              </button>
            ))}
          </div>
        </div>
      );
    }
    case 'result': {
      const autoCpu = ph.player !== null && state.players[ph.player].isCpu;
      return (
        <div className="panel">
          <ResultView result={ph.result} state={state} />
          <div className="actions">
            <button className="btn primary" onClick={() => dispatch({ type: 'continue' })}>
              {autoCpu ? '次へ（自動で進みます）' : '次へ'}
            </button>
          </div>
        </div>
      );
    }
  }
}

function TransferPanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const ph = state.phase;
  const [sel, setSel] = useState<number | null>(null);
  const [release, setRelease] = useState<string>('');
  if (ph.kind !== 'transfer') return null;
  const p = state.players[ph.player];
  const full = p.students.length >= MAX_CLASS;
  const base = classScore(p);
  return (
    <div className="panel">
      <h2>🚪 {ph.title} — {p.name}</h2>
      <p>{ph.reason}</p>
      {ph.picks > 1 && <p className="hint">あと{ph.picks}人まで選べます。</p>}
      <div className="card-grid center">
        {ph.options.map((o, i) => {
          const pct = Math.round((evaluateTransfer(p, o).gain / base) * 1000) / 10;
          return (
            <div key={o.uid} className="option-wrap">
              <StudentCard student={o} selected={sel === i} onClick={() => setSel(i)} />
              <div className={`fit ${pct >= 4 ? 'good' : pct > 0 ? 'ok' : 'bad'}`} title="主要イベントでの戦力をもとにした目安">
                クラス総合力の目安：{pct > 0 ? '+' : ''}
                {pct}%{pct <= 0 ? '（平均が下がるかも）' : ''}
              </div>
            </div>
          );
        })}
      </div>
      {full && (
        <div className="release">
          <label>
            定員{MAX_CLASS}人です。代わりに元の時代へ帰ってもらう生徒：
            <select value={release} onChange={(e) => setRelease(e.target.value)}>
              <option value="">選んでください</option>
              {p.students
                .filter((s) => !roleOf(p, s.uid))
                .map((s) => (
                  <option key={s.uid} value={s.uid}>
                    {s.icon} {s.name}（{s.title}）
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      <div className="actions">
        <button className="btn ghost" onClick={() => dispatch({ type: 'pickTransfer', index: null })}>
          {ph.added.length ? 'ここまでにする' : '今回は見送る'}
        </button>
        <button
          className="btn primary"
          disabled={sel === null || (full && !release)}
          onClick={() => {
            if (sel === null) return;
            dispatch({ type: 'pickTransfer', index: sel, releaseUid: full ? release : undefined });
            setSel(null);
            setRelease('');
          }}
        >
          この生徒を迎える
        </button>
      </div>
    </div>
  );
}

function TrainPanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const ph = state.phase;
  const [uid, setUid] = useState<string | null>(null);
  const [mode, setMode] = useState<'power' | Attr>('power');
  if (ph.kind !== 'train') return null;
  const p = state.players[ph.player];
  const st = p.students.find((x) => x.uid === uid);
  const ok = st ? (mode === 'power' ? st.power < POWER_CAP : canLearn(st, mode)) : false;
  const list = [...p.students].sort((a, b) =>
    mode === 'power' ? b.power - a.power : Number(canLearn(b, mode)) - Number(canLearn(a, mode)) || b.power - a.power,
  );
  return (
    <div className="panel">
      <h2>💪 放課後の特訓 — {p.name}</h2>
      <p className="hint">
        数値を+1するか、新しい属性を覚えさせる（属性の幅が広がる）。👊は覚えられず、ヤンキーは📚を覚えられない。
      </p>
      <div className="stat-picker">
        <button className={`btn ${mode === 'power' ? 'primary' : 'ghost'}`} onClick={() => setMode('power')}>
          数値 +1
        </button>
        {(ATTRS as Attr[])
          .filter((a) => a !== 'fight')
          .map((a) => (
            <button key={a} className={`btn ${mode === a ? 'primary' : 'ghost'}`} onClick={() => setMode(a)}>
              {ATTR_ICON[a]} {ATTR_LABEL[a]}を覚える
            </button>
          ))}
      </div>
      <div className="card-grid">
        {list.map((s) => {
          const can = mode === 'power' ? s.power < POWER_CAP : canLearn(s, mode);
          return (
            <StudentCard key={s.uid} student={s} owner={p} compact selected={uid === s.uid} dim={!can} onClick={() => setUid(s.uid)} />
          );
        })}
      </div>
      <div className="actions">
        <button
          className="btn primary"
          disabled={!ok}
          onClick={() =>
            uid && dispatch(mode === 'power' ? { type: 'train', uid, mode: 'power' } : { type: 'train', uid, mode: 'attr', attr: mode })
          }
        >
          特訓する
        </button>
      </div>
    </div>
  );
}
