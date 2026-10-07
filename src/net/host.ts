import { Relay } from './relay';
import { cpuAction, rolesAction } from '../game/ai';
import { calendarLabel, newGame, step } from '../game/engine';
import { SAVE_VERSION } from '../game/saveVersion';
import type { Action, GameState } from '../game/types';
import { canAct, waitsFor, MAX_SEATS, PING_MS, TIMEOUT_MS, type Lobby, type Seat, type ToGuest, type ToHost, type ToHostEnvelope } from './protocol';

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
  private relay: Relay;
  private lastSeen = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
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
    this.relay = new Relay(
      this.snap.code,
      (event, payload) => {
        if (event !== 'h' || this.closed) return;
        const { cid, m } = payload as ToHostEnvelope;
        if (typeof cid === 'string' && m) this.receive(cid, m);
      },
      (s) => {
        if (this.closed) return;
        this.set({ status: s === 'open' ? 'open' : 'opening' });
        // つながった（つなぎ直した）ら、今の状態を全員に配り直す
        if (s === 'open') this.broadcast();
      },
    );
    this.timer = setInterval(() => this.heartbeat(), PING_MS);
    document.addEventListener('visibilitychange', this.onWake);
    window.addEventListener('online', this.onWake);
  }

  /** スマホが画面に戻った時・電波が戻った時は、すぐ中継サーバーとのつながりを確かめる */
  private onWake = () => {
    if (document.visibilityState === 'visible') this.relay.wake();
  };

  /** 生存確認：全員に「まだいるよ」を送り、参加した人がつながっているかを見直す */
  private heartbeat() {
    // 参加した人がいない時は送らない（中継サーバーのメッセージ数を抑える）
    if (this.snap.lobby.seats.some((s) => s.kind === 'guest')) this.relay.send('g', { to: '*', m: { t: 'pong', seq: this.snap.seq } });
    this.checkAlive();
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

  private receive(cid: string, m: ToHost) {
    if (m.t === 'hello') {
      this.lastSeen.set(cid, Date.now());
      this.hello(cid, m.name);
      return;
    }
    if (this.seatOf(cid) < 0) return;
    this.lastSeen.set(cid, Date.now());
    this.message(cid, m);
  }

  private seatOf(cid: string): number {
    return this.snap.lobby.seats.findIndex((s) => s.kind === 'guest' && s.cid === cid);
  }

  private hello(cid: string, name: string) {
    const seats = this.snap.lobby.seats;
    const i = this.seatOf(cid);
    if (i < 0) {
      if (this.snap.state) return this.sendTo(cid, { t: 'reject', reason: 'このルームのゲームはもう始まっています' });
      if (seats.length >= MAX_SEATS) return this.sendTo(cid, { t: 'reject', reason: '満員です（5人まで）' });
      this.setSeats([...seats, { name: cleanName(name, seats.length), kind: 'guest', cid, online: true }]);
      this.broadcast();
      return;
    }
    const seat = seats[i];
    const nextName = this.snap.state ? seat.name : cleanName(name, i);
    if (!seat.online || seat.name !== nextName) {
      this.setSeats(seats.map((s, j) => (j === i ? { ...s, online: true, name: nextName } : s)));
      this.broadcast();
    } else {
      // 名乗り直し（つなぎ直し）：その人にだけ今の状態を送る
      this.sendOne(cid, i);
    }
  }

  private message(cid: string, m: ToHost) {
    const i = this.seatOf(cid);
    if (i < 0) return;
    switch (m.t) {
      case 'rename':
        if (!this.snap.state) {
          this.setSeats(this.snap.lobby.seats.map((s, j) => (j === i ? { ...s, name: cleanName(m.name, j) } : s)));
          this.broadcast();
        }
        return;
      case 'ping':
        // 「通信切れ」になっていた人が戻ってきた
        if (!this.snap.lobby.seats[i].online) this.checkAlive();
        // 見逃した手があれば、その人にだけ送り直す
        if (this.snap.state && m.seq !== this.snap.seq) this.sendState(cid, i);
        return;
      case 'sync':
        this.sendOne(cid, i);
        return;
      case 'action': {
        const s = this.snap.state;
        // 係決めは一斉なので、ほかの人の準備OKで版が進んでいても受け付ける（canAct が二重を防ぐ）
        const simultaneous = m.action.type === 'setRoles' && s?.phase.kind === 'roles';
        if (!s || (m.seq !== this.snap.seq && !simultaneous) || !canAct(s, i, m.action)) {
          this.sendOne(cid, i);
          return;
        }
        this.commit(step(s, m.action));
        return;
      }
    }
  }

  /** つながっているかどうかを見直す（変わっていたら全員に知らせる） */
  private checkAlive() {
    const now = Date.now();
    let changed = false;
    const seats = this.snap.lobby.seats.map((s) => {
      if (s.kind !== 'guest' || !s.cid) return s;
      const online = now - (this.lastSeen.get(s.cid) ?? 0) < TIMEOUT_MS;
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

  private sendTo(to: string, m: ToGuest) {
    this.relay.send('g', { to, m });
  }

  private sendState(to: string, you: number) {
    if (this.snap.state) this.sendTo(to, { t: 'state', seq: this.snap.seq, state: this.snap.state, you, seats: this.snap.lobby.seats });
  }

  private sendOne(to: string, you: number) {
    if (this.snap.state) this.sendState(to, you);
    else this.sendTo(to, { t: 'lobby', lobby: this.snap.lobby, you });
  }

  /** 全員に1通で配る（席番号は受け取った側が端末IDから探す） */
  private broadcast() {
    if (!this.snap.lobby.seats.some((s) => s.kind === 'guest')) return;
    this.sendOne('*', -1);
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
      this.sendTo(cid, { t: 'reject', reason: 'ルームから外されました' });
      this.lastSeen.delete(cid);
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
    const simultaneous = a.type === 'setRoles' && s?.phase.kind === 'roles';
    if (!s || (seq !== this.snap.seq && !simultaneous)) return;
    this.commit(step(s, a));
  }

  /**
   * 通信が切れた人の操作を待って止まっているときだけ、その1手だけをCPUの判断で進める。
   * 席をCPUに渡しはしないので、この先の手番を勝手に進めることはない
   */
  stepFor(i: number) {
    const s = this.snap.state;
    const seat = this.snap.lobby.seats[i];
    if (!s || seat?.kind !== 'guest' || seat.online || !waitsFor(s, i)) return;
    const a = s.phase.kind === 'roles' ? rolesAction(s, i) : cpuAction(s);
    if (!a) return;
    const next = step(s, a);
    if (next === s) return;
    next.log.push({ id: next.logCounter++, when: calendarLabel(next), text: `📵${s.players[i].name}の通信が切れていたので、1手だけ代わりに進めた。`, player: i });
    this.commit(next);
  }

  close() {
    if (this.closed) return;
    this.sendTo('*', { t: 'closed' });
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onWake);
    window.removeEventListener('online', this.onWake);
    // 「閉じました」が届くのを少し待ってから切る
    const relay = this.relay;
    setTimeout(() => relay.close(), 300);
  }
}

function cleanName(n: string, i: number): string {
  return n.trim().slice(0, 12) || `先生${i + 1}`;
}
