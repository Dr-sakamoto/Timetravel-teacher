/**
 * 生徒カードのオリジナルイラスト用の部品。すべて 100×100 の座標系で描く。
 * 頭は (50,47) を中心に半径およそ19、肩は y=70 あたりから下。
 */

export const O = '#4b3a2f';
const SW = 1.4;

export function P({ d, fill = 'none', sw = SW, stroke = O, op }: { d: string; fill?: string; sw?: number; stroke?: string; op?: number }) {
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity={op} />;
}
export function C({ x, y, r, fill = 'none', sw = SW, stroke = O }: { x: number; y: number; r: number; fill?: string; sw?: number; stroke?: string }) {
  return <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />;
}
export function E({ x, y, rx, ry, fill = 'none', sw = SW, stroke = O, rot }: { x: number; y: number; rx: number; ry: number; fill?: string; sw?: number; stroke?: string; rot?: number }) {
  return (
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={sw} transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} />
  );
}
/** 太さのある棒（輪郭つき） */
export function Stick({ x1, y1, x2, y2, w, color }: { x1: number; y1: number; x2: number; y2: number; w: number; color: string }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={O} strokeWidth={w + SW * 2} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} />
    </g>
  );
}

export const SKIN = { light: '#ffe2c8', fair: '#ffd9b8', tan: '#f0c08f', brown: '#d39a68', red: '#e98a6a', pale: '#f4ece4' } as const;
export const HAIR = { black: '#2f2a2a', brown: '#7a4e2e', dark: '#4a3326', blond: '#f2c94c', red: '#d9622b', grey: '#b9b4ad', white: '#f2f0ea', pink: '#f59ac2', navy: '#2c3e66' } as const;

// ---------- 顔 ----------

export type Expr = 'normal' | 'smile' | 'happy' | 'grin' | 'cool' | 'angry' | 'calm' | 'wink' | 'tongue' | 'shout' | 'surprised' | 'sleepy';

export function Face({ skin, expr = 'normal', liner }: { skin: string; expr?: Expr; liner?: boolean }) {
  const eyes = (() => {
    switch (expr) {
      case 'happy':
      case 'smile':
        return (
          <>
            <P d="M39.5 49.5 Q43 45.5 46.5 49.5" sw={1.8} />
            <P d="M53.5 49.5 Q57 45.5 60.5 49.5" sw={1.8} />
          </>
        );
      case 'wink':
        return (
          <>
            <Dot x={43} y={48.5} />
            <P d="M53.5 49.5 Q57 45.5 60.5 49.5" sw={1.8} />
          </>
        );
      case 'cool':
        return (
          <>
            <P d="M39 47 L47 46.5" sw={1.8} />
            <P d="M53 46.5 L61 47" sw={1.8} />
            <E x={43.5} y={49} rx={1.6} ry={1.4} fill={O} sw={0} />
            <E x={56.5} y={49} rx={1.6} ry={1.4} fill={O} sw={0} />
          </>
        );
      case 'calm':
      case 'sleepy':
        return (
          <>
            <P d="M39.5 48.5 Q43 51.5 46.5 48.5" sw={1.8} />
            <P d="M53.5 48.5 Q57 51.5 60.5 48.5" sw={1.8} />
          </>
        );
      case 'surprised':
        return (
          <>
            <C x={43} y={48.5} r={2.6} fill="#fff" sw={1.3} />
            <C x={57} y={48.5} r={2.6} fill="#fff" sw={1.3} />
            <C x={43} y={48.5} r={1.1} fill={O} sw={0} />
            <C x={57} y={48.5} r={1.1} fill={O} sw={0} />
          </>
        );
      default:
        return (
          <>
            <Dot x={43} y={48.5} />
            <Dot x={57} y={48.5} />
          </>
        );
    }
  })();
  const brows =
    expr === 'angry' || expr === 'shout' ? (
      <>
        <P d="M38.5 42 L46.5 44.5" sw={2} />
        <P d="M61.5 42 L53.5 44.5" sw={2} />
      </>
    ) : expr === 'surprised' ? (
      <>
        <P d="M39.5 42.5 Q43 40.5 46.5 42.5" sw={1.4} />
        <P d="M53.5 42.5 Q57 40.5 60.5 42.5" sw={1.4} />
      </>
    ) : null;
  const mouth = (() => {
    switch (expr) {
      case 'grin':
      case 'happy':
        return <P d="M45 55.5 Q50 62.5 55 55.5 Z" fill="#c8483f" sw={1.3} />;
      case 'shout':
        return <E x={50} y={58} rx={3.2} ry={3} fill="#c8483f" sw={1.3} />;
      case 'surprised':
        return <E x={50} y={58} rx={2} ry={2.4} fill="#c8483f" sw={1.3} />;
      case 'cool':
        return <P d="M47 57.5 Q51 58.5 54 56.5" sw={1.4} />;
      case 'angry':
        return <P d="M46.5 58.5 Q50 55.5 53.5 58.5" sw={1.5} />;
      case 'tongue':
        return (
          <>
            <P d="M45 55.5 Q50 61 55 55.5 Z" fill="#c8483f" sw={1.3} />
            <P d="M47.5 58 Q50 64 52.5 58 Z" fill="#f08a9a" sw={1.1} />
          </>
        );
      case 'sleepy':
        return <P d="M48 57.5 h4" sw={1.4} />;
      default:
        return <P d="M46.5 56 Q50 59.5 53.5 56" sw={1.5} />;
    }
  })();
  return (
    <g>
      <C x={31} y={49.5} r={3.8} fill={skin} />
      <C x={69} y={49.5} r={3.8} fill={skin} />
      <E x={50} y={47} rx={19.5} ry={18.5} fill={skin} />
      {liner && (
        <>
          <P d="M39 47.5 Q43 44 47 47.5" fill="#5aa0d8" sw={0} op={0.6} />
          <P d="M53 47.5 Q57 44 61 47.5" fill="#5aa0d8" sw={0} op={0.6} />
          <P d="M38.5 48.5 L36 46.5" sw={1.3} />
          <P d="M61.5 48.5 L64 46.5" sw={1.3} />
        </>
      )}
      {eyes}
      {brows}
      <E x={38.5} y={54.5} rx={3} ry={1.9} fill="#f59c9c" sw={0} />
      <E x={61.5} y={54.5} rx={3} ry={1.9} fill="#f59c9c" sw={0} />
      {mouth}
    </g>
  );
}

function Dot({ x, y }: { x: number; y: number }) {
  return (
    <>
      <E x={x} y={y} rx={1.9} ry={2.4} fill={O} sw={0} />
      <C x={x + 0.6} y={y - 0.8} r={0.6} fill="#fff" sw={0} />
    </>
  );
}

// ---------- 髪 ----------

export type HairFront =
  | 'short'
  | 'side'
  | 'mid'
  | 'spiky'
  | 'buzz'
  | 'pompadour'
  | 'topknot'
  | 'bun'
  | 'patsun'
  | 'curly'
  | 'sides'
  | 'wig'
  | 'messy';
export type HairBack = 'long' | 'bob' | 'ponytail' | 'twin' | 'hime' | 'egypt' | 'wild' | 'tail' | 'shoulder';

export function HairBackPart({ kind, color }: { kind: HairBack; color: string }) {
  switch (kind) {
    case 'long':
      return <P d="M29 44 C27 27 73 27 71 44 C73 58 76 72 79 86 C66 91 34 91 21 86 C24 72 27 58 29 44Z" fill={color} />;
    case 'shoulder':
      return <P d="M29 44 C27 27 73 27 71 44 C72 56 74 66 75 74 C62 78 38 78 25 74 C26 66 28 56 29 44Z" fill={color} />;
    case 'bob':
      return <P d="M29 44 C27 27 73 27 71 44 C72 52 73 60 72.5 66 C62 69 38 69 27.5 66 C27 60 28 52 29 44Z" fill={color} />;
    case 'egypt':
      return <P d="M28.5 42 C27 25 73 25 71.5 42 L73.5 67 L26.5 67Z" fill={color} />;
    case 'hime':
      return <P d="M28.5 44 C27 26 73 26 71.5 44 L75 100 L25 100Z" fill={color} />;
    case 'ponytail':
      return (
        <>
          <P d="M64 31 C82 28 88 48 80 68 C78 56 73 45 66 39Z" fill={color} />
          <C x={66} y={33} r={2.6} fill="#e5534b" />
        </>
      );
    case 'tail':
      return <P d="M58 28 C70 22 80 30 74 40 C72 34 66 31 60 32Z" fill={color} />;
    case 'twin':
      return (
        <>
          <P d="M32 38 C16 38 12 60 18 78 C21 64 26 52 33 46Z" fill={color} />
          <P d="M68 38 C84 38 88 60 82 78 C79 64 74 52 67 46Z" fill={color} />
          <C x={32} y={39} r={2.6} fill="#ffd34d" />
          <C x={68} y={39} r={2.6} fill="#ffd34d" />
        </>
      );
    case 'wild':
      return (
        <P
          d="M30 42 C17 40 17 26 28 25 C28 13 43 12 48 19 C54 11 69 13 69 24 C81 22 85 38 72 42 C83 47 78 60 70 56 L30 56 C21 60 17 47 30 42Z"
          fill={color}
        />
      );
  }
}

