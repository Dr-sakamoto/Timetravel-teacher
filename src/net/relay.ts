import { RealtimeClient, type RealtimeChannel } from '@supabase/realtime-js';

/**
 * 通信対戦の中継サーバー（Supabase Realtime・東京）。
 * 端末どうしを直接つなぐ方式（WebRTC）は、回線によってはつながらなかったり時間がかかったりするので、
 * 全員が中継サーバーにつなぎ、部屋ごとのチャンネルでメッセージをやりとりする。
 * 別の Supabase プロジェクトを使う時はビルド時に VITE_RELAY_URL / VITE_RELAY_KEY を指定する（公開用のキー）
 */
const URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? 'https://cyxprbysihbrjtckaxqe.supabase.co';
const KEY = (import.meta.env.VITE_RELAY_KEY as string | undefined) ?? 'sb_publishable_zU9Slge0coUocJzPMGt_vQ_0CX1bQqO';

/** チャンネル名の頭につける（ほかのアプリの部屋とぶつからないように） */
const TOPIC_PREFIX = 'jikuu-saikyou-';

export type RelayStatus = 'connecting' | 'open' | 'down';

/** 部屋のチャンネル。open になるまでに送ったものは捨てる（生存確認で送り直されるので困らない） */
export class Relay {
  private client: RealtimeClient;
  private ch: RealtimeChannel;
  private closed = false;
  status: RelayStatus = 'connecting';

  constructor(
    code: string,
    onMessage: (event: string, payload: unknown) => void,
    private onStatus: (s: RelayStatus) => void,
  ) {
    this.client = new RealtimeClient(`${URL.replace(/^http/, 'ws')}/realtime/v1`, {
      params: { apikey: KEY },
      vsn: '1.0.0',
      // 切れたことに早く気づけるよう、生存確認を短めに
      heartbeatIntervalMs: 10000,
      timeout: 10000,
      // つなぎ直す間隔（ふつうは1秒、何度も失敗したら2秒）
      reconnectAfterMs: (tries: number) => (tries < 10 ? 1000 : 2000),
    });
    this.ch = this.client.channel(TOPIC_PREFIX + code, { config: { broadcast: { self: false, ack: false } } });
    this.ch.on('broadcast', { event: '*' }, (m: { event: string; payload: unknown }) => onMessage(m.event, m.payload));
    this.ch.subscribe((s) => {
      if (this.closed) return;
      this.setStatus(s === 'SUBSCRIBED' ? 'open' : s === 'CLOSED' ? 'down' : 'connecting');
    });
  }

  private setStatus(s: RelayStatus) {
    if (s === this.status) return;
    this.status = s;
    this.onStatus(s);
  }

  get open() {
    return this.status === 'open';
  }

  send(event: string, payload: unknown) {
    if (!this.open) return;
    this.ch.send({ type: 'broadcast', event, payload }).catch(() => {
      /* 切れかけの時は送れないことがある */
    });
  }

  /** 画面に戻った時・電波が戻った時：切れていたらすぐつなぎ直す */
  wake() {
    if (this.closed) return;
    if (!this.client.isConnected()) this.client.connect();
  }

  close() {
    this.closed = true;
    void this.client.removeAllChannels().finally(() => this.client.disconnect());
  }
}
