import { actingPlayer } from '../game/engine';
import type { Action, GameState } from '../game/types';

export const MAX_SEATS = 5;
/** チーム戦（2つの部屋×5クラス）の席の上限 */
export const TEAM_MAX_SEATS = 10;
/** ペア担任：1つのクラスを受け持てる人数 */
export const PAIR_SIZE = 2;
/** ペア担任（5クラス×2人）の席の上限 */
export const PAIR_MAX_SEATS = MAX_SEATS * PAIR_SIZE;
/** これだけ音沙汰がなければ、つながっていないとみなす */
export const TIMEOUT_MS = 15000;
/** 生存確認の間隔（中継サーバーのメッセージ数を抑えるため、あまり短くしない） */
export const PING_MS = 5000;

/** ロビーの席 */
export interface Seat {
  name: string;
  /** 'host'=部屋を作った人 'guest'=参加した人 'cpu'=CPU */
  kind: 'host' | 'guest' | 'cpu';
  /** 参加した人の端末ID（つなぎ直しても同じ席に戻れるように） */
  cid?: string;
  online: boolean;
  /** ペア担任：受け持つクラスの番号（0〜4） */
  cls?: number;
}

export interface Lobby {
  seats: Seat[];
  years: number;
  /** チーム戦：席を交互に部屋A・Bへ振り分け、席 2k と 2k+1 がチーム k になる */
  team?: boolean;
  /** ペア担任：2人で1つのクラスを受け持つ（席ごとの cls で、どのクラスかを選ぶ） */
  pair?: boolean;
}

export function maxSeats(lobby: Lobby): number {
  return lobby.team ? TEAM_MAX_SEATS : lobby.pair ? PAIR_MAX_SEATS : MAX_SEATS;
}

/** ペア担任で、クラス番号ごとの席（ロビーの席番号）。空いているクラスは空の配列 */
export function pairClasses(seats: Seat[]): number[][] {
  const out: number[][] = Array.from({ length: MAX_SEATS }, () => []);
  seats.forEach((s, i) => out[s.cls ?? 0]?.push(i));
  return out;
}

/** ペア担任で、ロビーの席番号 → ゲームのクラス（プレイヤー）番号。だれもいないクラスは詰める */
export function pairOwners(seats: Seat[]): number[] {
  const owner: number[] = seats.map(() => -1);
  pairClasses(seats)
    .filter((c) => c.length)
    .forEach((c, pi) => c.forEach((i) => (owner[i] = pi)));
  return owner;
}

/** ペア担任で、そのクラスにまだ入れるか（2人まで。CPUのクラスには入れない） */
export function pairHasRoom(seats: Seat[], cls: number): boolean {
  const members = seats.filter((s) => s.cls === cls);
  return members.length < PAIR_SIZE && !members.some((s) => s.kind === 'cpu');
}

/** ペア担任で、参加した人が入るクラス：相方を待っている人のクラス、なければ空いているクラス */
export function pairDefaultClass(seats: Seat[]): number {
  const cls = pairClasses(seats);
  const lonely = cls.findIndex((c) => c.length === 1 && seats[c[0]].kind !== 'cpu');
  return lonely >= 0 ? lonely : cls.findIndex((c) => c.length === 0);
}

/** ペア担任で、そのクラスの人がみんな通信切れか（CPU・ホストのいるクラスは切れない） */
export function pairOffline(seats: Seat[], owner: number[], pi: number): boolean {
  const members = seats.filter((_, i) => owner[i] === pi);
  return members.length > 0 && members.every((s) => s.kind === 'guest' && !s.online);
}

/** チーム戦で、ロビーの席番号 → 部屋と、その部屋の中の席番号 */
export function seatRoom(seat: number): { room: number; idx: number } {
  return { room: seat % 2, idx: Math.floor(seat / 2) };
}

/** チーム戦で、同じチームのもう一方の部屋の席（3学期に合体したクラスを一緒に受け持つ相方） */
export function teamPartner(seat: number): number {
  return seat ^ 1;
}

/** 合体したクラスで、だれかが出した案（相方と同じ案になったら決まる） */
export interface Proposal {
  /** 案を出した人のロビーの席番号 */
  seat: number;
  /** 合体したクラスの番号 */
  pi: number;
  name: string;
  action: Action;
}

/** 合体したクラスで、今どこを選んでいるか（slot=場のカード（ピラミッドは -1）・uid=生徒・target=相手のクラス） */
export interface Cursor {
  slot?: number | null;
  uid?: string | null;
  target?: number | null;
}

/** 席ごとの選択カーソル */
export interface SeatCursor {
  seat: number;
  cur: Cursor;
}

