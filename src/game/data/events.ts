import { ATTR_ICON, type Attr, type EraId } from '../types';

/** 通常カード：そのアイコンを持つ生徒1人につき+1を全クラスに加点（名前違いでも効果は同じ） */
export interface NormalCard {
  id: string;
  kind: 'normal';
  name: string;
  attr: Attr;
  count: number;
}

/** イベントカード（引いた人だけ）：そのアイコンを持つ生徒の数値の合計が入る。時代カードはその時代の生徒が2倍 */
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

/** カチコミ（引いた人だけ）：👊の合計が敵の強さ以上なら撃退 */
export interface RaidCard {
  id: string;
  kind: 'raid';
  name: string;
  icon: string;
  threat: number;
  count: number;
}

export interface PersonalCard {
  id: string;
  kind: 'transfer' | 'push';
  name: string;
  icon: string;
  desc: string;
  count: number;
}

export type EventCard = NormalCard | ContestCard | RaidCard | PersonalCard;

/** 定期テスト・卒業式（全員参加）の順位点（人数別） */
export const CONTEST_POINTS: Record<number, number[]> = {
  2: [8, 3],
  3: [10, 5, 2],
  4: [10, 6, 3, 1],
  5: [10, 6, 3, 1, 0],
};
export const RAID_WIN = 6;
export const RAID_LOSE = -4;

const N = (attr: Attr, names: string[]): NormalCard[] =>
  names.map((name, i) => ({ id: `n_${attr}_${i}`, kind: 'normal', name, attr, count: 1 }));

export const NORMAL_CARDS: NormalCard[] = [
  ...N('study', ['授業', '自習', '図書室']),
  ...N('sports', ['体育', '昼休みのサッカー', '部活動']),
  ...N('art', ['音楽', '美術', '書道']),
  ...N('charm', ['学級会', '朝の会']),
  ...N('fight', ['番長の縄張り']),
];

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

export const RAID_CARDS: RaidCard[] = [5, 8, 11].map((threat) => ({
  id: `raid_${threat}`, kind: 'raid', name: 'カチコミ！', icon: '🏍️', threat, count: 1,
}));

export const PERSONAL_CARDS: PersonalCard[] = [
  { id: 'transfer', kind: 'transfer', name: '転入', icon: '🚪', desc: '今学期の時代の山札から3枚めくり、1人を迎える', count: 7 },
  { id: 'push', kind: 'push', name: '転校', icon: '📦', desc: 'いらない生徒を1人、別のクラスに押しつける', count: 2 },
];

/** 時代カード：その時代の学期だけ山札に混ざる。その時代出身の生徒は数値2倍 */
export const ERA_CARDS: ContestCard[] = [
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
export const TEST_YANKEE_PENALTY = 2;

export const ALL_EVENT_CARDS: EventCard[] = [...NORMAL_CARDS, ...CONTEST_CARDS, ...RAID_CARDS, ...PERSONAL_CARDS, ...ERA_CARDS];
export const EVENT_MAP: Record<string, EventCard> = Object.fromEntries(ALL_EVENT_CARDS.map((e) => [e.id, e]));
export const FIXED_MAP: Record<string, FixedEvent> = Object.fromEntries(FIXED_EVENTS.map((e) => [e.id, e]));

/** カードに書くルール文 */
export function cardRule(c: EventCard): string {
  switch (c.kind) {
    case 'normal':
      return `全員：${ATTR_ICON[c.attr]}を持つ子1人につき+1`;
    case 'contest':
      return `引いた人：${ATTR_ICON[c.attr]}の数値の合計を加点${c.era ? '（この時代の生徒は2倍）' : ''}`;
    case 'raid':
      return `引いた人：👊の数値の合計が${c.threat}以上なら+${RAID_WIN}、足りなければ${RAID_LOSE}`;
    default:
      return c.desc;
  }
}

export function fixedRule(f: FixedEvent): string {
  return f.rule === 'test'
    ? `📚の数値の合計−👊1人につき${TEST_YANKEE_PENALTY}で勝負（順位点×${f.mult}）`
    : `全員の数値の合計で勝負（順位点×${f.mult}）`;
}

export function cardIcon(c: EventCard): string {
  return c.kind === 'normal' ? ATTR_ICON[c.attr] : c.icon;
}
