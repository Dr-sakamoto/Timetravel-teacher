import type { EraId } from '../types';

export interface EraDef {
  id: EraId;
  name: string;
  when: string;
  icon: string;
  color: string;
}

/** 時空タイムライン（左から古い順）。現代がスタート地点 */
export const ERAS: EraDef[] = [
  { id: 'cretaceous', name: '白亜紀', when: '約6600万年前', icon: '🦖', color: '#8bc34a' },
  { id: 'egypt', name: '古代エジプト', when: '前3000年頃〜', icon: '🔺', color: '#e8bf4f' },
  { id: 'greece', name: 'ギリシャ・ローマ', when: '前500年頃〜', icon: '🏛️', color: '#90a4d4' },
  { id: 'china', name: '古代中国', when: '春秋〜三国', icon: '🐉', color: '#e57373' },
  { id: 'heian', name: '平安', when: '1000年頃', icon: '🌸', color: '#f48fb1' },
  { id: 'europe', name: '中世・ルネサンス', when: '1200〜1500年頃', icon: '🏰', color: '#ba68c8' },
  { id: 'sengoku', name: '戦国', when: '1550年頃', icon: '⚔️', color: '#ff8a3d' },
  { id: 'edo', name: '江戸・幕末', when: '1600〜1860年代', icon: '🗾', color: '#4db6ac' },
  { id: 'modern', name: '近代', when: '1700〜1900年代', icon: '🎩', color: '#bcaaa4' },
  { id: 'present', name: '現代', when: 'いま', icon: '🏫', color: '#64b5f6' },
  { id: 'future', name: '未来', when: '2300年', icon: '🚀', color: '#4dd0e1' },
];

export const PRESENT_INDEX = ERAS.findIndex((e) => e.id === 'present');

export function eraIndex(id: EraId): number {
  return ERAS.findIndex((e) => e.id === id);
}
