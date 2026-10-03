import type { RoleId } from '../types';
import type { ArchetypeGroup } from './modern';

/** 最初に引くクラスカード。係の構成と初期メンバーの傾向が決まる */
export interface ClassCardDef {
  id: string;
  dept: string;
  letter: string;
  nick: string;
  icon: string;
  color: string;
  roles: RoleId[];
  bias: Partial<Record<ArchetypeGroup, number>>;
  desc: string;
}

export const CLASS_CARDS: ClassCardDef[] = [
  {
    id: 'normal', dept: '普通科', letter: 'A', nick: 'どこにでもあるクラス', icon: '🏫', color: '#64b5f6',
    roles: ['leader', 'vice', 'pe', 'study', 'culture', 'health'],
    bias: { sports: 1, study: 1, art: 1, charm: 1, plain: 1.5, yankee: 0.5 },
    desc: 'クセのないバランス型。係が6つあり編成の自由度が高い。',
  },
  {
    id: 'sports', dept: 'スポーツ科', letter: 'B', nick: '体育会系クラス', icon: '🏅', color: '#ff8a65',
    roles: ['leader', 'pe', 'pe', 'cheer', 'health'],
    bias: { sports: 6, charm: 1, plain: 1, yankee: 1 },
    desc: '運動部だらけ。体育祭は任せろ。テストは…お察し。',
  },
  {
    id: 'elite', dept: '特進科', letter: 'C', nick: 'ガリ勉クラス', icon: '📚', color: '#9575cd',
    roles: ['leader', 'study', 'study', 'library', 'pe'],
    bias: { study: 5, charm: 1.5, art: 1, plain: 1 },
    desc: '定期テストに強い秀才集団。喧嘩はからっきし。',
  },
  {
    id: 'arts', dept: '芸術科', letter: 'D', nick: 'アーティストの卵', icon: '🎨', color: '#f06292',
    roles: ['leader', 'culture', 'culture', 'broadcast', 'study'],
    bias: { art: 6, charm: 1.5, study: 1, plain: 1 },
    desc: '文化祭と合唱コンクールで本気を出す。',
  },
  {
    id: 'trouble', dept: '普通科', letter: 'E', nick: '問題児の掃き溜め', icon: '😎', color: '#ffb74d',
    roles: ['discipline', 'discipline', 'cheer', 'pe', 'animal', 'study'],
    bias: { yankee: 3, sports: 1.5, plain: 1, charm: 1, art: 0.8 },
    desc: 'ヤンキーだらけで勉強は壊滅的。でも他校が攻めてきたら頼もしい。係は6つ。',
  },
  {
    id: 'council', dept: '生徒会', letter: 'F', nick: 'エリート委員会', icon: '📋', color: '#4db6ac',
    roles: ['leader', 'vice', 'broadcast', 'library', 'cheer'],
    bias: { charm: 6, study: 1.5, plain: 1 },
    desc: '人望で押し切る優等生クラス。選挙と修学旅行に強い。',
  },
  {
    id: 'ikimono', dept: '普通科', letter: 'G', nick: 'いきものがかりクラス', icon: '🐾', color: '#aed581',
    roles: ['animal', 'animal', 'leader', 'pe', 'study'],
    bias: { plain: 2, charm: 1.5, sports: 1, study: 1, art: 1 },
    desc: '飼育係が2つ。恐竜やロボ犬を迎えれば化ける。',
  },
];

export const CLASS_MAP: Record<string, ClassCardDef> = Object.fromEntries(CLASS_CARDS.map((c) => [c.id, c]));

export function className(cardId: string | null, year: number): string {
  if (!cardId) return '（未定）';
  const c = CLASS_MAP[cardId];
  return `${c.dept} ${year}年${c.letter}組`;
}
