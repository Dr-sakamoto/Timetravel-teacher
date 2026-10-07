import Peer, { type PeerOptions } from 'peerjs';

/**
 * 端末どうしを直接つなぐための中継・案内サーバー（ICE）。
 * STUN は複数並べて、どれかが遅い・落ちている時でも早く経路が見つかるようにする。
 * TURN（直接つながらない時の中継）は PeerJS の無料サーバーに加え、
 * ビルド時に VITE_TURN_URLS（カンマ区切り）/ VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL で自前のものを足せる
 */
function iceServers(): RTCIceServer[] {
  const env = import.meta.env;
  const list: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  const turn = (env.VITE_TURN_URLS as string | undefined)
    ?.split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (turn?.length) list.push({ urls: turn, username: env.VITE_TURN_USERNAME as string | undefined, credential: env.VITE_TURN_CREDENTIAL as string | undefined });
  // PeerJS の無料 TURN（UDP が通らない学校・会社の回線向けに TCP でも試す）
  list.push({
    urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478?transport=tcp'],
    username: 'peerjs',
    credential: 'peerjsp',
  });
  return list;
}

/**
 * PeerJS の接続先。ふだんは PeerJS の無料サーバー（0.peerjs.com）を使う。
 * 自前のサーバーを使う時はビルド時に VITE_PEER_HOST / VITE_PEER_PORT / VITE_PEER_PATH / VITE_PEER_SECURE を指定する
 */
function options(): PeerOptions {
  const env = import.meta.env;
  const base: PeerOptions = { config: { iceServers: iceServers(), iceCandidatePoolSize: 4 } };
  if (!env.VITE_PEER_HOST) return base;
  return {
    ...base,
    host: env.VITE_PEER_HOST as string,
    port: env.VITE_PEER_PORT ? Number(env.VITE_PEER_PORT) : undefined,
    path: (env.VITE_PEER_PATH as string | undefined) ?? '/',
    secure: env.VITE_PEER_SECURE ? env.VITE_PEER_SECURE === 'true' : undefined,
  };
}

export function makePeer(id?: string): Peer {
  return id ? new Peer(id, options()) : new Peer(options());
}

/** つなぎ直すまでの待ち時間（最初の5回は1秒、それ以降は3秒） */
export function backoff(tries: number): number {
  return tries < 5 ? 1000 : 3000;
}
