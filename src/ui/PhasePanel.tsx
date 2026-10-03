import { useState } from 'react';
import { classScore, evaluateTransfer } from '../game/ai';
import { MAX_CLASS, roleOf } from '../game/calc';
import { CLASS_MAP } from '../game/data/classes';
import { ERAS } from '../game/data/eras';
import { roleDesc, ROLES } from '../game/data/roles';
import { MONTHS, STARTING_MEMBERS, currentEra, pushTargets, termOfMonth } from '../game/engine';
import type { Action, GameState } from '../game/types';
import { Classroom } from './Classroom';
import { ResultView } from './ResultView';
import { RoleEditor } from './RoleEditor';
import { StudentCard } from './StudentCard';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  cpuBusy: boolean;
}

export function PhasePanel({ state, dispatch, cpuBusy }: Props) {
  const ph = state.phase;
  if (ph.kind === 'gameOver') return null;
  const actor = ph.player !== null ? state.players[ph.player] : null;

  if (cpuBusy && ph.kind !== 'result') {
    return (
      <div className="panel center">
        <div className="cpu-thinking">🤖 {actor?.name}…</div>
      </div>
    );
  }

  switch (ph.kind) {
    case 'classDraw': {
      const p = state.players[ph.player];
      if (!ph.drawn) {
        return (
          <div className="panel center">
            <h2>{p.name}</h2>
            <button className="deck-card" onClick={() => dispatch({ type: 'drawClass' })}>
              <span className="deck-back">🏫</span>
              <span>クラスを引く</span>
            </button>
          </div>
        );
      }
      const card = CLASS_MAP[p.classCardId!];
      return (
        <div className="panel center">
          <div className="class-card flip-in" style={{ borderColor: card.color }} title={card.desc}>
            <span className="class-icon">{card.icon}</span>
            <div>
              <h2 className="class-nick">{card.nick}</h2>
              <div className="class-roles">
                {card.roles.map((r, i) => (
                  <span key={i} className="pill" title={roleDesc(r)}>
                    {ROLES[r].icon}
                    {ROLES[r].name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={() => dispatch({ type: 'continue' })}>
              次へ
            </button>
          </div>
        </div>
      );
    }
    case 'memberDraw': {
      const p = state.players[ph.player];
      const last = ph.last;
      return (
        <div className="panel">
          <div className="panel-head">
            <h2>
              {p.name}の番 — 初期メンバー {p.students.length}/{STARTING_MEMBERS}
            </h2>
            <button className="btn small ghost" onClick={() => dispatch({ type: 'drawAllMembers' })} title="自分の残りをまとめて引く">
              まとめて引く
            </button>
          </div>
          <div className="member-draw">
            <button className="deck-card" onClick={() => dispatch({ type: 'drawMember' })}>
              <span className="deck-back">🎴</span>
              <span>1枚引く</span>
            </button>
            <div className="last-draws">
              {state.players.map((pl) => {
                const st = pl.students[pl.students.length - 1];
                if (!st) return null;
                return (
                  <div className={`last-draw ${last?.student.uid === st.uid ? 'latest' : ''}`} key={pl.id}>
                    <div className="last-who">
                      <span className="dot" style={{ background: pl.color }} /> {pl.name}
                    </div>
                    <div className={last?.student.uid === st.uid ? 'flip-in' : ''} key={st.uid}>
                      <StudentCard student={st} owner={pl} />
                    </div>
                  </div>
                );
              })}
            </div>
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
            year={state.year}
            termLabel={`${t}学期`}
            onConfirm={(roles) => dispatch({ type: 'setRoles', roles })}
          />
        </div>
      );
    }
    case 'draw': {
      const p = state.players[ph.player];
      const era = ERAS[currentEra(state)];
      return (
        <div className="panel center">
          <h2>{p.name}のターン</h2>
          <button className="deck-card" onClick={() => dispatch({ type: 'drawEvent' })}>
            <span className="deck-back">🃏</span>
            <span>イベントを引く</span>
          </button>
          <div className="hint">
            転校生は {era.icon}
            {era.name} から
          </div>
        </div>
      );
    }
    case 'transfer':
      return <TransferPanel state={state} dispatch={dispatch} />;
    case 'push':
      return <PushPanel state={state} dispatch={dispatch} />;
    case 'summerTravel': {
      const choices = state.yearEras;
      return (
        <div className="panel center">
          <h2>🌻 夏休み合宿 — 行き先</h2>
          <div className="era-buttons">
            {choices.map((i) => {
              const e = ERAS[i];
              return (
                <button key={e.id} className="btn era-btn" style={{ borderColor: e.color }} onClick={() => dispatch({ type: 'travel', era: i })}>
                  <span className="era-btn-icon">{e.icon}</span>
                  {e.name}
                  <small>残{state.pools[e.id].length}</small>
                </button>
              );
            })}
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
              {autoCpu ? '次へ ▶' : '次へ'}
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
      <div className="panel-head">
        <h2>
          🚪 {ph.reason}転校生{ph.picks > 1 ? `（あと${ph.picks}人）` : ''}
        </h2>
        <div className="role-actions">
          <button className="btn ghost" onClick={() => dispatch({ type: 'pickTransfer', index: null })}>
            {ph.added.length ? '終わる' : '見送る'}
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
            迎える
          </button>
        </div>
      </div>
      <div className="card-grid center">
        {ph.options.map((o, i) => {
          const pct = Math.round((evaluateTransfer(p, o).gain / base) * 1000) / 10;
          return (
            <div key={o.uid} className="option-wrap">
              <StudentCard student={o} selected={sel === i} onClick={() => setSel(i)} />
              <div className={`fit ${pct >= 4 ? 'good' : pct > 0 ? 'ok' : 'bad'}`} title="クラス総合力の変化の目安">
                {pct > 0 ? '▲' : '▼'} {pct > 0 ? '+' : ''}
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
      {full && (
        <div className="release">
          満員：帰ってもらう子
          <select value={release} onChange={(e) => setRelease(e.target.value)}>
            <option value="">選ぶ</option>
            {p.students
              .filter((s) => !roleOf(p, s.uid))
              .map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.icon} {s.name}（{s.power}）
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
}

function PushPanel({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const ph = state.phase;
  const [uid, setUid] = useState<string | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  if (ph.kind !== 'push') return null;
  const p = state.players[ph.player];
  const targets = pushTargets(state, ph.player);
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>📦 転校 — 押しつける生徒と相手を選ぶ</h2>
        <div className="role-actions">
          <button className="btn ghost" onClick={() => dispatch({ type: 'push', uid: null })}>
            やめる
          </button>
          <button
            className="btn primary"
            disabled={!uid || target === null}
            onClick={() => uid && target !== null && dispatch({ type: 'push', uid, target })}
          >
            押しつける
          </button>
        </div>
      </div>
      <div className="seg push-targets">
        {targets.map((t) => (
          <button
            key={t}
            className={`btn small ${target === t ? 'primary' : 'ghost'}`}
            style={{ borderColor: state.players[t].color }}
            onClick={() => setTarget(t)}
          >
            → {state.players[t].name}
          </button>
        ))}
      </div>
      <Classroom player={p} year={state.year} onSeatClick={setUid} selectedUid={uid} />
    </div>
  );
}
