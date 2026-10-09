import { Relay } from './relay';
import { cpuAction, rolesAction } from '../game/ai';
import { actingPlayer, calendarLabel, newGame, newTeamGame, resolveTeamEvent, step, syncTeams } from '../game/engine';
import { SAVE_VERSION } from '../game/saveVersion';
import type { Action, GameState } from '../game/types';
import { canAct, maxSeats, roomSeats, seatRoom, teamReady, waitsFor, PING_MS, TIMEOUT_MS, type Lobby, type Seat, type ToGuest, type ToHost, type ToHostEnvelope } from './protocol';

const SAVE_KEY = 'jikuu-saikyou-host-v1';

export interface HostSnap {
  status: 'opening' | 'open' | 'error';
  error?: string;
  code: string;
  lobby: Lobby;
  /** ゲーム中（null ならロビー）。チーム戦では部屋を作った人のいる部屋A（rooms[0]） */
  state: GameState | null;
  seq: number;
  /** チーム戦：2つの部屋の状態と、部屋ごとの版の番号 */
  rooms?: GameState[];
  seqs?: number[];
}

interface HostSave {
  code: string;
  lobby: Lobby;
  state: GameState;
  seq: number;
  rooms?: GameState[];
  seqs?: number[];
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
  /** チーム戦：部屋を作った人の画面に出ていない部屋（部屋B）のCPUを進めるタイマー */
  private driveTimer: ReturnType<typeof setTimeout> | null = null;
  snap: HostSnap;

