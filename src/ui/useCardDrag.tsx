import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/** ドラッグ中のカード（指／マウスに付いてくる） */
export interface DragState {
  uid: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 今カードを重ねている置き場（data-drop の値） */
  over: string | null;
}

/** ドラッグを始めるまでに動かす距離（これより短いとタップ扱い） */
const SLOP = 8;

/**
 * プレイマットのカードを指やマウスでつかんで動かす。
 * 置き場は data-drop 属性を持つ要素（一番内側のもの）。離した所の data-drop を onDrop に渡す
 */
export function useCardDrag(onDrop: (uid: string, to: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const cur = useRef<DragState | null>(null);
  const start = useRef<{ uid: string; x: number; y: number; dx: number; dy: number; w: number; h: number; id: number } | null>(null);
  /** ドラッグの直後に来るクリックを無視する */
  const justDragged = useRef(false);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  useEffect(() => {
    const targetAt = (x: number, y: number) =>
      (document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null)?.dataset.drop ?? null;
    const set = (d: DragState | null) => {
      cur.current = d;
      setDrag(d);
    };
    const move = (e: PointerEvent) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      if (!cur.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) < SLOP) return;
      set({ uid: s.uid, x: e.clientX - s.dx, y: e.clientY - s.dy, w: s.w, h: s.h, over: targetAt(e.clientX, e.clientY) });
    };
    const up = (e: PointerEvent) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      start.current = null;
      const d = cur.current;
      if (!d) return;
      set(null);
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
      const to = e.type === 'pointerup' ? targetAt(e.clientX, e.clientY) : null;
      if (to) dropRef.current(d.uid, to);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const grab = (uid: string) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    start.current = { uid, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, id: e.pointerId };
  };

  return { drag, grab, wasDrag: () => justDragged.current };
}
