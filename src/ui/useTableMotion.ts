import { useLayoutEffect, useRef, type RefObject } from 'react';

/*
 * 卓の上のカードの動き（山札から場へ配る・場から捨て札や教室へ飛ぶ・転入・転校・装備）。
 * 描き直すたびに卓のカードの位置を覚えておき、前の描画から増えた・減った・動いたカードを
 * Web Animations API で短く動かす（ゲームの状態には触らないので、テンポは変わらない）。
 */

type Rect = { x: number; y: number; w: number; h: number };

interface Snap {
  /** 手前の教室の持ち主（変わったら＝ホットシートで席が替わったら、動きは出さない） */
  near: string | null;
  market: Map<string, { rect: Rect; el: Element }>;
  students: Map<string, { rect: Rect; el: Element }>;
  /** グッズを装備している子（uid → グッズの絵文字） */
  goods: Map<string, string>;
  /** 相手の席（pid → 生徒の数・位置） */
  opps: Map<string, { n: number; rect: Rect; el: Element }>;
  piles: Record<'deck' | 'discard' | 'pool', Rect | null>;
}

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
const shown = (r: Rect | null | undefined): r is Rect => !!r && r.w > 0 && r.h > 0;
/** 自分が動かしている途中のカード（位置を測り直さない） */
const moving = (el: Element) => el.getAnimations().some((a) => a.id === 'motion');

/** カードの位置を測る。見えていない（めくったカードを見せている間の場など）カードは前の位置を使う */
function snapshot(root: HTMLElement, prev: Snap | null): Snap {
  const keep = (map: Map<string, { rect: Rect; el: Element }> | undefined, key: string, el: Element) => {
    const old = map?.get(key);
    const r = rectOf(el);
    return { rect: shown(r) && !moving(el) ? r : (old?.rect ?? r), el };
  };
  const market = new Map<string, { rect: Rect; el: Element }>();
  root.querySelectorAll('.market [data-mk]').forEach((el) => market.set(el.getAttribute('data-mk')!, keep(prev?.market, el.getAttribute('data-mk')!, el)));
  const mat = root.querySelector('.near-seat .playmat');
  const students = new Map<string, { rect: Rect; el: Element }>();
  const goods = new Map<string, string>();
  mat?.querySelectorAll('.floor .tcg[data-uid]').forEach((el) => {
    const uid = el.getAttribute('data-uid')!;
    students.set(uid, keep(prev?.students, uid, el));
    const g = el.querySelector(':scope > .tcg-goods');
    if (g) goods.set(uid, g.textContent ?? '');
  });
  const opps = new Map<string, { n: number; rect: Rect; el: Element }>();
  root.querySelectorAll('.opp[data-pid]').forEach((el) => opps.set(el.getAttribute('data-pid')!, { n: Number(el.getAttribute('data-n')), rect: rectOf(el), el }));
  const pile = (sel: string, old: Rect | null | undefined) => {
    const el = root.querySelector(sel);
    const r = el ? rectOf(el) : null;
    return shown(r) ? r : (old ?? null);
  };
  return {
    near: mat?.getAttribute('data-pid') ?? null,
    market,
    students,
    goods,
    opps,
    piles: {
      deck: pile('.event-pile', prev?.piles.deck),
      discard: pile('.pile.discard', prev?.piles.discard),
      pool: pile('.modern-pile, .era-pile', prev?.piles.pool),
    },
  };
}

/** 場の見分けが人物カードか（'person:<id>@<n>'） */
const isPerson = (k: string) => k.startsWith('person:');

const EASE_OUT = 'cubic-bezier(.2,.8,.3,1)';
const EASE_IN = 'cubic-bezier(.5,0,.75,.4)';
const BOUNCE = 'cubic-bezier(.3,1.5,.5,1)';

