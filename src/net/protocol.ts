import { actingPlayer } from '../game/engine';
import type { Action, GameState } from '../game/types';

export const MAX_SEATS = 5;
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
}

export interface Lobby {
  seats: Seat[];
  years: number;
}

/** 参加した人 → 部屋を作った人 */
export type ToHost =
  | { t: 'hello'; cid: string; name: string }
  | { t: 'rename'; name: string }
  | { t: 'action'; seq: number; action: Action }
  | { t: 'ping'; seq: number }
  | { t: 'sync' };

/** 部屋を作った人 → 参加した人 */
export type ToGuest =
  | { t: 'lobby'; lobby: Lobby; you: number }
  | { t: 'state'; seq: number; state: GameState; you: number; seats: Seat[] }
  | { t: 'pong'; seq: number }
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
  return actingPlayer(s) === seat && a.type !== 'continue';
}

/** 今だれの操作を待っているか（CPUの番や、CPU・全員向けの結果なら null） */
export function waitingOn(s: GameState): number | null {
  const ph = s.phase;
  if (ph.kind === 'gameOver' || ph.player === null) return null;
  return s.players[ph.player].isCpu ? null : ph.player;
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
