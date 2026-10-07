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
export type Tag = '現代' | 'ヤンキー' | '恐竜' | '武将' | '忍者' | '学者' | '芸術家' | '王族' | '未来' | '動物' | '機械';

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

/** 生徒カード：属性アイコンだけ。同じアイコンが重なるほど強い（印刷は1枚あたり最大5個。イベントで6個まで増える） */
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
  /** ペストにかかっている（🏃を数えない。学期の区切りで治る。グッズとは別なので装備もできる） */
  plague?: boolean;
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
  /** 楽市楽座：次に取るグッズ1つがタダ */
  freeGoods?: boolean;
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
  /** カードのイラストのキー（なければ icon の絵文字を出す） */
  art?: string;
  attr?: Attr | 'all';
  tone: CardTone;
  desc: string;
  /** カードに書かれたルール（短文） */
  rule?: string;
  /** 効果を絵文字の式で（カードに大きく出す） */
  glyph?: string;
  /** 何が起きるかの一言（めくったカードの横に出す） */
  say?: string;
  /** 時代イベント・襲来：この時代の生徒は×2（得点演出用） */
  era?: EraId;
  /** 襲来：敵の強さ（得点演出用） */
  threat?: number;
  /** 共通イベント：引かれるアイコン（または人数）（得点演出用） */
  minus?: Attr | 'heads';
  rows: ResultRow[];
  lines?: string[];
  students?: Student[];
  /** students のうち、クラスから出ていった子（見た目で「出ていった」と分かるようにする） */
  outUids?: string[];
}

export type ResultCtx = 'turn' | 'hatch' | 'kaguya' | 'monthEnd' | 'yearEnd' | 'final' | 'oath' | 'sunflower';

export type Phase =
  /** 初期メンバーを全員で順番に1枚ずつ引く */
  | { kind: 'memberDraw'; player: number; last: { player: number; student: Student } | null }
  | { kind: 'roles'; player: number }
  /** 手番：場のカードを1枚取る（または1枚捨てて見送る） */
  | { kind: 'draw'; player: number }
  /** 満席で人物カードを取る：代わりに転校させる生徒を選ぶ（slot は場のカードの位置） */
  | { kind: 'makeRoom'; player: number; slot: number }
  /** 転校：全クラスが順番に、係に就いていない生徒を1人ずつクラスから外す（player は今選んでいる人、left はこの後に選ぶ人） */
  | { kind: 'push'; player: number; drawer: number; left: number[]; gone: Student[]; votes?: number[] }
  /** 陶片追放：全クラスが順番に、自分以外のクラスへ秘密で1票ずつ入れる（player は今投票している人、left はこの後に投票する人、ballots は入った票の行き先。画面には出さない） */
  | { kind: 'vote'; player: number; drawer: number; left: number[]; ballots: number[] }
  /** カチコミ（場から取った）：他のクラスを1つ選んで、自分の👊の数×3だけ減点させる */
  | { kind: 'kachikomi'; player: number; slot: number }
  /** クラス替え：自分の生徒1人と、他のクラスの係に就いていない生徒1人を入れ替える（アイコンの数が同じ子どうしだけ） */
  | { kind: 'exchange'; player: number; slot: number }
  /** サイボーグ化：自分のクラスの生徒1人をサイボーグに作り替える */
  | { kind: 'cyborg'; player: number; slot: number }
  /**
   * 品を配る（ゲリラ。card はめくったイベント）：クラスが順番に、品と装備させる子（グッズのない子）を選ぶ。left はこの後に選ぶクラス
   * コロンブスの新大陸到達は📚の多いクラスから順に、取られた品は次のクラスは選べない。鉄砲伝来は全クラスに同じ鉄砲が1丁ずつ届く
   */
  | { kind: 'gift'; card: string; player: number; left: number[]; items: string[]; got: { player: number; uid: string; item: string }[] }
  /** 桃園の誓い（ゲリラ）：劉備役のクラスが、義兄弟になるクラスを max まで選ぶ */
  | { kind: 'oath'; player: number; max: number }
  /** グッズ：生徒1人に装備する */
  | { kind: 'equip'; player: number; card: string; slot: number }
  | { kind: 'result'; player: number | null; result: EventResult; ctx: ResultCtx }
  | { kind: 'gameOver' };

