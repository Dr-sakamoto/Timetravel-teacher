import { C, E, O, P } from './parts';

/** 人の形をしていない生徒（恐竜・ロボ・宇宙人など）。100×100 の座標系 */
export type Creature = 'trex' | 'triceratops' | 'brachio' | 'ptera' | 'raptor' | 'android' | 'alien' | 'robodog';

const cheek = (x: number, y: number) => <E x={x} y={y} rx={3} ry={1.9} fill="#f59c9c" sw={0} />;
const eye = (x: number, y: number, r = 2.3) => (
  <>
    <C x={x} y={y} r={r} fill={O} sw={0} />
    <C x={x + r * 0.35} y={y - r * 0.4} r={r * 0.32} fill="#fff" sw={0} />
  </>
);

export function CreaturePart({ kind }: { kind: Creature }) {
  switch (kind) {
    case 'trex':
      return (
        <g>
          <P d="M24 100 C22 80 32 66 50 64 C68 66 78 80 76 100Z" fill="#6fb35a" />
          <P d="M38 100 C38 86 44 78 50 78 C56 78 62 86 62 100Z" fill="#d9ecb0" sw={1.1} />
          <P d="M34 76 C30 78 28 82 30 84 C32 84 34 82 36 80" fill="#6fb35a" sw={1.3} />
          <P d="M66 76 C70 78 72 82 70 84 C68 84 66 82 64 80" fill="#6fb35a" sw={1.3} />
          <P d="M20 38 C18 20 34 10 52 11 C72 12 86 22 84 40 C83 52 74 60 58 61 C40 62 22 56 20 38Z" fill="#6fb35a" />
          <P d="M26 46 C40 52 66 52 82 42" sw={1.5} />
          {[32, 40, 48, 56, 64, 72].map((x, i) => (
            <P key={x} d={`M${x} ${48.5 + (i === 0 || i === 5 ? -1 : 0.6)} l2.5 4 l2.5 -4`} fill="#fff" sw={1} />
          ))}
          <P d="M30 22 C34 18 40 18 44 21 M58 21 C62 18 68 18 72 22" sw={2} />
          {eye(37, 28, 2.8)}
          {eye(65, 28, 2.8)}
          <C x={47} y={38} r={1} fill={O} sw={0} />
          <C x={55} y={38} r={1} fill={O} sw={0} />
          {cheek(28, 38)}
          {cheek(76, 38)}
          {[40, 50, 60].map((x) => (
            <C key={x} x={x} y={16} r={1.8} fill="#4f9440" sw={0} />
          ))}
        </g>
      );
    case 'triceratops':
      return (
        <g>
          <P d="M22 100 C22 82 34 72 50 72 C66 72 78 82 78 100Z" fill="#f2a65a" />
          <P d="M14 50 C10 26 26 8 50 8 C74 8 90 26 86 50 C80 60 20 60 14 50Z" fill="#f7c873" />
          {[20, 32, 50, 68, 80].map((x, i) => (
            <C key={x} x={x} y={[40, 20, 14, 20, 40][i]} r={2.6} fill="#e8834a" sw={1} />
          ))}
          <P d="M34 44 C34 30 66 30 66 44 L64 70 C60 80 40 80 36 70Z" fill="#f2a65a" />
          <P d="M38 34 C34 24 34 16 38 10 C40 18 42 26 43 34Z" fill="#fbf4e2" />
          <P d="M62 34 C66 24 66 16 62 10 C60 18 58 26 57 34Z" fill="#fbf4e2" />
          <P d="M48 58 C48 52 50 48 50 46 C51 50 52 54 52 58Z" fill="#fbf4e2" sw={1.1} />
          <P d="M42 64 Q50 74 58 64 Q50 68 42 64Z" fill="#e8834a" sw={1.2} />
          {eye(42, 48)}
          {eye(58, 48)}
          {cheek(38, 56)}
          {cheek(62, 56)}
        </g>
      );
    case 'brachio':
      return (
        <g>
          <P d="M8 100 C8 82 22 74 38 76 C46 77 52 84 52 100Z" fill="#7fb2d9" />
          <P d="M36 80 C40 60 46 42 56 32 L66 38 C58 48 52 64 50 86Z" fill="#7fb2d9" />
          <P d="M52 32 C50 20 60 12 72 14 C84 16 90 24 86 32 C82 38 68 40 58 38 C54 37 52 35 52 32Z" fill="#7fb2d9" />
          <C x={66} y={13} r={4} fill="#7fb2d9" />
          <P d="M60 32 Q70 36 82 31" sw={1.3} />
          {eye(70, 24)}
          {cheek(78, 29)}
          <C x={84} y={24} r={0.9} fill={O} sw={0} />
          {[[44, 56], [48, 46], [24, 84], [32, 82]].map(([x, y]) => (
            <C key={`${x}${y}`} x={x} y={y} r={2} fill="#5f95c0" sw={0} />
          ))}
          <P d="M16 64 C16 58 22 56 24 60 M24 60 C26 54 32 56 30 62" stroke="#5aa04a" sw={2} />
        </g>
      );
    case 'ptera':
      return (
        <g>
          <P d="M50 52 C38 40 20 34 2 38 C10 46 14 54 18 64 C28 58 40 58 48 64Z" fill="#c69c6d" />
          <P d="M50 52 C62 40 80 34 98 38 C90 46 86 54 82 64 C72 58 60 58 52 64Z" fill="#c69c6d" />
          <P d="M18 64 L14 52 M30 60 L26 46 M82 64 L86 52 M70 60 L74 46" sw={0.9} op={0.5} />
          <E x={50} y={70} rx={9} ry={16} fill="#d9b48a" />
          <P d="M38 34 C38 24 44 20 50 20 C56 20 62 24 62 34 C62 40 56 44 50 44 C44 44 38 40 38 34Z" fill="#d9b48a" />
          <P d="M44 24 C40 14 30 8 22 6 C30 12 36 20 40 28Z" fill="#e8834a" />
          <P d="M56 36 C64 38 76 42 84 48 C74 46 64 44 56 42Z" fill="#f2c94c" />
          {eye(46, 31)}
          {eye(56, 31)}
          {cheek(42, 37)}
        </g>
      );
    case 'raptor':
      return (
        <g>
          <P d="M16 100 C12 80 22 58 40 50 C56 56 66 78 64 100Z" fill="#9ab35a" />
          <P d="M64 92 C76 92 88 86 96 76 C92 90 80 100 64 100Z" fill="#9ab35a" />
          <P d="M20 38 C16 24 30 16 44 18 C58 14 82 22 88 34 C92 42 86 48 76 48 L52 50 C40 58 24 54 20 38Z" fill="#9ab35a" />
          <P d="M52 42 C62 44 74 44 86 40" sw={1.4} />
          {[56, 63, 70, 77].map((x) => (
            <P key={x} d={`M${x} 43 l2 3 l2 -3.4`} fill="#fff" sw={0.9} />
          ))}
          <P d="M30 22 L36 14 L40 22 L46 14 L50 20 L56 14 L58 21" fill="#e8834a" sw={1.1} />
          <P d="M36 28 L46 30" sw={2} />
          {eye(42, 33, 2.6)}
          <C x={82} y={33} r={0.9} fill={O} sw={0} />
          {cheek(48, 40)}
          <P d="M44 72 C50 74 54 78 52 82 L49 80 M52 82 L48 84" stroke={O} sw={1.4} />
          {[[30, 76], [46, 88], [34, 92]].map(([x, y]) => (
            <C key={`${x}${y}`} x={x} y={y} r={2} fill="#7a9440" sw={0} />
          ))}
        </g>
      );
    case 'android':
      return (
        <g>
          <P d="M16 100 C17 80 30 71 50 70 C70 71 83 80 84 100 Z" fill="#e8edf2" />
          <P d="M40 70 L42 100 M60 70 L58 100" sw={1} op={0.4} />
          <C x={50} y={86} r={5} fill="#35e0ff" />
          <C x={50} y={86} r={2.2} fill="#fff" sw={0} />
          <rect x={44} y={62} width={12} height={10} fill="#b0b6bd" stroke={O} strokeWidth={1.3} />
          <P d="M50 22 V12" sw={1.6} />
          <C x={50} y={10} r={3} fill="#e5534b" />
          <rect x={28} y={22} width={44} height={42} rx={14} fill="#f4f6f8" stroke={O} strokeWidth={1.4} />
          <rect x={22.5} y={38} width={6} height={12} rx={2} fill="#b0b6bd" stroke={O} strokeWidth={1.2} />
          <rect x={71.5} y={38} width={6} height={12} rx={2} fill="#b0b6bd" stroke={O} strokeWidth={1.2} />
          <rect x={33} y={36} width={34} height={14} rx={7} fill="#1f2b3a" stroke={O} strokeWidth={1.2} />
          <E x={42} y={43} rx={3.6} ry={3} fill="#35e0ff" sw={0} />
          <E x={58} y={43} rx={3.6} ry={3} fill="#35e0ff" sw={0} />
          <P d="M44 56 Q50 60 56 56" sw={1.5} />
          {cheek(36, 55)}
          {cheek(64, 55)}
          <P d="M34 28 Q50 24 66 28" stroke="#fff" sw={2} />
        </g>
      );
    case 'alien':
      return (
        <g>
          <P d="M16 100 C17 80 30 71 50 70 C70 71 83 80 84 100 Z" fill="#fbfbf7" />
          <P d="M29 75 L50 93 L71 75 L62 70.5 L50 83 L38 70.5 Z" fill="#2c3e66" />
          <P d="M45 83 L55 83 L52 90 L50 88 L48 90Z" fill="#e5534b" sw={1.2} />
          <P d="M40 18 L32 4 M60 18 L68 4" sw={1.6} />
          <C x={32} y={4} r={3.2} fill="#ffd34d" />
          <C x={68} y={4} r={3.2} fill="#ffd34d" />
          <P d="M24 36 C24 18 38 12 50 12 C62 12 76 18 76 36 C76 54 62 70 50 70 C38 70 24 54 24 36Z" fill="#9be36d" />
          <E x={39} y={40} rx={7} ry={9} fill="#1d1d1d" sw={1.2} rot={-25} />
          <E x={61} y={40} rx={7} ry={9} fill="#1d1d1d" sw={1.2} rot={25} />
          <C x={37} y={36} r={2.2} fill="#fff" sw={0} />
          <C x={59} y={36} r={2.2} fill="#fff" sw={0} />
          <P d="M46 58 Q50 61 54 58" sw={1.5} />
          {cheek(32, 54)}
          {cheek(68, 54)}
        </g>
      );
    case 'robodog':
      return (
        <g>
          <P d="M18 100 C18 82 32 72 50 72 C68 72 82 82 82 100Z" fill="#c9d3dc" />
          <rect x={38} y={70} width={24} height={6} rx={2} fill="#e5534b" stroke={O} strokeWidth={1.2} />
          <C x={50} y={80} r={3.6} fill="#f2c94c" />
          <P d="M22 34 L18 14 L36 24Z" fill="#8f9aa5" />
          <P d="M78 34 L82 14 L64 24Z" fill="#8f9aa5" />
          <rect x={22} y={20} width={56} height={46} rx={20} fill="#e3e9ee" stroke={O} strokeWidth={1.4} />
          <rect x={30} y={30} width={40} height={16} rx={6} fill="#1f2b3a" stroke={O} strokeWidth={1.2} />
          <P d="M36 40 Q40 34 44 40 M56 40 Q60 34 64 40" stroke="#6ef08a" sw={2} />
          <E x={50} y={54} rx={10} ry={7} fill="#fff" />
          <E x={50} y={51} rx={3} ry={2} fill={O} sw={0} />
          <P d="M50 53 V56 M46 57 Q50 60 54 57" sw={1.3} />
          <P d="M48 58 Q50 64 52 58Z" fill="#f08a9a" sw={1} />
          {cheek(32, 54)}
          {cheek(68, 54)}
        </g>
      );
  }
}