export function HairFrontPart({ kind, color }: { kind: HairFront; color: string }) {
  switch (kind) {
    case 'short':
      return <P d="M30.5 48 C28 31 38 25 50 25 C63 25 72 31 69.5 48 C67 41 63 37 59 36 C55 39 47 40 41 36.5 C37 39 33 42 30.5 48 Z" fill={color} />;
    case 'side':
      return <P d="M30.5 49 C27 30 40 24.5 51 24.5 C63 24.5 72 31 69.5 49 C68 42 66 38 63 35 C55 40 44 41 34 40 C32.5 43 31 46 30.5 49Z" fill={color} />;
    case 'mid':
      return <P d="M30.5 50 C28 31 38 25 50 25 C62 25 72 31 69.5 50 C68 40 60 32 50 31.5 C40 32 32 40 30.5 50Z" fill={color} />;
    case 'spiky':
      return (
        <P
          d="M30 49 L26.5 39 L31.5 36.5 L28 27 L36.5 29 L37 20 L44.5 25.5 L50 17.5 L55.5 25.5 L63 20 L63.5 29 L72 27 L68.5 36.5 L73.5 39 L70 49 C67 41 63 37 59 36 L55 40 L50 36 L45 40 L41 36 C37 39 33 42 30 49Z"
          fill={color}
        />
      );
    case 'messy':
      return (
        <P
          d="M30 50 C25 42 27 34 31 31 C30 24 38 21 42 23 C45 18 55 18 58 22 C63 20 70 25 69 31 C73 35 74 43 70 50 C68 43 65 39 61 37 L57 41 L53 36.5 L47 40.5 L42 36.5 C37 39.5 33 44 30 50Z"
          fill={color}
        />
      );
    case 'buzz':
      return <P d="M31 45 C30 29 40 27 50 27 C60 27 70 29 69 45 C64 37 36 37 31 45Z" fill={color} op={0.85} />;
    case 'pompadour':
      return (
        <>
          <P d="M30.5 49 C28 34 31 29 35 27.5 C33 17 44 12 56 13 C69 14 75 22 70.5 30 C72 36 71 43 69.5 49 C67 42 64 38 60 37 C52 36 42 37 36.5 39.5 C33.5 42 31.5 45 30.5 49Z" fill={color} />
          <P d="M40 22 C47 16.5 59 17 66 23.5" stroke="#fff" sw={1.6} op={0.5} />
        </>
      );
    case 'topknot':
      return (
        <>
          <E x={50} y={33} rx={13} ry={4.5} fill="#c7d3dd" sw={0} />
          <rect x={47} y={19.5} width={6} height={12} rx={2.5} fill={color} stroke={O} strokeWidth={SW} />
          <P d="M47 26 h6" stroke="#fff" sw={1} />
          <P d="M30.5 51 C29 41 31 34 36 30.5 L37.5 40 C34 42.5 32 46 30.5 51Z" fill={color} />
          <P d="M69.5 51 C71 41 69 34 64 30.5 L62.5 40 C66 42.5 68 46 69.5 51Z" fill={color} />
        </>
      );
    case 'bun':
      return (
        <>
          <C x={50} y={23} r={6.5} fill={color} />
          <P d="M42 22 L58 24" sw={1.6} />
          <P d="M31 46 C29 30 38 27 50 27 C62 27 71 30 69 46 C64 35 36 35 31 46Z" fill={color} />
        </>
      );
    case 'patsun':
      return (
        <>
          <P d="M30.5 52 C28 31 38 25.5 50 25.5 C62 25.5 72 31 69.5 52 L69.5 40.5 L30.5 40.5 Z" fill={color} />
          <P d="M30.5 40 L36.5 40 L35 64 L30.8 62Z" fill={color} />
          <P d="M69.5 40 L63.5 40 L65 64 L69.2 62Z" fill={color} />
        </>
      );
    case 'curly':
      return (
        <P
          d="M30.5 49 C26 44 27 38 30 36 C27 31 32 26 37 27 C38 22 45 21 48 24 C51 20 58 21 60 25 C65 23 71 28 69 33 C73 36 73 44 69.5 49 C67 42 63 38 59 37 C55 40 46 40 41 37 C36 40 33 44 30.5 49Z"
          fill={color}
        />
      );
    case 'sides':
      return (
        <>
          <P d="M30.5 54 C27.5 46 28.5 38 33 34.5 C34.5 40 35 46 30.5 54Z" fill={color} />
          <P d="M69.5 54 C72.5 46 71.5 38 67 34.5 C65.5 40 65 46 69.5 54Z" fill={color} />
          <P d="M42 33 Q46 30.5 50 31" stroke="#fff" sw={1.6} op={0.7} />
        </>
      );
    case 'wig':
      return (
        <>
          <P d="M31 46 C29 29 38 25 50 25 C62 25 71 29 69 46 C66 37 60 34 50 34 C40 34 34 37 31 46Z" fill={color} />
          {[44, 51.5].map((y) => (
            <g key={y}>
              <E x={29} y={y} rx={4.5} ry={3.6} fill={color} />
              <E x={71} y={y} rx={4.5} ry={3.6} fill={color} />
            </g>
          ))}
        </>
      );
  }
}

// ---------- ひげ ----------

export type Beard = 'mustache' | 'full' | 'long' | 'goatee' | 'stubble' | 'whiskers' | 'thin' | 'kaiser';

export function BeardPart({ kind, color }: { kind: Beard; color: string }) {
  const mustache = (
    <P d="M42.5 55.5 C45 52.8 48 52.8 50 54.4 C52 52.8 55 52.8 57.5 55.5 C55 57.2 52 56.6 50 55.8 C48 56.6 45 57.2 42.5 55.5Z" fill={color} sw={1.1} />
  );
  switch (kind) {
    case 'mustache':
      return mustache;
    case 'kaiser':
      return <P d="M38 55 C42 51 47 52 50 54.5 C53 52 58 51 62 55 C58 54 54 55.5 50 56.5 C46 55.5 42 54 38 55Z" fill={color} sw={1.1} />;
    case 'full':
      return (
        <>
          <P d="M31 50 C32 62 40 70 50 70 C60 70 68 62 69 50 C66 58 61 60 57 59.5 C55 58 45 58 43 59.5 C39 60 34 58 31 50Z" fill={color} />
          {mustache}
        </>
      );
    case 'long':
      return (
        <>
          <P d="M31.5 51 C33 64 40 74 44 84 C46 90 50 94 50 94 C50 94 54 90 56 84 C60 74 67 64 68.5 51 C66 58 61 60 57 59.5 C55 58 45 58 43 59.5 C39 60 34 58 31.5 51Z" fill={color} />
          <P d="M45 66 L47 80 M55 66 L53 80 M50 64 L50 86" sw={0.9} op={0.5} />
          {mustache}
        </>
      );
    case 'goatee':
      return (
        <>
          {mustache}
          <P d="M46.5 61 C47.5 67 52.5 67 53.5 61 C51.5 62 48.5 62 46.5 61Z" fill={color} sw={1.1} />
        </>
      );
    case 'thin':
      return (
        <>
          <P d="M45 55 C43 56 41 58 40 61 M55 55 C57 56 59 58 60 61" sw={1.3} />
          <P d="M48.5 62 L50 68 L51.5 62Z" fill={color} sw={1} />
        </>
      );
    case 'stubble':
      return <P d="M33 54 C35 64 42 66 50 66 C58 66 65 64 67 54 C62 61 38 61 33 54Z" fill={color} sw={0} op={0.3} />;
    case 'whiskers':
      return (
        <P
          d="M31 50 L29 56 L33 57 L31 63 L36 62 L36 68 L41 65 L43 71 L47 67 L50 72 L53 67 L57 71 L59 65 L64 68 L64 62 L69 63 L67 57 L71 56 L69 50 C66 58 61 60 57 59.5 C55 57.5 45 57.5 43 59.5 C39 60 34 58 31 50Z"
          fill={color}
        />
      );
  }
}

// ---------- 服 ----------

export type Outfit =
  | 'gakuran'
  | 'longran'
  | 'sailor'
  | 'blazer'
  | 'jersey'
  | 'tshirt'
  | 'tank'
  | 'uniform'
  | 'gi'
  | 'bare'
  | 'toga'
  | 'egypt'
  | 'cuirass'
  | 'kimono'
  | 'robe'
  | 'juuni'
  | 'yoroi'
  | 'plate'
  | 'military'
  | 'frock'
  | 'suit'
  | 'labcoat'
  | 'dress'
  | 'haori'
  | 'ninja'
  | 'tunic'
  | 'doublet'
  | 'hoodie'
  | 'smock'
  | 'cyber'
  | 'spacesuit'
  | 'tokko';

const BODY = 'M16 100 C17 80 30 71 50 70 C70 71 83 80 84 100 Z';

