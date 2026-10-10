import { Relay } from './relay';
import { cpuAction, rolesAction } from '../game/ai';
import { actingPlayer, calendarLabel, mergeTeams, newGame, newTeamGame, splitTeams, step, syncTeams } from '../game/engine';
import { SAVE_VERSION } from '../game/saveVersion';
import type { Action, GameState } from '../game/types';
import { canAct, maxSeats, MAX_SEATS, pairClasses, pairDefaultClass, pairHasRoom, pairOwners, roomSeats, sameAction, seatRoom, teamPartner, teamReady, waitsFor, PING_MS, TIMEOUT_MS, type Cursor, type Lobby, type Proposal, type Seat, type SeatCursor, type ToGuest, type ToHost, type ToHostEnvelope } from './protocol';

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
  /** チーム戦の3学期：チームの2クラスが合体した卓（このあいだは state もこれ。rooms は合体する前のまま取っておく） */
  joint?: GameState;
  /** 合体したクラスで出ている案（相方と同じ案になったら決まる） */
  props?: Proposal[];
  /** 合体した卓で、みんなが今どこを選んでいるか（確定前の枠） */
  cursors?: SeatCursor[];
}

interface HostSave {
  code: string;
  lobby: Lobby;
  state: GameState;
  seq: number;
  rooms?: GameState[];
  seqs?: number[];
  joint?: GameState;
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
      ? { status: 'opening', code: resume.code, lobby: resume.lobby, state: resume.state, seq: resume.seq, rooms: resume.rooms, seqs: resume.seqs, joint: resume.joint }
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
          JSON.stringify({ code: this.snap.code, lobby: this.snap.lobby, state: s, seq: this.snap.seq, rooms: this.snap.rooms, seqs: this.snap.seqs, joint: this.snap.joint } satisfies HostSave),
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
      const cls = this.snap.lobby.pair ? pairDefaultClass(seats) : undefined;
      if (seats.length >= max || cls === -1) return this.sendTo(cid, { t: 'reject', reason: `満員です（${max}人まで）` });
      this.setSeats([...seats, { name: cleanName(name, seats.length), kind: 'guest', cid, online: true, cls }]);
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
      case 'pick':
        this.pickClass(i, m.cls);
        return;
      case 'cursor':
        if (this.snap.joint && m.seq === this.snap.seq) this.setCursor(i, m.cur);
        return;
      case 'withdraw':
        if (this.snap.joint && m.seq === this.snap.seq) this.withdraw(i);
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
        if (this.snap.joint) return this.propose(i, m.action);
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

  /** ロビーの席 → その人の部屋の状態と、部屋の中の席番号（チーム戦でなければ部屋は1つ。ペア担任ならその人のクラス） */
  private view(seat: number): { room: number; you: number; state: GameState; seq: number } {
    const { rooms, seqs, joint } = this.snap;
    // 合体した卓：チーム（席番号の半分）のクラスを、部屋A・Bの2人で受け持つ
    if (joint) return { room: -1, you: seatRoom(seat).idx, state: joint, seq: this.snap.seq };
    if (!rooms || !seqs) {
      const you = this.snap.lobby.pair ? pairOwners(this.snap.lobby.seats)[seat] ?? -1 : seat;
      return { room: 0, you, state: this.snap.state!, seq: this.snap.seq };
    }
    const { room, idx } = seatRoom(seat);
    return { room, you: idx, state: rooms[room], seq: seqs[room] };
  }

  /** その部屋を進める（room=-1 は合体した卓）。チーム戦なら、2つの部屋が2学期を終えてそろったら合体し、合体した3学期が終わったらもとに戻す */
  private commitRoom(room: number, next: GameState) {
    const { rooms, seqs, joint } = this.snap;
    if (!rooms || !seqs) return this.commit(next);
    if (room < 0) {
      if (!joint || next === joint) return;
      const split = splitTeams(rooms, next);
      // 版の番号はどの画面から見ても前に進むように、合体の前後で一番大きい番号の次にする
      const seq = this.snap.seq + 1;
      if (split) this.set({ rooms: split, seqs: [seq, seq], joint: undefined, props: undefined, cursors: undefined, state: split[0], seq });
      else {
        // 係決め（一斉）の案は、ほかのクラスが準備OKになっても、自分のクラスがまだなら残す
        const ph = next.phase;
        const props = ph.kind === 'roles' && joint.phase.kind === 'roles' ? this.snap.props?.filter((x) => !ph.ready[x.pi]) : undefined;
        // 同じ人が同じ場面で選んでいる途中なら、選択カーソルも残す
        const same = ph.kind === joint.phase.kind && (ph.kind === 'gameOver' || joint.phase.kind === 'gameOver' || ph.player === joint.phase.player);
        this.set({ joint: next, props, cursors: same ? this.snap.cursors : undefined, state: next, seq });
      }
      this.broadcast();
      this.drive();
      return;
    }
    if (next === rooms[room]) return;
    const nextRooms = rooms.map((r, k) => (k === room ? next : r));
    // チームメイトの点は、進めた部屋にだけ書き写す（もう一方の部屋はその部屋が進んだときに）
    nextRooms[room] = syncTeams(nextRooms)[room];
    const nextSeqs = seqs.map((q, k) => (k === room ? q + 1 : q));
    const merged = mergeTeams(nextRooms);
    if (merged) {
      const seq = Math.max(...nextSeqs) + 1;
      this.set({ rooms: nextRooms, seqs: nextSeqs, joint: merged, props: undefined, cursors: undefined, state: merged, seq });
      this.broadcast();
      this.drive();
      return;
    }
    this.set({ rooms: nextRooms, seqs: nextSeqs, state: nextRooms[0], seq: nextSeqs[0] });
    this.broadcastRoom(room);
    this.drive();
  }

