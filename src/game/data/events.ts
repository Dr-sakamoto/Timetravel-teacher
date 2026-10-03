import { ATTR_ICON, type Attr, type EraId } from '../types';

/** 通常カード：そのアイコンを一番多く持つ子の個数を全クラスに加点。名前と絵柄は時代ごとに変わるだけ */
export interface NormalCard {
  id: string;
  kind: 'normal';
  attr: Attr;
  count: number;
}

/** イベントカード（引いた人だけ）：クラス全員のそのアイコンの合計数。時代カードはその時代の生徒のアイコンが2倍 */
export interface ContestCard {
  id: string;
  kind: 'contest';
  name: string;
  icon: string;
  attr: Attr;
  /** 時代カードなら、その時代の学期だけ山札に入る */
  era?: EraId;
  desc: string;
  count: number;
}

/** カチコミ（引いた人だけ）：クラスの👊の数が敵の強さに足りなければ、その差がマイナス。攻めてくる敵は時代ごとに変わる */
export interface RaidCard {
  id: string;
  kind: 'raid';
  threat: number;
  count: number;
}

export interface PushCard {
  id: string;
  kind: 'push';
  name: string;
  icon: string;
  desc: string;
  count: number;
}

export type EventCard = NormalCard | ContestCard | RaidCard | PushCard;

/** 定期テスト・卒業式（全員参加）の順位点（人数別） */
export const CONTEST_POINTS: Record<number, number[]> = {
  2: [5, 2],
  3: [5, 3, 1],
  4: [5, 3, 2, 1],
  5: [5, 3, 2, 1, 0],
};

/** イベントカード（引いた人だけ）の倍率 */
export const EVENT_MULT = 1;

/** 学期ごとの山札に入る人物カードの枚数（その時代の偉人が足りなければ現代の生徒で埋める） */
export const PERSON_CARDS_PER_TERM = 7;

const N = (attr: Attr, count: number): NormalCard => ({ id: `n_${attr}`, kind: 'normal', attr, count });
export const NORMAL_CARDS: NormalCard[] = [N('study', 3), N('sports', 3), N('art', 3), N('charm', 2), N('fight', 1)];

/** 時代ごとの通常カードの名前と絵柄（効果はどれも同じ） */
export const ERA_NORMAL_NAMES: Record<EraId, Record<Attr, [string, string]>> = {
  present: { study: ['授業', '🏫'], sports: ['体育', '🏃'], art: ['音楽', '🎵'], charm: ['学級会', '🙋'], fight: ['番長の縄張り', '😎'] },
  cretaceous: { study: ['化石の観察', '🦴'], sports: ['恐竜の大移動', '🦕'], art: ['シダの森で写生', '🌿'], charm: ['群れの集会', '🥚'], fight: ['縄張り争い', '🦖'] },
  egypt: { study: ['ナイルの暦', '🌊'], sports: ['石運び', '🧱'], art: ['壁画を描く', '🎨'], charm: ['ファラオの祭り', '🤴'], fight: ['戦車の訓練', '🐎'] },
  greece: { study: ['アカデメイアの講義', '📜'], sports: ['円盤投げ', '🥏'], art: ['悲劇の上演', '🎭'], charm: ['アゴラで討論', '🏛️'], fight: ['剣闘士の稽古', '⚔️'] },
  china: { study: ['論語の素読', '📖'], sports: ['馬術の稽古', '🐴'], art: ['書の練習', '🖌️'], charm: ['宴会', '🥟'], fight: ['武芸の稽古', '🥋'] },
  heian: { study: ['漢詩の勉強', '📜'], sports: ['蹴鞠', '⚽'], art: ['和歌を詠む', '🌸'], charm: ['宮中の行事', '🏯'], fight: ['検非違使の見回り', '🗡️'] },
  europe: { study: ['修道院の写本', '📕'], sports: ['騎馬の訓練', '🏇'], art: ['工房の修行', '🖼️'], charm: ['宮廷の舞踏会', '💃'], fight: ['騎士の決闘', '🛡️'] },
  sengoku: { study: ['寺での学問', '⛩️'], sports: ['早馬', '🐎'], art: ['茶の湯', '🍵'], charm: ['城下町の市', '🏮'], fight: ['鉄砲の稽古', '🔫'] },
  edo: { study: ['そろばん塾', '🧮'], sports: ['飛脚', '🏃'], art: ['浮世絵を摺る', '🌊'], charm: ['祭りの神輿', '🏮'], fight: ['道場破り', '🥋'] },
  modern: { study: ['工場見学', '🏭'], sports: ['自転車レース', '🚲'], art: ['サロンの演奏会', '🎻'], charm: ['社交界デビュー', '🎩'], fight: ['ボクシング', '🥊'] },
  future: { study: ['VR授業', '🥽'], sports: ['反重力スポーツ', '🛸'], art: ['ホログラム展', '✨'], charm: ['銀河会議', '🪐'], fight: ['ロボバトル', '🤖'] },
};