export interface LogEntry {
  id: number;
  when: string;
  text: string;
  player?: number;
}

/** 建設中のピラミッド（古代エジプトの学期だけ場の横に残る。学期が変わると、完成していなくても消える） */
export interface Pyramid {
  /** クラスごとに積んだ石（🏃の数） */
  stones: number[];
  /** 完成に必要な石の合計 */
  need: number;
  done: boolean;
}

export interface GameState {
  version: 26;
  /** その年の3学期それぞれの時代（ERASのindex） */
  yearEras: number[];
  /** まだ使っていない時代の山（毎年ここから引く） */
  eraDeck: number[];
  rng: number;
  players: Player[];
  years: number;
  year: number;
  monthIdx: number;
  /** 今学期の手番の順（1学期はランダム、2学期からは得点の低い順＝最下位から） */
  queue: number[];
  queueIdx: number;
  phase: Phase;
  /** イベントの山札（末尾が一番上）。人物カードは 'person:<カードプールのID>' */
  eventDeck: string[];
  /** 場に表向きで並んでいるカード（手番の人はここから1枚取る） */
  market: string[];
  /** 捨て札（末尾が一番上） */
  discard: string[];
  /** 初期メンバー用の山（現代の普通の生徒） */
  starters: string[];
  pools: Record<EraId, string[]>;
  /** かぐや姫が滞在中なら、各クラス（添字）に頼んでいる宝（グッズのID）。差し出したクラスは null。差し出すかどうかは手番で選ぶ。学期の区切りで月へ帰る（undefined に戻る） */
  kaguya?: (string | null)[];
  uidCounter: number;
  logCounter: number;
  log: LogEntry[];
  /** 桃園の誓い：義兄弟のクラスと、誓ったときの各クラスのポイント（学期の区切りで山分けして消える） */
  oath?: { players: number[]; base: number[] };
  /** 建設中のピラミッド（古代エジプトの学期だけ） */
  pyramid?: Pyramid;
  /** 電球の特許をとったクラス（ほかのクラスが授業カードを取るたびに特許料が入る。学期の頭に切れる） */
  patent?: number;
  /** ゴッホのひまわり：各クラスが飾った絵（描いた子と、描いたときの点。学期の区切りに値打ちが出て消える） */
  sunflower?: { player: number; uid: string; pts: number }[];
}

export type Action =
  | { type: 'drawMember' }
  | { type: 'drawAllMembers' }
  | { type: 'continue' }
  | { type: 'setRoles'; roles: RoleSeat[]; unlock?: RoleId[] }
  /** 場のカードを取る（人物・グッズはクラスポイントを払う） */
  | { type: 'take'; slot: number }
  /** 場のカードを1枚捨てて見送る */
  | { type: 'pass'; slot: number }
  /** ピラミッドに石を積む（クラスの🏃の数だけ。場のカードは減らない） */
  | { type: 'build' }
  /** 満席で人物を迎える時に、代わりに転校させる生徒（null でやめる） */
  | { type: 'makeRoom'; uid: string | null }
  | { type: 'push'; uid: string }
  /** 陶片追放の投票（自分以外のクラス） */
  | { type: 'vote'; target: number }
  | { type: 'kachikomi'; target: number | null }
  | { type: 'exchange'; uid: string | null; target?: number; theirUid?: string }
  | { type: 'equip'; uid: string | null }
  | { type: 'gift'; item: string; uid: string }
  | { type: 'cyborg'; uid: string | null }
  /** かぐや姫に頼まれた宝を差し出す（手番の中でいつでも。手番は終わらない） */
  | { type: 'present' }
  /** 桃園の誓い：義兄弟になるクラス（自分以外・1つ以上） */
  | { type: 'oath'; targets: number[] };
