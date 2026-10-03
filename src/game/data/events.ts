import { ATTR_ICON, type Attr, type Tag } from '../types';

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

/** 全クラスが参加する学校行事。属性アイコンで勝負し、特殊効果で味付けする */
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
  count: number;
}

export type PersonalKind =
  | 'transfer'
  | 'rush'
  | 'train'
  | 'storm'
  | 'warp'
  | 'poach'
  | 'bonus'
  | 'inspection'
  | 'crisis'
  | 'zoo'
  | 'parents'
  | 'lesson'
  | 'lunch'
  | 'club'
  | 'homework'
  | 'oversleep';

/** 引いたプレイヤーだけに起こるイベント。tone は すごろくの青マス／赤マス／特別マス */
export interface PersonalEventDef {
  id: string;
  kind: PersonalKind;
  name: string;
  icon: string;
  tone: 'blue' | 'red' | 'special';
  attr?: Attr;
  desc: string;
  count: number;
}

export type EventDef = SchoolEventDef | PersonalEventDef;

export const SCHOOL_EVENTS: SchoolEventDef[] = [
  { id: 'sportsday', kind: 'school', name: '体育祭', icon: '🏃', attr: 'sports', desc: 'クラス対抗リレーに綱引き！運動自慢の出番だ。', agg: { type: 'top', n: 6 }, effects: [{ kind: 'combo', attr: 'charm', amount: 1 }], mult: 1.5, count: 2 },
  { id: 'ballgame', kind: 'school', name: '球技大会', icon: '⚽', attr: 'sports', desc: 'サッカーとバレーでクラス対抗戦。ラフプレーも少々。', agg: { type: 'top', n: 5 }, effects: [{ kind: 'combo', attr: 'fight', amount: 1 }], mult: 1, count: 1 },
  { id: 'marathon', kind: 'school', name: 'マラソン大会', icon: '🏃‍♂️', attr: 'sports', desc: '全員参加の持久走。クラス平均で勝負。完走した全クラスに参加賞。', agg: { type: 'avg' }, effects: [{ kind: 'everyone', amount: 1 }], mult: 1, count: 1 },
  { id: 'swimming', kind: 'school', name: '水泳大会', icon: '🏊', attr: 'sports', desc: '選抜メンバーによるメドレーリレー。恐竜は泳ぎが得意。', agg: { type: 'top', n: 4 }, effects: [{ kind: 'tag', tag: '恐竜', amount: 2 }], mult: 1, count: 1 },
  { id: 'festival', kind: 'school', name: '文化祭', icon: '🎪', attr: 'art', desc: '出し物の人気投票。人望のある子が呼び込むと客が増える。', agg: { type: 'top', n: 6 }, effects: [{ kind: 'combo', attr: 'charm', amount: 1 }, { kind: 'firstBonus', amount: 3 }], mult: 1.5, count: 2 },
  { id: 'chorus', kind: 'school', name: '合唱コンクール', icon: '🎶', attr: 'art', desc: '全員で歌う。歌えない子も混ざる。恐竜の咆哮は台無し。', agg: { type: 'avg' }, effects: [{ kind: 'tag', tag: '恐竜', amount: -3 }], mult: 1, count: 1 },
  { id: 'sketch', kind: 'school', name: '写生大会', icon: '🖼️', attr: 'art', desc: '上位3作品で競う。本物の芸術家は格が違う。', agg: { type: 'top', n: 3 }, effects: [{ kind: 'tag', tag: '芸術家', amount: 3 }], mult: 1, count: 1 },
  { id: 'poptest', kind: 'school', name: '抜き打ちテスト', icon: '📝', attr: 'study', desc: '予告なしの小テスト。クラス平均点で勝負。勉強しないヤンキーは0点。', agg: { type: 'avg' }, effects: [{ kind: 'lastPenalty', amount: 2 }], mult: 1, count: 2 },
  { id: 'quiz', kind: 'school', name: 'クイズ大会', icon: '❓', attr: 'study', desc: '代表3人の早押しクイズ。学者は知識量が段違い。', agg: { type: 'top', n: 3 }, effects: [{ kind: 'tag', tag: '学者', amount: 2 }], mult: 1, count: 1 },
  { id: 'speech', kind: 'school', name: '弁論大会', icon: '🎤', attr: 'charm', desc: 'クラス代表1人の演説。頭も良ければ説得力が増す。', agg: { type: 'max' }, effects: [{ kind: 'combo', attr: 'study', amount: 2 }], mult: 1, count: 1 },
  { id: 'election', kind: 'school', name: '生徒会選挙', icon: '🗳️', attr: 'charm', desc: '一番人望のある生徒を擁立。王族は演説慣れしている。', agg: { type: 'max' }, effects: [{ kind: 'tag', tag: '王族', amount: 3 }], mult: 1, count: 1 },
  { id: 'inspect', kind: 'school', name: '校長の視察', icon: '👀', attr: 'charm', desc: '人望のある3人が案内役。ヤンキーが多いと印象が悪い。', agg: { type: 'top', n: 3 }, effects: [{ kind: 'perHolder', attr: 'fight', amount: -1 }], mult: 1, count: 1 },
  { id: 'excursion', kind: 'school', name: '修学旅行', icon: '🚌', attr: 'charm', desc: '班長5人がそれぞれの班を引率。まとめ役の腕の見せ所。', agg: { type: 'top', n: 5 }, effects: [{ kind: 'combo', attr: 'sports', amount: 1 }], mult: 1.5, count: 1 },
  { id: 'eating', kind: 'school', name: '給食大食い大会', icon: '🍛', attr: 'sports', desc: '代表1人がカレーを食べまくる。恐竜が圧倒的。', agg: { type: 'max' }, effects: [{ kind: 'tag', tag: '恐竜', amount: 10 }, { kind: 'combo', attr: 'fight', amount: 2 }], mult: 1, count: 1 },
  { id: 'timan', kind: 'school', name: '番長タイマン勝負', icon: '🥊', attr: 'fight', desc: '各クラスの最強ヤンキー同士が河原でタイマン。勝てば学校中の噂に。', agg: { type: 'max' }, effects: [{ kind: 'tag', tag: '恐竜', amount: 2 }, { kind: 'firstBonus', amount: 2 }], mult: 1, count: 1 },
  { id: 'sportstest', kind: 'school', name: 'スポーツテスト', icon: '⏱️', attr: 'sports', desc: '全員が測定。クラスの🏃平均で勝負。', agg: { type: 'avg' }, effects: [{ kind: 'firstBonus', amount: 2 }], mult: 1, count: 1 },
  {
    id: 'yankee', kind: 'school', name: '他校のヤンキー襲来！', icon: '🏍️', attr: 'fight',
    desc: '隣町の不良軍団が校門に！👊を持つヤンキー上位3人で迎え撃て。ヤンキーのいないクラスは無防備…。',
    agg: { type: 'top', n: 3 }, effects: [{ kind: 'tag', tag: '恐竜', amount: 3 }],
    mult: 1, threshold: { threats: [6, 9, 12, 15], win: 8, lose: -5 }, count: 3,
  },
];

