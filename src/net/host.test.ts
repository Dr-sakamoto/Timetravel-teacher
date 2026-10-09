import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cpuAction } from '../game/ai';
import type { ToGuestEnvelope } from './protocol';

/** 中継サーバーの代わり：部屋を作った人が送ったものをためておく */
const sent: ToGuestEnvelope[] = [];
let deliver: (event: string, payload: unknown) => void = () => {};
vi.mock('./relay', () => ({
  Relay: class {
    open = true;
    constructor(_code: string, onMessage: (event: string, payload: unknown) => void, onStatus: (s: string) => void) {
      deliver = onMessage;
      setTimeout(() => onStatus('open'), 0);
    }
    send(_event: string, payload: ToGuestEnvelope) {
      sent.push(payload);
    }
    wake() {}
    close() {}
  },
}));

const { HostRoom } = await import('./host');

beforeEach(() => {
  vi.useFakeTimers();
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
  vi.stubGlobal('document', { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' });
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
  sent.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('チーム戦の部屋を作った人', () => {
  it('参加した人は自分の部屋の状態だけを受け取り、自分の部屋で操作できる', () => {
    const room = new HostRoom('12345', 'ホスト', () => {});
    room.setTeam(true);
    // 席1（部屋B・チーム1）に参加した人、残りは CPU
    deliver('h', { cid: 'g1', m: { t: 'hello', cid: 'g1', name: 'ゲスト' } });
    for (let i = 0; i < 6; i++) room.addCpu();
    expect(room.snap.lobby.seats).toHaveLength(8);
    room.startGame();
    const { rooms, seqs } = room.snap;
    expect(rooms).toHaveLength(2);
    expect(rooms!.map((r) => r.players.length)).toEqual([4, 4]);
    expect(rooms![1].players[0]).toMatchObject({ name: 'ゲスト', isCpu: false });
    expect(rooms![0].team!.mates[0].name).toBe('ゲスト');
    // 部屋Bの状態は部屋Bの席といっしょに配られる
    const toB = sent.filter((x) => x.m.t === 'state' && x.m.state.team?.room === 1).at(-1)!;
    expect(toB.m.t === 'state' && toB.m.seats.map((s) => s.cid ?? s.kind)).toEqual(['g1', 'cpu', 'cpu', 'cpu']);
    // ゲストが部屋Bで初期メンバーを引く（部屋Aの版の番号とは関係なく受け付ける）
    expect(rooms![1].phase).toMatchObject({ kind: 'memberDraw', player: 0 });
    deliver('h', { cid: 'g1', m: { t: 'action', seq: seqs![1], action: { type: 'drawMember' } } });
    expect(room.snap.rooms![1].players[0].students).toHaveLength(1);
    expect(room.snap.seqs).toEqual([seqs![0], seqs![1] + 1]);
    expect(room.snap.rooms![0]).toBe(rooms![0]);
    room.close();
  });

  it('部屋BのCPUは部屋を作った人の端末が進め、学年末テストで両方の部屋がそろうと合同で進む', () => {
    const room = new HostRoom('12345', 'ホスト', () => {});
    room.setTeam(true);
    for (let i = 0; i < 7; i++) room.addCpu();
    room.startGame();
    // 部屋A：部屋を作った人の席も CPU の手で進める（画面の代わり）
    const runA = () => {
      for (let i = 0; i < 5000; i++) {
        const s = room.snap.state!;
        if (s.phase.kind === 'teamWait' || s.phase.kind === 'gameOver') return;
        const a = cpuAction({ ...s, players: s.players.map((p) => ({ ...p, isCpu: true })) }) ?? { type: 'continue' as const };
        room.apply(a, room.snap.seq);
      }
      throw new Error('room A did not stop');
    };
    runA();
    expect(room.snap.state!.phase).toMatchObject({ kind: 'teamWait', event: 'test3' });
    // 部屋B は時間を進めれば CPU だけで進む
    for (let i = 0; i < 20000 && room.snap.rooms![1].phase.kind !== 'teamWait' && room.snap.rooms![0].phase.kind === 'teamWait'; i++) vi.advanceTimersByTime(2500);
    // そろったので、両方の部屋に合同の学年末テストの結果が出ている
    const [a, b] = room.snap.rooms!;
    expect(a.phase.kind === 'result' && a.phase.result.title).toBe('学年末テスト（チーム合同）');
    expect(b.phase.kind).toBe('result');
    expect(a.team!.mates.map((m) => m.points)).toEqual(b.players.map((p) => p.points));
    room.close();
  });
});
