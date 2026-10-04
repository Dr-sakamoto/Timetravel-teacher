import { ATTR_ICON, type Attr, type EraId, type Rarity } from '../types';
import { ERAS } from './eras';

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
  desc: string;
  count: number;
}

/**
 * 時代イベントの効果（どれも1文で言えるもの。数えるアイコンはカードの attr。その時代出身の生徒のアイコンは2倍、係ボーナスも乗る）
 * 点を数えるもの
 *   heads     … 「Xを持つ子1人につき +per」（その時代出身の子は2人分）
 *   threshold … 「Xが need 以上なら +win、足りないと −lose」
 *   battle    … 「Xの数で勝負：1位 +win、2位 +second、最下位 −lose、ほかは0」（同点は同じ順位）
 * その時代だけの仕組み（時代ごとに1枚。点の数え方ではなく、起こることそのものが違う）
 *   steal     … 白亜紀「Xが一番多いクラスが、一番少ないクラスから生徒を1人奪う」
 *   together  … エジプト「全クラスのXの合計が need×クラス数 以上なら全クラス +win（Xが一番少ないクラスだけ0）、届かなければ全クラス −lose」
 *   ostracism … ギリシャ「全校でアイコンが一番多い子が1人、追放される」
 *   upgrade   … 中国「各クラスのXが一番多い子が受験。need 以上なら合格して、Xが1つ増える」
 *   tribute   … 平安「Xが一番多いクラスに、ほかの全クラスが per 点ずつ贈る」
 *   duel      … 中世「各クラスのXが一番多い子どうしの一騎打ち：1位 +win、最下位の子は落馬して転校」
 *   hostage   … 戦国「各クラスの、係に就いていないXが一番多い子が、となりのクラスへ人質に出される」
 *   lottery   … 江戸「全クラスが fee 点ずつ出し、くじで当たった1クラスが総取り」
 *   prize     … 近代「全校でXが一番多い子が受賞し、その子のクラスに +win」
 *   alien     … 未来「点は動かない。空いている席があるクラス全部に、アイコンのないエイリアンが1人ずつ転入する」
 */
export type EraEffect =
  | { type: 'heads'; per: number }
  | { type: 'threshold'; need: number; win: number; lose: number }
  | { type: 'battle'; win: number; second: number; lose: number }
  | { type: 'steal' }
  | { type: 'together'; need: number; win: number; lose: number }
  | { type: 'ostracism' }
  | { type: 'upgrade'; need: number }
  | { type: 'tribute'; per: number }
  | { type: 'duel'; win: number }
  | { type: 'hostage' }
  | { type: 'lottery'; fee: number }
  | { type: 'prize'; win: number }
  | { type: 'alien' };

/** その時代出身の子のアイコンが2倍になる効果か（アイコンを数えないものは2倍にならない） */
export function eraDoubles(e: EraEffect): boolean {
  return e.type !== 'alien' && e.type !== 'ostracism' && e.type !== 'lottery';
}

/** 時代イベント（全クラス）：カードごとの効果。その時代出身の生徒のアイコンは2倍 */
export interface ContestCard {
  id: string;
  kind: 'contest';
  name: string;
  icon: string;
  /** 競うアイコン（'all' は全種類のアイコンの合計。優遇なしの現代用） */
  attr: Attr | 'all';
  era: EraId;
  effect: EraEffect;
  desc: string;
  count: number;
}

/** 襲来（時代イベント・全クラス）：クラスの👊の数 − 敵の強さ（その時代出身の生徒は2倍）。撃退すれば大きくプラス、守れなければ大きくマイナス */
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
/** 人物カードを取るのに払うクラスポイント（レア度ごと） */
/** 下位レアは安くすぐ元が取れ、SSRは長い試合でないと元が取れない（短期戦ならR、長期戦ならSSRが狙い目） */
export const PERSON_COST: Record<Rarity, number> = { N: 2, R: 4, SR: 12, SSR: 24 };
/** グッズ・サイボーグ化を取るのに払うクラスポイント */
export const GOODS_COST = 2;

