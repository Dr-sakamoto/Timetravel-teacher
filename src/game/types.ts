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

export type RoleId = 'study' | 'pe' | 'culture' | 'leader';

/** 係の席：どの係に誰が就いているか */
export interface RoleSeat {
  role: RoleId;
  uid: string;
}

/** 生徒に装備したグッズ（アイコンが1つ増える） */
export interface Goods {
  id: string;
  name: string;
  icon: string;
  attr: Attr;
}

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
  /** カードプールのID（偉人のカードID、現代の生徒は 'm:<アーキタイプ>#<番号>'） */
  cardId?: string;
  name: string;
  title: string;
  era: EraId;
  rarity: Rarity;
  icon: string;
  /** イラストのキー（歴史カードID／現代の生徒のアーキタイプID） */
  art?: string;
  attrs: Attr[];
  flavor: string;
  joined: string;
  /** 装備しているグッズ（1人1つまで。そのアイコンは attrs にも足してある） */
  goods?: Goods;
  /** 得点に貢献した回数 */
  mvp: number;
}

export interface Player {
  id: number;
  name: string;
  isCpu: boolean;
  color: string;
  students: Student[];
  /** 解放した係の種類（解放した順。学期の頭に1種ずつ、自分で選んで増やす） */
  unlocked: RoleId[];
  /** 係に就いている生徒（解放した係に1人ずつ） */
  roles: RoleSeat[];
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
  /** 時代イベント・襲来：この時代の生徒は×2（得点演出用） */
  era?: EraId;
  /** 襲来：敵の強さ（得点演出用） */
  threat?: number;
  /** 共通イベント：引かれるアイコン（または人数）（得点演出用） */
  minus?: Attr | 'heads';
  rows: ResultRow[];
  lines?: string[];
  students?: Student[];
}

export type ResultCtx = 'turn' | 'monthEnd' | 'yearEnd' | 'final';

export type Phase =
  /** 初期メンバーを全員で順番に1枚ずつ引く */
  | { kind: 'memberDraw'; player: number; last: { player: number; student: Student } | null }
  | { kind: 'roles'; player: number }
  | { kind: 'draw'; player: number }
  /** 転校：全クラスが順番に、係に就いていない生徒を1人ずつクラスから外す（player は今選んでいる人、left はこの後に選ぶ人） */
  | { kind: 'push'; player: number; drawer: number; left: number[]; gone: Student[] }
  /** カチコミ：他のクラスを1つ選んで、自分の👊の数だけ減点させる */
  | { kind: 'kachikomi'; player: number }
  /** クラス替え：自分の生徒1人と、他のクラスの係に就いていない生徒1人を入れ替える */
  | { kind: 'exchange'; player: number }
  /** サイボーグ化：自分のクラスの生徒1人をサイボーグに作り替える */
  | { kind: 'cyborg'; player: number }
  /** グッズ：生徒1人に装備する */
  | { kind: 'equip'; player: number; card: string }
  | { kind: 'result'; player: number | null; result: EventResult; ctx: ResultCtx }
  | { kind: 'gameOver' };

export interface LogEntry {
  id: number;
  when: string;
  text: string;
  player?: number;
}

export interface GameState {
  version: 17;
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
  /** イベントの山札（末尾が一番上）。人物カードは 'person:<カードプールのID>' */
  eventDeck: string[];
  /** 捨て札（末尾が一番上） */
  discard: string[];
  /** 初期メンバー用の山（現代の普通の生徒） */
  starters: string[];
  pools: Record<EraId, string[]>;
  uidCounter: number;
  logCounter: number;
  log: LogEntry[];
}

export type Action =
  | { type: 'drawMember' }
  | { type: 'drawAllMembers' }
  | { type: 'continue' }
  | { type: 'setRoles'; roles: RoleSeat[]; unlock?: RoleId[] }
  | { type: 'drawEvent' }
  | { type: 'push'; uid: string }
  | { type: 'kachikomi'; target: number | null }
  | { type: 'exchange'; uid: string | null; target?: number; theirUid?: string }
  | { type: 'equip'; uid: string | null }
  | { type: 'cyborg'; uid: string | null };
