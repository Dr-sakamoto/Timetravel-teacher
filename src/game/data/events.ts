import { ATTR_ICON, type Attr, type EraId } from '../types';

/** 通常カード（○○の時間）：場から取った人だけ、クラス全員のそのアイコンの合計数（＋係ボーナス）が入る。全時代共通 */
export interface NormalCard {
  id: string;
  kind: 'normal';
  name: string;
  icon: string;
  attr: Attr;
  count: number;
}

/** カチコミ：場から取った人が他のクラスを1つ選び、自分のクラスの👊の数 × mult だけそのクラスを減点させ、👊の数 × drain だけ自分に吸い取る（ドレイン） */
export interface KachikomiCard {
  id: string;
  kind: 'kachikomi';
  name: string;
  icon: string;
  /** 減点の倍率 */
  mult: number;
  /** 自分に入る倍率（ドレイン） */
  drain: number;
  count: number;
}

/** 共通イベント（全クラス）：プラスのアイコンの数だけ得点（マイナスのアイコンがあれば、その数だけ減点） */
export interface SwingCard {
  id: string;
  kind: 'swing';
  name: string;
  icon: string;
  plus: Attr;
  /** 減点になるアイコン。なければプラスだけ */
  minus?: Attr;
  /** あれば「プラスのアイコンを持つ子1人につき +per」（アイコンの数ではなく人数で数える） */
  per?: number;
  desc: string;
  count: number;
}

/**
 * 時代イベントの効果（どれも1文で言えるもの。数えるアイコンはカードの attr。係ボーナスも乗る）
 * 点を数えるもの
 *   heads     … 「Xを持つ子1人につき +per」
 *   tiers     … 「Xが steps[i][0] 以上なら +steps[i][1]」（一番上の届いた段だけ。順位はつけない）
 *   threshold … 「Xが need 以上なら +win、足りないと −lose」
 *   battle    … 「Xの数で勝負：1位 +win、2位 +second、最下位 −lose、ほかは0」（同点は同じ順位）
 * その時代だけの仕組み（時代ごとに1枚。点の数え方ではなく、起こることそのものが違う。生徒が問答無用でいなくなるものは入れない）
 *   plunder   … 白亜紀「Xが一番多いクラスが、一番少ないクラスから amount 点奪う」
 *   disaster  … 白亜紀「全クラス −lose。Xを持つ子1人につき +per」
 *   egg       … 白亜紀「Xが一番多いクラス（1クラスだけ）の空いた席に卵が置かれ、そのクラスの次の手番の始めに恐竜が孵る」
 *   pyramid   … エジプト「山札には入らず、学期のあいだ場の横に残る。手番で選ぶと、クラスのXの数だけ石を積む（その手番は点なし）。
 *               全クラスの石が need×クラス数 に届いたら完成：自分のクラスが積んだ石が steps[i][0] 以上なら +steps[i][1]（届いた一番上の段だけ）。学期中に完成しなければむだになる」
 *   scribe    … エジプト「Xと also を両方持つ子（書記）1人につき +per」
 *   burial    … エジプト「Xを持っていて、グッズを装備している子1人につき +per（王や貴族があの世へ持っていく副葬品）」
 *   arena     … ギリシャ「各クラスの、Xと also の合計が一番多い子が闘技場で戦う：1位 +win、負けたクラス（出せる子がいないクラスも）−lose」
 *   dialogue  … ギリシャ「各クラスのXが一番多い子が代表になってソクラテス（強さ need）と対話：代表のXが need 以上なら +win、届かない（代表がいない）と論破されて −lose」
 *   ostracism … ギリシャ「全クラスが自分以外のクラスに秘密で投票し、票が一番多いクラスが、係に就いていない子を1人転校させる」
 *   fireattack … 三国志「Xが一番多いクラス（1クラスだけ。大船団）と、それ以外で📚が一番多いクラス（軍師）の勝負：軍師の📚が大船団のXより多ければ大船団 −lose・軍師 +win、届かなければ大船団 +win・軍師 −fail」
 *   kongming  … 三国志「👑の数からXの数を引いた差が一番大きいクラス（満席のクラスは除く）に、諸葛亮孔明が軍師として無料で転入する」
 *   bridge    … 三国志「ポイントが一番多いクラス（1クラスだけ）が追いかける。ほかの各クラスはXが一番多い子1人が橋に立ち、その子のXが need 以上なら一喝して追い返し、追いかけるクラスから take 点奪う。足りなければ −lose（追いかけるクラスは得をしない）」
 *   oath      … 三国志「ポイントが一番少ないクラスが、ほかのクラスを max まで選んで義兄弟になる。学期の区切りまでに義兄弟が得た点・失った点を合わせて山分けする」
 *   tribute   … 平安「Xが一番多いクラスに、ほかの全クラスが per 点ずつ贈る」
 *   genji     … 平安「全校でXが一番多い子が作者。作者のクラスで also を持つ子1人につき +per」（同点なら作者が複数）
 *   kaguya    … 平安「かぐや姫が学期の区切りまで滞在し、各クラスに平安の宝（グッズ）を1つずつくじで頼む。頼まれた宝を装備した子がいれば、手番で差し出すかどうか選べる。差し出すと +win（宝は消える）」
 *   benkei    … 平安「Xの合計が need 以上のクラスが弁慶を倒し、一番多いクラスに弁慶が家来として転入。届かないクラスは −lose」
 *   masterpiece … 中世「各クラスのXが一番多い子1人の、Xの数 × per」
 *   printing  … 中世「Xを持っていない子全員のXが1つ増える（全員持っていれば何も起こらない）」
 *   plague    … 中世「各クラスの係に就いていない子1人（ランダム）がペストにかかる。学期の区切りまでXを数えない」
 *   newworld  … 中世「Xの多いクラスから順に、新大陸の品を1つと、それを装備させる子（グッズのない子）を選ぶ。品は早い者勝ち」
 *   gekokujo  … 戦国「Xが一番多いクラスが、ポイントが一番多いクラスから amount 点奪う」（桶狭間の戦い）
 *   teppo     … 戦国「全クラスに鉄砲（種子島）が1丁ずつ届き、クラスごとにグッズのない子1人を選んで装備させる」
 *   rakuichi  … 戦国「Xが一番多いクラス（1クラスだけ）は、次に取るグッズ1つがタダになる」
 *   lottery   … 江戸「全クラスが fee 点ずつ出し、くじで当たった1クラスが総取り」
 *   prize     … 近代「全校でXが一番多い子が受賞し、その子のクラスに +win」
 *   patent    … 近代「Xが一番多いクラス（1クラスだけ）が特許をとる。学期の区切りまで、ほかのクラスが授業カードを取るたびに、そのクラスから fee 点もらう」
 *   expo      … 近代「クラスにあるアイコンの種類（📚🏃🎨👑👊のうち何種類か）が steps[i][0] 以上なら +steps[i][1]（届いた一番上の段だけ）」
 *   sunflower … 近代「各クラスのXが一番多い子が絵を描いて飾る（その場では点なし）。学期の区切りにその子がまだクラスにいれば、描いたときのXの点 × per」
 *   elect     … 現代「全校でXが一番多い子が当選し、Xが1つ増える」（同点なら全員）
 *   alien     … 未来「点は動かない。空いている席があるクラス全部に、アイコンのない火星人が1人ずつ転入する」
 *   machine   … 未来「機械の子（機械の人物・サイボーグ・機械のグッズを装備した子）は、Xが1つ増える」
 *   timemachine … 未来「ポイントが一番少ないクラスに、まだ誰のクラスにもいない人物が1人、無料で転入する」
 */
