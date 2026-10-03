import { ATTR_ICON, type Attr, type RoleId } from '../types';

/** 係：係のアイコンを持つ生徒が就くと、そのアイコンで点が入るたびに+1 */
export interface RoleDef {
  id: RoleId;
  name: string;
  icon: string;
  attr: Attr;
}

export const ROLES: Record<RoleId, RoleDef> = {
  study: { id: 'study', name: '学習係', icon: '✏️', attr: 'study' },
  pe: { id: 'pe', name: '体育委員', icon: '🏅', attr: 'sports' },
  culture: { id: 'culture', name: '文化委員', icon: '🖌️', attr: 'art' },
  leader: { id: 'leader', name: '学級委員長', icon: '🎖️', attr: 'charm' },
  discipline: { id: 'discipline', name: '風紀委員', icon: '🛡️', attr: 'fight' },
  library: { id: 'library', name: '図書委員', icon: '📖', attr: 'study' },
};

/** 全クラス共通の係。学期が進むとこの順に1つずつ解放される（最初の学期は3つ） */
export const ROLE_ORDER: RoleId[] = ['study', 'pe', 'culture', 'leader', 'discipline', 'library'];

export function roleDesc(id: RoleId): string {
  return `${ATTR_ICON[ROLES[id].attr]}×2`;
}
