import type { Rarity, Tag } from '../types';

/** 現代の「普通のやつ」。初期メンバーと現代からの転校生はここから生成する */
export interface Archetype {
  id: string;
  title: string;
  icon: string;
  rarity: Rarity;
  /** 強さの目安（1〜10）。アイコンの数に変換して印刷する */
  power: number;
  /** 属性の略記（s=📚 p=🏃 a=🎨 c=👑 f=👊）。先頭が「=」なら個数もそのまま印刷する */
  attrs: string;
  tags: Tag[];
  flavor: string;
}

const Y: Tag[] = ['現代', 'ヤンキー'];
const M: Tag[] = ['現代'];

function a(id: string, title: string, icon: string, rarity: Rarity, power: number, attrs: string, flavor: string): Archetype {
  return { id, title, icon, rarity, power, attrs, tags: attrs.includes('f') ? Y : M, flavor };
}

// 部活は優劣をつけないので、部活系の通常生徒は肩書きなし（個人名＋絵柄だけ）。
// 通常生徒（N）はアイコン1〜2個で、構成が1人ずつ違う。個数は「=」でそのまま指定する。👊はヤンキー専用
export const ARCHETYPES: Archetype[] = [
  a('lit', '', '📖', 'N', 3, '=s', 'ポエムを書いている。'),
  a('soccer', '', '⚽', 'N', 3, '=p', '昼休みは必ずグラウンド。'),
  a('artclub', '', '🖌️', 'N', 4, '=a', 'ノートの端が全部イラスト。'),
  a('rep', '委員長タイプ', '🙋', 'N', 4, '=c', '「ちょっと男子ー！」'),
  a('nerd', 'ガリ勉', '🤓', 'N', 6, '=ss', '休み時間も単語帳。'),
  a('track', '', '🏃', 'N', 5, '=pp', 'とにかく足が速い。'),
  a('brass', '', '🎺', 'N', 3, '=aa', '肺活量はクラス一。'),
  a('gyaru', 'ギャル', '💅', 'N', 4, '=cc', '誰とでもすぐ友達になる。'),
  a('baseball', '', '⚾', 'N', 3, '=sp', '坊主頭。声がでかい。'),
  a('otaku', 'オタク', '🎮', 'N', 3, '=sa', '早口になると止まらない。絵もうまい。'),
  a('council', '生徒会役員', '📋', 'N', 3, '=sc', '朝の挨拶運動の常連。'),
  a('dance', '', '💃', 'N', 3, '=pa', '廊下でステップを踏む。'),
  a('basket', '', '🏀', 'N', 3, '=pc', '背が高い。チームのキャプテン。'),
  a('band', '', '🎸', 'N', 4, '=ac', '文化祭のステージが命。'),
  a('yankee', 'ヤンキー', '😎', 'N', 4, '=f', 'リーゼント。根は優しい。'),
  a('furyo', '不良', '👊', 'N', 6, '=pf', '授業はサボるが体育だけは出る。'),
  a('sukeban', 'スケバン', '💄', 'N', 4, '=cf', 'スカートが長い。'),
  // 転校生限定（現代）
  a('returnee', '帰国子女', '✈️', 'R', 4, '=ssc', '英語の発音がネイティブ。'),
  a('childstar', '天才子役', '🎬', 'R', 6, '=ac', 'ドラマ撮影で早退しがち。'),
  a('topscore', '全国模試1位', '🥇', 'R', 9, '=sss', '塾を3つ掛け持ち。'),
  a('esports', 'eスポーツ選手', '🕹️', 'R', 6, '=saa', '反射神経はプロ級。'),
  a('influencer', '人気インフルエンサー', '📱', 'R', 7, '=ccc', 'フォロワー50万人。'),
  a('banchou', '伝説の番長', '🔱', 'SR', 7, '=ff', '隣町まで名前が知れ渡っている。'),
  a('olympian', 'オリンピック候補', '🏅', 'SR', 9, '=sppp', '練習で授業をよく休む。'),
  a('genius', '飛び級の天才', '🧠', 'SR', 10, '=ssac', '実はまだ10歳。'),
];

export const ARCHETYPE_MAP: Record<string, Archetype> = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));

/** 初期メンバー用の山：普通の生徒（N）を2枚ずつ。カードIDは 'm:<アーキタイプ>#<番号>' */
export const STARTER_POOL: string[] = ARCHETYPES.filter((a) => a.rarity === 'N').flatMap((a) => [1, 2].map((i) => `m:${a.id}#${i}`));

/** 現代の学期のカードプール：転校生限定の生徒（R以上）を1枚ずつ。スタート以降に現代から来るのはこの子たちだけ */
export const MODERN_POOL: string[] = ARCHETYPES.filter((a) => a.rarity !== 'N').map((a) => `m:${a.id}#1`);

export const isModernCard = (id: string) => id.startsWith('m:');
export const archetypeOf = (id: string) => id.slice(2).split('#')[0];

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