export function OutfitPart({ kind, c1, c2, skin }: { kind: Outfit; c1: string; c2: string; skin: string }) {
  const body = (fill: string) => <P d={BODY} fill={fill} />;
  const vneck = (fill: string) => <P d="M42 70.5 L50 84 L58 70.5 Z" fill={fill} />;
  switch (kind) {
    case 'gakuran':
      return (
        <>
          {body('#28303f')}
          <rect x={42.5} y={66.5} width={15} height={6} rx={1.5} fill="#28303f" stroke={O} strokeWidth={SW} />
          <P d="M50 72.5 V100" sw={1} stroke="#11161f" />
          {[79, 88, 97].map((y) => (
            <C key={y} x={50} y={y} r={1.6} fill="#f2c94c" sw={0.8} />
          ))}
        </>
      );
    case 'longran':
      return (
        <>
          {body('#1f2430')}
          {vneck(c1)}
          <P d="M42 70.5 L50 84 L36 100 L28 100 C30 86 34 76 42 70.5Z" fill="#1f2430" />
          <P d="M58 70.5 L50 84 L64 100 L72 100 C70 86 66 76 58 70.5Z" fill="#1f2430" />
          <P d="M36 74 L40 72" stroke="#f2c94c" sw={1.6} />
        </>
      );
    case 'sailor':
      return (
        <>
          {body('#fbfbf7')}
          <P d="M29 75 L50 93 L71 75 L62 70.5 L50 83 L38 70.5 Z" fill={c1} />
          <P d="M31 77 L50 92" stroke="#fff" sw={1} />
          <P d="M69 77 L50 92" stroke="#fff" sw={1} />
          <P d="M45 83 L55 83 L52 90 L50 88 L48 90Z" fill={c2} sw={1.2} />
        </>
      );
    case 'blazer':
      return (
        <>
          {body(c1)}
          {vneck('#fff')}
          <P d="M48.8 74 h2.4 l1.5 10 -2.7 3 -2.7 -3z" fill={c2} sw={1} />
          <P d="M42 70.5 L48 88 L44 100 M58 70.5 L52 88 L56 100" sw={1.2} />
          <rect x={60} y={86} width={8} height={3} fill="#f2c94c" stroke="none" opacity={0.8} />
        </>
      );
    case 'jersey':
      return (
        <>
          {body(c1)}
          <P d="M44 70.5 L50 76 L56 70.5" fill={c1} sw={1.2} />
          <P d="M50 76 V100" sw={1.2} />
          <P d="M22 84 C26 77 32 73 38 72 M78 84 C74 77 68 73 62 72" stroke={c2} sw={3} />
        </>
      );
    case 'tshirt':
      return (
        <>
          {body(c1)}
          <P d="M43 71 Q50 77 57 71" sw={1.3} />
          <C x={50} y={88} r={5} fill={c2} sw={0} />
        </>
      );
    case 'tank':
      return (
        <>
          <P d={BODY} fill={skin} />
          <P d="M30 100 C30 86 34 78 38 73 Q50 80 62 73 C66 78 70 86 70 100 Z" fill={c1} />
          <text x={50} y={96} fontSize={11} fontWeight={900} textAnchor="middle" fill={c2}>
            8
          </text>
        </>
      );
    case 'uniform':
      return (
        <>
          {body('#f6f4ee')}
          <P d="M42 70.5 L50 79 L58 70.5" fill={c1} sw={1.2} />
          <P d="M50 79 V100" sw={1} />
          <P d="M30 90 L38 88 M62 88 L70 90" stroke={c1} sw={2} />
          <text x={36} y={90} fontSize={7} fontWeight={900} fill={c1} transform="rotate(-8 36 90)">
            K
          </text>
        </>
      );
    case 'gi':
      return (
        <>
          {body('#fafaf5')}
          <P d="M41 70.5 L56 92 L59 89 L46 70.5 Z" fill="#fafaf5" />
          <P d="M59 70.5 L48 84 L52 88 L63 72" fill="#fafaf5" />
          <P d="M30 98 C40 95 60 95 70 98" stroke="#222" sw={4} />
        </>
      );
    case 'bare':
      return (
        <>
          <P d={BODY} fill={skin} />
          <P d="M42 82 Q46 84 49 82 M51 82 Q54 84 58 82" sw={1} op={0.5} />
          {c1 !== skin && <P d="M24 76 L66 100 L74 100 L28 73Z" fill={c1} sw={1.1} />}
        </>
      );
    case 'toga':
      return (
        <>
          {body('#f7f3ea')}
          <P d="M60 72 C50 82 40 90 30 100 L42 100 C50 92 58 84 66 74Z" fill={c1} />
          <P d="M36 80 Q42 86 40 96 M62 86 Q66 92 64 100" sw={1} op={0.5} />
        </>
      );
    case 'egypt':
      return (
        <>
          <P d={BODY} fill={skin} />
          <P d="M30 76 C36 70 64 70 70 76 C66 90 34 90 30 76Z" fill="#f2c94c" />
          <P d="M33.5 78 C40 87 60 87 66.5 78" stroke={c1} sw={2.2} />
          <P d="M36 80.5 C42 85 58 85 64 80.5" stroke="#d14b3c" sw={1.4} />
          <P d="M39 70.5 C44 75 56 75 61 70.5" fill={skin} sw={1.2} />
          <P d="M24 100 C28 92 72 92 76 100Z" fill="#fff" sw={1.1} />
        </>
      );
    case 'cuirass':
      return (
        <>
          <P d="M14 100 C16 80 28 71 50 70 C72 71 84 80 86 100Z" fill={c2} />
          <P d="M26 100 C26 86 34 76 50 75 C66 76 74 86 74 100Z" fill={c1} />
          <P d="M40 84 Q44 90 49 86 M60 84 Q56 90 51 86" sw={1.1} />
          <P d="M44 75 L50 72 L56 75" sw={1.1} />
        </>
      );
    case 'kimono':
    case 'robe':
      return (
        <>
          {body(c1)}
          <P d="M41 70.5 L55 94 L59 91 L46.5 70.5Z" fill={kind === 'robe' ? c2 : '#fff'} />
          <P d="M59 70.5 L49 86 L52 89.5 L62.5 72.5" fill={kind === 'robe' ? c2 : '#fff'} />
          {kind === 'kimono' && <P d="M22 86 Q30 82 34 90 M78 86 Q70 82 66 90" stroke={c2} sw={2} />}
        </>
      );
    case 'juuni':
      return (
        <>
          <P d="M10 100 C12 80 28 70 50 69 C72 70 88 80 90 100Z" fill={c1} />
          {[c2, '#fff4b0', '#7fc8a9', '#fff'].map((col, i) => (
            <P key={i} d={`M${40 + i * 1.6} 70.5 L50 ${92 - i * 4} L${60 - i * 1.6} 70.5`} fill={col} />
          ))}
        </>
      );
    case 'yoroi':
      return (
        <>
          {body(c1)}
          {[80, 87, 94].map((y) => (
            <P key={y} d={`M30 ${y} Q50 ${y + 3} 70 ${y}`} stroke={c2} sw={1.6} />
          ))}
          <P d="M14 86 L18 74 L32 72 L30 92Z" fill={c1} />
          <P d="M86 86 L82 74 L68 72 L70 92Z" fill={c1} />
          <P d="M16 80 L31 78 M15 85 L30.5 84 M84 80 L69 78 M85 85 L69.5 84" stroke={c2} sw={1.2} />
          <P d="M44 70.5 L50 77 L56 70.5" fill="#fff" sw={1.2} />
        </>
      );
    case 'plate':
      return (
        <>
          {body('#bcc4cc')}
          <P d="M14 88 C14 78 22 72 32 72 L34 84 C26 84 20 86 14 88Z" fill="#d4dadf" />
          <P d="M86 88 C86 78 78 72 68 72 L66 84 C74 84 80 86 86 88Z" fill="#d4dadf" />
          <P d="M50 74 V100" sw={1} />
          <P d="M38 82 Q50 86 62 82" sw={1} op={0.5} />
          {c1 !== '#bcc4cc' && <P d="M36 100 L38 86 Q50 90 62 86 L64 100Z" fill={c1} sw={1.1} />}
        </>
      );
    case 'military':
      return (
        <>
          {body(c1)}
          <P d="M42 70.5 L50 86 L58 70.5 Z" fill="#fff" />
          <P d="M42 70.5 L46 90 L38 92 L36 74Z" fill={c2} sw={1.1} />
          <P d="M58 70.5 L54 90 L62 92 L64 74Z" fill={c2} sw={1.1} />
          <P d="M18 82 C20 76 28 73 34 73 L32 80Z" fill="#f2c94c" />
          <P d="M82 82 C80 76 72 73 66 73 L68 80Z" fill="#f2c94c" />
          <P d="M19 82 L18.5 86 M23 81 L22.5 85.5 M27 80 L26.8 84.5 M81 82 L81.5 86 M77 81 L77.5 85.5 M73 80 L73.2 84.5" stroke="#f2c94c" sw={1.2} />
        </>
      );
    case 'frock':
      return (
        <>
          {body(c1)}
          {vneck('#fff')}
          <P d="M45 72 Q50 82 55 72 Q52 78 50 79 Q48 78 45 72Z" fill="#fff" sw={1} />
          <P d="M42 70.5 L46 96 M58 70.5 L54 96" stroke="#f2c94c" sw={1.6} />
        </>
      );
    case 'suit':
      return (
        <>
          {body(c1)}
          {vneck('#fff')}
          <P d="M48.8 74 h2.4 l1.5 10 -2.7 3 -2.7 -3z" fill={c2} sw={1} />
          <P d="M42 70.5 L47 86 L44 100 M58 70.5 L53 86 L56 100" sw={1.2} />
        </>
      );
    case 'labcoat':
      return (
        <>
          {body('#fbfbfb')}
          {vneck(c1)}
          <P d="M42 70.5 L48 90 L46 100 M58 70.5 L52 90 L54 100" sw={1.2} />
          <rect x={60} y={86} width={8} height={7} rx={1} fill="#fbfbfb" stroke={O} strokeWidth={1} />
          <P d="M62 85 V89" stroke="#4a90e2" sw={1.4} />
        </>
      );
    case 'dress':
      return (
        <>
          {body(c1)}
          <P d="M42 70.5 Q50 80 58 70.5 L56 76 Q50 82 44 76Z" fill={c2} sw={1.1} />
        </>
      );
    case 'haori':
      return (
        <>
          {body('#7cc4e8')}
          <P d="M16 100 L20 92 L24 100 L28 92 L32 100 M68 100 L72 92 L76 100 L80 92 L84 100" fill="#fff" sw={1.1} />
          <P d="M41 70.5 L55 94 L59 91 L46.5 70.5Z" fill="#fff" />
          <P d="M59 70.5 L49 86 L52 89.5 L62.5 72.5" fill="#fff" />
          <P d="M38 72 L44 100 M62 72 L56 100" sw={1.1} />
        </>
      );
    case 'ninja':
      return (
        <>
          {body(c1)}
          <P d="M41 70.5 L55 94 L59 91 L46.5 70.5Z" fill={c1} />
          <P d="M59 70.5 L49 86 L52 89.5 L62.5 72.5" fill={c1} />
          <P d="M30 98 C40 94 60 94 70 98" stroke={c2} sw={3} />
        </>
      );
    case 'tunic':
      return (
        <>
          {body(c1)}
          <P d="M44 70.5 L50 79 L56 70.5" fill={skin} sw={1.1} />
          <P d="M47 73 L53 73 M47.5 76 L52.5 76" sw={0.9} />
          <P d="M24 95 L76 95" stroke={c2} sw={3} />
        </>
      );
    case 'doublet':
      return (
        <>
          {body(c1)}
          <P d="M50 76 V100" sw={1} />
          {[80, 86, 92, 98].map((y) => (
            <C key={y} x={50} y={y} r={1.2} fill="#f2c94c" sw={0.6} />
          ))}
          <E x={50} y={70} rx={14} ry={4.5} fill="#fff" />
          <P d="M38 70 Q41 73 44 70 Q47 73 50 70 Q53 73 56 70 Q59 73 62 70" sw={0.9} />
        </>
      );
    case 'hoodie':
      return (
        <>
          <P d="M26 78 C26 66 74 66 74 78 C66 74 34 74 26 78Z" fill={c1} />
          {body(c1)}
          <P d="M40 70 Q50 78 60 70" sw={1.3} />
          <P d="M46 75 L45 86 M54 75 L55 86" sw={1.1} />
          <P d="M38 92 h24 l-2 8 h-20z" fill={c1} sw={1.1} />
        </>
      );
    case 'smock':
      return (
        <>
          {body(c1)}
          <P d="M43 71 Q50 76 57 71" sw={1.3} />
          <C x={40} y={86} r={2.2} fill="#e5534b" sw={0} />
          <C x={60} y={82} r={2} fill="#4a90e2" sw={0} />
          <C x={55} y={93} r={2.4} fill="#f2c94c" sw={0} />
        </>
      );
    case 'cyber':
      return (
        <>
          {body('#59606b')}
          <P d="M14 90 C14 78 22 72 32 72 L34 86 C26 86 20 88 14 90Z" fill="#a9b3bd" />
          <P d="M26 80 L30 84 M20 86 L26 87" stroke="#35e0ff" sw={1.4} />
          {vneck(c1)}
          <C x={62} y={86} r={3} fill="#35e0ff" />
        </>
      );
    case 'spacesuit':
      return (
        <>
          {body('#f4f6f8')}
          <rect x={41} y={83} width={18} height={10} rx={2} fill="#dfe6ec" stroke={O} strokeWidth={1.1} />
          <C x={45} y={88} r={1.6} fill="#e5534b" sw={0} />
          <C x={50} y={88} r={1.6} fill="#35c06f" sw={0} />
          <C x={55} y={88} r={1.6} fill="#4a90e2" sw={0} />
          <P d="M24 82 h6 M70 82 h6" stroke={c1} sw={3} />
        </>
      );
    case 'tokko':
      return (
        <>
          {body('#f6f4ee')}
          <P d="M42 70.5 L50 84 L58 70.5" fill="#2b2b2b" sw={1.2} />
          <P d="M42 70.5 L48 90 L44 100 M58 70.5 L52 90 L56 100" sw={1.2} />
          <text x={30} y={94} fontSize={9} fontWeight={900} fill="#c0392b" fontFamily="serif">
            夜
          </text>
          <text x={62} y={94} fontSize={9} fontWeight={900} fill="#c0392b" fontFamily="serif">
            露
          </text>
        </>
      );
  }
}

