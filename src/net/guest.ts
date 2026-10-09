import { Relay, type RelayStatus } from './relay';
import type { Action, GameState } from '../game/types';
import { clientId, pairOwners, PING_MS, TIMEOUT_MS, type Lobby, type Seat, type ToGuestEnvelope, type ToGuest, type ToHost } from './protocol';

export interface GuestSnap {
  /** connecting=最初の接続中 reconnecting=つなぎ直し中 */
  status: 'connecting' | 'reconnecting' | 'joined' | 'rejected' | 'closed' | 'notFound';
  /** つながるまでのどの段階か（server=中継サーバーに接続中 room=部屋を作った人の返事待ち） */
  stage: 'server' | 'room';
  reason?: string;
  code: string;
  you: number;
  lobby: Lobby | null;
  state: GameState | null;
  seq: number;
  seats: Seat[];
  /** ペア担任：ロビーの席 → クラス番号（seats はロビーの全席） */
  owner?: number[];
  /** チーム戦：もう一方の部屋の最新の状態（自分の部屋が合同イベントで待っている間に観戦する） */
  watch?: GameState;
}

const HELLO_MS = 1000;

/** 中継サーバーにつながってから、これだけ部屋を作った人の返事がなければ「見つからない」と出す（探し続けはする） */
const NOT_FOUND_MS = 4000;

/** 参加した人の端末：操作を部屋を作った人に送り、配られた状態を映す */
export class GuestRoom {
  private relay: Relay;
  private lastHeard = 0;
  private openedAt = 0;
  private timer: ReturnType<typeof setInterval>;
  /** 部屋に入るまで（つなぎ直すまで）は、1秒ごとに名乗る */
  private helloTimer: ReturnType<typeof setInterval>;
  private done = false;
  private cid = clientId();
  private everJoined = false;
  snap: GuestSnap;

  constructor(
    code: string,
    private name: string,
    private onChange: (s: GuestSnap) => void,
  ) {
    this.snap = { status: 'connecting', stage: 'server', code, you: -1, lobby: null, state: null, seq: -1, seats: [] };
    this.relay = new Relay(
      code,
      (event, payload) => this.onMessage(event, payload),
      (s) => this.onStatus(s),
    );
    this.timer = setInterval(() => this.tick(), PING_MS);
    this.helloTimer = setInterval(() => this.knock(), HELLO_MS);
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('online', this.onVisible);
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') this.relay.wake();
  };

  private set(p: Partial<GuestSnap>) {
    this.snap = { ...this.snap, ...p };
    this.onChange(this.snap);
  }

  private onStatus(s: RelayStatus) {
    if (this.done) return;
    if (s === 'open') {
      this.openedAt = Date.now();
      if (this.snap.status !== 'joined') this.set({ stage: 'room' });
      // つながったらすぐ名乗る（つなぎ直した時も、今の状態をもらい直す）
      this.hello();
    } else if (this.snap.status === 'joined') {
      this.set({ status: 'reconnecting' });
    }
  }

  private hello() {
    this.send({ t: 'hello', cid: this.cid, name: this.name });
  }

  private onMessage(event: string, payload: unknown) {
    if (this.done || event !== 'g') return;
    const { to, m } = payload as ToGuestEnvelope;
    if (to !== this.cid && to !== '*') return;
    this.lastHeard = Date.now();
    this.receive(m);
  }

  /** 全員あての状態には自分の席番号が入っていないので、端末IDから探す */
  private seatOf(seats: Seat[], you: number): number {
    return you >= 0 ? you : seats.findIndex((s) => s.cid === this.cid);
  }

  private receive(m: ToGuest) {
    switch (m.t) {
      case 'lobby': {
        const you = this.seatOf(m.lobby.seats, m.you);
        if (you < 0) return; // まだ席がない（名乗りが届く前の全員あて）
        this.everJoined = true;
        this.set({ status: 'joined', lobby: m.lobby, you, seats: m.lobby.seats, state: null });
        return;
      }
      case 'state': {
        if (m.pair) {
          const owner = pairOwners(m.seats);
          const you = owner[m.seats.findIndex((s) => s.cid === this.cid)] ?? -1;
          if (you < 0) return;
          this.everJoined = true;
          this.set({ status: 'joined', state: m.state, seq: m.seq, you, seats: m.seats, owner });
          return;
        }
        const you = this.seatOf(m.seats, m.you);
        if (you < 0) {
          // チーム戦：もう一方の部屋の状態（全員あてに流れてくる）は観戦用に取っておく
          const mine = this.snap.state?.team;
          if (mine && m.state.team && m.state.team.room !== mine.room) this.set({ watch: m.state });
          return;
        }
        this.everJoined = true;
        this.set({ status: 'joined', state: m.state, seq: m.seq, you, seats: m.seats });
        return;
      }
      case 'pong':
        if (!this.everJoined) return;
        // 見逃した手は、こちらの生存確認（ping）に今の番号を入れておけば送り直してもらえる
        if (this.snap.status !== 'joined') this.set({ status: 'joined' });
        return;
      case 'reject':
        this.stop();
        this.set({ status: 'rejected', reason: m.reason });
        return;
      case 'closed':
        if (!this.everJoined) return;
        this.stop();
        this.set({ status: 'closed' });
        return;
    }
  }

  /** まだ部屋に入れていない（つなぎ直し中）なら名乗る。部屋を作った人があとから来ても、すぐ気づいてもらえる */
  private knock() {
    if (this.done || !this.relay.open || (this.everJoined && this.snap.status === 'joined')) return;
    this.hello();
    if (!this.everJoined && this.snap.status !== 'notFound' && Date.now() - this.openedAt > NOT_FOUND_MS) this.set({ status: 'notFound' });
  }

  /** 生存確認。部屋を作った人から音沙汰がなければ「つなぎ直し中」にする（あとは knock が名乗り直す） */
  private tick() {
    if (this.done || !this.relay.open || !this.everJoined || this.snap.status !== 'joined') return;
    this.send({ t: 'ping', seq: this.snap.seq });
    if (Date.now() - this.lastHeard > TIMEOUT_MS) this.set({ status: 'reconnecting' });
  }

  private send(m: ToHost) {
    this.relay.send('h', { cid: this.cid, m });
  }

  /** ペア担任：ロビーで入るクラスを選ぶ */
  pick(cls: number) {
    this.send({ t: 'pick', cls });
  }

  act(a: Action) {
    this.send({ t: 'action', seq: this.snap.seq, action: a });
  }

  rename(name: string) {
    this.name = name;
    this.send({ t: 'rename', name });
  }

  private stop() {
    this.done = true;
    clearInterval(this.timer);
    clearInterval(this.helloTimer);
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('online', this.onVisible);
    this.relay.close();
  }

  leave() {
    this.stop();
  }
}