export type EraEffect =
  | { type: 'heads'; per: number }
  | { type: 'tiers'; steps: [need: number, win: number][] }
  | { type: 'elect' }
  | { type: 'machine' }
  | { type: 'timemachine' }
  | { type: 'threshold'; need: number; win: number; lose: number }
  | { type: 'battle'; win: number; second: number; lose: number }
  | { type: 'plunder'; amount: number }
  | { type: 'disaster'; lose: number; per: number }
  | { type: 'egg' }
  | { type: 'pyramid'; need: number; steps: [stones: number, win: number][] }
  | { type: 'scribe'; also: Attr; per: number }
  | { type: 'burial'; per: number }
  | { type: 'arena'; also: Attr; win: number; lose: number }
  | { type: 'dialogue'; need: number; win: number; lose: number }
  | { type: 'ostracism' }
  | { type: 'fireattack'; win: number; lose: number; fail: number }
  | { type: 'kongming' }
  | { type: 'bridge'; need: number; take: number; lose: number }
  | { type: 'oath'; max: number }
  | { type: 'tribute'; win: number }
  | { type: 'genji'; also: Attr; per: number }
  | { type: 'kaguya'; win: number }
  | { type: 'benkei'; need: number; lose: number }
  | { type: 'masterpiece'; per: number }
  | { type: 'printing' }
  | { type: 'plague' }
  | { type: 'newworld' }
  | { type: 'gekokujo'; amount: number }
  | { type: 'teppo' }
  | { type: 'rakuichi' }
  | { type: 'lottery'; fee: number }
  | { type: 'prize'; win: number }
  | { type: 'patent'; fee: number }
  | { type: 'expo'; steps: [kinds: number, win: number][] }
  | { type: 'sunflower'; per: number }
  | { type: 'alien' };

/** カードに載るアイコンの上限（生徒会長選挙・シンギュラリティ・活版印刷で増えるのもここまで。グッズの＋1は別） */
export const MAX_ICONS = 6;

/** 機械のグッズ（装備した子はシンギュラリティで機械として数える） */
export const MACHINE_GOODS = ['g_phone', 'g_tablet', 'g_chip'];

/** 時代イベント（全クラス）：カードごとの効果 */
export interface ContestCard {
  id: string;
  kind: 'contest';
  name: string;
  icon: string;
  /** 競うアイコン（'all' は全種類のアイコンの合計。優遇なしの現代用） */
  attr: Attr | 'all';
  /** あれば attr と合わせて数えるアイコン（戦国の合戦は👑＋👊） */
  also?: Attr;
  era: EraId;
  effect: EraEffect;
  desc: string;
  count: number;
}

/** 襲来（時代イベント・全クラス）：クラスの👊の数 − 敵の強さ。撃退すれば大きくプラス、守れなければ大きくマイナス */
export interface RaidCard {
  id: string;
  kind: 'raid';
  era: EraId;
  name: string;
  icon: string;
  threat: number;
  count: number;
}

/** グッズ：生徒1人に装備して、そのアイコンを1つ増やす（1人1つまで） */
export interface GoodsCard {
  id: string;
  kind: 'goods';
  name: string;
  icon: string;
  attr: Attr;
  /** 時代のグッズなら、その時代の学期だけ山札に入る */
  era?: EraId;
  count: number;
}

/** サイボーグ化：自分のクラスの生徒1人を、📚🏃のサイボーグに作り替える（元のカードは覆われて消える） */
export interface CyborgCard {
  id: string;
  kind: 'cyborg';
  name: string;
  icon: string;
  era: EraId;
  count: number;
}

/** 転校・クラス替え */
export interface MoveCard {
  id: string;
  kind: 'push' | 'exchange';
  name: string;
  icon: string;
  desc: string;
  count: number;
  /** 学期の山札に入る確率（省略時は必ず入る） */
  odds?: number;
}

export type EventCard = NormalCard | KachikomiCard | SwingCard | ContestCard | RaidCard | GoodsCard | CyborgCard | MoveCard;

/** 定期テスト・卒業式（全員参加）の順位点（人数別） */
export const CONTEST_POINTS: Record<number, number[]> = {
  2: [5, 2],
  3: [5, 3, 1],
  4: [5, 3, 2, 1],
  5: [5, 3, 2, 1, 0],
};

/** 学期ごとの山札に入る人物カードの最大枚数（その時代のカードプールに残っている分だけ） */
export const PERSON_CARDS_PER_TERM = 7;

/** 場に表向きで並ぶカードの枚数 */
export const MARKET_SIZE = 4;
/** 人物カードを取るのに払うクラスポイント（カードに印刷されたアイコンの数ごと。添字＝アイコン数） */
/** アイコンが少ない子は安くすぐ元が取れ、多い子は長い試合でないと元が取れない */
export const PERSON_COST_BY_ICONS = [0, 2, 4, 8, 14, 24];
export function personCost(icons: number): number {
  return PERSON_COST_BY_ICONS[Math.min(icons, PERSON_COST_BY_ICONS.length - 1)];
}
/** グッズ・サイボーグ化を取るのに払うクラスポイント */
export const GOODS_COST = 2;