/** a から b へ動かす変形（左上をそろえ、大きさも合わせる） */
const from = (a: Rect, b: Rect) => `translate(${a.x - b.x}px, ${a.y - b.y}px) scale(${a.w / b.w}, ${a.h / b.h})`;

function play(el: Element, frames: Keyframe[], ms: number, easing: string, delay = 0) {
  return el.animate(frames, { duration: ms, easing, delay, fill: 'backwards', id: 'motion' });
}

/** 消えたカードの写しを、元の位置から dest へ飛ばす（dest がなければその場で浮いて消える） */
function ghost(layer: HTMLElement, src: Element, at: Rect, dest: Rect | null, ms: number, delay = 0) {
  const g = src.cloneNode(true) as HTMLElement;
  g.classList.remove('selected', 'dim', 'lit');
  Object.assign(g.style, { position: 'fixed', left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px`, margin: '0', transformOrigin: '0 0' });
  layer.appendChild(g);
  const end = dest
    ? { transform: `translate(${dest.x - at.x}px, ${dest.y - at.y}px) scale(${dest.w / at.w}, ${dest.h / at.h})`, opacity: 0.2 }
    : { transform: 'translate(0, -28px) scale(0.85)', opacity: 0 };
  const a = g.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.7 }, end], { duration: ms, easing: EASE_IN, delay, fill: 'both' });
  a.onfinish = a.oncancel = () => g.remove();
}

/** 卓のカードの動きをつける。speed は CPUの「速い」設定（1より小さいと短くなる） */
export function useTableMotion(root: RefObject<HTMLElement>, speed = 1) {
  const last = useRef<Snap | null>(null);
  const layer = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = document.createElement('div');
    el.className = 'motion-layer';
    document.body.appendChild(el);
    layer.current = el;
    return () => {
      el.remove();
      layer.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const r = root.current;
    if (!r || !layer.current) return;
    const prev = last.current;
    const now = snapshot(r, prev);
    last.current = now;
    if (!prev || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ms = (n: number) => Math.round(n * speed);
    const L = layer.current;

    // ---- 場 ----
    // 場から消えたカード：転入した子・めくったカード・捨て札・取った人の席のどこかへ
    const gone = [...prev.market].filter(([k]) => !now.market.has(k));
    const added = [...now.market].filter(([k]) => !prev.market.has(k));
    const newStudents = prev.near === now.near ? [...now.students].filter(([k]) => !prev.students.has(k)) : [];
    const newGoods = prev.near === now.near ? [...now.goods].filter(([k, g]) => prev.students.has(k) && prev.goods.get(k) !== g) : [];
    const grown = [...now.opps].filter(([k, o]) => o.n > (prev.opps.get(k)?.n ?? o.n));
    const reveal = r.querySelector('.reveal .ecard');
    /** 場から教室へ入った人物カード・装備したグッズの元の位置（その子をここから飛ばす） */
    let personFrom: Rect | null = null;
    let goodsFrom: Rect | null = null;
    for (const [k, { rect, el }] of gone) {
      if (!shown(rect)) continue;
      if (isPerson(k) && newStudents.length) {
        personFrom = rect;
        continue;
      }
      if (newGoods.length && !isPerson(k)) {
        goodsFrom = rect;
        continue;
      }
      const dest =
        isPerson(k) && grown.length ? grown[0][1].rect
        : reveal && !isPerson(k) ? rectOf(reveal)
        : now.piles.discard;
      ghost(L, el, rect, dest, ms(340));
    }
    // 山札から配る（何枚も来たら少しずつずらす）
    added.forEach(([, { rect, el }], i) => {
      const deck = now.piles.deck;
      if (!deck || !shown(rect)) return;
      play(el, [{ transform: from(deck, rect), opacity: 0.4 }, { transform: 'none', opacity: 1 }], ms(300), EASE_OUT, ms(i * 70 + (gone.length ? 120 : 0)));
    });
    // 詰めて動いたカード
    for (const [k, { rect, el }] of now.market) {
      const old = prev.market.get(k)?.rect;
      if (!old || !shown(old) || !shown(rect) || (Math.abs(old.x - rect.x) < 2 && Math.abs(old.y - rect.y) < 2)) continue;
      play(el, [{ transform: `translate(${old.x - rect.x}px, ${old.y - rect.y}px)` }, { transform: 'none' }], ms(200), EASE_OUT);
    }

    // 相手の席：生徒が増えた・減ったら名札を弾ませる
    for (const [k, o] of now.opps) {
      const n = prev.opps.get(k)?.n;
      if (n === undefined || n === o.n) continue;
      o.el.animate([{ transform: 'none' }, { transform: `scale(${o.n > n ? 1.08 : 0.94})` }, { transform: 'none' }], { duration: ms(260), delay: ms(o.n > n ? 260 : 0), easing: 'ease-out' });
    }

    if (prev.near !== now.near) return;

    // ---- 手前の教室 ----
    // 転入：場の人物カード・生徒の山・相手の席（クラス替え）から飛んでくる。どこからでもなければ、その場でぽんと出る
    const shrunk = [...now.opps].filter(([k, o]) => o.n < (prev.opps.get(k)?.n ?? o.n));
    newStudents.forEach(([, { rect, el }], i) => {
      const src = personFrom ?? (shrunk.length ? shrunk[0][1].rect : null) ?? (r.querySelector('.modern-pile') ? now.piles.pool : null);
      if (src && shown(rect)) {
        play(el, [{ transform: from(src, rect), opacity: 0.6 }, { transform: 'none', opacity: 1 }], ms(340), EASE_OUT, ms(i * 60));
      } else {
        play(el, [{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], ms(280), BOUNCE, ms(i * 60));
      }
      el.animate([{ boxShadow: '0 0 0 4px rgba(246,216,96,0.9), 0 0 22px rgba(246,216,96,0.8)' }, { boxShadow: '0 0 0 0 rgba(246,216,96,0)' }], { duration: ms(600), delay: ms(300 + i * 60), easing: 'ease-out' });
    });
    // 転校：写しが浮いて消える（クラス替えなら相手の席へ）
    for (const [k, { rect, el }] of prev.students) {
      if (now.students.has(k) || !shown(rect)) continue;
      ghost(L, el, rect, grown.length ? grown[0][1].rect : null, ms(380));
    }
    // 係決め・席の詰め直しで動いた子
    for (const [k, { rect, el }] of now.students) {
      const old = prev.students.get(k)?.rect;
      if (!old || !shown(old) || !shown(rect) || (Math.abs(old.x - rect.x) < 2 && Math.abs(old.y - rect.y) < 2)) continue;
      play(el, [{ transform: `translate(${old.x - rect.x}px, ${old.y - rect.y}px)` }, { transform: 'none' }], ms(220), EASE_OUT);
    }
    // 装備：グッズが場のカードの位置から子の左上へ飛んで付き、カードが少し跳ねる
    for (const [uid] of newGoods) {
      const card = now.students.get(uid)?.el;
      const badge = card?.querySelector(':scope > .tcg-goods');
      if (!card || !badge) continue;
      const b = rectOf(badge);
      const src = goodsFrom ?? { x: b.x - 6, y: b.y - 40, w: b.w * 2.2, h: b.h * 2.2 };
      const fly = ms(goodsFrom ? 360 : 260);
      play(badge, [{ transform: `translate(${src.x + src.w / 2 - (b.x + b.w / 2)}px, ${src.y + src.h / 2 - (b.y + b.h / 2)}px) scale(2.4)`, opacity: 0.5 }, { transform: 'none', opacity: 1 }], fly, EASE_OUT);
      card.animate([{ transform: 'none' }, { transform: 'scale(1.08) rotate(-2deg)' }, { transform: 'none' }], { duration: ms(240), delay: fly, easing: 'ease-out' });
    }
  });
}

