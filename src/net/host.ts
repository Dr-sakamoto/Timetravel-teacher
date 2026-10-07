import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { backoff, makePeer } from './peer';
import { cpuAction } from '../game/ai';
import { calendarLabel, newGame, step } from '../game/engine';
import { SAVE_VERSION } from '../game/saveVersion';
import type { Action, GameState } from '../game/types';
import { canAct, waitingOn, MAX_SEATS, PEER_PREFIX, TIMEOUT_MS, type Lobby, type Seat, type ToGuest, type ToHost } from './protocol';

const SAVE_KEY = 'jikuu-saikyou-host-v1';

export interface HostSnap {
  status: 'opening' | 'open' | 'error';
  error?: string;
  code: string;
  lobby: Lobby;
  /** ゲーム中（null ならロビー） */
  state: GameState | null;
  seq: number;
}

interface HostSave {
  code: string;
  lobby: Lobby;
  state: GameState;
  seq: number;
  /** 前の版で、つながらなくなってCPUに任せていた席（読み込んだら本人に返す） */
  auto?: number[];
}

export function loadHostSave(): HostSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as HostSave;
    return s.state?.version === SAVE_VERSION && s.state.phase.kind !== 'gameOver' ? s : null;
  } catch {
    return null;
  }
}

export function clearHostSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 何もしない */
  }
}

/** 部屋を作った人の端末：ゲームを進める本体。参加した人の操作を受け取り、新しい状態を全員に配る */
export class HostRoom {
  private peer: Peer | null = null;
  private conns = new Map<string, DataConnection>();
  private lastSeen = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  /** 通信サーバーへのつなぎ直しを予約しているか */
  private retrying: ReturnType<typeof setTimeout> | null = null;
  private serverTries = 0;
  snap: HostSnap;

  constructor(
    code: string,
    hostName: string,
    private onChange: (s: HostSnap) => void,
    resume?: HostSave,
  ) {
    this.snap = resume
      ? { status: 'opening', code: resume.code, lobby: resume.lobby, state: resume.state, seq: resume.seq }
      : { status: 'opening', code, lobby: { seats: [{ name: hostName, kind: 'host', online: true }], years: 1 }, state: null, seq: 0 };
    // 前の版でCPUに任せていた席は本人に返す（CPUが勝手に手番を進めないように）
    if (resume?.auto?.length && this.snap.state) {
      const auto = resume.auto;
      this.snap.state = { ...this.snap.state, players: this.snap.state.players.map((p, j) => (auto.includes(j) ? { ...p, isCpu: false } : p)) };
    }
    this.open(0);
    this.timer = setInterval(() => this.checkAlive(), 2000);
    document.addEventListener('visibilitychange', this.onWake);
    window.addEventListener('online', this.onWake);
  }

  /** スマホが画面に戻った時・電波が戻った時は、すぐ通信サーバーとのつながりを確かめる */
  private onWake = () => {
    if (document.visibilityState === 'visible') this.checkServer(true);
  };

  private open(tries: number) {
    if (this.closed) return;
    this.peer?.destroy();
    const peer = makePeer(PEER_PREFIX + this.snap.code);
    this.peer = peer;
    peer.on('open', () => {
      this.serverTries = 0;
      this.set({ status: 'open', error: undefined });
    });
    peer.on('connection', (c) => this.accept(c));
    // 通信が切れたら（スマホがスリープした時など）つなぎ直す
    peer.on('disconnected', () => {
      if (peer === this.peer) this.retryServer();
    });
    peer.on('error', (e) => {
      if (peer !== this.peer) return;
      const type = (e as { type?: string }).type;
      if (type === 'unavailable-id') {
        // 読み込み直した直後は、前のIDがまだ残っていることがある（サーバーが前の接続を忘れるまで待つ）
        this.peer = null;
        if (this.retrying) clearTimeout(this.retrying);
        this.retrying = null;
        peer.destroy();
        if (tries < 12) setTimeout(() => this.open(tries + 1), 2500);
        else this.set({ status: 'error', error: 'この部屋番号は使われています。ルームを作り直してください' });
        return;
      }
      if (type === 'browser-incompatible') {
        this.set({ status: 'error', error: 'このブラウザは通信対戦に対応していません' });
        return;
      }
      if (type === 'peer-unavailable' || type === 'webrtc') return;
      // 通信サーバーにつながらない：あきらめずにつなぎ直す
      if (this.snap.status === 'open') this.set({ status: 'opening' });
      this.retryServer();
    });
  }

