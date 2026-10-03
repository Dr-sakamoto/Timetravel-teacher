import { ATTR_ICON, type Attr, type EraId } from '../types';

/** 通常カード（○○の時間）：めくった人だけ、クラス全員のそのアイコンの合計数（＋係ボーナス）が入る。全時代共通 */
export interface NormalCard {
  id: string;
  kind: 'normal';
  name: string;
  icon: string;
  attr: Attr;
  count: number;
}

/** カチコミ：めくった人が他のクラスを1つ選び、自分のクラスの👊の数だけそのクラスを減点させる */
export interface KachikomiCard {
  id: string;
  kind: 'kachikomi';
  name: string;
  icon: string;
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
  /** プラスはマイナスを打ち消すだけで、点はプラスにならない（0が上限） */
  offsetOnly?: boolean;
  desc: string;
  count: number;
}

/**
 * 時代イベントの効果（数えるアイコンはカードの attr。その時代出身の生徒のアイコンはどれも2倍）
 *   sum       … クラスのアイコンの合計 × mult
 *   rank      … アイコンの合計で順位をつけ、順位点 × mult
 *   top       … アイコンの合計が一番多いクラスだけ、合計 × mult（同点ならどちらも）
 *   ace       … クラスで一番アイコンの多い1人（代表）の数 × mult
 *   duel      … 代表1人どうしで順位をつけ、順位点 × mult
 *   heads     … そのアイコンを持つ子1人につき per 点（その時代出身の子は2人分）
 *   threshold … アイコンの合計が need 以上なら +win、届かなければ −lose
 *   battle    … アイコンの合計が1位のクラスに +win、最下位のクラスに −lose
 *   minus     … アイコンの合計 − 引くアイコンの合計（'without' はそのアイコンを持たない子の人数）
 */
export type EraEffect =
  | { type: 'sum'; mult: number }
  | { type: 'rank'; mult: number }
  | { type: 'top'; mult: number }
  | { type: 'ace'; mult: number }
  | { type: 'duel'; mult: number }
  | { type: 'heads'; per: number }
  | { type: 'threshold'; need: number; win: number; lose: number }
  | { type: 'battle'; win: number; lose: number }
  | { type: 'minus'; minus: Attr | 'without' };

