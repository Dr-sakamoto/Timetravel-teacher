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

  // ---------- 白亜紀 ----------
  nawabari: () => (
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
  trex_sumo: () => (
    <g>
      <Bg sky="#cfe8a8" ground="#d8c08a" y={50} />
      <E x={50} y={60} rx={40} ry={8} fill="#e8d6a8" />
      <E x={50} y={60} rx={34} ry={6} stroke="#fbfbf7" sw={1.6} />
      <P d="M54 50 C52 30 60 16 76 14 C92 14 98 26 96 38 C94 48 84 52 74 50 L70 58 L58 58Z" fill="#6fb35a" />
      <P d="M64 34 C74 40 88 40 96 34" sw={1.2} />
      {[70, 76, 82, 88].map((x) => (
        <P key={x} d={`M${x} 36.5 l2 3 l2 -3`} fill="#fff" sw={0.9} />
      ))}
      <C x={78} y={24} r={2.4} fill={O} sw={0} />
      <P d="M72 20 L84 21" sw={1.6} />
      <P d="M58 44 C52 44 48 46 46 48" sw={4} stroke="#6fb35a" />
      <P d="M18 58 C18 46 24 40 32 40 C38 40 42 44 44 50 L40 58Z" fill="#3f7fd0" />
      <C x={30} y={32} r={7} fill="#ffd9b8" />
      <P d="M23 30 C24 24 36 24 37 30" fill="#2f2a2a" sw={1.1} />
      <P d="M34 44 C40 44 44 46 46 48" sw={4} stroke="#ffd9b8" />
      <C x={33} y={32} r={1} fill={O} sw={0} />
      <P d="M46 40 l2 -4 M50 41 l3 -3" stroke="#e5534b" sw={1.2} />
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
  ramesses: () => (
    <g>
      <Bg sky="#3a5a8c" ground="#e8bf4f" y={58} />
      {[10, 22, 78, 90].map((x) => (
        <g key={x}>
          <R x={x - 4} y={6} w={8} h={52} fill="#e8d6a8" />
          <P d={`M${x - 2} 16 h4 M${x - 2} 26 h4 M${x - 2} 36 h4`} sw={0.9} />
        </g>
      ))}
      <R x={34} y={34} w={32} h={24} fill="#d9a441" rx={2} />
      <P d="M40 32 C40 18 60 18 60 32 L64 46 H36Z" fill="#3f7fd0" />
      {[40, 44, 48, 52, 56, 60].map((x) => (
        <P key={x} d={`M${x} 26 L${x - 1} 46`} stroke="#f2c94c" sw={1.2} />
      ))}
      <C x={50} y={30} r={7} fill="#d39a68" />
      <P d="M44 25 C44 20 56 20 56 25" fill="#f2c94c" sw={1} />
      <P d="M50 20 l0 -3" sw={1.2} />
      <P d="M47 30 h1 M52 30 h1" sw={1.4} />
      <P d="M49 37 L50 41 L51 37" fill="#3f7fd0" sw={0.8} />
      <Mini x={22} y={60} c="#fbfbf7" head="#d39a68" s={0.9} />
      <Mini x={78} y={60} c="#fbfbf7" head="#d39a68" s={0.9} />
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
  keju: () => (
    <g>
      <Bg sky="#fbe9d2" ground="#b98a5a" y={56} />
      <P d="M4 18 L50 4 L96 18Z" fill="#c0392b" />
      <R x={8} y={18} w={84} h={38} fill="#e8d6a8" />
      {[10, 30, 50, 70].map((x) => (
        <g key={x}>
          <R x={x + 1} y={24} w={18} h={28} fill="#7a5a3a" />
          <R x={x + 4} y={30} w={12} h={10} fill="#ffd9b8" sw={1} />
          <P d={`M${x + 5} 44 H${x + 15}`} sw={2.4} stroke="#fbfbf7" />
        </g>
      ))}
      <R x={34} y={58} w={32} h={10} fill="#fbf4e2" rx={2} />
      <P d="M38 61 V66 M42 61 V66 M46 61 V66 M50 61 V66" sw={0.8} />
      <Stick x1={58} y1={60} x2={72} y2={52} w={2} color="#7a5a3a" />
    </g>
  ),
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

  // ---------- 平安 ----------
  tentoku: () => (
    <g>
      <Bg sky="#fde4ec" ground="#e8d6a8" y={56} />
      <R x={4} y={8} w={44} h={46} fill="#d14b3c" rx={2} />
      <R x={52} y={8} w={44} h={46} fill="#3566b8" rx={2} />
      <text x={26} y={18} textAnchor="middle" fontSize={7} fontWeight={900} fill="#fff">
        左
      </text>
      <text x={74} y={18} textAnchor="middle" fontSize={7} fontWeight={900} fill="#fff">
        右
      </text>
      {[16, 30, 64, 78].map((x, i) => (
        <g key={x} transform={`rotate(${i % 2 ? 6 : -6} ${x} 38)`}>
          <R x={x - 4} y={24} w={8} h={26} fill="#fbf4e2" sw={1.1} />
          <P d={`M${x - 1.5} 28 V46 M${x + 1.5} 30 V44`} sw={0.7} />
        </g>
      ))}
      {[[10, 4], [40, 2], [60, 5], [90, 3], [50, 60], [20, 64], [80, 66]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <E key={a} x={x + Math.cos((a * Math.PI) / 180) * 2} y={y + Math.sin((a * Math.PI) / 180) * 2} rx={1.6} ry={1.1} fill="#f7b6cc" sw={0.5} rot={a} />
          ))}
        </g>
      ))}
    </g>
  ),
  michinaga: () => (
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
  medici: () => (
    <g>
      <Bg sky="#f4e6c8" ground="#a87a4a" y={58} />
      <P d="M32 8 H68 V36 C68 50 58 56 50 60 C42 56 32 50 32 36Z" fill="#f2c94c" />
      {[[50, 18, '#3f7fd0'], [42, 26, '#d14b3c'], [58, 26, '#d14b3c'], [42, 36, '#d14b3c'], [58, 36, '#d14b3c'], [50, 44, '#d14b3c']].map(([x, y, f]) => (
        <C key={`${x}-${y}`} x={x as number} y={y as number} r={4} fill={f as string} sw={1.1} />
      ))}
      <P d="M8 58 C6 48 12 42 20 44 C28 42 32 50 30 58Z" fill="#b8860b" />
      <P d="M14 44 L18 38 L22 44" fill="#b8860b" sw={1.1} />
      <text x={19} y={54} textAnchor="middle" fontSize={8} fontWeight={900} fill="#fff3b0">
        ƒ
      </text>
      <E x={82} y={54} rx={14} ry={9} fill="#f6e3c0" />
      {[[76, 50, '#e5534b'], [84, 48, '#3f7fd0'], [90, 53, '#6fb35a'], [80, 57, '#f2c94c']].map(([x, y, f]) => (
        <C key={`${x}`} x={x as number} y={y as number} r={2.2} fill={f as string} sw={0.8} />
      ))}
    </g>
  ),
  joust: () => (
    <g>
      <Bg sky="#cfe0ff" ground="#8fbf5a" y={50} />
      <R x={0} y={44} w={100} h={6} fill="#a87a4a" sw={1} />
      <P d="M6 58 C8 46 16 42 26 44 L30 40 L34 46 C38 50 36 58 34 62 H10Z" fill="#fbfbf7" />
      <R x={14} y={28} w={12} h={16} fill="#b9c2cc" rx={3} />
      <R x={15} y={20} w={10} h={10} fill="#8f9aa5" rx={4} />
      <P d="M17 25 H23" sw={1.6} />
      <Stick x1={24} y1={36} x2={58} y2={28} w={2.4} color="#d14b3c" />
      <P d="M94 58 C92 46 84 42 74 44 L70 40 L66 46 C62 50 64 58 66 62 H90Z" fill="#3a3a44" />
      <R x={74} y={28} w={12} h={16} fill="#b9c2cc" rx={3} />
      <R x={75} y={20} w={10} h={10} fill="#8f9aa5" rx={4} />
      <P d="M77 25 H83" sw={1.6} />
      <Stick x1={76} y1={36} x2={42} y2={28} w={2.4} color="#3566b8" />
      <Star x={50} y={28} r={6} fill="#fff3b0" />
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
  hitojichi: () => (
    <g>
      <Bg sky="#ffe9c0" ground="#9fbf6a" y={54} />
      {[[4, '#c0392b'], [70, '#3f5fa3']].map(([x, f]) => (
        <g key={x as number}>
          <R x={(x as number) + 4} y={30} w={18} h={24} fill="#fbfbf7" />
          <P d={`M${x} 30 L${(x as number) + 13} 22 L${(x as number) + 26} 30Z`} fill="#3a3a44" />
          <R x={(x as number) + 8} y={14} w={10} h={8} fill="#fbfbf7" sw={1.1} />
          <P d={`M${(x as number) + 5} 14 L${(x as number) + 13} 8 L${(x as number) + 21} 14Z`} fill="#3a3a44" sw={1.1} />
          <R x={(x as number) + 11} y={42} w={4} h={12} fill="#7a5a3a" sw={1} />
          <Stick x1={(x as number) + 24} y1={54} x2={(x as number) + 24} y2={30} w={1} color="#7a5a3a" />
          <R x={(x as number) + 24} y={30} w={6} h={12} fill={f as string} sw={1} />
        </g>
      ))}
      <P d="M28 62 C40 56 60 56 72 62" stroke="#fbf4e2" sw={3} />
      <P d="M28 62 C40 56 60 56 72 62" sw={0.8} />
      <Mini x={50} y={50} c="#d97ab0" s={1.1} />
      <P d="M45 46 C44 41 47 39 50 41 C53 39 56 41 55 46" fill="#2f2a2a" sw={1} />
      <P d="M60 50 h6 l-2 -2 M66 50 l-2 2" sw={1.2} />
      <P d="M38 40 C36 36 40 34 41 37 C42 34 46 36 44 40 L41 43Z" fill="#e5534b" sw={0.9} />
    </g>
  ),

  // ---------- 江戸・幕末 ----------
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
  ino: () => (
    <g>
      <Bg sky="#e2f2f6" />
      <P d="M70 8 C76 10 80 14 76 20 C80 24 72 30 66 30 C62 36 58 40 54 46 C50 50 44 52 40 54 C34 56 28 58 22 62 C16 64 12 60 16 56 C22 52 30 50 36 46 C42 42 48 38 54 32 C58 26 62 20 64 14 C66 10 68 8 70 8Z" fill="#9fd08a" />
      <P d="M70 12 C66 20 60 30 52 38 C44 46 32 52 20 58" stroke="#e5534b" sw={1.4} op={0.9} />
      {[[70, 12], [62, 24], [52, 38], [36, 48], [20, 58]].map(([x, y]) => (
        <C key={`${x}`} x={x} y={y} r={1.6} fill="#e5534b" sw={0.8} />
      ))}
      <C x={82} y={58} r={8} fill="#a87a4a" />
      <C x={82} y={58} r={2} fill={O} sw={0} />
      {[0, 60, 120].map((a) => (
        <P key={a} d={`M${82 + Math.cos((a * Math.PI) / 180) * 7} ${58 + Math.sin((a * Math.PI) / 180) * 7} L${82 - Math.cos((a * Math.PI) / 180) * 7} ${58 - Math.sin((a * Math.PI) / 180) * 7}`} sw={1} />
      ))}
      <Stick x1={82} y1={58} x2={70} y2={44} w={1.4} color="#7a5a3a" />
      <Mini x={66} y={40} c="#3a5a8c" s={0.9} />
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
  rokumeikan: () => (
    <g>
      <Bg sky="#2c2a4a" ground="#8a5a3a" y={58} />
      <P d="M50 0 V8" sw={1} />
      <P d="M36 8 H64 L58 16 H42Z" fill="#f2c94c" />
      {[38, 44, 50, 56, 62].map((x) => (
        <C key={x} x={x} y={18} r={1.6} fill="#fff3b0" sw={0.7} />
      ))}
      {[8, 88].map((x) => (
        <g key={x}>
          <R x={x - 5} y={20} w={10} h={30} fill="#3a5a8c" rx={5} />
          <P d={`M${x} 20 V50 M${x - 5} 35 H${x + 5}`} sw={0.8} />
        </g>
      ))}
      <P d="M30 64 C30 48 36 40 42 40 C46 40 48 48 48 64Z" fill="#e5737b" />
      <C x={42} y={32} r={6} fill="#ffd9b8" />
      <P d="M36 30 C36 22 48 22 48 30" fill="#7a4e2e" sw={1.1} />
      <P d="M52 64 L54 44 C56 40 62 40 64 44 L66 64Z" fill="#2f2a2a" />
      <C x={59} y={33} r={6} fill="#ffd9b8" />
      <P d="M53 31 C53 25 65 25 65 31" fill="#2f2a2a" sw={1.1} />
      <Stick x1={46} y1={46} x2={56} y2={46} w={2} color="#ffd9b8" />
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
