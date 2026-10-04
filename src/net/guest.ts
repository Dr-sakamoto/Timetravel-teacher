import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { makePeer } from './peer';
import type { Action, GameState } from '../game/types';
import { clientId, PEER_PREFIX, PING_MS, TIMEOUT_MS, type Lobby, type Seat, type ToGuest, type ToHost } from './protocol';

export interface GuestSnap {
  /** connecting=最初の接続中 reconnecting=つなぎ直し中 */
  status: 'connecting' | 'reconnecting' | 'joined' | 'rejected' | 'closed' | 'notFound';
  reason?: string;
  code: string;
  you: number;
  lobby: Lobby | null;
  state: GameState | null;
  seq: number;
  seats: Seat[];
}

/** 参加した人の端末：操作を部屋を作った人に送り、配られた状態を映す */
export class GuestRoom {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private lastHeard = 0;
  private timer: ReturnType<typeof setInterval>;
  private done = false;
  private cid = clientId();
  private everJoined = false;
  private connectingSince = 0;
  snap: GuestSnap;

  constructor(
    code: string,
    private name: string,
    private onChange: (s: GuestSnap) => void,
  ) {
    this.snap = { status: 'connecting', code, you: -1, lobby: null, state: null, seq: -1, seats: [] };
    this.openPeer();
    this.timer = setInterval(() => this.tick(), PING_MS);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') this.tick(true);
  };

  private set(p: Partial<GuestSnap>) {
    this.snap = { ...this.snap, ...p };
    this.onChange(this.snap);
  }

  private openPeer() {
    if (this.done) return;
    this.peer?.destroy();
    const peer = makePeer();
    this.peer = peer;
    peer.on('open', () => this.connect());
    peer.on('disconnected', () => {
      if (!this.done && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1000);
    });
    peer.on('error', (e) => {
      const type = (e as { type?: string }).type;
      if (type === 'peer-unavailable') {
        // 部屋がない（または部屋を作った人の通信が切れている）
        if (!this.everJoined) this.set({ status: 'notFound' });
        return;
      }
      if (type === 'browser-incompatible') this.set({ status: 'rejected', reason: 'このブラウザは通信対戦に対応していません' });
    });
  }

  private connect() {
    if (this.done || !this.peer || this.peer.destroyed || !this.peer.open) return;
    this.conn?.close();
    this.connectingSince = Date.now();
    const c = this.peer.connect(PEER_PREFIX + this.snap.code, { reliable: true });
    this.conn = c;
    c.on('open', () => {
      this.lastHeard = Date.now();
      this.send({ t: 'hello', cid: this.cid, name: this.name });
    });
    c.on('data', (raw) => {
      if (c !== this.conn) return;
      this.lastHeard = Date.now();
      this.receive(raw as ToGuest);
    });
    c.on('close', () => {
      if (c === this.conn && !this.done && this.snap.status === 'joined') this.set({ status: 'reconnecting' });
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
    if (c?.open) this.send({ t: 'ping', seq: this.snap.seq });
    const silent = now - this.lastHeard > TIMEOUT_MS;
    const stuck = !c?.open && now - this.connectingSince > TIMEOUT_MS;
    if ((c?.open && silent) || stuck || (force && !c?.open)) {
      if (this.snap.status === 'joined') this.set({ status: 'reconnecting' });
      if (!this.peer || this.peer.destroyed || this.peer.disconnected) this.openPeer();
      else this.connect();
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
    document.removeEventListener('visibilitychange', this.onVisible);
    const peer = this.peer;
    setTimeout(() => peer?.destroy(), 300);
  }

  leave() {
    this.stop();
  }
}