/** 場から取れるカードのコスト（授業とクラス替えは無料）。freeGoods（楽市楽座）があればグッズはタダ */
export function eventCost(c: EventCard, freeGoods = false): number {
  if (c.kind === 'goods') return freeGoods ? 0 : GOODS_COST;
  return c.kind === 'cyborg' ? GOODS_COST : 0;
}

/** ゲリラ：場に並べようとめくった瞬間に、その場で起こるカード（だれも避けられない） */
export function isGuerrilla(c: EventCard): boolean {
  return c.kind === 'swing' || c.kind === 'contest' || c.kind === 'raid' || c.kind === 'push';
}

const N = (attr: Attr, name: string, icon: string, count: number): NormalCard => ({ id: `n_${attr}`, kind: 'normal', name, icon, attr, count });
export const NORMAL_CARDS: NormalCard[] = [
  N('study', '数学の時間', '🔢', 5),
  N('sports', '体育の時間', '🏃', 5),
  N('art', '美術の時間', '🎨', 5),
  N('charm', '学活の時間', '🙋', 4),
];

export const KACHIKOMI_CARDS: KachikomiCard[] = [{ id: 'kachikomi', kind: 'kachikomi', name: 'カチコミ', icon: '👊', mult: 3, drain: 1, count: 3 }];

// 共通イベントはいったん休止中（時代イベントが出やすいように、山札に入れない）。戻すときは count を 1 に
const W = (id: string, name: string, icon: string, plus: Attr, minus: Attr | undefined, desc: string, per?: number): SwingCard => ({
  id, kind: 'swing', name, icon, plus, minus, desc, per, count: 0,
});
export const SWING_CARDS: SwingCard[] = [
  W('poptest', '抜き打ちテスト', '📝', 'study', undefined, '日ごろの勉強がものを言う。'),
  W('visit', '授業参観', '👀', 'charm', 'fight', '親の前でいいところを見せたい。'),
  // 持久走大会・合唱コンクールは、現代の体育祭・文化祭（1人につき+2）の弱い版
  W('marathon', '持久走大会', '🥵', 'sports', undefined, '全員が走る。走れる子が多いクラスが有利。', 1),
  W('chorus', '合唱コンクール', '🎶', 'art', undefined, '全員で歌う。歌える子が多いほど響く。', 1),
];

export const MOVE_CARDS: MoveCard[] = [
  { id: 'push', kind: 'push', name: '転校', icon: '📦', desc: '全クラス：係に就いていない生徒を1人、必ず転校させる（クラスから外す）', count: 1, odds: 2 / 3 },
  { id: 'exchange', kind: 'exchange', name: 'クラス替え', icon: '🔁', desc: '取った人：自分の生徒1人と、他のクラスの係に就いていない生徒1人を入れ替える（印刷されたアイコンの数が同じ子どうしだけ）', count: 1 },
];

const G = (id: string, name: string, icon: string, attr: Attr, era?: EraId): GoodsCard => ({ id, kind: 'goods', name, icon, attr, era, count: 1 });
/** グッズ：時代ごとに2種（時代のグッズはその時代の優遇アイコン。歴史の時代は実在の品。未来の片方はサイボーグ化）。平安だけは竹取物語の5つの宝（かぐや姫の難題） */
export const GOODS_CARDS: GoodsCard[] = [
  G('g_phone', 'スマホ', '📱', 'charm', 'present'),
  G('g_tablet', 'タブレット', '💻', 'study', 'present'),
  G('g_fang', 'ティラノサウルスの牙', '🦷', 'fight', 'cretaceous'),
  G('g_amber', '琥珀', '🟠', 'art', 'cretaceous'),
  G('g_mask', 'ツタンカーメンの黄金のマスク', '🎭', 'charm', 'egypt'),
  G('g_sledge', 'ピラミッドの石運びそり', '🛷', 'sports', 'egypt'),
  G('g_olive', 'オリンピアのオリーブ冠', '🌿', 'sports', 'greece'),
  G('g_republic', 'プラトンの『国家』', '📜', 'study', 'greece'),
  G('g_sunzi', '『孫子』の兵法書', '🎋', 'study', 'china'),
  G('g_halberd', '青龍偃月刀', '🗡️', 'fight', 'china'),
  G('g_hachi', '仏の御石の鉢', '🥣', 'study', 'heian'),
  G('g_koyasugai', '燕の子安貝', '🐚', 'sports', 'heian'),
  G('g_horai', '蓬莱の玉の枝', '🌿', 'art', 'heian'),
  G('g_hinezumi', '火鼠の皮衣', '🔥', 'charm', 'heian'),
  G('g_ryunotama', '龍の首の珠', '🐉', 'fight', 'heian'),
  G('g_chisel', 'ミケランジェロのノミ', '🔨', 'art', 'europe'),
  G('g_copernicus', 'コペルニクスの『天球回転論』', '📙', 'study', 'europe'),
  G('g_tonbogiri', '本多忠勝の蜻蛉切', '🔱', 'fight', 'sengoku'),
  G('g_hyotan', '秀吉の千成瓢箪', '🍶', 'charm', 'sengoku'),
  G('g_fugaku', '北斎の『富嶽三十六景』', '🗻', 'art', 'edo'),
  G('g_ryoteisha', '伊能忠敬の量程車', '🛞', 'sports', 'edo'),
  G('g_bulb', 'エジソンの電球', '💡', 'study', 'modern'),
  G('g_violin', 'ストラディバリウスのバイオリン', '🎻', 'art', 'modern'),
  G('g_chip', '電脳チップ', '💾', 'study', 'future'),
];

/** 新大陸の品（コロンブスの新大陸到達でだけ手に入る。山札には入らない。装備するとグッズと同じくアイコン＋1） */
export const NEW_WORLD_GOODS: GoodsCard[] = [
  G('g_cacao', 'カカオ', '🍫', 'charm'),
  G('g_corn', 'トウモロコシ', '🌽', 'sports'),
  G('g_tomato', 'トマト', '🍅', 'art'),
  G('g_newmap', '新大陸の地図', '🗺️', 'study'),
];
export const NEW_WORLD_MAP: Record<string, GoodsCard> = Object.fromEntries(NEW_WORLD_GOODS.map((g) => [g.id, g]));

/** かぐや姫が頼む5つの宝（竹取物語の難題）＝平安のグッズ。くじで各クラスに1つずつ、重ならないように頼む */
export const KAGUYA_TREASURES: GoodsCard[] = GOODS_CARDS.filter((g) => g.era === 'heian');

