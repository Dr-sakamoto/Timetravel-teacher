import type { Ability, Rarity, Tag } from '../types';

export type ArchetypeGroup = 'sports' | 'study' | 'art' | 'charm' | 'yankee' | 'plain';

/** 現代の「普通のやつ」。初期メンバーと現代からの転校生はここから生成する */
export interface Archetype {
  id: string;
  title: string;
  icon: string;
  rarity: Rarity;
  group: ArchetypeGroup;
  stats: [number, number, number, number, number];
  tags: Tag[];
  ability?: Ability;
  flavor: string;
}

const Y: Tag[] = ['現代', 'ヤンキー'];
const M: Tag[] = ['現代'];

export const ARCHETYPES: Archetype[] = [
  { id: 'baseball', title: '野球部', icon: '⚾', rarity: 'N', group: 'sports', stats: [7, 3, 4, 2, 5], tags: M, flavor: '坊主頭。声がでかい。' },
  { id: 'soccer', title: 'サッカー部', icon: '⚽', rarity: 'N', group: 'sports', stats: [7, 3, 3, 2, 6], tags: M, flavor: '昼休みは必ずグラウンド。' },
  { id: 'basket', title: 'バスケ部', icon: '🏀', rarity: 'N', group: 'sports', stats: [7, 4, 3, 2, 5], tags: M, flavor: '背が高い。' },
  { id: 'track', title: '陸上部', icon: '🏃', rarity: 'N', group: 'sports', stats: [8, 4, 2, 2, 4], tags: M, flavor: 'とにかく足が速い。' },
  { id: 'judo', title: '柔道部', icon: '🥋', rarity: 'N', group: 'sports', stats: [6, 3, 7, 1, 4], tags: M, flavor: '受け身が得意。' },
  { id: 'swim', title: '水泳部', icon: '🏊', rarity: 'N', group: 'sports', stats: [7, 4, 2, 3, 4], tags: M, flavor: 'いつも髪が塩素くさい。' },
  { id: 'brass', title: '吹奏楽部', icon: '🎺', rarity: 'N', group: 'art', stats: [3, 5, 1, 7, 5], tags: M, flavor: '肺活量はクラス一。' },
  { id: 'artclub', title: '美術部', icon: '🖌️', rarity: 'N', group: 'art', stats: [2, 5, 1, 8, 3], tags: M, flavor: 'ノートの端が全部イラスト。' },
  { id: 'lit', title: '文芸部', icon: '📖', rarity: 'N', group: 'art', stats: [2, 6, 1, 6, 3], tags: M, flavor: 'ポエムを書いている。' },
  { id: 'band', title: '軽音部', icon: '🎸', rarity: 'N', group: 'art', stats: [3, 3, 3, 7, 6], tags: M, flavor: '文化祭のステージが命。' },
  { id: 'drama', title: '演劇部', icon: '🎭', rarity: 'N', group: 'art', stats: [4, 4, 2, 6, 6], tags: M, flavor: '日常会話がたまに芝居がかる。' },
  { id: 'dance', title: 'ダンス部', icon: '💃', rarity: 'N', group: 'art', stats: [6, 3, 2, 6, 6], tags: M, flavor: '廊下でステップを踏む。' },
  { id: 'nerd', title: 'ガリ勉', icon: '🤓', rarity: 'N', group: 'study', stats: [2, 8, 1, 3, 3], tags: M, flavor: '休み時間も単語帳。' },
  { id: 'science', title: '科学部', icon: '🧪', rarity: 'N', group: 'study', stats: [2, 7, 1, 4, 3], tags: M, flavor: 'たまに理科室が爆発する。' },
  { id: 'shogi', title: '将棋部', icon: '♟️', rarity: 'N', group: 'study', stats: [1, 7, 2, 3, 3], tags: M, flavor: '50手先まで読む。' },
  { id: 'otaku', title: 'オタク', icon: '🎮', rarity: 'N', group: 'study', stats: [2, 6, 1, 6, 3], tags: M, flavor: '早口になると止まらない。' },
  { id: 'council', title: '生徒会役員', icon: '📋', rarity: 'N', group: 'charm', stats: [4, 6, 2, 4, 7], tags: M, flavor: '朝の挨拶運動の常連。' },
  { id: 'rep', title: '委員長タイプ', icon: '🙋', rarity: 'N', group: 'charm', stats: [4, 6, 2, 3, 7], tags: M, flavor: '「ちょっと男子ー！」' },
  { id: 'gyaru', title: 'ギャル', icon: '💅', rarity: 'N', group: 'charm', stats: [4, 3, 3, 5, 7], tags: M, flavor: '誰とでもすぐ友達になる。' },
  { id: 'clown', title: 'お調子者', icon: '🤡', rarity: 'N', group: 'charm', stats: [5, 3, 3, 4, 7], tags: M, flavor: 'クラスのムードメーカー。' },
  { id: 'tennen', title: '天然', icon: '🌼', rarity: 'N', group: 'charm', stats: [4, 4, 2, 5, 6], tags: M, flavor: '上履きのまま帰る。' },
  { id: 'kitaku', title: '帰宅部', icon: '🏠', rarity: 'N', group: 'plain', stats: [4, 4, 3, 3, 4], tags: M, flavor: '放課後の帰宅スピードは全国レベル。' },
  { id: 'quiet', title: '目立たない子', icon: '🙂', rarity: 'N', group: 'plain', stats: [3, 5, 2, 4, 4], tags: M, flavor: '出席を取るまで居たか分からない。' },
  { id: 'yankee', title: 'ヤンキー', icon: '😎', rarity: 'N', group: 'yankee', stats: [6, 1, 8, 2, 4], tags: Y, flavor: 'リーゼント。根は優しい。' },
  { id: 'sukeban', title: 'スケバン', icon: '💄', rarity: 'N', group: 'yankee', stats: [5, 2, 7, 3, 5], tags: Y, flavor: 'スカートが長い。' },
  { id: 'furyo', title: '不良', icon: '👊', rarity: 'N', group: 'yankee', stats: [5, 2, 7, 1, 3], tags: Y, flavor: '授業中はだいたい寝ている。' },
  { id: 'bosozoku', title: '暴走族見習い', icon: '🏍️', rarity: 'N', group: 'yankee', stats: [6, 1, 8, 2, 3], tags: Y, flavor: 'まだ自転車。' },
  // 転校生限定（現代）
  { id: 'returnee', title: '帰国子女', icon: '✈️', rarity: 'R', group: 'charm', stats: [5, 8, 2, 6, 8], tags: M, flavor: '英語の発音がネイティブ。' },
  { id: 'childstar', title: '天才子役', icon: '🎬', rarity: 'R', group: 'art', stats: [4, 5, 1, 9, 10], tags: M, flavor: 'ドラマ撮影で早退しがち。' },
  { id: 'topscore', title: '全国模試1位', icon: '🥇', rarity: 'R', group: 'study', stats: [3, 11, 1, 4, 5], tags: M, flavor: '塾を3つ掛け持ち。' },
  { id: 'esports', title: 'eスポーツ選手', icon: '🕹️', rarity: 'R', group: 'study', stats: [4, 7, 2, 7, 6], tags: M, flavor: '反射神経はプロ級。' },
  { id: 'influencer', title: '人気インフルエンサー', icon: '📱', rarity: 'R', group: 'charm', stats: [4, 4, 2, 7, 11], tags: M, flavor: 'フォロワー50万人。' },
  { id: 'banchou', title: '伝説の番長', icon: '🔱', rarity: 'SR', group: 'yankee', stats: [9, 3, 14, 2, 10], tags: Y, ability: { kind: 'boost', category: 'fight', amount: 2 }, flavor: '隣町まで名前が知れ渡っている。' },
  { id: 'olympian', title: 'オリンピック候補', icon: '🏅', rarity: 'SR', group: 'sports', stats: [14, 5, 5, 3, 8], tags: M, ability: { kind: 'boost', category: 'sports', amount: 2 }, flavor: '練習で授業をよく休む。' },
  { id: 'genius', title: '飛び級の天才', icon: '🧠', rarity: 'SR', group: 'study', stats: [3, 15, 1, 7, 5], tags: M, flavor: '実はまだ10歳。' },
];

export const STARTER_ARCHETYPES = ARCHETYPES.filter((a) => a.rarity === 'N');

export const SURNAMES = [
  '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本',
  '井上', '木村', '林', '斎藤', '清水', '山崎', '森', '池田', '橋本', '阿部', '石川', '前田', '藤田', '小川', '岡田',
  '後藤', '長谷川', '村上', '近藤', '石井', '遠藤', '青木', '藤井', '西村', '福田', '太田', '三浦', '岡本', '松田', '中川',
];

export const GIVEN_NAMES = [
  '翔太', '蓮', '陽翔', '大翔', '悠真', '湊', '結衣', '陽菜', '美咲', 'さくら', '葵', '凛', '結菜', '莉子', '芽依',
  '健太', '拓海', '颯太', '大輝', '優斗', '美月', '心春', '楓', '七海', '花', '樹', '蒼', '律', '碧', 'ひなた',
  '彩花', '遥', '千尋', '光', '誠', '紬', '朝陽', '杏', '剛', '真央',
];