  constructor(
    code: string,
    hostName: string,
    private onChange: (s: HostSnap) => void,
    resume?: HostSave,
  ) {
    this.snap = resume
      ? { status: 'opening', code: resume.code, lobby: resume.lobby, state: resume.state, seq: resume.seq, rooms: resume.rooms, seqs: resume.seqs }
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
    this.drive();
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
          JSON.stringify({ code: this.snap.code, lobby: this.snap.lobby, state: s, seq: this.snap.seq, rooms: this.snap.rooms, seqs: this.snap.seqs } satisfies HostSave),
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
      const max = maxSeats(this.snap.lobby);
      if (seats.length >= max) return this.sendTo(cid, { t: 'reject', reason: `満員です（${max}人まで）` });
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
        if (this.snap.state && m.seq !== this.view(i).seq) this.sendState(cid, i);
        return;
      case 'sync':
        this.sendOne(cid, i);
        return;
      case 'action': {
        if (!this.snap.state) return this.sendOne(cid, i);
        const v = this.view(i);
        // 係決めは一斉なので、ほかの人の準備OKで版が進んでいても受け付ける（canAct が二重を防ぐ）
        const simultaneous = m.action.type === 'setRoles' && v.state.phase.kind === 'roles';
        if ((m.seq !== v.seq && !simultaneous) || !canAct(v.state, v.you, m.action)) {
          this.sendOne(cid, i);
          return;
        }
        this.commitRoom(v.room, step(v.state, m.action));
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

  /** ロビーの席 → その人の部屋の状態と、部屋の中の席番号（チーム戦でなければ部屋は1つ） */
  private view(seat: number): { room: number; you: number; state: GameState; seq: number } {
    const { rooms, seqs } = this.snap;
    if (!rooms || !seqs) return { room: 0, you: seat, state: this.snap.state!, seq: this.snap.seq };
    const { room, idx } = seatRoom(seat);
    return { room, you: idx, state: rooms[room], seq: seqs[room] };
  }

  /** その部屋を進める。チーム戦なら、2つの部屋が合同イベントでそろったら一緒に進める */
  private commitRoom(room: number, next: GameState) {
    const { rooms, seqs } = this.snap;
    if (!rooms || !seqs) return this.commit(next);
    if (next === rooms[room]) return;
    let nextRooms = rooms.map((r, k) => (k === room ? next : r));
    // チームメイトの点は、進めた部屋にだけ書き写す（もう一方の部屋はその部屋が進んだときに）
    nextRooms[room] = syncTeams(nextRooms)[room];
    const nextSeqs = seqs.map((q, k) => (k === room ? q + 1 : q));
    const joint = resolveTeamEvent(nextRooms);
    if (joint) {
      nextRooms = joint;
      nextSeqs.forEach((_, k) => (nextSeqs[k] = seqs[k] + 1));
    }
    this.set({ rooms: nextRooms, seqs: nextSeqs, state: nextRooms[0], seq: nextSeqs[0] });
    if (joint) this.broadcast();
    else this.broadcastRoom(room);
    this.drive();
  }

  /**
   * チーム戦：部屋Bは部屋を作った人の画面に出ていないので、CPUの手番と、CPU・全員CPUの結果の「次へ」をここで進める
   * （部屋Aは部屋を作った人の画面が進める）
   */
  private drive() {
    if (this.driveTimer) clearTimeout(this.driveTimer);
    this.driveTimer = null;
    const s = this.snap.rooms?.[1];
    if (!s || this.closed) return;
    const ph = s.phase;
    const allCpu = s.players.every((p) => p.isCpu);
    let a: Action | null = null;
    let wait = 800;
    if (ph.kind === 'result') {
      if (allCpu || (ph.player !== null && s.players[ph.player].isCpu)) {
        a = { type: 'continue' };
        wait = 2400;
      }
    } else if (ph.kind === 'roles' ? s.players.some((p, i) => p.isCpu && !ph.ready[i]) : actingPlayer(s) !== null && s.players[actingPlayer(s)!].isCpu) {
      a = cpuAction(s);
    }
    if (!a) return;
    const seq = this.snap.seqs![1];
    const act = a;
    this.driveTimer = setTimeout(() => {
      if (this.snap.seqs?.[1] === seq) this.commitRoom(1, step(this.snap.rooms![1], act));
    }, wait);
  }

  private sendTo(to: string, m: ToGuest) {
    this.relay.send('g', { to, m });
  }

  private sendState(to: string, you: number) {
    if (!this.snap.state) return;
    if (!this.snap.rooms) return this.sendTo(to, { t: 'state', seq: this.snap.seq, state: this.snap.state, you, seats: this.snap.lobby.seats });
    const v = this.view(you);
    this.sendTo(to, { t: 'state', seq: v.seq, state: v.state, you: v.you, seats: roomSeats(this.snap.lobby.seats, v.room) });
  }

  /** チーム戦：その部屋の人みんなに1通で配る（席番号は受け取った側が、部屋の席の中から端末IDで探す） */
  private broadcastRoom(room: number) {
    const { rooms, seqs } = this.snap;
    if (!rooms || !seqs || !this.snap.lobby.seats.some((s) => s.kind === 'guest')) return;
    this.sendTo('*', { t: 'state', seq: seqs[room], state: rooms[room], you: -1, seats: roomSeats(this.snap.lobby.seats, room) });
  }

  private sendOne(to: string, you: number) {
    if (this.snap.state) this.sendState(to, you);
    else this.sendTo(to, { t: 'lobby', lobby: this.snap.lobby, you });
  }

  /** 全員に1通で配る（席番号は受け取った側が端末IDから探す） */
  private broadcast() {
    if (!this.snap.lobby.seats.some((s) => s.kind === 'guest')) return;
    if (this.snap.rooms) this.snap.rooms.forEach((_, r) => this.broadcastRoom(r));
    else this.sendOne('*', -1);
  }

  // ---------- 部屋を作った人の画面から ----------

  addCpu() {
    const seats = this.snap.lobby.seats;
    if (this.snap.state || seats.length >= maxSeats(this.snap.lobby)) return;
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

  /** チーム戦（8〜10人）にするか。普通の対戦に戻すとき、6人目からの席は外す */
  setTeam(team: boolean) {
    if (this.snap.state) return;
    const lobby = { ...this.snap.lobby, team };
    const max = maxSeats(lobby);
    for (const s of lobby.seats.slice(max)) if (s.cid) this.sendTo(s.cid, { t: 'reject', reason: 'ルームの人数が変わったので外れました' });
    this.set({ lobby: { ...lobby, seats: lobby.seats.slice(0, max) } });
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
    if (this.snap.lobby.team) {
      if (!teamReady(players.length)) return;
      const rooms = newTeamGame([0, 1].map((r) => players.filter((_, k) => k % 2 === r)), years);
      this.set({ rooms, seqs: [1, 1], state: rooms[0], seq: 1 });
      this.broadcast();
      this.drive();
      return;
    }
    this.commit(newGame(players, years));
  }

  /** 部屋を作った人の操作・CPUの操作（seq は画面に出ていた状態の番号。古い画面からの操作は捨てる） */
  apply(a: Action, seq: number) {
    const s = this.snap.state;
    const simultaneous = a.type === 'setRoles' && s?.phase.kind === 'roles';
    if (!s || (seq !== this.snap.seq && !simultaneous)) return;
    this.commitRoom(0, step(s, a));
  }

  /**
   * 通信が切れた人の操作を待って止まっているときだけ、その1手だけをCPUの判断で進める。
   * 席をCPUに渡しはしないので、この先の手番を勝手に進めることはない
   */
  stepFor(i: number) {
    const seat = this.snap.lobby.seats[i];
    if (!this.snap.state || seat?.kind !== 'guest' || seat.online) return;
    const { room, you, state: s } = this.view(i);
    if (!waitsFor(s, you)) return;
    const a = s.phase.kind === 'roles' ? rolesAction(s, you) : cpuAction(s);
    if (!a) return;
    const next = step(s, a);
    if (next === s) return;
    next.log.push({ id: next.logCounter++, when: calendarLabel(next), text: `📵${s.players[you].name}の通信が切れていたので、1手だけ代わりに進めた。`, player: you });
    this.commitRoom(room, next);
  }

  /** その席の人の操作を待って止まっているか（チーム戦では、その人の部屋で） */
  waitsForSeat(i: number): boolean {
    if (!this.snap.state) return false;
    const v = this.view(i);
    return waitsFor(v.state, v.you);
  }

  close() {
    if (this.closed) return;
    this.sendTo('*', { t: 'closed' });
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    if (this.driveTimer) clearTimeout(this.driveTimer);
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
