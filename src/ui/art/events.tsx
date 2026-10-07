import type { ReactNode } from 'react';
import { C, E, O, P, Stick } from './parts';

/*
 * イベントカードのイラスト（時代イベント・襲来・サイボーグ化）。100×72 の座標系。
 * 生徒カードと同じく、太めの茶色の線とフラットな塗りで描く。
 */

const R = ({ x, y, w, h, fill, rx = 0, sw = 1.4 }: { x: number; y: number; w: number; h: number; fill: string; rx?: number; sw?: number }) => (
  <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={O} strokeWidth={sw} />
);
/** 背景：空と地面 */
const Bg = ({ sky, ground, y = 54 }: { sky: string; ground?: string; y?: number }) => (
  <>
    <rect x={0} y={0} width={100} height={72} fill={sky} />
    {ground && <rect x={0} y={y} width={100} height={72 - y} fill={ground} />}
  </>
);
const Flame = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <P d="M0 0 C-7 -2 -8 -10 -3 -16 C-3 -11 0 -10 1 -13 C2 -18 0 -22 3 -26 C5 -19 10 -14 8 -6 C7 -2 4 0 0 0Z" fill="#ff8a3d" />
    <P d="M0 -1 C-3 -3 -3 -7 0 -10 C1 -7 4 -6 3 -3 C3 -1 1 0 0 -1Z" fill="#ffd34d" sw={1} />
  </g>
);
/** 小さな人（遠景の群衆・兵など） */
const Mini = ({ x, y, c, head = '#ffd9b8', s = 1 }: { x: number; y: number; c: string; head?: string; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <P d="M-5 10 C-5 4 -3 2 0 2 C3 2 5 4 5 10Z" fill={c} sw={1.1} />
    <C x={0} y={-2} r={4} fill={head} sw={1.1} />
  </g>
);
const Star = ({ x, y, r = 3, fill = '#ffd34d' }: { x: number; y: number; r?: number; fill?: string }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + Math.cos(a) * rr).toFixed(2)} ${(y + Math.sin(a) * rr).toFixed(2)}`;
  });
  return <P d={`M${pts.join(' L')}Z`} fill={fill} sw={1} />;
};

/** 平安の女性（正面向き。長い黒髪と十二単） */
const Hime = ({ x, y, c, c2 }: { x: number; y: number; c: string; c2: string }) => (
  <g transform={`translate(${x} ${y})`}>
    <P d="M-8 -6 C-9 -16 9 -16 8 -6 L11 14 H-11Z" fill="#1f1a1a" />
    <P d="M-12 22 C-12 10 -7 4 0 4 C7 4 12 10 12 22Z" fill={c} />
    <P d="M-4 4 L0 12 L4 4" fill={c2} sw={1} />
    <C x={0} y={-4} r={6} fill="#fff1e6" />
    <P d="M-6 -6 C-5 -11 5 -11 6 -6 C3 -8 -3 -8 -6 -6Z" fill="#1f1a1a" sw={0.8} />
    <P d="M-3 -3.5 h1.6 M1.4 -3.5 h1.6" sw={1} />
    <C x={0} y={-0.5} r={0.7} fill="#d14b6c" sw={0} />
  </g>
);

const SCENES: Record<string, () => ReactNode> = {
  // ---------- 現代 ----------
  bunkasai: () => (
    <g>
      <Bg sky="#bfe3ff" ground="#e8d9b0" />
      <P d="M8 14 Q50 4 92 14" sw={1} />
      {[14, 26, 38, 50, 62, 74, 86].map((x, i) => (
        <P key={x} d={`M${x - 4} ${12 - (i === 3 ? 2 : i % 3 === 0 ? 0 : 1)} l4 6 l4 -6Z`} fill={['#e5534b', '#f2c94c', '#3f7fd0', '#6fb35a'][i % 4]} sw={1} />
      ))}
      <R x={14} y={30} w={72} h={26} fill="#fbf4e2" />
      <P d="M10 30 L18 20 H82 L90 30Z" fill="#e5534b" />
      {[26, 42, 58, 74].map((x) => (
        <P key={x} d={`M${x - 4} 20 L${x - 8} 30 H${x + 2} L${x + 4} 20Z`} fill="#fff" sw={1} />
      ))}
      <R x={22} y={36} w={56} h={10} fill="#3f7fd0" rx={2} />
      <text x={50} y={44} textAnchor="middle" fontSize={7} fontWeight={900} fill="#fff">
        文化祭
      </text>
      <Mini x={24} y={52} c="#f2c94c" />
      <Mini x={50} y={52} c="#6fb35a" />
      <Mini x={76} y={52} c="#d97ab0" />
    </g>
  ),
  taiikusai: () => (
    <g>
      <Bg sky="#bfe6ff" ground="#c98a5a" y={44} />
      <P d="M0 12 Q50 22 100 12" sw={0.8} />
      {[8, 20, 32, 44, 56, 68, 80, 92].map((x, i) => (
        <P key={x} d={`M${x - 4} ${13 + (x < 50 ? x / 12 : (100 - x) / 12)} l4 7 l4 -7Z`} fill={['#e5534b', '#f2c94c', '#3f8fd8', '#6fb35a'][i % 4]} sw={0.8} />
      ))}
      <P d="M0 56 H100 M0 64 H100" stroke="#fbfbf7" sw={1.4} />
      <Mini x={30} y={46} c="#e5534b" s={1.3} />
      <Mini x={58} y={46} c="#3f8fd8" s={1.3} />
      <P d="M36 50 L44 48" sw={1.4} />
      <R x={43} y={46} w={6} h={3} fill="#f2c94c" rx={1} sw={1} />
      <P d="M18 44 l-6 -2 M18 48 l-7 0 M46 44 l-6 -2 M46 48 l-7 0" sw={1} />
    </g>
  ),
  seitokai: () => (
    <g>
      <Bg sky="#dff0e6" ground="#c9a978" y={56} />
      <R x={6} y={8} w={88} h={14} fill="#fbfbf7" rx={2} />
      <text x={50} y={18} textAnchor="middle" fontSize={7} fontWeight={900} fill="#2c4fa3">
        生徒会長選挙
      </text>
      <R x={30} y={34} w={40} h={26} fill="#f2f0ea" rx={2} />
      <R x={30} y={30} w={40} h={6} fill="#d9d3c4" rx={1} />
      <R x={42} y={32} w={16} h={2} fill="#4b3a2f" sw={0.5} />
      <P d="M44 32 L47 18 L59 21 L56 33Z" fill="#fff" />
      <P d="M49 23 L55 24.5 M48.5 26 L54 27.2" sw={0.9} />
      <P d="M50 46 C47 44 46 48 50 51 C54 48 53 44 50 46Z" fill="#e5534b" sw={1} />
      <Star x={50} y={52} r={0} />
      <C x={18} y={46} r={7} fill="#f2c94c" />
      <P d="M14 52 L12 62 L18 58 L22 62 L21 52" fill="#e5534b" sw={1} />
      <Star x={18} y={46} r={4} fill="#fff" />
    </g>
  ),

  shugakuryoko: () => (
    <g>
      <Bg sky="#cfe8ff" ground="#9fbf6a" y={54} />
      <P d="M44 54 L66 20 L88 54Z" fill="#7d8fc0" />
      <P d="M58 32 L66 20 L74 32 L70 30 L66 33 L62 30Z" fill="#fbfbf7" sw={1} />
      <R x={8} y={34} w={50} h={22} fill="#f2c94c" rx={5} />
      {[13, 23, 33, 43].map((x) => (
        <R key={x} x={x} y={38} w={8} h={7} fill="#cfe8ff" rx={1.5} sw={1} />
      ))}
      <R x={50} y={38} w={6} h={10} fill="#cfe8ff" rx={1.5} sw={1} />
      <P d="M8 48 H58" sw={1} />
      <C x={18} y={57} r={4.5} fill="#3a3a44" />
      <C x={48} y={57} r={4.5} fill="#3a3a44" />
      <C x={18} y={57} r={1.6} fill="#b9c2cc" sw={0.8} />
      <C x={48} y={57} r={1.6} fill="#b9c2cc" sw={0.8} />
      <Stick x1={24} y1={34} x2={24} y2={20} w={0.8} color="#7a5a3a" />
      <P d="M25 20 L35 23 L25 26Z" fill="#e5534b" sw={1} />
    </g>
  ),

  // ---------- 白亜紀 ----------
  trex_hunt: () => (
    <g>
      <Bg sky="#ffcf8a" ground="#9c7a4a" y={52} />
      <P d="M34 52 L46 22 L54 22 L66 52Z" fill="#7a5a3a" />
      <P d="M46 22 C44 16 48 12 50 8 C52 12 56 16 54 22Z" fill="#e5534b" sw={1.2} />
      <P d="M6 52 C6 40 14 34 22 36 C28 30 34 36 32 44 L30 52Z" fill="#6fb35a" />
      <C x={18} y={41} r={1.6} fill={O} sw={0} />
      <P d="M28 46 l2 3 l2 -3" fill="#fff" sw={0.9} />
      <P d="M94 52 C94 40 86 34 78 36 C72 30 66 36 68 44 L70 52Z" fill="#8d7ac8" />
      <C x={82} y={41} r={1.6} fill={O} sw={0} />
      <P d="M68 46 l2 3 l2 -3" fill="#fff" sw={0.9} />
      <P d="M36 62 C34 58 38 56 40 59 L60 59 C62 56 66 58 64 62 C66 66 62 68 60 65 L40 65 C38 68 34 66 36 62Z" fill="#fbf4e2" />
      <P d="M40 10 l3 4 M60 10 l-3 4" stroke="#e5534b" sw={1.2} />
    </g>
  ),
  meteor: () => (
    <g>
      <Bg sky="#ffb36b" ground="#7a5a3a" y={56} />
      <C x={84} y={12} r={8} fill="#fff3b0" sw={1} />
      <P d="M70 8 L40 34" stroke="#ffd34d" sw={6} />
      <P d="M70 8 L40 34" stroke="#ff8a3d" sw={3} />
      <C x={36} y={38} r={7} fill="#8a6a4a" />
      <C x={34} y={36} r={1.6} fill="#5a4a3a" sw={0} />
      <P d="M0 56 L12 48 L22 54 L34 44 L48 52 L62 46 L76 54 L90 48 L100 54 V56Z" fill="#5a4a3a" />
      <P d="M18 62 C18 58 22 56 26 58 L28 62Z M72 64 C72 60 76 58 80 60 L82 64Z" fill="#6fb35a" sw={1} />
      <P d="M60 66 l4 -2 l2 2 M64 64 l1 -3" sw={1.2} />
      <E x={62} y={66} rx={4} ry={2.4} fill="#c69c6d" sw={1} />
    </g>
  ),
  migration: () => (
    <g>
      <Bg sky="#cfe8ff" ground="#c9b06a" y={50} />
      <P d="M0 50 L20 36 L36 46 L58 30 L80 44 L100 34 V50Z" fill="#9fbf6a" />
      {[[20, 52, 0.75], [46, 51, 0.9], [70, 55, 1]].map(([x, y, k]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
          <P d="M-12 8 C-12 0 -4 -4 4 -4 C12 -4 16 2 16 8Z" fill="#7fbf7a" />
          <P d="M-12 4 C-18 4 -22 8 -24 12 C-18 10 -14 10 -10 8Z" fill="#7fbf7a" sw={1.1} />
          <P d="M10 -2 C12 -10 16 -14 20 -14 C24 -14 26 -10 24 -6 C22 -2 16 0 12 0Z" fill="#98d293" sw={1.1} />
          <P d="M18 -14 C20 -20 26 -24 32 -24 C30 -20 26 -16 22 -14Z" fill="#e8834a" sw={1} />
          <C x={20} y={-9} r={0.9} fill={O} sw={0} />
          <P d="M-6 8 V14 M8 8 V14" sw={1.6} />
        </g>
      ))}
      <P d="M88 22 C92 18 96 20 98 16" stroke="#f2c94c" sw={1.2} />
    </g>
  ),

  egg_theft: () => (
    <g>
      <Bg sky="#d9f0c0" ground="#b58a5a" y={52} />
      <E x={30} y={56} rx={18} ry={6} fill="#8a6a3a" />
      {[[22, 50], [30, 48], [38, 50]].map(([x, y]) => (
        <E key={x} x={x} y={y} rx={4.5} ry={6} fill="#fbf4e2" sw={1.1} />
      ))}
      <P d="M56 66 C56 50 64 42 74 42 C84 42 90 50 88 66Z" fill="#6aa6c9" />
      <P d="M64 44 C62 34 68 26 76 26 C84 26 88 32 86 40 C84 46 78 48 72 48Z" fill="#8cc2e0" />
      <P d="M70 28 C70 20 82 20 82 28 C80 24 72 24 70 28Z" fill="#e5534b" />
      <C x={75} y={35} r={1.4} fill={O} sw={0} />
      <P d="M62 56 C56 54 52 52 50 48" sw={1.4} />
      <E x={52} y={46} rx={5} ry={6.5} fill="#fbf4e2" sw={1.2} />
      <C x={50} y={44} r={1} fill="#a8d08d" sw={0} />
      <P d="M90 58 l6 -2 M90 62 l7 0 M90 66 l6 2" sw={1} />
    </g>
  ),

  // ---------- 古代エジプト ----------
  giza: () => (
    <g>
      <Bg sky="#ffe2a0" ground="#e8c27a" y={50} />
      <C x={84} y={12} r={7} fill="#ffb347" />
      <P d="M18 50 L42 14 L66 50Z" fill="#e8bf4f" />
      <P d="M42 14 L50 50 L66 50Z" fill="#c99a32" sw={1.2} />
      {[22, 30, 38, 46].map((y) => (
        <P key={y} d={`M${42 - (y - 14) * 0.67} ${y} H${42 + (y - 14) * 0.67}`} sw={0.8} />
      ))}
      <P d="M62 50 L76 30 L90 50Z" fill="#e8bf4f" />
      <P d="M4 50 L14 36 L24 50Z" fill="#d9ad45" />
      <P d="M30 66 L60 54" sw={1} />
      <R x={56} y={52} w={14} h={9} fill="#d8c08a" />
      <Mini x={30} y={60} c="#fbfbf7" head="#d39a68" />
      <Mini x={40} y={58} c="#fbfbf7" head="#d39a68" />
      <P d="M33 61 L56 55 M43 59 L56 56" sw={1} />
    </g>
  ),
  nile: () => (
    <g>
      <Bg sky="#bfe6f5" ground="#3d2b1f" y={44} />
      <C x={84} y={12} r={7} fill="#ffb347" />
      <P d="M0 30 C20 26 34 34 52 30 C70 26 84 32 100 28 L100 44 L0 44Z" fill="#4a90c8" />
      <P d="M6 36 C14 34 20 38 28 36 M58 34 C66 32 72 36 80 34" stroke="#bfe6f5" sw={1.1} />
      {[12, 26, 40, 54, 68, 82].map((x) => (
        <g key={x}>
          <P d={`M${x} 66 L${x} 52`} stroke="#6a9a3a" sw={1.4} />
          <E x={x - 2.5} y={52} rx={2.2} ry={4} fill="#f2c94c" sw={1} />
          <E x={x + 2.5} y={55} rx={2.2} ry={4} fill="#f2c94c" sw={1} />
        </g>
      ))}
      <Mini x={47} y={60} c="#fbfbf7" head="#d39a68" />
    </g>
  ),
  hieroglyph: () => (
    <g>
      <Bg sky="#e8d6a8" />
      <R x={12} y={6} w={76} h={60} fill="#f3e6c2" rx={3} />
      <E x={30} y={22} rx={9} ry={5} fill="#fbfbf7" />
      <C x={30} y={22} r={3} fill="#3a5a8c" sw={1} />
      <P d="M21 22 C26 16 34 16 39 22 M30 27 L28 34 C27 36 24 36 23 34 M34 27 L40 33" sw={1.4} />
      <P d="M54 14 C58 10 64 12 64 18 C64 22 60 24 56 24 L66 30" sw={1.6} />
      <C x={60} y={14} r={1} fill={O} sw={0} />
      <P d="M72 12 L72 30 M68 16 C70 12 74 12 76 16" sw={1.6} />
      <P d="M20 46 C26 40 32 52 38 46 C44 40 50 52 56 46" stroke="#3a5a8c" sw={1.6} />
      <E x={70} y={46} rx={8} ry={5} fill="none" sw={1.4} />
      <P d="M66 46 h8" sw={1.2} />
      <P d="M20 58 H80" sw={1} />
    </g>
  ),
  mummy: () => (
    <g>
      <Bg sky="#3a2f4a" ground="#6b5440" y={58} />
      <P d="M38 66 C30 52 32 20 50 10 C68 20 70 52 62 66Z" fill="#f3e6c2" />
      {[20, 28, 36, 44, 52, 60].map((y) => (
        <P key={y} d={`M${y < 30 ? 41 : 36} ${y} L${y < 30 ? 59 : 64} ${y + 3}`} stroke="#c9b48a" sw={1.2} />
      ))}
      <P d="M44 22 h4 M52 22 h4" sw={1.6} />
      <R x={10} y={42} w={12} h={16} fill="#e8bf4f" rx={3} />
      <C x={16} y={40} r={4} fill="#3f7fd0" sw={1.2} />
      <R x={78} y={44} w={14} h={14} fill="#d9a441" rx={2} />
      <P d="M78 50 h14" sw={1} />
      <Star x={85} y={36} r={3} />
      <Star x={24} y={28} r={2.4} />
    </g>
  ),

  // ---------- ギリシャ・ローマ ----------
  olympia: () => (
    <g>
      <Bg sky="#bcd8ff" ground="#d8c08a" y={52} />
      <P d="M8 22 L50 6 L92 22Z" fill="#f6f1e4" />
      <R x={8} y={22} w={84} h={5} fill="#e8e0cc" />
      {[14, 30, 46, 62, 78].map((x) => (
        <R key={x} x={x} y={27} w={8} h={25} fill="#f6f1e4" />
      ))}
      <P d="M36 46 C30 40 32 30 40 26 M64 46 C70 40 68 30 60 26" stroke="#6fb35a" sw={3.5} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <E x={36 - i * 0.6} y={44 - i * 5} rx={2.6} ry={1.4} fill="#8fcf6a" sw={0.8} rot={-40} />
          <E x={64 + i * 0.6} y={44 - i * 5} rx={2.6} ry={1.4} fill="#8fcf6a" sw={0.8} rot={40} />
        </g>
      ))}
      <P d="M38 60 C42 56 46 56 48 60" sw={1} />
      <C x={50} y={40} r={5} fill="#f2c94c" />
      <text x={50} y={42.5} textAnchor="middle" fontSize={5} fontWeight={900} fill={O}>
        1
      </text>
      <Mini x={50} y={58} c="#e5534b" head="#f0c08f" />
    </g>
  ),
  colosseum: () => (
    <g>
      <Bg sky="#ffd9a8" ground="#e2c48a" y={56} />
      {/* 円形闘技場の外壁（アーチが3段） */}
      <P d="M4 50 V18 C30 8 70 8 96 18 V50Z" fill="#e8c99a" />
      {[0, 1, 2].map((row) =>
        [12, 26, 40, 54, 68, 82].map((x) => (
          <P key={`${row}-${x}`} d={`M${x} ${46 - row * 10} V${41 - row * 10} C${x} ${37 - row * 10} ${x + 7} ${37 - row * 10} ${x + 7} ${41 - row * 10} V${46 - row * 10}`} fill="#a8754a" sw={0.9} />
        )),
      )}
      <P d="M4 26 C30 17 70 17 96 26 M4 36 C30 28 70 28 96 36" sw={1} />
      {/* 剣闘士ふたり */}
      <g>
        <Mini x={36} y={58} c="#c0392b" head="#f0c08f" />
        <P d="M41 58 L50 50" stroke="#cfd6dd" sw={2} />
        <E x={30} y={62} rx={3.5} ry={5} fill="#d9a441" sw={1} />
      </g>
      <g>
        <Mini x={64} y={58} c="#3f7fd0" head="#d39a68" />
        <P d="M59 58 L51 49" stroke="#cfd6dd" sw={2} />
        <E x={70} y={62} rx={3.5} ry={5} fill="#d9a441" sw={1} />
      </g>
      <Star x={50} y={46} r={3} />
    </g>
  ),
  socratic: () => (
    <g>
      <Bg sky="#d6e6ff" ground="#e8dcc0" y={56} />
      {[8, 22, 78, 92].map((x) => (
        <R key={x} x={x - 3} y={12} w={6} h={44} fill="#f6f1e4" sw={1.1} />
      ))}
      <R x={2} y={8} w={96} h={5} fill="#e8e0cc" sw={1.1} />
      {/* 問いかける老人（白いひげ・トーガ） */}
      <P d="M28 66 C28 50 32 44 40 44 C48 44 52 50 52 66Z" fill="#fbfbf7" />
      <C x={40} y={36} r={8} fill="#f0c08f" />
      <P d="M33 38 C33 48 47 48 47 38 C44 42 36 42 33 38Z" fill="#e8e8e8" sw={1} />
      <P d="M37 34 h1.5 M42 34 h1.5" sw={1.4} />
      <P d="M50 50 L58 42" sw={1.6} />
      {/* 考えこむ子 */}
      <P d="M62 66 C62 54 65 50 71 50 C77 50 80 54 80 66Z" fill="#6fb35a" />
      <C x={71} y={43} r={6.5} fill="#ffd9b8" />
      <P d="M68 42 h1 M73 42 h1" sw={1.3} />
      <P d="M76 50 C78 48 78 46 76 45" sw={1.1} />
      {/* ふきだし：？と！ */}
      <C x={56} y={24} r={8} fill="#fff" sw={1.2} />
      <text x={56} y={28} textAnchor="middle" fontSize={11} fontWeight={900} fill="#3f7fd0">
        ?
      </text>
      <C x={82} y={28} r={6} fill="#fff8c4" sw={1.1} />
      <text x={82} y={31.5} textAnchor="middle" fontSize={9} fontWeight={900} fill="#e5534b">
        !
      </text>
    </g>
  ),
  ostracism: () => (
    <g>
      <Bg sky="#e9e2f5" ground="#cdbf9e" y={54} />
      {[6, 86].map((x) => (
        <g key={x}>
          <R x={x} y={8} w={8} h={46} fill="#f6f1e4" />
          <P d={`M${x + 2.6} 12 V50 M${x + 5.4} 12 V50`} sw={0.6} />
          <R x={x - 2} y={4} w={12} h={4} fill="#f6f1e4" sw={1} />
        </g>
      ))}
      <P d="M38 54 C30 54 28 40 34 32 C36 28 36 24 38 22 H62 C64 24 64 28 66 32 C72 40 70 54 62 54Z" fill="#d9773b" />
      <P d="M38 22 C36 18 40 16 42 18 M62 22 C64 18 60 16 58 18" sw={1.2} />
      <P d="M36 36 H64 M35 44 H65" stroke="#2f2a2a" sw={1.6} />
      <R x={40} y={18} w={20} h={4} fill="#c0662e" sw={1} />
      {[
        [26, 14, -18],
        [70, 12, 16],
        [22, 34, 10],
        [76, 32, -12],
      ].map(([x, y, r]) => (
        <g key={x} transform={`rotate(${r} ${x} ${y})`}>
          <P d={`M${x - 8} ${y - 3} L${x + 6} ${y - 5} L${x + 8} ${y + 3} L${x - 6} ${y + 5}Z`} fill="#e8a46a" sw={1.1} />
          <P d={`M${x - 4} ${y} l2 -2 l1 3 l2 -2 l1 2`} sw={0.8} />
        </g>
      ))}
      <Mini x={50} y={62} c="#3f7fd0" s={0.9} />
      <P d="M57 62 l6 -2 M57 66 l6 1" stroke="#e5534b" sw={1.2} />
    </g>
  ),

  // ---------- 古代中国 ----------
  chibi: () => (
    <g>
      <Bg sky="#5a3a5a" ground="#2f5f8a" y={46} />
      <P d="M0 46 Q25 42 50 46 T100 46" stroke="#9be0ff" sw={1} />
      {[18, 50, 82].map((x, i) => (
        <g key={x}>
          <P d={`M${x - 14} 50 L${x + 14} 50 L${x + 10} 58 L${x - 10} 58Z`} fill="#7a5a3a" />
          <Stick x1={x} y1={50} x2={x} y2={22} w={1.2} color="#7a5a3a" />
          <P d={`M${x + 1} 24 L${x + 12} 28 L${x + 1} 40Z`} fill="#e8d6a8" sw={1.1} />
          <Flame x={x - 4} y={50} s={i === 1 ? 1.2 : 0.9} />
        </g>
      ))}
      <P d="M0 62 Q25 58 50 62 T100 62" stroke="#9be0ff" sw={1} />
      <P d="M10 6 C20 12 24 4 34 10" stroke="#ffb347" sw={1} op={0.6} />
    </g>
  ),

  sangu: () => (
    <g>
      <Bg sky="#e3eef6" ground="#f4f6f8" y={50} />
      <P d="M0 50 Q30 44 60 48 T100 46 V50 H0Z" fill="#cfe0c4" sw={1} />
      <P d="M50 22 L80 34 L20 34Z" fill="#c9a86a" />
      <P d="M28 31 l6 -3 M40 27 l6 -3 M58 27 l6 3 M68 31 l6 3" sw={0.8} />
      <R x={26} y={34} w={48} h={20} fill="#e8d6a8" />
      <R x={44} y={40} w={12} h={14} fill="#7a5a3a" />
      <R x={30} y={38} w={9} h={7} fill="#fbf4e2" sw={1} />
      {[10, 17, 24].map((x, i) => (
        <g key={x}>
          <Mini x={x - 4} y={56} c={['#3f7fd0', '#2f8a4c', '#3a3a44'][i]} s={0.8} />
          <text x={x - 4} y={70} textAnchor="middle" fontSize={5} fontWeight={900} fill="#7a5a3a">
            {i + 1}
          </text>
        </g>
      ))}
      <P d="M84 12 C88 8 94 10 92 16" sw={1} op={0.5} />
    </g>
  ),
  changban: () => (
    <g>
      <Bg sky="#ffe2b8" ground="#4f8fc8" y={48} />
      <P d="M0 56 Q25 52 50 56 T100 56 M0 66 Q25 62 50 66 T100 66" stroke="#bfe6ff" sw={1} />
      <P d="M14 46 Q50 30 86 46 L86 50 Q50 36 14 50Z" fill="#a9763f" />
      <P d="M24 44 V54 M40 38 V52 M60 38 V52 M76 44 V54" sw={1.6} />
      <Mini x={50} y={26} c="#3a3a44" s={1.3} />
      <Stick x1={58} y1={34} x2={70} y2={8} w={1.6} color="#7a5a3a" />
      <P d="M68 6 L74 4 L72 10Z" fill="#cfd8dc" sw={1} />
      <P d="M40 18 L30 14 M40 22 L28 22 M40 26 L30 30" stroke="#e5534b" sw={1.6} />
      {[6, 14, 92, 84].map((x, i) => (
        <Mini key={x} x={x} y={36 + (i % 2) * 4} c="#7a7aa0" s={0.6} />
      ))}
    </g>
  ),
  taoyuan: () => (
    <g>
      <Bg sky="#fde4ec" ground="#a8d08d" y={54} />
      {[16, 50, 84].map((x) => (
        <g key={x}>
          <Stick x1={x} y1={54} x2={x} y2={30} w={2.2} color="#7a5a3a" />
          <C x={x} y={24} r={13} fill="#f7b6c8" />
          {[-6, 0, 6].map((d) => (
            <C key={d} x={x + d} y={22 + (d === 0 ? -4 : 2)} r={1.6} fill="#e5534b" sw={0.8} />
          ))}
        </g>
      ))}
      <Mini x={36} y={50} c="#3f7fd0" />
      <Mini x={50} y={52} c="#2f8a4c" />
      <Mini x={64} y={50} c="#3a3a44" />
      <P d="M40 46 L46 42 M50 46 L50 41 M60 46 L54 42" sw={1.2} />
      <C x={50} y={40} r={1.8} fill="#f2c94c" sw={1} />
      <P d="M30 62 l1 -2 l1 2 M70 64 l1 -2 l1 2" stroke="#f7b6c8" sw={1} />
    </g>
  ),

  // ---------- 平安 ----------
  // 源氏物語：几帳の前で巻物を広げる書き手と、のぞきこむ貴族たち
  genji: () => (
    <g>
      <Bg sky="#fde4ec" ground="#c9a46a" y={54} />
      <R x={4} y={6} w={30} h={46} fill="#b58ad0" rx={1} />
      <P d="M10 6 V52 M18 6 V52 M26 6 V52" stroke="#e8d6f2" sw={1} />
      <R x={66} y={6} w={30} h={46} fill="#e57fa4" rx={1} />
      <P d="M72 6 V52 M80 6 V52 M88 6 V52" stroke="#fbd4e2" sw={1} />
      <P d="M22 60 C30 54 70 54 78 60 L76 66 C68 62 32 62 24 66Z" fill="#fbf4e2" />
      <P d="M32 59 V63 M38 58 V62 M44 58 V62 M56 58 V62 M62 58 V62 M68 59 V63" sw={0.7} />
      <C x={22} y={63} r={3} fill="#c0392b" sw={1} />
      <C x={78} y={63} r={3} fill="#c0392b" sw={1} />
      <Hime x={50} y={34} c="#7b5ea7" c2="#c9a7e8" />
      <P d="M58 46 L66 56" sw={1.4} />
      <Mini x={12} y={58} c="#3f7fd0" s={0.9} />
      <Mini x={88} y={58} c="#2f8a4c" s={0.9} />
      {[[10, 4], [90, 4], [50, 4]].map(([x, y]) => (
        <g key={x}>
          {[0, 72, 144, 216, 288].map((a) => (
            <E key={a} x={x + Math.cos((a * Math.PI) / 180) * 2} y={y + Math.sin((a * Math.PI) / 180) * 2} rx={1.6} ry={1.1} fill="#f7b6cc" sw={0.5} rot={a} />
          ))}
        </g>
      ))}
    </g>
  ),
  // かぐや姫の難題：月夜の竹林で、かぐや姫が5つの宝を並べて見せる
  kaguya: () => (
    <g>
      <Bg sky="#1f2b4a" ground="#3f5a3a" y={56} />
      <C x={50} y={16} r={11} fill="#fff3b0" />
      {[[10, 10], [24, 6], [80, 8], [92, 18]].map(([x, y]) => (
        <Star key={`${x}`} x={x} y={y} r={1.5} fill="#fff3b0" />
      ))}
      {[6, 16, 84, 94].map((x) => (
        <g key={x}>
          <R x={x - 2.5} y={8} w={5} h={50} fill="#6fb35a" sw={1} />
          <P d={`M${x - 2.5} 20 h5 M${x - 2.5} 32 h5 M${x - 2.5} 44 h5`} sw={0.8} />
        </g>
      ))}
      <Hime x={50} y={36} c="#f48fb1" c2="#fff3b0" />
      {[['🥣', 22], ['🐚', 33], ['🌿', 50], ['🔥', 67], ['🐉', 78]].map(([t, x]) => (
        <g key={t as string}>
          <C x={x as number} y={64} r={5} fill="#fbf4e2" sw={1} />
          <text x={x as number} y={66.5} textAnchor="middle" fontSize={6}>
            {t}
          </text>
        </g>
      ))}
    </g>
  ),
  // 五条大橋の弁慶：橋の上で薙刀を構える弁慶と、欄干に跳び乗る牛若丸
  gojo: () => (
    <g>
      <Bg sky="#2a3558" ground="#2f5f8a" y={52} />
      <C x={84} y={12} r={7} fill="#fff3b0" />
      <P d="M0 46 Q50 34 100 46 L100 52 Q50 40 0 52Z" fill="#a0683a" />
      <P d="M0 40 Q50 28 100 40" sw={1.6} />
      {[10, 30, 50, 70, 90].map((x) => (
        <P key={x} d={`M${x} ${40 - 12 * Math.sin((x / 100) * Math.PI) * 0.9} V${46 - 12 * Math.sin((x / 100) * Math.PI) * 0.9}`} sw={1.4} />
      ))}
      <P d="M0 60 Q25 56 50 60 T100 60" stroke="#9be0ff" sw={1} />
      <P d="M28 44 C28 32 32 26 38 26 C44 26 48 32 48 44Z" fill="#2b2b2b" />
      <P d="M30 22 C30 12 46 12 46 22 C46 26 30 26 30 22Z" fill="#f6f1e4" />
      <C x={38} y={23} r={4.5} fill="#e0a878" />
      <Stick x1={20} y1={44} x2={54} y2={8} w={1.4} color="#7a5a3a" />
      <P d="M54 8 C58 4 62 6 60 10 Z" fill="#d0d6dc" sw={1} />
      <g transform="translate(70 22) rotate(-15)">
        <P d="M-5 10 C-5 4 -3 1 0 1 C3 1 5 4 5 10Z" fill="#f2f2f2" sw={1.1} />
        <C x={0} y={-3} r={3.6} fill="#fff1e6" sw={1.1} />
        <P d="M-4 -5 C-2 -9 2 -9 4 -5" fill="#1f1a1a" sw={0.8} />
        <P d="M5 4 L10 -2" sw={1} />
      </g>
    </g>
  ),
  mochizuki: () => (
    <g>
      <Bg sky="#1f2b4a" ground="#5a3a2a" y={56} />
      <C x={74} y={18} r={12} fill="#fff3b0" />
      <C x={70} y={15} r={2} fill="#f2e08a" sw={0} />
      {[[12, 10], [30, 6], [46, 14], [90, 40]].map(([x, y]) => (
        <Star key={`${x}`} x={x} y={y} r={1.6} fill="#fff3b0" />
      ))}
      <P d="M6 34 L30 24 L54 34Z" fill="#3a3a44" />
      <R x={10} y={34} w={40} h={22} fill="#c0392b" />
      <R x={14} y={38} w={32} h={14} fill="#fbe9c8" />
      <Mini x={22} y={44} c="#8e3fa5" s={0.9} />
      <Mini x={38} y={44} c="#2f8a4c" s={0.9} />
      <E x={70} y={62} rx={10} ry={3} fill="#d14b3c" />
      <E x={70} y={60.5} rx={7} ry={1.6} fill="#fff3b0" sw={0.8} />
    </g>
  ),

  // ---------- 中世・ルネサンス ----------
  monalisa: () => (
    <g>
      <Bg sky="#e9dcc0" ground="#8a6a48" y={60} />
      <P d="M30 70 L40 46 M70 70 L60 46 M50 70 V50" sw={1.6} />
      <R x={26} y={4} w={48} h={46} fill="#c99a3a" rx={1} />
      <R x={31} y={9} w={38} h={36} fill="#6f7f52" sw={1} />
      <P d="M31 30 C40 26 46 32 52 28 C58 24 64 30 69 28 V45 H31Z" fill="#8a8a5a" sw={0} />
      <P d="M38 45 C38 34 43 30 50 30 C57 30 62 34 62 45Z" fill="#3a2a22" />
      <P d="M41 26 C40 16 44 12 50 12 C56 12 60 16 59 26 C59 32 56 34 50 34 C44 34 41 32 41 26Z" fill="#2f2a2a" />
      <E x={50} y={23} rx={6.5} ry={8} fill="#e8c597" sw={1.1} />
      <C x={47.5} y={21.5} r={0.7} fill={O} sw={0} />
      <C x={52.5} y={21.5} r={0.7} fill={O} sw={0} />
      <P d="M47.5 27 Q50 28.4 52.5 27" sw={0.9} />
      <P d="M44 40 C47 38 53 38 56 40" fill="#e8c597" sw={1} />
      <E x={86} y={60} rx={11} ry={7} fill="#f6e3c0" />
      {[[81, 57, '#e5534b'], [87, 55, '#3f7fd0'], [92, 59, '#6fb35a'], [84, 63, '#f2c94c']].map(([x, y, f]) => (
        <C key={`${x}`} x={x as number} y={y as number} r={1.8} fill={f as string} sw={0.8} />
      ))}
      <Stick x1={8} y1={64} x2={20} y2={52} w={1.4} color="#7a5a3a" />
    </g>
  ),
  printing: () => (
    <g>
      <Bg sky="#d9c7a3" ground="#7a5a3a" y={60} />
      <R x={8} y={8} w={6} h={52} fill="#8a5a32" />
      <R x={44} y={8} w={6} h={52} fill="#8a5a32" />
      <R x={6} y={6} w={46} h={6} fill="#6f4628" />
      <Stick x1={29} y1={12} x2={29} y2={28} w={2.2} color="#b9c2cc" />
      <Stick x1={18} y1={22} x2={40} y2={18} w={1.6} color="#6f4628" />
      <R x={16} y={28} w={26} h={6} fill="#6f4628" />
      <R x={12} y={40} w={34} h={8} fill="#a87a4a" />
      <R x={16} y={36} w={26} h={4} fill="#fbf4e2" sw={1} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${60 + (i % 2) * 18} ${14 + Math.floor(i / 2) * 22}) rotate(${i % 2 ? 6 : -5})`}>
          <R x={0} y={0} w={16} h={20} fill="#fbf4e2" sw={1.1} />
          {[5, 9, 13, 17].map((y) => (
            <P key={y} d={`M3 ${y} H13`} sw={0.8} />
          ))}
        </g>
      ))}
      {['A', 'B', 'C'].map((ch, i) => (
        <g key={ch}>
          <R x={14 + i * 10} y={62} w={8} h={8} fill="#b9c2cc" sw={1} />
          <text x={18 + i * 10} y={68.5} textAnchor="middle" fontSize={6} fontWeight={900} fill={O}>
            {ch}
          </text>
        </g>
      ))}
    </g>
  ),
  plague: () => (
    <g>
      <Bg sky="#3a3350" ground="#4a4038" y={54} />
      <C x={82} y={12} r={7} fill="#d8d0b0" />
      {[[6, 26, 18], [26, 20, 16], [44, 28, 14], [60, 22, 18]].map(([x, y, w]) => (
        <g key={x}>
          <P d={`M${x} ${y} L${x + w / 2} ${y - 9} L${x + w} ${y}Z`} fill="#5a4a42" />
          <R x={x} y={y} w={w} h={54 - y} fill="#7a6a5a" />
          <R x={x + w / 2 - 3} y={44} w={6} h={10} fill="#3a2a22" sw={1} />
        </g>
      ))}
      <P d="M30 40 L36 46 M36 40 L30 46" stroke="#d14b3c" sw={1.6} />
      {[[22, 62, 1], [56, 64, 1.2], [80, 60, 0.9]].map(([x, y, k]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
          <E x={0} y={0} rx={7} ry={4} fill="#6b6b74" />
          <C x={7} y={-2} r={3} fill="#6b6b74" sw={1.1} />
          <C x={7} y={-5} r={1.4} fill="#e8a0a0" sw={0.8} />
          <C x={8.5} y={-2.5} r={0.6} fill="#222" sw={0} />
          <P d="M-7 0 C-12 0 -14 4 -18 2" sw={1.1} />
        </g>
      ))}
    </g>
  ),
  columbus: () => (
    <g>
      <Bg sky="#9fd3ff" ground="#2f6fa8" y={48} />
      <P d="M0 56 Q12 52 25 56 T50 56 T75 56 T100 56" stroke="#cfeaff" sw={1} />
      <P d="M66 48 C70 40 86 38 100 40 V48Z" fill="#e8d6a8" />
      <Stick x1={84} y1={42} x2={86} y2={22} w={1.6} color="#7a5a3a" />
      {[[-10, -4], [-8, 4], [8, -4], [9, 4]].map(([dx, dy]) => (
        <P key={`${dx}${dy}`} d={`M86 22 Q${86 + dx / 2} ${22 + dy - 3} ${86 + dx} ${22 + dy + 2}`} stroke="#3f8f4a" sw={2} />
      ))}
      <P d="M8 48 L52 48 L46 58 L14 58Z" fill="#8a5a32" />
      {[18, 30, 42].map((x, i) => (
        <g key={x}>
          <Stick x1={x} y1={48} x2={x} y2={i === 1 ? 12 : 18} w={1.2} color="#6f4628" />
          <P d={`M${x - 7} ${i === 1 ? 16 : 22} H${x + 7} V${i === 1 ? 32 : 34} H${x - 7}Z`} fill="#fbf4e2" sw={1.1} />
          <P d={`M${x} ${i === 1 ? 19 : 25} V${i === 1 ? 29 : 31} M${x - 3} ${i === 1 ? 24 : 28} H${x + 3}`} stroke="#d14b3c" sw={1.4} />
        </g>
      ))}
      <P d="M30 12 L36 14 L30 16" fill="#d14b3c" sw={0.9} />
    </g>
  ),

  // ---------- 戦国 ----------
  sekigahara: () => (
    <g>
      <Bg sky="#ffe0b8" ground="#8a9a5a" y={50} />
      <P d="M0 50 L18 30 L34 44 L52 26 L72 44 L86 32 L100 46 V50Z" fill="#6a7a4a" />
      {[[16, '#3a3a44'], [30, '#3a3a44'], [70, '#c0392b'], [84, '#c0392b']].map(([x, f]) => (
        <g key={x as number}>
          <Stick x1={x as number} y1={66} x2={x as number} y2={16} w={1.2} color="#7a5a3a" />
          <R x={(x as number) + 1} y={16} w={8} h={20} fill={f as string} sw={1.1} />
        </g>
      ))}
      <Stick x1={38} y1={64} x2={62} y2={34} w={1.6} color="#7a5a3a" />
      <Stick x1={62} y1={64} x2={38} y2={34} w={1.6} color="#7a5a3a" />
      <P d="M60 34 L64 28 L64 36Z M40 34 L36 28 L36 36Z" fill="#d0d6dc" sw={1} />
      <Star x={50} y={46} r={5} fill="#fff3b0" />
    </g>
  ),
  // 大雨の中、今川義元の本陣（陣幕）へ奇襲
  okehazama: () => (
    <g>
      <Bg sky="#7d8a9a" ground="#5f7a4a" y={52} />
      <P d="M0 52 L20 36 L38 48 L60 30 L82 46 L100 36 V52Z" fill="#4f6a3e" />
      <R x={46} y={30} w={50} h={22} fill="#fbf4e2" />
      {[56, 71, 86].map((x) => (
        <P key={x} d={`M${x} 30 V52`} stroke="#c9b98f" sw={1} />
      ))}
      <P d="M46 36 H96 M46 46 H96" stroke="#3a3a44" sw={2.2} />
      <C x={71} y={41} r={4} fill="#c0392b" sw={1} />
      <Stick x1={92} y1={52} x2={92} y2={14} w={1.2} color="#7a5a3a" />
      <R x={83} y={14} w={8} h={14} fill="#c0392b" sw={1} />
      <Mini x={14} y={52} c="#3a3a44" s={1.2} />
      <Mini x={28} y={56} c="#3a3a44" s={1.2} />
      <Stick x1={20} y1={50} x2={40} y2={36} w={1.2} color="#7a5a3a" />
      <Stick x1={34} y1={54} x2={52} y2={42} w={1.2} color="#7a5a3a" />
      {[6, 18, 30, 42, 54, 66, 78, 90].map((x, i) => (
        <P key={x} d={`M${x + (i % 2) * 4} ${4 + (i % 3) * 6} l-4 9`} stroke="#d6e4f2" sw={1} />
      ))}
      {[12, 36, 60, 84].map((x) => (
        <P key={x} d={`M${x} 60 l-4 9`} stroke="#d6e4f2" sw={1} />
      ))}
    </g>
  ),
  // 種子島に南蛮船が着き、鉄砲が伝わる
  teppo: () => (
    <g>
      <Bg sky="#9fd3ff" ground="#e8d6a8" y={52} />
      <rect x={0} y={40} width={100} height={12} fill="#2f6fa8" />
      <P d="M0 44 Q12 42 25 44 T50 44 T75 44 T100 44" stroke="#cfeaff" sw={1} />
      <P d="M56 40 L94 40 L88 48 L62 48Z" fill="#3a2a22" />
      <Stick x1={74} y1={40} x2={74} y2={10} w={1.2} color="#6f4628" />
      <P d="M64 14 H84 V30 H64Z" fill="#fbfbf7" sw={1.1} />
      <P d="M74 17 V27 M70 22 H78" stroke="#d14b3c" sw={1.4} />
      <P d="M10 60 L62 50" stroke={O} sw={5.4} />
      <P d="M10 60 L62 50" stroke="#8a5a32" sw={3} />
      <P d="M30 56 L62 50" stroke="#3a3a44" sw={2} />
      <P d="M8 58 L16 57 L18 64 L10 66Z" fill="#6f4628" sw={1.1} />
      <C x={68} y={48} r={4} fill="#eeeeee" sw={1} />
      <C x={74} y={45} r={3} fill="#eeeeee" sw={1} />
      <Star x={64} y={50} r={3} fill="#ffb84d" />
    </g>
  ),
  // 城下町の市。だれでも自由に商売できる
  rakuichi: () => (
    <g>
      <Bg sky="#ffe8c4" ground="#c9a97a" y={54} />
      <P d="M60 22 L76 12 L92 22Z" fill="#3a3a44" />
      <R x={64} y={22} w={24} h={12} fill="#fbfbf7" sw={1.1} />
      {[[6, '#c0392b'], [38, '#3f7fd0']].map(([x, f]) => (
        <g key={x as number}>
          <P d={`M${x as number} 34 L${(x as number) + 4} 26 H${(x as number) + 26} L${(x as number) + 30} 34Z`} fill={f as string} />
          <R x={(x as number) + 3} y={34} w={24} h={14} fill="#fbf4e2" sw={1.1} />
          <R x={(x as number) + 1} y={46} w={28} h={6} fill="#8a5a32" sw={1.1} />
        </g>
      ))}
      <C x={14} y={44} r={3} fill="#e5534b" sw={1} />
      <C x={22} y={44} r={3} fill="#f2c94c" sw={1} />
      <R x={44} y={40} w={6} h={6} fill="#6fb35a" sw={1} />
      <R x={54} y={40} w={6} h={6} fill="#d97ab0" sw={1} />
      <R x={68} y={34} w={14} h={20} fill="#fbfbf7" sw={1.1} />
      <text x={75} y={43} textAnchor="middle" fontSize={6} fontWeight={900} fill="#c0392b">
        楽市
      </text>
      <text x={75} y={51} textAnchor="middle" fontSize={6} fontWeight={900} fill="#c0392b">
        楽座
      </text>
      <Mini x={18} y={58} c="#3f7fd0" />
      <Mini x={50} y={58} c="#e5534b" />
      <Mini x={88} y={58} c="#6fb35a" />
      <C x={34} y={64} r={3} fill="#f2c94c" sw={1} />
      <C x={40} y={66} r={3} fill="#f2c94c" sw={1} />
    </g>
  ),

  // ---------- 江戸 ----------
  tomikuji: () => (
    <g>
      <Bg sky="#3a2a2a" ground="#7a5a3a" y={56} />
      <R x={4} y={4} w={92} h={6} fill="#c0392b" />
      {[14, 34, 54, 74].map((x) => (
        <g key={x}>
          <Stick x1={x + 6} y1={10} x2={x + 6} y2={16} w={0.8} color="#7a5a3a" />
          <R x={x} y={16} w={12} h={12} fill="#f2c94c" rx={6} sw={1} />
        </g>
      ))}
      <R x={26} y={36} w={48} h={24} fill="#a87a4a" />
      <R x={26} y={36} w={48} h={5} fill="#8a5a3a" sw={1} />
      <C x={50} y={38.5} r={2.6} fill="#2f2a2a" sw={0.8} />
      <Stick x1={50} y1={38} x2={70} y2={14} w={1.8} color="#d0d6dc" />
      <R x={68} y={8} w={6} h={8} fill="#7a5a3a" sw={1} />
      <R x={42} y={46} w={16} h={10} fill="#fbf4e2" sw={1} />
      <text x={50} y={54} textAnchor="middle" fontSize={7} fontWeight={900} fill="#c0392b">
        富
      </text>
      {[[12, 62], [20, 66], [82, 64], [90, 60]].map(([x, y]) => (
        <g key={`${x}`}>
          <E x={x} y={y} rx={4} ry={3} fill="#f2c94c" sw={1} />
          <R x={x - 1} y={y - 1} w={2} h={2} fill="#3a2a2a" sw={0.5} />
        </g>
      ))}
      <Mini x={14} y={46} c="#2f6a4a" s={0.9} />
      <Mini x={86} y={46} c="#d9622b" s={0.9} />
    </g>
  ),
  taika: () => (
    <g>
      <Bg sky="#2c2a4a" ground="#5a4a3a" y={58} />
      {[[8, 10], [30, 6], [88, 12]].map(([x, y]) => (
        <C key={`${x}`} x={x} y={y} r={1.1} fill="#fff" sw={0} />
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <R x={4 + i * 22} y={36} w={20} h={22} fill="#a87a4a" />
          <P d={`M${2 + i * 22} 36 L${14 + i * 22} 26 L${26 + i * 22} 36Z`} fill="#5a5a66" />
          <R x={10 + i * 22} y={46} w={8} h={12} fill="#3a2a2a" sw={1} />
        </g>
      ))}
      <Flame x={14} y={30} s={1.3} />
      <Flame x={36} y={28} s={1.1} />
      <Flame x={58} y={32} s={0.7} />
      <Stick x1={84} y1={58} x2={84} y2={14} w={1.6} color="#7a5a3a" />
      <R x={78} y={8} w={12} h={8} fill="#fbfbf7" sw={1.1} />
      {[0, 1, 2, 3].map((k) => (
        <P key={k} d={`M${79 + k * 3} 16 V24`} stroke="#fbfbf7" sw={1.4} />
      ))}
      <Mini x={78} y={48} c="#2c3e66" s={1.1} />
      <Mini x={92} y={50} c="#2c3e66" s={0.9} />
      <P d="M68 56 L74 40 M72 56 L78 40 M69 52 H73 M70 48 H75 M71 44 H76" stroke="#c99a32" sw={1.2} />
    </g>
  ),
  ukiyoe: () => (
    <g>
      <Bg sky="#f4ecd8" ground="#a87a4a" y={60} />
      <R x={4} y={4} w={92} h={8} fill="#2c3e66" />
      {[8, 38, 68].map((x, i) => (
        <g key={x}>
          <R x={x} y={16} w={24} h={30} fill="#fbf4e2" sw={1.2} />
          {i === 0 && (
            <>
              <P d={`M${x + 2} 40 C${x + 6} 28 ${x + 14} 24 ${x + 20} 28 C${x + 16} 28 ${x + 14} 32 ${x + 18} 34 C${x + 12} 36 ${x + 8} 40 ${x + 22} 42 H${x + 2}Z`} fill="#3f6fb0" sw={1} />
              <P d={`M${x + 12} 40 L${x + 16} 32 L${x + 20} 40Z`} fill="#fbfbf7" sw={0.8} />
            </>
          )}
          {i === 1 && (
            <>
              <C x={x + 12} y={26} r={5} fill="#ffd9b8" sw={1} />
              <P d={`M${x + 6} 24 C${x + 8} 18 ${x + 16} 18 ${x + 18} 24Z`} fill="#2f2a2a" sw={1} />
              <P d={`M${x + 4} 44 C${x + 4} 34 ${x + 8} 32 ${x + 12} 32 C${x + 16} 32 ${x + 20} 34 ${x + 20} 44Z`} fill="#c0392b" sw={1} />
            </>
          )}
          {i === 2 && (
            <>
              <P d={`M${x + 2} 40 L${x + 12} 22 L${x + 22} 40Z`} fill="#6f8fb0" sw={1} />
              <P d={`M${x + 8} 29 L${x + 12} 22 L${x + 16} 29Z`} fill="#fbfbf7" sw={0.8} />
              <C x={x + 19} y={21} r={2.6} fill="#e5534b" sw={0.8} />
            </>
          )}
        </g>
      ))}
      <Mini x={20} y={56} c="#2f6a4a" s={1} />
      <Mini x={50} y={58} c="#d97ab0" s={1} />
      <Mini x={80} y={56} c="#d9622b" s={1} />
      <E x={62} y={62} rx={3} ry={2} fill="#f2c94c" sw={0.8} />
      <E x={36} y={64} rx={3} ry={2} fill="#f2c94c" sw={0.8} />
    </g>
  ),
  sakoku: () => (
    <g>
      <Bg sky="#cfe8f5" />
      <P d="M0 40 C20 36 40 44 60 40 C80 36 90 42 100 40 V72 H0Z" fill="#3f6fb0" />
      <P d="M0 52 C10 50 20 54 30 52 M40 58 C50 56 60 60 70 58" stroke="#b5d8ef" sw={1} />
      <P d="M0 30 C10 26 22 28 30 34 C34 38 30 44 22 46 L0 48Z" fill="#9fbf6a" />
      <R x={6} y={22} w={12} h={8} fill="#fbfbf7" sw={1} />
      <P d="M4 22 L12 16 L20 22Z" fill="#3a3a44" sw={1} />
      <P d="M30 50 C34 46 40 46 44 50 C40 54 34 54 30 50Z" fill="#e8d6a8" sw={1} />
      <P d="M64 52 H90 L86 60 H68Z" fill="#7a5a3a" />
      <Stick x1={77} y1={52} x2={77} y2={24} w={1.6} color="#5a4a3a" />
      <P d="M77 26 C86 30 88 40 78 46Z" fill="#fbfbf7" sw={1.1} />
      <P d="M77 28 C70 32 68 40 76 44Z" fill="#fbfbf7" sw={1.1} />
      <C x={50} y={30} r={9} fill="#fbfbf7" stroke="#e5534b" sw={2} />
      <P d="M44 24 L56 36 M56 24 L44 36" stroke="#e5534b" sw={2.2} />
    </g>
  ),

  // ---------- 近代 ----------
  nobel: () => (
    <g>
      <Bg sky="#f4ecd8" ground="#3a5a8c" y={60} />
      <P d="M40 6 L50 20 L60 6" stroke="#2c4fa3" sw={4} />
      <C x={50} y={34} r={17} fill="#f2c94c" />
      <C x={50} y={34} r={13} stroke="#c99a32" sw={1} />
      <C x={50} y={31} r={6} fill="#e8bf4f" sw={1} />
      <P d="M44 42 Q50 46 56 42" sw={1} />
      <P d="M30 52 C24 44 26 30 32 22 M70 52 C76 44 74 30 68 22" stroke="#6fb35a" sw={2.6} />
      <P d="M14 66 L18 50 H24 L28 66Z" fill="#b5ecff" />
      <R x={17} y={46} w={8} h={4} fill="#e8edf2" sw={1} />
      <P d="M16 60 H26" stroke="#35e0ff" sw={2} />
      <R x={76} y={50} w={12} h={14} fill="#fbf4e2" sw={1} />
      <P d="M79 54 H85 M79 57 H85 M79 60 H83" sw={0.8} />
    </g>
  ),
  patent: () => (
    <g>
      <Bg sky="#2c2a4a" ground="#7a5a3a" y={60} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <P key={a} d={`M${50 + Math.cos((a * Math.PI) / 180) * 20} ${26 + Math.sin((a * Math.PI) / 180) * 20} L${50 + Math.cos((a * Math.PI) / 180) * 27} ${26 + Math.sin((a * Math.PI) / 180) * 27}`} stroke="#ffd34d" sw={2} />
      ))}
      <C x={50} y={26} r={14} fill="#fff3b0" />
      <P d="M45 30 L48 22 L50 28 L52 22 L55 30" stroke="#ff8a3d" sw={1.2} />
      <R x={43} y={38} w={14} h={5} fill="#b8bcc4" sw={1.1} />
      <R x={44} y={43} w={12} h={4} fill="#8a8f98" sw={1.1} />
      <R x={8} y={42} w={24} h={26} fill="#fbf4e2" sw={1.2} />
      <P d="M12 48 H28 M12 52 H28 M12 56 H24" sw={0.8} />
      <C x={25} y={62} r={3.4} fill="#e5534b" sw={1} />
      <R x={68} y={46} w={22} h={14} fill="#c99a32" sw={1.2} />
      <C x={74} y={53} r={2.4} fill="#f2c94c" sw={0.9} />
      <C x={82} y={53} r={2.4} fill="#f2c94c" sw={0.9} />
    </g>
  ),
  expo: () => (
    <g>
      <Bg sky="#bfe3ff" ground="#9ccf6a" y={58} />
      <P d="M50 4 L40 58 H46 Q50 46 54 58 H60Z" fill="#a0683a" />
      <P d="M44 34 H56 M42 46 H58 M47 20 H53" sw={1.2} />
      <P d="M50 0 V6" sw={1.2} />
      {[14, 28, 72, 86].map((x, i) => (
        <g key={x}>
          <Stick x1={x} y1={58} x2={x} y2={36} w={1} color="#7a5a3a" />
          <R x={x} y={36} w={9} h={6} fill={['#e5534b', '#fbfbf7', '#3a5a8c', '#f2c94c'][i]} sw={1} />
        </g>
      ))}
      <C x={30.5} y={39} r={1.6} fill="#e5534b" sw={0.6} />
      <Mini x={22} y={60} c="#3a5a8c" s={0.9} />
      <Mini x={36} y={62} c="#e5737b" s={0.9} />
      <Mini x={64} y={62} c="#6fb35a" s={0.9} />
      <Mini x={78} y={60} c="#2f2a2a" s={0.9} />
    </g>
  ),
  sunflower: () => (
    <g>
      <Bg sky="#7aa9d6" ground="#8a5a3a" y={62} />
      <R x={20} y={4} w={60} h={56} fill="#c99a32" sw={1.6} />
      <R x={25} y={9} w={50} h={46} fill="#f2d16b" sw={1.1} />
      <P d="M40 55 L42 40 H58 L60 55Z" fill="#e8a33a" sw={1.1} />
      {[
        [42, 26],
        [52, 20],
        [60, 30],
        [47, 36],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <C x={x} y={y} r={6} fill="#ffcc33" sw={1} />
          <C x={x} y={y} r={2.8} fill="#8a5a2a" sw={0.8} />
        </g>
      ))}
      <P d="M47 40 L47 36 M52 40 L52 26 M57 40 L59 34" stroke="#6fb35a" sw={1.4} />
      <R x={8} y={60} w={14} h={10} fill="#fbf4e2" sw={1} />
      <P d="M11 64 H19" stroke="#e5534b" sw={1.4} />
      <P d="M90 40 L98 50 H93 V62 H87 V50 H82Z" fill="#6fb35a" sw={1.1} />
    </g>
  ),

  // ---------- 未来 ----------
  robocon: () => (
    <g>
      <Bg sky="#1f2b4a" ground="#3a4a6a" y={56} />
      {[10, 30, 50, 70, 90].map((x) => (
        <P key={x} d={`M${x} 56 L${x - 10} 72`} stroke="#35e0ff" sw={0.8} op={0.6} />
      ))}
      <R x={34} y={22} w={32} h={26} fill="#e3e9ee" rx={8} />
      <R x={38} y={28} w={24} h={10} fill="#1f2b3a" rx={4} />
      <C x={45} y={33} r={2.4} fill="#35e0ff" sw={0} />
      <C x={55} y={33} r={2.4} fill="#35e0ff" sw={0} />
      <P d="M50 22 V14" sw={1.4} />
      <C x={50} y={12} r={2.6} fill="#e5534b" />
      <R x={38} y={48} w={24} h={10} fill="#b0b6bd" rx={2} />
      <Stick x1={34} y1={36} x2={22} y2={26} w={3} color="#b0b6bd" />
      <Stick x1={66} y1={36} x2={78} y2={26} w={3} color="#b0b6bd" />
      <C x={14} y={56} r={6} fill="#f2c94c" />
      <C x={14} y={56} r={2.4} fill="#1f2b4a" sw={1} />
      <C x={86} y={58} r={5} fill="#f2c94c" />
      <C x={86} y={58} r={2} fill="#1f2b4a" sw={1} />
      <Star x={50} y={64} r={4} />
    </g>
  ),
  singularity: () => (
    <g>
      <Bg sky="#14223a" />
      {[[10, 10], [88, 14], [20, 60], [80, 62], [50, 6]].map(([x, y]) => (
        <C key={`${x}${y}`} x={x} y={y} r={0.9} fill="#fff" sw={0} />
      ))}
      <P d="M14 36 H30 M70 36 H86 M50 8 V18 M50 54 V66 M24 18 L36 26 M76 18 L64 26 M24 56 L36 46 M76 56 L64 46" stroke="#35e0ff" sw={1.6} />
      {[[14, 36], [86, 36], [50, 8], [50, 66], [24, 18], [76, 18], [24, 56], [76, 56]].map(([x, y]) => (
        <C key={`n${x}${y}`} x={x} y={y} r={2.2} fill="#35e0ff" sw={1} />
      ))}
      <P d="M36 36 C30 30 32 20 40 20 C42 15 50 14 52 18 C58 14 66 18 66 24 C72 26 72 36 66 40 C66 48 58 52 52 48 C48 54 38 52 38 46 C32 46 30 40 36 36Z" fill="#f59ac2" />
      <P d="M50 19 V48 M42 26 C46 28 46 32 42 34 M58 26 C54 28 54 32 58 34 M40 42 C44 40 46 42 46 44 M60 42 C56 40 54 42 54 44" sw={1.1} />
    </g>
  ),
  timemachine: () => (
    <g>
      <Bg sky="#2c3e66" />
      {[30, 22, 14, 7].map((r, i) => (
        <C key={r} x={50} y={36} r={r} fill={['#4a3a8a', '#6a4ab0', '#8f6fd8', '#c8b4ff'][i]} sw={1.2} />
      ))}
      <P d="M50 36 V20 M50 36 L60 40" stroke="#fbfbf7" sw={2} />
      <C x={50} y={36} r={1.8} fill="#fbfbf7" sw={0} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => {
        const a = (Math.PI / 6) * k;
        return <C key={k} x={50 + Math.cos(a) * 26} y={36 + Math.sin(a) * 26} r={1.2} fill="#ffd34d" sw={0} />;
      })}
      <Mini x={82} y={52} c="#e5534b" head="#f0c08f" s={1.3} />
      <P d="M74 50 l-6 -2 M74 54 l-7 0" stroke="#fbfbf7" sw={1} />
    </g>
  ),
  martian: () => (
    <g>
      <Bg sky="#2a1a3a" ground="#b85a3a" y={58} />
      {[[10, 10], [24, 20], [88, 8], [92, 30], [6, 40]].map(([x, y]) => (
        <C key={`${x}`} x={x} y={y} r={0.9} fill="#fff" sw={0} />
      ))}
      <C x={84} y={16} r={8} fill="#d9622b" />
      <P d="M36 30 L28 60 H72 L64 30Z" fill="#9be0ff" stroke="none" op={0.45} />
      <E x={50} y={24} rx={26} ry={7} fill="#b0b6bd" />
      <E x={50} y={20} rx={12} ry={8} fill="#b5ecff" />
      {[32, 42, 58, 68].map((x) => (
        <C key={x} x={x} y={26} r={1.4} fill="#f2c94c" sw={0.7} />
      ))}
      <R x={36} y={48} w={28} h={4} fill="#c99a6a" />
      <P d="M40 52 V60 M60 52 V60" sw={1.6} />
      <R x={66} y={44} w={10} h={14} fill="#c99a6a" />
      <C x={50} y={40} r={7} fill="#e5737b" />
      <C x={47.5} y={39} r={1.5} fill="#fff" sw={0.6} />
      <C x={52.5} y={39} r={1.5} fill="#fff" sw={0.6} />
      {[44, 48, 52, 56].map((x) => (
        <P key={x} d={`M${x} 45 C${x - 1} 48 ${x + 1} 50 ${x} 52`} stroke="#d9606a" sw={2} />
      ))}
    </g>
  ),

  // ---------- サイボーグ化（未来のグッズ） ----------
  cyborg: () => (
    <g>
      <Bg sky="#1f2b3a" ground="#3a4654" y={56} />
      <R x={14} y={44} w={72} h={10} fill="#c9d3dc" rx={3} />
      <P d="M22 54 V64 M78 54 V64" sw={2} />
      <P d="M36 6 H64 L58 16 H42Z" fill="#e3e9ee" />
      <P d="M42 16 L34 44 H66 L58 16Z" fill="#b5ecff" stroke="none" op={0.35} />
      <P d="M18 44 C18 32 30 30 40 34 L60 34 C70 30 82 32 82 44Z" fill="#9aa7b4" />
      <C x={30} y={38} r={5} fill="#ffd9b8" />
      <P d="M56 36 L72 26 L80 28 L82 22 L88 24 L86 30 L80 34 L68 40Z" fill="#c9d3dc" />
      <C x={72} y={30} r={1.6} fill="#35e0ff" sw={0.8} />
      {[0, 1, 2].map((i) => (
        <P key={i} d={`M${46 + i * 6} 22 l2 4 l-3 0 l2 4`} stroke="#35e0ff" sw={1.2} />
      ))}
    </g>
  ),

  // ---------- 襲来 ----------
  raid_present: () => (
    <g>
      <Bg sky="#f4b98a" ground="#7a7a80" y={52} />
      <R x={4} y={20} w={30} h={32} fill="#e8e0cc" />
      <R x={8} y={26} w={8} h={8} fill="#b5ecff" sw={1} />
      <R x={20} y={26} w={8} h={8} fill="#b5ecff" sw={1} />
      <C x={52} y={60} r={7} fill="#3a3a44" />
      <C x={84} y={60} r={7} fill="#3a3a44" />
      <P d="M50 58 L60 46 H76 L86 58Z" fill="#c0392b" />
      <Stick x1={60} y1={46} x2={56} y2={36} w={1.6} color="#b0b6bd" />
      <Mini x={70} y={34} c="#2f2a2a" />
      <P d="M64 26 C66 20 76 20 78 26" fill="#2f2a2a" sw={1} />
      <P d="M40 40 l4 -2 M38 46 l5 0 M40 52 l4 2" stroke="#e5534b" sw={1.2} />
    </g>
  ),
  raid_cretaceous: () => (
    <g>
      <Bg sky="#ffcf8a" ground="#6a8a3a" y={50} />
      <P d="M0 50 L14 36 L28 50 M60 50 L76 34 L92 50" fill="#4f7a2a" />
      {[[22, 46, 1], [50, 52, 1.2], [78, 46, 1]].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <P d="M-14 10 C-14 0 -6 -6 4 -6 C10 -10 18 -8 18 -2 C18 2 12 4 6 4 L4 10Z" fill="#b8865a" />
          <C x={8} y={-4} r={1.2} fill={O} sw={0} />
          <P d="M8 2 l2 2 l2 -2 l2 2" stroke="#fff" sw={0.9} />
          <P d="M-10 -2 l2 -4 M-6 -4 l2 -4" sw={1} />
        </g>
      ))}
      <P d="M20 20 l4 2 M48 14 l4 2 M74 20 l4 2" stroke="#e5534b" sw={1.4} />
    </g>
  ),
  raid_egypt: () => (
    <g>
      <Bg sky="#ffe2a0" ground="#3f7fd0" y={48} />
      <P d="M70 48 L84 26 L98 48Z" fill="#e8bf4f" />
      {[[18, 0.9], [46, 1.1]].map(([x, s]) => (
        <g key={x} transform={`translate(${x} 48) scale(${s})`}>
          <P d="M-16 0 L16 0 L12 8 L-12 8Z" fill="#7a5a3a" />
          <P d="M-16 0 C-20 -4 -20 -8 -16 -10 M16 0 C20 -4 20 -8 16 -10" sw={1.6} />
          <Stick x1={0} y1={0} x2={0} y2={-26} w={1.2} color="#7a5a3a" />
          <R x={-10} y={-24} w={20} h={14} fill="#f6f1e4" sw={1.1} />
          <P d="M-6 -20 C-4 -24 4 -24 6 -20 M-6 -20 l-2 -3 M6 -20 l2 -3" sw={1} />
        </g>
      ))}
      <P d="M0 60 Q25 56 50 60 T100 60" stroke="#9be0ff" sw={1} />
    </g>
  ),
  raid_greece: () => (
    <g>
      <Bg sky="#bcd8ff" ground="#d8c08a" y={54} />
      {[10, 22, 34, 46, 58, 70, 82, 94].map((x, i) => (
        <g key={x} transform={`rotate(25 ${x} ${8 + (i % 3) * 8})`}>
          <P d={`M${x} ${4 + (i % 3) * 8} V${18 + (i % 3) * 8}`} sw={1.1} />
          <P d={`M${x - 1.6} ${18 + (i % 3) * 8} L${x} ${22 + (i % 3) * 8} L${x + 1.6} ${18 + (i % 3) * 8}Z`} fill="#b0b6bd" sw={0.8} />
        </g>
      ))}
      <C x={50} y={50} r={16} fill="#d9a441" />
      <C x={50} y={50} r={11} stroke="#c0392b" sw={2} />
      <P d="M44 50 L50 42 L56 50 L50 58Z" fill="#c0392b" sw={1} />
      <Mini x={18} y={58} c="#8e3fa5" />
      <Mini x={82} y={58} c="#8e3fa5" />
    </g>
  ),
  raid_china: () => (
    <g>
      <Bg sky="#fbe9d2" ground="#b98a5a" y={52} />
      {[16, 34, 50, 66, 84].map((x, i) => (
        <g key={x}>
          <Stick x1={x + 6} y1={60} x2={x + 10} y2={14 + (i % 2) * 4} w={1} color="#7a5a3a" />
          <P d={`M${x + 9} ${14 + (i % 2) * 4} L${x + 11} ${8 + (i % 2) * 4} L${x + 12} ${15 + (i % 2) * 4}Z`} fill="#b0b6bd" sw={0.8} />
          <Mini x={x} y={48 + (i % 2) * 4} c="#a87a4a" />
          <R x={x - 4.5} y={41 + (i % 2) * 4} w={9} h={2.4} fill="#f2c94c" sw={0.8} />
        </g>
      ))}
      <R x={36} y={6} w={28} h={12} fill="#f2c94c" />
      <text x={50} y={15} textAnchor="middle" fontSize={7} fontWeight={900} fill="#c0392b">
        黄天
      </text>
    </g>
  ),
  raid_heian: () => (
    <g>
      <Bg sky="#fde4ec" ground="#8a9a5a" y={54} />
      <Flame x={14} y={54} s={1.1} />
      <Flame x={86} y={54} s={1.1} />
      <P d="M28 62 C28 50 38 44 54 44 L66 36 L70 40 L64 48 C70 52 72 58 70 62Z" fill="#7a4e2e" />
      <P d="M66 36 L70 30 L72 38" fill="#7a4e2e" sw={1.1} />
      <P d="M32 62 V70 M44 62 V70 M60 62 V70 M68 62 V70" sw={2} />
      <P d="M38 44 C38 32 46 28 52 30 L50 44Z" fill="#c0392b" />
      <C x={46} y={24} r={6} fill="#ffd9b8" />
      <P d="M40 22 L46 12 L52 22Z" fill="#3a3a44" />
      <Stick x1={54} y1={34} x2={74} y2={14} w={1.2} color="#d0d6dc" />
    </g>
  ),
  raid_europe: () => (
    <g>
      <Bg sky="#9fb8d0" ground="#2f5f8a" y={46} />
      <P d="M12 46 L88 46 L80 56 L20 56Z" fill="#7a5a3a" />
      <P d="M88 46 C94 40 96 30 90 24 C88 30 84 32 82 30" fill="#7a5a3a" />
      <C x={89} y={28} r={1} fill={O} sw={0} />
      <P d="M12 46 C6 42 6 36 10 32" sw={2} />
      {[24, 36, 48, 60, 72].map((x, i) => (
        <C key={x} x={x} y={47} r={4} fill={['#d14b3c', '#f2c94c', '#3f7fd0'][i % 3]} sw={1} />
      ))}
      <Stick x1={50} y1={46} x2={50} y2={8} w={1.4} color="#7a5a3a" />
      <R x={34} y={10} w={32} h={24} fill="#fbfbf7" />
      {[0, 1, 2].map((i) => (
        <R key={i} x={34} y={12 + i * 8} w={32} h={4} fill="#d14b3c" sw={0} />
      ))}
      <P d="M0 62 Q25 58 50 62 T100 62" stroke="#9be0ff" sw={1} />
    </g>
  ),
  raid_sengoku: () => (
    <g>
      <Bg sky="#3a1a1a" ground="#5a3a2a" y={56} />
      <P d="M14 30 L50 14 L86 30Z" fill="#3a3a44" />
      <R x={20} y={30} w={60} h={26} fill="#a87a4a" />
      {[28, 44, 60].map((x) => (
        <R key={x} x={x} y={36} w={10} h={20} fill="#3a2a2a" sw={1} />
      ))}
      <Flame x={24} y={32} s={1.2} />
      <Flame x={50} y={18} s={1.4} />
      <Flame x={78} y={32} s={1.2} />
      <C x={50} y={64} r={6} fill="#8d7ac8" />
      {[0, 72, 144, 216, 288].map((a) => (
        <E key={a} x={50 + Math.cos(((a - 90) * Math.PI) / 180) * 3} y={64 + Math.sin(((a - 90) * Math.PI) / 180) * 3} rx={2} ry={1.2} fill="#fff" sw={0.5} rot={a} />
      ))}
    </g>
  ),
  raid_edo: () => (
    <g>
      <Bg sky="#2c3a5a" ground="#f4f6f8" y={54} />
      {[[10, 8], [26, 20], [44, 6], [62, 16], [80, 6], [92, 24], [16, 34], [70, 32]].map(([x, y]) => (
        <C key={`${x}-${y}`} x={x} y={y} r={1.2} fill="#fff" sw={0} />
      ))}
      <P d="M60 30 L80 22 L100 30 V54 H60Z" fill="#3a3a44" />
      <E x={30} y={44} rx={14} ry={11} fill="#c0392b" />
      <E x={30} y={44} rx={9} ry={7} fill="#e8d6a8" />
      <Stick x1={10} y1={30} x2={22} y2={40} w={1.2} color="#7a5a3a" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <P d={`M${50 + i * 10} 62 L${54 + i * 10} 48 L${58 + i * 10} 62Z`} fill="#fbfbf7" sw={1} />
          <P d={`M${51 + i * 10} 58 l3 -2 l3 2`} stroke="#3a3a44" sw={1} />
          <C x={54 + i * 10} y={45} r={3} fill="#ffd9b8" sw={1} />
        </g>
      ))}
      <E x={86} y={62} rx={4} ry={6} fill="#ff8a3d" />
      <P d="M86 56 V52" sw={1} />
    </g>
  ),
  raid_modern: () => (
    <g>
      <Bg sky="#3a3a44" ground="#5a5a62" y={54} />
      {[8, 26, 74, 92].map((x) => (
        <R key={x} x={x - 6} y={10} w={12} h={44} fill="#2a2a32" />
      ))}
      <P d="M16 60 L22 48 H70 L80 54 H88 V62 H16Z" fill="#2f2a2a" />
      <R x={30} y={50} w={16} h={6} fill="#9be0ff" sw={1} />
      <C x={30} y={63} r={5} fill="#5a5a62" />
      <C x={74} y={63} r={5} fill="#5a5a62" />
      <C x={50} y={30} r={8} fill="#ffd9b8" />
      <P d="M38 26 H62 L58 22 C58 14 42 14 42 22Z" fill="#3a3a44" />
      <R x={42} y={22} w={16} h={3} fill="#c0392b" sw={0.8} />
      <P d="M46 30 h2 M52 30 h2" sw={1.4} />
      <P d="M46 35 Q50 33 54 35" sw={1.2} />
    </g>
  ),
  raid_future: () => (
    <g>
      <Bg sky="#140f2a" />
      {[[8, 8], [20, 30], [36, 6], [64, 10], [88, 20], [92, 54], [10, 60], [50, 66]].map(([x, y]) => (
        <C key={`${x}`} x={x} y={y} r={0.9} fill="#fff" sw={0} />
      ))}
      <P d="M14 40 L40 26 H76 L90 40 L76 54 H40Z" fill="#6a6a80" />
      <P d="M40 26 L50 12 H64 L76 26Z" fill="#3a3a50" />
      <R x={52} y={16} w={10} h={8} fill="#35e0ff" sw={1} />
      <P d="M14 40 H4 M16 46 H6" stroke="#ff8a3d" sw={2} />
      <Stick x1={70} y1={12} x2={70} y2={2} w={1} color="#b0b6bd" />
      <R x={70} y={2} w={14} h={9} fill="#2f2a2a" sw={1} />
      <C x={77} y={6} r={2} fill="#fff" sw={0.6} />
      {[30, 46, 62].map((x) => (
        <C key={x} x={x} y={40} r={3} fill="#35e0ff" sw={1} />
      ))}
    </g>
  ),
};

export function hasEventArt(id?: string): id is string {
  return !!id && id in SCENES;
}

/** めくったイベントカードの絵 */
export function EventArt({ id }: { id: string }) {
  return (
    <svg className="event-art" viewBox="0 0 100 72" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <clipPath id={`ea-${id}`}>
        <rect x={0} y={0} width={100} height={72} rx={4} />
      </clipPath>
      <g clipPath={`url(#ea-${id})`}>{SCENES[id]()}</g>
    </svg>
  );
}