// ---------- 帽子・かぶりもの ----------

export type Hat =
  | 'cap'
  | 'hachimaki'
  | 'laurel'
  | 'crown'
  | 'diadem'
  | 'nemes'
  | 'nefercrown'
  | 'headcloth'
  | 'spartan'
  | 'guanjin'
  | 'pheasant'
  | 'softcap'
  | 'eboshi'
  | 'kabuto'
  | 'monkhood'
  | 'ninja'
  | 'beret'
  | 'feather'
  | 'bicorne'
  | 'swimcap'
  | 'bancap'
  | 'party'
  | 'space'
  | 'kerchief';

export type Crest = 'horns' | 'antler' | 'sun' | 'moon';

export function HatPart({ kind, color, crest }: { kind: Hat; color: string; crest?: Crest }) {
  switch (kind) {
    case 'cap':
      return (
        <>
          <P d="M30.5 42 C30 24 70 24 69.5 42 Z" fill={color} />
          <P d="M26 42 Q50 49 74 42 Q73 38.5 69.5 38.5 Q50 43 30.5 38.5 Q27 38.5 26 42Z" fill={color} />
          <C x={50} y={26.5} r={1.6} fill={color} sw={1} />
          <text x={50} y={37} fontSize={8} fontWeight={900} textAnchor="middle" fill="#fff">
            K
          </text>
        </>
      );
    case 'hachimaki':
      return (
        <>
          <P d="M29.5 37 C40 33 60 33 70.5 37 L70.5 42.5 C60 38.5 40 38.5 29.5 42.5Z" fill="#fff" />
          <C x={50} y={38} r={2.4} fill={color} sw={0} />
          <P d="M70 39 L80 34 L78 40 Z M70 41 L80 46 L76 40Z" fill="#fff" sw={1.1} />
        </>
      );
    case 'laurel':
      return (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const t = Math.PI * (1.05 - (i / 8) * 1.1);
            const x = 50 + Math.cos(t) * 21;
            const y = 44 - Math.sin(t) * 15;
            return <E key={i} x={x} y={y} rx={4} ry={2} fill="#7cb342" sw={1} rot={(-t * 180) / Math.PI + 90} />;
          })}
        </g>
      );
    case 'crown':
      return (
        <>
          <P d="M37 30 L36 16 L43.5 22.5 L50 13 L56.5 22.5 L64 16 L63 30 Z" fill="#f2c94c" />
          <C x={50} y={25} r={1.8} fill="#e5534b" sw={0.8} />
        </>
      );
    case 'diadem':
      return (
        <>
          <P d="M29.5 39 C40 34.5 60 34.5 70.5 39 L70.5 42 C60 37.5 40 37.5 29.5 42Z" fill="#f2c94c" />
          <P d="M48 37 C46 30 49 27 50.5 27 C53 27 54 31 51.5 33 L52 37Z" fill="#f2c94c" sw={1.1} />
          <C x={50} y={39} r={1.4} fill="#3fa7d6" sw={0.6} />
        </>
      );
    case 'nemes':
      return (
        <>
          <P d="M29 54 C25 30 36 21 50 21 C64 21 75 30 71 54 L79 76 L67 72 L68 45 C62 39 38 39 32 45 L33 72 L21 76 Z" fill={color} />
          {[26, 31, 36].map((y) => (
            <P key={y} d={`M${33 - (y - 26) * 0.3} ${y} Q50 ${y - 5} ${67 + (y - 26) * 0.3} ${y}`} stroke="#f2c94c" sw={1.8} />
          ))}
          <P d="M27 52 L33 50 M26 58 L33 57 M24 64 L33 63 M73 52 L67 50 M74 58 L67 57 M76 64 L67 63" stroke="#f2c94c" sw={1.8} />
          <P d="M32 43 C40 38 60 38 68 43 L68 46 C60 41 40 41 32 46Z" fill="#f2c94c" sw={1.1} />
          <P d="M48 41 C46 33 49 30 50.5 30 C53 30 54 34 51.5 36 L52 41Z" fill="#f2c94c" sw={1.1} />
        </>
      );
    case 'nefercrown':
      return (
        <>
          <P d="M34 37 L31 12 C43 8 59 8 69 12 L66 37 Z" fill={color} />
          <P d="M33 31 C44 28 56 28 67 31" stroke="#f2c94c" sw={2.4} />
          <P d="M48 33 C46 26 49 23 50.5 23 C53 23 54 27 51.5 29 L52 33Z" fill="#f2c94c" sw={1.1} />
        </>
      );
    case 'headcloth':
      return (
        <>
          <P d="M30.5 44 C28 26 72 26 69.5 44 C60 38 40 38 30.5 44Z" fill={color} />
          <P d="M69 40 L78 46 L74 50 L68 45Z" fill={color} sw={1.1} />
        </>
      );
    case 'spartan':
      return (
        <>
          <P d="M30 22 C34 4 66 4 70 22 C62 17 38 17 30 22Z" fill="#d14b3c" />
          <P d="M36 18 L38 10 M43 15 L44 7 M50 15 V6 M57 15 L56 7 M64 18 L62 10" stroke="#9e2f24" sw={1} />
          <P d="M27 60 C24 30 36 21 50 21 C64 21 76 30 73 60 L64 62 L63 46 C60 41 56 40 53 40 L53 58 L47 58 L47 40 C44 40 40 41 37 46 L36 62Z" fill="#d9a441" />
        </>
      );
    case 'guanjin':
      return (
        <>
          <P d="M33 36 C32 20 68 20 67 36 Z" fill={color} />
          <P d="M40 23 V35 M46 21.5 V35 M54 21.5 V35 M60 23 V35" stroke="#fff" sw={0.9} op={0.5} />
          <P d="M66 34 C72 40 74 48 72 56" stroke={color} sw={2.6} />
        </>
      );
    case 'pheasant':
      return (
        <>
          <P d="M42 30 C36 14 24 5 12 4" stroke={O} sw={4.6} />
          <P d="M42 30 C36 14 24 5 12 4" stroke="#c0532b" sw={2.6} />
          <P d="M58 30 C64 14 76 5 88 4" stroke={O} sw={4.6} />
          <P d="M58 30 C64 14 76 5 88 4" stroke="#c0532b" sw={2.6} />
          <P d="M31 38 C34 24 66 24 69 38 C60 33 40 33 31 38Z" fill="#f2c94c" />
          <C x={50} y={31} r={2} fill="#e5534b" sw={0.8} />
        </>
      );
    case 'softcap':
      return <P d="M30.5 41 C29 22 71 22 69.5 41 C62 36 38 36 30.5 41Z" fill={color} />;
    case 'eboshi':
      return (
        <>
          <P d="M37 34 C35 20 40 6 53 3 C61 6 63 20 62 34 Z" fill="#232323" />
          <P d="M31 39 C38 33 62 33 69 39" stroke="#232323" sw={2} />
        </>
      );
    case 'kabuto':
      return (
        <>
          {crest === 'horns' && <P d="M50 30 L37 9 L41.5 7.5 L50 25 L58.5 7.5 L63 9Z" fill="#f2c94c" />}
          {crest === 'antler' && (
            <>
              <P d="M44 28 C40 18 34 14 28 6 M37 18 L32 19 M40 13 L42 8" stroke={O} sw={4} />
              <P d="M56 28 C60 18 66 14 72 6 M63 18 L68 19 M60 13 L58 8" stroke={O} sw={4} />
              <P d="M44 28 C40 18 34 14 28 6 M37 18 L32 19 M40 13 L42 8" stroke="#2b2b2b" sw={2} />
              <P d="M56 28 C60 18 66 14 72 6 M63 18 L68 19 M60 13 L58 8" stroke="#2b2b2b" sw={2} />
            </>
          )}
          {crest === 'sun' && (
            <g>
              {Array.from({ length: 11 }, (_, i) => {
                const t = Math.PI * (0.1 + (i / 10) * 0.8);
                return <P key={i} d={`M50 30 L${50 + Math.cos(t) * 26} ${30 - Math.sin(t) * 24}`} stroke="#f2c94c" sw={2.2} />;
              })}
            </g>
          )}
          {crest === 'moon' && <P d="M30 14 C40 30 60 30 70 14 C60 24 40 24 30 14Z" fill="#f2c94c" />}
          <P d="M27 44 L19 52 L30 52Z" fill={color} />
          <P d="M73 44 L81 52 L70 52Z" fill={color} />
          <P d="M28.5 42 C27.5 23 72.5 23 71.5 42 Z" fill={color} />
          <P d="M26 42 Q50 47 74 42 L72 39 Q50 44 28 39Z" fill={color} />
          <P d="M36 30 Q50 26 64 30" stroke="#f2c94c" sw={1.4} />
          <C x={50} y={33} r={2} fill="#f2c94c" sw={0.8} />
        </>
      );
    case 'monkhood':
      return <P d="M27 66 C22 27 78 27 73 66 L67 68 C67 52 64 41 59 39 C54 41 46 41 41 39 C36 41 33 52 33 68Z" fill={color} />;
    case 'ninja':
      return (
        <>
          <P d="M27.5 54 C25 26 75 26 72.5 54 L69.5 50 L69.5 44 C60 41.5 40 41.5 30.5 44 L30.5 50Z" fill={color} />
          <P d="M30.5 51 C40 49.5 60 49.5 69.5 51 L68.5 60 C61 68.5 39 68.5 31.5 60Z" fill={color} />
          <P d="M70 44 L80 40 L79 46Z" fill={color} sw={1.1} />
        </>
      );
    case 'beret':
      return (
        <>
          <P d="M29 37 C25 26 48 17 69 25 C76 29 73 36 69 36 C58 32 42 32 29 37Z" fill={color} />
          <P d="M50 21 L51 17" sw={2} />
        </>
      );
    case 'feather':
      return (
        <>
          <P d="M60 24 C64 12 74 5 86 2 C80 10 72 18 64 26Z" fill="#e5534b" sw={1.1} />
          <P d="M27 39 C29 25 46 18 64 21 C71 22.5 76 29 74 37 C60 32.5 40 32.5 27 39Z" fill={color} />
        </>
      );
    case 'bicorne':
      return (
        <>
          <P d="M16 38 C22 22 38 16 50 16 C62 16 78 22 84 38 C70 32 30 32 16 38Z" fill="#202227" />
          <P d="M24 32 C36 28 64 28 76 32" stroke="#f2c94c" sw={1.2} />
          <C x={66} y={27} r={3.4} fill="#2c4fa3" sw={0.8} />
          <C x={66} y={27} r={2.2} fill="#fff" sw={0} />
          <C x={66} y={27} r={1.1} fill="#d63b33" sw={0} />
        </>
      );
    case 'swimcap':
      return (
        <>
          <P d="M29.5 45 C27 25 73 25 70.5 45 C62 38 38 38 29.5 45Z" fill={color} />
          <P d="M30 41 C40 38 60 38 70 41" stroke="#555" sw={1.6} />
          <E x={42} y={40.5} rx={5} ry={3.2} fill="#a6e1fa" sw={1.2} />
          <E x={58} y={40.5} rx={5} ry={3.2} fill="#a6e1fa" sw={1.2} />
        </>
      );
    case 'bancap':
      return (
        <>
          <P d="M29.5 38 C29 22 71 22 70.5 38 Z" fill="#1f2430" />
          <P d="M30 37 L70 37 L70 33 L30 33Z" fill="#1f2430" />
          <P d="M28 38 Q50 46 72 38 L70 36 Q50 42 30 36Z" fill="#111" />
          <C x={50} y={30} r={2.4} fill="#f2c94c" sw={0.8} />
          <P d="M36 26 L39 30 L41 27" stroke="#f2f0ea" sw={1} />
        </>
      );
    case 'party':
      return (
        <>
          <P d="M36 31 L42 8 L54 28 Z" fill={color} />
          <P d="M38.5 22 L48 18 M37 27 L51 23" stroke="#fff" sw={1.6} />
          <C x={42} y={8} r={2.4} fill="#f2c94c" sw={1} />
        </>
      );
    case 'space':
      return (
        <>
          <C x={50} y={47} r={30} fill="rgba(191,232,255,0.3)" sw={1.6} />
          <P d="M30 30 C34 24 40 21 46 20" stroke="#fff" sw={2.6} op={0.9} />
          <P d="M24 70 C34 78 66 78 76 70 L76 75 C66 83 34 83 24 75Z" fill="#c9d3dc" />
        </>
      );
    case 'kerchief':
      return (
        <>
          <P d="M30.5 43 C28 26 72 26 69.5 43 C62 36 38 36 30.5 43Z" fill={color} />
          {[38, 46, 54, 62].map((x) => (
            <C key={x} x={x} y={33} r={1.1} fill="#fff" sw={0} />
          ))}
        </>
      );
  }
}

