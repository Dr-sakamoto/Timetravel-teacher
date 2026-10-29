import { useLayoutEffect, useRef, type RefObject } from 'react';

/** 場のカードに付ける、並び替えても変わらない key（新しく出たカードを見分けるのにも使う） */
interface Keyed {
  market: string[];
  keys: string[];
  fresh: Set<string>;
}

let serial = 0;

/**
 * 前の場と今の場を見比べて、カードごとの key を決める。
 * 場は「取られたカードが抜けて左に詰まり、山札からめくったカードが右の空きに足される」ので、
 * 前の場の並びを順に当てていき、当たらなかったものを山札から来たカードとみなす。
 */
function rekey(prev: Keyed, market: string[]): Keyed {
  const keys: string[] = [];
  const fresh = new Set<string>();
  let j = 0;
  for (const id of market) {
    let k = j;
    while (k < prev.market.length && prev.market[k] !== id) k++;
    if (k < prev.market.length) {
      keys.push(prev.keys[k]);
      j = k + 1;
    } else {
      const key = `m${++serial}`;
      keys.push(key);
      fresh.add(key);
    }
  }
  return { market, keys, fresh };
}

/** 山札から場の空きまでの道のり（px）と、山札と場のカードの大きさの比 */
interface Path {
  dx: number;
  dy: number;
  s: number;
}

/** めくり方の1パターン：カードの動き・裏面の見え方・1枚の時間・続けてめくる間隔（ms） */
interface DealStyle {
  name: string;
  card: (p: Path) => Keyframe[];
  /** 裏面が消える（表にめくれる）タイミング（0〜1） */
  flipAt: number;
  ms: number;
  gap: number;
  easing: string;
}

const P = 'perspective(700px)';

/** めくり方は3パターン。URL の ?deal=1〜3 で選ぶ（省略時は1） */
export const DEAL_STYLES: DealStyle[] = [
  {
    // 1. 山札から飛びながら、途中でくるっと表にめくれる
    name: '飛びながらめくる',
    card: ({ dx, dy, s }) => [
      { transform: `${P} translate(${dx}px, ${dy}px) scale(${s}) rotateY(180deg)`, offset: 0 },
      { transform: `${P} translate(${dx * 0.35}px, ${dy * 0.35 - 18}px) scale(1.08) rotateY(90deg)`, offset: 0.55 },
      { transform: `${P} translate(0, 0) scale(1) rotateY(0deg)`, offset: 1 },
    ],
    flipAt: 0.55,
    ms: 520,
    gap: 110,
    easing: 'cubic-bezier(.3,.7,.3,1)',
  },
  {
    // 2. 裏向きのまま空きまで滑らせて置き、その場で持ち上げて表にめくる（紙のゲームで配る感じ）
    name: '置いてからめくる',
    card: ({ dx, dy, s }) => [
      { transform: `${P} translate(${dx}px, ${dy}px) scale(${s}) rotateY(180deg)`, offset: 0, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: `${P} translate(0, 0) scale(1) rotateY(180deg)`, offset: 0.5 },
      { transform: `${P} translate(0, -14px) scale(1.1) rotateY(90deg)`, offset: 0.75 },
      { transform: `${P} translate(0, 0) scale(1) rotateY(0deg)`, offset: 1 },
    ],
    flipAt: 0.75,
    ms: 760,
    gap: 170,
    easing: 'ease-in-out',
  },
  {
    // 3. 山札から高く放り上げられ、回りながら空きに落ちて、ぽんと弾む
    name: '放り上げて弾む',
    card: ({ dx, dy, s }) => [
      { transform: `${P} translate(${dx}px, ${dy}px) scale(${s}) rotateZ(0deg) rotateY(180deg)`, offset: 0, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: `${P} translate(${dx * 0.45}px, ${Math.min(dy, 0) - 90}px) scale(1.15) rotateZ(-12deg) rotateY(90deg)`, offset: 0.45, easing: 'cubic-bezier(.5,0,.8,.5)' },
      { transform: `${P} translate(0, 0) scale(1.08, 0.9) rotateZ(4deg) rotateY(0deg)`, offset: 0.78 },
      { transform: `${P} translate(0, -10px) scale(0.98, 1.04) rotateZ(-1deg) rotateY(0deg)`, offset: 0.9 },
      { transform: `${P} translate(0, 0) scale(1) rotateZ(0deg) rotateY(0deg)`, offset: 1 },
    ],
    flipAt: 0.45,
    ms: 720,
    gap: 150,
    easing: 'linear',
  },
];

