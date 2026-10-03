import { ATTR_ICON, type Attr, type EraId, type Tag } from '../types';

export type Aggregate = { type: 'top'; n: number } | { type: 'avg' } | { type: 'max' };

/** イベントの特殊効果 */
export type Effect =
  /** そのタグを持つ参加生徒の値+amount */
  | { kind: 'tag'; tag: Tag; amount: number }
  /** 別の属性も持っている参加生徒の値+amount */
  | { kind: 'combo'; attr: Attr; amount: number }
  /** （平均イベント）属性を持たない生徒を amount として数える */
  | { kind: 'lacking'; amount: number }
  /** クラス内のその属性の持ち主1人につき戦力+amount */
  | { kind: 'perHolder'; attr: Attr; amount: number }
  /** 1位のクラスに追加ポイント */
  | { kind: 'firstBonus'; amount: number }
  /** 全クラスに参加賞 */
  | { kind: 'everyone'; amount: number }
  /** 最下位のクラスはポイントを失う */
  | { kind: 'lastPenalty'; amount: number };

/** 全クラスが参加するイベントカード。属性アイコンで勝負し、特殊効果で味付けする */
export interface SchoolEventDef {
  id: string;
  kind: 'school';
  name: string;
  icon: string;
  /** 'all' は全属性の合計（数値×属性の数） */
  attr: Attr | 'all';
  desc: string;
  agg: Aggregate;
  effects: Effect[];
  /** 順位点の倍率 */
  mult: number;
  /** 指定があるとボーダー判定（threatsの中からランダム） */
  threshold?: { threats: number[]; win: number; lose: number };
  /** 時代固有カードなら、その時代の学期だけ山札に入る */
  era?: EraId;
  count: number;
}

/** 通常イベント：属性アイコンが出たら、全クラスでその属性を持つ生徒1人につき1pt */
export interface IconEventDef {
  id: string;
  kind: 'icon';
  attr: Attr;
  name: string;
  icon: string;
  desc: string;
  count: number;
}

export type PersonalKind = 'transfer' | 'push';

/** 引いたプレイヤーが行動するイベントカード */
export interface PersonalEventDef {
  id: string;
  kind: PersonalKind;
  name: string;
  icon: string;
  desc: string;
  count: number;
}

export type EventDef = SchoolEventDef | IconEventDef | PersonalEventDef;

/** 通常イベント（アイコンカード）1人あたりの点。係で強化している子はさらに+1 */
export const ICON_POINT = 1;

export const ICON_EVENTS: IconEventDef[] = [
  { id: 'icon_study', kind: 'icon', attr: 'study', name: '授業', icon: '📚', desc: '📚を持つ生徒1人につき+1pt', count: 4 },
  { id: 'icon_sports', kind: 'icon', attr: 'sports', name: '体育', icon: '🏃', desc: '🏃を持つ生徒1人につき+1pt', count: 4 },
  { id: 'icon_art', kind: 'icon', attr: 'art', name: '図工・音楽', icon: '🎨', desc: '🎨を持つ生徒1人につき+1pt', count: 3 },
  { id: 'icon_charm', kind: 'icon', attr: 'charm', name: '学級活動', icon: '👑', desc: '👑を持つ生徒1人につき+1pt', count: 2 },
  { id: 'icon_fight', kind: 'icon', attr: 'fight', name: '番長の縄張り', icon: '👊', desc: '👊を持つ生徒1人につき+1pt', count: 2 },
];

/** 全時代共通のイベントカード */
export const SCHOOL_EVENTS: SchoolEventDef[] = [
  { id: 'sportsday', kind: 'school', name: '体育祭', icon: '🏃', attr: 'sports', desc: 'リレーに綱引き！運動自慢の出番。', agg: { type: 'top', n: 5 }, effects: [{ kind: 'combo', attr: 'charm', amount: 1 }], mult: 1.5, count: 1 },
  { id: 'festival', kind: 'school', name: '文化祭', icon: '🎪', attr: 'art', desc: '出し物の人気投票。', agg: { type: 'top', n: 5 }, effects: [{ kind: 'combo', attr: 'charm', amount: 1 }, { kind: 'firstBonus', amount: 3 }], mult: 1.5, count: 1 },
  { id: 'ballgame', kind: 'school', name: '球技大会', icon: '⚽', attr: 'sports', desc: 'クラス対抗のサッカーとバレー。', agg: { type: 'top', n: 3 }, effects: [{ kind: 'combo', attr: 'fight', amount: 1 }], mult: 1, count: 1 },
  { id: 'chorus', kind: 'school', name: '合唱コンクール', icon: '🎶', attr: 'art', desc: '全員で歌う。恐竜の咆哮は台無し。', agg: { type: 'avg' }, effects: [{ kind: 'tag', tag: '恐竜', amount: -3 }], mult: 1, count: 1 },
  { id: 'poptest', kind: 'school', name: '抜き打ちテスト', icon: '📝', attr: 'study', desc: 'クラス平均点で勝負。', agg: { type: 'avg' }, effects: [{ kind: 'lastPenalty', amount: 2 }], mult: 1, count: 1 },
  { id: 'election', kind: 'school', name: '生徒会選挙', icon: '🗳️', attr: 'charm', desc: '一番人望のある生徒を擁立。', agg: { type: 'max' }, effects: [{ kind: 'tag', tag: '王族', amount: 3 }], mult: 1, count: 1 },
  {
    id: 'yankee', kind: 'school', name: 'カチコミ！', icon: '🏍️', attr: 'fight',
    desc: '他校の不良軍団が殴り込み！👊を持つヤンキー上位3人で迎え撃て。',
    agg: { type: 'top', n: 3 }, effects: [{ kind: 'tag', tag: '恐竜', amount: 3 }],
    mult: 1, threshold: { threats: [6, 9, 12, 15], win: 6, lose: -5 }, count: 2,
  },
];

