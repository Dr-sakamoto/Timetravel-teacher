import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { backoff, makePeer } from './peer';
import type { Action, GameState } from '../game/types';
import { clientId, PEER_PREFIX, PING_MS, TIMEOUT_MS, type Lobby, type Seat, type ToGuest, type ToHost } from './protocol';

export interface GuestSnap {
  /** connecting=最初の接続中 reconnecting=つなぎ直し中 */
  status: 'connecting' | 'reconnecting' | 'joined' | 'rejected' | 'closed' | 'notFound';
  /** つながるまでのどの段階か（server=通信サーバーに接続中 room=部屋を作った人に接続中） */
  stage: 'server' | 'room';
  reason?: string;
  code: string;
  you: number;
  lobby: Lobby | null;
  state: GameState | null;
  seq: number;
  seats: Seat[];
}

/** 通信サーバーにつながるまで・部屋を作った人とつながるまで、これだけ待ったらやり直す（混んでいる時は10秒以上かかることもあるので長めに） */
const SERVER_TIMEOUT_MS = 25000;
const CONNECT_TIMEOUT_MS = 25000;

/** 参加した人の端末：操作を部屋を作った人に送り、配られた状態を映す */
export class GuestRoom {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private lastHeard = 0;
  private timer: ReturnType<typeof setInterval>;
  private done = false;
  private cid = clientId();
  private everJoined = false;
  private serverSince = 0;
  private connectingSince = 0;
  private serverTries = 0;
  /** 部屋が見つからなかった回数（部屋を作った人がつなぎ直している最中のこともあるので、すぐにはあきらめない） */
  private misses = 0;
  private retrying: ReturnType<typeof setTimeout> | null = null;
  snap: GuestSnap;

  constructor(
    code: string,
    private name: string,
    private onChange: (s: GuestSnap) => void,
  ) {
    this.snap = { status: 'connecting', stage: 'server', code, you: -1, lobby: null, state: null, seq: -1, seats: [] };
    this.openPeer();
    this.timer = setInterval(() => this.tick(), PING_MS);
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('online', this.onVisible);
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') this.tick(true);
  };

  private set(p: Partial<GuestSnap>) {
    this.snap = { ...this.snap, ...p };
    this.onChange(this.snap);
  }

  /** 少し待ってからやり直す（予約済みなら何もしない） */
  private later(ms: number, f: () => void) {
    if (this.done || this.retrying) return;
    this.retrying = setTimeout(() => {
      this.retrying = null;
      if (!this.done) f();
    }, ms);
  }

  private openPeer() {
    if (this.done) return;
    if (this.retrying) clearTimeout(this.retrying);
    this.retrying = null;
    const old = this.conn;
    this.conn = null;
    old?.close();
    this.peer?.destroy();
    const peer = makePeer();
    this.peer = peer;
    this.serverSince = Date.now();
    if (this.snap.status !== 'joined') this.set({ stage: 'server' });
    peer.on('open', () => {
      if (peer !== this.peer) return;
      this.serverTries = 0;
      // 通信サーバーにつなぎ直しただけで、部屋を作った人とはつながったままなら何もしない
      if (!this.conn?.open) this.connect();
    });
    peer.on('disconnected', () => {
      if (peer === this.peer) this.retryServer();
    });
    peer.on('error', (e) => {
      if (peer !== this.peer) return;
      const type = (e as { type?: string }).type;
      if (type === 'peer-unavailable') {
        // 部屋がない（または部屋を作った人の通信が切れている）。少し待ってまた探す
        this.misses++;
        if (!this.everJoined && this.misses >= 2) this.set({ status: 'notFound' });
        this.later(this.misses < 3 ? 1500 : 3000, () => this.connect());
        return;
      }
      if (type === 'browser-incompatible') {
        this.set({ status: 'rejected', reason: 'このブラウザは通信対戦に対応していません' });
        return;
      }
      if (type === 'webrtc') {
        // 経路が見つからなかった：つなぎ直す
        this.later(1000, () => this.connect());
        return;
      }
      this.retryServer();
    });
  }

