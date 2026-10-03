import type { Category, StatKey, Tag } from '../types';

export type Aggregate = { type: 'top'; n: number } | { type: 'avg' } | { type: 'max' };

/** 全クラスが参加する学校行事。順位またはボーダーで得点が決まる */
export interface SchoolEventDef {
  id: string;
  kind: 'school';
  name: string;
  icon: string;
  category: Category;
  desc: string;
  weights: Partial<Record<StatKey, number>>;
  agg: Aggregate;
  tagBonus?: Partial<Record<Tag, number>>;
  /** 順位点の倍率 */
  mult: number;
  /** 指定があるとボーダー判定（threatの中からランダム） */
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
  | 'parents';

/** 引いたプレイヤーだけに起こるイベント */
export interface PersonalEventDef {
  id: string;
  kind: PersonalKind;
  name: string;
  icon: string;
  desc: string;
  count: number;
}

export type EventDef = SchoolEventDef | PersonalEventDef;

const TEST_TAGS: Partial<Record<Tag, number>> = { ヤンキー: -3, 恐竜: -4, 学者: 1 };

export const SCHOOL_EVENTS: SchoolEventDef[] = [
  { id: 'sportsday', kind: 'school', name: '体育祭', icon: '🏃', category: 'sports', desc: 'クラス対抗リレーに綱引き！運動自慢の出番だ。', weights: { pe: 1, charm: 0.3 }, agg: { type: 'top', n: 6 }, mult: 1.5, count: 2 },
  { id: 'ballgame', kind: 'school', name: '球技大会', icon: '⚽', category: 'sports', desc: 'サッカーとバレーでクラス対抗戦。ラフプレーも少々。', weights: { pe: 1, fight: 0.3 }, agg: { type: 'top', n: 5 }, mult: 1, count: 1 },
  { id: 'marathon', kind: 'school', name: 'マラソン大会', icon: '🏃‍♂️', category: 'sports', desc: '全員参加の持久走。クラス平均タイムで勝負。', weights: { pe: 1 }, agg: { type: 'avg' }, mult: 1, count: 1 },
  { id: 'swimming', kind: 'school', name: '水泳大会', icon: '🏊', category: 'sports', desc: '選抜メンバーによるメドレーリレー。', weights: { pe: 1 }, agg: { type: 'top', n: 4 }, mult: 1, count: 1 },
  { id: 'festival', kind: 'school', name: '文化祭', icon: '🎪', category: 'culture', desc: '出し物の人気投票。センスと集客力が鍵。', weights: { art: 1, charm: 0.5 }, agg: { type: 'top', n: 6 }, tagBonus: { 芸術家: 2 }, mult: 1.5, count: 2 },
  { id: 'chorus', kind: 'school', name: '合唱コンクール', icon: '🎶', category: 'culture', desc: '全員で歌う。一人でも音痴がいると響く。恐竜の咆哮は減点。', weights: { art: 1, charm: 0.3 }, agg: { type: 'avg' }, tagBonus: { 恐竜: -3, ヤンキー: -1 }, mult: 1, count: 1 },
  { id: 'sketch', kind: 'school', name: '写生大会', icon: '🖼️', category: 'culture', desc: '上位3作品の合計で競う。', weights: { art: 1 }, agg: { type: 'top', n: 3 }, mult: 1, count: 1 },
  { id: 'poptest', kind: 'school', name: '抜き打ちテスト', icon: '📝', category: 'study', desc: '予告なしの小テスト。クラス平均点で勝負。', weights: { study: 1 }, agg: { type: 'avg' }, tagBonus: TEST_TAGS, mult: 1, count: 2 },
  { id: 'quiz', kind: 'school', name: 'クイズ大会', icon: '❓', category: 'study', desc: '代表3人の早押しクイズ。', weights: { study: 1, art: 0.3 }, agg: { type: 'top', n: 3 }, mult: 1, count: 1 },
  { id: 'speech', kind: 'school', name: '弁論大会', icon: '🎤', category: 'charisma', desc: 'クラス代表1人の演説で勝負。', weights: { charm: 1, study: 0.5 }, agg: { type: 'max' }, mult: 1, count: 1 },
  { id: 'election', kind: 'school', name: '生徒会選挙', icon: '🗳️', category: 'charisma', desc: '一番人望のある生徒を擁立。王族は演説慣れしている。', weights: { charm: 1 }, agg: { type: 'max' }, tagBonus: { 王族: 3 }, mult: 1, count: 1 },
  { id: 'inspect', kind: 'school', name: '校長の視察', icon: '👀', category: 'charisma', desc: '校長がクラスの雰囲気をチェック。ヤンキーは減点。', weights: { charm: 0.5, study: 0.5 }, agg: { type: 'avg' }, tagBonus: { ヤンキー: -2 }, mult: 1, count: 1 },
  { id: 'eating', kind: 'school', name: '給食大食い大会', icon: '🍛', category: 'food', desc: '代表1人がカレーを食べまくる。恐竜が圧倒的に有利。', weights: { pe: 0.5, fight: 0.5 }, agg: { type: 'max' }, tagBonus: { 恐竜: 10, 武将: 2, ヤンキー: 2 }, mult: 1, count: 1 },
  {
    id: 'yankee', kind: 'school', name: '他校のヤンキー襲来！', icon: '🏍️', category: 'fight',
    desc: '隣町の不良軍団が校門に！喧嘩自慢の上位3人で迎え撃て。ヤンキー・武将・恐竜は頼もしい。',
    weights: { fight: 1 }, agg: { type: 'top', n: 3 }, tagBonus: { ヤンキー: 4, 武将: 3, 恐竜: 4, 忍者: 2 },
    mult: 1, threshold: { threats: [22, 28, 34, 40], win: 6, lose: -6 }, count: 2,
  },
];

/** 毎学期末に必ず起こる固定イベント */
export const FIXED_EVENTS: SchoolEventDef[] = [
  { id: 'test1', kind: 'school', name: '1学期 期末テスト', icon: '📚', category: 'study', desc: '学期末の定期テスト。クラス平均点の勝負。勉強できる奴が強く、ヤンキーと恐竜は足を引っ張る。', weights: { study: 1 }, agg: { type: 'avg' }, tagBonus: TEST_TAGS, mult: 2, count: 0 },
  { id: 'test2', kind: 'school', name: '2学期 期末テスト', icon: '📚', category: 'study', desc: '学期末の定期テスト。クラス平均点の勝負。', weights: { study: 1 }, agg: { type: 'avg' }, tagBonus: TEST_TAGS, mult: 2, count: 0 },
  { id: 'test3', kind: 'school', name: '学年末テスト', icon: '📚', category: 'study', desc: '1年の総まとめ。クラス平均点の勝負。', weights: { study: 1 }, agg: { type: 'avg' }, tagBonus: TEST_TAGS, mult: 2, count: 0 },
  { id: 'graduation', kind: 'school', name: '卒業式・時空最強クラス審査', icon: '🎓', category: 'charisma', desc: 'クラスの総合力（上位10人の全能力合計）で最終審査。', weights: { pe: 1, study: 1, fight: 1, art: 1, charm: 1 }, agg: { type: 'top', n: 10 }, mult: 3, count: 0 },
];

/** 月末に固定イベントが起こる月 */
export const FIXED_BY_MONTH: Record<number, string> = { 7: 'test1', 12: 'test2', 3: 'test3' };

export const PERSONAL_EVENTS: PersonalEventDef[] = [
  { id: 'transfer', kind: 'transfer', name: '転校生がやってくる！', icon: '🚪', desc: 'タイムマシンがいる時代から転校生がやってくる。3人の候補から1人を選んで迎え入れよう。', count: 11 },
  { id: 'rush', kind: 'rush', name: '転校生ラッシュ！', icon: '🎉', desc: 'なぜか転校希望者が殺到！4人の候補から2人まで迎え入れられる。', count: 1 },
  { id: 'train', kind: 'train', name: '放課後の特訓', icon: '💪', desc: '生徒1人を選んで、好きな能力を+2する。', count: 3 },
  { id: 'storm', kind: 'storm', name: '時空嵐に巻き込まれた！', icon: '🌀', desc: 'タイムマシンがランダムな時代に飛ばされた…。ついでに2人の候補から1人連れて帰れる。', count: 2 },
  { id: 'warp', kind: 'warp', name: '時空ワープ航法', icon: '✨', desc: 'タイムマシンが好きな時代へひとっ飛び。', count: 1 },
  { id: 'poach', kind: 'poach', name: '引き抜き工作', icon: '🕵️', desc: '他クラスの生徒（係についていない子）を1人引き抜ける。相手クラスには移籍金3ptが入る。', count: 1 },
  { id: 'bonus', kind: 'bonus', name: '地域清掃で表彰', icon: '🏆', desc: 'クラス全員で町内清掃。地元から感謝状が届いた。+4pt', count: 2 },
  { id: 'inspection', kind: 'inspection', name: '抜き打ち持ち物検査', icon: '🎒', desc: 'ヤンキー1人につき-2pt。ヤンキーがいなければ+2pt。', count: 1 },
  { id: 'crisis', kind: 'crisis', name: '学級崩壊の危機', icon: '💥', desc: 'クラスで一番人望のある生徒（係の効果込み）が15以上ならまとめ上げて+5pt、足りなければ-5pt。', count: 1 },
  { id: 'zoo', kind: 'zoo', name: '飼育小屋の点検', icon: '🐾', desc: '恐竜・動物が飼育係のお世話を受けていれば1匹につき+3pt、放置されていれば1匹につき-2pt。', count: 1 },
  { id: 'parents', kind: 'parents', name: '保護者会', icon: '👪', desc: 'クラスの平均人望の半分だけポイントを得る。', count: 1 },
];

export const EVENT_MAP: Record<string, EventDef> = Object.fromEntries(
  [...SCHOOL_EVENTS, ...FIXED_EVENTS, ...PERSONAL_EVENTS].map((e) => [e.id, e]),
);

export function describeScoring(ev: SchoolEventDef): string {
  const label: Record<StatKey, string> = { pe: '運動', study: '学力', fight: '喧嘩', art: '芸術', charm: '人望' };
  const w = (Object.keys(ev.weights) as StatKey[])
    .map((k) => (ev.weights[k] === 1 ? label[k] : `${label[k]}×${ev.weights[k]}`))
    .join('＋');
  const agg = ev.agg.type === 'top' ? `上位${ev.agg.n}人の合計` : ev.agg.type === 'avg' ? 'クラス全員の平均' : '一番の1人';
  const tags = ev.tagBonus
    ? ' ／ ' +
      Object.entries(ev.tagBonus)
        .map(([t, v]) => `${t}${(v as number) > 0 ? '+' : ''}${v}`)
        .join(' ')
    : '';
  return `【${w}】の${agg}${tags}`;
}
