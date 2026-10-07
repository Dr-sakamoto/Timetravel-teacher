import type { Attr, EraId } from '../types';

export interface EraDef {
  id: EraId;
  name: string;
  when: string;
  icon: string;
  color: string;
  /** この時代が優遇するアイコン（0〜2個）。時代イベントはこのアイコンで競う（空なら全アイコンで競う） */
  favor: Attr[];
  /** 学期の頭に読み上げる時代の空気（何が有利かをそれとなく伝える） */
  motto: string;
}

/** 時空タイムライン（左から古い順）。現代がスタート地点 */
export const ERAS: EraDef[] = [
  { id: 'cretaceous', name: '白亜紀', when: '約6600万年前', icon: '🦖', color: '#8bc34a', favor: ['fight', 'sports'], motto: '理屈も作法も通じない。強い者と、すばしこく逃げ回れる者だけが生き残る時代' },
  { id: 'egypt', name: '古代エジプト', when: '前3000年頃〜', icon: '🔺', color: '#e8bf4f', favor: ['sports', 'charm'], motto: 'ナイルのめぐみと王の威光のもと、石を運ぶたくましい腕がピラミッドを築いた時代' },
  { id: 'greece', name: 'ギリシャ・ローマ', when: '前500年頃〜', icon: '🏛️', color: '#90a4d4', favor: ['sports', 'study'], motto: '鍛えた肉体と、問い続ける頭脳が市民の誇りだった時代' },
  { id: 'china', name: '三国志', when: '200年頃', icon: '🐉', color: '#e57373', favor: ['study', 'fight'], motto: '軍師の知恵と武将の腕っぷしで、天下を三つに分けた時代' },
  { id: 'heian', name: '平安', when: '1000年頃', icon: '🌸', color: '#f48fb1', favor: ['art', 'charm'], motto: '物語や和歌の美しさと、宮中での人望が、人の値打ちを決めた時代' },
  { id: 'europe', name: '中世・ルネサンス', when: '1200〜1500年頃', icon: '🏰', color: '#ba68c8', favor: ['art', 'study'], motto: '芸術家が神を描き、科学者が星を見上げた時代' },
  { id: 'sengoku', name: '戦国', when: '1550年頃', icon: '⚔️', color: '#ff8a3d', favor: ['fight', 'charm'], motto: '力ある者が城を奪い、人を惹きつける者が天下を取る時代' },
  { id: 'edo', name: '江戸・幕末', when: '1600〜1860年代', icon: '🗾', color: '#4db6ac', favor: ['art', 'sports'], motto: '芝居と浮世絵に町じゅうが熱狂し、旅人が日本中を歩いた時代' },
  { id: 'modern', name: '近代', when: '1700〜1900年代', icon: '🎩', color: '#bcaaa4', favor: ['study', 'charm'], motto: '発明と知性が世界を変え、社交界で名声が生まれた時代' },
  { id: 'present', name: '現代', when: 'いま', icon: '🏫', color: '#64b5f6', favor: [], motto: '何が得意でも、それなりに認められる。いつもの学校' },
  { id: 'future', name: '未来', when: '2300年', icon: '🚀', color: '#4dd0e1', favor: ['study'], motto: '機械と知能がすべて。頭脳だけがものを言う時代' },
];

export const PRESENT_INDEX = ERAS.findIndex((e) => e.id === 'present');

export function eraIndex(id: EraId): number {
  return ERAS.findIndex((e) => e.id === id);
}