/** 鉄砲伝来で全クラスに1丁ずつ届く鉄砲（山札には入らない。装備するとグッズと同じく👊＋1） */
export const TEPPO_GOODS: GoodsCard = G('g_tanegashima', '種子島（火縄銃）', '🔫', 'fight');

/** イベントで配られる品（新大陸の品・鉄砲）。山札のグッズとは別 */
export const GIFT_MAP: Record<string, GoodsCard> = { ...NEW_WORLD_MAP, [TEPPO_GOODS.id]: TEPPO_GOODS };

/** サイボーグ化（未来の学期だけ山札に入る） */
export const CYBORG_CARDS: CyborgCard[] = [{ id: 'cyborg', kind: 'cyborg', name: 'サイボーグ化', icon: '🦾', era: 'future', count: 1 }];
/** サイボーグになった生徒のアイコン */
export const CYBORG_ATTRS: Attr[] = ['study', 'sports'];

/** 時代ごとの襲来：攻めてくる敵の名前・絵柄・強さ（歴史の時代は実在の出来事） */
export const ERA_RAIDERS: Record<EraId, [string, string, number]> = {
  present: ['他校のヤンキー', '🏍️', 4],
  cretaceous: ['ヴェロキラプトルの群れ', '🦖', 9],
  egypt: ['海の民', '⛵', 4],
  greece: ['クセルクセスのペルシア軍', '🏹', 6],
  china: ['黄巾の乱', '🟡', 7],
  heian: ['平将門の乱', '🐎', 5],
  europe: ['ヴァイキング', '🏴‍☠️', 6],
  sengoku: ['本能寺の変', '🔥', 8],
  edo: ['赤穂浪士の討ち入り', '🏮', 5],
  modern: ['アル・カポネ一味', '🕴️', 5],
  future: ['宇宙海賊', '👾', 6],
};

export const RAID_CARDS: RaidCard[] = (Object.keys(ERA_RAIDERS) as EraId[]).map((era) => {
  const [name, icon, threat] = ERA_RAIDERS[era];
  return { id: `raid_${era}`, kind: 'raid', era, name: `襲来！${name}`, icon, threat, count: 1 };
});

/** count：その時代の固有イベントが4種の時代は1枚ずつ、2種の時代は2枚ずつ（どの時代も合わせて4枚） */
const C = (id: string, name: string, icon: string, attr: Attr | 'all', effect: EraEffect, desc: string, era: EraId, count = 2): ContestCard => ({
  id, kind: 'contest', name, icon, attr, effect, desc, era, count,
});

