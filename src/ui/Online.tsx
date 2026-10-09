import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAYER_COLORS } from '../game/engine';
import type { Action, GameState } from '../game/types';
import { GuestRoom, type GuestSnap } from '../net/guest';
import { clearHostSave, HostRoom, loadHostSave, type HostSnap } from '../net/host';
import { joinUrl, loadName, maxSeats, newRoomCode, normalizeCode, saveName, seatRoom, teamReady, type Lobby } from '../net/protocol';
import { GameView } from './GameView';

type Mode = { kind: 'menu' } | { kind: 'host'; resume: boolean } | { kind: 'guest'; code: string };

/** 通信対戦：部屋を作る／部屋に入る */
export function Online({ initialCode, onExit, onRules }: { initialCode: string; onExit: () => void; onRules: () => void }) {
  const [name, setName] = useState(() => loadName());
  const [code, setCode] = useState(initialCode);
  const [mode, setMode] = useState<Mode>(() => (initialCode.length === 5 && loadName() ? { kind: 'guest', code: initialCode } : { kind: 'menu' }));
  const saved = loadHostSave();
  const exit = () => {
    // 参加用リンクで開いていたら、URLから部屋番号を消す
    if (location.search) history.replaceState(null, '', location.pathname);
    onExit();
  };
  const fixName = () => {
    const n = name.trim().slice(0, 12);
    saveName(n);
    return n;
  };

  if (mode.kind === 'host') return <HostScreen name={fixName()} resume={mode.resume} onExit={exit} onRules={onRules} />;
  if (mode.kind === 'guest') return <GuestScreen code={mode.code} name={fixName()} onExit={exit} onRules={onRules} />;

  const okName = name.trim().length > 0;
  return (
    <div className="setup online">
      <h1>📱 通信対戦</h1>
      <p className="online-lead">1人がルームを作ると5桁の部屋番号が出ます。ほかの人はその部屋番号を入れて入ります（2〜5人。足りない席はCPU。チーム戦なら8〜10人）。</p>
      <section>
        <h3>あなたの名前</h3>
        <div className="player-row">
          <input value={name} maxLength={12} placeholder="例：赤井先生" onChange={(e) => setName(e.target.value)} />
        </div>
        {!okName && <p className="online-warn">先に名前を入れてください</p>}
      </section>
      <div className="room-choice">
        <section>
          <h3>🏠 ルームを作る</h3>
          <p className="online-lead">部屋番号が出るので、みんなに伝えてください。作った人のスマホがゲームを進めるので、開いたままにしておいてください。</p>
          <button className="btn primary big" disabled={!okName} onClick={() => setMode({ kind: 'host', resume: false })}>
            ルームを作る
          </button>
          {saved && (
            <button className="btn small" onClick={() => setMode({ kind: 'host', resume: true })}>
              前のルームを再開（{saved.code}）
            </button>
          )}
        </section>
        <section>
          <h3>🔢 部屋番号で入る</h3>
          <input
            className="code-input"
            value={code}
            inputMode="numeric"
            placeholder="5桁の部屋番号"
            onChange={(e) => setCode(normalizeCode(e.target.value))}
          />
          <button className="btn primary big" disabled={!okName || code.length !== 5} onClick={() => setMode({ kind: 'guest', code })}>
            ルームに入る
          </button>
        </section>
      </div>
      <div className="actions">
        <button className="btn ghost" onClick={exit}>
          戻る
        </button>
      </div>
    </div>
  );
}

/** チーム戦の席の見出し（部屋A・Bとチーム番号） */
function teamLabel(i: number): string {
  const { room, idx } = seatRoom(i);
  return `チーム${idx + 1}・部屋${room ? 'B' : 'A'}`;
}

function SeatList({ lobby, you, onRemove }: { lobby: Lobby; you: number; onRemove?: (i: number) => void }) {
  const seats = lobby.seats;
  const color = (i: number) => PLAYER_COLORS[lobby.team ? seatRoom(i).idx : i];
  return (
    <div className="seat-list">
      {seats.map((s, i) => (
        <div key={i} className="player-row">
          <span className="dot big" style={{ background: color(i) }} />
          <span className="seat-name">
            {lobby.team && <small>{teamLabel(i)} </small>}
            {s.name}
            {i === you && <small>（あなた）</small>}
          </span>
          <span className="seat-kind">
            {s.kind === 'cpu' ? '🤖 CPU' : s.kind === 'host' ? '👑 ホスト' : s.online ? '📱 参加中' : '📵 通信切れ'}
          </span>
          {onRemove && i !== 0 && (
            <button className="btn small ghost" onClick={() => onRemove(i)} aria-label="外す">
              ✕
            </button>
          )}
        </div>
      ))}
      {Array.from({ length: maxSeats(lobby) - seats.length }, (_, i) => (
        <div key={`e${i}`} className="player-row empty">
          <span className="dot big" />
          <span className="seat-name">
            {lobby.team && <small>{teamLabel(seats.length + i)} </small>}
            （空き）
          </span>
        </div>
      ))}
    </div>
  );
}

