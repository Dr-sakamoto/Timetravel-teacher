import type { Ability, Rarity, Tag } from '../types';

export type ArchetypeGroup = 'sports' | 'study' | 'art' | 'charm' | 'yankee' | 'plain';

/** 現代の「普通のやつ」。初期メンバーと現代からの転校生はここから生成する */
export interface Archetype {
  id: string;
  title: string;
  icon: string;
  rarity: Rarity;
  group: ArchetypeGroup;
  power: number;
  /** 属性の略記（s=📚 p=🏃 a=🎨 c=👑 f=👊） */
  attrs: string;
  tags: Tag[];
  ability?: Ability;
  flavor: string;
}

const Y: Tag[] = ['現代', 'ヤンキー'];
const M: Tag[] = ['現代'];

function a(id: string, title: string, icon: string, rarity: Rarity, group: ArchetypeGroup, power: number, attrs: string, flavor: string, ability?: Ability): Archetype {
  return { id, title, icon, rarity, group, power, attrs, tags: attrs.includes('f') ? Y : M, ability, flavor };
}

// 📚はヤンキー以外ほぼ標準装備。👊はヤンキー専用
export const ARCHETYPES: Archetype[] = [
  a('baseball', '野球部', '⚾', 'N', 'sports', 3, 'sp', '坊主頭。声がでかい。'),
  a('soccer', 'サッカー部', '⚽', 'N', 'sports', 3, 'sp', '昼休みは必ずグラウンド。'),
  a('basket', 'バスケ部', '🏀', 'N', 'sports', 3, 'sp', '背が高い。'),
  a('track', '陸上部', '🏃', 'N', 'sports', 5, 'p', 'とにかく足が速い。'),
  a('judo', '柔道部', '🥋', 'N', 'sports', 4, 'sp', '受け身が得意。'),
  a('swim', '水泳部', '🏊', 'N', 'sports', 3, 'sp', 'いつも髪が塩素くさい。'),
  a('brass', '吹奏楽部', '🎺', 'N', 'art', 3, 'sa', '肺活量はクラス一。'),
  a('artclub', '美術部', '🖌️', 'N', 'art', 4, 'sa', 'ノートの端が全部イラスト。'),
  a('lit', '文芸部', '📖', 'N', 'art', 3, 'sa', 'ポエムを書いている。'),
  a('band', '軽音部', '🎸', 'N', 'art', 4, 'ac', '文化祭のステージが命。'),
  a('drama', '演劇部', '🎭', 'N', 'art', 2, 'sac', '日常会話がたまに芝居がかる。'),
  a('dance', 'ダンス部', '💃', 'N', 'art', 3, 'pa', '廊下でステップを踏む。'),
  a('nerd', 'ガリ勉', '🤓', 'N', 'study', 6, 's', '休み時間も単語帳。'),
  a('science', '科学部', '🧪', 'N', 'study', 5, 's', 'たまに理科室が爆発する。'),
  a('shogi', '将棋部', '♟️', 'N', 'study', 5, 's', '50手先まで読む。'),
  a('otaku', 'オタク', '🎮', 'N', 'study', 3, 'sa', '早口になると止まらない。'),
  a('council', '生徒会役員', '📋', 'N', 'charm', 3, 'sc', '朝の挨拶運動の常連。'),
  a('rep', '委員長タイプ', '🙋', 'N', 'charm', 4, 'sc', '「ちょっと男子ー！」'),
  a('gyaru', 'ギャル', '💅', 'N', 'charm', 4, 'ac', '誰とでもすぐ友達になる。'),
  a('clown', 'お調子者', '🤡', 'N', 'charm', 2, 'spc', 'クラスのムードメーカー。'),
  a('tennen', '天然', '🌼', 'N', 'charm', 2, 'sac', '上履きのまま帰る。'),
  a('kitaku', '帰宅部', '🏠', 'N', 'plain', 4, 's', '放課後の帰宅スピードは全国レベル。'),
  a('quiet', '目立たない子', '🙂', 'N', 'plain', 3, 'sa', '出席を取るまで居たか分からない。'),
  a('yankee', 'ヤンキー', '😎', 'N', 'yankee', 4, 'pf', 'リーゼント。根は優しい。'),
  a('sukeban', 'スケバン', '💄', 'N', 'yankee', 4, 'fc', 'スカートが長い。'),
  a('furyo', '不良', '👊', 'N', 'yankee', 6, 'f', '授業中はだいたい寝ている。'),
  a('bosozoku', '暴走族見習い', '🏍️', 'N', 'yankee', 3, 'pfc', 'まだ自転車。'),
  // 転校生限定（現代）
  a('returnee', '帰国子女', '✈️', 'R', 'charm', 4, 'sac', '英語の発音がネイティブ。'),
  a('childstar', '天才子役', '🎬', 'R', 'art', 6, 'ac', 'ドラマ撮影で早退しがち。'),
  a('topscore', '全国模試1位', '🥇', 'R', 'study', 9, 's', '塾を3つ掛け持ち。'),
  a('esports', 'eスポーツ選手', '🕹️', 'R', 'study', 6, 'sa', '反射神経はプロ級。'),
  a('influencer', '人気インフルエンサー', '📱', 'R', 'charm', 7, 'c', 'フォロワー50万人。', { kind: 'boost', attr: 'charm', amount: 2 }),
  a('banchou', '伝説の番長', '🔱', 'SR', 'yankee', 7, 'pfc', '隣町まで名前が知れ渡っている。'),
  a('olympian', 'オリンピック候補', '🏅', 'SR', 'sports', 9, 'sp', '練習で授業をよく休む。'),
  a('genius', '飛び級の天才', '🧠', 'SR', 'study', 10, 'sa', '実はまだ10歳。'),
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