/** 時代の固有イベントカード：その時代の学期だけ山札に混ざる。その時代の優遇アイコン（ERAS の favor）で競う */
export const ERA_CARDS: ContestCard[] = [
  // 現代：いつもの学校の行事。文化祭・体育祭は共通イベントの合唱コンクール・持久走大会の強い版
  C('bunkasai', '文化祭', '🎪', 'art', { type: 'heads', per: 2 }, 'クラスの出し物。絵や音楽が得意な子が多いほど盛り上がる。', 'present', 1),
  C('taiikusai', '体育祭', '🏟️', 'sports', { type: 'heads', per: 2 }, 'クラス対抗リレー。走れる子が多いほど盛り上がる。', 'present', 1),
  C('seitokai', '生徒会長選挙', '🗳️', 'charm', { type: 'elect' }, '全校で一番人望のある子が会長に。肩書きがついて、ますます慕われる。', 'present', 1),
  C('shugakuryoko', '修学旅行', '🚌', 'all', { type: 'tiers', steps: [[12, 5], [18, 10], [24, 15]] }, 'いろんな子がいるクラスほど、旅の思い出がふくらむ。', 'present', 1),
  // 白亜紀：👊が中心。弱肉強食の時代と、恐竜を絶滅させた隕石。卵から孵る恐竜（EGG_DINOS）はここに出てくる恐竜
  C('meteor', '巨大隕石の衝突', '☄️', 'sports', { type: 'disaster', lose: 8, per: 2 }, '恐竜の時代を終わらせた隕石。生き延びたのは、すばしこく逃げ回れた者たち。', 'cretaceous', 1),
  C('trex_hunt', 'ティラノサウルスの狩り', '🦖', 'fight', { type: 'plunder', amount: 8 }, 'ティラノサウルスは、一番肥えた獲物を狙う。一番強い群れが、一番ポイントを持っているクラスに襲いかかる。', 'cretaceous', 1),
  C('migration', '大移動', '🦕', 'fight', { type: 'threshold', need: 6, win: 6, lose: 0 }, 'パラサウロロフスの群れが大地を渡る。群れを守り切れるか。', 'cretaceous', 1),
  C('egg_theft', 'オヴィラプトルの卵泥棒', '🥚', 'sports', { type: 'egg' }, '一番すばしこいクラスが、恐竜の卵をこっそり持ち帰る。何が孵るかはお楽しみ。', 'cretaceous', 1),
  // 古代エジプト：🏃👑。ピラミッドは場の横に残り、みんなで少しずつ積む。ナイルの氾濫のあとは大豊作。書記はえらい役人、ミイラの副葬品は王や貴族のもの
  C('giza', 'ギザの大ピラミッド建設', '🔺', 'sports', { type: 'pyramid', need: 7, steps: [[7, 20], [14, 30]] }, '学期のあいだ、みんなで少しずつ石を積む。働く人はパンとビールを給料にもらっていた。完成すれば、たくさん積んだクラスほど大きなほうび。学期が終わるまでに完成しなければ、積んだ石はむだになる。', 'egypt', 1),
  C('nile', 'ナイルの氾濫', '🌊', 'sports', { type: 'heads', per: 2 }, '毎年夏、ナイル川があふれて畑に黒い土を運ぶ。水が引いたら大豊作。畑で働く子が多いほど、たくさんとれる。', 'egypt', 1),
  C('hieroglyph', 'ヒエログリフ', '👁️', 'charm', { type: 'scribe', also: 'study', per: 3 }, '絵のような文字で、石や紙（パピルス）に書き残す。読み書きができる書記は、王に仕えるえらい役人だった。', 'egypt', 1),
  C('mummy', 'ミイラづくり', '⚱️', 'charm', { type: 'burial', per: 4 }, '70日かけてミイラをつくり、あの世で使う宝物（副葬品）といっしょにお墓に納める。りっぱなお墓に宝物を入れてもらえたのは、王や貴族だけ。', 'egypt', 1),
  // ギリシャ・ローマ：🏃📚。オリンピックは負けても減点なし、剣闘は負けると減点。陶片追放は秘密投票で1クラスだけ転校
  C('olympia', '古代オリンピック', '🏛️', 'sports', { type: 'battle', win: 12, second: 5, lose: 0 }, 'オリーブ冠を手にするのは、一番速いクラスだけ。参加することに意義がある。', 'greece', 1),
  C('colosseum', 'コロッセオの剣闘', '⚔️', 'sports', { type: 'arena', also: 'fight', win: 12, lose: 0 }, '各クラスの一番の剣闘士が闘技場へ。勝てば喝采。', 'greece', 1),
  C('socratic', 'ソクラテスの問答', '🧔', 'study', { type: 'dialogue', need: 4, win: 8, lose: 0 }, '「きみは何を知っている？」 クラスの代表がソクラテスと対話する。', 'greece', 1),
  C('ostracism', '陶片追放', '🏺', 'all', { type: 'ostracism' }, '陶器のかけらに名前を書いて、こっそり投票。票が一番集まったクラスから、1人がアテネを去る。', 'greece', 1),
  // 三国志：📚👊。腕っぷしの大船団と知恵の軍師がぶつかり、孔明は知恵の足りないクラスへ来て、義兄弟はもうけも損も分け合う
  C('chibi', '赤壁の戦い', '⛵', 'fight', { type: 'fireattack', win: 10, lose: 10, fail: 5 }, '208年、曹操の大船団に、周瑜と孔明が知恵の火攻めで挑んだ。腕っぷしの大軍か、知恵の軍師か。', 'china', 1),
  C('sangu', '三顧の礼', '🏠', 'study', { type: 'kongming' }, '人望はあっても知恵の足りなかった劉備は、諸葛亮の家を3回たずねて、やっと軍師に迎えた。', 'china', 1),
  C('changban', '長坂の戦い', '🌉', 'fight', { type: 'bridge', need: 2, take: 4, lose: 0 }, '208年、曹操の大軍に追われた劉備軍。張飛はたった一人で橋の上に立ち、大声で一喝して追っ手を止めた。', 'china', 1),
  C('taoyuan', '桃園の誓い', '🍑', 'all', { type: 'oath', max: 2 }, '物語『三国志演義』では、まだ何者でもなかった劉備が、関羽・張飛と桃の園で義兄弟になった。生まれた日はちがっても、喜びも苦しみも分け合う。', 'china', 1),
  // 平安：🎨👑。物語を書く子と読む貴族、権力者への贈り物、かぐや姫の難題、五条大橋の弁慶（👊だけはこの1枚）
  C('genji', '源氏物語', '📖', 'art', { type: 'genji', also: 'charm', per: 3 }, '紫式部が書いた光源氏の物語。宮中の貴族たちが続きを楽しみに回し読みした。', 'heian', 1),
  C('mochizuki', '藤原道長の望月の歌', '🌕', 'charm', { type: 'tribute', win: 6 }, '「この世をば わが世とぞ思ふ 望月の 欠けたることも なしと思へば」。道長に一番気に入られたクラスが、宴に招かれる。', 'heian', 1),
  C('kaguya', '竹取物語・かぐや姫の難題', '🌙', 'all', { type: 'kaguya', win: 5 }, 'かぐや姫が学校にやってきて「この宝を持ってきてください」。持ってこられなければ、学期の終わりに月へ帰ってしまう。', 'heian', 1),
  C('gojo', '五条大橋の弁慶', '🪓', 'fight', { type: 'benkei', need: 3, lose: 0 }, '京の五条大橋で、弁慶が通る人の刀を奪っている。力を合わせて倒せば、弁慶が家来になる。', 'heian', 1),
  // 中世・ルネサンス：🎨📚。ペストにかかった子は走れなくなり、新大陸の品は早い者勝ち
  C('monalisa', 'モナ・リザ制作', '🖼️', 'art', { type: 'masterpiece', per: 3 }, '何年もかけて仕上げられた、謎の微笑み。名画を生むのはクラス一番の描き手の腕前。', 'europe', 1),
  C('printing', '活版印刷', '📘', 'study', { type: 'printing' }, 'グーテンベルクの印刷機で、本が安く刷れるようになった。本を読んだことのない子も、みんな学び始める。', 'europe', 1),
  C('plague', 'ペストの大流行', '🐀', 'sports', { type: 'plague' }, 'ネズミが運ぶ黒い病がヨーロッパ中に広がった。かかった子は学期が終わるまで寝込んで走れない。', 'europe', 1),
  C('columbus', 'コロンブスの新大陸到達', '🌎', 'study', { type: 'newworld' }, '1492年、大西洋の向こうに新しい大陸が見つかった。見たこともない品が、物知りのクラスから順に届く。', 'europe', 1),
  // 戦国：👑👊。合戦は👑と👊を合わせて数える。鉄砲はどのクラスにも届き、楽市楽座では人望のあるクラスにグッズがタダで届く
  { ...C('okehazama', '桶狭間の戦い', '🌧️', 'charm', { type: 'gekokujo', amount: 8 }, '大雨の中の奇襲。勢いに乗ったクラスが、天下に一番近い大大名・今川義元の本陣を討つ。', 'sengoku', 1), also: 'fight' },
  { ...C('sekigahara', '関ヶ原の戦い', '⚔️', 'charm', { type: 'battle', win: 15, second: 5, lose: 0 }, '天下分け目の大合戦。味方を集めた人望と腕っぷしで、東軍と西軍がぶつかる。', 'sengoku', 1), also: 'fight' },
  C('teppo', '鉄砲伝来', '🔫', 'fight', { type: 'teppo' }, '1543年、種子島に流れ着いたポルトガル人が鉄砲を伝えた。どのクラスにも1丁ずつ届く。', 'sengoku', 1),
  C('rakuichi', '楽市楽座', '🪙', 'charm', { type: 'rakuichi' }, '城下町で誰でも自由に商売ができるようになった。人望を集めたクラスには、商人が品をタダで持ってくる。', 'sengoku', 1),
  // 江戸・幕末：🎨🏃。運だけの富くじ
  C('tomikuji', '富くじ', '🎫', 'all', { type: 'lottery', fee: 3 }, '江戸の町じゅうが熱狂した宝くじ。当たれば総取り。', 'edo'),
  C('ino', '伊能忠敬の日本地図測量', '🗾', 'sports', { type: 'heads', per: 2 }, '日本中を歩いて測る。歩ける子が多いほど地図が早くできる。', 'edo'),
  // 近代：📚🎨。西洋の発明と芸術の時代。賞を取るのは全校でたった1人、特許料は学期のあいだ入り続け、ひまわりの絵は学期の区切りに値打ちが出る
  C('nobel', 'ノーベル賞', '🏅', 'study', { type: 'prize', win: 12 }, 'トンネル工事などに使うダイナマイトを発明したノーベルが、自分の財産で作った賞。1901年から、世界のためになる発見をした人に贈られる。受賞するのは全校でたった1人。', 'modern', 1),
  C('patent', '電球の特許', '💡', 'study', { type: 'patent', fee: 1 }, '1879年、エジソンが長く光る電球を作った。発明した人は「特許」をとると、その発明を使う人からお礼のお金をもらえる。教室で電灯をつけて授業をするたびに、特許料がはいる。', 'modern', 1),
  C('expo', 'パリ万国博覧会', '🗼', 'all', { type: 'expo', steps: [[4, 4], [5, 10]] }, '世界中の国が自慢の品を持ちよった大博覧会。1867年のパリ万博には日本も初めて出展し、浮世絵がヨーロッパで大人気になった。いろんな得意を持つ子がそろったクラスほど、見に来る人でにぎわう。', 'modern', 1),
  C('sunflower', 'ゴッホのひまわり', '🌻', 'art', { type: 'sunflower', per: 3 }, 'ゴッホはひまわりの絵を何枚も描いたが、生きているあいだはほとんど売れなかった。今では世界中の美術館の宝もの。描いた絵は、あとになってから値打ちが出る。', 'modern', 1),
  // 未来：📚。ロボコンとシンギュラリティが📚の枠
  C('robocon', 'ロボコン2300', '🤖', 'study', { type: 'threshold', need: 8, win: 10, lose: 0 }, 'ロボットを作って出場。頭脳が足りないと動かない。', 'future', 1),
  C('singularity', 'シンギュラリティ', '🧠', 'study', { type: 'machine' }, 'AIが人間の知能を超えた。機械の子たちが一気に賢くなる。', 'future', 1),
  C('martian', '火星からの留学生', '👽', 'all', { type: 'alien' }, '空いている席に、何もできない火星人が留学してくる。', 'future', 1),
  C('timemachine', 'タイムマシン完成', '⏳', 'all', { type: 'timemachine' }, 'いちばん困っているクラスに、どこかの時代から助っ人がやってくる。', 'future', 1),
];

