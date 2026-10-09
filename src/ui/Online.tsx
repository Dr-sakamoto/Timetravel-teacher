import { useCallback, useEffect, useRef, useState } from 'react';
import { PLAYER_COLORS } from '../game/engine';
import type { Action, GameState } from '../game/types';
import { GuestRoom, type GuestSnap } from '../net/guest';
import { clearHostSave, HostRoom, loadHostSave, type HostSnap } from '../net/host';
import { joinUrl, loadName, maxSeats, newRoomCode, normalizeCode, pairClasses, pairHasRoom, pairOffline, pairOwners, saveName, seatRoom, teamReady, PAIR_SIZE, type Cursor, type Lobby, type Seat } from '../net/protocol';
import { GameView } from './GameView';
import { cursorMarks, ProposalBar } from './Proposals';

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
      <p className="online-lead">1人がルームを作ると5桁の部屋番号が出ます。ほかの人はその部屋番号を入れて入ります（2〜5人。足りない席はCPU。チーム戦・ペア担任なら最大10人）。</p>
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

function SeatList({
  lobby,
  you,
  onRemove,
  onPick,
  onMove,
}: {
  lobby: Lobby;
  you: number;
  onRemove?: (i: number) => void;
  /** ペア担任：自分が入るクラスを選ぶ */
  onPick?: (cls: number) => void;
  /** ペア担任：部屋を作った人が、席 i の人をクラスに移す */
  onMove?: (i: number, cls: number) => void;
}) {
  const seats = lobby.seats;
  const color = (i: number) => PLAYER_COLORS[lobby.team ? seatRoom(i).idx : i];
  const row = (s: Seat, i: number, dot: string | undefined) => (
    <div key={i} className="player-row">
      <span className="dot big" style={{ background: dot }} />
      <span className="seat-name">
        {lobby.team && <small>{teamLabel(i)} </small>}
        {s.name}
        {i === you && <small>（あなた）</small>}
      </span>
      <span className="seat-kind">
        {s.kind === 'cpu' ? '🤖 CPU' : s.kind === 'host' ? '👑 ホスト' : s.online ? '📱 参加中' : '📵 通信切れ'}
      </span>
      {onMove && s.kind !== 'cpu' && (
        <select className="pair-move" value={s.cls ?? 0} aria-label="クラスを移す" onChange={(e) => onMove(i, Number(e.target.value))}>
          {pairClasses(seats).map((_, k) => (
            <option key={k} value={k} disabled={k !== s.cls && !pairHasRoom(seats, k)}>
              {k + 1}組
            </option>
          ))}
        </select>
      )}
      {onRemove && i !== 0 && (
        <button className="btn small ghost" onClick={() => onRemove(i)} aria-label="外す">
          ✕
        </button>
      )}
    </div>
  );
  if (lobby.pair) {
    // ペア担任：クラスごとに、受け持つ人（2人まで）を並べる
    const owner = pairOwners(seats);
    return (
      <div className="seat-list">
        {pairClasses(seats).map((members, k) => {
          const cpu = members.some((i) => seats[i].kind === 'cpu');
          const dot = members.length ? PLAYER_COLORS[owner[members[0]]] : undefined;
          return (
            <div key={k} className="pair-class">
              <div className="pair-head">
                <b>{k + 1}組</b>
                <small>{cpu ? 'CPU' : members.length === PAIR_SIZE ? 'ペア担任' : members.length ? '相方を募集中' : '空き'}</small>
                {onPick && seats[you]?.cls !== k && pairHasRoom(seats, k) && (
                  <button className="btn small" onClick={() => onPick(k)}>
                    ここに入る
                  </button>
                )}
              </div>
              {members.map((i) => row(seats[i], i, dot))}
              {!cpu &&
                Array.from({ length: PAIR_SIZE - members.length }, (_, e) => (
                  <div key={`e${e}`} className="player-row empty">
                    <span className="dot big" />
                    <span className="seat-name">（空き）</span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="seat-list">
      {seats.map((s, i) => row(s, i, color(i)))}
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

/** チーム戦の3学期：合体したクラス i（部屋Aの席 2i と部屋Bの席 2i+1）の人がみんな通信切れか */
function jointOffline(seats: Seat[], i: number): boolean {
  const humans = [seats[i * 2], seats[i * 2 + 1]].filter((s) => s && s.kind !== 'cpu');
  return humans.length > 0 && humans.every((s) => s.kind === 'guest' && !s.online);
}

/** ペア担任：同じクラスを受け持つ相方 */
function PairBadge({ seats, you }: { seats: Seat[]; you: number }) {
  const owner = pairOwners(seats);
  const mates = seats.filter((_, i) => owner[i] === you).map((s) => s.name);
  if (mates.length < 2) return null;
  return (
    <span className="net-code" title="ペア担任：2人で1つのクラスを受け持つ。どちらが操作してもいい">
      👫 {mates.join('・')}
    </span>
  );
}

/** チーム戦：自分の部屋が合同イベントで待っている間、もう一方の部屋を観戦するかの切り替え */
function WatchToggle({ own, other, watching, onToggle }: { own: GameState; other?: GameState; watching: boolean; onToggle: () => void }) {
  if (own.phase.kind !== 'teamWait' || !other?.team) return null;
  const name = `部屋${other.team.room ? 'B' : 'A'}`;
  return (
    <button className="btn small" onClick={onToggle}>
      {watching ? '🏠 自分の部屋に戻る' : `👀 ${name}を観戦する`}
    </button>
  );
}

/** 観戦中の見出し */
function WatchLabel({ own, other }: { own: GameState; other: GameState }) {
  const ev = own.phase.kind === 'teamWait' && own.phase.event === 'split' ? 'もとの部屋に戻るの' : '3学期の合体';
  return (
    <span className="net-warn">
      👀 部屋{other.team?.room ? 'B' : 'A'}を観戦中（{ev}待ち）
    </span>
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
  const [watching, setWatching] = useState(true);
  const [myCur, setMyCur] = useState<Cursor | null>(null);
  const onCursor = useCallback((c: Cursor) => {
    setMyCur(c);
    room.current?.setCursor(0, c);
  }, []);

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
    const me = room.current?.myPlayer() ?? 0;
    const other = snap.rooms?.[1];
    const toggle = <WatchToggle own={snap.state} other={other} watching={watching} onToggle={() => setWatching((w) => !w)} />;
    // チーム戦：部屋Aが合同イベントで待っている間は、部屋Bを観戦できる
    if (other && watching && snap.state.phase.kind === 'teamWait') {
      return (
        <GameView
          key="watch"
          state={other}
          dispatch={() => {}}
          onQuit={quit}
          onRules={onRules}
          spectate
          driver={false}
          banner={
            <div className="net-banner">
              <span className="net-code">🏠{snap.code}</span>
              <WatchLabel own={snap.state} other={other} />
              {toggle}
            </div>
          }
        />
      );
    }
    return (
      <GameView
        key="own"
        state={snap.state}
        dispatch={dispatch}
        onQuit={quit}
        onRules={onRules}
        me={me}
        driver
        cursorMarks={snap.joint ? cursorMarks(seats, 0, snap.props, snap.cursors) : undefined}
        onCursor={snap.joint ? onCursor : undefined}
        offline={(i) => {
          if (snap.lobby.pair) return pairOffline(seats, pairOwners(seats), i);
          // 合体した卓：クラス i は部屋Aの席 2i と部屋Bの席 2i+1 の2人
          if (snap.joint) return jointOffline(seats, i);
          // チーム戦では、部屋Aの席 i はロビーの席 2i
          const s = seats[snap.rooms ? i * 2 : i];
          return s?.kind === 'guest' && !s.online;
        }}
        banner={
          <div className="net-banner">
            <span className="net-code">🏠{snap.code}</span>
            <TeamBadge state={snap.state} me={0} />
            {snap.lobby.pair && <PairBadge seats={seats} you={me} />}
            {snap.joint && (
              <ProposalBar state={snap.joint} seats={seats} mySeat={0} props={snap.props ?? []} cursor={myCur} onConfirm={dispatch} onWithdraw={() => room.current?.withdraw(0)} />
            )}
            {toggle}
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
  const pair = !!snap.lobby.pair;
  const classes = pairClasses(seats).filter((c) => c.length).length;
  const enough = team ? teamReady(seats.length) : pair ? classes >= 2 : seats.length >= 2;
  const canStart = enough && !seats.some((s) => s.kind === 'guest' && !s.online);
  const move = (i: number, cls: number) => room.current?.pickClass(i, cls);
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
        <SeatList
          lobby={snap.lobby}
          you={0}
          onRemove={(i) => room.current?.removeSeat(i)}
          onPick={pair ? (cls) => move(0, cls) : undefined}
          onMove={pair ? move : undefined}
        />
        <div className="seg">
          <button className="btn small ghost" disabled={seats.length >= max || (pair && classes >= pairClasses(seats).length)} onClick={() => room.current?.addCpu()}>
            🤖 CPUを足す
          </button>
        </div>
      </section>
      <section>
        <h3>対戦のしかた</h3>
        <div className="seg">
          <button className={`btn ${!team && !pair ? 'primary' : 'ghost'}`} onClick={() => room.current?.setStyle('normal')}>
            ふつう（2〜5人）
          </button>
          <button className={`btn ${pair ? 'primary' : 'ghost'}`} onClick={() => room.current?.setStyle('pair')}>
            👫 ペア担任（〜10人）
          </button>
          <button className={`btn ${team ? 'primary' : 'ghost'}`} onClick={() => room.current?.setStyle('team')}>
            🤝 チーム戦（8〜10人）
          </button>
        </div>
        {pair && (
          <p className="online-lead">
            2人で1つのクラスを受け持ちます（最大5クラス×2人）。みんな同じ卓で遊び、クラスの手番はペアのどちらが操作してもOK。入るクラスは「ここに入る」で選べます（ホストは各人の「○組」で組み替えられます）。CPUは1人で1クラスです。
          </p>
        )}
        {team && (
          <p className="online-lead">
            1・2学期は2つの部屋（A・B）に分かれ、ちがう時代を旅します。3学期は同じ時代で合流します。3学期だけは、同じ番号のチームの2クラスが合体して1つの大きなクラス（18席）になり、全員が1つの卓で遊びます。合体したクラスは2人で操作します。それぞれが選んでいるところに色つきの枠が出て、2人の確定した枠が同じものに重なったら決まります。学年末テスト・卒業式は合体したクラスどうしで勝負。次の学年があれば、もとの2つの部屋に戻ります。
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
      {!team && !pair && seats.length < 2 && <p className="online-lead">2人以上（CPU可）で始められます</p>}
      {pair && classes < 2 && <p className="online-lead">2クラス以上（CPU可）で始められます</p>}
      {team && !teamReady(seats.length) && <p className="online-lead">チーム戦は、2つの部屋が同じ人数になるよう偶数（4〜10人。CPU可）で始められます</p>}
    </div>
  );
}

function GuestScreen({ code, name, onExit, onRules }: { code: string; name: string; onExit: () => void; onRules: () => void }) {
  const room = useRef<GuestRoom | null>(null);
  const [snap, setSnap] = useState<GuestSnap | null>(null);
  const [watching, setWatching] = useState(true);
  const [myCur, setMyCur] = useState<Cursor | null>(null);
  const onCursor = useCallback((c: Cursor) => {
    setMyCur(c);
    room.current?.cursor(c);
  }, []);

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
    const owner = snap.owner;
    const toggle = <WatchToggle own={snap.state} other={snap.watch} watching={watching} onToggle={() => setWatching((w) => !w)} />;
    // チーム戦：自分の部屋が合同イベントで待っている間は、もう一方の部屋を観戦できる
    if (snap.watch && watching && snap.state.phase.kind === 'teamWait') {
      return (
        <GameView
          key="watch"
          state={snap.watch}
          dispatch={() => {}}
          onQuit={quit}
          onRules={onRules}
          spectate
          driver={false}
          banner={
            <div className="net-banner">
              <span className="net-code">🏠{code}</span>
              <WatchLabel own={snap.state} other={snap.watch} />
              {toggle}
              {snap.status !== 'joined' && <span className="net-warn">📵 通信が切れました。つなぎ直しています…</span>}
            </div>
          }
        />
      );
    }
    return (
      <GameView
        key="own"
        state={snap.state}
        dispatch={dispatch}
        onQuit={quit}
        onRules={onRules}
        me={snap.you}
        driver={false}
        cursorMarks={snap.jointSeat !== undefined ? cursorMarks(seats, snap.jointSeat, snap.props, snap.cursors) : undefined}
        onCursor={snap.jointSeat !== undefined ? onCursor : undefined}
        offline={(i) =>
          owner
            ? pairOffline(seats, owner, i)
            : snap.jointSeat !== undefined
              ? jointOffline(seats, i)
              : seats[i]?.kind === 'guest' && !seats[i].online
        }
        banner={
          <div className="net-banner">
            <span className="net-code">🏠{code}</span>
            <TeamBadge state={snap.state} me={snap.you} />
            {owner && <PairBadge seats={seats} you={snap.you} />}
            {snap.jointSeat !== undefined && (
              <ProposalBar
                state={snap.state}
                seats={seats}
                mySeat={snap.jointSeat}
                props={snap.props ?? []}
                cursor={myCur}
                onConfirm={dispatch}
                onWithdraw={() => room.current?.withdraw()}
              />
            )}
            {toggle}
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
            <SeatList lobby={snap.lobby} you={snap.you} onPick={snap.lobby.pair ? (cls) => room.current?.pick(cls) : undefined} />
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