// ---------- 小物（顔まわり） ----------

export type Acc =
  | 'glasses'
  | 'round'
  | 'sunglasses'
  | 'shadesup'
  | 'earring'
  | 'bandage'
  | 'plaster'
  | 'flower'
  | 'ahoge'
  | 'headset'
  | 'goggles'
  | 'armband'
  | 'medal'
  | 'visor'
  | 'sweat'
  | 'scar'
  | 'ribbon'
  | 'old'
  | 'mask'
  | 'antenna';

export function AccPart({ kind }: { kind: Acc }) {
  switch (kind) {
    case 'glasses':
      return (
        <>
          <rect x={37} y={44.5} width={12} height={8.5} rx={2.4} fill="#fff" fillOpacity={0.25} stroke={O} strokeWidth={1.4} />
          <rect x={51} y={44.5} width={12} height={8.5} rx={2.4} fill="#fff" fillOpacity={0.25} stroke={O} strokeWidth={1.4} />
          <P d="M49 47.5 h2 M37 47 L31.5 46 M63 47 L68.5 46" sw={1.2} />
        </>
      );
    case 'round':
      return (
        <>
          <C x={43} y={48.5} r={5.8} fill="rgba(255,255,255,.3)" sw={1.8} />
          <C x={57} y={48.5} r={5.8} fill="rgba(255,255,255,.3)" sw={1.8} />
          <P d="M48.8 48 h2.4 M37.2 47.5 L31.5 46.5 M62.8 47.5 L68.5 46.5" sw={1.4} />
        </>
      );
    case 'sunglasses':
      return (
        <>
          <P d="M36 45 h12 l-1 5 q-5 4 -10 0z M52 45 h12 l-1 5 q-5 4 -10 0z" fill="#1d1d1d" sw={1.2} />
          <P d="M48 46 h4 M36 45.5 L31 45 M64 45.5 L69 45" sw={1.3} />
        </>
      );
    case 'shadesup':
      return <P d="M35 34 h13 l-1 4.5 q-5 3.5 -11 0z M52 34 h13 l-1 4.5 q-5 3.5 -11 0z M48 35 h4" fill="#1d1d1d" sw={1.2} />;
    case 'earring':
      return (
        <>
          <C x={31} y={56} r={2} fill="#f2c94c" sw={1} />
          <C x={69} y={56} r={2} fill="#f2c94c" sw={1} />
        </>
      );
    case 'bandage':
      return (
        <>
          <P d="M64 38 C72 38 76 44 75 52 C74 58 70 60 64 60 L63 55 C68 55 70 52 70 49 C70 45 68 43 64 43Z" fill="#fff" />
          <P d="M66 61 C60 66 52 68 46 66" stroke="#fff" sw={3} />
        </>
      );
    case 'plaster':
      return (
        <>
          <rect x={56} y={51} width={9} height={4.4} rx={1.4} fill="#f6d4ae" stroke={O} strokeWidth={1} transform="rotate(-20 60.5 53.2)" />
          <P d="M58.5 51.5 L62 56 M62 51.5 L58.5 56" sw={0.8} op={0.6} />
        </>
      );
    case 'flower':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((r) => (
            <E key={r} x={64} y={30} rx={2.4} ry={3.6} fill="#ff9ac1" sw={0.9} rot={r} />
          ))}
          <C x={64} y={33} r={1.6} fill="#ffd34d" sw={0.8} />
        </g>
      );
    case 'ahoge':
      return <P d="M50 26 C45 19 55 15 51 9" sw={2.2} />;
    case 'headset':
      return (
        <>
          <P d="M28 48 C26 22 74 22 72 48" stroke="#333" sw={3} />
          <rect x={24.5} y={43} width={7} height={11} rx={3} fill="#e5534b" stroke={O} strokeWidth={1.2} />
          <rect x={68.5} y={43} width={7} height={11} rx={3} fill="#e5534b" stroke={O} strokeWidth={1.2} />
          <P d="M28 53 C30 60 36 62 42 61" stroke="#333" sw={1.6} />
          <C x={42} y={61} r={1.6} fill="#333" sw={0} />
        </>
      );
    case 'goggles':
      return (
        <>
          <P d="M29 36 C40 32 60 32 71 36" stroke="#444" sw={2} />
          <E x={42} y={34.5} rx={5.4} ry={3.6} fill="#ffb347" sw={1.2} />
          <E x={58} y={34.5} rx={5.4} ry={3.6} fill="#ffb347" sw={1.2} />
        </>
      );
    case 'armband':
      return (
        <>
          <P d="M18 88 L30 85 L31 92 L19 95Z" fill="#e5534b" sw={1.1} />
          <text x={24.5} y={92.5} fontSize={4.5} fontWeight={900} textAnchor="middle" fill="#fff" transform="rotate(-14 24.5 92)">
            生徒会
          </text>
        </>
      );
    case 'medal':
      return (
        <>
          <P d="M42 70.5 L48 84 M58 70.5 L52 84" stroke="#2c6fd6" sw={2.6} />
          <C x={50} y={88} r={5.5} fill="#f2c94c" />
          <C x={50} y={88} r={3} fill="none" stroke="#c9952c" sw={1} />
        </>
      );
    case 'visor':
      return (
        <>
          <P d="M30 44 C40 41 60 41 70 44 L69 52 C60 50 40 50 31 52Z" fill="#1f2b3a" />
          <P d="M35 47 C42 45.5 58 45.5 65 47" stroke="#35e0ff" sw={1.8} />
        </>
      );
    case 'sweat':
      return <P d="M70 34 C68 38 67.5 41 70 41.5 C72.5 41 72 38 70 34Z" fill="#9fd8ff" sw={1} />;
    case 'scar':
      return <P d="M60 42 L64 50 M60.5 45 L63 44 M61.8 47.5 L64 46.4" sw={1.1} stroke="#a0524a" />;
    case 'ribbon':
      return (
        <>
          <P d="M50 76 L42 72 L42 81Z M50 76 L58 72 L58 81Z" fill="#e5534b" sw={1.1} />
          <C x={50} y={76} r={1.8} fill="#e5534b" sw={1} />
        </>
      );
    case 'old':
      return <P d="M36.5 44 Q39 42.5 41 44 M59 44 Q61 42.5 63.5 44 M44 62 Q50 64 56 62" sw={0.9} op={0.6} />;
    case 'mask':
      return <P d="M37 52 C42 51 58 51 63 52 L62 60 C57 64 43 64 38 60Z M37 53 L31 50 M63 53 L69 50" fill="#fff" sw={1.1} />;
    case 'antenna':
      return (
        <>
          <P d="M44 30 L38 14 M56 30 L62 14" sw={1.6} />
          <C x={38} y={13} r={3} fill="#ffd34d" />
          <C x={62} y={13} r={3} fill="#ffd34d" />
        </>
      );
  }
}