/** 場から取れるカードのコスト（授業とクラス替えは無料） */
export function eventCost(c: EventCard): number {
  return c.kind === 'goods' || c.kind === 'cyborg' ? GOODS_COST : 0;
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

const W = (id: string, name: string, icon: string, plus: Attr, minus: Attr | undefined, desc: string): SwingCard => ({
  id, kind: 'swing', name, icon, plus, minus, desc, count: 1,
});
export const SWING_CARDS: SwingCard[] = [
  W('poptest', '抜き打ちテスト', '📝', 'study', undefined, '日ごろの勉強がものを言う。'),
  W('visit', '授業参観', '👀', 'charm', 'fight', '親の前でいいところを見せたい。'),
  W('marathon', '持久走大会', '🥵', 'sports', undefined, '全員が走る。足の速い子が多いクラスが有利。'),
  W('chorus', '合唱コンクール', '🎶', 'art', undefined, '全員で歌う。歌のうまい子が多いほど響く。'),
];

export const MOVE_CARDS: MoveCard[] = [
  { id: 'push', kind: 'push', name: '転校', icon: '📦', desc: '全クラス：係に就いていない生徒のうち、アイコンが一番少ない子が1人転校する（同じならレア度が低い子）', count: 1, odds: 2 / 3 },
  { id: 'exchange', kind: 'exchange', name: 'クラス替え', icon: '🔁', desc: '取った人：自分の生徒1人と、他のクラスの係に就いていない生徒1人を入れ替える（印刷されたアイコンの数が同じ子どうしだけ）', count: 1 },
];

const G = (id: string, name: string, icon: string, attr: Attr, era?: EraId): GoodsCard => ({ id, kind: 'goods', name, icon, attr, era, count: 1 });
/** グッズ：全時代共通3種＋時代ごとに2種（時代のグッズはその時代の優遇アイコン。歴史の時代は実在の品。未来の片方はサイボーグ化） */
export const GOODS_CARDS: GoodsCard[] = [
  G('g_book', '参考書', '📕', 'study'),
  G('g_shoes', 'スポーツシューズ', '👟', 'sports'),
  G('g_paint', '絵の具セット', '🖍️', 'art'),
  G('g_phone', 'スマホ', '📱', 'charm', 'present'),
  G('g_tablet', 'タブレット', '💻', 'study', 'present'),
  G('g_fang', 'ティラノサウルスの牙', '🦷', 'fight', 'cretaceous'),
  G('g_amber', '琥珀', '🟠', 'art', 'cretaceous'),
  G('g_mask', 'ツタンカーメンの黄金のマスク', '🎭', 'charm', 'egypt'),
  G('g_sandal', 'ツタンカーメンのサンダル', '🩴', 'sports', 'egypt'),
  G('g_olive', 'オリンピアのオリーブ冠', '🌿', 'sports', 'greece'),
  G('g_republic', 'プラトンの『国家』', '📜', 'study', 'greece'),
  G('g_sunzi', '『孫子』の兵法書', '🎋', 'study', 'china'),
  G('g_halberd', '青龍偃月刀', '🗡️', 'fight', 'china'),
  G('g_genjiemaki', '源氏物語絵巻', '🖼️', 'art', 'heian'),
  G('g_junihitoe', '十二単', '👘', 'charm', 'heian'),
  G('g_chisel', 'ミケランジェロのノミ', '🔨', 'art', 'europe'),
  G('g_templar', 'テンプル騎士団の盾', '🛡️', 'fight', 'europe'),
  G('g_tanegashima', '種子島（火縄銃）', '🔫', 'fight', 'sengoku'),
  G('g_hyotan', '秀吉の千成瓢箪', '🍶', 'charm', 'sengoku'),
  G('g_fugaku', '北斎の『富嶽三十六景』', '🗻', 'art', 'edo'),
  G('g_ryoteisha', '伊能忠敬の量程車', '🛞', 'sports', 'edo'),
  G('g_bulb', 'エジソンの電球', '💡', 'study', 'modern'),
  G('g_legion', 'レジオンドヌール勲章', '🎖️', 'charm', 'modern'),
  G('g_chip', '電脳チップ', '💾', 'study', 'future'),
];

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

const C = (id: string, name: string, icon: string, attr: Attr | 'all', effect: EraEffect, desc: string, era: EraId): ContestCard => ({
  id, kind: 'contest', name, icon, attr, effect, desc, era, count: 2,
});

/** 時代の固有イベントカード：その時代の学期だけ山札に混ざる。その時代の優遇アイコン（ERAS の favor）で競う。その時代出身の生徒はアイコン2倍 */
export const ERA_CARDS: ContestCard[] = [
  // 現代：優遇なし（生徒会長選挙は全アイコンで競う。文化祭は出し物なので🎨）。いつもの学校なので、特別な仕組みはない
  C('bunkasai', '文化祭', '🎪', 'art', { type: 'heads', per: 2 }, 'クラスの出し物。絵や音楽が得意な子が多いほど盛り上がる。', 'present'),
  C('seitokai', '生徒会長選挙', '🗳️', 'all', { type: 'battle', win: 15, second: 5, lose: 10 }, '一番頼れるクラスから会長が出る。', 'present'),
  // 白亜紀：👊のみ。弱肉強食（強い群れが弱い群れから奪う）
  C('nawabari', '縄張り争い', '🦴', 'fight', { type: 'steal' }, '強い群れが、一番弱い群れから仲間を奪っていく。', 'cretaceous'),
  C('trex_sumo', 'ティラノサウルスと力くらべ', '🦖', 'fight', { type: 'threshold', need: 6, win: 6, lose: 3 }, '力を合わせて押し返せ。力が足りないと踏みつぶされる。', 'cretaceous'),
  // 古代エジプト：🏃👑。全クラスで1つのピラミッドを積む（サボったクラスは分け前なし）
  C('giza', 'ギザの大ピラミッド建設', '🔺', 'sports', { type: 'together', need: 6, win: 6, lose: 3 }, '全クラス総出で石を積む。完成すれば全員にほうび、サボったクラスは分け前なし。', 'egypt'),
  C('ramesses', 'ラムセス2世への謁見', '🤴', 'charm', { type: 'heads', per: 2 }, 'ファラオに気に入られる子が多いほど、クラスの株が上がる。', 'egypt'),
  // ギリシャ・ローマ：🏃📚。目立ちすぎた子は陶片追放
  C('olympia', '古代オリンピック', '🏛️', 'sports', { type: 'battle', win: 15, second: 5, lose: 10 }, 'オリーブ冠を手にするのは、一番速いクラスだけ。', 'greece'),
  C('ostracism', '陶片追放', '🏺', 'all', { type: 'ostracism' }, '陶器のかけらに名前を書いて投票。力を持ちすぎた者はアテネから追い出される。', 'greece'),
  // 古代中国：📚👊。科挙に受かった子はずっと強くなる
  C('keju', '科挙', '📜', 'study', { type: 'upgrade', need: 3 }, '超難関の官僚登用試験。合格すれば一生の箔がつく。', 'china'),
  C('chibi', '赤壁の戦い', '⛵', 'fight', { type: 'battle', win: 15, second: 5, lose: 10 }, '曹操の大船団に挑む。勝てば大手柄、負ければ火計で焼かれる。', 'china'),
  // 平安：🎨👑。権力者のもとに、ほかのクラスから贈り物が集まる
  C('tentoku', '天徳内裏歌合', '🌸', 'art', { type: 'battle', win: 15, second: 5, lose: 10 }, '村上天皇の御前で和歌の勝負。勝ち負けがはっきりつく。', 'heian'),
  C('michinaga', '藤原道長の宴', '🌕', 'charm', { type: 'tribute', per: 3 }, '「この世をば…」。道長に一番気に入られたクラスへ、ほかのクラスから贈り物が届く。', 'heian'),
  // 中世・ルネサンス：🎨👊。代表1人どうしの一騎打ち
  C('medici', 'メディチ家のパトロン選び', '💰', 'art', { type: 'battle', win: 15, second: 5, lose: 10 }, 'フィレンツェの大富豪が援助するのは一番のクラスだけ。', 'europe'),
  C('joust', '馬上槍試合', '🏇', 'fight', { type: 'duel', win: 10 }, '各クラスの一番の騎士が一騎打ち。負けた騎士は落馬して去っていく。', 'europe'),
  // 戦国：👊👑。慕われている子ほど人質に取られる
  C('sekigahara', '関ヶ原の戦い', '⚔️', 'fight', { type: 'battle', win: 15, second: 5, lose: 10 }, '天下分け目の大合戦。勝てば大出世、負ければ大損。', 'sengoku'),
  C('hitojichi', '人質', '🏯', 'charm', { type: 'hostage' }, '同盟の証に、一番慕われている子をとなりのクラスへ差し出す。', 'sengoku'),
  // 江戸・幕末：🎨🏃。運だけの富くじ
  C('tomikuji', '富くじ', '🎫', 'all', { type: 'lottery', fee: 3 }, '江戸の町じゅうが熱狂した宝くじ。当たれば総取り。', 'edo'),
  C('ino', '伊能忠敬の日本地図測量', '🗾', 'sports', { type: 'heads', per: 2 }, '日本中を歩いて測る。歩ける子が多いほど地図が早くできる。', 'edo'),
  // 近代：📚👑。クラスではなく、たった1人の天才が賞を取る
  C('nobel', 'ノーベル賞', '🏅', 'study', { type: 'prize', win: 12 }, '受賞するのは全校でたった1人。その子のクラスが名誉を手にする。', 'modern'),
  C('rokumeikan', '鹿鳴館の舞踏会', '💃', 'charm', { type: 'heads', per: 2 }, '文明開化の社交界。踊りに誘われる子が多いほど評判が上がる。', 'modern'),
  // 未来：📚のみ
  C('robocon', 'ロボコン2300', '🤖', 'study', { type: 'threshold', need: 8, win: 10, lose: 4 }, 'ロボットを作って出場。頭脳が足りないと動かない。', 'future'),
  C('martian', '火星人の侵略', '👽', 'study', { type: 'alien' }, '空いている席に、何もできない火星人が勝手に座る。', 'future'),
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
      if (!c.minus) return `全クラス：${ATTR_ICON[c.plus]}の数だけ得点`;
      return `全クラス：${ATTR_ICON[c.plus]}の数だけ得点、${ATTR_ICON[c.minus]}の数だけ減点`;
    case 'contest':
      return eraDoubles(c.effect) ? `全クラス：${eraEffectRule(c)}（この時代の生徒は2倍）` : `全クラス：${eraEffectRule(c)}`;
    case 'raid':
      return `全クラス：クラスの👊の数 − ${c.threat}（この時代の生徒は2倍）`;
    case 'goods':
      return `生徒1人に装備：${ATTR_ICON[c.attr]}＋1（1人1つまで）`;
    case 'cyborg':
      return `自分のクラスの生徒1人を、${CYBORG_ATTRS.map((a) => ATTR_ICON[a]).join('')}のサイボーグに作り替える（元のカードは消える）`;
    default:
      return c.desc;
  }
}