  /** 合体した卓で、席 seat の人の選択カーソルを変えて、みんなに配る（状態ごとではなく軽い知らせで） */
  setCursor(seat: number, cur: Cursor) {
    if (!this.snap.joint) return;
    const prev = this.snap.cursors?.find((x) => x.seat === seat);
    if (prev && JSON.stringify(prev.cur) === JSON.stringify(cur)) return;
    const cursors = [...(this.snap.cursors ?? []).filter((x) => x.seat !== seat), { seat, cur }];
    this.set({ cursors });
    if (this.snap.lobby.seats.some((s) => s.kind === 'guest')) this.sendTo('*', { t: 'cursors', seq: this.snap.seq, cursors });
  }

  /** 合体した卓で、席 seat の人の確定を取り消す（選択カーソルは点線に戻る） */
  withdraw(seat: number) {
    if (!this.snap.joint || !this.snap.props?.some((x) => x.seat === seat)) return;
    this.set({ props: this.snap.props.filter((x) => x.seat !== seat) });
    this.broadcast();
  }

  /** 合体した卓で、CPUが進める操作か（「次へ」はだれでも） */
  private cpuMove(s: GameState, a: Action): boolean {
    if (a.type === 'continue') return true;
    if (a.type === 'setRoles') return !!s.players[a.player]?.isCpu;
    const actor = actingPlayer(s);
    return actor !== null && s.players[actor].isCpu;
  }

  /** 相方がこの操作を一緒に決められるか（CPU・通信切れなら、1人で決める） */
  private partnerHere(seat: number): boolean {
    const mate = this.snap.lobby.seats[teamPartner(seat)];
    return !!mate && (mate.kind === 'host' || (mate.kind === 'guest' && mate.online));
  }

  /**
   * 合体した卓で、席 seat の人が操作の案を出す。相方も同じ案を出していたら決まる（「次へ」と、相方がいないときはすぐ決まる）。
   * 違う案なら、案を出し直す（相方の画面に出る）
   */
  private propose(seat: number, a: Action) {
    const joint = this.snap.joint;
    if (!joint) return;
    const pi = seatRoom(seat).idx;
    if (a.type === 'continue' || !this.partnerHere(seat)) return this.commitRoom(-1, step(joint, a));
    const mate = (this.snap.props ?? []).find((x) => x.seat === teamPartner(seat));
    if (mate && sameAction(mate.action, a)) return this.commitRoom(-1, step(joint, a));
    const props = [...(this.snap.props ?? []).filter((x) => x.seat !== seat), { seat, pi, name: this.snap.lobby.seats[seat].name, action: a }];
    this.set({ props });
    this.broadcast();
  }

  /**
   * チーム戦：部屋Bは部屋を作った人の画面に出ていないので、CPUの手番と、CPU・全員CPUの結果の「次へ」をここで進める
   * （部屋Aは部屋を作った人の画面が進める）
   */
  private drive() {
    if (this.driveTimer) clearTimeout(this.driveTimer);
    this.driveTimer = null;
    const s = this.snap.rooms?.[1];
    // 合体した卓は、部屋を作った人の画面が進める
    if (!s || this.closed || this.snap.joint) return;
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
    if (this.snap.joint) {
      return this.sendTo(to, { t: 'state', seq: this.snap.seq, state: this.snap.joint, you: -1, seats: this.snap.lobby.seats, joint: true, props: this.snap.props ?? [], cursors: this.snap.cursors ?? [] });
    }
    if (!this.snap.rooms) {
      const pair = this.snap.lobby.pair || undefined;
      return this.sendTo(to, { t: 'state', seq: this.snap.seq, state: this.snap.state, you: pair || you < 0 ? -1 : you, seats: this.snap.lobby.seats, pair });
    }
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
    if (this.snap.joint) this.sendState('*', -1);
    else if (this.snap.rooms) this.snap.rooms.forEach((_, r) => this.broadcastRoom(r));
    else this.sendOne('*', -1);
  }

  // ---------- 部屋を作った人の画面から ----------

