/** 生徒の属性（パワプロの特殊能力のようなアイコン）。勉強はヤンキー以外ほぼ全員、喧嘩はヤンキー専用 */
export type Attr = 'study' | 'sports' | 'art' | 'charm' | 'fight';
export const ATTRS: Attr[] = ['study', 'sports', 'art', 'charm', 'fight'];
export const ATTR_ICON: Record<Attr, string> = {
  study: '📚',
  sports: '🏃',
  art: '🎨',
  charm: '👑',
  fight: '👊',
};
export const ATTR_LABEL: Record<Attr, string> = {
  study: '勉強',
  sports: '運動',
  art: '芸術',
  charm: '人望',
  fight: '喧嘩',
};

export type Rarity = 'N' | 'R' | 'SR' | 'SSR';
export type Tag = '現代' | 'ヤンキー' | '恐竜' | '武将' | '忍者' | '学者' | '芸術家' | '王族' | '未来' | '動物';

export type RoleId =
  | 'leader'
  | 'vice'
  | 'pe'
  | 'cheer'
  | 'study'
  | 'library'
  | 'discipline'
  | 'culture'
  | 'broadcast'
  | 'health'
  | 'animal';

export type Ability =
  | { kind: 'aura'; attr: Attr; amount: number }
  | { kind: 'boost'; attr: Attr; amount: number }
  | { kind: 'roleBonus'; role: RoleId; mult: number }
  | { kind: 'income'; amount: number }
  | { kind: 'guard'; ratio: number };

export type EraId =
  | 'cretaceous'
  | 'egypt'
  | 'greece'
  | 'china'
  | 'heian'
  | 'europe'
  | 'sengoku'
  | 'edo'
  | 'modern'
  | 'present'
  | 'future';

export interface Student {
  uid: string;
  /** 歴史カード由来なら元カードID（時代プールへの返却に使う） */
  cardId?: string;
  name: string;
  title: string;
  era: EraId;
  rarity: Rarity;
  icon: string;
  /** 生徒の数値（強さ）。属性を持つイベントでこの数値が戦力になる */
  power: number;
  attrs: Attr[];
  tags: Tag[];
  ability?: Ability;
  flavor: string;
  joined: string;
  /** 得点に貢献した回数 */
  mvp: number;
}

export interface Player {
  id: number;
  name: string;
  isCpu: boolean;
  color: string;
  classCardId: string | null;
  students: Student[];
  /** クラスカードの係スロット順に、担当する生徒uid */
  roles: (string | null)[];
  points: number;
}

export interface ResultRow {
  player: number;
  power?: number;
  rank?: number;
  delta: number;
  top?: string[];
  note?: string;
}

export interface EventResult {
  title: string;
  icon: string;
  attr?: Attr | 'all';
  effects?: string[];
  tone?: 'blue' | 'red' | 'special';
  desc: string;
  scoring?: string;
  rows: ResultRow[];
  lines?: string[];
  students?: Student[];
  threat?: number;
  school?: boolean;
}

export type ResultCtx = 'turn' | 'summer' | 'monthEnd' | 'yearEnd' | 'final';

export type Phase =
  | { kind: 'classDraw'; player: number; drawn: boolean }
  | { kind: 'roles'; player: number }
  | { kind: 'draw'; player: number }
  | {
      kind: 'transfer';
      player: number;
      options: Student[];
      picks: number;
      added: Student[];
      title: string;
      reason: string;
      ctx: ResultCtx;
    }
  | { kind: 'train'; player: number }
  | { kind: 'poach'; player: number }
  | { kind: 'warp'; player: number }
  | { kind: 'summerTravel'; player: number }
  | { kind: 'result'; player: number | null; result: EventResult; ctx: ResultCtx }
  | { kind: 'gameOver' };

export interface LogEntry {
  id: number;
  when: string;
  text: string;
  player?: number;
}

export interface GameState {
  version: 3;
  /** その年の3学期それぞれの時代（ERASのindex） */
  yearEras: number[];
  /** まだ使っていない時代の山（毎学期ここから引く） */
  eraDeck: number[];
  rng: number;
  players: Player[];
  years: number;
  year: number;
  monthIdx: number;
  rotation: number;
  queue: number[];
  queueIdx: number;
  phase: Phase;
  eventDeck: string[];
  pools: Record<EraId, string[]>;
  usedClassCards: string[];
  uidCounter: number;
  logCounter: number;
  log: LogEntry[];
}

export type Action =
  | { type: 'drawClass' }
  | { type: 'continue' }
  | { type: 'setRoles'; roles: (string | null)[] }
  | { type: 'travel'; era: number }
  | { type: 'drawEvent' }
  | { type: 'pickTransfer'; index: number | null; releaseUid?: string }
  | { type: 'train'; uid: string; mode: 'power' } | { type: 'train'; uid: string; mode: 'attr'; attr: Attr }
  | { type: 'poach'; uid: string | null };