/** 固定イベント（学期末のテストと卒業式） */
export interface FixedEvent {
  id: string;
  name: string;
  icon: string;
  rule: 'test' | 'graduation';
  mult: number;
}
export const FIXED_EVENTS: FixedEvent[] = [
  { id: 'test1', name: '1学期 期末テスト', icon: '📚', rule: 'test', mult: 1 },
  { id: 'test2', name: '2学期 期末テスト', icon: '📚', rule: 'test', mult: 1 },
  { id: 'test3', name: '学年末テスト', icon: '📚', rule: 'test', mult: 1 },
  { id: 'graduation', name: '卒業式', icon: '🎓', rule: 'graduation', mult: 3 },
];
/** 月末に固定イベントが起こる月 */
export const FIXED_BY_MONTH: Record<number, string> = { 7: 'test1', 12: 'test2', 3: 'test3' };
/** テストでは👊を持つ生徒1人につきこれだけ減点 */
export const TEST_YANKEE_PENALTY = 1;

export const ALL_EVENT_CARDS: EventCard[] = [
  ...NORMAL_CARDS,
  ...KACHIKOMI_CARDS,
  ...SWING_CARDS,
  ...MOVE_CARDS,
  ...GOODS_CARDS,
  ...CYBORG_CARDS,
  ...ERA_CARDS,
  ...RAID_CARDS,
];

/** そのカードが入る時代（どの時代にも入るなら undefined） */
export function cardEra(c: EventCard): EraId | undefined {
  return c.kind === 'contest' || c.kind === 'raid' || c.kind === 'goods' || c.kind === 'cyborg' ? c.era : undefined;
}
export const EVENT_MAP: Record<string, EventCard> = Object.fromEntries(ALL_EVENT_CARDS.map((e) => [e.id, e]));
export const FIXED_MAP: Record<string, FixedEvent> = Object.fromEntries(FIXED_EVENTS.map((e) => [e.id, e]));

/** カードに書くルール文 */
export function cardRule(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `取った人：クラス全員の${ATTR_ICON[c.attr]}の数を加点`;
    case 'kachikomi':
      return `取った人：他のクラスを1つ選び、自分のクラスの👊の数×${c.mult}だけ減点させ、👊の数×${c.drain}だけ自分に加点（ドレイン）`;
    case 'swing':
      if (c.per) return `全クラス：${ATTR_ICON[c.plus]}を持つ子1人につき+${c.per}`;
      if (!c.minus) return `全クラス：${ATTR_ICON[c.plus]}の数だけ得点`;
      return `全クラス：${ATTR_ICON[c.plus]}の数だけ得点、${ATTR_ICON[c.minus]}の数だけ減点`;
    case 'contest':
      return `全クラス：${eraEffectRule(c)}`;
    case 'raid':
      return `全クラス：クラスの👊の数 − ${c.threat}`;
    case 'goods':
      return `生徒1人に装備：${ATTR_ICON[c.attr]}＋1（1人1つまで）`;
    case 'cyborg':
      return `自分のクラスの生徒1人を、${CYBORG_ATTRS.map((a) => ATTR_ICON[a]).join('')}のサイボーグに作り替える（元のカードは消える）`;
    default:
      return c.desc;
  }
}

/** 時代イベントで数えるアイコンの書き方（'all' は「アイコン」、合わせて数えるなら「👑＋👊」） */
function attrLabel(c: ContestCard): string {
  if (c.attr === 'all') return 'アイコン';
  return c.also ? `${ATTR_ICON[c.attr]}＋${ATTR_ICON[c.also]}` : ATTR_ICON[c.attr];
}

