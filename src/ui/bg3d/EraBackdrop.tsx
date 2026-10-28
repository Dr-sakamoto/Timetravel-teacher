import { useEffect, useRef, useState } from 'react';
import { ERAS } from '../../game/data/eras';
import { currentEra } from '../../game/engine';
import type { GameState } from '../../game/types';
import type { Backdrop } from './engine';
import type { Cue } from './kit';

const PREF_KEY = 'ttt.bg3d';

/** 3Dの背景を出すか（端末ごとに覚える。動きを減らす設定の端末では、はじめは出さない） */
export function useBackdropPref(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    try {
      const v = localStorage.getItem(PREF_KEY);
      if (v) return v === 'on';
    } catch {
      // 保存できない端末でも、出すかどうかの初期値だけで動く
    }
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  });
  const toggle = () =>
    setOn((v) => {
      try {
        localStorage.setItem(PREF_KEY, v ? 'off' : 'on');
      } catch {
        // 覚えられなくても、今の画面では切り替わる
      }
      return !v;
    });
  return [on, toggle];
}

/** ゲームの状態から、背景に伝える様子を取り出す */
function cueOf(s: GameState): Cue {
  const py = s.pyramid;
  const stones = py ? py.stones.reduce((a, b) => a + b, 0) : 0;
  return {
    era: ERAS[currentEra(s)].id,
    pyramid: py ? { progress: py.need ? Math.min(1, stones / py.need) : 0, done: py.done } : null,
    kaguya: s.kaguya ? { offered: s.kaguya.filter((x) => x.by !== null).length, total: s.kaguya.length } : null,
    patent: s.patent !== undefined,
    sunflower: s.sunflower?.length ?? 0,
    oath: !!s.oath,
    plague: s.players.some((p) => p.students.some((x) => x.plague)),
  };
}

/** めくられたイベントの演出のキー（時代イベントのカードID。卒業式・進級は 'graduation'） */
function eventKey(s: GameState): string | null {
  if (s.phase.kind !== 'result') return null;
  const r = s.phase.result;
  if (r.art && (r.tone === 'era' || r.art === 'kaguya')) return r.art;
  if (r.tone === 'fixed' && (r.icon === '🎓' || r.icon === '🌸')) return 'graduation';
  return null;
}

/** 卓の後ろに敷く、時代ごとの3Dの風景（three.js は使うときだけ読み込む） */
export function EraBackdrop({ state }: { state: GameState }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bd, setBd] = useState<Backdrop | null>(null);
  const [failed, setFailed] = useState(false);
  const fired = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let made: Backdrop | null = null;
    import('./engine')
      .then(({ Backdrop }) => {
        if (!alive || !canvas.current) return;
        made = new Backdrop(canvas.current);
        setBd(made);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      made?.dispose();
    };
  }, []);

  // 卓の緑の部分にぴったり重ねる（スマホ横向きでは .felt の箱が消え、外枠の .table-wrap が卓になる）
  useEffect(() => {
    const c = canvas.current;
    const wrap = c?.parentElement;
    if (!c || !wrap) return;
    const table = () => {
      const felt = wrap.querySelector<HTMLElement>('.felt');
      return felt && getComputedStyle(felt).display !== 'contents' ? felt : wrap;
    };
    let watched: HTMLElement | null = null;
    const ro = new ResizeObserver(() => place());
    const place = () => {
      const el = table();
      if (el !== watched) {
        if (watched) ro.unobserve(watched);
        ro.observe(el);
        watched = el;
      }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      c.style.left = `${r.left + el.clientLeft}px`;
      c.style.top = `${r.top + el.clientTop}px`;
      c.style.width = `${el.clientWidth}px`;
      c.style.height = `${el.clientHeight}px`;
      c.style.borderRadius = `${Math.max(0, parseFloat(cs.borderTopLeftRadius) - el.clientLeft)}px`;
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, []);

  const cue = cueOf(state);
  const cueKey = JSON.stringify(cue);
  useEffect(() => {
    bd?.update(cue);
  }, [bd, cueKey]);

  // 同じ結果を何度も受け取っても（通信対戦で状態が届き直しても）、演出は1回だけ
  const key = eventKey(state);
  const fireId = key ? `${state.logCounter}:${key}` : null;
  useEffect(() => {
    if (!bd || !fireId || !key || fired.current === fireId) return;
    fired.current = fireId;
    bd.fire(key);
  }, [bd, fireId, key]);

  if (failed) return null;
  return <canvas ref={canvas} className="bg3d" aria-hidden="true" />;
}