/** 時代イベント（全クラス）：カードごとの効果。その時代出身の生徒のアイコンは2倍 */
export interface ContestCard {
  id: string;
  kind: 'contest';
  name: string;
  icon: string;
  attr: Attr;
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

/** 転校・クラス替え */
export interface MoveCard {
  id: string;
  kind: 'push' | 'exchange';
  name: string;
  icon: string;
  desc: string;
  count: number;
}

export type EventCard = NormalCard | KachikomiCard | SwingCard | ContestCard | RaidCard | GoodsCard | MoveCard;

/** 定期テスト・卒業式（全員参加）の順位点（人数別） */
export const CONTEST_POINTS: Record<number, number[]> = {
  2: [5, 2],
  3: [5, 3, 1],
  4: [5, 3, 2, 1],
  5: [5, 3, 2, 1, 0],
};

/** 学期ごとの山札に入る人物カードの最大枚数（その時代のカードプールに残っている分だけ） */
export const PERSON_CARDS_PER_TERM = 7;

const N = (attr: Attr, name: string, icon: string, count: number): NormalCard => ({ id: `n_${attr}`, kind: 'normal', name, icon, attr, count });
export const NORMAL_CARDS: NormalCard[] = [
  N('study', '数学の時間', '🔢', 5),
  N('sports', '体育の時間', '🏃', 5),
  N('art', '美術の時間', '🎨', 5),
  N('charm', '学活の時間', '🙋', 4),
];

export const KACHIKOMI_CARDS: KachikomiCard[] = [{ id: 'kachikomi', kind: 'kachikomi', name: 'カチコミ', icon: '👊', count: 3 }];

const W = (id: string, name: string, icon: string, plus: Attr, minus: Attr | 'heads' | undefined, desc: string, offsetOnly?: boolean): SwingCard => ({
  id, kind: 'swing', name, icon, plus, minus, offsetOnly, desc, count: 1,
});
export const SWING_CARDS: SwingCard[] = [
  W('poptest', '抜き打ちテスト', '📝', 'study', undefined, '日ごろの勉強がものを言う。'),
  W('visit', '授業参観', '👀', 'charm', 'fight', '親の前でいいところを見せたい。'),
  W('marathon', '持久走大会', '🥵', 'sports', 'heads', '全員が走る。走れない子は足を引っぱる。'),
  W('chorus', '合唱練習', '🎶', 'art', 'heads', '全員で歌う。音痴が混ざると台なし。'),
  W('brawl', 'ケンカ騒ぎ', '😤', 'charm', 'fight', 'ヤンキーが暴れる。人望のある子が止めに入れば被害は減る。', true),
];

export const MOVE_CARDS: MoveCard[] = [
  { id: 'push', kind: 'push', name: '転校', icon: '📦', desc: '全クラス：係に就いていない生徒を1人、必ず転校させる（クラスから外す）', count: 2 },
  { id: 'exchange', kind: 'exchange', name: 'クラス替え', icon: '🔁', desc: 'めくった人：自分の生徒1人と、他のクラスの係に就いていない好きな生徒1人を強制的に入れ替えられる', count: 1 },
];

const G = (id: string, name: string, icon: string, attr: Attr, era?: EraId): GoodsCard => ({ id, kind: 'goods', name, icon, attr, era, count: 1 });
/** グッズ：全時代共通3種＋時代ごとに2種 */
export const GOODS_CARDS: GoodsCard[] = [
  G('g_book', '参考書', '📕', 'study'),
  G('g_shoes', 'スポーツシューズ', '👟', 'sports'),
  G('g_paint', '絵の具セット', '🖍️', 'art'),
  G('g_phone', 'スマホ', '📱', 'charm', 'present'),
  G('g_tablet', 'タブレット', '💻', 'study', 'present'),
  G('g_fang', '恐竜の牙', '🦷', 'fight', 'cretaceous'),
  G('g_amber', '琥珀', '🟠', 'art', 'cretaceous'),
  G('g_scarab', 'スカラベのお守り', '🪲', 'charm', 'egypt'),
  G('g_papyrus', 'パピルス', '📜', 'study', 'egypt'),
  G('g_laurel', '月桂冠', '🌿', 'sports', 'greece'),
  G('g_lyre', '竪琴', '🪕', 'art', 'greece'),
  G('g_bamboo', '竹簡', '🎋', 'study', 'china'),
  G('g_halberd', '青龍偃月刀', '🗡️', 'fight', 'china'),
  G('g_junihitoe', '十二単', '👘', 'art', 'heian'),
  G('g_kemari', '鞠', '⚽', 'sports', 'heian'),
  G('g_shield', '騎士の盾', '🛡️', 'fight', 'europe'),
  G('g_quill', '羽ペン', '🪶', 'study', 'europe'),
  G('g_matchlock', '火縄銃', '🔫', 'fight', 'sengoku'),
  G('g_teabowl', '名物の茶器', '🍵', 'art', 'sengoku'),
  G('g_soroban', 'そろばん', '🧮', 'study', 'edo'),
  G('g_ukiyoe', '浮世絵', '🖼️', 'art', 'edo'),
  G('g_train', '蒸気機関車の模型', '🚂', 'study', 'modern'),
  G('g_tophat', 'シルクハット', '🎩', 'charm', 'modern'),
  G('g_boots', '反重力ブーツ', '👢', 'sports', 'future'),
  G('g_goggles', 'AIゴーグル', '🥽', 'study', 'future'),
];

/** 時代ごとの襲来：攻めてくる敵の名前・絵柄・強さ */
export const ERA_RAIDERS: Record<EraId, [string, string, number]> = {
  present: ['他校のヤンキー', '🏍️', 4],
  cretaceous: ['肉食恐竜の群れ', '🦖', 9],
  egypt: ['墓泥棒の一味', '🏺', 4],
  greece: ['ペルシア軍', '🛡️', 6],
  china: ['黄巾の乱', '🔥', 7],
  heian: ['鬼の軍団', '👹', 5],
  europe: ['ヴァイキング', '🏴‍☠️', 6],
  sengoku: ['野武士の群れ', '⚔️', 8],
  edo: ['浪人の殴り込み', '🗡️', 5],
  modern: ['マフィア', '🕴️', 5],
  future: ['宇宙海賊', '👾', 6],
};

export const RAID_CARDS: RaidCard[] = (Object.keys(ERA_RAIDERS) as EraId[]).map((era) => {
  const [name, icon, threat] = ERA_RAIDERS[era];
  return { id: `raid_${era}`, kind: 'raid', era, name: `襲来！${name}`, icon, threat, count: 1 };
});

const C = (id: string, name: string, icon: string, attr: Attr, effect: EraEffect, desc: string, era: EraId): ContestCard => ({
  id, kind: 'contest', name, icon, attr, effect, desc, era, count: 2,
});

/** 時代の固有イベントカード：その時代の学期だけ山札に混ざる。その時代出身の生徒はアイコン2倍 */
export const ERA_CARDS: ContestCard[] = [
  C('trip', '修学旅行', '🚌', 'charm', { type: 'heads', per: 2 }, '班長が多いほど班行動がまとまる。', 'present'),
  C('festival', '文化祭', '🎪', 'art', { type: 'rank', mult: 2 }, '出し物の人気投票。', 'present'),
  C('dino_race', '恐竜レース', '🦖', 'sports', { type: 'ace', mult: 2 }, '代表1人が恐竜と並んで走る。', 'cretaceous'),
  C('roar', '雄叫びコンテスト', '📢', 'fight', { type: 'top', mult: 2 }, '一番でかい声を出したクラスの総取り。', 'cretaceous'),
  C('pyramid', 'ピラミッド建設', '🔺', 'sports', { type: 'threshold', need: 8, win: 8, lose: 3 }, '石を運んで積み上げろ。完成しなければ罰。', 'egypt'),
  C('pharaoh', 'ファラオの謁見', '🤴', 'charm', { type: 'duel', mult: 2 }, '代表1人がファラオに謁見。気に入られた順に褒美。', 'egypt'),
  C('olympia', '古代オリンピック', '🏛️', 'sports', { type: 'rank', mult: 2 }, '優勝はオリーブの冠。', 'greece'),
  C('dialogue', '哲学問答', '🧔', 'study', { type: 'minus', minus: 'without' }, 'ソクラテス式に問い詰められる。答えられない子は減点。', 'greece'),
  C('keju', '科挙', '📜', 'study', { type: 'ace', mult: 3 }, '超難関の官僚試験。受かるのは一番の秀才だけ。', 'china'),
  C('chibi', '赤壁の戦い', '🔥', 'fight', { type: 'battle', win: 8, lose: 4 }, '勝てば大手柄、負ければ火計で焼かれる。', 'china'),
  C('utaawase', '歌合せ', '🌸', 'art', { type: 'ace', mult: 2 }, '代表1人が和歌を詠む。', 'heian'),
  C('mononoke', '物の怪退治', '👹', 'charm', { type: 'threshold', need: 5, win: 6, lose: 4 }, '都に出た物の怪を鎮めよ。鎮められなければ祟られる。', 'heian'),
  C('joust', '馬上槍試合', '🏇', 'fight', { type: 'duel', mult: 2 }, '代表1人どうしの一騎打ち。', 'europe'),
  C('renaissance', 'ルネサンス芸術祭', '🖼️', 'art', { type: 'top', mult: 2 }, '一番のクラスにだけパトロンがつく。', 'europe'),
  C('kassen', '天下分け目の合戦', '⚔️', 'fight', { type: 'battle', win: 10, lose: 5 }, '関ヶ原で全軍激突！', 'sengoku'),
  C('chakai', '茶の湯の会', '🍵', 'art', { type: 'minus', minus: 'fight' }, 'わびさびの心で一服。荒くれ者は作法を乱す。', 'sengoku'),
  C('terakoya', '寺子屋の試験', '🖌️', 'study', { type: 'heads', per: 2 }, '読み書きそろばん。できる子が多いほどよい。', 'edo'),
  C('kurofune', '黒船来航', '⚓', 'study', { type: 'threshold', need: 8, win: 8, lose: 4 }, '蒸気船の仕組みを解き明かせ。わからなければ不平等条約。', 'edo'),
  C('expo', '万国博覧会', '🎡', 'study', { type: 'rank', mult: 2 }, '世界中の発明が集まる。', 'modern'),
  C('concert', '演奏会', '🎻', 'art', { type: 'minus', minus: 'without' }, '名曲を披露。弾けない子は雑音になる。', 'modern'),
  C('robocon', 'ロボコン', '🤖', 'study', { type: 'sum', mult: 1 }, 'ロボットを作って競う。', 'future'),
  C('spacetrip', '宇宙遠足', '🚀', 'sports', { type: 'minus', minus: 'without' }, '無重力でみんなバテる。体力のない子は足手まとい。', 'future'),
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
  ...ERA_CARDS,
  ...RAID_CARDS,
];

/** そのカードが入る時代（どの時代にも入るなら undefined） */
export function cardEra(c: EventCard): EraId | undefined {
  return c.kind === 'contest' || c.kind === 'raid' || c.kind === 'goods' ? c.era : undefined;
}
export const EVENT_MAP: Record<string, EventCard> = Object.fromEntries(ALL_EVENT_CARDS.map((e) => [e.id, e]));
export const FIXED_MAP: Record<string, FixedEvent> = Object.fromEntries(FIXED_EVENTS.map((e) => [e.id, e]));

/** カードに書くルール文 */
export function cardRule(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `めくった人：クラス全員の${ATTR_ICON[c.attr]}の数を加点`;
    case 'kachikomi':
      return '他のクラスを1つ選び、自分のクラスの👊の数だけ減点させる';
    case 'swing':
      if (!c.minus) return `全クラス：クラス全員の${ATTR_ICON[c.plus]}の数を加点`;
      if (c.offsetOnly) return `全クラス：${ATTR_ICON[c.minus === 'heads' ? c.plus : c.minus]}の数だけ減点。${ATTR_ICON[c.plus]}の数だけ打ち消す（プラスにはならない）`;
      return `全クラス：${ATTR_ICON[c.plus]}の数 − ${c.minus === 'heads' ? 'クラスの人数' : `${ATTR_ICON[c.minus]}の数`}（マイナスもある）`;
    case 'contest':
      return `全クラス：${eraEffectRule(c)}（この時代の生徒は2倍）`;
    case 'raid':
      return `全クラス：クラスの👊の数 − ${c.threat}（この時代の生徒は2倍）`;
    case 'goods':
      return `生徒1人に装備：${ATTR_ICON[c.attr]}＋1（1人1つまで）`;
    default:
      return c.desc;
  }
}

