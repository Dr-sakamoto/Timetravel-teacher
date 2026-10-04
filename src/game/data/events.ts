import { ATTR_ICON, type Attr, type EraId, type Rarity } from '../types';

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

/** 共通イベント（全クラス）：「プラスのアイコン − マイナスのアイコン（または人数）」が入る。クラスの状況でプラスにもマイナスにもなる */
export interface SwingCard {
  id: string;
  kind: 'swing';
  name: string;
  icon: string;
  plus: Attr;
  /** 引かれるアイコン（または人数）。なければプラスだけ */
  minus?: Attr | 'heads';
  desc: string;
  count: number;
}

/**
 * 時代イベントの効果（数えるアイコンはカードの attr。その時代出身の生徒のアイコンはどれも2倍、係ボーナスも乗る）
 *   sum       … クラスのアイコンの合計 × mult
 *   top       … アイコンの合計が一番多いクラスだけ、合計 × mult（同点ならどちらも）
 *   ace       … どのクラスも、クラスで一番アイコンの多い1人（代表）の数 × mult
 *   champion  … 全クラスで一番アイコンの多い1人がいるクラスだけ、その子の数 × mult（同点ならどちらも）
 *   heads     … そのアイコンを持つ子1人につき per 点（その時代出身の子は2人分）
 *   threshold … アイコンの合計が need 以上なら +win、届かなければ −lose
 *   battle    … アイコンの合計が1位のクラスに +win、最下位のクラスに −lose
 *   minus     … アイコンの合計 − 引くアイコンの合計（'without' はそのアイコンを持たない子の人数）
 *   variety   … クラスにそろっているアイコンの種類数 × per
 *   alien     … 点は動かない。空いている席があるクラス全部に、アイコンのないエイリアンが1人ずつ転入する
 */
export type EraEffect =
  | { type: 'sum'; mult: number }
  | { type: 'top'; mult: number }
  | { type: 'ace'; mult: number }
  | { type: 'champion'; mult: number }
  | { type: 'heads'; per: number }
  | { type: 'threshold'; need: number; win: number; lose: number }
  | { type: 'battle'; win: number; lose: number }
  | { type: 'minus'; minus: Attr | 'without' }
  | { type: 'variety'; per: number }
  | { type: 'alien' };

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

const W = (id: string, name: string, icon: string, plus: Attr, minus: Attr | 'heads' | undefined, desc: string): SwingCard => ({
  id, kind: 'swing', name, icon, plus, minus, desc, count: 1,
});
export const SWING_CARDS: SwingCard[] = [
  W('poptest', '抜き打ちテスト', '📝', 'study', undefined, '日ごろの勉強がものを言う。'),
  W('visit', '授業参観', '👀', 'charm', 'fight', '親の前でいいところを見せたい。'),
  W('marathon', '持久走大会', '🥵', 'sports', 'heads', '全員が走る。走れない子は足を引っぱる。'),
  W('chorus', '合唱練習', '🎶', 'art', 'heads', '全員で歌う。音痴が混ざると台なし。'),
];

