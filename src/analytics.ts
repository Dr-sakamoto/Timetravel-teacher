import { inject, pageview, track as vercelTrack } from '@vercel/analytics';

/**
 * 遊んだ人の流れの計測（Vercel Web Analytics）。
 * 来訪 → ゲーム開始 → 1学期を終えた → 最後まで遊んだ → 次のゲームを始めた、を数える。
 * カスタムイベント（track）は Vercel の有料プランでしか見られないので、無料プランでも
 * 「ページ」の一覧で数を見られるように、同じできごとを仮想ページ /f/<名前> の表示としても送る。
 * Vercel 以外（GitHub Pages・開発サーバー）では何も送らない。
 */

type Props = Record<string, string | number | boolean>;

const enabled = typeof location !== 'undefined' && /(^|\.)vercel\.app$|^timetravel-teacher\./.test(location.hostname);

let started = false;
export function initAnalytics() {
  if (!enabled || started) return;
  started = true;
  inject({ mode: 'production' });
}

export function track(name: string, props?: Props) {
  if (!enabled) return;
  try {
    vercelTrack(name, props);
    pageview({ route: `/f/${name}`, path: `/f/${name}` });
  } catch {
    /* 計測できなくても遊ぶのには関係ない */
  }
}

const PLAYS_KEY = 'timetravel-teacher-plays';

/** この端末で最後まで遊んだ回数 */
export function finishedPlays(): number {
  try {
    return Number(localStorage.getItem(PLAYS_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** ゲームを始めた（2回目以降なら「次のゲームを始めた」も数える） */
export function trackGameStart(mode: 'trial' | 'local' | 'online-host' | 'online-guest', props: Props = {}) {
  const plays = finishedPlays();
  track('game_start', { mode, plays, ...props });
  if (plays > 0) track('replay', { mode });
}

/** 最後まで遊んだ（同じゲームで何度も数えないよう、ゲームごとの印で1回だけ） */
const finishedGames = new Set<string>();
export function trackGameFinish(gameKey: string, props: Props = {}) {
  if (finishedGames.has(gameKey)) return;
  finishedGames.add(gameKey);
  try {
    localStorage.setItem(PLAYS_KEY, String(finishedPlays() + 1));
  } catch {
    /* 保存できない環境では数えない */
  }
  track('game_finish', props);
}