/** 時代固有のイベントカード。その時代の学期だけ山札に混ざる */
const E = (era: EraId, id: string, name: string, icon: string, attr: Attr, agg: Aggregate, effects: Effect[], desc: string, mult = 1): SchoolEventDef => ({
  id, kind: 'school', era, name, icon, attr, agg, effects, desc, mult, count: 2,
});
export const ERA_EVENTS: SchoolEventDef[] = [
  E('cretaceous', 'dino_race', '恐竜レース', '🦖', 'sports', { type: 'top', n: 3 }, [{ kind: 'tag', tag: '恐竜', amount: 4 }], '恐竜と並んで走れ！'),
  E('cretaceous', 'roar', '雄叫びコンテスト', '📢', 'fight', { type: 'max' }, [{ kind: 'tag', tag: '恐竜', amount: 5 }], '一番でかい声を出した者の勝ち。'),
  E('egypt', 'pyramid', 'ピラミッド建設', '🔺', 'sports', { type: 'top', n: 5 }, [{ kind: 'combo', attr: 'art', amount: 1 }], '石を運んで美しく積め。'),
  E('egypt', 'pharaoh', 'ファラオの謁見', '🤴', 'charm', { type: 'max' }, [{ kind: 'tag', tag: '王族', amount: 4 }], 'ファラオに気に入られた者が勝つ。'),
  E('greece', 'olympia', '古代オリンピック', '🏛️', 'sports', { type: 'top', n: 3 }, [{ kind: 'firstBonus', amount: 3 }], '元祖オリンピック。優勝はオリーブの冠。'),
  E('greece', 'dialogue', '哲学問答', '🧔', 'study', { type: 'top', n: 3 }, [{ kind: 'tag', tag: '学者', amount: 3 }], 'ソクラテス式に問い詰められる。'),
  E('china', 'keju', '科挙', '📜', 'study', { type: 'avg' }, [], '超難関の官僚試験。クラス平均で勝負。', 1.5),
  E('china', 'chibi', '赤壁の戦い', '🔥', 'fight', { type: 'top', n: 3 }, [{ kind: 'tag', tag: '武将', amount: 3 }], '火計に気をつけろ。'),
  E('heian', 'utaawase', '歌合せ', '🌸', 'art', { type: 'top', n: 3 }, [{ kind: 'tag', tag: '芸術家', amount: 2 }], '和歌の出来を競う。'),
  E('heian', 'mononoke', '物の怪退治', '👹', 'charm', { type: 'top', n: 3 }, [{ kind: 'tag', tag: '学者', amount: 2 }], '都に出た物の怪を鎮めよ。'),
  E('europe', 'joust', '馬上槍試合', '🏇', 'fight', { type: 'max' }, [{ kind: 'combo', attr: 'sports', amount: 2 }], '騎士の一騎打ち。'),
  E('europe', 'renaissance', 'ルネサンス芸術祭', '🖼️', 'art', { type: 'top', n: 5 }, [], '巨匠たちの作品展。', 1.5),
  E('sengoku', 'kassen', '天下分け目の合戦', '⚔️', 'fight', { type: 'top', n: 5 }, [{ kind: 'tag', tag: '武将', amount: 2 }], '関ヶ原で全軍激突！', 1.5),
  E('sengoku', 'chakai', '茶の湯の会', '🍵', 'art', { type: 'top', n: 3 }, [{ kind: 'combo', attr: 'charm', amount: 1 }], 'わびさびの心で一服。'),
  E('edo', 'terakoya', '寺子屋の試験', '🖌️', 'study', { type: 'avg' }, [], '読み書きそろばん。クラス平均で勝負。'),
  E('edo', 'kurofune', '黒船来航', '⚓', 'study', { type: 'top', n: 3 }, [{ kind: 'tag', tag: '学者', amount: 3 }], '蒸気船の仕組みを解き明かせ。'),
  E('modern', 'expo', '万国博覧会', '🎡', 'study', { type: 'top', n: 3 }, [{ kind: 'combo', attr: 'art', amount: 2 }], '世界中の発明が集まる。'),
  E('modern', 'concert', '演奏会', '🎻', 'art', { type: 'max' }, [{ kind: 'tag', tag: '芸術家', amount: 3 }], 'ソリストを1人選んで演奏。'),
  E('future', 'robocon', 'ロボコン', '🤖', 'study', { type: 'top', n: 3 }, [{ kind: 'tag', tag: '未来', amount: 3 }], 'ロボットを作って競う。'),
  E('future', 'spacetrip', '宇宙遠足', '🚀', 'sports', { type: 'avg' }, [{ kind: 'tag', tag: '未来', amount: 2 }], '無重力でみんなバテる。'),
];

