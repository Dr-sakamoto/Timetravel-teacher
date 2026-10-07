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

/** カチコミ：場から取った人が他のクラスを1つ選び、自分のクラスの👊の数 × mult だけそのクラスを減点させる */
export interface KachikomiCard {
  id: string;
  kind: 'kachikomi';
  name: string;
  icon: string;
  /** 減点の倍率 */
  mult: number;
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
 *   upgrade   … 中国「各クラスのXが一番多い子が受験。need 以上なら合格して、Xが1つ増える」
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
  | { type: 'upgrade'; need: number }
  | { type: 'tribute'; per: number }
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
  | { type: 'alien' };

/** カードに載るアイコンの上限（科挙・生徒会長選挙・シンギュラリティ・活版印刷で増えるのもここまで。グッズの＋1は別） */
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

export const KACHIKOMI_CARDS: KachikomiCard[] = [{ id: 'kachikomi', kind: 'kachikomi', name: 'カチコミ', icon: '👊', mult: 3, count: 3 }];

const W = (id: string, name: string, icon: string, plus: Attr, minus: Attr | undefined, desc: string, per?: number): SwingCard => ({
  id, kind: 'swing', name, icon, plus, minus, desc, per, count: 1,
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
/** グッズ：全時代共通3種＋時代ごとに2種（時代のグッズはその時代の優遇アイコン。歴史の時代は実在の品。未来の片方はサイボーグ化）。平安だけは竹取物語の5つの宝（かぐや姫の難題） */
export const GOODS_CARDS: GoodsCard[] = [
  G('g_book', '参考書', '📕', 'study'),
  G('g_shoes', 'スポーツシューズ', '👟', 'sports'),
  G('g_paint', '絵の具セット', '🖍️', 'art'),
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
  G('g_legion', 'レジオンドヌール勲章', '🎖️', 'charm', 'modern'),
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
  C('trex_hunt', 'ティラノサウルスの狩り', '🦖', 'fight', { type: 'plunder', amount: 8 }, '強い者が、一番弱い者を狩っていく。', 'cretaceous', 1),
  C('migration', '大移動', '🦕', 'fight', { type: 'threshold', need: 6, win: 6, lose: 3 }, 'パラサウロロフスの群れが大地を渡る。群れを守り切れるか。', 'cretaceous', 1),
  C('egg_theft', 'オヴィラプトルの卵泥棒', '🥚', 'sports', { type: 'egg' }, '一番すばしこいクラスが、恐竜の卵をこっそり持ち帰る。何が孵るかはお楽しみ。', 'cretaceous', 1),
  // 古代エジプト：🏃👑。ピラミッドは場の横に残り、みんなで少しずつ積む。ナイルの氾濫のあとは大豊作。書記はえらい役人、ミイラの副葬品は王や貴族のもの
  C('giza', 'ギザの大ピラミッド建設', '🔺', 'sports', { type: 'pyramid', need: 7, steps: [[7, 20], [14, 30]] }, '学期のあいだ、みんなで少しずつ石を積む。働く人はパンとビールを給料にもらっていた。完成すれば、たくさん積んだクラスほど大きなほうび。学期が終わるまでに完成しなければ、積んだ石はむだになる。', 'egypt', 1),
  C('nile', 'ナイルの氾濫', '🌊', 'sports', { type: 'heads', per: 2 }, '毎年夏、ナイル川があふれて畑に黒い土を運ぶ。水が引いたら大豊作。畑で働く子が多いほど、たくさんとれる。', 'egypt', 1),
  C('hieroglyph', 'ヒエログリフ', '👁️', 'charm', { type: 'scribe', also: 'study', per: 3 }, '絵のような文字で、石や紙（パピルス）に書き残す。読み書きができる書記は、王に仕えるえらい役人だった。', 'egypt', 1),
  C('mummy', 'ミイラづくり', '⚱️', 'charm', { type: 'burial', per: 4 }, '70日かけてミイラをつくり、あの世で使う宝物（副葬品）といっしょにお墓に納める。りっぱなお墓に宝物を入れてもらえたのは、王や貴族だけ。', 'egypt', 1),
  // ギリシャ・ローマ：🏃📚。オリンピックは負けても減点なし、剣闘は負けると減点。陶片追放は秘密投票で1クラスだけ転校
  C('olympia', '古代オリンピック', '🏛️', 'sports', { type: 'battle', win: 12, second: 5, lose: 0 }, 'オリーブ冠を手にするのは、一番速いクラスだけ。参加することに意義がある。', 'greece', 1),
  C('colosseum', 'コロッセオの剣闘', '⚔️', 'sports', { type: 'arena', also: 'fight', win: 12, lose: 4 }, '各クラスの一番の剣闘士が闘技場へ。勝てば喝采、負ければ大恥。', 'greece', 1),
  C('socratic', 'ソクラテスの問答', '🧔', 'study', { type: 'dialogue', need: 4, win: 8, lose: 3 }, '「きみは何を知っている？」 クラスの代表がソクラテスと対話する。答えに詰まれば論破される。', 'greece', 1),
  C('ostracism', '陶片追放', '🏺', 'all', { type: 'ostracism' }, '陶器のかけらに名前を書いて、こっそり投票。票が一番集まったクラスから、1人がアテネを去る。', 'greece', 1),
  // 古代中国：📚👊。科挙に受かった子はずっと強くなる
  C('keju', '科挙', '📜', 'study', { type: 'upgrade', need: 3 }, '超難関の官僚登用試験。合格すれば一生の箔がつく。', 'china'),
  C('chibi', '赤壁の戦い', '⛵', 'fight', { type: 'battle', win: 15, second: 5, lose: 10 }, '曹操の大船団に挑む。勝てば大手柄、負ければ火計で焼かれる。', 'china'),
  // 平安：🎨👑。物語を書く子と読む貴族、権力者への贈り物、かぐや姫の難題、五条大橋の弁慶（👊だけはこの1枚）
  C('genji', '源氏物語', '📖', 'art', { type: 'genji', also: 'charm', per: 3 }, '紫式部が書いた光源氏の物語。宮中の貴族たちが続きを楽しみに回し読みした。', 'heian', 1),
  C('mochizuki', '藤原道長の望月の歌', '🌕', 'charm', { type: 'tribute', per: 3 }, '「この世をば わが世とぞ思ふ 望月の 欠けたることも なしと思へば」。道長に一番気に入られたクラスへ、ほかのクラスから贈り物が届く。', 'heian', 1),
  C('kaguya', '竹取物語・かぐや姫の難題', '🌙', 'all', { type: 'kaguya', win: 5 }, 'かぐや姫が学校にやってきて「この宝を持ってきてください」。持ってこられなければ、学期の終わりに月へ帰ってしまう。', 'heian', 1),
  C('gojo', '五条大橋の弁慶', '🌉', 'fight', { type: 'benkei', need: 3, lose: 2 }, '京の五条大橋で、弁慶が通る人の刀を奪っている。力を合わせて倒せば、弁慶が家来になる。', 'heian', 1),
  // 中世・ルネサンス：🎨📚。ペストにかかった子は走れなくなり、新大陸の品は早い者勝ち
  C('monalisa', 'モナ・リザ制作', '🖼️', 'art', { type: 'masterpiece', per: 3 }, '何年もかけて仕上げられた、謎の微笑み。名画を生むのはクラス一番の描き手の腕前。', 'europe', 1),
  C('printing', '活版印刷', '📘', 'study', { type: 'printing' }, 'グーテンベルクの印刷機で、本が安く刷れるようになった。本を読んだことのない子も、みんな学び始める。', 'europe', 1),
  C('plague', 'ペストの大流行', '🐀', 'sports', { type: 'plague' }, 'ネズミが運ぶ黒い病がヨーロッパ中に広がった。かかった子は学期が終わるまで寝込んで走れない。', 'europe', 1),
  C('columbus', 'コロンブスの新大陸到達', '🌎', 'study', { type: 'newworld' }, '1492年、大西洋の向こうに新しい大陸が見つかった。見たこともない品が、物知りのクラスから順に届く。', 'europe', 1),
  // 戦国：👑👊。合戦は👑と👊を合わせて数える。鉄砲はどのクラスにも届き、楽市楽座では人望のあるクラスにグッズがタダで届く
  { ...C('okehazama', '桶狭間の戦い', '🌧️', 'charm', { type: 'gekokujo', amount: 8 }, '大雨の中の奇襲。勢いに乗ったクラスが、天下に一番近い大大名・今川義元の本陣を討つ。', 'sengoku', 1), also: 'fight' },
  { ...C('sekigahara', '関ヶ原の戦い', '⚔️', 'charm', { type: 'battle', win: 15, second: 5, lose: 10 }, '天下分け目の大合戦。味方を集めた人望と腕っぷしで、東軍と西軍がぶつかる。', 'sengoku', 1), also: 'fight' },
  C('teppo', '鉄砲伝来', '🔫', 'fight', { type: 'teppo' }, '1543年、種子島に流れ着いたポルトガル人が鉄砲を伝えた。どのクラスにも1丁ずつ届く。', 'sengoku', 1),
  C('rakuichi', '楽市楽座', '🪙', 'charm', { type: 'rakuichi' }, '城下町で誰でも自由に商売ができるようになった。人望を集めたクラスには、商人が品をタダで持ってくる。', 'sengoku', 1),
  // 江戸・幕末：🎨🏃。運だけの富くじ
  C('tomikuji', '富くじ', '🎫', 'all', { type: 'lottery', fee: 3 }, '江戸の町じゅうが熱狂した宝くじ。当たれば総取り。', 'edo'),
  C('ino', '伊能忠敬の日本地図測量', '🗾', 'sports', { type: 'heads', per: 2 }, '日本中を歩いて測る。歩ける子が多いほど地図が早くできる。', 'edo'),
  // 近代：📚👑。クラスではなく、たった1人の天才が賞を取る
  C('nobel', 'ノーベル賞', '🏅', 'study', { type: 'prize', win: 12 }, '受賞するのは全校でたった1人。その子のクラスが名誉を手にする。', 'modern'),
  C('rokumeikan', '鹿鳴館の舞踏会', '💃', 'charm', { type: 'heads', per: 2 }, '文明開化の社交界。踊りに誘われる子が多いほど評判が上がる。', 'modern'),
  // 未来：📚。ロボコンとシンギュラリティが📚の枠
  C('robocon', 'ロボコン2300', '🤖', 'study', { type: 'threshold', need: 8, win: 10, lose: 4 }, 'ロボットを作って出場。頭脳が足りないと動かない。', 'future', 1),
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
      return `取った人：他のクラスを1つ選び、自分のクラスの👊の数×${c.mult}だけ減点させる`;
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
      return `機械の子（機械の人物・サイボーグ・📱💻💾を装備した子）は${a}が1つ増える`;
    case 'timemachine':
      return 'ポイントが一番少ないクラスに、どこかの時代の人物が1人、無料で転入する';
    case 'threshold':
      return `${a}が${e.need}以上なら+${e.win}、足りないと−${e.lose}`;
    case 'battle':
      return `${a}の数で勝負：1位+${e.win}、2位+${e.second}${e.lose ? `、最下位−${e.lose}` : '（負けても減点なし）'}`;
    case 'arena':
      return `各クラスの${a}${ATTR_ICON[e.also]}の合計が一番多い子が戦う：1位+${e.win}、負けたクラスは−${e.lose}`;
    case 'dialogue':
      return `各クラスの${a}が一番多い子が代表でソクラテスと対話：${a}${e.need}以上なら+${e.win}、足りないと論破されて−${e.lose}`;
    case 'plunder':
      return `${a}が一番多いクラスが、一番少ないクラスから${e.amount}点奪う`;
    case 'pyramid':
      return `手番で選ぶと、クラスの${a}の数だけ石を積む（その手番は点なし）。全クラスで${e.need}×クラス数に届いたら完成：積んだ石が${e.steps.map(([n, w]) => `${n}個以上で+${w}`).join('、')}。学期中に完成しなければむだ`;
    case 'scribe':
      return `${a}と${ATTR_ICON[e.also]}を両方持つ子（書記）1人につき+${e.per}`;
    case 'burial':
      return `${c.attr === 'all' ? '' : `${a}を持っていて、`}グッズを装備している子1人につき+${e.per}`;
    case 'ostracism':
      return '全クラスがほかのクラスに秘密で投票し、票が一番多いクラスが1人転校させる';
    case 'upgrade':
      return `各クラスの${a}が一番多い子が受験：${a}${e.need}以上で合格し、${a}が1つ増える`;
    case 'tribute':
      return `${a}が一番多いクラスに、ほかの全クラスが${e.per}点ずつ贈る`;
    case 'genji':
      return `全校で${a}が一番多い子が作者に：作者のクラスで${ATTR_ICON[e.also]}を持つ子1人につき+${e.per}`;
    case 'kaguya':
      return `かぐや姫が学期の終わりまで滞在し、宝（${KAGUYA_TREASURES.map((t) => t.icon).join('')}）をクラスごとに1つずつ頼む：頼まれた宝を装備していれば、手番で差し出して+${e.win}（宝は消える）`;
    case 'benkei':
      return `${a}の合計が${e.need}以上のクラスが弁慶を倒し、一番多いクラスに弁慶（${a}${a}${a}）が転入。届かないクラスは−${e.lose}`;
    case 'masterpiece':
      return `各クラスの${a}が一番多い子1人の、${a}の数×${e.per}`;
    case 'printing':
      return `${a}を持っていない子全員の${a}が1つ増える`;
    case 'plague':
      return `各クラスの係でない子1人（ランダム）がペストにかかり、学期の区切りまで${a}を数えない`;
    case 'newworld':
      return `${a}の多いクラスから順に新大陸の品（${NEW_WORLD_GOODS.map((g) => g.icon + ATTR_ICON[g.attr]).join('')}）を1つ選び、グッズを持っていない子1人に装備（早い者勝ち）`;
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
 * カードの効果を絵文字の式で（文章を読まなくても分かるように）。
 * 例：授業「👑 → +」、共通イベント「🏃 − 👥」、時代イベント「🥇👊×2」、襲来「👊 − 8」
 */
export function cardGlyph(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `${ATTR_ICON[c.attr]} → +`;
    case 'kachikomi':
      return `👊×${c.mult} → 😵`;
    case 'swing':
      if (c.per) return `🧑${ATTR_ICON[c.plus]} → +${c.per}ずつ`;
      return c.minus ? `+${ATTR_ICON[c.plus]}　−${ATTR_ICON[c.minus]}` : `${ATTR_ICON[c.plus]} → +`;
    case 'contest':
      return contestGlyph(c);
    case 'raid':
      return `👊 − ${c.threat}`;
    case 'goods':
      return `装備 ${ATTR_ICON[c.attr]}＋1`;
    case 'cyborg':
      return '🧑 → 🦾';
    case 'push':
      return '👥 → 👋🧑';
    case 'exchange':
      return '🧑 ⇄ 🧑';
  }
}

function contestGlyph(c: ContestCard): string {
  const a = attrLabel(c);
  const e = c.effect;
  switch (e.type) {
    case 'heads':
      return `🧑${a} → +${e.per}ずつ`;
    case 'disaster':
      return `全員−${e.lose}　🧑${a} → +${e.per}ずつ`;
    case 'egg':
      return `${a}🥇 ⟵ 🥚 → 🦖`;
    case 'tiers':
      return e.steps.map(([n, w]) => `${n}↑+${w}`).join('／');
    case 'elect':
      return `全校の🧑${a}🥇 → ${a}＋1`;
    case 'machine':
      return `🤖🦾📱 → ${a}＋1`;
    case 'timemachine':
      return 'ポイント最下位 ⟵ ⏳🧑';
    case 'threshold':
      return `${a}${e.need}↑ +${e.win}／−${e.lose}`;
    case 'battle':
      return `${a}で勝負 🥇+${e.win} 🥈+${e.second}${e.lose ? ` 最下位−${e.lose}` : ''}`;
    case 'arena':
      return `🧑${a}${ATTR_ICON[e.also]} 剣闘 🥇+${e.win} 負け−${e.lose}`;
    case 'dialogue':
      return `🧑${a}🥇 vs 🧔${e.need}　+${e.win}／−${e.lose}`;
    case 'plunder':
      return `${a}🥇 ⟵${e.amount}点 ${a}最下位`;
    case 'pyramid':
      return `${a} → 🧱 → 🔺完成で ${e.steps.map(([n, w]) => `🧱${n}↑+${w}`).join('／')}`;
    case 'scribe':
      return `🧑${a}${ATTR_ICON[e.also]} → +${e.per}ずつ`;
    case 'burial':
      return `🧑${c.attr === 'all' ? '' : a}💍 → +${e.per}ずつ`;
    case 'ostracism':
      return '🗳️ 票🥇のクラス → 👋🧑';
    case 'upgrade':
      return `🧑${a}${e.need}↑ → ${a}＋1`;
    case 'tribute':
      return `${a}🥇 ⟵ ${e.per}点ずつ`;
    case 'genji':
      return `🧑${a}🥇 → 🧑${ATTR_ICON[e.also]}×${e.per}`;
    case 'kaguya':
      return `🌙 ⟵ ${KAGUYA_TREASURES.map((t) => t.icon).join('')}？ → +${e.win}`;
    case 'benkei':
      return `${a}${e.need}↑ → 🪓🧑　届かず−${e.lose}`;
    case 'masterpiece':
      return `🧑${a}🥇 → ${a}×${e.per}`;
    case 'printing':
      return `📖 → ${a}なしの🧑全員 ${a}＋1`;
    case 'plague':
      return `🐀 → 🧑 ${a}✖️`;
    case 'newworld':
      return `${a}🥇から → ${NEW_WORLD_GOODS.map((g) => g.icon).join('')}`;
    case 'gekokujo':
      return `${a}🥇 ⟵${e.amount}点 ポイント🥇`;
    case 'teppo':
      return `全クラス ⟵ ${TEPPO_GOODS.icon}${ATTR_ICON[TEPPO_GOODS.attr]}＋1`;
    case 'rakuichi':
      return `${a}🥇 → 次のグッズ0点`;
    case 'lottery':
      return `全員−${e.fee} → 🎫当たり総取り`;
    case 'prize':
      return `全校の🧑${a}🥇 → +${e.win}`;
    case 'alien':
      return '🪑 → 👽';
  }
}

export function fixedGlyph(f: FixedEvent): string {
  return f.rule === 'test' ? `📚 − 👊🧑×${TEST_YANKEE_PENALTY}　🥇🥈🥉` : 'アイコンの数　🥇🥈🥉';
}

/** カードの一言説明（選んだとき・めくったときに出す）。式だけで足りるものは空 */
export function shortRule(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `${ATTR_ICON[c.attr]}の数だけ得点`;
    case 'kachikomi':
      return `相手に👊×${c.mult}のダメージ`;
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
