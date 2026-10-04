import Peer from 'peerjs';

/**
 * PeerJS の接続先。ふだんは PeerJS の無料サーバー（0.peerjs.com）を使う。
 * 自前のサーバーを使う時はビルド時に VITE_PEER_HOST / VITE_PEER_PORT / VITE_PEER_PATH / VITE_PEER_SECURE を指定する
 */
function options() {
  const env = import.meta.env;
  if (!env.VITE_PEER_HOST) return {};
  return {
    host: env.VITE_PEER_HOST as string,
    port: env.VITE_PEER_PORT ? Number(env.VITE_PEER_PORT) : undefined,
    path: (env.VITE_PEER_PATH as string | undefined) ?? '/',
    secure: env.VITE_PEER_SECURE ? env.VITE_PEER_SECURE === 'true' : undefined,
  };
}

export function makePeer(id?: string): Peer {
  return id ? new Peer(id, options()) : new Peer(options());
}