// ---------- 手に持つもの（右下） ----------

export type Prop =
  | 'bat'
  | 'soccer'
  | 'basketball'
  | 'trumpet'
  | 'brush'
  | 'book'
  | 'guitar'
  | 'flask'
  | 'shogi'
  | 'gamepad'
  | 'clipboard'
  | 'phone'
  | 'sword'
  | 'katana'
  | 'spear'
  | 'naginata'
  | 'halberd'
  | 'guandao'
  | 'bow'
  | 'featherfan'
  | 'sensu'
  | 'scroll'
  | 'bulb'
  | 'telescope'
  | 'palette'
  | 'quill'
  | 'setsquare'
  | 'shield'
  | 'flag'
  | 'ofuda'
  | 'gun'
  | 'gourd'
  | 'shuriken'
  | 'kiseru'
  | 'lamp'
  | 'note'
  | 'sunflower'
  | 'brick'
  | 'clapper'
  | 'plane'
  | 'pencil'
  | 'atom'
  | 'yoyo'
  | 'peace'
  | 'bag'
  | 'mic'
  | 'tango'
  | 'theater'
  | 'wave'
  | 'bubbles'
  | 'pistol'
  | 'twoswords'
  | 'fist'
  | 'stopwatch';

export function PropPart({ kind }: { kind: Prop }) {
  switch (kind) {
    case 'bat':
      return <Stick x1={74} y1={99} x2={92} y2={60} w={5} color="#e1ad6c" />;
    case 'soccer':
      return (
        <>
          <C x={83} y={87} r={10} fill="#fff" />
          <P d="M83 82.5 L87.3 85.6 L85.7 90.7 L80.3 90.7 L78.7 85.6Z" fill="#2b2b2b" sw={0.8} />
          <P d="M83 82.5 V77 M87.3 85.6 L92.6 84 M85.7 90.7 L89 95.5 M80.3 90.7 L77 95.5 M78.7 85.6 L73.4 84" sw={0.9} />
        </>
      );
    case 'basketball':
      return (
        <>
          <C x={83} y={86} r={10.5} fill="#f08a2c" />
          <P d="M72.5 86 H93.5 M83 75.5 V96.5 M75.5 78.5 Q81 86 75.5 93.5 M90.5 78.5 Q85 86 90.5 93.5" sw={1} />
        </>
      );
    case 'trumpet':
      return (
        <>
          <P d="M64 86 L84 80" stroke={O} sw={5} />
          <P d="M64 86 L84 80" stroke="#f2c94c" sw={3} />
          <P d="M83 79 L93 72 L96 86 L85 83Z" fill="#f2c94c" />
          <rect x={70} y={78} width={6} height={4} fill="#f2c94c" stroke={O} strokeWidth={1} transform="rotate(-16 73 80)" />
        </>
      );
    case 'brush':
      return (
        <>
          <Stick x1={70} y1={98} x2={86} y2={70} w={3} color="#c98d4a" />
          <P d="M84.5 72.5 L86 66 C88 62 91 62 90.5 66 L88 74Z" fill="#e5534b" sw={1.1} />
        </>
      );
    case 'book':
      return (
        <>
          <rect x={70} y={74} width={20} height={24} rx={2} fill="#3f7fd0" stroke={O} strokeWidth={1.4} transform="rotate(10 80 86)" />
          <rect x={74} y={79} width={12} height={4} fill="#fff" stroke="none" transform="rotate(10 80 86)" />
        </>
      );
    case 'guitar':
      return (
        <>
          <Stick x1={70} y1={90} x2={94} y2={58} w={3.2} color="#8a5a32" />
          <P d="M60 88 C56 80 64 74 70 78 C74 74 82 78 80 86 C84 92 76 100 70 96 C64 100 56 96 60 88Z" fill="#e5534b" />
          <C x={70} y={87} r={2.4} fill="#3a2a20" sw={0} />
        </>
      );
    case 'flask':
      return (
        <>
          <P d="M73 90 L94 90 L96 94 Q97 98 93 98 H73 Q69 98 70 94Z" fill="#6ee07a" sw={0} />
          <P d="M78 70 h8 v8 l8 16 q1 4 -3 4 h-18 q-4 0 -3 -4 l8 -16z" fill="rgba(255,255,255,0.15)" />
          <C x={84} y={64} r={2} fill="#6ee07a" sw={1} />
          <C x={88} y={58} r={1.4} fill="#6ee07a" sw={1} />
        </>
      );
    case 'shogi':
      return (
        <>
          <P d="M82 70 L92 75 L94 98 L70 98 L72 75Z" fill="#f2cf8c" />
          <text x={82.5} y={92} fontSize={13} fontWeight={900} textAnchor="middle" fill="#3a2a20" fontFamily="serif">
            王
          </text>
        </>
      );
    case 'gamepad':
      return (
        <>
          <P d="M64 84 C64 77 70 76 74 78 L88 78 C92 76 98 77 98 84 C98 92 94 96 90 92 L72 92 C68 96 64 92 64 84Z" fill="#6b6f80" />
          <P d="M70 84 h6 M73 81 v6" stroke="#fff" sw={1.6} />
          <C x={88} y={82} r={1.6} fill="#e5534b" sw={0} />
          <C x={92} y={86} r={1.6} fill="#35c06f" sw={0} />
        </>
      );
    case 'clipboard':
      return (
        <>
          <rect x={70} y={72} width={20} height={26} rx={2} fill="#c98d4a" stroke={O} strokeWidth={1.4} />
          <rect x={72.5} y={76} width={15} height={20} fill="#fff" stroke="none" />
          <rect x={76} y={70} width={8} height={4} rx={1} fill="#999" stroke={O} strokeWidth={1} />
          <P d="M75 81 h10 M75 85 h10 M75 89 h7" sw={1} op={0.6} />
        </>
      );
    case 'phone':
      return (
        <>
          <rect x={74} y={68} width={15} height={26} rx={3} fill="#333" stroke={O} strokeWidth={1.4} />
          <rect x={76} y={71} width={11} height={19} rx={1} fill="#ffd1e3" stroke="none" />
          <P d="M81.5 84 C76 80 78 75 81.5 78 C85 75 87 80 81.5 84Z" fill="#e5534b" sw={0} />
        </>
      );
    case 'sword':
      return (
        <>
          <P d="M88 54 L92 56 L80 88 L76 86Z" fill="#dfe6ec" />
          <P d="M70 84 L86 92" stroke={O} sw={4} />
          <P d="M70 84 L86 92" stroke="#f2c94c" sw={2.2} />
          <Stick x1={77} y1={92} x2={74} y2={99} w={3} color="#7a4e2e" />
        </>
      );
    case 'katana':
      return (
        <>
          <P d="M94 38 C90 54 84 68 78 80 L76 79 C82 66 88 52 92 38Z" fill="#e8eef2" />
          <E x={77} y={82} rx={4} ry={1.6} fill="#2b2b2b" sw={1} rot={-62} />
          <Stick x1={76} y1={84} x2={71} y2={96} w={3.2} color="#2b2b2b" />
          <P d="M75 86 L72 92" stroke="#fff" sw={0.8} op={0.7} />
        </>
      );
    case 'twoswords':
      return (
        <>
          <P d="M94 40 C90 56 84 68 78 80 L76 79 C82 66 88 52 92 40Z" fill="#e8eef2" />
          <Stick x1={76} y1={84} x2={71} y2={96} w={3.2} color="#2b2b2b" />
          <P d="M6 50 C10 62 15 72 20 80 L22 79 C17 70 12 60 8 50Z" fill="#e8eef2" />
          <Stick x1={22} y1={84} x2={26} y2={94} w={3} color="#2b2b2b" />
        </>
      );
    case 'spear':
    case 'naginata':
    case 'halberd':
    case 'guandao':
      return (
        <>
          <Stick x1={76} y1={100} x2={92} y2={22} w={2.6} color={kind === 'naginata' ? '#2b2b2b' : '#8a5a32'} />
          {kind === 'spear' && <P d="M92 22 L89 12 L95 4 L96 14Z" fill="#dfe6ec" />}
          {kind === 'naginata' && <P d="M92 24 C90 12 94 4 98 2 C98 10 96 18 94 24Z" fill="#dfe6ec" />}
          {kind === 'halberd' && (
            <>
              <P d="M92 22 L91 6 L95 14Z" fill="#dfe6ec" />
              <P d="M92 20 C84 18 82 26 86 32 C88 28 90 26 92.5 26Z" fill="#dfe6ec" />
              <P d="M93 20 C100 18 101 26 98 30 C97 27 95 26 93 26Z" fill="#dfe6ec" />
            </>
          )}
          {kind === 'guandao' && (
            <>
              <P d="M92 26 C84 22 82 10 88 2 C92 8 96 16 95 26Z" fill="#dfe6ec" />
              <P d="M87 14 C86 16 88 18 90 17" stroke="#3fae5a" sw={1.6} />
            </>
          )}
        </>
      );
    case 'bow':
      return (
        <>
          <P d="M78 50 C98 60 98 90 78 100" stroke={O} sw={4.2} />
          <P d="M78 50 C98 60 98 90 78 100" stroke="#8a5a32" sw={2.4} />
          <P d="M78 50 L78 100" sw={0.9} />
          <P d="M70 75 L94 75" sw={1.3} />
          <P d="M94 75 L90 72.5 L90 77.5Z" fill="#dfe6ec" sw={1} />
          <P d="M70 75 L67 72 M70 75 L67 78" stroke="#e5534b" sw={1.6} />
        </>
      );
    case 'featherfan':
      return (
        <>
          <Stick x1={76} y1={99} x2={80} y2={84} w={3} color="#8a5a32" />
          <P d="M80 85 C68 78 66 62 74 54 C80 50 90 50 94 56 C100 66 92 80 80 85Z" fill="#fbfbf7" />
          <P d="M80 85 L76 58 M80 85 L84 54 M80 85 L91 60 M80 85 L70 64" sw={0.9} op={0.5} />
        </>
      );
    case 'sensu':
      return (
        <>
          <P d="M78 96 L64 72 C72 64 88 64 96 72Z" fill="#f6f1e4" />
          <P d="M78 96 L69 68 M78 96 L76 66 M78 96 L84 66 M78 96 L91 69" sw={0.9} op={0.5} />
          <C x={80} y={72} r={3.2} fill="#e5534b" sw={0} />
        </>
      );
    case 'scroll':
      return (
        <>
          <rect x={70} y={78} width={22} height={13} fill="#f6ecd2" stroke={O} strokeWidth={1.3} transform="rotate(-18 81 84.5)" />
          <C x={70.5} y={88.5} r={3.4} fill="#c98d4a" />
          <C x={91.5} y={81.5} r={3.4} fill="#c98d4a" />
        </>
      );
    case 'bulb':
      return (
        <>
          <C x={82} y={74} r={14} fill="#fff6a8" sw={0} />
          <C x={82} y={76} r={8} fill="#ffe14d" />
          <rect x={78} y={83} width={8} height={7} rx={1} fill="#b0b6bd" stroke={O} strokeWidth={1.2} />
          <P d="M79.5 76 L82 79 L84.5 76" sw={1} />
          <P d="M68 64 L71 67 M82 58 V62 M96 64 L93 67" stroke="#f2b632" sw={1.6} />
        </>
      );
    case 'telescope':
      return (
        <>
          <P d="M66 94 L94 60 L99 65 L71 99Z" fill="#a9733e" />
          <P d="M92 58 L100 66" stroke="#f2c94c" sw={3} />
          <P d="M74 85 L80 91" stroke="#f2c94c" sw={2} />
        </>
      );
    case 'palette':
      return (
        <>
          <P d="M66 86 C64 74 76 66 88 70 C98 73 98 84 92 86 C88 87 88 92 90 95 C86 100 70 98 66 86Z" fill="#e8c38d" />
          <C x={74} y={80} r={2.6} fill="#e5534b" sw={0.8} />
          <C x={81} y={75} r={2.6} fill="#f2c94c" sw={0.8} />
          <C x={89} y={77} r={2.6} fill="#4a90e2" sw={0.8} />
          <C x={74} y={89} r={2.6} fill="#35c06f" sw={0.8} />
        </>
      );
    case 'quill':
      return (
        <>
          <P d="M74 98 C78 82 86 66 98 54 C96 66 90 80 76 96Z" fill="#fbfbf7" />
          <P d="M74 98 L90 68" sw={0.9} op={0.6} />
          <P d="M73 96 L71 100" sw={2} />
        </>
      );
    case 'setsquare':
      return (
        <>
          <P d="M68 98 L68 68 L96 98Z" fill="#9ed6f2" />
          <P d="M73 93 L73 80 L85 93Z" fill="#fff" />
        </>
      );
    case 'shield':
      return (
        <>
          <C x={82} y={84} r={15} fill="#d9a441" />
          <C x={82} y={84} r={11} fill="#c0532b" sw={1} />
          <P d="M76 92 L82 77 L88 92" stroke="#f2c94c" sw={2.6} />
        </>
      );
    case 'flag':
      return (
        <>
          <Stick x1={78} y1={100} x2={78} y2={44} w={2.2} color="#8a5a32" />
          <P d="M79 46 C86 42 92 50 99 46 L99 66 C92 70 86 62 79 66Z" fill="#fbfbf7" />
          <P d="M89 50 C87 54 87 58 89 61 C91 58 91 54 89 50Z M85 56 C86 58 88 58 89 57 M93 56 C92 58 90 58 89 57" fill="#f2c94c" sw={0.8} />
        </>
      );
    case 'ofuda':
      return (
        <>
          <rect x={74} y={66} width={14} height={28} fill="#f6ecd2" stroke={O} strokeWidth={1.3} transform="rotate(8 81 80)" />
          <P d="M81 72 L84.5 82 L76 76 L86 76 L77.5 82Z" stroke="#c0392b" sw={1.4} />
          <P d="M78 86 h7 M78 89 h6" stroke="#c0392b" sw={1.2} />
        </>
      );
    case 'gun':
      return (
        <>
          <P d="M60 96 L98 60" stroke={O} sw={5} />
          <P d="M60 96 L98 60" stroke="#8a5a32" sw={3} />
          <P d="M74 83 L97 61" stroke="#555" sw={1.6} />
        </>
      );
    case 'pistol':
      return (
        <>
          <P d="M74 80 h18 v5 h-12 l-2 10 h-6 l2 -9 h-2z" fill="#555" />
          <C x={80} y={84} r={1.2} fill="#222" sw={0} />
        </>
      );
    case 'gourd':
      return (
        <>
          <C x={82} y={76} r={6} fill="#f2c94c" />
          <C x={82} y={89} r={9} fill="#f2c94c" />
          <P d="M76.5 81.5 Q82 84 87.5 81.5" stroke="#e5534b" sw={2} />
          <rect x={80.5} y={67} width={3} height={4} fill="#8a5a32" stroke={O} strokeWidth={1} />
        </>
      );
    case 'shuriken':
      return (
        <>
          <P d="M82 70 L85 81 L96 84 L85 87 L82 98 L79 87 L68 84 L79 81Z" fill="#7d8790" />
          <C x={82} y={84} r={2} fill="#222" sw={0} />
        </>
      );
    case 'kiseru':
      return (
        <>
          <P d="M64 92 L92 74" stroke={O} sw={3.6} />
          <P d="M64 92 L92 74" stroke="#c0392b" sw={2} />
          <P d="M90 74 L92 70 L97 70 L95 75Z" fill="#f2c94c" sw={1} />
          <P d="M95 66 C92 62 98 58 95 54" stroke="#bbb" sw={1.4} />
        </>
      );
    case 'lamp':
      return (
        <>
          <C x={80} y={74} r={13} fill="#fff6a8" sw={0} />
          <P d="M68 92 C68 84 92 84 92 92 C88 96 72 96 68 92Z" fill="#c98d4a" />
          <P d="M92 89 C98 88 98 82 92 84" sw={1.4} />
          <P d="M68 90 L62 88" sw={2} />
          <P d="M80 84 C76 80 78 74 80 70 C82 74 84 80 80 84Z" fill="#ff9c33" sw={1} />
        </>
      );
    case 'note':
      return (
        <>
          <P d="M78 92 V68 L94 64 V86" sw={2} />
          <P d="M78 70 L94 66" sw={3.2} />
          <E x={75} y={92} rx={4} ry={3} fill={O} sw={0} rot={-20} />
          <E x={91} y={86} rx={4} ry={3} fill={O} sw={0} rot={-20} />
        </>
      );
    case 'sunflower':
      return (
        <>
          <Stick x1={80} y1={100} x2={82} y2={80} w={2.4} color="#5aa04a" />
          {Array.from({ length: 12 }, (_, i) => (
            <E key={i} x={82 + Math.cos((i * Math.PI) / 6) * 9} y={72 + Math.sin((i * Math.PI) / 6) * 9} rx={4} ry={2} fill="#ffcf2e" sw={0.9} rot={i * 30} />
          ))}
          <C x={82} y={72} r={6.5} fill="#7a4e2e" />
        </>
      );
    case 'brick':
      return (
        <>
          <P d="M64 78 L84 74 L98 80 L98 96 L78 100 L64 94Z" fill="#e6c48a" />
          <P d="M64 78 L78 84 L98 80 M78 84 V100" sw={1.2} />
        </>
      );
    case 'clapper':
      return (
        <>
          <rect x={68} y={80} width={26} height={18} fill="#2b2b2b" stroke={O} strokeWidth={1.3} />
          <P d="M68 80 L92 72 L94 77 L70 85Z" fill="#fff" />
          <P d="M74 78 L76 83 M80 76 L82 81 M86 74 L88 79" stroke="#2b2b2b" sw={2} />
          <P d="M72 88 h18 M72 93 h12" stroke="#fff" sw={1} />
        </>
      );
    case 'plane':
      return (
        <>
          <P d="M66 88 L96 72 C100 70 100 74 98 76 L70 94Z" fill="#fff" />
          <P d="M80 82 L74 70 L78 69 L88 78Z M76 90 L80 98 L83 97 L82 88Z" fill="#4a90e2" sw={1.1} />
        </>
      );
    case 'pencil':
      return (
        <>
          <P d="M70 98 L92 68 L97 72 L75 102Z" fill="#f2c94c" />
          <P d="M92 68 L95 63 L97 72Z" fill="#f6d4ae" sw={1.1} />
          <P d="M70 98 L72 104 L75 102Z" fill="#e88" sw={1} />
        </>
      );
    case 'atom':
      return (
        <>
          <E x={82} y={82} rx={14} ry={5} fill="none" stroke="#4a90e2" sw={1.8} rot={30} />
          <E x={82} y={82} rx={14} ry={5} fill="none" stroke="#4a90e2" sw={1.8} rot={-30} />
          <E x={82} y={82} rx={14} ry={5} fill="none" stroke="#4a90e2" sw={1.8} rot={90} />
          <C x={82} y={82} r={3} fill="#e5534b" sw={1} />
        </>
      );
    case 'yoyo':
      return (
        <>
          <P d="M74 70 L84 90" sw={1} />
          <C x={86} y={92} r={7} fill="#e5534b" />
          <C x={86} y={92} r={2.5} fill="#fff" sw={1} />
        </>
      );
    case 'peace':
      return (
        <>
          <P d="M76 86 L72 66 C71.5 63 75 62.5 76 65.5 L79 78 L81 64 C81.5 61 85 61.5 84.5 64.5 L82.5 80" fill="#ffd9b8" />
          <P d="M74 82 C74 76 88 76 89 82 C90 92 84 96 79 95 C75 94 73.5 90 74 82Z" fill="#ffd9b8" />
          <P d="M78 86 h7" sw={0.9} />
        </>
      );
    case 'bag':
      return (
        <>
          <rect x={66} y={78} width={30} height={20} rx={3} fill="#2b2b2b" stroke={O} strokeWidth={1.4} />
          <P d="M74 78 C74 70 88 70 88 78" stroke="#2b2b2b" sw={2.4} />
          <rect x={78} y={84} width={6} height={4} fill="#f2c94c" stroke="none" />
        </>
      );
    case 'mic':
      return (
        <>
          <Stick x1={76} y1={98} x2={84} y2={80} w={3.2} color="#333" />
          <C x={86} y={76} r={5.5} fill="#b0b6bd" />
        </>
      );
    case 'tango':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={70 + i * 3} y={76 + i * 2} width={18} height={10} rx={1} fill={['#fff', '#ffe58a', '#a6e1fa'][i]} stroke={O} strokeWidth={1.1} transform={`rotate(${-10 + i * 8} 80 82)`} />
          ))}
          <C x={71} y={80} r={3} fill="none" stroke="#999" sw={1.4} />
        </>
      );
    case 'theater':
      return (
        <>
          <P d="M66 72 C70 70 80 70 84 72 C84 84 80 90 75 90 C70 90 66 84 66 72Z" fill="#fff" />
          <P d="M70 77 Q71.5 75.5 73 77 M77 77 Q78.5 75.5 80 77 M71 83 Q75 87 79 83" sw={1.1} />
          <P d="M82 78 C86 76 94 76 98 78 C98 90 94 96 90 96 C86 96 82 90 82 78Z" fill="#f2c94c" />
          <P d="M86 84 Q87.5 85.5 89 84 M91 84 Q92.5 85.5 94 84 M87 91 Q90 88 93 91" sw={1.1} />
        </>
      );
    case 'wave':
      return (
        <>
          <P d="M60 100 C62 86 74 78 86 80 C96 82 98 92 92 94 C94 88 88 84 82 88 C78 92 82 96 86 94 C80 100 70 100 60 100Z" fill="#3f7fd0" />
          <P d="M66 98 C70 90 78 86 84 87" stroke="#fff" sw={1.4} />
        </>
      );
    case 'bubbles':
      return (
        <>
          <C x={80} y={86} r={5} fill="#d4f1ff" sw={1.1} />
          <C x={90} y={76} r={3.4} fill="#d4f1ff" sw={1.1} />
          <C x={86} y={66} r={2.4} fill="#d4f1ff" sw={1.1} />
          <C x={14} y={78} r={3.4} fill="#d4f1ff" sw={1.1} />
        </>
      );
    case 'fist':
      return (
        <>
          <P d="M72 80 C72 74 90 74 92 80 L92 92 C92 96 74 96 72 92Z" fill="#ffd9b8" />
          <P d="M76.5 77 V83 M81.5 76.5 V83 M86.5 77 V83 M72 86 C76 84 80 86 80 90" sw={1} />
        </>
      );
    case 'stopwatch':
      return (
        <>
          <C x={82} y={84} r={11} fill="#fbfbf7" />
          <rect x={79.5} y={70} width={5} height={4} fill="#b0b6bd" stroke={O} strokeWidth={1.1} />
          <P d="M82 84 L82 77 M82 84 L87 87" sw={1.6} />
        </>
      );
  }
}
