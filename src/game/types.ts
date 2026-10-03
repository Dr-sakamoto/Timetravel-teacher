/** 生徒の属性アイコン。喧嘩はヤンキー専用（ヤンキーの約半分は👊のみ） */
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

export type RoleId = 'study' | 'pe' | 'culture' | 'leader' | 'discipline' | 'library';

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

/** 生徒カード：属性アイコンだけ。同じアイコンが重なるほど強い（1枚あたり最大5個） */
export interface Student {
  uid: string;
  /** 歴史カード由来なら元カードID（時代の山札への返却に使う） */
  cardId?: string;
  name: string;
  title: string;
  era: EraId;
  rarity: Rarity;
  icon: string;
  attrs: Attr[];
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
  students: Student[];
  /** ROLE_ORDER の順に、担当する生徒uid */
  roles: (string | null)[];
  points: number;
}

export interface ResultRow {
  player: number;
  /** 数えたアイコン数（係ボーナス込み） */
  count?: number;
  rank?: number;
  delta: number;
  note?: string;
  /** 点に関わった生徒（相手のカードはこれだけ表向きにして見せる） */
  uids?: string[];
}

/** 'normal'=通常カード 'contest'=勝負カード 'era'=時代カード 'fixed'=固定イベント 'personal'=個人 */
export type CardTone = 'normal' | 'contest' | 'era' | 'fixed' | 'personal';

export interface EventResult {
  title: string;
  icon: string;
  attr?: Attr | 'all';
  tone: CardTone;
  desc: string;
  /** カードに書かれたルール（短文） */
  rule?: string;
  rows: ResultRow[];
  lines?: string[];
  students?: Student[];
}

export type ResultCtx = 'turn' | 'summer' | 'monthEnd' | 'yearEnd' | 'final';

export type Phase =
  /** 初期メンバーを全員で順番に1枚ずつ引く */
  | { kind: 'memberDraw'; player: number; last: { player: number; student: Student } | null }
  | { kind: 'roles'; player: number }
  | { kind: 'draw'; player: number }
  /** 転校：いらない生徒を別のクラスに押しつける */
  | { kind: 'push'; player: number }
  | { kind: 'result'; player: number | null; result: EventResult; ctx: ResultCtx }
  | { kind: 'gameOver' };

export interface LogEntry {
  id: number;
  when: string;
  text: string;
  player?: number;
}

export interface GameState {
  version: 9;
  /** その年の3学期それぞれの時代（ERASのindex） */
  yearEras: number[];
  /** まだ使っていない時代の山（毎年ここから引く） */
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
  /** イベントの山札（末尾が一番上）。人物カードは 'person:<id>'（偉人）か 'modern'（現代の生徒） */
  eventDeck: string[];
  /** 捨て札（末尾が一番上） */
  discard: string[];
  /** 現代の生徒の山札（初期メンバー用。末尾が一番上） */
  modernDeck: string[];
  pools: Record<EraId, string[]>;
  uidCounter: number;
  logCounter: number;
  log: LogEntry[];
}

export type Action =
  | { type: 'drawMember' }
  | { type: 'drawAllMembers' }
  | { type: 'continue' }
  | { type: 'setRoles'; roles: (string | null)[] }
  | { type: 'drawEvent' }
  | { type: 'push'; uid: string | null; target?: number };