/** 時代イベントの効果の説明文（1文） */
export function eraEffectRule(c: ContestCard): string {
  const a = attrLabel(c);
  const e = c.effect;
  switch (e.type) {
    case 'heads':
      return `${a}を持つ子1人につき+${e.per}`;
    case 'disaster':
      return `全クラス−${e.lose}。${a}を持つ子1人につき+${e.per}`;
    case 'egg':
      return `${a}が一番多いクラスの空いた席に卵が来て、次の手番に恐竜が孵る`;
    case 'tiers':
      return `${a}の総数が${e.steps.map(([n, w]) => `${n}以上で+${w}`).join('、')}`;
    case 'elect':
      return `全校で${a}が一番多い子が当選し、${a}が1つ増える`;
    case 'machine':
      return `機械の子（機械の人物・サイボーグ・スマホ・タブレット・電脳チップを装備した子）は${a}が1つ増える`;
    case 'timemachine':
      return 'ポイントが一番少ないクラスに、どこかの時代の人物が1人、無料で転入する';
    case 'threshold':
      return `${a}が${e.need}以上なら+${e.win}${e.lose ? `、足りないと−${e.lose}` : ''}`;
    case 'battle':
      return `${a}の数で勝負：1位+${e.win}、2位+${e.second}${e.lose ? `、最下位−${e.lose}` : '（負けても減点なし）'}`;
    case 'arena':
      return `各クラスの${a}${ATTR_ICON[e.also]}の合計が一番多い子が戦う：1位+${e.win}${e.lose ? `、負けたクラスは−${e.lose}` : '（負けても減点なし）'}`;
    case 'dialogue':
      return `各クラスの${a}が一番多い子が代表でソクラテスと対話：${a}${e.need}以上なら+${e.win}${e.lose ? `、足りないと論破されて−${e.lose}` : ''}`;
    case 'plunder':
      return `${a}が一番多いクラスが、ポイントが一番多いクラスから${e.amount}点奪う（自分がポイント1位なら何も起こらない）`;
    case 'pyramid':
      return `手番で選ぶと、クラスの${a}の数だけ石を積む（その手番は点なし）。全クラスで${e.need}×クラス数に届いたら完成：積んだ石が${e.steps.map(([n, w]) => `${n}個以上で+${w}`).join('、')}。学期中に完成しなければむだ`;
    case 'scribe':
      return `${a}と${ATTR_ICON[e.also]}を両方持つ子（書記）1人につき+${e.per}`;
    case 'burial':
      return `${c.attr === 'all' ? '' : `${a}を持っていて、`}グッズを装備している子1人につき+${e.per}`;
    case 'ostracism':
      return '全クラスがほかのクラスに秘密で投票し、票が一番多いクラスが1人転校させる';
    case 'fireattack':
      return `${a}が一番多いクラス（大船団）と、ほかで📚が一番多いクラス（軍師）の勝負：軍師の📚が大船団の${a}より多ければ火攻めで大船団−${e.lose}・軍師+${e.win}、届かなければ大船団+${e.win}・軍師−${e.fail}`;
    case 'kongming':
      return `👑の数から${a}の数を引いた差が一番大きいクラスに、諸葛亮孔明が軍師として無料で転入（満席のクラスは除く）`;
    case 'bridge':
      return `ポイントが一番多いクラスが追いかける。ほかの各クラスは${a}が一番多い子1人が橋に立ち、${a}${e.need}以上なら一喝して追いかけるクラスから${e.take}点奪う${e.lose ? `、足りなければ−${e.lose}` : ''}`;
    case 'oath':
      return `ポイントが一番少ないクラスが、ほかのクラスを${e.max}つまで選んで義兄弟に。学期の区切りまで、義兄弟のもうけと損は山分け`;
    case 'tribute':
      return `${a}が一番多いクラスに+${e.win}`;
    case 'genji':
      return `全校で${a}が一番多い子が作者に：作者のクラスで${ATTR_ICON[e.also]}を持つ子1人につき+${e.per}`;
    case 'kaguya':
      return `かぐや姫が学期の終わりまで滞在し、宝（${KAGUYA_TREASURES.map((t) => t.name).join('・')}）をクラスごとに1つずつ頼む：頼まれた宝を装備していれば、手番で差し出して+${e.win}（宝は消える）`;
    case 'benkei':
      return `${a}の合計が${e.need}以上のクラスが弁慶を倒し、一番多いクラスに弁慶（${a}${a}${a}）が転入${e.lose ? `。届かないクラスは−${e.lose}` : ''}`;
    case 'masterpiece':
      return `各クラスの${a}が一番多い子1人の、${a}の数×${e.per}`;
    case 'printing':
      return `${a}を持っていない子全員の${a}が1つ増える`;
    case 'plague':
      return `各クラスの係でない子1人（ランダム）がペストにかかり、学期の区切りまで${a}を数えない`;
    case 'newworld':
      return `${a}の多いクラスから順に新大陸の品（${NEW_WORLD_GOODS.map((g) => g.name + ATTR_ICON[g.attr]).join('・')}）を1つ選び、グッズを持っていない子1人に装備（早い者勝ち）`;
    case 'gekokujo':
      return `${a}が一番多いクラスが、ポイントが一番多いクラスから${e.amount}点奪う`;
    case 'teppo':
      return `全クラスに鉄砲（${TEPPO_GOODS.icon}${ATTR_ICON[TEPPO_GOODS.attr]}＋1）が1丁ずつ届き、グッズを持っていない子1人に装備`;
    case 'rakuichi':
      return `${a}が一番多いクラスは、次に取るグッズ1つがタダ`;
    case 'lottery':
      return `全クラスが${e.fee}点ずつ出し、くじで当たった1クラスが総取り`;
    case 'prize':
      return `全校で${a}が一番多い子が受賞：その子のクラスに+${e.win}`;
    case 'patent':
      return `${a}が一番多いクラスが特許をとる：学期の区切りまで、ほかのクラスが授業カードを取るたびに${e.fee}点もらう`;
    case 'expo':
      return `クラスにあるアイコンの種類が${e.steps.map(([n, w]) => `${n}種類で+${w}`).join('、')}`;
    case 'sunflower':
      return `各クラスの${a}が一番多い子が絵を飾る：学期の区切りにその子がまだいれば、${a}の数×${e.per}`;
    case 'alien':
      return '空いている席に、アイコンのない火星人が1人ずつ来る';
  }
}

export function fixedRule(f: FixedEvent): string {
  return f.rule === 'test'
    ? `📚の数−👊を持つ子1人につき${TEST_YANKEE_PENALTY}で勝負（順位点×${f.mult}）`
    : `クラス全員のアイコンの総数で勝負（順位点×${f.mult}）`;
}