/** 時代ごとのカチコミしてくる敵の名前と絵柄 */
export const ERA_RAIDERS: Record<EraId, [string, string]> = {
  present: ['他校のヤンキー', '🏍️'],
  cretaceous: ['肉食恐竜の群れ', '🦖'],
  egypt: ['墓泥棒の一味', '🏺'],
  greece: ['ペルシア軍', '🛡️'],
  china: ['黄巾の乱', '🔥'],
  heian: ['鬼の軍団', '👹'],
  europe: ['ヴァイキング', '🏴‍☠️'],
  sengoku: ['野武士の群れ', '⚔️'],
  edo: ['浪人の殴り込み', '🗡️'],
  modern: ['マフィア', '🕴️'],
  future: ['宇宙海賊', '👾'],
};

const C = (id: string, name: string, icon: string, attr: Attr, desc: string, era?: EraId): ContestCard => ({
  id, kind: 'contest', name, icon, attr, desc, era, count: era ? 2 : 1,
});

export const CONTEST_CARDS: ContestCard[] = [
  C('sportsday', '体育祭', '🏃', 'sports', 'リレーに綱引き！'),
  C('ballgame', '球技大会', '⚽', 'sports', 'クラス対抗のサッカーとバレー。'),
  C('festival', '文化祭', '🎪', 'art', '出し物の人気投票。'),
  C('chorus', '合唱コンクール', '🎶', 'art', '全員で歌う。'),
  C('poptest', '抜き打ちテスト', '📝', 'study', '予告なしの小テスト。'),
  C('election', '生徒会選挙', '🗳️', 'charm', 'クラス代表を擁立。'),
];

export const RAID_CARDS: RaidCard[] = [3, 5, 7].map((threat) => ({ id: `raid_${threat}`, kind: 'raid', threat, count: 1 }));

export const PUSH_CARDS: PushCard[] = [
  { id: 'push', kind: 'push', name: '転校', icon: '📦', desc: 'いらない生徒を1人、別のクラスに押しつける', count: 2 },
];