  addCpu() {
    const seats = this.snap.lobby.seats;
    if (this.snap.state || seats.length >= maxSeats(this.snap.lobby)) return;
    // ペア担任：CPUは1人で空いているクラスを受け持つ
    const cls = this.snap.lobby.pair ? pairClasses(seats).findIndex((c) => c.length === 0) : undefined;
    if (cls === -1) return;
    this.setSeats([...seats, { name: `CPU${seats.filter((s) => s.kind === 'cpu').length + 1}`, kind: 'cpu', online: true, cls }]);
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

  /** ペア担任：席 i の人を、クラス cls に移す（2人まで。CPUのクラスには入れない） */
  pickClass(i: number, cls: number) {
    const { seats, pair } = this.snap.lobby;
    if (this.snap.state || !pair || !seats[i] || seats[i].kind === 'cpu' || seats[i].cls === cls) return;
    if (!Number.isInteger(cls) || cls < 0 || cls >= MAX_SEATS || !pairHasRoom(seats, cls)) return;
    this.setSeats(seats.map((s, j) => (j === i ? { ...s, cls } : s)));
    this.broadcast();
  }

  /**
   * 対戦のしかた：ふつう／チーム戦（8〜10人）／ペア担任（2人で1クラス）。
   * 席の上限が減るときは、あふれた席を外す。ペア担任にするときは、来た順に2人ずつクラスへ入れる（CPUは1人で1クラス）
   */
  setStyle(style: 'normal' | 'team' | 'pair') {
    if (this.snap.state) return;
    const lobby: Lobby = { ...this.snap.lobby, team: style === 'team' || undefined, pair: style === 'pair' || undefined };
    const max = maxSeats(lobby);
    const kept: Seat[] = [];
    const out: Seat[] = [];
    for (const { cls: _, ...seat } of lobby.seats) {
      const cls = style === 'pair' ? (seat.kind === 'cpu' ? pairClasses(kept).findIndex((c) => c.length === 0) : pairDefaultClass(kept)) : undefined;
      if (kept.length >= max || cls === -1) out.push(seat);
      else kept.push(cls === undefined ? seat : { ...seat, cls });
    }
    for (const s of out) if (s.cid) this.sendTo(s.cid, { t: 'reject', reason: 'ルームの人数が変わったので外れました' });
    this.set({ lobby: { ...lobby, seats: kept } });
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
    if (this.snap.lobby.pair) {
      // ペア担任：だれかいるクラスだけを、クラス番号の順に。名前は2人の名前を並べる
      const classes = pairClasses(seats).filter((c) => c.length);
      if (classes.length < 2) return;
      this.commit(newGame(classes.map((c) => ({ name: c.map((i) => players[i].name).join('・'), isCpu: c.every((i) => players[i].isCpu) })), years));
      return;
    }
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
    // 合体した卓：CPUの手はそのまま、部屋を作った人の手は相方と案を合わせる
    if (this.snap.joint) {
      if (this.cpuMove(s, a)) this.commitRoom(-1, step(s, a));
      else if (canAct(s, seatRoom(0).idx, a)) this.propose(0, a);
      return;
    }
    this.commitRoom(0, step(s, a));
  }

  /**
   * 通信が切れた人の操作を待って止まっているときだけ、その1手だけをCPUの判断で進める。
   * 席をCPUに渡しはしないので、この先の手番を勝手に進めることはない
   */
  stepFor(i: number) {
    const seat = this.snap.lobby.seats[i];
    if (!this.snap.state || seat?.kind !== 'guest' || seat.online || this.mateOnline(i)) return;
    const { room, you, state: s } = this.view(i);
    if (!waitsFor(s, you)) return;
    const a = s.phase.kind === 'roles' ? rolesAction(s, you) : cpuAction(s);
    if (!a) return;
    const next = step(s, a);
    if (next === s) return;
    next.log.push({ id: next.logCounter++, when: calendarLabel(next), text: `📵${s.players[you].name}の通信が切れていたので、1手だけ代わりに進めた。`, player: you });
    this.commitRoom(room, next);
  }

  /** ペア担任：同じクラスの相方が操作できるか（つながっている・ホスト） */
  private mateOnline(i: number): boolean {
    if (this.snap.joint) return this.partnerHere(i);
    const { seats, pair } = this.snap.lobby;
    if (!pair) return false;
    const owner = pairOwners(seats);
    return seats.some((s, j) => j !== i && owner[j] === owner[i] && s.kind !== 'cpu' && (s.kind === 'host' || s.online));
  }

  /** 合体した卓で、部屋を作った人と相方の案 */
  proposals(): Proposal[] {
    return this.snap.props ?? [];
  }

  /** 部屋を作った人が受け持つクラス（ペア担任では相方と同じクラス） */
  myPlayer(): number {
    return this.snap.state ? this.view(0).you : 0;
  }

  /** その席の人の操作を待って止まっているか（チーム戦では、その人の部屋で。ペア担任では相方もつながっていないとき） */
  waitsForSeat(i: number): boolean {
    if (!this.snap.state || this.mateOnline(i)) return false;
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