/** チーム戦：自分のチームメイト（もう一方の部屋）とチームの合計点 */
function TeamBadge({ state, me }: { state: GameState; me: number }) {
  const mate = state.team?.mates[me];
  if (!state.team || !mate) return null;
  const mine = state.players[me]?.points ?? 0;
  return (
    <span className="net-code" title="チーム戦：学年末テストと卒業式は、もう一方の部屋のチームメイトと合同">
      🤝 部屋{state.team.room ? 'B' : 'A'}・チームメイト {mate.name}（{mate.points}点）・合計 {mine + mate.points}点
    </span>
  );
}

function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = joinUrl(code);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '時空最強クラス決定戦', text: `部屋番号 ${code} で一緒に遊ぼう！`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 共有をやめた時など */
    }
  };
  return (
    <div className="room-code">
      <span className="room-code-label">部屋番号</span>
      <b className="room-code-num">{code}</b>
      <button className="btn small" onClick={share}>
        {copied ? 'コピーしました' : '🔗 招待リンクを送る'}
      </button>
    </div>
  );
}

function HostScreen({ name, resume, onExit, onRules }: { name: string; resume: boolean; onExit: () => void; onRules: () => void }) {
  const room = useRef<HostRoom | null>(null);
  const [snap, setSnap] = useState<HostSnap | null>(null);

  useEffect(() => {
    const save = resume ? loadHostSave() : null;
    if (!resume) clearHostSave();
    const r = new HostRoom(newRoomCode(), name, setSnap, save ?? undefined);
    room.current = r;
    setSnap(r.snap);
    return () => r.close();
  }, [name, resume]);

  const seq = snap?.seq ?? 0;
  const dispatch = useCallback((a: Action) => room.current?.apply(a, seq), [seq]);

  if (!snap) return null;
  const quit = () => {
    if (snap.state && snap.state.phase.kind !== 'gameOver' && !confirm('ルームを閉じますか？（あとで「前のルームを再開」で続きから遊べます）')) return;
    onExit();
  };

  if (snap.state) {
    const seats = snap.lobby.seats;
    const lost = seats.map((s, i) => ({ s, i })).filter(({ s }) => s.kind === 'guest' && !s.online);
    // 通信が切れた人の操作を待って止まっているときだけ、1手だけ代わりに進められる
    const stuck = (i: number) => !!room.current?.waitsForSeat(i);
    return (
      <GameView
        state={snap.state}
        dispatch={dispatch}
        onQuit={quit}
        onRules={onRules}
        me={0}
        driver
        offline={(i) => {
          // チーム戦では、部屋Aの席 i はロビーの席 2i
          const s = seats[snap.rooms ? i * 2 : i];
          return s?.kind === 'guest' && !s.online;
        }}
        banner={
          <div className="net-banner">
            <span className="net-code">🏠{snap.code}</span>
            <TeamBadge state={snap.state} me={0} />
            {snap.status !== 'open' && <span className="net-warn">{snap.error ?? '通信サーバーにつないでいます…'}</span>}
            {lost.map(({ s, i }) => (
              <span key={i} className="net-warn">
                📵{s.name}
                {stuck(i) && (
                  <button
                    className="btn small ghost"
                    onClick={() => confirm(`${s.name}さんの通信が切れています。${s.name}さんの代わりに、今の1手だけCPUが進めますか？（つなぎ直すのを待つなら「キャンセル」）`) && room.current?.stepFor(i)}
                  >
                    1手だけ代わりに進める
                  </button>
                )}
              </span>
            ))}
          </div>
        }
      />
    );
  }

  const seats = snap.lobby.seats;
  const max = maxSeats(snap.lobby);
  const team = !!snap.lobby.team;
  const canStart = (team ? teamReady(seats.length) : seats.length >= 2) && !seats.some((s) => s.kind === 'guest' && !s.online);
  return (
    <div className="setup online">
      <h1>🏠 ルームを作りました</h1>
      {snap.status === 'error' ? (
        <p className="online-warn">{snap.error}</p>
      ) : snap.status === 'opening' ? (
        <p className="online-lead">{snap.error ?? '通信サーバーにつないでいます…'}</p>
      ) : (
        <>
          <ShareCode code={snap.code} />
          <p className="online-lead">みんなに部屋番号を伝えてください。参加する人は「📱 通信対戦」→「🔢 部屋番号で入る」で入れます（招待リンクを送ってもOK）。</p>
        </>
      )}
      <section>
        <h3>
          プレイヤー（{seats.length}/{max}）
        </h3>
        <SeatList lobby={snap.lobby} you={0} onRemove={(i) => room.current?.removeSeat(i)} />
        <div className="seg">
          <button className="btn small ghost" disabled={seats.length >= max} onClick={() => room.current?.addCpu()}>
            🤖 CPUを足す
          </button>
        </div>
      </section>
      <section>
        <h3>対戦のしかた</h3>
        <div className="seg">
          <button className={`btn ${!team ? 'primary' : 'ghost'}`} onClick={() => room.current?.setTeam(false)}>
            ふつう（2〜5人）
          </button>
          <button className={`btn ${team ? 'primary' : 'ghost'}`} onClick={() => room.current?.setTeam(true)}>
            🤝 チーム戦（8〜10人）
          </button>
        </div>
        {team && (
          <p className="online-lead">
            2つの部屋（A・B）に分かれて別々に進めます。部屋ごとに時代の並びが違います。同じ番号のチームの2クラスは、学年末テストと卒業式だけ合同で受け、合わせた値で順位を競います。最後はチームの2クラスの合計点で勝負。
          </p>
        )}
      </section>
      <section>
        <h3>期間</h3>
        <div className="seg">
          {[
            [1, '1年（短め）'],
            [2, '2年'],
            [3, '3年（じっくり）'],
          ].map(([y, l]) => (
            <button key={y} className={`btn ${snap.lobby.years === y ? 'primary' : 'ghost'}`} onClick={() => room.current?.setYears(y as number)}>
              {l}
            </button>
          ))}
        </div>
      </section>
      <div className="actions">
        <button className="btn ghost" onClick={onExit}>
          ルームを閉じる
        </button>
        <button className="btn primary big" disabled={!canStart} onClick={() => room.current?.startGame()}>
          ゲーム開始！
        </button>
      </div>
      {!team && seats.length < 2 && <p className="online-lead">2人以上（CPU可）で始められます</p>}
      {team && !teamReady(seats.length) && <p className="online-lead">チーム戦は、2つの部屋が同じ人数になるよう偶数（4〜10人。CPU可）で始められます</p>}
    </div>
  );
}