  /** 通信サーバーへのつなぎ直しを予約する（同じIDのまま。だめならIDを取り直す） */
  private retryServer() {
    if (this.closed || this.retrying) return;
    const wait = backoff(this.serverTries++);
    if (this.serverTries >= 5 && !this.snap.state && this.snap.status !== 'error')
      this.set({ status: 'opening', error: '通信サーバーにつながりにくくなっています。つなぎ直しています…' });
    this.retrying = setTimeout(() => {
      this.retrying = null;
      const peer = this.peer;
      if (this.closed || !peer) return;
      if (peer.open) return;
      if (peer.destroyed) this.open(0);
      else if (peer.disconnected) peer.reconnect();
    }, wait);
  }

  /** 通信サーバーから切れたままになっていないか（切れていたらつなぎ直す） */
  private checkServer(now = false) {
    const peer = this.peer;
    if (this.closed || !peer || peer.open || this.retrying) return;
    if (!peer.destroyed && !peer.disconnected) return; // 最初の接続中
    if (now) this.serverTries = 0;
    this.retryServer();
  }

  private set(p: Partial<HostSnap>) {
    this.snap = { ...this.snap, ...p };
    if (this.snap.state) this.save();
    this.onChange(this.snap);
  }

  private save() {
    const s = this.snap.state;
    if (!s) return;
    try {
      if (s.phase.kind === 'gameOver') localStorage.removeItem(SAVE_KEY);
      else
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({ code: this.snap.code, lobby: this.snap.lobby, state: s, seq: this.snap.seq } satisfies HostSave),
        );
    } catch {
      /* 保存できない環境では何もしない */
    }
  }

  private accept(c: DataConnection) {
    let cid: string | null = null;
    c.on('data', (raw) => {
      const m = raw as ToHost;
      if (m.t === 'hello') {
        cid = m.cid;
        const old = this.conns.get(cid);
        if (old && old !== c) old.close();
        this.conns.set(cid, c);
        this.lastSeen.set(cid, Date.now());
        this.hello(c, cid, m.name);
        return;
      }
      if (!cid) return;
      this.lastSeen.set(cid, Date.now());
      this.message(cid, m);
    });
    c.on('close', () => {
      if (cid && this.conns.get(cid) === c) {
        this.conns.delete(cid);
        this.checkAlive();
      }
    });
  }

  private seatOf(cid: string): number {
    return this.snap.lobby.seats.findIndex((s) => s.kind === 'guest' && s.cid === cid);
  }

  private hello(c: DataConnection, cid: string, name: string) {
    const seats = this.snap.lobby.seats;
    let i = this.seatOf(cid);
    if (i < 0) {
      if (this.snap.state) return this.sendTo(c, { t: 'reject', reason: 'このルームのゲームはもう始まっています' });
      if (seats.length >= MAX_SEATS) return this.sendTo(c, { t: 'reject', reason: '満員です（5人まで）' });
      i = seats.length;
      this.setSeats([...seats, { name: cleanName(name, i), kind: 'guest', cid, online: true }]);
    } else {
      this.setSeats(seats.map((s, j) => (j === i ? { ...s, online: true, name: this.snap.state ? s.name : cleanName(name, j) } : s)));
    }
    this.broadcast();
  }

  private message(cid: string, m: ToHost) {
    const i = this.seatOf(cid);
    if (i < 0) return;
    const c = this.conns.get(cid);
    switch (m.t) {
      case 'rename':
        if (!this.snap.state) {
          this.setSeats(this.snap.lobby.seats.map((s, j) => (j === i ? { ...s, name: cleanName(m.name, j) } : s)));
          this.broadcast();
        }
        return;
      case 'ping':
        if (c) this.sendTo(c, { t: 'pong', seq: this.snap.seq });
        if (c && this.snap.state && m.seq !== this.snap.seq) this.sendState(c, i);
        return;
      case 'sync':
        if (c) this.sendOne(c, i);
        return;
      case 'action': {
        const s = this.snap.state;
        if (!s || m.seq !== this.snap.seq || !canAct(s, i, m.action)) {
          if (c) this.sendOne(c, i);
          return;
        }
        this.commit(step(s, m.action));
        return;
      }
    }
  }

  /** つながっているかどうかを見直す（変わっていたら全員に知らせる） */
  private checkAlive() {
    this.checkServer();
    const now = Date.now();
    let changed = false;
    const seats = this.snap.lobby.seats.map((s) => {
      if (s.kind !== 'guest' || !s.cid) return s;
      const c = this.conns.get(s.cid);
      const online = !!c && c.open && now - (this.lastSeen.get(s.cid) ?? 0) < TIMEOUT_MS;
      if (online === s.online) return s;
      changed = true;
      return { ...s, online };
    });
    if (changed) {
      this.setSeats(seats);
      this.broadcast();
    }
  }

  private setSeats(seats: Seat[]) {
    this.set({ lobby: { ...this.snap.lobby, seats } });
  }

  private commit(next: GameState) {
    if (next === this.snap.state) return;
    this.set({ state: next, seq: this.snap.seq + 1 });
    this.broadcast();
  }

  private sendTo(c: DataConnection, m: ToGuest) {
    if (!c.open) return;
    try {
      c.send(m);
    } catch {
      /* 切れかけの接続には送れないことがある */
    }
  }

  private sendState(c: DataConnection, you: number) {
    if (this.snap.state) this.sendTo(c, { t: 'state', seq: this.snap.seq, state: this.snap.state, you, seats: this.snap.lobby.seats });
  }

  private sendOne(c: DataConnection, you: number) {
    if (this.snap.state) this.sendState(c, you);
    else this.sendTo(c, { t: 'lobby', lobby: this.snap.lobby, you });
  }

  private broadcast() {
    this.snap.lobby.seats.forEach((s, i) => {
      const c = s.cid ? this.conns.get(s.cid) : undefined;
      if (c) this.sendOne(c, i);
    });
  }

  // ---------- 部屋を作った人の画面から ----------

  addCpu() {
    const seats = this.snap.lobby.seats;
    if (this.snap.state || seats.length >= MAX_SEATS) return;
    this.setSeats([...seats, { name: `CPU${seats.filter((s) => s.kind === 'cpu').length + 1}`, kind: 'cpu', online: true }]);
    this.broadcast();
  }

  removeSeat(i: number) {
    const seats = this.snap.lobby.seats;
    if (this.snap.state || i === 0 || !seats[i]) return;
    const cid = seats[i].cid;
    if (cid) {
      const c = this.conns.get(cid);
      if (c) this.sendTo(c, { t: 'reject', reason: 'ルームから外されました' });
      this.conns.delete(cid);
    }
    this.setSeats(seats.filter((_, j) => j !== i));
    this.broadcast();
  }

  renameSeat(i: number, name: string) {
    if (this.snap.state) return;
    this.setSeats(this.snap.lobby.seats.map((s, j) => (j === i ? { ...s, name } : s)));
    this.broadcast();
  }

  setYears(years: number) {
    if (this.snap.state) return;
    this.set({ lobby: { ...this.snap.lobby, years } });
    this.broadcast();
  }

  startGame() {
    if (this.snap.state) return;
    const { seats, years } = this.snap.lobby;
    const players = seats.map((s, i) => ({ name: cleanName(s.name, i), isCpu: s.kind === 'cpu' }));
    this.setSeats(seats.map((s, i) => ({ ...s, name: players[i].name })));
    this.commit(newGame(players, years));
  }

  /** 部屋を作った人の操作・CPUの操作（seq は画面に出ていた状態の番号。古い画面からの操作は捨てる） */
  apply(a: Action, seq: number) {
    const s = this.snap.state;
    if (!s || seq !== this.snap.seq) return;
    this.commit(step(s, a));
  }

  /**
   * 通信が切れた人の操作を待って止まっているときだけ、その1手だけをCPUの判断で進める。
   * 席をCPUに渡しはしないので、この先の手番を勝手に進めることはない
   */
  stepFor(i: number) {
    const s = this.snap.state;
    const seat = this.snap.lobby.seats[i];
    if (!s || seat?.kind !== 'guest' || seat.online || waitingOn(s) !== i) return;
    const a = cpuAction(s);
    if (!a) return;
    const next = step(s, a);
    if (next === s) return;
    next.log.push({ id: next.logCounter++, when: calendarLabel(next), text: `📵${s.players[i].name}の通信が切れていたので、1手だけ代わりに進めた。`, player: i });
    this.commit(next);
  }

  close() {
    this.closed = true;
    for (const c of this.conns.values()) this.sendTo(c, { t: 'closed' });
    if (this.timer) clearInterval(this.timer);
    if (this.retrying) clearTimeout(this.retrying);
    document.removeEventListener('visibilitychange', this.onWake);
    window.removeEventListener('online', this.onWake);
    // 「閉じました」が届くのを少し待ってから切る
    const peer = this.peer;
    setTimeout(() => peer?.destroy(), 300);
  }
}

function cleanName(n: string, i: number): string {
  return n.trim().slice(0, 12) || `先生${i + 1}`;
}