/** 毎学期末に必ず起こる固定イベント */
const TEST_EFFECTS: Effect[] = [{ kind: 'combo', attr: 'charm', amount: 0.5 }];
export const FIXED_EVENTS: SchoolEventDef[] = [
  { id: 'test1', kind: 'school', name: '1学期 期末テスト', icon: '📚', attr: 'study', desc: 'クラス全員の平均で勝負。ヤンキーは0点。', agg: { type: 'avg' }, effects: TEST_EFFECTS, mult: 1.5, count: 0 },
  { id: 'test2', kind: 'school', name: '2学期 期末テスト', icon: '📚', attr: 'study', desc: 'クラス全員の平均で勝負。', agg: { type: 'avg' }, effects: TEST_EFFECTS, mult: 1.5, count: 0 },
  { id: 'test3', kind: 'school', name: '学年末テスト', icon: '📚', attr: 'study', desc: 'クラス全員の平均で勝負。', agg: { type: 'avg' }, effects: TEST_EFFECTS, mult: 1.5, count: 0 },
  { id: 'graduation', kind: 'school', name: '卒業式・時空最強クラス審査', icon: '🎓', attr: 'all', desc: '数値が高く属性の幅が広い生徒ほど評価される。', agg: { type: 'top', n: 12 }, effects: [], mult: 3, count: 0 },
];

/** 月末に固定イベントが起こる月 */
export const FIXED_BY_MONTH: Record<number, string> = { 7: 'test1', 12: 'test2', 3: 'test3' };

export const PERSONAL_EVENTS: PersonalEventDef[] = [
  { id: 'transfer', kind: 'transfer', name: '転入', icon: '🚪', desc: '今学期の時代から転校生がやってくる。3人から1人を選ぼう。', count: 7 },
  { id: 'push', kind: 'push', name: '転校', icon: '📦', desc: '自分のクラスのいらない生徒を、別のクラスに押しつける。', count: 2 },
];

export const EVENT_MAP: Record<string, EventDef> = Object.fromEntries(
  [...ICON_EVENTS, ...SCHOOL_EVENTS, ...ERA_EVENTS, ...FIXED_EVENTS, ...PERSONAL_EVENTS].map((e) => [e.id, e]),
);

export function attrIcon(attr: Attr | 'all'): string {
  return attr === 'all' ? '🌈' : ATTR_ICON[attr];
}

export function effectText(e: Effect): string {
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  switch (e.kind) {
    case 'tag':
      return `${e.tag}${sign(e.amount)}`;
    case 'combo':
      return `${ATTR_ICON[e.attr]}も持つ子${sign(e.amount)}`;
    case 'lacking':
      return `持たない子${sign(e.amount)}`;
    case 'perHolder':
      return `${ATTR_ICON[e.attr]}1人ごと${sign(e.amount)}`;
    case 'firstBonus':
      return `1位+${e.amount}pt`;
    case 'everyone':
      return `参加賞+${e.amount}pt`;
    case 'lastPenalty':
      return `最下位-${e.amount}pt`;
  }
}

/** 勝負の仕方（短い表記） */
export function aggText(ev: SchoolEventDef): string {
  const icon = attrIcon(ev.attr);
  const n = ev.agg.type === 'top' ? ev.agg.n : 1;
  if (ev.attr === 'all') return `${icon} 上位${n}人の総合力`;
  if (ev.agg.type === 'top') return `${icon} 上位${n}人`;
  if (ev.agg.type === 'avg') return `${icon} 全員平均`;
  return `${icon} トップ1人`;
}
