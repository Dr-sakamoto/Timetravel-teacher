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
    room.setStyle('team');
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

  /** 部屋A：部屋を作った人の席も CPU の手で進める（画面の代わり）。合体するまで */
  const runA = (room: InstanceType<typeof HostRoom>) => {
    for (let i = 0; i < 5000; i++) {
      const s = room.snap.state!;
      if (s.phase.kind === 'teamWait' || s.phase.kind === 'gameOver' || room.snap.joint) return;
      const a = cpuAction({ ...s, players: s.players.map((p) => ({ ...p, isCpu: true })) }) ?? { type: 'continue' as const };
      room.apply(a, room.snap.seq);
    }
    throw new Error('room A did not stop');
  };

  it('部屋BのCPUは部屋を作った人の端末が進め、2学期が終わって両方の部屋がそろうと合体する', () => {
    const room = new HostRoom('12345', 'ホスト', () => {});
    room.setStyle('team');
    for (let i = 0; i < 7; i++) room.addCpu();
    room.startGame();
    runA(room);
    expect(room.snap.state!.phase).toMatchObject({ kind: 'teamWait', event: 'merge' });
    // 部屋B は時間を進めれば CPU だけで進む
    for (let i = 0; i < 20000 && !room.snap.joint; i++) vi.advanceTimersByTime(2500);
    const joint = room.snap.joint!;
    expect(joint).toBeDefined();
    expect(room.snap.state).toBe(joint);
    expect(joint.players.map((p) => p.name)).toEqual(['ホスト・CPU1', 'CPU2・CPU3', 'CPU4・CPU5', 'CPU6・CPU7']);
    expect(joint.players[0].isCpu).toBe(false);
    room.close();
  });

  it('合体したクラスは、2人が同じ案を出したら決まる（違う案なら相方の画面に出る）', () => {
    const room = new HostRoom('12345', 'ホスト', () => {});
    room.setStyle('team');
    // 席1（部屋B・チーム1）＝ホストの相方
    deliver('h', { cid: 'g1', m: { t: 'hello', cid: 'g1', name: 'あいぼう' } });
    for (let i = 0; i < 6; i++) room.addCpu();
    room.startGame();
    // ゲストの部屋Bも CPU の手で進める
    const runB = () => {
      for (let i = 0; i < 20000 && !room.snap.joint; i++) {
        const s = room.snap.rooms![1];
        if (s.phase.kind === 'teamWait') break;
        const me = s.phase.kind === 'roles' ? !s.phase.ready[0] : s.phase.kind === 'result' ? s.phase.player === null || s.phase.player === 0 : s.phase.kind !== 'gameOver' && s.phase.player === 0;
        if (me) {
          const a = cpuAction({ ...s, players: s.players.map((p) => ({ ...p, isCpu: true })) }) ?? { type: 'continue' as const };
          deliver('h', { cid: 'g1', m: { t: 'action', seq: room.snap.seqs![1], action: a } });
        } else vi.advanceTimersByTime(2500);
        deliver('h', { cid: 'g1', m: { t: 'ping', seq: room.snap.seqs![1] } });
      }
    };
    runA(room);
    runB();
    const joint = room.snap.joint!;
    expect(joint).toBeDefined();
    expect(joint.phase.kind).toBe('roles');
    // 係決め：ホストの案だけでは決まらず、相方に案が届く
    const roles = cpuAction({ ...joint, players: joint.players.map((p) => ({ ...p, isCpu: true })) })!;
    expect(roles.type).toBe('setRoles');
    const mine = roles.type === 'setRoles' ? { ...roles, player: 0 } : roles;
    room.apply(mine, room.snap.seq);
    expect(room.snap.state!.phase.kind === 'roles' && room.snap.state!.phase.ready[0]).toBe(false);
    expect(room.proposals()).toEqual([expect.objectContaining({ seat: 0, pi: 0, action: mine })]);
    const last = sent.filter((x) => x.m.t === 'state').at(-1)!;
    expect(last.m.t === 'state' && last.m.joint && last.m.props?.length).toBe(1);
    // 相方が同じ案を出すと決まる
    deliver('h', { cid: 'g1', m: { t: 'action', seq: room.snap.seq, action: mine } });
    const ph = room.snap.state!.phase;
    expect(ph.kind === 'roles' && ph.ready[0]).toBe(true);
    expect(room.proposals()).toEqual([]);
    room.close();
  });
});