/** 2つの案が同じ操作か（係決めは並び順を問わない） */
export function sameAction(a: Action, b: Action): boolean {
  const norm = (x: Action) =>
    x.type === 'setRoles'
      ? { ...x, roles: [...x.roles].sort((p, q) => (p.role + p.uid).localeCompare(q.role + q.uid)), unlock: [...(x.unlock ?? [])].sort() }
      : x.type === 'oath'
        ? { ...x, targets: [...x.targets].sort() }
        : x;
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/** チーム戦で、その部屋に入る席（部屋の中の席番号の順） */
export function roomSeats(seats: Seat[], room: number): Seat[] {
  return seats.filter((_, k) => k % 2 === room);
}

/** チーム戦を始められる人数か（2つの部屋が同じ人数になる偶数。4〜10） */
export function teamReady(n: number): boolean {
  return n >= 4 && n <= TEAM_MAX_SEATS && n % 2 === 0;
}

/** 参加した人 → 部屋を作った人 */
export type ToHost =
  | { t: 'hello'; cid: string; name: string }
  | { t: 'rename'; name: string }
  /** ペア担任：ロビーで入るクラスを選ぶ */
  | { t: 'pick'; cls: number }
  | { t: 'action'; seq: number; action: Action }
  | { t: 'ping'; seq: number }
  /** 合体したクラス：今どこを選んでいるか（相方の画面に枠で出る） */
  | { t: 'cursor'; seq: number; cur: Cursor }
  | { t: 'sync' };

/** 部屋を作った人 → 参加した人 */
export type ToGuest =
  | { t: 'lobby'; lobby: Lobby; you: number }
  /**
   * pair=ペア担任（seats はロビーの全席。you は受け取った側が pairOwners で自分のクラスに直す）。
   * joint=チーム戦の3学期の合体した卓（seats はロビーの全席。クラスは席番号の半分）。props はそれぞれのクラスで出ている案
   */
  | { t: 'state'; seq: number; state: GameState; you: number; seats: Seat[]; pair?: boolean; joint?: boolean; props?: Proposal[]; cursors?: SeatCursor[] }
  | { t: 'pong'; seq: number }
  /** 合体した卓：みんなの選択カーソル（seq の版のもの） */
  | { t: 'cursors'; seq: number; cursors: SeatCursor[] }
  | { t: 'reject'; reason: string }
  | { t: 'closed' };

/** 中継サーバーのチャンネルに流す形（h=部屋を作った人あて g=参加した人あて） */
export interface ToHostEnvelope {
  cid: string;
  m: ToHost;
}
export interface ToGuestEnvelope {
  /** 参加した人の端末ID。'*' なら全員あて（席番号 you は -1 にして、受け取った側が端末IDから探す） */
  to: string;
  m: ToGuest;
}

/** 部屋番号：スマホの数字キーで打ちやすい5桁 */
export function newRoomCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export function normalizeCode(s: string): string {
  return s.replace(/\D/g, '').slice(0, 5);
}

/** 参加用のリンク */
export function joinUrl(code: string): string {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('room', code);
  return u.toString();
}

/**
 * その席の人が今このアクションをしてよいか。
 * 手番の操作は手番の人だけ。結果の「次へ」は、手番の人が人間ならその人、
 * CPUや全員向けの結果（学期末・卒業式など）なら人間なら誰でも（早い者勝ち。seq で二重送信を防ぐ）
 */
export function canAct(s: GameState, seat: number, a: Action): boolean {
  const ph = s.phase;
  const me = s.players[seat];
  if (!me || me.isCpu || ph.kind === 'gameOver') return false;
  if (ph.kind === 'result') {
    if (a.type !== 'continue') return false;
    if (ph.player !== null && !s.players[ph.player].isCpu) return ph.player === seat;
    return true;
  }
  // 係決めは一斉：自分のクラスの準備OKだけ
  if (ph.kind === 'roles') return a.type === 'setRoles' && a.player === seat && !ph.ready[seat];
  return actingPlayer(s) === seat && a.type !== 'continue';
}

/** 今だれの操作を待っているか（CPUの番や、CPU・全員向けの結果、一斉の係決めなら null） */
export function waitingOn(s: GameState): number | null {
  const ph = s.phase;
  if (ph.kind === 'gameOver' || ph.player === null) return null;
  return s.players[ph.player].isCpu ? null : ph.player;
}

/** その人の操作を待って止まっているか（一斉の係決めでは、まだ準備OKでない人間みんな） */
export function waitsFor(s: GameState, seat: number): boolean {
  const ph = s.phase;
  if (ph.kind === 'roles') return !s.players[seat].isCpu && !ph.ready[seat];
  return waitingOn(s) === seat;
}

/** 端末ID（この端末でずっと同じ。つなぎ直した時に同じ席へ戻るため） */
export function clientId(): string {
  const KEY = 'jikuu-saikyou-cid';
  try {
    const v = localStorage.getItem(KEY);
    if (v) return v;
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

const NAME_KEY = 'jikuu-saikyou-name';
export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}
export function saveName(n: string) {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {
    /* 保存できない環境では何もしない */
  }
}