/** 毎学期末に必ず起こる固定イベント */
const TEST_EFFECTS: Effect[] = [{ kind: 'combo', attr: 'charm', amount: 0.5 }];
export const FIXED_EVENTS: SchoolEventDef[] = [
  { id: 'test1', kind: 'school', name: '1学期 期末テスト', icon: '📚', attr: 'study', desc: '学期末の定期テスト。クラス全員の平均で勝負。勉強できる奴が強く、ヤンキーは足を引っ張る。', agg: { type: 'avg' }, effects: TEST_EFFECTS, mult: 1.5, count: 0 },
  { id: 'test2', kind: 'school', name: '2学期 期末テスト', icon: '📚', attr: 'study', desc: '学期末の定期テスト。クラス全員の平均で勝負。', agg: { type: 'avg' }, effects: TEST_EFFECTS, mult: 1.5, count: 0 },
  { id: 'test3', kind: 'school', name: '学年末テスト', icon: '📚', attr: 'study', desc: '1年の総まとめ。クラス全員の平均で勝負。', agg: { type: 'avg' }, effects: TEST_EFFECTS, mult: 1.5, count: 0 },
  { id: 'graduation', kind: 'school', name: '卒業式・時空最強クラス審査', icon: '🎓', attr: 'all', desc: 'クラスの総合力で最終審査。数値が高く属性の幅が広い生徒ほど評価される。', agg: { type: 'top', n: 10 }, effects: [], mult: 3, count: 0 },
];

