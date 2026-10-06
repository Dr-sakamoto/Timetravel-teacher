import { C, E, O, P } from './parts';

/** 人の形をしていない生徒（恐竜・ロボ・宇宙人など）。100×100 の座標系 */
export type Creature = 'trex' | 'triceratops' | 'ptera' | 'raptor' | 'android' | 'alien' | 'robodog' | 'martian' | 'cyborg' | 'oracle' | 'egg' | 'oviraptor' | 'parasaur' | 'spino';

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
    case 'egg':
      // オヴィラプトルの卵泥棒で来る卵：ひびが入って、中からのぞいている
      return (
        <g>
          <E x={50} y={92} rx={30} ry={6} fill="#c9b48a" sw={0} />
          <P d="M50 18 C30 18 20 46 20 64 C20 84 34 96 50 96 C66 96 80 84 80 64 C80 46 70 18 50 18Z" fill="#fbf4e2" />
          {[[38, 40, 4], [62, 52, 5], [44, 74, 3.5], [66, 78, 3], [34, 60, 2.5]].map(([x, y, r]) => (
            <C key={`${x}${y}`} x={x} y={y} r={r} fill="#a8d08d" sw={0} />
          ))}
          <P d="M28 50 L36 46 L42 54 L50 46 L58 54 L64 46 L72 50" sw={1.6} />
          <C x={44} y={40} r={2} fill={O} sw={0} />
          <C x={56} y={40} r={2} fill={O} sw={0} />
          <P d="M20 30 l-6 -4 M24 22 l-4 -6 M80 30 l6 -4 M76 22 l4 -6" sw={1.2} op={0.6} />
        </g>
      );
    case 'oviraptor':
      return (
        <g>
          <P d="M24 100 C22 82 32 70 48 68 C64 70 74 82 72 100Z" fill="#6aa6c9" />
          <P d="M30 80 C20 78 12 70 10 62 C18 66 26 70 32 72Z" fill="#e8834a" />
          <P d="M66 80 C76 78 84 70 86 62 C78 66 70 70 64 72Z" fill="#e8834a" />
          <P d="M36 66 C36 56 42 50 50 50 C58 50 64 56 64 66Z" fill="#6aa6c9" />
          <P d="M30 36 C28 22 38 14 50 14 C62 14 72 22 70 36 C68 46 60 52 50 52 C40 52 32 46 30 36Z" fill="#8cc2e0" />
          <P d="M42 16 C42 6 58 6 58 16 C56 12 44 12 42 16Z" fill="#e5534b" />
          <P d="M60 38 C68 38 76 40 80 44 C74 46 66 46 60 44Z" fill="#f2c94c" />
          {eye(42, 30)}
          {eye(58, 30)}
          {cheek(38, 40)}
          <E x={50} y={86} rx={8} ry={10} fill="#fbf4e2" />
          <C x={47} y={83} r={1.6} fill="#a8d08d" sw={0} />
          <C x={53} y={89} r={1.3} fill="#a8d08d" sw={0} />
        </g>
      );
    case 'parasaur':
      return (
        <g>
          <P d="M18 100 C16 80 30 68 50 68 C70 68 84 80 82 100Z" fill="#7fbf7a" />
          <P d="M40 70 C40 60 44 52 50 50 C56 52 60 60 60 70Z" fill="#7fbf7a" />
          <P d="M28 40 C26 26 38 18 52 20 C64 22 76 30 76 42 C76 52 66 56 54 56 C40 56 30 52 28 40Z" fill="#98d293" />
          <P d="M40 22 C46 10 62 2 82 4 C84 8 80 12 74 12 C64 12 54 18 50 24Z" fill="#e8834a" />
          <P d="M60 46 C68 48 74 46 78 42" sw={1.3} />
          {eye(42, 36)}
          {eye(58, 34)}
          {cheek(38, 46)}
          <P d="M86 10 C90 6 94 8 96 4 M88 16 C92 14 96 16 98 12" stroke="#f2c94c" sw={1.4} />
          {[[30, 84], [64, 88], [44, 92]].map(([x, y]) => (
            <C key={`${x}${y}`} x={x} y={y} r={2} fill="#5aa04a" sw={0} />
          ))}
        </g>
      );
    case 'spino':
      return (
        <g>
          <P d="M40 46 C40 28 46 12 54 6 C58 16 62 20 68 10 C72 20 76 24 84 16 C88 28 86 40 82 48Z" fill="#e5534b" />
          <P d="M46 44 L54 10 M58 44 L66 14 M70 44 L80 20" sw={0.9} op={0.5} />
          <P d="M18 100 C16 80 30 66 50 66 C70 66 84 80 82 100Z" fill="#5f8fb0" />
          <P d="M10 52 C8 40 18 34 32 36 C50 36 74 38 86 46 C92 50 88 58 80 58 L40 60 C26 62 12 60 10 52Z" fill="#7aaed0" />
          <P d="M40 52 C54 54 70 54 84 50" sw={1.3} />
          {[48, 56, 64, 72].map((x) => (
            <P key={x} d={`M${x} 53 l2 3 l2 -3.4`} fill="#fff" sw={0.9} />
          ))}
          {eye(24, 44, 2.6)}
          <C x={82} y={46} r={0.9} fill={O} sw={0} />
          {cheek(32, 52)}
          <P d="M24 84 Q32 80 40 84 Q48 88 56 84 Q64 80 72 84" stroke="#9be0ff" sw={1.6} />
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
    case 'oracle':
      // 全知のAI：人の形ではなく、顔の出る画面を持ったスーパーコンピュータの筐体。両脇にもラックが並ぶ
      return (
        <g>
          <C x={50} y={50} r={40} fill="#d8f6ff" sw={0} />
          {[6, 76].map((x) => (
            <g key={x}>
              <rect x={x} y={36} width={18} height={64} rx={2} fill="#3a4654" stroke={O} strokeWidth={1.3} />
              {[42, 50, 58, 66, 74, 82, 90].map((y, k) => (
                <g key={y}>
                  <rect x={x + 3} y={y} width={12} height={4} rx={1} fill="#1f2b3a" stroke={O} strokeWidth={0.8} />
                  <C x={x + 5.5} y={y + 2} r={0.9} fill={['#6ef08a', '#35e0ff', '#ffd34d'][(k + x) % 3]} sw={0} />
                </g>
              ))}
            </g>
          ))}
          <P d="M30 14 C26 6 16 8 15 36 M70 14 C74 6 84 8 85 36" stroke="#35e0ff" sw={1.6} />
          <rect x={24} y={16} width={52} height={86} rx={4} fill="#2c3e66" stroke={O} strokeWidth={1.4} />
          <rect x={22} y={11} width={56} height={8} rx={2} fill="#b0b6bd" stroke={O} strokeWidth={1.3} />
          <rect x={29} y={23} width={42} height={26} rx={5} fill="#0f1a2a" stroke={O} strokeWidth={1.2} />
          <P d="M36 36 Q40 31 44 36 M56 36 Q60 31 64 36" stroke="#35e0ff" sw={2.2} />
          <P d="M44 42 Q50 46 56 42" stroke="#35e0ff" sw={1.8} />
          <P d="M32 27 H42" stroke="#35e0ff" sw={0.9} op={0.5} />
          {[54, 62, 70, 78, 86, 94].map((y, k) => (
            <g key={y}>
              <rect x={29} y={y} width={42} height={5} rx={1.2} fill="#1f2b3a" stroke={O} strokeWidth={0.9} />
              <C x={33} y={y + 2.5} r={1} fill={k % 2 ? '#6ef08a' : '#35e0ff'} sw={0} />
              <C x={37} y={y + 2.5} r={1} fill={k % 3 ? '#35e0ff' : '#ffd34d'} sw={0} />
              <P d={`M44 ${y + 2.5} H67`} stroke="#4a5d86" sw={1} />
            </g>
          ))}
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
    case 'martian':
      // 火星人の侵略で勝手に座る子：タコ型の火星人。何もできないので、ぼんやり顔
      return (
        <g>
          {[22, 34, 46, 58, 70].map((x) => (
            <P key={x} d={`M${x + 4} 72 C${x - 2} 82 ${x + 8} 88 ${x + 2} 98`} sw={7.5} stroke={O} />
          ))}
          {[22, 34, 46, 58, 70].map((x) => (
            <P key={`t${x}`} d={`M${x + 4} 72 C${x - 2} 82 ${x + 8} 88 ${x + 2} 98`} sw={5} stroke="#d9606a" />
          ))}
          <P d="M18 52 C14 24 32 8 50 8 C68 8 86 24 82 52 C80 68 66 76 50 76 C34 76 20 68 18 52Z" fill="#e5737b" />
          {[30, 44, 60, 70].map((x, i) => (
            <C key={x} x={x} y={[24, 16, 18, 30][i]} r={[3, 2.2, 2.6, 2][i]} fill="#c95560" sw={0} />
          ))}
          <E x={38} y={46} rx={7} ry={7.5} fill="#fff" />
          <E x={62} y={46} rx={7} ry={7.5} fill="#fff" />
          <C x={39} y={48} r={2.4} fill={O} sw={0} />
          <C x={61} y={48} r={2.4} fill={O} sw={0} />
          <P d="M31 39 Q38 36 45 39 M55 39 Q62 36 69 39" sw={1.3} />
          <E x={50} y={62} rx={4} ry={2.6} fill="#9b3542" sw={1.2} />
          <P d="M14 30 C8 22 10 12 18 10 M86 30 C92 22 90 12 82 10" stroke="#9be0ff" sw={1.2} op={0.8} />
          <P d="M12 46 C2 40 0 30 6 22 M88 46 C98 40 100 30 94 22" stroke="#9be0ff" sw={1.2} op={0.6} />
        </g>
      );
    case 'cyborg':
      // サイボーグ化された子：顔の右半分が機械、片腕がロボットアーム
      return (
        <g>
          <P d="M16 100 C17 80 30 71 50 70 C70 71 83 80 84 100 Z" fill="#3a4654" />
          <P d="M50 70 C70 71 83 80 84 100 L50 100Z" fill="#9aa7b4" />
          <P d="M58 78 H76 M60 86 H80 M62 94 H82" stroke="#35e0ff" sw={1.2} />
          <C x={42} y={86} r={4.5} fill="#35e0ff" />
          <C x={42} y={86} r={1.8} fill="#fff" sw={0} />
          <rect x={44.5} y={60} width={11} height={12} fill="#ffd9b8" stroke={O} strokeWidth={1.4} />
          <P d="M31 47 C31 33 39 26 50 26 L50 68 C39 68 31 60 31 47Z" fill="#ffd9b8" />
          <P d="M50 26 C61 26 69 33 69 47 C69 60 61 68 50 68Z" fill="#c9d3dc" />
          <P d="M50 26 V68" sw={1.6} />
          <P d="M30 40 C28 26 38 18 50 19 L50 30 C42 29 35 33 32 40Z" fill="#2f2a2a" />
          <P d="M50 19 C62 18 72 26 70 40 L66 36 C62 31 56 29 50 30Z" fill="#7b8794" />
          {[54, 60, 66].map((x) => (
            <C key={x} x={x} y={58} r={0.9} fill={O} sw={0} />
          ))}
          <P d="M53 34 L66 34 M53 64 L64 62" sw={1} />
          <C x={42} y={46} r={2.3} fill={O} sw={0} />
          <C x={42.8} y={45.1} r={0.75} fill="#fff" sw={0} />
          <rect x={53} y={41} width={12} height={9} rx={2} fill="#1f2b3a" stroke={O} strokeWidth={1.2} />
          <C x={59} y={45.5} r={2.6} fill="#e5534b" sw={0} />
          <C x={59} y={45.5} r={1} fill="#ffd0cc" sw={0} />
          <P d="M40 58 Q46 61 50 58" sw={1.4} />
          <P d="M50 58 H56" sw={1.4} />
          <E x={36} y={54} rx={3} ry={1.9} fill="#f59c9c" sw={0} />
        </g>
      );
  }
}