describe('ペア担任の部屋を作った人', () => {
  const join = (cid: string, name: string) => deliver('h', { cid, m: { t: 'hello', cid, name } });

  it('参加した人は相方を待っている人のクラスに入り、入るクラスを選び直せる', () => {
    const room = new HostRoom('12345', 'ホスト', () => {});
    room.setStyle('pair');
    join('g1', 'あお');
    join('g2', 'みどり');
    expect(room.snap.lobby.seats.map((s) => s.cls)).toEqual([0, 0, 1]);
    // みどりが1組（満員）には入れず、3組には移れる
    deliver('h', { cid: 'g2', m: { t: 'pick', cls: 0 } });
    expect(room.snap.lobby.seats[2].cls).toBe(1);
    deliver('h', { cid: 'g2', m: { t: 'pick', cls: 2 } });
    expect(room.snap.lobby.seats[2].cls).toBe(2);
    // CPUは1人で空いているクラスへ。CPUのクラスには入れない
    room.addCpu();
    expect(room.snap.lobby.seats[3].cls).toBe(1);
    room.pickClass(1, 1);
    expect(room.snap.lobby.seats[1].cls).toBe(0);
    room.close();
  });

  it('2人の名前のクラスになり、どちらの端末からも操作でき、2人とも切れたときだけ代わりに進められる', () => {
    const room = new HostRoom('12345', 'ホスト', () => {});
    room.setStyle('pair');
    join('g1', 'あお');
    join('g2', 'みどり');
    join('g3', 'きいろ');
    room.addCpu();
    room.startGame();
    const s = room.snap.state!;
    expect(s.players.map((p) => p.name)).toEqual(['ホスト・あお', 'みどり・きいろ', 'CPU1']);
    expect(s.players.map((p) => p.isCpu)).toEqual([false, false, true]);
    expect(room.myPlayer()).toBe(0);
    // ゲストには全席が届き、端末IDから自分のクラスがわかる
    const last = sent.filter((x) => x.m.t === 'state').at(-1)!;
    expect(last.m.t === 'state' && last.m.pair).toBe(true);
    // 2組の手番（最初の1枚）を、きいろが引く
    expect(s.phase).toMatchObject({ kind: 'memberDraw', player: 0 });
    room.apply({ type: 'drawMember' }, room.snap.seq);
    expect(room.snap.state!.phase).toMatchObject({ kind: 'memberDraw', player: 1 });
    deliver('h', { cid: 'g3', m: { t: 'action', seq: room.snap.seq, action: { type: 'drawMember' } } });
    expect(room.snap.state!.players[1].students).toHaveLength(1);
    // CPU1 が引いて、また1組・2組と回ってくる
    for (let k = 0; k < 10 && (room.snap.state!.phase as { player?: number }).player !== 1; k++) room.apply({ type: 'drawMember' }, room.snap.seq);
    expect(room.snap.state!.phase).toMatchObject({ kind: 'memberDraw', player: 1 });
    // みどりが切れても、相方のきいろがつながっていれば待つだけ
    for (let t = 0; t < 4; t++) {
      vi.advanceTimersByTime(5000);
      deliver('h', { cid: 'g1', m: { t: 'ping', seq: room.snap.seq } });
      deliver('h', { cid: 'g3', m: { t: 'ping', seq: room.snap.seq } });
    }
    expect(room.snap.lobby.seats[2].online).toBe(false);
    expect(room.waitsForSeat(2)).toBe(false);
    // 2人とも切れたら、1手だけ代わりに進められる
    for (let t = 0; t < 4; t++) {
      vi.advanceTimersByTime(5000);
      deliver('h', { cid: 'g1', m: { t: 'ping', seq: room.snap.seq } });
    }
    expect(room.snap.lobby.seats[3].online).toBe(false);
    expect(room.waitsForSeat(2)).toBe(true);
    room.stepFor(2);
    expect(room.snap.state!.players[1].students).toHaveLength(2);
    room.close();
  });
});