export const MOVE_CARDS: MoveCard[] = [
  { id: 'push', kind: 'push', name: '転校', icon: '📦', desc: '全クラス：係に就いていない生徒を1人、必ず転校させる（クラスから外す）', count: 2 },
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
  // 現代：優遇なし（全アイコンで競う）
  C('bunkasai', '文化祭', '🎪', 'all', { type: 'variety', per: 2 }, 'クラスの出し物。いろんな得意がそろうほど盛り上がる。', 'present'),
  C('seitokai', '生徒会長選挙', '🗳️', 'all', { type: 'champion', mult: 2 }, '全校で一番の万能な子が会長に。そのクラスだけが鼻が高い。', 'present'),
  // 白亜紀：👊のみ
  C('nawabari', '縄張り争い', '🦴', 'fight', { type: 'top', mult: 2 }, '一番強い群れが縄張りを総取り。2番手以下は何も得られない。', 'cretaceous'),
  C('trex_sumo', 'ティラノサウルスと力くらべ', '🦖', 'fight', { type: 'ace', mult: 2 }, 'どのクラスも代表1人が、ティラノサウルスと押しあう。', 'cretaceous'),
  // 古代エジプト：🏃👑
  C('giza', 'ギザの大ピラミッド建設', '🔺', 'sports', { type: 'threshold', need: 8, win: 8, lose: 3 }, '巨大な石を運んで積み上げろ。期日までに完成しなければ罰。', 'egypt'),
  C('ramesses', 'ラムセス2世への謁見', '🤴', 'charm', { type: 'champion', mult: 3 }, 'ファラオのお気に入りになれるのは、一番人望のある1人だけ。', 'egypt'),
  // ギリシャ・ローマ：🏃📚
  C('olympia', '古代オリンピック', '🏛️', 'sports', { type: 'champion', mult: 3 }, 'オリーブ冠をもらえるのは優勝者1人だけ。その子のクラスに栄光。', 'greece'),
  C('socrates_q', 'ソクラテスの問答', '🧔', 'study', { type: 'minus', minus: 'without' }, 'アテネの広場で問い詰められる。答えられない子は恥をかく。', 'greece'),
  // 古代中国：📚👊
  C('keju', '科挙', '📜', 'study', { type: 'threshold', need: 8, win: 8, lose: 3 }, '超難関の官僚登用試験。合格ラインに届かなければ不名誉。', 'china'),
  C('chibi', '赤壁の戦い', '⛵', 'fight', { type: 'battle', win: 8, lose: 4 }, '曹操の大船団に挑む。勝てば大手柄、負ければ火計で焼かれる。', 'china'),
  // 平安：🎨👑
  C('tentoku', '天徳内裏歌合', '🌸', 'art', { type: 'battle', win: 6, lose: 3 }, '村上天皇の御前で和歌の勝負。勝ち負けがはっきりつく。', 'heian'),
  C('michinaga', '藤原道長の宴', '🌕', 'charm', { type: 'heads', per: 2 }, '「この世をば…」。招かれるほど人望のある子が多いクラスが得をする。', 'heian'),
  // 中世・ルネサンス：🎨👊
  C('medici', 'メディチ家のパトロン選び', '💰', 'art', { type: 'top', mult: 2 }, 'フィレンツェの大富豪が援助するのは一番のクラスだけ。', 'europe'),
  C('joust', '馬上槍試合', '🏇', 'fight', { type: 'ace', mult: 2 }, 'どのクラスも代表の騎士1人が一騎打ちに出る。', 'europe'),
  // 戦国：👊👑
  C('sekigahara', '関ヶ原の戦い', '⚔️', 'fight', { type: 'battle', win: 10, lose: 5 }, '天下分け目の大合戦。勝てば大出世、負ければ大損。', 'sengoku'),
  C('rakuichi', '楽市・楽座', '🏮', 'charm', { type: 'sum', mult: 1 }, '信長の城下町。人望のある子がいるほど商人が集まる。', 'sengoku'),
  // 江戸・幕末：🎨🏃
  C('nakamuraza', '中村座の歌舞伎興行', '🎭', 'art', { type: 'minus', minus: 'without' }, '江戸三座の大舞台。演技のできない子は大根役者として足を引っぱる。', 'edo'),
  C('ino', '伊能忠敬の日本地図測量', '🗾', 'sports', { type: 'heads', per: 2 }, '日本中を歩いて測る。歩ける子が多いほど地図が早くできる。', 'edo'),
  // 近代：📚👑
  C('nobel', 'ノーベル賞', '🏅', 'study', { type: 'champion', mult: 3 }, '受賞できるのは世界で一番の頭脳1人だけ。そのクラスに栄誉。', 'modern'),
  C('rokumeikan', '鹿鳴館の舞踏会', '💃', 'charm', { type: 'heads', per: 2 }, '文明開化の社交界。踊りに誘われる子が多いほど評判が上がる。', 'modern'),
  // 未来：📚のみ
  C('robocon', 'ロボコン2300', '🤖', 'study', { type: 'ace', mult: 3 }, 'どのクラスも、一番の天才が作ったロボットで勝負。', 'future'),
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
      if (!c.minus) return `全クラス：クラス全員の${ATTR_ICON[c.plus]}の数を加点`;
      return `全クラス：${ATTR_ICON[c.plus]}の数 − ${c.minus === 'heads' ? 'クラスの人数' : `${ATTR_ICON[c.minus]}の数`}（マイナスもある）`;
    case 'contest':
      return c.effect.type === 'alien' || c.effect.type === 'variety' ? `全クラス：${eraEffectRule(c)}` : `全クラス：${eraEffectRule(c)}（この時代の生徒は2倍）`;
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

/** 時代イベントの効果の説明文 */
export function eraEffectRule(c: ContestCard): string {
  const a = c.attr === 'all' ? '全アイコン' : ATTR_ICON[c.attr];
  const e = c.effect;
  switch (e.type) {
    case 'sum':
      return `クラス全員の${a}の数${e.mult !== 1 ? `×${e.mult}` : ''}を加点`;
    case 'top':
      return `${a}の数が一番多いクラスだけ、その数×${e.mult}を加点`;
    case 'ace':
      return `どのクラスも、${a}が一番多い代表1人の${a}の数×${e.mult}を加点`;
    case 'champion':
      return `全クラスで${a}が一番多い1人のクラスだけ、その子の${a}の数×${e.mult}を加点`;
    case 'heads':
      return `${a}を持つ子1人につき+${e.per}`;
    case 'threshold':
      return `${a}の数が${e.need}以上なら+${e.win}、足りなければ−${e.lose}`;
    case 'battle':
      return `${a}の数が1位のクラスは+${e.win}、最下位のクラスは−${e.lose}`;
    case 'minus':
      return e.minus === 'without' ? `${a}の数 − ${a}を持たない子の人数（マイナスもある）` : `${a}の数 − ${ATTR_ICON[e.minus]}の数（マイナスもある）`;
    case 'variety':
      return `クラスにそろっているアイコンの種類数×${e.per}を加点`;
    case 'alien':
      return '空席のあるクラスに、アイコンのない火星人が1人ずつ転入';
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
      return c.minus ? `${ATTR_ICON[c.plus]} − ${c.minus === 'heads' ? '👥' : ATTR_ICON[c.minus]}` : `${ATTR_ICON[c.plus]} → +`;
    case 'contest':
      return contestGlyph(c);
    case 'raid':
      return `👊 − ${c.threat}`;
    case 'goods':
      return `🧑 ＋${ATTR_ICON[c.attr]}`;
    case 'cyborg':
      return '🧑 → 🦾';
    case 'push':
      return '👥 → 👋🧑';
    case 'exchange':
      return '🧑 ⇄ 🧑';
  }
}

function contestGlyph(c: ContestCard): string {
  const a = c.attr === 'all' ? '🌈' : ATTR_ICON[c.attr];
  const e = c.effect;
  const x = (m: number) => (m !== 1 ? `×${m}` : '');
  switch (e.type) {
    case 'sum':
      return `${a}${x(e.mult)} → +`;
    case 'top':
      return `🥇 ${a}${x(e.mult)}`;
    case 'ace':
      return `🧑${a}${x(e.mult)}`;
    case 'champion':
      return `🏆🧑 ${a}${x(e.mult)}`;
    case 'heads':
      return `🧑${a} → +${e.per}`;
    case 'threshold':
      return `${a} ${e.need}↑ ⭕+${e.win} ❌−${e.lose}`;
    case 'battle':
      return `🥇+${e.win}　最下位−${e.lose}`;
    case 'minus':
      return e.minus === 'without' ? `${a} − 🚫${a}🧑` : `${a} − ${ATTR_ICON[e.minus]}`;
    case 'variety':
      return `🌈種類 ×${e.per}`;
    case 'alien':
      return '🪑 → 👽';
  }
}

export function fixedGlyph(f: FixedEvent): string {
  return f.rule === 'test' ? `📚 − 👊🧑×${TEST_YANKEE_PENALTY}　🥇🥈🥉` : '🌈 全部　🥇🥈🥉';
}