function GuestScreen({ code, name, onExit, onRules }: { code: string; name: string; onExit: () => void; onRules: () => void }) {
  const room = useRef<GuestRoom | null>(null);
  const [snap, setSnap] = useState<GuestSnap | null>(null);

  useEffect(() => {
    // 読み込み直しても同じ部屋に戻れるよう、部屋番号をURLに残す
    history.replaceState(null, '', `${location.pathname}?room=${code}`);
    const r = new GuestRoom(code, name, setSnap);
    room.current = r;
    setSnap(r.snap);
    return () => r.leave();
  }, [code, name]);

  const dispatch = useCallback((a: Action) => room.current?.act(a), []);

  if (!snap) return null;
  const quit = () => {
    if (snap.state && snap.state.phase.kind !== 'gameOver' && snap.status === 'joined' && !confirm('ルームから抜けますか？（同じ部屋番号でまた入れば戻れます）')) return;
    onExit();
  };

  if (snap.status === 'rejected' || snap.status === 'closed' || (snap.status === 'notFound' && !snap.state)) {
    return (
      <div className="setup online">
        <h1>📱 通信対戦</h1>
        <p className="online-warn">
          {snap.status === 'closed'
            ? 'ルームが閉じられました'
            : snap.status === 'notFound'
              ? `部屋番号 ${code} のルームが見つかりません。番号を確かめてください（探し続けています…）`
              : snap.reason}
        </p>
        <div className="actions">
          <button className="btn ghost" onClick={onExit}>
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (snap.state && snap.you >= 0) {
    const seats = snap.seats;
    return (
      <GameView
        state={snap.state}
        dispatch={dispatch}
        onQuit={quit}
        onRules={onRules}
        me={snap.you}
        driver={false}
        offline={(i) => seats[i]?.kind === 'guest' && !seats[i].online}
        banner={
          <div className="net-banner">
            <span className="net-code">🏠{code}</span>
            <TeamBadge state={snap.state} me={snap.you} />
            {snap.status !== 'joined' && <span className="net-warn">📵 通信が切れました。つなぎ直しています…</span>}
          </div>
        }
      />
    );
  }

  return (
    <div className="setup online">
      <h1>🏠 ルーム {code}</h1>
      {snap.lobby ? (
        <>
          <p className="online-lead">ルームを作った人がゲームを始めるのを待っています…（期間：{snap.lobby.years}年）</p>
          <section>
            <h3>プレイヤー</h3>
            <SeatList lobby={snap.lobby} you={snap.you} />
          </section>
        </>
      ) : (
        <p className="online-lead">
          {snap.status === 'reconnecting'
            ? 'つなぎ直しています…'
            : snap.stage === 'server'
              ? '通信サーバーにつないでいます…'
              : `ルーム ${code} に入っています…`}
        </p>
      )}
      <div className="actions">
        <button className="btn ghost" onClick={onExit}>
          抜ける
        </button>
      </div>
    </div>
  );
}