/**
 * カードの効果を短い式で（文章を読まなくても分かるように）。絵文字は5つのアイコン（📚🏃🎨👑👊）だけ使う。
 * 例：授業「👑 → +」、時代イベント「👊1位 +12」、襲来「👊 − 8」
 */
export function cardGlyph(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `${ATTR_ICON[c.attr]} → +`;
    case 'kachikomi':
      return `相手 −👊×${c.mult}　自分 +👊×${c.drain}`;
    case 'swing':
      if (c.per) return `${ATTR_ICON[c.plus]}の子1人 +${c.per}`;
      return c.minus ? `+${ATTR_ICON[c.plus]}　−${ATTR_ICON[c.minus]}` : `${ATTR_ICON[c.plus]} → +`;
    case 'contest':
      return contestGlyph(c);
    case 'raid':
      return `👊 − ${c.threat}`;
    case 'goods':
      return `装備 ${ATTR_ICON[c.attr]}＋1`;
    case 'cyborg':
      return '1人をサイボーグに';
    case 'push':
      return '全クラス 1人転校';
    case 'exchange':
      return '1人ずつ交換';
  }
}

function contestGlyph(c: ContestCard): string {
  const a = attrLabel(c);
  const e = c.effect;
  switch (e.type) {
    case 'heads':
      return `${a}の子1人 +${e.per}`;
    case 'disaster':
      return `全員−${e.lose}　${a}の子1人 +${e.per}`;
    case 'egg':
      return `${a}1位 → 卵が来る`;
    case 'tiers':
      return e.steps.map(([n, w]) => `${n}以上+${w}`).join('／');
    case 'elect':
      return `全校の${a}1位の子 → ${a}＋1`;
    case 'machine':
      return `機械の子 → ${a}＋1`;
    case 'timemachine':
      return 'ポイント最下位に1人転入';
    case 'threshold':
      return `${a}${e.need}以上 +${e.win}${e.lose ? `／未満 −${e.lose}` : ''}`;
    case 'battle':
      return `${a}1位 +${e.win}　2位 +${e.second}${e.lose ? `　最下位 −${e.lose}` : ''}`;
    case 'arena':
      return `代表の${a}＋${ATTR_ICON[e.also]}　1位 +${e.win}${e.lose ? `　負け −${e.lose}` : ''}`;
    case 'dialogue':
      return `代表の${a}${e.need}以上 +${e.win}${e.lose ? `／未満 −${e.lose}` : ''}`;
    case 'plunder':
      return `${a}1位がポイント1位から${e.amount}点奪う`;
    case 'pyramid':
      return `${a}の数だけ石を積む　完成で ${e.steps.map(([n, w]) => `${n}個以上+${w}`).join('／')}`;
    case 'scribe':
      return `${a}と${ATTR_ICON[e.also]}の子1人 +${e.per}`;
    case 'burial':
      return `グッズ持ちの子1人 +${e.per}`;
    case 'ostracism':
      return '投票1位のクラス 1人転校';
    case 'fireattack':
      return `${a}1位 vs 📚1位　+${e.win}／−${e.lose}`;
    case 'kongming':
      return `👑−${a} 1位に孔明が転入`;
    case 'bridge':
      return `代表の${a}${e.need}以上でポイント1位から${e.take}点奪う${e.lose ? `／未満 −${e.lose}` : ''}`;
    case 'oath':
      return 'ポイント最下位が義兄弟を選ぶ → 点を山分け';
    case 'tribute':
      return `${a}1位 +${e.win}`;
    case 'genji':
      return `${a}1位の子のクラス ${ATTR_ICON[e.also]}の子1人 +${e.per}`;
    case 'kaguya':
      return `頼まれた宝を差し出す +${e.win}`;
    case 'benkei':
      return `${a}${e.need}以上 弁慶が家来に${e.lose ? `／未満 −${e.lose}` : ''}`;
    case 'masterpiece':
      return `一番の子の${a} ×${e.per}`;
    case 'printing':
      return `${a}のない子 ${a}＋1`;
    case 'plague':
      return `1人 ${a}が数えられない`;
    case 'newworld':
      return `${a}の多い順に新大陸の品`;
    case 'gekokujo':
      return `${a}1位がポイント1位から${e.amount}点奪う`;
    case 'teppo':
      return `全クラスに鉄砲 ${ATTR_ICON[TEPPO_GOODS.attr]}＋1`;
    case 'rakuichi':
      return `${a}1位 次のグッズ0点`;
    case 'lottery':
      return `全員−${e.fee}　当たり総取り`;
    case 'prize':
      return `全校の${a}1位の子 +${e.win}`;
    case 'patent':
      return `${a}1位 授業1回につき${e.fee}点`;
    case 'expo':
      return e.steps.map(([n, w]) => `${n}種類+${w}`).join('／');
    case 'sunflower':
      return `一番の子の${a}×${e.per}（学期末）`;
    case 'alien':
      return '空席に火星人';
  }
}

export function fixedGlyph(f: FixedEvent): string {
  return f.rule === 'test' ? `📚 − 👊の子×${TEST_YANKEE_PENALTY}　順位` : 'アイコンの数　順位';
}

/** カードの一言説明（選んだとき・めくったときに出す）。式だけで足りるものは空 */
export function shortRule(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `${ATTR_ICON[c.attr]}の数だけ得点`;
    case 'kachikomi':
      return `相手に👊×${c.mult}のダメージ、👊×${c.drain}を吸い取る`;
    case 'swing':
      if (c.per) return `${ATTR_ICON[c.plus]}を持つ子1人につき+${c.per}`;
      return c.minus ? `${ATTR_ICON[c.plus]}で得点、${ATTR_ICON[c.minus]}で減点` : `${ATTR_ICON[c.plus]}の数だけ得点`;
    case 'contest':
      return eraEffectRule(c);
    case 'raid':
      return `👊の数から敵の強さ${c.threat}を引いた分だけ得点`;
    case 'goods':
      return '';
    case 'cyborg':
      return `${CYBORG_ATTRS.map((a) => ATTR_ICON[a]).join('')}のサイボーグに改造`;
    case 'push':
      return 'どのクラスも1人ずつ転校';
    case 'exchange':
      return '相手の子と1人交換';
  }
}

export function fixedShort(f: FixedEvent): string {
  return f.rule === 'test' ? `📚で順位（👊の子は−${TEST_YANKEE_PENALTY}）` : 'アイコンの総数で順位';
}