/** 時代の固有イベントカード：その時代の学期だけ山札に混ざる。その時代出身の生徒はアイコン2倍 */
export const ERA_CARDS: ContestCard[] = [
  C('trip', '修学旅行', '🚌', 'charm', '班長がみんなを引率。', 'present'),
  C('videocon', '動画コンテスト', '📱', 'art', 'クラスで動画を撮って投稿。', 'present'),
  C('dino_race', '恐竜レース', '🦖', 'sports', '恐竜と並んで走れ！', 'cretaceous'),
  C('roar', '雄叫びコンテスト', '📢', 'fight', '一番でかい声を出した者の勝ち。', 'cretaceous'),
  C('pyramid', 'ピラミッド建設', '🔺', 'sports', '石を運んで積み上げろ。', 'egypt'),
  C('pharaoh', 'ファラオの謁見', '🤴', 'charm', 'ファラオに気に入られた者が勝つ。', 'egypt'),
  C('olympia', '古代オリンピック', '🏛️', 'sports', '優勝はオリーブの冠。', 'greece'),
  C('dialogue', '哲学問答', '🧔', 'study', 'ソクラテス式に問い詰められる。', 'greece'),
  C('keju', '科挙', '📜', 'study', '超難関の官僚試験。', 'china'),
  C('chibi', '赤壁の戦い', '🔥', 'fight', '火計に気をつけろ。', 'china'),
  C('utaawase', '歌合せ', '🌸', 'art', '和歌の出来を競う。', 'heian'),
  C('mononoke', '物の怪退治', '👹', 'charm', '都に出た物の怪を鎮めよ。', 'heian'),
  C('joust', '馬上槍試合', '🏇', 'fight', '騎士の一騎打ち。', 'europe'),
  C('renaissance', 'ルネサンス芸術祭', '🖼️', 'art', '巨匠たちの作品展。', 'europe'),
  C('kassen', '天下分け目の合戦', '⚔️', 'fight', '関ヶ原で全軍激突！', 'sengoku'),
  C('chakai', '茶の湯の会', '🍵', 'art', 'わびさびの心で一服。', 'sengoku'),
  C('terakoya', '寺子屋の試験', '🖌️', 'study', '読み書きそろばん。', 'edo'),
  C('kurofune', '黒船来航', '⚓', 'study', '蒸気船の仕組みを解き明かせ。', 'edo'),
  C('expo', '万国博覧会', '🎡', 'study', '世界中の発明が集まる。', 'modern'),
  C('concert', '演奏会', '🎻', 'art', '名曲を披露。', 'modern'),
  C('robocon', 'ロボコン', '🤖', 'study', 'ロボットを作って競う。', 'future'),
  C('spacetrip', '宇宙遠足', '🚀', 'sports', '無重力でみんなバテる。', 'future'),
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
  { id: 'test1', name: '1学期 期末テスト', icon: '📚', rule: 'test', mult: 2 },
  { id: 'test2', name: '2学期 期末テスト', icon: '📚', rule: 'test', mult: 2 },
  { id: 'test3', name: '学年末テスト', icon: '📚', rule: 'test', mult: 2 },
  { id: 'graduation', name: '卒業式', icon: '🎓', rule: 'graduation', mult: 3 },
];
/** 月末に固定イベントが起こる月 */
export const FIXED_BY_MONTH: Record<number, string> = { 7: 'test1', 12: 'test2', 3: 'test3' };
/** テストでは👊を持つ生徒1人につきこれだけ減点 */
export const TEST_YANKEE_PENALTY = 1;

export const ALL_EVENT_CARDS: EventCard[] = [...NORMAL_CARDS, ...CONTEST_CARDS, ...RAID_CARDS, ...PUSH_CARDS, ...ERA_CARDS];
export const EVENT_MAP: Record<string, EventCard> = Object.fromEntries(ALL_EVENT_CARDS.map((e) => [e.id, e]));
export const FIXED_MAP: Record<string, FixedEvent> = Object.fromEntries(FIXED_EVENTS.map((e) => [e.id, e]));

/** カードに書くルール文 */
export function cardRule(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `全員：${ATTR_ICON[c.attr]}を一番多く持つ子の個数を加点`;
    case 'contest':
      return `引いた人：クラス全員の${ATTR_ICON[c.attr]}の数を加点${c.era ? '（この時代の生徒は2倍）' : ''}`;
    case 'raid':
      return `引いた人：クラスの👊の数が${c.threat}に足りない分だけマイナス`;
    default:
      return c.desc;
  }
}

export function fixedRule(f: FixedEvent): string {
  return f.rule === 'test'
    ? `📚の数−👊を持つ子1人につき${TEST_YANKEE_PENALTY}で勝負（順位点×${f.mult}）`
    : `クラス全員のアイコンの総数で勝負（順位点×${f.mult}）`;
}