/** 月末に固定イベントが起こる月 */
export const FIXED_BY_MONTH: Record<number, string> = { 7: 'test1', 12: 'test2', 3: 'test3' };

export const PERSONAL_EVENTS: PersonalEventDef[] = [
  // ---- 特別マス ----
  { id: 'transfer', kind: 'transfer', name: '転校生がやってくる！', icon: '🚪', tone: 'special', desc: 'タイムマシンがいる時代から転校生がやってくる。3人の候補から1人を選んで迎え入れよう。', count: 13 },
  { id: 'rush', kind: 'rush', name: '転校生ラッシュ！', icon: '🎉', tone: 'special', desc: 'なぜか転校希望者が殺到！4人の候補から2人まで迎え入れられる。', count: 1 },
  { id: 'train', kind: 'train', name: '放課後の特訓', icon: '💪', tone: 'special', desc: '生徒1人を選んで、数値を+1するか、新しい属性を1つ覚えさせる（👊は覚えられない）。', count: 3 },
  { id: 'storm', kind: 'storm', name: '時空嵐に巻き込まれた！', icon: '🌀', tone: 'special', desc: 'タイムマシンがランダムな時代に飛ばされた…。ついでに2人の候補から1人連れて帰れる。', count: 2 },
  { id: 'warp', kind: 'warp', name: '時空ワープ航法', icon: '✨', tone: 'special', desc: 'タイムマシンが好きな時代へひとっ飛び。', count: 1 },
  { id: 'poach', kind: 'poach', name: '引き抜き工作', icon: '🕵️', tone: 'special', desc: '他クラスの生徒（係についていない子）を1人引き抜ける。相手クラスには移籍金3ptが入る。', count: 1 },
  { id: 'inspection', kind: 'inspection', name: '抜き打ち持ち物検査', icon: '🎒', tone: 'special', attr: 'fight', desc: '👊持ち1人につき-2pt。1人もいなければ+2pt。', count: 1 },
  { id: 'crisis', kind: 'crisis', name: '学級崩壊の危機', icon: '💥', tone: 'special', attr: 'charm', desc: 'クラスで一番の👑（係の効果込み）が9以上ならまとめ上げて+5pt、足りなければ-5pt。', count: 1 },
  { id: 'zoo', kind: 'zoo', name: '飼育小屋の点検', icon: '🐾', tone: 'special', desc: '恐竜・動物が飼育係のお世話を受けていれば1匹につき+3pt、放置されていれば1匹につき-2pt。', count: 1 },
  { id: 'parents', kind: 'parents', name: '保護者会', icon: '👪', tone: 'special', attr: 'charm', desc: '👑持ちの人数ぶんポイントを得る（最大6pt）。', count: 1 },
  // ---- 青マス（ちょっと良いこと） ----
  { id: 'lesson', kind: 'lesson', name: 'いつもの授業', icon: '🏫', tone: 'blue', attr: 'study', desc: '📚持ち3人につき+1pt。', count: 3 },
  { id: 'club', kind: 'club', name: '部活動', icon: '🥁', tone: 'blue', desc: '🏃持ちと🎨持ち、合わせて4人につき+1pt。', count: 2 },
  { id: 'lunch', kind: 'lunch', name: '楽しい昼休み', icon: '🍱', tone: 'blue', desc: '平和な一日。+2pt', count: 2 },
  { id: 'bonus', kind: 'bonus', name: '地域清掃で表彰', icon: '🏆', tone: 'blue', desc: 'クラス全員で町内清掃。地元から感謝状が届いた。+3pt', count: 1 },
  // ---- 赤マス（ちょっと悪いこと） ----
  { id: 'homework', kind: 'homework', name: '宿題忘れ', icon: '📄', tone: 'red', attr: 'study', desc: '-2pt。ただし📚持ちが8人以上いれば誰かが見せてくれて±0。', count: 2 },
  { id: 'oversleep', kind: 'oversleep', name: '寝坊して遅刻', icon: '⏰', tone: 'red', desc: '担任が寝坊。-1pt', count: 2 },
];

export const EVENT_MAP: Record<string, EventDef> = Object.fromEntries(
  [...SCHOOL_EVENTS, ...FIXED_EVENTS, ...PERSONAL_EVENTS].map((e) => [e.id, e]),
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