  /** 通信サーバーにつなぎ直す（だんだん間をあける） */
  private retryServer() {
    this.later(backoff(this.serverTries++), () => {
      const peer = this.peer;
      if (peer && !peer.destroyed && peer.disconnected) peer.reconnect();
      else if (!peer?.open) this.openPeer();
    });
  }

  private connect() {
    if (this.done || !this.peer || this.peer.destroyed || !this.peer.open) return;
    const old = this.conn;
    this.conn = null;
    old?.close();
    this.connectingSince = Date.now();
    if (this.snap.status !== 'joined') this.set({ stage: 'room' });
    const c = this.peer.connect(PEER_PREFIX + this.snap.code, { reliable: true });
    this.conn = c;
    c.on('open', () => {
      if (c !== this.conn) return;
      this.lastHeard = Date.now();
      this.misses = 0;
      this.send({ t: 'hello', cid: this.cid, name: this.name });
    });
    c.on('data', (raw) => {
      if (c !== this.conn) return;
      this.lastHeard = Date.now();
      this.receive(raw as ToGuest);
    });
    c.on('close', () => {
      if (c !== this.conn || this.done) return;
      if (this.snap.status === 'joined') this.set({ status: 'reconnecting' });
      // 切れたらすぐにつなぎ直す（次の生存確認まで待たない）
      this.later(500, () => (this.peer?.open ? this.connect() : this.retryServer()));
    });
    c.on('error', () => {
      if (c === this.conn) this.later(1000, () => this.connect());
    });
  }

  private receive(m: ToGuest) {
    switch (m.t) {
      case 'lobby':
        this.everJoined = true;
        this.set({ status: 'joined', lobby: m.lobby, you: m.you, seats: m.lobby.seats, state: null });
        return;
      case 'state':
        this.everJoined = true;
        this.set({ status: 'joined', state: m.state, seq: m.seq, you: m.you, seats: m.seats });
        return;
      case 'pong':
        if (this.snap.status !== 'joined') this.set({ status: 'joined' });
        return;
      case 'reject':
        this.stop();
        this.set({ status: 'rejected', reason: m.reason });
        return;
      case 'closed':
        this.stop();
        this.set({ status: 'closed' });
        return;
    }
  }

  /** 生存確認。返事がなければつなぎ直す */
  private tick(force = false) {
    if (this.done) return;
    const now = Date.now();
    const c = this.conn;
    const peer = this.peer;
    if (c?.open) {
      this.send({ t: 'ping', seq: this.snap.seq });
      if (now - this.lastHeard <= TIMEOUT_MS) return;
      // つながっているはずなのに返事がない
      if (this.snap.status === 'joined') this.set({ status: 'reconnecting' });
      if (peer?.open) this.connect();
      else this.openPeer();
      return;
    }
    if (force && this.retrying) {
      // 画面に戻った・電波が戻った時は、待たずにすぐやり直す
      clearTimeout(this.retrying);
      this.retrying = null;
      this.serverTries = 0;
    }
    if (this.retrying) return;
    if (!peer || peer.destroyed || peer.disconnected) {
      this.retryServer();
    } else if (!peer.open) {
      // 通信サーバーからの返事が来ない：作り直す
      if (force || now - this.serverSince > SERVER_TIMEOUT_MS) this.openPeer();
    } else if (now - this.connectingSince > (force ? 3000 : CONNECT_TIMEOUT_MS)) {
      // 部屋を作った人とつながらない：もう一度つなぐ
      this.connect();
    }
  }

  private send(m: ToHost) {
    const c = this.conn;
    if (!c?.open) return;
    try {
      c.send(m);
    } catch {
      /* 切れかけの接続には送れないことがある */
    }
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
    if (this.retrying) clearTimeout(this.retrying);
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('online', this.onVisible);
    const peer = this.peer;
    setTimeout(() => peer?.destroy(), 300);
  }

  leave() {
    this.stop();
  }
}