/** 時代イベントの効果の説明文 */
export function eraEffectRule(c: ContestCard): string {
  const a = ATTR_ICON[c.attr];
  const e = c.effect;
  switch (e.type) {
    case 'sum':
      return `クラス全員の${a}の数${e.mult !== 1 ? `×${e.mult}` : ''}を加点`;
    case 'rank':
      return `${a}の数で順位を競い、順位点×${e.mult}`;
    case 'top':
      return `${a}の数が一番多いクラスだけ、その数×${e.mult}を加点`;
    case 'ace':
      return `${a}が一番多い代表1人の${a}の数×${e.mult}を加点`;
    case 'duel':
      return `${a}が一番多い代表1人どうしで順位を競い、順位点×${e.mult}`;
    case 'heads':
      return `${a}を持つ子1人につき+${e.per}`;
    case 'threshold':
      return `${a}の数が${e.need}以上なら+${e.win}、足りなければ−${e.lose}`;
    case 'battle':
      return `${a}の数が1位のクラスは+${e.win}、最下位のクラスは−${e.lose}`;
    case 'minus':
      return e.minus === 'without' ? `${a}の数 − ${a}を持たない子の人数（マイナスもある）` : `${a}の数 − ${ATTR_ICON[e.minus]}の数（マイナスもある）`;
  }
}

export function fixedRule(f: FixedEvent): string {
  return f.rule === 'test'
    ? `📚の数−👊を持つ子1人につき${TEST_YANKEE_PENALTY}で勝負（順位点×${f.mult}）`
    : `クラス全員のアイコンの総数で勝負（順位点×${f.mult}）`;
}
