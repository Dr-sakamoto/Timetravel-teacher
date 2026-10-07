import * as cards from './data/cards';
import * as eras from './data/eras';
import * as events from './data/events';
import * as modern from './data/modern';
import * as roles from './data/roles';

/**
 * 保存データの形（GameState の項目）の版。
 * 項目の名前や意味を変えて、前の版の保存データが読めなくなるときだけ手で上げる（任意の項目を足すだけなら上げなくてよい）。
 * 人物・イベント・グッズ・時代などのデータを変えたときは、下の DATA_HASH が自動で変わるので上げなくてよい
 */
export const SAVE_SCHEMA = 27;

/** 遊び方に関わらない文章（名前・説明・時代の空気など）。直しても保存データはそのまま読めるので、指紋に入れない */
const TEXT_KEYS = new Set(['name', 'title', 'flavor', 'desc', 'motto', 'when']);

/** データの指紋（FNV-1a 32bit を36進数で）。カードのID・アイコン・効果・枚数などが変わると変わる */
export function fingerprint(data: unknown): string {
  const json = JSON.stringify(data, (k, v) => (TEXT_KEYS.has(k) ? undefined : v));
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** データの指紋。人物・イベント・グッズ・時代・係・現代の生徒のどれかが変わると変わる */
export const DATA_HASH = fingerprint({ cards, eras, events, modern, roles });

/** 保存データの版。読み込むときにこれと違えば、前の版のデータとして捨てる */
export const SAVE_VERSION = `${SAVE_SCHEMA}-${DATA_HASH}`;