function dealStyle(): DealStyle {
  const n = Number(new URLSearchParams(location.search).get('deal'));
  return DEAL_STYLES[n >= 1 && n <= DEAL_STYLES.length ? n - 1 : 0];
}

/**
 * 山札をめくって場の空きにカードを足すアニメーション。
 * 新しく出たカードは山札の位置から裏向きで出てきて、場の空きで表にめくれる（めくり方は DEAL_STYLES）。
 * 残っているカードは、抜けた所を詰めるように滑らせる。
 * 返す keys を場のカードの key と data-mkey に使う。
 */
export function useDealAnimation(market: string[], marketRef: RefObject<HTMLElement>) {
  const keyed = useRef<Keyed>({ market: [], keys: [], fresh: new Set() });
  // 同じ場（StrictMode の二度目の描画など）なら同じ key を返す
  if (keyed.current.market !== market) keyed.current = rekey(keyed.current, market);
  const { keys } = keyed.current;
  /** 前に描いたときの各カードの位置（詰める動きに使う。選択やホバーで浮いた分は数えない） */
  const spots = useRef(new Map<string, { x: number; y: number }>());

  useLayoutEffect(() => {
    const box = marketRef.current;
    // 場が隠れている間（めくったカードを見せている間）は位置を測れないので、隠れる前の位置を覚えたままにする
    if (!box || box.offsetParent === null) return;
    const prevSpots = spots.current;
    spots.current = new Map();
    const { fresh } = keyed.current;
    const cards = Array.from(box.querySelectorAll<HTMLElement>(':scope > [data-mkey]'));
    for (const el of cards) spots.current.set(el.dataset.mkey!, { x: el.offsetLeft, y: el.offsetTop });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // 山札は場と同じ卓（.board）にある
    const pile = box.closest('.board')?.querySelector('.era-pile')?.getBoundingClientRect();
    const style = dealStyle();
    let order = 0;
    for (const el of cards) {
      const key = el.dataset.mkey!;
      if (fresh.has(key)) {
        if (!pile) continue;
        const to = el.getBoundingClientRect();
        const dx = pile.left + pile.width / 2 - (to.left + to.width / 2);
        const dy = pile.top + pile.height / 2 - (to.top + to.height / 2);
        const path = { dx, dy, s: pile.width / to.width };
        const delay = order++ * style.gap;
        el.animate(style.card(path), { duration: style.ms, delay, easing: style.easing, fill: 'backwards' });
        // 値段などカードからはみ出す札は、表にめくれるまで隠す
        el.classList.add('dealing');
        setTimeout(() => el.classList.remove('dealing'), delay + style.ms * style.flipAt);
        // めくれるまでは裏面（山札の絵柄）を見せる
        el.querySelector<HTMLElement>(':scope > .mcard-back')?.animate(
          [{ opacity: 1 }, { opacity: 1, offset: style.flipAt }, { opacity: 0, offset: style.flipAt + 0.01 }, { opacity: 0 }],
          { duration: style.ms, delay, fill: 'both' },
        );
      } else {
        const from = prevSpots.get(key);
        const to = spots.current.get(key)!;
        if (!from) continue;
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
      }
    }
    // 次の描画では「新しいカード」ではなくなる
    keyed.current = { ...keyed.current, fresh: new Set() };
    // 場が隠れていた間に足されたカードは、場が見えた描画でめくるので、描画のたびに確かめる
  });

  return keys;
}
