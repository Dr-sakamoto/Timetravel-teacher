import { ATTR_ICON, type Attr, type EraId } from '../types';

export interface EraDef {
  id: EraId;
  name: string;
  when: string;
  icon: string;
  color: string;
  /** この時代が優遇するアイコン（0〜2個）。時代イベントはこのアイコンで競う（空なら全アイコンで競う） */
  favor: Attr[];
}

/** 時空タイムライン（左から古い順）。現代がスタート地点 */
export const ERAS: EraDef[] = [
  { id: 'cretaceous', name: '白亜紀', when: '約6600万年前', icon: '🦖', color: '#8bc34a', favor: ['fight'] },
  { id: 'egypt', name: '古代エジプト', when: '前3000年頃〜', icon: '🔺', color: '#e8bf4f', favor: ['sports', 'charm'] },
  { id: 'greece', name: 'ギリシャ・ローマ', when: '前500年頃〜', icon: '🏛️', color: '#90a4d4', favor: ['sports', 'study'] },
  { id: 'china', name: '古代中国', when: '春秋〜三国', icon: '🐉', color: '#e57373', favor: ['study', 'fight'] },
  { id: 'heian', name: '平安', when: '1000年頃', icon: '🌸', color: '#f48fb1', favor: ['art', 'charm'] },
  { id: 'europe', name: '中世・ルネサンス', when: '1200〜1500年頃', icon: '🏰', color: '#ba68c8', favor: ['art', 'fight'] },
  { id: 'sengoku', name: '戦国', when: '1550年頃', icon: '⚔️', color: '#ff8a3d', favor: ['fight', 'charm'] },
  { id: 'edo', name: '江戸・幕末', when: '1600〜1860年代', icon: '🗾', color: '#4db6ac', favor: ['art', 'sports'] },
  { id: 'modern', name: '近代', when: '1700〜1900年代', icon: '🎩', color: '#bcaaa4', favor: ['study', 'charm'] },
  { id: 'present', name: '現代', when: 'いま', icon: '🏫', color: '#64b5f6', favor: [] },
  { id: 'future', name: '未来', when: '2300年', icon: '🚀', color: '#4dd0e1', favor: ['study'] },
];

export const PRESENT_INDEX = ERAS.findIndex((e) => e.id === 'present');

export function eraIndex(id: EraId): number {
  return ERAS.findIndex((e) => e.id === id);
}

/** 優遇アイコンの表示（例：「👊📚有利」、なければ「優遇なし」） */
export function favorLabel(era: EraDef): string {
  return era.favor.length ? `${era.favor.map((a) => ATTR_ICON[a]).join('')}有利` : '優遇なし';
}
