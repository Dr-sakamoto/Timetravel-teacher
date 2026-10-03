export type StatKey = 'pe' | 'study' | 'fight' | 'art' | 'charm';
export const STAT_KEYS: StatKey[] = ['pe', 'study', 'fight', 'art', 'charm'];
export const STAT_LABEL: Record<StatKey, string> = {
  pe: '運動',
  study: '学力',
  fight: '喧嘩',
  art: '芸術',
  charm: '人望',
};
export type Stats = Record<StatKey, number>;

export type Rarity = 'N' | 'R' | 'SR' | 'SSR';
export type Tag = '現代' | 'ヤンキー' | '恐竜' | '武将' | '忍者' | '学者' | '芸術家' | '王族' | '未来' | '動物';
export type Category = 'sports' | 'study' | 'culture' | 'fight' | 'charisma' | 'food';
export const CATEGORY_LABEL: Record<Category, string> = {
  sports: '運動系',
  study: '勉強系',
  culture: '文化系',
  fight: '喧嘩系',
  charisma: '人望系',
  food: '大食い',
};

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
  | { kind: 'aura'; stat: StatKey; amount: number }
  | { kind: 'boost'; category: Category; amount: number }
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
  base: Stats;
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
  era: number;
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
  | { kind: 'travel'; player: number; dice: number | null }
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
  version: 1;
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
  | { type: 'rollDice' }
  | { type: 'travel'; era: number }
  | { type: 'drawEvent' }
  | { type: 'pickTransfer'; index: number | null; releaseUid?: string }
  | { type: 'train'; uid: string; stat: StatKey }
  | { type: 'poach'; uid: string | null };