/** 時代イベントの効果の説明文（1文） */
export function eraEffectRule(c: ContestCard): string {
  const a = c.attr === 'all' ? 'アイコン' : ATTR_ICON[c.attr];
  const e = c.effect;
  switch (e.type) {
    case 'heads':
      return `${a}を持つ子1人につき+${e.per}`;
    case 'threshold':
      return `${a}が${e.need}以上なら+${e.win}、足りないと−${e.lose}`;
    case 'battle':
      return `${a}の数で勝負：1位+${e.win}、2位+${e.second}、最下位−${e.lose}`;
    case 'steal':
      return `${a}が一番多いクラスが、一番少ないクラスから生徒を1人奪う`;
    case 'together':
      return `全クラスの${a}の合計が${e.need}×クラス数以上なら全クラス+${e.win}（${a}が一番少ないクラスは0）、届かなければ全クラス−${e.lose}`;
    case 'ostracism':
      return '全校でアイコンが一番多い子が1人、追放される';
    case 'upgrade':
      return `各クラスの${a}が一番多い子が受験：${a}${e.need}以上で合格し、${a}が1つ増える`;
    case 'tribute':
      return `${a}が一番多いクラスに、ほかの全クラスが${e.per}点ずつ贈る`;
    case 'duel':
      return `各クラスの${a}が一番多い子が一騎打ち：1位+${e.win}、最下位の子は落馬して転校`;
    case 'hostage':
      return `各クラスの、係に就いていない${a}が一番多い子が、となりのクラスへ移る`;
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
  const a = c.attr === 'all' ? 'アイコン' : ATTR_ICON[c.attr];
  const e = c.effect;
  switch (e.type) {
    case 'heads':
      return `🧑${a} → +${e.per}ずつ`;
    case 'threshold':
      return `${a}${e.need}↑ +${e.win}／−${e.lose}`;
    case 'battle':
      return `${a}で勝負 🥇+${e.win} 🥈+${e.second} 最下位−${e.lose}`;
    case 'steal':
      return `${a}🥇 ⟵🧑 ${a}最下位`;
    case 'together':
      return `みんなの${a} ${e.need}×クラス数↑ +${e.win}／−${e.lose}`;
    case 'ostracism':
      return '全校のアイコン🥇の子 → 👋';
    case 'upgrade':
      return `🧑${a}${e.need}↑ → ${a}＋1`;
    case 'tribute':
      return `${a}🥇 ⟵ ${e.per}点ずつ`;
    case 'duel':
      return `🧑${a} 一騎打ち 🥇+${e.win} 最下位👋`;
    case 'hostage':
      return `🧑${a} → となりのクラス`;
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
      return c.minus ? `${ATTR_ICON[c.plus]}で得点、${ATTR_ICON[c.minus]}で減点` : `${ATTR_ICON[c.plus]}の数だけ得点`;
    case 'contest':
      return eraDoubles(c.effect) ? `${eraEffectRule(c)}（${ERAS.find((x) => x.id === c.era)!.icon}の子×2）` : eraEffectRule(c);
    case 'raid':
      return `👊の数から敵の強さ${c.threat}を引いた分だけ得点（${ERAS.find((x) => x.id === c.era)!.icon}の子×2）`;
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
